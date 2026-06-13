import { request } from './base'
import type { TaxRate } from './types'

export const taxRatesApi = {
  async getTaxRates(orgId: string): Promise<TaxRate[]> {
    return request(`/tax-rates/?org_id=${orgId}`)
  },

  async createTaxRate(orgId: string, data: Partial<TaxRate>): Promise<TaxRate> {
    return request(`/tax-rates/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateTaxRate(taxRateId: string, data: Partial<TaxRate>): Promise<TaxRate> {
    return request(`/tax-rates/${taxRateId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteTaxRate(taxRateId: string): Promise<null> {
    return request(`/tax-rates/${taxRateId}/`, { method: 'DELETE' })
  },
}
