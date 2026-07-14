# Fixed Assets — Asset Types

## What this page does
The Asset Types page defines reusable depreciation templates — for example "Computer Equipment" or "Office Furniture" — so individual assets don't need their accounts and depreciation rules re-entered every time.

## Real user actions
- Create an asset type with a name and its three linked ledger accounts.
- Choose a depreciation method: Straight Line or Diminishing Value.
- Choose an averaging method: Full Month, Actual Days, Full Year, or No Averaging.
- Set a depreciation rate (for Diminishing Value) or a useful life in years (for Straight Line).
- Set a residual value percentage.
- Edit an asset type's settings.
- Delete an asset type, only if no assets currently use it.

## Inputs required from the user
- Asset type name
- Asset (cost) account, accumulated depreciation account, depreciation expense account
- Depreciation method and averaging method
- Rate or useful life years
- Residual value percentage

## Internal app behavior
1. The page loads the organization's existing asset types with their linked accounts.
2. Saving an asset type validates that the required accounts are selected.
3. Deleting an asset type is blocked while any fixed asset still references it, protecting depreciation history.
4. Individual assets can override the rate or useful life at the asset level while still inheriting the method and accounts from their type.

## Outputs
- A reusable asset type available for selection when creating a fixed asset
- Consistent account and method defaults applied across all assets of that type

## Related modules
- [Fixed Assets](assets.md)
- [Depreciation Runs](depreciation-runs.md)
- [Chart of Accounts](../accounting/chart-of-accounts.md)
