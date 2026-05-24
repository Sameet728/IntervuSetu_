import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgLogin as orgLoginAPI } from '../../api/orgAPI'
import { Input, Button } from '../../components/ui/index'
import { Mic, Mail, Lock, ArrowRight, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OrgLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { orgLogin } = useOrgAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/org/dashboard'

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      const res = await orgLoginAPI(form)
      orgLogin(res.data.token, res.data.data)
      toast.success(`Welcome back, ${res.data.data.name}!`)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const set = (k) => (ev) => {
    setForm(p => ({ ...p, [k]: ev.target.value }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex" style={{ fontFamily: 'Inter, system-ui' }}>
      {/* ── Left brand panel (desktop only) ──────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-96 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-zinc-900 dark:text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>IntervuSetu</span>
          <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full ml-1">For Organizations</span>
        </Link>

        <div>
          <h2 className="text-2xl font-bold text-zinc-50 mb-3 leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Hire smarter,<br />interview better.
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Automate your hiring pipeline with AI-driven technical and behavioral interviews.
          </p>
        </div>

        <div className="flex gap-4">
          {[['100+', 'Companies hiring'], ['50k+', 'Interviews conducted'], ['24/7', 'Proctoring']].map(([val, label]) => (
            <div key={label}>
              <p className="text-lg font-bold text-blue-400" style={{ fontFamily: 'Poppins, sans-serif' }}>{val}</p>
              <p className="text-xs text-zinc-600">{label}</p>
            </div>
          ))}
        </div>
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
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>IntervuSetu</span>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full ml-1">Organizations</span>
          </Link>

          <h1 className="text-xl font-bold text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Sign in to your organization
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            New organization?{' '}
            <Link to="/org/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Register here
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Organization email"
              type="email"
              placeholder="hr@company.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              icon={<Mail className="w-3.5 h-3.5" />}
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                icon={<Lock className="w-3.5 h-3.5" />}
                autoComplete="current-password"
              />
              <div className="mt-1.5 flex justify-end">
                <Link to="/org/forgot-password" className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full mt-1"
            >
              Sign in <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-600">
            Are you a candidate?{' '}
            <Link to="/login" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 transition-colors">
              Sign in here →
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
