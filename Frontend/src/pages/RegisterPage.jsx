import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/ui/index'
import AuthShell from '../components/layout/AuthShell'
import {
  User, UserPlus, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle,
  AudioLines, FileText, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'

function getPasswordStrength(pw) {
  const checks = {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^a-zA-Z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  /* Status colours come from the design tokens, never a raw hex. */
  const levels = [
    { label: 'Too short', token: '--danger-400',  pct: '0%' },
    { label: 'Weak',      token: '--danger-400',  pct: '25%' },
    { label: 'Fair',      token: '--warning-400', pct: '50%' },
    { label: 'Good',      token: '--warning-400', pct: '75%' },
    { label: 'Strong',    token: '--success-400', pct: '100%' },
  ]
  return { ...levels[score], checks }
}

const FEATURES = [
  {
    icon: AudioLines,
    label: 'A real interview rhythm',
    detail: 'Speak your answers; the AI listens and follows up.',
  },
  {
    icon: FileText,
    label: 'Resume-aware questions',
    detail: 'Add your resume once and practise against your own experience.',
  },
  {
    icon: BarChart3,
    label: 'A record of your progress',
    detail: 'Every session ends with a report you can revisit.',
  },
]

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
      toast.success('Account verified! Welcome aboard.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  const set = (k) => (ev) => {
    setForm(p => ({ ...p, [k]: ev.target.value }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  const announcement = Object.values(errors).filter(Boolean).join('. ')
  const strengthColor = `rgb(var(${pw.token}))`

  return (
    <AuthShell
      eyebrow="Create your account"
      headline="Your next interview starts here."
      description="Build a practice habit around real questions, real voice, and feedback grounded in your own answers."
      features={FEATURES}
      footer={step === 1 ? (
        <p className="t-xs">
          Are you an organization?{' '}
          <Link to="/org/register" className="font-medium text-muted transition-colors duration-fast hover:text-ink">
            Register here
          </Link>
        </p>
      ) : null}
    >
      {step === 1 ? (
        <>
          <div className="mb-6 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <UserPlus className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="eyebrow mb-1.5">Create account</p>
              <h1 className="t-h2">Create your account</h1>
              <p className="t-sm mt-1">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-accent transition-colors duration-fast hover:text-accent-hover">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Arjun Sharma"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              icon={<User className="h-3.5 w-3.5" aria-hidden />}
              autoComplete="name"
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
              autoComplete="email"
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cand-reg-password" className="field-label">Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden>
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <input
                  id="cand-reg-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  aria-invalid={errors.password ? true : undefined}
                  autoComplete="new-password"
                  className={`input pl-9 pr-11 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                >
                  <span className="btn-icon h-8 w-8">
                    {showPw ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                  </span>
                </button>
              </div>
              {errors.password && <p role="alert" className="text-xs text-danger-500">{errors.password}</p>}

              {/* Strength indicator */}
              {form.password && (
                <div className="mt-0.5">
                  <p className="mb-1 text-2xs font-medium" style={{ color: strengthColor }}>
                    <span className="sr-only">Password strength: </span>{pw.label}
                  </p>
                  <div
                    className="h-1 overflow-hidden rounded-full bg-inset"
                    role="progressbar"
                    aria-valuenow={pw.pct === '0%' ? 0 : parseInt(pw.pct, 10)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Password strength"
                  >
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: pw.pct, backgroundColor: strengthColor }} />
                  </div>
                  <ul className="mt-1.5 flex flex-wrap gap-3">
                    {[['length', '8+ chars'], ['uppercase', 'Uppercase'], ['number', 'Number']].map(([k, label]) => (
                      <li
                        key={k}
                        className={`flex items-center gap-0.5 text-2xs ${pw.checks[k] ? 'text-success-500' : 'text-subtle'}`}
                      >
                        {pw.checks[k]
                          ? <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
                          : <XCircle className="h-2.5 w-2.5" aria-hidden />}
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Terms checkbox */}
            <div className="mt-1 flex items-start gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={agreed}
                aria-labelledby="reg-terms"
                onClick={() => { setAgreed(p => !p); setErrors(p => ({ ...p, terms: '' })) }}
                className={`tap-hit mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors duration-fast ${
                  agreed ? 'border-accent bg-accent text-accent-on' : 'border-hairline-strong bg-surface hover:border-accent/50'
                }`}
              >
                {agreed && <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />}
              </button>
              <label
                id="reg-terms"
                className="t-xs cursor-pointer leading-relaxed"
                onClick={() => setAgreed(p => !p)}
              >
                I understand that interview sessions are recorded and analyzed by AI.
              </label>
            </div>
            {errors.terms && <p role="alert" className="-mt-2 text-xs text-danger-500">{errors.terms}</p>}

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              block
              className="mt-1"
            >
              Create account <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>

            <div aria-live="polite" className="sr-only">{announcement}</div>
          </form>
        </>
      ) : (
        <>
          <div className="mb-6 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Mail className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="eyebrow mb-1.5">Verify email</p>
              <h1 className="t-h2">Check your email</h1>
              <p className="t-sm mt-1">
                We sent a 6-digit code to <span className="font-medium text-ink">{form.email}</span>.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <Input
              label="Verification code"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                setErrors({ ...errors, otp: '' })
              }}
              error={errors.otp}
              className="num text-center text-lg tracking-[0.35em]"
              autoComplete="one-time-code"
            />

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              block
              className="mt-2"
            >
              Verify &amp; continue <CheckCircle2 className="h-4 w-4" aria-hidden />
            </Button>

            <p className="t-xs mt-4 text-center">
              Didn&apos;t receive the email?{' '}
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="font-medium text-accent transition-colors duration-fast hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </p>

            <div aria-live="polite" className="sr-only">{announcement}</div>
          </form>
        </>
      )}
    </AuthShell>
  )
}
