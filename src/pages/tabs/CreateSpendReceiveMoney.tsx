import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Account, Contact, TaxRate, Item } from '../../services/api'
import { SearchableInput } from '../../components/SearchableInput'
import { usePopup } from '../../components/PopupProvider'
import { XeroDatePicker } from '../../components/XeroDatePicker'

interface CreateSpendReceiveMoneyProps {
  type: 'Spend' | 'Receive'
  activeOrg: Organization
  setActiveTab: (tab: any) => void
}

interface LineFormItem {
  id: string
  itemId: string
  description: string
  quantity: number | ''
  unitPrice: number | ''
  accountId: string
  taxRateId: string
}

export function CreateSpendReceiveMoney({
  type,
  activeOrg,
  setActiveTab
}: CreateSpendReceiveMoneyProps) {
  const { showAlert } = usePopup()
  
  // Data loading states
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step wizard state
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedBankId, setSelectedBankId] = useState('')

  // Form Fields
  const [selectedContactId, setSelectedContactId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')
  const [taxType, setTaxType] = useState<'Inclusive' | 'Exclusive'>('Exclusive')
  const [currency, setCurrency] = useState(activeOrg.currency || 'USD')
  const [lines, setLines] = useState<LineFormItem[]>([
    { id: '1', itemId: '', description: '', quantity: '', unitPrice: '', accountId: '', taxRateId: '' }
  ])

  const loadData = async () => {
    setLoading(true)
    try {
      let loadedBanks: Account[] = []
      let loadedContacts: Contact[] = []
      let loadedAccounts: Account[] = []
      let loadedTaxRates: TaxRate[] = []
      let loadedCatalog: Item[] = []

      const [allAccounts, allContacts, allTaxRates, allItems] = await Promise.all([
        apiService.getAccounts(activeOrg.id),
        apiService.getContacts(activeOrg.id),
        apiService.getTaxRates(activeOrg.id),
        apiService.getItems(activeOrg.id)
      ])
      loadedBanks = allAccounts.filter(a => a.type === 'Bank' || a.class_type === 'Asset' && a.code === '090')
      loadedContacts = allContacts
      loadedAccounts = allAccounts
      loadedTaxRates = allTaxRates
      loadedCatalog = allItems.filter((i: Item) => type === 'Spend' ? i.is_purchased : i.is_sold)

      setBankAccounts(loadedBanks)
      setContacts(loadedContacts)
      setAccounts(loadedAccounts)
      setTaxRates(loadedTaxRates)
      setCatalogItems(loadedCatalog)

      if (loadedBanks.length > 0) {
        setSelectedBankId(loadedBanks[0].id)
      }

      // Initialize default account for lines
      const defaultAcc = loadedAccounts.find(a => type === 'Spend' ? (a.class_type === 'Expense' || a.type === 'Direct Costs') : a.class_type === 'Revenue')?.id || loadedAccounts[0]?.id || ''
      const defaultTax = loadedTaxRates[0]?.id || ''
      setLines([{ id: '1', itemId: '', description: '', quantity: '', unitPrice: '', accountId: defaultAcc, taxRateId: defaultTax }])

    } catch { } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeOrg.id, type])

  const updateLineField = (index: number, field: keyof LineFormItem, value: any) => {
    const updated = [...lines]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setLines(updated)
  }

  const handleCatalogSelect = (index: number, itemId: string) => {
    const updated = [...lines]
    if (!itemId) {
      updated[index].itemId = ''
      setLines(updated)
      return
    }

    const targetItem = catalogItems.find(i => i.id === itemId)
    if (!targetItem) return

    updated[index].itemId = itemId
    if (type === 'Spend') {
      updated[index].description = targetItem.purchase_description || targetItem.name
      updated[index].unitPrice = Number(targetItem.purchase_unit_cost)
      if (targetItem.purchase_account) updated[index].accountId = targetItem.purchase_account
      if (targetItem.purchase_tax_rate) updated[index].taxRateId = targetItem.purchase_tax_rate
    } else {
      updated[index].description = targetItem.sales_description || targetItem.name
      updated[index].unitPrice = Number(targetItem.sales_unit_price)
      if (targetItem.sales_account) updated[index].accountId = targetItem.sales_account
      if (targetItem.sales_tax_rate) updated[index].taxRateId = targetItem.sales_tax_rate
    }

    if (!updated[index].quantity || Number(updated[index].quantity) <= 0) {
      updated[index].quantity = 1
    }

    setLines(updated)
  }

  const addLineItem = () => {
    const defaultAcc = accounts.find(a => type === 'Spend' ? a.class_type === 'Expense' : a.class_type === 'Revenue')?.id || accounts[0]?.id || ''
    const defaultTax = taxRates[0]?.id || ''
    setLines([...lines, {
      id: String(Date.now()),
      itemId: '',
      description: '',
      quantity: '',
      unitPrice: '',
      accountId: defaultAcc,
      taxRateId: defaultTax
    }])
  }

  const removeLineItem = (index: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, idx) => idx !== index))
  }

  // Calculations
  const getSubtotal = () => {
    return lines.reduce((sum, line) => {
      const q = line.quantity === '' ? 0 : Number(line.quantity)
      const u = line.unitPrice === '' ? 0 : Number(line.unitPrice)
      return sum + (q * u)
    }, 0)
  }

  const getTaxTotal = () => {
    return lines.reduce((sum, line) => {
      const q = line.quantity === '' ? 0 : Number(line.quantity)
      const u = line.unitPrice === '' ? 0 : Number(line.unitPrice)
      const rateObj = taxRates.find(t => t.id === line.taxRateId)
      const rateVal = rateObj ? Number(rateObj.rate) : 0
      return sum + (q * u * (rateVal / 100))
    }, 0)
  }

  const getGrandTotal = () => {
    return getSubtotal() + getTaxTotal()
  }

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContactId) {
      showAlert({ title: 'Validation Warning', message: 'Please select a contact.', type: 'warning' })
      return
    }

    const emptyLines = lines.some(l => l.quantity === '' || Number(l.quantity) <= 0 || !l.accountId)
    if (emptyLines) {
      showAlert({ title: 'Validation Warning', message: 'All rows must contain valid quantities and ledger account selections.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      const totalAmt = getGrandTotal()

      showAlert({
        title: 'Success',
        message: `Successfully recorded ${type} Money transaction of ${activeOrg.currency || 'USD'} ${totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
        type: 'success'
      })
      setActiveTab('BankAccounts')
    } catch (err: any) {
      showAlert({ title: 'Error', message: `Failed to record transaction: ` + err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId)
  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  const contactOptions = contacts.map(c => ({
    value: c.id,
    label: `${c.name}${c.email ? ` (${c.email})` : ''}`
  }))

  const catalogOptions = [
    { value: '', label: '' },
    ...catalogItems.map(item => ({
      value: item.id,
      label: `${item.code} - ${item.name}`
    }))
  ]

  const getCategorizedAccountOptions = (accountsList: Account[]) => {
    const sales = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Revenue')
    const directCosts = accountsList.filter(a => a.type !== 'Bank' && a.type === 'Direct Costs')
    const expenses = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Expense' && a.type !== 'Direct Costs')
    const assets = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Asset')
    const liabilities = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Liability')
    const equity = accountsList.filter(a => a.type !== 'Bank' && a.class_type === 'Equity')

    const options: { value: string; label: string; isHeader?: boolean }[] = []

    if (sales.length > 0) {
      options.push({ value: 'header-sales', label: 'Sales / Revenue', isHeader: true })
      sales.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (directCosts.length > 0) {
      options.push({ value: 'header-dc', label: 'Direct Costs', isHeader: true })
      directCosts.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (expenses.length > 0) {
      options.push({ value: 'header-expenses', label: 'Expenses', isHeader: true })
      expenses.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (assets.length > 0) {
      options.push({ value: 'header-assets', label: 'Assets', isHeader: true })
      assets.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (liabilities.length > 0) {
      options.push({ value: 'header-liabilities', label: 'Liabilities', isHeader: true })
      liabilities.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }
    if (equity.length > 0) {
      options.push({ value: 'header-equity', label: 'Equity', isHeader: true })
      equity.forEach(a => options.push({ value: a.id, label: `${a.code} - ${a.name}` }))
    }

    return options
  }

  const accountOptions = getCategorizedAccountOptions(accounts)

  const taxOptions = taxRates.map(t => ({
    value: t.id,
    label: `${t.name} (${t.rate}%)`
  }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="flex space-x-2 justify-center items-center">
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-3 w-3 bg-[#0F5B38] rounded-full animate-bounce"></div>
        </div>
        <p className="text-slate-500 text-xs font-semibold tracking-wider">Syncing bank ledger parameters...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left font-sans w-full px-4 sm:px-6 lg:px-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
        <button
          onClick={() => {
            if (step === 2) setStep(1)
            else setActiveTab('BankAccounts')
          }}
          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-[3px] transition duration-200 cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <span className="text-[10px] text-slate-400 font-normal uppercase tracking-widest block">Banking Ledger</span>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {type} Money {selectedBank && step === 2 ? `via ${selectedBank.name}` : ''}
          </h2>
        </div>
      </div>

      {step === 1 ? (
        /* STEP 1: SELECT BANK ACCOUNT */
        <div className="max-w-md mx-auto bg-white rounded-[3px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Select Bank Account</h3>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Which account would you like to {type.toLowerCase()} money from?</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Bank Account *</label>
              <select
                value={selectedBankId}
                onChange={e => setSelectedBankId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-3.5 py-2.5 font-semibold text-slate-800 focus:outline-none focus:border-[#0F5B38] cursor-pointer"
              >
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (selectedBankId) setStep(2)
                else showAlert({ title: 'Select Bank', message: 'Please select a bank account to proceed.', type: 'warning' })
              }}
              className="w-full bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs py-2.5 rounded-[3px] shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>Next</span>
            </button>
          </div>
        </div>
      ) : (
        /* STEP 2: DETAILS GRID */
        <form onSubmit={handleSaveTransaction} className="space-y-6">
          <div className="bg-white rounded-[3px] border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Contact */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Contact (Supplier/Customer) *</label>
                <SearchableInput
                  options={contactOptions}
                  value={selectedContactId}
                  onChange={setSelectedContactId}
                  placeholder=""
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition cursor-pointer"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transaction Date *</label>
                <XeroDatePicker value={date} onChange={setDate} />
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Reference / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Office supplies purchase"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition h-[38px]"
                />
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition h-[38px] cursor-pointer"
                >
                  <option value="SGD">SGD (S$)</option>
                  <option value="PKR">PKR (₨)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>

              {/* Tax Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tax Allocation</label>
                <select
                  value={taxType}
                  onChange={e => setTaxType(e.target.value as any)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-[3px] px-3.5 py-2 text-[15px] font-normal focus:outline-none focus:border-[#0F5B38] transition h-[38px] cursor-pointer"
                >
                  <option value="Exclusive">Tax Exclusive</option>
                  <option value="Inclusive">Tax Inclusive</option>
                </select>
              </div>
            </div>

            {/* Symmetrical Lines Items Table Grid */}
            <div className="space-y-3.5 pt-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block border-b border-slate-100 pb-2">
                Line Items Catalog Ledger
              </span>

              <div className="border border-slate-200 rounded-[3px] overflow-visible bg-slate-50/10">
                <table className="w-full border-collapse border border-slate-200 text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="p-2 border border-slate-200 w-[20%]">Item</th>
                      <th className="p-2 border border-slate-200 w-[25%]">Description</th>
                      <th className="p-2 border border-slate-200 text-center w-[7%]">Qty</th>
                      <th className="p-2 border border-slate-200 text-right w-[10%]">Unit Price</th>
                      <th className="p-2 border border-slate-200 w-[18%]">Account</th>
                      <th className="p-2 border border-slate-200 w-[12%]">Tax Rate</th>
                      <th className="p-2 border border-slate-200 text-right w-[10%]">Amount</th>
                      <th className="p-2 border border-slate-200 text-center w-[6%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-normal text-slate-700">
                    {lines.map((line, index) => {
                      const q = line.quantity === '' ? 0 : Number(line.quantity)
                      const u = line.unitPrice === '' ? 0 : Number(line.unitPrice)
                      const computedLineTotal = q * u

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/30 transition-colors">
                          {/* Item Searchable Select */}
                          <td className="p-0 border border-slate-200 align-middle">
                            <SearchableInput
                              options={catalogOptions}
                              value={line.itemId}
                              onChange={(val) => handleCatalogSelect(index, val)}
                              placeholder=""
                              className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Description */}
                          <td className="p-0 border border-slate-200 align-middle">
                            <input
                              type="text"
                              value={line.description}
                              onChange={e => updateLineField(index, 'description', e.target.value)}
                              placeholder=""
                              required
                              className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0"
                            />
                          </td>

                          {/* Qty */}
                          <td className="p-0 border border-slate-200 align-middle">
                            <input
                              type="number"
                              step="any"
                              value={line.quantity}
                              onChange={e => updateLineField(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder=""
                              required
                              className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal text-center focus:outline-none focus:ring-0"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="p-0 border border-slate-200 align-middle">
                            <input
                              type="number"
                              step="any"
                              value={line.unitPrice}
                              onChange={e => updateLineField(index, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder=""
                              required
                              className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal text-right focus:outline-none focus:ring-0"
                            />
                          </td>

                          {/* Ledger Account */}
                          <td className="p-0 border border-slate-200 align-middle">
                            <SearchableInput
                              options={accountOptions}
                              value={line.accountId}
                              onChange={(val) => updateLineField(index, 'accountId', val)}
                              placeholder=""
                              className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Tax Rate */}
                          <td className="p-0 border border-slate-200 align-middle">
                            <SearchableInput
                              options={taxOptions}
                              value={line.taxRateId}
                              onChange={(val) => updateLineField(index, 'taxRateId', val)}
                              placeholder=""
                              className="w-full bg-transparent text-slate-800 border-none rounded-none px-2.5 py-2.5 text-xs font-normal focus:outline-none focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Total */}
                          <td className="px-2.5 py-2.5 border border-slate-200 align-middle text-right font-normal text-slate-800 text-[12px]">
                            {currencySymbol}{computedLineTotal.toFixed(2)}
                          </td>

                          {/* Actions (Trash & Plus) */}
                          <td className="p-0 border border-slate-200 align-middle text-center">
                            <div className="flex items-center justify-center space-x-1.5 px-2">
                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                className={`p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition cursor-pointer inline-flex items-center justify-center ${
                                  lines.length === 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : ''
                                }`}
                                title="Remove item line"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={addLineItem}
                                className="p-2 hover:bg-emerald-50 text-[#0F5B38] rounded-[3px] transition cursor-pointer inline-flex items-center justify-center focus:ring-2 focus:ring-emerald-500/20"
                                title="Add item line"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Row Button */}
              <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-start">
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center space-x-1.5 text-[#0F5B38] hover:text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider bg-white px-3 py-1.5 rounded-[3px] border border-slate-200 shadow-sm transition duration-200 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add row</span>
                </button>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              <div></div>
              <div className="bg-slate-50/50 border border-slate-200 p-6 rounded-[3px] space-y-3 h-fit text-xs font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2">
                  <span>Taxes (GST)</span>
                  <span>{currencySymbol}{getTaxTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#0F5B38] font-black text-sm pt-1">
                  <span>Total Amount</span>
                  <span>{currencySymbol}{getGrandTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end pt-4 border-t border-slate-100 space-x-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
              >
                Back to Bank Selection
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Save transaction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
