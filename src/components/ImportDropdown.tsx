import { useState, useRef, useEffect } from 'react'
import { Upload, ChevronDown, Loader2 } from 'lucide-react'

interface ImportDropdownProps {
  onCsv: (file: File) => void
  onExcel: (file: File) => void
  loading?: boolean
}

export function ImportDropdown({ onCsv, onExcel, loading = false }: ImportDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const excelRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(type: 'csv' | 'excel') {
    setOpen(false)
    if (type === 'csv') csvRef.current?.click()
    else excelRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'excel') {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (type === 'csv') onCsv(file)
    else onExcel(file)
  }

  return (
    <div ref={ref} className="relative">
      <input
        ref={csvRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => handleChange(e, 'csv')}
      />
      <input
        ref={excelRef} type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={e => handleChange(e, 'excel')}
      />

      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-[3px] shadow-sm transition disabled:opacity-60 cursor-pointer select-none"
      >
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Upload className="h-3.5 w-3.5" />}
        Upload Transactions
        <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-[3px] shadow-lg min-w-[160px] py-0.5">
          <button
            onClick={() => pick('csv')}
            className="w-full text-left px-4 py-2 text-[11px] text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Upload CSV
          </button>
          <button
            onClick={() => pick('excel')}
            className="w-full text-left px-4 py-2 text-[11px] text-slate-700 hover:bg-slate-50 cursor-pointer border-t border-slate-50"
          >
            Upload Excel
          </button>
        </div>
      )}
    </div>
  )
}
