# Reports — Balance Sheet

## What this page does
The Balance Sheet report shows the organization’s financial position as of a selected date. It is a snapshot statement built from the organization’s asset, liability, and equity account balances.

## Real user actions
- Choose the snapshot date.
- Select the basis and compare mode.
- Expand the section structure to examine assets, liabilities, and equity.
- Click account rows with drilldown support to inspect specific balance movement logic.
- Export the report to PDF.

## Inputs used by the report
- Snapshot date such as today or a historical date
- Accounting basis selection
- Comparison settings when enabled
- Account balances derived from the posted ledger data

## Internal app behavior
1. The frontend sends the as-at date and basis options to the balance sheet endpoint.
2. The endpoint returns a row structure that is rendered in grouped sections.
3. The UI can collapse sections and show account-level drilldown data where supported.
4. The report can link to the P&L report for current-year earnings review.

## Outputs
- A point-in-time statement of assets, liabilities, and equity
- Net assets and related totals
- Historical comparison values for management review
- Drilldown-ready detail when the user clicks into an account row

## Related modules
- [Profit & Loss](profit-loss.md)
- [Cash Flow](cash-flow.md)
- [Account Transactions](account-transactions.md)
