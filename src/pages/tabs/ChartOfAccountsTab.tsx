import { useState, useEffect, useRef } from 'react'
import { Plus, Calculator, Search, ArrowLeft, Edit3, Archive, ArchiveRestore, FileText } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account, TaxRate, Invoice } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'

interface ChartOfAccountsTabProps {
  activeOrg: Organization
  onViewInvoice?: (id: string) => void
  onViewBill?: (id: string) => void
}

export function ChartOfAccountsTab({ activeOrg, onViewInvoice, onViewBill }: ChartOfAccountsTabProps) {
  const { showConfirm, showAlert } = usePopup()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [viewingAccount, setViewingAccount] = useState<Account | null>(null)
  const [accountingMethod, setAccountingMethod] = useState<'accrual' | 'cash'>('accrual')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [sortOption, setSortOption] = useState<'code-asc' | 'code-desc' | 'name-asc' | 'name-desc'>('code-asc')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Asset' | 'Liability' | 'Equity' | 'Expense' | 'Revenue' | 'Deactivated'>('All')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [classType, setClassType] = useState<'Revenue' | 'Expense' | 'Asset' | 'Liability' | 'Equity'>('Asset')
  const [accountType, setAccountType] = useState('Current Asset')
  const [taxRateId, setTaxRateId] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const filterOptions = [
    { key: 'All', label: 'All Accounts' },
    { key: 'Asset', label: 'Assets' },
    { key: 'Liability', label: 'Liabilities' },
    { key: 'Equity', label: 'Equity' },
    { key: 'Expense', label: 'Expenses' },
    { key: 'Revenue', label: 'Revenue' },
    { key: 'Deactivated', label: 'Deactivated' }
  ] as const

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [accountsData, taxRatesData, loadedInvoices, loadedBills] = await Promise.all([
        apiService.getAccounts(activeOrg.id),
        apiService.getTaxRates(activeOrg.id),
        apiService.getInvoices(activeOrg.id),
        apiService.getBills(activeOrg.id),
      ])
      setAccounts(accountsData)
      setTaxRates(taxRatesData)
      setInvoices(loadedInvoices)
      setBills(loadedBills)
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load accounts.')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeFilter])

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const handleToggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) visibleIds.forEach(id => next.delete(id))
    else visibleIds.forEach(id => next.add(id))
    setSelectedIds(next)
  }

  const handleBulkDeactivate = async () => {
    const list = Array.from(selectedIds)
    if (list.length === 0) return

    const isReactivating = activeFilter === 'Deactivated'
    const confirmed = await showConfirm({
      title: isReactivating ? 'Reactivate Selected' : 'Deactivate Selected',
      message: isReactivating
        ? `Reactivate ${list.length} selected account(s)?`
        : `Deactivate ${list.length} selected account(s)? Historical transactions are preserved.`,
      confirmText: isReactivating ? 'Reactivate' : 'Deactivate',
      isDestructive: !isReactivating
    })
    if (!confirmed) return

    setLoading(true)
    try {
      const newStatus = isReactivating
      if (isReactivating) {
        await Promise.all(list.map(id => apiService.patchAccount(id, { is_active: true }, activeOrg.id)))
      } else {
        await apiService.deleteAccountsBulk(activeOrg.id, list)
      }
      setAccounts(prev => prev.map(a => selectedIds.has(a.id) ? { ...a, is_active: newStatus } : a))
      setSelectedIds(new Set())
      showAlert({
        title: isReactivating ? 'Accounts Reactivated' : 'Accounts Deactivated',
        message: `${list.length} account(s) ${isReactivating ? 'reactivated' : 'deactivated'}.`,
        type: 'success'
      })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isModalOpen && lastActiveElementRef.current) {
      const el = lastActiveElementRef.current
      setTimeout(() => {
        if (el && document.body.contains(el)) el.focus()
      }, 50)
      lastActiveElementRef.current = null
    }
  }, [isModalOpen])

  const handleOpenAdd = () => {
    setEditingAccount(null)
    resetForm()
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleEditClick = (acc: Account) => {
    setEditingAccount(acc)
    setCode(acc.code)
    setName(acc.name)
    setClassType(acc.class_type)
    setAccountType(acc.type)
    setTaxRateId(acc.default_tax_rate ? (typeof acc.default_tax_rate === 'object' ? (acc.default_tax_rate as { id: string }).id : acc.default_tax_rate) : '')
    setDescription(acc.description || '')
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleRowClick = (e: React.MouseEvent, acc: Account) => {
    const target = e.target as HTMLElement
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.no-row-click')
    ) return
    setViewingAccount(acc)
  }

  const handleImportDefaultAccounts = async () => {
    const confirmed = await showConfirm({
      title: 'Import Default Accounts',
      message: 'Are you sure you want to import the default standard Xero Chart of Accounts? This will populate 50 essential ledger accounts and default tax rates.',
      confirmText: 'Import',
      onConfirm: async () => {
        setIsImporting(true)
        try {
          const res = await apiService.importDefaultAccounts(activeOrg.id)
          setAccounts(res)
          const taxRatesData = await apiService.getTaxRates(activeOrg.id)
          setTaxRates(taxRatesData)
        } catch (e: any) {
          showAlert({ title: 'Import Failed', message: 'Import failed: ' + (e.message || e), type: 'error' })
          throw e
        } finally {
          setIsImporting(false)
        }
      }
    })

    if (confirmed) {
      showAlert({ title: 'Import Complete', message: 'Standard default Chart of Accounts successfully imported!', type: 'success' })
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) {
      showAlert({ title: 'Validation Warning', message: 'Code and Name are required fields.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const payload: Partial<Account> = {
      code,
      name,
      class_type: classType,
      type: accountType,
      default_tax_rate: taxRateId ? taxRateId : undefined,
      description
    }

    try {
      if (editingAccount) {
        const updated = await apiService.updateAccount(editingAccount.id, payload, activeOrg.id)
        setAccounts(prev => prev.map(a => a.id === editingAccount.id ? updated : a))
        if (viewingAccount?.id === editingAccount.id) setViewingAccount(updated)
        setIsModalOpen(false)
        setEditingAccount(null)
        resetForm()
      } else {
        const created = await apiService.createAccount(activeOrg.id, payload)
        setAccounts(prev => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)))
        setIsModalOpen(false)
        resetForm()
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save account.')
      showAlert({ title: 'Error Saving Account', message: 'Failed to save account: ' + (e.message || 'Unique code violation'), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async (acc: Account) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Account',
      message: `Deactivate "${acc.name}"? It will be hidden from account dropdowns but all historical transactions are preserved.`,
      confirmText: 'Deactivate',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      const updated = await apiService.patchAccount(acc.id, { is_active: false }, activeOrg.id)
      setAccounts(prev => prev.map(a => a.id === acc.id ? updated : a))
      setViewingAccount(updated)
      showAlert({ title: 'Account Deactivated', message: `${acc.name} has been deactivated.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const handleReactivate = async (acc: Account) => {
    try {
      const updated = await apiService.patchAccount(acc.id, { is_active: true }, activeOrg.id)
      setAccounts(prev => prev.map(a => a.id === acc.id ? updated : a))
      setViewingAccount(updated)
      showAlert({ title: 'Account Restored', message: `${acc.name} is now active.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const resetForm = () => {
    setCode('')
    setName('')
    setClassType('Asset')
    setAccountType('Current Asset')
    setTaxRateId('')
    setDescription('')
  }

  const getTaxRateLabel = (taxRate: any) => {
    if (!taxRate) return 'No Tax'
    if (typeof taxRate === 'object') return `${taxRate.name} (${parseFloat(String(taxRate.rate))}%)`
    const found = taxRates.find(t => t.id === taxRate)
    return found ? `${found.name} (${parseFloat(String(found.rate))}%)` : 'Tax Exempt'
  }

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch =
      acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.description || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (activeFilter === 'Deactivated') return acc.is_active === false

    if (acc.is_active === false) return false

    if (activeFilter === 'All') return true
    return acc.class_type === activeFilter
  })

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (sortOption === 'code-asc') return a.code.localeCompare(b.code)
    if (sortOption === 'code-desc') return b.code.localeCompare(a.code)
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
    if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
    return 0
  })

  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  if (viewingAccount) {
    const matchStatus = accountingMethod === 'cash'
      ? (s: string) => s === 'Paid'
      : (s: string) => s !== 'Draft'
    const accountInvoices = invoices.filter(inv =>
      matchStatus(inv.status) && inv.lines?.some((line: any) => line.account === viewingAccount.id)
    )
    const accountBills = bills.filter(bill =>
      matchStatus(bill.status) && bill.lines?.some((line: any) => line.account === viewingAccount.id)
    )

    const totalDebits = accountInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const totalCredits = accountBills.reduce((sum, b) => sum + Number(b.total), 0)

    const transactions = [
      ...accountInvoices.map((i: any) => ({ id: i.id, date: i.date, number: i.invoice_number, reference: i.reference, type: 'Invoice', amount: Number(i.total), status: i.status })),
      ...accountBills.map((b: any) => ({ id: b.id, date: b.date, number: b.bill_number, reference: b.reference, type: 'Bill', amount: Number(b.total), status: b.status }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
      <div className="space-y-6 font-sans text-left animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewingAccount(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-[3px] border border-slate-200 cursor-pointer select-none transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Chart of Accounts</span>
            </button>
            <span className="text-slate-350">/</span>
            <span className="text-[#0F5B38] text-xs font-bold">{viewingAccount.name}</span>
            {viewingAccount.is_active === false && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">Inactive</span>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleEditClick(viewingAccount)}
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Account</span>
            </button>
            {viewingAccount.is_active !== false ? (
              <button
                onClick={() => handleDeactivate(viewingAccount)}
                className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200/50 hover:bg-amber-100/60 text-amber-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Deactivate</span>
              </button>
            ) : (
              <button
                onClick={() => handleReactivate(viewingAccount)}
                className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                <span>Reactivate</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-800">{viewingAccount.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">General Ledger Account</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Account Code</span>
                <span className="font-bold text-[#0F5B38] text-sm">{viewingAccount.code}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Account Class</span>
                <span className="font-bold text-slate-800">{viewingAccount.class_type}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Reporting Type</span>
                <span className="font-semibold text-slate-700">{viewingAccount.type}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Default Tax Rate</span>
                <span className="font-semibold text-slate-700">{getTaxRateLabel(viewingAccount.default_tax_rate)}</span>
              </div>
              {viewingAccount.description && (
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Description</span>
                  <span className="font-semibold text-slate-700 italic">{viewingAccount.description}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2 space-y-2">
              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Account Activity</h4>
              <div className="flex items-center bg-slate-100 rounded-[3px] p-0.5 w-fit">
                <button
                  onClick={() => setAccountingMethod('accrual')}
                  className={`text-[9px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-[2px] transition ${accountingMethod === 'accrual' ? 'bg-white text-[#0F5B38] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >Accrual</button>
                <button
                  onClick={() => setAccountingMethod('cash')}
                  className={`text-[9px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-[2px] transition ${accountingMethod === 'cash' ? 'bg-white text-[#0F5B38] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >Cash</button>
              </div>
            </div>
            <div className="space-y-3.5 py-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#0F5B38] rounded-full"></div>
                  <span className="text-slate-500 font-semibold">{accountingMethod === 'cash' ? 'Cash Received (Invoices)' : 'Linked Invoices'}</span>
                </div>
                <span className="font-extrabold text-slate-800">
                  {currencySymbol}{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-rose-600 rounded-full"></div>
                  <span className="text-slate-500 font-semibold">{accountingMethod === 'cash' ? 'Cash Paid (Bills)' : 'Linked Bills'}</span>
                </div>
                <span className="font-extrabold text-slate-800">
                  {currencySymbol}{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
                <span className="text-slate-800 font-black">Total Transactions</span>
                <span className="font-black text-slate-800">{transactions.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3px] border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Linked Transactions</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {accountingMethod === 'cash' ? 'Cash basis — paid transactions only.' : 'Accrual basis — all invoiced & billed transactions.'}
              </p>
            </div>
            <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border ${accountingMethod === 'cash' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {accountingMethod === 'cash' ? 'Cash Basis' : 'Accrual Basis'}
            </span>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Document ID</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactions.map(tx => {
                    const isInvoice = tx.type === 'Invoice'
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => {
                          if (isInvoice && onViewInvoice) onViewInvoice(tx.id)
                          else if (!isInvoice && onViewBill) onViewBill(tx.id)
                        }}
                        className="hover:bg-emerald-50/25 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="p-3 whitespace-nowrap text-slate-600">{tx.date}</td>
                        <td className="p-3 font-bold text-[#0F5B38]">{tx.number}</td>
                        <td className="p-3 text-slate-400 italic">{tx.reference || '—'}</td>
                        <td className="p-3">
                          <span className="flex items-center space-x-1.5 text-slate-600">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span>{isInvoice ? 'Sales Invoice' : 'Vendor Bill'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {currencySymbol}{tx.amount.toFixed(2)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                            tx.status === 'Awaiting Payment' ? 'bg-amber-50 text-amber-600 border border-amber-100/30' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              if (isInvoice && onViewInvoice) onViewInvoice(tx.id)
                              else if (!isInvoice && onViewBill) onViewBill(tx.id)
                            }}
                            className="hover:bg-emerald-50 text-[#0F5B38] rounded-[3px] transition cursor-pointer text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              No transactions have been coded to this account yet.
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
            <div className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-lg border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
              {renderModalContent()}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderModalContent() {
    return (
      <>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-850">{editingAccount ? 'Edit Account' : 'Create Ledger Account'}</h3>
            <p className="text-[11px] text-slate-450 font-medium">Specify general ledger code indexes and reporting profiles.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleAddAccount} className="space-y-4 text-xs font-semibold text-slate-605">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Account Code *</label>
              <input
                type="text"
                placeholder="e.g. 610"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Account Name *</label>
              <input
                type="text"
                placeholder="e.g. Consulting Revenue"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Class *</label>
              <select
                value={classType}
                onChange={e => {
                  const val = e.target.value as any
                  setClassType(val)
                  if (val === 'Asset') setAccountType('Current Asset')
                  else if (val === 'Liability') setAccountType('Current Liability')
                  else if (val === 'Revenue') setAccountType('Sales')
                  else if (val === 'Expense') setAccountType('Expense')
                  else if (val === 'Equity') setAccountType('Equity')
                }}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition cursor-pointer"
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
                <option value="Equity">Equity</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Reporting Type *</label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition cursor-pointer"
              >
                {classType === 'Asset' && (
                  <>
                    <option value="Bank">Bank / Cash Accounts</option>
                    <option value="Current Asset">Current Asset</option>
                    <option value="Fixed Asset">Fixed Asset</option>
                    <option value="Inventory">Inventory Asset</option>
                  </>
                )}
                {classType === 'Liability' && (
                  <>
                    <option value="Current Liability">Current Liability</option>
                    <option value="Non-Current Liability">Non-Current Liability</option>
                  </>
                )}
                {classType === 'Revenue' && (
                  <>
                    <option value="Sales">Sales Revenue</option>
                    <option value="Other Income">Other Income</option>
                  </>
                )}
                {classType === 'Expense' && (
                  <>
                    <option value="Expense">Standard Expense</option>
                    <option value="Direct Costs">Direct Cost / COGS</option>
                    <option value="Depreciation">Depreciation Expense</option>
                  </>
                )}
                {classType === 'Equity' && (
                  <option value="Equity">Equity Capital</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Default Tax Group</label>
            <select
              value={taxRateId}
              onChange={e => setTaxRateId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition cursor-pointer"
            >
              <option value="">Tax Exempt (0%)</option>
              {taxRates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Description</label>
            <textarea
              placeholder="Provide description of use cases..."
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition resize-none placeholder:text-slate-350"
            ></textarea>
          </div>

          <div className="flex space-x-3 pt-4 justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium"
            >
              {isSubmitting ? 'Saving...' : editingAccount ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </>
    )
  }

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-[#0F5B38]" />
          <span>Chart of Accounts</span>
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleImportDefaultAccounts}
            disabled={isImporting}
            className="flex items-center space-x-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-[#0F5B38] font-semibold text-xs px-4.5 py-2.5 rounded-[3px] transition cursor-pointer shadow-sm disabled:opacity-60"
          >
            <span>{isImporting ? 'Importing...' : 'Import Default Accounts'}</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] transition cursor-pointer shadow-md shadow-emerald-950/10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-0 gap-4">
        <div className="flex select-none overflow-x-auto scrollbar-none space-x-1 -mb-[1px] relative z-10 text-xs font-semibold">
          {filterOptions.map((opt) => {
            const isActive = activeFilter === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setActiveFilter(opt.key)}
                className={`px-4 py-2 text-xs font-semibold transition-all border rounded-t-[3px] cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#0F5B38] border-slate-200 border-b-transparent font-bold -mb-[1px] relative z-10'
                    : 'bg-transparent hover:bg-slate-50 text-slate-450 hover:text-slate-850 border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-end space-x-2 w-full sm:w-auto justify-end gap-2 pb-0 mb-[2px]">
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
              <button
                onClick={handleBulkDeactivate}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                {activeFilter === 'Deactivated' ? 'Reactivate Selected' : 'Deactivate Selected'}
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
              <option value="code-asc">Code (Asc)</option>
              <option value="code-desc">Code (Desc)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex space-x-1.5 items-center">
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
          </div>
        </div>
      ) : sortedAccounts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={sortedAccounts.length > 0 && sortedAccounts.every(a => selectedIds.has(a.id))}
                    onChange={() => handleToggleSelectAll(sortedAccounts.map(a => a.id))}
                    className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5">Code</th>
                <th className="px-6 py-2.5 w-1/3 min-w-[240px]">Name</th>
                <th className="px-6 py-2.5">Class</th>
                <th className="px-6 py-2.5">Type</th>
                <th className="px-6 py-2.5">Tax Rate</th>
                <th className="px-6 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {sortedAccounts.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={(e) => handleRowClick(e, acc)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out cursor-pointer ${selectedIds.has(acc.id) ? 'bg-emerald-50/20' : ''}`}
                >
                  <td className="px-4 py-2.5 w-10 text-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(acc.id)}
                      onChange={() => handleToggleSelect(acc.id)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">{acc.code}</span>
                  </td>
                  <td className="px-6 py-2.5 font-semibold text-slate-800">{acc.name}</td>
                  <td className="px-6 py-2.5 text-slate-600 font-semibold">{acc.class_type}</td>
                  <td className="px-6 py-2.5 font-semibold text-slate-555">{acc.type}</td>
                  <td className="px-6 py-2.5 text-[11px] text-slate-500 font-semibold">
                    {getTaxRateLabel(acc.default_tax_rate)}
                  </td>
                  <td className="px-6 py-2.5">
                    {acc.is_active === false ? (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
                    ) : (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50/50 rounded-[3px] border border-slate-205 p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <Calculator className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No matching accounts</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
              Create ledger accounts under this specific group type to view outstanding items.
            </p>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
          <div
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-lg border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  )
}
