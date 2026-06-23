import React, { useState, useEffect } from 'react'
import {
  Calculator,
  Building,
  Check,
  Plus,
  LogOut,
  UserCheck,
  Settings,
  Users
} from 'lucide-react'
import type { User, Membership, Organization } from '../services/api'
import type { TabId } from '../types/tabs'

const cleanOrgNameForUrl = (name: string) => name.replace(/\s+/g, '')

interface DashboardLayoutProps {
  currentUser: User | null
  organizations: Membership[]
  activeOrg: Organization | null
  setActiveOrg: (org: Organization | null) => void
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  orgDropdownOpen: boolean
  setOrgDropdownOpen: (open: boolean) => void
  profileDropdownOpen: boolean
  setProfileDropdownOpen: (open: boolean) => void
  handleLogout: () => void
  children: React.ReactNode
}

interface DropdownItem {
  key:
    | 'Home'
    | 'SalesOverview'
    | 'Invoices'
    | 'OnlinePayments'
    | 'Quotes'
    | 'Products'
    | 'Customers'
    | 'SalesSettings'
    | 'PurchasesOverview'
    | 'Bills'
    | 'PurchaseOrders'
    | 'Cheque'
    | 'Expenses'
    | 'Suppliers'
    | 'PurchasesSettings'
    | 'FixedAssets'
    | 'Payroll'
    | 'AllReports'
    | 'AccountTransactions'
    | 'BalanceSheet'
    | 'ProfitAndLoss'
    | 'CashFlowStatement'
    | 'ReportingSettings'
    | 'BankAccounts'
    | 'ChartOfAccounts'
    | 'TaxRates'
    | 'AccountingSettings'
    | 'Contacts'
    | 'ContactsSettings'
    | 'CreateInvoice'
    | 'CreateQuote'
    | 'EditInvoice'
    | 'EditQuote'
  label: string
  permissionKey?: string
}

export function DashboardLayout({
  currentUser,
  organizations,
  activeOrg,
  setActiveOrg,
  activeTab,
  setActiveTab,
  orgDropdownOpen,
  setOrgDropdownOpen,
  profileDropdownOpen,
  setProfileDropdownOpen,
  handleLogout,
  children
}: DashboardLayoutProps) {
  const [activeDropdown, setActiveDropdown] = useState<'sales' | 'purchases' | 'reports' | 'accounting' | 'contacts' | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const handleTabClick = (tabKey: TabId, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) {
      return
    }
    e.preventDefault()
    setActiveTab(tabKey)
    setActiveDropdown(null)
  }

  const currentMemb = organizations.find(m => m.organization.id === activeOrg?.id)
  const isUserRole = currentMemb?.role === 'User'
  const userPermissions = currentMemb?.permissions || {}

  // Child key → parent group key (for cascading deny: if parent=false, all children blocked)
  const CHILD_TO_PARENT: Record<string, string> = {
    invoices: 'sales', quotes: 'sales', products: 'sales', customers: 'sales',
    online_payments: 'sales', sales_settings: 'sales',
    bills: 'purchase', purchase_orders: 'purchase', cheque: 'purchase',
    expenses: 'purchase', suppliers: 'purchase', purchases_settings: 'purchase',
    chart_of_accounts: 'accounts', tax_rates: 'accounts', accounting_settings: 'accounts',
    all_reports: 'reporting', account_transactions: 'reporting', balance_sheet: 'reporting',
    profit_and_loss: 'reporting', cash_flow: 'reporting', reporting_settings: 'reporting',
    contacts_settings: 'contacts',
  }

  const isTabAllowed = (permKey?: string): boolean => {
    if (!isUserRole) return true
    if (!permKey) return true
    const parentKey = CHILD_TO_PARENT[permKey]
    if (parentKey && userPermissions[parentKey] === false) return false
    if (permKey in userPermissions) return userPermissions[permKey] !== false
    return true
  }

  useEffect(() => {
    // Block UsersSettings for non-admins
    if (activeTab === 'UsersSettings' && isUserRole) {
      setActiveTab('Home')
      return
    }

    const permissionMap: Record<string, string> = {
      Home: '',
      SalesOverview: 'sales',
      Invoices: 'invoices',
      OnlinePayments: 'online_payments',
      Quotes: 'quotes',
      Products: 'products',
      Customers: 'customers',
      SalesSettings: 'sales_settings',
      PurchasesOverview: 'purchase',
      Bills: 'bills',
      PurchaseOrders: 'purchase_orders',
      Cheque: 'cheque',
      Expenses: 'expenses',
      Suppliers: 'suppliers',
      PurchasesSettings: 'purchases_settings',
      FixedAssets: 'fixed_assets',
      Payroll: 'payroll',
      AllReports: 'reporting',
      AccountTransactions: 'account_transactions',
      BalanceSheet: 'balance_sheet',
      ProfitAndLoss: 'profit_and_loss',
      CashFlowStatement: 'cash_flow',
      ReportingSettings: 'reporting_settings',
      BankAccounts: 'banking',
      ChartOfAccounts: 'chart_of_accounts',
      TaxRates: 'tax_rates',
      AccountingSettings: 'accounting_settings',
      Contacts: 'contacts',
      ContactsSettings: 'contacts_settings',
      CreateInvoice: 'invoices',
      CreateQuote: 'quotes',
      EditInvoice: 'invoices',
      EditQuote: 'quotes',
      CreateBill: 'bills',
      EditBill: 'bills',
      CreatePurchaseOrder: 'purchase_orders',
      EditPurchaseOrder: 'purchase_orders',
      Projects: 'projects',
      UsersSettings: '',
    }

    const permKey = permissionMap[activeTab]
    if (permKey !== undefined && !isTabAllowed(permKey)) {
      setActiveTab('Home')
    }
  }, [activeTab, currentMemb])

  const salesDropdownItems: DropdownItem[] = [
    { key: 'SalesOverview', label: 'Sales overview', permissionKey: 'sales' },
    { key: 'Invoices', label: 'Invoices', permissionKey: 'invoices' },
    { key: 'OnlinePayments', label: 'Online payments', permissionKey: 'online_payments' },
    { key: 'Quotes', label: 'Quotes', permissionKey: 'quotes' },
    { key: 'Products', label: 'Products and services', permissionKey: 'products' },
    { key: 'Customers', label: 'Customers', permissionKey: 'customers' },
    { key: 'SalesSettings', label: 'Sales settings', permissionKey: 'sales_settings' },
  ]

  const purchasesDropdownItems: DropdownItem[] = [
    { key: 'PurchasesOverview', label: 'Purchases overview', permissionKey: 'purchase' },
    { key: 'Bills', label: 'Bills', permissionKey: 'bills' },
    { key: 'PurchaseOrders', label: 'Purchase orders', permissionKey: 'purchase_orders' },
    { key: 'Cheque', label: 'Cheque', permissionKey: 'cheque' },
    { key: 'Expenses', label: 'Expenses', permissionKey: 'expenses' },
    { key: 'Suppliers', label: 'Suppliers', permissionKey: 'suppliers' },
    { key: 'PurchasesSettings', label: 'Purchases settings', permissionKey: 'purchases_settings' },
  ]

  const reportsDropdownItems: DropdownItem[] = [
    { key: 'AllReports', label: 'All reports', permissionKey: 'reporting' },
    { key: 'AccountTransactions', label: 'Account Transactions', permissionKey: 'account_transactions' },
    { key: 'BalanceSheet', label: 'Balance Sheet', permissionKey: 'balance_sheet' },
    { key: 'ProfitAndLoss', label: 'Profit and Loss', permissionKey: 'profit_and_loss' },
    { key: 'CashFlowStatement', label: 'Cash Flow Statement', permissionKey: 'cash_flow' },
    { key: 'ReportingSettings', label: 'Reporting settings', permissionKey: 'reporting_settings' },
  ]

  const accountingDropdownItems: DropdownItem[] = [
    { key: 'BankAccounts', label: 'Bank accounts', permissionKey: 'banking' },
    { key: 'ChartOfAccounts', label: 'Chart of accounts', permissionKey: 'chart_of_accounts' },
    { key: 'TaxRates', label: 'Tax rates', permissionKey: 'tax_rates' },
    { key: 'AccountingSettings', label: 'Accounting settings', permissionKey: 'accounting_settings' },
  ]

  const contactsDropdownItems: DropdownItem[] = [
    { key: 'Contacts', label: 'All Contacts', permissionKey: 'contacts' },
    { key: 'Customers', label: 'Customers', permissionKey: 'customers' },
    { key: 'Suppliers', label: 'Suppliers', permissionKey: 'suppliers' },
    { key: 'ContactsSettings', label: 'Contacts settings', permissionKey: 'contacts_settings' },
  ]

  const allowedSalesItems = salesDropdownItems.filter(item => isTabAllowed(item.permissionKey))
  const allowedPurchasesItems = purchasesDropdownItems.filter(item => isTabAllowed(item.permissionKey))
  const allowedReportsItems = reportsDropdownItems.filter(item => isTabAllowed(item.permissionKey))
  const allowedAccountingItems = accountingDropdownItems.filter(item => isTabAllowed(item.permissionKey))
  const allowedContactsItems = contactsDropdownItems.filter(item => isTabAllowed(item.permissionKey))

  const isSalesActive = salesDropdownItems.some(i => i.key === activeTab)
  const isPurchasesActive = purchasesDropdownItems.some(i => i.key === activeTab)
  const isReportsActive = reportsDropdownItems.some(i => i.key === activeTab)
  const isAccountingActive = accountingDropdownItems.some(i => i.key === activeTab)
  const isContactsActive = contactsDropdownItems.some(i => i.key === activeTab)

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-[#071f13] font-sans antialiased flex flex-col">
      {/* Top Header Navigation */}
      <header className="bg-[#071f13] text-white shadow-md shrink-0 select-none">
        <div className="w-full px-6 lg:px-8">
          <div className="flex items-center justify-between h-[66px] w-full">

            {/* Left Section */}
            <div className="flex items-center space-x-4 py-1 select-none">
              <div className="flex items-center space-x-3 shrink-0">
                <div className="p-1.5 bg-white/10 rounded-[3px] shrink-0">
                  <Calculator className="h-4.5 w-4.5 text-emerald-300" />
                </div>

                {/* Organization Switcher Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setOrgDropdownOpen(!orgDropdownOpen)
                      setActiveDropdown(null)
                      setProfileDropdownOpen(false)
                    }}
                    className="flex items-center space-x-1.5 text-[15px] font-normal text-white hover:bg-white/10 px-2.5 py-1.5 rounded-[3px] transition cursor-pointer select-none truncate max-w-[180px]"
                  >
                    <span>{activeOrg?.name}</span>
                    <span className="text-[9px] text-emerald-300">▼</span>
                  </button>

                  {orgDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOrgDropdownOpen(false)}></div>
                      <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2.5 animate-fadeIn text-slate-800 font-sans">
                        <p className="text-[15px] text-slate-400 font-normal uppercase px-3 py-1.5 tracking-wider">Switch Organization</p>

                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {organizations.map(memb => (
                            <a
                              key={memb.id}
                              href={`/org/${cleanOrgNameForUrl(memb.organization.name)}/Home`}
                              onClick={(e) => {
                                if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) {
                                  setOrgDropdownOpen(false)
                                  return
                                }
                                e.preventDefault()
                                setActiveOrg(memb.organization)
                                setOrgDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-[3px] text-[15px] font-normal flex items-center justify-between cursor-pointer ${
                                memb.organization.id === activeOrg?.id
                                  ? 'bg-emerald-50 text-[#0F5B38]'
                                  : 'text-slate-650 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate pr-2">{memb.organization.name}</span>
                              {memb.organization.id === activeOrg?.id && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                            </a>
                          ))}
                        </div>

                        <div className="border-t border-slate-100 mt-2.5 pt-2 space-y-1">
                          <a
                            href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/ContactsSettings` : '#'}
                            onClick={(e) => {
                              if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) {
                                setOrgDropdownOpen(false)
                                return
                              }
                              e.preventDefault()
                              setActiveTab('ContactsSettings')
                              setOrgDropdownOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 rounded-[3px] text-[15px] font-normal text-[#0F5B38] hover:bg-emerald-50 flex items-center space-x-2 transition cursor-pointer"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Settings (Central Config)</span>
                          </a>

                          {!isUserRole && (
                            <a
                              href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/UsersSettings` : '#'}
                              onClick={(e) => {
                                if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) {
                                  setOrgDropdownOpen(false)
                                  return
                                }
                                e.preventDefault()
                                setActiveTab('UsersSettings')
                                setOrgDropdownOpen(false)
                              }}
                              className="w-full text-left px-3 py-2 rounded-[3px] text-[15px] font-normal text-[#0F5B38] hover:bg-emerald-50 flex items-center space-x-2 transition cursor-pointer"
                            >
                              <Users className="h-3.5 w-3.5" />
                              <span>Users &amp; Permissions</span>
                            </a>
                          )}

                          <a
                            href="/organizations"
                            onClick={(e) => {
                              if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) {
                                setOrgDropdownOpen(false)
                                return
                              }
                              e.preventDefault()
                              setActiveOrg(null)
                              setOrgDropdownOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 rounded-[3px] text-[15px] font-normal text-slate-500 hover:bg-slate-50 flex items-center space-x-2 transition cursor-pointer"
                          >
                            <Building className="h-3.5 w-3.5" />
                            <span>Change / Add Organization</span>
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Navigation Dropdown Headers */}
              <nav className="flex space-x-0.5 shrink-0 items-center">
                {/* 1. Home */}
                <a
                  href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/Home` : '#'}
                  onClick={(e) => handleTabClick('Home', e)}
                  className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                    activeTab === 'Home'
                      ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                      : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Home
                </a>

                {/* 2. Sales Dropdown */}
                {allowedSalesItems.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveDropdown(activeDropdown === 'sales' ? null : 'sales')
                        setOrgDropdownOpen(false)
                        setProfileDropdownOpen(false)
                      }}
                      className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                        isSalesActive
                          ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                          : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Sales
                    </button>

                    {activeDropdown === 'sales' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2 animate-fadeIn text-slate-800 font-sans">
                          {allowedSalesItems.map(item => (
                            <a
                              key={item.key}
                              href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/${item.key}` : '#'}
                              onClick={(e) => handleTabClick(item.key, e)}
                              className={`block w-full text-left px-3.5 py-2 rounded-[3px] text-[14px] transition cursor-pointer ${
                                activeTab === item.key
                                  ? 'bg-emerald-50 text-[#0F5B38] font-medium'
                                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 font-normal'
                              }`}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 3. Purchases Dropdown */}
                {allowedPurchasesItems.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveDropdown(activeDropdown === 'purchases' ? null : 'purchases')
                        setOrgDropdownOpen(false)
                        setProfileDropdownOpen(false)
                      }}
                      className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                        isPurchasesActive
                          ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                          : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Purchases
                    </button>

                    {activeDropdown === 'purchases' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2 animate-fadeIn text-slate-800 font-sans">
                          {allowedPurchasesItems.map(item => (
                            <a
                              key={item.key}
                              href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/${item.key}` : '#'}
                              onClick={(e) => handleTabClick(item.key, e)}
                              className={`block w-full text-left px-3.5 py-2 rounded-[3px] text-[14px] transition cursor-pointer ${
                                activeTab === item.key
                                  ? 'bg-emerald-50 text-[#0F5B38] font-medium'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal'
                              }`}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 4. Fixed Assets (Direct Link) */}
                {isTabAllowed('fixed_assets') && (
                  <a
                    href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/FixedAssets` : '#'}
                    onClick={(e) => handleTabClick('FixedAssets', e)}
                    className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                      activeTab === 'FixedAssets'
                        ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                        : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    Fixed Assets
                  </a>
                )}

                {/* 5. Payroll (Direct Link) */}
                {isTabAllowed('payroll') && (
                  <a
                    href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/Payroll` : '#'}
                    onClick={(e) => handleTabClick('Payroll', e)}
                    className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                      activeTab === 'Payroll'
                        ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                        : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    Payroll
                  </a>
                )}

                {/* 6. Projects (Direct Link) */}
                <a
                  href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/Projects` : '#'}
                  onClick={(e) => handleTabClick('Projects', e)}
                  className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                    activeTab === 'Projects'
                      ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                      : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Projects
                </a>

                {/* 7. Reports Dropdown */}
                {allowedReportsItems.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveDropdown(activeDropdown === 'reports' ? null : 'reports')
                        setOrgDropdownOpen(false)
                        setProfileDropdownOpen(false)
                      }}
                      className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                        isReportsActive
                          ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                          : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Reports
                    </button>

                    {activeDropdown === 'reports' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2 animate-fadeIn text-slate-800 font-sans">
                          {allowedReportsItems.map(item => (
                            <a
                              key={item.key}
                              href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/${item.key}` : '#'}
                              onClick={(e) => handleTabClick(item.key, e)}
                              className={`block w-full text-left px-3.5 py-2 rounded-[3px] text-[14px] transition cursor-pointer ${
                                activeTab === item.key
                                  ? 'bg-emerald-50 text-[#0F5B38] font-medium'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal'
                              }`}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 8. Accounting Dropdown */}
                {allowedAccountingItems.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveDropdown(activeDropdown === 'accounting' ? null : 'accounting')
                        setOrgDropdownOpen(false)
                        setProfileDropdownOpen(false)
                      }}
                      className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                        isAccountingActive
                          ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                          : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Accounting
                    </button>

                    {activeDropdown === 'accounting' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2 animate-fadeIn text-slate-800 font-sans">
                          {allowedAccountingItems.map(item => (
                            <a
                              key={item.key}
                              href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/${item.key}` : '#'}
                              onClick={(e) => handleTabClick(item.key, e)}
                              className={`block w-full text-left px-3.5 py-2 rounded-[3px] text-[14px] transition cursor-pointer ${
                                activeTab === item.key
                                  ? 'bg-emerald-50 text-[#0F5B38] font-medium'
                                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 font-normal'
                              }`}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 9. Contacts Dropdown */}
                {allowedContactsItems.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveDropdown(activeDropdown === 'contacts' ? null : 'contacts')
                        setOrgDropdownOpen(false)
                        setProfileDropdownOpen(false)
                      }}
                      className={`px-3 py-1.5 rounded-[3px] transition duration-200 cursor-pointer font-medium text-[15px] ${
                        isContactsActive
                          ? 'bg-white/15 text-white shadow-inner border-b-2 border-emerald-300'
                          : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Contacts
                    </button>

                    {activeDropdown === 'contacts' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2 animate-fadeIn text-slate-800 font-sans">
                          {allowedContactsItems.map(item => (
                            <a
                              key={item.key}
                              href={activeOrg ? `/org/${cleanOrgNameForUrl(activeOrg.name)}/${item.key}` : '#'}
                              onClick={(e) => handleTabClick(item.key, e)}
                              className={`block w-full text-left px-3.5 py-2 rounded-[3px] text-[14px] transition cursor-pointer ${
                                activeTab === item.key
                                  ? 'bg-emerald-50 text-[#0F5B38] font-medium'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal'
                              }`}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </nav>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-3 shrink-0 z-10 pl-4">
              <div className="relative">
                <button
                  onClick={() => {
                    setQuickAddOpen(!quickAddOpen)
                    setOrgDropdownOpen(false)
                    setActiveDropdown(null)
                    setProfileDropdownOpen(false)
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/15 text-emerald-200 hover:text-white rounded-full transition cursor-pointer flex items-center justify-center"
                  title="Create new"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>

                {quickAddOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setQuickAddOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2 animate-fadeIn text-slate-800 font-sans">
                      <div className="border-b border-slate-100 pb-1.5 mb-1.5 px-3">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Create new</p>
                      </div>
                      <div className="space-y-0.5 max-h-80 overflow-y-auto">
                        {[
                          { key: 'CreateInvoice' as TabId, label: 'Invoice' },
                          { key: 'CreateBill' as TabId, label: 'Bill' },
                          { key: 'Contacts' as TabId, label: 'Contact', action: () => {
                            localStorage.setItem('kdm_auto_open_contact_modal', 'true')
                          }},
                          { key: 'CreateQuote' as TabId, label: 'Quote' },
                          { key: 'CreatePurchaseOrder' as TabId, label: 'Purchase order' },
                          { key: 'CreateManualJournal' as TabId, label: 'Manual journal' },
                          { key: 'CreateSpendMoney' as TabId, label: 'Spend money' },
                          { key: 'CreateReceiveMoney' as TabId, label: 'Receive money' },
                          { key: 'CreateTransferMoney' as TabId, label: 'Transfer money' },
                        ].map(item => (
                          <button
                            key={item.label}
                            onClick={() => {
                              setQuickAddOpen(false)
                              if (item.action) item.action()
                              setActiveTab(item.key)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-[3px] text-[14px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Profile menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(!profileDropdownOpen)
                    setOrgDropdownOpen(false)
                    setActiveDropdown(null)
                  }}
                  className="flex items-center space-x-2 p-1 rounded-[3px] hover:bg-white/10 transition cursor-pointer select-none"
                >
                  <div className="h-7 w-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center border border-emerald-500/40 text-[15px] shrink-0 font-sans">
                    {currentUser?.first_name?.substring(0, 1).toUpperCase() || 'K'}
                  </div>
                  <span className="text-[15px] font-normal hidden sm:inline text-emerald-100/90 hover:text-white font-sans">
                    {currentUser?.first_name}
                  </span>
                </button>

                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-2.5 animate-fadeIn text-slate-800 font-sans">
                      <div className="px-3 py-2 border-b border-slate-105 mb-2">
                        <p className="text-[15px] font-normal text-slate-800 leading-tight">
                          {currentUser?.first_name} {currentUser?.last_name}
                        </p>
                        <p className="text-[15px] text-slate-400 font-normal truncate leading-none mt-1">
                          {currentUser?.email}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          setActiveTab('UserProfile')
                        }}
                        className="w-full text-left px-3 py-2 rounded-[3px] text-[15px] font-normal text-slate-650 hover:bg-slate-50 flex items-center space-x-2 transition cursor-pointer"
                      >
                        <UserCheck className="h-4.5 w-4.5 text-slate-400" />
                        <span>Account</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          handleLogout()
                        }}
                        className="w-full text-left px-3 py-2 rounded-[3px] text-[15px] font-normal text-rose-500 hover:bg-rose-50 flex items-center space-x-2 transition cursor-pointer"
                      >
                        <LogOut className="h-4.5 w-4.5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Pages Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 w-full space-y-8 animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  )
}
