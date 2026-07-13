# Sales — Quotes

## What this page does
The Quotes page is the pre-sale negotiation flow. The frontend allows the user to create a customer-facing quote, capture quote details, and later convert the accepted quote into a sales invoice.

## Real user actions
- Open the quote list and filter by status.
- Create a new quote with a quote number and expiry date.
- Add customer, items, description, quantity, unit price, account, and tax rate.
- Mark the quote as Draft, Sent, Accepted, Declined, or Invoiced.
- Convert an existing quote into a new invoice using the same sales line data.
- Send or download the quote as a PDF document.

## Inputs required from the user
- Customer contact
- Quote number and date
- Expiry date
- Optional reference or notes
- Quote lines with item or description, quantity, unit price, account, and tax rate
- Project association for project-specific quoting

## Internal app behavior
1. The page loads customers, sold items, accounts, tax rates, and sales settings.
2. Quote numbering and expiry are generated from the organization’s sales settings.
3. Selecting an item auto-fills the sales description, unit price, and sales account or tax mapping.
4. The UI calculates subtotal and tax before sending the quote payload.
5. If a quote is converted to an invoice, the system preloads the invoice editor with the quote’s data and generates a new invoice number.

## Outputs
- A stored quote record with status and value
- A customer-facing quotation document that can be emailed or exported
- A conversion path into a sales invoice once the quote is accepted
- Quote totals that show up in the sales overview and approval workflows

## Related modules
- [Invoices](invoices.md)
- [Projects](projects.md)
- [Sales Overview](overview.md)
