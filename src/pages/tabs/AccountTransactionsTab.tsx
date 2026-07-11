import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Search, Loader2, BarChart2, RefreshCw, X } from 'lucide-react'
import type { Organization, Account } from '../../services/api'
import { apiService } from '../../services/api'
import type { ATReport, ATSection, ATTransaction } from '../../services/api/reports'
import type { TabId } from '../../types/tabs'
import { XeroDatePicker } from '../../components/XeroDatePicker'
import { ExportDropdown } from '../../components/ExportDropdown'
import { exportATtoCsv, exportATtoExcel } from '../../utils/exportReports'

interface AccountTransactionsTabProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
}

const DATE_PRESETS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'last_quarter', label: 'Last Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

const SOURCE_BADGE: Record<string, string> = {
  'Receivable Invoice': 'bg-emerald-100 text-emerald-700',
  'Customer Receipt':   'bg-emerald-100 text-emerald-700',
  'Payable Bill':       'bg-amber-100 text-amber-700',
  'Supplier Payment':   'bg-amber-100 text-amber-700',
}

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: string): { start: string; end: string } {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  switch (preset) {
    case 'this_month':   return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(today) }
    case 'last_month':   return { start: fmtDate(new Date(y, m - 1, 1)), end: fmtDate(new Date(y, m, 0)) }
    case 'this_quarter': { const q = Math.floor(m / 3); return { start: fmtDate(new Date(y, q * 3, 1)), end: fmtDate(today) } }
    case 'last_quarter': {
      const q = Math.floor(m / 3)
      const pq = q === 0 ? 3 : q - 1
      const py = q === 0 ? y - 1 : y
      return { start: fmtDate(new Date(py, pq * 3, 1)), end: fmtDate(new Date(py, pq * 3 + 3, 0)) }
    }
    case 'this_year':    return { start: `${y}-01-01`, end: fmtDate(today) }
    default:             return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(today) }
  }
}

function fmtNum(val: number, showZero = false): string {
  if (val === 0 && !showZero) return '—'
  if (val < 0) return `(${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function numCls(val: number) { return val < 0 ? 'text-red-600' : '' }

// ── Account multi-select dropdown ─────────────────────────────────

interface AccountDropdownProps {
  accounts: Account[]
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}

function AccountDropdown({ accounts, selected, onToggle, onSelectAll, onClear }: AccountDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const grouped: Record<string, Account[]> = {}
  for (const acc of accounts) {
    const q = search.toLowerCase()
    if (q && !acc.name.toLowerCase().includes(q) && !(acc.code || '').toLowerCase().includes(q)) continue
    if (!grouped[acc.class_type]) grouped[acc.class_type] = []
    grouped[acc.class_type].push(acc)
  }

  const label = selected.size === 0
    ? 'Select accounts…'
    : selected.size === accounts.length
      ? 'All accounts'
      : `${selected.size} account${selected.size > 1 ? 's' : ''} selected`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-slate-200 rounded-[3px] px-3 py-1.5 text-[11px] text-slate-700 bg-white hover:bg-slate-50 min-w-[210px] cursor-pointer"
      >
        <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-[3px] shadow-lg w-72">
          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts…"
              className="flex-1 text-xs outline-none text-slate-700 min-w-0"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex gap-3 px-3 py-1.5 border-b border-slate-100">
            <button onClick={onSelectAll} className="text-[10px] text-[#0F5B38] hover:underline cursor-pointer font-medium">Select All</button>
            <button onClick={onClear} className="text-[10px] text-slate-400 hover:underline cursor-pointer">Clear</button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {Object.keys(grouped).length === 0 && (
              <p className="text-center py-6 text-xs text-slate-400">No accounts found</p>
            )}
            {Object.entries(grouped).map(([cls, accs]) => (
              <div key={cls}>
                <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0">
                  {cls}
                </div>
                {accs.map(acc => (
                  <label key={acc.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(acc.id)}
                      onChange={() => onToggle(acc.id)}
                      className="accent-[#0F5B38] h-3 w-3 flex-shrink-0"
                    />
                    {acc.code && (
                      <span className="text-[10px] text-slate-400 font-mono w-8 flex-shrink-0">{acc.code}</span>
                    )}
                    <span className="text-[11px] text-slate-700 truncate">{acc.name}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section display ────────────────────────────────────────────────

const COLS = ['Date', 'Source', 'Account', 'Reference', 'Description', 'Debit', 'Credit', 'Gross', 'Tax', 'Balance']
const RIGHT_COLS = new Set(['Debit', 'Credit', 'Gross', 'Tax', 'Balance'])

function TxnRow({ t }: { t: ATTransaction }) {
  return (
    <tr className="border-b border-slate-50 hover:bg-emerald-50/20">
      <td className="py-1.5 px-3 text-[11px] text-slate-600 whitespace-nowrap">{t.date}</td>
      <td className="py-1.5 px-3">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${SOURCE_BADGE[t.source_type] ?? 'bg-slate-100 text-slate-600'}`}>
          {t.source_type}
        </span>
      </td>
      <td className="py-1.5 px-3 text-[11px] text-slate-500 font-mono whitespace-nowrap">
        {t.account_code ? `${t.account_code} ${t.account_name}` : t.account_name}
      </td>
      <td className="py-1.5 px-3 text-[11px] text-slate-600 font-mono">{t.reference}</td>
      <td className="py-1.5 px-3 text-[11px] text-slate-600 max-w-[200px] truncate">{t.description || '—'}</td>
      <td className={`py-1.5 px-3 text-[11px] text-right ${t.debit ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>
        {t.debit ? fmtNum(t.debit, true) : '—'}
      </td>
      <td className={`py-1.5 px-3 text-[11px] text-right ${t.credit ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>
        {t.credit ? fmtNum(t.credit, true) : '—'}
      </td>
      <td className="py-1.5 px-3 text-[11px] text-right text-slate-700">
        {fmtNum(t.gross, true)}
      </td>
      <td className={`py-1.5 px-3 text-[11px] text-right ${t.tax_amount ? 'text-slate-700' : 'text-slate-300'}`}>
        {t.tax_amount ? fmtNum(t.tax_amount, true) : '—'}
      </td>
      <td className={`py-1.5 px-3 text-[11px] text-right font-medium ${numCls(t.running_balance)}`}>
        {fmtNum(t.running_balance, true)}
      </td>
    </tr>
  )
}

function SectionPanel({ sec }: { sec: ATSection }) {
  const [collapsed, setCollapsed] = useState(false)
  const accountNames = sec.accounts.map(a => a.name).join(', ')

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      {/* Section header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 cursor-pointer hover:bg-slate-100 select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {collapsed
            ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            : <ChevronUp className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
          <span className="text-xs font-bold text-slate-700">{sec.class_type}</span>
          <span className="text-[10px] text-slate-400 truncate max-w-xs hidden md:block">{accountNames}</span>
        </div>
        <div className={`text-xs font-bold flex-shrink-0 ml-4 ${numCls(sec.closing_balance)}`}>
          {fmtNum(sec.closing_balance, true)}
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                {COLS.map(h => (
                  <th key={h} className={`py-2 px-3 text-[9px] font-semibold text-slate-400 uppercase tracking-wide ${RIGHT_COLS.has(h) ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Opening balance */}
              {sec.opening_balance !== 0 && (
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <td className="py-2 px-3 text-[11px] font-semibold text-slate-600" colSpan={5}>Opening Balance</td>
                  <td className={`py-2 px-3 text-[11px] text-right font-semibold ${sec.opening_balance > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                    {sec.opening_balance > 0 ? fmtNum(sec.opening_balance, true) : '—'}
                  </td>
                  <td className={`py-2 px-3 text-[11px] text-right font-semibold ${sec.opening_balance < 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                    {sec.opening_balance < 0 ? fmtNum(Math.abs(sec.opening_balance), true) : '—'}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-right text-slate-300">—</td>
                  <td className="py-2 px-3 text-[11px] text-right text-slate-300">—</td>
                  <td className={`py-2 px-3 text-[11px] text-right font-semibold ${numCls(sec.opening_balance)}`}>
                    {fmtNum(sec.opening_balance, true)}
                  </td>
                </tr>
              )}

              {sec.transactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-xs text-slate-400">No transactions in this period</td>
                </tr>
              )}

              {sec.transactions.map((t, i) => <TxnRow key={i} t={t} />)}
            </tbody>

            {/* Total row */}
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60">
                <td className="py-2 px-3 text-[11px] font-bold text-slate-700" colSpan={5}>
                  Total {sec.class_type}
                </td>
                <td className="py-2 px-3 text-[11px] font-bold text-right text-slate-700">
                  {fmtNum(sec.total_debit, true)}
                </td>
                <td className="py-2 px-3 text-[11px] font-bold text-right text-slate-700">
                  {fmtNum(sec.total_credit, true)}
                </td>
                <td className="py-2 px-3 text-[11px] font-bold text-right text-slate-700">
                  {fmtNum(sec.transactions.reduce((s, t) => s + t.gross, 0), true)}
                </td>
                <td className="py-2 px-3 text-[11px] font-bold text-right text-slate-700">
                  {fmtNum(sec.transactions.reduce((s, t) => s + t.tax_amount, 0), true)}
                </td>
                <td className={`py-2 px-3 text-[11px] font-bold text-right ${numCls(sec.closing_balance)}`}>
                  {fmtNum(sec.closing_balance, true)}
                </td>
              </tr>

              {/* Closing balance row */}
              <tr className="border-t border-slate-100 bg-slate-50/30">
                <td className="py-2 px-3 text-[11px] font-semibold text-slate-600" colSpan={5}>Closing Balance</td>
                <td className={`py-2 px-3 text-[11px] text-right font-semibold ${sec.closing_balance > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                  {sec.closing_balance > 0 ? fmtNum(sec.closing_balance, true) : '—'}
                </td>
                <td className={`py-2 px-3 text-[11px] text-right font-semibold ${sec.closing_balance < 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                  {sec.closing_balance < 0 ? fmtNum(Math.abs(sec.closing_balance), true) : '—'}
                </td>
                <td className="py-2 px-3 text-[11px] text-right text-slate-300">—</td>
                <td className="py-2 px-3 text-[11px] text-right text-slate-300">—</td>
                <td className={`py-2 px-3 text-[11px] text-right font-semibold ${numCls(sec.closing_balance)}`}>
                  {fmtNum(sec.closing_balance, true)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Grand Total row ────────────────────────────────────────────────

function GrandTotal({ sections }: { sections: ATSection[] }) {
  const totalDebit = sections.reduce((s, sec) => s + sec.total_debit, 0)
  const totalCredit = sections.reduce((s, sec) => s + sec.total_credit, 0)
  const totalGross = sections.reduce((s, sec) => sec.transactions.reduce((ss, t) => ss + t.gross, s), 0)
  const totalTax = sections.reduce((s, sec) => sec.transactions.reduce((ss, t) => ss + t.tax_amount, s), 0)
  const netBalance = totalDebit - totalCredit

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <tbody>
          <tr className="border-t-2 border-slate-300 bg-slate-50">
            <td className="py-3 px-3 text-[11px] font-bold text-slate-800" colSpan={5}>Total</td>
            <td className="py-3 px-3 text-[11px] font-bold text-right text-slate-800">{fmtNum(totalDebit, true)}</td>
            <td className="py-3 px-3 text-[11px] font-bold text-right text-slate-800">{fmtNum(totalCredit, true)}</td>
            <td className="py-3 px-3 text-[11px] font-bold text-right text-slate-800">{fmtNum(totalGross, true)}</td>
            <td className="py-3 px-3 text-[11px] font-bold text-right text-slate-800">{fmtNum(totalTax, true)}</td>
            <td className={`py-3 px-3 text-[11px] font-bold text-right ${numCls(netBalance)}`}>
              {fmtNum(netBalance, true)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export function AccountTransactionsTab({ activeOrg, setActiveTab }: AccountTransactionsTabProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [preset, setPreset] = useState('this_month')
  const [start, setStart] = useState(() => getPresetRange('this_month').start)
  const [end, setEnd] = useState(() => getPresetRange('this_month').end)
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual')

  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [report, setReport] = useState<ATReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setAccountsLoading(true)
    apiService.getAccounts(activeOrg.id)
      .then(data => { if (!cancelled) setAccounts(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAccountsLoading(false) })
    return () => { cancelled = true }
  }, [activeOrg.id])

  function handlePreset(key: string) {
    setPreset(key)
    if (key !== 'custom') {
      const r = getPresetRange(key)
      setStart(r.start)
      setEnd(r.end)
    }
  }

  function toggleAccount(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function buildParams() {
    return { account_ids: Array.from(selected).join(','), start, end, basis }
  }

  const runReport = useCallback(async () => {
    if (selected.size === 0) { setError('Please select at least one account.'); return }
    setLoading(true); setReport(null); setError(null)
    try {
      const data = await apiService.getAccountTransactions(activeOrg.id, buildParams())
      setReport(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [activeOrg.id, selected, start, end, basis]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExportPdf() {
    if (selected.size === 0) return
    setPdfLoading(true)
    try {
      await apiService.downloadATPdf(activeOrg.id, buildParams())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to export PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Account Transactions</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{activeOrg.name}</p>
        </div>
        <button onClick={() => setActiveTab('AllReports')} className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer">
          ← Back to Reports
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Date presets */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Period</label>
            <select
              value={preset}
              onChange={e => handlePreset(e.target.value)}
              className="border border-slate-200 rounded-[3px] px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0F5B38] bg-white"
            >
              {DATE_PRESETS.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          {preset === 'custom' && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">From</label>
                <div className="w-36">
                  <XeroDatePicker value={start} onChange={val => setStart(val)} placeholder="DD Mon YYYY" size="sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">To</label>
                <div className="w-36">
                  <XeroDatePicker value={end} onChange={val => setEnd(val)} placeholder="DD Mon YYYY" size="sm" />
                </div>
              </div>
            </>
          )}

          {/* Basis */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Basis</label>
            <div className="flex rounded-[3px] border border-slate-200 overflow-hidden">
              {(['accrual', 'cash'] as const).map(b => (
                <button key={b} onClick={() => setBasis(b)}
                  className={`px-3 py-1.5 text-[11px] font-medium border-r border-slate-200 last:border-r-0 transition-colors cursor-pointer capitalize ${basis === b ? 'bg-[#0F5B38] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Account selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Accounts</label>
            {accountsLoading
              ? <div className="flex items-center gap-1.5 py-1.5 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>
              : <AccountDropdown accounts={accounts} selected={selected} onToggle={toggleAccount}
                  onSelectAll={() => setSelected(new Set(accounts.map(a => a.id)))}
                  onClear={() => setSelected(new Set())} />
            }
          </div>

          {/* Run / PDF */}
          <button onClick={runReport} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Update
          </button>

          {report && (
            <ExportDropdown
              pdfLoading={pdfLoading}
              onPdf={handleExportPdf}
              onCsv={() => exportATtoCsv(report, `account_transactions_${start}_${end}.csv`)}
              onExcel={() => exportATtoExcel(report, `account_transactions_${start}_${end}.xlsx`)}
            />
          )}
        </div>
      </div>

      {/* Report */}
      <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0F5B38]" />
          </div>
        )}
        {error && !loading && (
          <div className="p-10 text-center text-red-500 text-sm">{error}</div>
        )}
        {!loading && !error && !report && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BarChart2 className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">Select accounts and click Run to view transactions</p>
          </div>
        )}

        {!loading && !error && report && (
          <>
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                {report.basis === 'cash' ? 'Cash Basis' : 'Accrual Basis'}
              </span>
              <span className="text-[10px] text-slate-400">{report.start} – {report.end}</span>
              <span className="text-[10px] text-slate-400">
                {report.sections.length} group{report.sections.length !== 1 ? 's' : ''}
              </span>
            </div>

            {report.sections.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">
                No data found for the selected accounts and period.
              </div>
            )}

            {report.sections.map(sec => (
              <SectionPanel key={sec.class_type} sec={sec} />
            ))}

            {report.sections.length > 0 && <GrandTotal sections={report.sections} />}
          </>
        )}
      </div>
    </div>
  )
}
