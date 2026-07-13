# Purchases — Bills

## What this page does
The Bills page is the supplier invoice workflow for the organization. It lets the user create a bill from a supplier, add expense-related lines, set the bill number and due date, and move the document through approval and payment handling.

## Real user actions
- Open the bills list and filter by status.
- Create a new bill record.
- Select a supplier and add purchased items or free-form expense lines.
- Set bill number, date, due date, reference, notes, and project.
- Bulk approve bill records or mark them as Paid.
- Download or preview the PDF when the bill is ready for vendor handling.

## Inputs required from the user
- Supplier contact
- Bill number and date
- Due date
- Optional reference and notes
- One or more purchase lines with quantity, unit price, description, account, and tax rate
- Project reference if the bill belongs to a project

## Internal app behavior
1. The page loads supplier contacts, purchased items, accounts, tax rates, and projects.
2. Selecting a purchased item auto-fills its purchase description, purchase unit cost, purchase account, and tax mapping.
3. The UI computes line totals, tax, and the final bill total before submit.
4. Approved and paid bills are stored in the organization’s bill ledger and become available in the purchases dashboard and reports.

## Outputs
- A stored supplier bill record with its supplier, line items, and status
- A payable trace that influences the purchase overview and accounting side
- Payment-state updates such as Draft, Awaiting Approval, Awaiting Payment, and Paid
- PDF output or document review for the supplier-facing bill

## Related modules
- [Purchase Orders](purchase-orders.md)
- [Purchases Overview](overview.md)
- [Accounting](../accounting/README.md)
