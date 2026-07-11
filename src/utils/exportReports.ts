import ExcelJS from 'exceljs'
import type { PLReport, PLRow, BSReport, BSRow, ATReport, CFReport } from '../services/api/reports'

// ── Shared helpers ────────────────────────────────────────────────────

const GREEN   = '0F5B38'
const GREEN_L = 'E8F4EE'
const GRAY_H  = 'F2F2F2'
const GRAY_B  = 'D9D9D9'

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function fmt(v: number | undefined | null): string {
  if (v === undefined || v === null || v === 0) return '—'
  if (v < 0) return `(${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function applyHeaderRow(row: ExcelJS.Row, bgColor = GREEN) {
  row.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } }
    cell.font   = { bold: true, color: { argb: bgColor === GREEN ? 'FFFFFFFF' : 'FF000000' }, size: 10 }
    cell.alignment = { vertical: 'middle', wrapText: false }
  })
  row.height = 18
}

function applySubtotalRow(row: ExcelJS.Row, bgColor = GREEN_L) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } }
    cell.font = { bold: true, size: 9 }
    cell.border = { top: { style: 'thin', color: { argb: 'FF' + GRAY_B } } }
  })
}

function applyKeyRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.border = { top: { style: 'medium', color: { argb: 'FF' + GREEN } } }
  })
  row.height = 20
}

function rightAlign(cell: ExcelJS.Cell) {
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

function numCell(cell: ExcelJS.Cell, v: number | undefined, accounting = true) {
  cell.value = v ?? 0
  cell.numFmt = accounting
    ? '#,##0.00_);[Red]\\(#,##0.00\\);"-"'
    : '#,##0.00'
  rightAlign(cell)
}

// ── CSV helpers (no dep on exceljs) ──────────────────────────────────

function toCsv(rows: (string | number)[][]): string {
  return rows.map(r =>
    r.map(v => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  ).join('\n')
}

function csvBlob(rows: (string | number)[][], filename: string) {
  saveBlob(new Blob([toCsv(rows)], { type: 'text/csv' }), filename)
}

// ── P&L ───────────────────────────────────────────────────────────────

function flattenPL(rows: PLRow[], labels: string[], depth: number): { label: string; values: (number | undefined)[]; kind: string; depth: number }[] {
  const out: { label: string; values: (number | undefined)[]; kind: string; depth: number }[] = []
  for (const row of rows) {
    const label = (row.code ? `${row.code}  ` : '') + row.title
    out.push({ label, values: labels.map(l => row.values?.[l]), kind: row.kind, depth })
    if (row.children?.length) out.push(...flattenPL(row.children, labels, depth + 1))
  }
  return out
}

export function exportPLtoCsv(report: PLReport, filename: string) {
  const labels = report.periods.map(p => p.label)
  const flat = flattenPL(report.rows, labels, 0)
  const rows: (string | number)[][] = [
    ['Account', ...labels],
    ...flat.map(r => ['  '.repeat(r.depth) + r.label, ...r.values.map(v => v ?? '')])
  ]
  csvBlob(rows, filename)
}

export async function exportPLtoExcel(report: PLReport, filename: string) {
  const labels = report.periods.map(p => p.label)
  const flat   = flattenPL(report.rows, labels, 0)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Profit & Loss')

  // Column widths
  ws.columns = [
    { width: 44 },
    ...labels.map(() => ({ width: 18 })),
  ]

  // Org / title rows (we don't have org name here so use report period)
  const titleRow = ws.addRow(['Profit & Loss', ...labels.map(() => '')])
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF' + GREEN } }
  titleRow.height = 24

  const subRow = ws.addRow([`${report.periods[0].start} – ${report.periods[report.periods.length - 1].end}  |  ${report.basis === 'accrual' ? 'Accrual Basis' : 'Cash Basis'}`, ...labels.map(() => '')])
  subRow.getCell(1).font = { size: 9, color: { argb: 'FF888888' } }

  ws.addRow([])

  // Header
  const hRow = ws.addRow(['Account', ...labels])
  hRow.getCell(1).alignment = { horizontal: 'left' }
  labels.forEach((_, i) => {
    const c = hRow.getCell(2 + i)
    c.alignment = { horizontal: 'right' }
  })
  applyHeaderRow(hRow)

  // Data rows
  for (const r of flat) {
    const indent = '  '.repeat(r.depth)
    const dataRow = ws.addRow([indent + r.label, ...r.values.map(v => v ?? 0)])
    dataRow.getCell(1).alignment = { horizontal: 'left', indent: r.depth }

    if (r.kind === 'section_header' && r.depth === 0) {
      // Top-level section header
      dataRow.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF555555' } }
      dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GRAY_H } }
      labels.forEach((_, i) => {
        const c = dataRow.getCell(2 + i)
        numCell(c, r.values[i])
        c.font = { bold: true, size: 9 }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GRAY_H } }
      })
    } else if (r.kind === 'formula' && r.label.toLowerCase().includes('net profit')) {
      applyKeyRow(dataRow)
      labels.forEach((_, i) => { numCell(dataRow.getCell(2 + i), r.values[i]); dataRow.getCell(2 + i).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 } })
    } else if (r.kind === 'formula') {
      applySubtotalRow(dataRow)
      labels.forEach((_, i) => { numCell(dataRow.getCell(2 + i), r.values[i]) })
    } else if (r.kind === 'section_header') {
      // Sub-section total
      applySubtotalRow(dataRow, GRAY_H)
      dataRow.getCell(1).font = { bold: true, size: 9 }
      labels.forEach((_, i) => { numCell(dataRow.getCell(2 + i), r.values[i]); dataRow.getCell(2 + i).font = { bold: true, size: 9 } })
    } else {
      // Account row
      dataRow.getCell(1).font = { size: 9 }
      labels.forEach((_, i) => { numCell(dataRow.getCell(2 + i), r.values[i]) })
      if (ws.rowCount % 2 === 0) {
        dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

// ── Balance Sheet ──────────────────────────────────────────────────────

function flattenBS(rows: BSRow[], labels: string[], depth: number): { label: string; values: (number | undefined)[]; kind: string; depth: number }[] {
  const out: { label: string; values: (number | undefined)[]; kind: string; depth: number }[] = []
  for (const row of rows) {
    const name = row.is_contra ? `Less: ${row.title}` : row.title
    const label = (row.code ? `${row.code}  ` : '') + name
    out.push({ label, values: labels.map(l => row.values?.[l]), kind: row.kind, depth })
    if (row.children?.length) out.push(...flattenBS(row.children, labels, depth + 1))
  }
  return out
}

export function exportBStoCsv(report: BSReport, filename: string) {
  const labels = report.dates.map(d => d.label)
  const flat = flattenBS(report.rows, labels, 0)
  csvBlob([['Account', ...labels], ...flat.map(r => ['  '.repeat(r.depth) + r.label, ...r.values.map(v => v ?? '')])], filename)
}

export async function exportBStoExcel(report: BSReport, filename: string) {
  const labels = report.dates.map(d => d.label)
  const flat   = flattenBS(report.rows, labels, 0)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Balance Sheet')
  ws.columns = [{ width: 44 }, ...labels.map(() => ({ width: 18 }))]

  const titleRow = ws.addRow(['Balance Sheet', ...labels.map(() => '')])
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF' + GREEN } }
  titleRow.height = 24
  const subRow = ws.addRow([`As at ${labels[0]}  |  ${report.basis === 'accrual' ? 'Accrual Basis' : 'Cash Basis'}`, ...labels.map(() => '')])
  subRow.getCell(1).font = { size: 9, color: { argb: 'FF888888' } }
  ws.addRow([])

  const hRow = ws.addRow(['Account', ...labels])
  hRow.getCell(1).alignment = { horizontal: 'left' }
  labels.forEach((_, i) => { hRow.getCell(2 + i).alignment = { horizontal: 'right' } })
  applyHeaderRow(hRow)

  for (const r of flat) {
    const dataRow = ws.addRow([r.label, ...r.values.map(v => v ?? 0)])
    dataRow.getCell(1).alignment = { horizontal: 'left', indent: r.depth }

    if (r.kind === 'section_header' && r.depth === 0) {
      dataRow.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF555555' } }
      dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GRAY_H } }
      labels.forEach((_, i) => {
        numCell(dataRow.getCell(2 + i), r.values[i])
        dataRow.getCell(2 + i).font = { bold: true, size: 9 }
        dataRow.getCell(2 + i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GRAY_H } }
      })
    } else if (r.kind === 'formula') {
      // check if key formula by checking if label matches typical key labels
      const isKey = r.label === 'Total Assets' || r.label === 'Net Assets' || r.label === 'Total Equity' || r.label === 'Total Liabilities'
      if (isKey) {
        applyKeyRow(dataRow)
        labels.forEach((_, i) => { numCell(dataRow.getCell(2 + i), r.values[i]); dataRow.getCell(2 + i).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 } })
      } else {
        applySubtotalRow(dataRow)
        labels.forEach((_, i) => { numCell(dataRow.getCell(2 + i), r.values[i]) })
      }
    } else {
      dataRow.getCell(1).font = { size: 9 }
      labels.forEach((_, i) => { numCell(dataRow.getCell(2 + i), r.values[i]) })
      if (ws.rowCount % 2 === 0) {
        dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

// ── Account Transactions ───────────────────────────────────────────────

export function exportATtoCsv(report: ATReport, filename: string) {
  const rows: (string | number)[][] = [
    ['Date', 'Source', 'Account Code', 'Account Name', 'Reference', 'Description', 'Debit', 'Credit', 'Gross', 'Tax', 'Balance'],
  ]
  for (const sec of report.sections) {
    rows.push([`— ${sec.class_type} —`, '', '', '', '', '', '', '', '', '', ''])
    rows.push(['Opening Balance', '', '', '', '', '', '', '', '', '', sec.opening_balance])
    for (const t of sec.transactions) {
      rows.push([t.date, t.source_type, t.account_code, t.account_name, t.reference, t.description,
        t.debit || '', t.credit || '', t.gross, t.tax_amount || '', t.running_balance])
    }
    rows.push([`Total ${sec.class_type}`, '', '', '', '', '', sec.total_debit, sec.total_credit, '', '', sec.closing_balance])
    rows.push([])
  }
  csvBlob(rows, filename)
}

export async function exportATtoExcel(report: ATReport, filename: string) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Account Transactions')
  ws.columns = [
    { width: 12 }, { width: 14 }, { width: 10 }, { width: 26 },
    { width: 12 }, { width: 28 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 },
  ]

  // Title
  const titleRow = ws.addRow(['Account Transactions', ...Array(10).fill('')])
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF' + GREEN } }
  titleRow.height = 24
  const subRow = ws.addRow([`${report.start} – ${report.end}  |  ${report.basis === 'accrual' ? 'Accrual Basis' : 'Cash Basis'}`, ...Array(10).fill('')])
  subRow.getCell(1).font = { size: 9, color: { argb: 'FF888888' } }
  ws.addRow([])

  // Header
  const COLS = ['Date', 'Source', 'Acc. Code', 'Account Name', 'Reference', 'Description', 'Debit', 'Credit', 'Gross', 'Tax', 'Balance']
  const hRow = ws.addRow(COLS)
  applyHeaderRow(hRow)
  ;[7, 8, 9, 10, 11].forEach(i => { hRow.getCell(i).alignment = { horizontal: 'right' } })

  for (const sec of report.sections) {
    // Section title row
    const secRow = ws.addRow([sec.class_type, ...Array(10).fill('')])
    secRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    secRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D7A54' } }
    secRow.height = 16

    // Opening balance
    const obRow = ws.addRow(['Opening Balance', '', '', '', '', '', '', '', '', '', sec.opening_balance])
    obRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GRAY_H } }
    obRow.getCell(1).font = { italic: true, size: 9 }
    numCell(obRow.getCell(11), sec.opening_balance)
    obRow.getCell(11).font = { bold: true, size: 9 }

    // Transaction rows
    let rowIdx = 0
    for (const t of sec.transactions) {
      const dr = ws.addRow([
        t.date, t.source_type, t.account_code, t.account_name,
        t.reference, t.description || '',
        t.debit || null, t.credit || null, t.gross, t.tax_amount || null, t.running_balance,
      ])
      dr.getCell(1).font  = { size: 9 }
      dr.getCell(2).font  = { size: 9, color: { argb: 'FF555555' } }
      dr.getCell(3).font  = { size: 9, color: { argb: 'FF888888' } }
      dr.getCell(4).font  = { size: 9 }
      dr.getCell(5).font  = { size: 9, color: { argb: 'FF555555' } }
      dr.getCell(6).font  = { size: 9, color: { argb: 'FF555555' } }
      ;[7, 8, 9, 10, 11].forEach(i => { numCell(dr.getCell(i), dr.getCell(i).value as number) })
      if (rowIdx % 2 === 1) {
        dr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      }
      rowIdx++
    }

    // Total row
    const totRow = ws.addRow([
      `Total ${sec.class_type}`, '', '', '', '', '',
      sec.total_debit, sec.total_credit, '', '', sec.closing_balance,
    ])
    applySubtotalRow(totRow, GRAY_H)
    totRow.getCell(1).font = { bold: true, size: 9 }
    ;[7, 8, 11].forEach(i => { numCell(totRow.getCell(i), totRow.getCell(i).value as number) })

    ws.addRow([])
  }

  const buf = await wb.xlsx.writeBuffer()
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

// ── Cash Flow ──────────────────────────────────────────────────────────

function arLabel(v: number) { return v >= 0 ? 'Decrease in Accounts Receivable' : 'Increase in Accounts Receivable' }
function apLabel(v: number) { return v >= 0 ? 'Increase in Accounts Payable' : 'Decrease in Accounts Payable' }
function wcLabel(name: string, amt: number) { return `${amt >= 0 ? 'Decrease in' : 'Increase in'} ${name}` }

export function exportCFtoCsv(report: CFReport, filename: string) {
  const { operating: op, investing: inv, financing: fin } = report
  const rows: (string | number)[][] = [['Description', 'Amount']]
  rows.push(['Operating Activities', ''])
  rows.push(['Net Profit / (Loss)', op.net_profit])
  if (op.depreciation) rows.push(['Add: Depreciation', op.depreciation])
  if (op.ar_change)    rows.push([arLabel(op.ar_change), op.ar_change])
  if (op.ap_change)    rows.push([apLabel(op.ap_change), op.ap_change])
  for (const l of op.working_capital_lines) rows.push([wcLabel(l.account_name, l.amount), l.amount])
  rows.push(['Net Cash from Operating Activities', op.total], [])
  rows.push(['Investing Activities', ''])
  for (const l of inv.lines) rows.push([l.account_name, l.amount])
  rows.push(['Net Cash from Investing Activities', inv.total], [])
  rows.push(['Financing Activities', ''])
  for (const l of fin.lines) rows.push([l.account_name, l.amount])
  rows.push(['Net Cash from Financing Activities', fin.total], [])
  rows.push(['Opening Cash Balance', report.opening_cash])
  rows.push(['Net Cash Movement', report.net_cash_movement])
  rows.push(['Closing Cash Balance', report.closing_cash])
  if (report.validation_diff !== 0) rows.push(['Unmodelled Cash Movements', report.validation_diff])
  csvBlob(rows, filename)
}

export async function exportCFtoExcel(report: CFReport, filename: string) {
  const { operating: op, investing: inv, financing: fin } = report

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Cash Flow')
  ws.columns = [{ width: 46 }, { width: 18 }]

  // Title
  const titleRow = ws.addRow(['Cash Flow Statement', ''])
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF' + GREEN } }
  titleRow.height = 24
  const subRow = ws.addRow([`${report.start} – ${report.end}  |  Indirect Method`, ''])
  subRow.getCell(1).font = { size: 9, color: { argb: 'FF888888' } }
  ws.addRow([])

  function addSectionHeader(label: string) {
    const r = ws.addRow([label, ''])
    r.getCell(1).font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } }
    r.height = 18
  }

  function addLine(label: string, value: number, bold = false, indent = true, highlight = false) {
    const r = ws.addRow([label, value])
    r.getCell(1).alignment = { horizontal: 'left', indent: indent ? 2 : 0 }
    r.getCell(1).font = { bold, size: 9 }
    numCell(r.getCell(2), value)
    r.getCell(2).font = { bold, size: 9 }
    if (highlight) {
      applyKeyRow(r)
      r.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      r.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    } else if (bold) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN_L } }
      r.getCell(2).border = { top: { style: 'thin', color: { argb: 'FF' + GRAY_B } } }
    }
  }

  addSectionHeader('Cash Flows from Operating Activities')
  addLine('Net Profit / (Loss)', op.net_profit)
  if (op.depreciation) addLine('Add: Depreciation', op.depreciation)
  if (op.ar_change)    addLine(arLabel(op.ar_change), op.ar_change)
  if (op.ap_change)    addLine(apLabel(op.ap_change), op.ap_change)
  for (const l of op.working_capital_lines) addLine(wcLabel(l.account_name, l.amount), l.amount)
  addLine('Net Cash from Operating Activities', op.total, true, false)
  ws.addRow([])

  addSectionHeader('Cash Flows from Investing Activities')
  if (inv.lines.length) { for (const l of inv.lines) addLine(l.account_name, l.amount) }
  else { const r = ws.addRow(['No investing activities', '']); r.getCell(1).font = { italic: true, size: 9, color: { argb: 'FFAAAAAA' } } }
  addLine('Net Cash from Investing Activities', inv.total, true, false)
  ws.addRow([])

  addSectionHeader('Cash Flows from Financing Activities')
  if (fin.lines.length) { for (const l of fin.lines) addLine(l.account_name, l.amount) }
  else { const r = ws.addRow(['No financing activities', '']); r.getCell(1).font = { italic: true, size: 9, color: { argb: 'FFAAAAAA' } } }
  addLine('Net Cash from Financing Activities', fin.total, true, false)
  ws.addRow([])

  addLine('Opening Cash Balance', report.opening_cash, false, false)
  addLine('Net Cash Movement', report.net_cash_movement, true, false)
  addLine('Closing Cash Balance', report.closing_cash, true, false, true)

  if (report.validation_diff !== 0) {
    const r = ws.addRow([`Note: Unmodelled cash movements — ${fmt(report.validation_diff)}`, ''])
    r.getCell(1).font = { size: 8, color: { argb: 'FFCC0000' } }
  }

  const buf = await wb.xlsx.writeBuffer()
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}
