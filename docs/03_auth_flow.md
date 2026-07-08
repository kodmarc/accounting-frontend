# Auth Flow

## Login

The user submits email and password. `apiService.login()` calls `POST /api/auth/login/`. The backend authenticates, generates a token pair, and sets `access_token` and `refresh_token` as httpOnly cookies. The response body returns user data and memberships — no tokens. `App.tsx` sets `isAuthenticated=true` and navigates to the first org's Home.

Cookies are httpOnly — JavaScript cannot read or modify them. The browser automatically includes them on every `fetch(..., { credentials: 'include' })` call.

## Signup

Same flow as login. `POST /api/auth/signup/` creates the user, generates tokens, sets cookies, and returns user data.

## Logout

`apiService.logout()` calls `POST /api/auth/logout/`. The backend blacklists the refresh token and deletes both cookies. `App.tsx` clears auth state and navigates to `/`.

## Session Persistence

On every app load, `App.tsx` calls `GET /api/auth/me/` in a mount effect. If the `access_token` cookie is still valid, the user is considered authenticated. If the call returns 401, the fetch wrapper attempts a silent token refresh automatically before the component sees the failure.

## Silent Token Refresh

When any API call returns 401, `base.ts` calls `tryRefreshToken()`. If no refresh is already in progress, it makes one request to `POST /api/auth/token/refresh/`. The backend rotates the token pair and sets new cookies. The singleton `_refreshPromise` ensures that if multiple requests all 401 simultaneously, only one refresh call is made — all others wait on the same promise. If the refresh itself returns 401 (token expired or blacklisted), `forceLogout()` redirects to `/`.

## Invitation Flow

An Admin invites a user via `POST /api/organizations/<id>/invite/`. The backend creates an `OrgInvitation` and emails a link containing a UUID token. The user opens the link — the invite page fetches `/api/auth/invite/<token>/info/` (no auth required) to show org name and inviter. Clicking Accept calls `POST /api/auth/invite/<token>/accept/`. If the email already has an account, the membership is created. If not, a new user and membership are created. Either way, auth cookies are set and the user lands in the org.

## Email Change

The user enters a new email address. `POST /api/auth/otp/send/` generates a 6-digit code and stores `new_email` on the `OTPToken`. The user enters the code. `POST /api/auth/otp/verify/` validates it and updates `user.email` to the stored `new_email`.

## Password Change

`POST /api/auth/change-password/` with `{ old_password, new_password }`. The backend verifies the old password before applying the change — a required safeguard in case a session cookie is somehow compromised.
