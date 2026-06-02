import { useState, useEffect } from 'react'
import { Plus, FileText, Search, Trash2, Eye, CheckCircle, Send, X, Shield, ArrowUpDown, ChevronDown } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Quote, Contact, Item, Account, TaxRate, SalesSetting } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'

interface QuotesTabProps {
  activeOrg: Organization
  isMockMode?: boolean
  autoOpenDrawer?: boolean
  onCloseAutoOpen?: () => void
  onConvertToInvoice: (quote: Quote) => void
  setActiveTab: (tab: any) => void
  onEditQuote: (id: string) => void
  onCreateNewQuote: () => void
}

export function QuotesTab({ 
  activeOrg, 
  isMockMode = false, 
  autoOpenDrawer = false,
  onCloseAutoOpen,
  onConvertToInvoice,
  setActiveTab,
  onEditQuote,
  onCreateNewQuote
}: QuotesTabProps) {
  const { showConfirm, showAlert } = usePopup()
  // Database states
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [salesSetting, setSalesSetting] = useState<SalesSetting | null>(null)

  // Loading & UI States
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced'>('All')
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'amount-asc' | 'amount-desc'>('date-desc')
  
  // Selection columns
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Drawer / Modal for creating quotes
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Quote Form Fields
  const [selectedContactId, setSelectedContactId] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Quote Line Items state
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

  // Selected quote for statement PDF preview panel
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  // Auto open new quote page if requested by Quick Action
  useEffect(() => {
    if (autoOpenDrawer) {
      setActiveTab('CreateQuote')
      if (onCloseAutoOpen) onCloseAutoOpen()
    }
  }, [autoOpenDrawer])

  // Real-time auto quote number generator based on settings
  useEffect(() => {
    if (isDrawerOpen && salesSetting) {
      const numStr = String(salesSetting.next_quote_number).padStart(4, '0')
      setQuoteNumber(`${salesSetting.quote_prefix}${numStr}`)
      
      // Auto calculate expiry date
      const today = new Date()
      today.setDate(today.getDate() + 15) // default 15 days expiry
      setExpiryDate(today.toISOString().split('T')[0])
    }
  }, [isDrawerOpen, salesSetting])

  // Load all master list data
  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (isMockMode) {
        // Load offline items
        const savedQuotes = localStorage.getItem(`kdm_mock_quotes_${activeOrg.id}`)
        const savedSettings = localStorage.getItem(`kdm_mock_settings_${activeOrg.id}`)
        
        // Mock contacts/accounts/taxRates/catalog if missing
        const mockContacts: Contact[] = [
          { id: 'mock-c-1', name: 'Alibaba SG', email: 'billing@alibaba.com', phone: '+65 6729 0122', tax_number: 'VAT-9021', billing_address: '8 Shenton Way, Singapore 068811', default_sales_account: null, default_purchase_account: null, contact_type: 'Customer', created_at: '' },
          { id: 'mock-c-2', name: 'Saad Software Designs', email: 'saad@softwaredesigns.com', phone: '+92 300 1234567', tax_number: 'NTN-49102', billing_address: 'DHA Phase 6, Lahore, Pakistan', default_sales_account: null, default_purchase_account: null, contact_type: 'Customer', created_at: '' }
        ]
        const mockAccounts: Account[] = [
          { id: 'mock-a-1', code: '200', name: 'Sales Revenue', class_type: 'Revenue', type: 'Sales', default_tax_rate: null, description: 'Direct sales revenue ledger', is_system_account: false, created_at: '' },
          { id: 'mock-a-2', code: '210', name: 'Consulting Income', class_type: 'Revenue', type: 'Sales', default_tax_rate: null, description: 'Consulting hours fees', is_system_account: false, created_at: '' }
        ]
        const mockTaxRates: TaxRate[] = [
          { id: 'mock-t-1', name: 'SG GST 9%', rate: 9.0, is_active: true, created_at: '' },
          { id: 'mock-t-2', name: 'Tax Exempt', rate: 0.0, is_active: true, created_at: '' }
        ]
        const mockCatalog: Item[] = [
          { id: 'mock-i-1', code: 'PROD-DEV', name: 'Custom Software Development', is_sold: true, sales_unit_price: 150.00, sales_account: 'mock-a-1', sales_tax_rate: 'mock-t-1', sales_description: 'Full-stack software engineering consultation hourly rate', is_purchased: false, purchase_unit_cost: 0, purchase_account: null, purchase_tax_rate: null, purchase_description: '', created_at: '' },
          { id: 'mock-i-2', code: 'HOST-CLOUD', name: 'Cloud Hosting Subscription', is_sold: true, sales_unit_price: 49.00, sales_account: 'mock-a-1', sales_tax_rate: 'mock-t-1', sales_description: 'Monthly cloud virtual machine container resource allocations', is_purchased: false, purchase_unit_cost: 0, purchase_account: null, purchase_tax_rate: null, purchase_description: '', created_at: '' }
        ]

        setQuotes(savedQuotes ? JSON.parse(savedQuotes) : [])
        setContacts(mockContacts)
        setAccounts(mockAccounts)
        setTaxRates(mockTaxRates)
        setCatalogItems(mockCatalog)

        // Default settings
        if (savedSettings) {
          setSalesSetting(JSON.parse(savedSettings))
        } else {
          setSalesSetting({
            invoice_prefix: 'INV-',
            next_invoice_number: 1001,
            quote_prefix: 'QT-',
            next_quote_number: 1001,
            standard_payment_terms: '15 days',
            default_footer: 'Thank you for your business!'
          })
        }
        
        // Auto default line account and tax in form
        if (mockAccounts.length > 0) {
          setLines([{ id: '1', itemId: '', description: '', quantity: 1, unitPrice: 0, accountId: mockAccounts[0].id, taxRateId: mockTaxRates[0].id }])
        }

        setLoading(false)
        return
      }

      // API Database fetches
      const [quoteList, contactList, itemList, accList, taxList, settingData] = await Promise.all([
        apiService.getQuotes(activeOrg.id),
        apiService.getContacts(activeOrg.id),
        apiService.getItems(activeOrg.id),
        apiService.getAccounts(activeOrg.id),
        apiService.getTaxRates(activeOrg.id),
        apiService.getSalesSettings(activeOrg.id)
      ])

      setQuotes(quoteList)
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
      console.warn("Failed to load quotes suite", e)
      setErrorMsg(e.message || "Failed to load quotations ledger.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
    setSelectedQuote(null)
  }, [activeOrg.id, isMockMode])

  // Reset checkboxes on filter transition
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter])

  // Catalog populate
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

  // Row lines
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

  // Submit Quote
  const handleSubmitQuote = async (status: 'Draft' | 'Sent') => {
    if (!selectedContactId) {
      showAlert({ title: 'Validation Warning', message: 'Please select a valid customer.', type: 'warning' })
      return
    }

    const emptyLines = lines.some(l => l.quantity <= 0 || !l.accountId)
    if (emptyLines) {
      showAlert({ title: 'Validation Warning', message: 'All lines must contain a valid quantity, sales unit price, and sales ledger account code.', type: 'warning' })
      return
    }

    setIsSubmitting(true)

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

    const payload: Partial<Quote> = {
      contact: selectedContactId,
      quote_number: quoteNumber,
      reference,
      date,
      expiry_date: expiryDate,
      status,
      subtotal: getSubtotal(),
      tax_total: getTaxTotal(),
      total: getGrandTotal(),
      lines: postLines as any
    }

    try {
      if (isMockMode) {
        const contactObj = contacts.find(c => c.id === selectedContactId)
        const mockCreated: Quote = {
          id: `mock-q-${Date.now()}`,
          contact: selectedContactId,
          contact_name: contactObj ? contactObj.name : "Mock Customer",
          quote_number: quoteNumber,
          reference,
          date,
          expiry_date: expiryDate,
          status,
          subtotal: getSubtotal(),
          tax_total: getTaxTotal(),
          total: getGrandTotal(),
          lines: postLines.map((pl, idx) => ({
            ...pl,
            id: `mock-q-l-${idx}-${Date.now()}`
          })) as any,
          created_at: new Date().toISOString()
        }

        const newQuotes = [mockCreated, ...quotes]
        setQuotes(newQuotes)
        localStorage.setItem(`kdm_mock_quotes_${activeOrg.id}`, JSON.stringify(newQuotes))
        
        // Increment quote serial settings
        if (salesSetting) {
          const updatedSetting = {
            ...salesSetting,
            next_quote_number: salesSetting.next_quote_number + 1
          }
          setSalesSetting(updatedSetting)
          localStorage.setItem(`kdm_mock_settings_${activeOrg.id}`, JSON.stringify(updatedSetting))
        }

        setIsDrawerOpen(false)
        resetForm()
        return
      }

      const created = await apiService.createQuote(activeOrg.id, payload)
      setQuotes(prev => [created, ...prev])
      
      // Update local next_quote_number
      if (salesSetting) {
        setSalesSetting({
          ...salesSetting,
          next_quote_number: salesSetting.next_quote_number + 1
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

  // Convert accepted quote to draft invoice
  const handleTriggerConvert = async (quote: Quote) => {
    // Set status to Accepted if it wasn't already
    try {
      if (quote.status !== 'Accepted') {
        if (isMockMode) {
          const updated = quotes.map(q => {
            if (q.id === quote.id) return { ...q, status: 'Accepted' as const }
            return q
          })
          setQuotes(updated)
          localStorage.setItem(`kdm_mock_quotes_${activeOrg.id}`, JSON.stringify(updated))
        } else {
          await apiService.updateQuote(quote.id!, { status: 'Accepted' })
          setQuotes(prev => prev.map(q => {
            if (q.id === quote.id) return { ...q, status: 'Accepted' as const }
            return q
          }))
        }
      }

      // Trigger the parent component router conversion
      onConvertToInvoice(quote)
    } catch (err: any) {
      showAlert({ title: 'Conversion Failed', message: "Failed to convert: " + err.message, type: 'error' })
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

  // Bulk operations
  const handleBulkDelete = async () => {
    const targets = quotes.filter(q => selectedIds.has(q.id!))
    const nonDrafts = targets.some(q => q.status !== 'Draft')
    if (nonDrafts) {
      showAlert({
        title: 'Compliance Warning',
        message: 'Compliance alert: Only draft quotation pipelines can be deleted.',
        type: 'warning'
      })
      return
    }

    const confirmed = await showConfirm({
      title: 'Delete Quotes',
      message: `Are you sure you want to delete these ${selectedIds.size} draft quotes?`,
      confirmText: 'Delete Selected',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      if (isMockMode) {
        const remaining = quotes.filter(q => !selectedIds.has(q.id!))
        setQuotes(remaining)
        localStorage.setItem(`kdm_mock_quotes_${activeOrg.id}`, JSON.stringify(remaining))
        setSelectedIds(new Set())
        return
      }

      await Promise.all(Array.from(selectedIds).map(id => apiService.deleteQuote(id)))
      setQuotes(prev => prev.filter(q => !selectedIds.has(q.id!)))
      setSelectedIds(new Set())
    } catch (err: any) {
      showAlert({ title: 'Bulk Deletion Failed', message: "Bulk deletion failed: " + err.message, type: 'error' })
    }
  }

  const handleBulkChangeStatus = async (status: 'Draft' | 'Sent' | 'Accepted' | 'Declined') => {
    try {
      if (isMockMode) {
        const updated = quotes.map(q => {
          if (selectedIds.has(q.id!)) {
            return { ...q, status }
          }
          return q
        })
        setQuotes(updated)
        localStorage.setItem(`kdm_mock_quotes_${activeOrg.id}`, JSON.stringify(updated))
        setSelectedIds(new Set())
        return
      }

      await Promise.all(Array.from(selectedIds).map(id => 
        apiService.updateQuote(id, { status })
      ))

      setQuotes(prev => prev.map(q => {
        if (selectedIds.has(q.id!)) return { ...q, status }
        return q
      }))
      setSelectedIds(new Set())
    } catch (err: any) {
      alert("Failed to update status: " + err.message)
    }
  }

  // Filter & Sort
  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = 
      q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.contact_name && q.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.reference && q.reference.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    if (statusFilter === 'All') return true
    return q.status === statusFilter
  })

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
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
          <FileText className="h-5 w-5 text-[#0F5B38]" />
          <span>Sales quotations</span>
        </h2>
        <button
          onClick={onCreateNewQuote}
          className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] shadow-md transition duration-200 cursor-pointer w-fit self-end sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>New Quote</span>
        </button>
      </div>

      {/* 2. Filter Menu Tabs & Search, Sorting, and Bulk Actions (Page Category A Styling) */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between border-b border-slate-200 pb-0 gap-4">
        <div className="flex space-x-1 select-none text-xs font-semibold -mb-[1px] relative z-10 overflow-x-auto scrollbar-none">
          {(['All', 'Draft', 'Sent', 'Accepted', 'Declined', 'Invoiced'] as const).map(tab => {
            const count = quotes.filter(q => {
              if (tab === 'All') return true
              return q.status === tab
            }).length
            const isActive = statusFilter === tab

            return (
              <button
                key={tab}
                onClick={() => { setStatusFilter(tab); setSelectedQuote(null); }}
                className={`px-4 py-2 text-xs font-semibold transition-all border rounded-t-[3px] cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#0F5B38] border-slate-200 border-b-transparent font-bold -mb-[1px] relative z-10'
                    : 'bg-transparent hover:bg-slate-50 text-slate-450 hover:text-slate-855 border-slate-200'
                }`}
              >
                <span>{tab === 'All' ? 'All Quotes' : tab}</span>
                <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-emerald-50 text-[#0F5B38]' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right side search, sorting & bulk action container */}
        <div className="flex items-end space-x-2 w-full xl:w-auto justify-end gap-2 pb-0 mb-[2px]">
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => handleBulkChangeStatus('Draft')}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Mark as Draft
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
              <option value="date-desc">Date Latest</option>
              <option value="date-asc">Date Oldest</option>
              <option value="amount-asc">Price (Min to Max)</option>
              <option value="amount-desc">Price (Max to Min)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Full-Width Quotes List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex space-x-1.5 items-center">
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
          </div>
        </div>
      ) : sortedQuotes.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 border border-slate-200 rounded-[3px] p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No quotes match your filters</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto font-medium leading-relaxed">
              Use the **New Quote** button on the top right to start a sales proposal!
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
                      onChange={() => handleToggleSelectAll(sortedQuotes.map(q => q.id!))}
                      checked={sortedQuotes.length > 0 && sortedQuotes.every(q => selectedIds.has(q.id!))}
                      className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Number</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {sortedQuotes.map(q => {
                  const isSelected = selectedIds.has(q.id!)

                  return (
                    <tr 
                      key={q.id} 
                      onClick={() => onEditQuote(q.quote_number || q.id!)}
                      className="hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={() => handleToggleSelect(q.id!)}
                           className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] cursor-pointer"
                         />
                       </td>
                       <td className="p-3 font-bold text-slate-800 max-w-[140px] truncate">{q.contact_name || "Client"}</td>
                       <td className="p-3 font-semibold text-slate-600">{q.quote_number}</td>
                       <td className="p-3 text-slate-400 italic max-w-[100px] truncate">{q.reference || "-"}</td>
                       <td className="p-3 whitespace-nowrap">{q.date}</td>
                       <td className="p-3 whitespace-nowrap">{q.expiry_date}</td>
                       <td className="p-3 text-right font-bold text-slate-800">{currencySymbol}{Number(q.total).toFixed(2)}</td>
                       <td className="p-3 text-center whitespace-nowrap">
                         <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                           q.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                           q.status === 'Declined' ? 'bg-rose-50 text-rose-600' :
                           q.status === 'Sent' ? 'bg-blue-50 text-blue-600 border border-blue-100/30' :
                           q.status === 'Invoiced' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/30' :
                           'bg-slate-100 text-slate-500'
                         }`}>
                           {q.status}
                         </span>
                       </td>
                       <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                         <button
                           onClick={() => onEditQuote(q.quote_number || q.id!)}
                           className="p-1 text-slate-400 hover:text-[#0F5B38] rounded-[3px] transition cursor-pointer"
                           title="Edit sales quotation"
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
