# Inventory

## Overview
The Inventory tab is the product and service catalog for the organization. In this project, an item can be sold, purchased, tracked for quantity, and linked to accounting accounts and tax rates.

## Actual working behavior
The item form supports:
- item code
- item name
- sales flag and sales unit price
- purchase flag and purchase unit cost
- sales account and purchase account
- sales tax rate and purchase tax rate
- item description for both sales and purchases
- quantity tracking flag

The app loads existing items, accounts, tax rates, invoices, and bills before the user works on the catalog.

## Main features
- Create a new product or service
- Edit an existing item
- Mark an item as sellable and/or purchasable
- Link the item to revenue and expense ledger accounts
- Enable quantity tracking
- Manually adjust stock quantity
- Review inventory movement history
- Bulk deactivate or reactivate catalog items

## Inputs
- Item code and name
- Sales unit price and purchase cost
- Sales and purchase account IDs
- Tax rate IDs
- Quantity tracking on/off
- Adjustment quantity and notes

## Outputs
- New or updated item stored in the backend
- Quantity-on-hand updated through manual adjustment
- Inventory movement log created for each stock change
- Item references available in sales and purchase document flows

## Actual workflow
1. The user opens the Products tab.
2. The app loads item master data and the organization’s accounts and tax setup.
3. The user creates or edits an item and saves the payload.
4. If `track_quantity` is enabled, the system can record quantity movements.
5. The user can open an item detail view and perform a manual stock adjustment.
6. After adjustment, the page refreshes the item quantity and movement history.

## Important implementation detail
Inventory movement is not just a simple number update. The app records a movement history with quantity and notes, which makes the stock tab more audit-friendly than a plain quantity field.

## Related modules
- [Sales](sales/README.md)
- [Purchases](purchases/README.md)
- [Accounting](accounting/README.md)
