import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Mail, Lock, Eye, EyeOff, Mic } from 'lucide-react'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgLogin as orgLoginAPI } from '../../api/orgAPI'
import toast from 'react-hot-toast'

export default function OrgLoginPage() {
  const navigate = useNavigate()
  const { orgLogin } = useOrgAuth()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await orgLoginAPI(form)
      orgLogin(res.data.token, res.data.data)
      toast.success(`Welcome back, ${res.data.data.name}!`)
      navigate('/org/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet/10 rounded-full blur-[100px]" />
      </div>

      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-gradient-to-tr from-violet to-cyan rounded-lg flex items-center justify-center">
          <Mic className="w-4 h-4 text-void" strokeWidth={3} />
        </div>
        <span className="font-display font-bold text-zinc-900 dark:text-white">InterviewAI</span>
        <span className="text-xs font-mono bg-violet/20 text-violet px-2 py-0.5 rounded-full border border-violet/30">Organizations</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-zinc-900 dark:text-white">Organization Login</h1>
            <p className="text-xs text-slate-500 font-body">Access your hiring dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input value={form.email} onChange={set('email')} type="email" placeholder="Organization email"
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body" required />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input value={form.password} onChange={set('password')} type={showPass ? 'text' : 'password'} placeholder="Password"
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body" required />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-right mt-1">
            <Link to="/org/forgot-password" className="text-xs text-slate-400 hover:text-violet transition-colors font-body">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-violet to-cyan text-void font-display font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4 font-body">
          New organization?{' '}
          <Link to="/org/register" className="text-violet hover:text-violet/80">Register here</Link>
        </p>
      </motion.div>
    </div>
  )
}
