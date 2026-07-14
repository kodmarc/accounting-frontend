# PDF Customization

## Overview
PDF Customization lets an organization move away from the standard printed layout and design its own PDF for invoices, quotes, bills, and purchase orders. In the current implementation this is a per-document-type layout stored on the organization and applied automatically whenever that document type is downloaded or emailed.

## Actual working behavior
Each organization stores two separate layout settings: one for sales documents (invoices and quotes) and one for purchase documents (bills and purchase orders). Each setting holds a theme flag and, when the theme is `Custom`, a layout definition made up of positioned blocks (text, logo, items table, totals, notes, bank details, and so on) plus an accent color.

When a document is downloaded or emailed:
- If the theme is not `Custom`, the standard built-in layout is used, unchanged from before.
- If the theme is `Custom` and a layout is present, the app renders the user's block layout to HTML and converts it to a PDF; only if that generation fails does it fall back to the standard layout.

The layout engine supports single-page "zone" layouts (fixed header/footer with the items table flowing between them) as well as multi-page "flat" layouts, where blocks are pinned to specific pages and positions and the items table can flow across page breaks.

## Main features
- Design a custom PDF layout per document type (sales vs. purchases)
- Position header, footer, logo, text, items table, totals, notes, and bank-detail blocks freely on the page
- Choose an accent color used for table headers and highlighted elements
- Apply the same custom layout automatically to every invoice, quote, bill, or purchase order the organization generates
- Fall back safely to the standard layout if custom rendering fails

## Inputs
- Theme selection (Standard or Custom) for sales documents and for purchase documents
- Block definitions: type, page, position, size, and visibility
- Accent color for the layout
- The underlying document data (customer/supplier, lines, totals) supplied automatically at generation time

## Outputs
- A generated PDF matching the organization's custom design when downloading or emailing an invoice, quote, bill, or purchase order
- The standard system layout when no custom theme is configured

## Important implementation detail
Customization currently applies to sales and purchase documents only. The financial reports (Profit & Loss, Balance Sheet, Cash Flow, Account Transactions) are still generated from a fixed built-in layout and do not yet read the organization's custom layout settings.

## Related modules
- [Settings](settings.md)
- [Sales — Invoices](sales/invoices.md)
- [Sales — Quotes](sales/quotes.md)
- [Purchases — Bills](purchases/bills.md)
- [Reports](reports/README.md)
