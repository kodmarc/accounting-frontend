# Bills and Purchase Orders

## Files

`src/pages/tabs/BillsTab.tsx`, `CreateBillTab.tsx`, `EditBill.tsx`  
`src/pages/tabs/PurchaseOrdersTab.tsx`, `CreatePurchaseOrderTab.tsx`, `EditPurchaseOrder.tsx`

## Bills

Bills are supplier invoices received by the organisation — the purchase-side mirror of the Invoice feature.

The key difference in the create form is that `bill_number` is always generated server-side. The frontend does not pre-fill or allow editing the bill number; the backend generates it from `SalesSetting.bill_prefix + next_bill_number` within the save transaction.

PDF download uses `POST /api/bills/download-pdf/` without a record ID — the caller sends all display data in the request body. This allows previewing the PDF before the bill is saved.

Statuses progress `Draft → Awaiting Approval → Awaiting Payment → Paid`. When status reaches Awaiting Payment, `InventoryService` increments `quantity_on_hand` for any tracked items on the bill's lines.

Record Payment works the same way as invoices — a modal with date and payment rows.

## Purchase Orders

Pre-purchase authorisation documents. `po_number` is auto-generated from `SalesSetting.po_prefix`.

Statuses: `Draft → Awaiting Approval → Approved → Billed / Declined`. There are no inventory movements on PO save — stock only moves when the resulting bill is created. A "Convert to Bill" action creates a new bill pre-populated from the PO's lines and changes the PO status to Billed.

PDF and email actions follow the same pattern as bills.

## Purchases Overview

`PurchasesOverviewTab` shows outstanding bill totals, overdue bills (due_date < today, status Awaiting Payment), recent POs, and a supplier spend chart for the last 6 months. Data comes from `getBills` and `getPurchaseOrders`, filtered and aggregated client-side.
