# Reports

## Files

`src/pages/tabs/AllReportsTab.tsx` — navigation hub  
`src/pages/tabs/ProfitAndLossTab.tsx`  
`src/pages/tabs/BalanceSheetTab.tsx`  
`src/pages/tabs/AccountTransactionsTab.tsx`  
`src/pages/tabs/CashFlowStatementTab.tsx`

## Profit and Loss

Controls: Start Date, End Date, Basis (Accrual / Cash), Compare (None / Previous Period / Previous Year), and a Value / % of Income pill toggle.

Clicking "Run Report" calls `apiService.getProfitLoss(orgId, params)` and stores the result. The response `rows` array is rendered recursively: `section_header` rows are collapsible sections with child account rows; `formula` rows are bold subtotals (Gross Profit, Operating Profit, Net Profit); `account` rows are indented and clickable for drilldown.

When multiple periods are active via Compare, each gets its own column.

The **% of Income toggle** switches all values to show as a percentage of Trading Income for that period. The denominator is `trading_income_total[periodLabel]` returned separately from the API. The toggle resets to Value mode each time a new report is run.

PDF download calls `apiService.downloadProfitLossPdf(orgId, params)`, converts the response to a blob, and triggers a browser download.

## Balance Sheet

Controls: As At date, Basis, Compare, and Fiscal Year Start Month.

Renders the full hierarchy — Current Assets (bank, AR, inventory, other current asset accounts), Fixed Assets (net of depreciation contra), Current Liabilities (AP, current liability accounts), Non-Current Liabilities, and Equity (Retained Earnings + Current Year Earnings). Depreciation contra rows are displayed as negative.

Drilldown on AR shows unpaid invoices. Drilldown on AP shows unpaid bills. Drilldown on Current Year Earnings links to the P&L for the current fiscal year.

## Account Transactions

The user selects an account from a dropdown and a date range. The report shows a running-balance ledger with columns for Date, Description, Debit, Credit, and Balance. Sources include invoice lines, bill lines, manual journal lines, and spend/receive lines — all merged and sorted by date.

## Cash Flow

Date range input. Displays the indirect-method statement in three sections — Operating, Investing, Financing — with each section broken down into individual line items. The footer shows Opening Cash, Net Cash Movement, Closing Cash, and `validation_diff`. A non-zero diff is highlighted to indicate unmodelled cash movements.

## All Reports

A grid of cards linking to each report tab. No data is fetched on this screen.
