import { request } from './base'

export interface BulkImportTransaction {
  date: string
  description: string
  amount: number
  type: 'Spend' | 'Receive'
  account_id: string
}

export const bankImportApi = {
  async bulkImportTransactions(
    orgId: string,
    bankAccountId: string,
    currency: string,
    transactions: BulkImportTransaction[],
  ): Promise<{ created: number }> {
    return request(`/ledger/bulk-import-transactions/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify({ bank_account_id: bankAccountId, currency, transactions }),
    })
  },
}
