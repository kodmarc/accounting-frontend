import { useState, useEffect, useRef } from 'react'
import { Plus, Percent, Trash2, Search } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, TaxRate } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'
import { useReadOnly } from '../../context/ReadOnlyContext'

interface TaxRatesTabProps {
  activeOrg: Organization
}

export function TaxRatesTab({ activeOrg }: TaxRatesTabProps) {
  const isReadOnly = useReadOnly()
  const { showConfirm, showAlert } = usePopup()
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Type B Layout Filter & Sorting States
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All')
  const [sortOption, setSortOption] = useState<'name-asc' | 'rate-desc' | 'rate-asc'>('name-asc')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await apiService.getTaxRates(activeOrg.id)
      setTaxRates(res)
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load tax rates.")
      setTaxRates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
  }, [activeOrg.id])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter])

  // Ref to track last active focused element before modal launches
  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isModalOpen) {
      if (lastActiveElementRef.current) {
        const el = lastActiveElementRef.current
        setTimeout(() => {
          if (el && document.body.contains(el)) {
            el.focus()
          }
        }, 50)
        lastActiveElementRef.current = null
      }
    }
  }, [isModalOpen])

  const handleAddTaxRate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || rate === '') {
      showAlert({ title: 'Validation Warning', message: 'Name and Rate percentage are required.', type: 'warning' })
      return
    }

    const rateVal = parseFloat(rate)
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
      showAlert({ title: 'Validation Warning', message: 'Please enter a valid rate between 0% and 100%.', type: 'warning' })
      return
    }

    setIsSubmitting(true)

    const payload: Partial<TaxRate> = {
      name,
      rate: parseFloat(rateVal.toFixed(3)),
      is_active: isActive
    }

    try {
      if (editingTaxRate) {
        const updated = await apiService.updateTaxRate(editingTaxRate.id, payload)
        setTaxRates(prev => prev.map(t => t.id === editingTaxRate.id ? updated : t))
        setIsModalOpen(false)
        setEditingTaxRate(null)
        resetForm()
      } else {
        const created = await apiService.createTaxRate(activeOrg.id, payload)
        setTaxRates(prev => [...prev, created])
        setIsModalOpen(false)
        resetForm()
      }
    } catch (e: any) {
      showAlert({ title: 'Error Saving Tax Rate', message: "Failed to save tax rate: " + (e.message || "Unique name constraint violation"), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTaxRate = async (rateId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Tax Rate',
      message: 'Are you sure you want to delete this tax rate definition? All linked accounts will map back to Tax Exempt.',
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      await apiService.deleteTaxRate(rateId)
      setTaxRates(prev => prev.filter(t => t.id !== rateId))
    } catch (e: any) {
      showAlert({ title: 'Deletion Failed', message: "Deletion failed: " + e.message, type: 'error' })
    }
  }

  const resetForm = () => {
    setName('')
    setRate('')
    setIsActive(true)
  }

  const handleOpenAdd = () => {
    setEditingTaxRate(null)
    resetForm()
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleEditClick = (taxRate: TaxRate) => {
    setEditingTaxRate(taxRate)
    setName(taxRate.name)
    setRate(String(taxRate.rate))
    setIsActive(taxRate.is_active)
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleRowClick = (e: React.MouseEvent, taxRate: TaxRate) => {
    const target = e.target as HTMLElement
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.no-row-click')
    ) {
      return
    }
    handleEditClick(taxRate)
  }


  // Toggle selection
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

  // Bulk actions
  const handleBulkDelete = async () => {
    const list = Array.from(selectedIds)
    if (list.length === 0) return

    const confirmed = await showConfirm({
      title: 'Bulk Delete Tax Rates',
      message: `Are you sure you want to permanently delete ${list.length} selected tax rate(s)?`,
      confirmText: 'Delete All',
      isDestructive: true
    })
    if (!confirmed) return

    setLoading(true)
    try {
      await Promise.all(list.map(id => apiService.deleteTaxRate(id)))
      setTaxRates(prev => prev.filter(t => !selectedIds.has(t.id!)))
      setSelectedIds(new Set())
    } catch (e: any) {
      showAlert({ title: 'Bulk Deletion Failed', message: "Failed to delete tax rates: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkToggleActive = async (targetActive: boolean) => {
    const selectedRates = taxRates.filter(t => selectedIds.has(t.id!))
    if (selectedRates.length === 0) return
 
    setLoading(true)
    try {
      await Promise.all(selectedRates.map(t => {
        if (t.is_active !== targetActive) {
          return apiService.updateTaxRate(t.id!, { is_active: targetActive })
        }
        return Promise.resolve(t)
      }))
      const res = await apiService.getTaxRates(activeOrg.id)
      setTaxRates(res)
      showAlert({ title: 'Status Updated', message: `Updated selected tax rate(s) to be ${targetActive ? 'active' : 'inactive'}.`, type: 'success' })
      setSelectedIds(new Set())
    } catch (e: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update tax rates: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Filter & Sort
  const filteredTaxRates = taxRates.filter(tr => {
    if (statusFilter === 'Active') {
      if (!tr.is_active) return false
    } else if (statusFilter === 'Inactive') {
      if (tr.is_active) return false
    }

    const matchesSearch = 
      tr.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tr.rate.toFixed(2).includes(searchTerm)

    return matchesSearch
  }).sort((a, b) => {
    if (sortOption === 'name-asc') {
      return a.name.localeCompare(b.name)
    } else if (sortOption === 'rate-desc') {
      return b.rate - a.rate
    } else if (sortOption === 'rate-asc') {
      return a.rate - b.rate
    }
    return 0
  })

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <Percent className="h-5 w-5 text-[#0F5B38]" />
          <span>Tax Rates Setup</span>
        </h2>
        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] transition cursor-pointer shadow-md shadow-emerald-955/10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Tax Rate</span>
          </button>
        )}
      </div>

      {/* Type B Filter & Search Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-0 border-b border-slate-200/60 gap-4">
        {/* Left Side: Search Bar & Compact Bulk Actions */}
        <div className="flex items-end gap-2 flex-grow max-w-2xl pb-0 mb-[2px]">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-8.5 pr-4 py-2 text-xs font-semibold text-slate-855 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] placeholder:text-slate-400"
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold pb-[2px]">
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => handleBulkToggleActive(true)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkToggleActive(false)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-amber-700 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Deactivate
              </button>
              <span className="text-[11px] text-slate-400 font-bold px-1 whitespace-nowrap hidden lg:inline">
                {selectedIds.size} selected
              </span>
            </div>
          )}
        </div>

        {/* Filters and Sorting Right */}
        <div className="flex flex-wrap items-end gap-3 pb-0 mb-[2px]">
          <div className="flex items-center space-x-1.5 pb-0">
            <span className="text-[10px] text-slate-455 uppercase font-bold tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-3 py-2 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 pb-0">
            <span className="text-[10px] text-slate-455 uppercase font-bold tracking-wider">Sort By:</span>
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-3 py-2 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="rate-desc">Rate: High to Low</option>
              <option value="rate-asc">Rate: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex space-x-1.5 items-center">
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
          </div>
        </div>
      ) : filteredTaxRates.length > 0 ? (
        /* Borderless list table structure (No redundant outer borders) */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredTaxRates.length > 0 && filteredTaxRates.every(tr => selectedIds.has(tr.id!))}
                    onChange={() => handleToggleSelectAll(filteredTaxRates.map(tr => tr.id!))}
                    className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5">Tax Name</th>
                <th className="px-6 py-2.5">Percentage Rate</th>
                <th className="px-6 py-2.5">Status</th>
                <th className="px-6 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {filteredTaxRates.map((tr) => (
                <tr
                  key={tr.id}
                  onClick={(e) => handleRowClick(e, tr)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out ${selectedIds.has(tr.id!) ? 'bg-emerald-50/20' : ''} cursor-pointer`}
                >
                  <td className="px-4 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tr.id!)}
                      onChange={() => handleToggleSelect(tr.id!)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">
                      {tr.name}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-black text-[#0F5B38] text-[13px]">
                    {Number(tr.rate).toFixed(2)}%
                  </td>
                  <td className="px-6 py-2.5 text-slate-550 text-[11px] font-semibold">
                    {tr.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    {!isReadOnly && (
                      <button
                        onClick={() => handleDeleteTaxRate(tr.id!)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition-all cursor-pointer"
                        title="Delete Tax Rate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50/50 rounded-[3px] border border-slate-200/60 p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <Percent className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No Tax Rates Found</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
              Create tax rates to dynamically evaluate liabilities on commercial records.
            </p>
          </div>
        </div>
      )}

      {/* Modern, Glassmorphic Modal overlay for adding Tax Rates */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative transform overflow-hidden rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-850">
                  {editingTaxRate ? 'Edit Tax Rate' : 'Create Tax Rate'}
                </h3>
                <p className="text-[11px] text-slate-450 font-medium">Define operational tax groups to assign inside ledger transactions.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTaxRate} className="space-y-4 text-xs font-semibold text-slate-605">
              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Tax Name *</label>
                <input
                  type="text"
                  placeholder="e.g. GST Standard, VAT"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Percentage Rate (%) *</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="e.g. 15.000"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                />
              </div>

              <div className="flex items-center space-x-2 py-2 select-none">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer"
                />
                <label htmlFor="isActive" className="text-slate-700 font-semibold cursor-pointer">
                  Mark as Active & Eligible for Invoicing
                </label>
              </div>

              <div className="flex space-x-3 pt-4 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium"
                >
                  {isSubmitting ? 'Saving...' : 'Add Tax Rate'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
