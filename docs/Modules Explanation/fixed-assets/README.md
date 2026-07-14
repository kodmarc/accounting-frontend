# Fixed Asset Management Module

## What this module actually does
The Fixed Asset Management module is a new backend app that tracks company-owned assets from purchase through depreciation to disposal. It defines reusable asset types, registers individual assets against them, and runs periodic depreciation that posts straight to the general ledger.

## Real user actions
- Define an asset type with its cost, accumulated depreciation, and depreciation expense accounts, plus a depreciation method.
- Create a fixed asset either manually or from a purchase bill line.
- Register a Draft asset so it starts depreciating and appears on the books.
- Roll back a Registered asset to Draft if no depreciation has posted yet.
- Preview a depreciation run for a period before committing to it.
- Post a depreciation run to book depreciation expense across all eligible assets.
- Undo the most recently posted depreciation run.
- Dispose of a Registered asset and record any sale proceeds.

## Inputs the user provides
- Asset type name, linked accounts, depreciation method (Straight Line or Diminishing Value), and averaging method
- Depreciation rate or useful life in years, and residual value percentage
- Asset name, description, serial number, purchase date, cost, residual value, and depreciation start date
- An offset account when registering a manually created asset
- Depreciation run period label, period start, and period end
- Disposal date, disposal price, and proceeds account when disposing of an asset

## Internal flow in the app
1. The frontend loads asset types and fixed assets scoped to the organization.
2. An asset created from a bill line arrives already linked to that bill; a manually created asset needs an offset account when registered.
3. Registering an asset either simply activates it (bill-sourced cost was already posted) or posts a journal debiting the asset account and crediting the offset account.
4. A depreciation run preview calculates, but does not save, the depreciation due for every Registered asset in the period using its asset type's method and averaging rule.
5. Posting the run creates the depreciation lines, groups amounts by expense and accumulated-depreciation account, and posts one consolidated journal.
6. Disposal clears accumulated depreciation, records any proceeds, removes the asset cost, and books a gain or loss based on net book value versus proceeds.

## Outputs produced by the module
- Reusable asset type templates for consistent depreciation treatment
- Draft, Registered, and Disposed fixed asset records with a running net book value
- Posted or Undone depreciation runs, each backed by a manual journal
- Gain/loss postings on disposal
- Depreciation and asset data that feed the organization's ledger and financial reports

## Subpages
- [Asset Types](asset-types.md)
- [Fixed Assets](assets.md)
- [Depreciation Runs](depreciation-runs.md)
