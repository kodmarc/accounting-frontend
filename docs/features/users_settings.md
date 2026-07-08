# Users and Settings

## Users Settings

File: `src/pages/tabs/UsersSettingsTab.tsx`  
Admin only — non-Admin members cannot see this tab.

Fetches `apiService.getMembers(orgId)` and displays all org members with their role badge.

Clicking a member opens an edit panel. For Admin role, only the role selector is shown — Admins cannot demote themselves. For User role, the panel also shows a permission tree with a toggle for each module. Changing role or permissions sends a PUT to `/api/organizations/<id>/members/<member_id>/` with the updated `{ role, permissions }` object.

The "Invite" button opens a modal with email, role, and (if User role) the same permission tree. Calls `apiService.inviteMember(orgId, { email, role, permissions })`. The backend sends the invitation email.

Pending invitations are listed below the member table with their status and expiry. Admins can cancel a pending invitation. Accepted invitations show the accepted status.

Removing a member calls `DELETE /api/organizations/<id>/members/<member_id>/`.

## User Profile

File: `src/pages/tabs/UserProfileTab.tsx`  
Accessible to all users.

**Profile info** — first name and last name, editable via `PUT /api/auth/me/`.

**Change email** — OTP flow: enter new email, receive 6-digit code by email, enter code to verify. Backend updates `user.email` on successful verification.

**Change password** — requires current password and new password. Sent to `POST /api/auth/change-password/`.

**Delete account** — requires password confirmation. Irreversible. Calls `DELETE /api/auth/delete-account/` and clears the session.

## Sales Settings

File: `src/pages/tabs/SalesSettingsTab.tsx`  
Permission: `sales_settings`

Edits the per-org `SalesSetting` singleton: document number prefixes (`invoice_prefix`, `quote_prefix`, `bill_prefix`, `po_prefix`), starting numbers, standard payment terms text, and default PDF footer. Changes saved via `PUT /api/sales-settings/?org_id=`.

## Organisation Settings

Admin only. Edits `Organization.name`, `country`, `currency`, and `tax_id`. If the name changes, the URL slug updates and the browser navigates to the new org URL.
