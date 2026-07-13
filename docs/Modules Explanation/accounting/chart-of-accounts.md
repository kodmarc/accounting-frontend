# Accounting — Chart of Accounts

## What this page does
The Chart of Accounts page is the master ledger structure for the organization. It is the place where the user defines the accounts used by invoices, bills, journals, bank activities, and reporting.

## Real user actions
- View all accounts in the organization’s chart.
- Add a new account with code, name, class type, and account type.
- Edit or deactivate an existing account.
- Import the default Xero-style starter chart of accounts.
- Filter accounts by class and search by code or name.

## Inputs required from the user
- Account code
- Account name
- Class type such as Asset, Liability, Equity, Revenue, or Expense
- Account type such as Current Asset, Bank, Direct Costs, or similar category
- Optional default tax rate and description

## Internal app behavior
1. The page loads the organization’s accounts and tax rates.
2. The user saves an account through the create or edit modal.
3. The account becomes available in document-line selectors and in the accounting engine.
4. Deactivating an account hides it from dropdowns while preserving historical data.

## Outputs
- A reusable account list used throughout the app
- Ledger mapping for invoices, bills, journals, bank activity, and reports
- A foundation for transaction posting and reporting accuracy

## Related modules
- [Tax Rates](tax-rates.md)
- [Manual Journals](manual-journals.md)
- [Reports](../reports/README.md)
