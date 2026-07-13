# Accounting Module

## What this module actually does
The Accounting module is the backend ledger foundation exposed through the frontend tabs for chart of accounts, tax rates, manual journals, bank transfers, and spend/receive money movements. It is the part of the app responsible for defining the account structure and entering accounting movements that later drive the financial reports.

## Real user actions
- Open the accounting workspace to create and maintain accounts.
- Import a default chart of accounts if the organization needs the standard starter ledger.
- Add or update tax rate definitions.
- Post a balanced manual journal entry with debit and credit rows.
- Record a spend or receive money transaction against a bank account.
- Transfer funds between two bank accounts.

## Inputs the user provides
- Account code, account name, class type, and account type
- Default tax association for each account
- Tax name and percentage value
- Journal narration, date, reference, and debit/credit rows
- Bank account source and destination fields for transfers
- Transaction lines for spend/receive money, including quantity, unit price, account, and tax rate

## Internal flow in the app
1. The frontend loads accounts and tax rates for the active organization.
2. The user creates or edits the chart definitions and tax rules.
3. When a journal or spend/receive transaction is posted, the app validates the entered values and sends the payload to the backend.
4. The posted entries become part of the organization’s transaction history and are available to the reports engine.

## Outputs produced by the module
- Master account definitions for invoicing, purchasing, journals, and banking
- Tax definitions reused across sales and purchase documents
- Manual journal entries that balance debits and credits
- Bank cash movement entries for spend/receive and transfer transactions
- Financial data that powers Profit & Loss, Balance Sheet, Cash Flow, and Account Transactions reports

## Subpages
- [Chart of Accounts](chart-of-accounts.md)
- [Tax Rates](tax-rates.md)
- [Manual Journals](manual-journals.md)
- [Spend / Receive](spend-receive.md)
- [Transfer Money](transfer-money.md)
