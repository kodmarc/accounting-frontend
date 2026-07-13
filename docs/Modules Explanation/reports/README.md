# Reports Module

## What this module actually does
The Reports module is the reading and analysis surface for the organization’s accounting data. Instead of entering data, it reads the posted transaction history and turns it into financial statements and account-level detail views.

## Real user actions
- Open the All Reports screen and choose one of the financial reports.
- Set a reporting period or custom date range.
- Switch between accrual and cash basis when supported by the selected report.
- Compare against a previous period or previous year when the report allows it.
- Export a report to PDF if the report tab supports the export action.

## Inputs the report engine uses
- Active organization context
- Date range from the user selection
- Posted invoice, bill, journal, bank, and spend/receive data
- Account structure, tax information, and classification data from the organization

## Internal flow in the app
1. The report tab loads the required parameters from the user controls.
2. The frontend sends those parameters to the report API endpoint.
3. The backend calculates the financial view and returns rows, totals, sections, and drilldown data.
4. The frontend renders the statement or account history in a table-style layout.

## Outputs produced by the module
- Profit and Loss results for income and expense activity
- Balance Sheet snapshot of assets, liabilities, and equity
- Cash Flow statement using operating, investing, and financing sections
- Account Transactions details showing the movement trail for selected accounts

## Subpages
- [Profit & Loss](profit-loss.md)
- [Balance Sheet](balance-sheet.md)
- [Cash Flow](cash-flow.md)
- [Account Transactions](account-transactions.md)
