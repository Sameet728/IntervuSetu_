import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgLogin as orgLoginAPI } from '../../api/orgAPI'
import { Input, Button } from '../../components/ui/index'
import toast from 'react-hot-toast'

export default function OrgLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { orgLogin } = useOrgAuth()
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  
  const from = location.state?.from || '/org/dashboard'

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const set = (k) => (ev) => {
    setForm((p) => ({ ...p, [k]: ev.target.value }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    
    setLoading(true)
    try {
      const res = await orgLoginAPI(form)
      orgLogin(res.data.token, res.data.data)
      toast.success(`Welcome back, ${res.data.data.name}!`)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
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
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-2">Welcome Back</p>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Access your hiring dashboard.
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Review candidate interviews, analyze detailed reports, and streamline your recruitment.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {['Review automated screenings', 'View detailed candidate reports', 'Manage custom interview questions'].map(f => (
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

          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Organization Login
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            New organization?{' '}
            <Link to="/org/register" className="text-blue-600 hover:text-blue-500 transition-colors font-medium">
              Register here
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Organization email"
              type="email"
              placeholder="hr@example.com"
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
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
