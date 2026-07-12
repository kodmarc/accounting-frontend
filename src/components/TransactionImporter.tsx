import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, ChevronDown, Loader2, ArrowRight } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { Account } from '../services/api/types'
import { bankImportApi } from '../services/api/bank-import'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  file: File
  fileType: 'csv' | 'excel' | 'pdf'
  bankAccountId: string
  bankAccountName: string
  orgId: string
  currency: string
  accounts: Account[]
  onClose: () => void
  onSuccess: (created: number) => void
}

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

// ── Helpers ────────────────────────────────────────────────────────────────

const DATE_KW    = ['date', 'trans date', 'value date', 'txn date', 'posting date', 'transaction date', 'tran date']
const DESC_KW    = ['description', 'narration', 'details', 'particulars', 'memo', 'reference', 'notes', 'payment details', 'remarks', 'transaction details']
const DEBIT_KW   = ['debit', 'dr', 'withdrawal', 'withdrawals', 'paid out', 'debit amount', 'debit amt', 'money out']
const CREDIT_KW  = ['credit', 'cr', 'deposit', 'deposits', 'paid in', 'credit amount', 'credit amt', 'received', 'money in']
const AMOUNT_KW  = ['amount', 'value', 'sum', 'transaction amount', 'txn amount', 'net amount', 'tran amount']

function match(header: string, keywords: string[]): boolean {
  const h = header.toLowerCase().trim()
  return keywords.some(k => h === k || h.includes(k))
}

function autoDetect(headers: string[]): ColMap | null {
  const dateIdx   = headers.findIndex(h => match(h, DATE_KW))
  const descIdx   = headers.findIndex(h => match(h, DESC_KW))
  const debitIdx  = headers.findIndex(h => match(h, DEBIT_KW))
  const creditIdx = headers.findIndex(h => match(h, CREDIT_KW))
  const amtIdx    = headers.findIndex((h, i) => i !== debitIdx && i !== creditIdx && match(h, AMOUNT_KW))

  if (dateIdx === -1 || descIdx === -1) return null
  if (debitIdx !== -1 && creditIdx !== -1)
    return { dateCol: dateIdx, descCol: descIdx, mode: 'debitcredit', debitCol: debitIdx, creditCol: creditIdx }
  if (amtIdx !== -1)
    return { dateCol: dateIdx, descCol: descIdx, mode: 'single', amountCol: amtIdx }
  return null
}

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

function mapToRows(rawRows: string[][], colMap: ColMap): TxnRow[] {
  return rawRows.flatMap((row, i) => {
    const date = parseDate(row[colMap.dateCol] || '')
    const description = (row[colMap.descCol] || '').trim()
    let amount = 0, type: 'Spend' | 'Receive' = 'Spend'

    if (colMap.mode === 'debitcredit') {
      const debit  = Math.abs(parseAmt(row[colMap.debitCol!]  || ''))
      const credit = Math.abs(parseAmt(row[colMap.creditCol!] || ''))
      if (credit > 0)      { amount = credit; type = 'Receive' }
      else if (debit > 0)  { amount = debit;  type = 'Spend'   }
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

function AccountSelector({
  value, onChange, accounts,
}: { value: string; onChange: (id: string) => void; accounts: Account[] }) {
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

  function select(id: string) {
    onChange(id)
    setOpen(false)
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
        {selected ? `${selected.code} — ${selected.name}` : 'Assign account...'}
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
                placeholder="Search accounts..."
                className="w-full text-[11px] px-2 py-1 border border-slate-200 rounded-[3px] outline-none focus:border-[#0F5B38]/60"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0
                ? <div className="px-3 py-2.5 text-[11px] text-slate-400">No accounts found</div>
                : filtered.map(a => (
                  <button
                    key={a.id}
                    onClick={() => select(a.id)}
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

// ── Main component ─────────────────────────────────────────────────────────

export function TransactionImporter({
  file, fileType, bankAccountId, bankAccountName, orgId, currency,
  accounts, onClose, onSuccess,
}: Props) {
  type Step = 'loading' | 'map' | 'review' | 'success'

  const [step, setStep]         = useState<Step>('loading')
  const [parseErr, setParseErr] = useState<string | null>(null)
  const [headers, setHeaders]   = useState<string[]>([])
  const [rawRows, setRawRows]   = useState<string[][]>([])
  const [colMap, setColMap]     = useState<ColMap>({ dateCol: 0, descCol: 1, mode: 'single', amountCol: 2 })
  const [rows, setRows]         = useState<TxnRow[]>([])
  const [submitting, setSubmit] = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [createdCount, setCreated] = useState(0)

  // Bulk apply state
  const [bulkAcctId, setBulkAcctId] = useState('')
  const [bulkOpen, setBulkOpen]     = useState(false)
  const [bulkSearch, setBulkSearch] = useState('')
  const [bulkPos, setBulkPos]       = useState({ top: 0, left: 0, width: 0 })
  const bulkBtnRef                  = useRef<HTMLButtonElement>(null)

  // Chart of accounts (exclude bank accounts)
  const chartAccts = accounts.filter(a => a.is_active !== false && a.type !== 'Bank')
  const bulkSelected = chartAccts.find(a => a.id === bulkAcctId)

  // ── Parse file on mount ──────────────────────────────────────────────────

  useEffect(() => { parseFile() }, [])

  async function parseFile() {
    try {
      let h: string[] = [], r: string[][] = []

      if (fileType === 'csv') {
        const text = await file.text()
        const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
        if (result.data.length) { h = result.data[0]; r = result.data.slice(1) }
      } else if (fileType === 'excel') {
        const buf = await file.arrayBuffer()
        const wb  = XLSX.read(buf, { type: 'array', cellDates: false })
        const ws  = wb.Sheets[wb.SheetNames[0]]
        const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
        if (data.length) { h = data[0]; r = data.slice(1).filter(row => row.some(c => c)) }
      } else {
        const res = await bankImportApi.parseBankPdf(orgId, file)
        h = res.headers
        r = res.rows
      }

      setHeaders(h)
      setRawRows(r)

      const detected = autoDetect(h)
      if (detected) {
        setColMap(detected)
        setRows(mapToRows(r, detected))
        setStep('review')
      } else {
        const fallback: ColMap = {
          dateCol: 0,
          descCol: Math.min(1, h.length - 1),
          mode: 'single',
          amountCol: Math.min(2, h.length - 1),
        }
        setColMap(fallback)
        setStep('map')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to parse file'
      setParseErr(msg)
      setStep('map')
    }
  }

  function applyMapping() {
    const mapped = mapToRows(rawRows, colMap)
    setRows(mapped)
    setStep('review')
  }

  // ── Row actions ──────────────────────────────────────────────────────────

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

  // ── Bulk apply ───────────────────────────────────────────────────────────

  function openBulkDrop() {
    if (bulkBtnRef.current) {
      const rect = bulkBtnRef.current.getBoundingClientRect()
      setBulkPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 260) })
    }
    setBulkSearch('')
    setBulkOpen(true)
  }

  function applyBulk() {
    if (!bulkAcctId) return
    const checkedIds = new Set(rows.filter(r => r.checked).map(r => r.id))
    setRows(prev => prev.map(r => checkedIds.has(r.id) ? { ...r, accountId: bulkAcctId } : r))
    setBulkAcctId('')
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleImport() {
    const toImport = rows.filter(r => r.checked && r.accountId)
    if (!toImport.length) return
    setSubmit(true)
    setImportErr(null)
    try {
      const res = await bankImportApi.bulkImportTransactions(orgId, bankAccountId, currency, toImport.map(r => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.type,
        account_id: r.accountId,
      })))
      setCreated(res.created)
      setStep('success')
    } catch (e: unknown) {
      setImportErr(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setSubmit(false)
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const checkedRows    = rows.filter(r => r.checked)
  const assignedCount  = checkedRows.filter(r => r.accountId).length
  const canImport      = checkedRows.length > 0 && assignedCount === checkedRows.length
  const allChecked     = rows.length > 0 && rows.every(r => r.checked)
  const bulkFiltered   = chartAccts.filter(a =>
    !bulkSearch
    || a.name.toLowerCase().includes(bulkSearch.toLowerCase())
    || a.code.toLowerCase().includes(bulkSearch.toLowerCase())
  ).slice(0, 40)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <div>
          <h2 className="text-sm font-bold text-[#071f13]">Upload Transactions</h2>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{bankAccountName}</p>
        </div>
        <div className="flex items-center gap-3">
          {step === 'review' && (
            <span className="text-[10px] text-slate-400 font-semibold">
              {assignedCount} / {checkedRows.length} assigned
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-[3px] text-slate-500 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {step === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-[#0F5B38]" />
            <span className="text-xs font-semibold">Parsing your file…</span>
          </div>
        </div>
      )}

      {/* ── Column Map ── */}
      {step === 'map' && (
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
          {parseErr && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-[3px] text-[11px] text-rose-700 font-semibold">
              {parseErr}
            </div>
          )}

          <h3 className="text-sm font-bold text-slate-800 mb-1">Map Your Columns</h3>
          <p className="text-[11px] text-slate-400 mb-6">
            We couldn't auto-detect your column layout. Tell us which column holds each piece of data.
          </p>

          {/* Preview of first 3 rows */}
          {headers.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-[10px] border-collapse border border-slate-200 rounded-[3px]">
                <thead>
                  <tr className="bg-slate-50">
                    {headers.map((h, i) => (
                      <th key={i} className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-600">{h || `Col ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {row.map((cell, j) => (
                        <td key={j} className="border border-slate-100 px-2 py-1 text-slate-600 max-w-[120px] truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-4">
            {/* Date column */}
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-semibold text-slate-700 w-40 shrink-0">Date Column</label>
              <select
                value={colMap.dateCol}
                onChange={e => setColMap(p => ({ ...p, dateCol: +e.target.value }))}
                className="flex-1 text-[11px] border border-slate-200 rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
              >
                {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </select>
            </div>

            {/* Description column */}
            <div className="flex items-center gap-4">
              <label className="text-[11px] font-semibold text-slate-700 w-40 shrink-0">Description Column</label>
              <select
                value={colMap.descCol}
                onChange={e => setColMap(p => ({ ...p, descCol: +e.target.value }))}
                className="flex-1 text-[11px] border border-slate-200 rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
              >
                {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </select>
            </div>

            {/* Amount mode */}
            <div className="flex items-start gap-4">
              <label className="text-[11px] font-semibold text-slate-700 w-40 shrink-0 pt-1">Amount Format</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                  <input
                    type="radio" name="mode" value="single"
                    checked={colMap.mode === 'single'}
                    onChange={() => setColMap(p => ({ ...p, mode: 'single', amountCol: p.amountCol ?? 2 }))}
                  />
                  Single amount column (positive = Receive, negative = Spend)
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                  <input
                    type="radio" name="mode" value="debitcredit"
                    checked={colMap.mode === 'debitcredit'}
                    onChange={() => setColMap(p => ({ ...p, mode: 'debitcredit', debitCol: p.debitCol ?? 2, creditCol: p.creditCol ?? 3 }))}
                  />
                  Separate Debit and Credit columns
                </label>
              </div>
            </div>

            {/* Amount / Debit+Credit column selectors */}
            {colMap.mode === 'single' ? (
              <div className="flex items-center gap-4">
                <label className="text-[11px] font-semibold text-slate-700 w-40 shrink-0">Amount Column</label>
                <select
                  value={colMap.amountCol ?? 0}
                  onChange={e => setColMap(p => ({ ...p, amountCol: +e.target.value }))}
                  className="flex-1 text-[11px] border border-slate-200 rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                >
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <label className="text-[11px] font-semibold text-slate-700 w-40 shrink-0">Debit Column</label>
                  <select
                    value={colMap.debitCol ?? 0}
                    onChange={e => setColMap(p => ({ ...p, debitCol: +e.target.value }))}
                    className="flex-1 text-[11px] border border-slate-200 rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                  >
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-[11px] font-semibold text-slate-700 w-40 shrink-0">Credit Column</label>
                  <select
                    value={colMap.creditCol ?? 0}
                    onChange={e => setColMap(p => ({ ...p, creditCol: +e.target.value }))}
                    className="flex-1 text-[11px] border border-slate-200 rounded-[3px] px-2.5 py-1.5 outline-none focus:border-[#0F5B38]/60"
                  >
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <button
            onClick={applyMapping}
            className="mt-8 flex items-center gap-2 px-5 py-2 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-bold rounded-[3px] transition"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Review ── */}
      {step === 'review' && (
        <>
          {/* Bulk apply bar */}
          <div className="shrink-0 px-6 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-600">Apply account to selected:</span>
            <div className="relative">
              <button
                ref={bulkBtnRef}
                onClick={openBulkDrop}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-[3px] text-slate-700 font-semibold min-w-[200px]"
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
              className="px-3 py-1.5 text-[11px] font-bold bg-[#0F5B38] text-white rounded-[3px] hover:brightness-105 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
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
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 w-28 text-right">Amount</th>
                  <th className="p-3 w-28 text-center">Type</th>
                  <th className="p-3 w-64">Chart of Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold text-xs">
                      No valid transactions found. Try adjusting the column mapping.
                    </td>
                  </tr>
                ) : (
                  rows.map(row => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${row.checked ? 'bg-white' : 'bg-slate-50/40 opacity-50'}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={() => toggleRow(row.id)}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 font-medium">{row.date}</td>
                      <td className="p-3 text-slate-700 max-w-xs truncate">{row.description || <span className="text-slate-300 italic">—</span>}</td>
                      <td className="p-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-0.5 bg-slate-100 rounded-[3px] p-0.5">
                          <button
                            onClick={() => setRowType(row.id, 'Spend')}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition ${
                              row.type === 'Spend'
                                ? 'bg-rose-500 text-white'
                                : 'text-slate-500 hover:text-rose-500'
                            }`}
                          >
                            Spend
                          </button>
                          <button
                            onClick={() => setRowType(row.id, 'Receive')}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition ${
                              row.type === 'Receive'
                                ? 'bg-[#0F5B38] text-white'
                                : 'text-slate-500 hover:text-[#0F5B38]'
                            }`}
                          >
                            Receive
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <AccountSelector
                          value={row.accountId}
                          onChange={id => setRowAccount(row.id, id)}
                          accounts={chartAccts}
                        />
                      </td>
                    </tr>
                  ))
                )}
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
              {!canImport && checkedRows.length > 0 && (
                <span className="text-[11px] text-amber-600 font-semibold">
                  {checkedRows.length - assignedCount} unassigned
                </span>
              )}
              <button
                onClick={handleImport}
                disabled={!canImport || submitting}
                className="flex items-center gap-2 px-5 py-2 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-bold rounded-[3px] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
                  : <>Import {checkedRows.length} Transaction{checkedRows.length !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Success ── */}
      {step === 'success' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Check className="h-7 w-7 text-[#0F5B38]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#071f13]">Import Complete</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {createdCount} transaction{createdCount !== 1 ? 's' : ''} successfully added to {bankAccountName}.
              </p>
            </div>
            <button
              onClick={() => onSuccess(createdCount)}
              className="px-8 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-bold rounded-[3px] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

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
                placeholder="Search accounts..."
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
