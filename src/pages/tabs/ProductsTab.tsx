import { useState, useEffect, useRef } from 'react'
import { Plus, Tag, Trash2, ShoppingBag, Search } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Item, Account, TaxRate } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'

interface ProductsTabProps {
  activeOrg: Organization
  isMockMode?: boolean
}

export function ProductsTab({ activeOrg, isMockMode = false }: ProductsTabProps) {
  const { showConfirm, showAlert } = usePopup()
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Type B Layout Filter & Sorting States
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Sell' | 'Purchase' | 'Archived'>('Active')
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc' | 'sku' | 'price-high' | 'cost-high'>('name-asc')

  // Selection & Archive states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  
  // Sell Config
  const [isSold, setIsSold] = useState(true)
  const [salesUnitPrice, setSalesUnitPrice] = useState('0.00')
  const [salesAccountId, setSalesAccountId] = useState('')
  const [salesTaxRateId, setSalesTaxRateId] = useState('')
  const [salesDescription, setSalesDescription] = useState('')

  // Buy Config
  const [isPurchased, setIsPurchased] = useState(true)
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('0.00')
  const [purchaseAccountId, setPurchaseAccountId] = useState('')
  const [purchaseTaxRateId, setPurchaseTaxRateId] = useState('')
  const [purchaseDescription, setPurchaseDescription] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (isMockMode) {
        setItems([])
        setLoading(false)
        return
      }

      const [itemsData, accountsData, taxRatesData] = await Promise.all([
        apiService.getItems(activeOrg.id),
        apiService.getAccounts(activeOrg.id),
        apiService.getTaxRates(activeOrg.id)
      ])
      setItems(itemsData)
      setAccounts(accountsData)
      setTaxRates(taxRatesData)

      // Auto-assign logical default accounts if found
      const revAcc = accountsData.find(a => a.class_type === 'Revenue')
      const expAcc = accountsData.find(a => a.class_type === 'Expense')
      if (revAcc) setSalesAccountId(revAcc.id)
      if (expAcc) setPurchaseAccountId(expAcc.id)
    } catch (e: any) {
      console.warn("Failed to load products.", e)
      setErrorMsg(e.message || "Failed to load products.")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setSelectedIds(new Set())
  }, [activeOrg.id, isMockMode])

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) {
      showAlert({ title: 'Validation Warning', message: 'Code and Name are required fields.', type: 'warning' })
      return
    }

    setIsSubmitting(true)

    const payload: Partial<Item> = {
      code,
      name,
      is_sold: isSold,
      sales_unit_price: parseFloat(salesUnitPrice).toFixed(2),
      sales_account: salesAccountId ? salesAccountId : undefined,
      sales_tax_rate: salesTaxRateId ? salesTaxRateId : undefined,
      sales_description: salesDescription,
      is_purchased: isPurchased,
      purchase_unit_cost: parseFloat(purchaseUnitCost).toFixed(2),
      purchase_account: purchaseAccountId ? purchaseAccountId : undefined,
      purchase_tax_rate: purchaseTaxRateId ? purchaseTaxRateId : undefined,
      purchase_description: purchaseDescription
    }

    try {
      if (editingItem) {
        if (isMockMode) {
          setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload } : i))
          setIsModalOpen(false)
          setEditingItem(null)
          resetForm()
          return
        }

        const updated = await apiService.updateItem(editingItem.id, payload)
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i))
        setIsModalOpen(false)
        setEditingItem(null)
        resetForm()
      } else {
        if (isMockMode) {
          const newItem: Item = {
            id: `mock-item-${Date.now()}`,
            code,
            name,
            is_sold: isSold,
            sales_unit_price: parseFloat(salesUnitPrice).toFixed(2),
            sales_description: salesDescription,
            is_purchased: isPurchased,
            purchase_unit_cost: parseFloat(purchaseUnitCost).toFixed(2),
            purchase_description: purchaseDescription,
            created_at: new Date().toISOString()
          }
          setItems(prev => [...prev, newItem])
          setIsModalOpen(false)
          resetForm()
          return
        }

        const created = await apiService.createItem(activeOrg.id, payload)
        setItems(prev => [...prev, created])
        setIsModalOpen(false)
        resetForm()
      }
    } catch (e: any) {
      showAlert({ title: 'Error Saving Catalog Item', message: "Failed to save product/service: " + (e.message || "Code must be unique"), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await showConfirm({
      title: 'Remove Catalog Item',
      message: 'Are you sure you want to remove this item from catalog?',
      confirmText: 'Remove',
      isDestructive: true
    })
    if (!confirmed) return
 
    try {
      if (isMockMode) {
        setItems(prev => prev.filter(i => i.id !== itemId))
        return
      }
 
      await apiService.deleteItem(itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (e: any) {
      showAlert({ title: 'Deletion Failed', message: "Deletion failed: " + e.message, type: 'error' })
    }
  }

  const resetForm = () => {
    setCode('')
    setName('')
    setIsSold(true)
    setSalesUnitPrice('0.00')
    setIsPurchased(true)
    setPurchaseUnitCost('0.00')
    setSalesDescription('')
    setPurchaseDescription('')
    
    const revAcc = accounts.find(a => a.class_type === 'Revenue')
    const expAcc = accounts.find(a => a.class_type === 'Expense')
    setSalesAccountId(revAcc ? revAcc.id : '')
    setPurchaseAccountId(expAcc ? expAcc.id : '')
    setSalesTaxRateId('')
    setPurchaseTaxRateId('')
  }

  const handleOpenAdd = () => {
    setEditingItem(null)
    resetForm()
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleEditClick = (item: Item) => {
    setEditingItem(item)
    setCode(item.code)
    setName(item.name)
    setIsSold(item.is_sold)
    setSalesUnitPrice(parseFloat(item.sales_unit_price as any || 0).toFixed(2))
    
    const salesAccId = item.sales_account 
      ? (typeof item.sales_account === 'object' ? (item.sales_account as any).id : item.sales_account)
      : ''
    setSalesAccountId(salesAccId)

    const salesTaxId = item.sales_tax_rate
      ? (typeof item.sales_tax_rate === 'object' ? (item.sales_tax_rate as any).id : item.sales_tax_rate)
      : ''
    setSalesTaxRateId(salesTaxId)

    setSalesDescription(item.sales_description || '')

    setIsPurchased(item.is_purchased)
    setPurchaseUnitCost(parseFloat(item.purchase_unit_cost as any || 0).toFixed(2))

    const purchaseAccId = item.purchase_account
      ? (typeof item.purchase_account === 'object' ? (item.purchase_account as any).id : item.purchase_account)
      : ''
    setPurchaseAccountId(purchaseAccId)

    const purchaseTaxId = item.purchase_tax_rate
      ? (typeof item.purchase_tax_rate === 'object' ? (item.purchase_tax_rate as any).id : item.purchase_tax_rate)
      : ''
    setPurchaseTaxRateId(purchaseTaxId)

    setPurchaseDescription(item.purchase_description || '')
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleRowClick = (e: React.MouseEvent, item: Item) => {
    const target = e.target as HTMLElement
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.no-row-click')
    ) {
      return
    }
    handleEditClick(item)
  }


  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

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

  // Bulk operations
  const handleBulkDelete = async () => {
    const list = Array.from(selectedIds)
    if (list.length === 0) return
 
    const confirmed = await showConfirm({
      title: 'Bulk Delete Items',
      message: `Are you sure you want to permanently delete ${list.length} selected item(s)?`,
      confirmText: 'Delete All',
      isDestructive: true
    })
    if (!confirmed) return
 
    setLoading(true)
    try {
      if (isMockMode) {
        setItems(prev => prev.filter(i => !selectedIds.has(i.id!)))
      } else {
        await Promise.all(list.map(id => apiService.deleteItem(id)))
        setItems(prev => prev.filter(i => !selectedIds.has(i.id!)))
      }
      setSelectedIds(new Set())
    } catch (e: any) {
      showAlert({ title: 'Bulk Deletion Failed', message: "Failed to delete items: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkArchive = () => {
    const nextArchived = new Set(archivedIds)
    const isRestoring = statusFilter === 'Archived'
 
    selectedIds.forEach(id => {
      if (isRestoring) {
        nextArchived.delete(id)
      } else {
        nextArchived.add(id)
      }
    })
 
    setArchivedIds(nextArchived)
    showAlert({
      title: 'Status Updated',
      message: isRestoring ? `Restored ${selectedIds.size} item(s) to active catalog.` : `Archived ${selectedIds.size} item(s).`,
      type: 'success'
    })
    setSelectedIds(new Set())
  }

  const handleBulkToggleProperty = async (property: 'is_sold' | 'is_purchased') => {
    const selectedItems = items.filter(i => selectedIds.has(i.id!))
    if (selectedItems.length === 0) return

    setLoading(true)
    try {
      if (isMockMode) {
        setItems(prev => prev.map(i => {
          if (selectedIds.has(i.id!)) {
            return { ...i, [property]: true }
          }
          return i
        }))
      } else {
        await Promise.all(selectedItems.map(i => {
          if (!i[property]) {
            return apiService.updateItem(i.id!, { [property]: true })
          }
          return Promise.resolve(i)
        }))
        const itemsData = await apiService.getItems(activeOrg.id)
        setItems(itemsData)
      }
      showAlert({ title: 'Properties Updated', message: `Updated selected item(s) to be ${property === 'is_sold' ? 'sellable' : 'purchasable'}.`, type: 'success' })
      setSelectedIds(new Set())
    } catch (e: any) {
      showAlert({ title: 'Update Failed', message: "Failed to update items: " + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Filter items by statusFilter (Active, Sell, Purchase, Archived, All) & Search
  const filteredItems = items.filter(item => {
    const isArchived = archivedIds.has(item.id!)
    
    if (statusFilter === 'Archived') {
      if (!isArchived) return false
    } else {
      if (isArchived) return false
    }

    if (statusFilter === 'Sell') {
      if (!item.is_sold) return false
    } else if (statusFilter === 'Purchase') {
      if (!item.is_purchased) return false
    } else if (statusFilter === 'Active') {
      if (!item.is_sold && !item.is_purchased) return false
    }

    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.sales_description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.purchase_description || '').toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  }).sort((a, b) => {
    if (sortOption === 'name-asc') {
      return a.name.localeCompare(b.name)
    } else if (sortOption === 'name-desc') {
      return b.name.localeCompare(a.name)
    } else if (sortOption === 'sku') {
      return a.code.localeCompare(b.code)
    } else if (sortOption === 'price-high') {
      return parseFloat((b.sales_unit_price || 0) as any) - parseFloat((a.sales_unit_price || 0) as any)
    } else if (sortOption === 'cost-high') {
      return parseFloat((b.purchase_unit_cost || 0) as any) - parseFloat((a.purchase_unit_cost || 0) as any)
    }
    return 0
  })

  const getAccountCodeLabel = (acc: any) => {
    if (!acc) return 'Not mapped'
    if (typeof acc === 'object') return `${acc.code} - ${acc.name}`
    const found = accounts.find(a => a.id === acc)
    return found ? `${found.code} - ${found.name}` : 'Not mapped'
  }

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-4 font-sans text-left">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <Tag className="h-5 w-5 text-[#0F5B38]" />
          <span>Products & Services</span>
        </h2>
        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] transition cursor-pointer shadow-md shadow-emerald-950/10"
        >
          <Plus className="h-4 w-4" />
          <span>New Product / Service</span>
        </button>
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
                onClick={handleBulkArchive}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                {statusFilter === 'Archived' ? 'Restore' : 'Archive'}
              </button>
              <button
                onClick={() => handleBulkToggleProperty('is_sold')}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Sellable
              </button>
              <button
                onClick={() => handleBulkToggleProperty('is_purchased')}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0F5B38] hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                Purchasable
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
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Type:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-[3px] px-3 py-2 text-xs font-semibold text-slate-705 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
            >
              <option value="Active">Active Catalog</option>
              <option value="All">All Items</option>
              <option value="Sell">Sell Only</option>
              <option value="Purchase">Purchase Only</option>
              <option value="Archived">Archived Items</option>
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
              <option value="name-desc">Name (Z-A)</option>
              <option value="sku">SKU Code</option>
              <option value="price-high">Price: High to Low</option>
              <option value="cost-high">Cost: High to Low</option>
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
      ) : filteredItems.length > 0 ? (
        /* Professional borderless table structure (No redundant outer borders) */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id!))}
                    onChange={() => handleToggleSelectAll(filteredItems.map(i => i.id!))}
                    className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5">Item Code</th>
                <th className="px-6 py-2.5">Name</th>
                <th className="px-6 py-2.5">Sales Price</th>
                <th className="px-6 py-2.5">Purchase Price</th>
                <th className="px-6 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={(e) => handleRowClick(e, item)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out ${selectedIds.has(item.id!) ? 'bg-emerald-50/20' : ''} cursor-pointer`}
                >
                  <td className="px-4 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id!)}
                      onChange={() => handleToggleSelect(item.id!)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-6 py-2.5 font-bold text-slate-850">
                    {item.is_sold ? `${currencySymbol}${parseFloat(item.sales_unit_price as any).toFixed(2)}` : <span className="text-slate-350 text-[10px]">Not Sold</span>}
                  </td>
                  <td className="px-6 py-2.5 font-bold text-slate-850">
                    {item.is_purchased ? `${currencySymbol}${parseFloat(item.purchase_unit_cost as any).toFixed(2)}` : <span className="text-slate-350 text-[10px]">Not Purchased</span>}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id!)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition-all cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50/50 rounded-[3px] border border-slate-205 p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">Catalogue is Empty</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
              Add products or corporate service scopes to easily select them during billing, invoice drafts, or purchases.
            </p>
          </div>
        </div>
      )}

      {/* Modern, Glassmorphic Modal overlay for adding Product catalog items */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans flex items-center justify-center py-8">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative transform rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-850">
                  {editingItem ? 'Edit Product / Service' : 'Create Product / Service'}
                </h3>
                <p className="text-[11px] text-slate-450 font-medium">Declare specifications, codes, and map default accounts.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-5 text-xs font-semibold text-slate-605">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Item Code / SKU *</label>
                  <input
                    type="text"
                    placeholder="e.g. SERVICES-01"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Strategy Consultation"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-6 pt-1">
                {/* Sell Configuration */}
                <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-[3px] space-y-4">
                  <div className="flex items-center space-x-2 select-none">
                    <input
                      type="checkbox"
                      id="isSold"
                      checked={isSold}
                      onChange={e => setIsSold(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer"
                    />
                    <label htmlFor="isSold" className="text-slate-850 font-bold text-[13px] cursor-pointer">
                      I sell this item
                    </label>
                  </div>

                  {isSold && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Unit Selling Price ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salesUnitPrice}
                          onChange={e => setSalesUnitPrice(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Sales Revenue Account</label>
                        <select
                          value={salesAccountId}
                          onChange={e => setSalesAccountId(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] cursor-pointer"
                        >
                          <option value="">Select Account...</option>
                          {accounts.filter(a => a.class_type === 'Revenue' || a.class_type === 'Asset').map(a => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Sales Tax Rate</label>
                        <select
                          value={salesTaxRateId}
                          onChange={e => setSalesTaxRateId(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] cursor-pointer"
                        >
                          <option value="">Tax Exempt (0%)</option>
                          {taxRates.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({parseFloat(t.rate)}%)</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Sales Description</label>
                        <textarea
                          placeholder="Description on invoices..."
                          rows={2}
                          value={salesDescription}
                          onChange={e => setSalesDescription(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] resize-none"
                        ></textarea>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buy Configuration */}
                <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-[3px] space-y-4">
                  <div className="flex items-center space-x-2 select-none">
                    <input
                      type="checkbox"
                      id="isPurchased"
                      checked={isPurchased}
                      onChange={e => setIsPurchased(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-455 border-slate-300 rounded-[3px] cursor-pointer"
                    />
                    <label htmlFor="isPurchased" className="text-slate-850 font-bold text-[13px] cursor-pointer">
                      I purchase this item
                    </label>
                  </div>

                  {isPurchased && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Unit Purchase Cost ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={purchaseUnitCost}
                          onChange={e => setPurchaseUnitCost(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Expense Account</label>
                        <select
                          value={purchaseAccountId}
                          onChange={e => setPurchaseAccountId(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] cursor-pointer"
                        >
                          <option value="">Select Account...</option>
                          {accounts.filter(a => a.class_type === 'Expense' || a.class_type === 'Asset').map(a => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Purchase Tax Rate</label>
                        <select
                          value={purchaseTaxRateId}
                          onChange={e => setPurchaseTaxRateId(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] cursor-pointer"
                        >
                          <option value="">Tax Exempt (0%)</option>
                          {taxRates.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({parseFloat(t.rate)}%)</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wide text-[9px]">Purchase Description</label>
                        <textarea
                          placeholder="Description on vendor bills..."
                          rows={2}
                          value={purchaseDescription}
                          onChange={e => setPurchaseDescription(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-[3px] px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] resize-none"
                        ></textarea>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
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
                  {isSubmitting ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
