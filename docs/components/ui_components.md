# UI Components

Reusable components shared across multiple tabs, located in `frontend/src/components/`.

## SearchableInput

A dropdown input with type-ahead filtering. Used wherever a user must select from a list — contacts, accounts, items, tax rates.

Props: `options` (array of `{ id, label }`), `value` (selected id), `onChange`, `placeholder`, `disabled`. Renders a text input that filters the options list as the user types. Clearing the text resets the selection.

## XeroDatePicker

A styled date input that mimics the Xero date picker — click to show a calendar, type directly, or use keyboard navigation. Props: `value` (YYYY-MM-DD), `onChange`, `label`, `disabled`. Normalises the value to `YYYY-MM-DD` regardless of how the browser renders the native date input.

## PopupProvider / usePopup

A context-based modal system. `PopupProvider` wraps the app root. Components call `openPopup(content)` to display any React node in a centred overlay. `closePopup` dismisses it, and is also called when the user clicks the backdrop.

```tsx
const { openPopup, closePopup } = usePopup()
openPopup(<ConfirmDeleteDialog onConfirm={handleDelete} onCancel={closePopup} />)
```

## LoadingSpinner

Animated spinner displayed while API calls are in flight. `size` prop accepts `'sm'`, `'md'`, or `'lg'`.

## StatusBadge

Coloured pill badge for document statuses. Accepts a `status` string and maps it to a colour: Draft → grey, Awaiting Approval → yellow, Awaiting Payment → blue, Paid → green, Overdue → red, Declined → red.

## DocumentLineTable

Shared line-item table used by Invoice, Quote, Bill, and PO create/edit forms. Handles adding and removing lines, auto-filling fields from a selected item (description, unit price, account, tax rate), tax type switching (Inclusive / Exclusive / No Tax), and computing per-line totals plus the subtotal / tax / grand total footer.

Props: `lines`, `onLinesChange`, `accounts`, `taxRates`, `items`, `taxType`.

## ConfirmDialog

Generic confirmation modal used before deletes and destructive actions.

```tsx
<ConfirmDialog
  message="Delete this invoice?"
  onConfirm={handleDelete}
  onCancel={closePopup}
/>
```
