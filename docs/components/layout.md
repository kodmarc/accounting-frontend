# Layout Components

## DashboardLayout

The outer shell rendered for all authenticated pages. Contains the sidebar, top bar, and content area. Receives `activeTab`, `setActiveTab`, `user`, `organizations`, `activeOrg`, `setActiveOrg`, and `canAccess` as props from `App.tsx`.

## Sidebar

The left sidebar renders navigation grouped into sections: Sales (Invoices, Quotes, Products, Customers, Projects, Settings), Purchases (Bills, Purchase Orders, Suppliers), Banking, Accounting (Chart of Accounts, Tax Rates, Manual Journals), Reports, Contacts, and Settings.

Items whose `TabId` maps to a blocked permission key are hidden entirely for User-role members. Navigation items call `setActiveTab(tab)` — there are no React Router `<Link>` components for internal navigation.

## Org Dropdown

Located at the top of the sidebar. Displays the current org name. Clicking opens the user's full org list. Selecting a different org calls `setActiveOrg(org)`, which triggers navigation to the new org's Home. Creating a new org opens an inline modal form; on success the new org is added to state and set as active.

## Top Bar

Right-aligned area showing the organisation name, a user avatar shortcut to the `UserProfile` tab, and a Logout button.

## Responsive Behaviour

The sidebar collapses to a hamburger menu on small screens. Wide content (tables, report grids) is wrapped in `overflow-x: auto` containers to prevent horizontal page scroll.
