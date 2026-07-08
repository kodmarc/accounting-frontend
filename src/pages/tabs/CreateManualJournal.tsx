import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'
import { XeroDatePicker } from '../../components/XeroDatePicker'
import { SearchableInput } from '../../components/SearchableInput'
import type { TabId } from '../../types/tabs'

interface CreateManualJournalProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
}

interface JournalLineItem {
  id: string
  description: string
  accountId: string
  debit: number | ''
  credit: number | ''
}

export function CreateManualJournal({
  activeOrg,
  setActiveTab
}: CreateManualJournalProps) {
  const { showAlert } = usePopup()
  
  // Data loading states
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [narration, setNarration] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')
  const [currency, setCurrency] = useState(activeOrg.currency || 'USD')
  
  const [lines, setLines] = useState<JournalLineItem[]>([
    { id: '1', description: '', accountId: '', debit: '', credit: '' },
    { id: '2', description: '', accountId: '', debit: '', credit: '' }
  ])

  const loadData = async () => {
    setLoading(true)
    try {
      const loadedAccounts = await apiService.getAccounts(activeOrg.id)
      setAccounts(loadedAccounts)
      const defaultAcc1 = loadedAccounts[0]?.id || ''
      const defaultAcc2 = loadedAccounts[1]?.id || loadedAccounts[0]?.id || ''
      
      setLines([
        { id: '1', description: '', accountId: defaultAcc1, debit: '', credit: '' },
        { id: '2', description: '', accountId: defaultAcc2, debit: '', credit: '' }
      ])
    } catch { } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id])

  const updateLineField = (index: number, field: keyof JournalLineItem, value: any) => {
    const updated = [...lines]
    
    // Symmetrical validation: a row cannot have BOTH a debit and a credit
    if (field === 'debit' && value !== '' && value > 0) {
      updated[index].credit = ''
    } else if (field === 'credit' && value !== '' && value > 0) {
      updated[index].debit = ''
    }

    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setLines(updated)
  }

  const addLineItem = () => {
    const defaultAcc = accounts[0]?.id || ''
    setLines([...lines, {
      id: String(Date.now()),
      description: '',
      accountId: defaultAcc,
      debit: '',
      credit: ''
    }])
  }

  const removeLineItem = (index: number) => {
    if (lines.length <= 2) {
      showAlert({ title: 'Validation Warning', message: 'Manual journals require at least two double-entry lines.', type: 'warning' })
      return
    }
    setLines(lines.filter((_, idx) => idx !== index))
  }

  // Double-Entry matching computed calculations
  const getTotalDebits = () => {
    return lines.reduce((sum, l) => sum + (l.debit === '' ? 0 : Number(l.debit)), 0)
  }

  const getTotalCredits = () => {
    return lines.reduce((sum, l) => sum + (l.credit === '' ? 0 : Number(l.credit)), 0)
  }

  const totalDebits = getTotalDebits()
  const totalCredits = getTotalCredits()
  const isBalanced = totalDebits > 0 && Math.abs(totalDebits - totalCredits) < 0.001

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!narration.trim()) {
      showAlert({ title: 'Validation Warning', message: 'Narration description is a required field.', type: 'warning' })
      return
    }

    if (!isBalanced) {
      showAlert({ title: 'Unbalanced Journal', message: 'Manual journals cannot be posted unless total debits exactly equal total credits.', type: 'warning' })
      return
    }

    const emptyAccounts = lines.some(l => !l.accountId)
    if (emptyAccounts) {
      showAlert({ title: 'Validation Warning', message: 'All rows must have valid ledger account selections.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.createManualJournal(activeOrg.id, {
        narration,
        date,
        reference,
        currency,
        lines: lines.map(l => ({
          account_id: l.accountId,
          description: l.description || narration,
          debit: l.debit === '' ? 0 : Number(l.debit),
          credit: l.credit === '' ? 0 : Number(l.credit),
        })),
      })
      showAlert({
        title: 'Success',
        message: `Manual Journal posted successfully! Ledger adjusted by ${activeOrg.currency || 'USD'} ${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
        type: 'success'
      })
      setActiveTab('Home')
    } catch (err: any) {
      showAlert({ title: 'Post Failed', message: err.message || 'Failed to record manual journal.', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="flex space-x-2 justify-center items-center">
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce"></div>
        </div>
        <p className="text-slate-500 text-xs font-semibold tracking-wider">Syncing ledger chart of accounts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left font-sans w-full px-4 sm:px-6 lg:px-8 animate-fadeIn pb-12">
      {/* Header banner */}
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
        <button
          onClick={() => setActiveTab('Home')}
          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[3px] transition duration-200 cursor-pointer"
          title="Return Home"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <span className="text-[10px] text-slate-400 font-normal uppercase tracking-widest block">General Ledger</span>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Manual Journal</h2>
        </div>
      </div>

      {/* Balancing Alert Bar */}
      {!isBalanced && (totalDebits > 0 || totalCredits > 0) && (
        <div className="bg-rose-50 border border-rose-100 rounded-[3px] p-4 flex items-start space-x-3 text-rose-700 animate-fadeIn">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">
            <h4 className="font-bold">Journal Entry Unbalanced</h4>
            <p className="mt-0.5 leading-relaxed">
              Total Debits ({currencySymbol}{totalDebits.toFixed(2)}) must exactly equal Total Credits ({currencySymbol}{totalCredits.toFixed(2)}) before posting. Current difference is {currencySymbol}{Math.abs(totalDebits - totalCredits).toFixed(2)}.
            </p>
          </div>
        </div>
      )}

      {isBalanced && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[3px] p-4 flex items-start space-x-3 text-[#0F5B38] animate-fadeIn">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">
            <h4 className="font-bold">Journal Balanced & Ready</h4>
            <p className="mt-0.5 leading-relaxed">
              Double-entry debits exactly equal credits. General ledger indexes will post symmetrically.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handlePostJournal} className="space-y-6">
        <div className="bg-white rounded-[3px] border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Narration */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Narration / Description *</label>
              <input
                type="text"
                placeholder="Brief reason for journal adjustments..."
                required
                value={narration}
                onChange={e => setNarration(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition h-[38px]"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Journal Date *</label>
              <XeroDatePicker value={date} onChange={setDate} />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Reference</label>
              <input
                type="text"
                placeholder="e.g. ADJ-2026-06"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition h-[38px]"
              />
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition h-[38px] cursor-pointer"
              >
                <option value="SGD">SGD (S$)</option>
                <option value="PKR">PKR (₨)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>

          {/* Symmetrical Double Entry Lines Table Grid */}
          <div className="space-y-3.5 pt-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block border-b border-slate-100 pb-2">
              Double Entry Journal Ledger
            </span>

            <div className="border border-slate-200 rounded-[3px] overflow-visible bg-slate-50/10">
              <table className="w-full border-collapse border border-slate-200 text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="p-2 border border-slate-200">Description</th>
                    <th className="p-2 border border-slate-200 w-[35%]">Account</th>
                    <th className="p-2 border border-slate-200 text-right w-[15%]">Debit</th>
                    <th className="p-2 border border-slate-200 text-right w-[15%]">Credit</th>
                    <th className="p-2 border border-slate-200 text-center w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-normal text-slate-700">
                  {lines.map((line, index) => (
                    <tr key={line.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Description */}
                      <td className="p-0 border border-slate-200 align-middle">
                        <input
                          type="text"
                          value={line.description}
                          onChange={e => updateLineField(index, 'description', e.target.value)}
                          placeholder={narration || "Description detail..."}
                          className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0"
                        />
                      </td>

                      {/* Ledger Account */}
                      <td className="p-0 border border-slate-200 align-middle">
                        <SearchableInput
                          options={accountOptions}
                          value={line.accountId}
                          onChange={(val) => updateLineField(index, 'accountId', val)}
                          placeholder=""
                          className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Debit */}
                      <td className="p-0 border border-slate-200 align-middle">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={e => updateLineField(index, 'debit', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal text-right focus:outline-none focus:ring-0"
                        />
                      </td>

                      {/* Credit */}
                      <td className="p-0 border border-slate-200 align-middle">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={e => updateLineField(index, 'credit', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal text-right focus:outline-none focus:ring-0"
                        />
                      </td>

                      {/* Delete row */}
                      <td className="p-0 border border-slate-200 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          disabled={lines.length <= 2}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button */}
            <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-start">
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center space-x-1.5 text-[#0F5B38] hover:text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider bg-white px-3 py-1.5 rounded-[3px] border border-slate-200 shadow-sm transition duration-200 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add row</span>
              </button>
            </div>
          </div>

          {/* Totals and Post button */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            <div></div>
            <div className="bg-slate-50/50 border border-slate-200 p-6 rounded-[3px] space-y-3 h-fit text-xs font-semibold">
              <div className="flex justify-between text-slate-500">
                <span>Total Debits</span>
                <span>{currencySymbol}{totalDebits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2">
                <span>Total Credits</span>
                <span>{currencySymbol}{totalCredits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#0F5B38] font-black text-sm pt-1">
                <span>Journal Status</span>
                <span>{isBalanced ? 'Balanced' : 'Out of Balance'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 space-x-3">
            <button
              type="button"
              onClick={() => setActiveTab('Home')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isBalanced}
              className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Posting Journal...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Post Journal Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
