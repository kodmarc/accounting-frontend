import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle, Loader2, ChevronDown, MoreVertical, AlertCircle } from 'lucide-react'
import { apiService, API_BASE_URL, fetchWithAuth } from '../../services/api'
import type { Organization, Contact, Item, Account, TaxRate, SalesSetting, Quote, Project } from '../../services/api'
import { SearchableInput } from '../../components/SearchableInput'
import { EmailModal } from '../../components/EmailModal'
import { ShareModal } from '../../components/ShareModal'
import { usePopup } from '../../components/PopupProvider'
import { XeroDatePicker } from '../../components/XeroDatePicker'
import type { TabId } from '../../types/tabs'
import { TransactionCurrencyModal } from '../../components/TransactionCurrencyModal'

// PDF generation is processed via backend Django endpoints

interface CreateQuoteTabProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
  editingQuoteId?: string | null
  setEditingQuoteId?: (id: string | null) => void
  setEditingInvoiceId?: (id: string | null) => void
  onAddAnother?: () => void
}

export function CreateQuoteTab({
  activeOrg,
  setActiveTab,
  editingQuoteId = null,
  setEditingQuoteId,
  setEditingInvoiceId,
  onAddAnother
}: CreateQuoteTabProps) {
  const { showConfirm, showAlert } = usePopup()
  // Database states
  const [contacts, setContacts] = useState<Contact[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [salesSetting, setSalesSetting] = useState<SalesSetting | null>(null)

  // Loading & UX States
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false)
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Form Fields
  const [selectedContactId, setSelectedContactId] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate] = useState('')
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced'>('Draft')
  const [currency, setCurrency] = useState(activeOrg.currency || 'USD')
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null)
  const [pendingSaveParams, setPendingSaveParams] = useState<{
    statusUpdate?: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced'
    isEmailing?: boolean
    silent?: boolean
  } | null>(null)

  const handleCurrencyChangeConfirm = async (rate: number) => {
    if (!pendingSaveParams || !pendingCurrency) return
    const { statusUpdate, isEmailing, silent } = pendingSaveParams
    const saveCurrency = pendingCurrency
    setPendingSaveParams(null)
    setPendingCurrency(null)
    await executeSaveQuote(statusUpdate, isEmailing || false, silent || false, rate, saveCurrency)
  }
  const [taxType, setTaxType] = useState<'Inclusive' | 'Exclusive' | 'No Tax'>('Exclusive')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [_attachmentFile, setAttachmentFile] = useState<File | null>(null)

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
  const [quoteDbId, setQuoteDbId] = useState<string | null>(null)

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

  // Quote Line Items state
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

  // Load all master list data & quote for edit
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

      setContacts(loadedContacts)
      setCatalogItems(loadedCatalog)
      setAccounts(loadedAccounts)
      setTaxRates(loadedTaxRates)
      setSalesSetting(loadedSettings)
      setProjects(loadedProjects)

      if (editingQuoteId) {
        // Load existing quote details
        let targetQuote: Quote | null = null
        try {
          const allQuotes = await apiService.getQuotes(activeOrg.id)
          const matched = allQuotes.find(q => q.quote_number === editingQuoteId || q.id === editingQuoteId)
          if (matched && matched.id) {
            targetQuote = await apiService.getQuote(matched.id, activeOrg.id)
          } else {
            targetQuote = await apiService.getQuote(editingQuoteId, activeOrg.id)
          }
        } catch {
          targetQuote = await apiService.getQuote(editingQuoteId, activeOrg.id)
        }

        if (targetQuote) {
          setQuoteDbId(targetQuote.id || null)
          setSelectedContactId(targetQuote.contact)
          setQuoteNumber(targetQuote.quote_number)
          setReference(targetQuote.reference || '')
          setDate(targetQuote.date)
          setExpiryDate(targetQuote.expiry_date)
          setStatus(targetQuote.status as any)
          setCurrency(targetQuote.currency || activeOrg.currency || 'USD')
          setTaxType(targetQuote.tax_type || 'Exclusive')
          setSelectedProjectId(targetQuote.project || '')
          setNotes(localStorage.getItem(`kdm_quote_notes_${targetQuote.id}`) || '')
          setAttachmentName(localStorage.getItem(`kdm_quote_attachment_${targetQuote.id}`) || '')

          if (targetQuote.lines && targetQuote.lines.length > 0) {
            setLines(targetQuote.lines.map((l: any, idx: number) => ({
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
      } else {
        setQuoteDbId(null)
        // Initialize new quote defaults - start completely empty
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
      setErrorMsg(e.message || "Failed to load active ledger catalogs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id, editingQuoteId])

  // Generator for Quote Numbers for new quotes only
  useEffect(() => {
    if (salesSetting && !editingQuoteId) {
      const numStr = String(salesSetting.next_quote_number).padStart(4, '0')
      setQuoteNumber(`${salesSetting.quote_prefix}${numStr}`)

      // Auto expiry calculation (default 15 days)
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 15)
      setExpiryDate(expiry.toISOString().split('T')[0])
    }
  }, [salesSetting, editingQuoteId])

  // Auto expiry date calculation when Quote Date changes
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
    setExpiryDate(offsetDate.toISOString().split('T')[0])
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
      const payload: Partial<Contact> = {
        name: quickContactName.trim(),
        email: quickContactEmail.trim() || undefined,
        phone: quickContactPhone.trim() || undefined,
        tax_number: quickContactTaxNumber.trim() || undefined,
        billing_address: quickContactAddress.trim() || undefined,
        contact_type: 'Customer'
      }
      const createdContact = await apiService.createContact(activeOrg.id, payload)
      setContacts(prev => [...prev, createdContact])

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
      const createdItem = await apiService.createItem(activeOrg.id, payload)
      setCatalogItems(prev => [...prev, createdItem])

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

  const validateForm = (): boolean => {
    const formErrors: Record<string, string> = {}
    const rowErrors: Record<number, Record<string, boolean>> = {}
    let hasValidationErrors = false

    if (!selectedContactId) {
      formErrors.contact = 'Prospect client is required.'
      hasValidationErrors = true
    }
    if (!date) {
      formErrors.date = 'Quotation date is required.'
      hasValidationErrors = true
    }
    if (!expiryDate) {
      formErrors.expiryDate = 'Expiry date is required.'
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

  // Save / Update quote
  const handleSaveQuote = async (
    statusUpdate?: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced',
    isEmailing: boolean = false,
    silent: boolean = false
  ): Promise<string | null> => {
    if (!validateForm()) {
      return null
    }

    const finalStatus = statusUpdate || status

    // If saving as Draft, or selected currency is the default currency, save immediately in default currency (no conversion)
    if (finalStatus === 'Draft' || currency === activeOrg.currency) {
      return executeSaveQuote(finalStatus, isEmailing, silent, 1, activeOrg.currency)
    }

    // Otherwise, we are posting a transaction in a different currency! Intercept and show the popup modal.
    setPendingSaveParams({ statusUpdate: finalStatus, isEmailing, silent })
    setPendingCurrency(currency)
    return null
  }

  const executeSaveQuote = async (
    statusUpdate: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced',
    isEmailing: boolean,
    silent: boolean,
    rate: number,
    saveCurrency: string
  ): Promise<string | null> => {
    setIsSubmitting(true)

    const postLines = lines.map(l => {
      const q = Number(l.quantity) || 0
      const u = (Number(l.unitPrice) || 0) / rate
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
        unit_price: Number(u.toFixed(2)),
        discount: d,
        account: l.accountId || fallbackAcc,
        tax_rate: l.taxRateId || fallbackTax,
        total: Number(lineTotal.toFixed(2))
      }
    })

    const payload: Partial<Quote> = {
      contact: selectedContactId,
      quote_number: quoteNumber,
      reference,
      date,
      expiry_date: expiryDate,
      status: statusUpdate,
      currency: activeOrg.currency || 'USD',
      tax_type: taxType,
      project: selectedProjectId || null,
      subtotal: Number((getSubtotal() / rate).toFixed(2)),
      tax_total: Number((getTaxTotal() / rate).toFixed(2)),
      total: Number((getGrandTotal() / rate).toFixed(2)),
      lines: postLines as any
    }

    try {
      const isEdit = !!editingQuoteId

      if (isEdit) {
        const resolvedId = quoteDbId || editingQuoteId
        await apiService.updateQuote(resolvedId!, payload, activeOrg.id)
        localStorage.setItem(`kdm_quote_notes_${editingQuoteId}`, notes)
        localStorage.setItem(`kdm_quote_attachment_${editingQuoteId}`, attachmentName)

        if (!silent) {
          showAlert({ title: 'Quote Updated', message: 'The quote has been updated successfully.', type: 'success' })

          if (isEmailing) {
            setQuoteDbId(resolvedId || null)
            setIsEmailModalOpen(true)
          } else {
            if (setEditingQuoteId) setEditingQuoteId(null)
            setActiveTab('Quotes')
          }
        }
        return resolvedId
      }

      // Create new quote
      const created = await apiService.createQuote(activeOrg.id, payload)
      if (created && created.id) {
        localStorage.setItem(`kdm_quote_notes_${created.id}`, notes)
        localStorage.setItem(`kdm_quote_attachment_${created.id}`, attachmentName)
      }

      if (!silent) {
        showAlert({ title: 'Quote Created', message: `Quote ${quoteNumber} has been created successfully.`, type: 'success' })

        if (isEmailing) {
          setQuoteDbId(created.id || null)
          setIsEmailModalOpen(true)
        } else {
          if (setEditingQuoteId) setEditingQuoteId(null)
          setActiveTab('Quotes')
        }
      } else {
        setQuoteDbId(created.id || null)
      }
      return created.id || null
    } catch (err: any) {
      showAlert({ title: 'Save Error', message: "An error occurred while saving the quote: " + (err.message || "Please check if the quote number is unique."), type: 'error' })
      return null
    } finally {
      setIsSubmitting(false)
      setIsMoreDropdownOpen(false)
    }
  }

  // Download quote as a premium PDF file
  const handlePrintPDF = async () => {
    const resolvedId = quoteDbId || editingQuoteId
    if (!resolvedId) {
      showAlert({ title: 'Download Error', message: 'Please save the quote first before downloading.', type: 'error' })
      return
    }

    setIsDownloadingPdf(true)
    try {
      const url = `${API_BASE_URL}/quotes/${resolvedId}/download-pdf/?org_id=${activeOrg.id}&_t=${Date.now()}`

      const logo = activeOrg.logo || ''
      const templateSettings = activeOrg.sales_template_settings || {}
      const orgDetails = activeOrg.org_extensions || {}
      const termsValue = salesSetting?.standard_payment_terms || '15 days'

      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes,
          logo,
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
      a.download = `Quote_${quoteNumber || 'SalesQuote'}.pdf`
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

  // Deletes quote after showing brand confirmation popup modal
  const handleDeleteQuote = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Quotation',
      message: 'Are you sure you want to delete this sales quote? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true
    })
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      const resolvedId = quoteDbId || editingQuoteId!
      await apiService.deleteQuote(resolvedId, activeOrg.id)

      if (setEditingQuoteId) setEditingQuoteId(null)
      setActiveTab('Quotes')
    } catch (err: any) {
      showAlert({ title: 'Delete Failed', message: 'Failed to delete quote: ' + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Automatically move copy of quote to Invoice as Draft status and mark quote as Invoiced on the spot
  const _handleMarkAsInvoiced = async () => {
    if (!editingQuoteId) return
    setIsSubmitting(true)
    try {
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

      // Generate invoice number
      let nextInvNo = 'INV-0001'
      const settingsObj = await apiService.getSalesSettings(activeOrg.id)
      if (settingsObj) {
        nextInvNo = `${settingsObj.invoice_prefix || 'INV-'}${String(settingsObj.next_invoice_number || 1).padStart(4, '0')}`
      }

      const invPayload = {
        contact: selectedContactId,
        invoice_number: nextInvNo,
        reference: reference || `From Quote ${quoteNumber}`,
        issue_date: date,
        due_date: expiryDate || new Date(new Date(date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Draft' as const,
        currency,
        tax_type: taxType,
        project: selectedProjectId || null,
        subtotal: getSubtotal(),
        tax_total: getTaxTotal(),
        total: getGrandTotal(),
        notes: notes || `Auto-created from Quote ${quoteNumber}`,
        attachment_name: attachmentName,
        lines: postLines
      }

      const resolvedId = quoteDbId || editingQuoteId!
      await apiService.createInvoice(activeOrg.id, invPayload as any)
      await apiService.updateQuote(resolvedId, { status: 'Invoiced' }, activeOrg.id)

      setStatus('Invoiced')
      showAlert({
        title: 'Invoice Draft Created',
        message: `Quote ${quoteNumber} successfully marked as invoiced, and a copy has been created in Invoices as a Draft.`,
        type: 'success'
      })
    } catch (err: any) {
      showAlert({ title: 'Operation Failed', message: "Failed to mark as invoiced: " + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
      setIsMoreDropdownOpen(false)
    }
  }

  void _handleMarkAsInvoiced

  // Update quote status instantly on the spot without popups or redirects
  const handleUpdateStatusOnTheSpot = async (newStatus: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced') => {
    if (!editingQuoteId) return
    setIsSubmitting(true)
    try {
      const resolvedId = quoteDbId || editingQuoteId
      await apiService.updateQuote(resolvedId!, { status: newStatus }, activeOrg.id)
      setStatus(newStatus)
      setIsMoreDropdownOpen(false)
    } catch (err: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update status: " + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
      setIsMoreDropdownOpen(false)
    }
  }

  // Convert accepted quote to invoice on the spot and pre-populate in CreateInvoice page immediately
  const handleConvertToInvoiceOnTheSpot = async () => {
    if (!editingQuoteId) return
    setIsSubmitting(true)
    try {
      const resolvedId = quoteDbId || editingQuoteId
      await apiService.updateQuote(resolvedId!, { status: 'Invoiced' }, activeOrg.id)
      setStatus('Invoiced')

      if (setEditingInvoiceId) {
        setEditingInvoiceId(`convert-quote-${editingQuoteId}`)
      }
      setIsMoreDropdownOpen(false)
      setActiveTab('CreateInvoice')
    } catch (err: any) {
      showAlert({ title: 'Conversion Failed', message: "Failed to convert quote: " + err.message, type: 'error' })
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
      const created = await apiService.createProject(activeOrg.id, {
        name: newProjectName.trim(),
        code: newProjectCode.trim() || undefined
      })
      setProjects([...projects, created])
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

  const currencySymbol = getCurrencySymbol(activeOrg.currency || 'USD')

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
    label: t.name
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
        <p className="text-slate-500 text-xs font-semibold tracking-wider">Loading quote data...</p>
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
                Applying quotation layout theme, active organization settings, and currency symbols...
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
              if (setEditingQuoteId) setEditingQuoteId(null)
              setActiveTab('Quotes')
            }}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[3px] transition duration-200 cursor-pointer"
            title="Return to quotes list"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Sales Pipeline</span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {editingQuoteId ? `Sales Quote: ${quoteNumber}` : 'Create new sales quote'}
            </h2>
            {editingQuoteId && (
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 border ${status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/30' :
                  status === 'Declined' ? 'bg-rose-50 text-rose-600 border-rose-100/30' :
                    status === 'Sent' ? 'bg-blue-50 text-blue-600 border-blue-100/30' :
                      status === 'Invoiced' ? 'bg-indigo-50 text-indigo-600 border-indigo-100/30' :
                        'bg-slate-100 text-slate-500 border-slate-200/50'
                }`}>
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap sm:justify-end gap-2">
          {editingQuoteId ? (
            <>
              {/* Save PDF Button */}
              <button
                onClick={handlePrintPDF}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center space-x-1.5"
              >
                Save PDF
              </button>

              {/* Draft Status Actions */}
              {status === 'Draft' && (
                <div className="relative flex items-center">
                  <button
                    onClick={() => {
                      if (validateForm()) {
                        setIsEmailModalOpen(true)
                      }
                    }}
                    disabled={isSubmitting}
                    className="bg-[#0F5B38] hover:bg-[#0c4b2e] text-white font-medium text-xs px-4 py-2 rounded-l-[3px] shadow-md transition duration-200 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 h-[38px] border-r border-[#0d4f30]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send</span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsSendDropdownOpen(!isSendDropdownOpen)}
                    disabled={isSubmitting}
                    className="bg-[#0F5B38] hover:bg-[#0c4b2e] text-white font-medium text-xs px-2.5 h-[38px] rounded-r-[3px] shadow-md transition duration-200 cursor-pointer flex items-center justify-center border-l border-emerald-900/10"
                    title="More send options"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>

                  {isSendDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSendDropdownOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1 animate-fadeIn font-normal">
                        <button
                          onClick={async () => {
                            setIsSendDropdownOpen(false)
                            const id = await handleSaveQuote('Sent', false, true)
                            if (id) {
                              setActiveTab('CreateQuote')
                              onAddAnother?.()
                            }
                          }}
                          disabled={isSubmitting}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-[3px] transition cursor-pointer"
                        >
                          Send &amp; Add Another
                        </button>
                        <button
                          onClick={() => {
                            setIsSendDropdownOpen(false)
                            handleSaveQuote('Sent')
                          }}
                          disabled={isSubmitting}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 text-xs font-normal rounded-[3px] transition cursor-pointer"
                        >
                          Mark as Sent
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sent Status Actions */}
              {status === 'Sent' && (
                <button
                  onClick={() => handleUpdateStatusOnTheSpot('Accepted')}
                  disabled={isSubmitting}
                  className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <span>Mark as accepted</span>
                  )}
                </button>
              )}

              {/* Accepted Status Actions */}
              {status === 'Accepted' && (
                <button
                  onClick={handleConvertToInvoiceOnTheSpot}
                  disabled={isSubmitting}
                  className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <span>Create Invoice</span>
                  )}
                </button>
              )}

              {/* Declined Status Actions */}
              {status === 'Declined' && (
                <button
                  onClick={() => handleUpdateStatusOnTheSpot('Draft')}
                  disabled={isSubmitting}
                  className="bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-md transition duration-200 cursor-pointer disabled:brightness-90 flex items-center justify-center space-x-1.5 h-[38px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Unmarking...</span>
                    </>
                  ) : (
                    <span>Unmark as declined</span>
                  )}
                </button>
              )}

              {status === 'Invoiced' && (
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center animate-fadeIn"
                  type="button"
                >
                  Email
                </button>
              )}

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
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1.5 divide-y divide-slate-50 font-normal text-xs text-slate-750">
                      <div className="py-1 space-y-0.5">
                        {status === 'Draft' && (
                          <>
                            <button
                              onClick={() => {
                                handleSaveQuote('Draft')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Save as Draft
                            </button>
                            <button
                              onClick={() => {
                                setIsMoreDropdownOpen(false)
                                setIsShareModalOpen(true)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteQuote()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {status === 'Sent' && (
                          <>
                            <button
                              onClick={() => {
                                if (validateForm()) {
                                  setIsEmailModalOpen(true)
                                }
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => {
                                handleUpdateStatusOnTheSpot('Declined')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Mark as declined
                            </button>
                            <button
                              onClick={() => {
                                setIsMoreDropdownOpen(false)
                                setIsShareModalOpen(true)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteQuote()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {status === 'Accepted' && (
                          <>
                            <button
                              onClick={() => {
                                if (validateForm()) {
                                  setIsEmailModalOpen(true)
                                }
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => {
                                handleUpdateStatusOnTheSpot('Sent')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Unmark as Accepted
                            </button>
                            <button
                              onClick={() => {
                                handleUpdateStatusOnTheSpot('Invoiced')
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Mark as Invoiced
                            </button>
                            <button
                              onClick={() => {
                                setIsMoreDropdownOpen(false)
                                setIsShareModalOpen(true)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteQuote()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {status === 'Declined' && (
                          <>
                            <button
                              onClick={() => {
                                if (validateForm()) {
                                  setIsEmailModalOpen(true)
                                }
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => {
                                setIsMoreDropdownOpen(false)
                                setIsShareModalOpen(true)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteQuote()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {status === 'Invoiced' && (
                          <>
                            <button
                              onClick={() => {
                                setIsMoreDropdownOpen(false)
                                setIsShareModalOpen(true)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition cursor-pointer text-slate-700 font-normal rounded-[3px]"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteQuote()
                                setIsMoreDropdownOpen(false)
                              }}
                              disabled={isSubmitting}
                              className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer text-rose-500 font-normal rounded-[3px]"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Creating new quote actions */}
              <button
                onClick={() => handleSaveQuote('Draft')}
                disabled={isSubmitting}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0F5B38] border border-slate-200 hover:border-slate-300 font-medium text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition duration-200 cursor-pointer h-[38px] flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-400"
              >
                Save as Draft
              </button>

              {/* Send Dropdown Button */}
              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    if (validateForm()) {
                      setIsEmailModalOpen(true)
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-[#0F5B38] hover:bg-[#0c4b2e] text-white font-medium text-xs px-4.5 py-2 rounded-l-[3px] shadow-md transition duration-200 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 h-[38px] border-r border-[#0d4f30]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Send</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsSendDropdownOpen(!isSendDropdownOpen)}
                  disabled={isSubmitting}
                  className="bg-[#0F5B38] hover:bg-[#0c4b2e] text-white font-medium text-xs px-2.5 h-[38px] rounded-r-[3px] shadow-md transition duration-200 cursor-pointer flex items-center justify-center border-l border-emerald-900/10"
                  title="More send options"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {isSendDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSendDropdownOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-1 animate-fadeIn font-normal">
                      <button
                        onClick={async () => {
                          setIsSendDropdownOpen(false)
                          const id = await handleSaveQuote('Sent', false, true)
                          if (id) {
                            setActiveTab('Quotes')
                            setTimeout(() => setActiveTab('CreateQuote'), 0)
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-[3px] transition cursor-pointer"
                      >
                        Send &amp; Add Another
                      </button>
                      <button
                        onClick={() => {
                          setIsSendDropdownOpen(false)
                          handleSaveQuote('Sent')
                        }}
                        disabled={isSubmitting}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 text-xs font-normal rounded-[3px] transition cursor-pointer"
                      >
                        Mark as Sent
                      </button>
                    </div>
                  </>
                )}
              </div>
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
      )}      {/* Main Quote Form Wrapper */}
      <div id="printable-area" className="bg-white rounded-[3px] border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">

        {/* Form Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Customer select */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Prospect Client</label>
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
            <label htmlFor="quoteDateInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Quotation Date</label>
            <XeroDatePicker
              id="quoteDateInput"
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

          {/* Expiry Date */}
          <div className="space-y-1.5">
            <label htmlFor="quoteExpiryInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Expiry Date</label>
            <XeroDatePicker
              id="quoteExpiryInput"
              value={expiryDate}
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
          {/* Autogenerated Quote Serial */}
          <div className="space-y-1.5">
            <label htmlFor="quoteNumberDisplay" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Quote Serial Reference</label>
            <input
              id="quoteNumberDisplay"
              type="text"
              readOnly
              value={quoteNumber}
              className="w-full bg-slate-50 text-slate-500 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none"
            />
          </div>

          {/* Client reference */}
          <div className="space-y-1.5">
            <label htmlFor="clientRefInput" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Reference / Proposal Title</label>
            <input
              id="clientRefInput"
              type="text"
              placeholder=""
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
              onChange={e => handleTaxTypeChange(e.target.value as 'Inclusive' | 'Exclusive' | 'No Tax')}
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer h-[38px]"
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
            Line Items Proposal Ledger
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
                  <th className="p-2 border border-slate-200 text-center w-[3%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-semibold text-slate-700">
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
                        className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none transition ${lineErrors[idx]?.description
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
                        onChange={e => updateLineField(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none transition ${
                          lineErrors[idx]?.quantity
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
                        onChange={e => updateLineField(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full bg-transparent text-slate-800 border rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-right focus:outline-none transition ${lineErrors[idx]?.unitPrice
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
                        onChange={e => updateLineField(idx, 'discount', e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-transparent text-slate-800 border border-transparent rounded-[3px] px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none focus:border-[#0F5B38] transition"
                      />
                    </td>

                    {/* Sales Account Searchable Select */}
                    <td className="p-0 border border-slate-200 align-middle">
                      <SearchableInput
                        options={accountOptions}
                        value={line.accountId}
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
                        disabled={taxType === 'No Tax'}
                        className="w-full bg-transparent text-slate-800 border border-transparent rounded-[3px] px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="px-2.5 py-2.5 border border-slate-200 align-middle text-right font-normal text-slate-800 text-[12px]">
                      {currencySymbol}{(Number(line.quantity || 0) * Number(line.unitPrice || 0) * (1 - Number(line.discount || 0) / 100)).toFixed(2)}
                    </td>

                    {/* Action Trash & Plus */}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Line Control Button */}
          <div className="pt-2">
            <button
              onClick={addLineItem}
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold text-[10px] px-4 py-2 border border-slate-200 rounded-[3px] transition cursor-pointer"
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
                placeholder="Add any additional notes, terms, or conditions..."
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
                  <div className="flex items-center space-x-2 text-xs text-slate-650 bg-slate-50 px-3 py-1.5 rounded-[3px] border border-slate-200 font-semibold">
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

      {isShareModalOpen && (quoteDbId || editingQuoteId) && (
        <ShareModal
          docType="quote"
          docId={(quoteDbId || editingQuoteId)!}
          docNumber={quoteNumber}
          contactName={contacts.find(c => c.id === selectedContactId)?.name ?? ''}
          amount={getGrandTotal()}
          currency={currency}
          orgName={activeOrg.name}
          dueLabel={expiryDate ? `expires ${expiryDate}` : ''}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        defaultEmail={contacts.find(c => c.id === selectedContactId)?.email || ''}
        documentType="Quote"
        documentNumber={quoteNumber}
        contactName={contacts.find(c => c.id === selectedContactId)?.name || ''}
        totalAmount={`${currency} ${getGrandTotal().toFixed(2)}`}
        orgName={activeOrg.name}
        onSend={async (to, subject, message) => {
          let resolvedId = quoteDbId || editingQuoteId
          const needsSave = status === 'Draft' || !resolvedId

          if (needsSave) {
            resolvedId = await handleSaveQuote('Sent', false, true)
            if (!resolvedId) {
              throw new Error('Failed to save quote.')
            }
          }

          const payload = {
            to,
            subject,
            message,
            notes,
            logo: activeOrg.logo || '',
            payment_terms: salesSetting?.standard_payment_terms || '',
            template_settings: {
              ...(activeOrg.sales_template_settings || {}),
              theme_color: activeOrg.sales_template_settings?.theme_color || '#0F5B38',
            },
            org_details: {
              ...(activeOrg.org_extensions || {}),
              name: activeOrg.name,
              country: activeOrg.country,
              tax_id: activeOrg.tax_id,
            }
          }
          await apiService.sendQuoteEmail(resolvedId!, payload, activeOrg.id)
          showAlert({
            title: needsSave ? 'Sent & Emailed' : 'Email Sent',
            message: needsSave
              ? `Quote ${quoteNumber} was successfully saved and emailed to ${to}.`
              : `Quote ${quoteNumber} was successfully emailed to ${to}.`,
            type: 'success'
          })
          if (setEditingQuoteId) setEditingQuoteId(null)
          setActiveTab('Quotes')
        }}
      />
      {pendingCurrency && (
        <TransactionCurrencyModal
          baseCurrency={activeOrg.currency || 'USD'}
          newCurrency={pendingCurrency}
          onClose={() => setPendingCurrency(null)}
          onConfirm={handleCurrencyChangeConfirm}
        />
      )}
    </div>
  )
}
