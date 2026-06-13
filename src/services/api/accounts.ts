import { request } from './base'
import type { Account } from './types'

export const accountsApi = {
  async getAccounts(orgId: string): Promise<Account[]> {
    return request(`/accounts/?org_id=${orgId}`)
  },

  async importDefaultAccounts(orgId: string): Promise<Account[]> {
    return request(`/accounts/import-defaults/?org_id=${orgId}`, { method: 'POST' })
  },

  async createAccount(orgId: string, data: Partial<Account>): Promise<Account> {
    return request(`/accounts/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateAccount(accountId: string, data: Partial<Account>): Promise<Account> {
    return request(`/accounts/${accountId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteAccount(accountId: string): Promise<null> {
    return request(`/accounts/${accountId}/`, { method: 'DELETE' })
  },

  async deleteAccountsBulk(orgId: string, accountIds: string[]): Promise<{ message: string }> {
    return request(`/accounts/bulk-delete/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify({ account_ids: accountIds }),
    })
  },
}
