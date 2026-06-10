import { useState, useEffect, useRef } from 'react'
import {
  Receipt,
  Users,
  TrendingUp,
  Calculator,
  Building,
  Briefcase,
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
import { ReconcileTab } from './pages/tabs/ReconcileTab'
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

// Type options
import type { SelectOption } from './components/SearchableSelect'

// Mock Data for the Bank Reconciliation Simulator
interface ReconcileItem {
  id: string
  date: string
  bankDescription: string
  bankAmount: number
  matchedTo: {
    invoiceNo: string
    contact: string
    amount: number
    type: 'Invoice' | 'Bill'
  }
}

const INITIAL_RECONCILE_ITEMS: ReconcileItem[] = []

const FALLBACK_COUNTRIES: SelectOption[] = [
  { value: 'Singapore', label: 'Singapore (SG)' },
  { value: 'Pakistan', label: 'Pakistan (PK)' },
  { value: 'United States', label: 'United States (US)' },
  { value: 'United Kingdom', label: 'United Kingdom (UK)' },
]

const FALLBACK_CURRENCIES: SelectOption[] = [
  { value: 'SGD', label: 'SGD (Singapore Dollar, $)' },
  { value: 'PKR', label: 'PKR (Pakistani Rupee, ₨)' },
  { value: 'USD', label: 'USD (US Dollar, $)' },
  { value: 'GBP', label: 'GBP (British Pound, £)' },
]

const cleanOrgNameForUrl = (name: string) => name.replace(/\s+/g, '');

function App() {
  const { showConfirm, showAlert } = usePopup()
  const isSubmittingNativelyRef = useRef(false)
  
  // Global Authentication & Tenant State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('kdm_auth_token') || localStorage.getItem('kdm_mock_auth') === 'true'
  )
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true)
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
  const [organizations, setOrganizations] = useState<Membership[]>([])
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null)
  
  // UI views
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Input fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgCountry, setOrgCountry] = useState('Singapore')
  const [orgCurrency, setOrgCurrency] = useState('SGD')
  const [orgTaxId, setOrgTaxId] = useState('')
  
  // Alert states
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  // Mock mode fallback if API server is not running
  const [isMockMode, setIsMockMode] = useState<boolean>(false)

  // Dropdown active select in gate page and auth transition state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [orgSearchQuery, setOrgSearchQuery] = useState('')
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  
  // UI states for top navigation bar and mini menus
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  // Inner Dashboard Tab states
  const [activeTab, setActiveTab] = useState<TabId>('Home')
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingBillId, setEditingBillId] = useState<string | null>(null)
  const [editingPoId, setEditingPoId] = useState<string | null>(null)
  const [reconcileItems, setReconcileItems] = useState<ReconcileItem[]>(INITIAL_RECONCILE_ITEMS)
  const [reconciledCount, setReconciledCount] = useState(0)
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false)
  const [quoteDrawerOpen, setQuoteDrawerOpen] = useState(false)

  // Dynamic countries & currencies metadata loaded from database
  const [countriesList, setCountriesList] = useState<SelectOption[]>(FALLBACK_COUNTRIES)
  const [currenciesList, setCurrenciesList] = useState<SelectOption[]>(FALLBACK_CURRENCIES)

  // Load Seeded Country & Currency lists from Django Database API on Mount
  useEffect(() => {
    apiService.getMetadata()
      .then(data => {
        const countries = data.countries.map(c => ({
          value: c.name,
          label: `${c.name} (${c.code})`
        }))
        const currencies = data.currencies.map(c => ({
          value: c.code,
          label: `${c.code} (${c.name}, ${c.symbol})`
        }))
        setCountriesList(countries)
        setCurrenciesList(currencies)
        // Auto select first seeded item if defaults aren't initialized
        if (countries.length > 0) setOrgCountry(countries[0].value)
        if (currencies.length > 0) setOrgCurrency(currencies[0].value)
      })
      .catch(err => {
        console.warn("Django is offline, loaded offline seeder choices.", err)
      })
  }, [])

  // Helper to transition routes without hard page reloads
  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
      window.dispatchEvent(new Event('popstate'))
    }
  }

  // Redirect legacy hash URLs to proper clean path routing
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash
      if (hash.startsWith('#/')) {
        const cleanPath = hash.substring(2)
        window.location.hash = ''
        window.history.replaceState(null, '', '/' + cleanPath)
        window.dispatchEvent(new Event('popstate'))
      }
    }
  }, [])

  // 1. Sync React State to Browser URL Path
  useEffect(() => {
    if (isCheckingAuth) return // Wait for auth session checking to complete before making any redirection decisions

    if (!isAuthenticated) {
      if (authView === 'signup') {
        if (window.location.pathname !== '/signup') {
          navigateTo('/signup')
        }
      } else {
        if (window.location.pathname !== '/login') {
          navigateTo('/login')
        }
      }
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
      if (window.location.pathname !== targetPath) {
        navigateTo(targetPath)
      }
    } else {
      if (window.location.pathname !== '/organizations' && !window.location.pathname.startsWith('/org/')) {
        navigateTo('/organizations')
      }
    }
  }, [isAuthenticated, isCheckingAuth, authView, activeOrg, activeTab, editingInvoiceId, editingQuoteId])

  // 2. Sync Browser URL Path Back to React State
  useEffect(() => {
    if (isCheckingAuth) return // Delay url mapping until user credentials and roles are parsed

    const handlePathChange = () => {
      const path = window.location.pathname
      
      if (!isAuthenticated) {
        if (path === '/signup') {
          setAuthView('signup')
        } else if (path === '/login') {
          setAuthView('login')
        }
        return
      }

      if (path.startsWith('/org/')) {
        const parts = path.split('/')
        const orgIdOrName = parts[2]
        const tab = parts[3] as any
        const editId = parts[4] || null

        if (organizations.length > 0) {
          const found = organizations.find(m => 
            cleanOrgNameForUrl(m.organization.name) === orgIdOrName || 
            m.organization.id === orgIdOrName
          )
          if (found) {
            if (!activeOrg || activeOrg.id !== found.organization.id) {
              setActiveOrg(found.organization)
            }
            if (tab && ['Home', 'SalesOverview', 'Invoices', 'OnlinePayments', 'Quotes', 'Products', 'Customers', 'SalesSettings', 'PurchasesOverview', 'Bills', 'PurchaseOrders', 'Cheque', 'Expenses', 'Suppliers', 'PurchasesSettings', 'FixedAssets', 'Payroll', 'AllReports', 'AccountTransactions', 'BalanceSheet', 'ProfitAndLoss', 'ReportingSettings', 'reconcile', 'ChartOfAccounts', 'AccountingSettings', 'Contacts', 'ContactsSettings', 'TaxRates', 'CreateInvoice', 'CreateQuote', 'EditInvoice', 'EditQuote', 'UserProfile'].includes(tab)) {
              if (activeTab !== tab) {
                setActiveTab(tab)
              }
              if (tab === 'EditInvoice') {
                if (editingInvoiceId !== editId) {
                  setEditingInvoiceId(editId)
                }
              } else if (tab === 'EditQuote') {
                if (editingQuoteId !== editId) {
                  setEditingQuoteId(editId)
                }
              }
            }
          } else {
            setActiveOrg(null)
            navigateTo('/organizations')
          }
        }
      } else if (path === '/organizations') {
        if (activeOrg !== null) {
          setActiveOrg(null)
        }
      } else {
        navigateTo('/organizations')
      }
    }

    window.addEventListener('popstate', handlePathChange)
    
    if (isAuthenticated && organizations.length > 0) {
      handlePathChange()
    }

    return () => {
      window.removeEventListener('popstate', handlePathChange)
    }
  }, [isAuthenticated, isCheckingAuth, organizations, activeOrg, activeTab, editingInvoiceId, editingQuoteId])

  // Auto-check authentication status on mount
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
      // Check if we have an active, persisted mock sandbox session
      if (localStorage.getItem('kdm_mock_auth') === 'true') {
        console.warn("Django API is offline. Automatically restoring active mock sandbox session.")
        setIsMockMode(true)
        setIsAuthenticated(true)
        setCurrentUser({
          id: 'mock-user-1',
          email: localStorage.getItem('kdm_mock_auth_email') || 'demo@saadbinmunir.com',
          first_name: localStorage.getItem('kdm_mock_auth_first') || 'Saad',
          last_name: localStorage.getItem('kdm_mock_auth_last') || 'Bin Munir',
          created_at: new Date().toISOString()
        })
        
        const mockMemberships: Membership[] = [
          {
            id: 'memb-1',
            organization: {
              id: 'org-1',
              name: 'Saad Bin Munir Software Ltd',
              country: 'Pakistan',
              currency: 'PKR',
              tax_id: 'NTN-49102-PK',
              created_at: new Date().toISOString()
            },
            role: 'Admin',
            permissions: {},
            joined_at: new Date().toISOString()
          },
          {
            id: 'memb-2',
            organization: {
              id: 'org-2',
              name: 'Kodmarc International LLC',
              country: 'Singapore',
              currency: 'SGD',
              tax_id: 'REG-2026-983',
              created_at: new Date().toISOString()
            },
            role: 'User',
            permissions: { sales: true, contacts: true, payroll: false, reporting: false },
            joined_at: new Date().toISOString()
          }
        ]
        setOrganizations(mockMemberships)
        setSelectedOrgId('org-1')
      }
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const loadOrganizations = async () => {
    try {
      const list = await apiService.getOrganizations()
      setOrganizations(list)
      if (list.length > 0) {
        setSelectedOrgId(list[0].organization.id)
      }
    } catch (e: any) {
      console.error("Failed to load organizations:", e.message)
    }
  }

  // Handle Signup
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
      setErrorMsg("Please fill in all fields.")
      return
    }

    setAuthStatus('loading')

    try {
      const res = await apiService.signup(email, password, firstName, lastName)
      
      // Save credentials programmatically
      if (navigator.credentials) {
        try {
          let cred
          if ((window as any).PasswordCredential) {
            try {
              cred = new (window as any).PasswordCredential(formEl)
            } catch {
              cred = new (window as any).PasswordCredential({
                id: email,
                password: password,
                name: firstName ? `${firstName} ${lastName}` : email
              })
            }
            navigator.credentials.store(cred).catch(() => {})
          }
        } catch (err) {
          console.warn("Credential store error:", err)
        }
      }

      setAuthStatus('success')
      setSuccessMsg("Account created successfully! Preparing your ledger...")
      
      isSubmittingNativelyRef.current = true
      setTimeout(() => {
        if (typeof (formEl as any).requestSubmit === 'function') {
          (formEl as any).requestSubmit()
        } else {
          formEl.submit()
        }
      }, 50)

      setTimeout(() => {
        setCurrentUser(res.user)
        setIsAuthenticated(true)
        setIsMockMode(false)
        setAuthStatus('idle')
        loadOrganizations()
      }, 1500)
    } catch (e: any) {
      setAuthStatus('idle')
      setErrorMsg(e.message || "Failed to sign up.")
    }
  }

  // Handle Login
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
      setErrorMsg("Please fill in both email and password.")
      return
    }

    setAuthStatus('loading')

    try {
      const res = await apiService.login(email, password)
      
      // Save credentials programmatically
      if (navigator.credentials) {
        try {
          let cred
          if ((window as any).PasswordCredential) {
            try {
              cred = new (window as any).PasswordCredential(formEl)
            } catch {
              cred = new (window as any).PasswordCredential({
                id: email,
                password: password
              })
            }
            navigator.credentials.store(cred).catch(() => {})
          }
        } catch (err) {
          console.warn("Credential store error:", err)
        }
      }

      setAuthStatus('success')
      setSuccessMsg("Logged in successfully! Loading your workspace...")
      
      isSubmittingNativelyRef.current = true
      setTimeout(() => {
        if (typeof (formEl as any).requestSubmit === 'function') {
          (formEl as any).requestSubmit()
        } else {
          formEl.submit()
        }
      }, 50)

      setTimeout(() => {
        setCurrentUser(res.user)
        setIsAuthenticated(true)
        setIsMockMode(false)
        setAuthStatus('idle')
        setOrganizations([]) 
        apiService.getOrganizations().then(list => {
          setOrganizations(list)
          if (list.length > 0) {
            setSelectedOrgId(list[0].organization.id)
          }
        })
      }, 1500)
    } catch (err: any) {
      if (err.message.includes("Failed to fetch") || err.message.includes("error occurred")) {
        console.warn("Backend API is offline. Activating Offline Sandbox for preview.")
        setAuthStatus('success')
        setSuccessMsg("Offline preview activated! Redirecting to sandbox...")
        
        if (navigator.credentials) {
          try {
            let cred
            if ((window as any).PasswordCredential) {
              try {
                cred = new (window as any).PasswordCredential(formEl)
              } catch {
                cred = new (window as any).PasswordCredential({
                  id: email,
                  password: password
                })
              }
              navigator.credentials.store(cred).catch(() => {})
            }
          } catch (err) {
            console.warn("Mock credential store error:", err)
          }
        }

        isSubmittingNativelyRef.current = true
        setTimeout(() => {
          if (typeof (formEl as any).requestSubmit === 'function') {
            (formEl as any).requestSubmit()
          } else {
            formEl.submit()
          }
        }, 50)

        setTimeout(() => {
          activateMockMode()
          setAuthStatus('idle')
        }, 1500)
      } else {
        setAuthStatus('idle')
        setErrorMsg(err.message || "Invalid credentials.")
      }
    }
  }

  // Fallback Mock Mode Setup
  const activateMockMode = () => {
    localStorage.setItem('kdm_mock_auth', 'true')
    localStorage.setItem('kdm_mock_auth_email', email || 'demo@saadbinmunir.com')
    localStorage.setItem('kdm_mock_auth_first', firstName || 'Saad')
    localStorage.setItem('kdm_mock_auth_last', lastName || 'Bin Munir')

    setIsMockMode(true)
    setIsAuthenticated(true)
    setCurrentUser({
      id: 'mock-user-1',
      email: email || 'demo@saadbinmunir.com',
      first_name: firstName || 'Saad',
      last_name: lastName || 'Bin Munir',
      created_at: new Date().toISOString()
    })
    
    const mockMemberships: Membership[] = [
      {
        id: 'memb-1',
        organization: {
          id: 'org-1',
          name: 'Saad Bin Munir Software Ltd',
          country: 'Pakistan',
          currency: 'PKR',
          tax_id: 'NTN-49102-PK',
          created_at: new Date().toISOString()
        },
        role: 'Admin',
        permissions: {},
        joined_at: new Date().toISOString()
      },
      {
        id: 'memb-2',
        organization: {
          id: 'org-2',
          name: 'Kodmarc International LLC',
          country: 'Singapore',
          currency: 'SGD',
          tax_id: 'REG-2026-983',
          created_at: new Date().toISOString()
        },
        role: 'User',
        permissions: { sales: true, contacts: true, payroll: false, reporting: false }, // Mocked tab lock seeder
        joined_at: new Date().toISOString()
      }
    ]
    setOrganizations(mockMemberships)
    setSelectedOrgId('org-1')
  }

  // Handle Logout
  const handleLogout = async () => {
    // Clear persisted mock sandbox session tokens
    localStorage.removeItem('kdm_mock_auth')
    localStorage.removeItem('kdm_mock_auth_email')
    localStorage.removeItem('kdm_mock_auth_first')
    localStorage.removeItem('kdm_mock_auth_last')

    try {
      if (!isMockMode) {
        await apiService.logout()
      }
    } catch {
      // Ignore
    }
    // Reset state
    setIsAuthenticated(false)
    setCurrentUser(null)
    setOrganizations([])
    setActiveOrg(null)
    setIsMockMode(false)
    setEmail('')
    setPassword('')
    setOrgDropdownOpen(false)
    setProfileDropdownOpen(false)
    setActiveTab('Home')
    setSuccessMsg(null)
    setErrorMsg(null)
    setAuthStatus('idle')
    setSelectedOrgId('')
    setOrgSearchQuery('')
    setEditingOrg(null)
  }

  // Handle Create or Update Organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!orgName) {
      setErrorMsg("Please provide a company name.")
      return
    }

    if (editingOrg) {
      if (isMockMode) {
        setOrganizations(prev => prev.map(m => {
          if (m.organization.id === editingOrg.id) {
            return {
              ...m,
              organization: {
                ...m.organization,
                name: orgName,
                country: orgCountry,
                currency: orgCurrency,
                tax_id: orgTaxId || 'N/A'
              }
            }
          }
          return m
        }))
        setIsCreateModalOpen(false)
        setEditingOrg(null)
        setOrgName('')
        setOrgTaxId('')
        return
      }

      try {
        const updatedOrg = await apiService.updateOrganization(editingOrg.id, orgName, orgCountry, orgCurrency, orgTaxId)
        setOrganizations(prev => prev.map(m => {
          if (m.organization.id === editingOrg.id) {
            return {
              ...m,
              organization: updatedOrg
            }
          }
          return m
        }))
        setIsCreateModalOpen(false)
        setEditingOrg(null)
        setOrgName('')
        setOrgTaxId('')
      } catch (e: any) {
        setErrorMsg(e.message || "Failed to update organization.")
      }
      return
    }

    if (isMockMode) {
      const newOrg: Organization = {
        id: `mock-org-${Date.now()}`,
        name: orgName,
        country: orgCountry,
        currency: orgCurrency,
        tax_id: orgTaxId || 'N/A',
        created_at: new Date().toISOString()
      }
      const newMemb: Membership = {
        id: `mock-memb-${Date.now()}`,
        organization: newOrg,
        role: 'Admin',
        permissions: {},
        joined_at: new Date().toISOString()
      }
      setOrganizations(prev => [...prev, newMemb])
      setSelectedOrgId(newOrg.id)
      setIsCreateModalOpen(false)
      setOrgName('')
      setOrgTaxId('')
      return
    }

    try {
      const membership = await apiService.createOrganization(orgName, orgCountry, orgCurrency, orgTaxId)
      setOrganizations(prev => [...prev, membership])
      setSelectedOrgId(membership.organization.id)
      setIsCreateModalOpen(false)
      setOrgName('')
      setOrgTaxId('')
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to create organization.")
    }
  }

  // Handle Delete Organization
  const handleDeleteOrg = async (orgId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Organization',
      message: 'Are you sure you want to permanently delete this organization? All memberships and ledger configurations will be removed.',
      confirmText: 'Delete Organization',
      isDestructive: true
    })
    if (!confirmed) return

    setErrorMsg(null)
    if (isMockMode) {
      setOrganizations(prev => prev.filter(m => m.organization.id !== orgId))
      if (selectedOrgId === orgId) {
        setSelectedOrgId('')
      }
      return
    }
    try {
      await apiService.deleteOrganization(orgId)
      setOrganizations(prev => prev.filter(m => m.organization.id !== orgId))
      if (selectedOrgId === orgId) {
        setSelectedOrgId('')
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to delete organization.")
    }
  }

  const handleReconcile = (id: string) => {
    setReconcileItems(prev => prev.filter(item => item.id !== id))
    setReconciledCount(prev => prev + 1)
  }

  const resetReconciliation = () => {
    setReconcileItems(INITIAL_RECONCILE_ITEMS)
  }

  // View Mapper
  if (isCheckingAuth) {
    return null // Return a silent blank frame during initial auth sync to avoid login flickers or loading screens
  }

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

  if (isAuthenticated && !activeOrg) {
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
        isMockMode={isMockMode}
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
      {/* Helper to render empty sub-ledgers elegantly */}
      {(() => {
        const noInfoTabs: Record<string, string> = {
          OnlinePayments: 'Online Payments',
          Cheque: 'Cheque Payments',
          Expenses: 'Business Expenses',
          FixedAssets: 'Fixed Assets',
          Payroll: 'Payroll Hub',
          AllReports: 'All Financial Reports',
          AccountTransactions: 'Account Transactions Report',
          BalanceSheet: 'Balance Sheet Statement',
          ProfitAndLoss: 'Profit & Loss Statement',
          ReportingSettings: 'Reporting Settings'
        }

        const tabTitle = noInfoTabs[activeTab]
        if (tabTitle) {
          return (
            <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-16 text-center max-w-lg mx-auto space-y-6 font-sans animate-fadeIn">
              <div className="mx-auto h-16 w-16 bg-[#0F5B38]/10 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner text-lg font-bold">
                ℹ
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800">{tabTitle}</h2>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">No Active Transactions</p>
                <p className="text-slate-400 text-xs font-semibold max-w-sm mx-auto leading-relaxed">
                  There are currently no transaction entries recorded under this ledger for the active organization. Active logs will populate here dynamically once compiled.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('Home')}
                className="text-xs font-bold text-[#0F5B38] bg-emerald-50 hover:bg-emerald-100/60 px-5 py-2.5 rounded-[3px] border border-emerald-100 transition duration-300 cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          )
        }
        return null
      })()}

      {activeTab === 'Home' && (
        <HomeTab
          activeOrg={activeOrg}
          setActiveTab={setActiveTab}
          reconcileItems={reconcileItems}
          resetReconciliation={resetReconciliation}
          reconciledCount={reconciledCount}
        />
      )}
      
      {activeTab === 'reconcile' && (
        <BankAccountsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          reconcileItems={reconcileItems}
          resetReconciliation={resetReconciliation}
          handleReconcile={handleReconcile}
        />
      )}

      {activeTab === 'Contacts' && (
        <ContactsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          initialFilter="All"
        />
      )}
      
      {activeTab === 'Customers' && (
        <ContactsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          initialFilter="Customer"
        />
      )}
      
      {activeTab === 'Suppliers' && (
        <ContactsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          initialFilter="Supplier"
        />
      )}
      
      {activeTab === 'ChartOfAccounts' && (
        <ChartOfAccountsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
        />
      )}
      
      {activeTab === 'TaxRates' && (
        <TaxRatesTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
        />
      )}
      
      {activeTab === 'Products' && (
        <ProductsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
        />
      )}
      
      {activeTab === 'SalesOverview' && (
        <SalesOverviewTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          onCreateInvoiceClick={() => {
            setActiveTab('CreateInvoice');
          }}
          onCreateQuoteClick={() => {
            setActiveTab('CreateQuote');
          }}
        />
      )}

      {activeTab === 'PurchasesOverview' && (
        <PurchasesOverviewTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          onCreateBillClick={() => {
            setEditingBillId(null)
            setActiveTab('CreateBill')
          }}
          onCreatePOClick={() => {
            setEditingPoId(null)
            setActiveTab('CreatePurchaseOrder')
          }}
        />
      )}

      {activeTab === 'Invoices' && (
        <InvoicesTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          autoOpenDrawer={invoiceDrawerOpen}
          onCloseAutoOpen={() => setInvoiceDrawerOpen(false)}
          setActiveTab={setActiveTab}
          onEditInvoice={(id) => {
            setEditingInvoiceId(id)
            setActiveTab('EditInvoice')
          }}
          onCreateNewInvoice={() => {
            setEditingInvoiceId(null)
            setActiveTab('CreateInvoice')
          }}
        />
      )}

      {['SalesSettings', 'PurchasesSettings', 'AccountingSettings', 'ContactsSettings'].includes(activeTab) && (
        <SettingsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          activeTab={activeTab as any}
          setActiveTab={setActiveTab}
          onOrgUpdate={(updated) => {
            setActiveOrg(updated);
            setOrganizations(prev => prev.map(m => {
              if (m.organization.id === updated.id) {
                return { ...m, organization: updated };
              }
              return m;
            }));
          }}
        />
      )}

      {activeTab === 'Bills' && (
        <BillsTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          onEditBill={(id) => {
            setEditingBillId(id)
            setActiveTab('EditBill')
          }}
          onCreateNewBill={() => {
            setEditingBillId(null)
            setActiveTab('CreateBill')
          }}
        />
      )}

      {activeTab === 'Quotes' && (
        <QuotesTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          autoOpenDrawer={quoteDrawerOpen}
          onCloseAutoOpen={() => setQuoteDrawerOpen(false)}
          setActiveTab={setActiveTab}
          onEditQuote={(id) => {
            setEditingQuoteId(id)
            setActiveTab('EditQuote')
          }}
          onCreateNewQuote={() => {
            setEditingQuoteId(null)
            setActiveTab('CreateQuote')
          }}
          onConvertToInvoice={async (quote) => {
            try {
              if (isMockMode) {
                // Update quote status to Invoiced in local storage
                const savedQuotes = localStorage.getItem(`kdm_mock_quotes_${activeOrg!.id}`)
                const list = savedQuotes ? JSON.parse(savedQuotes) : []
                const updatedList = list.map((q: any) => {
                  if (q.id === quote.id) {
                    return { ...q, status: 'Invoiced' }
                  }
                  return q
                })
                localStorage.setItem(`kdm_mock_quotes_${activeOrg!.id}`, JSON.stringify(updatedList))
              } else {
                // API database quote status update
                await apiService.updateQuote(quote.id!, { status: 'Invoiced' })
              }

              // Transition to CreateInvoice and pre-populate with quote details
              setEditingInvoiceId(`convert-quote-${quote.id!}`)
              setActiveTab('CreateInvoice')
            } catch (err: any) {
              alert("Conversion failed: " + err.message)
            }
          }}
        />
      )}

      {(activeTab === 'CreateInvoice' || activeTab === 'EditInvoice') && (
        <CreateInvoiceTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          editingInvoiceId={activeTab === 'EditInvoice' ? editingInvoiceId : null}
          setEditingInvoiceId={setEditingInvoiceId}
        />
      )}

      {(activeTab === 'CreateQuote' || activeTab === 'EditQuote') && (
        <CreateQuoteTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          editingQuoteId={activeTab === 'EditQuote' ? editingQuoteId : null}
          setEditingQuoteId={setEditingQuoteId}
          setEditingInvoiceId={setEditingInvoiceId}
        />
      )}

      {activeTab === 'PurchaseOrders' && (
        <PurchaseOrdersTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          onEditPO={(id) => {
            setEditingPoId(id)
            setActiveTab('EditPurchaseOrder')
          }}
          onCreateNewPO={() => {
            setEditingPoId(null)
            setActiveTab('CreatePurchaseOrder')
          }}
          onConvertToBill={(po) => {
            setEditingBillId(`convert-po-${po.id}`)
            setActiveTab('CreateBill')
          }}
        />
      )}

      {(activeTab === 'CreateBill' || activeTab === 'EditBill') && (
        <CreateBillTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          editingBillId={activeTab === 'EditBill' ? editingBillId : null}
          setEditingBillId={setEditingBillId}
        />
      )}

      {(activeTab === 'CreatePurchaseOrder' || activeTab === 'EditPurchaseOrder') && (
        <CreatePurchaseOrderTab
          activeOrg={activeOrg!}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
          editingPoId={activeTab === 'EditPurchaseOrder' ? editingPoId : null}
          setEditingPoId={setEditingPoId}
          setEditingBillId={setEditingBillId}
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
      
      {activeTab === 'Projects' && (
        <PlaceholderTab
          title="Project Costing"
          description="The Project Costing ledger is aligned. Run custom employee task trackings, monitor billed project hours, and generate client job logs here."
          icon={Briefcase}
          onReturnHome={() => setActiveTab('Home')}
        />
      )}

      {activeTab === 'CreateTransferMoney' && activeOrg && (
        <CreateTransferMoney
          activeOrg={activeOrg}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'CreateSpendMoney' && activeOrg && (
        <CreateSpendReceiveMoney
          type="Spend"
          activeOrg={activeOrg}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'CreateReceiveMoney' && activeOrg && (
        <CreateSpendReceiveMoney
          type="Receive"
          activeOrg={activeOrg}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'CreateManualJournal' && activeOrg && (
        <CreateManualJournal
          activeOrg={activeOrg}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'UserProfile' && (
        <UserProfileTab
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          isMockMode={isMockMode}
          setActiveTab={setActiveTab}
        />
      )}
    </DashboardLayout>
  )
}

export default App
