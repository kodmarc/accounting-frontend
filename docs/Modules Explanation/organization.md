# Organization

## Overview
The organization module is the team and permission layer for a business workspace. It is used to manage who can access the organization, what role they have, and which modules they are allowed to use.

## Actual working behavior
There are two important parts in the current UI:
- Organization switcher in the top navbar allows the user to move across different companies
- Organization user management allows an admin to invite members and control permissions

The permission model in the code is module-based. The app defines a permission tree for sales, purchases, banking, accounting, reporting, contacts, projects, fixed assets, and payroll.

## Main features
- Switch between organizations from the same logged-in account
- Invite a team member to the organization
- Assign a role of Admin or User
- Grant or deny module-level access using permission toggles
- View current members and pending invitations
- Accept organization invitations through the invite page

## Inputs
- Organization ID from the active workspace
- Invitation email
- Selected role: Admin or User
- Permission flags for different business modules

## Outputs
- Organization membership created or updated
- Invitation record created for a new user
- Permission changes reflected in the dashboard navigation and access rules

## Actual workflow
1. An admin opens the organization settings area.
2. The admin sends an invitation by email and optionally assigns a role and permission tree.
3. The backend stores the invitation and membership relation.
4. The invited user follows the invite link and either joins the organization or logs in with the correct email.
5. The dashboard checks membership permissions before showing certain tabs.

## Important implementation detail
The app does not treat permission as a single global switch. In the current code, permissions are hierarchical and tied to named module keys such as `invoices`, `bills`, `chart_of_accounts`, and `reporting`.

## Related modules
- [Authentication](authentication.md)
- [Settings](settings.md)
- [Profile](profile.md)
