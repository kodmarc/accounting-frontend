import { request } from './base'
import type { AssetType, FixedAsset, DepreciationRun, DepRunPreview } from './types'

export const fixedAssetsApi = {
  // ── Asset Types ──────────────────────────────────────────────────────────
  async getAssetTypes(orgId: string): Promise<AssetType[]> {
    return request(`/asset-types/?org_id=${orgId}`)
  },

  async createAssetType(orgId: string, data: Partial<AssetType>): Promise<AssetType> {
    return request(`/asset-types/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateAssetType(orgId: string, id: string, data: Partial<AssetType>): Promise<AssetType> {
    return request(`/asset-types/${id}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteAssetType(orgId: string, id: string): Promise<{ message: string }> {
    return request(`/asset-types/${id}/?org_id=${orgId}`, { method: 'DELETE' })
  },

  // ── Fixed Assets ─────────────────────────────────────────────────────────
  async getAssets(orgId: string, status?: string): Promise<FixedAsset[]> {
    const params = new URLSearchParams({ org_id: orgId })
    if (status) params.set('status', status)
    return request(`/fixed-assets/?${params}`)
  },

  async createAsset(orgId: string, data: Partial<FixedAsset>): Promise<FixedAsset> {
    return request(`/fixed-assets/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getAsset(orgId: string, id: string): Promise<FixedAsset> {
    return request(`/fixed-assets/${id}/?org_id=${orgId}`)
  },

  async updateAsset(orgId: string, id: string, data: Partial<FixedAsset>): Promise<FixedAsset> {
    return request(`/fixed-assets/${id}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteAsset(orgId: string, id: string): Promise<{ message: string }> {
    return request(`/fixed-assets/${id}/?org_id=${orgId}`, { method: 'DELETE' })
  },

  async registerAsset(orgId: string, id: string, data: { offset_account?: string }): Promise<FixedAsset> {
    return request(`/fixed-assets/${id}/register/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async rollbackAsset(orgId: string, id: string): Promise<FixedAsset> {
    return request(`/fixed-assets/${id}/rollback/?org_id=${orgId}`, { method: 'POST' })
  },

  async disposeAsset(orgId: string, id: string, data: {
    disposal_date: string
    disposal_price: number
    proceeds_account?: string
  }): Promise<FixedAsset> {
    return request(`/fixed-assets/${id}/dispose/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // ── Depreciation Runs ────────────────────────────────────────────────────
  async getDepRuns(orgId: string): Promise<DepreciationRun[]> {
    return request(`/dep-runs/?org_id=${orgId}`)
  },

  async previewDepRun(orgId: string, data: {
    period_start: string
    period_end: string
    period_label: string
  }): Promise<DepRunPreview> {
    return request(`/dep-runs/preview/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async postDepRun(orgId: string, data: {
    period_start: string
    period_end: string
    period_label: string
  }): Promise<DepreciationRun> {
    return request(`/dep-runs/post/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async undoDepRun(orgId: string, id: string): Promise<{ message: string }> {
    return request(`/dep-runs/${id}/undo/?org_id=${orgId}`, { method: 'POST' })
  },
}
