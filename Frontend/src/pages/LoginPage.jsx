import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/ui/index'
import AuthShell from '../components/layout/AuthShell'
import { Mail, Lock, ArrowRight, AudioLines, FileText, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

const FEATURES = [
  {
    icon: AudioLines,
    label: 'Interviews that respond',
    detail: 'Follow-up questions adapt to what you actually say.',
  },
  {
    icon: FileText,
    label: 'Feedback from your answers',
    detail: 'Strengths, gaps and next steps drawn from the transcript.',
  },
  {
    icon: BarChart3,
    label: 'All your practice, tracked',
    detail: 'Interview reports and aptitude attempts in one place.',
  },
]

export default function LoginPage() {
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from = location.state?.from || '/dashboard'

  const validate = () => {
    const e = {}
    if (!form.email)    e.email    = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  const set = (k) => (ev) => {
    setForm(p => ({ ...p, [k]: ev.target.value }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  const announcement = Object.values(errors).filter(Boolean).join('. ')

  return (
    <AuthShell
      eyebrow="Candidate sign in"
      headline="Practise the interview before it counts."
      description="A voice-first mock interview that listens, follows up, and turns your answers into a report you can act on."
      features={FEATURES}
      footer={(
        <p className="t-xs">
          New to IntervuSetu?{' '}
          <Link to="/register" className="font-medium text-accent transition-colors duration-fast hover:text-accent-hover">
            Create an account
          </Link>
        </p>
      )}
    >
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Sign in</p>
        <h1 className="t-h2">Welcome back</h1>
        <p className="t-sm mt-1">Pick up where you left off.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Link to="/forgot-password" className="tap-link t-xs transition-colors duration-fast hover:text-ink">
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

        <div aria-live="polite" className="sr-only">{announcement}</div>
      </form>
    </AuthShell>
  )
}
