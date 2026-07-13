# Projects

## Files

`src/pages/tabs/ProjectsTab.tsx`

## Overview

Projects are simple grouping entities used to track revenue and spending across invoices and bills. They have a name (required, unique per org) and an optional code/SKU.

## Project List

Displays all projects in a table with live margin analysis columns: Sales Revenue (sum of non-Draft invoice totals assigned to the project), Spending (sum of non-Draft bill totals), and Net Margin (revenue − spending). Summary metric cards at the top aggregate these figures across all projects.

Projects can be searched by name or code. Clicking a row drills into the project detail view.

## Project Detail

Shows the project profile card (name, code) alongside a margin analysis summary box (revenue, spending, net margin). Below that is the full assigned transaction history — all non-Draft invoices and bills linked to this project — sorted by date descending. Clicking a transaction row navigates directly to the invoice or bill.

## Create / Edit

A modal form with name and code fields. On save, `apiService.createProject(orgId, data)` or `apiService.updateProject(id, data)` is called. Project names must be unique per org (enforced by the backend's `unique_together` constraint).

## Delete

Deleting a project hard-deletes the record. Any invoices or bills assigned to it become unassigned (`project = null`) — they are not deleted.

## Integration with Invoices and Bills

The project field appears as an optional dropdown on the Create/Edit Invoice, Quote, Bill, and Purchase Order forms. Filtering by project in those forms is not provided — the Projects tab is the canonical view for project-based reporting.

## API

`GET/POST /api/projects/?org_id=` — list and create. `PUT /api/projects/<id>/?org_id=` — update. `DELETE /api/projects/<id>/?org_id=` — soft delete (sets `is_active=False`). Permission key: `projects`.
