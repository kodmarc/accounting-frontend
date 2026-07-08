# Invoices and Quotes

## Files

`src/pages/tabs/InvoicesTab.tsx` — list view  
`src/pages/tabs/CreateInvoiceTab.tsx` and `EditInvoice.tsx` — create and edit forms  
`src/pages/tabs/QuotesTab.tsx`, `CreateQuoteTab.tsx`, `EditQuote.tsx` — quote equivalents

## Invoice List

Fetches `apiService.getInvoices(orgId)` on mount and whenever `orgId` changes. The list can be filtered by status (All, Draft, Awaiting Payment, Paid, Overdue) and searched by invoice number, contact name, or reference. Clicking a row navigates to `EditInvoice` with the invoice ID.

## Create / Edit Form

The form has three sections: a document header, a line-item table, and a totals footer.

The header collects contact (searchable dropdown), date, due date, invoice number (pre-filled from `SalesSetting.next_invoice_number`, editable), reference, currency, tax type, and optional project.

Line items use `DocumentLineTable`. Selecting an item auto-fills the description, unit price, account, and tax rate. All line totals and the grand total are computed client-side as the user types.

Actions: Save as Draft, Approve (moves to Awaiting Approval), and Save & Send.

## Invoice Number Auto-Increment

On the create form, `SalesSetting.next_invoice_number` is pre-fetched and used to populate the number field. On save, the backend atomically increments the counter in the same `transaction.atomic()` block, preventing duplicate numbers under concurrent saves.

## Record Payment

Opens a modal with a date field and one or more payment rows (bank account + amount). Calls `apiService.recordPayment(orgId, invoiceId, data)`. On success the invoice status changes to Paid.

## PDF Download

Calls `apiService.downloadInvoicePdf(orgId, invoiceId, options)` using `fetchWithAuth` to receive the raw binary. The response is converted to a blob and downloaded via a temporary `<a>` element with a `download` attribute.

## Send Email

Opens a modal to enter recipient, subject, and message body. Calls `apiService.sendInvoiceEmail(orgId, invoiceId, payload)`. The backend generates the PDF and emails it in a background daemon thread, so the response is immediate.

## Quotes

Identical to Invoices with two differences: `expiry_date` replaces `due_date`, and the status flow is `Draft → Sent → Accepted / Declined / Invoiced`. There are no record-payment or inventory movements on quotes. A "Convert to Invoice" action creates a new invoice pre-populated from the quote's lines.
