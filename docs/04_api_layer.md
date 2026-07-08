# API Layer

## base.ts

`frontend/src/services/api/base.ts` is the single HTTP primitive. All API calls go through `request()`.

**GET cache** — responses are cached in memory by URL for 30 seconds (`CACHE_TTL = 30_000`). Any mutating request (POST, PUT, DELETE) calls `cache.clear()`. This prevents redundant fetches when multiple components mount on the same tab without stale-serving data after writes.

**401 intercept** — when any request returns 401, `tryRefreshToken()` is called. A singleton `_refreshPromise` ensures that if multiple concurrent requests all 401, only one refresh call is made and all others wait on it. If the refresh succeeds, the original request is retried once. If the refresh itself returns 401, `forceLogout()` redirects to `/`.

**`fetchWithAuth(url, options)`** — an alternative to `request()` for calls that need the raw `Response` object (e.g. PDF download via `.blob()`). Applies the same 401 → refresh → retry pattern.

## Domain Modules

Each domain has its own module under `services/api/`:

`auth.ts` — login, signup, logout, getMe, updateProfile, changePassword, deleteAccount, sendOtp, verifyOtp, getInviteInfo, acceptInvite

`organizations.ts` — org CRUD, member management, invitations

`accounts.ts` — chart of accounts CRUD + activate

`tax-rates.ts` — tax rate CRUD

`contacts.ts` — contact CRUD + activate

`items.ts` — item CRUD, adjustQuantity, getInventoryHistory

`invoices.ts` — CRUD, recordPayment, downloadPdf, sendEmail

`quotes.ts` — same pattern

`bills.ts` — same pattern

`purchase-orders.ts` — same pattern

`projects.ts` — CRUD

`payments.ts` — getPayments

`manual-journals.ts` — list, create, delete

`spend-receive.ts` — list, create, delete

`reports.ts` — getProfitLoss, getBalanceSheet, getAccountTransactions, getCashFlow

`sales-settings.ts` — get, update

`metadata.ts` — getCountries, getCurrencies

## api.ts

`frontend/src/services/api.ts` re-exports all domain functions as a single `apiService` object. Components import from this barrel:

```typescript
import { apiService } from '@/services/api'
apiService.createInvoice(orgId, payload)
apiService.getProfitLoss(orgId, params)
```

## Types

All TypeScript interfaces for API shapes are in `services/api/types.ts`. Key ones: `User`, `Organization`, `Membership`, `Invoice`, `Bill`, `Account`, `Contact`, `Item`, `TaxRate`, `OrgMember`, `OrgInvitation`. Components import from there — never inline.
