import { request } from './base'

export interface ManualJournalLine {
  id?: string
  account_id: string
  account_code?: string
  account_name?: string
  description: string
  debit: number
  credit: number
}

export interface ManualJournal {
  id: string
  narration: string
  date: string
  reference: string
  status: string
  total: number
  created_at: string
  lines: ManualJournalLine[]
}

export interface CreateManualJournalPayload {
  narration: string
  date: string
  reference: string
  currency: string
  lines: { account_id: string; description: string; debit: number; credit: number }[]
}

export const manualJournalsApi = {
  async listManualJournals(orgId: string): Promise<ManualJournal[]> {
    return request(`/ledger/manual-journals/?org_id=${orgId}`)
  },

  async createManualJournal(orgId: string, payload: CreateManualJournalPayload): Promise<ManualJournal> {
    return request(`/ledger/manual-journals/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteManualJournal(orgId: string, id: string): Promise<void> {
    return request(`/ledger/manual-journals/${id}/?org_id=${orgId}`, {
      method: 'DELETE',
    })
  },
}
