# Banking

## Files

`src/pages/tabs/BankAccountsTab.tsx`  
`src/pages/tabs/CreateSpendReceiveMoney.tsx`

## Bank Accounts Tab

Displays all `Account` records with `type = 'Bank'` by filtering the full accounts list client-side. For each account the current balance is shown (computed server-side in the Balance Sheet engine as invoice payment inflows minus bill payment outflows). Buttons navigate to `CreateSpendMoney` or `CreateReceiveMoney` with the bank account pre-selected.

## Spend / Receive Money Form

A single component handles both `type = 'Spend'` and `type = 'Receive'`. The mode is determined by which tab navigated to it (`CreateSpendMoney` or `CreateReceiveMoney`).

The form collects: bank account (searchable, filtered to Bank-type accounts), optional contact, date, reference, currency, tax type, and line items. Line accounts can be any expense or income account — not another bank account.

On submit, `apiService.createSpendReceive(orgId, payload)` is called. On success, the form navigates back to the `BankAccounts` tab.

## Transfer Money

`CreateTransferMoney` moves funds between two bank accounts. Internally creates a Spend transaction on the source account and a Receive transaction on the destination, linked by a shared reference.

## Impact on Reports

SpendReceiveMoney lines feed into the P&L engine through `_sr_lines()` — income and expense account allocations appear in the correct P&L bucket regardless of accounting basis. They appear in Account Transactions for the allocated accounts. They do not currently flow into the Balance Sheet bank balance (which is derived from Payment records only) — this gap is reflected in the cash flow report's `validation_diff`.
