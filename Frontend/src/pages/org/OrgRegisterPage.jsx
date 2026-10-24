import { useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgRegister } from '../../api/orgAPI'
import { Input, Button } from '../../components/ui/index'
import AuthShell from '../../components/layout/AuthShell'
import {
  Building2, GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2,
  XCircle, Upload, Globe, Layers, Users, ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

function getPasswordStrength(pw) {
  const checks = {
    length:    pw.length >= 6,
    uppercase: /[A-Z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^a-zA-Z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  const levels = [
    { label: 'Too short', token: '--danger-400',  pct: '0%' },
    { label: 'Weak',      token: '--danger-400',  pct: '25%' },
    { label: 'Fair',      token: '--warning-400', pct: '50%' },
    { label: 'Good',      token: '--warning-400', pct: '75%' },
    { label: 'Strong',    token: '--success-400', pct: '100%' },
  ]
  return { ...levels[score], checks }
}

const ORG_TYPES = [
  { value: 'company', label: 'Company', Icon: Building2 },
  { value: 'college', label: 'College', Icon: GraduationCap },
]

const FEATURES = [
  {
    icon: Layers,
    label: 'Reusable interview rounds',
    detail: 'Generate a template once and invite every candidate to the same bar.',
  },
  {
    icon: Users,
    label: 'Live candidate tracking',
    detail: 'See attempts, completion and scores as they land.',
  },
  {
    icon: ShieldCheck,
    label: 'Proctoring and aptitude',
    detail: 'Record violations and screen reasoning in one console.',
  },
]

export default function OrgRegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', type: 'company', description: '', website: '' })
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(1) // 1: Register, 2: OTP
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const { orgVerifyOtp } = useOrgAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const pw = useMemo(() => getPasswordStrength(form.password), [form.password])
  const strengthColor = `rgb(var(${pw.token}))`

  const validate = () => {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters'
    if (!form.email) e.email = 'Email is required'
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters'
    if (!agreed) e.terms = 'Please accept to continue'
    return e
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRegister = async (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (logo) fd.append('logo', logo)

      await orgRegister(fd)
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
      const res = await orgVerifyOtp(form.email, otp)
      toast.success(`Welcome, ${res.data.name}!`)
      navigate('/org/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  const set = (k) => (ev) => {
    setForm(p => ({ ...p, [k]: ev.target.value }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  return (
    <AuthShell
      variant="org"
      eyebrow="Create organization account"
      headline="Run a hiring round without the admin."
      description="Create one template, share a link, and review structured interviews and aptitude screens in a single console."
      features={FEATURES}
      maxWidth="max-w-[31rem]"
      footer={step === 1 ? (
        <p className="t-xs">
          Are you a candidate?{' '}
          <Link to="/register" className="font-medium text-muted transition-colors duration-fast hover:text-ink">
            Register here
          </Link>
        </p>
      ) : null}
    >
      {step === 1 ? (
        <>
          <div className="mb-6 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai">
              <Building2 className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="eyebrow mb-1.5">New organization</p>
              <h1 className="t-h2">Register your organization</h1>
              <p className="t-sm mt-1">
                Already registered?{' '}
                <Link to="/org/login" className="font-medium text-accent transition-colors duration-fast hover:text-accent-hover">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* Logo & type selection */}
            <div className="mb-1 flex flex-wrap items-center gap-4">
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload organization logo"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() }
                }}
                className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-hairline-strong bg-inset transition-colors duration-fast hover:border-accent/50"
              >
                {logoPreview
                  ? <img src={logoPreview} alt="Organization logo preview" className="h-full w-full object-cover" />
                  : <span className="flex flex-col items-center gap-1 text-faint"><Upload className="h-4 w-4" aria-hidden /><span className="text-3xs">Logo</span></span>}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleLogo} aria-label="Organization logo" />

              <div className="grid h-16 min-w-[11rem] flex-1 grid-cols-2 gap-2">
                {ORG_TYPES.map(({ value: t, label, Icon }) => (
                  <button key={t} type="button" aria-pressed={form.type === t}
                    onClick={() => setForm((p) => ({ ...p, type: t }))}
                    className={`flex items-center justify-center gap-2 rounded-lg border text-sm font-medium capitalize transition-all duration-fast ${
                      form.type === t
                        ? 'border-accent/45 bg-accent-soft/60 text-accent shadow-1'
                        : 'border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink'
                    }`}>
                    <Icon className="h-4 w-4" aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Organization name"
                type="text"
                placeholder="Acme Corp"
                value={form.name}
                onChange={set('name')}
                error={errors.name}
                icon={<Building2 className="h-3.5 w-3.5" aria-hidden />}
              />
              <Input
                label="Official email"
                type="email"
                placeholder="hr@acme.com"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
              />
            </div>

            <Input
              label="Website (optional)"
              type="text"
              placeholder="https://acme.com"
              value={form.website}
              onChange={set('website')}
              icon={<Globe className="h-3.5 w-3.5" aria-hidden />}
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-reg-password" className="field-label">Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden>
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <input
                  id="org-reg-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  aria-invalid={errors.password ? true : undefined}
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
                    {[['length', '6+ chars'], ['uppercase', 'Uppercase'], ['number', 'Number']].map(([k, label]) => (
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
                aria-labelledby="org-reg-terms"
                onClick={() => { setAgreed(p => !p); setErrors(p => ({ ...p, terms: '' })) }}
                className={`tap-hit mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors duration-fast ${
                  agreed ? 'border-accent bg-accent text-accent-on' : 'border-hairline-strong bg-surface hover:border-accent/50'
                }`}
              >
                {agreed && <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />}
              </button>
              <label
                id="org-reg-terms"
                className="t-xs cursor-pointer leading-relaxed"
                onClick={() => setAgreed(p => !p)}
              >
                We agree to use the platform for valid hiring purposes and abide by the terms of service.
              </label>
            </div>
            {errors.terms && <p role="alert" className="-mt-2 text-xs text-danger-500">{errors.terms}</p>}

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              block
              className="mt-2"
            >
              Create organization account <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </form>
        </>
      ) : (
        <>
          <div className="mb-6 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai">
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
              <button type="button" onClick={handleRegister} className="font-medium text-accent transition-colors duration-fast hover:underline">
                Resend code
              </button>
            </p>
          </form>
        </>
      )}
    </AuthShell>
  )
}
