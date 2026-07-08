import { request, fetchWithAuth, API_BASE_URL } from './base'

export interface PLPeriod {
  label: string
  start: string
  end: string
}

export interface PLRow {
  kind: 'section_header' | 'account' | 'formula'
  id?: string
  account_id?: string
  code?: string
  title: string
  type?: string
  values: Record<string, number>
  source?: 'income' | 'expense'
  children?: PLRow[]
}

export interface PLReport {
  periods: PLPeriod[]
  basis: string
  rows: PLRow[]
  trading_income_total: Record<string, number>
}

export interface PLTransaction {
  date: string
  number: string
  contact: string
  description: string
  amount: number
}

export interface PLParams {
  start: string
  end: string
  basis: string
  compare: string
  compare_start?: string
  compare_end?: string
}

export interface BSDate {
  label: string
  date: string
}

export interface BSRow {
  kind: 'section_header' | 'account' | 'derived' | 'formula'
  id?: string
  account_id?: string
  code?: string
  title: string
  type?: string
  is_contra?: boolean
  values: Record<string, number>
  drilldown?: string
  children?: BSRow[]
}

export interface BSReport {
  dates: BSDate[]
  basis: string
  rows: BSRow[]
}

export interface BSTransaction {
  date: string
  number: string
  contact: string
  description: string
  amount: number
}

export interface BSParams {
  as_at: string
  basis: string
  compare: string
  compare_date?: string
}

export interface ATAccount {
  id: string
  code: string
  name: string
  type: string
}

export interface ATTransaction {
  date: string
  source_type: string
  source_id: string
  reference: string
  contact: string
  description: string
  debit: number
  credit: number
  gross: number
  tax_amount: number
  running_balance: number
  account_code: string
  account_name: string
}

export interface ATSection {
  class_type: string
  accounts: ATAccount[]
  opening_balance: number
  transactions: ATTransaction[]
  total_debit: number
  total_credit: number
  closing_balance: number
}

export interface ATReport {
  basis: string
  start: string
  end: string
  sections: ATSection[]
}

export interface ATParams {
  account_ids: string
  start: string
  end: string
  basis: string
}

// ── Cash Flow Statement ───────────────────────────────────────────────

export interface CFLine {
  account_id: string
  account_name: string
  account_code: string
  account_type: string
  amount: number
}

export interface CFOperating {
  net_profit: number
  depreciation: number
  ar_change: number
  ap_change: number
  working_capital_lines: CFLine[]
  total: number
}

export interface CFSection {
  lines: CFLine[]
  total: number
}

export interface CFReport {
  start: string
  end: string
  opening_cash: number
  operating: CFOperating
  investing: CFSection
  financing: CFSection
  net_cash_movement: number
  closing_cash: number
  validation_diff: number
}

export interface CFParams {
  start: string
  end: string
}

export const reportsApi = {
  async getProfitLoss(orgId: string, params: PLParams): Promise<PLReport> {
    const q = new URLSearchParams({ org_id: orgId, ...params })
    return request(`/reports/profit-loss/?${q}`)
  },

  async getPLDrilldown(
    orgId: string,
    params: { account_id: string; start: string; end: string; basis: string; source: string }
  ): Promise<{ transactions: PLTransaction[] }> {
    const q = new URLSearchParams({ org_id: orgId, ...params })
    return request(`/reports/pl-drilldown/?${q}`)
  },

  async downloadPLPdf(orgId: string, params: PLParams): Promise<void> {
    const q = new URLSearchParams({ org_id: orgId, ...params })
    const res = await fetchWithAuth(`${API_BASE_URL}/reports/profit-loss-pdf/?${q}`)
    if (!res.ok) throw new Error('Failed to generate PDF')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ProfitLoss_${params.start}_${params.end}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  async getBalanceSheet(orgId: string, params: BSParams): Promise<BSReport> {
    const p: Record<string, string> = { org_id: orgId, as_at: params.as_at, basis: params.basis, compare: params.compare }
    if (params.compare_date) p.compare_date = params.compare_date
    return request(`/reports/balance-sheet/?${new URLSearchParams(p)}`)
  },

  async getBSDrilldown(
    orgId: string,
    params: { section: string; as_at: string; account_id?: string }
  ): Promise<{ transactions: BSTransaction[] }> {
    const p: Record<string, string> = { org_id: orgId, section: params.section, as_at: params.as_at }
    if (params.account_id) p.account_id = params.account_id
    return request(`/reports/bs-drilldown/?${new URLSearchParams(p)}`)
  },

  async downloadBSPdf(orgId: string, params: BSParams): Promise<void> {
    const p: Record<string, string> = { org_id: orgId, as_at: params.as_at, basis: params.basis, compare: params.compare }
    if (params.compare_date) p.compare_date = params.compare_date
    const res = await fetchWithAuth(`${API_BASE_URL}/reports/balance-sheet-pdf/?${new URLSearchParams(p)}`)
    if (!res.ok) throw new Error('Failed to generate PDF')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BalanceSheet_${params.as_at}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  async getAccountTransactions(orgId: string, params: ATParams): Promise<ATReport> {
    const q = new URLSearchParams({ org_id: orgId, ...params })
    return request(`/reports/account-transactions/?${q}`)
  },

  async downloadATPdf(orgId: string, params: ATParams): Promise<void> {
    const q = new URLSearchParams({ org_id: orgId, ...params })
    const res = await fetchWithAuth(`${API_BASE_URL}/reports/account-transactions-pdf/?${q}`)
    if (!res.ok) throw new Error('Failed to generate PDF')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AccountTransactions_${params.start}_${params.end}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  async getCashFlow(orgId: string, params: CFParams): Promise<CFReport> {
    const q = new URLSearchParams({ org_id: orgId, ...params })
    return request(`/reports/cash-flow/?${q}`)
  },

  async downloadCFPdf(orgId: string, params: CFParams): Promise<void> {
    const q = new URLSearchParams({ org_id: orgId, ...params })
    const res = await fetchWithAuth(`${API_BASE_URL}/reports/cash-flow-pdf/?${q}`)
    if (!res.ok) throw new Error('Failed to generate PDF')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CashFlow_${params.start}_${params.end}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
