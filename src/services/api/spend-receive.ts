import { request } from './base'

export interface SpendReceiveMoneyLine {
  id?: string
  description: string
  quantity: number
  unit_price: number
  account_id: string
  account_name?: string
  tax_rate_id: string | null
  total: number
}

export interface SpendReceiveMoney {
  id: string
  type: 'Spend' | 'Receive'
  bank_account_id: string
  bank_account_name: string
  contact_id: string | null
  contact_name: string | null
  date: string
  reference: string
  currency: string
  tax_type: string
  subtotal: number
  tax_total: number
  total: number
  status: string
  created_at: string
  lines: SpendReceiveMoneyLine[]
}

export interface CreateSpendReceivePayload {
  type: 'Spend' | 'Receive'
  bank_account_id: string
  contact_id?: string | null
  date: string
  reference: string
  currency: string
  tax_type: 'Exclusive' | 'Inclusive'
  lines: {
    description: string
    quantity: number
    unit_price: number
    account_id: string
    tax_rate_id: string | null
  }[]
}

export const spendReceiveApi = {
  async listSpendReceive(orgId: string, type?: 'Spend' | 'Receive'): Promise<SpendReceiveMoney[]> {
    const params = new URLSearchParams({ org_id: orgId })
    if (type) params.set('type', type)
    return request(`/ledger/spend-receive/?${params}`)
  },

  async createSpendReceive(orgId: string, payload: CreateSpendReceivePayload): Promise<SpendReceiveMoney> {
    return request(`/ledger/spend-receive/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteSpendReceive(orgId: string, id: string): Promise<void> {
    return request(`/ledger/spend-receive/${id}/?org_id=${orgId}`, {
      method: 'DELETE',
    })
  },
}
