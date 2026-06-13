import { request } from './base'
import type { Item } from './types'

export const itemsApi = {
  async getItems(orgId: string): Promise<Item[]> {
    return request(`/items/?org_id=${orgId}`)
  },

  async createItem(orgId: string, data: Partial<Item>): Promise<Item> {
    return request(`/items/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateItem(itemId: string, data: Partial<Item>): Promise<Item> {
    return request(`/items/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteItem(itemId: string): Promise<null> {
    return request(`/items/${itemId}/`, { method: 'DELETE' })
  },
}
