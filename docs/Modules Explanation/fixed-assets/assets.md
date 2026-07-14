# Fixed Assets — Fixed Assets

## What this page does
The Fixed Assets page is where individual assets are created, registered into the books, and eventually disposed of. It tracks each asset's cost, accumulated depreciation, and net book value across its lifecycle.

## Real user actions
- Open the asset list and filter by status (Draft, Registered, Disposed).
- Create a fixed asset manually, or receive one automatically from a purchase bill line.
- Edit a Draft asset's details.
- Delete a Draft asset.
- Register a Draft asset so it becomes active and depreciable.
- Roll back a Registered asset to Draft if it hasn't depreciated yet.
- Dispose of a Registered asset, entering a disposal date, price, and proceeds account.

## Inputs required from the user
- Asset name, description, serial number, and warranty expiry (optional)
- Asset type, purchase date, cost, and residual value
- Depreciation start date (defaults to purchase date if left blank)
- Per-asset rate or useful-life override (optional)
- Offset account when registering a manually created asset
- Disposal date, disposal price, and proceeds account when disposing

## Internal app behavior
1. A new asset gets an auto-generated asset number (e.g. `FA-0001`) and starts in Draft status.
2. An asset created from a bill line is linked to that bill and skips journal posting on registration, since the bill already posted the cost.
3. A manually created asset requires an offset account on registration; the system then posts a journal debiting the asset account and crediting the offset account.
4. Rollback to Draft is only allowed if no depreciation has posted for the asset yet, and it reverses the original registration journal if one exists.
5. Disposal clears the accumulated depreciation, records any proceeds against the chosen account, removes the asset's cost from the books, and books the gain or loss between net book value and proceeds.
6. Net book value is always calculated live as cost minus posted accumulated depreciation.

## Outputs
- Draft, Registered, or Disposed fixed asset records
- A registration journal for manually created assets
- A disposal journal recording proceeds, cost removal, and any gain/loss
- Live net book value used by depreciation runs and asset reporting

## Related modules
- [Asset Types](asset-types.md)
- [Depreciation Runs](depreciation-runs.md)
- [Bills](../purchases/bills.md)
