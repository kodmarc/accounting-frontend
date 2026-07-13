# PDF Templates & Custom Layout Editor

## Files

`src/pages/tabs/SettingsTab.tsx` (template settings UI)  
`src/components/TemplateEditor.tsx` (drag-drop editor)  
`backend/organizations/pdf_utils.py` (HTML and PDF rendering)

## Template Themes

Sales and Purchase documents each have an independent theme setting stored in `Organization.sales_template_settings` and `Organization.purchase_template_settings` (JSONFields). The theme field can be:

- **`Emerald`** — the built-in default template rendered with xhtml2pdf via Django templates. Uses the org's accent colour (`#0F5B38`) and supports logo, UEN/tax ID, terms, and footer text toggles.
- **`Custom`** — a drag-drop layout designed in the Template Designer and stored as a `custom_layout` JSON blob within the template settings. Rendered with Playwright.

Theme selection, logo visibility, UEN/terms toggles, theme colour, and the custom layout are all saved together via `PATCH /api/organizations/<id>/settings/?org_id=` to the `sales_template_settings` or `purchase_template_settings` JSON field.

## Template Designer

Opened from Settings → Sales Settings (or Purchase Settings) when `Custom` theme is selected. Lazy-loaded via `React.lazy`.

### Layout Model (`CustomLayout`)

```ts
interface CustomLayout {
  headerHeight: number   // legacy zone mode only
  footerHeight: number   // legacy zone mode only
  accentColor: string
  blocks: LayoutBlock[]
}
```

### Blocks

Each block has a type, absolute position (`x`, `y` in PDF units at 794 × 1123 px A4), size (`width`, `height`), font size, text colour, background colour, alignment, and visibility toggle.

Available block types: `logo`, `company_info`, `doc_title`, `doc_number`, `issue_date`, `due_date`, `reference`, `bill_to`, `notes`, `totals`, `bank_details`, `divider`, `static_text`, `items_table`.

### Interaction

Blocks are dragged by mousedown on the block surface and repositioned in real-time. Resize handles appear on the bottom-right corner. Pressing Delete or Backspace removes the selected block. Clicking the canvas background deselects.

The canvas is rendered at 65% scale (`SCALE = 0.65`) of A4. Block coordinates stored in the layout are always full A4 units; the scale is applied only to the visual display.

### Properties Panel

When a block is selected, a right-side panel shows its numeric position and size fields (editable directly), font size, text colour, background colour, alignment, bold toggle, and visibility toggle. `static_text` blocks also show a free-text content field. When nothing is selected, the panel shows canvas settings: header height, footer height, and accent colour.

### Rendering

On PDF download, `build_custom_pdf_html(layout, context, doc_type)` in `pdf_utils.py` generates the HTML for the layout:

- If any block has `page > 0` or any block is of type `items_table`, a flat single-page HTML is produced using absolute positioning (`_build_flat_page_html`). This is the standard path for all custom layouts.
- Otherwise a legacy zone-based HTML is produced (header / footer zones with flowing items in between).

`render_pdf_playwright(html)` launches a headless Chromium browser (persistent pool, one per process) and prints the HTML to PDF with no margins.

### Save

Clicking **Save Layout** calls `onSave(layout)` which is wired in `SettingsTab` to PATCH the org's `sales_template_settings.custom_layout` with the full layout JSON.

**Reset** restores `DEFAULT_LAYOUT` (a standard pre-configured block set covering all block types at sensible positions).
