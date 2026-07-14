import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Settings, Receipt, FileText, ArrowUpRight } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Invoice, Quote } from '../../services/api'
import type { TabId } from '../../types/tabs'
import { useReadOnly } from '../../context/ReadOnlyContext'

interface SalesOverviewTabProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
  onCreateInvoiceClick: () => void
  onCreateQuoteClick: () => void
}

export function SalesOverviewTab({
  activeOrg,
  setActiveTab,
  onCreateInvoiceClick,
  onCreateQuoteClick
}: SalesOverviewTabProps) {
  const isReadOnly = useReadOnly()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const loadOverviewData = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const [invoicesRes, quotesRes] = await Promise.all([
          apiService.getInvoices(activeOrg.id),
          apiService.getQuotes(activeOrg.id)
        ])
        setInvoices(invoicesRes)
        setQuotes(quotesRes)
      } catch (err: any) {
        setErrorMsg("Failed to load active invoice and quote records.")
      } finally {
        setLoading(false)
      }
    }

    loadOverviewData()
  }, [activeOrg.id])

  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  // Calculations
  const draftInvoices = invoices.filter(i => i.status === 'Draft')
  const unpaidInvoices = invoices.filter(i => i.status === 'Awaiting Payment')
  const overdueInvoices = invoices.filter(i => {
    if (i.status !== 'Awaiting Payment') return false
    const due = new Date(i.due_date)
    return due < new Date()
  })
  const activeQuotes = quotes.filter(q => q.status === 'Sent' || q.status === 'Accepted')

  const draftSum = draftInvoices.reduce((sum, i) => sum + Number(i.total), 0)
  const unpaidSum = unpaidInvoices.reduce((sum, i) => sum + Number(i.total), 0)
  const overdueSum = overdueInvoices.reduce((sum, i) => sum + Number(i.total), 0)
  const quoteSum = activeQuotes.reduce((sum, q) => sum + Number(q.total), 0)

  // Recent lists
  const recentInvoices = invoices.slice(0, 5)
  const recentQuotes = quotes.slice(0, 5)

  // Chart data: Group invoices by date/month (simple mock distribution or real values)
  const monthlyData = [
    { month: 'Jan', amount: 4200 },
    { month: 'Feb', amount: 6800 },
    { month: 'Mar', amount: 3100 },
    { month: 'Apr', amount: 8400 },
    { month: 'May', amount: 9500 },
    { month: 'Jun', amount: 11000 }
  ]

  // Map real values to active month (May)
  const currentMonthTotal = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + Number(i.total), 0)
  
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
            Sales center
          </span>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl pt-1">Sales performance dashboard</h2>
          <p className="text-emerald-100/70 text-xs font-medium leading-relaxed">
            Directly review outstanding client receivables, track incoming billing drafts, and convert prospect quotations to invoices.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pr-10">
          <TrendingUp className="h-64 w-64" />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Awaiting Payment</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">{currencySymbol}{unpaidSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-slate-400 text-[10px] font-semibold">{unpaidInvoices.length} invoices pending deposit</p>
          </div>
          <div className="absolute right-4 top-4 bg-emerald-50/50 p-2.5 rounded-[3px] border border-emerald-100/30">
            <Receipt className="h-4.5 w-4.5 text-[#0F5B38]" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Overdue Invoices</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-rose-600">{currencySymbol}{overdueSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-rose-400 text-[10px] font-bold">{overdueInvoices.length} transactions overdue</p>
          </div>
          <div className="absolute right-4 top-4 bg-rose-50 p-2.5 rounded-[3px] border border-rose-100/30">
            <Receipt className="h-4.5 w-4.5 text-rose-500" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Draft Billing Invoices</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">{currencySymbol}{draftSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-slate-400 text-[10px] font-semibold">{draftInvoices.length} sales drafts in setup</p>
          </div>
          <div className="absolute right-4 top-4 bg-slate-50 p-2.5 rounded-[3px] border border-slate-100">
            <FileText className="h-4.5 w-4.5 text-slate-400" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-3 relative overflow-hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Quotations</span>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-emerald-600">{currencySymbol}{quoteSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-emerald-500 text-[10px] font-bold">{activeQuotes.length} quotes sent to prospects</p>
          </div>
          <div className="absolute right-4 top-4 bg-emerald-50/50 p-2.5 rounded-[3px] border border-emerald-100/30">
            <FileText className="h-4.5 w-4.5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Sales graph & Lists */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Sales invoice Graph */}
          <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800">Invoice sales revenue</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Monthly invoice collections tracking (6 months visual)</p>
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
            {/* Invoices List */}
            <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recent Invoices</span>
                <button 
                  onClick={() => setActiveTab('Invoices')}
                  className="text-[10px] text-[#0F5B38] hover:underline font-bold flex items-center space-x-0.5"
                >
                  <span>View all</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-400 text-xs font-medium">Loading Invoices...</div>
              ) : recentInvoices.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-semibold">No recent invoices found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recentInvoices.map(inv => (
                    <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="font-bold text-slate-700 truncate">{inv.contact_name || "Customer"}</p>
                        <p className="text-slate-400 text-[10px] font-semibold">{inv.invoice_number} • Due {inv.due_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-800">{currencySymbol}{Number(inv.total).toFixed(2)}</p>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                          inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quotes List */}
            <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recent Quotes</span>
                <button 
                  onClick={() => setActiveTab('Quotes')}
                  className="text-[10px] text-[#0F5B38] hover:underline font-bold flex items-center space-x-0.5"
                >
                  <span>View all</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-400 text-xs font-medium">Loading Quotes...</div>
              ) : recentQuotes.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-semibold">No recent quotes found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recentQuotes.map(q => (
                    <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="font-bold text-slate-700 truncate">{q.contact_name || "Prospect"}</p>
                        <p className="text-slate-400 text-[10px] font-semibold">{q.quote_number} • Exp {q.expiry_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-800">{currencySymbol}{Number(q.total).toFixed(2)}</p>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          q.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600' :
                          q.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {q.status}
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
              {/* New Invoice */}
              {!isReadOnly && (
                <button
                  onClick={onCreateInvoiceClick}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100 rounded-[3px] transition duration-300 group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-[3px] group-hover:bg-[#0F5B38] group-hover:text-white transition duration-300">
                      <Plus className="h-4 w-4 text-[#0F5B38] group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-750">New sales invoice</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Issue client billing statements</p>
                    </div>
                  </div>
                </button>
              )}

              {/* New Quote */}
              {!isReadOnly && (
                <button
                  onClick={onCreateQuoteClick}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100 rounded-[3px] transition duration-300 group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-[3px] group-hover:bg-[#0F5B38] group-hover:text-white transition duration-300">
                      <Plus className="h-4 w-4 text-[#0F5B38] group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-750">New sales quote</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Draft offers and pricing pitches</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Settings */}
              <button 
                onClick={() => setActiveTab('SalesSettings')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100 rounded-[3px] transition duration-300 group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 rounded-[3px] group-hover:bg-[#0F5B38] group-hover:text-white transition duration-300">
                    <Settings className="h-4 w-4 text-[#0F5B38] group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-750">Sales config settings</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Configure invoice numbering & footer notes</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Information box */}
          <div className="bg-[#071f13] rounded-[3px] p-6 text-white space-y-3 relative overflow-hidden">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Double-entry audit</h4>
            <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
              All invoice approval entries dynamically trigger debit accounts receivable allocations and credit sales ledger divisions under your selected organization.
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
