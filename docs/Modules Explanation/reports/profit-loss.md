# Reports — Profit & Loss

## What this page does
The Profit & Loss report shows whether the organization earned or lost money within a chosen reporting period. It is built from posted revenue, expense, and adjustment entries and then presented in a statement format.

## Real user actions
- Choose a period preset or custom range.
- Select accounting basis such as accrual or cash.
- Optionally compare with a previous period or previous year.
- Expand sections in the statement and click account rows for drilldown data.
- Export the report to PDF.

## Inputs used by the report
- Start and end date
- Basis selection
- Comparison mode
- Posted transaction data from invoices, bills, journals, and banking activity

## Internal app behavior
1. The frontend builds the report request from the selected dates and basis.
2. The report API returns a row tree with section headers, account rows, totals, and comparison values.
3. The UI expands or collapses sections and displays the statement in a readable table.
4. Clicking an account row can fetch the related transactions for a deeper drilldown view.

## Outputs
- Revenue and expense grouping by section
- Net profit or loss for the selected reporting period
- Drilldown support for account activity review
- PDF export for formal reporting or sharing

## Related modules
- [Balance Sheet](balance-sheet.md)
- [Cash Flow](cash-flow.md)
- [Account Transactions](account-transactions.md)
