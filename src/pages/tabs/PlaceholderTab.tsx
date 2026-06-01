import type { LucideIcon } from 'lucide-react'

interface PlaceholderTabProps {
  title: string
  description: string
  icon: LucideIcon
  onReturnHome: () => void
}

export function PlaceholderTab({ title, description, icon: Icon, onReturnHome }: PlaceholderTabProps) {
  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-12 text-center space-y-4">
      <div className="mx-auto h-14 w-14 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="text-slate-500 text-xs max-w-md mx-auto font-medium font-sans">
        {description}
      </p>
      <button 
        onClick={onReturnHome}
        className="mt-2 bg-[#0F5B38] hover:brightness-105 text-white font-semibold text-xs px-5 py-2 rounded-[3px] shadow-md transition cursor-pointer"
      >
        Return Home
      </button>
    </div>
  )
}
