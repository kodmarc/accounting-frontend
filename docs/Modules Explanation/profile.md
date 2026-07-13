# Profile

## Overview
The Profile tab is the current user account page. In the actual code, it is used for personal information updates, email change verification, password change, and reset-by-code actions.

## Actual working behavior
The profile page has four main areas:
- personal name update
- email change request and verification
- current-password-based password update
- OTP-based password reset flow

## Main features
- Update first name and last name
- Request a new email address change
- Confirm the email change using a 6-digit code sent to the new address
- Update password by entering the current password, new password, and confirmation
- Reset password via OTP if the user has access to the account email

## Inputs
- First name and last name
- New email address
- 6-digit email verification code
- Current password
- New password and confirm password
- 6-digit reset code for forgot-password recovery

## Outputs
- Updated user profile information
- Confirmation message for email-change and password-update actions
- Safe redirect or state reset after a successful OTP verification
- Updated auth context for the current user session

## Actual workflow
1. The user opens the profile tab.
2. The profile form loads the current user’s name and account details.
3. The user can update profile data or initiate an email or password change.
4. The backend returns a confirmation message and the UI resets the form state after success.
5. If OTP actions are involved, the user enters the 6-digit code received in email and completes the reset.

## Important implementation detail
This is not just a display-only page. The current code sends real API requests to update the authenticated user record and performs multiple verification steps before the change is accepted.

## Related modules
- [Authentication](authentication.md)
- [Organization](organization.md)
