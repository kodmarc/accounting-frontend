# Home / Dashboard

## File

`src/pages/tabs/HomeTab.tsx`

## Overview

The Home tab is the default landing view after selecting an organisation. It loads a snapshot of the org's financial state by fetching accounts, invoices, bills, and items in parallel on mount.

## Metric Tiles

**Receivables** — total of all invoices in `Awaiting Payment` status. Broken into overdue (due date < today) as a separate callout.

**Payables** — total of all bills in `Awaiting Payment` status, with overdue broken out separately.

**Draft Invoices** — count and total value of invoices in Draft status.

**Draft Bills** — count and total value of bills in Draft status.

## Bank Accounts

A compact list of all accounts with `type = 'Bank'`, showing each account's current balance. Clicking an account navigates to the Bank Accounts tab.

## Outstanding Invoices

A list of the most recent invoices in `Awaiting Payment` status, showing contact, invoice number, amount, and due date. Overdue invoices are highlighted. Clicking a row navigates to the invoice edit view.

## Inventory Alerts

Tracked items (those with `track_quantity = true`) sorted by `quantity_on_hand` ascending — lowest stock first. Highlights items at zero or negative quantity. Clicking an item navigates to the product detail view.

## Data Loading

All data is fetched in a single `Promise.all` on mount and on `activeOrg` change. There is no auto-refresh; the user reloads the tab to see updated figures. The currency symbol is derived from `activeOrg.currency` (PKR → ₨, otherwise $).
