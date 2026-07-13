# Home

## Overview
The Home page is the organization dashboard. In the current code, it is not a full accounting engine by itself. Instead, it is a summary screen that gathers invoice, bill, account, and inventory data and converts it into quick business indicators.

## Actual working behavior
The actual Home tab loads these data sources from the backend:
- bank accounts
- invoices
- bills
- items

After loading the data, it calculates:
- receivables from invoices in `Awaiting Payment`
- payables from bills in `Awaiting Payment`
- draft invoice and draft bill totals
- overdue values based on the due date
- tracked inventory items with quantity-on-hand values

## Main features
- Organization-level dashboard summary
- Quick access to Bank Accounts and New Invoice
- Receivables and payables overview
- Draft and overdue counts
- Inventory watchlist for tracked items

## Inputs
- Active organization selected from the navbar
- Invoice and bill records from the backend
- Account list for banking-related display
- Item list to identify tracked products/services
- Currency and organization metadata from the active organization

## Outputs
- Summary cards such as awaiting receivables and awaiting payables
- Count of draft records and overdue records
- Inventory watchlist results
- Shortcut navigation to banking and invoice creation

## Actual workflow
1. The user selects an organization.
2. The Home tab calls the invoice, bill, account, and item APIs.
3. The frontend filters records by status and date.
4. It calculates totals and displays them as cards.
5. The user can move into a deeper workflow such as bank accounts, invoices, reports, or stock management.

## Important implementation detail
The “Cash Position” card currently shows `0` in the code because the dashboard does not yet fully compute real bank balances from the backend. So the Home screen is functioning as a financial summary layer rather than a complete reconciliation engine.

## Related modules
- [Sales](sales/README.md)
- [Purchases](purchases/README.md)
- [Inventory](inventory.md)
- [Reports](reports/README.md)
