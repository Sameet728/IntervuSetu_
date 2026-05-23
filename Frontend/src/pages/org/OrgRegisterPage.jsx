import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgRegister } from '../../api/orgAPI'
import { Input, Button } from '../../components/ui/index'
import { Mic, Building2, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OrgRegisterPage() {
  const navigate = useNavigate()
  const { orgLogin } = useOrgAuth()
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [form, setForm] = useState({
    name: '', email: '', password: '', type: 'company', description: '', website: '',
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters'
    if (!form.email) e.email = 'Email is required'
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters'
    return e
  }

  const set = (k) => (ev) => {
    setForm(p => ({ ...p, [k]: ev.target.value }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (logo) fd.append('logo', logo)

      const res = await orgRegister(fd)
      orgLogin(res.data.token, res.data.data)
      toast.success(`Welcome, ${res.data.data.name}!`)
      navigate('/org/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
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
          <span className="text-[10px] font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">For Organizations</span>
        </Link>

        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-2">Hiring made smarter</p>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Find the best talent with AI-driven interviews.
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Create an organization account to streamline your recruitment process.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {['Automated screening', 'Detailed candidate reports', 'Custom interview questions', 'Seamless team collaboration'].map(f => (
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
          className="w-full max-w-sm my-auto"
        >
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-zinc-900 dark:text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>InterviewAI</span>
          </Link>

          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Register your Organization
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            Already registered?{' '}
            <Link to="/org/login" className="text-blue-600 hover:text-blue-500 transition-colors font-medium">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  : <Building2 className="w-5 h-5 text-zinc-400" />}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-500 hover:border-blue-500/40 hover:text-blue-600 transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="truncate">{logo ? logo.name : 'Upload logo (optional)'}</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </label>
            </div>

            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              {['company', 'college'].map((t) => (
                <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, type: t }))}
                  className={`py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                    form.type === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}>
                  {t === 'company' ? '🏢 Company' : '🎓 College'}
                </button>
              ))}
            </div>

            <Input
              label={form.type === 'company' ? 'Company Name' : 'College Name'}
              type="text"
              placeholder={form.type === 'company' ? 'Acme Corp' : 'University of Technology'}
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              icon={<Building2 className="w-3.5 h-3.5" />}
              autoComplete="organization"
            />

            <Input
              label="Official email"
              type="email"
              placeholder="hr@example.com"
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
                  className={`w-full rounded-lg border bg-white dark:bg-zinc-900 pl-9 pr-9 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500
                    transition-all duration-150 outline-none
                    ${errors.password ? 'border-red-500/70' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            <Input
              label="Website (optional)"
              type="url"
              placeholder="https://example.com"
              value={form.website}
              onChange={set('website')}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Short description (optional)</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="Briefly describe your organization..."
                rows={2}
                className="w-full rounded-lg border bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500
                    transition-all duration-150 outline-none border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none"
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full mt-2"
            >
              Create Organization <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
