import { request } from './base'
import type { SalesSetting } from './types'

export const salesSettingsApi = {
  async getSalesSettings(orgId: string): Promise<SalesSetting> {
    return request(`/sales-settings/?org_id=${orgId}`)
  },

  async updateSalesSettings(orgId: string, data: Partial<SalesSetting>): Promise<SalesSetting> {
    return request(`/sales-settings/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}
