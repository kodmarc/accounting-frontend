import { authApi } from './api/auth'
import { organizationsApi } from './api/organizations'
import { metadataApi } from './api/metadata'
import { ledgerApi } from './api/ledger'

export type { User, Organization, Membership, TaxRate, Account, Contact, Item, SalesSetting, Invoice, InvoiceLine, Quote, QuoteLine, Project } from './api/types'
export { API_BASE_URL, request } from './api/base'

export const apiService = {
  ...authApi,
  ...organizationsApi,
  ...metadataApi,
  ...ledgerApi,
}
