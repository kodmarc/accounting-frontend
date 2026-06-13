import { request } from './base'
import type { Quote, SendEmailPayload } from './types'

export const quotesApi = {
  async getQuotes(orgId: string): Promise<Quote[]> {
    return request(`/quotes/?org_id=${orgId}`)
  },

  async getQuote(quoteId: string): Promise<Quote> {
    return request(`/quotes/${quoteId}/`)
  },

  async createQuote(orgId: string, data: Partial<Quote>): Promise<Quote> {
    return request(`/quotes/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateQuote(quoteId: string, data: Partial<Quote>): Promise<Quote> {
    return request(`/quotes/${quoteId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteQuote(quoteId: string): Promise<null> {
    return request(`/quotes/${quoteId}/`, { method: 'DELETE' })
  },

  async sendQuoteEmail(quoteId: string, data: SendEmailPayload): Promise<{ message: string }> {
    return request(`/quotes/${quoteId}/send-email/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
