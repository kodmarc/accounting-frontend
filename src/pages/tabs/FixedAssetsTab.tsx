import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Plus, ChevronDown, ChevronUp, X, Check,
  AlertTriangle, RotateCcw, Trash2, Edit3, PackageCheck,
  TrendingDown, DollarSign, Calendar, Tag,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useReadOnly } from '../../context/ReadOnlyContext'
import type {
  Organization, Account,
  AssetType, FixedAsset, DepreciationRun, DepRunPreview,
} from '../../services/api/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: string | number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(n))

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

type Section = 'register' | 'types' | 'depreciation'

const STATUS_COLORS: Record<string, string> = {
  Draft:      'bg-amber-50 text-amber-700 border-amber-100',
  Registered: 'bg-emerald-50 text-[#0F5B38] border-emerald-100',
  Disposed:   'bg-slate-100 text-slate-500 border-slate-200',
  Posted:     'bg-emerald-50 text-[#0F5B38] border-emerald-100',
  Undone:     'bg-slate-100 text-slate-500 border-slate-200',
}

const Badge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
    {status}
  </span>
)

// ── Asset Type Form ───────────────────────────────────────────────────────────

function AssetTypeForm({
  orgId, accounts, initial, onSave, onClose,
}: {
  orgId: string
  accounts: Account[]
  initial?: AssetType | null
  onSave: () => void
  onClose: () => void
}) {
  const fixedAssetAccounts = accounts.filter(a => a.type === 'Fixed Asset' && a.is_active)
  const depExpenseAccounts = accounts.filter(a => a.type === 'Depreciation' && a.is_active)

  const [form, setForm] = useState({
    name:                initial?.name ?? '',
    asset_account:       initial?.asset_account ?? '',
    accum_dep_account:   initial?.accum_dep_account ?? '',
    dep_expense_account: initial?.dep_expense_account ?? '',
    dep_method:          initial?.dep_method ?? 'StraightLine',
    averaging_method:    initial?.averaging_method ?? 'FullMonth',
    rate:                initial?.rate ?? '',
    useful_life_years:   initial?.useful_life_years ?? '',
    residual_value_pct:  initial?.residual_value_pct ?? '0',
    is_active:           initial?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        rate:               form.dep_method === 'DiminishingValue' ? (form.rate || null) : null,
        useful_life_years:  form.dep_method === 'StraightLine'     ? (form.useful_life_years || null) : null,
        residual_value_pct: form.residual_value_pct || '0',
      }
      if (initial) {
        await apiService.updateAssetType(orgId, initial.id, payload)
      } else {
        await apiService.createAssetType(orgId, payload)
      }
      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const sel = (label: string, key: string, opts: Account[]) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{label} *</label>
      <select
        value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        required
        className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]"
      >
        <option value="">— Select —</option>
        {opts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[4px] shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800">{initial ? 'Edit Asset Type' : 'New Asset Type'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
          </div>

          {sel('Asset Account (cost)', 'asset_account', fixedAssetAccounts)}
          {sel('Accumulated Depreciation Account', 'accum_dep_account', fixedAssetAccounts)}
          {sel('Depreciation Expense Account', 'dep_expense_account', depExpenseAccounts)}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Method *</label>
              <select value={form.dep_method} onChange={e => set('dep_method', e.target.value)}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                <option value="StraightLine">Straight Line</option>
                <option value="DiminishingValue">Diminishing Value</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Averaging</label>
              <select value={form.averaging_method} onChange={e => set('averaging_method', e.target.value)}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                <option value="FullMonth">Full Month</option>
                <option value="ActualDays">Actual Days</option>
                <option value="FullYear">Full Year</option>
                <option value="NoAveraging">No Averaging</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {form.dep_method === 'StraightLine' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Useful Life (years) *</label>
                <input type="number" min="0.1" step="0.1" value={form.useful_life_years}
                  onChange={e => set('useful_life_years', e.target.value)} required
                  className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Rate (% per year) *</label>
                <input type="number" min="0.01" max="100" step="0.01" value={form.rate ? (parseFloat(form.rate) * 100).toFixed(2) : ''}
                  onChange={e => set('rate', e.target.value ? (parseFloat(e.target.value) / 100).toFixed(4) : '')} required
                  className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]"
                  placeholder="e.g. 20 for 20%" />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Residual Value (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.residual_value_pct ? (parseFloat(form.residual_value_pct) * 100).toFixed(1) : '0'}
                onChange={e => set('residual_value_pct', e.target.value ? (parseFloat(e.target.value) / 100).toFixed(4) : '0')}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
              {saving ? 'Saving…' : (initial ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Asset Types Section ───────────────────────────────────────────────────────

function AssetTypesSection({ orgId, accounts }: { orgId: string; accounts: Account[] }) {
  const isReadOnly = useReadOnly()
  const [types, setTypes]       = useState<AssetType[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<AssetType | null>(null)
  const [error, setError]       = useState('')

  const load = useCallback(() => {
    setLoading(true)
    apiService.getAssetTypes(orgId).then(setTypes).catch(() => {}).finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (at: AssetType) => {
    if (!confirm(`Delete asset type "${at.name}"?`)) return
    try {
      await apiService.deleteAssetType(orgId, at.id)
      load()
    } catch (err: any) {
      setError(err.message || 'Delete failed.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Define templates that set which accounts and depreciation method to use per asset category.</p>
        {!isReadOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229]">
            <Plus className="h-3.5 w-3.5" /> New Asset Type
          </button>
        )}
      </div>

      {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

      {loading ? (
        <p className="text-xs text-slate-400 py-6 text-center">Loading…</p>
      ) : types.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Tag className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No asset types yet</p>
          <p className="text-xs mt-1">Create one to start adding fixed assets.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {['Name', 'Asset Account', 'Accum Dep Account', 'Method', 'Rate / Life', 'Residual', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map(at => (
                <tr key={at.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{at.name}</td>
                  <td className="px-3 py-3 text-slate-600">{at.asset_account_name}</td>
                  <td className="px-3 py-3 text-slate-600">{at.accum_dep_account_name}</td>
                  <td className="px-3 py-3 text-slate-600">{at.dep_method === 'StraightLine' ? 'Straight Line' : 'Diminishing Value'}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-600">
                    {at.dep_method === 'StraightLine'
                      ? `${at.useful_life_years} yrs`
                      : `${at.rate ? (parseFloat(at.rate) * 100).toFixed(1) : '—'}%`}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-slate-600">
                    {at.residual_value_pct ? `${(parseFloat(at.residual_value_pct) * 100).toFixed(0)}%` : '0%'}
                  </td>
                  <td className="px-3 py-3">
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setEditing(at); setShowForm(true) }}
                          className="text-slate-400 hover:text-[#0F5B38]"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(at)}
                          className="text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AssetTypeForm orgId={orgId} accounts={accounts} initial={editing}
          onSave={() => { setShowForm(false); load() }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

// ── Asset Form (create / edit) ────────────────────────────────────────────────

function AssetForm({
  orgId, accounts, assetTypes, initial, onSave, onClose,
}: {
  orgId: string
  accounts: Account[]
  assetTypes: AssetType[]
  initial?: FixedAsset | null
  onSave: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:             initial?.name ?? '',
    description:      initial?.description ?? '',
    serial_number:    initial?.serial_number ?? '',
    warranty_expiry:  initial?.warranty_expiry ?? '',
    asset_type:       initial?.asset_type ?? '',
    purchase_date:    initial?.purchase_date ?? '',
    cost:             initial?.cost ?? '',
    residual_value:   initial?.residual_value ?? '0',
    dep_start_date:   initial?.dep_start_date ?? '',
    rate:             initial?.rate ?? '',
    useful_life_years: initial?.useful_life_years ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const selectedType = assetTypes.find(t => t.id === form.asset_type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        dep_start_date:    form.dep_start_date || form.purchase_date,
        warranty_expiry:   form.warranty_expiry || null,
        rate:              form.rate || null,
        useful_life_years: form.useful_life_years || null,
        asset_type:        form.asset_type || null,
        cost:              String(parseFloat(form.cost) || 0),
        residual_value:    String(parseFloat(form.residual_value) || 0),
      }
      if (initial) {
        await apiService.updateAsset(orgId, initial.id, payload)
      } else {
        await apiService.createAsset(orgId, payload)
      }
      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const inp = (label: string, key: string, type = 'text', required = false) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{label}{required && ' *'}</label>
      <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} required={required}
        className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[4px] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800">{initial ? 'Edit Asset' : 'Add Asset'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            {inp('Asset Name', 'name', 'text', true)}
            {inp('Serial Number', 'serial_number')}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Asset Type</label>
            <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)}
              className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
              <option value="">— Select Asset Type —</option>
              {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {inp('Purchase Date', 'purchase_date', 'date', true)}
            {inp('Cost', 'cost', 'number', true)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {inp('Dep. Start Date', 'dep_start_date', 'date')}
            {inp('Residual Value', 'residual_value', 'number')}
          </div>

          {/* Per-asset overrides only if type doesn't already define them */}
          {(!selectedType || !selectedType.useful_life_years) && (
            <div className="grid grid-cols-2 gap-4">
              {inp('Useful Life Override (yrs)', 'useful_life_years', 'number')}
              {inp('Rate Override (%/yr)', 'rate', 'number')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {inp('Warranty Expiry', 'warranty_expiry', 'date')}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
              {saving ? 'Saving…' : (initial ? 'Update' : 'Add Asset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Register Modal ────────────────────────────────────────────────────────────

function RegisterModal({
  orgId, asset, accounts, onDone, onClose,
}: {
  orgId: string
  asset: FixedAsset
  accounts: Account[]
  onDone: () => void
  onClose: () => void
}) {
  const bankAccounts = accounts.filter(a => ['Bank', 'Current Liability', 'Current Asset'].includes(a.type) && a.is_active)
  const [offsetAccount, setOffsetAccount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleRegister = async () => {
    setSaving(true); setError('')
    try {
      await apiService.registerAsset(orgId, asset.id, asset.from_bill ? {} : { offset_account: offsetAccount })
      onDone()
    } catch (err: any) {
      setError(err.message || 'Registration failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[4px] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800">Register Asset</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

          <div className="bg-slate-50 rounded-[3px] p-4 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Asset</span><span className="font-bold text-slate-800">{asset.asset_number} – {asset.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cost</span><span className="font-bold tabular-nums">{fmt(asset.cost)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Purchase Date</span><span>{fmtDate(asset.purchase_date)}</span></div>
          </div>

          {asset.from_bill ? (
            <div className="flex items-start gap-2 bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-[3px] border border-emerald-100">
              <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>This asset was created from a bill. The cost entry was already posted — no additional journal will be created.</span>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Offset Account *</label>
              <select value={offsetAccount} onChange={e => setOffsetAccount(e.target.value)} required
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                <option value="">— Where did the cost come from? —</option>
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">A journal will debit the asset account and credit this account.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-50">Cancel</button>
            <button onClick={handleRegister} disabled={saving || (!asset.from_bill && !offsetAccount)}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
              <PackageCheck className="h-3.5 w-3.5" />
              {saving ? 'Registering…' : 'Register Asset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dispose Modal ─────────────────────────────────────────────────────────────

function DisposeModal({
  orgId, asset, accounts, currency, onDone, onClose,
}: {
  orgId: string
  asset: FixedAsset
  accounts: Account[]
  currency: string
  onDone: () => void
  onClose: () => void
}) {
  const bankAccounts = accounts.filter(a => a.type === 'Bank' && a.is_active)
  const [form, setForm] = useState({ disposal_date: '', disposal_price: '', proceeds_account: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const nbv      = parseFloat(asset.net_book_value) || 0
  const proceeds = parseFloat(form.disposal_price) || 0
  const gainLoss = proceeds - nbv

  const handleDispose = async () => {
    if (!form.disposal_date) { setError('Disposal date is required.'); return }
    setSaving(true); setError('')
    try {
      await apiService.disposeAsset(orgId, asset.id, {
        disposal_date:    form.disposal_date,
        disposal_price:   proceeds,
        proceeds_account: form.proceeds_account || undefined,
      })
      onDone()
    } catch (err: any) {
      setError(err.message || 'Disposal failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[4px] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800">Dispose Asset</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

          <div className="bg-slate-50 rounded-[3px] p-4 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Asset</span><span className="font-bold text-slate-800">{asset.asset_number} – {asset.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cost</span><span className="font-bold tabular-nums">{fmt(asset.cost, currency)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Accum. Depreciation</span><span className="tabular-nums text-slate-600">({fmt(asset.accumulated_depreciation, currency)})</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5"><span className="font-bold text-slate-700">Net Book Value</span><span className="font-bold tabular-nums">{fmt(asset.net_book_value, currency)}</span></div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Disposal Date *</label>
            <input type="date" value={form.disposal_date} onChange={e => set('disposal_date', e.target.value)}
              className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Proceeds ($) — leave 0 to scrap</label>
            <input type="number" min="0" step="0.01" value={form.disposal_price} onChange={e => set('disposal_price', e.target.value)}
              className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
          </div>

          {proceeds > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Proceeds Account *</label>
              <select value={form.proceeds_account} onChange={e => set('proceeds_account', e.target.value)}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                <option value="">— Select Bank Account —</option>
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
              </select>
            </div>
          )}

          {form.disposal_date && (
            <div className={`flex items-center gap-2 text-xs px-4 py-3 rounded-[3px] border ${gainLoss >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
              {gainLoss >= 0 ? <TrendingDown className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
              <span>{gainLoss >= 0 ? 'Gain' : 'Loss'} on disposal: <strong>{fmt(Math.abs(gainLoss), currency)}</strong></span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-50">Cancel</button>
            <button onClick={handleDispose} disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-[3px] hover:bg-rose-700 disabled:opacity-50">
              {saving ? 'Processing…' : 'Confirm Disposal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Asset Register Section ────────────────────────────────────────────────────

function AssetRegisterSection({
  orgId, accounts, assetTypes, currency,
}: {
  orgId: string
  accounts: Account[]
  assetTypes: AssetType[]
  currency: string
}) {
  const isReadOnly = useReadOnly()
  const [assets, setAssets]         = useState<FixedAsset[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setFilter]   = useState<string>('')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<FixedAsset | null>(null)
  const [registering, setRegistering] = useState<FixedAsset | null>(null)
  const [disposing, setDisposing]   = useState<FixedAsset | null>(null)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [error, setError]           = useState('')

  const load = useCallback(() => {
    setLoading(true)
    apiService.getAssets(orgId, statusFilter || undefined)
      .then(setAssets).catch(() => {}).finally(() => setLoading(false))
  }, [orgId, statusFilter])

  useEffect(() => { load() }, [load])

  const handleRollback = async (asset: FixedAsset) => {
    if (!confirm(`Roll back "${asset.name}" to Draft? This will reverse the registration journal.`)) return
    try {
      await apiService.rollbackAsset(orgId, asset.id)
      load()
    } catch (err: any) {
      setError(err.message || 'Rollback failed.')
    }
  }

  const handleDelete = async (asset: FixedAsset) => {
    if (!confirm(`Delete Draft asset "${asset.name}"?`)) return
    try {
      await apiService.deleteAsset(orgId, asset.id)
      load()
    } catch (err: any) {
      setError(err.message || 'Delete failed.')
    }
  }

  const FILTERS = ['', 'Draft', 'Registered', 'Disposed']
  const FILTER_LABELS: Record<string, string> = { '': 'All', Draft: 'Draft', Registered: 'Registered', Disposed: 'Disposed' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-[3px] transition-colors ${statusFilter === f ? 'bg-[#0F5B38] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        {!isReadOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229]">
            <Plus className="h-3.5 w-3.5" /> Add Asset
          </button>
        )}
      </div>

      {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

      {loading ? (
        <p className="text-xs text-slate-400 py-6 text-center">Loading…</p>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Building2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No assets found</p>
          <p className="text-xs mt-1">Assets appear here automatically when you approve a bill coded to a Fixed Asset account, or add them manually.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {['', 'Asset #', 'Name', 'Type', 'Purchase Date', 'Cost', 'Accum. Dep.', 'Net Book Value', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <>
                  <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <button onClick={() => setExpanded(expanded === asset.id ? null : asset.id)}
                        className="text-slate-300 hover:text-slate-500">
                        {expanded === asset.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{asset.asset_number}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {asset.name}
                      {asset.from_bill && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">From Bill</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{asset.asset_type_name || '—'}</td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fmtDate(asset.purchase_date)}</td>
                    <td className="px-3 py-3 tabular-nums font-semibold text-slate-800">{fmt(asset.cost, currency)}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-500">({fmt(asset.accumulated_depreciation, currency)})</td>
                    <td className="px-3 py-3 tabular-nums font-bold text-slate-800">{fmt(asset.net_book_value, currency)}</td>
                    <td className="px-3 py-3"><Badge status={asset.status} /></td>
                    <td className="px-3 py-3">
                      {!isReadOnly && (
                        <div className="flex items-center gap-2">
                          {asset.status === 'Draft' && <>
                            <button onClick={() => { setEditing(asset); setShowForm(true) }}
                              title="Edit" className="text-slate-400 hover:text-[#0F5B38]"><Edit3 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setRegistering(asset)}
                              title="Register" className="text-slate-400 hover:text-[#0F5B38]"><PackageCheck className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(asset)}
                              title="Delete" className="text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>}
                          {asset.status === 'Registered' && <>
                            <button onClick={() => setDisposing(asset)}
                              title="Dispose" className="text-slate-400 hover:text-rose-600"><DollarSign className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleRollback(asset)}
                              title="Rollback to Draft" className="text-slate-400 hover:text-amber-600"><RotateCcw className="h-3.5 w-3.5" /></button>
                          </>}
                        </div>
                      )}
                    </td>
                  </tr>
                  {expanded === asset.id && asset.dep_lines?.length > 0 && (
                    <tr key={`${asset.id}-dep`} className="bg-slate-50 border-b border-slate-100">
                      <td colSpan={10} className="px-8 py-3">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Depreciation History</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              {['Period', 'Opening NBV', 'Depreciation', 'Closing NBV'].map(h => (
                                <th key={h} className="text-left pb-1 text-[11px] font-bold text-slate-400 uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {asset.dep_lines.map(l => (
                              <tr key={l.id}>
                                <td className="py-0.5 pr-4 text-slate-600">{l.asset_type_name}</td>
                                <td className="py-0.5 pr-4 tabular-nums text-slate-600">{fmt(l.opening_nbv, currency)}</td>
                                <td className="py-0.5 pr-4 tabular-nums text-slate-600">({fmt(l.dep_amount, currency)})</td>
                                <td className="py-0.5 tabular-nums font-semibold text-slate-800">{fmt(l.closing_nbv, currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AssetForm orgId={orgId} accounts={accounts} assetTypes={assetTypes} initial={editing}
          onSave={() => { setShowForm(false); load() }}
          onClose={() => setShowForm(false)} />
      )}
      {registering && (
        <RegisterModal orgId={orgId} asset={registering} accounts={accounts}
          onDone={() => { setRegistering(null); load() }}
          onClose={() => setRegistering(null)} />
      )}
      {disposing && (
        <DisposeModal orgId={orgId} asset={disposing} accounts={accounts} currency={currency}
          onDone={() => { setDisposing(null); load() }}
          onClose={() => setDisposing(null)} />
      )}
    </div>
  )
}

// ── Depreciation Section ──────────────────────────────────────────────────────

function DepreciationSection({ orgId, currency }: { orgId: string; currency: string }) {
  const isReadOnly = useReadOnly()
  const [runs, setRuns]             = useState<DepreciationRun[]>([])
  const [loading, setLoading]       = useState(true)
  const [showNew, setShowNew]       = useState(false)
  const [preview, setPreview]       = useState<DepRunPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [posting, setPosting]       = useState(false)
  const [error, setError]           = useState('')
  const [period, setPeriod]         = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const load = useCallback(() => {
    setLoading(true)
    apiService.getDepRuns(orgId).then(setRuns).catch(() => {}).finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => { load() }, [load])

  const buildPeriodDates = (ym: string) => {
    const [year, month] = ym.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end   = new Date(year, month, 0)
    const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return {
      period_start: start.toISOString().slice(0, 10),
      period_end:   end.toISOString().slice(0, 10),
      period_label: label,
    }
  }

  const handlePreview = async () => {
    setPreviewing(true); setError(''); setPreview(null)
    try {
      const dates = buildPeriodDates(period)
      const result = await apiService.previewDepRun(orgId, dates)
      setPreview(result)
    } catch (err: any) {
      setError(err.message || 'Preview failed.')
    } finally {
      setPreviewing(false)
    }
  }

  const handlePost = async () => {
    if (!preview) return
    if (!confirm(`Post depreciation for ${preview.period_label}? This cannot be edited after posting.`)) return
    setPosting(true); setError('')
    try {
      const dates = buildPeriodDates(period)
      await apiService.postDepRun(orgId, dates)
      setShowNew(false); setPreview(null)
      load()
    } catch (err: any) {
      setError(err.message || 'Post failed.')
    } finally {
      setPosting(false)
    }
  }

  const handleUndo = async (run: DepreciationRun) => {
    if (!confirm(`Undo depreciation run for ${run.period_label}? A reversal journal will be posted.`)) return
    try {
      await apiService.undoDepRun(orgId, run.id)
      load()
    } catch (err: any) {
      setError(err.message || 'Undo failed.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Run depreciation monthly. Runs must be posted in sequence and can only be undone in reverse order.</p>
        {!isReadOnly && (
          <button onClick={() => { setShowNew(true); setPreview(null); setError('') }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229]">
            <Plus className="h-3.5 w-3.5" /> New Run
          </button>
        )}
      </div>

      {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

      {/* New run panel */}
      {showNew && (
        <div className="border border-slate-200 rounded-[4px] p-5 space-y-4 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">Run Depreciation</h4>
            <button onClick={() => { setShowNew(false); setPreview(null) }}
              className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Period</label>
              <input type="month" value={period} onChange={e => { setPeriod(e.target.value); setPreview(null) }}
                className="border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
            </div>
            <button onClick={handlePreview} disabled={previewing}
              className="px-4 py-2 text-xs font-bold text-[#0F5B38] border border-[#0F5B38] rounded-[3px] hover:bg-emerald-50 disabled:opacity-50">
              {previewing ? 'Calculating…' : 'Preview'}
            </button>
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">{preview.period_label} — {preview.lines.length} asset{preview.lines.length !== 1 ? 's' : ''}</p>
                <p className="text-sm font-extrabold text-slate-800">Total: {fmt(preview.total_depreciation, currency)}</p>
              </div>

              {preview.lines.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No registered assets to depreciate in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {['Asset', 'Type', 'Opening NBV', 'Depreciation', 'Closing NBV'].map(h => (
                          <th key={h} className="text-left px-2 py-1.5 text-[11px] font-bold text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.lines.map((l, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">{l.asset_number} – {l.asset_name}</td>
                          <td className="px-2 py-2 text-slate-500">{l.asset_type_name}</td>
                          <td className="px-2 py-2 tabular-nums text-slate-600">{fmt(l.opening_nbv, currency)}</td>
                          <td className="px-2 py-2 tabular-nums text-rose-600 font-semibold">({fmt(l.dep_amount, currency)})</td>
                          <td className="px-2 py-2 tabular-nums font-bold text-slate-800">{fmt(l.closing_nbv, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview.lines.length > 0 && (
                <div className="flex justify-end">
                  <button onClick={handlePost} disabled={posting}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
                    <Check className="h-3.5 w-3.5" />
                    {posting ? 'Posting…' : `Post Depreciation – ${fmt(preview.total_depreciation, currency)}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Run history */}
      {loading ? (
        <p className="text-xs text-slate-400 py-4 text-center">Loading…</p>
      ) : runs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No depreciation runs yet</p>
          <p className="text-xs mt-1">Click "New Run" to calculate and post depreciation for a period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {['Period', 'Assets', 'Total Depreciation', 'Status', 'Posted', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{run.period_label}</td>
                  <td className="px-3 py-3 text-slate-600">{run.line_count ?? run.lines?.length ?? 0}</td>
                  <td className="px-3 py-3 tabular-nums font-bold text-slate-800">{fmt(run.total_depreciation, currency)}</td>
                  <td className="px-3 py-3"><Badge status={run.status} /></td>
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{fmtDate(run.created_at?.slice(0, 10))}</td>
                  <td className="px-3 py-3">
                    {!isReadOnly && run.status === 'Posted' && (
                      <button onClick={() => handleUndo(run)}
                        title="Undo this run" className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-600">
                        <RotateCcw className="h-3 w-3" /> Undo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main FixedAssetsTab ───────────────────────────────────────────────────────

interface FixedAssetsTabProps { activeOrg: Organization }

export function FixedAssetsTab({ activeOrg }: FixedAssetsTabProps) {
  const [section, setSection]       = useState<Section>('register')
  const [accounts, setAccounts]     = useState<Account[]>([])
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([])

  useEffect(() => {
    apiService.getAccounts(activeOrg.id).then(setAccounts).catch(() => {})
    apiService.getAssetTypes(activeOrg.id).then(setAssetTypes).catch(() => {})
  }, [activeOrg.id])

  const navItems: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: 'register',     label: 'Asset Register', icon: Building2 },
    { key: 'types',        label: 'Asset Types',    icon: Tag },
    { key: 'depreciation', label: 'Depreciation',   icon: TrendingDown },
  ]

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 sm:p-8 space-y-6 font-sans text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-[#0F5B38]" />
            <span>Fixed Assets</span>
          </h2>
          <p className="text-slate-500 text-xs font-semibold">
            Track assets, run depreciation, and book disposals — all reflected in your ledger.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-full flex items-center gap-1.5 shadow-sm bg-emerald-50 text-[#0F5B38] border border-emerald-100">
          <Building2 className="h-3.5 w-3.5" />
          {activeOrg.name}
        </span>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 border-b border-slate-100">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px ${
              section === key
                ? 'border-[#0F5B38] text-[#0F5B38]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === 'register' && (
        <AssetRegisterSection
          orgId={activeOrg.id}
          accounts={accounts}
          assetTypes={assetTypes}
          currency={activeOrg.currency}
        />
      )}
      {section === 'types' && (
        <AssetTypesSection orgId={activeOrg.id} accounts={accounts} />
      )}
      {section === 'depreciation' && (
        <DepreciationSection orgId={activeOrg.id} currency={activeOrg.currency} />
      )}
    </div>
  )
}
