import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight, X, Loader2, TrendingUp, RefreshCw, FileDown } from 'lucide-react'
import type { Organization } from '../../services/api'
import type { TabId } from '../../types/tabs'
import { apiService } from '../../services/api'
import type { PLReport, PLRow, PLTransaction } from '../../services/api/reports'
import { XeroDatePicker } from '../../components/XeroDatePicker'

interface ProfitAndLossTabProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
}

const PRESETS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'last_quarter', label: 'Last Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'last_year', label: 'Last Year' },
  { key: 'custom', label: 'Custom' },
]

const COMPARE_OPTIONS = [
  { key: 'none', label: 'No Comparison' },
  { key: 'prev_period', label: 'Previous Period' },
  { key: 'prev_year', label: 'Previous Year' },
  { key: 'custom', label: 'Custom Range' },
]

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: string): { start: string; end: string } {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  switch (preset) {
    case 'this_month':
      return { start: fmtDate(new Date(year, month, 1)), end: fmtDate(new Date(year, month + 1, 0)) }
    case 'last_month':
      return { start: fmtDate(new Date(year, month - 1, 1)), end: fmtDate(new Date(year, month, 0)) }
    case 'this_quarter': {
      const q = Math.floor(month / 3)
      return { start: fmtDate(new Date(year, q * 3, 1)), end: fmtDate(new Date(year, q * 3 + 3, 0)) }
    }
    case 'last_quarter': {
      let q = Math.floor(month / 3) - 1
      let y = year
      if (q < 0) { q = 3; y = year - 1 }
      return { start: fmtDate(new Date(y, q * 3, 1)), end: fmtDate(new Date(y, q * 3 + 3, 0)) }
    }
    case 'this_year':
      return { start: `${year}-01-01`, end: `${year}-12-31` }
    case 'last_year':
      return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` }
    default:
      return { start: `${year}-01-01`, end: fmtDate(today) }
  }
}

function fmtNum(val: number | undefined, showZero = false): string {
  if (val === undefined) return '-'
  if (val === 0 && !showZero) return '-'
  if (val < 0) {
    return `(${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  }
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(val: number | undefined, income: number): string {
  if (val === undefined || !income) return '-'
  return `${((val / income) * 100).toFixed(1)}%`
}

export function ProfitAndLossTab({ activeOrg, setActiveTab }: ProfitAndLossTabProps) {
  const [preset, setPreset] = useState('this_year')
  const [dateRange, setDateRange] = useState(() => getPresetRange('this_year'))
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual')
  const [compare, setCompare] = useState('none')
  const [compareRange, setCompareRange] = useState(() => getPresetRange('last_year'))
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [report, setReport] = useState<PLReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showPct, setShowPct] = useState(false)

  const [drilldown, setDrilldown] = useState<{
    row: PLRow; periodLabel: string; periodStart: string; periodEnd: string
  } | null>(null)
  const [drilldownData, setDrilldownData] = useState<PLTransaction[] | null>(null)
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  function buildParams() {
    const params: Parameters<typeof apiService.getProfitLoss>[1] = {
      start: dateRange.start,
      end: dateRange.end,
      basis,
      compare,
    }
    if (compare === 'custom') {
      params.compare_start = compareRange.start
      params.compare_end = compareRange.end
    }
    return params
  }

  const runReport = useCallback(async () => {
    setLoading(true)
    setReport(null)
    setError(null)
    setDrilldown(null)
    setDrilldownData(null)
    setShowPct(false)
    try {
      const data = await apiService.getProfitLoss(activeOrg.id, buildParams())
      setReport(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [activeOrg.id, dateRange, compareRange, basis, compare])

  async function handleExportPdf() {
    setPdfLoading(true)
    try {
      await apiService.downloadPLPdf(activeOrg.id, buildParams())
    } catch (e: any) {
      setError(e.message || 'Failed to export PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  useEffect(() => { runReport() }, [])

  function handlePreset(key: string) {
    setPreset(key)
    if (key !== 'custom') setDateRange(getPresetRange(key))
  }

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function openDrilldown(row: PLRow, periodLabel: string, periodStart: string, periodEnd: string) {
    if (!row.account_id) return
    setDrilldown({ row, periodLabel, periodStart, periodEnd })
    setDrilldownData(null)
    setDrilldownLoading(true)
    try {
      const res = await apiService.getPLDrilldown(activeOrg.id, {
        account_id: row.account_id,
        start: periodStart,
        end: periodEnd,
        basis,
        source: row.source || 'income',
      })
      setDrilldownData(res.transactions)
    } catch {
      setDrilldownData([])
    } finally {
      setDrilldownLoading(false)
    }
  }

  const periods = report?.periods ?? []
  const tradingIncome = report?.trading_income_total ?? {}

  function displayVal(val: number | undefined, periodLabel: string, isFormula = false): string {
    if (showPct) return fmtPct(val, tradingIncome[periodLabel] ?? 0)
    return fmtNum(val, isFormula)
  }

  function renderRow(row: PLRow, depth = 0): ReactNode {
    if (row.kind === 'section_header') {
      const isCollapsed = collapsed.has(row.id!)
      return (
        <div key={row.id}>
          <div
            className="flex items-center cursor-pointer hover:bg-slate-50 select-none"
            onClick={() => toggleCollapse(row.id!)}
          >
            <div
              className="flex-1 flex items-center py-2 gap-1.5 pr-2"
              style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
              {isCollapsed
                ? <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              }
              <span className="font-semibold text-slate-800 text-xs">{row.title}</span>
            </div>
            {periods.map(p => (
              <div key={p.label} className="w-36 text-right py-2 pr-4 font-semibold text-xs text-slate-700 flex-shrink-0">
                {displayVal(row.values?.[p.label], p.label)}
              </div>
            ))}
          </div>
          {!isCollapsed && row.children?.map(child => renderRow(child, depth + 1))}
        </div>
      )
    }

    if (row.kind === 'account') {
      return (
        <div key={row.account_id} className="flex items-center border-t border-slate-50 hover:bg-violet-50/40">
          <div
            className="flex-1 flex items-center py-1.5 gap-2 pr-2 min-w-0"
            style={{ paddingLeft: `${28 + depth * 16}px` }}
          >
            <span className="text-[10px] text-slate-400 w-8 flex-shrink-0 font-mono">{row.code}</span>
            <span className="text-[11px] text-slate-700 truncate">{row.title}</span>
          </div>
          {periods.map(p => (
            <div
              key={p.label}
              className="w-36 text-right py-1.5 pr-4 text-[11px] text-slate-700 flex-shrink-0 cursor-pointer hover:text-violet-600 hover:underline"
              onClick={() => openDrilldown(row, p.label, p.start, p.end)}
            >
              {displayVal(row.values?.[p.label], p.label)}
            </div>
          ))}
        </div>
      )
    }

    if (row.kind === 'formula') {
      const isNet = row.id === 'net_profit'
      return (
        <div
          key={row.id}
          className={`flex items-center border-t-2 mt-0.5 ${isNet ? 'border-slate-300 bg-slate-50' : 'border-slate-200'}`}
        >
          <div className="flex-1 py-2.5 px-3 min-w-0">
            <span className={`text-xs font-bold ${isNet ? 'text-slate-900' : 'text-slate-700'}`}>
              {row.title}
            </span>
          </div>
          {periods.map(p => {
            const val = row.values?.[p.label] ?? 0
            const isNeg = val < 0
            return (
              <div
                key={p.label}
                className={`w-36 text-right py-2.5 pr-4 text-xs font-bold flex-shrink-0 ${
                  isNet
                    ? isNeg ? 'text-red-600' : 'text-[#0F5B38]'
                    : 'text-slate-700'
                }`}
              >
                {displayVal(val, p.label, true)}
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
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Profit & Loss</h2>
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
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Period</label>
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

          {/* Custom date inputs */}
          {preset === 'custom' && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">From</label>
                <div className="w-36">
                  <XeroDatePicker
                    value={dateRange.start}
                    onChange={val => setDateRange(prev => ({ ...prev, start: val }))}
                    placeholder="DD Mon YYYY"
                    size="sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">To</label>
                <div className="w-36">
                  <XeroDatePicker
                    value={dateRange.end}
                    onChange={val => setDateRange(prev => ({ ...prev, end: val }))}
                    placeholder="DD Mon YYYY"
                    size="sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Basis */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Basis</label>
            <div className="flex rounded-[3px] border border-slate-200 overflow-hidden">
              {(['accrual', 'cash'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setBasis(b)}
                  className={`px-3 py-1.5 text-[11px] font-medium border-r border-slate-200 last:border-r-0 capitalize transition-colors cursor-pointer ${
                    basis === b ? 'bg-[#0F5B38] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* % of Income toggle */}
          {report && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Show As</label>
              <div className="flex rounded-[3px] border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowPct(false)}
                  className={`px-3 py-1.5 text-[11px] font-medium border-r border-slate-200 transition-colors cursor-pointer ${
                    !showPct ? 'bg-[#0F5B38] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Value
                </button>
                <button
                  onClick={() => setShowPct(true)}
                  className={`px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    showPct ? 'bg-[#0F5B38] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  % of Income
                </button>
              </div>
            </div>
          )}

          {/* Compare */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Compare</label>
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

          {/* Custom compare date inputs */}
          {compare === 'custom' && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Compare From</label>
                <div className="w-36">
                  <XeroDatePicker
                    value={compareRange.start}
                    onChange={val => setCompareRange(prev => ({ ...prev, start: val }))}
                    placeholder="DD Mon YYYY"
                    size="sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Compare To</label>
                <div className="w-36">
                  <XeroDatePicker
                    value={compareRange.end}
                    onChange={val => setCompareRange(prev => ({ ...prev, end: val }))}
                    placeholder="DD Mon YYYY"
                    size="sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Update */}
          <button
            onClick={runReport}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer"
          >
            {loading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />
            }
            Update
          </button>

          {/* Export PDF */}
          {report && (
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer"
            >
              {pdfLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />
              }
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
            <TrendingUp className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">Select a period and click Update</p>
          </div>
        )}

        {!loading && !error && report && (
          <>
            {/* Table header */}
            <div className="flex items-center border-b-2 border-slate-200 bg-slate-50">
              <div className="flex-1 py-3 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Account
              </div>
              {periods.map(p => (
                <div key={p.label} className="w-36 text-right py-3 pr-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex-shrink-0">
                  {p.label}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div>
              {report.rows.map(row => renderRow(row))}
            </div>

            {report.rows.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">
                No transactions found for this period
              </div>
            )}
          </>
        )}
      </div>

      {/* Drill-down panel */}
      {drilldown && (
        <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-xs font-bold text-slate-800">{drilldown.row.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{drilldown.periodLabel}</p>
            </div>
            <button
              onClick={() => { setDrilldown(null); setDrilldownData(null) }}
              className="text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
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
            drilldownData.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-400">No transactions found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left py-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      <th className="text-left py-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Number</th>
                      <th className="text-left py-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                      <th className="text-left py-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                      <th className="text-right py-2 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.map((txn, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-4 text-[11px] text-slate-600">{txn.date}</td>
                        <td className="py-2 px-4 text-[11px] text-slate-600 font-mono">{txn.number}</td>
                        <td className="py-2 px-4 text-[11px] text-slate-600">{txn.contact}</td>
                        <td className="py-2 px-4 text-[11px] text-slate-500 max-w-xs truncate">{txn.description || '—'}</td>
                        <td className="py-2 px-4 text-[11px] text-slate-700 text-right font-medium">{fmtNum(txn.amount)}</td>
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
