import { request } from './base'
import type { Bill, SendBillEmailPayload } from './types'

export const billsApi = {
  async getBills(orgId: string): Promise<Bill[]> {
    return request(`/bills/?org_id=${orgId}`)
  },

  async getBill(billId: string, orgId: string): Promise<Bill> {
    return request(`/bills/${billId}/?org_id=${orgId}`)
  },

  async createBill(orgId: string, data: Partial<Bill>): Promise<Bill> {
    return request(`/bills/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateBill(billId: string, data: Partial<Bill>, orgId: string): Promise<Bill> {
    return request(`/bills/${billId}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteBill(billId: string, orgId: string): Promise<null> {
    return request(`/bills/${billId}/?org_id=${orgId}`, { method: 'DELETE' })
  },

  async sendBillEmail(data: SendBillEmailPayload, orgId: string): Promise<{ message: string }> {
    return request(`/bills/send-email/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async recordBillPayment(billId: string, data: { date: string; payments: { bank_account_id: string; amount: number }[] }, orgId: string): Promise<Bill> {
    return request(`/bills/${billId}/record-payment/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
