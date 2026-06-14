import { useState, useEffect, useRef } from 'react'
import { Plus, Calculator, Trash2, Search } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account, TaxRate } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'

interface ChartOfAccountsTabProps {
  activeOrg: Organization
}

export function ChartOfAccountsTab({ activeOrg }: ChartOfAccountsTabProps) {
  const { showConfirm, showAlert } = usePopup()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [classType, setClassType] = useState<'Revenue' | 'Expense' | 'Asset' | 'Liability' | 'Equity'>('Asset')
  const [accountType, setAccountType] = useState('Current Asset')
  const [taxRateId, setTaxRateId] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Selection & Archive State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [sortOption, setSortOption] = useState<'code-asc' | 'code-desc' | 'name-asc' | 'name-desc'>('code-asc')

  // Xero Top Filters State
  const [activeFilter, setActiveFilter] = useState<'All' | 'Asset' | 'Liability' | 'Equity' | 'Expense' | 'Revenue' | 'Archive'>('All')

  const filterOptions = [
    { key: 'All', label: 'All Accounts' },
    { key: 'Asset', label: 'Assets' },
    { key: 'Liability', label: 'Liabilities' },
    { key: 'Equity', label: 'Equity' },
    { key: 'Expense', label: 'Expenses' },
    { key: 'Revenue', label: 'Revenue' },
    { key: 'Archive', label: 'Archive' }
  ] as const

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [accountsData, taxRatesData] = await Promise.all([
        apiService.getAccounts(activeOrg.id),
        apiService.getTaxRates(activeOrg.id)
      ])
      setAccounts(accountsData)
      setTaxRates(taxRatesData)
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load accounts.")
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
  }, [activeOrg.id])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeFilter])

  // Ref to track last active focused element before modal launches
  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isModalOpen) {
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
    setTaxRateId(acc.default_tax_rate ? (typeof acc.default_tax_rate === 'object' ? (acc.default_tax_rate as any).id : acc.default_tax_rate) : '')
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
    ) {
      return
    }
    handleEditClick(acc)
  }

  const [isImporting, setIsImporting] = useState(false)

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
          showAlert({ title: 'Import Failed', message: "Import failed: " + (e.message || e), type: 'error' })
          throw e
        } finally {
          setIsImporting(false)
        }
      }
    })

    if (confirmed) {
      showAlert({ 
        title: 'Import Complete', 
        message: 'Standard default Chart of Accounts successfully imported!', 
        type: 'success' 
      })
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
        const updated = await apiService.updateAccount(editingAccount.id, payload)
        setAccounts(prev => prev.map(a => a.id === editingAccount.id ? updated : a))
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
      setErrorMsg(e.message || "Failed to save account.")
      showAlert({ title: 'Error Saving Account', message: "Failed to save account: " + (e.message || "Unique code violation"), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = async (accId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Account',
      message: 'Are you sure you want to delete this ledger account?',
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      await apiService.deleteAccount(accId)
      setAccounts(prev => prev.filter(a => a.id !== accId))
    } catch (e: any) {
      showAlert({ title: 'Deletion Failed', message: "Deletion failed: " + e.message, type: 'error' })
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
    if (typeof taxRate === 'object') {
      return `${taxRate.name} (${parseFloat(String(taxRate.rate))}%)`
    }
    const found = taxRates.find(t => t.id === taxRate)
    return found ? `${found.name} (${parseFloat(String(found.rate))}%)` : 'Tax Exempt'
  }

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Toggle all visible/filtered selection
  const handleToggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) {
      visibleIds.forEach(id => next.delete(id))
    } else {
      visibleIds.forEach(id => next.add(id))
    }
    setSelectedIds(next)
  }

  // Bulk Delete
  const handleBulkDelete = async () => {
    const toDelete = accounts.filter(a => selectedIds.has(a.id))
    if (toDelete.length === 0) return

    const confirmed = await showConfirm({
      title: 'Bulk Delete Accounts',
      message: `Are you sure you want to permanently delete ${toDelete.length} selected account(s)?`,
      confirmText: 'Delete Selected',
      isDestructive: true
    })
    if (!confirmed) return

    setLoading(true)
    try {
      await apiService.deleteAccountsBulk(activeOrg.id, toDelete.map(a => a.id))
      setAccounts(prev => prev.filter(a => !selectedIds.has(a.id)))
      setSelectedIds(new Set())
    } catch (e: any) {
      showAlert({ title: 'Bulk Deletion Failed', message: "Some accounts could not be deleted: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Bulk Archive
  const handleBulkArchive = () => {
    const isRestoring = activeFilter === 'Archive'
    const nextArchived = new Set(archivedIds)

    selectedIds.forEach(id => {
      if (isRestoring) {
        nextArchived.delete(id)
      } else {
        nextArchived.add(id)
      }
    })

    setArchivedIds(nextArchived)
    showAlert({
      title: 'Status Updated',
      message: isRestoring ? `Restored ${selectedIds.size} account(s) to active list.` : `Archived ${selectedIds.size} account(s).`,
      type: 'success'
    })
    setSelectedIds(new Set())
  }

  // Filter accounts by their class_type, Search Term, and Archived state
  const filteredAccounts = accounts.filter(acc => {
    const isArchived = archivedIds.has(acc.id)
    if (activeFilter === 'Archive') {
      if (!isArchived) return false
    } else {
      if (isArchived) return false
    }

    const matchesSearch = 
      acc.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (acc.description || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (activeFilter === 'All' || activeFilter === 'Archive') return true
    return acc.class_type === activeFilter
  })

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (sortOption === 'code-asc') return a.code.localeCompare(b.code)
    if (sortOption === 'code-desc') return b.code.localeCompare(a.code)
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
    if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
    return 0
  })


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
      </div>      {/* Xero-Style Top Tab Filters & Search */}
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

        {/* Right side search & bulk action container */}
        <div className="flex items-end space-x-2 w-full sm:w-auto justify-end gap-2 pb-0 mb-[2px]">
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={handleBulkArchive}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                {activeFilter === 'Archive' ? 'Restore Active' : 'Archive'}
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
        /* Refined, borderless list format (No redundant outer borders) */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={sortedAccounts.length > 0 && sortedAccounts.every(acc => selectedIds.has(acc.id))}
                    onChange={() => handleToggleSelectAll(sortedAccounts.map(a => a.id))}
                    className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5">Code</th>
                <th className="px-6 py-2.5 w-1/3 min-w-[240px]">Name</th>
                <th className="px-6 py-2.5">Class</th>
                <th className="px-6 py-2.5">Type</th>
                <th className="px-6 py-2.5">Tax Rate</th>
                <th className="px-6 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {sortedAccounts.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={(e) => handleRowClick(e, acc)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out ${selectedIds.has(acc.id) ? 'bg-emerald-50/20' : ''} cursor-pointer`}
                >
                  <td className="px-4 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(acc.id)}
                      onChange={() => handleToggleSelect(acc.id)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">
                      {acc.code}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-semibold text-slate-800">{acc.name}</td>
                  <td className="px-6 py-2.5 text-slate-600 font-semibold">{acc.class_type}</td>
                  <td className="px-6 py-2.5 font-semibold text-slate-555">{acc.type}</td>
                  <td className="px-6 py-2.5 text-[11px] text-slate-500 font-semibold">
                    {getTaxRateLabel(acc.default_tax_rate)}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition-all cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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

      {/* Modern, Glassmorphic Modal overlay for adding Accounts */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-lg border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
            
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
                      // Auto align default sub-type
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
                    <option key={t.id} value={t.id}>{t.name} ({parseFloat(String(t.rate))}%)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Description</label>
                <textarea
                  placeholder="Provide description of use cases..."
                  rows={2.5}
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

          </div>
        </div>
      )}

    </div>
  )
}
