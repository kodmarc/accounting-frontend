import { useState, useCallback, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, X, Loader2, BarChart2, RefreshCw, FileDown, ExternalLink } from 'lucide-react'
import type { Organization } from '../../services/api'
import { apiService } from '../../services/api'
import type { BSReport, BSRow, BSTransaction } from '../../services/api/reports'
import type { TabId } from '../../types/tabs'
import { XeroDatePicker } from '../../components/XeroDatePicker'

interface BalanceSheetTabProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
}

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'end_last_month', label: 'End of Last Month' },
  { key: 'end_last_quarter', label: 'End of Last Quarter' },
  { key: 'end_last_year', label: 'End of Last Year' },
  { key: 'custom', label: 'Custom' },
]

const COMPARE_OPTIONS = [
  { key: 'none', label: 'No Comparison' },
  { key: 'prev_month', label: 'Previous Month' },
  { key: 'prev_year', label: 'Previous Year' },
  { key: 'custom', label: 'Custom Date' },
]

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getPresetDate(preset: string): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  switch (preset) {
    case 'today':
      return fmtDate(today)
    case 'end_last_month':
      return fmtDate(new Date(year, month, 0))
    case 'end_last_quarter': {
      const q = Math.floor(month / 3)
      const prevQ = q === 0 ? 3 : q - 1
      const prevQYear = q === 0 ? year - 1 : year
      return fmtDate(new Date(prevQYear, prevQ * 3 + 3, 0))
    }
    case 'end_last_year':
      return `${year - 1}-12-31`
    default:
      return fmtDate(today)
  }
}

function fmtNum(val: number | undefined, showZero = false): string {
  if (val === undefined || val === null) return '—'
  if (val === 0 && !showZero) return '—'
  if (val < 0) {
    return `(${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  }
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BalanceSheetTab({ activeOrg, setActiveTab }: BalanceSheetTabProps) {
  const [preset, setPreset] = useState('today')
  const [asAt, setAsAt] = useState(() => fmtDate(new Date()))
  const [compare, setCompare] = useState('none')
  const [compareDate, setCompareDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return fmtDate(d)
  })
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual')
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [report, setReport] = useState<BSReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const [drilldown, setDrilldown] = useState<{ row: BSRow; dateLabel: string; dateAsAt: string } | null>(null)
  const [drilldownData, setDrilldownData] = useState<BSTransaction[] | null>(null)
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  function buildParams() {
    const p: { as_at: string; basis: string; compare: string; compare_date?: string } = { as_at: asAt, basis, compare }
    if (compare === 'custom') p.compare_date = compareDate
    return p
  }

  const runReport = useCallback(async () => {
    setLoading(true)
    setReport(null)
    setError(null)
    setDrilldown(null)
    setDrilldownData(null)
    try {
      const data = await apiService.getBalanceSheet(activeOrg.id, buildParams())
      setReport(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [activeOrg.id, asAt, basis, compare, compareDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePreset(key: string) {
    setPreset(key)
    if (key !== 'custom') setAsAt(getPresetDate(key))
  }

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function openDrilldown(row: BSRow, dateLabel: string, dateAsAt: string) {
    if (row.drilldown === 'pnl') {
      setActiveTab('ProfitAndLoss')
      return
    }
    if (!row.drilldown) return
    setDrilldown({ row, dateLabel, dateAsAt })
    setDrilldownData(null)
    setDrilldownLoading(true)
    try {
      const res = await apiService.getBSDrilldown(activeOrg.id, {
        section: row.drilldown,
        as_at: dateAsAt,
        account_id: row.account_id,
      })
      setDrilldownData(res.transactions)
    } catch {
      setDrilldownData([])
    } finally {
      setDrilldownLoading(false)
    }
  }

  async function handleExportPdf() {
    setPdfLoading(true)
    try {
      await apiService.downloadBSPdf(activeOrg.id, buildParams())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to export PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const dates = report?.dates ?? []

  function renderRow(row: BSRow, depth = 0): ReactNode {
    const key = row.id ?? row.account_id ?? row.title

    if (row.kind === 'section_header') {
      const isCollapsed = collapsed.has(row.id ?? '')
      return (
        <div key={key}>
          <div
            className="flex items-center cursor-pointer hover:bg-slate-50 select-none"
            onClick={() => toggleCollapse(row.id ?? '')}
          >
            <div
              className="flex-1 flex items-center py-2 gap-1.5 pr-2 min-w-0 overflow-hidden"
              style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
              {isCollapsed
                ? <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
              <span className="font-semibold text-slate-800 text-xs truncate">{row.title}</span>
            </div>
            {dates.map(d => (
              <div key={d.label} className="w-36 text-right py-2 pr-4 font-semibold text-xs text-slate-600 flex-shrink-0">
                {fmtNum(row.values?.[d.label])}
              </div>
            ))}
          </div>
          {!isCollapsed && row.children?.map(child => renderRow(child, depth + 1))}
        </div>
      )
    }

    if (row.kind === 'account' || row.kind === 'derived') {
      const clickable = !!row.drilldown
      return (
        <div key={key} className="flex items-center border-t border-slate-50 hover:bg-emerald-50/30">
          <div
            className="flex-1 flex items-center py-1.5 gap-2 pr-2 min-w-0 overflow-hidden"
            style={{ paddingLeft: `${28 + depth * 16}px` }}
          >
            {row.code && (
              <span className="text-[10px] text-slate-400 w-8 flex-shrink-0 font-mono">{row.code}</span>
            )}
            <span className={`text-[11px] truncate ${row.is_contra ? 'text-slate-500 italic' : 'text-slate-700'}`}>
              {row.is_contra ? `Less: ${row.title}` : row.title}
            </span>
            {row.drilldown === 'pnl' && <ExternalLink className="h-3 w-3 text-slate-400 flex-shrink-0" />}
          </div>
          {dates.map(d => (
            <div
              key={d.label}
              onClick={() => clickable && openDrilldown(row, d.label, d.date)}
              className={`w-36 text-right py-1.5 pr-4 text-[11px] flex-shrink-0 ${
                clickable
                  ? 'cursor-pointer hover:text-[#0F5B38] hover:underline text-slate-700'
                  : 'text-slate-700'
              }`}
            >
              {fmtNum(row.values?.[d.label])}
            </div>
          ))}
        </div>
      )
    }

    if (row.kind === 'formula') {
      const KEY_IDS = new Set(['total_assets', 'total_liabilities', 'net_assets', 'total_equity'])
      const isKey = KEY_IDS.has(row.id ?? '')
      const isCurrYr = row.id === 'current_year_earnings'

      return (
        <div
          key={key}
          className={`flex items-center mt-0.5 ${isKey ? 'border-t-2 border-slate-300 bg-slate-50' : 'border-t border-slate-200'}`}
        >
          <div
            className="flex-1 py-2 pr-2 min-w-0 overflow-hidden"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <span className={`text-xs font-bold truncate block ${isKey ? 'text-slate-900' : 'text-slate-700'}`}>
              {row.title}
            </span>
            {isCurrYr && (
              <button
                onClick={() => setActiveTab('ProfitAndLoss')}
                className="ml-2 text-[10px] text-[#0F5B38] hover:underline cursor-pointer"
              >
                View P&L →
              </button>
            )}
          </div>
          {dates.map(d => {
            const val = row.values?.[d.label] ?? 0
            return (
              <div
                key={d.label}
                className={`w-36 text-right py-2 pr-4 text-xs font-bold flex-shrink-0 ${
                  isKey ? (val < 0 ? 'text-red-600' : 'text-[#0F5B38]') : 'text-slate-700'
                }`}
              >
                {fmtNum(val, true)}
              </div>
            )
          })}
        </div>
      )
    }

    return null
  }

  const drilldownTotal = drilldownData?.reduce((s, t) => s + t.amount, 0) ?? 0

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Balance Sheet</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{activeOrg.name}</p>
        </div>
        <button
          onClick={() => setActiveTab('AllReports')}
          className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
        >
          ← Back to Reports
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date presets */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              As At
            </label>
            <select
              value={preset}
              onChange={e => handlePreset(e.target.value)}
              className="border border-slate-200 rounded-[3px] px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0F5B38] bg-white"
            >
              {PRESETS.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          {preset === 'custom' && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Date
              </label>
              <div className="w-36">
                <XeroDatePicker
                  value={asAt}
                  onChange={val => setAsAt(val)}
                  placeholder="DD Mon YYYY"
                  size="sm"
                />
              </div>
            </div>
          )}

          {/* Basis */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Basis
            </label>
            <div className="flex rounded-[3px] border border-slate-200 overflow-hidden">
              {(['accrual', 'cash'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setBasis(b)}
                  className={`px-3 py-1.5 text-[11px] font-medium border-r border-slate-200 last:border-r-0 transition-colors cursor-pointer capitalize ${
                    basis === b ? 'bg-[#0F5B38] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Compare */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Compare
            </label>
            <select
              value={compare}
              onChange={e => setCompare(e.target.value)}
              className="border border-slate-200 rounded-[3px] px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0F5B38] bg-white"
            >
              {COMPARE_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          {compare === 'custom' && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Compare Date
              </label>
              <div className="w-36">
                <XeroDatePicker
                  value={compareDate}
                  onChange={val => setCompareDate(val)}
                  placeholder="DD Mon YYYY"
                  size="sm"
                />
              </div>
            </div>
          )}

          {/* Update */}
          <button
            onClick={runReport}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer"
          >
            {loading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Update
          </button>

          {report && (
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer"
            >
              {pdfLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />}
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Report table */}
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
            <p className="text-sm font-medium">Click Update to generate the Balance Sheet</p>
          </div>
        )}
        {!loading && !error && report && (
          <>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                {report.basis === 'cash' ? 'Cash Basis' : 'Accrual Basis'}
              </span>
            </div>
            <div className="flex items-center border-b-2 border-slate-200 bg-slate-50">
              <div className="flex-1 py-3 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wide min-w-0 overflow-hidden">
                Account
              </div>
              {dates.map(d => (
                <div
                  key={d.label}
                  className="w-36 text-right py-3 pr-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex-shrink-0"
                >
                  {d.label}
                </div>
              ))}
            </div>
            <div>
              {report.rows.map(row => renderRow(row))}
            </div>
          </>
        )}
      </div>

      {/* Drilldown panel */}
      {drilldown && (
        <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-xs font-bold text-slate-800">{drilldown.row.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">As at {drilldown.dateLabel}</p>
            </div>
            <button
              onClick={() => { setDrilldown(null); setDrilldownData(null) }}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {drilldownLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#0F5B38]" />
            </div>
          )}

          {!drilldownLoading && drilldownData && (
            drilldownData.length === 0
              ? <p className="text-center py-10 text-xs text-slate-400">No transactions found</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        {['Date', 'Number', 'Contact', 'Description', 'Amount'].map(h => (
                          <th
                            key={h}
                            className={`py-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownData.map((txn, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-4 text-[11px] text-slate-600">{txn.date || '—'}</td>
                          <td className="py-2 px-4 text-[11px] text-slate-600 font-mono">{txn.number || '—'}</td>
                          <td className="py-2 px-4 text-[11px] text-slate-600">{txn.contact || '—'}</td>
                          <td className="py-2 px-4 text-[11px] text-slate-500 max-w-xs truncate">{txn.description || '—'}</td>
                          <td className={`py-2 px-4 text-[11px] text-right font-medium ${txn.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {fmtNum(txn.amount, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={4} className="py-2.5 px-4 text-[11px] font-semibold text-slate-700">Total</td>
                        <td className="py-2.5 px-4 text-[11px] font-bold text-slate-800 text-right">
                          {fmtNum(drilldownTotal, true)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
          )}
        </div>
      )}
    </div>
  )
}
