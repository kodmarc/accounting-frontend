import { useState, useEffect } from 'react'
import { Plus, FileText, Search, Eye } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Contact, PurchaseOrder } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'
import type { TabId } from '../../types/tabs'

interface PurchaseOrdersTabProps {
  activeOrg: Organization
  setActiveTab: (tab: TabId) => void
  onEditPO: (id: string) => void
  onCreateNewPO: () => void
  onConvertToBill: (po: PurchaseOrder) => void
}

export function PurchaseOrdersTab({
  activeOrg,
  setActiveTab,
  onEditPO,
  onCreateNewPO,
  onConvertToBill
}: PurchaseOrdersTabProps) {
  const { showConfirm, showAlert } = usePopup()
  // Database states
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])

  // Loading & UI States
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Awaiting Approval' | 'Approved' | 'Billed' | 'Declined'>('All')
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'amount-asc' | 'amount-desc'>('date-desc')

  // Selection columns
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Load all master list data
  const loadData = async () => {
    setLoading(true)
    try {
      const poList = await apiService.getPurchaseOrders(activeOrg.id)
      setPurchaseOrders(poList)
    } catch { } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
  }, [activeOrg.id])

  // Reset checkboxes on filter transition
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter])

  // Selection toggle
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleToggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) {
      visibleIds.forEach(id => next.delete(id))
    } else {
      visibleIds.forEach(id => next.add(id))
    }
    setSelectedIds(next)
  }

  // Bulk operations
  const handleBulkDelete = async () => {
    const targets = purchaseOrders.filter(po => selectedIds.has(po.id))
    const nonDrafts = targets.some(po => po.status !== 'Draft')
    if (nonDrafts) {
      showAlert({
        title: 'Compliance Warning',
        message: 'Only draft purchase orders can be deleted.',
        type: 'warning'
      })
      return
    }

    const confirmed = await showConfirm({
      title: 'Delete Purchase Orders',
      message: `Are you sure you want to delete these ${selectedIds.size} draft purchase orders?`,
      confirmText: 'Delete Selected',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      await Promise.all(targets.map(po => apiService.deletePurchaseOrder(po.id, activeOrg.id)))
    } catch (err: any) {
      showAlert({ title: 'Error deleting purchase orders', message: err.message || 'API failed to delete purchase orders.', type: 'error' })
      return
    }

    const remaining = purchaseOrders.filter(po => !selectedIds.has(po.id))
    setPurchaseOrders(remaining)
    setSelectedIds(new Set())
  }

  const handleBulkChangeStatus = async (status: 'Draft' | 'Awaiting Approval' | 'Approved' | 'Billed' | 'Declined') => {
    try {
      await Promise.all(
        purchaseOrders.filter(po => selectedIds.has(po.id)).map(po => apiService.updatePurchaseOrder(po.id, { status }, activeOrg.id))
      )
    } catch (err: any) {
      showAlert({ title: 'Error updating purchase orders', message: err.message || 'API failed to update purchase orders.', type: 'error' })
      return
    }

    const updated = purchaseOrders.map(po => {
      if (selectedIds.has(po.id)) {
        return { ...po, status }
      }
      return po
    })
    setPurchaseOrders(updated)
    setSelectedIds(new Set())
  }

  // Filter & Sort
  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch =
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.contact_name && po.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (po.reference && po.reference.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    if (statusFilter === 'All') return true
    return po.status === statusFilter
  })

  const sortedPOs = [...filteredPOs].sort((a, b) => {
    if (sortOption === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime()
    if (sortOption === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime()
    if (sortOption === 'amount-asc') return Number(a.total) - Number(b.total)
    if (sortOption === 'amount-desc') return Number(b.total) - Number(a.total)
    return 0
  })

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left animate-fadeIn relative">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <FileText className="h-5 w-5 text-[#0F5B38]" />
          <span>Purchase orders</span>
        </h2>
        <button
          onClick={onCreateNewPO}
          className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] shadow-md transition duration-200 cursor-pointer w-fit self-end sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* 2. Filter tabs */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between border-b border-slate-200 pb-0 gap-4">
        <div className="flex space-x-1 select-none text-xs font-semibold -mb-[1px] relative z-10 overflow-x-auto scrollbar-none">
          {(['All', 'Draft', 'Awaiting Approval', 'Approved', 'Billed', 'Declined'] as const).map(tab => {
            const count = purchaseOrders.filter(po => {
              if (tab === 'All') return true
              return po.status === tab
            }).length
            const isActive = statusFilter === tab

            return (
              <button
                key={tab}
                onClick={() => { setStatusFilter(tab); }}
                className={`px-3 py-2 text-xs font-semibold transition-all border rounded-t-[3px] cursor-pointer whitespace-nowrap ${isActive
                    ? 'bg-white text-[#0F5B38] border-slate-200 border-b-transparent font-bold -mb-[1px] relative z-10'
                    : 'bg-transparent hover:bg-slate-50 text-slate-450 hover:text-slate-855 border-slate-200'
                  }`}
              >
                <span>{tab}</span>
                <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-emerald-50 text-[#0F5B38]' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right side search & sorting & bulk actions */}
        <div className="flex flex-row items-center justify-end gap-2.5 flex-grow mb-[2px] w-full xl:w-auto ml-auto">
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
              <button
                onClick={handleBulkDelete}
                className="px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => handleBulkChangeStatus('Approved')}
                className="px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Approve
              </button>
              <span className="text-[11px] text-slate-400 font-bold px-1 whitespace-nowrap hidden sm:inline">
                {selectedIds.size} selected
              </span>
            </div>
          )}

          <div className="relative w-36 sm:w-36">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-8.5 pr-4 py-2 text-xs font-semibold text-slate-855 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1">
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-1.5 py-2 w-32 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
            >
              <option value="date-desc">Date Latest</option>
              <option value="date-asc">Date Oldest</option>
              <option value="amount-asc">Price (Min to Max)</option>
              <option value="amount-desc">Price (Max to Min)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. POs List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex space-x-1.5 items-center">
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
          </div>
        </div>
      ) : sortedPOs.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 border border-slate-200 rounded-[3px] p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No purchase orders match your filters</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto font-medium leading-relaxed">
              Use the **New Purchase Order** button on the top right to start a procurement proposal!
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={() => handleToggleSelectAll(sortedPOs.map(po => po.id))}
                      checked={sortedPOs.length > 0 && sortedPOs.every(po => selectedIds.has(po.id))}
                      className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Number</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {sortedPOs.map(po => {
                  const isSelected = selectedIds.has(po.id)

                  return (
                    <tr
                      key={po.id}
                      onClick={() => onEditPO(po.id)}
                      className="hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(po.id)}
                          className="rounded-[3px] text-[#0F5B38] focus:ring-[#0F5B38] cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800 max-w-[140px] truncate">{po.contact_name || "Supplier"}</td>
                      <td className="p-3 font-semibold text-slate-600">{po.po_number}</td>
                      <td className="p-3 text-slate-400 italic max-w-[100px] truncate">{po.reference || "-"}</td>
                      <td className="p-3 whitespace-nowrap">{po.date}</td>
                      <td className="p-3 whitespace-nowrap">{po.expiry_date}</td>
                      <td className="p-3 text-right font-bold text-slate-800">{currencySymbol}{Number(po.total).toFixed(2)}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${po.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                            po.status === 'Awaiting Approval' ? 'bg-amber-50 text-amber-600 border border-amber-100/30' :
                            po.status === 'Declined' ? 'bg-rose-50 text-rose-600' :
                            po.status === 'Billed' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/30' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onEditPO(po.id)}
                          className="p-1 text-slate-400 hover:text-[#0F5B38] rounded-[3px] transition cursor-pointer"
                          title="Edit purchase order details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
