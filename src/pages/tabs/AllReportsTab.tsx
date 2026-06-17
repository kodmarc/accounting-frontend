import type { FC } from 'react'
import { BarChart2, TrendingUp, ArrowRightLeft, Droplets, ChevronRight } from 'lucide-react'
import type { TabId } from '../../types/tabs'

interface ReportCard {
  tabId: TabId
  title: string
  description: string
  icon: FC<{ className?: string }>
  color: string
  iconBg: string
}

const REPORTS: ReportCard[] = [
  {
    tabId: 'AccountTransactions',
    title: 'Account Transactions',
    description: 'Full ledger of all transactions across accounts. Filter by date range, account, or contact.',
    icon: ArrowRightLeft,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-100',
  },
  {
    tabId: 'BalanceSheet',
    title: 'Balance Sheet',
    description: 'Snapshot of assets, liabilities, and equity at any point in time.',
    icon: BarChart2,
    color: 'text-[#0F5B38]',
    iconBg: 'bg-emerald-50 border-emerald-100',
  },
  {
    tabId: 'ProfitAndLoss',
    title: 'Profit & Loss',
    description: 'Revenue, cost of goods sold, operating expenses, and net income across any reporting period.',
    icon: TrendingUp,
    color: 'text-violet-600',
    iconBg: 'bg-violet-50 border-violet-100',
  },
  {
    tabId: 'CashFlowStatement',
    title: 'Cash Flow Statement',
    description: 'Operating, investing, and financing cash flows — direct or indirect method.',
    icon: Droplets,
    color: 'text-cyan-600',
    iconBg: 'bg-cyan-50 border-cyan-100',
  },
]

interface AllReportsTabProps {
  setActiveTab: (tab: TabId) => void
}

export function AllReportsTab({ setActiveTab }: AllReportsTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Financial Reports</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Select a report to view or export</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        {REPORTS.map(report => {
          const Icon = report.icon
          return (
            <button
              key={report.tabId}
              onClick={() => setActiveTab(report.tabId)}
              className="group bg-white rounded-[3px] border border-slate-100 shadow-sm p-6 text-left hover:shadow-md hover:border-slate-200 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-4">
                <div className={`inline-flex p-2.5 rounded-[3px] border ${report.iconBg}`}>
                  <Icon className={`h-5 w-5 ${report.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{report.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>
              <div className={`mt-5 flex items-center space-x-1 text-[11px] font-bold ${report.color} group-hover:gap-1 transition-all`}>
                <span>Open report</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
