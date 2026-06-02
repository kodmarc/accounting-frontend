import {
  ArrowRightLeft,
  Plus,
  CreditCard,
  ChevronRight,
  Receipt,
  TrendingUp,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'
import type { Organization } from '../../services/api'
import type { TabId } from '../../types/tabs'

interface ReconcileItem {
  id: string
  date: string
  bankDescription: string
  bankAmount: number
  matchedTo: {
    invoiceNo: string
    contact: string
    amount: number
    type: 'Invoice' | 'Bill'
  }
}

interface HomeTabProps {
  activeOrg: Organization | null
  setActiveTab: (tab: TabId) => void
  reconcileItems: ReconcileItem[]
  resetReconciliation: () => void
  reconciledCount: number
}

export function HomeTab({
  activeOrg,
  setActiveTab,
  reconcileItems,
  resetReconciliation,
  reconciledCount
}: HomeTabProps) {
  const currencySymbol = activeOrg?.currency === 'PKR' ? '₨' : '$'

  return (
    <div className="space-y-8 font-sans">
      {/* Dashboard Hero Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[3px] border border-emerald-100/50 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-48 w-48 bg-[#0F5B38]/5 rounded-full blur-3xl"></div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[#071f13] tracking-tight">
            Welcome to the Financial Control Center of {activeOrg?.name}
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            Operating in {activeOrg?.country} • Base Currency: {activeOrg?.currency} • Tax Reg ID: {activeOrg?.tax_id || 'Not Set'}
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button 
            onClick={() => setActiveTab('reconcile')}
            className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-semibold text-xs px-4 py-2.5 rounded-[3px] shadow-lg shadow-emerald-955/15 transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Run Reconciliation</span>
          </button>
          <button 
            onClick={() => setActiveTab('SalesOverview')}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-[3px] transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New...</span>
          </button>
        </div>
      </div>

      {/* Key Accounting Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Main Bank Feed Widget */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#071f13] to-[#0d3f27] text-white">
            <div>
              <h3 className="font-bold text-sm">ANZ Business Account</h3>
              <p className="text-[10px] text-emerald-200/80">Account No: ****-9832</p>
            </div>
            <span className="p-2 bg-white/10 rounded-[3px] backdrop-blur-sm">
              <CreditCard className="h-4.5 w-4.5 text-emerald-300" />
            </span>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance in Xero</span>
                <p className="text-lg font-bold text-slate-800">
                  {currencySymbol}0.00
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Statement Balance</span>
                <p className="text-lg font-bold text-[#0F5B38]">
                  {currencySymbol}0.00
                </p>
              </div>
            </div>

            {reconcileItems.length > 0 ? (
              <div className="p-4 bg-emerald-50/50 rounded-[3px] border border-emerald-100/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold">Unreconciled Items</span>
                  <p className="text-xs font-bold text-[#071f13]">{reconcileItems.length} transactions pending</p>
                </div>
                <button
                  onClick={() => setActiveTab('reconcile')}
                  className="flex items-center space-x-1.5 bg-[#0F5B38] hover:brightness-105 text-white text-[10px] font-bold px-3 py-1.5 rounded-[3px] transition-all duration-300 cursor-pointer"
                >
                  <span>Reconcile</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-[3px] border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-800">Perfectly Reconciled!</span>
                </div>
                <button 
                  onClick={resetReconciliation}
                  className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-[3px] transition-all cursor-pointer"
                  title="Reset bank feed data for demo"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Invoices Owed to You */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Invoices Owed to You</h3>
              <p className="text-[10px] text-slate-400 font-medium">Total outstanding receivables</p>
            </div>
            <span className="p-2 bg-emerald-50 rounded-[3px] border border-emerald-100/40 text-[#0F5B38]">
              <Receipt className="h-4.5 w-4.5" />
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Draft Invoices</span>
              <div className="flex items-center justify-between">
                <p className="text-md font-bold text-slate-700">
                  {currencySymbol}0.00
                </p>
                <span className="text-xs text-slate-500 font-semibold">0 invoices</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#071f13]">Sent (Awaiting Payment)</span>
                <span className="text-[#0F5B38]">
                  {currencySymbol}0.00
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#0F5B38] h-full rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600">Overdue</span>
                <span className="text-rose-600">
                  {currencySymbol}0.00
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('SalesOverview')}
            className="mt-6 w-full flex items-center justify-center space-x-1.5 py-2 bg-emerald-50 hover:bg-emerald-100/50 text-[#0F5B38] font-bold text-xs rounded-[3px] border border-emerald-100/50 transition-all duration-300 cursor-pointer"
          >
            <span>View Invoices Overview</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 3. Bills You Need to Pay */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Bills You Need to Pay</h3>
              <p className="text-[10px] text-slate-400 font-medium">Total accounts payable</p>
            </div>
            <span className="p-2 bg-rose-50 rounded-[3px] border border-rose-100/40 text-rose-500">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Draft Bills</span>
              <div className="flex items-center justify-between">
                <p className="text-md font-bold text-slate-700">
                  {currencySymbol}0.00
                </p>
                <span className="text-xs text-slate-500 font-semibold">0 draft</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#071f13]">Awaiting Payment</span>
                <span className="text-slate-800">
                  {currencySymbol}0.00
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-700 h-full rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600">Overdue Bills</span>
                <span className="text-rose-600">
                  {currencySymbol}0.00
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('PurchasesOverview')}
            className="mt-6 w-full flex items-center justify-center space-x-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-[#071f13] font-bold text-xs rounded-[3px] border border-slate-200 transition-all duration-300 cursor-pointer"
          >
            <span>Manage Purchase Bills</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Watchlists & Overview Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Watchlist card */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">Account Watchlist</h3>
            <button className="text-[#0F5B38] text-xs font-bold hover:underline cursor-pointer">Edit watchlist</button>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 pb-2 font-bold uppercase tracking-wider">
                <th className="py-2">Account Code & Name</th>
                <th className="py-2 text-right">This Month</th>
                <th className="py-2 text-right">Year to Date (YTD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
              <tr>
                <td colSpan={3} className="text-center py-6 text-slate-400 font-medium">
                  No accounts in watchlist. Use the Accounts tab to add tracking accounts here.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Reconciliation Health Card */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Reconciliation Health</h3>
            
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-emerald-50/50 border-4 border-[#0F5B38] flex-col shadow-inner">
                <span className="text-xl font-black text-[#071f13]">{reconciledCount}</span>
                <span className="text-[9px] text-[#0F5B38] font-bold uppercase tracking-wider">Matched</span>
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed font-semibold">
                You reconciled {reconciledCount} items this quarter. Automated matching is active.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[3px] border border-slate-200/60 text-[10px] font-semibold">
            <span className="text-slate-500">Last synced feed:</span>
            <span className="font-bold text-slate-700">Just now</span>
          </div>
        </div>
      </div>
    </div>
  )
}
