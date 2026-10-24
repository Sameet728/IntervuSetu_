import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { orgLogin as orgLoginAPI } from '../../api/orgAPI'
import { Input, Button } from '../../components/ui/index'
import AuthShell from '../../components/layout/AuthShell'
import { Building2, Mail, Lock, ArrowRight, Users, BarChart3, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const FEATURES = [
  {
    icon: Users,
    label: 'One campaign view',
    detail: 'Templates, candidates and completion in a single console.',
  },
  {
    icon: BarChart3,
    label: 'Evidence in the leaderboard',
    detail: 'Rank candidates on real interview and aptitude performance.',
  },
  {
    icon: ShieldCheck,
    label: 'Proctoring built in',
    detail: 'Session violations are recorded for your team to review.',
  },
]

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
    <AuthShell
      variant="org"
      eyebrow="Organization sign in"
      headline="Hire on evidence, not guesswork."
      description="Run structured AI interviews and aptitude screens, then compare candidates on what they actually demonstrated."
      features={FEATURES}
      footer={(
        <p className="t-xs">
          New organization?{' '}
          <Link to="/org/register" className="font-medium text-accent transition-colors duration-fast hover:text-accent-hover">
            Register here
          </Link>
        </p>
      )}
    >
      <div className="mb-6 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Hiring console</p>
          <h1 className="t-h2">Sign in to your organization</h1>
          <p className="t-sm mt-1">Access your campaigns and candidate results.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Organization email"
          type="email"
          placeholder="hr@company.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
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
            icon={<Lock className="h-3.5 w-3.5" aria-hidden />}
            autoComplete="current-password"
          />
          <div className="mt-1.5 flex justify-end">
            <Link to="/org/forgot-password" className="tap-link t-xs transition-colors duration-fast hover:text-ink">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          loading={loading}
          variant="primary"
          size="lg"
          block
          className="mt-1"
        >
          Sign in <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </form>
    </AuthShell>
  )
}
