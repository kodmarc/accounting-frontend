# Frontend Architecture

## SPA Shell

`App.tsx` is the root component. It owns auth state (`isAuthenticated`, `user`, `organizations`), the active org (`activeOrg`), the active tab (`activeTab: TabId`), URL-to-state synchronisation, and the permission guard. All other pages receive props from App.tsx. There is no Context or Redux — state flows down as props.

## Tab System

Every "page" is a `TabId` string defined in `src/types/tabs.ts`. `App.tsx` renders the correct component based on `activeTab`:

```tsx
{activeTab === 'Invoices' && <InvoicesTab orgId={activeOrg.id} ... />}
{activeTab === 'ProfitAndLoss' && <ProfitAndLossTab ... />}
```

Tab navigation calls `setActiveTab(tab)` — there are no `<Link>` components for most transitions.

## URL and State Sync

URLs follow the pattern `/org/<org-name-slug>/<TabId>`.

On load or browser navigation: `App.tsx` parses `window.location.pathname`, finds the matching org by slug, checks permissions, and calls `setActiveTab()`. This makes direct URL access and browser back/forward work correctly.

On tab change: `setActiveTab()` calls `navigate(newUrl, { replace: true })` to keep the address bar in sync without adding a history entry.

Before setting a tab from a URL, the handler checks `TAB_TO_PERMISSION_KEY[tab]` against the user's permissions. If access is denied, it navigates to Home instead.

## Org Switching

The user's membership list is fetched once on login via `GET /api/auth/me/`. When the user switches orgs, `setActiveOrg(org)` updates state, triggers navigation to `/org/<new-slug>/Home`, and all tab components re-fetch their data since `orgId` changes as a prop.

## Data Flow

Each tab component fetches its own data with `orgId` as a useEffect dependency. The 30-second in-memory GET cache in `base.ts` prevents duplicate fetches within the same session. Any mutating request clears the cache.

## Key Effects in App.tsx

**Bootstrap** (mount) — calls `GET /api/auth/me/` to restore session from existing cookies.

**URL sync** (location change) — parses the URL and calls `setActiveTab`.

**Permission guard** (`activeTab` or `activeOrg` change) — redirects to Home if the current tab is blocked.

**Org change** (`activeOrg` change) — navigates to the new org's URL.
