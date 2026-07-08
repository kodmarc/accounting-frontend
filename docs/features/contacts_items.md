# Contacts and Items

## Contacts

File: `src/pages/tabs/ContactsTab.tsx`

The list shows all active contacts with columns for Name, Type, Email, Phone, and Tax Number. It can be filtered by `contact_type` (All, Customer, Supplier, Both) and searched by name, email, or phone.

Clicking a contact opens an inline edit panel on the right. Fields: name, type, email, phone, tax number, billing address, default sales account (searchable, filtered to Revenue accounts), and default purchase account (filtered to Expense accounts). These default accounts are pre-filled in invoice and bill line rows when this contact is selected.

Deactivating a contact (Admin only) hides it from the list. Existing invoices and bills that reference it are unaffected. The contact can be reactivated later.

## Items

File: `src/pages/tabs/ProductsTab.tsx`

The list shows all active items with Code, Name, sold/purchased flags, Sales Price, Purchase Cost, and Qty on Hand (when tracked). A toggle shows deactivated items.

Clicking an item opens a panel with three tabs:

**Sell** — `is_sold` toggle, sales unit price, sales account, sales tax rate, sales description.

**Buy** — `is_purchased` toggle, purchase unit cost, purchase account, purchase tax rate, purchase description.

**Inventory** — only shown when `track_quantity = true`. Displays current quantity on hand, an adjust quantity form (sends `POST /api/items/<id>/adjust-quantity/`), and the full inventory movement history.

## Inventory Tracking

When `track_quantity = true`, `quantity_on_hand` is maintained automatically by `InventoryService` on the backend: invoices deduct stock when they reach Paid status, bills add stock at the same point. Manual adjustments create `InventoryMovement` records with type `manual_add` or `manual_remove`.

## Item Lookup in Document Lines

When a user selects an item from the `SearchableInput` in a line row, the form auto-fills description, unit price, account, and tax rate from the item's sell or buy details (depending on whether it is an invoice/quote or bill/PO). All auto-filled fields remain editable.
