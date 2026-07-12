import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, ChevronDown, Loader2, Plus, Minus } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { apiService } from '../../services/api'
import type { Account, Organization } from '../../services/api'
import { bankImportApi } from '../../services/api/bank-import'

// ── Types ──────────────────────────────────────────────────────────────────

type FileType = 'csv' | 'excel'
type Step = 'loading' | 'configure' | 'review' | 'success'

interface ColMap {
  dateCol: number
  descCol: number
  mode: 'single' | 'debitcredit'
  amountCol?: number
  debitCol?: number
  creditCol?: number
}

interface TxnRow {
  id: string
  date: string
  description: string
  amount: number
  type: 'Spend' | 'Receive'
  accountId: string
  checked: boolean
}

interface Props {
  file: File
  fileType: FileType
  bankAccountId: string
  bankAccountName: string
  activeOrg: Organization
  onBack: () => void
  onSuccess: () => void
}

// ── Keyword lists ──────────────────────────────────────────────────────────

const DATE_KW   = ['date', 'trans date', 'value date', 'txn date', 'posting date', 'transaction date', 'tran date']
const DESC_KW   = ['description', 'narration', 'details', 'particulars', 'memo', 'reference', 'notes', 'payment details', 'remarks']
const DEBIT_KW  = ['debit', 'dr', 'withdrawal', 'withdrawals', 'paid out', 'debit amount', 'debit amt', 'money out']
const CREDIT_KW = ['credit', 'cr', 'deposit', 'deposits', 'paid in', 'credit amount', 'credit amt', 'received', 'money in']
const AMOUNT_KW = ['amount', 'value', 'sum', 'transaction amount', 'txn amount', 'net amount']

function kw(header: string, words: string[]): boolean {
  const h = header.toLowerCase().trim()
  return words.some(k => h === k || h.includes(k))
}

function autoDetectCols(headers: string[]): ColMap | null {
  const dateIdx   = headers.findIndex(h => kw(h, DATE_KW))
  const descIdx   = headers.findIndex(h => kw(h, DESC_KW))
  const debitIdx  = headers.findIndex(h => kw(h, DEBIT_KW))
  const creditIdx = headers.findIndex(h => kw(h, CREDIT_KW))
  const amtIdx    = headers.findIndex((h, i) => i !== debitIdx && i !== creditIdx && kw(h, AMOUNT_KW))

  if (dateIdx === -1 || descIdx === -1) return null
  if (debitIdx !== -1 && creditIdx !== -1)
    return { dateCol: dateIdx, descCol: descIdx, mode: 'debitcredit', debitCol: debitIdx, creditCol: creditIdx }
  if (amtIdx !== -1)
    return { dateCol: dateIdx, descCol: descIdx, mode: 'single', amountCol: amtIdx }
  return null
}

// ── Parsing helpers ────────────────────────────────────────────────────────

function parseAmt(val: string): number {
  const s = (val || '').trim().replace(/[\s,]/g, '')
  if (s.startsWith('(') && s.endsWith(')')) return -(parseFloat(s.slice(1, -1)) || 0)
  return parseFloat(s.replace(/[^0-9.\-]/g, '')) || 0
}

function parseDate(val: string): string {
  const v = (val || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const dmy = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return v
}

function mapToRows(dataRows: string[][], colMap: ColMap): TxnRow[] {
  return dataRows.flatMap((row, i) => {
    const date = parseDate(row[colMap.dateCol] || '')
    const description = (row[colMap.descCol] || '').trim()
    let amount = 0, type: 'Spend' | 'Receive' = 'Spend'

    if (colMap.mode === 'debitcredit') {
      const debit  = Math.abs(parseAmt(row[colMap.debitCol!]  || ''))
      const credit = Math.abs(parseAmt(row[colMap.creditCol!] || ''))
      if (credit > 0)     { amount = credit; type = 'Receive' }
      else if (debit > 0) { amount = debit;  type = 'Spend'   }
    } else {
      const raw = parseAmt(row[colMap.amountCol!] || '')
      amount = Math.abs(raw)
      type = raw >= 0 ? 'Receive' : 'Spend'
    }

    if (!amount || !date) return []
    return [{ id: `r${i}`, date, description, amount, type, accountId: '', checked: true }]
  })
}

// ── Account selector (portal dropdown) ────────────────────────────────────

function AccountSelector({ value, onChange, accounts }: {
  value: string
  onChange: (id: string) => void
  accounts: Account[]
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos]       = useState({ top: 0, left: 0, width: 0 })
  const btnRef              = useRef<HTMLButtonElement>(null)

  const selected = accounts.find(a => a.id === value)
  const filtered = accounts
    .filter(a => !search
      || a.name.toLowerCase().includes(search.toLowerCase())
      || a.code.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 40)

  function openDrop() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 260) })
    }
    setSearch('')
    setOpen(true)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={openDrop}
        className={`w-full text-left text-[11px] px-2.5 py-1.5 border rounded-[3px] transition truncate ${
          selected
            ? 'border-slate-200 text-slate-700 bg-white hover:border-[#0F5B38]/40'
            : 'border-dashed border-slate-300 text-slate-400 bg-slate-50/50 hover:border-[#0F5B38]/40'
        }`}
      >
        {selected ? `${selected.code} — ${selected.name}` : 'Assign account…'}
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] bg-white border border-slate-200 rounded-[3px] shadow-2xl"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="p-1.5 border-b border-slate-100">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search accounts…"
                className="w-full text-[11px] px-2 py-1 border border-slate-200 rounded-[3px] outline-none focus:border-[#0F5B38]/60"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0
                ? <div className="px-3 py-2.5 text-[11px] text-slate-400">No accounts found</div>
                : filtered.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { onChange(a.id); setOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-emerald-50 hover:text-[#0F5B38] flex items-center gap-2"
                  >
                    <span className="font-bold text-slate-400 text-[10px] shrink-0">{a.code}</span>
                    <span className="truncate">{a.name}</span>
                    <span className="ml-auto text-[10px] text-slate-300 shrink-0">{a.class_type}</span>
                  </button>
                ))
              }
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

// ── Main page component ────────────────────────────────────────────────────

export function BankTransactionImportPage({
  file, fileType, bankAccountId, bankAccountName, activeOrg, onBack, onSuccess,
}: Props) {
  const [step, setStep]           = useState<Step>('loading')
  const [parseErr, setParseErr]   = useState<string | null>(null)
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [rawRows, setRawRows]     = useState<string[][]>([])
  const [skipCount, setSkipCount] = useState(0)
  const [colMap, setColMap]       = useState<ColMap>({ dateCol: 0, descCol: 1, mode: 'single', amountCol: 2 })
  const [rows, setRows]           = useState<TxnRow[]>([])
  const [submitting, setSubmit]   = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [created, setCreated]     = useState(0)

  // Bulk apply
  const [bulkAcctId, setBulkAcctId] = useState('')
  const [bulkOpen, setBulkOpen]     = useState(false)
  const [bulkSearch, setBulkSearch] = useState('')
  const [bulkPos, setBulkPos]       = useState({ top: 0, left: 0, width: 0 })
  const bulkBtnRef                  = useRef<HTMLButtonElement>(null)

  const chartAccts = accounts.filter(a => a.is_active !== false && a.type !== 'Bank')
  const bulkSelected = chartAccts.find(a => a.id === bulkAcctId)
  const bulkFiltered = chartAccts.filter(a =>
    !bulkSearch
    || a.name.toLowerCase().includes(bulkSearch.toLowerCase())
    || a.code.toLowerCase().includes(bulkSearch.toLowerCase())
  ).slice(0, 40)

  // Derived from rawRows + skipCount
  const headerRow  = rawRows[skipCount] ?? []
  const headerCols = headerRow.map((h, i) => h.trim() || `Column ${i + 1}`)
  const dataRows   = rawRows.slice(skipCount + 1)

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([parseFile(), fetchAccounts()])
  }, [])

  // Re-run auto-detect when skipCount changes
  useEffect(() => {
    if (rawRows.length === 0) return
    const headers = (rawRows[skipCount] ?? []).map(h => h.trim())
    const detected = autoDetectCols(headers)
    if (detected) {
      setColMap(detected)
    } else {
      setColMap({
        dateCol: 0,
        descCol: Math.min(1, headers.length - 1),
        mode: 'single',
        amountCol: Math.min(2, headers.length - 1),
      })
    }
  }, [skipCount, rawRows])

  async function fetchAccounts() {
    try {
      const all = await apiService.getAccounts(activeOrg.id)
      setAccounts(all)
    } catch {
      // non-fatal
    }
  }

  async function parseFile() {
    try {
      let all: string[][] = []

      if (fileType === 'csv') {
        const text = await file.text()
        const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
        all = result.data as string[][]
      } else {
        const buf = await file.arrayBuffer()
        const wb  = XLSX.read(buf, { type: 'array', cellDates: false })
        const ws  = wb.Sheets[wb.SheetNames[0]]
        const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
        all = data.filter(r => r.some(c => c))
      }

      setRawRows(all)

      // Auto-detect skipCount: find the first row where we can detect headers
      let bestSkip = 0
      for (let s = 0; s < Math.min(10, all.length); s++) {
        const h = (all[s] ?? []).map(x => x.trim())
        if (autoDetectCols(h)) { bestSkip = s; break }
      }
      setSkipCount(bestSkip)

      setStep('configure')
    } catch (e: unknown) {
      setParseErr(e instanceof Error ? e.message : 'Failed to parse file')
      setStep('configure')
    }
  }

  // ── Navigate to review ────────────────────────────────────────────────────

  function handleContinue() {
    const mapped = mapToRows(dataRows, colMap)
    setRows(mapped)
    setStep('review')
  }

  // ── Row actions ───────────────────────────────────────────────────────────

  function toggleAll() {
    const allOn = rows.every(r => r.checked)
    setRows(prev => prev.map(r => ({ ...r, checked: !allOn })))
  }

  function toggleRow(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r))
  }

  function setRowType(id: string, type: 'Spend' | 'Receive') {
    setRows(prev => prev.map(r => r.id === id ? { ...r, type } : r))
  }

  function setRowAccount(id: string, accountId: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, accountId } : r))
  }

  function openBulkDrop() {
    if (bulkBtnRef.current) {
      const rect = bulkBtnRef.current.getBoundingClientRect()
      setBulkPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 280) })
    }
    setBulkSearch('')
    setBulkOpen(true)
  }

  function applyBulk() {
    if (!bulkAcctId) return
    const ids = new Set(rows.filter(r => r.checked).map(r => r.id))
    setRows(prev => prev.map(r => ids.has(r.id) ? { ...r, accountId: bulkAcctId } : r))
    setBulkAcctId('')
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleImport() {
    const toImport = rows.filter(r => r.checked && r.accountId)
    if (!toImport.length) return
    setSubmit(true)
    setImportErr(null)
    try {
      const res = await bankImportApi.bulkImportTransactions(
        activeOrg.id, bankAccountId, activeOrg.currency,
        toImport.map(r => ({
          date: r.date, description: r.description,
          amount: r.amount, type: r.type, account_id: r.accountId,
        })),
      )
      setCreated(res.created)
      setStep('success')
    } catch (e: unknown) {
      setImportErr(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setSubmit(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const checkedRows   = rows.filter(r => r.checked)
  const assignedCount = checkedRows.filter(r => r.accountId).length
  const canImport     = assignedCount > 0
  const allChecked    = rows.length > 0 && rows.every(r => r.checked)

  // ── Shared header bar ─────────────────────────────────────────────────────

  const headerBar = (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={step === 'review' ? () => setStep('configure') : onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-[3px] border border-slate-200 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {step === 'review' ? 'Back to Configure' : 'Bank Accounts'}
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-[#071f13] text-xs font-bold">{bankAccountName} — Import Transactions</span>
      </div>
      <div className="flex items-center gap-2">
        {(['configure', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-slate-200" />}
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${step === s ? 'text-[#0F5B38]' : step === 'success' || (s === 'configure' && step === 'review') ? 'text-slate-400' : 'text-slate-300'}`}>
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === s ? 'bg-[#0F5B38] text-white' : (step === 'success' || (s === 'configure' && step === 'review')) ? 'bg-slate-200 text-slate-500' : 'border border-slate-200 text-slate-300'}`}>
                {i + 1}
              </div>
              {s === 'configure' ? 'Configure' : 'Review'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── LOADING ───────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="h-full flex flex-col font-sans">
        {headerBar}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-[#0F5B38]" />
            <span className="text-xs font-semibold">Parsing {fileType.toUpperCase()} file…</span>
          </div>
        </div>
      </div>
    )
  }

  // ── CONFIGURE ─────────────────────────────────────────────────────────────

  if (step === 'configure') {
    const previewRows = rawRows.slice(0, 20)
    const colCount = Math.max(...rawRows.slice(0, 5).map(r => r.length), 1)

    return (
      <div className="h-full flex flex-col font-sans">
        {headerBar}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

            {parseErr && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-[3px] text-[11px] text-rose-700 font-semibold">
                {parseErr}
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-[#071f13]">Configure Your Import</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {rawRows.length} rows detected from your {file.name}. Identify which row contains your column headers.
              </p>
            </div>

            {/* Skip control */}
            <div className="flex items-center gap-4 bg-slate-50/70 border border-slate-200 rounded-[3px] p-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-slate-700">Skip top rows</span>
                <span className="text-[10px] text-slate-400">Rows to ignore before the header (e.g. bank name, statement date)</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setSkipCount(s => Math.max(0, s - 1))}
                  disabled={skipCount === 0}
                  className="h-7 w-7 flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 rounded-[3px] disabled:opacity-40 transition cursor-pointer"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-black text-[#071f13] w-6 text-center">{skipCount}</span>
                <button
                  onClick={() => setSkipCount(s => Math.min(rawRows.length - 2, s + 1))}
                  disabled={skipCount >= rawRows.length - 2}
                  className="h-7 w-7 flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 rounded-[3px] disabled:opacity-40 transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className="text-[10px] text-slate-400 ml-1">
                  → Row {skipCount + 1} is your header
                </span>
              </div>
            </div>

            {/* Preview table */}
            {rawRows.length > 0 && (
              <div className="rounded-[3px] border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Preview</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <tbody>
                      {previewRows.map((row, rowIdx) => {
                        const isSkipped = rowIdx < skipCount
                        const isHeader  = rowIdx === skipCount
                        const isData    = rowIdx > skipCount

                        let rowClass = ''
                        if (isSkipped) rowClass = 'bg-slate-50/40 opacity-50'
                        else if (isHeader) rowClass = 'bg-emerald-50/60'
                        else if (isData) rowClass = rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'

                        return (
                          <tr key={rowIdx} className={`border-b border-slate-100 last:border-0 ${rowClass}`}>
                            {/* Row number + status badge */}
                            <td className="px-3 py-1.5 text-[10px] text-slate-300 font-bold whitespace-nowrap select-none border-r border-slate-100 w-10">
                              {rowIdx + 1}
                            </td>
                            <td className="px-2 py-1 w-16 select-none">
                              {isSkipped && (
                                <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">SKIP</span>
                              )}
                              {isHeader && (
                                <span className="text-[9px] font-extrabold text-[#0F5B38] bg-emerald-100 px-1.5 py-0.5 rounded-full">HEADER</span>
                              )}
                            </td>
                            {/* Data cells — pad to colCount */}
                            {Array.from({ length: colCount }).map((_, ci) => (
                              <td
                                key={ci}
                                className={`px-3 py-1.5 border-l border-slate-100 max-w-[140px] truncate ${
                                  isHeader ? 'font-bold text-[#071f13]' : 'text-slate-600'
                                }`}
                                title={row[ci] || ''}
                              >
                                {row[ci] || ''}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                      {rawRows.length > 20 && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={colCount + 2} className="px-3 py-2 text-[10px] text-slate-400 text-center font-semibold">
                            + {rawRows.length - 20} more rows not shown
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Column mapping */}
            {headerCols.length > 0 && (
              <div className="bg-slate-50/70 border border-slate-200 rounded-[3px] p-4 space-y-4">
                <div>
                  <h3 className="text-[11px] font-bold text-slate-700">Column Mapping</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Map your columns to the required fields.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date Column</label>
                    <select
                      value={colMap.dateCol}
                      onChange={e => setColMap(p => ({ ...p, dateCol: +e.target.value }))}
                      className="text-[11px] border border-slate-200 bg-white rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                    >
                      {headerCols.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description Column</label>
                    <select
                      value={colMap.descCol}
                      onChange={e => setColMap(p => ({ ...p, descCol: +e.target.value }))}
                      className="text-[11px] border border-slate-200 bg-white rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                    >
                      {headerCols.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount Format</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="radio" name="amtMode" value="single"
                        checked={colMap.mode === 'single'}
                        onChange={() => setColMap(p => ({ ...p, mode: 'single', amountCol: p.amountCol ?? 2 }))}
                      />
                      Single column (positive = Receive, negative = Spend)
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="radio" name="amtMode" value="debitcredit"
                        checked={colMap.mode === 'debitcredit'}
                        onChange={() => setColMap(p => ({ ...p, mode: 'debitcredit', debitCol: p.debitCol ?? 2, creditCol: p.creditCol ?? 3 }))}
                      />
                      Separate Debit / Credit columns
                    </label>
                  </div>
                </div>

                {colMap.mode === 'single' ? (
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount Column</label>
                    <select
                      value={colMap.amountCol ?? 0}
                      onChange={e => setColMap(p => ({ ...p, amountCol: +e.target.value }))}
                      className="text-[11px] border border-slate-200 bg-white rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                    >
                      {headerCols.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Debit Column</label>
                      <select
                        value={colMap.debitCol ?? 0}
                        onChange={e => setColMap(p => ({ ...p, debitCol: +e.target.value }))}
                        className="text-[11px] border border-slate-200 bg-white rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                      >
                        {headerCols.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Credit Column</label>
                      <select
                        value={colMap.creditCol ?? 0}
                        onChange={e => setColMap(p => ({ ...p, creditCol: +e.target.value }))}
                        className="text-[11px] border border-slate-200 bg-white rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                      >
                        {headerCols.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pb-6">
              <button
                onClick={handleContinue}
                disabled={rawRows.length === 0 || skipCount >= rawRows.length}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-bold rounded-[3px] transition disabled:opacity-40"
              >
                Continue to Review
                <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── REVIEW ────────────────────────────────────────────────────────────────

  if (step === 'review') {
    return (
      <div className="h-full flex flex-col font-sans">
        {headerBar}

        {/* Bulk apply bar */}
        <div className="shrink-0 px-6 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-600">Apply account to selected:</span>
          <div className="relative">
            <button
              ref={bulkBtnRef}
              onClick={openBulkDrop}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-[3px] text-slate-700 font-semibold min-w-[220px]"
            >
              <span className="flex-1 text-left truncate">
                {bulkSelected ? `${bulkSelected.code} — ${bulkSelected.name}` : 'Select account…'}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
            </button>
          </div>
          <button
            onClick={applyBulk}
            disabled={!bulkAcctId || checkedRows.length === 0}
            className="px-3 py-1.5 text-[11px] font-bold bg-[#0F5B38] text-white rounded-[3px] hover:brightness-105 transition disabled:opacity-40"
          >
            Apply to selected ({checkedRows.length})
          </button>
          {importErr && (
            <span className="text-[11px] text-rose-600 font-semibold ml-auto">{importErr}</span>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="p-3 w-8">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="rounded cursor-pointer" />
                </th>
                <th className="p-3 w-28">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3 w-32 text-right">Debit (Out)</th>
                <th className="p-3 w-32 text-right">Credit (In)</th>
                <th className="p-3 w-64">Chart of Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-semibold text-xs">
                    No valid transactions found. Go back to configure and check your column mapping.
                  </td>
                </tr>
              ) : rows.map(row => {
                const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                return (
                  <tr key={row.id} className="bg-white transition-colors hover:bg-slate-50/30">
                    <td className="p-3">
                      <input type="checkbox" checked={row.checked} onChange={() => toggleRow(row.id)} className="rounded cursor-pointer" />
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-600 font-medium">{row.date}</td>
                    <td className="p-3 text-slate-700 max-w-xs truncate">{row.description || <span className="text-slate-300 italic">—</span>}</td>
                    {/* Debit — money out (Spend) */}
                    <td
                      className={`p-3 text-right whitespace-nowrap ${row.type !== 'Spend' ? 'cursor-pointer hover:bg-rose-50/50' : ''}`}
                      onClick={() => row.type !== 'Spend' && setRowType(row.id, 'Spend')}
                    >
                      {row.type === 'Spend'
                        ? <span className="font-bold text-rose-600">{fmt(row.amount)}</span>
                        : <span className="text-slate-200 text-[10px] font-medium select-none">click to move</span>
                      }
                    </td>
                    {/* Credit — money in (Receive) */}
                    <td
                      className={`p-3 text-right whitespace-nowrap ${row.type !== 'Receive' ? 'cursor-pointer hover:bg-emerald-50/50' : ''}`}
                      onClick={() => row.type !== 'Receive' && setRowType(row.id, 'Receive')}
                    >
                      {row.type === 'Receive'
                        ? <span className="font-bold text-[#0F5B38]">{fmt(row.amount)}</span>
                        : <span className="text-slate-200 text-[10px] font-medium select-none">click to move</span>
                      }
                    </td>
                    <td className="p-3">
                      <AccountSelector value={row.accountId} onChange={id => setRowAccount(row.id, id)} accounts={chartAccts} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-semibold">
            {rows.length} transaction{rows.length !== 1 ? 's' : ''} detected
            {checkedRows.length !== rows.length ? `, ${checkedRows.length} selected` : ''}
          </span>
          <div className="flex items-center gap-3">
            {canImport && assignedCount < checkedRows.length && (
              <span className="text-[11px] text-amber-600 font-semibold">
                {checkedRows.length - assignedCount} without account will be skipped
              </span>
            )}
            <button
              onClick={handleImport}
              disabled={!canImport || submitting}
              className="flex items-center gap-2 px-5 py-2 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-bold rounded-[3px] transition disabled:opacity-40"
            >
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Importing…</>
                : <>Import {assignedCount} Transaction{assignedCount !== 1 ? 's' : ''}</>
              }
            </button>
          </div>
        </div>

        {/* Bulk account dropdown portal */}
        {bulkOpen && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setBulkOpen(false)} />
            <div
              className="fixed z-[9999] bg-white border border-slate-200 rounded-[3px] shadow-2xl"
              style={{ top: bulkPos.top, left: bulkPos.left, width: Math.max(bulkPos.width, 280) }}
            >
              <div className="p-1.5 border-b border-slate-100">
                <input
                  autoFocus
                  value={bulkSearch}
                  onChange={e => setBulkSearch(e.target.value)}
                  placeholder="Search accounts…"
                  className="w-full text-[11px] px-2 py-1 border border-slate-200 rounded-[3px] outline-none focus:border-[#0F5B38]/60"
                />
              </div>
              <div className="max-h-52 overflow-y-auto">
                {bulkFiltered.length === 0
                  ? <div className="px-3 py-2.5 text-[11px] text-slate-400">No accounts found</div>
                  : bulkFiltered.map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setBulkAcctId(a.id); setBulkOpen(false) }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-emerald-50 hover:text-[#0F5B38] flex items-center gap-2"
                    >
                      <span className="font-bold text-slate-400 text-[10px] shrink-0">{a.code}</span>
                      <span className="truncate">{a.name}</span>
                    </button>
                  ))
                }
              </div>
            </div>
          </>,
          document.body,
        )}
      </div>
    )
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col font-sans">
      {headerBar}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Check className="h-7 w-7 text-[#0F5B38]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#071f13]">Import Complete</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {created} transaction{created !== 1 ? 's' : ''} successfully added to {bankAccountName}.
            </p>
          </div>
          <button
            onClick={onSuccess}
            className="px-8 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-bold rounded-[3px] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
