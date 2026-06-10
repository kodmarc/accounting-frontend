import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle, Save, X, Loader2, ChevronDown, MoreVertical, AlertCircle } from 'lucide-react'
import { apiService, API_BASE_URL } from '../../services/api'
import type { Organization, Contact, Item, Account, TaxRate, SalesSetting, Invoice, Quote, Project } from '../../services/api'
import { SearchableInput } from '../../components/SearchableInput'
import { EmailModal } from '../../components/EmailModal'
import { usePopup } from '../../components/PopupProvider'
import { XeroDatePicker } from '../../components/XeroDatePicker'

// PDF generation is processed via backend Django endpoints

interface CreateInvoiceTabProps {
  activeOrg: Organization
  isMockMode?: boolean
  setActiveTab: (tab: any) => void
  editingInvoiceId?: string | null
  setEditingInvoiceId?: (id: string | null) => void
}

export function CreateInvoiceTab({
  activeOrg,
  isMockMode = false,
  setActiveTab,
  editingInvoiceId = null,
  setEditingInvoiceId
}: CreateInvoiceTabProps) {
  const { showConfirm, showAlert } = usePopup()
  // Database states
  const [contacts, setContacts] = useState<Contact[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [salesSetting, setSalesSetting] = useState<SalesSetting | null>(null)
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])

  // Approve & Email dropdown state
  const [isApproveDropdownOpen, setIsApproveDropdownOpen] = useState(false)

  // Payment Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [singlePaymentAccountId, setSinglePaymentAccountId] = useState('')
  const [singlePaymentAmount, setSinglePaymentAmount] = useState('')
  const [paymentRows, setPaymentRows] = useState<{ accountId: string; amount: number | '' }[]>([
    { accountId: '', amount: '' }
  ])

  // Loading & UX States
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Form Fields
  const [selectedContactId, setSelectedContactId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid'>('Draft')
  const [currency, setCurrency] = useState(activeOrg.currency || 'USD')
  const [taxType, setTaxType] = useState<'Inclusive' | 'Exclusive' | 'No Tax'>('Exclusive')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [invoiceDbId, setInvoiceDbId] = useState<string | null>(null)

  // Project List & Creation states
  const [projects, setProjects] = useState<Project[]>([])
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectCode, setNewProjectCode] = useState('')

  // Quick Contact & Catalog Item Creation Modals
  const [showQuickContactModal, setShowQuickContactModal] = useState(false)
  const [showQuickItemModal, setShowQuickItemModal] = useState(false)
  const [quickItemLineIndex, setQuickItemLineIndex] = useState<number | null>(null)

  // Quick Contact Modal Form Fields
  const [quickContactName, setQuickContactName] = useState('')
  const [quickContactEmail, setQuickContactEmail] = useState('')
  const [quickContactPhone, setQuickContactPhone] = useState('')
  const [quickContactTaxNumber, setQuickContactTaxNumber] = useState('')
  const [quickContactAddress, setQuickContactAddress] = useState('')

  // Quick Catalog Item Modal Form Fields
  const [quickItemCode, setQuickItemCode] = useState('')
  const [quickItemName, setQuickItemName] = useState('')
  const [quickItemPrice, setQuickItemPrice] = useState('0.00')
  const [quickItemAccountId, setQuickItemAccountId] = useState('')
  const [quickItemTaxRateId, setQuickItemTaxRateId] = useState('')
  const [quickItemDescription, setQuickItemDescription] = useState('')

  // Pre-select default revenue account and tax rate for quick item modal
  useEffect(() => {
    if (showQuickItemModal) {
      const firstRevenue = accounts.find(a => a.class_type === 'Revenue')
      if (firstRevenue && !quickItemAccountId) {
        setQuickItemAccountId(firstRevenue.id)
      }
      const firstTax = taxRates[0]
      if (firstTax && !quickItemTaxRateId) {
        setQuickItemTaxRateId(firstTax.id)
      }
    }
  }, [showQuickItemModal, accounts, taxRates])

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lineErrors, setLineErrors] = useState<Record<number, Record<string, boolean>>>({})

  // Ref to track last active focused element before modal launches
  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!showQuickContactModal && !showQuickItemModal && !isCreateProjectOpen) {
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
  }, [showQuickContactModal, showQuickItemModal, isCreateProjectOpen])

  // Invoice Line Items state
  interface LineFormItem {
    id: string
    itemId: string
    description: string
    quantity: number | ''
    unitPrice: number | ''
    discount: number | ''
    accountId: string
    taxRateId: string
  }
  const [lines, setLines] = useState<LineFormItem[]>([
    { id: '1', itemId: '', description: '', quantity: '', unitPrice: '', discount: '', accountId: '', taxRateId: '' }
  ])

  // Load all master list data & invoice/quote-conversion for edit
  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let loadedContacts: Contact[] = []
      let loadedAccounts: Account[] = []
      let loadedTaxRates: TaxRate[] = []
      let loadedCatalog: Item[] = []
      let loadedSettings: SalesSetting | null = null
      let loadedProjects: Project[] = []

      if (isMockMode) {
        // Load mock contacts/accounts/taxRates/catalog if offline
        const mockContacts: Contact[] = [
          { id: 'mock-c-1', name: 'Alibaba Cloud SG', email: 'billing@alibaba.com', phone: '+65 6729 0122', tax_number: 'VAT-9021', billing_address: '8 Shenton Way, Singapore 068811', default_sales_account: null, default_purchase_account: null, contact_type: 'Customer', created_at: '' },
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

        const savedContacts = localStorage.getItem(`kdm_mock_contacts_${activeOrg.id}`)
        if (savedContacts) {
          loadedContacts = JSON.parse(savedContacts)
        } else {
          loadedContacts = mockContacts
          localStorage.setItem(`kdm_mock_contacts_${activeOrg.id}`, JSON.stringify(mockContacts))
        }

        const savedCatalog = localStorage.getItem(`kdm_mock_catalog_${activeOrg.id}`)
        if (savedCatalog) {
          loadedCatalog = JSON.parse(savedCatalog)
        } else {
          loadedCatalog = mockCatalog
          localStorage.setItem(`kdm_mock_catalog_${activeOrg.id}`, JSON.stringify(mockCatalog))
        }

        loadedAccounts = mockAccounts
        loadedTaxRates = mockTaxRates

        const savedSettings = localStorage.getItem(`kdm_mock_settings_${activeOrg.id}`)
        loadedSettings = savedSettings ? JSON.parse(savedSettings) : {
          invoice_prefix: 'INV-',
          next_invoice_number: 1001,
          quote_prefix: 'QT-',
          next_quote_number: 1001,
          standard_payment_terms: '15 days',
          default_footer: 'Thank you for your business!'
        }

        const savedProjects = localStorage.getItem(`kdm_mock_projects_${activeOrg.id}`)
        if (savedProjects) {
          loadedProjects = JSON.parse(savedProjects)
        } else {
          loadedProjects = [
            { id: 'mock-p-1', name: 'Internal Operations', code: 'INT-OPS' },
            { id: 'mock-p-2', name: 'Corporate Expansion', code: 'CORP-EXP' },
            { id: 'mock-p-3', name: 'Client Consultation', code: 'CLIENT-CONS' }
          ]
          localStorage.setItem(`kdm_mock_projects_${activeOrg.id}`, JSON.stringify(loadedProjects))
        }
      } else {
        // API Database fetches
        const [contactList, itemList, accList, taxList, settingData, projList] = await Promise.all([
          apiService.getContacts(activeOrg.id),
          apiService.getItems(activeOrg.id),
          apiService.getAccounts(activeOrg.id),
          apiService.getTaxRates(activeOrg.id),
          apiService.getSalesSettings(activeOrg.id),
          apiService.getProjects(activeOrg.id)
        ])

        loadedContacts = contactList.filter(c => c.contact_type === 'Customer' || c.contact_type === 'Both')
        loadedCatalog = itemList.filter(i => i.is_sold)
        loadedAccounts = accList
        loadedTaxRates = taxList
        loadedSettings = settingData
        loadedProjects = projList
      }

      setContacts(loadedContacts)
      setCatalogItems(loadedCatalog)
      setAccounts(loadedAccounts)
      setTaxRates(loadedTaxRates)
      setSalesSetting(loadedSettings)
      setProjects(loadedProjects)

      let loadedBanks: Account[] = []
      if (isMockMode) {
        loadedBanks = [
          { id: 'mock-bank-090', code: '090', name: 'ANZ Business Account', class_type: 'Asset', type: 'Bank', description: 'Primary business operating checking account', is_system_account: true, created_at: '', default_tax_rate: null },
          { id: 'mock-bank-092', code: '092', name: 'ANZ Savings Account', class_type: 'Asset', type: 'Bank', description: 'Corporate reserve savings account', is_system_account: false, created_at: '', default_tax_rate: null }
        ]
        const savedCustomBanks = localStorage.getItem(`kdm_mock_custom_banks_${activeOrg.id}`)
        if (savedCustomBanks) {
          loadedBanks = [...loadedBanks, ...JSON.parse(savedCustomBanks)]
        }
      } else {
        loadedBanks = loadedAccounts.filter(a => a.type === 'Bank' || (a.class_type === 'Asset' && a.code === '090') || a.name.toLowerCase().includes('bank'))
      }
      setBankAccounts(loadedBanks)
      if (loadedBanks.length > 0) {
        setSinglePaymentAccountId(loadedBanks[0].id)
      }

      if (editingInvoiceId) {
        if (editingInvoiceId.startsWith('convert-quote-')) {
          // CONVERSION MODE: Load quote details and pre-populate in the new invoice editor
          setInvoiceDbId(null)
          const quoteId = editingInvoiceId.replace('convert-quote-', '')
          let sourceQuote: Quote | null = null
          if (isMockMode) {
            const savedQuotes = localStorage.getItem(`kdm_mock_quotes_${activeOrg.id}`)
            const list = savedQuotes ? JSON.parse(savedQuotes) : []
            sourceQuote = list.find((q: Quote) => q.quote_number === quoteId || q.id === quoteId) || null
          } else {
            try {
              const allQuotes = await apiService.getQuotes(activeOrg.id)
              const matched = allQuotes.find(q => q.quote_number === quoteId || q.id === quoteId)
              if (matched && matched.id) {
                sourceQuote = await apiService.getQuote(matched.id)
              } else {
                sourceQuote = await apiService.getQuote(quoteId)
              }
            } catch {
              sourceQuote = await apiService.getQuote(quoteId)
            }
          }

          if (sourceQuote) {
            setSelectedContactId(sourceQuote.contact)
            setReference(`Converted from Quote ${sourceQuote.quote_number}` + (sourceQuote.reference ? ` (${sourceQuote.reference})` : ''))

            // Set invoice date to today, due date to today + standard payment terms
            const todayStr = new Date().toISOString().split('T')[0]
            setDate(todayStr)

            let days = 15
            if (loadedSettings) {
              if (loadedSettings.standard_payment_terms.toLowerCase().includes('30')) days = 30
              if (loadedSettings.standard_payment_terms.toLowerCase().includes('receipt')) days = 0
            }
            const due = new Date()
            due.setDate(due.getDate() + days)
            setDueDate(due.toISOString().split('T')[0])
            setStatus('Draft')

            setCurrency(sourceQuote.currency || activeOrg.currency || 'USD')
            setTaxType(sourceQuote.tax_type || 'Exclusive')
            setSelectedProjectId(sourceQuote.project || '')
            setNotes(localStorage.getItem(`kdm_quote_notes_${sourceQuote.id}`) || '')
            setAttachmentName(localStorage.getItem(`kdm_quote_attachment_${sourceQuote.id}`) || '')

            if (sourceQuote.lines && sourceQuote.lines.length > 0) {
              setLines(sourceQuote.lines.map((l: any, idx: number) => ({
                id: l.id || String(idx),
                itemId: l.item || '',
                description: l.description || '',
                quantity: Number(l.quantity) || 1,
                unitPrice: Number(l.unit_price) || 0,
                discount: Number(l.discount) || 0,
                accountId: l.account || '',
                taxRateId: l.tax_rate || ''
              })))
            }

            // Generate invoice number
            if (loadedSettings) {
              const numStr = String(loadedSettings.next_invoice_number).padStart(4, '0')
              setInvoiceNumber(`${loadedSettings.invoice_prefix}${numStr}`)
            }
          }
        } else {
          // STANDARD EDIT MODE: Load existing invoice details
          let targetInvoice: Invoice | null = null
          if (isMockMode) {
            const savedInvs = localStorage.getItem(`kdm_mock_invoices_${activeOrg.id}`)
            const list = savedInvs ? JSON.parse(savedInvs) : []
            targetInvoice = list.find((i: Invoice) => i.invoice_number === editingInvoiceId || i.id === editingInvoiceId) || null
          } else {
            try {
              const allInvoices = await apiService.getInvoices(activeOrg.id)
              const matched = allInvoices.find(i => i.invoice_number === editingInvoiceId || i.id === editingInvoiceId)
              if (matched && matched.id) {
                targetInvoice = await apiService.getInvoice(matched.id)
              } else {
                targetInvoice = await apiService.getInvoice(editingInvoiceId)
              }
            } catch {
              targetInvoice = await apiService.getInvoice(editingInvoiceId)
            }
          }

          if (targetInvoice) {
            setInvoiceDbId(targetInvoice.id || null)
            setSelectedContactId(targetInvoice.contact)
            setInvoiceNumber(targetInvoice.invoice_number)
            setReference(targetInvoice.reference || '')
            setDate(targetInvoice.date)
            setDueDate(targetInvoice.due_date)
            setStatus(targetInvoice.status as any)
            setCurrency(targetInvoice.currency || activeOrg.currency || 'USD')
            setTaxType(targetInvoice.tax_type || 'Exclusive')
            setSelectedProjectId(targetInvoice.project || '')
            setNotes(localStorage.getItem(`kdm_invoice_notes_${targetInvoice.id}`) || '')
            setAttachmentName(localStorage.getItem(`kdm_invoice_attachment_${targetInvoice.id}`) || '')

            if (targetInvoice.lines && targetInvoice.lines.length > 0) {
              setLines(targetInvoice.lines.map((l: any, idx: number) => ({
                id: l.id || String(idx),
                itemId: l.item || '',
                description: l.description || '',
                quantity: Number(l.quantity) || 1,
                unitPrice: Number(l.unit_price) || 0,
                discount: Number(l.discount) || 0,
                accountId: l.account || '',
                taxRateId: l.tax_rate || ''
              })))
            }
          }
        }
      } else {
        setInvoiceDbId(null)
        // NEW MODE: Initialize standard blank invoice defaults - start completely empty
        setSelectedContactId('')
        const defaultAcc = loadedAccounts.find(a => a.code === '200' || a.name.toLowerCase().includes('sales') || a.class_type === 'Revenue')?.id || loadedAccounts[0]?.id || ''
        const defaultTax = taxType === 'No Tax'
          ? (loadedTaxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)?.id || '')
          : (loadedTaxRates.find(t => t.name.toLowerCase().includes('consulting'))?.id || loadedTaxRates[0]?.id || '')
        setLines([{ id: '1', itemId: '', description: '', quantity: '', unitPrice: '', discount: '', accountId: defaultAcc, taxRateId: defaultTax }])
        setNotes('')
        setAttachmentName('')
        setAttachmentFile(null)
      }
    } catch (e: any) {
      console.warn("Failed to load dependencies or invoice", e)
      setErrorMsg(e.message || "Failed to load active ledger catalogs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id, isMockMode, editingInvoiceId])

  // Generator for Invoice Numbers for new invoices only
  useEffect(() => {
    const isConversion = editingInvoiceId && editingInvoiceId.startsWith('convert-quote-')
    if (salesSetting && !editingInvoiceId && !isConversion) {
      const numStr = String(salesSetting.next_invoice_number).padStart(4, '0')
      setInvoiceNumber(`${salesSetting.invoice_prefix}${numStr}`)

      // Auto due date calculation
      const today = new Date()
      let days = 15
      if (salesSetting.standard_payment_terms.toLowerCase().includes('30')) days = 30
      if (salesSetting.standard_payment_terms.toLowerCase().includes('receipt')) days = 0

      today.setDate(today.getDate() + days)
      setDueDate(today.toISOString().split('T')[0])
    }
  }, [salesSetting, editingInvoiceId])

  // Auto due date calculation when Invoice Date changes
  useEffect(() => {
    if (!date || !salesSetting) return
    const terms = (salesSetting.standard_payment_terms || '15 days').toLowerCase()
    const offsetDate = new Date(date)
    let days = 15
    if (terms.includes('receipt')) days = 0
    else if (terms.includes('7')) days = 7
    else if (terms.includes('15')) days = 15
    else if (terms.includes('30')) days = 30

    offsetDate.setDate(offsetDate.getDate() + days)
    setDueDate(offsetDate.toISOString().split('T')[0])
  }, [date, salesSetting])

  // Catalog item select autopopulates properties
  const handleCatalogSelect = (index: number, itemId: string) => {
    const updated = [...lines]
    if (!itemId) {
      updated[index].itemId = ''
      setLines(updated)
      setLineErrors(prev => {
        const next = { ...prev }
        if (next[index]) {
          const nextRow = { ...next[index] }
          delete nextRow.itemId
          next[index] = nextRow
        }
        return next
      })
      return
    }

    const targetItem = catalogItems.find(i => i.id === itemId)
    if (!targetItem) return

    updated[index].itemId = itemId
    updated[index].description = targetItem.sales_description || targetItem.name
    updated[index].unitPrice = Number(targetItem.sales_unit_price)

    if (targetItem.sales_account) updated[index].accountId = targetItem.sales_account
    if (targetItem.sales_tax_rate) updated[index].taxRateId = targetItem.sales_tax_rate

    if (!updated[index].quantity || Number(updated[index].quantity) <= 0) {
      updated[index].quantity = 1
    }

    setLines(updated)

    // Clear validation error on change
    setLineErrors(prev => {
      const next = { ...prev }
      if (next[index]) {
        const nextRow = { ...next[index] }
        delete nextRow.itemId
        delete nextRow.description
        delete nextRow.quantity
        delete nextRow.unitPrice
        delete nextRow.accountId
        delete nextRow.taxRateId
        next[index] = nextRow
      }
      return next
    })
  }

  const handleQuickAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickContactName.trim()) {
      showAlert({ title: 'Validation Warning', message: 'Contact name is required.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      let createdContact: Contact

      if (isMockMode) {
        createdContact = {
          id: `mock-c-${Date.now()}`,
          name: quickContactName.trim(),
          email: quickContactEmail.trim() || '',
          phone: quickContactPhone.trim() || '',
          tax_number: quickContactTaxNumber.trim() || '',
          billing_address: quickContactAddress.trim() || '',
          default_sales_account: null,
          default_purchase_account: null,
          contact_type: 'Customer',
          created_at: new Date().toISOString()
        }
        const updatedContacts = [...contacts, createdContact]
        setContacts(updatedContacts)
        localStorage.setItem(`kdm_mock_contacts_${activeOrg.id}`, JSON.stringify(updatedContacts))
      } else {
        const payload: Partial<Contact> = {
          name: quickContactName.trim(),
          email: quickContactEmail.trim() || undefined,
          phone: quickContactPhone.trim() || undefined,
          tax_number: quickContactTaxNumber.trim() || undefined,
          billing_address: quickContactAddress.trim() || undefined,
          contact_type: 'Customer'
        }
        createdContact = await apiService.createContact(activeOrg.id, payload)
        setContacts(prev => [...prev, createdContact])
      }

      setSelectedContactId(createdContact.id)
      setShowQuickContactModal(false)

      // Reset form fields
      setQuickContactName('')
      setQuickContactEmail('')
      setQuickContactPhone('')
      setQuickContactTaxNumber('')
      setQuickContactAddress('')
    } catch (err: any) {
      showAlert({ title: 'Error Saving Contact', message: err.message || 'Failed to save contact.', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickItemCode.trim() || !quickItemName.trim()) {
      showAlert({ title: 'Validation Warning', message: 'Item code and name are required.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      let createdItem: Item

      if (isMockMode) {
        createdItem = {
          id: `mock-i-${Date.now()}`,
          code: quickItemCode.trim().toUpperCase(),
          name: quickItemName.trim(),
          is_sold: true,
          sales_unit_price: parseFloat(quickItemPrice) || 0,
          sales_account: quickItemAccountId || null,
          sales_tax_rate: quickItemTaxRateId || null,
          sales_description: quickItemDescription.trim() || quickItemName.trim(),
          is_purchased: false,
          purchase_unit_cost: 0,
          purchase_account: null,
          purchase_tax_rate: null,
          purchase_description: '',
          created_at: new Date().toISOString()
        }
        const updatedCatalog = [...catalogItems, createdItem]
        setCatalogItems(updatedCatalog)
        localStorage.setItem(`kdm_mock_catalog_${activeOrg.id}`, JSON.stringify(updatedCatalog))
      } else {
        const payload: Partial<Item> = {
          code: quickItemCode.trim().toUpperCase(),
          name: quickItemName.trim(),
          is_sold: true,
          sales_unit_price: parseFloat(quickItemPrice) || 0,
          sales_account: quickItemAccountId || undefined,
          sales_tax_rate: quickItemTaxRateId || undefined,
          sales_description: quickItemDescription.trim() || quickItemName.trim(),
          is_purchased: false
        }
        createdItem = await apiService.createItem(activeOrg.id, payload)
        setCatalogItems(prev => [...prev, createdItem])
      }

      if (quickItemLineIndex !== null) {
        const updated = [...lines]
        updated[quickItemLineIndex].itemId = createdItem.id
        updated[quickItemLineIndex].description = createdItem.sales_description || createdItem.name
        updated[quickItemLineIndex].unitPrice = Number(createdItem.sales_unit_price)
        if (createdItem.sales_account) updated[quickItemLineIndex].accountId = createdItem.sales_account
        if (createdItem.sales_tax_rate) updated[quickItemLineIndex].taxRateId = createdItem.sales_tax_rate
        setLines(updated)
      }

      setShowQuickItemModal(false)
      setQuickItemLineIndex(null)

      // Reset form fields
      setQuickItemCode('')
      setQuickItemName('')
      setQuickItemPrice('0.00')
      setQuickItemAccountId('')
      setQuickItemTaxRateId('')
      setQuickItemDescription('')
    } catch (err: any) {
      showAlert({ title: 'Error Saving Item', message: err.message || 'Failed to save item.', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTaxTypeChange = (newType: 'Inclusive' | 'Exclusive' | 'No Tax') => {
    setTaxType(newType)
    if (newType === 'No Tax') {
      const exemptRate = taxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)
      if (exemptRate) {
        setLines(prev => prev.map(line => ({
          ...line,
          taxRateId: exemptRate.id
        })))
      }
    }
  }

  const updateLineField = (index: number, field: keyof LineFormItem, value: any) => {
    const updated = [...lines]
    updated[index] = {
      ...updated[index],
      [field]: value
    }

    if (field === 'unitPrice' && value !== '' && Number(value) >= 0) {
      if (!updated[index].quantity || Number(updated[index].quantity) <= 0) {
        updated[index].quantity = 1
      }
      if (!updated[index].accountId) {
        const defaultAccount = accounts.find(a => a.code === '200' || a.name.toLowerCase().includes('sales') || a.class_type === 'Revenue')?.id || ''
        updated[index].accountId = defaultAccount
      }
      if (!updated[index].taxRateId) {
        const defaultTax = taxType === 'No Tax'
          ? (taxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)?.id || '')
          : (taxRates.find(t => t.name.toLowerCase().includes('consulting'))?.id || '')
        updated[index].taxRateId = defaultTax
      }
    }

    setLines(updated)

    // Clear validation error on change
    if (lineErrors[index] && lineErrors[index][field as string]) {
      setLineErrors(prev => {
        const next = { ...prev }
        if (next[index]) {
          const nextRow = { ...next[index] }
          delete nextRow[field as string]
          next[index] = nextRow
        }
        return next
      })
    }
  }

  const addLineItem = () => {
    const defaultAcc = accounts.find(a => a.code === '200' || a.name.toLowerCase().includes('sales') || a.class_type === 'Revenue')?.id || accounts[0]?.id || ''
    const defaultTaxRate = taxType === 'No Tax'
      ? (taxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)?.id || '')
      : (taxRates.find(t => t.name.toLowerCase().includes('consulting'))?.id || taxRates[0]?.id || '')
    setLines([...lines, {
      id: String(Date.now()),
      itemId: '',
      description: '',
      quantity: '',
      unitPrice: '',
      discount: '',
      accountId: defaultAcc,
      taxRateId: defaultTaxRate
    }])
  }

  const removeLineItem = (index: number) => {
    setLines(prev => {
      if (prev.length === 1) return prev
      return prev.filter((_, idx) => idx !== index)
    })
  }

  // Calculations incorporating inline discounts & Tax Inclusive vs Exclusive
  const getSubtotal = () => {
    return lines.reduce((sum, line) => {
      const q = Number(line.quantity) || 0
      const u = Number(line.unitPrice) || 0
      const d = Number(line.discount) || 0
      const lineTotal = q * u * (1 - d / 100)

      if (taxType === 'Inclusive') {
        const rateObj = taxRates.find(t => t.id === line.taxRateId)
        const rateVal = rateObj ? Number(rateObj.rate) : 0
        const lineTax = lineTotal * (rateVal / (100 + rateVal))
        const lineSubtotal = lineTotal - lineTax
        return sum + lineSubtotal
      } else {
        return sum + lineTotal
      }
    }, 0)
  }

  const getTaxTotal = () => {
    return lines.reduce((sum, line) => {
      const q = Number(line.quantity) || 0
      const u = Number(line.unitPrice) || 0
      const d = Number(line.discount) || 0
      const lineTotal = q * u * (1 - d / 100)

      const rateObj = taxRates.find(t => t.id === line.taxRateId)
      const rateVal = rateObj ? Number(rateObj.rate) : 0

      if (taxType === 'Inclusive') {
        const lineTax = lineTotal * (rateVal / (100 + rateVal))
        return sum + lineTax
      } else {
        return sum + (lineTotal * (rateVal / 100))
      }
    }, 0)
  }

  const getGrandTotal = () => {
    if (taxType === 'Inclusive') {
      return lines.reduce((sum, line) => {
        const q = Number(line.quantity) || 0
        const u = Number(line.unitPrice) || 0
        const d = Number(line.discount) || 0
        const lineTotal = q * u * (1 - d / 100)
        return sum + lineTotal
      }, 0)
    } else {
      return getSubtotal() + getTaxTotal()
    }
  }

  const validateForm = () => {
    const formErrors: Record<string, string> = {}
    const rowErrors: Record<number, Record<string, boolean>> = {}
    let hasValidationErrors = false

    if (!selectedContactId) {
      formErrors.contact = 'Prospect client is required.'
      hasValidationErrors = true
    }
    if (!date) {
      formErrors.date = 'Invoice date is required.'
      hasValidationErrors = true
    }
    if (!dueDate) {
      formErrors.dueDate = 'Due date is required.'
      hasValidationErrors = true
    }

    lines.forEach((l, idx) => {
      const rowErr: Record<string, boolean> = {}
      let rowHasErr = false

      if (!l.description || !l.description.trim()) {
        rowErr.description = true
        rowHasErr = true
        hasValidationErrors = true
      }
      if (l.quantity === '' || Number(l.quantity) <= 0) {
        rowErr.quantity = true
        rowHasErr = true
        hasValidationErrors = true
      }
      if (l.unitPrice === '' || Number(l.unitPrice) < 0) {
        rowErr.unitPrice = true
        rowHasErr = true
        hasValidationErrors = true
      }

      if (rowHasErr) {
        rowErrors[idx] = rowErr
      }
    })

    if (hasValidationErrors) {
      setErrors(formErrors)
      setLineErrors(rowErrors)
      return false
    }

    setErrors({})
    setLineErrors({})
    return true
  }

  // Save / Update invoice
  const handleSaveInvoice = async (
    statusUpdate?: 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid',
    isEmailing: boolean = false,
    silent: boolean = false
  ): Promise<string | null> => {
    if (!validateForm()) {
      return null
    }

    setIsSubmitting(true)

    const postLines = lines.map(l => {
      const q = Number(l.quantity) || 0
      const u = Number(l.unitPrice) || 0
      const d = Number(l.discount) || 0
      const lineTotal = q * u * (1 - d / 100)

      const fallbackAcc = accounts.find(a => a.code === '200' || a.name.toLowerCase().includes('sales') || a.class_type === 'Revenue')?.id || accounts[0]?.id || ''
      const fallbackTax = taxType === 'No Tax'
        ? (taxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)?.id || null)
        : (taxRates.find(t => t.name.toLowerCase().includes('consulting'))?.id || taxRates[0]?.id || null)

      return {
        item: l.itemId ? l.itemId : null,
        description: l.description,
        quantity: q,
        unit_price: u,
        discount: d,
        account: l.accountId || fallbackAcc,
        tax_rate: l.taxRateId || fallbackTax,
        total: lineTotal
      }
    })

    const finalStatus = statusUpdate || status
    const payload: Partial<Invoice> = {
      contact: selectedContactId,
      invoice_number: invoiceNumber,
      reference,
      date,
      due_date: dueDate,
      status: finalStatus,
      currency,
      tax_type: taxType,
      project: selectedProjectId || null,
      subtotal: getSubtotal(),
      tax_total: getTaxTotal(),
      total: getGrandTotal(),
      lines: postLines as any
    }

    try {
      const isConversion = editingInvoiceId && editingInvoiceId.startsWith('convert-quote-')
      const isEdit = editingInvoiceId && !isConversion

      if (isEdit) {
        const resolvedId = invoiceDbId || editingInvoiceId
        if (isMockMode) {
          const contactObj = contacts.find(c => c.id === selectedContactId)
          const savedInvs = localStorage.getItem(`kdm_mock_invoices_${activeOrg.id}`)
          const list = savedInvs ? JSON.parse(savedInvs) : []

          const updatedList = list.map((inv: Invoice) => {
            if (inv.id === resolvedId || inv.invoice_number === editingInvoiceId) {
              return {
                ...inv,
                ...payload,
                contact_name: contactObj ? contactObj.name : inv.contact_name,
                lines: postLines.map((pl, idx) => ({ ...pl, id: `mock-inv-l-${idx}-${Date.now()}` }))
              }
            }
            return inv
          })

          localStorage.setItem(`kdm_mock_invoices_${activeOrg.id}`, JSON.stringify(updatedList))
          localStorage.setItem(`kdm_invoice_notes_${editingInvoiceId}`, notes)
          localStorage.setItem(`kdm_invoice_attachment_${editingInvoiceId}`, attachmentName)
          if (!silent) {
            showAlert({ title: 'Invoice Updated', message: 'The invoice has been updated successfully.', type: 'success' })
            if (isEmailing) {
              setInvoiceDbId(resolvedId || null)
              setIsEmailModalOpen(true)
            } else {
              if (setEditingInvoiceId) setEditingInvoiceId(null)
              setActiveTab('Invoices')
            }
          }
          return resolvedId
        }

        await apiService.updateInvoice(resolvedId!, payload)
        localStorage.setItem(`kdm_invoice_notes_${editingInvoiceId}`, notes)
        localStorage.setItem(`kdm_invoice_attachment_${editingInvoiceId}`, attachmentName)
        
        if (!silent) {
          showAlert({ title: 'Invoice Updated', message: 'The invoice has been updated successfully.', type: 'success' })
          if (isEmailing) {
            setInvoiceDbId(resolvedId || null)
            setIsEmailModalOpen(true)
          } else {
            if (setEditingInvoiceId) setEditingInvoiceId(null)
            setActiveTab('Invoices')
          }
        }
        return resolvedId
      }

      // Create new invoice (either blank or quote converted)
      if (isMockMode) {
        const contactObj = contacts.find(c => c.id === selectedContactId)
        const mockCreated: Invoice = {
          id: `mock-inv-${Date.now()}`,
          contact: selectedContactId,
          contact_name: contactObj ? contactObj.name : "Mock Customer",
          invoice_number: invoiceNumber,
          reference,
          date,
          due_date: dueDate,
          status: finalStatus,
          currency,
          tax_type: taxType,
          project: selectedProjectId || null,
          subtotal: getSubtotal(),
          tax_total: getTaxTotal(),
          total: getGrandTotal(),
          lines: postLines.map((pl, idx) => ({
            ...pl,
            id: `mock-inv-l-${idx}-${Date.now()}`
          })) as any,
          created_at: new Date().toISOString()
        }

        const savedInvs = localStorage.getItem(`kdm_mock_invoices_${activeOrg.id}`)
        const invoicesList = savedInvs ? JSON.parse(savedInvs) : []
        const newInvs = [mockCreated, ...invoicesList]
        localStorage.setItem(`kdm_mock_invoices_${activeOrg.id}`, JSON.stringify(newInvs))
        localStorage.setItem(`kdm_invoice_notes_${mockCreated.id}`, notes)
        localStorage.setItem(`kdm_invoice_attachment_${mockCreated.id}`, attachmentName)

        if (salesSetting) {
          const updatedSetting = {
            ...salesSetting,
            next_invoice_number: salesSetting.next_invoice_number + 1
          }
          localStorage.setItem(`kdm_mock_settings_${activeOrg.id}`, JSON.stringify(updatedSetting))
        }

        if (!silent) {
          showAlert({ title: 'Invoice Created', message: `Invoice ${invoiceNumber} has been created successfully.`, type: 'success' })
          if (isEmailing) {
            setInvoiceDbId(mockCreated.id || null)
            setIsEmailModalOpen(true)
          } else {
            if (setEditingInvoiceId) setEditingInvoiceId(null)
            setActiveTab('Invoices')
          }
        } else {
          setInvoiceDbId(mockCreated.id || null)
        }
        return mockCreated.id || null
      }

      const created = await apiService.createInvoice(activeOrg.id, payload)
      if (created && created.id) {
        localStorage.setItem(`kdm_invoice_notes_${created.id}`, notes)
        localStorage.setItem(`kdm_invoice_attachment_${created.id}`, attachmentName)
      }
      
      if (!silent) {
        showAlert({ title: 'Invoice Created', message: `Invoice ${invoiceNumber} has been created successfully.`, type: 'success' })
        if (isEmailing) {
          setInvoiceDbId(created.id || null)
          setIsEmailModalOpen(true)
        } else {
          if (setEditingInvoiceId) setEditingInvoiceId(null)
          setActiveTab('Invoices')
        }
      } else {
        setInvoiceDbId(created.id || null)
      }
      return created.id || null
    } catch (err: any) {
      showAlert({ title: 'Save Error', message: "An error occurred while saving the invoice: " + (err.message || "Please check if the invoice number is unique."), type: 'error' })
      return null
    } finally {
      setIsSubmitting(false)
      setIsMoreDropdownOpen(false)
    }
  }


  // Download invoice as a premium PDF file
  const handlePrintPDF = async () => {
    if (isMockMode) {
      // Sandbox fallback: print screen cleanly
      document.body.classList.add('pdf-mode')
      window.print()
      document.body.classList.remove('pdf-mode')
      return
    }

    const resolvedId = invoiceDbId || editingInvoiceId
    if (!resolvedId) {
      showAlert({ title: 'Download Error', message: 'Please save the invoice first before downloading.', type: 'error' })
      return
    }

    setIsDownloadingPdf(true)
    try {
      const token = localStorage.getItem('kdm_auth_token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Token ${token}`
      }

      // Fetch PDF from Django backend with POST transmitting customization payloads
      const url = `${API_BASE_URL}/invoices/${resolvedId}/download-pdf/?_t=${Date.now()}`

      const logo = localStorage.getItem(`kdm_org_logo_${activeOrg.id}`) || ''
      const bankDetails = JSON.parse(localStorage.getItem(`kdm_bank_details_${activeOrg.id}`) || '{}')
      const templateSettings = JSON.parse(localStorage.getItem(`kdm_sales_template_settings_${activeOrg.id}`) || '{}')
      const orgDetails = JSON.parse(localStorage.getItem(`kdm_org_extensions_${activeOrg.id}`) || '{}')
      const termsValue = salesSetting?.standard_payment_terms || '15 days'

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes,
          logo,
          bank_details: bankDetails,
          template_settings: templateSettings,
          org_details: orgDetails,
          payment_terms: termsValue
        }),
        cache: 'no-cache'
      })

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `Invoice_${invoiceNumber || 'SalesInvoice'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      showAlert({ title: 'Download Failed', message: 'Failed to download backend PDF: ' + err.message, type: 'error' })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Deletes invoice after showing brand confirmation popup modal
  const handleDeleteInvoice = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this sales invoice? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true
    })
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      const resolvedId = invoiceDbId || editingInvoiceId
      if (isMockMode) {
        const savedInvs = localStorage.getItem(`kdm_mock_invoices_${activeOrg.id}`)
        const list = savedInvs ? JSON.parse(savedInvs) : []
        const updatedList = list.filter((i: Invoice) => i.id !== resolvedId && i.invoice_number !== editingInvoiceId)
        localStorage.setItem(`kdm_mock_invoices_${activeOrg.id}`, JSON.stringify(updatedList))
      } else {
        await apiService.deleteInvoice(resolvedId!)
      }

      if (setEditingInvoiceId) setEditingInvoiceId(null)
      setActiveTab('Invoices')
    } catch (err: any) {
      showAlert({ title: 'Delete Failed', message: 'Failed to delete invoice: ' + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update invoice status instantly on the spot without reloads
  const handleUpdateStatusOnTheSpot = async (newStatus: 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid') => {
    if (!editingInvoiceId || editingInvoiceId.startsWith('convert-quote-')) return
    setIsSubmitting(true)
    try {
      const resolvedId = invoiceDbId || editingInvoiceId
      if (isMockMode) {
        const savedInvs = localStorage.getItem(`kdm_mock_invoices_${activeOrg.id}`)
        const list = savedInvs ? JSON.parse(savedInvs) : []
        const updatedList = list.map((i: Invoice) => {
          if (i.id === resolvedId || i.invoice_number === editingInvoiceId) {
            return { ...i, status: newStatus }
          }
          return i
        })
        localStorage.setItem(`kdm_mock_invoices_${activeOrg.id}`, JSON.stringify(updatedList))
        setStatus(newStatus)
        setIsMoreDropdownOpen(false)
        return
      }

      await apiService.updateInvoice(resolvedId, { status: newStatus })
      setStatus(newStatus)
      setIsMoreDropdownOpen(false)
    } catch (err: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update status: " + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
      setIsMoreDropdownOpen(false)
    }
  }

  const handleRecordPayment = async () => {
    const payments = isSplitPayment
      ? paymentRows.map(r => ({ accountId: r.accountId, amount: Number(r.amount) || 0 }))
      : [{ accountId: singlePaymentAccountId, amount: Number(singlePaymentAmount) || 0 }];

    const invalidAccounts = payments.some(p => !p.accountId);
    if (invalidAccounts) {
      showAlert({ title: 'Validation Warning', message: 'All selected payment accounts must be valid.', type: 'warning' });
      return;
    }

    const invalidAmounts = payments.some(p => p.amount <= 0);
    if (invalidAmounts) {
      showAlert({ title: 'Validation Warning', message: 'All payment amounts must be greater than zero.', type: 'warning' });
      return;
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const grandTotal = getGrandTotal();
    const diff = Math.abs(totalPaid - grandTotal);
    if (diff >= 0.01) {
      showAlert({
        title: 'Amount Mismatch',
        message: `The total payment amount (${currencySymbol}${totalPaid.toFixed(2)}) must exactly equal the invoice total (${currencySymbol}${grandTotal.toFixed(2)}). Difference is ${currencySymbol}${diff.toFixed(2)}.`,
        type: 'warning'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const balanceKey = `kdm_bank_balances_${activeOrg.id}`;
      const savedBalances = localStorage.getItem(balanceKey);
      const balances = savedBalances ? JSON.parse(savedBalances) : {
        'mock-bank-090': 5142.90,
        'bank-090': 5142.90
      };

      payments.forEach(p => {
        if (balances[p.accountId] === undefined) {
          balances[p.accountId] = p.accountId.includes('090') ? 5142.90 : 0.00;
        }
        balances[p.accountId] = parseFloat((balances[p.accountId] + p.amount).toFixed(2));
      });
      localStorage.setItem(balanceKey, JSON.stringify(balances));

      const txKey = `kdm_bank_transactions_${activeOrg.id}`;
      const savedTx = localStorage.getItem(txKey);
      const transactions = savedTx ? JSON.parse(savedTx) : [];

      const contactObj = contacts.find(c => c.id === selectedContactId);
      const contactName = contactObj ? contactObj.name : "Customer";

      payments.forEach(p => {
        const bankAcc = bankAccounts.find(b => b.id === p.accountId);
        const newTx = {
          id: `tx-${Date.now()}-${Math.random()}`,
          accountId: p.accountId,
          accountName: bankAcc?.name || 'Bank Account',
          date: paymentDate,
          description: `Payment received for Invoice ${invoiceNumber}. Contact: ${contactName}`,
          amount: p.amount,
          reference: reference || invoiceNumber
        };
        transactions.unshift(newTx);
      });
      localStorage.setItem(txKey, JSON.stringify(transactions));

      const resolvedId = invoiceDbId || editingInvoiceId;
      if (isMockMode) {
        const savedInvs = localStorage.getItem(`kdm_mock_invoices_${activeOrg.id}`);
        const list = savedInvs ? JSON.parse(savedInvs) : [];
        const updatedList = list.map((inv: Invoice) => {
          if (inv.id === resolvedId || inv.invoice_number === editingInvoiceId) {
            return {
              ...inv,
              status: 'Paid' as const
            };
          }
          return inv;
        });
        localStorage.setItem(`kdm_mock_invoices_${activeOrg.id}`, JSON.stringify(updatedList));
      } else {
        await apiService.updateInvoice(resolvedId!, { status: 'Paid' });
      }

      setStatus('Paid');
      setIsPaymentModalOpen(false);
      showAlert({
        title: 'Payment Recorded',
        message: `Successfully recorded payment of ${currencySymbol}${grandTotal.toFixed(2)} and marked invoice as Paid.`,
        type: 'success'
      });

      if (setEditingInvoiceId) setEditingInvoiceId(null);
      setActiveTab('Invoices');
    } catch (err: any) {
      showAlert({ title: 'Error', message: 'Failed to record payment: ' + err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPaymentRow = () => {
    setPaymentRows([...paymentRows, { accountId: bankAccounts[0]?.id || '', amount: '' }])
  }

  const removePaymentRow = (index: number) => {
    if (paymentRows.length <= 1) return
    setPaymentRows(paymentRows.filter((_, idx) => idx !== index))
  }

  const updatePaymentRow = (index: number, field: 'accountId' | 'amount', value: any) => {
    const updated = [...paymentRows]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setPaymentRows(updated)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setAttachmentName(file.name)
      setAttachmentFile(file)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    try {
      let created: Project
      if (isMockMode) {
        created = {
          id: `mock-p-${Date.now()}`,
          name: newProjectName.trim(),
          code: newProjectCode.trim() || undefined,
          created_at: new Date().toISOString()
        }
        const updated = [...projects, created]
        localStorage.setItem(`kdm_mock_projects_${activeOrg.id}`, JSON.stringify(updated))
        setProjects(updated)
      } else {
        created = await apiService.createProject(activeOrg.id, {
          name: newProjectName.trim(),
          code: newProjectCode.trim() || undefined
        })
        setProjects([...projects, created])
      }
      setSelectedProjectId(created.id)
      setNewProjectName('')
      setNewProjectCode('')
      setIsCreateProjectOpen(false)
      showAlert({ title: 'Success', message: 'Project created successfully.', type: 'success' })
    } catch (err: any) {
      showAlert({ title: 'Error', message: 'Failed to create project: ' + err.message, type: 'error' })
    }
  }

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'PKR': return '₨'
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      case 'AUD': return 'A$'
      case 'CAD': return 'C$'
      case 'SGD': return 'S$'
      default: return '$'
    }
  }

  const currencySymbol = getCurrencySymbol(currency)

  // Map choices for searchable select inputs
  const clientOptions = contacts.map(c => ({
    value: c.id,
    label: `${c.name}${c.email ? ` (${c.email})` : ''}`
  }))

  const catalogOptions = [
    { value: '', label: '' },
    ...catalogItems.map(item => ({
      value: item.id,
      label: `${item.code} - ${item.name}`
    }))
  ]

  const accountOptions = accounts.filter(a => a.class_type === 'Revenue').map(a => ({
    value: a.id,
    label: `${a.code} - ${a.name}`
  }))

  const taxOptions = taxRates.map(t => ({
    value: t.id,
    label: `${t.name} (${t.rate}%)`
  }))

  const projectOptions = [
    { value: '', label: 'No Project Assigned' },
    ...projects.map(p => ({
      value: p.id,
      label: p.code ? `${p.code} - ${p.name}` : p.name
    }))
  ]

  const currenciesList = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'PKR', label: 'PKR - Pakistani Rupee' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'SGD', label: 'SGD - Singapore Dollar' }
  ]

  const isConversionMode = editingInvoiceId && editingInvoiceId.startsWith('convert-quote-')
  const isNewInvoice = !editingInvoiceId || isConversionMode
  const isReadOnly = status === 'Paid'

  const grandTotal = getGrandTotal()
  const totalPaid = isSplitPayment
    ? paymentRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    : (Number(singlePaymentAmount) || 0)
  const paymentDiff = grandTotal - totalPaid
  const isPaymentBalanced = Math.abs(paymentDiff) < 0.01

  const renderApproveAndEmailButton = () => {
    return (
      <div className="relative inline-flex h-[38px] rounded-[3px] shadow-sm">
        <button
          onClick={() => {
            if (validateForm()) {
              setIsEmailModalOpen(true)
            }
          }}
          disabled={isSubmitting}
          className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-l-[3px] border-r border-emerald-700/30 transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-full"
          type="button"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <span>Approve & Email</span>
          )}
        </button>
        <button
          onClick={() => setIsApproveDropdownOpen(!isApproveDropdownOpen)}
          disabled={isSubmitting}
          className="bg-[#0F5B38] hover:brightness-105 text-white px-2 rounded-r-[3px] transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center h-full border-l border-emerald-500/20"
          type="button"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {isApproveDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsApproveDropdownOpen(false)}></div>
            <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 font-normal text-xs text-slate-700 animate-scaleIn">
              <button
                onClick={() => {
                  handleSaveInvoice('Awaiting Payment')
                  setIsApproveDropdownOpen(false)
                }}
                disabled={isSubmitting}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-semibold rounded-[3px]"
                type="button"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  if (validateForm()) {
                    setIsEmailModalOpen(true)
                    setIsApproveDropdownOpen(false)
                  }
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                type="button"
              >
                Email
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="flex space-x-2 justify-center items-center">
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce"></div>
        </div>
        <p className="text-slate-500 text-xs font-semibold tracking-wider">Loading invoice data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left font-sans w-full px-4 sm:px-6 lg:px-8 animate-fadeIn pb-12">
      {isDownloadingPdf && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white p-6 rounded-[3px] shadow-xl border border-slate-100 flex flex-col items-center space-y-4 max-w-xs text-center">
            <div className="flex space-x-2 justify-center items-center">
              <div className="h-3.5 w-3.5 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-3.5 w-3.5 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-3.5 w-3.5 bg-[#0F5B38] rounded-full animate-bounce"></div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Generating PDF</h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Applying invoice layout theme, active organization settings, and payment details...
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Page Header Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (setEditingInvoiceId) setEditingInvoiceId(null)
              setActiveTab('Invoices')
            }}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[3px] transition duration-200 cursor-pointer"
            title="Return to invoices"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <span className="text-[10px] text-slate-400 font-normal uppercase tracking-widest block">Sales Pipeline</span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {editingInvoiceId && !isConversionMode ? `Sales Invoice: ${invoiceNumber}` : 'Create new sales invoice'}
            </h2>
            {editingInvoiceId && !isConversionMode && (
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 border ${status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/30' :
                  status === 'Awaiting Payment' ? 'bg-amber-50 text-amber-600 border-amber-100/30' :
                    status === 'Awaiting Approval' ? 'bg-blue-50 text-blue-600 border-blue-100/30' :
                      'bg-slate-100 text-slate-500 border-slate-200/50'
                }`}>
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap sm:justify-end gap-2">
          {/* Cancel / Back Button */}
          <button
            onClick={() => {
              if (setEditingInvoiceId) setEditingInvoiceId(null)
              setActiveTab('Invoices')
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center"
          >
            Cancel
          </button>

          {isNewInvoice ? (
            <>
              {/* New Invoice Mode actions */}
              <button
                onClick={() => handleSaveInvoice('Draft')}
                disabled={isSubmitting}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-400"
              >
                Save as Draft
              </button>

              {renderApproveAndEmailButton()}

              <div className="relative">
                <button
                  onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  className="flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 w-[38px] h-[38px] rounded-[3px] transition duration-200 cursor-pointer shadow-sm"
                  title="More actions"
                >
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
                {isMoreDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700">
                      <div className="py-1 space-y-0.5">
                        <button
                          onClick={() => {
                            showAlert({
                              title: 'Save PDF',
                              message: 'Please save the invoice as a Draft or Approve it first before downloading PDF.',
                              type: 'warning'
                            })
                            setIsMoreDropdownOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                        >
                          Save PDF
                        </button>
                        <button
                          onClick={() => {
                            if (setEditingInvoiceId) setEditingInvoiceId(null)
                            setActiveTab('Invoices')
                            setIsMoreDropdownOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Existing Invoice Edit/View Mode actions based on Status */}
              {status === 'Draft' && (
                <>
                  <button
                    onClick={() => handleUpdateStatusOnTheSpot('Awaiting Approval')}
                    disabled={isSubmitting}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Submit for Approval</span>
                    )}
                  </button>

                  {renderApproveAndEmailButton()}

                  <div className="relative">
                    <button
                      onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                      className="flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 w-[38px] h-[38px] rounded-[3px] transition duration-200 cursor-pointer shadow-sm"
                      title="More actions"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>
                    {isMoreDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMoreDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700">
                          <div className="py-1 space-y-0.5">
                            <button
                              onClick={() => {
                                handlePrintPDF()
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Print PDF
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteInvoice()
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {status === 'Awaiting Approval' && (
                <>
                  <button
                    onClick={() => handleSaveInvoice('Awaiting Approval')}
                    disabled={isSubmitting}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Save</span>
                    )}
                  </button>

                  {renderApproveAndEmailButton()}

                  <div className="relative">
                    <button
                      onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                      className="flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 w-[38px] h-[38px] rounded-[3px] transition duration-200 cursor-pointer shadow-sm"
                      title="More actions"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>
                    {isMoreDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMoreDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700">
                          <div className="py-1 space-y-0.5">
                            <button
                              onClick={() => {
                                handlePrintPDF()
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Print PDF
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteInvoice()
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {status === 'Awaiting Payment' && (
                <>
                  <button
                    onClick={() => handleSaveInvoice('Awaiting Payment')}
                    disabled={isSubmitting}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-400 animate-fadeIn"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Save</span>
                    )}
                  </button>

                  <button
                    onClick={handlePrintPDF}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center space-x-1.5"
                  >
                    <span>Save PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      setSinglePaymentAmount(getGrandTotal().toFixed(2))
                      setPaymentRows([{ accountId: bankAccounts[0]?.id || '', amount: getGrandTotal() }])
                      setIsSplitPayment(false)
                      setIsPaymentModalOpen(true)
                    }}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
                  >
                    <span>Add Payment</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                      className="flex items-center justify-center bg-white hover:bg-slate-50 text-slate-555 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 w-[38px] h-[38px] rounded-[3px] transition duration-200 cursor-pointer shadow-sm"
                      title="More actions"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>
                    {isMoreDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMoreDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700">
                          <div className="py-1 space-y-0.5">
                            <button
                              onClick={() => {
                                setIsEmailModalOpen(true)
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Email
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteInvoice()
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {status === 'Paid' && (
                <>
                  <button
                    onClick={handlePrintPDF}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer flex items-center justify-center space-x-1.5 h-[38px]"
                  >
                    <span>Print PDF</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-655 p-4 rounded-[3px] text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {(Object.keys(errors).length > 0 || Object.keys(lineErrors).length > 0) && (
        <div className="bg-rose-50 border border-rose-100/80 text-rose-700 p-4 rounded-[3px] text-xs font-semibold flex items-start space-x-2.5 animate-fadeIn">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[13px] text-rose-800">Validation Error</p>
            <p className="text-rose-600/90 mt-0.5 font-medium">Please fill in all required fields highlighted in red below before proceeding.</p>
          </div>
        </div>
      )}

      {/* Main Core Invoice Form Container */}
      <div id="printable-area" className="bg-white rounded-[3px] border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">

        {/* Form Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Customer select */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Billing Customer</label>
            <SearchableInput
              options={clientOptions}
              value={selectedContactId}
              disabled={isReadOnly}
              onChange={(val) => {
                setSelectedContactId(val)
                if (val) {
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.contact
                    return next
                  })
                }
              }}
              placeholder=""
              onCreateNew={(el) => {
                lastActiveElementRef.current = el
                setShowQuickContactModal(true)
              }}
              createNewLabel="Add new contact"
              className={`w-full bg-white text-slate-800 border rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition cursor-pointer ${errors.contact ? 'border-rose-500 focus:border-rose-500 bg-rose-50/10' : 'border-slate-200 focus:border-[#0F5B38]'
                }`}
            />
            {errors.contact && (
              <span className="text-rose-500 text-[11px] font-semibold block mt-1">{errors.contact}</span>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="invoiceDateInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Invoice Date</label>
            <XeroDatePicker
              id="invoiceDateInput"
              value={date}
              disabled={isReadOnly}
              onChange={(val) => {
                setDate(val)
                if (val) {
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.date
                    return next
                  })
                }
              }}
              className={errors.date ? 'border-rose-500 focus:border-rose-500 bg-rose-50/10' : ''}
            />
            {errors.date && (
              <span className="text-rose-500 text-[11px] font-semibold block mt-1">{errors.date}</span>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="invoiceDueDateInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Due Date</label>
            <XeroDatePicker
              id="invoiceDueDateInput"
              value={dueDate}
              disabled={isReadOnly}
              onChange={(val) => {
                setDueDate(val)
                if (val) {
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.dueDate
                    return next
                  })
                }
              }}
              className={errors.dueDate ? 'border-rose-500 focus:border-rose-500 bg-rose-50/10' : ''}
            />
            {errors.dueDate && (
              <span className="text-rose-500 text-[11px] font-semibold block mt-1">{errors.dueDate}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Autogenerated Reference Number */}
          <div className="space-y-1.5">
            <label htmlFor="invoiceNumberDisplay" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Invoice Serial Reference</label>
            <input
              id="invoiceNumberDisplay"
              type="text"
              readOnly
              value={invoiceNumber}
              className="w-full bg-slate-50 text-slate-500 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* PO Reference */}
          <div className="space-y-1.5">
            <label htmlFor="clientRefInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">PO / Client Reference</label>
            <input
              id="clientRefInput"
              type="text"
              placeholder=""
              readOnly={isReadOnly}
              value={reference}
              onChange={e => setReference(e.target.value)}
              className={`w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
                }`}
            />
          </div>

          {/* Currency searchable input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Currency</label>
            <SearchableInput
              options={currenciesList}
              value={currency}
              disabled={isReadOnly}
              onChange={setCurrency}
              placeholder=""
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
            />
          </div>

          {/* Tax Type dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tax Type</label>
            <select
              value={taxType}
              disabled={isReadOnly}
              onChange={e => handleTaxTypeChange(e.target.value as 'Inclusive' | 'Exclusive' | 'No Tax')}
              className={`w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer h-[38px] ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
                }`}
            >
              <option value="Exclusive">Tax Exclusive</option>
              <option value="Inclusive">Tax Inclusive</option>
              <option value="No Tax">No Tax</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Project searchable selection */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Assigned Project</label>
            <div className="flex items-center">
              <SearchableInput
                options={projectOptions}
                value={selectedProjectId}
                disabled={isReadOnly}
                onChange={setSelectedProjectId}
                placeholder="Search projects..."
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
              />
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    lastActiveElementRef.current = document.activeElement as HTMLElement
                    setIsCreateProjectOpen(true)
                  }}
                  className="ml-2 bg-white border border-slate-200 hover:bg-slate-50 text-[#0F5B38] rounded-[3px] p-2 transition flex items-center justify-center shrink-0 h-[38px] w-[38px]"
                  title="Create a new project"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal Table Line Items Ledger */}
        <div className="space-y-3.5 pt-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block border-b border-slate-100 pb-2">
            Line Items Catalog Ledger
          </span>

          <div className="border border-slate-200 rounded-[3px] overflow-visible bg-slate-50/10">
            <table className="w-full border-collapse border border-slate-200 text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="p-2 border border-slate-200 w-[20%]">Item</th>
                  <th className="p-2 border border-slate-200 w-[25%]">Description</th>
                  <th className="p-2 border border-slate-200 text-center w-[7%]">Qty</th>
                  <th className="p-2 border border-slate-200 text-right w-[10%]">Unit Price</th>
                  <th className="p-2 border border-slate-200 text-center w-[8%]">Disc %</th>
                  <th className="p-2 border border-slate-200 w-[15%]">Sales Account</th>
                  <th className="p-2 border border-slate-200 w-[12%]">Tax Rate</th>
                  <th className="p-2 border border-slate-200 text-right w-[10%]">Amount</th>
                  {!isReadOnly && <th className="p-2 border border-slate-200 text-center w-[3%]"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-normal text-slate-700">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-slate-50/30 transition-colors">
                    {/* Item Catalog Searchable Select */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <SearchableInput
                        options={catalogOptions}
                        value={line.itemId}
                        disabled={isReadOnly}
                        onChange={(val) => handleCatalogSelect(idx, val)}
                        placeholder=""
                        onCreateNew={(el) => {
                          lastActiveElementRef.current = el
                          setQuickItemLineIndex(idx)
                          setShowQuickItemModal(true)
                        }}
                        createNewLabel="Add new item"
                        className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Description */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <input
                        type="text"
                        placeholder=""
                        value={line.description}
                        readOnly={isReadOnly}
                        onChange={e => updateLineField(idx, 'description', e.target.value)}
                        className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' :
                            lineErrors[idx]?.description
                              ? 'border-rose-500 bg-rose-50/10'
                              : 'border-transparent focus:border-[#0F5B38]'
                          }`}
                      />
                    </td>

                    {/* Qty */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        readOnly={isReadOnly}
                        onChange={e => updateLineField(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none transition ${
                          isReadOnly 
                            ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' 
                            : lineErrors[idx]?.quantity
                              ? 'border-rose-500 bg-rose-50/10'
                              : 'border-transparent focus:border-[#0F5B38]'
                        }`}
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        readOnly={isReadOnly}
                        onChange={e => updateLineField(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-right focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' :
                            lineErrors[idx]?.unitPrice
                              ? 'border-rose-500 bg-rose-50/10'
                              : 'border-transparent focus:border-[#0F5B38]'
                          }`}
                      />
                    </td>

                    {/* Discount % */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder=""
                        value={line.discount}
                        readOnly={isReadOnly}
                        onChange={e => updateLineField(idx, 'discount', e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full bg-transparent text-slate-800 border border-transparent rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10' : 'focus:border-[#0F5B38]'
                          }`}
                      />
                    </td>

                    {/* Sales Account Searchable Select */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <SearchableInput
                        options={accountOptions}
                        value={line.accountId}
                        disabled={isReadOnly}
                        onChange={(val) => updateLineField(idx, 'accountId', val)}
                        placeholder=""
                        className="w-full bg-transparent text-slate-800 border border-transparent rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
                      />
                    </td>

                    {/* Tax Rate Searchable Select */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <SearchableInput
                        options={taxOptions}
                        value={line.taxRateId}
                        onChange={(val) => updateLineField(idx, 'taxRateId', val)}
                        placeholder=""
                        disabled={isReadOnly || taxType === 'No Tax'}
                        className="w-full bg-transparent text-slate-800 border border-transparent rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="px-2.5 py-2.5 border border-slate-200 align-middle text-right font-normal text-slate-800 text-[12px]">
                      {currencySymbol}{(Number(line.quantity || 0) * Number(line.unitPrice || 0) * (1 - Number(line.discount || 0) / 100)).toFixed(2)}
                    </td>

                    {/* Action Trash & Plus */}
                    {!isReadOnly && (
                      <td className="p-0 border border-slate-200 align-middle text-center">
                        <div className="flex items-center justify-center space-x-1.5 px-2">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className={`p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition cursor-pointer inline-flex items-center justify-center ${lines.length === 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : ''
                              }`}
                            title="Remove item line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={addLineItem}
                            className="p-2 hover:bg-emerald-50 text-[#0F5B38] rounded-[3px] transition cursor-pointer inline-flex items-center justify-center focus:ring-2 focus:ring-emerald-500/20"
                            title="Add item line"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Line Control Button */}
          {!isReadOnly && (
            <div className="pt-2">
              <button
                onClick={addLineItem}
                className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold text-[10px] px-4 py-2 border border-slate-200 rounded-[3px] transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[#0F5B38]" />
                <span>Add row</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom notes, attachments, and calculation summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
          {/* Bottom Left: Additional Notes & Optional Attachment */}
          <div className="space-y-5">
            {/* Notes Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Additional Notes</label>
              <textarea
                value={notes}
                readOnly={isReadOnly}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any additional notes, terms, or conditions..."
                rows={3}
                className={`w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] transition resize-none placeholder:text-slate-400 ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
                  }`}
              />
            </div>

            {/* File Attachment Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Attachments (Optional)</label>
              <div className="flex items-center space-x-3">
                {!isReadOnly && (
                  <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-[3px] transition cursor-pointer select-none">
                    <span>Choose File</span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
                {attachmentName ? (
                  <div className="flex items-center space-x-2 text-xs text-slate-650 bg-slate-50 px-3 py-1.5 rounded-[3px] border border-slate-200 font-semibold">
                    <span className="truncate max-w-[200px] font-semibold">{attachmentName}</span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentName('')
                          setAttachmentFile(null)
                        }}
                        className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">No file attached</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Right: Live calculations summary */}
          <div className="space-y-2.5 max-w-[280px] ml-auto text-xs w-full">
            <div className="flex justify-between text-slate-450 font-semibold">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">{currencySymbol}{getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-450 font-semibold">
              <span>Tax Aggregate Total</span>
              <span className="font-bold text-slate-800">{currencySymbol}{getTaxTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold text-[15px] border-t border-slate-100 pt-3">
              <span>Grand Total</span>
              <span className="text-[#0F5B38] font-extrabold">{currencySymbol}{getGrandTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Inline Modal for Creating a New Project */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center font-sans">
          <div
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity"
            onClick={() => setIsCreateProjectOpen(false)}
          ></div>
          <div className="relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full max-w-md p-6 space-y-6 mx-4 rounded-[3px] border border-slate-100 animate-scaleIn">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-850">Create New Project</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Add a new tracking project to assign to your transactions.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Project Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q4 Website Development"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Project Code (Optional)</label>
                <input
                  type="text"
                  value={newProjectCode}
                  onChange={e => setNewProjectCode(e.target.value)}
                  placeholder="e.g. PRJ-001"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-655 rounded-[3px] transition cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-5 py-2.5 rounded-[3px] shadow-md bg-[#0F5B38] hover:brightness-105 text-white transition text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Modal for Creating a New Contact */}
      {showQuickContactModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center font-sans">
          <div
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity"
            onClick={() => setShowQuickContactModal(false)}
          ></div>
          <form
            onSubmit={handleQuickAddContact}
            className="relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full max-w-md p-6 space-y-6 mx-4 rounded-[3px] border border-slate-100 animate-scaleIn"
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-850">Add New Contact</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Quickly create a new contact client to assign to this quotation.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Business Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickContactName}
                  onChange={e => setQuickContactName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                />
              </div>

              <div className="space-y-4 grid grid-cols-2 gap-4 space-y-0">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Contact Person / Tax ID</label>
                  <input
                    type="text"
                    value={quickContactTaxNumber}
                    onChange={e => setQuickContactTaxNumber(e.target.value)}
                    placeholder="e.g. John Doe / NTN-123"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="text"
                    value={quickContactPhone}
                    onChange={e => setQuickContactPhone(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={quickContactEmail}
                  onChange={e => setQuickContactEmail(e.target.value)}
                  placeholder="e.g. billing@acme.com"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Billing Address</label>
                <textarea
                  value={quickContactAddress}
                  onChange={e => setQuickContactAddress(e.target.value)}
                  placeholder="e.g. 123 Business Rd, Suite 100, New York, NY 10001"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickContactModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-655 rounded-[3px] transition cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !quickContactName.trim()}
                className="px-5 py-2.5 rounded-[3px] shadow-md bg-[#0F5B38] hover:brightness-105 text-white transition text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Add Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Modal for Creating a New Item */}
      {showQuickItemModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center font-sans">
          <div
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity"
            onClick={() => setShowQuickItemModal(false)}
          ></div>
          <form
            onSubmit={handleQuickAddItem}
            className="relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full max-w-md p-6 space-y-6 mx-4 rounded-[3px] border border-slate-100 animate-scaleIn"
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-850">Add New Item</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Quickly create a new product or service catalog item.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Item Code / SKU <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={quickItemCode}
                    onChange={e => setQuickItemCode(e.target.value)}
                    placeholder="e.g. CONSULT-HR"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Item Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={quickItemName}
                    onChange={e => setQuickItemName(e.target.value)}
                    placeholder="e.g. Consulting Hour"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Sales Unit Price <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={quickItemPrice}
                    onChange={e => setQuickItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Sales Account <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={quickItemAccountId}
                    onChange={e => setQuickItemAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[36px]"
                  >
                    <option value="" disabled>Select Account</option>
                    {accounts.filter(a => a.class_type === 'Revenue').map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Sales Tax Rate</label>
                <select
                  value={quickItemTaxRateId}
                  onChange={e => setQuickItemTaxRateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[36px]"
                >
                  <option value="">No Tax / Exempt</option>
                  {taxRates.map(tr => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name} ({tr.rate}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Sales Description</label>
                <textarea
                  value={quickItemDescription}
                  onChange={e => setQuickItemDescription(e.target.value)}
                  placeholder="Describe this item for invoices and quotations..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickItemModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-655 rounded-[3px] transition cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !quickItemCode.trim() || !quickItemName.trim()}
                className="px-5 py-2.5 rounded-[3px] shadow-md bg-[#0F5B38] hover:brightness-105 text-white transition text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center overflow-y-auto py-6 font-sans">
          <div
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity"
            onClick={() => setIsPaymentModalOpen(false)}
          ></div>
          <div className="relative transform bg-white text-left shadow-2xl transition-all w-full max-w-lg p-6 space-y-6 mx-4 rounded-[3px] border border-slate-100 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="space-y-1.5 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-850">Record Invoice Payment</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed font-normal">
                Log the receipt of funds for Invoice {invoiceNumber} and adjust ledger balances.
              </p>
            </div>

            <div className="space-y-4">
              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                />
              </div>

              {/* Single / Multiple toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Payment Option</label>
                <div className="flex border border-slate-200 rounded-[3px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplitPayment(false)
                      setSinglePaymentAmount(getGrandTotal().toFixed(2))
                    }}
                    className={`flex-1 text-center py-2 text-xs font-semibold transition ${!isSplitPayment
                        ? 'bg-[#0F5B38] text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    Single Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplitPayment(true)
                      setPaymentRows([{ accountId: bankAccounts[0]?.id || '', amount: getGrandTotal() }])
                    }}
                    className={`flex-1 text-center py-2 text-xs font-semibold transition ${isSplitPayment
                        ? 'bg-[#0F5B38] text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    Split Accounts
                  </button>
                </div>
              </div>

              {/* Account selection inputs */}
              {!isSplitPayment ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Bank Account</label>
                    <select
                      value={singlePaymentAccountId}
                      onChange={e => setSinglePaymentAccountId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[36px] cursor-pointer"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={singlePaymentAmount}
                      onChange={e => setSinglePaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[36px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Split Distribution</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1.5">
                    {paymentRows.map((row, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <select
                          value={row.accountId}
                          onChange={e => updatePaymentRow(idx, 'accountId', e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-[3px] px-3 py-1.5 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[34px] cursor-pointer"
                        >
                          <option value="">Select Account</option>
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={row.amount}
                          onChange={e => updatePaymentRow(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0.00"
                          className="w-32 bg-slate-50 border border-slate-200 rounded-[3px] px-3 py-1.5 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[34px]"
                        />
                        <button
                          type="button"
                          onClick={() => removePaymentRow(idx)}
                          disabled={paymentRows.length <= 1}
                          className="p-1.5 text-slate-450 hover:text-rose-600 disabled:opacity-30 transition cursor-pointer"
                          title="Remove split account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addPaymentRow}
                    className="flex items-center space-x-1 text-[#0F5B38] hover:text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[3px] px-3 py-1.5 transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Bank Account</span>
                  </button>
                </div>
              )}

              {/* Match Verification & Info Banner */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-[3px] p-4 space-y-2.5 text-xs">
                <div className="flex justify-between font-semibold text-slate-500">
                  <span>Grand Total to Pay:</span>
                  <span className="text-slate-800 font-bold">{currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-500">
                  <span>Total Amount Input:</span>
                  <span className="text-slate-800 font-bold">{currencySymbol}{totalPaid.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200/50 pt-2 flex justify-between font-extrabold text-[13px]">
                  <span>Remaining / Difference:</span>
                  <span className={isPaymentBalanced ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {currencySymbol}{paymentDiff.toFixed(2)}
                  </span>
                </div>
                <div className="pt-1">
                  {isPaymentBalanced ? (
                    <span className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100/30 uppercase tracking-wider">
                      ✓ Amounts Match Exactly
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full border border-amber-100/30 uppercase tracking-wider animate-pulse">
                      ⚠ Mismatch: Payments must match total
                    </span>
                  )}
                </div>
              </div>

            </div>

            <div className="flex space-x-3 pt-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-655 rounded-[3px] transition cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={isSubmitting || !isPaymentBalanced || (isSplitPayment && paymentRows.some(r => !r.accountId))}
                className="px-5 py-2.5 rounded-[3px] shadow-md bg-[#0F5B38] hover:brightness-105 text-white transition text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        defaultEmail={contacts.find(c => c.id === selectedContactId)?.email || ''}
        documentType="Invoice"
        documentNumber={invoiceNumber}
        contactName={contacts.find(c => c.id === selectedContactId)?.name || ''}
        totalAmount={`${currency} ${getGrandTotal().toFixed(2)}`}
        orgName={activeOrg.name}
        onSend={async (to, subject, message) => {
          let resolvedId = invoiceDbId || editingInvoiceId
          const needsApproval = status === 'Draft' || status === 'Awaiting Approval' || !resolvedId

          if (needsApproval) {
            resolvedId = await handleSaveInvoice('Awaiting Payment', false, true)
            if (!resolvedId) {
              throw new Error('Failed to save and approve invoice.')
            }
          }

          if (isMockMode) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            showAlert({
              title: needsApproval ? 'Approved & Emailed (Sandbox)' : 'Email Sent (Sandbox)',
              message: `Simulated emailing invoice to ${to}. Check backend console/logs.`,
              type: 'success'
            })
            if (setEditingInvoiceId) setEditingInvoiceId(null)
            setActiveTab('Invoices')
            return
          }
          const payload = {
            to,
            subject,
            message,
            notes,
            logo: localStorage.getItem(`kdm_org_logo_${activeOrg.id}`) || '',
            payment_terms: salesSetting?.standard_payment_terms || '',
            bank_details: {
              bank_name: localStorage.getItem(`kdm_bank_name_${activeOrg.id}`) || '',
              account_name: localStorage.getItem(`kdm_bank_account_name_${activeOrg.id}`) || '',
              account_number: localStorage.getItem(`kdm_bank_account_number_${activeOrg.id}`) || '',
              routing_number: localStorage.getItem(`kdm_bank_routing_number_${activeOrg.id}`) || ''
            },
            template_settings: {
              theme_color: localStorage.getItem(`kdm_invoice_theme_color_${activeOrg.id}`) || '#0F5B38'
            },
            org_details: {
              name: activeOrg.name,
              country: activeOrg.country,
              tax_id: activeOrg.tax_id
            }
          }
          await apiService.sendInvoiceEmail(resolvedId!, payload)
          showAlert({
            title: needsApproval ? 'Approved & Emailed' : 'Email Sent',
            message: needsApproval
              ? `Invoice ${invoiceNumber} was successfully approved and emailed to ${to}.`
              : `Invoice ${invoiceNumber} was successfully emailed to ${to}.`,
            type: 'success'
          })
          if (setEditingInvoiceId) setEditingInvoiceId(null)
          setActiveTab('Invoices')
        }}
      />
    </div>
  )
}
