import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Mail, Lock, Eye, EyeOff, Upload, Mic } from 'lucide-react'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgRegister } from '../../api/orgAPI'
import toast from 'react-hot-toast'

export default function OrgRegisterPage() {
  const navigate = useNavigate()
  const { orgVerifyOtp } = useOrgAuth()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [step, setStep] = useState(1)
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', type: 'company', description: '', website: '',
  })

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
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
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const res = await orgVerifyOtp(form.email, otp)
      toast.success(`Welcome, ${res.data.name}!`)
      navigate('/org/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet/10 rounded-full blur-[120px]" />
      </div>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-gradient-to-tr from-violet to-cyan rounded-lg flex items-center justify-center">
          <Mic className="w-4 h-4 text-void" strokeWidth={3} />
        </div>
        <span className="font-display font-bold text-zinc-900 dark:text-white">InterviewAI</span>
        <span className="text-xs font-mono bg-violet/20 text-violet px-2 py-0.5 rounded-full border border-violet/30">For Organizations</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-8 z-10"
      >
        {step === 1 ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-violet" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl text-zinc-900 dark:text-white">Register your Organization</h1>
                <p className="text-xs text-slate-500 font-body">College or Company — start hiring smarter</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    : <Building2 className="w-6 h-6 text-slate-600" />}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-sm text-slate-400 hover:border-violet/40 hover:text-violet transition-all">
                    <Upload className="w-4 h-4" />
                    <span>{logo ? logo.name : 'Upload logo (optional)'}</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </label>
              </div>

              {/* Type */}
              <div className="grid grid-cols-2 gap-3">
                {['company', 'college'].map((t) => (
                  <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, type: t }))}
                    className={`py-2.5 rounded-xl border text-sm font-body font-medium capitalize transition-all ${
                      form.type === t
                        ? 'border-violet/50 bg-violet/10 text-violet'
                        : 'border-border text-slate-500 hover:border-violet/30'
                    }`}>
                    {t === 'company' ? '🏢 Company' : '🎓 College'}
                  </button>
                ))}
              </div>

              <input value={form.name} onChange={set('name')} placeholder="Organization name *"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body" required />

              <input value={form.email} onChange={set('email')} type="email" placeholder="Official email *"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body" required />

              <div className="relative">
                <input value={form.password} onChange={set('password')} type={showPass ? 'text' : 'password'}
                  placeholder="Password (min 6 chars) *"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body" required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <input value={form.website} onChange={set('website')} placeholder="Website (optional)"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body" />

              <textarea value={form.description} onChange={set('description')} placeholder="Short description (optional)" rows={2}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body resize-none" />

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet to-cyan text-void font-display font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create Organization Account →'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-4 font-body">
              Already registered?{' '}
              <Link to="/org/login" className="text-violet hover:text-violet/80 transition-colors">Sign in</Link>
            </p>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl text-zinc-900 dark:text-white">Check your email</h1>
                <p className="text-xs text-slate-500 font-body">
                  We sent a code to <span className="text-slate-300 font-medium">{form.email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                type="text"
                placeholder="123456"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600"
                required
              />

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan to-blue-500 text-void font-display font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify & Continue →'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6 font-body">
              Didn't receive the email?{' '}
              <button type="button" onClick={handleRegister} className="text-cyan hover:underline">
                Resend code
              </button>
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
