# Purchases — Purchase Orders

## What this page does
The Purchase Orders page is the procurement approval workflow before a supplier bill is issued. It lets the user create a planned buy request, track its approval state, and later convert or link it to actual bill operations.

## Real user actions
- Open the purchase orders list and filter by approval stage.
- Create a new purchase order.
- Select a supplier, add purchase lines, and set a purchase order number and expiry date.
- Change the PO status through Draft, Awaiting Approval, Approved, Billed, and Declined.
- Bulk approve or delete draft POs.
- Convert a purchase order into a bill if the project supports that documented workflow.

## Inputs required from the user
- Supplier contact
- Purchase order number and date
- Expiry date
- Item or service lines with quantity, unit price, description, account, and tax rate
- Optional notes and project reference

## Internal app behavior
1. The page loads purchase orders and their supplier-related data.
2. It automatically generates the next PO number from the organization settings.
3. The line items follow the same purchase-side structure as bills, using purchase accounts and tax rates.
4. Bulk actions update the PO status directly on the backend and refresh the list.

## Outputs
- A purchase order record that shows pre-approved or approved purchase intent
- Supplier ordering activity that the organization can review before full bill creation
- Purchase spend visibility in the purchase overview dashboard
- A clear link between purchase planning and later vendor bill recording

## Related modules
- [Bills](bills.md)
- [Purchases Overview](overview.md)
- [Inventory](../inventory.md)
