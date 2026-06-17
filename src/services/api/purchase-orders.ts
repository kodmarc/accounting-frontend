import { request } from './base'
import type { PurchaseOrder, SendPurchaseOrderEmailPayload } from './types'

export const purchaseOrdersApi = {
  async getPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
    return request(`/purchase-orders/?org_id=${orgId}`)
  },

  async getPurchaseOrder(poId: string, orgId: string): Promise<PurchaseOrder> {
    return request(`/purchase-orders/${poId}/?org_id=${orgId}`)
  },

  async createPurchaseOrder(orgId: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return request(`/purchase-orders/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updatePurchaseOrder(poId: string, data: Partial<PurchaseOrder>, orgId: string): Promise<PurchaseOrder> {
    return request(`/purchase-orders/${poId}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deletePurchaseOrder(poId: string, orgId: string): Promise<null> {
    return request(`/purchase-orders/${poId}/?org_id=${orgId}`, { method: 'DELETE' })
  },

  async sendPurchaseOrderEmail(data: SendPurchaseOrderEmailPayload, orgId: string): Promise<{ message: string }> {
    return request(`/purchase-orders/send-email/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
