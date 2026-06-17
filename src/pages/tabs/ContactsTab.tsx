import React, { useState, useEffect, useRef } from 'react'
import { Plus, Users, Mail, Phone, MapPin, Search, ArrowLeft, Edit3, FileText, Archive, ArchiveRestore } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Contact, Invoice } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'

interface ContactsTabProps {
  activeOrg: Organization
  initialFilter?: 'All' | 'Customer' | 'Supplier' | 'Deactivated'
  onViewInvoice?: (id: string) => void
  onViewBill?: (id: string) => void
}

export function ContactsTab({
  activeOrg,
  initialFilter = 'All',
  onViewInvoice,
  onViewBill
}: ContactsTabProps) {
  const { showConfirm, showAlert } = usePopup()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [viewingContact, setViewingContact] = useState<Contact | null>(null)
  const [accountingMethod, setAccountingMethod] = useState<'accrual' | 'cash'>('accrual')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc'>('name-asc')
  const [filterType, setFilterType] = useState<'All' | 'Customer' | 'Supplier' | 'Deactivated'>(initialFilter)

  const [isModalOpen, setIsModalOpen] = useState(() => {
    const autoOpen = localStorage.getItem('kdm_auto_open_contact_modal')
    if (autoOpen === 'true') {
      localStorage.removeItem('kdm_auto_open_contact_modal')
      return true
    }
    return false
  })

  const [contactPerson, setContactPerson] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [isCustomerCheckbox, setIsCustomerCheckbox] = useState(true)
  const [isSupplierCheckbox, setIsSupplierCheckbox] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFilterType(initialFilter)
  }, [initialFilter])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [filterType])

  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isModalOpen && lastActiveElementRef.current) {
      const el = lastActiveElementRef.current
      setTimeout(() => {
        if (el && document.body.contains(el)) el.focus()
      }, 50)
      lastActiveElementRef.current = null
    }
  }, [isModalOpen])

  const handleCustomerCheckboxChange = (checked: boolean) => {
    if (!checked && !isSupplierCheckbox) return
    setIsCustomerCheckbox(checked)
  }

  const handleSupplierCheckboxChange = (checked: boolean) => {
    if (!checked && !isCustomerCheckbox) return
    setIsSupplierCheckbox(checked)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [loadedContacts, loadedInvoices, loadedBills] = await Promise.all([
        apiService.getContacts(activeOrg.id),
        apiService.getInvoices(activeOrg.id),
        apiService.getBills(activeOrg.id),
      ])
      setContacts(loadedContacts)
      setInvoices(loadedInvoices)
      setBills(loadedBills)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id])

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const handleToggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) visibleIds.forEach(id => next.delete(id))
    else visibleIds.forEach(id => next.add(id))
    setSelectedIds(next)
  }

  const handleBulkDeactivate = async () => {
    const list = Array.from(selectedIds)
    if (list.length === 0) return

    const isReactivating = filterType === 'Deactivated'
    const confirmed = await showConfirm({
      title: isReactivating ? 'Reactivate Selected' : 'Deactivate Selected',
      message: isReactivating
        ? `Reactivate ${list.length} selected contact(s)?`
        : `Deactivate ${list.length} selected contact(s)? Historical data is preserved.`,
      confirmText: isReactivating ? 'Reactivate' : 'Deactivate',
      isDestructive: !isReactivating
    })
    if (!confirmed) return

    setLoading(true)
    try {
      const newStatus = isReactivating
      await Promise.all(list.map(id => apiService.patchContact(id, { is_active: newStatus }, activeOrg.id)))
      setContacts(prev => prev.map(c => selectedIds.has(c.id!) ? { ...c, is_active: newStatus } : c))
      setSelectedIds(new Set())
      showAlert({
        title: isReactivating ? 'Contacts Reactivated' : 'Contacts Deactivated',
        message: `${list.length} contact(s) ${isReactivating ? 'reactivated' : 'deactivated'}.`,
        type: 'success'
      })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingContact(null)
    resetForm()
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact)
    setBusinessName(contact.name)
    setContactPerson(contact.tax_number || '')
    setEmail(contact.email || '')
    setPhone(contact.phone || '')
    setAddress(contact.billing_address || '')
    setIsCustomerCheckbox(contact.contact_type === 'Customer' || contact.contact_type === 'Both')
    setIsSupplierCheckbox(contact.contact_type === 'Supplier' || contact.contact_type === 'Both')
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleRowClick = (e: React.MouseEvent, contact: Contact) => {
    const target = e.target as HTMLElement
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.no-row-click')
    ) return
    setViewingContact(contact)
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName) {
      showAlert({ title: 'Validation Warning', message: 'Business Name is a required field.', type: 'warning' })
      return
    }
    if (!isCustomerCheckbox && !isSupplierCheckbox) {
      showAlert({ title: 'Validation Warning', message: 'Please select at least one contact role (Customer or Supplier).', type: 'warning' })
      return
    }

    setIsSubmitting(true)

    let contact_type: 'Customer' | 'Supplier' | 'Both' = 'Both'
    if (isCustomerCheckbox && !isSupplierCheckbox) contact_type = 'Customer'
    if (!isCustomerCheckbox && isSupplierCheckbox) contact_type = 'Supplier'

    const payload: Partial<Contact> = {
      name: businessName,
      tax_number: contactPerson,
      email,
      phone,
      billing_address: address,
      contact_type
    }

    try {
      if (editingContact) {
        const updated = await apiService.updateContact(editingContact.id!, payload, activeOrg.id)
        setContacts(prev => prev.map(c => c.id === editingContact.id ? updated : c))
        if (viewingContact?.id === editingContact.id) setViewingContact(updated)
        setIsModalOpen(false)
        setEditingContact(null)
        resetForm()
        showAlert({ title: 'Contact Updated', message: 'Contact details saved successfully.', type: 'success' })
      } else {
        const created = await apiService.createContact(activeOrg.id, payload)
        setContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setIsModalOpen(false)
        resetForm()
        showAlert({ title: 'Contact Added', message: 'New contact added successfully.', type: 'success' })
      }
    } catch (err: any) {
      showAlert({ title: 'Error Saving Contact', message: 'Failed to save contact: ' + (err.message || 'Contact Business Name must be unique'), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async (contact: Contact) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Contact',
      message: `Deactivate "${contact.name}"? They will be hidden from active lists but all historical transactions are preserved.`,
      confirmText: 'Deactivate',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      const updated = await apiService.patchContact(contact.id!, { is_active: false }, activeOrg.id)
      setContacts(prev => prev.map(c => c.id === contact.id ? updated : c))
      setViewingContact(updated)
      showAlert({ title: 'Contact Deactivated', message: `${contact.name} has been deactivated.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const handleReactivate = async (contact: Contact) => {
    try {
      const updated = await apiService.patchContact(contact.id!, { is_active: true }, activeOrg.id)
      setContacts(prev => prev.map(c => c.id === contact.id ? updated : c))
      setViewingContact(updated)
      showAlert({ title: 'Contact Restored', message: `${contact.name} is now active.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const resetForm = () => {
    setContactPerson('')
    setBusinessName('')
    setEmail('')
    setPhone('')
    setAddress('')
    setIsCustomerCheckbox(true)
    setIsSupplierCheckbox(true)
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.tax_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.billing_address || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (filterType === 'Deactivated') return contact.is_active === false

    if (contact.is_active === false) return false

    if (filterType === 'Customer') return contact.contact_type === 'Customer' || contact.contact_type === 'Both'
    if (filterType === 'Supplier') return contact.contact_type === 'Supplier' || contact.contact_type === 'Both'
    return true
  })

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
    if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
    return 0
  })

  const getContactCostings = (contactId: string, method: 'accrual' | 'cash') => {
    const matchStatus = method === 'cash'
      ? (s: string) => s === 'Paid'
      : (s: string) => s !== 'Draft'
    const contactInvoices = invoices.filter(i => i.contact === contactId && matchStatus(i.status))
    const contactBills = bills.filter(b => b.contact === contactId && matchStatus(b.status))
    const salesTotal = contactInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const purchasesTotal = contactBills.reduce((sum, b) => sum + Number(b.total), 0)
    return { salesTotal, purchasesTotal, balance: salesTotal - purchasesTotal, invoices: contactInvoices, bills: contactBills }
  }

  let mainContent;

  if (viewingContact) {
    const costings = getContactCostings(viewingContact.id!, accountingMethod)
    const transactions = [
      ...costings.invoices.map(i => ({ id: i.id!, date: i.date, number: i.invoice_number, reference: i.reference, type: 'Invoice', amount: Number(i.total), status: i.status })),
      ...costings.bills.map(b => ({ id: b.id!, date: b.date, number: b.bill_number, reference: b.reference, type: 'Bill', amount: -Number(b.total), status: b.status }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())


    mainContent = (
      <div className="space-y-6 font-sans text-left animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewingContact(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-[3px] border border-slate-200 cursor-pointer select-none transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Contacts Directory</span>
            </button>
            <span className="text-slate-350">/</span>
            <span className="text-[#0F5B38] text-xs font-bold">{viewingContact.name}</span>
            {viewingContact.is_active === false && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">Inactive</span>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleEditClick(viewingContact)}
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
            {viewingContact.is_active !== false ? (
              <button
                onClick={() => handleDeactivate(viewingContact)}
                className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200/50 hover:bg-amber-100/60 text-amber-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Deactivate</span>
              </button>
            ) : (
              <button
                onClick={() => handleReactivate(viewingContact)}
                className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                <span>Reactivate</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-800">{viewingContact.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Contact Profile Record</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 text-xs text-slate-700">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Contact Person</span>
                <span className="font-semibold text-slate-800">{viewingContact.tax_number || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Contact Role</span>
                <span className="font-bold text-[#0F5B38] bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5 text-[10px]">{viewingContact.contact_type}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Email Address</span>
                <span className="font-semibold text-slate-800 flex items-center space-x-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{viewingContact.email || '—'}</span>
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Contact Phone</span>
                <span className="font-semibold text-slate-800 flex items-center space-x-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{viewingContact.phone || '—'}</span>
                </span>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Postal Address</span>
                <span className="font-semibold text-slate-800 flex items-start space-x-1 leading-relaxed">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{viewingContact.billing_address || '—'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="border-b border-slate-100 pb-2 space-y-2">
              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Financial Account Summary</h4>
              <div className="flex items-center bg-slate-100 rounded-[3px] p-0.5 w-fit">
                <button
                  onClick={() => setAccountingMethod('accrual')}
                  className={`text-[9px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-[2px] transition ${accountingMethod === 'accrual' ? 'bg-white text-[#0F5B38] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >Accrual</button>
                <button
                  onClick={() => setAccountingMethod('cash')}
                  className={`text-[9px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-[2px] transition ${accountingMethod === 'cash' ? 'bg-white text-[#0F5B38] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >Cash</button>
              </div>
            </div>
            <div className="space-y-3.5 flex-grow py-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#0F5B38] rounded-full"></div>
                  <span className="text-slate-500 font-semibold">{accountingMethod === 'cash' ? 'Cash Received (Sales)' : 'Total Sales (Revenue)'}</span>
                </div>
                <span className="font-extrabold text-slate-800">{activeOrg.currency === 'PKR' ? '₨' : '$'}{costings.salesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-rose-600 rounded-full"></div>
                  <span className="text-slate-500 font-semibold">{accountingMethod === 'cash' ? 'Cash Paid (Purchases)' : 'Total Purchases (Spending)'}</span>
                </div>
                <span className="font-extrabold text-slate-800">{activeOrg.currency === 'PKR' ? '₨' : '$'}{costings.purchasesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                <span className="text-slate-800 font-black">Net {accountingMethod === 'cash' ? 'Cash' : 'Accrual'} Balance</span>
                <span className={`font-black ${costings.balance >= 0 ? 'text-[#0F5B38]' : 'text-rose-600'}`}>
                  {costings.balance < 0 ? '-' : ''}{activeOrg.currency === 'PKR' ? '₨' : '$'}{Math.abs(costings.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3px] border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Transaction Activity Ledger</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {accountingMethod === 'cash' ? 'Cash basis — paid transactions only.' : 'Accrual basis — all invoiced & billed transactions.'}
              </p>
            </div>
            <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border ${accountingMethod === 'cash' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {accountingMethod === 'cash' ? 'Cash Basis' : 'Accrual Basis'}
            </span>
          </div>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Document ID</th>
                    <th className="p-3">Reference / PO</th>
                    <th className="p-3">Document Type</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
                  {transactions.map(tx => {
                    const isInvoice = tx.type === 'Invoice'
                    const sym = activeOrg.currency === 'PKR' ? '₨' : '$'
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => { if (isInvoice && onViewInvoice) onViewInvoice(tx.id); else if (!isInvoice && onViewBill) onViewBill(tx.id) }}
                        className="hover:bg-emerald-50/25 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="p-3 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-bold text-[#0F5B38]">{tx.number}</td>
                        <td className="p-3 text-slate-400 italic">{tx.reference || '—'}</td>
                        <td className="p-3">
                          <span className="flex items-center space-x-1.5">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span>{isInvoice ? 'Sales Invoice' : 'Vendor Bill'}</span>
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${tx.amount >= 0 ? 'text-slate-800' : 'text-rose-650'}`}>
                          {tx.amount < 0 ? '-' : ''}{sym}{Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                            tx.status === 'Awaiting Payment' ? 'bg-amber-50 text-amber-600 border border-amber-100/30' :
                            'bg-slate-100 text-slate-500'
                          }`}>{tx.status}</span>
                        </td>
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => { if (isInvoice && onViewInvoice) onViewInvoice(tx.id); else if (!isInvoice && onViewBill) onViewBill(tx.id) }}
                            className="hover:bg-emerald-50 text-[#0F5B38] rounded-[3px] transition cursor-pointer text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold leading-relaxed">
              No transactions have been recorded for this contact yet.
            </div>
          )}
        </div>
      </div>
    )
  } else {
    mainContent = (
      <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <Users className="h-5 w-5 text-[#0F5B38]" />
            <span>Contacts Directory</span>
          </h2>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] transition cursor-pointer shadow-md shadow-emerald-955/10 self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            <span>Add Contact</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-0 gap-4">
          <div className="flex space-x-1 select-none text-xs font-semibold -mb-[1px] relative z-10">
            {(['All', 'Customer', 'Supplier', 'Deactivated'] as const).map(f => {
              const isActive = filterType === f
              return (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-4 py-2 text-xs font-semibold transition-all border rounded-t-[3px] cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-[#0F5B38] border-slate-200 border-b-transparent font-bold -mb-[1px] relative z-10'
                      : 'bg-transparent hover:bg-slate-50 text-slate-450 hover:text-slate-855 border-slate-200'
                  }`}
                >
                  {f === 'All' ? 'All Contacts' : f === 'Customer' ? 'Customers' : f === 'Supplier' ? 'Suppliers' : 'Deactivated'}
                </button>
              )
            })}
          </div>

          <div className="flex items-end space-x-2 w-full sm:w-auto justify-end gap-2 pb-0 mb-[2px]">
            {selectedIds.size > 0 && (
              <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
                <button
                  onClick={handleBulkDeactivate}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
                >
                  {filterType === 'Deactivated' ? 'Reactivate Selected' : 'Deactivate Selected'}
                </button>
                <span className="text-[11px] text-slate-400 font-bold px-1 whitespace-nowrap hidden lg:inline">
                  {selectedIds.size} selected
                </span>
              </div>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-8.5 pr-4 py-2 text-xs font-semibold text-slate-855 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] placeholder:text-slate-400"
              />
            </div>

            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-3 py-2 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex space-x-1.5 items-center">
              <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
              <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
              <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
            </div>
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.has(c.id!))}
                      onChange={() => handleToggleSelectAll(filteredContacts.map(c => c.id!))}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-2.5">Business Name</th>
                  <th className="px-6 py-2.5">Contact Person</th>
                  <th className="px-6 py-2.5">Email</th>
                  <th className="px-6 py-2.5">Contact (Phone)</th>
                  <th className="px-6 py-2.5">Address</th>
                  <th className="px-6 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
                {sortedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={(e) => handleRowClick(e, contact)}
                    className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out cursor-pointer ${selectedIds.has(contact.id!) ? 'bg-emerald-50/20' : ''}`}
                  >
                    <td className="px-4 py-2.5 w-10 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id!)}
                        onChange={() => handleToggleSelect(contact.id!)}
                        className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-2.5 text-[13px]">
                      <span className="font-bold text-[#0F5B38] hover:underline">{contact.name}</span>
                    </td>
                    <td className="px-6 py-2.5 font-semibold text-slate-650">{contact.tax_number || '—'}</td>
                    <td className="px-6 py-2.5 font-medium text-slate-600">
                      {contact.email ? (
                        <span className="flex items-center space-x-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{contact.email}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-2.5 text-slate-550 font-semibold">
                      {contact.phone ? (
                        <span className="flex items-center space-x-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{contact.phone}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-2.5 max-w-xs truncate text-[11px] text-slate-455">
                      {contact.billing_address ? (
                        <span className="flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{contact.billing_address}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-2.5">
                      {contact.is_active === false ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-50/50 rounded-[3px] border border-slate-205 p-8 space-y-4">
            <div className="mx-auto h-14 w-14 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
              <Users className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-md font-bold text-slate-800">No matching contacts</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">Create your contacts here to establish a clean relational bookkeeping index.</p>
            </div>
            <button onClick={handleOpenAdd} className="bg-[#0F5B38] hover:brightness-105 text-white font-semibold text-xs px-5 py-2.5 rounded-[3px] shadow-md transition cursor-pointer">
              Add Your First Contact
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {mainContent}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
          <div className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-lg border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-850">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
                <p className="text-[11px] text-slate-450 font-medium">Provide basic contact indices to register business profiles.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition">✕</button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4 text-xs font-semibold text-slate-605">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Contact Name *</label>
                <input type="text" placeholder="e.g. Alice Smith" value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-355" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Business Name *</label>
                <input type="text" placeholder="e.g. Kodmarc Software LLC" value={businessName} onChange={e => setBusinessName(e.target.value)} required
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Email Address</label>
                  <input type="email" placeholder="e.g. billing@kodmarc.com" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Contact (Phone)</label>
                  <input type="text" placeholder="e.g. +65 6789 0123" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Address</label>
                <textarea placeholder="Full postal billing or shipping address..." rows={3} value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition resize-none placeholder:text-slate-350"></textarea>
              </div>
              <div className="flex items-center space-x-6 bg-slate-55/70 border border-slate-200/50 p-4.5 rounded-[3px] select-none">
                <span className="text-slate-555 uppercase tracking-wide text-[9px] font-bold">Contact Role:</span>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="isCustomer" checked={isCustomerCheckbox} onChange={e => handleCustomerCheckboxChange(e.target.checked)} className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer" />
                  <label htmlFor="isCustomer" className="text-slate-800 font-bold text-xs cursor-pointer">Customer</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="isSupplier" checked={isSupplierCheckbox} onChange={e => handleSupplierCheckboxChange(e.target.checked)} className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer" />
                  <label htmlFor="isSupplier" className="text-slate-800 font-bold text-xs cursor-pointer">Supplier</label>
                </div>
              </div>
              <div className="flex space-x-3 pt-4 justify-end border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium">
                  {isSubmitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
