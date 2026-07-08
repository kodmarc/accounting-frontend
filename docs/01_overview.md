# Frontend Overview

## Tech Stack

React 18 with TypeScript, built by Vite. Styling uses Tailwind CSS v4 — no `tailwind.config.js` — configured directly in CSS via `@import "tailwindcss"` and a `@theme` block. Routing is React Router DOM v6. HTTP is handled by native `fetch` wrapped in `services/api/base.ts`. PDFs are generated client-side with `jsPDF` and `html2canvas`. State management uses plain React hooks — no external state library.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`. The Vite dev server proxies `/api/*` to `http://localhost:8000`. To override the API URL, set `VITE_API_URL` in a local `.env` file.

## Production Build

```bash
npm run build
```

Output lands in `frontend/dist/`. The Django backend serves this directory in production via `STATICFILES_DIRS`.

## Key Directories

```
frontend/src/
├── pages/            # Main page components and all tab sub-components
│   ├── tabs/         # One file per tab (Invoices, Bills, Reports, etc.)
│   └── LandingPage/  # Public-facing landing and auth pages
├── components/       # Reusable UI components (SearchableInput, DatePicker, etc.)
├── services/
│   ├── api/          # One module per domain (invoices.ts, bills.ts, etc.)
│   │   ├── base.ts   # Fetch wrapper — cache, 401 intercept, token refresh
│   │   └── types.ts  # All TypeScript interfaces for API data
│   └── api.ts        # Re-exports everything as a single apiService object
├── types/
│   └── tabs.ts       # TabId and SettingsTabId union types
└── App.tsx           # SPA shell: auth state, org switching, tab routing, permissions
```

## Tailwind v4 Note

There is no `tailwind.config.js`. Custom design tokens are defined in the `@theme` block in the main CSS entry file. All utility classes are generated from the `@import "tailwindcss"` directive at the top of that file.
