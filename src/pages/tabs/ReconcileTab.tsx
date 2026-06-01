import { ArrowRightLeft, RefreshCw, UserCheck, CheckCircle2 } from 'lucide-react'
import type { Organization } from '../../services/api'

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

interface ReconcileTabProps {
  activeOrg: Organization | null
  reconcileItems: ReconcileItem[]
  resetReconciliation: () => void
  handleReconcile: (id: string) => void
}

export function ReconcileTab({
  activeOrg,
  reconcileItems,
  resetReconciliation,
  handleReconcile
}: ReconcileTabProps) {
  const currencySymbol = activeOrg?.currency === 'PKR' ? '₨' : '$'

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between bg-white p-6 rounded-[3px] border border-emerald-100/50 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-[#071f13] flex items-center space-x-2.5">
            <ArrowRightLeft className="h-5 w-5 text-[#0F5B38]" />
            <span>Bank Reconciliation (ANZ Business Feed)</span>
          </h1>
          <p className="text-slate-500 text-xs font-semibold">
            Match statement lines from your bank feed with transaction entries in your ledger accounts.
          </p>
        </div>
        <button
          onClick={resetReconciliation}
          className="flex items-center space-x-2 text-xs font-bold text-[#0F5B38] bg-emerald-50 hover:bg-emerald-100/60 px-4 py-2 rounded-[3px] border border-emerald-100 transition-all duration-300 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reset Demo Feed</span>
        </button>
      </div>

      {reconcileItems.length === 0 ? (
        <div className="bg-white rounded-[3px] border border-emerald-100/50 p-12 text-center shadow-sm space-y-4">
          <div className="mx-auto h-14 w-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-md font-bold text-slate-800">Bank Feed is Fully Reconciled!</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto font-medium">
            All imported statement lines have been matched to invoice or payment records. Excellent book-keeping!
          </p>
          <button
            onClick={resetReconciliation}
            className="mt-2 bg-[#0F5B38] text-white font-semibold text-xs px-5 py-2 rounded-[3px] shadow-lg shadow-emerald-950/15 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            Load Mock Transactions again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 text-[10px] font-bold text-slate-400 px-6 uppercase tracking-wider">
            <span>Statement Line from Bank</span>
            <span className="pl-8">Suggested Match in KDM Accounting</span>
          </div>

          {reconcileItems.map((item) => (
            <div 
              key={item.id}
              className="grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3px] border border-emerald-100/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100"
            >
              {/* Left Side: Bank Statement Info */}
              <div className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider">{item.date}</span>
                  <h4 className="font-semibold text-sm text-slate-800">{item.bankDescription}</h4>
                  <span className="inline-block text-[10px] bg-slate-105 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                    ANZ Business Account Feed
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-md font-black ${item.bankAmount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {item.bankAmount > 0 ? '+' : ''}
                    {currencySymbol}{Math.abs(item.bankAmount).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold">ID: {item.id}</span>
                </div>
              </div>

              {/* Right Side: Suggested Ledger Match */}
              <div className="p-6 flex items-center justify-between bg-emerald-50/10">
                <div className="pl-6 flex items-center space-x-4">
                  <div className="h-9 w-9 bg-[#0F5B38]/10 text-[#0F5B38] rounded-[3px] flex items-center justify-center border border-[#0F5B38]/10 shrink-0">
                    <UserCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-black uppercase bg-[#0F5B38]/10 text-[#0F5B38] px-2 py-0.5 rounded-[3px]">
                        {item.matchedTo.type}
                      </span>
                      <span className="text-xs font-bold text-slate-705">{item.matchedTo.invoiceNo}</span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-800 mt-1">{item.matchedTo.contact}</h4>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {currencySymbol}{Math.abs(item.matchedTo.amount).toFixed(2)}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                      <span className="h-1 w-1 bg-emerald-500 rounded-full mr-1"></span>
                      100% Match
                    </span>
                  </div>

                  <button
                    onClick={() => handleReconcile(item.id)}
                    className="bg-[#0F5B38] hover:brightness-105 text-white text-xs font-bold px-4 py-2 rounded-[3px] shadow-md transition-all duration-300 active:scale-95 cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
