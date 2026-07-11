import { useState, useRef, useEffect } from 'react'
import { FileDown, ChevronDown, Loader2 } from 'lucide-react'

interface ExportDropdownProps {
  onPdf: () => void
  onCsv: () => void
  onExcel: () => void
  pdfLoading?: boolean
}

export function ExportDropdown({ onPdf, onCsv, onExcel, pdfLoading = false }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={pdfLoading}
        className="flex items-center gap-1.5 px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer select-none"
      >
        {pdfLoading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <FileDown className="h-3.5 w-3.5" />}
        Export
        <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-[3px] shadow-lg min-w-[130px] py-0.5">
          <button
            onClick={() => pick(onPdf)}
            className="w-full text-left px-4 py-2 text-[11px] text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            PDF
          </button>
          <button
            onClick={() => pick(onCsv)}
            className="w-full text-left px-4 py-2 text-[11px] text-slate-700 hover:bg-slate-50 cursor-pointer border-t border-slate-50"
          >
            CSV
          </button>
          <button
            onClick={() => pick(onExcel)}
            className="w-full text-left px-4 py-2 text-[11px] text-slate-700 hover:bg-slate-50 cursor-pointer border-t border-slate-50"
          >
            Excel
          </button>
        </div>
      )}
    </div>
  )
}
