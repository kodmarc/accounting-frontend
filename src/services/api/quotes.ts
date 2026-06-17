import { request } from './base'
import type { Quote, SendEmailPayload } from './types'

export const quotesApi = {
  async getQuotes(orgId: string): Promise<Quote[]> {
    return request(`/quotes/?org_id=${orgId}`)
  },

  async getQuote(quoteId: string, orgId: string): Promise<Quote> {
    return request(`/quotes/${quoteId}/?org_id=${orgId}`)
  },

  async createQuote(orgId: string, data: Partial<Quote>): Promise<Quote> {
    return request(`/quotes/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateQuote(quoteId: string, data: Partial<Quote>, orgId: string): Promise<Quote> {
    return request(`/quotes/${quoteId}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteQuote(quoteId: string, orgId: string): Promise<null> {
    return request(`/quotes/${quoteId}/?org_id=${orgId}`, { method: 'DELETE' })
  },

  async sendQuoteEmail(quoteId: string, data: SendEmailPayload, orgId: string): Promise<{ message: string }> {
    return request(`/quotes/${quoteId}/send-email/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
