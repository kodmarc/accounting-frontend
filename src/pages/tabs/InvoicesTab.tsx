import { useState, useEffect } from 'react'
import { Plus, Receipt, Search, Trash2, Eye, Printer, CheckCircle, Send, X, ArrowUpDown, ChevronDown } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Invoice, Contact, Item, Account, TaxRate, SalesSetting } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'
import type { TabId } from '../../types/tabs'

interface InvoicesTabProps {
  activeOrg: Organization
  autoOpenDrawer?: boolean
  onCloseAutoOpen?: () => void
  setActiveTab: (tab: TabId) => void
  onEditInvoice: (id: string) => void
  onCreateNewInvoice: () => void
}

export function InvoicesTab({
  activeOrg,
  autoOpenDrawer = false,
  onCloseAutoOpen,
  setActiveTab,
  onEditInvoice,
  onCreateNewInvoice
}: InvoicesTabProps) {
  const { showConfirm, showAlert } = usePopup()
  // Database states
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [salesSetting, setSalesSetting] = useState<SalesSetting | null>(null)

  // Loading & UI States
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid' | 'Overdue'>('All')
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'amount-asc' | 'amount-desc'>('date-desc')
  
  // Selection check columns
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Drawer / Modal for creating invoices
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Invoice Form Fields
  const [selectedContactId, setSelectedContactId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Invoice Line Items state
  interface LineFormItem {
    id: string
    itemId: string
    description: string
    quantity: number
    unitPrice: number
    accountId: string
    taxRateId: string
  }
  const [lines, setLines] = useState<LineFormItem[]>([
    { id: '1', itemId: '', description: '', quantity: 1, unitPrice: 0, accountId: '', taxRateId: '' }
  ])



  // Auto-open new invoice page if requested by Quick Action
  useEffect(() => {
    if (autoOpenDrawer) {
      setActiveTab('CreateInvoice')
      if (onCloseAutoOpen) onCloseAutoOpen()
    }
  }, [autoOpenDrawer])

  // Real-time auto invoice number generator based on settings
  useEffect(() => {
    if (isDrawerOpen && salesSetting) {
      const numStr = String(salesSetting.next_invoice_number).padStart(4, '0')
      setInvoiceNumber(`${salesSetting.invoice_prefix}${numStr}`)
      
      // Auto calculate standard due date based on payment terms
      const today = new Date()
      let days = 15
      if (salesSetting.standard_payment_terms.toLowerCase().includes('30')) days = 30
      if (salesSetting.standard_payment_terms.toLowerCase().includes('receipt')) days = 0
      
      today.setDate(today.getDate() + days)
      setDueDate(today.toISOString().split('T')[0])
    }
  }, [isDrawerOpen, salesSetting])

  // Load all master list data
  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      // API Database fetches
      const [invList, contactList, itemList, accList, taxList, settingData] = await Promise.all([
        apiService.getInvoices(activeOrg.id),
        apiService.getContacts(activeOrg.id),
        apiService.getItems(activeOrg.id),
        apiService.getAccounts(activeOrg.id),
        apiService.getTaxRates(activeOrg.id),
        apiService.getSalesSettings(activeOrg.id)
      ])

      setInvoices(invList)
      setContacts(contactList.filter(c => c.contact_type === 'Customer' || c.contact_type === 'Both'))
      setCatalogItems(itemList.filter(i => i.is_sold))
      setAccounts(accList)
      setTaxRates(taxList)
      setSalesSetting(settingData)

      // Auto assign defaults for new row
      const firstAcc = accList[0]?.id || ''
      const firstTax = taxList[0]?.id || ''
      setLines([{ id: '1', itemId: '', description: '', quantity: 1, unitPrice: 0, accountId: firstAcc, taxRateId: firstTax }])

      // Auto select contact if none
      if (contactList.length > 0) {
        setSelectedContactId(contactList[0].id)
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load transactional ledger.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
  }, [activeOrg.id])

  // Reset checkboxes on filter transition
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter])

  // Catalog Selection populate fields automatically
  const handleCatalogSelect = (index: number, itemId: string) => {
    const targetItem = catalogItems.find(i => i.id === itemId)
    if (!targetItem) return

    const updated = [...lines]
    updated[index].itemId = itemId
    updated[index].description = targetItem.sales_description || targetItem.name
    updated[index].unitPrice = Number(targetItem.sales_unit_price)
    
    if (targetItem.sales_account) updated[index].accountId = targetItem.sales_account
    if (targetItem.sales_tax_rate) updated[index].taxRateId = targetItem.sales_tax_rate

    setLines(updated)
  }

  // Row line updates
  const updateLineField = (index: number, field: keyof LineFormItem, value: any) => {
    const updated = [...lines]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setLines(updated)
  }

  const addLineItem = () => {
    const defaultAcc = accounts[0]?.id || ''
    const defaultTax = taxRates[0]?.id || ''
    setLines([...lines, {
      id: String(Date.now()),
      itemId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      accountId: defaultAcc,
      taxRateId: defaultTax
    }])
  }

  const removeLineItem = (index: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, idx) => idx !== index))
  }

  // Calculations for Creator Grid
  const getSubtotal = () => {
    return lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0)
  }

  const getTaxTotal = () => {
    return lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice
      const rateObj = taxRates.find(t => t.id === line.taxRateId)
      const rateVal = rateObj ? Number(rateObj.rate) : 0
      return sum + (lineTotal * (rateVal / 100))
    }, 0)
  }

  const getGrandTotal = () => {
    return getSubtotal() + getTaxTotal()
  }

  // Submit Invoice
  const handleSubmitInvoice = async (status: 'Draft' | 'Awaiting Payment') => {
    if (!selectedContactId) {
      showAlert({ title: 'Validation Warning', message: 'Please select a valid customer.', type: 'warning' })
      return
    }

    // Line Validation
    const emptyLines = lines.some(l => l.quantity <= 0 || !l.accountId)
    if (emptyLines) {
      showAlert({ title: 'Validation Warning', message: 'All lines must contain a valid quantity, sales unit price, and sales ledger account code.', type: 'warning' })
      return
    }

    setIsSubmitting(true)

    // Build payload lines matching Django InvoiceLineSerializer
    const postLines = lines.map(l => {
      const lineTotal = l.quantity * l.unitPrice
      return {
        item: l.itemId ? l.itemId : null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        account: l.accountId,
        tax_rate: l.taxRateId ? l.taxRateId : null,
        total: lineTotal
      }
    })

    const payload: Partial<Invoice> = {
      contact: selectedContactId,
      invoice_number: invoiceNumber,
      reference,
      date,
      due_date: dueDate,
      status,
      subtotal: getSubtotal(),
      tax_total: getTaxTotal(),
      total: getGrandTotal(),
      lines: postLines as any
    }

    try {
      // API call to Django
      const created = await apiService.createInvoice(activeOrg.id, payload)
      setInvoices(prev => [created, ...prev])
      
      // Update local next_invoice_number
      if (salesSetting) {
        setSalesSetting({
          ...salesSetting,
          next_invoice_number: salesSetting.next_invoice_number + 1
        })
      }

      setIsDrawerOpen(false)
      resetForm()
    } catch (err: any) {
      showAlert({ title: 'System Error', message: "System error: " + (err.message || "Unique number conflict"), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setSelectedContactId(contacts[0]?.id || '')
    setReference('')
    const firstAcc = accounts[0]?.id || ''
    const firstTax = taxRates[0]?.id || ''
    setLines([{ id: '1', itemId: '', description: '', quantity: 1, unitPrice: 0, accountId: firstAcc, taxRateId: firstTax }])
  }

  // Selection toggle
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleToggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) {
      visibleIds.forEach(id => next.delete(id))
    } else {
      visibleIds.forEach(id => next.add(id))
    }
    setSelectedIds(next)
  }

  // Bulk Operations
  const handleBulkDelete = async () => {
    const targets = invoices.filter(i => selectedIds.has(i.id!))
    const nonDrafts = targets.some(i => i.status !== 'Draft')
    if (nonDrafts) {
      showAlert({
        title: 'Compliance Warning',
        message: 'Xero Compliance Protection: Only draft invoice statements can be deleted. Approved accounting journals must be credited out.',
        type: 'warning'
      })
      return
    }

    const confirmed = await showConfirm({
      title: 'Delete Invoices',
      message: `Are you sure you want to delete these ${selectedIds.size} draft invoice statements?`,
      confirmText: 'Delete Selected',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      await Promise.all(Array.from(selectedIds).map(id => apiService.deleteInvoice(id, activeOrg.id)))
      setInvoices(prev => prev.filter(i => !selectedIds.has(i.id!)))
      setSelectedIds(new Set())
    } catch (err: any) {
      showAlert({ title: 'Bulk Deletion Failed', message: "Bulk deletion failed: " + err.message, type: 'error' })
    }
  }

  const handleBulkMarkPaid = async () => {
    const confirmed = await showConfirm({
      title: 'Mark Invoices as Paid',
      message: `Mark ${selectedIds.size} invoices as PAID in the ledger?`,
      confirmText: 'Mark Paid'
    })
    if (!confirmed) return

    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        apiService.updateInvoice(id, { status: 'Paid' }, activeOrg.id)
      ))

      setInvoices(prev => prev.map(i => {
        if (selectedIds.has(i.id!)) return { ...i, status: 'Paid' as const }
        return i
      }))
      setSelectedIds(new Set())
    } catch (err: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update status: " + err.message, type: 'error' })
    }
  }

  const handleBulkMarkSent = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        apiService.updateInvoice(id, { status: 'Awaiting Payment' }, activeOrg.id)
      ))

      setInvoices(prev => prev.map(i => {
        if (selectedIds.has(i.id!) && i.status === 'Draft') return { ...i, status: 'Awaiting Payment' as const }
        return i
      }))
      setSelectedIds(new Set())
    } catch (err: any) {
      showAlert({ title: 'Update Failed', message: "Failed to transition: " + err.message, type: 'error' })
    }
  }

  // Filter & Sort Application
  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.contact_name && inv.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.reference && inv.reference.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    if (statusFilter === 'All') return true
    if (statusFilter === 'Overdue') {
      if (inv.status !== 'Awaiting Payment') return false
      return new Date(inv.due_date) < new Date()
    }
    return inv.status === statusFilter
  })

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortOption === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime()
    if (sortOption === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime()
    if (sortOption === 'amount-asc') return Number(a.total) - Number(b.total)
    if (sortOption === 'amount-desc') return Number(b.total) - Number(a.total)
    return 0
  })

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left animate-fadeIn relative">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <Receipt className="h-5 w-5 text-[#0F5B38]" />
          <span>Sales invoices</span>
        </h2>
        <button
          onClick={onCreateNewInvoice}
          className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] shadow-md transition duration-200 cursor-pointer w-fit self-end sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* 2. Filter Menu Tabs & Search, Sorting, and Bulk Actions (Page Category A Styling) */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between border-b border-slate-200 pb-0 gap-4">
        <div className="flex space-x-1 select-none text-xs font-semibold -mb-[1px] relative z-10 overflow-x-auto scrollbar-none">
          {(['All', 'Draft', 'Awaiting Approval', 'Awaiting Payment', 'Paid', 'Overdue'] as const).map(tab => {
            const count = invoices.filter(i => {
              if (tab === 'All') return true
              if (tab === 'Overdue') return i.status === 'Awaiting Payment' && new Date(i.due_date) < new Date()
              return i.status === tab
            }).length
            const isActive = statusFilter === tab

            return (
              <button
                key={tab}
                onClick={() => { setStatusFilter(tab); }}
                className={`px-3 py-2 text-xs font-semibold transition-all border rounded-t-[3px] cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#0F5B38] border-slate-200 border-b-transparent font-bold -mb-[1px] relative z-10'
                    : 'bg-transparent hover:bg-slate-50 text-slate-450 hover:text-slate-855 border-slate-200'
                }`}
              >
                <span>{tab}</span>
                <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-emerald-50 text-[#0F5B38]' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right side search, sorting & bulk action container */}
        <div className="flex flex-row items-center justify-end gap-2.5 flex-grow mb-[2px] w-full xl:w-auto ml-auto">
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
              <button
                onClick={handleBulkMarkSent}
                className="px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Mark Sent
              </button>
              <button
                onClick={handleBulkMarkPaid}
                className="px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Mark Paid
              </button>
              {statusFilter === 'Draft' && (
                <button
                  onClick={handleBulkDelete}
                  className="px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
                >
                  Delete
                </button>
              )}
              <span className="text-[11px] text-slate-400 font-bold px-1 whitespace-nowrap hidden sm:inline">
                {selectedIds.size} selected
              </span>
            </div>
          )}

          <div className="relative w-36 sm:w-36">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-8.5 pr-4 py-2 text-xs font-semibold text-slate-855 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1">
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-1.5 py-2 w-32 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
            >
              <option value="date-desc">Date Latest</option>
              <option value="date-asc">Date Oldest</option>
              <option value="amount-asc">Price (Min to Max)</option>
              <option value="amount-desc">Price (Max to Min)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Full-Width Invoices List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex space-x-1.5 items-center">
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
          </div>
        </div>
      ) : sortedInvoices.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 border border-slate-200 rounded-[3px] p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No invoices match your filters</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto font-medium leading-relaxed">
              Use the **New Invoice** button on the top right to start a transaction workflow!
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={() => handleToggleSelectAll(sortedInvoices.map(i => i.id!))}
                      checked={sortedInvoices.length > 0 && sortedInvoices.every(i => selectedIds.has(i.id!))}
                      className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Number</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {sortedInvoices.map(inv => {
                  const isSelected = selectedIds.has(inv.id!)
                  const isOverdue = inv.status === 'Awaiting Payment' && new Date(inv.due_date) < new Date()

                  return (
                    <tr 
                      key={inv.id} 
                      onClick={() => onEditInvoice(inv.id!)}
                      className="hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={() => handleToggleSelect(inv.id!)}
                           className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] cursor-pointer"
                         />
                       </td>
                       <td className="p-3 font-bold text-slate-800 max-w-[140px] truncate">{inv.contact_name || "Client"}</td>
                       <td className="p-3 font-semibold text-slate-600">{inv.invoice_number}</td>
                       <td className="p-3 text-slate-400 italic max-w-[100px] truncate">{inv.reference || "-"}</td>
                       <td className="p-3 whitespace-nowrap">{inv.date}</td>
                       <td className="p-3 whitespace-nowrap">{inv.due_date}</td>
                       <td className="p-3 text-right font-bold text-slate-800">{currencySymbol}{Number(inv.total).toFixed(2)}</td>
                       <td className="p-3 text-center whitespace-nowrap">
                         <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                           inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                           inv.status === 'Draft' ? 'bg-slate-100 text-slate-500 border border-slate-200/50' :
                           inv.status === 'Awaiting Approval' ? 'bg-blue-50 text-blue-600 border border-blue-100/30' :
                           isOverdue ? 'bg-rose-50 text-rose-600 border border-rose-100/30' : 
                           'bg-amber-50 text-amber-600 border border-amber-100/30'
                         }`}>
                           {isOverdue ? "Overdue" : inv.status}
                         </span>
                       </td>
                       <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                         <button
                           onClick={() => onEditInvoice(inv.id!)}
                           className="p-1 text-slate-400 hover:text-[#0F5B38] rounded-[3px] transition cursor-pointer"
                           title="Edit invoice details"
                         >
                           <Eye className="h-4 w-4" />
                         </button>
                       </td>
                     </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
