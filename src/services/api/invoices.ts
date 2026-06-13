import { request } from './base'
import type { Invoice, SendEmailPayload } from './types'

export const invoicesApi = {
  async getInvoices(orgId: string): Promise<Invoice[]> {
    return request(`/invoices/?org_id=${orgId}`)
  },

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return request(`/invoices/${invoiceId}/`)
  },

  async createInvoice(orgId: string, data: Partial<Invoice>): Promise<Invoice> {
    return request(`/invoices/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateInvoice(invoiceId: string, data: Partial<Invoice>): Promise<Invoice> {
    return request(`/invoices/${invoiceId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteInvoice(invoiceId: string): Promise<null> {
    return request(`/invoices/${invoiceId}/`, { method: 'DELETE' })
  },

  async sendInvoiceEmail(invoiceId: string, data: SendEmailPayload): Promise<{ message: string }> {
    return request(`/invoices/${invoiceId}/send-email/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
