import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'
import { XeroDatePicker } from '../../components/XeroDatePicker'
import type { TabId } from '../../types/tabs'

interface CreateTransferMoneyProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
}

export function CreateTransferMoney({
  activeOrg,
  setActiveTab
}: CreateTransferMoneyProps) {
  const { showAlert } = usePopup()
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const loadData = async () => {
    setLoading(true)
    try {
      const allAccounts = await apiService.getAccounts(activeOrg.id)
      let banks = allAccounts.filter(a => a.type === 'Bank' || a.class_type === 'Asset' && a.code === '090')
      if (banks.length === 0) {
        // fallback if no active banks seeded yet
        banks = [
          { id: 'bank-090', code: '090', name: 'ANZ Business Account', class_type: 'Asset', type: 'Bank', description: 'Primary bank', is_system_account: true, created_at: '', default_tax_rate: null }
        ]
      }
      setBankAccounts(banks)
      if (banks.length > 0) {
        setFromAccountId(banks[0].id)
        if (banks.length > 1) {
          setToAccountId(banks[1].id)
        }
      }
    } catch { } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id])

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) {
      showAlert({ title: 'Validation Warning', message: 'Please select both source and destination bank accounts.', type: 'warning' })
      return
    }

    if (fromAccountId === toAccountId) {
      showAlert({ title: 'Validation Warning', message: 'Source and destination accounts must be different.', type: 'warning' })
      return
    }

    const amountVal = parseFloat(amount)
    if (isNaN(amountVal) || amountVal <= 0) {
      showAlert({ title: 'Validation Warning', message: 'Please enter a valid positive transfer amount.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      showAlert({ title: 'Success', message: `Successfully transferred ${activeOrg.currency || 'USD'} ${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`, type: 'success' })
      setActiveTab('BankAccounts')
    } catch (err: any) {
      showAlert({ title: 'Error', message: 'Failed to record bank transfer: ' + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="flex space-x-2 justify-center items-center">
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce"></div>
        </div>
        <p className="text-slate-500 text-xs font-semibold tracking-wider">Syncing bank details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left font-sans w-full px-4 sm:px-6 lg:px-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
        <button
          onClick={() => setActiveTab('BankAccounts')}
          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[3px] transition duration-200 cursor-pointer"
          title="Return to Bank Accounts"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <span className="text-[10px] text-slate-400 font-normal uppercase tracking-widest block">Banking Ledger</span>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Transfer Money</h2>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white rounded-[3px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800">New Internal Bank Transfer</h3>
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Move funds between registered bank ledger accounts.</p>
        </div>

        <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs font-normal text-slate-700">
          {/* From Account */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transfer From (Source Account) *</label>
            <select
              value={fromAccountId}
              onChange={e => setFromAccountId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal text-slate-800 focus:outline-none focus:border-[#0F5B38] transition h-[38px] cursor-pointer"
            >
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          {/* To Account */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transfer To (Destination Account) *</label>
            <select
              value={toAccountId}
              onChange={e => setToAccountId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal text-slate-800 focus:outline-none focus:border-[#0F5B38] transition h-[38px] cursor-pointer"
            >
              <option value="">Select destination...</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Amount ({activeOrg.currency || 'USD'}) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold">{currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-[3px] pl-8.5 pr-4 py-2 text-[15px] font-normal text-slate-800 focus:outline-none focus:border-[#0F5B38] transition h-[38px] placeholder:text-slate-350"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transfer Date *</label>
            <XeroDatePicker value={date} onChange={setDate} />
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Reference / Notes</label>
            <input
              type="text"
              placeholder="e.g. Internal funding reserves transfer"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal text-slate-800 focus:outline-none focus:border-[#0F5B38] transition h-[38px] placeholder:text-slate-355"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 space-x-3">
            <button
              type="button"
              onClick={() => setActiveTab('BankAccounts')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Confirm Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
