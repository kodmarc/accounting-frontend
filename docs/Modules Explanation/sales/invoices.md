# Sales — Invoices

## What this page does
The Invoices page is the actual sales billing workflow in the app. It lets the user create a customer invoice, fill line items, assign the right sales account and tax rate, and later move the document through draft, awaiting-payment, and paid states.

## Real user actions
- Open the invoice list and filter by status.
- Create a new invoice from the invoice form.
- Select a customer and add sold items or free-form description lines.
- Generate the invoice number automatically from the organization’s sales settings.
- Set the due date according to the configured standard payment terms.
- Record payment later through the invoice flow and update status to Paid.
- Download the invoice PDF or send it through the email workflow.

## Inputs required from the user
- Customer contact
- Invoice number and date
- Due date
- Optional reference and notes
- One or more sales lines with quantity, unit price, description, account, and tax rate
- Project association if the invoice belongs to a specific project

## Internal app behavior
1. The page loads customers, sold items, accounts, tax rates, and sales settings.
2. If an item is chosen from inventory, its unit price and sales account/tax defaults are copied into the row.
3. The UI calculates line subtotal, tax total, and grand total before submit.
4. The invoice payload is sent to the backend along with the organization context.
5. The current document number and due date are pushed forward by the organization’s working settings.

## Outputs
- A created invoice record with customer, lines, and totals
- Status transitions such as Draft, Awaiting Payment, and Paid
- Receivable totals that surface in the dashboard, overview, and reporting layers
- PDF/email output for the invoice document

## Related modules
- [Quotes](quotes.md)
- [Projects](projects.md)
- [Sales Overview](overview.md)
