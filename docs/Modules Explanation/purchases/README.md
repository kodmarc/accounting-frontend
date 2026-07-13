# Purchases Module

## What this module actually does
The Purchases module is the supplier-side expense workflow in the frontend. Its main tabs are Purchases Overview, Bills, and Purchase Orders. The module pulls supplier contacts, purchased items, expense accounts, tax rates, and purchase settings so the organization can create and manage vendor-facing purchase documentation.

## Real user actions
- Review pending and overdue supplier bills from the purchases dashboard.
- Create or edit supplier bills.
- Create or edit purchase orders with supplier and item lines.
- Approve purchase orders or move them through statuses such as Draft, Awaiting Approval, Approved, and Billed.
- Mark bills as Paid after the vendor payment process.
- Attach purchase documents to a project or cost center.

## Inputs the user provides
- Supplier or contact selection
- Purchased item or service lines
- Quantity, unit price, discount, description, purchase account, and tax rate
- Bill or purchase order number, date, due date, reference, and notes
- Purchase settings such as bill prefix, purchase order prefix, and next sequential numbering

## Internal flow in the app
1. The frontend loads supplier contacts, purchased items, accounts, tax rates, and project references.
2. The user chooses a supplier and adds line items.
3. Selecting an item auto-populates its purchase description, purchase unit cost, purchase account, and tax mapping.
4. The UI calculates subtotal, tax, and total before saving the purchase document.
5. The resulting bill or purchase order becomes part of the organization’s purchase and reporting workflow.

## Outputs produced by the module
- A saved bill or purchase order record with supplier, lines, and totals
- Updated payable visibility in the home dashboard and purchases overview
- Project-linked purchasing activity for cost monitoring
- Purchase documents that later feed the accounting and reporting engine

## Subpages
- [Bills](bills.md)
- [Purchase Orders](purchase-orders.md)
- [Overview](overview.md)
