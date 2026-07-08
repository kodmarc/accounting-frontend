# Permissions

Frontend permission enforcement is a UX layer that mirrors backend ACL — it prevents rendering inaccessible tabs and blocks direct URL access. The backend is the authoritative enforcement point.

## TAB_TO_PERMISSION_KEY

Defined at the top of `App.tsx`. Maps every `TabId` to the ACL key it requires. Tabs not listed are accessible to all authenticated org members.

```typescript
const TAB_TO_PERMISSION_KEY: Partial<Record<TabId, string>> = {
  Invoices: 'invoices',
  Quotes: 'quotes',
  Bills: 'bills',
  PurchaseOrders: 'purchase_orders',
  Contacts: 'contacts',
  Products: 'products',
  Projects: 'projects',
  ChartOfAccounts: 'chart_of_accounts',
  TaxRates: 'tax_rates',
  BankAccounts: 'banking',
  ProfitAndLoss: 'profit_and_loss',
  BalanceSheet: 'balance_sheet',
  AccountTransactions: 'account_transactions',
  CashFlowStatement: 'cash_flow',
  UsersSettings: 'users',
  SalesSettings: 'sales_settings',
  // create/edit variants carry the same key as their parent list tab
}
```

## canAccess

```typescript
const canAccess = useCallback((tab: TabId): boolean => {
  if (!activeOrg) return false
  const memb = organizations.find(m => m.organization.id === activeOrg.id)
  if (!memb || memb.role !== 'User') return true   // Admins always pass
  const key = TAB_TO_PERMISSION_KEY[tab]
  if (!key) return true                              // no key = open tab
  return memb.permissions[key] !== false             // undefined = allowed
}, [activeOrg, organizations])
```

Admin members always return `true`. For User role, only an explicit `false` in `permissions` blocks access — a missing key is treated as allowed, preserving backward compatibility when new keys are added.

## Permission Guard Effect

```typescript
useEffect(() => {
  if (!isAuthenticated || !activeOrg) return
  if (!canAccess(activeTab)) setActiveTab('Home')
}, [activeTab, activeOrg, organizations, isAuthenticated, canAccess])
```

Runs whenever the active tab or org changes. If the current tab is blocked for the user — for example because an Admin changed their permissions while they were on that tab — they are silently redirected to Home.

## URL-Level Guard

In the URL-to-state handler, before calling `setActiveTab`:

```typescript
const permKey = TAB_TO_PERMISSION_KEY[tabPart as TabId]
const isAdmin = found.role !== 'User'
const allowed = isAdmin || !permKey || found.permissions[permKey] !== false
if (allowed) {
  setActiveTab(tabPart as TabId)
} else {
  navigate(`/org/${orgNameSlug}/Home`, { replace: true })
}
```

Prevents a restricted user from accessing a tab by typing the URL directly.

## Sidebar Rendering

The sidebar passes `canAccess` to the navigation item renderer and hides any item whose tab is blocked for the current user. Restricted tabs simply do not appear in the menu.

## Users Settings — Permission Tree

The `UsersSettings` tab renders a tree of toggle switches matching the keys in `TAB_TO_PERMISSION_KEY`. Admins can enable or disable each module for each User-role member. Changes are sent as a PUT to `/api/organizations/<id>/members/<member_id>/` with the updated `permissions` object.
