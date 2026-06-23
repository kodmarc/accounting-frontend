import { useState, useEffect } from 'react'
import {
  Calculator,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  FileText,
  BarChart3,
} from 'lucide-react'

interface AuthPageProps {
  authView: 'login' | 'signup' | 'forgot-password'
  setAuthView: (view: 'login' | 'signup' | 'forgot-password') => void
  email: string
  setEmail: (val: string) => void
  password: string
  setPassword: (val: string) => void
  firstName: string
  setFirstName: (val: string) => void
  lastName: string
  setLastName: (val: string) => void
  showPassword: boolean
  setShowPassword: (val: boolean) => void
  authStatus: 'idle' | 'loading' | 'success'
  errorMsg: string | null
  setErrorMsg: (val: string | null) => void
  successMsg: string | null
  setSuccessMsg: (val: string | null) => void
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => void
  handleSignup: (e: React.FormEvent<HTMLFormElement>) => void
  handleForgotPassword: (e: React.FormEvent<HTMLFormElement>) => void
  handleVerifyOtp: (code: string, newPassword: string) => void
}

export function AuthPage({
  authView,
  setAuthView,
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  showPassword,
  setShowPassword,
  authStatus,
  errorMsg,
  setErrorMsg,
  successMsg,
  setSuccessMsg,
  handleLogin,
  handleSignup,
  handleForgotPassword,
  handleVerifyOtp,
}: AuthPageProps) {
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email')
  const [otpCode, setOtpCode] = useState('')
  const [otpNewPassword, setOtpNewPassword] = useState('')
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('')
  const [showOtpPassword, setShowOtpPassword] = useState(false)
  const [otpLocalError, setOtpLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (authView === 'forgot-password' && authStatus === 'success' && otpStep === 'email') {
      setOtpStep('code')
      setSuccessMsg(null)
    }
  }, [authStatus, authView, otpStep])

  useEffect(() => {
    if (authView !== 'forgot-password') {
      setOtpStep('email')
      setOtpCode('')
      setOtpNewPassword('')
      setOtpConfirmPassword('')
      setOtpLocalError(null)
    }
  }, [authView])

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOtpLocalError(null)
    if (!otpCode.trim() || otpCode.length !== 6) {
      setOtpLocalError('Please enter the 6-digit code from your email.')
      return
    }
    if (otpNewPassword.length < 8) {
      setOtpLocalError('New password must be at least 8 characters.')
      return
    }
    if (otpNewPassword !== otpConfirmPassword) {
      setOtpLocalError('Passwords do not match.')
      return
    }
    handleVerifyOtp(otpCode, otpNewPassword)
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-11 pr-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all'
  const inputWithToggleCls = 'w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-11 pr-12 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all'
  const labelCls = 'text-xs font-bold text-slate-500 uppercase tracking-wide'
  const btnCls = (disabled: boolean) =>
    `w-full bg-gradient-to-r from-[#071f13] to-[#0F5B38] text-white font-bold py-3 rounded-[3px] shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${disabled ? 'opacity-75 cursor-not-allowed' : 'hover:brightness-105'}`

  return (
    <div className="min-h-screen flex antialiased font-sans">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex w-5/12 xl:w-[42%] bg-gradient-to-br from-[#071f13] via-[#0a3320] to-[#0F5B38] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/5 rounded-full" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 bg-white/10 rounded-[3px] flex items-center justify-center">
            <Calculator className="h-5 w-5 text-emerald-300" />
          </div>
          <span className="text-white font-black text-lg tracking-tight">KDM Accounting</span>
        </div>

        {/* Feature list */}
        <div className="space-y-6 relative z-10">
          <div>
            <h2 className="text-white text-3xl font-black leading-snug">
              Your complete<br />financial workspace
            </h2>
            <p className="text-emerald-200/60 text-sm mt-3 leading-relaxed">
              Invoices, reports, bank reconciliation and more — built for growing businesses.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: FileText, label: 'Invoices & Bills' },
              { icon: TrendingUp, label: 'Profit & Loss, Balance Sheet' },
              { icon: BarChart3, label: 'Cash Flow & Account Transactions' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-emerald-100/80 text-sm font-semibold">
                <div className="h-7 w-7 bg-white/10 rounded-[3px] flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-emerald-400/40 text-xs relative z-10">© {new Date().getFullYear()} KDM Accounting</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-8">
            {/* Mobile-only logo */}
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="h-8 w-8 bg-gradient-to-br from-[#071f13] to-[#0F5B38] rounded-[3px] flex items-center justify-center">
                <Calculator className="h-4 w-4 text-emerald-300" />
              </div>
              <span className="font-black text-[#071f13] text-base">KDM Accounting</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              {authView === 'forgot-password' && otpStep === 'code' &&
                <ShieldCheck className="h-5 w-5 text-[#0F5B38]" />
              }
              <h1 className="text-2xl font-black text-[#071f13] tracking-tight">
                {authView === 'login' && 'Welcome back'}
                {authView === 'signup' && 'Create your account'}
                {authView === 'forgot-password' && otpStep === 'email' && 'Reset your password'}
                {authView === 'forgot-password' && otpStep === 'code' && 'Enter your code'}
              </h1>
            </div>
            <p className="text-slate-400 text-sm">
              {authView === 'login' && 'Enter your credentials to access your portal.'}
              {authView === 'signup' && 'Fill in your details to get started.'}
              {authView === 'forgot-password' && otpStep === 'email' && "We'll send a 6-digit code to your email."}
              {authView === 'forgot-password' && otpStep === 'code' && 'Check your inbox and enter the code below.'}
            </p>
          </div>

          {/* Error / success banners */}
          {errorMsg && (
            <div className="p-3.5 mb-5 bg-rose-50 border border-rose-100 rounded-[3px] flex items-start gap-2 text-rose-600 text-sm">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}
          {successMsg && authView !== 'forgot-password' && (
            <div className="p-3.5 mb-5 bg-emerald-50 border border-emerald-100 rounded-[3px] flex items-start gap-2 text-emerald-700 text-sm">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* ── Login ── */}
          {authView === 'login' && (
            <form onSubmit={handleLogin} action="/auth-success" target="hidden_iframe" method="POST" className="space-y-5">
              <div className="space-y-1.5">
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input id="login-email" type="email" name="email" required placeholder="name@company.com"
                    autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                    className={inputCls} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} name="password" required
                    placeholder="••••••••" autoComplete="current-password" value={password}
                    onChange={e => setPassword(e.target.value)} className={inputWithToggleCls} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button"
                  onClick={() => { setAuthView('forgot-password'); setErrorMsg(null); setSuccessMsg(null) }}
                  className="text-xs text-[#0F5B38] font-semibold hover:underline cursor-pointer">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={authStatus !== 'idle'} className={btnCls(authStatus !== 'idle')}>
                {authStatus === 'loading' && <RefreshCw className="h-4 w-4 animate-spin shrink-0" />}
                {authStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />}
                <span>Sign In</span>
              </button>

              <p className="text-center text-sm text-slate-500 font-semibold">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setAuthView('signup'); setErrorMsg(null); setSuccessMsg(null) }}
                  className="text-[#0F5B38] font-bold hover:underline cursor-pointer">Create one</button>
              </p>
            </form>
          )}

          {/* ── Sign Up ── */}
          {authView === 'signup' && (
            <form onSubmit={handleSignup} action="/auth-success" target="hidden_iframe" method="POST" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>First Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input type="text" placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)}
                      className={inputCls} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Last Name</label>
                  <input type="text" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input type="email" name="email" required placeholder="jane.doe@company.com"
                    autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                    className={inputCls} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} name="password" required
                    placeholder="Min. 8 characters" autoComplete="new-password" value={password}
                    onChange={e => setPassword(e.target.value)} className={inputWithToggleCls} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={authStatus !== 'idle'} className={btnCls(authStatus !== 'idle')}>
                {authStatus === 'loading' && <RefreshCw className="h-4 w-4 animate-spin shrink-0" />}
                {authStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />}
                <span>Sign Up</span>
              </button>

              <p className="text-center text-sm text-slate-500 font-semibold">
                Already have an account?{' '}
                <button type="button" onClick={() => { setAuthView('login'); setErrorMsg(null); setSuccessMsg(null) }}
                  className="text-[#0F5B38] font-bold hover:underline cursor-pointer">Sign In</button>
              </p>
            </form>
          )}

          {/* ── Forgot Password — Step 1 ── */}
          {authView === 'forgot-password' && otpStep === 'email' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input type="email" required placeholder="name@company.com" autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                </div>
              </div>

              <button type="submit" disabled={authStatus !== 'idle'} className={btnCls(authStatus !== 'idle')}>
                {authStatus === 'loading' && <RefreshCw className="h-4 w-4 animate-spin shrink-0" />}
                <span>Send Code</span>
              </button>

              <p className="text-center text-sm font-semibold">
                <button type="button" onClick={() => { setAuthView('login'); setErrorMsg(null); setSuccessMsg(null) }}
                  className="text-[#0F5B38] font-bold hover:underline cursor-pointer">Back to Sign In</button>
              </p>
            </form>
          )}

          {/* ── Forgot Password — Step 2 ── */}
          {authView === 'forgot-password' && otpStep === 'code' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-[3px] px-4 py-3 text-sm text-emerald-700 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Code sent to <span className="font-black">{email}</span>
              </div>

              {otpLocalError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-[3px] flex items-start gap-2 text-rose-600 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{otpLocalError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className={labelCls}>6-Digit Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456"
                    value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-11 pr-4 py-3 text-sm font-semibold text-slate-800 tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input type={showOtpPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                    autoComplete="new-password" value={otpNewPassword} onChange={e => setOtpNewPassword(e.target.value)}
                    className={inputWithToggleCls} />
                  <button type="button" onClick={() => setShowOtpPassword(v => !v)}
                    className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showOtpPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input type={showOtpPassword ? 'text' : 'password'} placeholder="Confirm password"
                    autoComplete="new-password" value={otpConfirmPassword}
                    onChange={e => setOtpConfirmPassword(e.target.value)} className={inputWithToggleCls} />
                </div>
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-[3px] flex items-center gap-2 text-emerald-700 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
              )}

              <button type="submit" disabled={authStatus !== 'idle'} className={btnCls(authStatus !== 'idle')}>
                {authStatus === 'loading' && <RefreshCw className="h-4 w-4 animate-spin shrink-0" />}
                {authStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />}
                <span>Reset Password</span>
              </button>

              <div className="flex items-center justify-between">
                <button type="button"
                  onClick={() => { setOtpStep('email'); setOtpCode(''); setOtpLocalError(null); setErrorMsg(null) }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold hover:underline cursor-pointer">
                  ← Resend code
                </button>
                <button type="button" onClick={() => { setAuthView('login'); setErrorMsg(null); setSuccessMsg(null) }}
                  className="text-xs text-[#0F5B38] font-bold hover:underline cursor-pointer">
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
      <iframe name="hidden_iframe" id="hidden_iframe" style={{ display: 'none' }}></iframe>
    </div>
  )
}
