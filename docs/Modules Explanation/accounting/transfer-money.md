# Accounting — Transfer Money

## What this page does
The Transfer Money page is the organization’s internal bank movement workflow. It is used when the user moves funds from one registered bank account to another within the same organization.

## Real user actions
- Choose the source bank account.
- Choose the destination bank account.
- Enter the transfer amount.
- Enter the transfer date and optional reference.
- Confirm the transfer and return to the bank accounts workspace.

## Inputs required from the user
- Source bank account
- Destination bank account
- Positive transfer amount
- Transfer date
- Optional reference or notes

## Internal app behavior
1. The page loads the bank accounts available to the organization.
2. The user must select two different bank accounts.
3. The app validates the amount and prevents a transfer if the source and destination are the same or if the amount is invalid.
4. The transfer is posted as a bank movement event and the user is redirected back to the Bank Accounts view.

## Outputs
- An internal bank transfer event stored in the organization’s banking workflow
- Updated bank movement visibility in the banking and reporting structure
- A simple internal cash reallocation path inside the accounting ledger

## Related modules
- [Spend / Receive](spend-receive.md)
- [Bank Accounts](../settings.md)
