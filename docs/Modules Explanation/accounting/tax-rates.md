# Accounting — Tax Rates

## What this page does
The Tax Rates page is the organization’s tax configuration center. It defines the tax percentages that can be attached to invoices, bills, and account line entries.

## Real user actions
- Create a new tax rate with a name and percentage.
- Edit an existing tax rate.
- Activate or deactivate tax rates.
- Delete tax rates that are no longer in use.
- Use a selected tax rate when creating sales or purchase entry lines.

## Inputs required from the user
- Tax rate name
- Numeric rate between 0% and 100%
- Active/inactive state

## Internal app behavior
1. The page loads the organization’s available tax rate definitions.
2. The user adds or updates a tax rate through a modal.
3. The selected tax rate is then attached to account lines and document entries.
4. If a tax rate is deleted, the app maps dependent usage back to a fallback such as Tax Exempt where needed.

## Outputs
- A reusable list of tax definitions for line-level transactions
- Automatic tax calculation in invoices, bills, and money movement entries
- Consistent tax classification across the accounting engine and reports

## Related modules
- [Chart of Accounts](chart-of-accounts.md)
- [Invoices](../sales/invoices.md)
- [Bills](../purchases/bills.md)
