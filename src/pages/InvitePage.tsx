import { useState, useEffect } from 'react'
import { Calculator, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Building } from 'lucide-react'
import { apiService } from '../services/api'
import type { InvitationInfo, Membership } from '../services/api'

interface InvitePageProps {
  token: string
  isAuthenticated: boolean
  currentUserEmail: string | null
  onAccepted: (membership: Membership) => void
  onGoToLogin: () => void
}

export function InvitePage({ token, isAuthenticated, currentUserEmail, onAccepted, onGoToLogin }: InvitePageProps) {
  const [info, setInfo] = useState<InvitationInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    apiService.getInvitationInfo(token)
      .then(setInfo)
      .catch(e => setLoadError(e.message || 'Invitation not found or already used.'))
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    setAcceptError(null)
    try {
      const res = await apiService.acceptInvitation(token)
      setAccepted(true)
      setTimeout(() => onAccepted(res.membership), 1500)
    } catch (e: any) {
      setAcceptError(e.message || 'Failed to accept invitation.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-gradient-to-br from-[#071f13] to-[#0F5B38] rounded-[3px] mx-auto flex items-center justify-center shadow-lg mb-4">
            <Calculator className="h-6 w-6 text-emerald-200" />
          </div>
          <h1 className="text-2xl font-black text-[#071f13]">KDM Accounting</h1>
        </div>

        <div className="bg-white rounded-[3px] border border-slate-200 shadow-sm p-8 space-y-5">
          {!info && !loadError && (
            <div className="flex items-center justify-center gap-2 text-slate-400 py-6">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading invitation…</span>
            </div>
          )}

          {loadError && (
            <div className="flex items-start gap-2 text-rose-600 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{loadError}</span>
            </div>
          )}

          {info && (
            <>
              {info.is_expired || info.status === 'accepted' ? (
                <div className="space-y-3 text-center">
                  <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
                  <p className="font-bold text-slate-700">
                    {info.status === 'accepted' ? 'This invitation has already been used.' : 'This invitation has expired.'}
                  </p>
                  <p className="text-sm text-slate-400">Please ask your administrator to send a new invitation.</p>
                </div>
              ) : accepted ? (
                <div className="space-y-3 text-center">
                  <CheckCircle2 className="h-10 w-10 text-[#0F5B38] mx-auto" />
                  <p className="font-bold text-slate-700">You've joined {info.organization_name}!</p>
                  <p className="text-sm text-slate-400">Redirecting to your dashboard…</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-[3px]">
                    <Building className="h-5 w-5 text-[#0F5B38] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{info.organization_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold">{info.invited_by}</span> invited you to join as{' '}
                        <span className="inline-flex items-center gap-0.5 font-bold text-[#0F5B38]">
                          <ShieldCheck className="h-3 w-3" />{info.role}
                        </span>
                      </p>
                    </div>
                  </div>

                  {acceptError && (
                    <div className="flex items-start gap-2 text-rose-600 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="font-semibold">{acceptError}</span>
                    </div>
                  )}

                  {isAuthenticated ? (
                    <div className="space-y-3">
                      {currentUserEmail?.toLowerCase() !== info.email.toLowerCase() && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-[3px] text-xs text-amber-700 font-semibold flex items-start gap-2">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          This invitation was sent to <span className="font-black">{info.email}</span>. You're signed in as <span className="font-black">{currentUserEmail}</span>. Please sign in with the correct account.
                        </div>
                      )}
                      <button
                        onClick={handleAccept}
                        disabled={accepting || currentUserEmail?.toLowerCase() !== info.email.toLowerCase()}
                        className="w-full bg-gradient-to-r from-[#071f13] to-[#0F5B38] hover:brightness-105 text-white font-bold py-3 rounded-[3px] transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                      >
                        {accepting ? <><RefreshCw className="h-4 w-4 animate-spin" />Joining…</> : 'Accept Invitation'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-500 text-center">
                        Sign in or create an account with <span className="font-bold text-slate-700">{info.email}</span> to accept.
                      </p>
                      <button
                        onClick={onGoToLogin}
                        className="w-full bg-gradient-to-r from-[#071f13] to-[#0F5B38] hover:brightness-105 text-white font-bold py-3 rounded-[3px] transition cursor-pointer"
                      >
                        Sign In to Accept
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
