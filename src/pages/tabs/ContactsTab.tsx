import { useState, useEffect, useRef } from 'react'
import { Plus, Users, Mail, Phone, MapPin, Trash2, Search } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Contact } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'

interface ContactsTabProps {
  activeOrg: Organization
  isMockMode?: boolean
  initialFilter?: 'All' | 'Customer' | 'Supplier' | 'Archive'
}

export function ContactsTab({ activeOrg, isMockMode = false, initialFilter = 'All' }: ContactsTabProps) {
  const { showConfirm, showAlert } = usePopup()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc'>('name-asc')
  
  // Local Filter state
  const [filterType, setFilterType] = useState<'All' | 'Customer' | 'Supplier' | 'Archive'>(initialFilter)

  // Streamlined Modal State (Exactly the 5 requested fields + checkboxes)
  const [isModalOpen, setIsModalOpen] = useState(() => {
    const autoOpen = localStorage.getItem('kdm_auto_open_contact_modal')
    if (autoOpen === 'true') {
      localStorage.removeItem('kdm_auto_open_contact_modal')
      return true
    }
    return false
  })
  const [contactPerson, setContactPerson] = useState('') // Name
  const [businessName, setBusinessName] = useState('')   // Business Name
  const [email, setEmail] = useState('')                 // Email
  const [phone, setPhone] = useState('')                 // Contact (phone)
  const [address, setAddress] = useState('')             // Address
  const [isCustomerCheckbox, setIsCustomerCheckbox] = useState(true)
  const [isSupplierCheckbox, setIsSupplierCheckbox] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync initial filter prop changes
  useEffect(() => {
    setFilterType(initialFilter)
  }, [initialFilter])

  // Ref to track last active focused element before modal launches
  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isModalOpen) {
      if (lastActiveElementRef.current) {
        const el = lastActiveElementRef.current
        setTimeout(() => {
          if (el && document.body.contains(el)) {
            el.focus()
          }
        }, 50)
        lastActiveElementRef.current = null
      }
    }
  }, [isModalOpen])

  const handleCustomerCheckboxChange = (checked: boolean) => {
    if (!checked && !isSupplierCheckbox) {
      return
    }
    setIsCustomerCheckbox(checked)
  }

  const handleSupplierCheckboxChange = (checked: boolean) => {
    if (!checked && !isCustomerCheckbox) {
      return
    }
    setIsSupplierCheckbox(checked)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      if (isMockMode) {
        setContacts([])
        setLoading(false)
        return
      }

      const contactsData = await apiService.getContacts(activeOrg.id)
      setContacts(contactsData)
    } catch (e) {
      console.warn("Failed to load contacts.", e)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
  }, [activeOrg.id, isMockMode])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [filterType])

  // Load archived contact IDs from localStorage to survive tab reloads
  useEffect(() => {
    const saved = localStorage.getItem(`kdm_archived_contacts_${activeOrg.id}`)
    if (saved) {
      try {
        setArchivedIds(new Set(JSON.parse(saved)))
      } catch {
        setArchivedIds(new Set())
      }
    } else {
      setArchivedIds(new Set())
    }
  }, [activeOrg.id])

  const saveArchivedIds = (next: Set<string>) => {
    setArchivedIds(next)
    localStorage.setItem(`kdm_archived_contacts_${activeOrg.id}`, JSON.stringify(Array.from(next)))
  }

  // Bulk Archive / Restore contacts
  const handleBulkArchive = () => {
    const isRestoring = filterType === 'Archive'
    const nextArchived = new Set(archivedIds)

    selectedIds.forEach(id => {
      if (isRestoring) {
        nextArchived.delete(id)
      } else {
        nextArchived.add(id)
      }
    })

    saveArchivedIds(nextArchived)
    setSelectedIds(new Set())
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
    ) {
      return
    }
    handleEditClick(contact)
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
        if (isMockMode) {
          setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, ...payload } : c))
          setIsModalOpen(false)
          setEditingContact(null)
          resetForm()
          return
        }

        const updated = await apiService.updateContact(editingContact.id!, payload)
        setContacts(prev => prev.map(c => c.id === editingContact.id ? updated : c))
        setIsModalOpen(false)
        setEditingContact(null)
        resetForm()
      } else {
        if (isMockMode) {
          const newCont: Contact = {
            id: `mock-cont-${Date.now()}`,
            name: businessName,
            tax_number: contactPerson,
            email,
            phone,
            billing_address: address,
            contact_type,
            created_at: new Date().toISOString()
          }
          setContacts(prev => [...prev, newCont].sort((a, b) => a.name.localeCompare(b.name)))
          setIsModalOpen(false)
          resetForm()
          return
        }

        const created = await apiService.createContact(activeOrg.id, payload)
        setContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setIsModalOpen(false)
        resetForm()
      }
    } catch (e: any) {
      showAlert({ title: 'Error Saving Contact', message: "Failed to save contact: " + (e.message || "Contact Business Name must be unique"), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteContact = async (contId: string) => {
    await showConfirm({
      title: 'Delete Contact',
      message: 'Are you sure you want to permanently delete this contact record?',
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          if (isMockMode) {
            setContacts(prev => prev.filter(c => c.id !== contId))
            return
          }
 
          await apiService.deleteContact(contId)
          setContacts(prev => prev.filter(c => c.id !== contId))
        } catch (e: any) {
          showAlert({ title: 'Deletion Failed', message: "Deletion failed: " + e.message, type: 'error' })
          throw e
        }
      }
    })
  }

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Toggle all visible/filtered selection
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

  // Bulk Delete
  const handleBulkDelete = async () => {
    const list = Array.from(selectedIds)
    if (list.length === 0) return
 
    await showConfirm({
      title: 'Bulk Delete Contacts',
      message: `Are you sure you want to permanently delete ${list.length} selected contact(s)?`,
      confirmText: 'Delete All',
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true)
        try {
          if (isMockMode) {
            setContacts(prev => prev.filter(c => !selectedIds.has(c.id!)))
          } else {
            await Promise.all(list.map(id => apiService.deleteContact(id)))
            setContacts(prev => prev.filter(c => !selectedIds.has(c.id!)))
          }
          setSelectedIds(new Set())
        } catch (e: any) {
          showAlert({ title: 'Bulk Deletion Failed', message: "Failed to delete contacts: " + e.message, type: 'error' })
          throw e
        } finally {
          setLoading(false)
        }
      }
    })
  }

  // Bulk Mark Role
  const handleBulkMarkRole = async (targetRole: 'Customer' | 'Supplier') => {
    const selectedContacts = contacts.filter(c => selectedIds.has(c.id!))
    if (selectedContacts.length === 0) return

    setLoading(true)
    try {
      if (isMockMode) {
        setContacts(prev => prev.map(c => {
          if (selectedIds.has(c.id!)) {
            let nextRole = c.contact_type
            if (targetRole === 'Customer') {
              nextRole = c.contact_type === 'Supplier' ? 'Both' : c.contact_type
            } else {
              nextRole = c.contact_type === 'Customer' ? 'Both' : c.contact_type
            }
            return { ...c, contact_type: nextRole }
          }
          return c
        }))
      } else {
        await Promise.all(selectedContacts.map(c => {
          let nextRole = c.contact_type
          if (targetRole === 'Customer') {
            nextRole = c.contact_type === 'Supplier' ? 'Both' : c.contact_type
          } else {
            nextRole = c.contact_type === 'Customer' ? 'Both' : c.contact_type
          }
          if (nextRole !== c.contact_type) {
            return apiService.updateContact(c.id!, { contact_type: nextRole })
          }
          return Promise.resolve(c)
        }))
        // Reload contacts from DB
        const contactsData = await apiService.getContacts(activeOrg.id)
        setContacts(contactsData)
      }
      showAlert({ title: 'Status Updated', message: `Successfully marked selected contact(s) as ${targetRole}.`, type: 'success' })
      setSelectedIds(new Set())
    } catch (e: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update contact roles: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
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

  // Filter logic with Dynamic Search
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.tax_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.billing_address || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    const isArchived = archivedIds.has(contact.id!)
    if (filterType === 'Archive') {
      if (!isArchived) return false
    } else {
      if (isArchived) return false
      
      if (filterType === 'Customer') return contact.contact_type === 'Customer' || contact.contact_type === 'Both'
      if (filterType === 'Supplier') return contact.contact_type === 'Supplier' || contact.contact_type === 'Both'
    }
    return true
  })

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
    if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
    return 0
  })

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left">
      
      {/* Header and Add Contact button */}
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

      {/* Filter Menu Tabs & Search inside component */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-0 gap-4">
        <div className="flex space-x-1 select-none text-xs font-semibold -mb-[1px] relative z-10">
          {(['All', 'Customer', 'Supplier', 'Archive'] as const).map(f => {
            const isActive = filterType === f
            return (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-4 py-2 text-xs font-semibold transition-all border rounded-t-[3px] cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#0F5B38] border-slate-200 border-b-transparent font-bold -mb-[1px] relative z-10'
                    : 'bg-transparent hover:bg-slate-50 text-slate-450 hover:text-slate-850 border-slate-200'
                }`}
              >
                {f === 'All' ? 'All Contacts' : f === 'Customer' ? 'Customers' : f === 'Supplier' ? 'Suppliers' : 'Archive'}
              </button>
            )
          })}
        </div>

        {/* Right side search & bulk action container */}
        <div className="flex items-end space-x-2 w-full sm:w-auto justify-end gap-2 pb-0 mb-[2px]">
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={handleBulkArchive}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                {filterType === 'Archive' ? 'Restore Active' : 'Archive'}
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

          <div className="flex items-center space-x-1">
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
        /* Professional Borderless Table Format (No redundant outer borders) */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredContacts.length > 0 && filteredContacts.every(contact => selectedIds.has(contact.id!))}
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
                <th className="px-6 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {sortedContacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={(e) => handleRowClick(e, contact)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out ${selectedIds.has(contact.id!) ? 'bg-emerald-50/20' : ''} cursor-pointer`}
                >
                  <td className="px-4 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id!)}
                      onChange={() => handleToggleSelect(contact.id!)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">
                      {contact.name}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-semibold text-[#0F5B38]">{contact.tax_number || '—'}</td>
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
                  <td className="px-6 py-2.5 font-semibold text-slate-500">
                    {archivedIds.has(contact.id!) ? 'Archived' : 'Active'}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <button
                      onClick={() => handleDeleteContact(contact.id!)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition-all cursor-pointer"
                      title="Delete Contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50/50 rounded-[3px] border border-slate-200/60 p-8 space-y-4">
          <div className="mx-auto h-14 w-14 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <Users className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No matching contacts</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
              Create your contacts here to establish a clean relational bookkeeping index.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="bg-[#0F5B38] hover:brightness-105 text-white font-semibold text-xs px-5 py-2.5 rounded-[3px] shadow-md transition cursor-pointer"
          >
            Add Your First Contact
          </button>
        </div>
      )}

      {/* Modern, Highly Refined Glassmorphic Pop-up Modal for Adding Contact */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-lg border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
            
            {/* Modal Title Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-850">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
                <p className="text-[11px] text-slate-450 font-medium">Provide basic contact indices to register business profiles.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form inputs - Exactly 5 Streamlined Fields */}
            <form onSubmit={handleAddContact} className="space-y-4 text-xs font-semibold text-slate-605">
              
              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Contact Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Alice Smith"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kodmarc Software LLC"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. billing@kodmarc.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Contact (Phone)</label>
                  <input
                    type="text"
                    placeholder="e.g. +65 6789 0123"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Address</label>
                <textarea
                  placeholder="Full postal billing or shipping address..."
                  rows={3}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition resize-none placeholder:text-slate-350"
                ></textarea>
              </div>

              {/* Role Checkboxes */}
              <div className="flex items-center space-x-6 bg-slate-55/70 border border-slate-200/50 p-4.5 rounded-[3px] select-none">
                <span className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Contact Role:</span>
                <div className="flex items-center space-x-2 flex-row">
                  <input
                    type="checkbox"
                    id="isCustomer"
                    checked={isCustomerCheckbox}
                    onChange={e => handleCustomerCheckboxChange(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer"
                  />
                  <label htmlFor="isCustomer" className="text-slate-800 font-bold text-xs cursor-pointer">Customer</label>
                </div>
                <div className="flex items-center space-x-2 flex-row">
                  <input
                    type="checkbox"
                    id="isSupplier"
                    checked={isSupplierCheckbox}
                    onChange={e => handleSupplierCheckboxChange(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer"
                  />
                  <label htmlFor="isSupplier" className="text-slate-800 font-bold text-xs cursor-pointer">Supplier</label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex space-x-3 pt-4 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium"
                >
                  {isSubmitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
