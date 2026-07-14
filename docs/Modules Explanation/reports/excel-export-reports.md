# Export Reports to Excel

## Overview
Export to Excel lets a user download any of the four financial reports — Profit & Loss, Balance Sheet, Cash Flow, and Account Transactions — as a formatted `.xlsx` workbook, in addition to the existing PDF export. It is generated entirely in the browser, so nothing is sent to the server to produce the file.

## Actual working behavior
Every report page's Export control now offers three choices instead of one: PDF, CSV, and Excel. Choosing Excel builds an in-memory workbook from the same report data already loaded on screen — it does not re-fetch or recalculate anything — applies formatting (bold section headers, shaded subtotal rows, a highlighted final key figure such as Net Profit or Closing Cash Balance, and accounting-style number formatting with parentheses for negatives), and triggers a direct file download named for the report.

Each report type has its own layout:
- **Profit & Loss** — account rows indented under their sections, with subtotal and Net Profit rows highlighted, across one column per period.
- **Balance Sheet** — the same section/indent styling, with Total Assets, Total Liabilities, Total Equity, and Net Assets picked out as key rows, across one column per as-at date.
- **Account Transactions** — one block per account class, each with its own opening balance row, transaction rows, and a totals row with running balance.
- **Cash Flow** — Operating, Investing, and Financing sections in order, ending in Opening Cash, Net Cash Movement, and a highlighted Closing Cash Balance row.

## Main features
- One-click Excel download alongside the existing PDF and CSV options
- Formatting that mirrors the on-screen report (headers, subtotals, key totals, negative-number parentheses)
- A plain CSV option generated the same way, for tools that don't need formatting
- No server round-trip — the workbook is built from data already displayed

## Inputs
- The report parameters the user already chose on screen (date range/periods, cash vs. accrual basis, comparison periods)
- The Export → Excel action itself; no additional form fields are required

## Outputs
- A downloaded `.xlsx` file with a name based on the report (e.g. `Profit and Loss.xlsx`)
- A downloaded `.csv` file when CSV is chosen instead
- The existing PDF continues to be produced by the backend template as before

## Related modules
- [Reports](reports/README.md)
- [Profit & Loss](reports/profit-loss.md)
- [Balance Sheet](reports/balance-sheet.md)
- [Cash Flow](reports/cash-flow.md)
- [Account Transactions](reports/account-transactions.md)
