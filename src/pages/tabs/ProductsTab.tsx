import { useState, useEffect, useRef } from 'react'
import { Plus, Minus, Tag, ShoppingBag, Search, ArrowLeft, Edit3, Archive, ArchiveRestore, FileText, Package } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Item, Account, TaxRate, Invoice, InventoryMovement } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'

interface ProductsTabProps {
  activeOrg: Organization
  onViewInvoice?: (id: string) => void
  onViewBill?: (id: string) => void
  initialViewingItemId?: string | null
}

export function ProductsTab({ activeOrg, onViewInvoice, onViewBill, initialViewingItemId }: ProductsTabProps) {
  const { showConfirm, showAlert } = usePopup()
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [viewingItem, setViewingItem] = useState<Item | null>(null)
  const [accountingMethod, setAccountingMethod] = useState<'accrual' | 'cash'>('accrual')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Sell' | 'Purchase' | 'Deactivated'>('Active')
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc' | 'sku' | 'price-high' | 'cost-high'>('name-asc')

  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const [isSold, setIsSold] = useState(true)
  const [salesUnitPrice, setSalesUnitPrice] = useState('0.00')
  const [salesAccountId, setSalesAccountId] = useState('')
  const [salesTaxRateId, setSalesTaxRateId] = useState('')
  const [salesDescription, setSalesDescription] = useState('')

  const [isPurchased, setIsPurchased] = useState(true)
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('0.00')
  const [purchaseAccountId, setPurchaseAccountId] = useState('')
  const [purchaseTaxRateId, setPurchaseTaxRateId] = useState('')
  const [purchaseDescription, setPurchaseDescription] = useState('')

  const [trackQuantity, setTrackQuantity] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'manual_add' | 'manual_remove'>('manual_add')
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [itemsData, accountsData, taxRatesData, loadedInvoices, loadedBills] = await Promise.all([
        apiService.getItems(activeOrg.id),
        apiService.getAccounts(activeOrg.id),
        apiService.getTaxRates(activeOrg.id),
        apiService.getInvoices(activeOrg.id),
        apiService.getBills(activeOrg.id),
      ])
      setItems(itemsData)
      if (initialViewingItemId) {
        const target = itemsData.find(i => i.id === initialViewingItemId)
        if (target) setViewingItem(target)
      }
      setAccounts(accountsData)
      setTaxRates(taxRatesData)
      setInvoices(loadedInvoices)
      setBills(loadedBills)

      const revAcc = accountsData.find(a => a.class_type === 'Revenue')
      const expAcc = accountsData.find(a => a.class_type === 'Expense')
      if (revAcc) setSalesAccountId(revAcc.id)
      if (expAcc) setPurchaseAccountId(expAcc.id)
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load products.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter])

  useEffect(() => {
    if (!viewingItem?.track_quantity) {
      setMovements([])
      return
    }
    setMovementsLoading(true)
    apiService.getItemMovements(activeOrg.id, viewingItem.id)
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => setMovementsLoading(false))
  }, [viewingItem?.id])

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewingItem) return
    const qty = parseFloat(adjustQuantity)
    if (!qty || qty <= 0) {
      showAlert({ title: 'Validation', message: 'Quantity must be a positive number.', type: 'warning' })
      return
    }
    setIsAdjusting(true)
    try {
      const updated = await apiService.adjustItemStock(activeOrg.id, viewingItem.id, {
        type: adjustType,
        quantity: qty,
        notes: adjustNotes,
      })
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      setViewingItem(updated)
      const mvs = await apiService.getItemMovements(activeOrg.id, updated.id)
      setMovements(mvs)
      setIsAdjustModalOpen(false)
      setAdjustQuantity('')
      setAdjustNotes('')
      showAlert({ title: 'Stock Adjusted', message: `New quantity on hand: ${Number(updated.quantity_on_hand).toFixed(4)}`, type: 'success' })
    } catch (e: unknown) {
      showAlert({ title: 'Error', message: (e as Error).message, type: 'error' })
    } finally {
      setIsAdjusting(false)
    }
  }

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const handleToggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) visibleIds.forEach(id => next.delete(id))
    else visibleIds.forEach(id => next.add(id))
    setSelectedIds(next)
  }

  const handleBulkDeactivate = async () => {
    const list = Array.from(selectedIds)
    if (list.length === 0) return

    const isReactivating = statusFilter === 'Deactivated'
    const confirmed = await showConfirm({
      title: isReactivating ? 'Reactivate Selected' : 'Deactivate Selected',
      message: isReactivating
        ? `Reactivate ${list.length} selected item(s)?`
        : `Deactivate ${list.length} selected item(s)? Historical line items are preserved.`,
      confirmText: isReactivating ? 'Reactivate' : 'Deactivate',
      isDestructive: !isReactivating
    })
    if (!confirmed) return

    setLoading(true)
    try {
      const newStatus = isReactivating
      await Promise.all(list.map(id => apiService.patchItem(id, { is_active: newStatus }, activeOrg.id)))
      setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, is_active: newStatus } : i))
      setSelectedIds(new Set())
      showAlert({
        title: isReactivating ? 'Items Reactivated' : 'Items Deactivated',
        message: `${list.length} item(s) ${isReactivating ? 'reactivated' : 'deactivated'}.`,
        type: 'success'
      })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isModalOpen && lastActiveElementRef.current) {
      const el = lastActiveElementRef.current
      setTimeout(() => {
        if (el && document.body.contains(el)) el.focus()
      }, 50)
      lastActiveElementRef.current = null
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
      sales_unit_price: parseFloat(salesUnitPrice),
      sales_account: salesAccountId ? salesAccountId : undefined,
      sales_tax_rate: salesTaxRateId ? salesTaxRateId : undefined,
      sales_description: salesDescription,
      is_purchased: isPurchased,
      purchase_unit_cost: parseFloat(purchaseUnitCost),
      purchase_account: purchaseAccountId ? purchaseAccountId : undefined,
      purchase_tax_rate: purchaseTaxRateId ? purchaseTaxRateId : undefined,
      purchase_description: purchaseDescription,
      track_quantity: trackQuantity,
    }

    try {
      if (editingItem) {
        const updated = await apiService.updateItem(editingItem.id, payload, activeOrg.id)
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i))
        if (viewingItem?.id === editingItem.id) setViewingItem(updated)
        setIsModalOpen(false)
        setEditingItem(null)
        resetForm()
      } else {
        const created = await apiService.createItem(activeOrg.id, payload)
        setItems(prev => [...prev, created])
        setIsModalOpen(false)
        resetForm()
      }
    } catch (e: any) {
      showAlert({ title: 'Error Saving Catalog Item', message: 'Failed to save product/service: ' + (e.message || 'Code must be unique'), type: 'error' })
    } finally {
      setIsSubmitting(false)
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
    setTrackQuantity(false)

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
    setSalesUnitPrice(Number(item.sales_unit_price || 0).toFixed(2))

    const salesAccId = item.sales_account
      ? (typeof item.sales_account === 'object' ? (item.sales_account as { id: string }).id : item.sales_account)
      : ''
    setSalesAccountId(salesAccId)

    const salesTaxId = item.sales_tax_rate
      ? (typeof item.sales_tax_rate === 'object' ? (item.sales_tax_rate as { id: string }).id : item.sales_tax_rate)
      : ''
    setSalesTaxRateId(salesTaxId)

    setSalesDescription(item.sales_description || '')
    setIsPurchased(item.is_purchased)
    setPurchaseUnitCost(Number(item.purchase_unit_cost || 0).toFixed(2))

    const purchaseAccId = item.purchase_account
      ? (typeof item.purchase_account === 'object' ? (item.purchase_account as { id: string }).id : item.purchase_account)
      : ''
    setPurchaseAccountId(purchaseAccId)

    const purchaseTaxId = item.purchase_tax_rate
      ? (typeof item.purchase_tax_rate === 'object' ? (item.purchase_tax_rate as { id: string }).id : item.purchase_tax_rate)
      : ''
    setPurchaseTaxRateId(purchaseTaxId)

    setPurchaseDescription(item.purchase_description || '')
    setTrackQuantity(item.track_quantity || false)
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
    ) return
    setViewingItem(item)
  }

  const handleDeactivate = async (item: Item) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Item',
      message: `Deactivate "${item.name}"? It will be hidden from item dropdowns but historical line items on invoices and bills are preserved.`,
      confirmText: 'Deactivate',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      const updated = await apiService.patchItem(item.id, { is_active: false }, activeOrg.id)
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setViewingItem(updated)
      showAlert({ title: 'Item Deactivated', message: `${item.name} has been deactivated.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const handleReactivate = async (item: Item) => {
    try {
      const updated = await apiService.patchItem(item.id, { is_active: true }, activeOrg.id)
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setViewingItem(updated)
      showAlert({ title: 'Item Restored', message: `${item.name} is now active.`, type: 'success' })
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' })
    }
  }

  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  const filteredItems = items.filter(item => {
    if (statusFilter === 'Deactivated') {
      if (item.is_active !== false) return false
    } else {
      if (item.is_active === false) return false
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
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name)
    if (sortOption === 'name-desc') return b.name.localeCompare(a.name)
    if (sortOption === 'sku') return a.code.localeCompare(b.code)
    if (sortOption === 'price-high') return Number(b.sales_unit_price || 0) - Number(a.sales_unit_price || 0)
    if (sortOption === 'cost-high') return Number(b.purchase_unit_cost || 0) - Number(a.purchase_unit_cost || 0)
    return 0
  })

  const getAccountCodeLabel = (acc: any) => {
    if (!acc) return 'Not mapped'
    if (typeof acc === 'object') return `${acc.code} - ${acc.name}`
    const found = accounts.find(a => a.id === acc)
    return found ? `${found.code} - ${found.name}` : 'Not mapped'
  }

  if (viewingItem) {
    const matchStatus = accountingMethod === 'cash'
      ? (s: string) => s === 'Paid'
      : (s: string) => s !== 'Draft'
    const itemInvoices = invoices.filter(inv =>
      matchStatus(inv.status) && inv.lines?.some((line: any) => line.item === viewingItem.id)
    )
    const itemBills = bills.filter(bill =>
      matchStatus(bill.status) && bill.lines?.some((line: any) => line.item === viewingItem.id)
    )

    const totalSales = itemInvoices.reduce((sum, inv) => {
      const lines = inv.lines?.filter((l: any) => l.item === viewingItem.id) || []
      return sum + lines.reduce((s: number, l: any) => s + Number(l.total || 0), 0)
    }, 0)

    const totalPurchases = itemBills.reduce((sum, bill) => {
      const lines = bill.lines?.filter((l: any) => l.item === viewingItem.id) || []
      return sum + lines.reduce((s: number, l: any) => s + Number(l.total || 0), 0)
    }, 0)

    const transactions = [
      ...itemInvoices.map((i: any) => ({ id: i.id, date: i.date, number: i.invoice_number, reference: i.reference, type: 'Invoice', amount: Number(i.total), status: i.status })),
      ...itemBills.map((b: any) => ({ id: b.id, date: b.date, number: b.bill_number, reference: b.reference, type: 'Bill', amount: Number(b.total), status: b.status }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
      <div className="space-y-6 font-sans text-left animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewingItem(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-[3px] border border-slate-200 cursor-pointer select-none transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Products & Services</span>
            </button>
            <span className="text-slate-350">/</span>
            <span className="text-[#0F5B38] text-xs font-bold">{viewingItem.name}</span>
            {viewingItem.is_active === false && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">Inactive</span>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleEditClick(viewingItem)}
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Item</span>
            </button>
            {viewingItem.is_active !== false ? (
              <button
                onClick={() => handleDeactivate(viewingItem)}
                className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200/50 hover:bg-amber-100/60 text-amber-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Deactivate</span>
              </button>
            ) : (
              <button
                onClick={() => handleReactivate(viewingItem)}
                className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                <span>Reactivate</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-800">{viewingItem.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {viewingItem.code} · {viewingItem.is_sold && viewingItem.is_purchased ? 'Buy & Sell' : viewingItem.is_sold ? 'For Sale' : 'For Purchase'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
              {viewingItem.is_sold && (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Sales Price</span>
                    <span className="font-bold text-[#0F5B38] text-sm">{currencySymbol}{Number(viewingItem.sales_unit_price).toFixed(2)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Sales Account</span>
                    <span className="font-semibold text-slate-700">{getAccountCodeLabel(viewingItem.sales_account)}</span>
                  </div>
                  {viewingItem.sales_description && (
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Sales Description</span>
                      <span className="font-semibold text-slate-600 italic">{viewingItem.sales_description}</span>
                    </div>
                  )}
                </>
              )}
              {viewingItem.is_purchased && (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Purchase Cost</span>
                    <span className="font-bold text-slate-800 text-sm">{currencySymbol}{Number(viewingItem.purchase_unit_cost).toFixed(2)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Purchase Account</span>
                    <span className="font-semibold text-slate-700">{getAccountCodeLabel(viewingItem.purchase_account)}</span>
                  </div>
                  {viewingItem.purchase_description && (
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Purchase Description</span>
                      <span className="font-semibold text-slate-600 italic">{viewingItem.purchase_description}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2 space-y-2">
              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Usage Summary</h4>
              <div className="flex items-center bg-slate-100 rounded-[3px] p-0.5 w-fit">
                <button
                  onClick={() => setAccountingMethod('accrual')}
                  className={`text-[9px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-[2px] transition ${accountingMethod === 'accrual' ? 'bg-white text-[#0F5B38] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >Accrual</button>
                <button
                  onClick={() => setAccountingMethod('cash')}
                  className={`text-[9px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-[2px] transition ${accountingMethod === 'cash' ? 'bg-white text-[#0F5B38] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >Cash</button>
              </div>
            </div>
            <div className="space-y-3.5 py-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#0F5B38] rounded-full"></div>
                  <span className="text-slate-500 font-semibold">{accountingMethod === 'cash' ? 'Cash Received (Sales)' : 'Invoiced (Sales)'}</span>
                </div>
                <span className="font-extrabold text-slate-800">
                  {currencySymbol}{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-rose-600 rounded-full"></div>
                  <span className="text-slate-500 font-semibold">{accountingMethod === 'cash' ? 'Cash Paid (Purchases)' : 'Billed (Purchases)'}</span>
                </div>
                <span className="font-extrabold text-slate-800">
                  {currencySymbol}{totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
                <span className="text-slate-800 font-black">Documents</span>
                <span className="font-black text-slate-800">{transactions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {viewingItem.track_quantity && (
          <div className="bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-[#0F5B38]" />
                <h3 className="text-sm font-bold text-slate-800">Inventory</h3>
              </div>
              <button
                onClick={() => {
                  setAdjustType('manual_add')
                  setAdjustQuantity('')
                  setAdjustNotes('')
                  setIsAdjustModalOpen(true)
                }}
                className="flex items-center space-x-1.5 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-3 py-1.5 rounded-[3px] transition cursor-pointer shadow-sm shadow-emerald-950/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adjust Stock</span>
              </button>
            </div>

            <div className="flex items-center space-x-8 py-2">
              <div>
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Quantity on Hand</span>
                <span className={`font-extrabold text-2xl mt-0.5 block ${Number(viewingItem.quantity_on_hand ?? 0) < 0 ? 'text-rose-600' : 'text-[#0F5B38]'}`}>
                  {Number(viewingItem.quantity_on_hand ?? 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Movement History</h4>
              {movementsLoading ? (
                <div className="text-xs text-slate-400 py-4 text-center font-medium">Loading history...</div>
              ) : movements.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center font-medium">No movements yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Change</th>
                        <th className="p-2.5 text-right">On Hand After</th>
                        <th className="p-2.5">Reference</th>
                        <th className="p-2.5">Notes</th>
                        <th className="p-2.5">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {movements.map(mv => {
                        const isPositive = Number(mv.quantity_change) >= 0
                        const typeLabel: Record<string, string> = {
                          sale: 'Sale', purchase: 'Purchase',
                          manual_add: 'Manual Add', manual_remove: 'Manual Remove',
                        }
                        return (
                          <tr key={mv.id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 whitespace-nowrap text-slate-500">
                              {new Date(mv.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                mv.movement_type === 'sale' ? 'bg-rose-50 text-rose-600' :
                                mv.movement_type === 'purchase' ? 'bg-emerald-50 text-emerald-600' :
                                mv.movement_type === 'manual_add' ? 'bg-blue-50 text-blue-600' :
                                'bg-amber-50 text-amber-600'
                              }`}>
                                {typeLabel[mv.movement_type] ?? mv.movement_type}
                              </span>
                            </td>
                            <td className={`p-2.5 text-right font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isPositive ? '+' : ''}{Number(mv.quantity_change).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800">
                              {Number(mv.quantity_after).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-slate-500 text-[10px]">
                              {mv.reference_type}{mv.reference_id ? ` #${mv.reference_id.slice(0, 8)}` : ''}
                            </td>
                            <td className="p-2.5 text-slate-400 italic">
                              {mv.notes || '—'}
                            </td>
                            <td className="p-2.5 text-slate-400">
                              {mv.created_by_name || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[3px] border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Linked Documents</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {accountingMethod === 'cash' ? 'Cash basis — paid transactions only.' : 'Accrual basis — all invoiced & billed transactions.'}
              </p>
            </div>
            <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border ${accountingMethod === 'cash' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {accountingMethod === 'cash' ? 'Cash Basis' : 'Accrual Basis'}
            </span>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Document ID</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactions.map(tx => {
                    const isInvoice = tx.type === 'Invoice'
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => {
                          if (isInvoice && onViewInvoice) onViewInvoice(tx.id)
                          else if (!isInvoice && onViewBill) onViewBill(tx.id)
                        }}
                        className="hover:bg-emerald-50/25 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="p-3 whitespace-nowrap text-slate-600">{tx.date}</td>
                        <td className="p-3 font-bold text-[#0F5B38]">{tx.number}</td>
                        <td className="p-3 text-slate-400 italic">{tx.reference || '—'}</td>
                        <td className="p-3">
                          <span className="flex items-center space-x-1.5 text-slate-600">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span>{isInvoice ? 'Sales Invoice' : 'Vendor Bill'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {currencySymbol}{tx.amount.toFixed(2)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                            tx.status === 'Awaiting Payment' ? 'bg-amber-50 text-amber-600 border border-amber-100/30' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              if (isInvoice && onViewInvoice) onViewInvoice(tx.id)
                              else if (!isInvoice && onViewBill) onViewBill(tx.id)
                            }}
                            className="hover:bg-emerald-50 text-[#0F5B38] rounded-[3px] transition cursor-pointer text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              This item has not been used in any invoices or bills yet.
            </div>
          )}
        </div>

        {isAdjustModalOpen && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans flex items-center justify-center py-8">
            <div className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" onClick={() => setIsAdjustModalOpen(false)}></div>
            <div className="relative transform rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-850">Adjust Stock</h3>
                  <p className="text-[11px] text-slate-450 font-medium mt-0.5">{viewingItem.name}</p>
                </div>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition"
                >✕</button>
              </div>
              <form onSubmit={handleAdjust} className="space-y-4 text-xs font-semibold text-slate-605">
                <div className="flex items-center bg-slate-100 rounded-[3px] p-0.5 w-fit">
                  <button
                    type="button"
                    onClick={() => setAdjustType('manual_add')}
                    className={`flex items-center space-x-1.5 text-[9px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-[2px] transition ${adjustType === 'manual_add' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Plus className="h-3 w-3" /><span>Add Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('manual_remove')}
                    className={`flex items-center space-x-1.5 text-[9px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-[2px] transition ${adjustType === 'manual_remove' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Minus className="h-3 w-3" /><span>Remove Stock</span>
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Quantity *</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    placeholder="e.g. 10"
                    value={adjustQuantity}
                    onChange={e => setAdjustQuantity(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Notes</label>
                  <textarea
                    placeholder="Reason for adjustment..."
                    rows={2}
                    value={adjustNotes}
                    onChange={e => setAdjustNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition resize-none placeholder:text-slate-350"
                  />
                </div>
                <div className="bg-slate-50 rounded-[3px] p-3 text-xs text-slate-600">
                  <span className="font-semibold">Current stock:</span>{' '}
                  <span className="font-extrabold text-slate-800">{Number(viewingItem.quantity_on_hand ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex space-x-3 pt-2 justify-end border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    className={`px-5 py-2.5 text-white rounded-[3px] shadow-lg cursor-pointer disabled:opacity-50 transition text-xs font-medium ${adjustType === 'manual_add' ? 'bg-[#0F5B38] hover:brightness-105 shadow-emerald-950/15' : 'bg-rose-600 hover:brightness-105 shadow-rose-950/15'}`}
                  >
                    {isAdjusting ? 'Saving...' : adjustType === 'manual_add' ? 'Add Stock' : 'Remove Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans flex items-center justify-center py-8">
            <div className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative transform rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn max-h-[85vh] overflow-y-auto">
              {renderModalContent()}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderModalContent() {
    return (
      <>
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
            <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-[3px] space-y-4">
              <div className="flex items-center space-x-2 select-none">
                <input
                  type="checkbox"
                  id="isSold"
                  checked={isSold}
                  onChange={e => setIsSold(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer"
                />
                <label htmlFor="isSold" className="text-slate-850 font-bold text-[13px] cursor-pointer">I sell this item</label>
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
                        <option key={t.id} value={t.id}>{t.name}</option>
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

            <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-[3px] space-y-4">
              <div className="flex items-center space-x-2 select-none">
                <input
                  type="checkbox"
                  id="isPurchased"
                  checked={isPurchased}
                  onChange={e => setIsPurchased(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-455 border-slate-300 rounded-[3px] cursor-pointer"
                />
                <label htmlFor="isPurchased" className="text-slate-850 font-bold text-[13px] cursor-pointer">I purchase this item</label>
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
                        <option key={t.id} value={t.id}>{t.name}</option>
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

          <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-[3px]">
            <div className="flex items-center space-x-2 select-none">
              <input
                type="checkbox"
                id="trackQuantity"
                checked={trackQuantity}
                onChange={e => setTrackQuantity(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-450 border-slate-300 rounded-[3px] cursor-pointer"
              />
              <label htmlFor="trackQuantity" className="text-slate-850 font-bold text-[13px] cursor-pointer flex items-center space-x-1.5">
                <Package className="h-3.5 w-3.5 text-slate-500" />
                <span>Track inventory quantity</span>
              </label>
            </div>
            {trackQuantity && (
              <p className="text-[10px] text-slate-450 font-medium mt-2 ml-6">
                Stock will increase when a Bill is marked Paid, and decrease when an Invoice is marked Paid.
              </p>
            )}
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
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </>
    )
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

      {/* Filter & Search Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-0 border-b border-slate-200/60 gap-4">
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
        </div>

        <div className="flex flex-wrap items-end gap-3 pb-0 mb-[2px]">
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-1.5 animate-fadeIn text-xs font-semibold">
              <button
                onClick={handleBulkDeactivate}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-slate-300 rounded-[3px] shadow-sm transition cursor-pointer"
              >
                {statusFilter === 'Deactivated' ? 'Reactivate Selected' : 'Deactivate Selected'}
              </button>
              <span className="text-[11px] text-slate-400 font-bold px-1 whitespace-nowrap hidden lg:inline">
                {selectedIds.size} selected
              </span>
            </div>
          )}

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
              <option value="Deactivated">Deactivated Items</option>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id))}
                    onChange={() => handleToggleSelectAll(filteredItems.map(i => i.id))}
                    className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5">Item Code</th>
                <th className="px-6 py-2.5">Name</th>
                <th className="px-6 py-2.5">Sales Price</th>
                <th className="px-6 py-2.5">Purchase Price</th>
                <th className="px-6 py-2.5">Stock on Hand</th>
                <th className="px-6 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={(e) => handleRowClick(e, item)}
                  className={`hover:bg-emerald-50/30 transition-colors duration-150 ease-in-out cursor-pointer ${selectedIds.has(item.id) ? 'bg-emerald-50/20' : ''}`}
                >
                  <td className="px-4 py-2.5 w-10 text-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      className="rounded-[3px] border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] h-3.5 w-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 text-[13px]">
                    <span className="font-bold text-[#0F5B38] hover:underline">{item.code}</span>
                  </td>
                  <td className="px-6 py-2.5 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-6 py-2.5 font-bold text-slate-850">
                    {item.is_sold ? `${currencySymbol}${Number(item.sales_unit_price).toFixed(2)}` : <span className="text-slate-350 text-[10px]">Not Sold</span>}
                  </td>
                  <td className="px-6 py-2.5 font-bold text-slate-850">
                    {item.is_purchased ? `${currencySymbol}${Number(item.purchase_unit_cost).toFixed(2)}` : <span className="text-slate-350 text-[10px]">Not Purchased</span>}
                  </td>
                  <td className="px-6 py-2.5">
                    {item.track_quantity ? (
                      <span className="font-bold text-slate-800">{Number(item.quantity_on_hand ?? 0).toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-350 text-[10px]">Not tracked</span>
                    )}
                  </td>
                  <td className="px-6 py-2.5">
                    {item.is_active === false ? (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
                    ) : (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                    )}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans flex items-center justify-center py-8">
          <div
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative transform rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn max-h-[85vh] overflow-y-auto">
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  )
}
