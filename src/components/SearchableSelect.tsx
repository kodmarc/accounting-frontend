import { useState } from 'react'
import { Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  icon?: React.ReactNode
}

export function SearchableSelect({ options, value, onChange, placeholder, label, icon }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    opt.value.toLowerCase().includes(search.toLowerCase())
  )

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="space-y-1.5 relative w-full font-sans">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-10 py-3.5 text-sm text-left font-semibold text-slate-705 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/50"
        >
          <div className="flex items-center space-x-2.5 truncate">
            {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
            <span className={selectedOption ? "text-slate-800 font-semibold" : "text-slate-400 font-medium"}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">▼</span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-45" onClick={() => setIsOpen(false)}></div>
            <div className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-[3px] shadow-xl z-50 p-3.5 animate-fadeIn">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] mb-3"
              />
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`w-full text-left px-3 py-2 rounded-[3px] text-[15px] font-normal flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                        opt.value === value ? 'bg-emerald-50 text-[#0F5B38]' : 'text-slate-650'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.value === value && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    </button>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-2">No matching options</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
