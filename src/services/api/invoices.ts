import { request } from './base'
import type { Invoice, SendEmailPayload } from './types'

export const invoicesApi = {
  async getInvoices(orgId: string): Promise<Invoice[]> {
    return request(`/invoices/?org_id=${orgId}`)
  },

  async getInvoice(invoiceId: string, orgId: string): Promise<Invoice> {
    return request(`/invoices/${invoiceId}/?org_id=${orgId}`)
  },

  async createInvoice(orgId: string, data: Partial<Invoice>): Promise<Invoice> {
    return request(`/invoices/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateInvoice(invoiceId: string, data: Partial<Invoice>, orgId: string): Promise<Invoice> {
    return request(`/invoices/${invoiceId}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteInvoice(invoiceId: string, orgId: string): Promise<null> {
    return request(`/invoices/${invoiceId}/?org_id=${orgId}`, { method: 'DELETE' })
  },

  async sendInvoiceEmail(invoiceId: string, data: SendEmailPayload, orgId: string): Promise<{ message: string }> {
    return request(`/invoices/${invoiceId}/send-email/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async recordInvoicePayment(invoiceId: string, data: { date: string; payments: { bank_account_id: string; amount: number }[] }, orgId: string): Promise<Invoice> {
    return request(`/invoices/${invoiceId}/record-payment/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
