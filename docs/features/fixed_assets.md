# Fixed Assets

## Files

`src/pages/tabs/FixedAssetsTab.tsx`

## Sections

The tab has three internal sections, toggled by a top nav: **Asset Register**, **Asset Types**, and **Depreciation**.

## Asset Types

Asset types are templates that define the accounting accounts and depreciation method used by a category of assets. Each type links three accounts: the fixed asset balance sheet account, the accumulated depreciation contra-asset account, and the depreciation expense account.

Depreciation method is either **Straight Line** (requires useful life in years) or **Diminishing Value** (requires a rate percentage). Averaging method controls how partial periods are handled: `FullMonth`, `ActualDays`, `FullYear`, or `NoAveraging`. A residual value percentage can be set to prevent depreciation below a floor.

Asset types can be deactivated but not deleted if any asset references them.

## Asset Register

Displays all fixed assets for the org. Status filter (All / Draft / Registered / Disposed) is applied client-side. Assets can be searched by name, asset number, or serial number.

### Creating an Asset

The asset form collects: name, description, serial number, warranty expiry, asset type, purchase date, cost, residual value, depreciation start date, and per-asset depreciation overrides (rate or useful life — override the asset type defaults if provided).

Asset number is auto-generated (`FA-0001`, `FA-0002`, …) by the backend on create. New assets start in **Draft** status.

### Registering an Asset

Clicking **Register** on a Draft asset transitions it to **Registered** and posts accounting entries:

- **From a bill** (`source_bill_line` set): The cost was already debited to the asset account when the bill was posted — registration only changes status, no new journal.
- **Manually created**: An `offset_account` (e.g., Bank or AP) must be selected. A `ManualJournal` is posted: Debit asset account, Credit offset account.

Only Draft assets can be edited or deleted.

### Disposal

Registered assets can be disposed. The disposal form takes a disposal date, proceeds amount, and proceeds account. The backend posts a disposal journal: removes cost and accumulated depreciation, recognises a gain or loss to a hardcoded gain/loss account, and marks the asset `Disposed`.

### Asset Detail

Clicking a row opens a detail view showing all asset fields, accumulated depreciation to date, and net book value (cost − accumulated depreciation). The depreciation history table lists every posted depreciation run line for that asset.

## Depreciation

Lists all depreciation runs with their period, status (`Posted` / `Undone`), and total depreciation posted.

### Run Preview

Before posting, a preview lists each Registered asset and the depreciation amount that would be calculated for the selected period (start date, end date). The engine (`backend/fixed_assets/engine.py`) computes the per-period depreciation amount based on the asset type's method, averaging method, and opening net book value.

### Posting a Run

Posting creates a `DepreciationRun` record and a single `ManualJournal` with one line per asset: Debit depreciation expense account, Credit accumulated depreciation account. The run is atomically linked to the journal.

### Undoing a Run

Only the most recent Posted run can be undone. Undo reverses the journal (sets it to Draft) and marks the run `Undone`.
