import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, UserPlus, Trash2, Shield, ShieldCheck, Mail,
  RefreshCw, CheckCircle, AlertCircle, ChevronDown, ChevronUp, X,
} from 'lucide-react'
import { apiService } from '../../services/api'
import type { OrgMember, OrgInvitation, Organization } from '../../services/api'

interface OrgUsersTabProps {
  activeOrg: Organization
  currentUserId: string
}

type Permissions = Record<string, boolean>

// ── Permission hierarchy ────────────────────────────────────────────────────
export const PERMISSION_TREE = [
  {
    key: 'sales', label: 'Sales',
    children: [
      { key: 'invoices',        label: 'Invoices' },
      { key: 'quotes',          label: 'Quotes' },
      { key: 'products',        label: 'Products & Services' },
      { key: 'customers',       label: 'Customers' },
      { key: 'online_payments', label: 'Online Payments' },
      { key: 'sales_settings',  label: 'Sales Settings' },
    ],
  },
  {
    key: 'purchase', label: 'Purchases',
    children: [
      { key: 'bills',               label: 'Bills' },
      { key: 'purchase_orders',     label: 'Purchase Orders' },
      { key: 'cheque',              label: 'Cheque Payments' },
      { key: 'expenses',            label: 'Expenses' },
      { key: 'suppliers',           label: 'Suppliers' },
      { key: 'purchases_settings',  label: 'Purchases Settings' },
    ],
  },
  {
    key: 'banking', label: 'Banking',
    children: [],
  },
  {
    key: 'accounts', label: 'Accounting',
    children: [
      { key: 'chart_of_accounts',   label: 'Chart of Accounts' },
      { key: 'tax_rates',           label: 'Tax Rates' },
      { key: 'accounting_settings', label: 'Accounting Settings' },
    ],
  },
  {
    key: 'reporting', label: 'Reports',
    children: [
      { key: 'all_reports',          label: 'All Reports' },
      { key: 'account_transactions', label: 'Account Transactions' },
      { key: 'balance_sheet',        label: 'Balance Sheet' },
      { key: 'profit_and_loss',      label: 'Profit & Loss' },
      { key: 'cash_flow',            label: 'Cash Flow Statement' },
    ],
  },
  {
    key: 'contacts', label: 'Contacts',
    children: [
      { key: 'contacts_settings', label: 'Contacts Settings' },
    ],
  },
  { key: 'projects',     label: 'Projects',     children: [] },
  { key: 'fixed_assets', label: 'Fixed Assets', children: [] },
  { key: 'payroll',      label: 'Payroll',      children: [] },
]

// All keys ON by default
export const DEFAULT_PERMISSIONS: Permissions = (() => {
  const p: Permissions = {}
  PERMISSION_TREE.forEach(g => {
    p[g.key] = true
    g.children.forEach(c => { p[c.key] = true })
  })
  return p
})()

// ── Indeterminate checkbox helper ───────────────────────────────────────────
function Checkbox({
  checked, indeterminate, onChange, disabled, id,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  disabled?: boolean
  id?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 rounded border-slate-300 text-[#0F5B38] focus:ring-[#0F5B38] cursor-pointer disabled:cursor-default disabled:opacity-40"
    />
  )
}

// ── Permission toggles ──────────────────────────────────────────────────────
function PermissionToggles({ perms, onChange }: { perms: Permissions; onChange: (p: Permissions) => void }) {
  function setAll(value: boolean) {
    const next: Permissions = {}
    PERMISSION_TREE.forEach(g => {
      next[g.key] = value
      g.children.forEach(c => { next[c.key] = value })
    })
    onChange(next)
  }

  const noneOn = PERMISSION_TREE.every(g => perms[g.key] === false)

  return (
    <div className="space-y-3">
      {/* Select / Deselect all */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500">Module Access</span>
        <button
          type="button"
          onClick={() => setAll(noneOn)}
          className="text-xs text-[#0F5B38] hover:underline cursor-pointer font-medium"
        >
          {noneOn ? 'Select all' : 'Deselect all'}
        </button>
      </div>

      {PERMISSION_TREE.map(group => {
        const parentOn      = perms[group.key] !== false
        const childKeys     = group.children.map(c => c.key)
        const checkedChildCount = childKeys.filter(k => perms[k] !== false).length
        const someChildOn   = checkedChildCount > 0 && checkedChildCount < childKeys.length
        const allChildrenOn = childKeys.length === 0 || childKeys.every(k => perms[k] !== false)

        function toggleParent() {
          const next = { ...perms, [group.key]: !parentOn }
          // When disabling parent, disable all children too
          if (parentOn) group.children.forEach(c => { next[c.key] = false })
          else group.children.forEach(c => { next[c.key] = true })
          onChange(next)
        }

        function toggleChild(key: string) {
          onChange({ ...perms, [key]: perms[key] === false })
        }

        return (
          <div key={group.key}>
            {/* Parent row */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
              <Checkbox
                checked={parentOn && allChildrenOn}
                indeterminate={parentOn && someChildOn}
                onChange={toggleParent}
                id={`perm-${group.key}`}
              />
              <span className="text-sm font-semibold text-slate-800">{group.label}</span>
            </label>

            {/* Children */}
            {group.children.length > 0 && parentOn && (
              <div className="ml-6 mt-1 space-y-1 border-l border-slate-100 pl-3">
                {group.children.map(child => (
                  <label key={child.key} className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
                    <Checkbox
                      checked={perms[child.key] !== false}
                      onChange={() => toggleChild(child.key)}
                      id={`perm-${child.key}`}
                    />
                    <span className="text-sm text-slate-600">{child.label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Collapsed indicator when parent is off */}
            {group.children.length > 0 && !parentOn && (
              <p className="ml-6 text-xs text-slate-400 mt-0.5">All sub-items disabled</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Role badge ──────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: 'Admin' | 'User' | 'ReadOnly' }) {
  if (role === 'Admin')
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-[#0F5B38]/10 text-[#0F5B38]"><ShieldCheck className="h-3 w-3" />Admin</span>
  if (role === 'ReadOnly')
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-blue-50 text-blue-600"><Shield className="h-3 w-3" />Read Only</span>
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-500"><Shield className="h-3 w-3" />User</span>
}

// ── Main component ──────────────────────────────────────────────────────────
export function OrgUsersTab({ activeOrg, currentUserId }: OrgUsersTabProps) {
  const [members,     setMembers]     = useState<OrgMember[]>([])
  const [invitations, setInvitations] = useState<OrgInvitation[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Invite form
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteEmail,     setInviteEmail]     = useState('')
  const [inviteRole,      setInviteRole]      = useState<'Admin' | 'User' | 'ReadOnly'>('User')
  const [invitePerms,     setInvitePerms]     = useState<Permissions>({ ...DEFAULT_PERMISSIONS })
  const [inviteSaving,    setInviteSaving]    = useState(false)
  const [inviteMsg,       setInviteMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Edit member
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editRole,        setEditRole]        = useState<'Admin' | 'User' | 'ReadOnly'>('User')
  const [editPerms,       setEditPerms]       = useState<Permissions>({})
  const [editSaving,      setEditSaving]      = useState(false)
  const [editMsg,         setEditMsg]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getOrgMembers(activeOrg.id)
      setMembers(data.members)
      setInvitations(data.invitations)
    } catch (e: any) {
      setError(e.message || 'Failed to load members.')
    } finally {
      setLoading(false)
    }
  }, [activeOrg.id])

  useEffect(() => { load() }, [load])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg(null)
    if (!inviteEmail.trim()) { setInviteMsg({ type: 'err', text: 'Email is required.' }); return }
    setInviteSaving(true)
    try {
      const res = await apiService.inviteOrgMember(
        activeOrg.id, inviteEmail.trim(), inviteRole,
        inviteRole === 'Admin' ? {} : invitePerms,
      )
      setInviteMsg({ type: 'ok', text: res.message })
      setInviteEmail('')
      setInviteRole('User')
      setInvitePerms({ ...DEFAULT_PERMISSIONS })
      await load()
    } catch (e: any) {
      setInviteMsg({ type: 'err', text: e.message || 'Failed to send invitation.' })
    } finally {
      setInviteSaving(false)
    }
  }

  function startEdit(m: OrgMember) {
    setEditingMemberId(m.id)
    setEditRole(m.role)
    const base = { ...DEFAULT_PERMISSIONS, ...m.permissions }
    setEditPerms(m.role === 'Admin' ? { ...DEFAULT_PERMISSIONS } : base)
    setEditMsg(null)
  }

  async function saveEdit(memberId: string) {
    setEditSaving(true)
    setEditMsg(null)
    try {
      const updated = await apiService.updateOrgMember(activeOrg.id, memberId, editRole, editRole === 'Admin' ? {} : editPerms)
      setMembers(prev => prev.map(m => m.id === memberId ? updated : m))
      setEditingMemberId(null)
    } catch (e: any) {
      setEditMsg(e.message || 'Failed to update member.')
    } finally {
      setEditSaving(false)
    }
  }

  async function removeMember(memberId: string, email: string) {
    if (!confirm(`Remove ${email} from this organization?`)) return
    try {
      await apiService.removeOrgMember(activeOrg.id, memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e: any) { alert(e.message || 'Failed to remove member.') }
  }

  async function cancelInvite(invId: string, email: string) {
    if (!confirm(`Cancel invitation for ${email}?`)) return
    try {
      await apiService.cancelInvitation(activeOrg.id, invId)
      setInvitations(prev => prev.filter(i => i.id !== invId))
    } catch (e: any) { alert(e.message || 'Failed to cancel invitation.') }
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-16 text-slate-400 text-sm">
      <RefreshCw className="h-4 w-4 animate-spin" />Loading members…
    </div>
  )
  if (error) return (
    <div className="flex items-center gap-2 text-rose-600 text-sm py-8">
      <AlertCircle className="h-4 w-4 shrink-0" />{error}
    </div>
  )

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Users &amp; Permissions</h3>
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
            Manage team access for <span className="text-slate-600">{activeOrg.name}</span>
          </p>
        </div>
        <button
          onClick={() => { setShowInvitePanel(v => !v); setInviteMsg(null) }}
          className="flex items-center gap-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-4 py-2.5 rounded-[3px] transition shadow-sm cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite User
        </button>
      </div>

      {/* Invite Panel */}
      {showInvitePanel && (
        <div className="bg-white border border-emerald-100 rounded-[3px] shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#0F5B38]" />
              <h2 className="text-sm font-bold text-slate-800">Invite a user</h2>
            </div>
            <button onClick={() => setShowInvitePanel(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-4 w-4" /></button>
          </div>

          {inviteMsg && (
            <div className={`px-4 py-3 rounded-[3px] text-xs flex items-center gap-2 mb-4 font-semibold ${inviteMsg.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-[#0F5B38]' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
              {inviteMsg.type === 'ok' ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
              {inviteMsg.text}
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email" required
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-9 pr-3 py-2 text-[15px] text-slate-800 focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Role</label>
                <select
                  value={inviteRole} onChange={e => setInviteRole(e.target.value as 'Admin' | 'User' | 'ReadOnly')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3 py-2 text-[15px] text-slate-800 focus:bg-white focus:border-[#0F5B38] focus:outline-none transition cursor-pointer"
                >
                  <option value="User">User — custom permissions</option>
                  <option value="ReadOnly">Read Only — view access only</option>
                  <option value="Admin">Admin — full access</option>
                </select>
              </div>
            </div>

            {(inviteRole === 'User' || inviteRole === 'ReadOnly') && (
              <div className="space-y-2">
                {inviteRole === 'ReadOnly' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-[3px] px-4 py-3 text-xs text-blue-700 font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 shrink-0" />
                    Read Only users can view the selected modules but cannot create, edit, or delete any data.
                  </div>
                )}
                <div className="bg-slate-50 border border-slate-200 rounded-[3px] p-4">
                  <PermissionToggles perms={invitePerms} onChange={setInvitePerms} />
                </div>
              </div>
            )}

            {inviteRole === 'Admin' && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-[3px] px-4 py-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Admins have full access to all modules and can manage users.
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={inviteSaving}
                className="flex items-center gap-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-5 py-2.5 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer">
                {inviteSaving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Sending…</> : <><Mail className="h-3.5 w-3.5" />Send Invitation</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white border border-slate-200 rounded-[3px] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <Users className="h-4 w-4 text-[#0F5B38]" />
          <h2 className="text-sm font-bold text-slate-800">Members <span className="text-slate-400 font-normal">({members.length})</span></h2>
        </div>

        <div className="divide-y divide-slate-50">
          {members.map(m => {
            const isSelf    = m.user.id === currentUserId
            const isEditing = editingMemberId === m.id
            return (
              <div key={m.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {m.user.first_name?.charAt(0).toUpperCase() || m.user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">
                          {m.user.first_name || m.user.last_name ? `${m.user.first_name} ${m.user.last_name}`.trim() : m.user.email}
                        </span>
                        <RoleBadge role={m.role} />
                        {isSelf && <span className="text-[11px] text-slate-400 font-semibold">(you)</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.user.email}</p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => isEditing ? setEditingMemberId(null) : startEdit(m)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-[3px] transition cursor-pointer flex items-center gap-1"
                      >
                        {isEditing ? <><ChevronUp className="h-3 w-3" />Collapse</> : <><ChevronDown className="h-3 w-3" />Edit</>}
                      </button>
                      <button
                        onClick={() => removeMember(m.id, m.user.email)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[3px] transition cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-4 pl-11 space-y-4">
                    <div className="space-y-1.5 max-w-xs">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Role</label>
                      <select
                        value={editRole} onChange={e => setEditRole(e.target.value as 'Admin' | 'User' | 'ReadOnly')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3 py-2 text-[15px] text-slate-800 focus:bg-white focus:border-[#0F5B38] focus:outline-none transition cursor-pointer"
                      >
                        <option value="User">User — custom permissions</option>
                        <option value="ReadOnly">Read Only — view access only</option>
                        <option value="Admin">Admin — full access</option>
                      </select>
                    </div>

                    {(editRole === 'User' || editRole === 'ReadOnly') && (
                      <div className="space-y-2 max-w-sm">
                        {editRole === 'ReadOnly' && (
                          <div className="bg-blue-50 border border-blue-100 rounded-[3px] px-4 py-3 text-xs text-blue-700 font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 shrink-0" />
                            Read Only users can view the selected modules but cannot create, edit, or delete any data.
                          </div>
                        )}
                        <div className="bg-slate-50 border border-slate-200 rounded-[3px] p-4">
                          <PermissionToggles perms={editPerms} onChange={setEditPerms} />
                        </div>
                      </div>
                    )}

                    {editMsg && (
                      <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />{editMsg}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(m.id)} disabled={editSaving}
                        className="flex items-center gap-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-4 py-2 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer"
                      >
                        {editSaving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving…</> : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditingMemberId(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[3px] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <Mail className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">Pending Invitations <span className="text-slate-400 font-normal">({invitations.length})</span></h2>
          </div>
          <div className="divide-y divide-slate-50">
            {invitations.map(inv => (
              <div key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center text-sm shrink-0">
                    {inv.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={inv.role} />
                      <span className="text-[11px] text-amber-600 font-semibold">Awaiting acceptance</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => cancelInvite(inv.id, inv.email)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[3px] transition cursor-pointer shrink-0"
                  title="Cancel invitation"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
