import {
  Calculator,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  User as UserIcon
} from 'lucide-react'

interface AuthPageProps {
  authView: 'login' | 'signup' | 'forgot-password' | 'reset-password'
  setAuthView: (view: 'login' | 'signup' | 'forgot-password' | 'reset-password') => void
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
  handleResetPassword: (e: React.FormEvent<HTMLFormElement>) => void
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
  handleResetPassword,
}: AuthPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 antialiased font-sans relative overflow-hidden">
      {/* Modern subtle shadows/accent spots */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#0F5B38]/5 rounded-full blur-3xl translate-x-[-20%] translate-y-[-20%]"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#0F5B38]/5 rounded-full blur-3xl translate-x-[20%] translate-y-[20%]"></div>

      <div className="w-full max-w-lg bg-white rounded-[3px] shadow-2xl p-12 border border-slate-100 relative z-10 transition-all duration-500">
        <div className="text-center space-y-2 mb-8">
          <div className="h-12 w-12 bg-gradient-to-br from-[#071f13] to-[#0F5B38] rounded-[3px] mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/25">
            <Calculator className="h-6 w-6 text-emerald-200" />
          </div>
          <h1 className="text-3xl font-black text-[#071f13] tracking-tight">
            {authView === 'login' && 'Welcome Back'}
            {authView === 'signup' && 'Get Started'}
            {authView === 'forgot-password' && 'Reset Password'}
            {authView === 'reset-password' && 'New Password'}
          </h1>
          <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">
            {authView === 'login' && 'Access your financial portal'}
            {authView === 'signup' && 'Create a fresh account'}
            {authView === 'forgot-password' && 'We\'ll send you a reset link'}
            {authView === 'reset-password' && 'Choose a new password'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-100 rounded-[3px] flex items-start space-x-2 text-rose-600 text-sm animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 mb-6 bg-emerald-50 border border-emerald-100 rounded-[3px] flex items-start space-x-2 text-emerald-700 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {authView === 'login' ? (
          <form onSubmit={handleLogin} action="/auth-success" target="hidden_iframe" method="POST" className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  required
                  placeholder="name@company.com"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-12 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-[3px] transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setAuthView('forgot-password'); setErrorMsg(null); setSuccessMsg(null) }}
                className="text-xs text-[#0F5B38] font-semibold hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={authStatus !== 'idle'}
              className={`w-full bg-gradient-to-r from-[#071f13] to-[#0F5B38] hover:brightness-105 text-white font-bold py-3.5 rounded-[3px] shadow-lg shadow-emerald-900/10 transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 ${
                authStatus !== 'idle' ? 'opacity-90 cursor-not-allowed' : ''
              }`}
            >
              {authStatus === 'loading' && (
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-250 shrink-0" />
              )}
              {authStatus === 'success' && (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300 shrink-0" />
              )}
              <span>
                {authStatus === 'idle' && 'Sign In'}
                {authStatus === 'loading' && 'Verifying Credentials...'}
                {authStatus === 'success' && 'Welcome! Entering Portal...'}
              </span>
            </button>

            <div className="text-center text-sm text-slate-500 mt-6 font-semibold">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthView('signup')
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="text-[#0F5B38] font-bold hover:underline"
              >
                Create one now
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} action="/auth-success" target="hidden_iframe" method="POST" className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="signup-firstname" className="text-xs font-bold text-slate-500 uppercase tracking-wide">First Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    id="signup-firstname"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-lastname" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Last Name</label>
                <input
                  id="signup-lastname"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  required
                  placeholder="jane.doe@company.com"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-12 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-[3px] transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authStatus !== 'idle'}
              className={`w-full bg-gradient-to-r from-[#071f13] to-[#0F5B38] hover:brightness-105 text-white font-bold py-3.5 rounded-[3px] shadow-lg shadow-emerald-900/10 transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 ${
                authStatus !== 'idle' ? 'opacity-90 cursor-not-allowed' : ''
              }`}
            >
              {authStatus === 'loading' && (
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-250 shrink-0" />
              )}
              {authStatus === 'success' && (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300 shrink-0" />
              )}
              <span>
                {authStatus === 'idle' && 'Sign Up'}
                {authStatus === 'loading' && 'Creating Account...'}
                {authStatus === 'success' && 'Success! Directing to portal...'}
              </span>
            </button>

            <div className="text-center text-sm text-slate-500 mt-6 font-semibold">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthView('login')
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="text-[#0F5B38] font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {authView === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authStatus !== 'idle'}
              className={`w-full bg-gradient-to-r from-[#071f13] to-[#0F5B38] hover:brightness-105 text-white font-bold py-3.5 rounded-[3px] shadow-lg shadow-emerald-900/10 transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 ${authStatus !== 'idle' ? 'opacity-90 cursor-not-allowed' : ''}`}
            >
              {authStatus === 'loading' && <RefreshCw className="h-4 w-4 animate-spin shrink-0" />}
              {authStatus === 'success' && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300 shrink-0" />}
              <span>
                {authStatus === 'idle' && 'Send Reset Link'}
                {authStatus === 'loading' && 'Sending...'}
                {authStatus === 'success' && 'Link Sent!'}
              </span>
            </button>

            <div className="text-center text-sm text-slate-500 font-semibold">
              <button
                type="button"
                onClick={() => { setAuthView('login'); setErrorMsg(null); setSuccessMsg(null) }}
                className="text-[#0F5B38] font-bold hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {authView === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="reset-password" className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-12 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-[3px] transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authStatus !== 'idle'}
              className={`w-full bg-gradient-to-r from-[#071f13] to-[#0F5B38] hover:brightness-105 text-white font-bold py-3.5 rounded-[3px] shadow-lg shadow-emerald-900/10 transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 ${authStatus !== 'idle' ? 'opacity-90 cursor-not-allowed' : ''}`}
            >
              {authStatus === 'loading' && <RefreshCw className="h-4 w-4 animate-spin shrink-0" />}
              {authStatus === 'success' && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300 shrink-0" />}
              <span>
                {authStatus === 'idle' && 'Set New Password'}
                {authStatus === 'loading' && 'Updating...'}
                {authStatus === 'success' && 'Password Updated!'}
              </span>
            </button>
          </form>
        )}
      </div>
      <iframe name="hidden_iframe" id="hidden_iframe" style={{ display: 'none' }}></iframe>
    </div>
  )
}
