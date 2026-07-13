# Sales Module

## What this module actually does
The Sales module is the customer-side revenue workflow in the frontend. Its real tabs are Sales Overview, Invoices, Quotes, and Projects. The module pulls customer contacts, sold catalog items, revenue accounts, tax rates, and sales settings from the organization and then creates or manages sales documents that later feed the dashboard and financial reports.

## Real user actions
- Open the sales dashboard to review draft invoices, unpaid invoices, overdue receivables, and active quotes.
- Create or edit invoices from the invoice list and create-invoice workflow.
- Create or edit quotes with a quote number, expiry date, and line items.
- Convert a quote into a new invoice from the same quoting flow.
- Assign a project to a sales document and review project-based revenue/spending.
- Download or email a PDF document when the document is ready for customer-facing handling.

## Inputs the user provides
- Customer or contact selection
- Sales item or service selection
- Quantity, unit price, discount, description, sales account, and tax rate for each line
- Invoice or quote number, date, due date or expiry date, reference, notes, and project reference
- Sales settings such as invoice prefix, quote prefix, next document number, and payment terms

## Internal flow in the app
1. The frontend fetches customers, sold items, accounts, tax rates, sales settings, and projects.
2. The user chooses a customer and adds line items.
3. Selecting an item auto-populates its description, unit price, revenue account, and tax rate.
4. The UI calculates subtotal, tax total, and final total before submitting.
5. The backend stores the invoice or quote and updates the organization’s next sequential number from the sales settings.

## Outputs produced by the module
- A saved invoice or quote record with status, totals, and line items
- Updated receivable visibility in the Home dashboard and Sales Overview
- Project-linked revenue records for later project review
- A customer-ready PDF or email handoff for quotes and invoices

## Subpages
- [Invoices](invoices.md)
- [Quotes](quotes.md)
- [Projects](projects.md)
- [Overview](overview.md)
