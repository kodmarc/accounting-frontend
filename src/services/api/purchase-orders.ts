import { request } from './base'
import type { PurchaseOrder, SendPurchaseOrderEmailPayload } from './types'

export const purchaseOrdersApi = {
  async getPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
    return request(`/purchase-orders/?org_id=${orgId}`)
  },

  async getPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    return request(`/purchase-orders/${poId}/`)
  },

  async createPurchaseOrder(orgId: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return request(`/purchase-orders/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updatePurchaseOrder(poId: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return request(`/purchase-orders/${poId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deletePurchaseOrder(poId: string): Promise<null> {
    return request(`/purchase-orders/${poId}/`, { method: 'DELETE' })
  },

  async sendPurchaseOrderEmail(data: SendPurchaseOrderEmailPayload): Promise<{ message: string }> {
    return request('/purchase-orders/send-email/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
