import { useState, useEffect } from 'react'
import { Plus, Settings, Receipt, FileText, ArrowUpRight, ShoppingBag } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization } from '../../services/api'
import type { TabId } from '../../types/tabs'
import { useReadOnly } from '../../context/ReadOnlyContext'

interface PurchasesOverviewTabProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
  onCreateBillClick: () => void
  onCreatePOClick: () => void
}

export function PurchasesOverviewTab({
  activeOrg,
  setActiveTab,
  onCreateBillClick,
  onCreatePOClick
}: PurchasesOverviewTabProps) {
  const isReadOnly = useReadOnly()
  const [bills, setBills] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const loadOverviewData = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const [billsRes, posRes] = await Promise.all([
          apiService.getBills(activeOrg.id),
          apiService.getPurchaseOrders(activeOrg.id)
        ])
        setBills(billsRes)
        setPurchaseOrders(posRes)
      } catch (err: any) {
        setErrorMsg("Failed to load active bill and purchase order records.")
      } finally {
        setLoading(false)
      }
    }

    loadOverviewData()
  }, [activeOrg.id])

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'PKR': return '₨'
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      case 'AUD': return 'A$'
      case 'CAD': return 'C$'
      case 'SGD': return 'S$'
      default: return '$'
    }
  }
  const currencySymbol = getCurrencySymbol(activeOrg.currency || 'USD')

  // Calculations
  const draftBills = bills.filter(b => b.status === 'Draft')
  const unpaidBills = bills.filter(b => b.status === 'Awaiting Payment')
  const overdueBills = bills.filter(b => {
    if (b.status !== 'Awaiting Payment') return false
    const due = new Date(b.due_date)
    return due < new Date()
  })
  const activePOs = purchaseOrders.filter(po => po.status === 'Approved' || po.status === 'Awaiting Approval')

  const draftSum = draftBills.reduce((sum, b) => sum + Number(b.total), 0)
  const unpaidSum = unpaidBills.reduce((sum, b) => sum + Number(b.total), 0)
  const overdueSum = overdueBills.reduce((sum, b) => sum + Number(b.total), 0)
  const poSum = activePOs.reduce((sum, po) => sum + Number(po.total), 0)

  // Recent lists
  const recentBills = bills.slice(0, 5)
  const recentPOs = purchaseOrders.slice(0, 5)

  // Chart data: Group bills by date/month (simple mock distribution)
  const monthlyData = [
    { month: 'Jan', amount: 2800 },
    { month: 'Feb', amount: 4100 },
    { month: 'Mar', amount: 5600 },
    { month: 'Apr', amount: 3900 },
    { month: 'May', amount: 7200 },
    { month: 'Jun', amount: 8900 }
  ]

  // Map real values to active month (May)
  const currentMonthTotal = bills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + Number(b.total), 0)
  
  if (currentMonthTotal > 0) {
    monthlyData[4].amount = currentMonthTotal
  }

  const maxChartVal = Math.max(...monthlyData.map(d => d.amount), 5000)

  return (
    <div className="space-y-8 text-left font-sans animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#071f13] to-[#0F5B38] rounded-[3px] p-8 text-white relative overflow-hidden shadow-sm">
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-400/25">
            Purchases center
          </span>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl pt-1">Purchases & expenses dashboard</h2>
          <p className="text-emerald-100/70 text-xs font-medium leading-relaxed">
            Review accounts payable, monitor outstanding supplier claims, approve outgoing purchase orders, and record vendor billing transactions.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pr-10">
          <ShoppingBag className="h-64 w-64" />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Awaiting Payment</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">{currencySymbol}{unpaidSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-slate-400 text-[10px] font-semibold">{unpaidBills.length} vendor bills unpaid</p>
          </div>
          <div className="absolute right-4 top-4 bg-emerald-50/50 p-2.5 rounded-[3px] border border-emerald-100/30">
            <Receipt className="h-4.5 w-4.5 text-[#0F5B38]" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Overdue Bills</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-rose-600">{currencySymbol}{overdueSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-rose-400 text-[10px] font-bold">{overdueBills.length} bills overdue</p>
          </div>
          <div className="absolute right-4 top-4 bg-rose-50 p-2.5 rounded-[3px] border border-rose-100/30">
            <Receipt className="h-4.5 w-4.5 text-rose-500" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Draft Purchases Bills</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">{currencySymbol}{draftSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-slate-400 text-[10px] font-semibold">{draftBills.length} purchase drafts pending</p>
          </div>
          <div className="absolute right-4 top-4 bg-slate-50 p-2.5 rounded-[3px] border border-slate-100">
            <FileText className="h-4.5 w-4.5 text-slate-400" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Purchase Orders</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-emerald-600">{currencySymbol}{poSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-emerald-500 text-[10px] font-bold">{activePOs.length} active orders pending</p>
          </div>
          <div className="absolute right-4 top-4 bg-emerald-50/50 p-2.5 rounded-[3px] border border-emerald-100/30">
            <FileText className="h-4.5 w-4.5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Purchases graph & Lists */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Purchases bill Graph */}
          <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800">Monthly accounts payable</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Monthly payables allocation ledger tracking (6 months visual)</p>
              </div>
              <span className="text-[10px] bg-slate-50 text-slate-400 font-bold px-2.5 py-1 rounded-[3px] border border-slate-100">
                1H FY26
              </span>
            </div>
            
            {/* CSS Bar Chart */}
            <div className="pt-4 h-48 flex items-end justify-between px-2">
              {monthlyData.map(d => {
                const heightPct = (d.amount / maxChartVal) * 100
                return (
                  <div key={d.month} className="flex flex-col items-center group w-12 space-y-2">
                    <div className="relative w-full flex justify-center">
                      <span className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-[#071f13] text-white text-[9px] font-bold px-2 py-0.5 rounded-[3px] shadow transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {currencySymbol}{d.amount.toLocaleString()}
                      </span>
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className="w-8 bg-[#0F5B38] hover:bg-emerald-600 rounded-[3px] shadow-sm transition-all duration-500 cursor-pointer min-h-[4px]"
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{d.month}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side-by-Side Recent Indexes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bills List */}
            <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recent Bills</span>
                <button 
                  onClick={() => setActiveTab('Bills')}
                  className="text-[10px] text-[#0F5B38] hover:underline font-bold flex items-center space-x-0.5"
                >
                  <span>View all</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-400 text-xs font-medium">Loading Bills...</div>
              ) : recentBills.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-semibold">No recent bills found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recentBills.map((b: any) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="font-bold text-slate-700 truncate">{b.contact_name || "Supplier"}</p>
                        <p className="text-slate-400 text-[10px] font-semibold">{b.bill_number} • Due {b.due_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-800">{getCurrencySymbol(b.currency || activeOrg.currency || 'USD')}{Number(b.total).toFixed(2)}</p>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          b.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                          b.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* POs List */}
            <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recent Purchase Orders</span>
                <button 
                  onClick={() => setActiveTab('PurchaseOrders')}
                  className="text-[10px] text-[#0F5B38] hover:underline font-bold flex items-center space-x-0.5"
                >
                  <span>View all</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-400 text-xs font-medium">Loading Purchase Orders...</div>
              ) : recentPOs.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-semibold">No recent orders found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recentPOs.map((po: any) => (
                    <div key={po.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="font-bold text-slate-700 truncate">{po.contact_name || "Supplier"}</p>
                        <p className="text-slate-400 text-[10px] font-semibold">{po.po_number} • Exp {po.expiry_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-800">{getCurrencySymbol(po.currency || activeOrg.currency || 'USD')}{Number(po.total).toFixed(2)}</p>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          po.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                          po.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {po.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50">
              Quick actions
            </h3>
            
            <div className="space-y-3">
              {/* New Bill */}
              {!isReadOnly && (
                <button
                  onClick={onCreateBillClick}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100 rounded-[3px] transition duration-300 group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-[3px] group-hover:bg-[#0F5B38] group-hover:text-white transition duration-300">
                      <Plus className="h-4 w-4 text-[#0F5B38] group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-750">New purchases bill</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Record vendor billing claim statements</p>
                    </div>
                  </div>
                </button>
              )}

              {/* New PO */}
              {!isReadOnly && (
                <button
                  onClick={onCreatePOClick}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100 rounded-[3px] transition duration-300 group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-[3px] group-hover:bg-[#0F5B38] group-hover:text-white transition duration-300">
                      <Plus className="h-4 w-4 text-[#0F5B38] group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-750">New purchase order</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Draft pricing list requests for suppliers</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Settings */}
              <button 
                onClick={() => setActiveTab('PurchasesSettings')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100 rounded-[3px] transition duration-300 group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 rounded-[3px] group-hover:bg-[#0F5B38] group-hover:text-white transition duration-300">
                    <Settings className="h-4 w-4 text-[#0F5B38] group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-750">Purchases config settings</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Configure PO prefixes & numbering chains</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Information box */}
          <div className="bg-[#071f13] rounded-[3px] p-6 text-white space-y-3 relative overflow-hidden">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Double-entry audit</h4>
            <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
              All purchase order validations allocate debit inventory/asset acquisitions and credit accounts payable divisions dynamically inside your ledger.
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-5 bg-white p-4 rounded-full">
              <Receipt className="h-24 w-24" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
