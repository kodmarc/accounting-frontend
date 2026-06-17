import { request } from './base'
import type { Item, InventoryMovement } from './types'

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

  async updateItem(itemId: string, data: Partial<Item>, orgId: string): Promise<Item> {
    return request(`/items/${itemId}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async patchItem(itemId: string, data: Partial<Item>, orgId: string): Promise<Item> {
    return request(`/items/${itemId}/?org_id=${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteItem(itemId: string): Promise<null> {
    return request(`/items/${itemId}/`, { method: 'DELETE' })
  },

  async getItemMovements(orgId: string, itemId: string): Promise<InventoryMovement[]> {
    return request(`/items/${itemId}/movements/?org_id=${orgId}`)
  },

  async adjustItemStock(
    orgId: string,
    itemId: string,
    payload: { type: 'manual_add' | 'manual_remove'; quantity: number; notes?: string },
  ): Promise<Item> {
    return request(`/items/${itemId}/adjust/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
