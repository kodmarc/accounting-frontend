# Contacts

## Overview
The Contacts tab is the customer and supplier master list for the organization. The actual implementation is more about business-party maintenance than a full CRM dashboard.

## Actual working behavior
The contact form supports these fields:
- business name
- contact person or tax number field
- email
- phone
- billing address
- contact role: Customer, Supplier, or Both

The app loads contacts, invoices, and bills for the active organization and lets the user filter or manage the contact list.

## Main features
- Add a new contact
- Edit an existing contact
- Select the contact type as customer, supplier, or both
- Deactivate or reactivate contacts
- Filter the current list by role or status

## Inputs
- Business name
- Email address
- Phone number
- Billing address
- Tax number / contact person value
- Contact role flags

## Outputs
- New contact saved to the backend
- Updated contact details reflected in the table
- Deactivated contacts hidden from active lists while historical records remain intact
- Contact records available to invoice and bill creation flows

## Actual workflow
1. The user opens the Contacts tab.
2. The screen loads contacts, invoices, and bills for the active organization.
3. The user adds or edits a contact using the modal form.
4. The payload is sent to the contact API and stored in the organization’s data layer.
5. The contact can later be used in invoice or bill workflows.

## Important implementation detail
A contact is not just a “person.” In this project, a contact is a business party record linked to accounting transactions. That is why the same contact can be used for both sales and procurement side documents.

## Related modules
- [Sales](sales/README.md)
- [Purchases](purchases/README.md)
- [Inventory](inventory.md)
