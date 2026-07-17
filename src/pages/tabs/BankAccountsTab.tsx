import { useState, useEffect, useRef } from 'react'
import { Plus, CreditCard, ArrowLeft, Search, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account, Invoice, Payment } from '../../services/api'
import { spendReceiveApi } from '../../services/api/spend-receive'
import type { SpendReceiveMoney } from '../../services/api/spend-receive'
import { usePopup } from '../../components/PopupProvider'
import { ImportDropdown } from '../../components/ImportDropdown'
import { useReadOnly } from '../../context/ReadOnlyContext'

interface BankAccountsTabProps {
  activeOrg: Organization
  onViewInvoice?: (id: string) => void
  onViewBill?: (id: string) => void
  onStartImport?: (file: File, fileType: 'csv' | 'excel', bankId: string, bankName: string) => void
}

export function BankAccountsTab({ activeOrg, onViewInvoice, onViewBill, onStartImport }: BankAccountsTabProps) {
  const isReadOnly = useReadOnly()
  const { showConfirm, showAlert } = usePopup()
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [spendReceive, setSpendReceive] = useState<SpendReceiveMoney[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc'>('name-asc')
  const [editingBankAcc, setEditingBankAcc] = useState<Account | null>(null)
  const [viewingBankAcc, setViewingBankAcc] = useState<Account | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<'Active' | 'All' | 'Deactivated'>('Active')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [accountsRes, invoicesRes, billsRes, paymentsRes, srRes] = await Promise.allSettled([
      apiService.getAccounts(activeOrg.id),
      apiService.getInvoices(activeOrg.id),
      apiService.getBills(activeOrg.id),
      apiService.getPayments(activeOrg.id),
      spendReceiveApi.listSpendReceive(activeOrg.id),
    ])
    if (accountsRes.status === 'fulfilled') setBankAccounts(accountsRes.value.filter((a: Account) => a.type === 'Bank'))
    else setBankAccounts([])
    if (invoicesRes.status === 'fulfilled') setInvoices(invoicesRes.value)
    if (billsRes.status === 'fulfilled') setBills(billsRes.value)
    if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value)
    if (srRes.status === 'fulfilled') setSpendReceive(srRes.value)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    setViewingBankAcc(null)
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
        ? `Reactivate ${list.length} selected bank account(s)?`
        : `Deactivate ${list.length} selected bank account(s)? Historical data is preserved.`,
      confirmText: isReactivating ? 'Reactivate' : 'Deactivate',
      isDestructive: !isReactivating
    })
    if (!confirmed) return

    setLoading(true)
    try {
      const newStatus = isReactivating
      await Promise.all(list.map(id => apiService.patchAccount(id, { is_active: newStatus }, activeOrg.id)))
      setBankAccounts(prev => prev.map(b => selectedIds.has(b.id) ? { ...b, is_active: newStatus } : b))
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

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) {
      showAlert({ title: 'Validation Warning', message: 'Account Code and Bank Name are required.', type: 'warning' })
      return
    }
    setIsSubmitting(true)
    const payload: Partial<Account> = { code, name, class_type: 'Asset', type: 'Bank', description }
    try {
      if (editingBankAcc) {
        const updated = await apiService.updateAccount(editingBankAcc.id, payload, activeOrg.id)
        setBankAccounts(prev => prev.map(b => b.id === editingBankAcc.id ? updated : b))
        if (viewingBankAcc?.id === editingBankAcc.id) setViewingBankAcc(updated)
        setEditingBankAcc(null)
      } else {
        const created = await apiService.createAccount(activeOrg.id, payload)
        setBankAccounts(prev => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)))
      }
      setIsModalOpen(false)
      resetForm()
    } catch (e: any) {
      showAlert({ title: 'Error', message: 'Failed to save bank account: ' + (e.message || 'Code must be unique'), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => { setCode(''); setName(''); setDescription('') }

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
    ) return
    setViewingBankAcc(bankAcc)
  }

  const handleDeactivate = async (bank: Account) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Bank Account',
      message: `Deactivate "${bank.name}"? It will be hidden from account dropdowns but all historical data is preserved.`,
      confirmText: 'Deactivate',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      const updated = await apiService.patchAccount(bank.id, { is_active: false }, activeOrg.id)
      setBankAccounts(prev => prev.map(b => b.id === bank.id ? updated : b))
      setViewingBankAcc(updated)
      showAlert({ title: 'Account Deactivated', message: `${bank.name} has been deactivated.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const handleReactivate = async (bank: Account) => {
    try {
      const updated = await apiService.patchAccount(bank.id, { is_active: true }, activeOrg.id)
      setBankAccounts(prev => prev.map(b => b.id === bank.id ? updated : b))
      setViewingBankAcc(updated)
      showAlert({ title: 'Account Restored', message: `${bank.name} is now active.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  const filteredBanks = bankAccounts
    .filter(bank => {
      if (activeFilter === 'Deactivated') return bank.is_active === false
      if (activeFilter === 'Active') return bank.is_active !== false
      return true
    })
    .filter(bank =>
      bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bank.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => sortOption === 'name-asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))

  if (viewingBankAcc) {
    const accountPayments = payments.filter(p => p.bank_account === viewingBankAcc.id)
    const accountSR = spendReceive.filter(sr => sr.bank_account_id === viewingBankAcc.id)

    const totalInc = accountPayments.filter(p => p.invoice !== null).reduce((sum, p) => sum + Number(p.amount), 0)
      + accountSR.filter(sr => sr.type === 'Receive').reduce((sum, sr) => sum + Number(sr.total), 0)
    const totalExp = accountPayments.filter(p => p.bill !== null).reduce((sum, p) => sum + Number(p.amount), 0)
      + accountSR.filter(sr => sr.type === 'Spend').reduce((sum, sr) => sum + Number(sr.total), 0)
    const runningBal = totalInc - totalExp

    return (
      <div className="space-y-6 font-sans text-left animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewingBankAcc(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-[3px] border border-slate-200 cursor-pointer select-none transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Bank Dashboard</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-[#071f13] text-xs font-bold">{viewingBankAcc.name} Details</span>
            {viewingBankAcc.is_active === false && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">Inactive</span>
            )}
          </div>

          <div className="flex space-x-2">
            {!isReadOnly && (
              <ImportDropdown
                onCsv={file => onStartImport?.(file, 'csv', viewingBankAcc.id, viewingBankAcc.name)}
                onExcel={file => onStartImport?.(file, 'excel', viewingBankAcc.id, viewingBankAcc.name)}
              />
            )}
            {!isReadOnly && (
              <>
                <button
                  onClick={() => handleEditClick(viewingBankAcc)}
                  className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-[3px] transition cursor-pointer select-none shadow-sm"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit Account</span>
                </button>
                {viewingBankAcc.is_active !== false ? (
                  <button
                    onClick={() => handleDeactivate(viewingBankAcc)}
                    className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200/50 hover:bg-amber-100/60 text-amber-700 font-bold text-xs px-3 py-1.5 rounded-[3px] shadow-sm transition cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Deactivate</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(viewingBankAcc)}
                    className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-[3px] shadow-sm transition cursor-pointer"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    <span>Reactivate</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-[3px] p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[#071f13]">{viewingBankAcc.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Account Code: <span className="font-bold text-[#0F5B38]">{viewingBankAcc.code}</span> · Type: Bank Feed Account
            </p>
            {viewingBankAcc.description && (
              <p className="text-xs text-slate-500 mt-2 italic font-medium">"{viewingBankAcc.description}"</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-5 rounded-[3px] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100/50">
                <CreditCard className="h-4.5 w-4.5 text-[#0F5B38]" />
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Balance</span>
              <p className={`text-xl font-black mt-1 ${runningBal >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                {runningBal < 0 ? '-' : ''}{currencySymbol}{Math.abs(runningBal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white p-5 rounded-[3px] border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-wider">Total Income (Inflow)</span>
              <p className="text-xl font-black text-[#0F5B38] mt-1">
                {currencySymbol}{totalInc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white p-5 rounded-[3px] border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] text-rose-600/80 font-bold uppercase tracking-wider">Total Expenses (Outflow)</span>
              <p className="text-xl font-black text-rose-600 mt-1">
                {currencySymbol}{totalExp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3px] border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800">Account Transaction History</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">All transactions recorded against this bank account.</p>
          </div>
          {(() => {
            const paymentRows = accountPayments.map(p => {
              const isInvoicePayment = p.invoice !== null
              const linkedInvoice = isInvoicePayment ? invoices.find(i => i.id === p.invoice) : null
              const linkedBill = !isInvoicePayment ? bills.find(b => b.id === p.bill) : null
              return {
                key: p.id,
                date: p.date,
                docNumber: linkedInvoice?.invoice_number ?? linkedBill?.bill_number ?? '—',
                type: isInvoicePayment ? 'Invoice Payment' : 'Bill Payment',
                amount: Number(p.amount),
                isInflow: isInvoicePayment,
                onClick: () => {
                  if (isInvoicePayment && onViewInvoice && p.invoice) onViewInvoice(p.invoice)
                  else if (!isInvoicePayment && onViewBill && p.bill) onViewBill(p.bill)
                },
                navigable: true,
              }
            })
            const srRows = accountSR.map(sr => ({
              key: sr.id,
              date: sr.date,
              docNumber: sr.reference || sr.id.slice(0, 8).toUpperCase(),
              type: sr.type === 'Receive' ? 'Receive Money' : 'Spend Money',
              amount: Number(sr.total),
              isInflow: sr.type === 'Receive',
              onClick: () => {},
              navigable: false,
            }))
            const allRows = [...paymentRows, ...srRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            if (allRows.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No transactions have been recorded against this bank account yet.
                </div>
              )
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="p-3">Date</th>
                      <th className="p-3">Document</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Flow</th>
                      {allRows.some(r => r.navigable) && <th className="p-3 text-center w-12">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allRows.map(row => (
                      <tr
                        key={row.key}
                        onClick={row.navigable ? row.onClick : undefined}
                        className={`transition-colors duration-150 ${row.navigable ? 'hover:bg-emerald-50/25 cursor-pointer' : ''}`}
                      >
                        <td className="p-3 whitespace-nowrap">{row.date}</td>
                        <td className="p-3 font-bold text-[#0F5B38]">{row.docNumber}</td>
                        <td className="p-3 text-slate-600">{row.type}</td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {currencySymbol}{row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${row.isInflow ? 'bg-emerald-50 text-emerald-600 border-emerald-100/30' : 'bg-rose-50 text-rose-600 border-rose-100/30'}`}>
                            {row.isInflow ? 'Inflow' : 'Outflow'}
                          </span>
                        </td>
                        {allRows.some(r => r.navigable) && (
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            {row.navigable && (
                              <button
                                onClick={row.onClick}
                                className="hover:bg-emerald-50 text-[#0F5B38] rounded-[3px] transition cursor-pointer text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1"
                              >View</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
            <div className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
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
            <label className="text-slate-500 uppercase tracking-wide text-[10px]">Account Code *</label>
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
              {isSubmitting ? 'Saving...' : editingBankAcc ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </>
    )
  }

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2.5">
          <CreditCard className="h-5 w-5 text-[#0F5B38]" />
          <span>Bank Accounts Dashboard</span>
        </h2>

        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4 py-2 rounded-[3px] transition cursor-pointer shadow-md shadow-emerald-950/10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Bank Account</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-0 gap-4">
        <div className="flex space-x-1 select-none text-xs font-semibold -mb-[1px] relative z-10">
          {(['Active', 'All', 'Deactivated'] as const).map(f => {
            const isActive = activeFilter === f
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 text-xs font-semibold transition-all border rounded-t-[3px] cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#0F5B38] border-slate-200 border-b-transparent font-bold -mb-[1px] relative z-10'
                    : 'bg-transparent hover:bg-slate-50 text-slate-450 hover:text-slate-855 border-slate-200'
                }`}
              >
                {f === 'Active' ? 'Active' : f === 'All' ? 'All Accounts' : 'Deactivated'}
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

          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value as any)}
            className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-3 py-2 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredBanks.length > 0 && filteredBanks.every(b => selectedIds.has(b.id))}
                    onChange={() => handleToggleSelectAll(filteredBanks.map(b => b.id))}
                    className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5">Bank / Account Name</th>
                <th className="px-6 py-2.5">Code</th>
                <th className="px-6 py-2.5">Type</th>
                <th className="px-6 py-2.5">Statement Balance</th>
                <th className="px-6 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {filteredBanks.map(bank => (
                <tr
                  key={bank.id}
                  onClick={(e) => handleRowClick(e, bank)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out cursor-pointer ${selectedIds.has(bank.id) ? 'bg-emerald-50/20' : ''}`}
                >
                  <td className="px-4 py-2.5 w-10 text-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(bank.id)}
                      onChange={() => handleToggleSelect(bank.id)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">{bank.name}</span>
                  </td>
                  <td className="px-6 py-2.5 font-bold text-[#0F5B38] text-[13px]">{bank.code}</td>
                  <td className="px-6 py-2.5 font-semibold text-slate-500">Bank Feed</td>
                  <td className="px-6 py-2.5 font-black text-slate-800">
                    {(() => {
                      const acctPayments = payments.filter(p => p.bank_account === bank.id)
                      const acctSR = spendReceive.filter(sr => sr.bank_account_id === bank.id)
                      const bal = acctPayments.filter(p => p.invoice !== null).reduce((s, p) => s + Number(p.amount), 0)
                               - acctPayments.filter(p => p.bill !== null).reduce((s, p) => s + Number(p.amount), 0)
                               + acctSR.filter(sr => sr.type === 'Receive').reduce((s, sr) => s + Number(sr.total), 0)
                               - acctSR.filter(sr => sr.type === 'Spend').reduce((s, sr) => s + Number(sr.total), 0)
                      return `${currencySymbol}${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    })()}
                  </td>
                  <td className="px-6 py-2.5">
                    {bank.is_active === false ? (
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
          <div
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  )
}
