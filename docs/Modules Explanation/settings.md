# Settings

## Overview
The Settings module is the organization’s central configuration hub. In the current implementation, it brings together organization profile data, sales numbering, purchases numbering, accounting settings, logo upload, and bank details.

## Actual working behavior
The settings page is split into sections:
- General Settings
- Sales Settings
- Purchases Settings
- Accounts Settings
- Users & Permissions (admin-only)

The code uses a combination of backend API calls and browser storage:
- organization name/currency/country/tax fields are updated through the organization API
- sales settings are saved through the sales settings API
- logo upload, address/contact extensions, bank details, and accounting calendar preferences are stored in `localStorage` for the active organization

## Main features
- Update organization profile information
- Upload and remove company logo
- Set sales numbering prefixes and payment terms
- Configure invoice and quote numbering sequence
- Set purchases numbering and supplier terms
- Save account year-end calendar values
- Store bank account details for future payment advice rendering
- Manage user invitation and module-level permissions for admins

## Inputs
- Organization name, country, currency, tax ID
- Organization email, phone, website, address
- Invoice prefix, next invoice number, quote prefix, next quote number
- Payment terms and footer text
- Purchase order prefix, bill prefix, next bill number
- Bank name, account name, account number, SWIFT code, notes
- Year-end month and day
- Admin permission changes for organization members

## Outputs
- Updated organization profile persisted through the API
- Saved sales and purchase preferences for later document generation
- Local organization personalization data for the browser session
- Permission changes that affect what tabs are visible to organization users

## Actual workflow
1. The user opens the Settings tab.
2. The page loads the organization’s current values and any saved extension data from `localStorage`.
3. The user edits values and saves the section.
4. The app writes some values to the backend and some to browser preferences for the active organization.
5. The admin can also open the users section to invite or edit member permissions.

## Important implementation detail
This module is not one single backend table. The current code intentionally mixes backend persistence with browser-side configuration for layout and UX-related settings, so the workflow is partially server-backed and partially client-side.

## Related modules
- [Sales](sales/README.md)
- [Purchases](purchases/README.md)
- [Reports](reports/README.md)
