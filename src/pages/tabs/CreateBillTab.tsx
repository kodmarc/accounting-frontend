import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle, Save, X, Loader2, ChevronDown, MoreVertical, AlertCircle } from 'lucide-react'
import { apiService, API_BASE_URL } from '../../services/api'
import type { Organization, Contact, Item, Account, TaxRate, Project } from '../../services/api'
import { SearchableInput } from '../../components/SearchableInput'
import { EmailModal } from '../../components/EmailModal'
import { usePopup } from '../../components/PopupProvider'
import { XeroDatePicker } from '../../components/XeroDatePicker'

interface CreateBillTabProps {
  activeOrg: Organization
  isMockMode?: boolean
  setActiveTab: (tab: any) => void
  editingBillId?: string | null
  setEditingBillId?: (id: string | null) => void
}

export function CreateBillTab({
  activeOrg,
  isMockMode = false,
  setActiveTab,
  editingBillId = null,
  setEditingBillId
}: CreateBillTabProps) {
  const { showConfirm, showAlert } = usePopup()
  
  // Database states
  const [contacts, setContacts] = useState<Contact[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  // Loading & UX States
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Form Fields
  const [selectedContactId, setSelectedContactId] = useState('')
  const [billNumber, setBillNumber] = useState('')
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

  // Payment recording states
  const [isApproveDropdownOpen, setIsApproveDropdownOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [singlePaymentAccountId, setSinglePaymentAccountId] = useState('')
  const [singlePaymentAmount, setSinglePaymentAmount] = useState('')
  const [paymentRows, setPaymentRows] = useState<{ accountId: string; amount: number | '' }[]>([])
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])

  const isReadOnly = status === 'Paid'

  // Project List & Creation states
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
  const [quickItemPrice, setQuickItemPrice] = useState('0.00') // represents purchase_unit_cost
  const [quickItemAccountId, setQuickItemAccountId] = useState('')
  const [quickItemTaxRateId, setQuickItemTaxRateId] = useState('')
  const [quickItemDescription, setQuickItemDescription] = useState('')

  // Pre-select default expense account and tax rate for quick item modal
  useEffect(() => {
    if (showQuickItemModal) {
      const firstExpense = accounts.find(a => a.class_type === 'Expense' || a.type === 'Direct Costs')
      if (firstExpense && !quickItemAccountId) {
        setQuickItemAccountId(firstExpense.id)
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

  // Line Form Item
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

  // Load all master list data
  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let loadedContacts: Contact[] = []
      let loadedAccounts: Account[] = []
      let loadedTaxRates: TaxRate[] = []
      let loadedCatalog: Item[] = []
      let loadedProjects: Project[] = []

      if (isMockMode) {
        // Load mock contacts/accounts/taxRates/catalog if offline
        const mockContacts: Contact[] = [
          { id: 'mock-s-1', name: 'Alibaba Cloud SG', email: 'billing@alibaba.com', phone: '+65 6729 0122', tax_number: 'VAT-9021', billing_address: '8 Shenton Way, Singapore 068811', default_sales_account: null, default_purchase_account: null, contact_type: 'Supplier', created_at: '' },
          { id: 'mock-s-2', name: 'Saad Software Designs', email: 'saad@softwaredesigns.com', phone: '+92 300 1234567', tax_number: 'NTN-49102', billing_address: 'DHA Phase 6, Lahore, Pakistan', default_sales_account: null, default_purchase_account: null, contact_type: 'Supplier', created_at: '' }
        ]
        const mockAccounts: Account[] = [
          { id: 'mock-a-1', code: '300', name: 'Cost of Goods Sold', class_type: 'Expense', type: 'Direct Costs', default_tax_rate: null, description: 'Inventory cost allocations', is_system_account: false, created_at: '' },
          { id: 'mock-a-2', code: '400', name: 'Software Licensing', class_type: 'Expense', type: 'Expense', default_tax_rate: null, description: 'SaaS subscriptions', is_system_account: false, created_at: '' }
        ]
        const mockTaxRates: TaxRate[] = [
          { id: 'mock-t-1', name: 'SG GST 9%', rate: 9.0, is_active: true, created_at: '' },
          { id: 'mock-t-2', name: 'Tax Exempt', rate: 0.0, is_active: true, created_at: '' }
        ]
        const mockCatalog: Item[] = [
          { id: 'mock-i-1', code: 'CLOUD-LIC', name: 'Cloud Hosting Monthly Server', is_sold: false, sales_unit_price: 0, sales_account: null, sales_tax_rate: null, sales_description: '', is_purchased: true, purchase_unit_cost: 150.00, purchase_account: 'mock-a-2', purchase_tax_rate: 'mock-t-1', purchase_description: 'Monthly cloud virtual machine container resource allocations', created_at: '' }
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
        const [contactList, itemList, accList, taxList, projList] = await Promise.all([
          apiService.getContacts(activeOrg.id),
          apiService.getItems(activeOrg.id),
          apiService.getAccounts(activeOrg.id),
          apiService.getTaxRates(activeOrg.id),
          apiService.getProjects(activeOrg.id)
        ])

        loadedContacts = contactList.filter(c => c.contact_type === 'Supplier' || c.contact_type === 'Both')
        loadedCatalog = itemList.filter(i => i.is_purchased)
        loadedAccounts = accList
        loadedTaxRates = taxList
        loadedProjects = projList
      }

      setContacts(loadedContacts)
      setCatalogItems(loadedCatalog)
      setAccounts(loadedAccounts)
      setTaxRates(loadedTaxRates)
      setProjects(loadedProjects)

      let loadedBanks: Account[] = []
      if (isMockMode) {
        const saved = localStorage.getItem(`kdm_bank_accounts_${activeOrg.id}`)
        loadedBanks = saved ? JSON.parse(saved) : []
        if (loadedBanks.length === 0) {
          loadedBanks = [
            {
              id: 'bank-090',
              code: '090',
              name: 'ANZ Business Account',
              class_type: 'Asset',
              type: 'Bank',
              description: 'ANZ Business Daily Transaction Account',
              is_system_account: true,
              created_at: new Date().toISOString()
            }
          ]
          localStorage.setItem(`kdm_bank_accounts_${activeOrg.id}`, JSON.stringify(loadedBanks))
        }
      } else {
        loadedBanks = loadedAccounts.filter(a => a.type === 'Bank')
      }
      setBankAccounts(loadedBanks)
      if (loadedBanks.length > 0) {
        setSinglePaymentAccountId(loadedBanks[0].id)
      }

      const firstAcc = loadedAccounts.find(a => a.class_type === 'Expense' || a.type === 'Direct Costs')?.id || loadedAccounts[0]?.id || ''
      const firstTax = loadedTaxRates[0]?.id || ''

      // Load Purchases Settings dynamically from LocalStorage
      const savedPurchases = localStorage.getItem(`kdm_purchase_settings_${activeOrg.id}`) || 
                             localStorage.getItem(`kdm_mock_purchase_settings_${activeOrg.id}`)
      let loadedPurchaseSetting = {
        bill_prefix: 'BIL-',
        next_bill_number: 1001,
        supplier_terms: '30 days',
        purchase_footer: 'Please submit all vendor bills via email.'
      }
      if (savedPurchases) {
        const parsed = JSON.parse(savedPurchases)
        loadedPurchaseSetting = {
          bill_prefix: parsed.bill_prefix || 'BIL-',
          next_bill_number: Number(parsed.next_bill_number) || 1001,
          supplier_terms: parsed.supplier_terms || '30 days',
          purchase_footer: parsed.purchase_footer || 'Please submit all vendor bills via email.'
        }
      }

      if (editingBillId) {
        let targetBill: any = null
        if (isMockMode) {
          const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`)
          const list = savedBills ? JSON.parse(savedBills) : []
          targetBill = list.find((b: any) => b.bill_number === editingBillId || b.id === editingBillId) || null
        } else {
          try {
            targetBill = await apiService.getBill(editingBillId)
          } catch (err) {
            console.error("Failed to load bill via API:", err)
          }
        }

        if (targetBill) {
          setSelectedContactId(targetBill.contact)
          setBillNumber(targetBill.bill_number)
          setReference(targetBill.reference || '')
          setDate(targetBill.date)
          setDueDate(targetBill.due_date)
          setStatus(targetBill.status as any)
          setCurrency(targetBill.currency || activeOrg.currency || 'USD')
          setTaxType(targetBill.tax_type || 'Exclusive')
          setSelectedProjectId(targetBill.project || '')
          
          const savedNotes = localStorage.getItem(`kdm_bill_notes_${targetBill.id}`)
          if (savedNotes) setNotes(savedNotes)
          else setNotes(targetBill.notes || '')

          const savedAttachment = localStorage.getItem(`kdm_bill_attachment_${targetBill.id}`)
          if (savedAttachment) setAttachmentName(savedAttachment)
          
          if (targetBill.lines && targetBill.lines.length > 0) {
            setLines(targetBill.lines.map((l: any, idx: number) => ({
              id: l.id || String(idx),
              itemId: l.item || '',
              description: l.description || '',
              quantity: Number(l.quantity) || 1,
              unitPrice: Number(l.unit_price) || 0,
              discount: Number(l.discount) || 0,
              accountId: l.account || firstAcc,
              taxRateId: l.tax_rate || firstTax
            })))
          }
        }
      } else {
        // NEW MODE: Initialize standard blank bill defaults
        setSelectedContactId('')
        
        // Auto bill number generation from Purchase Settings
        const prefix = loadedPurchaseSetting.bill_prefix
        const nextNum = String(loadedPurchaseSetting.next_bill_number).padStart(4, '0')
        setBillNumber(`${prefix}${nextNum}`)

        // Auto set due date based on settings terms
        const terms = loadedPurchaseSetting.supplier_terms.toLowerCase()
        let days = 30
        if (terms.includes('receipt')) days = 0
        else if (terms.includes('7')) days = 7
        else if (terms.includes('15')) days = 15
        else if (terms.includes('30')) days = 30
        
        const today = new Date()
        today.setDate(today.getDate() + days)
        setDueDate(today.toISOString().split('T')[0])

        setLines([{ id: '1', itemId: '', description: '', quantity: '', unitPrice: '', discount: '', accountId: firstAcc, taxRateId: firstTax }])
        setNotes('')
        setAttachmentName('')
        setAttachmentFile(null)
      }
    } catch (e: any) {
      console.warn("Failed to load dependencies or bill", e)
      setErrorMsg(e.message || "Failed to load active ledger catalogs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id, isMockMode, editingBillId])

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
    updated[index].description = targetItem.purchase_description || targetItem.name
    updated[index].unitPrice = Number(targetItem.purchase_unit_cost)

    if (targetItem.purchase_account) updated[index].accountId = targetItem.purchase_account
    if (targetItem.purchase_tax_rate) updated[index].taxRateId = targetItem.purchase_tax_rate

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
      showAlert({ title: 'Validation Warning', message: 'Supplier name is required.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      let createdContact: Contact

      if (isMockMode) {
        createdContact = {
          id: `mock-s-${Date.now()}`,
          name: quickContactName.trim(),
          email: quickContactEmail.trim() || '',
          phone: quickContactPhone.trim() || '',
          tax_number: quickContactTaxNumber.trim() || '',
          billing_address: quickContactAddress.trim() || '',
          default_sales_account: null,
          default_purchase_account: null,
          contact_type: 'Supplier',
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
          contact_type: 'Supplier'
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
      showAlert({ title: 'Error Saving Supplier', message: err.message || 'Failed to save supplier.', type: 'error' })
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
          is_sold: false,
          sales_unit_price: 0,
          sales_account: null,
          sales_tax_rate: null,
          sales_description: '',
          is_purchased: true,
          purchase_unit_cost: parseFloat(quickItemPrice) || 0,
          purchase_account: quickItemAccountId || null,
          purchase_tax_rate: quickItemTaxRateId || null,
          purchase_description: quickItemDescription.trim() || quickItemName.trim(),
          created_at: new Date().toISOString()
        }
        const updatedCatalog = [...catalogItems, createdItem]
        setCatalogItems(updatedCatalog)
        localStorage.setItem(`kdm_mock_catalog_${activeOrg.id}`, JSON.stringify(updatedCatalog))
      } else {
        const payload: Partial<Item> = {
          code: quickItemCode.trim().toUpperCase(),
          name: quickItemName.trim(),
          is_purchased: true,
          purchase_unit_cost: parseFloat(quickItemPrice) || 0,
          purchase_account: quickItemAccountId || undefined,
          purchase_tax_rate: quickItemTaxRateId || undefined,
          purchase_description: quickItemDescription.trim() || quickItemName.trim(),
          is_sold: false
        }
        createdItem = await apiService.createItem(activeOrg.id, payload)
        setCatalogItems(prev => [...prev, createdItem])
      }

      if (quickItemLineIndex !== null) {
        const updated = [...lines]
        updated[quickItemLineIndex].itemId = createdItem.id
        updated[quickItemLineIndex].description = createdItem.purchase_description || createdItem.name
        updated[quickItemLineIndex].unitPrice = Number(createdItem.purchase_unit_cost)
        if (createdItem.purchase_account) updated[quickItemLineIndex].accountId = createdItem.purchase_account
        if (createdItem.purchase_tax_rate) updated[quickItemLineIndex].taxRateId = createdItem.purchase_tax_rate
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
        const defaultAccount = accounts.find(a => a.code === '300' || a.name.toLowerCase().includes('purchases') || a.class_type === 'Expense')?.id || accounts[0]?.id || ''
        updated[index].accountId = defaultAccount
      }
      if (!updated[index].taxRateId) {
        const defaultTax = taxType === 'No Tax'
          ? (taxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)?.id || '')
          : (taxRates.find(t => t.name.toLowerCase().includes('purchases'))?.id || taxRates[0]?.id || '')
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
    const defaultAcc = accounts.find(a => a.code === '300' || a.name.toLowerCase().includes('purchases') || a.class_type === 'Expense')?.id || accounts[0]?.id || ''
    const defaultTax = taxType === 'No Tax'
      ? (taxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)?.id || '')
      : (taxRates.find(t => t.name.toLowerCase().includes('purchases'))?.id || taxRates[0]?.id || '')
    setLines([...lines, {
      id: String(Date.now()),
      itemId: '',
      description: '',
      quantity: '',
      unitPrice: '',
      discount: '',
      accountId: defaultAcc,
      taxRateId: defaultTax
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

  const validateForm = (): boolean => {
    // Form Validation
    const formErrors: Record<string, string> = {}
    const rowErrors: Record<number, Record<string, boolean>> = {}
    let hasValidationErrors = false

    if (!selectedContactId) {
      formErrors.contact = 'Supplier is required.'
      hasValidationErrors = true
    }
    if (!billNumber.trim()) {
      formErrors.billNumber = 'Bill number is required.'
      hasValidationErrors = true
    }
    if (!date) {
      formErrors.date = 'Bill date is required.'
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

    // Clear errors if valid
    setErrors({})
    setLineErrors({})
    return true
  }

  // Save / Update bill (Saves via backend API or mock LocalStorage)
  const handleSaveBill = async (
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

      const fallbackAcc = accounts.find(a => a.code === '300' || a.name.toLowerCase().includes('purchases') || a.class_type === 'Expense')?.id || accounts[0]?.id || ''
      const fallbackTax = taxType === 'No Tax'
        ? (taxRates.find(t => t.name.toLowerCase().includes('exempt') || Number(t.rate) === 0)?.id || null)
        : (taxRates.find(t => t.name.toLowerCase().includes('purchases'))?.id || taxRates[0]?.id || null)

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
    const isEdit = editingBillId ? true : false
    const payload = {
      contact: selectedContactId,
      bill_number: billNumber,
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
      lines: postLines
    }

    try {
      let resolvedBillId = editingBillId || `mock-bill-${Date.now()}`
      if (!isMockMode) {
        if (isEdit) {
          const res = await apiService.updateBill(editingBillId!, payload)
          resolvedBillId = res.id || editingBillId!
        } else {
          const res = await apiService.createBill(activeOrg.id, payload)
          resolvedBillId = res.id || ''
        }
      } else {
        const contactObj = contacts.find(c => c.id === selectedContactId)
        const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`)
        const list = savedBills ? JSON.parse(savedBills) : []
        
        let updatedList: any[] = []
        if (isEdit) {
          updatedList = list.map((b: any) => {
            if (b.id === editingBillId || b.bill_number === editingBillId) {
              return {
                ...b,
                ...payload,
                contact_name: contactObj ? contactObj.name : b.contact_name,
                lines: postLines.map((pl, idx) => ({ ...pl, id: `mock-bill-l-${idx}-${Date.now()}` }))
              }
            }
            return b
          })
        } else {
          const mockCreated = {
            ...payload,
            id: resolvedBillId,
            contact_name: contactObj ? contactObj.name : "Mock Supplier",
            lines: postLines.map((pl, idx) => ({ ...pl, id: `mock-bill-l-${idx}-${Date.now()}` })),
            created_at: new Date().toISOString()
          }
          updatedList = [mockCreated, ...list]

          // Auto-increment sequence number in localStorage Purchases Settings upon successful save!
          const savedPurchases = localStorage.getItem(`kdm_purchase_settings_${activeOrg.id}`) || 
                                 localStorage.getItem(`kdm_mock_purchase_settings_${activeOrg.id}`)
          if (savedPurchases) {
            const parsed = JSON.parse(savedPurchases)
            parsed.next_bill_number = (Number(parsed.next_bill_number) || 1001) + 1
            localStorage.setItem(`kdm_purchase_settings_${activeOrg.id}`, JSON.stringify(parsed))
            localStorage.setItem(`kdm_mock_purchase_settings_${activeOrg.id}`, JSON.stringify(parsed))
          }
        }
        
        localStorage.setItem(`kdm_mock_bills_${activeOrg.id}`, JSON.stringify(updatedList))
      }

      localStorage.setItem(`kdm_bill_notes_${resolvedBillId}`, notes)
      localStorage.setItem(`kdm_bill_attachment_${resolvedBillId}`, attachmentName)
      
      if (!silent) {
        showAlert({ title: isEdit ? 'Bill Updated' : 'Bill Created', message: `Bill ${billNumber} has been saved successfully.`, type: 'success' })
        if (isEmailing) {
          setIsEmailModalOpen(true)
        } else {
          if (setEditingBillId) setEditingBillId(null)
          setActiveTab('Bills')
        }
      }
      return resolvedBillId
    } catch (err: any) {
      showAlert({ title: 'Save Error', message: "An error occurred while saving the bill: " + (err.message || "Please check if details are correct."), type: 'error' })
      return null
    } finally {
      setIsSubmitting(false)
      setIsMoreDropdownOpen(false)
    }
  }

  // Premium download PDF with exact quote and sales dynamic POST generation & clean offline print fallback
  const handlePrintPDF = async () => {
    setIsDownloadingPdf(true)
    try {
      const token = localStorage.getItem('kdm_auth_token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Token ${token}`
      }

      // Load logo, bank details, template settings, and org details
      const logo = localStorage.getItem(`kdm_org_logo_${activeOrg.id}`) || ''
      const bankDetails = JSON.parse(localStorage.getItem(`kdm_bank_details_${activeOrg.id}`) || '{}')
      const templateSettings = JSON.parse(
        localStorage.getItem(`kdm_purchase_template_settings_${activeOrg.id}`) || 
        localStorage.getItem(`kdm_sales_template_settings_${activeOrg.id}`) || 
        '{}'
      )
      const orgDetails = JSON.parse(localStorage.getItem(`kdm_org_extensions_${activeOrg.id}`) || '{}')
      
      const supplierObj = contacts.find(c => c.id === selectedContactId)
      const projectObj = projects.find(p => p.id === selectedProjectId)
      
      // Load purchases settings to send standard terms fallback
      const savedPurchases = localStorage.getItem(`kdm_purchase_settings_${activeOrg.id}`) || 
                             localStorage.getItem(`kdm_mock_purchase_settings_${activeOrg.id}`)
      let supplierTerms = '30 days'
      if (savedPurchases) {
        const parsed = JSON.parse(savedPurchases)
        supplierTerms = parsed.supplier_terms || '30 days'
      }

      const postLines = lines.map(l => {
        const itemObj = catalogItems.find(i => i.id === l.itemId)
        const taxObj = taxRates.find(t => t.id === l.taxRateId)
        return {
          item_code: itemObj ? itemObj.code : '',
          item_name: itemObj ? itemObj.name : '',
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unitPrice) || 0,
          discount: Number(l.discount) || 0,
          tax_rate_name: taxObj ? taxObj.name : '',
          total: (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discount) || 0) / 100)
        }
      })

      // Fetch PDF from Django backend dynamically
      const url = `${API_BASE_URL}/bills/download-pdf/?_t=${Date.now()}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bill_number: billNumber,
          reference: reference,
          date: date,
          due_date: dueDate,
          currency: currency,
          tax_type: taxType,
          project_name: projectObj ? projectObj.name : '',
          contact_name: supplierObj ? supplierObj.name : 'Vendor Supplier',
          contact_email: supplierObj ? supplierObj.email : '',
          contact_phone: supplierObj ? supplierObj.phone : '',
          contact_address: supplierObj ? supplierObj.billing_address : '',
          lines: postLines,
          subtotal: getSubtotal(),
          tax_total: getTaxTotal(),
          total: getGrandTotal(),
          notes: notes,
          logo: logo,
          bank_details: bankDetails,
          template_settings: templateSettings,
          org_details: orgDetails,
          payment_terms: supplierTerms,
          org_name: activeOrg.name,
          org_tax_id: activeOrg.tax_id,
          org_country: activeOrg.country
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
      a.download = `Bill_${billNumber || 'VendorBill'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      // Sandbox fallback: print screen cleanly
      console.warn("Backend PDF generation failed, falling back to print dialog:", err.message)
      document.body.classList.add('pdf-mode')
      window.print()
      document.body.classList.remove('pdf-mode')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Deletes bill after showing brand confirmation popup modal
  const handleDeleteBill = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Vendor Bill',
      message: 'Are you sure you want to delete this bill? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true
    })
    if (!confirmed) return
    
    setIsSubmitting(true)
    try {
      if (!isMockMode) {
        await apiService.deleteBill(editingBillId!)
      } else {
        const resolvedId = editingBillId
        const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`)
        const list = savedBills ? JSON.parse(savedBills) : []
        const updatedList = list.filter((b: any) => b.id !== resolvedId && b.bill_number !== editingBillId)
        localStorage.setItem(`kdm_mock_bills_${activeOrg.id}`, JSON.stringify(updatedList))
      }
      
      if (setEditingBillId) setEditingBillId(null)
      setActiveTab('Bills')
    } catch (err: any) {
      showAlert({ title: 'Delete Failed', message: 'Failed to delete bill: ' + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update bill status instantly on the spot without reloads
  const handleUpdateStatusOnTheSpot = async (newStatus: 'Draft' | 'Awaiting Payment' | 'Paid') => {
    if (!editingBillId) return
    setIsSubmitting(true)
    try {
      if (!isMockMode) {
        await apiService.updateBill(editingBillId, { status: newStatus })
      } else {
        const resolvedId = editingBillId
        const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`)
        const list = savedBills ? JSON.parse(savedBills) : []
        const updatedList = list.map((b: any) => {
          if (b.id === resolvedId || b.bill_number === editingBillId) {
            return { ...b, status: newStatus }
          }
          return b
        })
        localStorage.setItem(`kdm_mock_bills_${activeOrg.id}`, JSON.stringify(updatedList))
      }
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
        message: `The total payment amount (${currencySymbol}${totalPaid.toFixed(2)}) must exactly equal the bill total (${currencySymbol}${grandTotal.toFixed(2)}). Difference is ${currencySymbol}${diff.toFixed(2)}.`,
        type: 'warning'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const balanceKey = `kdm_bank_balances_${activeOrg.id}`;
      const savedBalances = localStorage.getItem(balanceKey);
      const balances = savedBalances ? JSON.parse(savedBalances) : {
        'mock-bank-090': 0.00,
        'bank-090': 0.00
      };

      payments.forEach(p => {
        if (balances[p.accountId] === undefined) {
          balances[p.accountId] = p.accountId.includes('090') ? 0.00 : 0.00;
        }
        // Cost outflow deducts bank balance
        balances[p.accountId] = parseFloat((balances[p.accountId] - p.amount).toFixed(2));
      });
      localStorage.setItem(balanceKey, JSON.stringify(balances));

      const txKey = `kdm_bank_transactions_${activeOrg.id}`;
      const savedTx = localStorage.getItem(txKey);
      const transactions = savedTx ? JSON.parse(savedTx) : [];

      const supplierObj = contacts.find(c => c.id === selectedContactId);
      const contactName = supplierObj ? supplierObj.name : "Supplier";

      payments.forEach(p => {
        const bankAcc = bankAccounts.find(b => b.id === p.accountId);
        const newTx = {
          id: `tx-${Date.now()}-${Math.random()}`,
          accountId: p.accountId,
          accountName: bankAcc?.name || 'Bank Account',
          date: paymentDate,
          description: `Payment sent for Bill ${billNumber}. Contact: ${contactName}`,
          // Cost outflow represented as negative amount
          amount: -p.amount,
          reference: reference || billNumber
        };
        transactions.unshift(newTx);
      });
      localStorage.setItem(txKey, JSON.stringify(transactions));

      if (!isMockMode) {
        await apiService.updateBill(editingBillId!, { status: 'Paid' })
      } else {
        const resolvedId = editingBillId || `mock-bill-${Date.now()}`;
        const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`);
        const list = savedBills ? JSON.parse(savedBills) : [];
        const updatedList = list.map((b: any) => {
          if (b.id === resolvedId || b.bill_number === editingBillId) {
            return {
              ...b,
              status: 'Paid' as const
            };
          }
          return b;
        });
        localStorage.setItem(`kdm_mock_bills_${activeOrg.id}`, JSON.stringify(updatedList));
      }

      setStatus('Paid');
      setIsPaymentModalOpen(false);
      showAlert({
        title: 'Payment Recorded',
        message: `Successfully recorded payment of ${currencySymbol}${grandTotal.toFixed(2)} and marked bill as Paid.`,
        type: 'success'
      });

      if (setEditingBillId) setEditingBillId(null);
      setActiveTab('Bills');
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

  const renderApproveAndEmailButton = () => {
    return (
      <div className="relative inline-flex h-[38px] rounded-[3px] shadow-sm animate-fadeIn">
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
                  handleSaveBill('Awaiting Payment')
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
                  }
                  setIsApproveDropdownOpen(false)
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

  const grandTotal = getGrandTotal()
  const totalPaid = isSplitPayment
    ? paymentRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    : (Number(singlePaymentAmount) || 0)
  const paymentDiff = grandTotal - totalPaid
  const isPaymentBalanced = Math.abs(paymentDiff) < 0.01

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

  const getCategorizedAccountOptions = (accountsList: Account[]) => {
    const sales = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Revenue')
    const directCosts = accountsList.filter(a => a.type !== 'Bank' && a.type === 'Direct Costs')
    const expenses = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Expense' && a.type !== 'Direct Costs')
    const assets = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Asset')
    const liabilities = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Liability')
    const equity = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Equity')

    const options: { value: string; label: string; isHeader?: boolean }[] = []

    if (sales.length > 0) {
      options.push({ value: 'header-sales', label: 'Sales / Revenue', isHeader: true })
      sales.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (directCosts.length > 0) {
      options.push({ value: 'header-dc', label: 'Direct Costs', isHeader: true })
      directCosts.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (expenses.length > 0) {
      options.push({ value: 'header-expenses', label: 'Expenses', isHeader: true })
      expenses.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (assets.length > 0) {
      options.push({ value: 'header-assets', label: 'Assets', isHeader: true })
      assets.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (liabilities.length > 0) {
      options.push({ value: 'header-liabilities', label: 'Liabilities', isHeader: true })
      liabilities.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (equity.length > 0) {
      options.push({ value: 'header-equity', label: 'Equity', isHeader: true })
      equity.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }

    return options
  }

  const accountOptions = getCategorizedAccountOptions(accounts)

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="flex space-x-2 justify-center items-center">
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce"></div>
        </div>
        <p className="text-slate-500 text-xs font-semibold tracking-wider">Loading bill data...</p>
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
                Applying bill custom templates, vendor tax allocations, and cost distributions...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (setEditingBillId) setEditingBillId(null)
              setActiveTab('Bills')
            }}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[3px] transition duration-200 cursor-pointer"
            title="Return to bills"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <span className="text-[10px] text-slate-400 font-normal uppercase tracking-widest block">Acquisitions Pipeline</span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {editingBillId ? `Vendor Bill: ${billNumber}` : 'Record new purchases bill'}
            </h2>
            {editingBillId && (
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 border ${
                status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/30' :
                status === 'Awaiting Payment' ? 'bg-blue-50 text-blue-600 border-blue-100/30' :
                status === 'Awaiting Approval' ? 'bg-amber-50 text-amber-600 border-amber-100/30' :
                'bg-slate-100 text-slate-500 border-slate-200/50'
              }`}>
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap sm:justify-end gap-2">

          {!editingBillId ? (
            /* NEW BILL MODE */
            <>
              <button
                onClick={() => handleSaveBill('Draft')}
                disabled={isSubmitting}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-400 animate-fadeIn"
              >
                Save as Draft
              </button>

              {renderApproveAndEmailButton()}

              {/* Three Vertical Dots Dropdown Menu */}
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
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700 animate-scaleIn">
                      <div className="py-1 space-y-0.5">
                        <button
                          onClick={() => {
                            handleSaveBill('Awaiting Approval')
                            setIsMoreDropdownOpen(false)
                          }}
                          disabled={isSubmitting}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                        >
                          Submit for Approval
                        </button>
                        <button
                          onClick={() => {
                            showAlert({
                              title: 'Save PDF',
                              message: 'Please save the bill as a Draft or Approve it first before downloading PDF.',
                              type: 'warning'
                            })
                            setIsMoreDropdownOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                        >
                          Save PDF
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* EDITING BILL MODE */
            <>
              {/* Draft Category */}
              {status === 'Draft' && (
                <>
                  <button
                    onClick={() => handleSaveBill('Awaiting Approval')}
                    disabled={isSubmitting}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px] animate-fadeIn"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
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
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700 animate-scaleIn">
                          <div className="py-1 space-y-0.5">
                            <button
                              onClick={() => {
                                handlePrintPDF()
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Save PDF
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteBill()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
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

              {/* Awaiting Approval Category */}
              {status === 'Awaiting Approval' && (
                <>
                  <button
                    onClick={() => handleSaveBill('Awaiting Approval')}
                    disabled={isSubmitting}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px] animate-fadeIn"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
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
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700 animate-scaleIn">
                          <div className="py-1 space-y-0.5">
                            <button
                              onClick={() => {
                                handlePrintPDF()
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Save PDF
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteBill()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
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

              {/* Awaiting Payment Category */}
              {status === 'Awaiting Payment' && (
                <>
                  <button
                    onClick={() => handleSaveBill('Awaiting Payment')}
                    disabled={isSubmitting || isReadOnly}
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
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center animate-fadeIn"
                  >
                    Save PDF
                  </button>

                  <button
                    onClick={() => {
                      setSinglePaymentAmount(grandTotal.toFixed(2))
                      setIsSplitPayment(false)
                      if (bankAccounts.length > 0) {
                        setSinglePaymentAccountId(bankAccounts[0].id)
                      }
                      setPaymentRows([{ accountId: bankAccounts[0]?.id || '', amount: grandTotal }])
                      setIsPaymentModalOpen(true)
                    }}
                    disabled={isSubmitting}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px] animate-fadeIn"
                  >
                    <span>Record Payment</span>
                  </button>

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
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700 animate-scaleIn">
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
                                handleDeleteBill()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
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

              {/* Paid Category */}
              {status === 'Paid' && (
                <>
                  <button
                    onClick={handlePrintPDF}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer flex items-center justify-center space-x-1.5 h-[38px] animate-fadeIn"
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
        <div className="bg-rose-50 border border-rose-100/80 text-rose-700 p-4 rounded-[3px] text-xs font-semibold flex items-start space-x-2.5 animate-fadeIn mb-1">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[13px] text-rose-800">Validation Error</p>
            <p className="text-rose-600/90 mt-0.5 font-medium">Please fill in all required fields highlighted in red below before proceeding.</p>
          </div>
        </div>
      )}

      {/* Main Core Bill Form Container */}
      <div id="printable-area" className="bg-white rounded-[3px] border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">
        
        {/* Form Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Supplier select */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Supplier</label>
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
              createNewLabel="Add new supplier"
              className={`w-full bg-white text-slate-800 border rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition cursor-pointer ${
                errors.contact ? 'border-rose-500 focus:border-rose-500 bg-rose-50/10' : 'border-slate-200 focus:border-[#0F5B38]'
              }`}
            />
            {errors.contact && (
              <span className="text-rose-500 text-[11px] font-semibold block mt-1">{errors.contact}</span>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="billDateInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Bill Date</label>
            <XeroDatePicker
              id="billDateInput"
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
            <label htmlFor="billDueDateInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Due Date</label>
            <XeroDatePicker
              id="billDueDateInput"
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
          {/* Bill Number Input */}
          <div className="space-y-1.5">
            <label htmlFor="billNumberInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Bill Number</label>
            <input
              id="billNumberInput"
              type="text"
              value={billNumber}
              readOnly={isReadOnly}
              onChange={e => {
                setBillNumber(e.target.value)
                if (e.target.value.trim()) {
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.billNumber
                    return next
                  })
                }
              }}
              className={`w-full bg-white text-slate-800 border rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition ${
                errors.billNumber ? 'border-rose-500 focus:border-rose-500 bg-rose-50/10' : 'border-slate-200 focus:border-[#0F5B38]'
              } ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}`}
            />
            {errors.billNumber && (
              <span className="text-rose-500 text-[11px] font-semibold block mt-1">{errors.billNumber}</span>
            )}
          </div>

          {/* Reference / PO */}
          <div className="space-y-1.5">
            <label htmlFor="poRefInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Reference / PO</label>
            <input
              id="poRefInput"
              type="text"
              placeholder="e.g. PO-1022"
              value={reference}
              readOnly={isReadOnly}
              onChange={e => setReference(e.target.value)}
              className={`w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition ${
                isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
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
              className={`w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer h-[38px] ${
                isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''
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
                  <th className="p-2 border border-slate-200 w-[15%]">Account</th>
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
                        className={`w-full bg-transparent text-slate-800 border border-transparent rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10' : 'focus:border-[#0F5B38]'}`}
                      />
                    </td>

                    {/* Account Searchable Select */}
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
                        disabled={isReadOnly || taxType === 'No Tax'}
                        onChange={(val) => updateLineField(idx, 'taxRateId', val)}
                        placeholder=""
                        className="w-full bg-transparent text-slate-800 border border-transparent rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="px-2.5 py-2.5 border border-slate-200 align-middle text-right font-normal text-slate-800 text-[12px]">
                      {currencySymbol}{(Number(line.quantity || 0) * Number(line.unitPrice || 0) * (1 - (Number(line.discount) || 0) / 100)).toFixed(2)}
                    </td>

                    {/* Action Trash & Plus */}
                    {!isReadOnly && (
                      <td className="p-0 border border-slate-200 align-middle text-center">
                        <div className="flex items-center justify-center space-x-1.5 px-2">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className={`p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition cursor-pointer inline-flex items-center justify-center ${
                              lines.length === 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : ''
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
                className="flex items-center space-x-1.5 bg-slate-550 hover:bg-slate-100 text-slate-655 font-bold text-[10px] px-4 py-2 border border-slate-200 rounded-[3px] transition cursor-pointer"
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
                placeholder="Add any additional notes, vendor advice, or payment remarks..."
                rows={3}
                className={`w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] transition resize-none placeholder:text-slate-400 ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}`}
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
                  <div className="flex items-center space-x-2 text-xs text-slate-655 bg-slate-50 px-3 py-1.5 rounded-[3px] border border-slate-200 font-semibold">
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

      {/* Inline Modal for Creating a New Supplier */}
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
              <h3 className="text-base font-bold text-slate-850">Add New Supplier</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Quickly create a new vendor supplier contact to assign to this bill.</p>
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
                {isSubmitting ? 'Saving...' : 'Add Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Modal for Creating a New Purchased Item */}
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
              <h3 className="text-base font-bold text-slate-850">Add New Purchased Item</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Quickly create a new product or cost catalog item.</p>
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
                    placeholder="e.g. SERVER-AWS"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Item Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={quickItemName}
                    onChange={e => setQuickItemName(e.target.value)}
                    placeholder="e.g. AWS Virtual Server"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Purchase Unit Cost <span className="text-rose-500">*</span></label>
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
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Expense Account <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={quickItemAccountId}
                    onChange={e => setQuickItemAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[36px]"
                  >
                    <option value="" disabled>Select Account</option>
                    {accounts.filter(a => a.class_type === 'Expense' || a.class_type === 'Asset' || a.type === 'Direct Costs').map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Purchase Tax Rate</label>
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
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Purchase Description</label>
                <textarea
                  value={quickItemDescription}
                  onChange={e => setQuickItemDescription(e.target.value)}
                  placeholder="Describe this item for purchase orders and vendor bills..."
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
              <h3 className="text-base font-bold text-slate-850">Record Bill Payment</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed font-normal">
                Log the payment outflow for Bill {billNumber} and adjust bank balances.
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
                      setSinglePaymentAmount(grandTotal.toFixed(2))
                    }}
                    className={`flex-1 text-center py-2 text-xs font-semibold transition ${
                      !isSplitPayment
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
                      setPaymentRows([{ accountId: bankAccounts[0]?.id || '', amount: grandTotal }])
                    }}
                    className={`flex-1 text-center py-2 text-xs font-semibold transition ${
                      isSplitPayment
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
                    <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Bank Account</label>
                    <select
                      value={singlePaymentAccountId}
                      onChange={e => setSinglePaymentAccountId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[36px] cursor-pointer text-slate-800"
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
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Split Distribution</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1.5 font-normal text-xs text-slate-700">
                    {paymentRows.map((row, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <select
                          value={row.accountId}
                          onChange={e => updatePaymentRow(idx, 'accountId', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-[3px] px-3 py-1.5 text-xs font-normal focus:outline-none focus:border-[#0F5B38] h-[34px] cursor-pointer text-slate-800"
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
                          className="p-1.5 text-slate-455 hover:text-rose-600 disabled:opacity-30 transition cursor-pointer"
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
        documentType="Bill"
        documentNumber={billNumber}
        contactName={contacts.find(c => c.id === selectedContactId)?.name || ''}
        totalAmount={`${currency} ${getGrandTotal().toFixed(2)}`}
        orgName={activeOrg.name}
        onSend={async (to, subject, message) => {
          let resolvedId = editingBillId
          const needsApproval = status === 'Draft' || status === 'Awaiting Approval'

          if (needsApproval) {
            resolvedId = await handleSaveBill('Awaiting Payment', false, true)
            if (!resolvedId) {
              throw new Error('Failed to save and approve bill.')
            }
          }

          // Construct full payload for the backend to render the PDF on the fly
          const logo = localStorage.getItem(`kdm_org_logo_${activeOrg.id}`) || ''
          const bankDetails = JSON.parse(localStorage.getItem(`kdm_bank_details_${activeOrg.id}`) || '{}')
          const templateSettings = JSON.parse(
            localStorage.getItem(`kdm_purchase_template_settings_${activeOrg.id}`) || 
            localStorage.getItem(`kdm_sales_template_settings_${activeOrg.id}`) || 
            '{}'
          )
          const orgDetails = JSON.parse(localStorage.getItem(`kdm_org_extensions_${activeOrg.id}`) || '{}')
          
          const supplierObj = contacts.find(c => c.id === selectedContactId)
          const projectObj = projects.find(p => p.id === selectedProjectId)
          
          const savedPurchases = localStorage.getItem(`kdm_purchase_settings_${activeOrg.id}`) || 
                                 localStorage.getItem(`kdm_mock_purchase_settings_${activeOrg.id}`)
          let supplierTerms = '30 days'
          if (savedPurchases) {
            const parsed = JSON.parse(savedPurchases)
            supplierTerms = parsed.supplier_terms || '30 days'
          }

          const postLines = lines.map(l => {
            const itemObj = catalogItems.find(i => i.id === l.itemId)
            const taxObj = taxRates.find(t => t.id === l.taxRateId)
            return {
              item_code: itemObj ? itemObj.code : '',
              item_name: itemObj ? itemObj.name : '',
              description: l.description,
              quantity: Number(l.quantity) || 0,
              unit_price: Number(l.unitPrice) || 0,
              discount: Number(l.discount) || 0,
              tax_rate_name: taxObj ? taxObj.name : '',
              total: (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discount) || 0) / 100)
            }
          })

          const payload = {
            to,
            subject,
            message,
            bill_number: billNumber,
            reference: reference,
            date: date,
            due_date: dueDate,
            currency: currency,
            tax_type: taxType,
            project_name: projectObj ? projectObj.name : '',
            contact_name: supplierObj ? supplierObj.name : 'Vendor Supplier',
            contact_email: supplierObj ? supplierObj.email : '',
            contact_phone: supplierObj ? supplierObj.phone : '',
            contact_address: supplierObj ? supplierObj.billing_address : '',
            lines: postLines,
            subtotal: getSubtotal(),
            tax_total: getTaxTotal(),
            total: getGrandTotal(),
            notes: notes,
            logo: logo,
            bank_details: bankDetails,
            template_settings: templateSettings,
            org_details: orgDetails,
            payment_terms: supplierTerms,
            org_name: activeOrg.name,
            org_tax_id: activeOrg.tax_id,
            org_country: activeOrg.country
          }

          await apiService.sendBillEmail(payload)
          showAlert({
            title: needsApproval ? 'Approved & Emailed' : 'Email Sent',
            message: needsApproval 
              ? `Bill ${billNumber} was successfully approved and emailed to ${to}.`
              : `Bill ${billNumber} was successfully emailed to ${to}.`,
            type: 'success'
          })
          if (setEditingBillId) setEditingBillId(null)
          setActiveTab('Bills')
        }}
      />
    </div>
  )
}
