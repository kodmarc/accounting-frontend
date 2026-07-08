# TypeScript Types

All API-related interfaces live in `frontend/src/services/api/types.ts`. Tab identifiers are in `frontend/src/types/tabs.ts`.

## Core Auth and Org Types

**User** — `id`, `email`, `first_name`, `last_name`, `created_at`.

**Organization** — `id`, `name`, `country`, `currency`, `tax_id`, `created_at`.

**Membership** — the user's relationship to an org. `role` is `'Admin'` or `'User'`. `permissions` is `Record<string, boolean>` — an explicit `false` blocks a module, a missing key allows it.

```typescript
interface Membership {
  id: string
  organization: Organization
  role: 'Admin' | 'User'
  permissions: Record<string, boolean>
  joined_at: string
}
```

## Financial Document Types

All document types follow the same pattern: a header object and a `lines` array.

**Invoice** — `contact` (FK id), `invoice_number`, `reference`, `date`, `due_date`, `status` (`Draft | Awaiting Approval | Awaiting Payment | Paid | Overdue`), `currency`, `tax_type` (`Inclusive | Exclusive | No Tax`), `project`, totals, `lines: InvoiceLine[]`.

**Quote** — same as Invoice but `expiry_date` replaces `due_date`. Statuses: `Draft | Sent | Accepted | Declined | Invoiced`.

**Bill** — mirrors Invoice for supplier invoices. Statuses: `Draft | Awaiting Approval | Awaiting Payment | Paid`.

**PurchaseOrder** — uses `expiry_date`. Statuses: `Draft | Awaiting Approval | Approved | Billed | Declined`.

**InvoiceLine** (also QuoteLine, BillLine, PurchaseOrderLine) — `item` (optional FK), `description`, `quantity`, `unit_price`, `discount`, `account` (required FK), `tax_rate`, `total`.

## Ledger Types

**Account** — `id`, `code`, `name`, `class_type` (`Revenue | Expense | Asset | Liability | Equity`), `type` (granular: `Sales`, `Bank`, `Fixed Asset`, etc.), `default_tax_rate`, `is_system_account`, `is_active`.

**TaxRate** — `id`, `name`, `rate` (decimal percentage), `is_active`.

## People Types

**Contact** — `contact_type` (`Customer | Supplier | Both`), `default_sales_account`, `default_purchase_account`, `is_active`, plus name, email, phone, tax_number, billing_address.

**Item** — `is_sold`, `sales_unit_price`, `is_purchased`, `purchase_unit_cost`, `track_quantity`, `quantity_on_hand`, with separate accounts, tax rates, and descriptions for each side.

## Org Member and Invitation Types

**OrgMember** — same as Membership but `user` is the full User object. Used in the Users Settings tab.

**OrgInvitation** — `id`, `email`, `role`, `permissions`, `status` (`pending | accepted`), `expires_at`.

**InvitationInfo** — lightweight type returned by the public invite info endpoint: `organization_name`, `invited_by`, `email`, `role`, `status`, `is_expired`.

## Tab Types

```typescript
type TabId =
  | 'Home' | 'Invoices' | 'Quotes' | 'Bills' | 'PurchaseOrders'
  | 'Contacts' | 'Products' | 'Projects' | 'ChartOfAccounts'
  | 'TaxRates' | 'BankAccounts' | 'ProfitAndLoss' | 'BalanceSheet'
  | 'AccountTransactions' | 'CashFlowStatement' | 'UsersSettings'
  | 'CreateInvoice' | 'EditInvoice' | 'CreateQuote' | 'EditQuote'
  | 'CreateBill' | 'EditBill' | 'CreatePurchaseOrder' | 'EditPurchaseOrder'
  | 'CreateSpendMoney' | 'CreateReceiveMoney' | 'CreateTransferMoney'
  | 'CreateManualJournal' | 'UserProfile' | ...
```

`SettingsTabId` is a subset used to type the settings panel's active tab: `SalesSettings | PurchasesSettings | AccountingSettings | ContactsSettings | UsersSettings`.
