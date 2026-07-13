# Bank Transaction Import

## Files

`src/pages/tabs/BankTransactionImportPage.tsx`  
`src/services/api/bank-import.ts`  
`backend/ledger/views.py` — `bulk_import_transactions`  
`backend/ledger/urls.py` — `bulk-import-transactions/`

## Entry Point

Inside Bank Accounts → viewing a specific bank account, an **Upload Transactions** dropdown button offers two options: Upload CSV and Upload Excel. Selecting a file triggers `onStartImport` on the parent `App`, which stores the file, file type, bank account ID, and name in state and switches the active tab to `ImportBankTransactions`. The import page is a full tab (URL: `/org/<OrgName>/ImportBankTransactions`), not an overlay.

## Step 1 — Configure

The raw file is parsed client-side:

- **CSV**: parsed with `papaparse` (`skipEmptyLines: true`).
- **Excel**: parsed with `SheetJS/xlsx` — first sheet, all values as strings.

Both produce a `string[][]` (raw rows) which is stored in state. The page then attempts to auto-detect the best `skipCount` (rows before the header) by scanning the first 10 rows for recognisable column keywords.

### Skip Rows

A numeric +/− control sets how many rows to skip at the top. The live preview table renders skipped rows in grey with a "SKIP" badge, the selected header row in green with a "HEADER" badge, and subsequent rows as data.

### Column Mapping

Once the header row is identified, the user maps columns via dropdowns:

- **Date column** — auto-detected by keyword match (`date`, `trans date`, `value date`, etc.)
- **Description column** — auto-detected (`description`, `narration`, `particulars`, etc.)
- **Amount mode** — Single Amount column (positive = credit, negative = debit) or separate Debit/Credit columns.

Auto-detection runs on mount and on any `skipCount` change. If detection fails, the user selects columns manually.

Clicking **Continue to Review** applies the column map and parses all data rows into `TxnRow` objects. Rows with no amount or unparseable date are silently dropped.

## Step 2 — Review

A table shows all parsed transactions with columns: ☐ | Date | Description | Debit (Out) | Credit (In) | Chart of Account.

- Amounts are assigned to the Debit or Credit column based on the detected/computed type (`Spend` = Debit, `Receive` = Credit).
- Clicking the empty cell in the opposing column switches the row's type.
- All rows start checked. The header checkbox toggles all.

### Account Assignment

Each row has an account selector (portal-based dropdown with search) to assign a chart-of-accounts entry. A bulk-apply bar at the top lets a single account be applied to all currently checked rows at once.

### Import Button

The **Import** button activates as soon as at least one checked row has an account assigned (`assignedCount > 0`). The button label shows the count of rows that will actually be imported. Rows that are checked but have no account show a "will be skipped" notice.

## Import

`handleImport` filters to rows that are both checked AND have an `accountId`, then calls `bankImportApi.bulkImportTransactions(orgId, bankAccountId, currency, transactions)`.

The backend (`bulk_import_transactions` view) creates one `SpendReceiveMoney` record per transaction with `status='Posted'` and one `SpendReceiveMoneyLine` linking to the selected account. These transactions then appear in the bank account's transaction list and flow into the P&L through the normal `_sr_lines()` engine.

On success, the page shows a success screen with the count of created transactions and a **Back to Bank Accounts** button.

## Amount Parsing

`parseAmt` handles: plain numbers, numbers with thousand separators (commas/spaces), parenthesised negatives `(1,234.56)`, and strings with currency symbols. `parseDate` handles ISO (`YYYY-MM-DD`), `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, and anything parseable by `new Date()`.
