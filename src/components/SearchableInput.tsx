import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableInputProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onCreateNew?: (inputEl: HTMLInputElement | null) => void
  createNewLabel?: string
}

export function SearchableInput({
  options,
  value,
  onChange,
  placeholder = 'Type to search...',
  className = '',
  onCreateNew,
  createNewLabel
}: SearchableInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => o.value === value)

  // Synchronize internal query state with value label when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption ? selectedOption.label : '')
    }
  }, [value, isOpen, selectedOption])

  // Filter options dynamically
  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase()) ||
    opt.value.toLowerCase().includes(query.toLowerCase())
  )

  // Auto-highlight first match when options filter changes
  useEffect(() => {
    if (filtered.length > 0) {
      setHighlightedIndex(0)
    } else if (onCreateNew) {
      setHighlightedIndex(0) // Highlight "+ Add new..." button if no options match
    } else {
      setHighlightedIndex(-1)
    }
  }, [query, isOpen, filtered.length, onCreateNew])

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
        return
      }
    }

    const total = onCreateNew ? filtered.length + 1 : filtered.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => {
        if (total === 0) return -1
        const next = prev + 1
        return next >= total ? 0 : next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => {
        if (total === 0) return -1
        const next = prev - 1
        return next < 0 ? total - 1 : next
      })
    } else if (e.key === 'Enter') {
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          e.preventDefault()
          e.stopPropagation()
          const selected = filtered[highlightedIndex]
          onChange(selected.value)
          setQuery(selected.label)
          setIsOpen(false)
        } else if (highlightedIndex === filtered.length && onCreateNew) {
          e.preventDefault()
          e.stopPropagation()
          onCreateNew(inputRef.current)
          setIsOpen(false)
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    } else if (e.key === 'Tab') {
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          const selected = filtered[highlightedIndex]
          onChange(selected.value)
          setQuery(selected.label)
        } else if (highlightedIndex === filtered.length && onCreateNew) {
          e.preventDefault()
          e.stopPropagation()
          onCreateNew(inputRef.current)
        }
      }
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full font-sans">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={(e) => {
          setIsOpen(true)
          e.target.select() // Select all text on focus for easy search/overwrite instead of clearing it completely
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />
      
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 shadow-lg z-[100] max-h-48 overflow-y-auto divide-y divide-slate-50 p-1 scrollbar-thin rounded-[3px]">
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                  setQuery(opt.label)
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full text-left px-3 py-2 rounded-[3px] text-[11px] font-semibold transition-all cursor-pointer ${
                  idx === highlightedIndex 
                    ? 'bg-emerald-50 text-[#0F5B38]' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <p className="text-center text-[10px] text-slate-400 py-3.5 font-semibold">No matching options</p>
          )}
          {onCreateNew && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCreateNew(inputRef.current)
                setIsOpen(false)
              }}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
              className={`w-full text-left px-3 py-2 rounded-[3px] text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 border-t border-slate-100 mt-0.5 sticky bottom-0 ${
                highlightedIndex === filtered.length 
                  ? 'bg-emerald-50 text-[#0F5B38]' 
                  : 'text-emerald-600 bg-white hover:bg-emerald-50 hover:text-[#0F5B38]'
              }`}
            >
              <Plus size={12} className="stroke-[3]" />
              {createNewLabel || 'Add new option'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
