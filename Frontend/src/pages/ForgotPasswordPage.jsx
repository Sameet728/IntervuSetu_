import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/layout/AuthShell'
import { Input, Button } from '../components/ui/index'
import {
  Mail, KeyRound, Lock, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../api/axios'

const STEPS = ['Email', 'Code', 'New password']

export default function ForgotPasswordPage({ isOrg = false }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: New Password
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetToken, setResetToken] = useState('')

  const apiBase = isOrg ? '/org/auth' : '/auth'
  const loginPath = isOrg ? '/org/login' : '/login'

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Email is required')

    setLoading(true)
    try {
      await API.post(`${apiBase}/forgot-password`, { email })
      toast.success('Verification code sent to your email')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) return toast.error('Enter a valid 6-digit OTP')

    setLoading(true)
    try {
      const res = await API.post(`${apiBase}/verify-otp`, { email, otp })
      toast.success('OTP verified')
      setResetToken(res.data.resetToken)
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters')

    setLoading(true)
    try {
      await API.post(`${apiBase}/reset-password`, { resetToken, newPassword })
      toast.success('Password updated successfully!')
      navigate(loginPath)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const features = isOrg
    ? [
        { icon: Building2, label: 'Your hiring console', detail: 'Candidate data and interview campaigns stay in one place.' },
        { icon: Mail, label: 'Verified by email', detail: 'A one-time code confirms it is really you.' },
        { icon: ShieldCheck, label: 'A fresh password', detail: 'Set a new password and sign straight back in.' },
      ]
    : [
        { icon: Lock, label: 'Secure account recovery', detail: 'A one-time code verifies the request before anything changes.' },
        { icon: Mail, label: 'Sent to your inbox', detail: 'Use the email on your IntervuSetu account.' },
        { icon: ShieldCheck, label: 'Back to practising', detail: 'Your interview history and reports stay exactly where they were.' },
      ]

  return (
    <AuthShell
      variant={isOrg ? 'org' : 'candidate'}
      eyebrow={isOrg ? 'Organization recovery' : 'Account recovery'}
      headline={isOrg ? 'Back to hiring without the wait.' : 'A new password, then back to practice.'}
      description={isOrg
        ? 'Reset the password for your organization account and return to your live interview campaigns.'
        : 'Reset the password on your candidate account and pick your interview practice back up.'}
      features={features}
      footer={(
        <p className="t-xs">
          Remembered it?{' '}
          <Link to={loginPath} className="font-medium text-accent transition-colors duration-fast hover:text-accent-hover">
            Back to sign in
          </Link>
        </p>
      )}
    >
      <Link
        to={loginPath}
        className="tap-link t-xs mb-5 inline-flex items-center gap-1.5 font-medium text-muted transition-colors duration-fast hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to login
      </Link>

      <div className="mb-6 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Password reset</p>
          <h1 className="t-h2">Reset password</h1>
          <p className="t-sm mt-1">
            {step === 1 && "Enter your email address and we'll send you a 6-digit verification code."}
            {step === 2 && 'Enter the 6-digit verification code sent to your email.'}
            {step === 3 && 'Create a new, secure password for your account.'}
          </p>
        </div>
      </div>

      {/* Progress — real, driven by the actual step state */}
      <ol className="mb-7 flex items-center gap-2" aria-label="Password reset progress">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = step > n
          const current = step === n
          return (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-2xs font-semibold ${
                  done ? 'bg-success text-white'
                    : current ? 'bg-accent text-accent-on'
                      : 'border border-hairline bg-inset text-subtle'
                }`}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : n}
              </span>
              <span className={`hidden text-2xs font-medium sm:block ${current ? 'text-ink' : 'text-subtle'}`}>{label}</span>
              {n < STEPS.length && <span className="h-px flex-1 bg-hairline" aria-hidden />}
            </li>
          )
        })}
      </ol>

      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
            autoComplete="email"
            required
          />
          <Button type="submit" loading={loading} variant="primary" size="lg" block icon={<ArrowRight className="h-3.5 w-3.5" aria-hidden />}>
            Send code
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <Input
            label="6-digit code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            icon={<KeyRound className="h-3.5 w-3.5" aria-hidden />}
            autoComplete="one-time-code"
            className="num text-center text-lg tracking-[0.35em]"
            required
          />
          <Button type="submit" loading={loading} disabled={otp.length !== 6} variant="primary" size="lg" block icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}>
            Verify code
          </Button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            icon={<Lock className="h-3.5 w-3.5" aria-hidden />}
            autoComplete="new-password"
            minLength={6}
            hint="At least 6 characters."
            required
          />
          <Button type="submit" loading={loading} disabled={newPassword.length < 6} variant="primary" size="lg" block icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}>
            Update password
          </Button>
        </form>
      )}

      <p aria-live="polite" className="sr-only">{loading ? 'Submitting your request…' : ''}</p>
    </AuthShell>
  )
}
