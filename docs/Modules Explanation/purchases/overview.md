# Purchases — Overview

## What this page does
The Purchases Overview page is the supplier-side dashboard for the organization. It calculates short-term spending signals from bill and purchase order records and presents them as a quick summary for payable monitoring.

## Real user actions
- Review amounts for Awaiting Payment, Overdue Bills, Draft Bills, and Active Purchase Orders.
- Open recent bills and purchase orders from the dashboard.
- Move directly into the detailed purchase workflow pages.
- Use the chart area to review payment and spend patterns.

## Inputs used by the page
- Bill records from the active organization
- Purchase order records from the active organization
- Organization currency for display values
- Due dates and status values from the backend

## Internal app behavior
1. The page loads all supplier bills and purchase orders for the active organization.
2. It groups the records by status such as unpaid, overdue, draft, or approved.
3. It sums those totals into visible KPI cards.
4. It shows recent bill and PO entries plus a simple bar chart of spend levels.

## Outputs
- A concise payable and purchasing snapshot for the organization
- Status-based spend monitoring for supplier commitments
- Quick navigation into the detailed bills and purchase order flows

## Related modules
- [Bills](bills.md)
- [Purchase Orders](purchase-orders.md)
- [Accounting](../accounting/README.md)
