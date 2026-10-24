import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTemplateInfo } from '../api/orgAPI'
import api from '../api/axios'
import { Button, Spinner } from '../components/ui/index'
import BrandLogo from '../components/brand/BrandLogo'
import { usePageEnter } from '../motion/index'
import {
  Building2, Clock, Hash, ShieldCheck, Calendar, Code2,
  CheckCircle2, AlertTriangle, XCircle, ArrowRight, LogIn, UserPlus
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

  const enterRef = usePageEnter([loading, error, templateData])

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div ref={enterRef} className="page-shell flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <BrandLogo to="/" size="sm" />
      <Spinner size="lg" />
      <div>
        <p className="t-h3 text-ink">Loading your invitation…</p>
        <p className="t-sm mt-1">Verifying the interview link</p>
      </div>
    </div>
  )

  // ── Error / Invalid link / Expired ──────────────────────────────────────
  if (error) {
    const Icon = error.expired ? Calendar : XCircle
    return (
      <div ref={enterRef} className="page-shell flex min-h-dvh items-center justify-center p-4">
        <div data-enter className="card w-full max-w-md p-8 text-center">
          <div className="mb-5 flex justify-center"><BrandLogo to="/" size="xs" /></div>
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-danger-bg text-danger-500" aria-hidden>
            <Icon className="h-7 w-7" />
          </span>
          <h1 className="t-h2 mb-2">{error.expired ? 'This interview has closed' : 'Interview unavailable'}</h1>
          {/* Message is exactly what the server returned — never fabricated */}
          <p className="t-body mb-6">{error.message}</p>
          <Link to="/" className="btn btn-secondary btn-lg w-full">
            <ArrowRight className="h-4 w-4" aria-hidden /> Go to homepage
          </Link>
        </div>
      </div>
    )
  }

  const t = templateData
  const org = t.organization
  const deadlineDate = t.deadline ? new Date(t.deadline) : null
  const isExpiring = deadlineDate && (deadlineDate - new Date()) < 24 * 60 * 60 * 1000 // less than 24h

  const details = [
    { Icon: Code2, label: 'Format',   value: TYPE_LABELS[t.interviewType] || t.interviewType },
    { Icon: Hash,  label: 'Questions', value: `${t.questionCount} questions` },
    { Icon: Clock, label: 'Duration',  value: `~${t.duration} minutes` },
    { Icon: ShieldCheck, label: 'Proctoring', value: t.proctoringEnabled ? 'Enabled (camera required)' : 'Disabled' },
  ]

  return (
    <div ref={enterRef} className="page-shell flex min-h-dvh flex-col text-ink">
      {/* Header */}
      <header className="relative z-10 border-b border-hairline bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <BrandLogo to="/" size="xs" />
          {user ? (
            <span className="t-xs">
              Signed in as <span className="font-medium text-ink">{user.name}</span>
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-secondary btn-sm">Register</Link>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div data-enter className="w-full max-w-lg">
          {/* Organization */}
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-hairline bg-inset text-subtle">
              {org?.logo
                ? <img src={org.logo} alt={`${org.name} logo`} className="h-full w-full object-cover" />
                : <Building2 className="h-5 w-5" aria-hidden />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{org?.name || 'Organization'}</p>
              <p className="eyebrow truncate">Official interview invitation</p>
            </div>
          </div>

          {/* Invitation card */}
          <section className="card overflow-hidden">
            <div className="hairline-b bg-inset px-6 py-5">
              <p className="eyebrow mb-1.5">You&apos;re invited</p>
              <h1 className="t-h2 mb-1">{t.title}</h1>
              <p className="t-body">
                Interviewing for <span className="font-medium text-ink">{t.role}</span>
              </p>
            </div>

            <div className="p-6">
              <dl className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {details.map(({ Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2.5 rounded-lg border border-hairline bg-inset p-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                    <div className="min-w-0">
                      <dt className="text-2xs uppercase tracking-wide text-subtle">{label}</dt>
                      <dd className="num mt-0.5 text-sm text-ink">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              {t.techStack?.length > 0 && (
                <div className="mb-4">
                  <p className="eyebrow mb-2">Tech stack</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {t.techStack.map((tech) => <li key={tech} className="chip">{tech}</li>)}
                  </ul>
                </div>
              )}

              {t.instructions && (
                <div className="card-inset mb-4 p-3.5">
                  <p className="eyebrow mb-1.5">Instructions</p>
                  <p className="t-sm">{t.instructions}</p>
                </div>
              )}

              {deadlineDate && (
                <div className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  isExpiring ? 'border-warning-500/30 bg-warning-bg text-warning-500' : 'border-hairline bg-inset text-muted'
                }`}>
                  {isExpiring
                    ? <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    : <Calendar className="h-4 w-4 shrink-0" aria-hidden />}
                  <span>
                    {isExpiring ? 'Closing soon — ' : 'Deadline: '}
                    <span className="num">{fmtDate(t.deadline)}</span>
                  </span>
                </div>
              )}

              <p className="mb-5 flex items-center gap-1.5 t-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-subtle" aria-hidden />
                Max <span className="num">{t.maxAttempts}</span> attempt{t.maxAttempts !== 1 ? 's' : ''} per candidate
              </p>

              {!user ? (
                <div className="flex flex-col gap-2">
                  <p className="t-sm mb-1 text-center">Sign in or create an account to begin</p>
                  <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary btn-lg w-full">
                    <LogIn className="h-4 w-4" aria-hidden /> Sign in to start interview
                  </Link>
                  <Link to="/register" state={{ from: location.pathname }} className="btn btn-secondary btn-lg w-full">
                    <UserPlus className="h-4 w-4" aria-hidden /> Create account
                  </Link>
                </div>
              ) : (
                <Button type="button" onClick={handleJoin} disabled={joining} loading={joining} variant="primary" size="lg" block icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                  {joining ? 'Preparing your interview…' : 'Start interview now'}
                </Button>
              )}
            </div>
          </section>

          <p className="mt-4 text-center t-xs">AI-powered interview platform · Secure &amp; proctored</p>
        </div>
      </main>
    </div>
  )
}
