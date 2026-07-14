# Bank Transaction Import (CSV/Excel)

## Overview
This feature lets a user upload a bank statement file — CSV or Excel — against one of their bank accounts and turn its rows into Spend/Receive transactions in bulk, instead of entering each transaction by hand.

## Actual working behavior
From a bank account's page, the user uploads a CSV or Excel file. The file is parsed entirely in the browser: CSV files are read directly, and Excel files have their first sheet converted to rows. The importer then tries to auto-detect which column is the date, which is the description, and whether amounts are in a single column (positive/negative) or split across separate Debit and Credit columns, by matching common bank-statement header names (e.g. "Value Date", "Narration", "Debit", "Money In"). If auto-detection succeeds, the user goes straight to a review table; if it can't confidently detect the columns, the user is shown a mapping screen to pick the right column for each field manually.

In the review step, every detected row becomes a transaction pre-classified as Spend or Receive based on its sign (or which of Debit/Credit was filled in). The user then assigns a Chart of Accounts account to each row — either one at a time, or by selecting several rows and applying one account to all of them at once ("Apply account to selected"). Bank accounts themselves are excluded from this account picker, since a transaction needs an expense/income/asset/liability account, not another bank account. Rows can also be unchecked to exclude them from the import, and the Spend/Receive classification can be changed per row before submitting.

Once every included row has an account assigned, importing sends the whole batch to the server in one request, which creates a posted Spend/Receive Money transaction (with a single line) for each row against the chosen bank account.

## Main features
- Upload bank statements as CSV or Excel (.xlsx/.xls)
- Automatic detection of date, description, and amount columns from common header names
- Manual column mapping screen as a fallback when auto-detection fails
- Automatic Spend/Receive classification from the amount sign or Debit/Credit column
- Per-row or bulk account assignment against the organization's Chart of Accounts
- Row-level include/exclude and type override before committing
- A single bulk import call that posts all selected transactions at once

## Inputs
- The bank statement file (CSV or Excel) and the bank account it belongs to
- Column mapping, only if auto-detection doesn't find a confident match
- A Chart of Accounts account for each transaction row to be imported (individually or via bulk apply)
- The Spend/Receive type per row, if it needs correcting

## Outputs
- A posted Spend/Receive Money transaction for every imported row, appearing in that bank account's transaction list
- A count of how many transactions were successfully created

## Important implementation detail
Column and Spend/Receive detection is automatic, but account assignment is not: the app does not guess which Chart of Accounts account a transaction belongs to based on its description or history. The user (or the bulk-apply action) must assign an account to each transaction before it can be imported.

## Related modules
- [Chart of Accounts](accounting/chart-of-accounts.md)
- [Spend & Receive Money](accounting/spend-receive.md)
- [Reports — Account Transactions](reports/account-transactions.md)
