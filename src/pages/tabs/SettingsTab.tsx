import { useState, useEffect, lazy, Suspense } from 'react'
import type { CustomLayout } from '../../components/TemplateEditor'
const TemplateEditor = lazy(() => import('../../components/TemplateEditor').then(m => ({ default: m.TemplateEditor })))
import {
  Settings,
  Shield,
  CheckCircle,
  Save,
  AlertCircle,
  Building,
  FileText,
  ShoppingCart,
  BookOpen,
  Database,
  ArrowRight,
  Users
} from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, SalesSetting, TaxRate } from '../../services/api'
import { TaxRatesTab } from './TaxRatesTab'
import { OrgUsersTab } from './OrgUsersTab'
import { ChangeCurrencyModal } from '../../components/ChangeCurrencyModal'
import type { SettingsTabId } from '../../types/tabs'

interface SettingsTabProps {
  activeOrg: Organization
  onOrgUpdate?: (updated: Organization) => void
  activeTab: SettingsTabId
  setActiveTab: (tab: SettingsTabId) => void
  currentUserId?: string
  isAdmin?: boolean
}

export function SettingsTab({
  activeOrg,
  onOrgUpdate,
  activeTab,
  setActiveTab,
  currentUserId = '',
  isAdmin = true
}: SettingsTabProps) {
  // Translate activeTab to internal section string
  const getSectionFromTab = (tab: typeof activeTab) => {
    switch (tab) {
      case 'ContactsSettings': return 'general'
      case 'SalesSettings': return 'sales'
      case 'PurchasesSettings': return 'purchases'
      case 'AccountingSettings': return 'accounts'
      case 'UsersSettings': return 'users'
      default: return 'general'
    }
  }

  const currentSection = getSectionFromTab(activeTab)

  // ----------------------------------------------------
  // 1. STATE VARIABLES
  // ----------------------------------------------------

  // Organization (General) details
  const [orgName, setOrgName] = useState(activeOrg.name)
  const [orgCountry, setOrgCountry] = useState(activeOrg.country)
  const [orgCurrency, setOrgCurrency] = useState(activeOrg.currency)
  const [orgTaxId, setOrgTaxId] = useState(activeOrg.tax_id)
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null)

  useEffect(() => {
    setOrgCurrency(activeOrg.currency)
  }, [activeOrg.currency])
  
  // Expanded general profile details
  const [orgEmail, setOrgEmail] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  const [orgWebsite, setOrgWebsite] = useState('')
  const [orgAddress, setOrgAddress] = useState('')

  // Sales configurations
  const [invoicePrefix, setInvoicePrefix] = useState('INV-')
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1)
  const [quotePrefix, setQuotePrefix] = useState('QT-')
  const [nextQuoteNumber, setNextQuoteNumber] = useState(1)
  const [paymentTerms, setPaymentTerms] = useState('15 days')
  const [defaultFooter, setDefaultFooter] = useState('Thank you for your business!')

  // Invoice Template Settings (Sales customizer)
  const [templateTheme, setTemplateTheme] = useState<'Emerald' | 'Custom'>('Emerald')
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [showLogo, setShowLogo] = useState(true)
  const [showUEN, setShowUEN] = useState(true)
  const [showTerms, setShowTerms] = useState(true)

  // Purchases Settings
  const [poPrefix, setPoPrefix] = useState('PO-')
  const [nextPoNumber, setNextPoNumber] = useState(1)
  const [supplierTerms, setSupplierTerms] = useState('30 days')
  const [purchaseFooter, setPurchaseFooter] = useState('Please submit all vendor bills via email.')
  const [billPrefix, setBillPrefix] = useState('BIL-')
  const [nextBillNumber, setNextBillNumber] = useState(1)

  // Purchases Template Settings
  const [purchaseTemplateTheme, setPurchaseTemplateTheme] = useState<'Emerald' | 'Custom'>('Emerald')
  const [purchaseShowLogo, setPurchaseShowLogo] = useState(true)
  const [purchaseShowUEN, setPurchaseShowUEN] = useState(true)
  const [purchaseShowTerms, setPurchaseShowTerms] = useState(true)

  // Accounts Settings
  const [yearEndMonth, setYearEndMonth] = useState('December')
  const [yearEndDay, setYearEndDay] = useState('31')
  const [, setTaxRates] = useState<TaxRate[]>([])
  const [seedingLedger, setSeedingLedger] = useState(false)

  // Brand Logo and Bank Details extensions
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [bankName, setBankName] = useState('')
  const [bankAccName, setBankAccName] = useState('')
  const [bankAccNo, setBankAccNo] = useState('')
  const [bankSwift, setBankSwift] = useState('')
  const [bankNotes, setBankNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ----------------------------------------------------
  // 2. DATA LOADING EFFECT
  // ----------------------------------------------------
  useEffect(() => {
    const fetchAllSettings = async () => {
      setLoading(true)
      setErrorMsg(null)
      setSuccessMsg(null)

      // A. Basic org fields — direct from activeOrg (no API call needed)
      setOrgName(activeOrg.name)
      setOrgCountry(activeOrg.country)
      setOrgCurrency(activeOrg.currency)
      setOrgTaxId(activeOrg.tax_id)

      // Org extensions
      const ext = activeOrg.org_extensions || {}
      setOrgEmail(ext.email || '')
      setOrgPhone(ext.phone || '')
      setOrgWebsite(ext.website || '')
      setOrgAddress(ext.address || '')

      // Logo
      setLogoBase64(activeOrg.logo || '')

      // Bank details
      setBankName(activeOrg.bank_name || '')
      setBankAccName(activeOrg.bank_account_name || '')
      setBankAccNo(activeOrg.bank_account_number || '')
      setBankSwift(activeOrg.bank_swift_code || '')
      setBankNotes(activeOrg.bank_additional_instructions || '')

      // Sales template settings
      const tmpl = activeOrg.sales_template_settings || {}
      const rawTheme = tmpl.theme as string
      setTemplateTheme(rawTheme === 'Custom' ? 'Custom' : 'Emerald')
      setShowLogo(tmpl.showLogo !== false)
      setShowUEN(tmpl.showUEN !== false)
      setShowTerms(tmpl.showTerms !== false)

      // Purchase settings
      const ps = activeOrg.purchase_settings || {}
      setPoPrefix(ps.po_prefix || 'PO-')
      setNextPoNumber(ps.next_po_number || 1)
      setSupplierTerms(ps.supplier_terms || '30 days')
      setPurchaseFooter(ps.purchase_footer || 'Please submit all vendor bills via email.')
      setBillPrefix(ps.bill_prefix || 'BIL-')
      setNextBillNumber(ps.next_bill_number || 1)

      // Purchase template settings
      const pt = activeOrg.purchase_template_settings || {}
      const rawPurchaseTheme = pt.theme as string
      setPurchaseTemplateTheme(rawPurchaseTheme === 'Custom' ? 'Custom' : 'Emerald')
      setPurchaseShowLogo(pt.showLogo !== false)
      setPurchaseShowUEN(pt.showUEN !== false)
      setPurchaseShowTerms(pt.showTerms !== false)

      // Accounts settings
      const as_ = activeOrg.accounts_settings || {}
      setYearEndMonth(as_.year_end_month || 'December')
      setYearEndDay(as_.year_end_day || '31')

      try {
        // B. Sales settings — still from dedicated API
        try {
          const settings = await apiService.getSalesSettings(activeOrg.id)
          setInvoicePrefix(settings.invoice_prefix)
          setNextInvoiceNumber(settings.next_invoice_number)
          setQuotePrefix(settings.quote_prefix)
          setNextQuoteNumber(settings.next_quote_number)
          setPaymentTerms(settings.standard_payment_terms)
          setDefaultFooter(settings.default_footer)
        } catch {
          setInvoicePrefix('INV-')
          setNextInvoiceNumber(1)
          setQuotePrefix('QT-')
          setNextQuoteNumber(1)
          setPaymentTerms('15 days')
          setDefaultFooter('Thank you for your business!')
        }

        // C. Tax rates — from API
        try {
          const ratesList = await apiService.getTaxRates(activeOrg.id)
          setTaxRates(ratesList)
        } catch {
          setTaxRates([])
        }

      } catch (err: any) {
        setErrorMsg('Failed to load settings. Please reload.')
      } finally {
        setLoading(false)
      }
    }

    fetchAllSettings()
  }, [activeOrg.id])

  // ----------------------------------------------------
  // 3. ACTIONS & SAVE HANDLERS
  // ----------------------------------------------------

  // Save General settings
  // Save General settings
  const executeSaveGeneral = async () => {
    setIsSaving(true)
    try {
      // 1. PATCH org_extensions to DB
      const extensions = { email: orgEmail, phone: orgPhone, website: orgWebsite, address: orgAddress }
      await apiService.updateOrgSettings(activeOrg.id, { org_extensions: extensions })

      // 2. PUT core org fields
      const updated = await apiService.updateOrganization(
        activeOrg.id,
        orgName,
        orgCountry,
        activeOrg.currency,
        orgTaxId
      )
      if (onOrgUpdate) onOrgUpdate(updated)
      setSuccessMsg("Organization details saved successfully!")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update organization profile.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!orgName.trim()) {
      setErrorMsg("Organization name cannot be empty.")
      setIsSaving(false)
      return
    }

    if (orgCurrency !== activeOrg.currency) {
      setPendingCurrency(orgCurrency)
      setIsSaving(false)
      return
    }

    await executeSaveGeneral()
  }

  // Save Sales settings
  const handleSaveSales = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const salesPayload: Partial<SalesSetting> = {
      invoice_prefix: invoicePrefix,
      next_invoice_number: Number(nextInvoiceNumber),
      quote_prefix: quotePrefix,
      next_quote_number: Number(nextQuoteNumber),
      standard_payment_terms: paymentTerms,
      default_footer: defaultFooter,
    }

    const templatePayload = {
      theme: templateTheme,
      showLogo,
      showUEN,
      showTerms,
      custom_layout: activeOrg.sales_template_settings?.custom_layout ?? null,
    }

    try {
      // 1. PATCH sales_template_settings to DB
      const settingsUpdated = await apiService.updateOrgSettings(activeOrg.id, { sales_template_settings: templatePayload })
      if (onOrgUpdate) onOrgUpdate(settingsUpdated)

      // 2. Save core Sales setting payload
      await apiService.updateSalesSettings(activeOrg.id, salesPayload)
      setSuccessMsg("Sales and prefix numbering parameters updated successfully!")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update sales settings.")
    } finally {
      setIsSaving(false)
    }
  }

  // Save Purchases settings
  const handleSavePurchases = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const purchasePayload = {
      po_prefix: poPrefix,
      next_po_number: Number(nextPoNumber),
      supplier_terms: supplierTerms,
      purchase_footer: purchaseFooter,
      bill_prefix: billPrefix,
      next_bill_number: Number(nextBillNumber)
    }

    const templatePayload = {
      theme: purchaseTemplateTheme,
      showLogo: purchaseShowLogo,
      showUEN: purchaseShowUEN,
      showTerms: purchaseShowTerms
    }

    try {
      const updated = await apiService.updateOrgSettings(activeOrg.id, {
        purchase_settings: purchasePayload,
        purchase_template_settings: templatePayload,
      })
      if (onOrgUpdate) onOrgUpdate(updated)
      setSuccessMsg("Purchases, numbering sequences, and dynamic template styling parameters updated successfully!")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save purchases configurations.")
    } finally {
      setIsSaving(false)
    }
  }

  // Save Accounts & Ledger configurations
  const handleSaveAccounts = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const updated = await apiService.updateOrgSettings(activeOrg.id, {
        accounts_settings: { year_end_month: yearEndMonth, year_end_day: yearEndDay },
      })
      if (onOrgUpdate) onOrgUpdate(updated)
      setSuccessMsg("Financial calendar year parameters saved successfully!")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save ledger configurations.")
    } finally {
      setIsSaving(false)
    }
  }

  // Seed default Ledger Chart of Accounts
  const handleSeedAccounts = async () => {
    setSeedingLedger(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await apiService.importDefaultAccounts(activeOrg.id)
      setSuccessMsg("Standard ledger accounts successfully seeded!")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to import default double-entry accounts.")
    } finally {
      setSeedingLedger(false)
    }
  }

  // Logo Upload and Clear Helpers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string
      setLogoBase64(base64String)
      try {
        const updated = await apiService.updateOrgSettings(activeOrg.id, { logo: base64String })
        if (onOrgUpdate) onOrgUpdate(updated)
        setSuccessMsg("Company logo uploaded and saved successfully!")
      } catch {
        setErrorMsg("Failed to save logo.")
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    }
    reader.readAsDataURL(file)
  }

  const handleLogoRemove = async () => {
    setLogoBase64('')
    try {
      const updated = await apiService.updateOrgSettings(activeOrg.id, { logo: '' })
      if (onOrgUpdate) onOrgUpdate(updated)
      setSuccessMsg("Company logo removed successfully.")
    } catch {
      setErrorMsg("Failed to remove logo.")
    }
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  // Save Bank Account Details
  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const updated = await apiService.updateOrgSettings(activeOrg.id, {
        bank_name: bankName,
        bank_account_name: bankAccName,
        bank_account_number: bankAccNo,
        bank_swift_code: bankSwift,
        bank_additional_instructions: bankNotes,
      })
      if (onOrgUpdate) onOrgUpdate(updated)
      setSuccessMsg("Bank account details saved successfully! These will render in payment advice slips.")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save bank details.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Tab switches elegantly
  const switchSection = (targetTab: typeof activeTab) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setActiveTab(targetTab)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3px] border border-emerald-100/30 shadow-sm animate-pulse">
        <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-[#0F5B38]"></div>
        <span className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Syncing workspace configurations...</span>
      </div>
    )
  }

  return (
    <>
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 sm:p-8 space-y-6 font-sans text-left">
      
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center space-x-2.5">
            <Settings className="h-5.5 w-5.5 text-[#0F5B38]" />
            <span>Settings Hub</span>
          </h2>
          <p className="text-slate-550 text-xs font-semibold">
            Unified centralized dashboard for profile details, automated sequence numbering, payment terms, and ledger imports.
          </p>
        </div>
        <div className="flex items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-full flex items-center space-x-1.5 shadow-sm bg-emerald-50 text-[#0F5B38] border border-emerald-100">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>Live Server Connected</span>
          </span>
        </div>
      </div>

      {/* Message Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-[#0F5B38] px-4 py-3.5 rounded-[3px] flex items-start space-x-3 animate-fadeIn">
          <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="text-xs font-bold leading-relaxed">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3.5 rounded-[3px] flex items-start space-x-3 animate-fadeIn">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="text-xs font-bold leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* 2-Column Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar Section Switching */}
        <div className="lg:col-span-1 space-y-1 bg-slate-50/50 p-2.5 rounded-[3px] border border-slate-100">
          <button
            onClick={() => switchSection('ContactsSettings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-[3px] font-bold text-xs transition duration-200 cursor-pointer ${
              currentSection === 'general'
                ? 'bg-[#0F5B38] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Building className="h-4 w-4 shrink-0" />
            <span className="truncate">General Settings</span>
          </button>
          
          <button
            onClick={() => switchSection('SalesSettings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-[3px] font-bold text-xs transition duration-200 cursor-pointer ${
              currentSection === 'sales'
                ? 'bg-[#0F5B38] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">Sales Settings</span>
          </button>

          <button
            onClick={() => switchSection('PurchasesSettings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-[3px] font-bold text-xs transition duration-200 cursor-pointer ${
              currentSection === 'purchases'
                ? 'bg-[#0F5B38] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="truncate">Purchases Settings</span>
          </button>

          <button
            onClick={() => switchSection('AccountingSettings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-[3px] font-bold text-xs transition duration-200 cursor-pointer ${
              currentSection === 'accounts'
                ? 'bg-[#0F5B38] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">Accounts Settings</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => switchSection('UsersSettings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-[3px] font-bold text-xs transition duration-200 cursor-pointer ${
                currentSection === 'users'
                  ? 'bg-[#0F5B38] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">Users &amp; Permissions</span>
            </button>
          )}
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-3">
          
          {/* SECTION A: GENERAL SETTINGS */}
          {currentSection === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Organization Profile</h3>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Configure company demographics, base currencies, and official contacts.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Logo Uploader */}
                <div className="md:col-span-2 space-y-2">
                  <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Organization Logo</span>
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 bg-slate-50/50 p-5 rounded-[3px] border border-slate-200">
                    <div className="relative flex-shrink-0">
                      {logoBase64 ? (
                        <div className="relative group">
                          <img 
                            src={logoBase64} 
                            className="h-20 w-36 object-contain rounded-[3px] bg-white border border-slate-200 p-2 shadow-sm transition duration-200 group-hover:opacity-75" 
                            alt="Company logo preview" 
                          />
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-md hover:scale-110 transition duration-200 cursor-pointer flex items-center justify-center w-5 h-5"
                            title="Remove logo"
                          >
                            <AlertCircle className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-20 w-36 rounded-[3px] bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                          <Building className="h-6 w-6 text-slate-350" />
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-1 text-slate-400">No Logo Active</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 text-center sm:text-left">
                      <h4 className="text-xs font-bold text-slate-700">Official Brand Assets</h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm text-left">
                        Upload a PNG, JPEG, or SVG logo. This will be converted to a base64 Data URL and dynamically embedded onto invoice/quote PDFs. Max size: 2MB.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                        <label className="bg-[#0F5B38] hover:brightness-105 text-white font-bold text-[10px] px-3.5 py-2 rounded-[3px] cursor-pointer transition duration-200 shadow-sm flex items-center space-x-1.5">
                          <span>Upload Image</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLogoUpload} 
                            className="hidden" 
                          />
                        </label>
                        {logoBase64 && (
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 font-bold text-[10px] px-3.5 py-2 rounded-[3px] cursor-pointer transition duration-200"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Org Name */}
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="orgNameInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Company Registered Name</label>
                  <input
                    id="orgNameInput"
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. Acme Corp LLC"
                  />
                </div>

                {/* Country */}
                <div className="space-y-1">
                  <label htmlFor="orgCountryInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Tax Residency Country</label>
                  <input
                    id="orgCountryInput"
                    type="text"
                    value={orgCountry}
                    onChange={e => setOrgCountry(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. Singapore"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label htmlFor="orgCurrencySelect" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Default Base Currency</label>
                  <select
                    id="orgCurrencySelect"
                    value={orgCurrency}
                    onChange={e => {
                      setOrgCurrency(e.target.value)
                    }}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200 cursor-pointer"
                  >
                    <option value="SGD">SGD (S$)</option>
                    <option value="PKR">PKR (₨)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>

                {/* Tax ID */}
                <div className="space-y-1">
                  <label htmlFor="orgTaxIdInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Business Tax / UEN Registration Number</label>
                  <input
                    id="orgTaxIdInput"
                    type="text"
                    value={orgTaxId}
                    onChange={e => setOrgTaxId(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. UEN-20261902K"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="orgEmailInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Financial Direct Email</label>
                  <input
                    id="orgEmailInput"
                    type="email"
                    value={orgEmail}
                    onChange={e => setOrgEmail(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. billing@company.com"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label htmlFor="orgPhoneInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Contact Phone Line</label>
                  <input
                    id="orgPhoneInput"
                    type="text"
                    value={orgPhone}
                    onChange={e => setOrgPhone(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. +65 8000 0000"
                  />
                </div>

                {/* Website */}
                <div className="space-y-1">
                  <label htmlFor="orgWebsiteInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Corporate Website</label>
                  <input
                    id="orgWebsiteInput"
                    type="text"
                    value={orgWebsite}
                    onChange={e => setOrgWebsite(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. www.company.com"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="orgAddressInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Physical Registered Address</label>
                  <textarea
                    id="orgAddressInput"
                    rows={2}
                    value={orgAddress}
                    onChange={e => setOrgAddress(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200 resize-none"
                    placeholder="Physical street address..."
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-[3px] shadow-md transition duration-200 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? "Saving profile..." : "Save details"}</span>
                </button>
              </div>
            </form>
          )}

          {/* SECTION B: SALES SETTINGS */}
          {currentSection === 'sales' && (
            <div className="space-y-6 animate-fadeIn">
              <form onSubmit={handleSaveSales} className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Sales & Invoicing Configuration</h3>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Adjust default invoice/quote serial indexing, payment terms, and select PDF templates.</p>
              </div>

              <div className="space-y-6">
                
                {/* Prefix & Auto-number chains */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50/55 p-3 rounded-[3px] border border-slate-100 space-y-3">
                    <h4 className="text-[11px] font-extrabold text-[#0F5B38] uppercase tracking-wide">Invoices Series</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Invoice Prefix</label>
                        <input
                          type="text"
                          value={invoicePrefix}
                          onChange={e => setInvoicePrefix(e.target.value)}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Next Serial</label>
                        <input
                          type="number"
                          min="1"
                          value={nextInvoiceNumber}
                          onChange={e => setNextInvoiceNumber(Number(e.target.value))}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50/55 p-3 rounded-[3px] border border-slate-100 space-y-3">
                    <h4 className="text-[11px] font-extrabold text-[#0F5B38] uppercase tracking-wide">Quotations Series</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Quote Prefix</label>
                        <input
                          type="text"
                          value={quotePrefix}
                          onChange={e => setQuotePrefix(e.target.value)}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Next Serial</label>
                        <input
                          type="number"
                          min="1"
                          value={nextQuoteNumber}
                          onChange={e => setNextQuoteNumber(Number(e.target.value))}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment terms */}
                <div className="space-y-1">
                  <label htmlFor="paymentTermsInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Standard Customer Credit Payment Terms</label>
                  <input
                    id="paymentTermsInput"
                    type="text"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. 15 days, 30 days, Due on receipt"
                  />
                </div>

                {/* Footer Note */}
                <div className="space-y-1">
                  <label htmlFor="defaultFooterText" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Standard Invoicing Footer Note</label>
                  <textarea
                    id="defaultFooterText"
                    rows={3}
                    value={defaultFooter}
                    onChange={e => setDefaultFooter(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200 resize-none"
                    placeholder="e.g. Please transfer payments directly into our bank ledger."
                  />
                </div>

                {/* INVOICE TEMPLATE CUSTOMIZER (Requested Feature!) */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div>
                    <h4 className="text-[12px] font-bold text-slate-700">Invoice Template Options</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Select styling templates and toggles for PDF rendering.</p>
                  </div>

                  {/* Radio card selectors */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Theme A — Modern Emerald */}
                    <div
                      onClick={() => setTemplateTheme('Emerald')}
                      className={`cursor-pointer rounded-[3px] border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between h-28 ${
                        templateTheme === 'Emerald'
                          ? 'border-[#0F5B38] bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10'
                          : 'border-slate-200 hover:border-slate-350 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 block">Modern Emerald</span>
                        <p className="text-[9px] text-slate-400 font-semibold leading-tight">Gorgeous modern emerald headers, crisp font weight, stylish badge labels.</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block self-start ${
                        templateTheme === 'Emerald' ? 'bg-[#0F5B38] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        Default theme
                      </span>
                    </div>

                    {/* Theme B — Custom drag-and-drop */}
                    <div
                      onClick={() => setTemplateTheme('Custom')}
                      className={`cursor-pointer rounded-[3px] border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between h-28 ${
                        templateTheme === 'Custom'
                          ? 'border-[#0F5B38] bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10'
                          : 'border-slate-200 hover:border-slate-350 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 block">Custom Layout</span>
                        <p className="text-[9px] text-slate-400 font-semibold leading-tight">Drag, resize and position every element freely on an A4 canvas.</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block self-start ${
                        templateTheme === 'Custom' ? 'bg-[#0F5B38] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        Your design
                      </span>
                    </div>
                  </div>

                  {/* Open layout editor when Custom is selected */}
                  {templateTheme === 'Custom' && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50/40 border border-emerald-200 rounded-[3px]">
                      <span className="text-[11px] text-emerald-800 font-medium flex-1">
                        {activeOrg.sales_template_settings?.custom_layout
                          ? 'Custom layout saved. Open the editor to make changes.'
                          : 'No custom layout yet. Open the editor to design your template.'}
                      </span>
                      <button
                        onClick={() => setShowTemplateEditor(true)}
                        className="text-[11px] font-semibold text-white bg-[#0F5B38] hover:brightness-105 px-3 py-1.5 rounded-[3px]"
                      >
                        Open Layout Editor
                      </button>
                    </div>
                  )}

                  {/* Settings toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 p-4 rounded-[3px] border border-slate-100">
                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={showLogo} 
                        onChange={() => setShowLogo(!showLogo)} 
                        className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-650">Include Org Logo</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={showUEN} 
                        onChange={() => setShowUEN(!showUEN)} 
                        className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-650">Display Tax / UEN ID</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={showTerms} 
                        onChange={() => setShowTerms(!showTerms)} 
                        className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-650">Display Payment Terms</span>
                    </label>
                  </div>

                  {/* Live Layout Mockup Preview */}
                  <div className="border-t border-slate-100 pt-5 space-y-4">
                    <div>
                      <h4 className="text-[12px] font-bold text-slate-700">Live PDF Layout Mockup</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Real-time visualization of how the selected theme and options affect document layouts.</p>
                    </div>

                    <div className="bg-slate-50 rounded-[3px] p-4 sm:p-6 border border-slate-100 flex justify-center">
                      <div className="bg-white w-full max-w-lg border border-slate-200 shadow-sm rounded-[3px] p-5 font-sans space-y-4 text-xs select-none">
                        
                        {/* Mock Header */}
                        <div className="flex justify-between items-start">
                          <div className="space-y-1.5 text-left">
                            {showLogo && logoBase64 ? (
                              <img src={logoBase64} className="h-8 max-w-[120px] object-contain rounded-[3px]" alt="Mock Logo" />
                            ) : showLogo ? (
                              <div className="h-8 w-20 bg-slate-100 rounded-[3px] flex items-center justify-center text-[8px] text-slate-400 border border-dashed border-slate-200">
                                Logo Placeholder
                              </div>
                            ) : null}
                            {!(showLogo && logoBase64) && (
                              <div className="font-bold text-sm text-emerald-800">
                                {activeOrg.name}
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 space-y-0.5 leading-tight">
                              {showUEN && activeOrg.tax_id && <div>UEN: {activeOrg.tax_id}</div>}
                              <div>{orgAddress || '12 Marina Boulevard, Singapore'}</div>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-1">
                            <div className="text-base font-black tracking-wide text-emerald-800">
                              INVOICE
                            </div>
                            <div className="text-[9px] font-bold text-slate-500">
                              No. {invoicePrefix}000042
                            </div>
                          </div>
                        </div>

                        {/* Mock Billing metadata */}
                        <div className="grid grid-cols-4 gap-2 p-2 rounded-[3px] bg-emerald-50/30">
                          <div>
                            <div className="text-[8px] text-slate-400 font-bold uppercase">Date</div>
                            <div className="text-[9px] font-extrabold text-slate-700">01 Jun 2026</div>
                          </div>
                          <div>
                            <div className="text-[8px] text-slate-400 font-bold uppercase">Due Date</div>
                            <div className="text-[9px] font-extrabold text-slate-700">16 Jun 2026</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[8px] text-slate-400 font-bold uppercase">Reference</div>
                            <div className="text-[9px] font-extrabold text-slate-700">PO-9831A</div>
                          </div>
                        </div>

                        {/* Mock Client and Vendor details */}
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div className="space-y-1">
                            <div className="text-[8px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-0.5">Bill To</div>
                            <div className="text-[9px] font-bold text-slate-750">Johnathan Doe Ltd</div>
                            <div className="text-[8px] text-slate-500 leading-tight">
                              john@doe.com<br />
                              Singapore 048624
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[8px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-0.5">From</div>
                            <div className="text-[9px] font-bold text-slate-750">{activeOrg.name}</div>
                            <div className="text-[8px] text-slate-500 leading-tight">
                              {orgEmail || 'finance@company.com'}<br />
                              Singapore
                            </div>
                          </div>
                        </div>

                        {/* Mock Items Table */}
                        <div className="overflow-hidden rounded-[3px] border border-slate-100">
                          <table className="w-full text-[9px] border-collapse">
                            <thead>
                              <tr className="text-[8px] font-bold uppercase tracking-wider text-white bg-emerald-800">
                                <th className="px-3 py-1.5 text-left">Item</th>
                                <th className="px-3 py-1.5 text-left">Description</th>
                                <th className="px-3 py-1.5 text-center">Qty</th>
                                <th className="px-3 py-1.5 text-right">Price</th>
                                <th className="px-3 py-1.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              <tr>
                                <td className="px-3 py-1.5 font-bold">IT-CONSULT</td>
                                <td className="px-3 py-1.5 text-slate-500">Cloud migration & architecture</td>
                                <td className="px-3 py-1.5 text-center">10</td>
                                <td className="px-3 py-1.5 text-right">$150.00</td>
                                <td className="px-3 py-1.5 text-right font-bold">$1,500.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Mock Summary block */}
                        <div className="flex justify-end">
                          <table className="w-40 text-[9px]">
                            <tbody>
                              <tr className="border-b border-slate-150">
                                <td className="py-1 text-slate-400 text-right pr-2">Subtotal</td>
                                <td className="py-1 text-right font-semibold text-slate-700">$1,500.00</td>
                              </tr>
                              <tr className="border-b border-slate-150">
                                <td className="py-1 text-slate-400 text-right pr-2">Tax (GST 8%)</td>
                                <td className="py-1 text-right font-semibold text-slate-700">$120.00</td>
                              </tr>
                              <tr className="font-bold border-b-2 border-emerald-800 text-emerald-800">
                                <td className="py-1.5 text-right pr-2">Total Due</td>
                                <td className="py-1.5 text-right text-xs font-black">$1,620.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Mock Dotted Detach payment advice slip */}
                        <div className="pt-2">
                          <div className="border-t border-dashed border-slate-350 text-[8px] text-slate-400 py-1 select-none flex justify-center items-center space-x-1">
                            <span>✂</span>
                            <span>-------------------------------- Detach and return this payment slip --------------------------------</span>
                            <span>✂</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-left pt-2 font-sans bg-slate-50/50 p-2.5 rounded-[3px] border border-dashed border-slate-200">
                            <div className="border-r border-slate-200 border-dashed pr-2">
                              <div className="text-[8px] font-bold tracking-wide uppercase text-emerald-800">
                                PAYMENT ADVICE
                              </div>
                              <div className="text-[7.5px] mt-1 space-y-0.5 leading-tight text-slate-500 text-left">
                                <div><span className="font-semibold text-slate-400 text-[7px] uppercase">Customer:</span> Johnathan Doe Ltd</div>
                                <div><span className="font-semibold text-slate-400 text-[7px] uppercase">Invoice:</span> {invoicePrefix}000042</div>
                                <div><span className="font-semibold text-slate-400 text-[7px] uppercase">Due Date:</span> 16 Jun 2026</div>
                                <div className="font-bold"><span className="font-semibold text-slate-400 text-[7px] uppercase">Amount Due:</span> $1,620.00</div>
                              </div>
                            </div>

                            <div className="pl-1">
                              <div className="text-[8px] font-bold tracking-wide uppercase text-emerald-800">
                                HOW TO PAY
                              </div>
                              <div className="text-[7.5px] mt-1 space-y-0.5 leading-tight text-slate-500 text-left">
                                <div><span className="font-semibold text-slate-400 text-[7px] uppercase">Bank:</span> {bankName || 'Acme International Bank'}</div>
                                <div><span className="font-semibold text-slate-400 text-[7px] uppercase">Account:</span> {bankAccName || activeOrg.name}</div>
                                <div><span className="font-semibold text-slate-400 text-[7px] uppercase">Acc No:</span> {bankAccNo || '120-4921-983'}</div>
                                {bankSwift && <div><span className="font-semibold text-slate-400 text-[7px] uppercase">SWIFT:</span> {bankSwift}</div>}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-[3px] shadow-md transition duration-200 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? "Saving Sales..." : "Save settings"}</span>
                </button>
              </div>
            </form>

            {/* Bank Details Form Card */}
            <form onSubmit={handleSaveBankDetails} className="space-y-4 bg-slate-50/40 p-4 border border-slate-100 rounded-[3px]">
              <div>
                <h4 className="text-[12px] font-extrabold text-[#0F5B38] uppercase tracking-wide">Bank Account Details (Payment Advice)</h4>
                <p className="text-[9px] text-slate-400 font-semibold">Enter your official bank details. These are rendered in the How To Pay columns on invoice PDFs.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. Acme International Bank"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>

                {/* Account Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankAccName}
                    onChange={e => setBankAccName(e.target.value)}
                    placeholder={activeOrg.name}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Account Number</label>
                  <input
                    type="text"
                    value={bankAccNo}
                    onChange={e => setBankAccNo(e.target.value)}
                    placeholder="e.g. 120-4921-983"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>

                {/* SWIFT Code */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase">SWIFT / BIC Code (Optional)</label>
                  <input
                    type="text"
                    value={bankSwift}
                    onChange={e => setBankSwift(e.target.value)}
                    placeholder="e.g. ACMECOSSXXX"
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>

                {/* Additional Instructions */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Payment Instructions / Notes (Optional)</label>
                  <input
                    type="text"
                    value={bankNotes}
                    onChange={e => setBankNotes(e.target.value)}
                    placeholder="e.g. Please quote the invoice reference number in bank transfers."
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center space-x-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs px-4 py-2 rounded-[3px] transition duration-200 cursor-pointer border border-slate-200"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Bank Details</span>
                </button>
              </div>
            </form>
          </div>
        )}

          {/* SECTION C: PURCHASES SETTINGS */}
          {currentSection === 'purchases' && (
            <form onSubmit={handleSavePurchases} className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Purchases & Payables Settings</h3>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Configure Purchase Orders numbering chains, standard supplier payment deadlines, and audit terms.</p>
              </div>

              <div className="space-y-6">
                
                {/* Prefix and numbering chains */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50/55 p-3 rounded-[3px] border border-slate-100 space-y-3">
                    <h4 className="text-[11px] font-extrabold text-[#0F5B38] uppercase tracking-wide">Purchase Orders Series</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">PO Prefix</label>
                        <input
                          type="text"
                          value={poPrefix}
                          onChange={e => setPoPrefix(e.target.value)}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Next Serial</label>
                        <input
                          type="number"
                          min="1"
                          value={nextPoNumber}
                          onChange={e => setNextPoNumber(Number(e.target.value))}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50/55 p-3 rounded-[3px] border border-slate-100 space-y-3">
                    <h4 className="text-[11px] font-extrabold text-[#0F5B38] uppercase tracking-wide">Supplier Bills Series</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Bill Prefix</label>
                        <input
                          type="text"
                          value={billPrefix}
                          onChange={e => setBillPrefix(e.target.value)}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Next Serial</label>
                        <input
                          type="number"
                          min="1"
                          value={nextBillNumber}
                          onChange={e => setNextBillNumber(Number(e.target.value))}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplier Terms */}
                <div className="space-y-1">
                  <label htmlFor="supplierTermsInput" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Standard Supplier Payment Terms</label>
                  <input
                    id="supplierTermsInput"
                    type="text"
                    value={supplierTerms}
                    onChange={e => setSupplierTerms(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200"
                    placeholder="e.g. 30 days, Net 45"
                  />
                </div>

                {/* Supplier note */}
                <div className="space-y-1">
                  <label htmlFor="purchaseFooterText" className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Standard Purchase Order Footer / Note</label>
                  <textarea
                    id="purchaseFooterText"
                    rows={3}
                    value={purchaseFooter}
                    onChange={e => setPurchaseFooter(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-205 rounded-[3px] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38] transition duration-200 resize-none"
                    placeholder="e.g. Please submit all vendor invoices to finance department via email."
                  />
                </div>

                {/* PURCHASES TEMPLATE CUSTOMIZER */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div>
                    <h4 className="text-[12px] font-bold text-slate-700">Purchase Document Template Options</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Select styling templates and toggles for Purchase Order & Bill PDF rendering.</p>
                  </div>

                  {/* Radio card selectors */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Theme A — Modern Emerald */}
                    <div
                      onClick={() => setPurchaseTemplateTheme('Emerald')}
                      className={`cursor-pointer rounded-[3px] border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between h-28 ${
                        purchaseTemplateTheme === 'Emerald'
                          ? 'border-[#0F5B38] bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10'
                          : 'border-slate-200 hover:border-slate-350 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 block">Modern Emerald</span>
                        <p className="text-[9px] text-slate-400 font-semibold leading-tight">Gorgeous modern emerald headers, crisp font weight, stylish badge labels.</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block self-start ${
                        purchaseTemplateTheme === 'Emerald' ? 'bg-[#0F5B38] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        Default theme
                      </span>
                    </div>

                    {/* Theme B — Custom drag-and-drop */}
                    <div
                      onClick={() => setPurchaseTemplateTheme('Custom')}
                      className={`cursor-pointer rounded-[3px] border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between h-28 ${
                        purchaseTemplateTheme === 'Custom'
                          ? 'border-[#0F5B38] bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10'
                          : 'border-slate-200 hover:border-slate-350 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 block">Custom Layout</span>
                        <p className="text-[9px] text-slate-400 font-semibold leading-tight">Drag, resize and position every element freely on an A4 canvas.</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block self-start ${
                        purchaseTemplateTheme === 'Custom' ? 'bg-[#0F5B38] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        Your design
                      </span>
                    </div>
                  </div>

                  {/* Open layout editor when Custom is selected */}
                  {purchaseTemplateTheme === 'Custom' && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50/40 border border-emerald-200 rounded-[3px]">
                      <span className="text-[11px] text-emerald-800 font-medium flex-1">
                        {activeOrg.purchase_template_settings?.custom_layout
                          ? 'Custom layout saved. Open the editor to make changes.'
                          : 'No custom layout yet. Open the editor to design your template.'}
                      </span>
                      <button
                        onClick={() => setShowTemplateEditor(true)}
                        className="text-[11px] font-semibold text-white bg-[#0F5B38] hover:brightness-105 px-3 py-1.5 rounded-[3px]"
                      >
                        Open Layout Editor
                      </button>
                    </div>
                  )}

                  {/* Settings toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/55 p-4 rounded-[3px] border border-slate-100">
                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={purchaseShowLogo} 
                        onChange={() => setPurchaseShowLogo(!purchaseShowLogo)} 
                        className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-650">Include Org Logo</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={purchaseShowUEN} 
                        onChange={() => setPurchaseShowUEN(!purchaseShowUEN)} 
                        className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-650">Display Tax / UEN ID</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={purchaseShowTerms} 
                        onChange={() => setPurchaseShowTerms(!purchaseShowTerms)} 
                        className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-650">Display Terms / Footer</span>
                    </label>
                  </div>

                  {/* Live Layout Mockup Preview */}
                  <div className="border-t border-slate-100 pt-5 space-y-4">
                    <div>
                      <h4 className="text-[12px] font-bold text-slate-700">Live PDF Layout Mockup (Purchase Order)</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Real-time visualization of how the selected theme and options affect purchase document layouts.</p>
                    </div>

                    <div className="bg-slate-50 rounded-[3px] p-4 sm:p-6 border border-slate-100 flex justify-center">
                      <div className="bg-white w-full max-w-lg border border-slate-200 shadow-sm rounded-[3px] p-5 font-sans space-y-4 text-xs select-none">
                        
                        {/* Mock Header */}
                        <div className="flex justify-between items-start">
                          <div className="space-y-1.5 text-left">
                            {purchaseShowLogo && logoBase64 ? (
                              <img src={logoBase64} className="h-8 max-w-[120px] object-contain rounded-[3px]" alt="Mock Logo" />
                            ) : purchaseShowLogo ? (
                              <div className="h-8 w-20 bg-slate-100 rounded-[3px] flex items-center justify-center text-[8px] text-slate-400 border border-dashed border-slate-200">
                                Logo Placeholder
                              </div>
                            ) : null}
                            {!(purchaseShowLogo && logoBase64) && (
                              <div className="font-bold text-sm text-emerald-800">
                                {activeOrg.name}
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 space-y-0.5 leading-tight">
                              {purchaseShowUEN && activeOrg.tax_id && <div>UEN: {activeOrg.tax_id}</div>}
                              <div>{orgAddress || '12 Marina Boulevard, Singapore'}</div>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-1">
                            <div className="text-base font-black tracking-wide text-emerald-800">
                              PURCHASE ORDER
                            </div>
                            <div className="text-[9px] font-bold text-slate-500">
                              No. {poPrefix}000042
                            </div>
                          </div>
                        </div>

                        {/* Mock Billing metadata */}
                        <div className="grid grid-cols-4 gap-2 p-2 rounded-[3px] bg-emerald-50/30">
                          <div>
                            <div className="text-[8px] text-slate-400 font-bold uppercase">Date</div>
                            <div className="text-[9px] font-extrabold text-slate-700">01 Jun 2026</div>
                          </div>
                          <div>
                            <div className="text-[8px] text-slate-400 font-bold uppercase">Delivery Date</div>
                            <div className="text-[9px] font-extrabold text-slate-700">16 Jun 2026</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[8px] text-slate-400 font-bold uppercase">Reference</div>
                            <div className="text-[9px] font-extrabold text-slate-700">PO-9831A</div>
                          </div>
                        </div>

                        {/* Mock Client and Vendor details */}
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div className="space-y-1">
                            <div className="text-[8px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-0.5">Supplier / Vendor</div>
                            <div className="text-[9px] font-bold text-slate-750">Alibaba Cloud SG</div>
                            <div className="text-[8px] text-slate-500 leading-tight">
                              billing@alibaba.com<br />
                              Singapore 068811
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[8px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-0.5">Ship To</div>
                            <div className="text-[9px] font-bold text-slate-750">{activeOrg.name}</div>
                            <div className="text-[8px] text-slate-500 leading-tight">
                              {orgEmail || 'finance@company.com'}<br />
                              Singapore
                            </div>
                          </div>
                        </div>

                        {/* Mock Items Table */}
                        <div className="overflow-hidden rounded-[3px] border border-slate-100">
                          <table className="w-full text-[9px] border-collapse">
                            <thead>
                              <tr className="text-[8px] font-bold uppercase tracking-wider text-white bg-emerald-800">
                                <th className="px-3 py-1.5 text-left">Item</th>
                                <th className="px-3 py-1.5 text-left">Description</th>
                                <th className="px-3 py-1.5 text-center">Qty</th>
                                <th className="px-3 py-1.5 text-right">Cost</th>
                                <th className="px-3 py-1.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              <tr>
                                <td className="px-3 py-1.5 font-bold">CLOUD-LIC</td>
                                <td className="px-3 py-1.5 text-slate-500">Cloud VM Server Instance Monthly Cost</td>
                                <td className="px-3 py-1.5 text-center">2</td>
                                <td className="px-3 py-1.5 text-right">$150.00</td>
                                <td className="px-3 py-1.5 text-right font-bold">$300.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Mock Summary block */}
                        <div className="flex justify-end">
                          <table className="w-40 text-[9px]">
                            <tbody>
                              <tr className="border-b border-slate-150">
                                <td className="py-1 text-slate-400 text-right pr-2">Subtotal</td>
                                <td className="py-1 text-right font-semibold text-slate-700">$300.00</td>
                              </tr>
                              <tr className="border-b border-slate-150">
                                <td className="py-1 text-slate-400 text-right pr-2">Tax (GST 9%)</td>
                                <td className="py-1 text-right font-semibold text-slate-700">$27.00</td>
                              </tr>
                              <tr className="font-bold border-b-2 border-emerald-800 text-emerald-800">
                                <td className="py-1.5 text-right pr-2">Total Amount</td>
                                <td className="py-1.5 text-right text-xs font-black">$327.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Mock Footer notes */}
                        {purchaseShowTerms && purchaseFooter && (
                          <div className="border-t border-slate-100 pt-2 text-[8px] text-slate-450 italic text-left leading-relaxed">
                            <strong>Note:</strong> {purchaseFooter}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-[3px] shadow-md transition duration-200 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? "Saving Purchases..." : "Save settings"}</span>
                </button>
              </div>
            </form>
          )}

          {/* SECTION E: USERS & PERMISSIONS */}
          {currentSection === 'users' && isAdmin && (
            <OrgUsersTab activeOrg={activeOrg} currentUserId={currentUserId} />
          )}

          {/* SECTION D: ACCOUNTS SETTINGS */}
          {currentSection === 'accounts' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Accounts & Ledger Configuration</h3>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Import default chart of accounts directories, select fiscal year end months, and audit tax lists.</p>
              </div>

              {/* Fiscal Calendar Year settings */}
              <form onSubmit={handleSaveAccounts} className="space-y-4 bg-slate-50/40 p-4 border border-slate-100 rounded-[3px]">
                <div>
                  <h4 className="text-[12px] font-extrabold text-[#0F5B38] uppercase tracking-wide">Financial Year End Settings</h4>
                  <p className="text-[9px] text-slate-400 font-semibold">Select the official ledger closing date for year-end corporate tax compliance.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450 uppercase">Month</label>
                    <select
                      value={yearEndMonth}
                      onChange={e => setYearEndMonth(e.target.value)}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                    >
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450 uppercase">Day</label>
                    <select
                      value={yearEndDay}
                      onChange={e => setYearEndDay(e.target.value)}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#0F5B38]"
                    >
                      {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs px-4 py-2 rounded-[3px] transition duration-200 cursor-pointer border border-slate-200"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Closing Date</span>
                  </button>
                </div>
              </form>

              {/* General Ledger Account Seeder */}
              <div className="bg-emerald-50/20 border border-emerald-100/50 p-5 rounded-[3px] space-y-4">
                <div className="flex items-start space-x-3">
                  <Database className="h-5 w-5 text-[#0F5B38] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">Import Default Chart of Accounts</h4>
                    <p className="text-[10px] text-slate-450 font-semibold leading-relaxed mt-0.5">
                      Seed a standard collection of double-entry ledger accounts (Assets, Liabilities, Equities, Expenses, Revenue) for your workspace. This prepares your general ledger for transactions.
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={handleSeedAccounts}
                    disabled={seedingLedger}
                    className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-[3px] shadow-md transition duration-200 cursor-pointer"
                  >
                    {seedingLedger ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></div>
                        <span>Seeding double-entries...</span>
                      </>
                    ) : (
                      <>
                        <span>Seed Default Ledger Accounts</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Integrated Business Tax Rates CRUD Panel */}
              <div className="space-y-3 pt-6 border-t border-slate-100">
                <TaxRatesTab
                  activeOrg={activeOrg}
                />
              </div>

            </div>
          )}

        </div>

      </div>
          {pendingCurrency && (
        <ChangeCurrencyModal
          orgId={activeOrg.id}
          baseCurrency={activeOrg.currency}
          newCurrency={pendingCurrency}
          onClose={() => {
            setPendingCurrency(null)
            setOrgCurrency(activeOrg.currency)
          }}
          onSuccess={async () => {
            setPendingCurrency(null)
            await executeSaveGeneral()
            window.location.reload()
          }}
        />
      )}
    </div>

    {/* Template Designer modal (full-screen overlay) */}
    {showTemplateEditor && activeOrg && (
      <Suspense fallback={null}>
        <TemplateEditor
          initialLayout={(activeOrg.sales_template_settings?.custom_layout as CustomLayout | null) ?? null}
          org={activeOrg}
          onClose={() => setShowTemplateEditor(false)}
          onSave={async (layout: CustomLayout) => {
            const updated = await apiService.updateOrgSettings(activeOrg.id, {
              sales_template_settings: {
                ...(activeOrg.sales_template_settings || {}),
                theme: 'Custom',
                custom_layout: layout,
              },
              purchase_template_settings: {
                ...(activeOrg.purchase_template_settings || {}),
                theme: 'Custom',
                custom_layout: layout,
              },
            })
            if (onOrgUpdate) onOrgUpdate(updated)
            setTemplateTheme('Custom')
            setShowTemplateEditor(false)
          }}
        />
      </Suspense>
    )}
    </>
  )
}
