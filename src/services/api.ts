import { authApi } from './api/auth'
import { organizationsApi } from './api/organizations'
import { metadataApi } from './api/metadata'
import { accountsApi } from './api/accounts'
import { taxRatesApi } from './api/tax-rates'
import { contactsApi } from './api/contacts'
import { itemsApi } from './api/items'
import { salesSettingsApi } from './api/sales-settings'
import { invoicesApi } from './api/invoices'
import { quotesApi } from './api/quotes'
import { billsApi } from './api/bills'
import { purchaseOrdersApi } from './api/purchase-orders'
import { projectsApi } from './api/projects'
import { paymentsApi } from './api/payments'
import { reportsApi } from './api/reports'
export type { Payment } from './api/payments'

export type {
  User, Organization, Membership,
  TaxRate, Account, Contact, Item, SalesSetting,
  Invoice, InvoiceLine, Quote, QuoteLine,
  Bill, BillLine, PurchaseOrder, PurchaseOrderLine,
  Project, InventoryMovement,
  OrgMember, OrgInvitation, InvitationInfo,
  SendEmailPayload, SendBillEmailPayload, SendPurchaseOrderEmailPayload,
} from './api/types'
export { API_BASE_URL, request, fetchWithAuth } from './api/base'

export const apiService = {
  ...authApi,
  ...organizationsApi,
  ...metadataApi,
  ...accountsApi,
  ...taxRatesApi,
  ...contactsApi,
  ...itemsApi,
  ...salesSettingsApi,
  ...invoicesApi,
  ...quotesApi,
  ...billsApi,
  ...purchaseOrdersApi,
  ...projectsApi,
  ...paymentsApi,
  ...reportsApi,
}
