# Accounting — Spend / Receive Money

## What this page does
The Spend / Receive page handles direct bank or cash movement outside the normal invoice or bill workflow. It is used when the organization needs to record money going out or coming in through a selected bank account.

## Real user actions
- Choose whether the operation is a Spend or Receive event.
- Select a bank account to attach the movement to.
- Choose a contact, date, reference, currency, and tax type.
- Add one or more line items with account, description, quantity, and unit price.
- Save the movement as a real transaction entry.

## Inputs required from the user
- Transaction type: Spend or Receive
- Source bank account
- Contact reference if needed
- Date and reference
- One or more movement lines with description, quantity, unit price, account, and tax rate

## Internal app behavior
1. The page loads bank accounts, contacts, accounts, tax rates, and items.
2. The selected transaction type determines whether purchased or sold catalog items are available as defaults.
3. The line totals are computed, and the UI validates that quantity and account selection are valid.
4. The stored spend/receive record is posted to the accounting layer and becomes part of the movement history.

## Outputs
- A bank or cash movement transaction linked to a selected bank account
- Accounting impact that can be reported through the reports tabs
- Organization cash and expense movement visibility outside invoice/bill flows

## Related modules
- [Transfer Money](transfer-money.md)
- [Reports](../reports/README.md)
