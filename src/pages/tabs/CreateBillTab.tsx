import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle, Save, X, Loader2, ChevronDown, MoreVertical } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Contact, Item, Account, TaxRate, Project } from '../../services/api'
import { SearchableInput } from '../../components/SearchableInput'
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

  // Form Fields
  const [selectedContactId, setSelectedContactId] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'Draft' | 'Awaiting Payment' | 'Paid'>('Draft')
  const [currency, setCurrency] = useState(activeOrg.currency || 'USD')
  const [taxType, setTaxType] = useState<'Inclusive' | 'Exclusive'>('Exclusive')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

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
        // STANDARD EDIT MODE: Load existing bill details from LocalStorage (Bills are stored in localStorage workspace)
        const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`)
        const list = savedBills ? JSON.parse(savedBills) : []
        const targetBill = list.find((b: any) => b.bill_number === editingBillId || b.id === editingBillId) || null

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
    const targetItem = catalogItems.find(i => i.id === itemId)
    if (!targetItem) return

    const updated = [...lines]
    updated[index].itemId = itemId
    updated[index].description = targetItem.purchase_description || targetItem.name
    updated[index].unitPrice = Number(targetItem.purchase_unit_cost)

    if (targetItem.purchase_account) updated[index].accountId = targetItem.purchase_account
    if (targetItem.purchase_tax_rate) updated[index].taxRateId = targetItem.purchase_tax_rate

    setLines(updated)

    // Clear validation error on change
    setLineErrors(prev => {
      const next = { ...prev }
      if (next[index]) {
        const nextRow = { ...next[index] }
        delete nextRow.itemId
        delete nextRow.accountId
        delete nextRow.quantity
        delete nextRow.unitPrice
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

  const updateLineField = (index: number, field: keyof LineFormItem, value: any) => {
    const updated = [...lines]
    updated[index] = {
      ...updated[index],
      [field]: value
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
    const defaultAcc = accounts.find(a => a.class_type === 'Expense' || a.type === 'Direct Costs')?.id || accounts[0]?.id || ''
    const defaultTax = taxRates[0]?.id || ''
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

  // Save / Update bill (Always saves to LocalStorage cleanly to support online/offline gracefully!)
  const handleSaveBill = async (statusUpdate?: 'Draft' | 'Awaiting Payment' | 'Paid') => {
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
      const q = Number(l.quantity) || 0
      const rowErr: Record<string, boolean> = {}
      let rowHasErr = false

      if (q <= 0 || l.quantity === '') {
        rowErr.quantity = true
        rowHasErr = true
        hasValidationErrors = true
      }
      if (!l.accountId) {
        rowErr.accountId = true
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
      showAlert({ 
        title: 'Validation Error', 
        message: 'Please fill in all required fields highlighted in red before proceeding.', 
        type: 'warning' 
      })
      return
    }

    // Clear errors if valid
    setErrors({})
    setLineErrors({})
    setIsSubmitting(true)

    const postLines = lines.map(l => {
      const q = Number(l.quantity) || 0
      const u = Number(l.unitPrice) || 0
      const d = Number(l.discount) || 0
      const lineTotal = q * u * (1 - d / 100)
      return {
        item: l.itemId ? l.itemId : null,
        description: l.description,
        quantity: q,
        unit_price: u,
        discount: d,
        account: l.accountId,
        tax_rate: l.taxRateId ? l.taxRateId : null,
        total: lineTotal
      }
    })

    const finalStatus = statusUpdate || status
    const resolvedBillId = editingBillId || `mock-bill-${Date.now()}`
    const payload = {
      id: resolvedBillId,
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
      const isEdit = editingBillId ? true : false
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
      localStorage.setItem(`kdm_bill_notes_${payload.id}`, notes)
      localStorage.setItem(`kdm_bill_attachment_${payload.id}`, attachmentName)
      
      showAlert({ title: isEdit ? 'Bill Updated' : 'Bill Created', message: `Bill ${billNumber} has been saved successfully.`, type: 'success' })
      if (setEditingBillId) setEditingBillId(null)
      setActiveTab('Bills')
    } catch (err: any) {
      showAlert({ title: 'Save Error', message: "An error occurred while saving the bill: " + (err.message || "Please check if details are correct."), type: 'error' })
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
      const url = `http://localhost:8000/api/bills/download-pdf/?_t=${Date.now()}`
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
      const resolvedId = editingBillId
      const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`)
      const list = savedBills ? JSON.parse(savedBills) : []
      const updatedList = list.filter((b: any) => b.id !== resolvedId && b.bill_number !== editingBillId)
      localStorage.setItem(`kdm_mock_bills_${activeOrg.id}`, JSON.stringify(updatedList))
      
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
      setStatus(newStatus)
      setIsMoreDropdownOpen(false)
    } catch (err: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update status: " + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
      setIsMoreDropdownOpen(false)
    }
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

  const accountOptions = accounts.filter(a => a.class_type === 'Expense' || a.class_type === 'Asset' || a.type === 'Direct Costs').map(a => ({
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
                status === 'Awaiting Payment' ? 'bg-amber-50 text-amber-600 border-amber-100/30' :
                'bg-slate-100 text-slate-500 border-slate-200/50'
              }`}>
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap sm:justify-end gap-2">
          {editingBillId ? (
            <>
              <button
                onClick={() => {
                  if (setEditingBillId) setEditingBillId(null)
                  setActiveTab('Bills')
                }}
                className="bg-white hover:bg-slate-50 text-slate-555 border border-slate-200 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center"
              >
                Cancel
              </button>

              <button
                onClick={handlePrintPDF}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center space-x-1.5"
              >
                Save PDF
              </button>

              {status === 'Draft' && (
                <button
                  onClick={() => handleUpdateStatusOnTheSpot('Awaiting Payment')}
                  disabled={isSubmitting}
                  className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
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
              )}

              {status === 'Awaiting Payment' && (
                <button
                  onClick={() => handleUpdateStatusOnTheSpot('Paid')}
                  disabled={isSubmitting}
                  className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Marking Paid...</span>
                    </>
                  ) : (
                    <span>Mark as Paid</span>
                  )}
                </button>
              )}

              {/* Three Vertical Dots Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  className="flex items-center justify-center bg-white hover:bg-slate-550 text-slate-555 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 w-[38px] h-[38px] rounded-[3px] transition duration-200 cursor-pointer shadow-sm"
                  title="More actions"
                >
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
                {isMoreDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-750">
                      <div className="py-1 space-y-0.5">
                        {status === 'Draft' && (
                          <>
                            <button
                              onClick={() => {
                                handleUpdateStatusOnTheSpot('Awaiting Payment')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                handleSaveBill('Draft')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Save as Draft
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
                          </>
                        )}

                        {status === 'Awaiting Payment' && (
                          <>
                            <button
                              onClick={() => {
                                handleUpdateStatusOnTheSpot('Draft')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Revert to Draft
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
                          </>
                        )}

                        {status === 'Paid' && (
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
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Creating new bill actions */}
              <button
                onClick={() => {
                  if (setEditingBillId) setEditingBillId(null)
                  setActiveTab('Bills')
                }}
                className="bg-white hover:bg-slate-50 text-slate-555 border border-slate-200 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveBill('Draft')}
                disabled={isSubmitting}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-400"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSaveBill('Awaiting Payment')}
                disabled={isSubmitting}
                className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Submit for Approval</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-655 p-4 rounded-[3px] text-xs font-semibold">
          {errorMsg}
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
              }`}
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
              onChange={e => setReference(e.target.value)}
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition"
            />
          </div>

          {/* Currency searchable input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Currency</label>
            <SearchableInput
              options={currenciesList}
              value={currency}
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
              onChange={e => setTaxType(e.target.value as 'Inclusive' | 'Exclusive')}
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer h-[38px]"
            >
              <option value="Exclusive">Tax Exclusive</option>
              <option value="Inclusive">Tax Inclusive</option>
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
                onChange={setSelectedProjectId}
                placeholder="Search projects..."
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
              />
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
                  <th className="p-2 border border-slate-200 w-[15%]">Expense Account</th>
                  <th className="p-2 border border-slate-200 w-[12%]">Tax Rate</th>
                  <th className="p-2 border border-slate-200 text-right w-[10%]">Amount</th>
                  <th className="p-2 border border-slate-200 text-center w-[3%]"></th>
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
                        onChange={e => updateLineField(idx, 'description', e.target.value)}
                        className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0"
                      />
                    </td>

                    {/* Qty */}
                    <td className={`p-0 border border-slate-200 align-middle ${lineErrors[idx]?.quantity ? 'bg-rose-50/30' : ''}`}>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={e => updateLineField(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none focus:ring-0 ${
                          lineErrors[idx]?.quantity ? 'text-rose-700 font-semibold bg-rose-100/20' : ''
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
                        onChange={e => updateLineField(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal text-right focus:outline-none focus:ring-0"
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
                        onChange={e => updateLineField(idx, 'discount', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none focus:ring-0"
                      />
                    </td>

                    {/* Account Searchable Select */}
                    <td className={`p-0 border border-slate-200 align-middle ${lineErrors[idx]?.accountId ? 'bg-rose-50/30' : ''}`}>
                      <SearchableInput
                        options={accountOptions}
                        value={line.accountId}
                        onChange={(val) => updateLineField(idx, 'accountId', val)}
                        placeholder=""
                        className={`w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 cursor-pointer ${
                          lineErrors[idx]?.accountId ? 'text-rose-700 font-semibold bg-rose-100/20' : ''
                        }`}
                      />
                    </td>

                    {/* Tax Rate Searchable Select */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <SearchableInput
                        options={taxOptions}
                        value={line.taxRateId}
                        onChange={(val) => updateLineField(idx, 'taxRateId', val)}
                        placeholder=""
                        className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="px-2.5 py-2.5 border border-slate-200 align-middle text-right font-normal text-slate-800 text-[12px]">
                      {currencySymbol}{(Number(line.quantity || 0) * Number(line.unitPrice || 0) * (1 - (Number(line.discount) || 0) / 100)).toFixed(2)}
                    </td>

                    {/* Action Trash & Plus */}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Line Control Button */}
          <div className="pt-2">
            <button
              onClick={addLineItem}
              className="flex items-center space-x-1.5 bg-slate-550 hover:bg-slate-100 text-slate-655 font-bold text-[10px] px-4 py-2 border border-slate-200 rounded-[3px] transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#0F5B38]" />
              <span>Add row</span>
            </button>
          </div>
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
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any additional notes, vendor advice, or payment remarks..."
                rows={3}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] transition resize-none placeholder:text-slate-400"
              />
            </div>

            {/* File Attachment Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Attachments (Optional)</label>
              <div className="flex items-center space-x-3">
                <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-[3px] transition cursor-pointer select-none">
                  <span>Choose File</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {attachmentName ? (
                  <div className="flex items-center space-x-2 text-xs text-slate-655 bg-slate-50 px-3 py-1.5 rounded-[3px] border border-slate-200 font-semibold font-normal">
                    <span className="truncate max-w-[200px] font-semibold">{attachmentName}</span>
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

    </div>
  )
}
