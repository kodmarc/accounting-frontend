import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle, Save, X, Loader2, ChevronDown, MoreVertical, AlertCircle } from 'lucide-react'
import { apiService, API_BASE_URL } from '../../services/api'
import type { Organization, Contact, Item, Account, TaxRate, Project } from '../../services/api'
import { SearchableInput } from '../../components/SearchableInput'
import { EmailModal } from '../../components/EmailModal'
import { usePopup } from '../../components/PopupProvider'
import { XeroDatePicker } from '../../components/XeroDatePicker'

interface CreatePurchaseOrderTabProps {
  activeOrg: Organization
  isMockMode?: boolean
  setActiveTab: (tab: any) => void
  editingPoId?: string | null
  setEditingPoId?: (id: string | null) => void
  setEditingBillId?: (id: string | null) => void
}

export function CreatePurchaseOrderTab({
  activeOrg,
  isMockMode = false,
  setActiveTab,
  editingPoId = null,
  setEditingPoId,
  setEditingBillId
}: CreatePurchaseOrderTabProps) {
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
  const [poNumber, setPoNumber] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate] = useState('')
  const [status, setStatus] = useState<'Draft' | 'Awaiting Approval' | 'Approved' | 'Billed' | 'Declined'>('Draft')
  const [isApproveDropdownOpen, setIsApproveDropdownOpen] = useState(false)
  const isReadOnly = status === 'Billed'
  const [currency, setCurrency] = useState(activeOrg.currency || 'USD')
  const [taxType, setTaxType] = useState<'Inclusive' | 'Exclusive' | 'No Tax'>('Exclusive')
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
  const [quickItemPrice, setQuickItemPrice] = useState('0.00')
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

  // Load all master data
  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let loadedContacts: Contact[] = []
      let loadedAccounts: Account[] = []
      let loadedTaxRates: TaxRate[] = []
      let loadedCatalog: Item[] = []
      let loadedProjects: Project[] = []

      // API fetches
      try {
        const [contactList, itemList, accList, taxList, projectList] = await Promise.all([
          apiService.getContacts(activeOrg.id),
          apiService.getItems(activeOrg.id),
          apiService.getAccounts(activeOrg.id),
          apiService.getTaxRates(activeOrg.id),
          apiService.getProjects ? apiService.getProjects(activeOrg.id) : Promise.resolve([])
        ])
        loadedContacts = contactList.filter(c => c.contact_type === 'Supplier' || c.contact_type === 'Both')
        loadedAccounts = accList
        loadedTaxRates = taxList
        loadedCatalog = itemList.filter(i => i.is_purchased)
        loadedProjects = projectList
      } catch (err) {
        // Fallbacks
        loadedContacts = [
          { id: 'mock-s-1', name: 'Alibaba Cloud SG', email: 'billing@alibaba.com', phone: '+65 6729 0122', tax_number: 'VAT-9021', billing_address: '8 Shenton Way, Singapore 068811', default_sales_account: null, default_purchase_account: null, contact_type: 'Supplier', created_at: '' },
          { id: 'mock-s-2', name: 'Saad Software Designs', email: 'saad@softwaredesigns.com', phone: '+92 300 1234567', tax_number: 'NTN-49102', billing_address: 'Lahore, Pakistan', default_sales_account: null, default_purchase_account: null, contact_type: 'Supplier', created_at: '' }
        ]
        loadedAccounts = [
          { id: 'mock-a-1', code: '300', name: 'Cost of Goods Sold', class_type: 'Expense', type: 'Direct Costs', default_tax_rate: null, description: 'Inventory cost allocations', is_system_account: false, created_at: '' },
          { id: 'mock-a-2', code: '400', name: 'Software Licensing', class_type: 'Expense', type: 'Expense', default_tax_rate: null, description: 'SaaS subscriptions', is_system_account: false, created_at: '' }
        ]
        loadedTaxRates = [
          { id: 'mock-t-1', name: 'SG GST 9%', rate: 9.0, is_active: true, created_at: new Date().toISOString() },
          { id: 'mock-t-2', name: 'Tax Exempt', rate: 0.0, is_active: true, created_at: new Date().toISOString() }
        ]
        loadedCatalog = [
          { id: 'mock-i-1', code: 'CLOUD-LIC', name: 'Cloud Hosting Monthly Server', is_sold: false, sales_unit_price: 0, sales_account: null, sales_tax_rate: null, sales_description: '', is_purchased: true, purchase_unit_cost: 150.00, purchase_account: 'mock-a-2', purchase_tax_rate: 'mock-t-1', purchase_description: 'Monthly cloud virtual machine container resource allocations', created_at: '' }
        ]
        loadedProjects = [
          { id: 'mock-p-1', name: 'Internal Operations', code: 'INT-OPS' },
          { id: 'mock-p-2', name: 'Corporate Expansion', code: 'CORP-EXP' },
          { id: 'mock-p-3', name: 'Client Consultation', code: 'CLIENT-CONS' }
        ]
      }

      setContacts(loadedContacts)
      setAccounts(loadedAccounts)
      setTaxRates(loadedTaxRates)
      setCatalogItems(loadedCatalog)
      setProjects(loadedProjects)

      const firstAcc = loadedAccounts.find(a => a.class_type === 'Expense' || a.type === 'Direct Costs')?.id || loadedAccounts[0]?.id || ''
      const firstTax = loadedTaxRates[0]?.id || ''

      // Load specific PO for editing if set
      const savedPurchases = localStorage.getItem(`kdm_purchase_settings_${activeOrg.id}`) ||
        localStorage.getItem(`kdm_mock_purchase_settings_${activeOrg.id}`)
      let loadedPurchaseSetting = {
        po_prefix: 'PO-',
        next_po_number: 1001,
        supplier_terms: '30 days',
        purchase_footer: 'Please submit all vendor bills via email.'
      }
      if (savedPurchases) {
        const parsed = JSON.parse(savedPurchases)
        loadedPurchaseSetting = {
          po_prefix: parsed.po_prefix || 'PO-',
          next_po_number: Number(parsed.next_po_number) || 1001,
          supplier_terms: parsed.supplier_terms || '30 days',
          purchase_footer: parsed.purchase_footer || 'Please submit all vendor bills via email.'
        }
      }

      if (editingPoId) {
        const savedPOs = localStorage.getItem(`kdm_mock_purchase_orders_${activeOrg.id}`)
        const list = savedPOs ? JSON.parse(savedPOs) : []
        const po = list.find((p: any) => p.po_number === editingPoId || p.id === editingPoId)
        if (po) {
          setSelectedContactId(po.contact)
          setPoNumber(po.po_number)
          setReference(po.reference || '')
          setDate(po.date)
          setExpiryDate(po.expiry_date)
          setStatus(po.status)
          setCurrency(po.currency)
          setTaxType(po.tax_type || 'Exclusive')
          setSelectedProjectId(po.project || '')

          const savedNotes = localStorage.getItem(`kdm_po_notes_${po.id}`)
          if (savedNotes) setNotes(savedNotes)
          else setNotes(po.notes || '')

          const savedAttachment = localStorage.getItem(`kdm_po_attachment_${po.id}`)
          if (savedAttachment) setAttachmentName(savedAttachment)

          setLines(po.lines.map((l: any, idx: number) => ({
            id: String(idx + 1),
            itemId: l.item || '',
            description: l.description || '',
            quantity: Number(l.quantity),
            unitPrice: Number(l.unit_price),
            discount: Number(l.discount || 0),
            accountId: l.account || firstAcc,
            taxRateId: l.tax_rate || firstTax
          })))
        }
      } else {
        const prefix = loadedPurchaseSetting.po_prefix
        const nextNum = String(loadedPurchaseSetting.next_po_number).padStart(4, '0')
        setPoNumber(`${prefix}${nextNum}`)

        const today = new Date()
        today.setDate(today.getDate() + 15) // default 15 days expiry
        setExpiryDate(today.toISOString().split('T')[0])

        setLines([{ id: '1', itemId: '', description: '', quantity: '', unitPrice: '', discount: '', accountId: firstAcc, taxRateId: firstTax }])
        setNotes(loadedPurchaseSetting.purchase_footer || '')

        if (loadedContacts.length > 0) {
          setSelectedContactId(loadedContacts[0].id)
        }
      }

    } catch (e: any) {
      console.warn("Failed to load PO suite", e)
      setErrorMsg("Failed to synchronize ledger.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id, editingPoId])

  // Catalog Item Selection
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

  // Row line updates
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
        return sum + (lineTotal - lineTax)
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
        return sum + (q * u * (1 - d / 100))
      }, 0)
    } else {
      return getSubtotal() + getTaxTotal()
    }
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

      // Reset form
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

      // Reset form
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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    setIsSubmitting(true)
    try {
      const code = newProjectCode.trim().toUpperCase() || `PRJ-${Date.now().toString().slice(-4)}`
      const newProj = {
        id: `mock-p-${Date.now()}`,
        name: newProjectName.trim(),
        code
      }

      const saved = localStorage.getItem(`kdm_mock_projects_${activeOrg.id}`)
      const list = saved ? JSON.parse(saved) : []
      const updated = [newProj, ...list]
      localStorage.setItem(`kdm_mock_projects_${activeOrg.id}`, JSON.stringify(updated))
      setProjects(updated)
      setSelectedProjectId(newProj.id)
      setIsCreateProjectOpen(false)

      setNewProjectName('')
      setNewProjectCode('')
      showAlert({ title: 'Success', message: 'Project created successfully.', type: 'success' })
    } catch (err: any) {
      showAlert({ title: 'Error', message: 'Failed to create project.', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setAttachmentName(file.name)
      setAttachmentFile(file)
    }
  }

  const validateForm = (): boolean => {
    const formErrors: Record<string, string> = {}
    const rowErrors: Record<number, Record<string, boolean>> = {}
    let hasValidationErrors = false

    if (!selectedContactId) {
      formErrors.contact = 'Supplier/Vendor is required.'
      hasValidationErrors = true
    }
    if (!date) {
      formErrors.date = 'Date is required.'
      hasValidationErrors = true
    }
    if (!expiryDate) {
      formErrors.expiryDate = 'Delivery date is required.'
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

  // Save / Approve PO
  const handleSavePO = async (
    targetStatus?: 'Draft' | 'Awaiting Approval' | 'Approved' | 'Billed' | 'Declined',
    isEmailing: boolean = false,
    silent: boolean = false
  ): Promise<string | null> => {
    if (!validateForm()) {
      return null
    }
    setIsSubmitting(true)

    try {
      const savedPOs = localStorage.getItem(`kdm_mock_purchase_orders_${activeOrg.id}`)
      let list = savedPOs ? JSON.parse(savedPOs) : []

      const contactObj = contacts.find(c => c.id === selectedContactId)
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
          item: l.itemId || null,
          description: l.description,
          quantity: q,
          unit_price: u,
          discount: d,
          account: l.accountId || fallbackAcc,
          tax_rate: l.taxRateId || fallbackTax,
          total: lineTotal
        }
      })

      const finalStatus = targetStatus || status
      const payload = {
        id: editingPoId || `mock-po-${Date.now()}`,
        contact: selectedContactId,
        contact_name: contactObj ? contactObj.name : 'Vendor Supplier',
        po_number: poNumber,
        reference,
        date,
        expiry_date: expiryDate,
        status: finalStatus,
        currency,
        tax_type: taxType,
        project: selectedProjectId || null,
        subtotal: getSubtotal(),
        tax_total: getTaxTotal(),
        total: getGrandTotal(),
        lines: postLines,
        notes,
        created_at: new Date().toISOString()
      }

      if (editingPoId) {
        list = list.map((p: any) => p.id === editingPoId || p.po_number === editingPoId ? payload : p)
      } else {
        list = [payload, ...list]
        // Auto-increment sequence number in localStorage Purchases Settings upon successful save!
        const savedPurchases = localStorage.getItem(`kdm_purchase_settings_${activeOrg.id}`) ||
          localStorage.getItem(`kdm_mock_purchase_settings_${activeOrg.id}`)
        if (savedPurchases) {
          const parsed = JSON.parse(savedPurchases)
          parsed.next_po_number = (Number(parsed.next_po_number) || 1001) + 1
          localStorage.setItem(`kdm_purchase_settings_${activeOrg.id}`, JSON.stringify(parsed))
          localStorage.setItem(`kdm_mock_purchase_settings_${activeOrg.id}`, JSON.stringify(parsed))
        }
      }

      localStorage.setItem(`kdm_mock_purchase_orders_${activeOrg.id}`, JSON.stringify(list))
      localStorage.setItem(`kdm_po_notes_${payload.id}`, notes)
      localStorage.setItem(`kdm_po_attachment_${payload.id}`, attachmentName)

      if (!silent) {
        showAlert({ title: 'Success', message: 'Purchase Order successfully stored in the acquisitions ledger.', type: 'success' })

        if (isEmailing) {
          setIsEmailModalOpen(true)
        } else {
          if (setEditingPoId) setEditingPoId(null)
          setActiveTab('PurchaseOrders')
        }
      }
      return payload.id
    } catch (err: any) {
      showAlert({ title: 'Error', message: 'Failed to save purchase order: ' + err.message, type: 'error' })
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  // Convert Approved PO to Bill on the spot!
  const handleConvertToBillOnTheSpot = async () => {
    if (!editingPoId) return
    setIsSubmitting(true)
    try {
      const savedPOs = localStorage.getItem(`kdm_mock_purchase_orders_${activeOrg.id}`)
      let poList = savedPOs ? JSON.parse(savedPOs) : []

      // Update PO status to Billed
      poList = poList.map((p: any) => {
        if (p.id === editingPoId || p.po_number === editingPoId) {
          return { ...p, status: 'Billed' }
        }
        return p
      })
      localStorage.setItem(`kdm_mock_purchase_orders_${activeOrg.id}`, JSON.stringify(poList))

      // Generate a draft Bill pre-populated with all details
      const activePO = poList.find((p: any) => p.id === editingPoId || p.po_number === editingPoId)
      if (activePO) {
        const savedBills = localStorage.getItem(`kdm_mock_bills_${activeOrg.id}`)
        let billList = savedBills ? JSON.parse(savedBills) : []

        const newBillId = `mock-bill-${Date.now()}`
        const nextNum = billList.length + 1001

        const newBill = {
          id: newBillId,
          contact: activePO.contact,
          contact_name: activePO.contact_name,
          bill_number: `BIL-${nextNum}`,
          reference: `PO Reference: ${activePO.po_number}`,
          date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Draft',
          currency: activePO.currency,
          tax_type: activePO.tax_type,
          project: activePO.project,
          subtotal: activePO.subtotal,
          tax_total: activePO.tax_total,
          total: activePO.total,
          lines: activePO.lines,
          notes: `Created from Purchase Order ${activePO.po_number}. ${activePO.notes || ''}`,
          created_at: new Date().toISOString()
        }

        billList = [newBill, ...billList]
        localStorage.setItem(`kdm_mock_bills_${activeOrg.id}`, JSON.stringify(billList))

        if (setEditingBillId) {
          setEditingBillId(newBillId)
        }
      }

      if (setEditingPoId) setEditingPoId(null)
      setActiveTab('CreateBill')
      showAlert({ title: 'Success', message: 'Purchase Order successfully billed! Pre-populated vendor bill has been drafted.', type: 'success' })
    } catch (err: any) {
      showAlert({ title: 'Conversion Failed', message: err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete PO
  const handleDeletePO = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Purchase Order',
      message: 'Are you sure you want to delete this draft purchase order? This action cannot be undone.',
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      const savedPOs = localStorage.getItem(`kdm_mock_purchase_orders_${activeOrg.id}`)
      let list = savedPOs ? JSON.parse(savedPOs) : []
      list = list.filter((p: any) => p.id !== editingPoId && p.po_number !== editingPoId)
      localStorage.setItem(`kdm_mock_purchase_orders_${activeOrg.id}`, JSON.stringify(list))

      if (setEditingPoId) setEditingPoId(null)
      setActiveTab('PurchaseOrders')
    } catch (err: any) {
      showAlert({ title: 'Delete Failed', message: err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update PO status instantly on the spot
  const handleUpdateStatusOnTheSpot = async (newStatus: 'Draft' | 'Awaiting Approval' | 'Approved' | 'Billed' | 'Declined') => {
    if (!editingPoId) return
    setIsSubmitting(true)
    try {
      const savedPOs = localStorage.getItem(`kdm_mock_purchase_orders_${activeOrg.id}`)
      const list = savedPOs ? JSON.parse(savedPOs) : []
      const updatedList = list.map((p: any) => {
        if (p.id === editingPoId || p.po_number === editingPoId) {
          return { ...p, status: newStatus }
        }
        return p
      })
      localStorage.setItem(`kdm_mock_purchase_orders_${activeOrg.id}`, JSON.stringify(updatedList))
      setStatus(newStatus)
      setIsMoreDropdownOpen(false)
      showAlert({ title: 'Success', message: `Purchase order status updated to ${newStatus}.`, type: 'success' })
    } catch (err: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update status: " + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Print PDF Mockup Sheet using Django backend PDF engine
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
      const url = `${API_BASE_URL}/purchase-orders/download-pdf/?_t=${Date.now()}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          po_number: poNumber,
          reference: reference,
          date: date,
          expiry_date: expiryDate,
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
      a.download = `PurchaseOrder_${poNumber || 'PO'}.pdf`
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

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'PKR': return '₨'
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      case 'AUD': return 'A$'
      case 'SGD': return 'S$'
      default: return '$'
    }
  }

  const currencySymbol = getCurrencySymbol(currency)

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
    { value: 'SGD', label: 'SGD (S$)' },
    { value: 'PKR', label: 'PKR (₨)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'AUD', label: 'AUD (A$)' }
  ]

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
                  handleSavePO('Approved')
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="flex space-x-2 justify-center items-center">
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce"></div>
        </div>
        <p className="text-slate-500 text-xs font-semibold tracking-wider">Loading purchase order data...</p>
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
                Applying PO branding layouts, supplier tax specifications, and catalog details...
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
              if (setEditingPoId) setEditingPoId(null)
              setActiveTab('PurchaseOrders')
            }}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[3px] transition duration-200 cursor-pointer"
            title="Return to purchase orders"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <span className="text-[10px] text-slate-400 font-normal uppercase tracking-widest block">Acquisitions Pipeline</span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {editingPoId ? `Purchase Order: ${poNumber}` : 'Create new purchase order'}
            </h2>
            {editingPoId && (
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 border ${status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/30' :
                  status === 'Billed' ? 'bg-indigo-50 text-indigo-600 border-indigo-100/30' :
                    status === 'Declined' ? 'bg-rose-50 text-rose-600 border-rose-100/30' :
                      'bg-slate-100 text-slate-500 border-slate-200/50'
                }`}>
                {status}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2.5 flex-wrap sm:justify-end gap-2">
          {/* Always display Cancel button */}
          <button
            onClick={() => {
              if (setEditingPoId) setEditingPoId(null)
              setActiveTab('PurchaseOrders')
            }}
            className="bg-white hover:bg-slate-50 text-slate-555 border border-slate-200 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center"
          >
            Cancel
          </button>

          {!editingPoId ? (
            /* NEW PO MODE */
            <>
              <button
                onClick={() => handleSavePO('Draft')}
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
                            handleSavePO('Awaiting Approval')
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
                              message: 'Please save the purchase order as a Draft or Approve it first before downloading PDF.',
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
            /* EDITING PO MODE */
            <>
              {/* Draft PO */}
              {status === 'Draft' && (
                <>
                  <button
                    onClick={() => handleSavePO('Draft')}
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
                                handleSavePO('Awaiting Approval')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Submit for Approval
                            </button>
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
                                handleDeletePO()
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

              {/* Awaiting Approval PO */}
              {status === 'Awaiting Approval' && (
                <>
                  <button
                    onClick={() => handleSavePO('Awaiting Approval')}
                    disabled={isSubmitting}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    Save
                  </button>

                  {renderApproveAndEmailButton()}

                  <div className="relative">
                    <button
                      onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                      className="flex items-center justify-center bg-white hover:bg-slate-50 text-slate-550 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 w-[38px] h-[38px] rounded-[3px] transition duration-200 cursor-pointer shadow-sm"
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
                              Save PDF
                            </button>
                            <button
                              onClick={() => {
                                handleDeletePO()
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

              {/* Approved PO */}
              {status === 'Approved' && (
                <>
                  <button
                    onClick={handlePrintPDF}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center space-x-1.5"
                  >
                    Save PDF
                  </button>

                  <button
                    onClick={handleConvertToBillOnTheSpot}
                    disabled={isSubmitting}
                    className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Billing...</span>
                      </>
                    ) : (
                      <span>Create Invoice</span>
                    )}
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
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700">
                          <div className="py-1 space-y-0.5">
                            <button
                              onClick={() => {
                                setIsEmailModalOpen(true)
                                setIsMoreDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => handleUpdateStatusOnTheSpot('Draft')}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Unmark as Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatusOnTheSpot('Billed')}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Mark as Billed
                            </button>
                            <button
                              onClick={() => {
                                handleDeletePO()
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

              {/* Billed PO */}
              {status === 'Billed' && (
                <>
                  <button
                    onClick={handlePrintPDF}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center space-x-1.5"
                  >
                    Save PDF
                  </button>

                  <button
                    onClick={() => {
                      setIsEmailModalOpen(true)
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-[#0F5B38] font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center"
                  >
                    Email
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                      className="flex items-center justify-center bg-white hover:bg-slate-50 text-slate-550 border border-slate-200 hover:border-slate-300 w-[38px] h-[38px] rounded-[3px] transition duration-200 cursor-pointer shadow-sm"
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
                                handleDeletePO()
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

              {/* Fallback for Declined status */}
              {status === 'Declined' && (
                <>
                  <button
                    onClick={handlePrintPDF}
                    className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center space-x-1.5"
                  >
                    Save PDF
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
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-700">
                          <div className="py-1 space-y-0.5">
                            <button
                              onClick={() => handleUpdateStatusOnTheSpot('Draft')}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Revert to Draft
                            </button>
                            <button
                              onClick={() => {
                                handleDeletePO()
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

      {/* Main PO Form Wrapper */}
      <div id="printable-area" className="bg-white rounded-[3px] border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">

        {/* Form Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Supplier select */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Supplier / Vendor</label>
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
              className={`w-full text-slate-800 border rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white cursor-pointer border-slate-200 focus:border-[#0F5B38]'
                } ${errors.contact ? 'border-rose-500 focus:border-rose-500 bg-rose-50/10' : ''}`}
            />
            {errors.contact && (
              <span className="text-rose-500 text-[11px] font-semibold block mt-1">{errors.contact}</span>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="poDateInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Date</label>
            <XeroDatePicker
              id="poDateInput"
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

          {/* Delivery Date */}
          <div className="space-y-1.5">
            <label htmlFor="poDeliveryInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Delivery Date</label>
            <XeroDatePicker
              id="poDeliveryInput"
              value={expiryDate}
              disabled={isReadOnly}
              onChange={(val) => {
                setExpiryDate(val)
                if (val) {
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.expiryDate
                    return next
                  })
                }
              }}
              className={errors.expiryDate ? 'border-rose-500 focus:border-rose-500 bg-rose-50/10' : ''}
            />
            {errors.expiryDate && (
              <span className="text-rose-500 text-[11px] font-semibold block mt-1">{errors.expiryDate}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Autogenerated PO Serial */}
          <div className="space-y-1.5">
            <label htmlFor="poNumberDisplay" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">PO Serial Reference</label>
            <input
              id="poNumberDisplay"
              type="text"
              readOnly
              value={poNumber}
              className="w-full bg-slate-50 text-slate-500 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none"
            />
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <label htmlFor="referenceInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Reference</label>
            <input
              id="referenceInput"
              type="text"
              placeholder=""
              value={reference}
              readOnly={isReadOnly}
              onChange={e => setReference(e.target.value)}
              className={`w-full text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white focus:border-[#0F5B38]'}`}
            />
          </div>

          {/* Currency searchable input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Currency</label>
            <SearchableInput
              options={currenciesList}
              value={currency}
              onChange={setCurrency}
              disabled={isReadOnly}
              placeholder=""
              className={`w-full text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white cursor-pointer focus:border-[#0F5B38]'}`}
            />
          </div>

          {/* Tax Type dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tax Type</label>
            <select
              value={taxType}
              onChange={e => handleTaxTypeChange(e.target.value as 'Inclusive' | 'Exclusive' | 'No Tax')}
              disabled={isReadOnly}
              className={`w-full text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition h-[38px] ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white cursor-pointer focus:border-[#0F5B38]'}`}
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
                onChange={setSelectedProjectId}
                disabled={isReadOnly}
                placeholder="Search projects..."
                className={`w-full text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none transition ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white cursor-pointer focus:border-[#0F5B38]'}`}
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

        {/* Symmetrical Table Line Items Grid */}
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
                  {!isReadOnly && <th className="p-2 border border-slate-200 text-center w-[3%]"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-normal text-slate-700">
                {lines.map((line, idx) => {
                  const q = line.quantity === '' ? 0 : Number(line.quantity)
                  const u = line.unitPrice === '' ? 0 : Number(line.unitPrice)
                  const d = line.discount === '' ? 0 : Number(line.discount)
                  const lineTotal = q * u * (1 - d / 100)

                  return (
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
                          className={`w-full bg-transparent border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 ${isReadOnly ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-800'}`}
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
                          className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' : lineErrors[idx]?.description
                              ? 'border-rose-500 bg-rose-50/10'
                              : 'border-transparent focus:border-[#0F5B38]'
                            }`}
                        />
                      </td>

                      {/* Qty */}
                      <td className="p-0 border border-slate-200 align-middle">
                        <input
                          type="number"
                          step="any"
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
                          step="any"
                          value={line.unitPrice}
                          readOnly={isReadOnly}
                          onChange={e => updateLineField(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-right focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' : lineErrors[idx]?.unitPrice
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
                          step="any"
                          placeholder=""
                          value={line.discount}
                          readOnly={isReadOnly}
                          onChange={e => updateLineField(idx, 'discount', e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' : 'border-transparent focus:border-[#0F5B38]'}`}
                        />
                      </td>

                      {/* Expense Account Searchable Select */}
                      <td className="p-0 border border-slate-200 align-middle">
                        <SearchableInput
                          options={accountOptions}
                          value={line.accountId}
                          disabled={isReadOnly}
                          onChange={(val) => updateLineField(idx, 'accountId', val)}
                          placeholder=""
                          className={`w-full bg-transparent border rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none transition ${isReadOnly ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' : 'cursor-pointer text-slate-800 border-transparent focus:border-[#0F5B38]'}`}
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
                          className={`w-full bg-transparent border rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none transition ${isReadOnly || taxType === 'No Tax' ? 'cursor-not-allowed text-slate-400 bg-slate-50/10 border-transparent' : 'cursor-pointer text-slate-800 border-transparent focus:border-[#0F5B38]'}`}
                        />
                      </td>

                      {/* Line Total */}
                      <td className="px-2.5 py-2.5 border border-slate-200 align-middle text-right font-normal text-slate-800 text-[12px]">
                        {currencySymbol}{lineTotal.toFixed(2)}
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
                  )
                })}
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
                onChange={e => setNotes(e.target.value)}
                readOnly={isReadOnly}
                placeholder="Add any additional notes, terms, or conditions..."
                rows={3}
                className={`w-full text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none transition resize-none placeholder:text-slate-400 ${isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white focus:border-[#0F5B38]'}`}
              />
            </div>

            {/* File Attachment Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Attachments (Optional)</label>
              <div className="flex items-center space-x-3">
                {!isReadOnly ? (
                  <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-[3px] transition cursor-pointer select-none">
                    <span>Choose File</span>
                    <input
                      type="file"
                      disabled={isReadOnly}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : null}
                {attachmentName ? (
                  <div className="flex items-center space-x-2 text-xs text-slate-650 bg-slate-50 px-3 py-1.5 rounded-[3px] border border-slate-200 font-semibold font-normal">
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
                ) : isReadOnly ? (
                  <span className="text-xs text-slate-400 italic">No attachments</span>
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
              <h3 className="text-base font-bold text-slate-850">Add New Supplier</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Quickly create a new supplier vendor contact to assign to this purchase order.</p>
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
                  placeholder="e.g. Alibaba Logistics"
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
                    placeholder="e.g. Vendor Agent"
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
                  placeholder="e.g. supply@alibaba.com"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Billing Address</label>
                <textarea
                  value={quickContactAddress}
                  onChange={e => setQuickContactAddress(e.target.value)}
                  placeholder="e.g. 8 Shenton Way, Singapore"
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
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-[3px] shadow-md bg-[#0F5B38] hover:brightness-105 text-white transition text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                Create Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Modal for Creating a New Catalog Item */}
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
              <h3 className="text-base font-bold text-slate-850">Create Procurement Catalog Item</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">Add a new item to purchase from catalog inventory list.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-4 grid grid-cols-2 gap-4 space-y-0">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Item Code <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={quickItemCode}
                    onChange={e => setQuickItemCode(e.target.value)}
                    placeholder="e.g. SERV-HOST"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Item Display Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={quickItemName}
                    onChange={e => setQuickItemName(e.target.value)}
                    placeholder="e.g. Server Allocation"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
              </div>

              <div className="space-y-4 grid grid-cols-2 gap-4 space-y-0">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Procurement Cost ({activeOrg.currency || 'USD'})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickItemPrice}
                    onChange={e => setQuickItemPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider block">Default Purchase Tax</label>
                  <select
                    value={quickItemTaxRateId}
                    onChange={e => setQuickItemTaxRateId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] cursor-pointer"
                  >
                    {taxOptions.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Expense Ledger Account</label>
                <select
                  value={quickItemAccountId}
                  onChange={e => setQuickItemAccountId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2 text-xs font-normal focus:outline-none focus:border-[#0F5B38] cursor-pointer"
                >
                  {accountOptions.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">Description for Purchase Orders</label>
                <textarea
                  value={quickItemDescription}
                  onChange={e => setQuickItemDescription(e.target.value)}
                  placeholder="Details showing on purchase bills..."
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
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-[3px] shadow-md bg-[#0F5B38] hover:brightness-105 text-white transition text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                Add Inventory Item
              </button>
            </div>
          </form>
        </div>
      )}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        defaultEmail={contacts.find(c => c.id === selectedContactId)?.email || ''}
        documentType="Purchase Order"
        documentNumber={poNumber}
        contactName={contacts.find(c => c.id === selectedContactId)?.name || ''}
        totalAmount={`${currency} ${getGrandTotal().toFixed(2)}`}
        orgName={activeOrg.name}
        onSend={async (to, subject, message) => {
          let resolvedId = editingPoId
          const needsApproval = status === 'Draft' || status === 'Awaiting Approval'

          if (needsApproval) {
            resolvedId = await handleSavePO('Approved', false, true)
            if (!resolvedId) {
              throw new Error('Failed to save and approve purchase order.')
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
            po_number: poNumber,
            reference: reference,
            date: date,
            expiry_date: expiryDate,
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

          await apiService.sendPurchaseOrderEmail(payload)
          showAlert({
            title: needsApproval ? 'Approved & Emailed' : 'Email Sent',
            message: needsApproval
              ? `Purchase Order ${poNumber} was successfully approved and emailed to ${to}.`
              : `Purchase Order ${poNumber} was successfully emailed to ${to}.`,
            type: 'success'
          })
          if (setEditingPoId) setEditingPoId(null)
          setActiveTab('PurchaseOrders')
        }}
      />
    </div>
  )
}
