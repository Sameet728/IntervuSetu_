import { useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgRegister } from '../../api/orgAPI'
import { Input, Button } from '../../components/ui/index'
import { Mic, Building2, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle, Upload, Globe, FileText } from 'lucide-react'
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
    { label: 'Too short', color: '#ef4444', pct: '0%' },
    { label: 'Weak',      color: '#ef4444', pct: '25%' },
    { label: 'Fair',      color: '#f59e0b', pct: '50%' },
    { label: 'Good',      color: '#f59e0b', pct: '75%' },
    { label: 'Strong',    color: '#22c55e', pct: '100%' },
  ]
  return { ...levels[score], checks }
}

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex" style={{ fontFamily: 'Inter, system-ui' }}>
      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-96 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-zinc-900 dark:text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>IntervuSetu</span>
          <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full ml-1">For Organizations</span>
        </Link>

        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-2">Hire Top Talent</p>
          <h2 className="text-2xl font-bold text-zinc-50 mb-3 leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Scale your hiring process with AI.
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Create custom interview templates, invite candidates, and get detailed AI-generated performance reports.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {['Custom interview templates', 'Anti-cheat proctoring', 'In-depth AI analysis', 'Mass candidate invites'].map(f => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" strokeWidth={1.5} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md my-auto"
        >
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-zinc-900 dark:text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>IntervuSetu</span>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full ml-1">Organizations</span>
          </Link>

          {step === 1 ? (
            <>
              <h1 className="text-xl font-bold text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Register your Organization
              </h1>
              <p className="text-sm text-zinc-500 mb-8">
                Already registered?{' '}
                <Link to="/org/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Sign in
                </Link>
              </p>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                {/* Logo & Type Selection */}
                <div className="flex items-center gap-4 mb-2">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center"><Upload className="w-4 h-4 text-zinc-400" /><span className="text-[9px] text-zinc-500 mt-1">Logo</span></div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleLogo} />
                  
                  <div className="flex-1 grid grid-cols-2 gap-2 h-16">
                    {['company', 'college'].map((t) => (
                      <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, type: t }))}
                        className={`rounded-lg border text-sm font-medium capitalize transition-all flex items-center justify-center gap-2 ${
                          form.type === t
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}>
                        {t === 'company' ? <Building2 className="w-4 h-4" /> : '🎓'} {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Organization name"
                    type="text"
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={set('name')}
                    error={errors.name}
                    icon={<Building2 className="w-3.5 h-3.5" />}
                  />
                  <Input
                    label="Official email"
                    type="email"
                    placeholder="hr@acme.com"
                    value={form.email}
                    onChange={set('email')}
                    error={errors.email}
                    icon={<Mail className="w-3.5 h-3.5" />}
                  />
                </div>

                <Input
                  label="Website (optional)"
                  type="text"
                  placeholder="https://acme.com"
                  value={form.website}
                  onChange={set('website')}
                  icon={<Globe className="w-3.5 h-3.5" />}
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
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-2.5 mt-2">
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
                    We agree to use the platform for valid hiring purposes and abide by the terms of service.
                  </label>
                </div>
                {errors.terms && <p className="text-xs text-red-400 -mt-2">{errors.terms}</p>}

                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                >
                  Create Organization Account <ArrowRight className="w-3.5 h-3.5" />
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
              Are you a candidate?{' '}
              <Link to="/register" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 transition-colors">
                Register here →
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
