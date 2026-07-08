# Manual Journals

## Files

`src/pages/tabs/ChartOfAccountsTab.tsx` — account list and journal access point  
`src/pages/tabs/CreateManualJournal.tsx` — journal entry form

## Journal Entry Form

A double-entry editor. The user adds debit and credit rows against chart-of-accounts entries.

The form collects: date (`XeroDatePicker`), reference, status (`Draft` or `Posted`), and a line table with columns for account (searchable), description, debit amount, and credit amount.

The running debit and credit totals are shown at the bottom. A "Totals must balance" warning appears client-side if they differ. The backend also validates balance and rejects unbalanced journals. At least two lines are required.

**Save as Draft** — creates the journal with `status='Draft'`. Does not affect P&L or account balances.

**Post** — creates with `status='Posted'`. The journal's lines are picked up by `ProfitLossEngine._mj_credit()` and `_mj_debit()` on accrual-basis reports.

## Journal List

Shown at the bottom of the Chart of Accounts tab. Can be filtered by status and date range. Admin-only delete performs a hard delete of the journal and all its lines.

## P&L Impact

Manual journals only appear in P&L on accrual basis — they are excluded from cash basis since they carry no cash movement. The engine computes net credit or net debit per account per period: a credit to a Sales account adds to trading income; a debit to an Expense account adds to operating expenses; a debit to a Depreciation account feeds the depreciation bucket. Contra entries reduce the net figure correctly.
