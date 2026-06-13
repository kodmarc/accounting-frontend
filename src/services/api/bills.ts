import { request } from './base'
import type { Bill, SendBillEmailPayload } from './types'

export const billsApi = {
  async getBills(orgId: string): Promise<Bill[]> {
    return request(`/bills/?org_id=${orgId}`)
  },

  async getBill(billId: string): Promise<Bill> {
    return request(`/bills/${billId}/`)
  },

  async createBill(orgId: string, data: Partial<Bill>): Promise<Bill> {
    return request(`/bills/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateBill(billId: string, data: Partial<Bill>): Promise<Bill> {
    return request(`/bills/${billId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteBill(billId: string): Promise<null> {
    return request(`/bills/${billId}/`, { method: 'DELETE' })
  },

  async sendBillEmail(data: SendBillEmailPayload): Promise<{ message: string }> {
    return request('/bills/send-email/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
