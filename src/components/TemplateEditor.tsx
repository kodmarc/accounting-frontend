import * as pdfjsLib from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import type { Organization } from '../services/api/types'

// Set worker once (TemplateEditor is lazy-loaded so this runs only when editor opens)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'logo' | 'company_info' | 'doc_title' | 'doc_number'
  | 'issue_date' | 'due_date' | 'reference' | 'bill_to'
  | 'notes' | 'totals' | 'bank_details' | 'divider' | 'static_text' | 'items_table'

export interface LayoutBlock {
  id: string
  type: BlockType
  zone: 'header' | 'footer'  // kept for backward-compat; ignored in flat-page mode
  page: number
  x: number; y: number
  width: number; height: number
  fontSize: number
  color: string
  bgColor: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  visible: boolean
  content?: string
}

export interface CustomLayout {
  headerHeight: number   // kept for backward-compat
  footerHeight: number   // kept for backward-compat
  accentColor: string
  blocks: LayoutBlock[]
  bgPages?: string[]     // base64 JPEG per page — editor canvas backgrounds
  bgPdfData?: string     // base64 of original uploaded PDF — backend compositing
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 794
const PAGE_H   = 1123   // A4 height at 96 dpi
const SCALE    = 0.65
const PAGE_GAP = 32     // unscaled px gap between pages (~21 px visual)

interface BlockMeta { label: string; icon: string; defaultZone: 'header' | 'footer'; defaultW: number; defaultH: number }

const BLOCK_META: Record<BlockType, BlockMeta> = {
  logo:         { label: 'Logo',             icon: '🖼',  defaultZone: 'header', defaultW: 130, defaultH: 70  },
  company_info: { label: 'Company Info',     icon: '🏢',  defaultZone: 'header', defaultW: 240, defaultH: 90  },
  doc_title:    { label: 'Document Title',   icon: '📄',  defaultZone: 'header', defaultW: 200, defaultH: 40  },
  doc_number:   { label: 'Doc Number',       icon: '#️⃣',  defaultZone: 'header', defaultW: 200, defaultH: 30  },
  issue_date:   { label: 'Issue Date',       icon: '📅',  defaultZone: 'header', defaultW: 120, defaultH: 45  },
  due_date:     { label: 'Due / Expiry',     icon: '⏰',  defaultZone: 'header', defaultW: 120, defaultH: 45  },
  reference:    { label: 'Reference',        icon: '🔖',  defaultZone: 'header', defaultW: 120, defaultH: 45  },
  bill_to:      { label: 'Bill To / Contact','icon': '👤', defaultZone: 'header', defaultW: 370, defaultH: 100 },
  items_table:  { label: 'Items Table',      icon: '📋',  defaultZone: 'header', defaultW: 754, defaultH: 180 },
  notes:        { label: 'Notes',            icon: '📝',  defaultZone: 'footer', defaultW: 390, defaultH: 80  },
  totals:       { label: 'Totals Summary',   icon: '💰',  defaultZone: 'footer', defaultW: 344, defaultH: 110 },
  bank_details: { label: 'Bank Details',     icon: '🏦',  defaultZone: 'footer', defaultW: 754, defaultH: 80  },
  divider:      { label: 'Divider Line',     icon: '—',   defaultZone: 'header', defaultW: 754, defaultH: 8   },
  static_text:  { label: 'Static Text',      icon: '✏️',  defaultZone: 'header', defaultW: 200, defaultH: 40  },
}

export const DEFAULT_LAYOUT: CustomLayout = {
  headerHeight: 300,
  footerHeight: 260,
  accentColor: '#0F5B38',
  bgPages: [],
  bgPdfData: undefined,
  blocks: [
    { id: 'logo',         type: 'logo',         zone: 'header', page: 0, x: 20,  y: 20,  width: 130, height: 70,  fontSize: 16, color: '#0F5B38', bgColor: 'transparent', align: 'left',  bold: true,  visible: true },
    { id: 'company_info', type: 'company_info', zone: 'header', page: 0, x: 20,  y: 95,  width: 240, height: 90,  fontSize: 8,  color: '#64748b', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
    { id: 'doc_title',    type: 'doc_title',    zone: 'header', page: 0, x: 514, y: 20,  width: 260, height: 40,  fontSize: 20, color: '#0F5B38', bgColor: 'transparent', align: 'right', bold: true,  visible: true },
    { id: 'doc_number',   type: 'doc_number',   zone: 'header', page: 0, x: 514, y: 65,  width: 260, height: 25,  fontSize: 10, color: '#475569', bgColor: 'transparent', align: 'right', bold: true,  visible: true },
    { id: 'issue_date',   type: 'issue_date',   zone: 'header', page: 0, x: 514, y: 100, width: 120, height: 45,  fontSize: 9,  color: '#0f172a', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
    { id: 'due_date',     type: 'due_date',     zone: 'header', page: 0, x: 645, y: 100, width: 129, height: 45,  fontSize: 9,  color: '#0f172a', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
    { id: 'bill_to',      type: 'bill_to',      zone: 'header', page: 0, x: 20,  y: 195, width: 370, height: 100, fontSize: 9,  color: '#1e293b', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
    { id: 'items_table',  type: 'items_table',  zone: 'header', page: 0, x: 20,  y: 310, width: 754, height: 180, fontSize: 9,  color: '#334155', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
    { id: 'notes',        type: 'notes',        zone: 'footer', page: 0, x: 20,  y: 510, width: 390, height: 80,  fontSize: 8,  color: '#475569', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
    { id: 'totals',       type: 'totals',       zone: 'footer', page: 0, x: 430, y: 510, width: 344, height: 110, fontSize: 9,  color: '#334155', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
    { id: 'bank_details', type: 'bank_details', zone: 'footer', page: 0, x: 20,  y: 640, width: 754, height: 80,  fontSize: 8,  color: '#475569', bgColor: 'transparent', align: 'left',  bold: false, visible: true },
  ],
}

// Migrate layouts saved before the flat-page model (zone-based → page-absolute Y)
function migrateLegacyLayout(layout: CustomLayout): CustomLayout {
  const needsMigration = layout.blocks.some(b => (b as any).page === undefined)
  if (!needsMigration) return layout
  const hH = layout.headerHeight ?? 300
  const itemsPH = 155
  return {
    ...layout,
    bgPages: layout.bgPages ?? [],
    blocks: layout.blocks.map(b => ({
      ...b,
      page: 0,
      y: (b as any).zone === 'footer' ? hH + itemsPH + b.y : b.y,
    })),
  }
}

// ── Block preview content ─────────────────────────────────────────────────────

function BlockPreview({ block, org, accent }: { block: LayoutBlock; org: Organization; accent: string }) {
  const fs = Math.max(6, block.fontSize * SCALE * 1.1)
  const od = org.org_extensions || {}
  const bd = org.bank_account_name ? {
    bank_name: org.bank_name, account_name: org.bank_account_name,
    account_number: org.bank_account_number, swift: org.bank_swift_code,
  } : null

  switch (block.type) {
    case 'logo':
      return org.logo
        ? <img src={org.logo} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        : <div style={{ fontSize: fs * 1.4, fontWeight: 'bold', color: accent }}>{org.name}</div>

    case 'company_info':
      return (
        <div style={{ fontSize: fs * 0.9, color: '#64748b', lineHeight: 1.35 }}>
          <div style={{ fontWeight: 'bold', color: accent, fontSize: fs * 1.1 }}>{org.name}</div>
          {org.tax_id && <div>Tax/UEN: {org.tax_id}</div>}
          {od.address && <div>{od.address}</div>}
          {od.phone && <div>Phone: {od.phone}</div>}
          {od.email && <div>{od.email}</div>}
        </div>
      )

    case 'doc_title':
      return <div style={{ fontSize: fs * 2.2, fontWeight: 'bold', color: block.color, letterSpacing: 1 }}>INVOICE</div>

    case 'doc_number':
      return <div style={{ fontWeight: 'bold', color: '#475569', fontSize: fs * 1.1 }}>No. INV-0001</div>

    case 'issue_date':
      return (
        <div>
          <div style={{ fontSize: fs * 0.85, fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>Date of Issue</div>
          <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: fs * 1.1 }}>11 Jul 2026</div>
        </div>
      )

    case 'due_date':
      return (
        <div>
          <div style={{ fontSize: fs * 0.85, fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>Due Date</div>
          <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: fs * 1.1 }}>25 Jul 2026</div>
        </div>
      )

    case 'reference':
      return (
        <div>
          <div style={{ fontSize: fs * 0.85, fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>Reference</div>
          <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: fs * 1.1 }}>REF-001</div>
        </div>
      )

    case 'bill_to':
      return (
        <div style={{ fontSize: fs * 0.95, lineHeight: 1.35 }}>
          <div style={{ fontSize: fs * 0.85, fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: 1, marginBottom: 2 }}>Bill To</div>
          <div style={{ fontWeight: 'bold' }}>Acme Corporation</div>
          <div style={{ color: '#64748b' }}>accounts@acme.com</div>
          <div style={{ color: '#64748b' }}>+1 234 567 890</div>
        </div>
      )

    case 'items_table':
      return (
        <div style={{ fontSize: fs * 0.85, width: '100%' }}>
          <div style={{ background: accent, color: '#fff', display: 'flex', padding: '2px 4px', fontWeight: 'bold', marginBottom: 1 }}>
            <span style={{ flex: 2 }}>Item</span>
            <span style={{ flex: 3 }}>Description</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Amount</span>
          </div>
          {[1, 2].map(i => (
            <div key={i} style={{ display: 'flex', padding: '1.5px 4px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <span style={{ flex: 2, fontWeight: 'bold', color: '#1e293b' }}>ITEM-00{i}</span>
              <span style={{ flex: 3 }}>Sample line item {i}</span>
              <span style={{ flex: 1, textAlign: 'center' }}>1</span>
              <span style={{ flex: 1, textAlign: 'right' }}>$100.00</span>
            </div>
          ))}
        </div>
      )

    case 'notes':
      return (
        <div style={{ background: '#f8fafc', borderLeft: `3px solid #cbd5e1`, padding: '5px 8px', fontSize: fs * 0.9 }}>
          <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: 1 }}>Notes</div>
          <div style={{ color: '#475569' }}>Payment due within 30 days.</div>
        </div>
      )

    case 'totals':
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fs * 0.95 }}>
          <tbody>
            <tr><td style={{ color: '#64748b', textAlign: 'right', paddingRight: 8 }}>Subtotal</td><td style={{ textAlign: 'right' }}>$1,000.00</td></tr>
            <tr><td style={{ color: '#64748b', textAlign: 'right', paddingRight: 8 }}>Tax</td><td style={{ textAlign: 'right' }}>$100.00</td></tr>
            <tr style={{ borderTop: `2px solid ${accent}` }}>
              <td style={{ textAlign: 'right', paddingRight: 8, fontWeight: 'bold', color: accent, paddingTop: 4 }}>Total</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', color: accent, paddingTop: 4 }}>$1,100.00</td>
            </tr>
          </tbody>
        </table>
      )

    case 'bank_details':
      return (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 8px', fontSize: fs * 0.9 }}>
          <div style={{ fontWeight: 'bold', color: accent, marginBottom: 2 }}>PAYMENT INSTRUCTIONS</div>
          <div style={{ color: '#475569' }}>
            {bd ? `Bank: ${bd.bank_name} | Account: ${bd.account_name} | No: ${bd.account_number}` : 'Bank details not configured'}
          </div>
        </div>
      )

    case 'divider':
      return <hr style={{ border: 'none', borderTop: `1.5px solid ${block.color || '#e2e8f0'}`, margin: 0, width: '100%' }} />

    case 'static_text':
      return <div style={{ whiteSpace: 'pre-wrap', fontSize: fs * 0.95 }}>{block.content || 'Your text here'}</div>

    default:
      return null
  }
}

// ── Single block on canvas ────────────────────────────────────────────────────

function CanvasBlock({
  block, selected, accent, org,
  onMouseDown, onResizeMouseDown,
}: {
  block: LayoutBlock; selected: boolean; accent: string; org: Organization
  onMouseDown: (e: React.MouseEvent) => void
  onResizeMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e) }}
      style={{
        position: 'absolute',
        left: block.x * SCALE,
        top: block.y * SCALE,
        width: block.width * SCALE,
        minHeight: block.height * SCALE,
        textAlign: block.align,
        fontWeight: block.bold ? 'bold' : 'normal',
        color: block.color,
        background: block.bgColor === 'transparent' ? undefined : block.bgColor,
        border: selected ? '1.5px solid #3b82f6' : '1px dashed transparent',
        outline: selected ? '2px solid rgba(59,130,246,0.15)' : undefined,
        cursor: 'move',
        userSelect: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        opacity: block.visible ? 1 : 0.35,
      }}
      className={!selected ? 'hover:border-slate-300' : ''}
    >
      <BlockPreview block={block} org={org} accent={accent} />
      {selected && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e) }}
          style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#3b82f6', cursor: 'se-resize' }}
        />
      )}
    </div>
  )
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropsPanel({
  block, layout, pageCount, onUpdate, onDelete, onLayoutChange,
}: {
  block: LayoutBlock | null
  layout: CustomLayout
  pageCount: number
  onUpdate: (id: string, patch: Partial<LayoutBlock>) => void
  onDelete: (id: string) => void
  onLayoutChange: (patch: Partial<CustomLayout>) => void
}) {
  const isPdfMode = (layout.bgPages?.length ?? 0) > 0

  if (!block) {
    return (
      <div className="w-56 border-l border-slate-200 bg-white p-4 flex flex-col gap-4 shrink-0">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Canvas Settings</p>
        {!isPdfMode && (
          <>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Header Height (px)</label>
              <input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1"
                value={layout.headerHeight}
                onChange={e => onLayoutChange({ headerHeight: Math.max(100, +e.target.value) })} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Footer Height (px)</label>
              <input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1"
                value={layout.footerHeight}
                onChange={e => onLayoutChange({ footerHeight: Math.max(80, +e.target.value) })} />
            </div>
          </>
        )}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Accent Color</label>
          <div className="flex items-center gap-2">
            <input type="color" className="h-7 w-10 rounded border border-slate-200 cursor-pointer p-0"
              value={layout.accentColor} onChange={e => onLayoutChange({ accentColor: e.target.value })} />
            <span className="text-[11px] text-slate-500 font-mono">{layout.accentColor}</span>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 mt-auto">Click a block on the canvas to edit its properties.</p>
      </div>
    )
  }

  const u = (patch: Partial<LayoutBlock>) => onUpdate(block.id, patch)

  return (
    <div className="w-56 border-l border-slate-200 bg-white p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-700">{BLOCK_META[block.type]?.label}</p>
        <button onClick={() => onDelete(block.id)} className="text-red-400 hover:text-red-600 text-[10px] font-semibold">Delete</button>
      </div>

      {/* Page selector (multi-page only) */}
      {pageCount > 1 && (
        <div>
          <label className="text-[9px] font-semibold text-slate-400 block mb-1">Page</label>
          <select className="w-full text-xs border border-slate-200 rounded px-2 py-1"
            value={block.page} onChange={e => u({ page: +e.target.value })}>
            {Array.from({ length: pageCount }, (_, i) => (
              <option key={i} value={i}>Page {i + 1}</option>
            ))}
          </select>
        </div>
      )}

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        {(['x', 'y', 'width', 'height'] as const).map(field => (
          <div key={field}>
            <label className="text-[9px] font-semibold text-slate-400 block mb-0.5 capitalize">{field}</label>
            <input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1"
              value={block[field]} onChange={e => u({ [field]: +e.target.value })} />
          </div>
        ))}
      </div>

      {/* Typography */}
      <div>
        <label className="text-[9px] font-semibold text-slate-400 block mb-1">Font Size (pt)</label>
        <input type="number" min={6} max={48} className="w-full text-xs border border-slate-200 rounded px-2 py-1"
          value={block.fontSize} onChange={e => u({ fontSize: +e.target.value })} />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-semibold text-slate-400 block mb-1">Text Color</label>
          <input type="color" className="h-7 w-full rounded border border-slate-200 cursor-pointer p-0"
            value={block.color} onChange={e => u({ color: e.target.value })} />
        </div>
        <div>
          <label className="text-[9px] font-semibold text-slate-400 block mb-1">Background</label>
          <input type="color" className="h-7 w-full rounded border border-slate-200 cursor-pointer p-0"
            value={block.bgColor === 'transparent' ? '#ffffff' : block.bgColor}
            onChange={e => u({ bgColor: e.target.value })} />
        </div>
      </div>

      {/* Alignment */}
      <div>
        <label className="text-[9px] font-semibold text-slate-400 block mb-1">Alignment</label>
        <div className="flex rounded border border-slate-200 overflow-hidden text-[10px] font-bold">
          {(['left', 'center', 'right'] as const).map(a => (
            <button key={a} onClick={() => u({ align: a })}
              className={`flex-1 py-1 ${block.align === a ? 'bg-[#0F5B38] text-white' : 'bg-white text-slate-400'}`}>
              {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
            </button>
          ))}
        </div>
      </div>

      {/* Bold + Visible */}
      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={block.bold} onChange={e => u({ bold: e.target.checked })} className="rounded" />
          <span className="text-[10px] font-semibold text-slate-600">Bold</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={block.visible} onChange={e => u({ visible: e.target.checked })} className="rounded" />
          <span className="text-[10px] font-semibold text-slate-600">Visible</span>
        </label>
      </div>

      {/* Static text content */}
      {block.type === 'static_text' && (
        <div>
          <label className="text-[9px] font-semibold text-slate-400 block mb-1">Content</label>
          <textarea rows={3} className="w-full text-xs border border-slate-200 rounded px-2 py-1 resize-none"
            value={block.content || ''} onChange={e => u({ content: e.target.value })} />
        </div>
      )}
    </div>
  )
}

// ── Main TemplateEditor ───────────────────────────────────────────────────────

export function TemplateEditor({
  initialLayout, org, onSave, onClose,
}: {
  initialLayout: CustomLayout | null
  org: Organization
  onSave: (layout: CustomLayout) => Promise<void>
  onClose: () => void
}) {
  const raw = initialLayout ?? DEFAULT_LAYOUT
  const [layout, setLayout] = useState<CustomLayout>(() => migrateLegacyLayout(raw))
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const isPdfMode = (layout.bgPages?.length ?? 0) > 0
  const pageCount = isPdfMode ? layout.bgPages!.length : 1
  const selectedBlock = layout.blocks.find(b => b.id === selected) ?? null

  // Drag ref stores the starting context
  const dragRef = useRef<{
    blockId: string
    startMX: number; startMY: number
    startX: number; startY: number
    startAbsY: number  // absolute canvas Y (unscaled) for multi-page drag
  } | null>(null)

  const resizeRef = useRef<{
    blockId: string
    startMX: number; startMY: number
    startW: number; startH: number
  } | null>(null)

  const updateBlock = (id: string, patch: Partial<LayoutBlock>) =>
    setLayout(prev => ({ ...prev, blocks: prev.blocks.map(b => b.id === id ? { ...b, ...patch } : b) }))

  const deleteBlock = (id: string) => {
    setLayout(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) }))
    setSelected(null)
  }

  const addBlock = (type: BlockType) => {
    const meta = BLOCK_META[type]
    const newBlock: LayoutBlock = {
      id: `${type}_${Date.now()}`, type,
      zone: meta.defaultZone, page: 0,
      x: 20, y: 20,
      width: meta.defaultW, height: meta.defaultH,
      fontSize: 9, color: '#334155', bgColor: 'transparent',
      align: 'left', bold: false, visible: true,
      content: type === 'static_text' ? 'Your text here' : undefined,
    }
    setLayout(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }))
    setSelected(newBlock.id)
  }

  // ── PDF upload ─────────────────────────────────────────────────────────────

  const handlePdfUpload = async (file: File) => {
    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Store original PDF as base64 for backend compositing
      const bgPdfData = btoa(
        Array.from(uint8Array, byte => String.fromCharCode(byte)).join('')
      )

      // Render each page to JPEG via PDF.js
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise
      const pageImages: string[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: CANVAS_W / page.getViewport({ scale: 1 }).width })
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, canvas, viewport }).promise
        pageImages.push(canvas.toDataURL('image/jpeg', 0.82))
      }

      // Migrate all existing blocks to page 0, add items_table if not present
      const migratedBlocks = layout.blocks.map(b => ({ ...b, page: 0 }))
      const hasItems = migratedBlocks.some(b => b.type === 'items_table')
      const finalBlocks: LayoutBlock[] = hasItems ? migratedBlocks : [
        ...migratedBlocks,
        {
          id: `items_table_${Date.now()}`, type: 'items_table',
          zone: 'header' as const, page: 0,
          x: 20, y: 320, width: 754, height: 180,
          fontSize: 9, color: '#334155', bgColor: 'transparent',
          align: 'left' as const, bold: false, visible: true,
        },
      ]

      setLayout(prev => ({ ...prev, bgPages: pageImages, bgPdfData, blocks: finalBlocks }))
    } catch (err) {
      console.error('PDF upload failed', err)
      alert('Failed to process the PDF. Please try a different file.')
    } finally {
      setUploading(false)
    }
  }

  const removePdfBackground = () => {
    setLayout(prev => ({ ...prev, bgPages: [], bgPdfData: undefined }))
  }

  // ── Global mouse handlers for drag + resize ────────────────────────────────

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const { blockId, startMX, startMY, startX, startAbsY } = dragRef.current
        const dx = (e.clientX - startMX) / SCALE
        const dy = (e.clientY - startMY) / SCALE

        if (isPdfMode && pageCount > 1) {
          const STEP = PAGE_H + PAGE_GAP
          const newAbsY = startAbsY + dy
          const newPage = Math.max(0, Math.min(pageCount - 1, Math.floor(newAbsY / STEP)))
          const newY = Math.max(0, Math.round(newAbsY - newPage * STEP))
          setLayout(prev => ({
            ...prev,
            blocks: prev.blocks.map(b =>
              b.id === blockId ? { ...b, x: Math.max(0, Math.round(startX + dx)), y: newY, page: newPage } : b
            ),
          }))
        } else {
          setLayout(prev => ({
            ...prev,
            blocks: prev.blocks.map(b =>
              b.id === blockId
                ? { ...b, x: Math.max(0, Math.round(startX + dx)), y: Math.max(0, Math.round(startAbsY + dy)) }
                : b
            ),
          }))
        }
      }

      if (resizeRef.current) {
        const { blockId, startMX, startMY, startW, startH } = resizeRef.current
        const dw = (e.clientX - startMX) / SCALE
        const dh = (e.clientY - startMY) / SCALE
        setLayout(prev => ({
          ...prev,
          blocks: prev.blocks.map(b =>
            b.id === blockId
              ? { ...b, width: Math.max(40, Math.round(startW + dw)), height: Math.max(16, Math.round(startH + dh)) }
              : b
          ),
        }))
      }
    }
    const onUp = () => { dragRef.current = null; resizeRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isPdfMode, pageCount])

  // Delete/Escape keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected &&
        !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        deleteBlock(selected)
      }
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(layout) } finally { setSaving(false) }
  }

  // Page zones: array of bg images (null = blank white page)
  const pageZones: (string | null)[] = isPdfMode
    ? layout.bgPages!
    : [null]

  const canvasPageH = PAGE_H * SCALE
  const canvasPageW = CANVAS_W * SCALE

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-slate-800 shrink-0">Template Designer</span>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:block truncate">
            Drag to reposition · Resize from corner · Delete key removes selected
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* PDF background controls */}
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = '' }}
          />
          {isPdfMode ? (
            <button
              onClick={removePdfBackground}
              className="text-[11px] font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded hover:bg-red-50"
            >
              Remove PDF Background
            </button>
          ) : (
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={uploading}
              className="text-[11px] font-semibold text-[#0F5B38] hover:bg-emerald-50 px-3 py-1.5 border border-emerald-300 rounded disabled:opacity-50"
            >
              {uploading ? 'Processing PDF…' : '↑ Upload PDF Background'}
            </button>
          )}

          <button onClick={() => { setLayout(migrateLegacyLayout(DEFAULT_LAYOUT)); setSelected(null) }}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50">
            Reset
          </button>
          <button onClick={onClose}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="text-[11px] font-semibold text-white bg-[#0F5B38] hover:brightness-105 px-4 py-1.5 rounded disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Layout'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Block Library */}
        <div className="w-48 bg-white border-r border-slate-200 p-3 overflow-y-auto shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Add Blocks</p>
          <div className="space-y-1">
            {(Object.keys(BLOCK_META) as BlockType[]).map(type => (
              <button key={type} onClick={() => addBlock(type)}
                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-50 text-[11px] font-medium text-slate-700 border border-transparent hover:border-slate-200 transition-colors">
                <span>{BLOCK_META[type].icon}</span>
                <span>{BLOCK_META[type].label}</span>
              </button>
            ))}
          </div>
          {isPdfMode && (
            <div className="mt-4 p-2 bg-emerald-50 rounded border border-emerald-100 text-[9px] text-emerald-700 leading-relaxed">
              PDF: {pageCount} page{pageCount > 1 ? 's' : ''}. Drag blocks across pages — they'll snap to whichever page their center falls on.
            </div>
          )}
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center">
          <div
            className="flex flex-col items-center"
            style={{ gap: PAGE_GAP * SCALE }}
          >
            {pageZones.map((bgImg, pageIdx) => (
              <div key={pageIdx} className="relative">
                {/* Page label */}
                <div className="absolute -top-5 left-0 flex items-center gap-2 select-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                    {isPdfMode ? `Page ${pageIdx + 1} of ${pageCount}` : 'Canvas'}
                  </span>
                </div>

                {/* Page surface */}
                <div
                  className="relative border border-slate-300 shadow-lg"
                  style={{
                    width: canvasPageW,
                    height: canvasPageH,
                    backgroundColor: 'white',
                    backgroundImage: bgImg ? `url(${bgImg})` : undefined,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                  onClick={() => setSelected(null)}
                >
                  {layout.blocks
                    .filter(b => b.page === pageIdx)
                    .map(block => (
                      <CanvasBlock
                        key={block.id}
                        block={block}
                        selected={selected === block.id}
                        accent={layout.accentColor}
                        org={org}
                        onMouseDown={e => {
                          setSelected(block.id)
                          dragRef.current = {
                            blockId: block.id,
                            startMX: e.clientX, startMY: e.clientY,
                            startX: block.x, startY: block.y,
                            startAbsY: block.page * (PAGE_H + PAGE_GAP) + block.y,
                          }
                        }}
                        onResizeMouseDown={e => {
                          resizeRef.current = {
                            blockId: block.id,
                            startMX: e.clientX, startMY: e.clientY,
                            startW: block.width, startH: block.height,
                          }
                        }}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-slate-400 mt-4">
            Canvas is 65% of actual A4 (794 × 1123 px). Coordinates shown are real PDF positions.
          </p>
        </div>

        {/* Right: Properties */}
        <PropsPanel
          block={selectedBlock}
          layout={layout}
          pageCount={pageCount}
          onUpdate={updateBlock}
          onDelete={deleteBlock}
          onLayoutChange={patch => setLayout(prev => ({ ...prev, ...patch }))}
        />
      </div>
    </div>
  )
}
