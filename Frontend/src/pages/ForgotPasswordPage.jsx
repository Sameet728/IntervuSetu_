import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, KeyRound, Lock, ArrowRight, Loader2, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../api/axios'

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

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface backdrop-blur-xl border border-border rounded-3xl p-8 z-10 relative shadow-2xl"
      >
        <Link to={loginPath} className="inline-flex items-center text-fg-subtle hover:text-fg transition-colors mb-6 text-sm font-body">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </Link>
        
        <div className="mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-violet to-cyan rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-violet/20">
            <Lock className="w-6 h-6 text-void" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-display font-bold text-fg mb-2">
            Reset Password
          </h1>
          <p className="text-fg-muted text-sm font-body">
            {step === 1 && "Enter your email address and we'll send you a 6-digit verification code."}
            {step === 2 && "Enter the 6-digit verification code sent to your email."}
            {step === 3 && "Create a new, secure password for your account."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRequestOtp} 
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-body font-medium text-fg-muted">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Send Code</>}
              </button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form 
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-body font-medium text-fg-muted">6-Digit Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ''))}
                    placeholder="000000"
                    className="input pl-10 font-mono tracking-widest text-center text-lg"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full py-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Verify Code</>}
              </button>
            </motion.form>
          )}

          {step === 3 && (
            <motion.form 
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleResetPassword} 
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-body font-medium text-fg-muted">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || newPassword.length < 6}
                className="btn-primary w-full py-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Update Password</>}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  )
}
