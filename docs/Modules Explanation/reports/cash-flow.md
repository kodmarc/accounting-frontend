# Reports — Cash Flow

## What this page does
The Cash Flow report shows how cash moved into and out of the organization over a selected period. It is organized into operating, investing, and financing sections and reports the net movement and closing cash position.

## Real user actions
- Choose a reporting period preset or custom range.
- Run the cash flow calculation.
- Expand and review each section in the statement.
- Export the report to PDF.

## Inputs used by the report
- Start and end date
- Posted operating, investing, and financing movement data
- Organization account movement data from the accounting records

## Internal app behavior
1. The frontend sends the selected date range to the cash flow report API.
2. The backend builds the cash movement statement using the organization’s transactional history.
3. The UI renders the operating, investing, and financing sections with total lines.
4. The report also exposes validation data and the final closing cash figure.

## Outputs
- Operating cash movement summary
- Investing and financing movement summary
- Net cash movement and closing cash position
- A liquidity-focused view for management or finance review

## Related modules
- [Profit & Loss](profit-loss.md)
- [Balance Sheet](balance-sheet.md)
- [Account Transactions](account-transactions.md)
