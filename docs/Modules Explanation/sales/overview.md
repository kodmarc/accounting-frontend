# Sales — Overview

## What this page does
The Sales Overview screen is the summary dashboard for the sales side of the organization. It is not just a static view; it calculates business-facing KPI values from real invoice and quote records and presents them as a quick operational dashboard.

## Real user actions
- Review amounts in Awaiting Payment, Overdue Invoices, Draft Invoices, and Active Quotations.
- Open recent invoice and quote rows from the current organization.
- Move directly into the detailed invoices, quotes, or projects pages.
- Use the chart area to visually review recent invoice revenue values.

## Inputs used by the page
- Invoice list for the active organization
- Quote list for the active organization
- Organization currency for display values
- Document due dates and statuses from the backend

## Internal app behavior
1. The page fetches invoice and quote records from the backend.
2. It groups invoices by draft, unpaid, overdue, and paid states.
3. It sums the document totals into a dashboard summary card.
4. It shows recent records and uses a simple month-style bar chart to visualize sales activity.

## Outputs
- A real-time sales summary for billing and receivables monitoring
- A breakdown of current sales workload by status
- Quick navigation into the deeper sales document flows

## Related modules
- [Invoices](invoices.md)
- [Quotes](quotes.md)
- [Projects](projects.md)
