import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/ui/index'
import { Mic, User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function getPasswordStrength(pw) {
  const checks = {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^a-zA-Z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  const levels = [
    { label: 'Too short', color: '#ef4444', pct: '0%' },
    { label: 'Weak',      color: '#ef4444', pct: '25%' },
    { label: 'Fair',      color: '#f59e0b', pct: '50%' },
    { label: 'Good',      color: '#f59e0b', pct: '75%' },
    { label: 'Strong',    color: '#22c55e', pct: '100%' },
  ]
  return { ...levels[score], checks }
}

export default function RegisterPage() {
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [otp, setOtp]         = useState('')
  const [step, setStep]       = useState(1) // 1: Register, 2: OTP
  const [showPw, setShowPw]   = useState(false)
  const [agreed, setAgreed]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  
  const { register, verifyOtp } = useAuth()
  const navigate = useNavigate()

  const pw = useMemo(() => getPasswordStrength(form.password), [form.password])

  const validate = () => {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters'
    if (!form.email)                         e.email = 'Email is required'
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters'
    if (!agreed) e.terms = 'Please accept to continue'
    return e
  }

  const handleRegister = async (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      toast.success('Verification code sent to your email.')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleVerify = async (ev) => {
    ev.preventDefault()
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' })
      return
    }
    setLoading(true)
    try {
      await verifyOtp(form.email, otp)
      toast.success('Account verified! Welcome 🎉')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  const set = (k) => (ev) => {
    setForm(p => ({ ...p, [k]: ev.target.value }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex" style={{ fontFamily: 'Inter, system-ui' }}>
      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-96 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-zinc-900 dark:text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>InterviewAI</span>
        </Link>

        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-2">Start for free</p>
          <h2 className="text-2xl font-bold text-zinc-50 mb-3 leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Your first AI interview is waiting.
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Set up in seconds. No credit card required for your first 5 interviews.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {['Voice-based AI interview', 'Real-time transcription', 'Instant performance report', 'Resume-aware questions'].map(f => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" strokeWidth={1.5} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-zinc-900 dark:text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>InterviewAI</span>
          </Link>

          {step === 1 ? (
            <>
              <h1 className="text-xl font-bold text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Create your account
              </h1>
              <p className="text-sm text-zinc-500 mb-8">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Sign in
                </Link>
              </p>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input
                  label="Full name"
                  type="text"
                  placeholder="Arjun Sharma"
                  value={form.name}
                  onChange={set('name')}
                  error={errors.name}
                  icon={<User className="w-3.5 h-3.5" />}
                  autoComplete="name"
                />

                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  error={errors.email}
                  icon={<Mail className="w-3.5 h-3.5" />}
                  autoComplete="email"
                />

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={set('password')}
                      autoComplete="new-password"
                      className={`w-full rounded-lg border bg-white dark:bg-zinc-900 pl-9 pr-9 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-600
                        transition-all duration-150 outline-none
                        ${errors.password ? 'border-red-500/70' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}

                  {/* Strength indicator */}
                  {form.password && (
                    <div className="mt-0.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: pw.color }}>{pw.label}</span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: pw.pct, backgroundColor: pw.color }} />
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        {[['length', '8+ chars'], ['uppercase', 'Uppercase'], ['number', 'Number']].map(([k, label]) => (
                          <span key={k} className={`text-[10px] flex items-center gap-0.5 ${pw.checks[k] ? 'text-green-500' : 'text-zinc-600'}`}>
                            {pw.checks[k] ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setAgreed(p => !p); setErrors(p => ({ ...p, terms: '' })) }}
                    className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      agreed ? 'bg-blue-600 border-blue-600' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    {agreed && <CheckCircle2 className="w-2.5 h-2.5 text-zinc-900 dark:text-white" />}
                  </button>
                  <label
                    className="text-xs text-zinc-500 cursor-pointer leading-relaxed"
                    onClick={() => setAgreed(p => !p)}
                  >
                    I understand that interview sessions are recorded and analyzed by AI.
                  </label>
                </div>
                {errors.terms && <p className="text-xs text-red-400 -mt-2">{errors.terms}</p>}

                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="w-full mt-1"
                >
                  Create account <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-xl font-bold text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Check your email
              </h1>
              <p className="text-sm text-zinc-500 mb-8">
                We sent a 6-digit verification code to <span className="font-medium text-zinc-300">{form.email}</span>.
              </p>

              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <Input
                  label="Verification Code"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setErrors({ ...errors, otp: '' })
                  }}
                  error={errors.otp}
                  className="text-center text-lg tracking-widest font-mono"
                  autoComplete="one-time-code"
                />

                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                >
                  Verify & Continue <CheckCircle2 className="w-4 h-4 ml-1" />
                </Button>

                <p className="mt-4 text-center text-xs text-zinc-500">
                  Didn't receive the email? <button type="button" onClick={handleRegister} className="text-blue-400 hover:underline">Resend code</button>
                </p>
              </form>
            </motion.div>
          )}

          {step === 1 && (
            <p className="mt-8 text-center text-xs text-zinc-600">
              Are you an organization?{' '}
              <Link to="/org/register" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 transition-colors">
                Register here →
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
