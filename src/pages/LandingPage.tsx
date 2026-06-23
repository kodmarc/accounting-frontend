import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Calculator, FileText, TrendingUp, Users, Building2, ShieldCheck,
  ArrowRight, BarChart3, CreditCard, Globe, Check,
  Zap, Lock, DollarSign, PieChart,
  CheckCircle2, ChevronRight, ArrowUpRight, Package, BookOpen,
  Layers, BellRing, RefreshCw, Briefcase,
} from 'lucide-react'

interface LandingPageProps {
  onSignIn: () => void
  onGetStarted: () => void
}

// ── Scroll-into-view hook ────────────────────────────────────────────────────
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, options)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, prefix = '', suffix = '', duration = 1800 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0)
  const { ref, visible } = useInView({ threshold: 0.5 })
  useEffect(() => {
    if (!visible) return
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * to))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [visible, to, duration])
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}

// ── Animated section wrapper ─────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView({ threshold: 0.1 })
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ── Hero dashboard mockup ────────────────────────────────────────────────────
function DashboardMockup() {
  const bars = [42, 58, 48, 72, 55, 80, 63, 88, 70, 92, 78, 95]
  return (
    <div className="relative w-full max-w-[480px] select-none" style={{ animation: 'kdm-float 4s ease-in-out infinite' }}>

      {/* ── Floating card: Invoice ── */}
      <div
        className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl border border-slate-100 px-3.5 py-3 z-20 w-44"
        style={{ animation: 'kdm-float 3.5s ease-in-out infinite 0.4s' }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <FileText className="h-3 w-3 text-emerald-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-700">Invoice Sent</span>
        </div>
        <p className="text-[18px] font-black text-slate-800 leading-none">$8,400</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-400">Due in 14 days</span>
        </div>
      </div>

      {/* ── Floating card: Report ── */}
      <div
        className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl border border-slate-100 px-3.5 py-3 z-20 w-44"
        style={{ animation: 'kdm-float 4.2s ease-in-out infinite 0.8s' }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-[11px] font-bold text-slate-700">P&amp;L Report</span>
        </div>
        <div className="flex items-end gap-0.5 h-7 mb-1.5">
          {[3, 5, 4, 7, 5, 8, 6].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 14}%`, background: i === 5 ? '#0F5B38' : '#d1fae5' }} />
          ))}
        </div>
        <p className="text-[10px] font-semibold text-emerald-600">↑ 28% vs last quarter</p>
      </div>

      {/* ── Floating badge: Bank sync ── */}
      <div
        className="absolute top-1/2 -right-8 -translate-y-1/2 bg-white rounded-full shadow-lg border border-slate-100 px-3 py-1.5 z-20 flex items-center gap-1.5"
        style={{ animation: 'kdm-float 5s ease-in-out infinite 1.2s' }}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">Bank Synced</span>
      </div>

      {/* ── Main dashboard card ── */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Title bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="flex-1 flex gap-1 ml-2">
            {['Overview', 'Sales', 'Reports', 'Banking'].map((t, i) => (
              <span key={t} className={`text-[11px] px-2.5 py-1 rounded-[3px] font-medium cursor-default ${i === 0 ? 'bg-[#071f13] text-white' : 'text-slate-400 hover:text-slate-600'}`}>{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <RefreshCw className="h-2.5 w-2.5" />
            <span>Live</span>
          </div>
        </div>

        <div className="p-5">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Revenue', val: '$124.5K', chg: '+12.4%', up: true, bg: 'bg-emerald-50', txt: 'text-emerald-700' },
              { label: 'Expenses', val: '$43.2K', chg: '−3.1%', up: false, bg: 'bg-red-50', txt: 'text-red-600' },
              { label: 'Net Profit', val: '$81.3K', chg: '+28.2%', up: true, bg: 'bg-blue-50', txt: 'text-blue-700' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} rounded-lg px-3 py-2.5`}>
                <p className="text-[10px] text-slate-400 font-medium mb-1">{k.label}</p>
                <p className="text-[15px] font-black text-slate-800 leading-none mb-1">{k.val}</p>
                <p className={`text-[10px] font-bold ${k.txt}`}>{k.chg}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="mb-4">
            <p className="text-[10px] text-slate-400 font-medium mb-2">Monthly Revenue</p>
            <div className="flex items-end gap-1 h-14">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm overflow-hidden" style={{ height: `${h}%` }}>
                  <div
                    className="h-full rounded-t-sm transition-all duration-300"
                    style={{
                      background: i === bars.length - 1
                        ? 'linear-gradient(to top, #071f13, #0F5B38)'
                        : i % 3 === 0 ? '#bbf7d0' : '#d1fae5',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] text-slate-300 font-medium">
              <span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span>
            </div>
          </div>

          {/* Transaction list */}
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2.5">Recent</p>
            <div className="space-y-2">
              {[
                { name: 'Invoice #1024 — Acme Corp', amt: '+$2,400', cls: 'text-emerald-600', icon: '↑', ibg: 'bg-emerald-50 text-emerald-500' },
                { name: 'Bill #B-209 — Tech Supplies', amt: '−$850', cls: 'text-slate-500', icon: '↓', ibg: 'bg-slate-100 text-slate-400' },
                { name: 'Project Deposit — Client X', amt: '+$5,000', cls: 'text-emerald-600', icon: '↑', ibg: 'bg-emerald-50 text-emerald-500' },
              ].map(tx => (
                <div key={tx.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full ${tx.ibg} flex items-center justify-center text-[9px] font-bold shrink-0`}>{tx.icon}</div>
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-700 transition-colors">{tx.name}</span>
                  </div>
                  <span className={`text-[11px] font-bold ${tx.cls} ml-2`}>{tx.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false)
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignIn = useCallback(() => onSignIn(), [onSignIn])
  const handleGetStarted = useCallback(() => onGetStarted(), [onGetStarted])

  const features = [
    { icon: FileText, title: 'Sales & Invoicing', desc: 'Create polished invoices and quotes, track payment status, and manage your full customer pipeline in one place.', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'group-hover:border-emerald-200' },
    { icon: CreditCard, title: 'Purchases & Bills', desc: 'Handle supplier bills, purchase orders, and expense tracking with seamless bank reconciliation built in.', color: 'text-blue-600', bg: 'bg-blue-50', border: 'group-hover:border-blue-200' },
    { icon: BarChart3, title: 'Financial Reports', desc: 'P&L, Balance Sheet, Cash Flow, and Transaction reports with custom date ranges and real-time data.', color: 'text-violet-600', bg: 'bg-violet-50', border: 'group-hover:border-violet-200' },
    { icon: Building2, title: 'Banking', desc: 'Link accounts, spend and receive money, transfer funds, and reconcile transactions with full audit trails.', color: 'text-amber-600', bg: 'bg-amber-50', border: 'group-hover:border-amber-200' },
    { icon: Users, title: 'Team & Permissions', desc: 'Invite colleagues or accountants with granular module-level access — each person sees only what they need.', color: 'text-rose-600', bg: 'bg-rose-50', border: 'group-hover:border-rose-200' },
    { icon: Globe, title: 'Multi-Organization', desc: 'Manage multiple companies from a single login. Instant switching, isolated ledgers, no extra accounts.', color: 'text-teal-600', bg: 'bg-teal-50', border: 'group-hover:border-teal-200' },
    { icon: Briefcase, title: 'Projects', desc: 'Attach invoices and bills to projects, monitor budgets, and report on profitability per project.', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'group-hover:border-indigo-200' },
    { icon: Package, title: 'Fixed Assets', desc: 'Track asset acquisitions, compute depreciation schedules, and manage write-offs end-to-end.', color: 'text-orange-600', bg: 'bg-orange-50', border: 'group-hover:border-orange-200' },
    { icon: DollarSign, title: 'Payroll', desc: 'Run employee payroll, manage pay rates, generate payslips, and keep payroll records organized.', color: 'text-pink-600', bg: 'bg-pink-50', border: 'group-hover:border-pink-200' },
  ]

  const steps = [
    { n: '01', icon: Zap, title: 'Create your account', desc: 'Sign up in seconds with email or OTP. No credit card, no lengthy setup forms.' },
    { n: '02', icon: Building2, title: 'Set up your organization', desc: 'Add your company details, set currency and tax ID, invite your team.' },
    { n: '03', icon: TrendingUp, title: 'Start managing finances', desc: 'Send your first invoice, record expenses, and run a live report — all on day one.' },
  ]

  return (
    <>
      {/* ── Keyframe styles ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes kdm-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes kdm-hero-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kdm-hero-right {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes kdm-badge-pop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes kdm-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes kdm-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .kdm-hero-text { animation: kdm-hero-in 0.7s ease both; }
        .kdm-hero-text-d1 { animation: kdm-hero-in 0.7s ease 0.1s both; }
        .kdm-hero-text-d2 { animation: kdm-hero-in 0.7s ease 0.2s both; }
        .kdm-hero-text-d3 { animation: kdm-hero-in 0.7s ease 0.35s both; }
        .kdm-hero-text-d4 { animation: kdm-hero-in 0.7s ease 0.5s both; }
        .kdm-hero-right   { animation: kdm-hero-right 0.8s ease 0.3s both; }
        .kdm-badge        { animation: kdm-badge-pop 0.5s cubic-bezier(.34,1.56,.64,1) 0.15s both; }
        .kdm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(7,31,19,0.25); }
        .kdm-btn-primary { transition: transform 0.15s, box-shadow 0.15s, background 0.15s; }
        .kdm-btn-ghost:hover  { transform: translateY(-1px); }
        .kdm-btn-ghost  { transition: transform 0.15s, border-color 0.15s, color 0.15s; }
        .kdm-card:hover { transform: translateY(-4px); }
        .kdm-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
        .kdm-step-line { background: linear-gradient(to right, #0F5B38, #bbf7d0); }
        .kdm-shimmer-btn {
          background: linear-gradient(90deg, #0F5B38 0%, #166534 40%, #0F5B38 60%, #166534 100%);
          background-size: 200% 100%;
        }
        .kdm-shimmer-btn:hover { animation: kdm-shimmer 1.2s linear infinite; }
        .kdm-nav-link { position: relative; }
        .kdm-nav-link::after { content: ''; position: absolute; left: 0; bottom: -2px; width: 0; height: 2px; background: #071f13; transition: width 0.2s; }
        .kdm-nav-link:hover::after { width: 100%; }
      `}</style>

      <div className="min-h-screen bg-white text-[#071f13] font-sans antialiased flex flex-col overflow-x-hidden">

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <header
          className="bg-white sticky top-0 z-50 transition-all duration-200"
          style={{ boxShadow: scrolled ? '0 1px 16px rgba(7,31,19,0.10)' : '0 1px 0 #f1f5f9' }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#071f13] rounded-[3px]">
                <Calculator className="h-4 w-4 text-emerald-300" />
              </div>
              <span className="text-[17px] font-black tracking-tight text-[#071f13]">KDM <span className="font-light text-slate-400">Accounting</span></span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-[14px] text-slate-500">
              <a href="#features" className="kdm-nav-link hover:text-[#071f13] transition-colors pb-0.5">Features</a>
              <a href="#how" className="kdm-nav-link hover:text-[#071f13] transition-colors pb-0.5">How it works</a>
              <a href="#modules" className="kdm-nav-link hover:text-[#071f13] transition-colors pb-0.5">Modules</a>
            </nav>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSignIn}
                className="kdm-btn-ghost px-4 py-1.5 text-[14px] font-medium text-slate-600 hover:text-[#071f13] border border-slate-200 hover:border-slate-400 rounded-[3px] cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={handleGetStarted}
                className="kdm-btn-primary kdm-shimmer-btn px-4 py-1.5 text-[14px] font-semibold text-white rounded-[3px] cursor-pointer flex items-center gap-1.5"
              >
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ══ HERO ════════════════════════════════════════════════════════════ */}
        <section className="relative bg-white overflow-hidden">
          {/* Background grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(#f0fdf4 1px, transparent 1px), linear-gradient(90deg, #f0fdf4 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: 0.6,
          }} />
          {/* Gradient overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 60% 60% at 70% 50%, rgba(240,253,244,0.9) 0%, rgba(255,255,255,0.3) 100%)',
          }} />

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="kdm-badge inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold px-3 py-1.5 rounded-full mb-6">
                <ShieldCheck className="h-3.5 w-3.5" />
                Professional Accounting Platform
              </div>
              <h1 className="kdm-hero-text text-[42px] lg:text-[52px] font-black leading-[1.08] tracking-tight text-[#071f13] mb-5">
                Finance,<br />
                <span style={{ background: 'linear-gradient(135deg, #0F5B38, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Finally Under Control
                </span>
              </h1>
              <p className="kdm-hero-text-d1 text-[17px] text-slate-500 leading-relaxed mb-8 max-w-lg">
                Invoices, bills, bank reconciliation, payroll, and financial reports — everything
                your business needs, in one fast and beautiful platform.
              </p>

              <div className="kdm-hero-text-d2 flex flex-wrap gap-3 mb-8">
                <button
                  onClick={handleGetStarted}
                  className="kdm-btn-primary kdm-shimmer-btn px-7 py-3 text-white font-bold text-[15px] rounded-[3px] cursor-pointer flex items-center gap-2"
                >
                  Start Free <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSignIn}
                  className="kdm-btn-ghost px-7 py-3 border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-[#071f13] font-medium text-[15px] rounded-[3px] cursor-pointer"
                >
                  Sign In
                </button>
              </div>

              <ul className="kdm-hero-text-d3 flex flex-col sm:flex-row gap-3 text-[13px] text-slate-500">
                {['No credit card required', 'Multi-org support built in', 'OTP secured login'].map(t => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — Dashboard mockup */}
            <div className="kdm-hero-right flex justify-center lg:justify-end pr-8">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ══ TICKER / TRUST STRIP ═══════════════════════════════════════════ */}
        <div className="bg-slate-50 border-y border-slate-100 py-4 overflow-hidden">
          <div className="flex" style={{ animation: 'kdm-ticker 22s linear infinite', width: 'max-content' }}>
            {[...Array(2)].map((_, ri) => (
              <div key={ri} className="flex items-center gap-10 px-6">
                {[
                  { icon: FileText, label: 'Invoicing' },
                  { icon: BarChart3, label: 'Reports' },
                  { icon: CreditCard, label: 'Purchases' },
                  { icon: Building2, label: 'Banking' },
                  { icon: Users, label: 'Team Access' },
                  { icon: Globe, label: 'Multi-Org' },
                  { icon: DollarSign, label: 'Payroll' },
                  { icon: Package, label: 'Fixed Assets' },
                  { icon: Briefcase, label: 'Projects' },
                  { icon: PieChart, label: 'Analytics' },
                  { icon: Lock, label: 'OTP Auth' },
                  { icon: BookOpen, label: 'Chart of Accounts' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-slate-400 whitespace-nowrap">
                    <Icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[13px] font-medium">{label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
        <section id="features" className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <FadeUp className="text-center mb-14">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-emerald-600 mb-3">Full-Suite Platform</p>
            <h2 className="text-3xl lg:text-4xl font-black text-[#071f13] mb-4">Everything your business needs</h2>
            <p className="text-slate-500 text-[16px] max-w-lg mx-auto">Nine purpose-built modules that work together seamlessly — no duct-tape integrations.</p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FadeUp key={f.title} delay={i * 60}>
                <div
                  className={`kdm-card group border rounded-xl p-6 bg-white cursor-default ${hoveredFeature === i ? 'shadow-xl border-slate-200' : 'border-slate-100 shadow-sm'}`}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <div className={`inline-flex items-center justify-center p-2.5 rounded-lg ${f.bg} mb-4 transition-transform duration-200 ${hoveredFeature === i ? 'scale-110' : ''}`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-[15px] text-[#071f13] mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-[13.5px] leading-relaxed">{f.desc}</p>
                  <div className={`flex items-center gap-1 mt-3 text-[12px] font-semibold ${f.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    Learn more <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
        <section id="how" className="bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
            <FadeUp className="text-center mb-16">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-emerald-600 mb-3">Simple Setup</p>
              <h2 className="text-3xl lg:text-4xl font-black text-[#071f13] mb-4">Up and running in minutes</h2>
              <p className="text-slate-500 text-[16px] max-w-md mx-auto">No accountant required to get started. Just three steps to a fully working ledger.</p>
            </FadeUp>

            <div className="relative grid md:grid-cols-3 gap-10">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px kdm-step-line" style={{ top: '40px' }} />

              {steps.map((s, i) => (
                <FadeUp key={s.n} delay={i * 120}>
                  <div className="relative text-center">
                    <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border-2 border-emerald-100 shadow-md mb-5 mx-auto group hover:border-emerald-400 hover:shadow-emerald-100 transition-all duration-200">
                      <s.icon className="h-7 w-7 text-[#0F5B38]" />
                      <span className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-[#071f13] text-white text-[10px] font-black rounded-full flex items-center justify-center">{s.n}</span>
                    </div>
                    <h3 className="font-bold text-[16px] text-[#071f13] mb-2">{s.title}</h3>
                    <p className="text-slate-500 text-[14px] leading-relaxed">{s.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>

            <FadeUp delay={360} className="mt-14 text-center">
              <button
                onClick={handleGetStarted}
                className="kdm-btn-primary kdm-shimmer-btn inline-flex items-center gap-2 px-8 py-3 text-white font-bold text-[15px] rounded-[3px] cursor-pointer"
              >
                Get Started Now <ArrowRight className="h-4 w-4" />
              </button>
            </FadeUp>
          </div>
        </section>

        {/* ══ MODULE DEEP-DIVE ════════════════════════════════════════════════ */}
        <section id="modules" className="max-w-7xl mx-auto px-6 lg:px-8 py-24 space-y-24">
          {/* Sales */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <p className="text-[12px] font-semibold uppercase tracking-widest text-emerald-600 mb-3">Sales &amp; Invoicing</p>
              <h2 className="text-3xl font-black text-[#071f13] mb-4">Get paid faster with<br />professional invoices</h2>
              <p className="text-slate-500 text-[15px] leading-relaxed mb-7">
                Create, send, and track invoices in seconds. Convert quotes to invoices with one click,
                set payment due dates, and see exactly which invoices are overdue.
              </p>
              <ul className="space-y-3">
                {['Invoice & quote creation with line-item products', 'Automatic quote-to-invoice conversion', 'Customer-level payment history and balances', 'Overdue tracking with status badges'].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>

            <FadeUp delay={150}>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-3">
                {/* Invoice preview */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium mb-1">INVOICE</p>
                      <p className="font-black text-[18px] text-[#071f13]">#1024</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full">Paid</span>
                  </div>
                  <div className="text-[13px] text-slate-500 mb-4">
                    <p className="font-semibold text-slate-700">Acme Corporation</p>
                    <p>Due: 15 Jun 2026</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    {[['Web Development (40hrs)', '$4,000'], ['Design Services', '$1,200'], ['Hosting Setup', '$200']].map(([desc, amt]) => (
                      <div key={desc} className="flex justify-between text-[12px]">
                        <span className="text-slate-500">{desc}</span>
                        <span className="text-slate-700 font-medium">{amt}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[14px] font-black text-[#071f13] border-t border-slate-100 pt-2 mt-1">
                      <span>Total</span><span>$5,400</span>
                    </div>
                  </div>
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: 'Sent', v: '24', c: 'text-slate-600' }, { l: 'Paid', v: '18', c: 'text-emerald-600' }, { l: 'Overdue', v: '3', c: 'text-rose-500' }].map(s => (
                    <div key={s.l} className="bg-white rounded-lg border border-slate-100 p-3 text-center">
                      <p className={`text-[20px] font-black ${s.c}`}>{s.v}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Reports */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeUp delay={150} className="order-2 lg:order-1">
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Profit &amp; Loss — Q2 2026</p>
                <div className="space-y-3">
                  {[
                    { label: 'Revenue', value: 124500, max: 150000, color: 'bg-emerald-500', text: 'text-emerald-700' },
                    { label: 'COGS', value: 43200, max: 150000, color: 'bg-amber-400', text: 'text-amber-700' },
                    { label: 'Operating Expenses', value: 22000, max: 150000, color: 'bg-rose-400', text: 'text-rose-700' },
                    { label: 'Net Profit', value: 59300, max: 150000, color: 'bg-blue-500', text: 'text-blue-700' },
                  ].map(r => (
                    <div key={r.label}>
                      <div className="flex justify-between text-[12px] mb-1.5">
                        <span className="text-slate-500 font-medium">{r.label}</span>
                        <span className={`font-bold ${r.text}`}>${(r.value / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${r.color} rounded-full transition-all duration-500`} style={{ width: `${(r.value / r.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between bg-white rounded-lg border border-slate-100 px-4 py-3">
                  <span className="text-[13px] font-semibold text-slate-600">Profit Margin</span>
                  <span className="text-[20px] font-black text-emerald-600">47.6%</span>
                </div>
              </div>
            </FadeUp>

            <FadeUp className="order-1 lg:order-2">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-violet-600 mb-3">Financial Reports</p>
              <h2 className="text-3xl font-black text-[#071f13] mb-4">Instant reports,<br />zero waiting</h2>
              <p className="text-slate-500 text-[15px] leading-relaxed mb-7">
                Generate P&amp;L, Balance Sheet, Cash Flow Statement, and Account Transaction reports
                for any date range — instantly. No exports, no delays, no spreadsheet formulas.
              </p>
              <ul className="space-y-3">
                {['Profit & Loss with custom date ranges', 'Balance Sheet with real-time account balances', 'Cash Flow Statement for any period', 'Account Transactions drill-down'].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                    <Check className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>

          {/* Team */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <p className="text-[12px] font-semibold uppercase tracking-widest text-rose-600 mb-3">Team &amp; Permissions</p>
              <h2 className="text-3xl font-black text-[#071f13] mb-4">The right access<br />for every person</h2>
              <p className="text-slate-500 text-[15px] leading-relaxed mb-7">
                Invite your accountant, bookkeeper, or team members and control exactly which
                modules they can see and use — no more over-sharing credentials.
              </p>
              <ul className="space-y-3">
                {['Module-level permission toggles (Sales, Reports, Banking…)', 'Admin and User role assignments', 'Email invitation with secure OTP link', 'Instant access revocation'].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                    <Check className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>

            <FadeUp delay={150}>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                {/* Team members list */}
                <div className="space-y-3">
                  {[
                    { name: 'Ahmad Karim', role: 'Admin', color: 'bg-[#071f13] text-white', modules: ['Sales', 'Reports', 'Banking', 'Payroll'] },
                    { name: 'Sarah Lee', role: 'Accountant', color: 'bg-violet-100 text-violet-700', modules: ['Reports', 'Banking'] },
                    { name: 'James Wu', role: 'Sales Rep', color: 'bg-emerald-100 text-emerald-700', modules: ['Sales'] },
                  ].map(m => (
                    <div key={m.name} className="bg-white rounded-xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[13px] font-bold text-slate-500">
                            {m.name[0]}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800">{m.name}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color}`}>{m.role}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {m.modules.map(mod => (
                          <span key={mod} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{mod}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleGetStarted}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors py-2"
                >
                  <Users className="h-3.5 w-3.5" /> Invite team members
                </button>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ══ STATS ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#071f13] text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
            <FadeUp className="text-center mb-14">
              <h2 className="text-3xl font-black mb-3">Built for the long run</h2>
              <p className="text-emerald-100/60 text-[15px]">The numbers behind the platform.</p>
            </FadeUp>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { to: 9, suffix: '', label: 'Accounting Modules', prefix: '' },
                { to: 100, suffix: '%', label: 'Real-Time Data', prefix: '' },
                { to: 4, suffix: '', label: 'Report Types', prefix: '' },
                { to: 0, suffix: ' setup fees', label: 'Get started free', prefix: '$' },
              ].map(s => (
                <FadeUp key={s.label}>
                  <div className="text-[40px] lg:text-[52px] font-black text-emerald-400 leading-none mb-2">
                    <Counter to={s.to} suffix={s.suffix} prefix={s.prefix} />
                  </div>
                  <p className="text-emerald-100/60 text-[13px] font-medium">{s.label}</p>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECURITY ════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50 rounded-3xl border border-emerald-100 p-10 lg:p-14">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <FadeUp>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl border border-emerald-100 shadow-sm mb-5">
                  <Lock className="h-6 w-6 text-[#0F5B38]" />
                </div>
                <h2 className="text-3xl font-black text-[#071f13] mb-4">Security you can trust</h2>
                <p className="text-slate-500 text-[15px] leading-relaxed mb-6">
                  KDM uses OTP-based authentication instead of risky reset links, JWT access tokens,
                  and per-user permission scoping so your financial data stays safe.
                </p>
                <button onClick={handleGetStarted} className="kdm-btn-primary kdm-shimmer-btn inline-flex items-center gap-2 px-6 py-2.5 text-white font-semibold text-[14px] rounded-[3px] cursor-pointer">
                  Create your account <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </FadeUp>
              <FadeUp delay={150}>
                <div className="space-y-4">
                  {[
                    { icon: ShieldCheck, title: 'OTP Authentication', desc: 'One-time codes delivered to your email — no weak password reset links.' },
                    { icon: Lock, title: 'JWT Token Auth', desc: 'Stateless, signed tokens with short expiry for every API request.' },
                    { icon: Layers, title: 'Role-based Access', desc: 'Each user only accesses the modules you explicitly grant.' },
                    { icon: BellRing, title: 'Invitation Control', desc: 'Accept or revoke team invitations at any time, instantly.' },
                  ].map(s => (
                    <div key={s.title} className="flex items-start gap-4 bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <s.icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#071f13] mb-0.5">{s.title}</p>
                        <p className="text-[13px] text-slate-500">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
        <section className="border-t border-slate-100">
          <FadeUp>
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 text-center">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-emerald-600 mb-4">Ready to start?</p>
              <h2 className="text-4xl font-black text-[#071f13] mb-5 leading-tight">
                Take control of your<br />business finances today
              </h2>
              <p className="text-slate-500 text-[16px] mb-9 max-w-md mx-auto">
                Set up your free account, add your organization, and send your first invoice — in under five minutes.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={handleGetStarted}
                  className="kdm-btn-primary kdm-shimmer-btn px-9 py-3.5 text-white font-bold text-[15px] rounded-[3px] cursor-pointer flex items-center gap-2"
                >
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSignIn}
                  className="kdm-btn-ghost px-9 py-3.5 border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-[#071f13] font-medium text-[15px] rounded-[3px] cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          </FadeUp>
        </section>

        {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
        <footer className="bg-[#071f13] text-emerald-100/40 text-[13px]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-white/10 rounded-[3px]">
                <Calculator className="h-3.5 w-3.5 text-emerald-300" />
              </div>
              <span className="text-white font-bold text-[15px]">KDM <span className="font-light text-emerald-300/70">Accounting</span></span>
            </div>
            <p>© {new Date().getFullYear()} KDM Accounting. All rights reserved.</p>
          </div>
        </footer>

      </div>
    </>
  )
}
