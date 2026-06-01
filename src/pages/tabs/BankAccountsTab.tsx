import { useState, useEffect, useRef } from 'react'
import { Plus, CreditCard, ArrowRight, ArrowLeft, HelpCircle, Search, Trash2 } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account } from '../../services/api'
import { ReconcileTab } from './ReconcileTab'
import { usePopup } from '../../components/PopupProvider'

interface BankAccountsTabProps {
  activeOrg: Organization
  isMockMode?: boolean
  reconcileItems: any[]
  resetReconciliation: () => void
  handleReconcile: (id: string) => void
}

export function BankAccountsTab({
  activeOrg,
  isMockMode = false,
  reconcileItems,
  resetReconciliation,
  handleReconcile
}: BankAccountsTabProps) {
  const { showConfirm, showAlert } = usePopup()
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Type B Layout Sorting State
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc' | 'balance-high' | 'balance-low'>('name-asc')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Local state to navigate between Bank Accounts Dashboard and active Bank Reconciliation feed
  const [selectedBankAcc, setSelectedBankAcc] = useState<Account | null>(null)
  const [editingBankAcc, setEditingBankAcc] = useState<Account | null>(null)

  // Bank Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      if (isMockMode) {
        setBankAccounts([])
        setLoading(false)
        return
      }

      const allAccounts = await apiService.getAccounts(activeOrg.id)
      // Filter only accounts with type 'Bank'
      const banks = allAccounts.filter(a => a.type === 'Bank')
      setBankAccounts(banks)
    } catch (e) {
      console.warn("Failed to fetch bank accounts.", e)
      setBankAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
  }, [activeOrg.id, isMockMode])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [sortOption])

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

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) {
      alert("Account Code and Bank Name are required.")
      return
    }

    setIsSubmitting(true)
    const payload: Partial<Account> = {
      code,
      name,
      class_type: 'Asset',
      type: 'Bank',
      description
    }

    try {
      if (editingBankAcc) {
        if (isMockMode) {
          setBankAccounts(prev => prev.map(b => b.id === editingBankAcc.id ? { ...b, ...payload } : b))
          setIsModalOpen(false)
          setEditingBankAcc(null)
          resetForm()
          return
        }

        const updated = await apiService.updateAccount(editingBankAcc.id, payload)
        setBankAccounts(prev => prev.map(b => b.id === editingBankAcc.id ? updated : b))
        setIsModalOpen(false)
        setEditingBankAcc(null)
        resetForm()
      } else {
        if (isMockMode) {
          const newBank: Account = {
            id: `mock-bank-${Date.now()}`,
            code,
            name,
            class_type: 'Asset',
            type: 'Bank',
            description,
            is_system_account: false,
            created_at: new Date().toISOString()
          }
          setBankAccounts(prev => [...prev, newBank].sort((a, b) => a.code.localeCompare(b.code)))
          setIsModalOpen(false)
          resetForm()
          return
        }

        const created = await apiService.createAccount(activeOrg.id, payload)
        setBankAccounts(prev => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)))
        setIsModalOpen(false)
        resetForm()
      }
    } catch (e: any) {
      alert("Failed to register bank account: " + (e.message || "Code must be unique"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCode('')
    setName('')
    setDescription('')
  }

  const handleOpenAdd = () => {
    setEditingBankAcc(null)
    resetForm()
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleEditClick = (bankAcc: Account) => {
    setEditingBankAcc(bankAcc)
    setCode(bankAcc.code)
    setName(bankAcc.name)
    setDescription(bankAcc.description || '')
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleRowClick = (e: React.MouseEvent, bankAcc: Account) => {
    const target = e.target as HTMLElement
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.no-row-click')
    ) {
      return
    }
    handleEditClick(bankAcc)
  }


  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

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
    const list = Array.from(selectedIds)
    if (list.length === 0) return

    // System accounts / demo ANZ (090) should not be deleted to keep reconciliation simulations working
    const toDelete = bankAccounts.filter(b => selectedIds.has(b.id!))
    const protectedBanks = toDelete.filter(b => b.code === '090')
    const deletable = toDelete.filter(b => b.code !== '090')

    if (deletable.length === 0) {
      showAlert({
        title: 'System Protection',
        message: 'Demonstration ANZ Business Account (090) is protected for reconciliation simulations and cannot be deleted.',
        type: 'warning'
      })
      return
    }

    let confirmMsg = `Are you sure you want to delete ${deletable.length} selected bank account(s)?`
    if (protectedBanks.length > 0) {
      confirmMsg += ` (ANZ Business Account 090 will be skipped).`
    }

    const confirmed = await showConfirm({
      title: 'Delete Bank Accounts',
      message: confirmMsg,
      confirmText: 'Delete Selected',
      isDestructive: true
    })
    if (!confirmed) return

    setLoading(true)
    try {
      if (isMockMode) {
        setBankAccounts(prev => prev.filter(b => !selectedIds.has(b.id!) || b.code === '090'))
      } else {
        await Promise.all(deletable.map(b => apiService.deleteAccount(b.id!)))
        setBankAccounts(prev => prev.filter(b => !selectedIds.has(b.id!) || b.code === '090'))
      }
      setSelectedIds(new Set())
    } catch (e: any) {
      showAlert({ title: 'Deletion Failed', message: "Failed to delete bank accounts: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBankAccount = async (bankId: string) => {
    const bank = bankAccounts.find(b => b.id === bankId)
    if (!bank) return

    if (bank.code === '090') {
      showAlert({
        title: 'System Protection',
        message: 'Demonstration ANZ Business Account (090) is protected for reconciliation simulations and cannot be deleted.',
        type: 'warning'
      })
      return
    }

    const confirmed = await showConfirm({
      title: 'Delete Bank Account',
      message: `Are you sure you want to permanently delete the bank account "${bank.name}"?`,
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!confirmed) return

    setLoading(true)
    try {
      if (isMockMode) {
        setBankAccounts(prev => prev.filter(b => b.id !== bankId))
      } else {
        await apiService.deleteAccount(bankId)
        setBankAccounts(prev => prev.filter(b => b.id !== bankId))
      }
    } catch (e: any) {
      showAlert({ title: 'Deletion Failed', message: "Deletion failed: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Filter & Sort
  const filteredBanks = bankAccounts.filter(bank => {
    const matchesSearch = 
      bank.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      bank.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (bank.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  }).sort((a, b) => {
    if (sortOption === 'name-asc') {
      return a.name.localeCompare(b.name)
    } else if (sortOption === 'name-desc') {
      return b.name.localeCompare(a.name)
    } else if (sortOption === 'balance-high') {
      const balanceA = a.code === '090' ? 5142.90 : 0
      const balanceB = b.code === '090' ? 5142.90 : 0
      return balanceB - balanceA
    } else if (sortOption === 'balance-low') {
      const balanceA = a.code === '090' ? 5142.90 : 0
      const balanceB = b.code === '090' ? 5142.90 : 0
      return balanceA - balanceB
    }
    return 0
  })

  // If a specific bank account is selected for reconciliation, render the simulator directly
  if (selectedBankAcc) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSelectedBankAcc(null)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-[3px] border border-slate-200 cursor-pointer select-none transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Bank Accounts Dashboard</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400 text-xs font-bold">{selectedBankAcc.name} ({selectedBankAcc.code})</span>
        </div>

        {/* Mount actual statement matching engine */}
        <ReconcileTab
          activeOrg={activeOrg}
          reconcileItems={reconcileItems}
          resetReconciliation={resetReconciliation}
          handleReconcile={handleReconcile}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2.5">
          <CreditCard className="h-5 w-5 text-[#0F5B38]" />
          <span>Bank Accounts Dashboard</span>
        </h2>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4 py-2 rounded-[3px] transition cursor-pointer shadow-md shadow-emerald-950/10"
        >
          <Plus className="h-4 w-4" />
          <span>Add Bank Account</span>
        </button>
      </div>      {/* Type B Filter & Search Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-0 border-b border-slate-200/60 gap-4">
        {/* Left Side: Search Bar & Compact Bulk Actions */}
        <div className="flex items-end gap-2 flex-grow max-w-2xl pb-0 mb-[2px]">
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

          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold pb-[2px]">
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Delete Selected
              </button>
              <span className="text-[11px] text-slate-400 font-bold px-1 whitespace-nowrap hidden lg:inline">
                {selectedIds.size} selected
              </span>
            </div>
          )}
        </div>

        {/* Sorting Right */}
        <div className="flex items-center space-x-1.5 pb-0 mb-[2px]">
          <span className="text-[10px] text-slate-455 uppercase font-bold tracking-wider">Sort By:</span>
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value as any)}
            className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-3 py-2 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="balance-high">Balance: High to Low</option>
            <option value="balance-low">Balance: Low to High</option>
          </select>
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
      ) : filteredBanks.length > 0 ? (
        /* Professional borderless table structure (No redundant outer borders) */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredBanks.length > 0 && filteredBanks.every(bank => selectedIds.has(bank.id!))}
                    onChange={() => handleToggleSelectAll(filteredBanks.map(b => b.id!))}
                    className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5">Bank / Account Name</th>
                <th className="px-6 py-2.5">Code</th>
                <th className="px-6 py-2.5">Type</th>
                <th className="px-6 py-2.5">Statement Balance</th>
                <th className="px-6 py-2.5">Reconciliation</th>
                <th className="px-6 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {filteredBanks.map((bank) => (
                <tr
                  key={bank.id}
                  onClick={(e) => handleRowClick(e, bank)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out ${selectedIds.has(bank.id!) ? 'bg-emerald-50/20' : ''} cursor-pointer`}
                >
                  <td className="px-4 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(bank.id!)}
                      onChange={() => handleToggleSelect(bank.id!)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">
                      {bank.name}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-bold text-[#0F5B38] text-[13px]">{bank.code}</td>
                  <td className="px-6 py-2.5 font-semibold text-slate-500">Bank Feed</td>
                  <td className="px-6 py-2.5 font-black text-slate-800">
                    {currencySymbol}{bank.code === '090' ? '5,142.90' : '0.00'}
                  </td>
                  <td className="px-6 py-2.5">
                    {bank.code === '090' ? (
                      <div className="flex items-center justify-start space-x-2.5">
                        {reconcileItems.length > 0 && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-[3px] border border-amber-100/50">
                            {reconcileItems.length} items
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedBankAcc(bank)}
                          className="flex items-center space-x-1 py-1 px-3 bg-[#0F5B38] hover:brightness-105 text-white text-[10px] font-bold rounded-[3px] shadow-sm transition-all cursor-pointer"
                        >
                          <span>Reconcile</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => alert("Reconciliation simulations are currently configured for ANZ Business Account (090). Click reconcile on the primary ANZ Business card to match demo bank statements!")}
                        className="flex items-center space-x-1 py-1 px-2.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-655 text-[10px] font-bold rounded-[3px] border border-slate-200 transition-all cursor-pointer"
                      >
                        <span>Reconcile</span>
                        <HelpCircle className="h-3.5 w-3.5 text-slate-350" />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-2.5 text-right no-row-click">
                    <button
                      onClick={() => handleDeleteBankAccount(bank.id!)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition-all cursor-pointer"
                      title="Delete Bank Account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50/50 rounded-[3px] border border-slate-200 p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No bank accounts registered</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
              Add a bank account to associate corporate reserves, configure statement feeds, and balance assets.
            </p>
          </div>
        </div>
      )}

      {/* Bank Account Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-slate-850">
                    {editingBankAcc ? 'Edit Bank Account' : 'Add New Bank Account'}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">Declare bank details to link to your general ledger.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-650 text-xs font-bold bg-slate-50 hover:bg-slate-100 p-2 rounded-[3px]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddBankAccount} className="space-y-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[10px]">Bank / Account Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. ANZ Savings Account"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[10px]">Account Code index *</label>
                  <input
                    type="text"
                    placeholder="e.g. 092"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[10px]">Description</label>
                  <textarea
                    placeholder="Provide description of banking feed..."
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] resize-none"
                  ></textarea>
                </div>

                <div className="flex space-x-3 pt-4 justify-end border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? 'Saving...' : 'Add Account'}
                  </button>
                </div>
              </form>

            </div>
        </div>
      )}

    </div>
  )
}
