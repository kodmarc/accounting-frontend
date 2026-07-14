# Fixed Assets — Depreciation Runs

## What this page does
The Depreciation Runs page calculates and posts the periodic depreciation expense for every Registered asset, turning asset wear-down into a single consolidated ledger entry per period.

## Real user actions
- Preview depreciation for a period before posting anything.
- Post a depreciation run once the preview looks correct.
- Review the list of past depreciation runs and their status.
- Undo the most recently posted depreciation run.

## Inputs required from the user
- Period label, period start date, and period end date

## Internal app behavior
1. Preview and post both calculate depreciation the same way: for every Registered asset with a depreciation start date on or before the period end, the engine works out the opening net book value and applies the asset type's method (Straight Line or Diminishing Value) and averaging rule (Full Month, Actual Days, Full Year, or No Averaging).
2. Depreciation never takes an asset below its residual value, and assets that haven't started depreciating yet or have none due are skipped.
3. A period cannot be posted twice — the system blocks posting if a Posted run already exists for the same start and end date.
4. Posting creates a Depreciation Run, one Depreciation Run Line per depreciated asset (opening NBV, depreciation amount, closing NBV), and a single manual journal that groups amounts by depreciation expense account and by accumulated depreciation account.
5. Undo is only allowed on the most recently Posted run; it reverses the original journal, deletes the run's lines, and marks the run Undone.

## Outputs
- A preview of depreciation amounts per asset with no data saved
- A Posted depreciation run with per-asset depreciation lines
- A consolidated manual journal debiting depreciation expense and crediting accumulated depreciation
- Updated net book value for every depreciated asset
- An Undone run if reversed, with its journal entry reversed

## Related modules
- [Fixed Assets](assets.md)
- [Asset Types](asset-types.md)
- [Manual Journals](../accounting/manual-journals.md)
