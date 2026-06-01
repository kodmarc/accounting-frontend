import { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'

interface XeroDatePickerProps {
  value: string // Always in yyyy-MM-dd format
  onChange: (val: string) => void
  placeholder?: string
  className?: string
  id?: string
}

// Robust parsing for multiple manual formats
export function parseFlexibleDate(value: string): string | null {
  if (!value) return null
  const cleaned = value.trim()
  if (!cleaned) return null

  // 1. Check for standard yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) return cleaned
  }

  // 2. Try Standard JS parsing (e.g. 29 April 2026, April 29 2026, 29 Apr 2026)
  const parsedTimestamp = Date.parse(cleaned)
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp)
    return d.toISOString().split('T')[0]
  }

  // 3. Try format: DD MM YYYY or DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  // split on space, dash, slash, dot
  const parts = cleaned.split(/[\s\-\.\/]+/)
  if (parts.length === 3) {
    const dayStr = parts[0]
    const monthStr = parts[1]
    const yearStr = parts[2]

    const day = parseInt(dayStr, 10)
    let month = parseInt(monthStr, 10) - 1 // 0-indexed month
    let year = parseInt(yearStr, 10)

    // Handle 2-digit years
    if (yearStr.length === 2) {
      year += 2000
    }

    // Handle alphabetic months if they exist (e.g., "April", "Apr", "04")
    if (isNaN(month)) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      const fullMonthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
      const lower = monthStr.toLowerCase()
      
      let foundIdx = monthNames.indexOf(lower.substring(0, 3))
      if (foundIdx === -1) {
        foundIdx = fullMonthNames.indexOf(lower)
      }
      if (foundIdx !== -1) {
        month = foundIdx
      }
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
      const d = new Date(year, month, day)
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d.toISOString().split('T')[0]
      }
    }
  }

  return null
}

// Dynamic display formatter (e.g., "29 Apr 2026")
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  
  const date = new Date(y, m, d)
  if (isNaN(date.getTime())) return dateStr

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${d} ${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

export function XeroDatePicker({
  value,
  onChange,
  placeholder = '',
  className = '',
  id
}: XeroDatePickerProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync state value to internal formatted text
  useEffect(() => {
    if (value) {
      setInputValue(formatDisplayDate(value))
      const parts = value.split('-')
      if (parts.length === 3) {
        setCurrentMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1))
      }
    } else {
      setInputValue('')
    }
  }, [value])

  // Click outside to close calendar popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleManualBlur = () => {
    if (!inputValue) {
      onChange('')
      return
    }

    const parsed = parseFlexibleDate(inputValue)
    if (parsed) {
      onChange(parsed)
      setInputValue(formatDisplayDate(parsed))
    } else {
      // Revert to last valid value if invalid
      if (value) {
        setInputValue(formatDisplayDate(value))
      } else {
        setInputValue('')
      }
    }
  }

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleManualBlur()
      setIsOpen(false)
      const inputEl = e.currentTarget
      inputEl.blur()
    }
  }

  const handleSelectDay = (day: Date) => {
    const y = day.getFullYear()
    const m = String(day.getMonth() + 1).padStart(2, '0')
    const d = String(day.getDate()).padStart(2, '0')
    const formatted = `${y}-${m}-${d}`
    onChange(formatted)
    setIsOpen(false)
  }

  // Calendar render helpers
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay()
  const numDays = new Date(year, month + 1, 0).getDate()

  const daysGrid: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) {
    daysGrid.push(null)
  }
  for (let i = 1; i <= numDays; i++) {
    daysGrid.push(new Date(year, month, i))
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const navigateMonth = (direction: 'prev' | 'next') => {
    const next = new Date(currentMonth)
    if (direction === 'prev') {
      next.setMonth(next.getMonth() - 1)
    } else {
      next.setMonth(next.getMonth() + 1)
    }
    setCurrentMonth(next)
  }

  const isSelected = (day: Date) => {
    if (!value) return false
    const parts = value.split('-')
    if (parts.length !== 3) return false
    return day.getFullYear() === parseInt(parts[0]) &&
           day.getMonth() === parseInt(parts[1]) - 1 &&
           day.getDate() === parseInt(parts[2])
  }

  return (
    <div ref={containerRef} className="relative w-full text-slate-800">
      <div className="relative">
        <input
          type="text"
          id={id}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onBlur={handleManualBlur}
          onKeyDown={handleManualKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-200 rounded-[3px] px-3.5 py-2 pr-9.5 text-[15px] font-normal text-slate-800 focus:outline-none focus:border-[#0F5B38] transition placeholder:text-slate-400 ${className}`}
        />
        <Calendar 
          className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-[#0F5B38] transition"
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-[3px] shadow-xl p-4 w-68 z-[1000] animate-fadeIn select-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-slate-100 rounded-[3px] text-slate-500 hover:text-slate-800 font-bold transition text-xs"
            >
              ◀
            </button>
            <span className="text-xs font-bold text-slate-700">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-slate-100 rounded-[3px] text-slate-500 hover:text-slate-800 font-bold transition text-xs"
            >
              ▶
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-[11px] font-bold text-slate-400 text-center py-2">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {daysGrid.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />
              const selected = isSelected(day)
              
              return (
                <div
                  key={`day-${day.getTime()}`}
                  onClick={() => handleSelectDay(day)}
                  className={`py-1.5 rounded-[3px] cursor-pointer transition ${
                    selected
                      ? 'bg-[#0F5B38] text-white font-bold'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-[#0F5B38]'
                  }`}
                >
                  {day.getDate()}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
