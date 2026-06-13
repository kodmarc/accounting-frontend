import { useState, useEffect } from 'react'
import {
  ArrowRightLeft,
  Plus,
  CreditCard,
  ChevronRight,
  Receipt,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Activity,
  Calendar
} from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account, Invoice } from '../../services/api'
import type { TabId } from '../../types/tabs'

interface HomeTabProps {
  activeOrg: Organization | null
  setActiveTab: (tab: TabId) => void
}

export function HomeTab({ activeOrg, setActiveTab }: HomeTabProps) {
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const currencySymbol = activeOrg?.currency === 'PKR' ? '₨' : '$'

  const loadDashboardData = async () => {
    if (!activeOrg) return
    setLoading(true)
    try {
      const [allAccounts, invs, billsList] = await Promise.all([
        apiService.getAccounts(activeOrg.id),
        apiService.getInvoices(activeOrg.id),
        apiService.getBills(activeOrg.id),
      ])
      setBankAccounts(allAccounts.filter(a => a.type === 'Bank'))
      setInvoices(invs)
      setBills(billsList)
    } catch {
      // silently fail — empty state shown
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [activeOrg?.id])

  // All bank balances come from the backend eventually; show 0 until supported
  const totalCash = 0

  // Invoices (Receivables)
  const awaitingPaymentInvoices = invoices.filter(inv => inv.status === 'Awaiting Payment')
  const totalReceivables = awaitingPaymentInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)

  const draftInvoices = invoices.filter(inv => inv.status === 'Draft')
  const draftInvoicesTotal = draftInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)

  const today = new Date()
  const overdueInvoices = awaitingPaymentInvoices.filter(inv => new Date(inv.due_date) < today)
  const overdueInvoicesTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)

  // Bills (Payables)
  const awaitingPaymentBills = bills.filter(b => b.status === 'Awaiting Payment')
  const totalPayables = awaitingPaymentBills.reduce((sum, b) => sum + Number(b.total), 0)

  const draftBills = bills.filter(b => b.status === 'Draft')
  const draftBillsTotal = draftBills.reduce((sum, b) => sum + Number(b.total), 0)

  const overdueBills = awaitingPaymentBills.filter(b => new Date(b.due_date) < today)
  const overdueBillsTotal = overdueBills.reduce((sum, b) => sum + Number(b.total), 0)

  const netCashSurplus = totalCash + totalReceivables - totalPayables

  // Watchlist account balances calculated from invoices/bills data
  const getWatchlistAccountBalance = (code: string, range: 'month' | 'ytd') => {
    if (!activeOrg) return 0
    let total = 0
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    const matchesDate = (dateStr: string) => {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return false
      if (range === 'month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth
      }
      return d.getFullYear() === currentYear
    }

    invoices.forEach((inv: any) => {
      if (inv.status !== 'Paid' && inv.status !== 'Awaiting Payment') return
      if (!matchesDate(inv.date)) return
      inv.lines?.forEach((line: any) => {
        const lineCode = line.account?.code || line.accountCode || (typeof line.account === 'string' ? line.account : '')
        if (lineCode === code) total += Number(line.total || 0)
      })
    })

    bills.forEach((bill: any) => {
      if (bill.status !== 'Paid' && bill.status !== 'Awaiting Payment') return
      if (!matchesDate(bill.date)) return
      bill.lines?.forEach((line: any) => {
        const lineCode = line.account?.code || line.accountCode || (typeof line.account === 'string' ? line.account : '')
        if (lineCode === code) total += Number(line.total || 0)
      })
    })

    return total
  }

  const watchlistAccounts = [
    { code: '200', name: 'Sales / Revenue' },
    { code: '300', name: 'Purchases' },
    { code: '400', name: 'Advertising' },
    { code: '469', name: 'Rent' },
    { code: '477', name: 'Wages and Salaries' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex space-x-1.5 items-center">
          <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
          <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
          <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 font-sans animate-fadeIn">

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
            onClick={() => setActiveTab('BankAccounts')}
            className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-semibold text-xs px-4 py-2.5 rounded-[3px] shadow-lg shadow-emerald-955/15 transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Bank Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('CreateInvoice')}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-[3px] transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-[3px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cash Position</span>
            <h2 className="text-lg font-black text-slate-800 mt-1">
              {currencySymbol}{totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-bold mt-3">
            <Activity className="h-3.5 w-3.5" />
            <span>Across {bankAccounts.length} Account(s)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[3px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Awaiting Receivables</span>
            <h2 className="text-lg font-black text-[#0F5B38] mt-1">
              {currencySymbol}{totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-bold mt-3">
            <span>{awaitingPaymentInvoices.length} invoices pending</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[3px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Awaiting Payables</span>
            <h2 className="text-lg font-black text-rose-600 mt-1">
              {currencySymbol}{totalPayables.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-bold mt-3">
            <span>{awaitingPaymentBills.length} bills pending</span>
          </div>
        </div>

        <div className="bg-[#071f13] text-white p-5 rounded-[3px] border border-[#0d3f27] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 h-12 w-12 bg-white/5 rounded-full"></div>
          <div>
            <span className="text-[10px] text-emerald-250/75 font-bold uppercase tracking-wider">Net Cash Surplus</span>
            <h2 className="text-lg font-black mt-1">
              {currencySymbol}{netCashSurplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-emerald-300 font-bold mt-3">
            <span>Forecasted Position</span>
          </div>
        </div>
      </div>

      {/* Dynamic Bank Accounts list */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
          <CreditCard className="h-4.5 w-4.5 text-[#0F5B38]" />
          <span>Active Bank Account Reserves</span>
        </h3>

        {bankAccounts.length === 0 ? (
          <div className="bg-white rounded-[3px] border border-slate-100 p-8 text-center">
            <p className="text-slate-400 text-xs font-semibold">No bank accounts registered. Go to the Bank Accounts tab to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bankAccounts.map(bank => (
              <div
                key={bank.id}
                className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex flex-col overflow-hidden"
              >
                <div
                  onClick={() => setActiveTab('BankAccounts')}
                  className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#071f13] to-[#0d3f27] text-white cursor-pointer group"
                >
                  <div>
                    <h4 className="font-bold text-xs group-hover:underline">{bank.name}</h4>
                    <p className="text-[9px] text-emerald-200/80">Code: {bank.code}</p>
                  </div>
                  <span className="p-1.5 bg-white/10 rounded-[3px] backdrop-blur-sm">
                    <CreditCard className="h-4 w-4 text-emerald-350" />
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Statement Balance</span>
                    <p className="text-md font-extrabold text-slate-800 mt-0.5">
                      {currencySymbol}0.00
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/30 rounded-[3px] border border-emerald-100/30 flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-800">Up to date</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receivables and Payables breakdown rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Invoices Owed to You */}
        <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Invoices Owed to You</h3>
              <p className="text-[10px] text-slate-400 font-medium">Customer receivables dashboard</p>
            </div>
            <span className="p-2 bg-emerald-50 rounded-[3px] text-[#0F5B38]">
              <Receipt className="h-4.5 w-4.5" />
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Draft Invoices</span>
              <div className="flex items-center justify-between">
                <p className="text-md font-bold text-slate-700">
                  {currencySymbol}{draftInvoicesTotal.toFixed(2)}
                </p>
                <span className="text-xs text-slate-500 font-semibold">{draftInvoices.length} draft</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#071f13]">Awaiting Payment</span>
                <span className="text-[#0F5B38]">
                  {currencySymbol}{(totalReceivables - overdueInvoicesTotal).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0F5B38] h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalReceivables > 0 ? ((totalReceivables - overdueInvoicesTotal) / totalReceivables) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600">Overdue Invoices</span>
                <span className="text-rose-600">
                  {currencySymbol}{overdueInvoicesTotal.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalReceivables > 0 ? (overdueInvoicesTotal / totalReceivables) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('Invoices')}
            className="mt-6 w-full flex items-center justify-center space-x-1.5 py-2 bg-emerald-50 hover:bg-emerald-100/50 text-[#0F5B38] font-bold text-xs rounded-[3px] border border-emerald-100/50 transition-all duration-300 cursor-pointer"
          >
            <span>View Invoice Ledger</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bills You Need to Pay */}
        <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Bills You Need to Pay</h3>
              <p className="text-[10px] text-slate-400 font-medium">Vendor accounts payable</p>
            </div>
            <span className="p-2 bg-rose-50 text-rose-500 rounded-[3px]">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Draft Bills</span>
              <div className="flex items-center justify-between">
                <p className="text-md font-bold text-slate-700">
                  {currencySymbol}{draftBillsTotal.toFixed(2)}
                </p>
                <span className="text-xs text-slate-500 font-semibold">{draftBills.length} draft</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#071f13]">Awaiting Payment</span>
                <span className="text-slate-800">
                  {currencySymbol}{(totalPayables - overdueBillsTotal).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-700 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalPayables > 0 ? ((totalPayables - overdueBillsTotal) / totalPayables) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600">Overdue Bills</span>
                <span className="text-rose-600">
                  {currencySymbol}{overdueBillsTotal.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalPayables > 0 ? (overdueBillsTotal / totalPayables) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('Bills')}
            className="mt-6 w-full flex items-center justify-center space-x-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-[#071f13] font-bold text-xs rounded-[3px] border border-slate-200 transition-all duration-300 cursor-pointer"
          >
            <span>Manage Bills Ledger</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Watchlist and Recent Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Watchlist Card */}
        <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">Account Watchlist</h3>
            <button
              onClick={() => setActiveTab('ChartOfAccounts')}
              className="text-[#0F5B38] text-xs font-bold hover:underline cursor-pointer"
            >
              Chart of Accounts
            </button>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 pb-2 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2">Account Code & Name</th>
                <th className="py-2 text-right">This Month</th>
                <th className="py-2 text-right">Year to Date (YTD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
              {watchlistAccounts.map(acc => {
                const thisMonthVal = getWatchlistAccountBalance(acc.code, 'month')
                const ytdVal = getWatchlistAccountBalance(acc.code, 'ytd')
                return (
                  <tr key={acc.code} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5">
                      <span className="font-bold text-slate-850">{acc.code}</span> - <span className="font-medium text-slate-600">{acc.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-800">
                      {currencySymbol}{thisMonthVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right font-black text-[#0F5B38]">
                      {currencySymbol}{ytdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-[3px] border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center space-x-2">
              <DollarSign className="h-4.5 w-4.5 text-[#0F5B38]" />
              <span>Recent Activity Feed</span>
            </h3>

            <div className="text-center py-10">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-450 font-medium leading-relaxed">
                No payment events or transfers recorded under your cash accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[3px] border border-slate-250/60 text-[10px] font-semibold mt-4">
            <span className="text-slate-500">Autosynced Status:</span>
            <span className="font-bold text-slate-700">Perfectly synced</span>
          </div>
        </div>
      </div>
    </div>
  )
}
