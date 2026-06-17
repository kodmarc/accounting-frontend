import { request } from './base'

export interface Payment {
  id: string
  invoice: string | null
  bill: string | null
  bank_account: string
  bank_account_name: string
  amount: string
  date: string
  created_at: string
}

export const paymentsApi = {
  async getPayments(orgId: string): Promise<Payment[]> {
    return request(`/payments/?org_id=${orgId}`)
  },
}
