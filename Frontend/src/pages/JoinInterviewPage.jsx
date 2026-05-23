import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getTemplateInfo } from '../api/orgAPI'
import api from '../api/axios'
import {
  Building2, Clock, Hash, Shield, Calendar, Code2, Mic,
  CheckCircle2, AlertTriangle, XCircle, ArrowRight, Loader2, LogIn, UserPlus
} from 'lucide-react'
import toast from 'react-hot-toast'

const createInterviewFromTemplate = (templateId) =>
  api.post('/interviews/create', { templateId })

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

const TYPE_LABELS = {
  technical: 'Technical',
  hr: 'HR',
  behavioral: 'Behavioral',
  system_design: 'System Design',
  mixed: 'Mixed Format',
}

export default function JoinInterviewPage() {
  const { shareCode } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [templateData, setTemplateData] = useState(null)
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    getTemplateInfo(shareCode)
      .then((res) => setTemplateData(res.data.data))
      .catch((err) => {
        const msg = err.response?.data?.message || 'Invalid or expired interview link.'
        const expired = err.response?.data?.expired || err.response?.data?.closed
        setError({ message: msg, expired })
      })
      .finally(() => setLoading(false))
  }, [shareCode])

  const handleJoin = async () => {
    if (!user) {
      // Store shareCode in sessionStorage so after login we return here
      sessionStorage.setItem('joinShareCode', shareCode)
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    setJoining(true)
    try {
      const res = await createInterviewFromTemplate(templateData.templateId)
      const interviewId = res.data.data.interviewId
      navigate(`/interview/${interviewId}/room`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to start interview'
      toast.error(msg)
      if (err.response?.status === 403) {
        setError({ message: msg, expired: false })
      }
    } finally {
      setJoining(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
    </div>
  )

  // ── Error / Expired ─────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full bg-card border border-rose/20 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-rose/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-rose" />
        </div>
        <h2 className="font-display font-bold text-xl text-zinc-900 dark:text-white mb-2">Interview Unavailable</h2>
        <p className="text-slate-400 font-body text-sm mb-6">{error.message}</p>
        <Link to="/" className="block w-full py-3 bg-surface border border-border rounded-xl text-sm text-slate-300 hover:bg-card transition-all font-body">
          ← Go to Homepage
        </Link>
      </motion.div>
    </div>
  )

  const t = templateData
  const org = t.organization
  const deadlineDate = t.deadline ? new Date(t.deadline) : null
  const isExpiring = deadlineDate && (deadlineDate - new Date()) < 24 * 60 * 60 * 1000 // less than 24h

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan/5 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="border-b border-border bg-surface/30 backdrop-blur-sm relative z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-violet to-cyan rounded-lg flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-void" strokeWidth={3} />
            </div>
            <span className="font-display font-bold text-zinc-900 dark:text-white text-sm">InterviewAI</span>
          </Link>
          {user ? (
            <span className="text-xs font-mono text-slate-500">Signed in as <span className="text-slate-300">{user.name}</span></span>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-xs text-slate-400 hover:text-zinc-900 dark:text-white font-body transition-colors">Sign In</Link>
              <Link to="/register" className="text-xs bg-violet/10 border border-violet/30 text-violet px-3 py-1.5 rounded-lg font-body hover:bg-violet/20 transition-all">Register</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Org header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {org?.logo
                ? <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                : <Building2 className="w-5 h-5 text-slate-600" />}
            </div>
            <div>
              <p className="font-display font-bold text-zinc-900 dark:text-white">{org?.name || 'Organization'}</p>
              <p className="text-[10px] font-mono text-slate-500 capitalize">{org?.type} · Official Interview Invitation</p>
            </div>
          </div>

          {/* Main card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header bar */}
            <div className="bg-gradient-to-r from-violet/20 to-cyan/10 border-b border-border px-6 py-4">
              <h1 className="font-display font-bold text-xl text-zinc-900 dark:text-white mb-1">{t.title}</h1>
              <p className="text-sm text-slate-400 font-body">You have been invited to interview for <span className="text-cyan">{t.role}</span></p>
            </div>

            {/* Details grid */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { icon: <Code2 className="w-4 h-4 text-violet" />, label: 'Type', val: TYPE_LABELS[t.interviewType] || t.interviewType },
                  { icon: <Hash className="w-4 h-4 text-cyan" />, label: 'Questions', val: `${t.questionCount} questions` },
                  { icon: <Clock className="w-4 h-4 text-amber" />, label: 'Duration', val: `~${t.duration} minutes` },
                  { icon: <Shield className="w-4 h-4 text-emerald" />, label: 'Proctoring', val: t.proctoringEnabled ? 'Enabled (camera required)' : 'Disabled' },
                ].map((item, i) => (
                  <div key={i} className="bg-surface rounded-xl p-3 flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-[10px] font-mono text-slate-500">{item.label}</p>
                      <p className="text-xs font-body text-slate-200">{item.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tech stack */}
              {t.techStack?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-mono text-slate-500 mb-2">TECH STACK</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.techStack.map((tech) => (
                      <span key={tech} className="text-[11px] font-mono bg-violet/10 text-violet border border-violet/20 px-2 py-0.5 rounded-full">{tech}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {t.instructions && (
                <div className="bg-surface/50 border border-border rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-mono text-slate-500 mb-1">INSTRUCTIONS</p>
                  <p className="text-xs font-body text-slate-300 leading-relaxed">{t.instructions}</p>
                </div>
              )}

              {/* Deadline warning */}
              {deadlineDate && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs font-body ${
                  isExpiring ? 'bg-rose/10 border border-rose/20 text-rose' : 'bg-amber/5 border border-amber/20 text-amber'
                }`}>
                  {isExpiring ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> : <Calendar className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{isExpiring ? '⚠️ Closing soon! ' : ''}Deadline: {fmtDate(t.deadline)}</span>
                </div>
              )}

              {/* Attempts info */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 mb-5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Max {t.maxAttempts} attempt{t.maxAttempts !== 1 ? 's' : ''} per candidate</span>
              </div>

              {/* CTA */}
              {!user ? (
                <div className="space-y-2">
                  <p className="text-center text-xs text-slate-500 font-body mb-3">Sign in or create an account to begin</p>
                  <Link to={`/login`} state={{ from: location.pathname }}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-violet to-cyan text-void font-display font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all text-sm">
                    <LogIn className="w-4 h-4" />Sign In to Start Interview
                  </Link>
                  <Link to={`/register`} state={{ from: location.pathname }}
                    className="flex items-center justify-center gap-2 w-full py-3 border border-border text-slate-300 rounded-xl hover:border-violet/30 hover:text-violet transition-all text-sm font-body">
                    <UserPlus className="w-4 h-4" />Create Account
                  </Link>
                </div>
              ) : (
                <button onClick={handleJoin} disabled={joining}
                  className="w-full py-3.5 bg-gradient-to-r from-violet to-cyan text-void font-display font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {joining
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Preparing your interview...</>
                    : <><ArrowRight className="w-4 h-4" />Start Interview Now</>}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-600 mt-4 font-mono">
            AI-powered interview platform · Secure & proctored
          </p>
        </motion.div>
      </div>
    </div>
  )
}
