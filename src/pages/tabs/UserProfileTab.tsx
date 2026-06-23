import React, { useState } from 'react'
import {
  User, Lock, Eye, EyeOff, Save, CheckCircle, RefreshCw, KeyRound,
  Mail, AlertCircle, ShieldCheck, Pencil, X,
} from 'lucide-react'
import { apiService } from '../../services/api'
import type { User as ApiUser } from '../../services/api'
import type { TabId } from '../../types/tabs'

interface UserProfileTabProps {
  currentUser: ApiUser | null
  setCurrentUser: (user: ApiUser) => void
  setActiveTab: (tab: TabId) => void
}

type Msg = { type: 'ok' | 'err'; text: string }

function MsgBanner({ msg }: { msg: Msg }) {
  return (
    <div className={`px-4 py-3 rounded-[3px] text-sm flex items-center space-x-2 ${
      msg.type === 'ok'
        ? 'bg-emerald-50 border border-emerald-200 text-[#0F5B38]'
        : 'bg-rose-50 border border-rose-200 text-rose-700'
    }`}>
      {msg.type === 'ok'
        ? <CheckCircle className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      <span className="font-semibold">{msg.text}</span>
    </div>
  )
}

export function UserProfileTab({ currentUser, setCurrentUser, setActiveTab }: UserProfileTabProps) {
  // ── Profile (name only) ──────────────────────────────────────────────
  const [firstName, setFirstName] = useState(currentUser?.first_name || '')
  const [lastName,  setLastName]  = useState(currentUser?.last_name  || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg,    setProfileMsg]    = useState<Msg | null>(null)

  // ── Email change ─────────────────────────────────────────────────────
  const [emailPanelOpen, setEmailPanelOpen] = useState(false)
  const [newEmail,       setNewEmail]       = useState('')
  const [emailStep,      setEmailStep]      = useState<'enter' | 'verify'>('enter')
  const [emailCode,      setEmailCode]      = useState('')
  const [emailSaving,    setEmailSaving]    = useState(false)
  const [emailMsg,       setEmailMsg]       = useState<Msg | null>(null)

  // ── Password ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg,    setPasswordMsg]    = useState<Msg | null>(null)

  // ── OTP reset ────────────────────────────────────────────────────────
  const [otpMode,            setOtpMode]            = useState(false)
  const [otpStep,            setOtpStep]            = useState<'idle' | 'sent'>('idle')
  const [otpCode,            setOtpCode]            = useState('')
  const [otpNewPassword,     setOtpNewPassword]     = useState('')
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('')
  const [showOtpPassword,    setShowOtpPassword]    = useState(false)
  const [otpSaving,          setOtpSaving]          = useState(false)
  const [otpMsg,             setOtpMsg]             = useState<Msg | null>(null)

  // ── Handlers ─────────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    if (!firstName.trim() || !lastName.trim()) {
      setProfileMsg({ type: 'err', text: 'First name and last name are required.' })
      return
    }
    setProfileSaving(true)
    try {
      const res = await apiService.updateMe(firstName.trim(), lastName.trim())
      setCurrentUser(res.user)
      setProfileMsg({ type: 'ok', text: 'Profile updated successfully.' })
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.message || 'Failed to save profile.' })
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setEmailMsg({ type: 'err', text: 'Please enter a valid email address.' })
      return
    }
    setEmailSaving(true)
    try {
      const res = await apiService.requestEmailChange(newEmail.trim().toLowerCase())
      setEmailMsg({ type: 'ok', text: res.message })
      setEmailStep('verify')
    } catch (err: any) {
      setEmailMsg({ type: 'err', text: err.message || 'Failed to send verification code.' })
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleConfirmEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    if (!emailCode || emailCode.length !== 6) {
      setEmailMsg({ type: 'err', text: 'Please enter the 6-digit code from your email.' })
      return
    }
    setEmailSaving(true)
    try {
      const res = await apiService.confirmEmailChange(emailCode)
      setCurrentUser(res.user)
      setEmailMsg({ type: 'ok', text: res.message })
      setTimeout(() => {
        setEmailPanelOpen(false)
        setEmailStep('enter')
        setNewEmail('')
        setEmailCode('')
        setEmailMsg(null)
      }, 2000)
    } catch (err: any) {
      setEmailMsg({ type: 'err', text: err.message || 'Invalid or expired code.' })
    } finally {
      setEmailSaving(false)
    }
  }

  function closeEmailPanel() {
    setEmailPanelOpen(false)
    setEmailStep('enter')
    setNewEmail('')
    setEmailCode('')
    setEmailMsg(null)
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (!currentPassword) {
      setPasswordMsg({ type: 'err', text: 'Please enter your current password.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }
    setPasswordSaving(true)
    try {
      await apiService.updatePassword(currentPassword, newPassword)
      setPasswordMsg({ type: 'ok', text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordMsg({ type: 'err', text: err.message || 'Failed to update password.' })
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleOtpSendCode() {
    if (!currentUser?.email) return
    setOtpMsg(null)
    setOtpSaving(true)
    try {
      await apiService.requestOtp(currentUser.email)
      setOtpStep('sent')
      setOtpMsg({ type: 'ok', text: `Code sent to ${currentUser.email}` })
    } catch (err: any) {
      setOtpMsg({ type: 'err', text: err.message || 'Failed to send code. Try again.' })
    } finally {
      setOtpSaving(false)
    }
  }

  async function handleOtpReset(e: React.FormEvent) {
    e.preventDefault()
    setOtpMsg(null)
    if (!otpCode || otpCode.length !== 6) {
      setOtpMsg({ type: 'err', text: 'Please enter the 6-digit code from your email.' })
      return
    }
    if (otpNewPassword.length < 8) {
      setOtpMsg({ type: 'err', text: 'New password must be at least 8 characters.' })
      return
    }
    if (otpNewPassword !== otpConfirmPassword) {
      setOtpMsg({ type: 'err', text: 'Passwords do not match.' })
      return
    }
    setOtpSaving(true)
    try {
      await apiService.verifyOtp(currentUser!.email, otpCode, otpNewPassword)
      setOtpMsg({ type: 'ok', text: 'Password reset successfully!' })
      setTimeout(() => {
        setOtpMode(false)
        setOtpStep('idle')
        setOtpCode('')
        setOtpNewPassword('')
        setOtpConfirmPassword('')
        setOtpMsg(null)
        setPasswordMsg({ type: 'ok', text: 'Password reset via OTP successfully.' })
      }, 1800)
    } catch (err: any) {
      setOtpMsg({ type: 'err', text: err.message || 'Invalid or expired code.' })
    } finally {
      setOtpSaving(false)
    }
  }

  function exitOtpMode() {
    setOtpMode(false)
    setOtpStep('idle')
    setOtpCode('')
    setOtpNewPassword('')
    setOtpConfirmPassword('')
    setOtpMsg(null)
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your profile details and password.</p>
        </div>
        <button
          onClick={() => setActiveTab('Home')}
          className="mt-3 md:mt-0 text-xs font-bold text-slate-650 hover:bg-slate-100 px-4 py-2 border border-slate-200 rounded-[3px] transition duration-200 cursor-pointer"
        >
          Return Dashboard
        </button>
      </div>

      {/* ── Profile Card (name only) ── */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-5">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <User className="h-4.5 w-4.5 text-[#0F5B38]" />
          <h2 className="text-base font-bold text-slate-800">Personal Information</h2>
        </div>

        {profileMsg && <MsgBanner msg={profileMsg} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
              placeholder="First name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
              placeholder="Last name"
              required
            />
          </div>
        </div>

        {/* Email display (read-only) + Change Email button */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Email Address</label>
            {!emailPanelOpen && (
              <button
                type="button"
                onClick={() => setEmailPanelOpen(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#0F5B38] hover:underline cursor-pointer"
              >
                <Pencil className="h-3 w-3" />
                Change email
              </button>
            )}
          </div>
          <div className="w-full bg-slate-100 border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-500 text-[15px] select-all">
            {currentUser?.email}
          </div>
          <p className="text-[11px] text-slate-400">This is the email you use to sign in. Changing it requires OTP verification.</p>
        </div>

        {/* Email change inline panel */}
        {emailPanelOpen && (
          <div className="border border-slate-200 rounded-[3px] p-4 space-y-4 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#0F5B38]" />
                <span className="text-sm font-bold text-slate-800">Change Email Address</span>
              </div>
              <button type="button" onClick={closeEmailPanel} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {emailMsg && <MsgBanner msg={emailMsg} />}

            {emailStep === 'enter' && (
              <form onSubmit={handleRequestEmailChange} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="new@email.com"
                    autoFocus
                    className="w-full bg-white border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-800 text-[15px] focus:border-[#0F5B38] focus:outline-none transition"
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    A 6-digit code will be sent to this address to verify it, and a notification will be sent to <span className="font-semibold text-slate-500">{currentUser?.email}</span>.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={emailSaving}
                  className="flex items-center gap-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-5 py-2.5 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {emailSaving
                    ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Sending code…</>
                    : <><Mail className="h-3.5 w-3.5" />Send Verification Code</>}
                </button>
              </form>
            )}

            {emailStep === 'verify' && (
              <form onSubmit={handleConfirmEmailChange} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">6-Digit Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={emailCode}
                    onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-white border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-800 text-[15px] tracking-[0.3em] focus:border-[#0F5B38] focus:outline-none transition"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    Enter the code sent to <span className="font-semibold text-slate-600">{newEmail}</span>.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setEmailStep('enter'); setEmailCode(''); setEmailMsg(null) }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold hover:underline cursor-pointer"
                  >
                    ← Resend / change email
                  </button>
                  <button
                    type="submit"
                    disabled={emailSaving}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-5 py-2.5 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {emailSaving
                      ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Verifying…</>
                      : <><ShieldCheck className="h-3.5 w-3.5" />Confirm Change</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profileSaving}
            className="flex items-center space-x-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-5 py-2.5 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {profileSaving
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Saving…</span></>
              : <><Save className="h-3.5 w-3.5" /><span>Save Profile</span></>}
          </button>
        </div>
      </form>

      {/* ── Password Card — normal mode ── */}
      {!otpMode && (
        <form onSubmit={handleUpdatePassword} className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Lock className="h-4.5 w-4.5 text-[#0F5B38]" />
            <h2 className="text-base font-bold text-slate-800">Change Password</h2>
          </div>

          {passwordMsg && <MsgBanner msg={passwordMsg} />}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Current Password</label>
              <button
                type="button"
                onClick={() => { setPasswordMsg(null); setOtpMode(true) }}
                className="text-[11px] text-[#0F5B38] font-semibold hover:underline cursor-pointer"
              >
                Forgot current password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-3.5 pr-10 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-3.5 pr-10 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-3.5 pr-10 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="flex items-center space-x-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-5 py-2.5 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {passwordSaving
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Updating…</span></>
                : <><KeyRound className="h-3.5 w-3.5" /><span>Update Password</span></>}
            </button>
          </div>
        </form>
      )}

      {/* ── Password Card — OTP reset mode ── */}
      {otpMode && (
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4.5 w-4.5 text-[#0F5B38]" />
              <h2 className="text-base font-bold text-slate-800">Reset Password via Email</h2>
            </div>
            <button type="button" onClick={exitOtpMode}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold hover:underline cursor-pointer">
              ← Back
            </button>
          </div>

          {otpMsg && <MsgBanner msg={otpMsg} />}

          {otpStep === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                We'll send a 6-digit verification code to{' '}
                <span className="font-bold text-slate-700">{currentUser?.email}</span>.
              </p>
              <button
                type="button"
                onClick={handleOtpSendCode}
                disabled={otpSaving}
                className="flex items-center space-x-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-5 py-2.5 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {otpSaving
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Sending…</span></>
                  : <><Mail className="h-3.5 w-3.5" /><span>Send Code to My Email</span></>}
              </button>
            </div>
          )}

          {otpStep === 'sent' && (
            <form onSubmit={handleOtpReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-800 text-[15px] tracking-[0.3em] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showOtpPassword ? 'text' : 'password'}
                      value={otpNewPassword}
                      onChange={e => setOtpNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-3.5 pr-10 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowOtpPassword(v => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showOtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showOtpPassword ? 'text' : 'password'}
                      value={otpConfirmPassword}
                      onChange={e => setOtpConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-3.5 pr-10 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition"
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setOtpStep('idle'); setOtpCode(''); setOtpMsg(null) }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold hover:underline cursor-pointer"
                >
                  Resend code
                </button>
                <button
                  type="submit"
                  disabled={otpSaving}
                  className="flex items-center space-x-2 text-xs font-bold text-white bg-[#0F5B38] hover:brightness-105 px-5 py-2.5 rounded-[3px] transition shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {otpSaving
                    ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Verifying…</span></>
                    : <><KeyRound className="h-3.5 w-3.5" /><span>Reset Password</span></>}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
