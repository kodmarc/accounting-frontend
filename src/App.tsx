import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Receipt,
  Users,
  TrendingUp,
  Building,
  Sparkles
} from 'lucide-react'
import { apiService } from './services/api'
import type { User as ApiUser, Membership, Organization } from './services/api'

import { usePopup } from './components/PopupProvider'
import type { TabId } from './types/tabs'

// Page & Shell Imports
import { AuthPage } from './pages/AuthPage'
import { OrganizationGate } from './pages/OrganizationGate'
import { DashboardLayout } from './pages/DashboardLayout'

// Tab View Imports
import { HomeTab } from './pages/tabs/HomeTab'
import { ContactsTab } from './pages/tabs/ContactsTab'
import { PlaceholderTab } from './pages/tabs/PlaceholderTab'
import { ChartOfAccountsTab } from './pages/tabs/ChartOfAccountsTab'
import { TaxRatesTab } from './pages/tabs/TaxRatesTab'
import { ProductsTab } from './pages/tabs/ProductsTab'
import { BankAccountsTab } from './pages/tabs/BankAccountsTab'
import { SalesOverviewTab } from './pages/tabs/SalesOverviewTab'
import { InvoicesTab } from './pages/tabs/InvoicesTab'
import { QuotesTab } from './pages/tabs/QuotesTab'
import { SettingsTab } from './pages/tabs/SettingsTab'
import { CreateInvoiceTab } from './pages/tabs/CreateInvoiceTab'
import { CreateQuoteTab } from './pages/tabs/CreateQuoteTab'
import { PurchasesOverviewTab } from './pages/tabs/PurchasesOverviewTab'
import { BillsTab } from './pages/tabs/BillsTab'
import { CreateBillTab } from './pages/tabs/CreateBillTab'
import { PurchaseOrdersTab } from './pages/tabs/PurchaseOrdersTab'
import { CreatePurchaseOrderTab } from './pages/tabs/CreatePurchaseOrderTab'
import { CreateTransferMoney } from './pages/tabs/CreateTransferMoney'
import { CreateSpendReceiveMoney } from './pages/tabs/CreateSpendReceiveMoney'
import { CreateManualJournal } from './pages/tabs/CreateManualJournal'
import { UserProfileTab } from './pages/tabs/UserProfileTab'
import { ProjectsTab } from './pages/tabs/ProjectsTab'

import type { SelectOption } from './components/SearchableSelect'

const VALID_TABS: TabId[] = [
  'Home', 'SalesOverview', 'Invoices', 'OnlinePayments', 'Quotes', 'Products',
  'Customers', 'SalesSettings', 'PurchasesOverview', 'Bills', 'PurchaseOrders',
  'Cheque', 'Expenses', 'Suppliers', 'PurchasesSettings', 'FixedAssets', 'Payroll',
  'AllReports', 'AccountTransactions', 'BalanceSheet', 'ProfitAndLoss', 'ReportingSettings',
  'BankAccounts', 'ChartOfAccounts', 'TaxRates', 'AccountingSettings', 'Contacts',
  'ContactsSettings', 'CreateInvoice', 'CreateQuote', 'EditInvoice', 'EditQuote',
  'CreateBill', 'EditBill', 'CreatePurchaseOrder', 'EditPurchaseOrder',
  'CreateTransferMoney', 'CreateSpendMoney', 'CreateReceiveMoney', 'CreateManualJournal',
  'UserProfile', 'Projects'
]

function isValidTabId(tab: string): tab is TabId {
  return VALID_TABS.includes(tab as TabId)
}

const cleanOrgNameForUrl = (name: string) => name.replace(/\s+/g, '')

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showConfirm } = usePopup()
  const isSubmittingNativelyRef = useRef(false)

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true)
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
  const [organizations, setOrganizations] = useState<Membership[]>([])
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null)

  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgCountry, setOrgCountry] = useState('Singapore')
  const [orgCurrency, setOrgCurrency] = useState('SGD')
  const [orgTaxId, setOrgTaxId] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [orgSearchQuery, setOrgSearchQuery] = useState('')
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  const [activeTab, setActiveTab] = useState<TabId>('Home')
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingBillId, setEditingBillId] = useState<string | null>(null)
  const [editingPoId, setEditingPoId] = useState<string | null>(null)
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false)
  const [quoteDrawerOpen, setQuoteDrawerOpen] = useState(false)

  const [countriesList, setCountriesList] = useState<SelectOption[]>([])
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>([])

  const handleViewInvoice = (id: string) => {
    setEditingInvoiceId(id)
    setActiveTab('EditInvoice')
  }

  const handleViewBill = (id: string) => {
    setEditingBillId(id)
    setActiveTab('EditBill')
  }

  // Load seeded country & currency lists from API on mount
  useEffect(() => {
    apiService.getMetadata()
      .then(data => {
        const countries = data.countries.map(c => ({ value: c.name, label: `${c.name} (${c.code})` }))
        const currencies = data.currencies.map(c => ({ value: c.code, label: `${c.code} (${c.name}, ${c.symbol})` }))
        setCountriesList(countries)
        setCurrenciesList(currencies)
        if (countries.length > 0) setOrgCountry(countries[0].value)
        if (currencies.length > 0) setOrgCurrency(currencies[0].value)
      })
      .catch(() => {})
  }, [])

  // 1. Sync React state → browser URL
  useEffect(() => {
    if (isCheckingAuth) return

    if (!isAuthenticated) {
      const targetPath = authView === 'signup' ? '/signup' : '/login'
      if (location.pathname !== targetPath) navigate(targetPath, { replace: true })
      return
    }

    if (activeOrg) {
      const orgSlug = cleanOrgNameForUrl(activeOrg.name)
      let targetPath = `/org/${orgSlug}/${activeTab}`
      if (activeTab === 'EditInvoice' && editingInvoiceId) {
        targetPath = `/org/${orgSlug}/EditInvoice/${editingInvoiceId}`
      } else if (activeTab === 'EditQuote' && editingQuoteId) {
        targetPath = `/org/${orgSlug}/EditQuote/${editingQuoteId}`
      }
      if (location.pathname !== targetPath) navigate(targetPath, { replace: true })
    } else {
      if (location.pathname !== '/organizations') navigate('/organizations', { replace: true })
    }
  }, [isAuthenticated, isCheckingAuth, authView, activeOrg, activeTab, editingInvoiceId, editingQuoteId])

  // 2. Sync browser URL → React state
  useEffect(() => {
    if (isCheckingAuth) return

    const path = location.pathname

    if (!isAuthenticated) {
      setAuthView(path === '/signup' ? 'signup' : 'login')
      return
    }

    if (path.startsWith('/org/')) {
      const parts = path.split('/')
      const orgNameSlug = parts[2]
      const tabPart = parts[3]
      const editId = parts[4] || null

      if (organizations.length > 0) {
        const found = organizations.find(m =>
          cleanOrgNameForUrl(m.organization.name) === orgNameSlug ||
          m.organization.id === orgNameSlug
        )
        if (found) {
          if (!activeOrg || activeOrg.id !== found.organization.id) {
            setActiveOrg(found.organization)
          }
          if (tabPart && isValidTabId(tabPart)) {
            if (activeTab !== tabPart) setActiveTab(tabPart)
            if (tabPart === 'EditInvoice' && editingInvoiceId !== editId) setEditingInvoiceId(editId)
            else if (tabPart === 'EditQuote' && editingQuoteId !== editId) setEditingQuoteId(editId)
          }
        } else {
          setActiveOrg(null)
          navigate('/organizations', { replace: true })
        }
      }
    } else if (path === '/organizations') {
      if (activeOrg !== null) setActiveOrg(null)
    }
  }, [isAuthenticated, isCheckingAuth, location.pathname, organizations])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await apiService.getMe()
      setCurrentUser(user)
      setIsAuthenticated(true)
      await loadOrganizations()
    } catch {
      setIsAuthenticated(false)
      setCurrentUser(null)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const loadOrganizations = async () => {
    try {
      const list = await apiService.getOrganizations()
      setOrganizations(list)
    } catch {
      // silently fail
    }
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    if (isSubmittingNativelyRef.current) {
      isSubmittingNativelyRef.current = false
      return
    }
    if (authStatus === 'success') {
      e.preventDefault()
      return
    }
    e.preventDefault()
    const formEl = e.currentTarget
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email || !password) {
      setErrorMsg('Please fill in all fields.')
      return
    }
    setAuthStatus('loading')

    try {
      const res = await apiService.signup(email, password, firstName, lastName)

      if (navigator.credentials && (window as any).PasswordCredential) {
        try {
          const cred = new (window as any).PasswordCredential({ id: email, password, name: firstName ? `${firstName} ${lastName}` : email })
          navigator.credentials.store(cred).catch(() => {})
        } catch {}
      }

      setAuthStatus('success')
      setSuccessMsg('Account created successfully! Preparing your ledger...')

      isSubmittingNativelyRef.current = true
      setTimeout(() => {
        if (typeof (formEl as any).requestSubmit === 'function') (formEl as any).requestSubmit()
        else formEl.submit()
      }, 50)

      setTimeout(() => {
        setCurrentUser(res.user)
        setIsAuthenticated(true)
        setAuthStatus('idle')
        loadOrganizations()
      }, 1500)
    } catch (e: any) {
      setAuthStatus('idle')
      const isNetworkError = e.message === 'Failed to fetch' || e.message?.includes('NetworkError')
      setErrorMsg(isNetworkError ? 'Cannot reach the server. Please check your connection and try again.' : (e.message || 'Failed to sign up.'))
    }
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    if (isSubmittingNativelyRef.current) {
      isSubmittingNativelyRef.current = false
      return
    }
    if (authStatus === 'success') {
      e.preventDefault()
      return
    }
    e.preventDefault()
    const formEl = e.currentTarget
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email || !password) {
      setErrorMsg('Please fill in both email and password.')
      return
    }
    setAuthStatus('loading')

    try {
      const res = await apiService.login(email, password)

      if (navigator.credentials && (window as any).PasswordCredential) {
        try {
          const cred = new (window as any).PasswordCredential({ id: email, password })
          navigator.credentials.store(cred).catch(() => {})
        } catch {}
      }

      setAuthStatus('success')
      setSuccessMsg('Logged in successfully! Loading your workspace...')

      isSubmittingNativelyRef.current = true
      setTimeout(() => {
        if (typeof (formEl as any).requestSubmit === 'function') (formEl as any).requestSubmit()
        else formEl.submit()
      }, 50)

      setTimeout(() => {
        setCurrentUser(res.user)
        setIsAuthenticated(true)
        setAuthStatus('idle')
        setOrganizations([])
        apiService.getOrganizations().then(list => setOrganizations(list)).catch(() => {})
      }, 1500)
    } catch (err: any) {
      setAuthStatus('idle')
      const isNetworkError = err.message === 'Failed to fetch' || err.message?.includes('NetworkError')
      setErrorMsg(isNetworkError ? 'Cannot reach the server. Please check your connection and try again.' : (err.message || 'Invalid credentials.'))
    }
  }

  const handleLogout = async () => {
    try {
      await apiService.logout()
    } catch {}
    setIsAuthenticated(false)
    setCurrentUser(null)
    setOrganizations([])
    setActiveOrg(null)
    setEmail('')
    setPassword('')
    setOrgDropdownOpen(false)
    setProfileDropdownOpen(false)
    setActiveTab('Home')
    setSuccessMsg(null)
    setErrorMsg(null)
    setAuthStatus('idle')
    setOrgSearchQuery('')
    setEditingOrg(null)
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!orgName) {
      setErrorMsg('Please provide a company name.')
      return
    }
    try {
      if (editingOrg) {
        const updatedOrg = await apiService.updateOrganization(editingOrg.id, orgName, orgCountry, orgCurrency, orgTaxId)
        setOrganizations(prev => prev.map(m =>
          m.organization.id === editingOrg.id ? { ...m, organization: updatedOrg } : m
        ))
        setIsCreateModalOpen(false)
        setEditingOrg(null)
        setOrgName('')
        setOrgTaxId('')
      } else {
        const membership = await apiService.createOrganization(orgName, orgCountry, orgCurrency, orgTaxId)
        setOrganizations(prev => [...prev, membership])
        setIsCreateModalOpen(false)
        setOrgName('')
        setOrgTaxId('')
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save organization.')
    }
  }

  const handleDeleteOrg = async (orgId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Organization',
      message: 'Are you sure you want to permanently delete this organization? All memberships and ledger configurations will be removed.',
      confirmText: 'Delete Organization',
      isDestructive: true
    })
    if (!confirmed) return
    setErrorMsg(null)
    try {
      await apiService.deleteOrganization(orgId)
      setOrganizations(prev => prev.filter(m => m.organization.id !== orgId))
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete organization.')
    }
  }

  if (isCheckingAuth) return null

  if (!isAuthenticated) {
    return (
      <AuthPage
        authView={authView}
        setAuthView={setAuthView}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authStatus={authStatus}
        errorMsg={errorMsg}
        setErrorMsg={setErrorMsg}
        successMsg={successMsg}
        setSuccessMsg={setSuccessMsg}
        handleLogin={handleLogin}
        handleSignup={handleSignup}
      />
    )
  }

  if (!activeOrg) {
    return (
      <OrganizationGate
        currentUser={currentUser}
        organizations={organizations}
        orgSearchQuery={orgSearchQuery}
        setOrgSearchQuery={setOrgSearchQuery}
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        orgName={orgName}
        setOrgName={setOrgName}
        orgCountry={orgCountry}
        setOrgCountry={setOrgCountry}
        orgCurrency={orgCurrency}
        setOrgCurrency={setOrgCurrency}
        orgTaxId={orgTaxId}
        setOrgTaxId={setOrgTaxId}
        errorMsg={errorMsg}
        setErrorMsg={setErrorMsg}
        handleLogout={handleLogout}
        handleCreateOrg={handleCreateOrg}
        handleDeleteOrg={handleDeleteOrg}
        setActiveOrg={setActiveOrg}
        editingOrg={editingOrg}
        setEditingOrg={setEditingOrg}
        countriesList={countriesList}
        currenciesList={currenciesList}
      />
    )
  }

  return (
    <DashboardLayout
      currentUser={currentUser}
      organizations={organizations}
      activeOrg={activeOrg}
      setActiveOrg={setActiveOrg}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      orgDropdownOpen={orgDropdownOpen}
      setOrgDropdownOpen={setOrgDropdownOpen}
      profileDropdownOpen={profileDropdownOpen}
      setProfileDropdownOpen={setProfileDropdownOpen}
      handleLogout={handleLogout}
    >
      {activeTab === 'Home' && (
        <HomeTab activeOrg={activeOrg} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'BankAccounts' && (
        <BankAccountsTab
          activeOrg={activeOrg}
          onViewInvoice={handleViewInvoice}
          onViewBill={handleViewBill}
        />
      )}

      {activeTab === 'Contacts' && (
        <ContactsTab
          activeOrg={activeOrg}
          isMockMode={false}
          initialFilter="All"
          onViewInvoice={handleViewInvoice}
          onViewBill={handleViewBill}
        />
      )}

      {activeTab === 'Customers' && (
        <ContactsTab
          activeOrg={activeOrg}
          isMockMode={false}
          initialFilter="Customer"
          onViewInvoice={handleViewInvoice}
          onViewBill={handleViewBill}
        />
      )}

      {activeTab === 'Suppliers' && (
        <ContactsTab
          activeOrg={activeOrg}
          isMockMode={false}
          initialFilter="Supplier"
          onViewInvoice={handleViewInvoice}
          onViewBill={handleViewBill}
        />
      )}

      {activeTab === 'ChartOfAccounts' && (
        <ChartOfAccountsTab activeOrg={activeOrg} isMockMode={false} />
      )}

      {activeTab === 'TaxRates' && (
        <TaxRatesTab activeOrg={activeOrg} isMockMode={false} />
      )}

      {activeTab === 'Products' && (
        <ProductsTab activeOrg={activeOrg} isMockMode={false} />
      )}

      {activeTab === 'SalesOverview' && (
        <SalesOverviewTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          onCreateInvoiceClick={() => setActiveTab('CreateInvoice')}
          onCreateQuoteClick={() => setActiveTab('CreateQuote')}
        />
      )}

      {activeTab === 'PurchasesOverview' && (
        <PurchasesOverviewTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          onCreateBillClick={() => { setEditingBillId(null); setActiveTab('CreateBill') }}
          onCreatePOClick={() => { setEditingPoId(null); setActiveTab('CreatePurchaseOrder') }}
        />
      )}

      {activeTab === 'Invoices' && (
        <InvoicesTab
          activeOrg={activeOrg}
          isMockMode={false}
          autoOpenDrawer={invoiceDrawerOpen}
          onCloseAutoOpen={() => setInvoiceDrawerOpen(false)}
          setActiveTab={setActiveTab}
          onEditInvoice={(id) => { setEditingInvoiceId(id); setActiveTab('EditInvoice') }}
          onCreateNewInvoice={() => { setEditingInvoiceId(null); setActiveTab('CreateInvoice') }}
        />
      )}

      {['SalesSettings', 'PurchasesSettings', 'AccountingSettings', 'ContactsSettings'].includes(activeTab) && (
        <SettingsTab
          activeOrg={activeOrg}
          isMockMode={false}
          activeTab={activeTab as any}
          setActiveTab={setActiveTab}
          onOrgUpdate={(updated) => {
            setActiveOrg(updated)
            setOrganizations(prev => prev.map(m =>
              m.organization.id === updated.id ? { ...m, organization: updated } : m
            ))
          }}
        />
      )}

      {activeTab === 'Bills' && (
        <BillsTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          onEditBill={(id) => { setEditingBillId(id); setActiveTab('EditBill') }}
          onCreateNewBill={() => { setEditingBillId(null); setActiveTab('CreateBill') }}
        />
      )}

      {activeTab === 'Quotes' && (
        <QuotesTab
          activeOrg={activeOrg}
          isMockMode={false}
          autoOpenDrawer={quoteDrawerOpen}
          onCloseAutoOpen={() => setQuoteDrawerOpen(false)}
          setActiveTab={setActiveTab}
          onEditQuote={(id) => { setEditingQuoteId(id); setActiveTab('EditQuote') }}
          onCreateNewQuote={() => { setEditingQuoteId(null); setActiveTab('CreateQuote') }}
          onConvertToInvoice={async (quote) => {
            try {
              await apiService.updateQuote(quote.id!, { status: 'Invoiced' })
              setEditingInvoiceId(`convert-quote-${quote.id!}`)
              setActiveTab('CreateInvoice')
            } catch (err: any) {
              alert('Conversion failed: ' + err.message)
            }
          }}
        />
      )}

      {(activeTab === 'CreateInvoice' || activeTab === 'EditInvoice') && (
        <CreateInvoiceTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          editingInvoiceId={activeTab === 'EditInvoice' ? editingInvoiceId : null}
          setEditingInvoiceId={setEditingInvoiceId}
        />
      )}

      {(activeTab === 'CreateQuote' || activeTab === 'EditQuote') && (
        <CreateQuoteTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          editingQuoteId={activeTab === 'EditQuote' ? editingQuoteId : null}
          setEditingQuoteId={setEditingQuoteId}
          setEditingInvoiceId={setEditingInvoiceId}
        />
      )}

      {activeTab === 'PurchaseOrders' && (
        <PurchaseOrdersTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          onEditPO={(id) => { setEditingPoId(id); setActiveTab('EditPurchaseOrder') }}
          onCreateNewPO={() => { setEditingPoId(null); setActiveTab('CreatePurchaseOrder') }}
          onConvertToBill={(po) => { setEditingBillId(`convert-po-${po.id}`); setActiveTab('CreateBill') }}
        />
      )}

      {(activeTab === 'CreateBill' || activeTab === 'EditBill') && (
        <CreateBillTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          editingBillId={activeTab === 'EditBill' ? editingBillId : null}
          setEditingBillId={setEditingBillId}
        />
      )}

      {(activeTab === 'CreatePurchaseOrder' || activeTab === 'EditPurchaseOrder') && (
        <CreatePurchaseOrderTab
          activeOrg={activeOrg}
          isMockMode={false}
          setActiveTab={setActiveTab}
          editingPoId={activeTab === 'EditPurchaseOrder' ? editingPoId : null}
          setEditingPoId={setEditingPoId}
          setEditingBillId={setEditingBillId}
        />
      )}

      {activeTab === 'Projects' && (
        <ProjectsTab
          activeOrg={activeOrg}
          isMockMode={false}
          onViewInvoice={handleViewInvoice}
          onViewBill={handleViewBill}
        />
      )}

      {activeTab === 'CreateTransferMoney' && (
        <CreateTransferMoney activeOrg={activeOrg} isMockMode={false} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'CreateSpendMoney' && (
        <CreateSpendReceiveMoney type="Spend" activeOrg={activeOrg} isMockMode={false} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'CreateReceiveMoney' && (
        <CreateSpendReceiveMoney type="Receive" activeOrg={activeOrg} isMockMode={false} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'CreateManualJournal' && (
        <CreateManualJournal activeOrg={activeOrg} isMockMode={false} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'UserProfile' && (
        <UserProfileTab currentUser={currentUser} setCurrentUser={setCurrentUser} isMockMode={false} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'OnlinePayments' && (
        <PlaceholderTab
          title="Online Payments"
          description="Online payment gateway integration is aligned. Connect Stripe, PayPal, or bank transfer options to accept and reconcile incoming payments."
          icon={Receipt}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'Cheque' && (
        <PlaceholderTab
          title="Cheque Payments"
          description="The Cheque Payments module is aligned. Issue, track, and reconcile printed cheques against your bank accounts and vendor records."
          icon={Receipt}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'Expenses' && (
        <PlaceholderTab
          title="Business Expenses"
          description="The Expense Claims module is aligned. Capture receipts, categorize spend, and approve reimbursement workflows."
          icon={TrendingUp}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'FixedAssets' && (
        <PlaceholderTab
          title="Fixed Assets"
          description="The Fixed Assets Directory is aligned. Track and audit asset acquisitions, depreciation indices, write-offs, and salvage book values."
          icon={Building}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'Payroll' && (
        <PlaceholderTab
          title="Payroll Center"
          description="The Payroll System is aligned. Run employee payouts, specify default hourly rates, calculate tax withholdings, and transmit pay slips."
          icon={Users}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'AllReports' && (
        <PlaceholderTab
          title="Financial Reporting"
          description="The Ledger Analytics portal is aligned. Compile and export Balance Sheets, Cash Flow forecasts, and dynamic Profit & Loss tables."
          icon={Sparkles}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'AccountTransactions' && (
        <PlaceholderTab
          title="Account Transactions Report"
          description="View a full ledger of all transactions across accounts for the active organization."
          icon={TrendingUp}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'BalanceSheet' && (
        <PlaceholderTab
          title="Balance Sheet Statement"
          description="View a complete snapshot of your organization's assets, liabilities, and equity at any point in time."
          icon={Sparkles}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'ProfitAndLoss' && (
        <PlaceholderTab
          title="Profit & Loss Statement"
          description="Analyze revenue, cost of goods sold, operating expenses, and net income across any reporting period."
          icon={Sparkles}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'ReportingSettings' && (
        <PlaceholderTab
          title="Reporting Settings"
          description="Configure your organization's reporting preferences, fiscal year, and default report formats."
          icon={Sparkles}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}
    </DashboardLayout>
  )
}

export default App
