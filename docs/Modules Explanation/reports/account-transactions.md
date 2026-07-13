# Reports — Account Transactions

## What this page does
The Account Transactions report shows transaction-by-transaction movement for one or more selected accounts. It is the detailed ledger drilldown view used when the user needs to inspect exactly what happened inside an account over a period.

## Real user actions
- Select accounts from a multi-select dropdown.
- Choose a preset date range or custom period.
- View the report for the selected accounts.
- Expand each account section and inspect the movement rows.
- Export the result to PDF when needed.

## Inputs used by the report
- One or more account IDs
- A start and end date range
- Transaction records coming from invoices, bills, journals, and money movement entries

## Internal app behavior
1. The page loads the organization’s accounts and the selected account set.
2. The report builder requests transaction history from the account transactions endpoint.
3. The response returns grouped sections, opening balances, transaction rows, totals, and closing balances.
4. The UI renders each section with running balance columns and source tags.

## Outputs
- A chronological account activity trail
- Debit, credit, gross, tax, and running balance values
- Detailed source labels for receipts, invoices, bills, and payment events
- A drilldown-level view into account movement that supports audit and reconciliation work

## Related modules
- [Chart of Accounts](../accounting/chart-of-accounts.md)
- [Manual Journals](../accounting/manual-journals.md)
- [Profit & Loss](profit-loss.md)
