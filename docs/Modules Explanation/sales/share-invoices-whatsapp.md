# Share Invoices via WhatsApp & Other Platforms

## Overview
This feature adds a Share option to invoices, quotes, bills, and purchase orders so a user can send a document straight to a customer or supplier as a link, instead of only downloading or emailing a PDF from within the app.

## Actual working behavior
Opening Share on a document builds a public, unauthenticated PDF link for that specific document, plus a ready-made message containing the recipient's name, the document number, the amount due (or quote expiry), and the organization's name. What the user sees next depends on their device:

- On devices that support the native share sheet (most phones), tapping Share opens the operating system's own share menu, prefilled with the message text and the link, so the user can choose WhatsApp or any other installed app.
- On devices without native share support (typically desktop browsers), a dedicated green **WhatsApp** button opens `wa.me` in a new tab with the full message and link pre-filled, ready to send. Email and Facebook links are also offered as fallbacks in that case.
- A **Copy Link** button copies just the shareable PDF URL, and a **Copy Message** button copies the full message with the link included, for pasting anywhere manually.

## Main features
- Share button available on invoices, quotes, bills, and purchase orders
- Direct WhatsApp send option with the message and document link pre-filled
- Native share sheet support on mobile, so any installed messaging app can be used, not just WhatsApp
- Copy-to-clipboard options for the link alone or the full message
- Desktop fallback links for Email and Facebook when native sharing isn't available
- The link always points to the current PDF for that document, so it reflects whatever layout (standard or custom) the organization has configured

## Inputs
- The document being shared (its type, number, contact name, amount, currency, and due/expiry label) — pulled automatically from the document, no manual entry needed
- The user's choice of share method (native share, WhatsApp, copy link, copy message, email, or Facebook)

## Outputs
- A public link that opens the document's PDF directly, viewable by anyone who has it
- A pre-filled WhatsApp (or native share sheet) conversation ready to send
- Clipboard content containing the link or full message when a copy action is used

## Related modules
- [Sales — Invoices](sales/invoices.md)
- [Sales — Quotes](sales/quotes.md)
- [Purchases — Bills](purchases/bills.md)
- [PDF Customization](pdf-customization.md)
