import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, Loader2, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import type { Organization } from '../../services/api'
import { apiService } from '../../services/api'
import type { CFReport, CFLine, CFParams } from '../../services/api/reports'
import type { TabId } from '../../types/tabs'
import { XeroDatePicker } from '../../components/XeroDatePicker'
import { ExportDropdown } from '../../components/ExportDropdown'
import { exportCFtoCsv, exportCFtoExcel } from '../../utils/exportReports'

interface CashFlowStatementTabProps {
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
    case 'this_year': return { start: `${y}-01-01`, end: fmtDate(today) }
    default:          return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(today) }
  }
}

function fmtNum(val: number, showZero = false): string {
  if (val === 0 && !showZero) return '—'
  if (val < 0) return `(${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function amtCls(val: number, neutral = false): string {
  if (neutral || val === 0) return 'text-slate-400'
  return val < 0 ? 'text-red-600' : 'text-emerald-700'
}

// ── Section panel ──────────────────────────────────────────────────

interface SectionProps {
  title: string
  total: number
  totalLabel: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, total, totalLabel, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer select-none hover:bg-slate-50"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          <span className="text-xs font-bold text-slate-700">{title}</span>
        </div>
        <span className={`text-xs font-bold ${amtCls(total)}`}>{fmtNum(total, true)}</span>
      </div>
      {open && (
        <div className="pb-2">
          <table className="w-full">
            <tbody>
              {children}
              <tr className="border-t border-slate-200 bg-slate-50/60">
                <td className="py-2.5 px-5 text-[11px] font-bold text-slate-700">{totalLabel}</td>
                <td className={`py-2.5 px-5 text-right text-[11px] font-bold ${amtCls(total)}`}>
                  {fmtNum(total, true)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LineRow({ label, amount, indent = false }: { label: string; amount: number; indent?: boolean }) {
  return (
    <tr className="hover:bg-emerald-50/20 border-b border-slate-50">
      <td className={`py-2 text-[11px] text-slate-600 ${indent ? 'pl-10 pr-5' : 'px-5'}`}>{label}</td>
      <td className={`py-2 px-5 text-right text-[11px] font-medium ${amtCls(amount)}`}>
        {fmtNum(amount, true)}
      </td>
    </tr>
  )
}

function EmptyLineRow({ label }: { label: string }) {
  return (
    <tr className="border-b border-slate-50">
      <td className="py-2 px-10 text-[11px] text-slate-400 italic" colSpan={2}>{label}</td>
    </tr>
  )
}

function arLabel(val: number): string {
  return val >= 0 ? 'Decrease in Accounts Receivable' : 'Increase in Accounts Receivable'
}

function apLabel(val: number): string {
  return val >= 0 ? 'Increase in Accounts Payable' : 'Decrease in Accounts Payable'
}

function wcLabel(line: CFLine): string {
  const dir = line.amount >= 0 ? 'Decrease in' : 'Increase in'
  return `${dir} ${line.account_name}`
}

// ── Summary row component ─────────────────────────────────────────

function SummaryRow({ label, value, bold = false, topBorder = false, highlight = false }: {
  label: string; value: number; bold?: boolean; topBorder?: boolean; highlight?: boolean
}) {
  return (
    <tr className={highlight ? 'bg-[#0F5B38]/5' : ''}>
      <td className={`py-3 px-5 text-[11px] ${bold ? 'font-bold text-slate-800' : 'text-slate-600'} ${topBorder ? 'border-t border-slate-300' : ''}`}>
        {label}
      </td>
      <td className={`py-3 px-5 text-right text-[11px] ${bold ? 'font-bold' : 'font-medium'} ${amtCls(value)} ${topBorder ? 'border-t border-slate-300' : ''}`}>
        {fmtNum(value, true)}
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────

export function CashFlowStatementTab({ activeOrg, setActiveTab }: CashFlowStatementTabProps) {
  const [preset, setPreset] = useState('this_year')
  const [start, setStart] = useState(() => getPresetRange('this_year').start)
  const [end, setEnd] = useState(() => getPresetRange('this_year').end)

  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [report, setReport] = useState<CFReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handlePreset(key: string) {
    setPreset(key)
    if (key !== 'custom') {
      const r = getPresetRange(key)
      setStart(r.start)
      setEnd(r.end)
    }
  }

  function buildParams(): CFParams {
    return { start, end }
  }

  const runReport = useCallback(async () => {
    setLoading(true); setReport(null); setError(null)
    try {
      const data = await apiService.getCashFlow(activeOrg.id, buildParams())
      setReport(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [activeOrg.id, start, end]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExportPdf() {
    setPdfLoading(true)
    try {
      await apiService.downloadCFPdf(activeOrg.id, buildParams())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to export PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const op = report?.operating
  const inv = report?.investing
  const fin = report?.financing

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Cash Flow Statement</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{activeOrg.name} · Indirect Method</p>
        </div>
        <button onClick={() => setActiveTab('AllReports')} className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer">
          ← Back to Reports
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">

          {/* Period presets */}
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

          <button onClick={runReport} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Update
          </button>

          {report && (
            <ExportDropdown
              pdfLoading={pdfLoading}
              onPdf={handleExportPdf}
              onCsv={() => exportCFtoCsv(report, `cash_flow_${start}_${end}.csv`)}
              onExcel={() => exportCFtoExcel(report, `cash_flow_${start}_${end}.xlsx`)}
            />
          )}
        </div>
      </div>

      {/* Report body */}
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
            <p className="text-sm font-medium">Select a period and click Run to generate the report</p>
          </div>
        )}

        {!loading && !error && report && op && inv && fin && (
          <>
            {/* Period bar */}
            <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Indirect Method</span>
              <span className="text-[10px] text-slate-400">{report.start} – {report.end}</span>
            </div>

            {/* Opening cash */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">Opening Cash Balance</span>
              <span className={`text-[11px] font-bold ${amtCls(report.opening_cash)}`}>
                {fmtNum(report.opening_cash, true)}
              </span>
            </div>

            {/* Operating */}
            <Section
              title="Cash Flows from Operating Activities"
              total={op.total}
              totalLabel="Net Cash from Operating Activities"
            >
              <LineRow label="Net Profit / (Loss)" amount={op.net_profit} indent />
              {op.depreciation !== 0 && (
                <LineRow label="Depreciation" amount={op.depreciation} indent />
              )}
              {op.ar_change !== 0 && (
                <LineRow label={arLabel(op.ar_change)} amount={op.ar_change} indent />
              )}
              {op.ap_change !== 0 && (
                <LineRow label={apLabel(op.ap_change)} amount={op.ap_change} indent />
              )}
              {op.working_capital_lines.map(l => (
                <LineRow key={l.account_id} label={wcLabel(l)} amount={l.amount} indent />
              ))}
              {op.net_profit === 0 && op.depreciation === 0 && op.ar_change === 0
                && op.ap_change === 0 && op.working_capital_lines.length === 0 && (
                <EmptyLineRow label="No operating activity in this period" />
              )}
            </Section>

            {/* Investing */}
            <Section
              title="Cash Flows from Investing Activities"
              total={inv.total}
              totalLabel="Net Cash from Investing Activities"
            >
              {inv.lines.length === 0
                ? <EmptyLineRow label="No investing activities in this period" />
                : inv.lines.map(l => (
                    <LineRow key={l.account_id} label={l.account_name} amount={l.amount} indent />
                  ))
              }
            </Section>

            {/* Financing */}
            <Section
              title="Cash Flows from Financing Activities"
              total={fin.total}
              totalLabel="Net Cash from Financing Activities"
            >
              {fin.lines.length === 0
                ? <EmptyLineRow label="No financing activities in this period" />
                : fin.lines.map(l => (
                    <LineRow key={l.account_id} label={l.account_name} amount={l.amount} indent />
                  ))
              }
            </Section>

            {/* Summary */}
            <table className="w-full">
              <tbody>
                <SummaryRow
                  label="Net Increase / (Decrease) in Cash"
                  value={report.net_cash_movement}
                  bold
                  topBorder
                />
                <SummaryRow label="Opening Cash Balance" value={report.opening_cash} />
                <SummaryRow
                  label="Closing Cash Balance"
                  value={report.closing_cash}
                  bold
                  highlight
                />
              </tbody>
            </table>

            {/* Validation warning */}
            {Math.abs(report.validation_diff) > 0.01 && (
              <div className="mx-5 mb-4 mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[3px] p-3">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-700">Unclassified Cash Movements</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    {fmtNum(Math.abs(report.validation_diff), true)} in cash movements could not be
                    attributed to operating, investing, or financing activities. This typically means
                    some account types are not yet classified. The closing cash balance shown is the
                    actual balance from bank records.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
