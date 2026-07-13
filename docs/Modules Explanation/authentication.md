# Authentication

## Overview
The authentication flow in this project is the entry screen for the whole accounting system. In the current code, the app uses email and password for sign in and sign up. The OTP process is not used for normal login; it is used for password recovery and for email-change verification.

## Actual working behavior
The real frontend flow is driven by the handlers in the main app shell:
- `signup()` sends first name, last name, email, and password to `/auth/signup/`
- `login()` sends email and password to `/auth/login/`
- `requestOtp()` sends the user email to `/auth/request-otp/`
- `verifyOtp()` sends email, 6-digit code, and new password to `/auth/verify-otp/`
- `logout()` sends a POST to `/auth/logout/`
- After login or signup, the frontend calls `getMe()` and then loads the user’s organization list

## Main features
- Email/password sign up
- Email/password sign in
- Forgot-password flow using a 6-digit code sent to email
- Password reset using the returned code
- Invite acceptance for organization membership
- Logout and redirect back to the public auth entry point

## Inputs
- Email address
- Password
- First name and last name during sign up
- 6-digit reset code for forgot password
- New password entered after code validation
- Invitation token from the invite link

## Outputs
- Logged-in user state in the React app
- Authenticated cookie-based session used by protected API requests
- Organization list loaded after successful login
- A user profile object returned from `/auth/me/`
- Success or error messaging shown in the UI

## Actual workflow
1. User reaches the auth page and selects either login, signup, or forgot password.
2. For login/signup, the UI collects email and password and sends that payload to the backend.
3. On success, the app stores a browser PasswordCredential if available and then loads the user profile and organization membership.
4. For forgot password, the app first sends the email to request an OTP-style code.
5. After the code is entered, the app sends the code and the new password to the verification endpoint.
6. If the code is valid, the user is redirected to the login screen and can sign in again with the new password.
7. Invitation links open the invite page, where the user either accepts the invitation or must sign in with the matching email before they can join the organization.

## Important note
The word “OTP” must not be treated as the normal login method in this project. In the actual frontend, OTP is used for password reset and email-change verification, not for the standard sign-in screen.

## Related modules
- [Organization](organization.md)
- [Profile](profile.md)
- [Settings](settings.md)
