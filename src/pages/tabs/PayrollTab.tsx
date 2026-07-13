import { useState, useEffect } from 'react'
import {
  Users, Plus, ChevronRight, CheckCircle, AlertCircle,
  Briefcase, Calendar, DollarSign, X, Check, Trash2,
  UserCheck, UserX, Edit2, Send
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useReadOnly } from '../../context/ReadOnlyContext'
import type {
  Organization, Account, Employee, LeaveType,
  LeaveRequest, PayRun, Paycheque, PaychequeDeductionLine
} from '../../services/api'

interface PayrollTabProps {
  activeOrg: Organization
}

type Section = 'employees' | 'pay-runs' | 'leave'

const fmtCurrency = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)

const statusPill = (s: string) => {
  const map: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Terminated: 'bg-rose-50 text-rose-700 border border-rose-200',
    Draft: 'bg-amber-50 text-amber-700 border border-amber-200',
    Posted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
  }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${map[s] || 'bg-slate-100 text-slate-600'}`}>
      {s}
    </span>
  )
}

// ── Employee Form ────────────────────────────────────────────────────
function EmployeeForm({
  orgId, accounts, initial, onSave, onClose
}: {
  orgId: string
  accounts: Account[]
  initial?: Partial<Employee>
  onSave: (e: Employee) => void
  onClose: () => void
}) {
  const expenseAccounts = accounts.filter(a => a.class_type === 'Expense' && a.is_active)
  const [form, setForm] = useState({
    full_name: initial?.full_name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    date_of_birth: initial?.date_of_birth || '',
    job_title: initial?.job_title || '',
    department: initial?.department || '',
    employment_type: initial?.employment_type || 'Full-time',
    start_date: initial?.start_date || '',
    pay_frequency: initial?.pay_frequency || 'Monthly',
    gross_salary: initial?.gross_salary?.toString() || '',
    salary_account: initial?.salary_account || '',
    tax_id: initial?.tax_id || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        gross_salary: parseFloat(form.gross_salary) || 0,
        salary_account: form.salary_account || null,
        date_of_birth: form.date_of_birth || null,
      }
      let result: Employee
      if (initial?.id) {
        result = await apiService.updateEmployee(orgId, initial.id, payload)
      } else {
        result = await apiService.createEmployee(orgId, payload)
      }
      onSave(result)
    } catch (err: any) {
      setError(err.message || 'Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: string, type = 'text', required = false) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{label}{required && ' *'}</label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        required={required}
        className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[4px] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800">{initial?.id ? 'Edit Employee' : 'Add Employee'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            {field('Full Name', 'full_name', 'text', true)}
            {field('Email', 'email', 'email')}
            {field('Phone', 'phone')}
            {field('Tax ID / CPF No', 'tax_id')}
            {field('Job Title', 'job_title')}
            {field('Department', 'department')}
            {field('Date of Birth', 'date_of_birth', 'date')}
            {field('Start Date', 'start_date', 'date', true)}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Employment Type *</label>
              <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Pay Frequency</label>
              <select value={form.pay_frequency} onChange={e => set('pay_frequency', e.target.value)} className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                <option>Monthly</option>
                <option>Fortnightly</option>
                <option>Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Gross Salary *</label>
              <input type="number" min="0" step="0.01" value={form.gross_salary} onChange={e => set('gross_salary', e.target.value)} required className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Salary Expense Account</label>
            <select value={form.salary_account} onChange={e => set('salary_account', e.target.value)} className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
              <option value="">— Select Account —</option>
              {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Address</label>
            <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
              {saving ? 'Saving…' : (initial?.id ? 'Update Employee' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Employees Section ────────────────────────────────────────────────
function EmployeesSection({ orgId, accounts, currency }: { orgId: string; accounts: Account[]; currency: string }) {
  const isReadOnly = useReadOnly()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Active' | 'Terminated' | ''>('Active')

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiService.getEmployees(orgId, filterStatus || undefined)
      setEmployees(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId, filterStatus])

  const handleSave = (emp: Employee) => {
    setEmployees(prev => {
      const exists = prev.find(e => e.id === emp.id)
      return exists ? prev.map(e => e.id === emp.id ? emp : e) : [emp, ...prev]
    })
    setShowForm(false)
    setEditing(null)
    setSuccessMsg(emp.employee_id ? `${emp.full_name} saved.` : 'Employee added.')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleTerminate = async (emp: Employee) => {
    if (!confirm(`Terminate ${emp.full_name}?`)) return
    try {
      await apiService.terminateEmployee(orgId, emp.id)
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: 'Terminated' } : e))
      setSuccessMsg(`${emp.full_name} terminated.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to terminate')
    }
  }

  return (
    <div className="space-y-4">
      {successMsg && <div className="bg-emerald-50 border border-emerald-100 text-[#0F5B38] px-4 py-3 rounded-[3px] flex items-center gap-2 text-xs font-bold"><CheckCircle className="h-4 w-4" />{successMsg}</div>}
      {errorMsg && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-[3px] flex items-center gap-2 text-xs font-bold"><AlertCircle className="h-4 w-4" />{errorMsg}</div>}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['Active', 'Terminated', ''] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${filterStatus === s ? 'bg-[#0F5B38] text-white border-[#0F5B38]' : 'text-slate-600 border-slate-200 hover:border-[#0F5B38] hover:text-[#0F5B38]'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {!isReadOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229]">
            <Plus className="h-3.5 w-3.5" /> Add Employee
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0F5B38]" /></div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No employees found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['ID', 'Name', 'Title', 'Department', 'Type', 'Salary', 'Frequency', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-3 text-xs font-bold text-[#0F5B38]">{emp.employee_id}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{emp.full_name}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{emp.job_title || '—'}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{emp.department || '—'}</td>
                  <td className="px-3 py-3 text-xs">{emp.employment_type}</td>
                  <td className="px-3 py-3 text-xs font-semibold tabular-nums">{fmtCurrency(emp.gross_salary, currency)}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{emp.pay_frequency}</td>
                  <td className="px-3 py-3">{statusPill(emp.status)}</td>
                  <td className="px-3 py-3">
                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditing(emp); setShowForm(true) }}
                          className="p-1.5 text-slate-400 hover:text-[#0F5B38] rounded" title="Edit">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {emp.status === 'Active' && (
                          <button onClick={() => handleTerminate(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded" title="Terminate">
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showForm || editing) && (
        <EmployeeForm
          orgId={orgId}
          accounts={accounts}
          initial={editing || undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

// ── Pay Run Editor ────────────────────────────────────────────────────
function PayRunEditor({
  orgId, payRun, accounts, currency, onPost, onClose
}: {
  orgId: string
  payRun: PayRun
  accounts: Account[]
  currency: string
  onPost: (pr: PayRun) => void
  onClose: () => void
}) {
  const liabilityAccounts = accounts.filter(a => a.class_type === 'Liability' && a.is_active)
  const [paycheques, setPaycheques] = useState<Paycheque[]>(payRun.paycheques)
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const totalGross = paycheques.reduce((s, p) => s + Number(p.gross_salary), 0)
  const totalDeductions = paycheques.reduce((s, p) => s + p.deduction_lines.reduce((d, l) => d + Number(l.amount), 0), 0)
  const totalNet = totalGross - totalDeductions

  const updateGross = (pcId: string, val: string) => {
    setPaycheques(prev => prev.map(p => p.id === pcId ? { ...p, gross_salary: parseFloat(val) || 0 } : p))
  }

  const addDeduction = (pcId: string) => {
    setPaycheques(prev => prev.map(p => p.id === pcId
      ? { ...p, deduction_lines: [...p.deduction_lines, { label: '', amount: 0, account: '' }] }
      : p
    ))
  }

  const updateDeduction = (pcId: string, idx: number, field: keyof PaychequeDeductionLine, val: string) => {
    setPaycheques(prev => prev.map(p => {
      if (p.id !== pcId) return p
      const lines = p.deduction_lines.map((dl, i) => i === idx ? { ...dl, [field]: field === 'amount' ? parseFloat(val) || 0 : val } : dl)
      return { ...p, deduction_lines: lines }
    }))
  }

  const removeDeduction = (pcId: string, idx: number) => {
    setPaycheques(prev => prev.map(p => p.id === pcId
      ? { ...p, deduction_lines: p.deduction_lines.filter((_, i) => i !== idx) }
      : p
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await apiService.updatePayRun(orgId, payRun.id, paycheques)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePost = async () => {
    if (!confirm('Post this pay run? This will create journal entries and cannot be undone.')) return
    setPosting(true)
    setError('')
    try {
      await apiService.updatePayRun(orgId, payRun.id, paycheques)
      const posted = await apiService.postPayRun(orgId, payRun.id)
      onPost(posted)
    } catch (err: any) {
      setError(err.message || 'Failed to post pay run')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[4px] shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-800">Pay Run – {payRun.period_label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pay Date: {payRun.pay_date} · {statusPill(payRun.status)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-3 rounded-[3px] border border-rose-100">{error}</div>}

          {paycheques.map(pc => {
            const pcDeductions = pc.deduction_lines.reduce((s, l) => s + Number(l.amount), 0)
            const pcNet = Number(pc.gross_salary) - pcDeductions
            return (
              <div key={pc.id} className="border border-slate-100 rounded-[3px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0F5B38]">{pc.employee_id_code}</span>
                    <span className="ml-2 font-semibold text-slate-800 text-sm">{pc.employee_name}</span>
                  </div>
                  <span className="text-xs text-slate-500">Net: <span className="font-bold text-slate-800">{fmtCurrency(pcNet, currency)}</span></span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 shrink-0">Gross Salary</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={pc.gross_salary}
                    disabled={payRun.status === 'Posted'}
                    onChange={e => updateGross(pc.id, e.target.value)}
                    className="border border-slate-200 rounded-[3px] px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-[#0F5B38] disabled:bg-slate-50"
                  />
                </div>

                {pc.deduction_lines.map((dl, idx) => (
                  <div key={idx} className="flex items-center gap-2 ml-1">
                    <span className="text-slate-300 text-xs">–</span>
                    <input placeholder="Label (e.g. CPF)" value={dl.label} disabled={payRun.status === 'Posted'}
                      onChange={e => updateDeduction(pc.id, idx, 'label', e.target.value)}
                      className="border border-slate-200 rounded-[3px] px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-[#0F5B38] disabled:bg-slate-50" />
                    <input type="number" min="0" step="0.01" placeholder="Amount" value={dl.amount} disabled={payRun.status === 'Posted'}
                      onChange={e => updateDeduction(pc.id, idx, 'amount', e.target.value)}
                      className="border border-slate-200 rounded-[3px] px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-[#0F5B38] disabled:bg-slate-50" />
                    <select value={dl.account} disabled={payRun.status === 'Posted'}
                      onChange={e => updateDeduction(pc.id, idx, 'account', e.target.value)}
                      className="border border-slate-200 rounded-[3px] px-2 py-1.5 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-[#0F5B38] disabled:bg-slate-50">
                      <option value="">— Liability Account —</option>
                      {liabilityAccounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                    </select>
                    {payRun.status !== 'Posted' && (
                      <button onClick={() => removeDeduction(pc.id, idx)} className="text-slate-400 hover:text-rose-500 p-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {payRun.status !== 'Posted' && (
                  <button onClick={() => addDeduction(pc.id)}
                    className="text-xs text-[#0F5B38] hover:underline ml-4 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Deduction
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-xs">
              <span>Gross: <span className="font-bold text-slate-800">{fmtCurrency(totalGross, currency)}</span></span>
              <span>Deductions: <span className="font-bold text-rose-600">–{fmtCurrency(totalDeductions, currency)}</span></span>
              <span>Net Pay: <span className="font-bold text-[#0F5B38] text-sm">{fmtCurrency(totalNet, currency)}</span></span>
            </div>
            {payRun.status !== 'Posted' && (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-[3px] hover:bg-slate-100 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button onClick={handlePost} disabled={posting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {posting ? 'Posting…' : 'Post Pay Run'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pay Runs Section ─────────────────────────────────────────────────
function PayRunsSection({ orgId, accounts, currency }: { orgId: string; accounts: Account[]; currency: string }) {
  const isReadOnly = useReadOnly()
  const bankAccounts = accounts.filter(a => a.type === 'Bank' && a.is_active)
  const [payRuns, setPayRuns] = useState<PayRun[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [openRun, setOpenRun] = useState<PayRun | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({ period_label: '', period_start: '', period_end: '', pay_date: '', bank_account: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    apiService.getPayRuns(orgId).then(setPayRuns).finally(() => setLoading(false))
  }, [orgId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setErrorMsg('')
    try {
      const pr = await apiService.createPayRun(orgId, form)
      setPayRuns(prev => [pr, ...prev])
      setOpenRun(pr)
      setShowNew(false)
      setForm({ period_label: '', period_start: '', period_end: '', pay_date: '', bank_account: '' })
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create pay run')
    } finally {
      setCreating(false)
    }
  }

  const handlePost = (posted: PayRun) => {
    setPayRuns(prev => prev.map(p => p.id === posted.id ? posted : p))
    setOpenRun(posted)
    setSuccessMsg(`Pay Run – ${posted.period_label} posted. Journal entry created.`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const handleDelete = async (pr: PayRun) => {
    if (!confirm(`Delete pay run for ${pr.period_label}?`)) return
    try {
      await apiService.deletePayRun(orgId, pr.id)
      setPayRuns(prev => prev.filter(p => p.id !== pr.id))
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      {successMsg && <div className="bg-emerald-50 border border-emerald-100 text-[#0F5B38] px-4 py-3 rounded-[3px] flex items-center gap-2 text-xs font-bold"><CheckCircle className="h-4 w-4" />{successMsg}</div>}
      {errorMsg && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-[3px] flex items-center gap-2 text-xs font-bold"><AlertCircle className="h-4 w-4" />{errorMsg}</div>}

      {!isReadOnly && (
        <div className="flex justify-end">
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229]">
            <Plus className="h-3.5 w-3.5" /> New Pay Run
          </button>
        </div>
      )}

      {showNew && (
        <div className="border border-slate-100 rounded-[3px] p-5 bg-slate-50/50">
          <h4 className="font-bold text-slate-700 text-sm mb-4">New Pay Run</h4>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {errorMsg && <div className="col-span-2 bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2 rounded border border-rose-100">{errorMsg}</div>}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Period Label *</label>
              <input placeholder="e.g. July 2026" required value={form.period_label} onChange={e => setForm(f => ({ ...f, period_label: e.target.value }))}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Bank Account *</label>
              <select required value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                <option value="">— Select Bank —</option>
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Period Start *</label>
              <input type="date" required value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Period End *</label>
              <input type="date" required value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Pay Date *</label>
              <input type="date" required value={form.pay_date} onChange={e => setForm(f => ({ ...f, pay_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={creating}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
                {creating ? 'Creating…' : 'Create & Open'}
              </button>
              <button type="button" onClick={() => setShowNew(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-100">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0F5B38]" /></div>
      ) : payRuns.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No pay runs yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Period', 'Pay Date', 'Gross', 'Deductions', 'Net Pay', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payRuns.map(pr => (
                <tr key={pr.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setOpenRun(pr)}>
                  <td className="px-3 py-3 font-semibold text-slate-800">{pr.period_label}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">{pr.pay_date}</td>
                  <td className="px-3 py-3 text-xs tabular-nums">{fmtCurrency(Number(pr.total_gross), currency)}</td>
                  <td className="px-3 py-3 text-xs tabular-nums text-rose-600">–{fmtCurrency(Number(pr.total_deductions), currency)}</td>
                  <td className="px-3 py-3 text-xs tabular-nums font-bold text-[#0F5B38]">{fmtCurrency(Number(pr.total_net), currency)}</td>
                  <td className="px-3 py-3">{statusPill(pr.status)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setOpenRun(pr)} className="p-1.5 text-slate-400 hover:text-[#0F5B38]"><ChevronRight className="h-3.5 w-3.5" /></button>
                      {pr.status === 'Draft' && (
                        <button onClick={() => handleDelete(pr)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openRun && (
        <PayRunEditor
          orgId={orgId}
          payRun={openRun}
          accounts={accounts}
          currency={currency}
          onPost={handlePost}
          onClose={() => setOpenRun(null)}
        />
      )}
    </div>
  )
}

// ── Leave Section ─────────────────────────────────────────────────────
function LeaveSection({ orgId }: { orgId: string }) {
  const isReadOnly = useReadOnly()
  const [tab, setTab] = useState<'requests' | 'types'>('requests')
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [newReq, setNewReq] = useState({ employee: '', leave_type: '', from_date: '', to_date: '', reason: '' })
  const [newType, setNewType] = useState({ name: '', days_per_year: '', is_paid: true })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [reqs, emps, types] = await Promise.all([
        apiService.getLeaveRequests(orgId, undefined, filterStatus || undefined),
        apiService.getEmployees(orgId, 'Active'),
        apiService.getLeaveTypes(orgId),
      ])
      setRequests(reqs)
      setEmployees(emps)
      setLeaveTypes(types)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId, filterStatus])

  const flash = (msg: string, isError = false) => {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 3000) }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  }

  const handleApprove = async (req: LeaveRequest) => {
    try {
      const updated = await apiService.approveLeaveRequest(orgId, req.id)
      setRequests(prev => prev.map(r => r.id === req.id ? updated : r))
      flash(`Approved ${req.days} days for ${req.employee_name}`)
    } catch (err: any) { flash(err.message || 'Failed to approve', true) }
  }

  const handleReject = async (req: LeaveRequest) => {
    try {
      const updated = await apiService.rejectLeaveRequest(orgId, req.id)
      setRequests(prev => prev.map(r => r.id === req.id ? updated : r))
      flash('Request rejected')
    } catch (err: any) { flash(err.message || 'Failed to reject', true) }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const req = await apiService.createLeaveRequest(orgId, newReq)
      setRequests(prev => [req, ...prev])
      setShowNew(false)
      setNewReq({ employee: '', leave_type: '', from_date: '', to_date: '', reason: '' })
      flash('Leave request submitted')
    } catch (err: any) { flash(err.message || 'Failed to submit', true) }
    finally { setSaving(false) }
  }

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const lt = await apiService.createLeaveType(orgId, { ...newType, days_per_year: parseFloat(newType.days_per_year) || 0 })
      setLeaveTypes(prev => [...prev, lt])
      setShowTypeForm(false)
      setNewType({ name: '', days_per_year: '', is_paid: true })
      flash('Leave type added')
    } catch (err: any) { flash(err.message || 'Failed to add leave type', true) }
    finally { setSaving(false) }
  }

  const handleDeleteType = async (lt: LeaveType) => {
    if (!confirm(`Delete leave type "${lt.name}"?`)) return
    try {
      await apiService.deleteLeaveType(orgId, lt.id)
      setLeaveTypes(prev => prev.filter(t => t.id !== lt.id))
      flash('Leave type deleted')
    } catch (err: any) { flash(err.message || 'Failed to delete', true) }
  }

  return (
    <div className="space-y-4">
      {successMsg && <div className="bg-emerald-50 border border-emerald-100 text-[#0F5B38] px-4 py-3 rounded-[3px] flex items-center gap-2 text-xs font-bold"><CheckCircle className="h-4 w-4" />{successMsg}</div>}
      {errorMsg && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-[3px] flex items-center gap-2 text-xs font-bold"><AlertCircle className="h-4 w-4" />{errorMsg}</div>}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-[3px] p-0.5">
          {(['requests', 'types'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-bold rounded-[3px] transition-colors ${tab === t ? 'bg-white text-[#0F5B38] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'requests' ? 'Leave Requests' : 'Leave Types'}
            </button>
          ))}
        </div>
        {!isReadOnly && (
          <button onClick={() => tab === 'requests' ? setShowNew(true) : setShowTypeForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229]">
            <Plus className="h-3.5 w-3.5" /> {tab === 'requests' ? 'New Request' : 'Add Type'}
          </button>
        )}
      </div>

      {tab === 'requests' && (
        <>
          <div className="flex gap-2">
            {(['', 'Pending', 'Approved', 'Rejected'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${filterStatus === s ? 'bg-[#0F5B38] text-white border-[#0F5B38]' : 'text-slate-600 border-slate-200 hover:border-[#0F5B38] hover:text-[#0F5B38]'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>

          {showNew && (
            <div className="border border-slate-100 rounded-[3px] p-5 bg-slate-50/50">
              <h4 className="font-bold text-slate-700 text-sm mb-4">New Leave Request</h4>
              <form onSubmit={handleCreateRequest} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Employee *</label>
                  <select required value={newReq.employee} onChange={e => setNewReq(f => ({ ...f, employee: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                    <option value="">— Select Employee —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Leave Type *</label>
                  <select required value={newReq.leave_type} onChange={e => setNewReq(f => ({ ...f, leave_type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]">
                    <option value="">— Select Type —</option>
                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.days_per_year}d/yr)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">From Date *</label>
                  <input type="date" required value={newReq.from_date} onChange={e => setNewReq(f => ({ ...f, from_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">To Date *</label>
                  <input type="date" required value={newReq.to_date} onChange={e => setNewReq(f => ({ ...f, to_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Reason</label>
                  <textarea value={newReq.reason} onChange={e => setNewReq(f => ({ ...f, reason: e.target.value }))} rows={2}
                    className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
                    {saving ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <button type="button" onClick={() => setShowNew(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-100">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0F5B38]" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">No leave requests.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-3 font-semibold text-slate-800">{req.employee_name}</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{req.leave_type_name}</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{req.from_date}</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{req.to_date}</td>
                      <td className="px-3 py-3 text-xs font-bold tabular-nums">{req.days}</td>
                      <td className="px-3 py-3 text-xs text-slate-500 max-w-[160px] truncate">{req.reason || '—'}</td>
                      <td className="px-3 py-3">{statusPill(req.status)}</td>
                      <td className="px-3 py-3">
                        {!isReadOnly && req.status === 'Pending' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleApprove(req)} title="Approve"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleReject(req)} title="Reject"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'types' && (
        <>
          {showTypeForm && (
            <div className="border border-slate-100 rounded-[3px] p-5 bg-slate-50/50">
              <form onSubmit={handleCreateType} className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Name *</label>
                  <input required placeholder="e.g. Annual Leave" value={newType.name} onChange={e => setNewType(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
                </div>
                <div className="w-36">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Days/Year *</label>
                  <input type="number" required min="0" step="0.5" value={newType.days_per_year} onChange={e => setNewType(f => ({ ...f, days_per_year: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F5B38]" />
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <input type="checkbox" id="is_paid" checked={newType.is_paid} onChange={e => setNewType(f => ({ ...f, is_paid: e.target.checked }))} className="accent-[#0F5B38]" />
                  <label htmlFor="is_paid" className="text-xs font-semibold text-slate-600">Paid</label>
                </div>
                <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-bold text-white bg-[#0F5B38] rounded-[3px] hover:bg-[#0a4229] disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowTypeForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-[3px] hover:bg-slate-100">
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {leaveTypes.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">No leave types configured.</div>
            ) : leaveTypes.map(lt => (
              <div key={lt.id} className="flex items-center justify-between border border-slate-100 rounded-[3px] px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-800 text-sm">{lt.name}</span>
                  <span className="text-xs text-slate-500">{lt.days_per_year} days/year</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${lt.is_paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                    {lt.is_paid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                <button onClick={() => handleDeleteType(lt)} className="text-slate-400 hover:text-rose-500 p-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main PayrollTab ───────────────────────────────────────────────────
export function PayrollTab({ activeOrg }: PayrollTabProps) {
  const [section, setSection] = useState<Section>('employees')
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    apiService.getAccounts(activeOrg.id).then(setAccounts).catch(() => {})
  }, [activeOrg.id])

  const navItems: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: 'employees', label: 'Employees', icon: Users },
    { key: 'pay-runs', label: 'Pay Runs', icon: DollarSign },
    { key: 'leave', label: 'Leave', icon: Calendar },
  ]

  return (
    <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 sm:p-8 space-y-6 font-sans text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2.5">
            <Briefcase className="h-5 w-5 text-[#0F5B38]" />
            <span>Payroll</span>
          </h2>
          <p className="text-slate-500 text-xs font-semibold">
            Manage employees, run payroll, and track leave — all reflected in your ledger.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-full flex items-center gap-1.5 shadow-sm bg-emerald-50 text-[#0F5B38] border border-emerald-100">
          <UserCheck className="h-3.5 w-3.5" />
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
      {section === 'employees' && (
        <EmployeesSection orgId={activeOrg.id} accounts={accounts} currency={activeOrg.currency} />
      )}
      {section === 'pay-runs' && (
        <PayRunsSection orgId={activeOrg.id} accounts={accounts} currency={activeOrg.currency} />
      )}
      {section === 'leave' && (
        <LeaveSection orgId={activeOrg.id} />
      )}
    </div>
  )
}
