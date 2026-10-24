import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getCandidateDetail, updateCandidateStatus } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  ArrowLeft, User, Users, FileText, Shield, Clock, Code2, CheckCircle2, XCircle,
  AlertTriangle, ExternalLink, Download, ChevronRight, MessageSquare, Trophy, Zap,
  Maximize2, ArrowLeftRight, Crosshair, Check, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Badge, EmptyState, IconButton, SkeletonList, StatusBadge, Tabs,
} from '../../components/ui/index'
import { usePageEnter } from '../../motion/hooks'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* Award badges read from the same palette as the leaderboard. */
const BADGE_META = {
  'Top Performer':       { color: 'amber',   Icon: Trophy },
  'Fast Solver':         { color: 'cyan',    Icon: Zap },
  'Strong Communicator': { color: 'violet',  Icon: MessageSquare },
  'Strong in DSA':       { color: 'emerald', Icon: Code2 },
}

function BadgeChip({ badge, className = '' }) {
  if (!badge) return null
  const meta = BADGE_META[badge]
  const Icon = meta?.Icon
  return (
    <Badge color={meta?.color ?? 'default'} className={className}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {badge}
    </Badge>
  )
}

/* AI recommendation — colour key for the Badge primitive. */
const RECOMMENDATION_CONFIG = {
  strong_hire:    { label: 'Strong Hire',    color: 'emerald' },
  hire:           { label: 'Hire',           color: 'cyan' },
  borderline:     { label: 'Borderline',     color: 'amber' },
  no_hire:        { label: 'No Hire',        color: 'rose' },
  strong_no_hire: { label: 'Strong No Hire', color: 'red' },
}

const VIOLATION_LABELS = {
  no_face:         { label: 'No Face Detected',  icon: User },
  multiple_faces:  { label: 'Multiple Faces',    icon: Users },
  fullscreen_exit: { label: 'Exited Fullscreen', icon: Maximize2 },
  tab_switch:      { label: 'Tab Switched',      icon: ArrowLeftRight },
  focus_lost:      { label: 'Focus Lost',        icon: Crosshair },
}

/* HR decision pills — colour plus a check mark, never colour alone. */
const STATUS_ACTIVE = {
  pending:     'border-hairline-strong text-ink',
  shortlisted: 'badge-warning',
  selected:    'badge-success',
  rejected:    'badge-danger',
}

const TAB_ITEMS = [
  { value: 'profile',    label: 'Profile',    icon: <User className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'report',     label: 'AI Report',  icon: <FileText className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'proctoring', label: 'Proctoring', icon: <Shield className="h-3.5 w-3.5" aria-hidden /> },
]

function ScoreCircle({ val, label, tone = 'text-accent', size = 64 }) {
  const pct = Math.min((val / 10) * 100, 100)
  const r = 24
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} viewBox="0 0 60 60" className="-rotate-90" role="img"
          aria-label={`${label} score ${val?.toFixed(1) ?? 'no data'} out of 10`}>
          <circle cx="30" cy="30" r={r} fill="none" stroke="currentColor" className="text-hairline" strokeWidth="5" />
          <circle cx="30" cy="30" r={r} fill="none" stroke="currentColor" strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" className={tone} />
        </svg>
        <span className={cx('num absolute text-sm font-semibold', tone)}>{val?.toFixed(1) ?? '—'}</span>
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  )
}

const fmtTime = (s) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function CandidateDetailPage() {
  const { templateId, interviewId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [expandedQ, setExpandedQ] = useState(null)

  useEffect(() => {
    getCandidateDetail(templateId, interviewId)
      .then((res) => setData(res.data.data))
      .catch(() => toast.error('Failed to load candidate'))
      .finally(() => setLoading(false))
  }, [templateId, interviewId])

  const handleStatus = async (status) => {
    setUpdatingStatus(true)
    try {
      await updateCandidateStatus(templateId, interviewId, status)
      setData(prev => ({ ...prev, report: { ...prev.report, candidateStatus: status } }))
      toast.success(`Candidate marked as ${status}`)
    } catch { toast.error('Failed to update status') }
    finally { setUpdatingStatus(false) }
  }

  const root = usePageEnter([])

  if (loading) return (
    <div className="page-shell flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-3xl"><SkeletonList rows={5} /></div>
    </div>
  )

  if (!data) return (
    <div className="page-shell flex min-h-dvh items-center justify-center p-4">
      <EmptyState icon={<User className="h-5 w-5" aria-hidden />} title="Candidate not found"
        description="This attempt may have been removed or the link is out of date." />
    </div>
  )

  const { candidate, interview, report } = data
  const rec = report?.recommendation ? RECOMMENDATION_CONFIG[report.recommendation] : null

  // Violation counts grouped by type
  const violationGroups = interview?.violations?.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div ref={root} className="page-shell flex min-h-dvh flex-col">
      <OrgNavbar />

      {/* Header sticky */}
      <header data-enter className="glass sticky top-14 z-30 border-x-0 border-t-0 shadow-1">
        <div className="container-page flex flex-wrap items-center gap-3 py-3">
          <IconButton label="Back to leaderboard" onClick={() => navigate(`/org/interview/${templateId}/leaderboard`)}>
            <ArrowLeft className="h-5 w-5" />
          </IconButton>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/25 bg-accent-soft text-sm font-semibold text-accent">
              {candidate.profilePicture
                ? <img src={candidate.profilePicture} alt="" className="h-full w-full object-cover" />
                : candidate.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-ink">{candidate.name}</h1>
              <p className="num truncate text-xs text-subtle">{candidate.email}</p>
            </div>
          </div>

          {/* Award badge */}
          {report?.badge && (
            <BadgeChip badge={report.badge} className="hidden sm:inline-flex" />
          )}

          {/* HR decision */}
          <div className="flex flex-wrap items-center gap-1">
            {['pending', 'shortlisted', 'selected', 'rejected'].map((s) => (
              <button key={s} onClick={() => handleStatus(s)} disabled={updatingStatus}
                aria-pressed={report?.candidateStatus === s}
                className={cx(
                  'badge cursor-pointer capitalize transition-colors duration-fast disabled:opacity-50',
                  report?.candidateStatus === s
                    ? STATUS_ACTIVE[s]
                    : 'border-transparent bg-transparent text-subtle hover:bg-inset hover:text-ink'
                )}>
                {report?.candidateStatus === s && <Check className="h-3 w-3" aria-hidden />}
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container-page flex-1 pb-16 pt-6">
        {/* Score summary */}
        {report && (
          <section data-enter className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex flex-wrap gap-5">
                <ScoreCircle val={report.overallScore} label="Overall" tone="text-accent" />
                <ScoreCircle val={report.technicalScore} label="Technical" tone="text-ai" />
                <ScoreCircle val={report.communicationScore} label="Communication" tone="text-success-500" />
                <ScoreCircle val={report.problemSolvingScore} label="Problem Solving" tone="text-warning-500" />
                {report.codeQualityScore != null && (
                  <ScoreCircle val={report.codeQualityScore} label="Code Quality" tone="text-ai-blue" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-3 border-t border-hairline pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                {rec && (
                  <Badge color={rec.color} className="uppercase tracking-[0.08em]">{rec.label}</Badge>
                )}
                <p className="t-body leading-relaxed">{report.overallFeedback}</p>
                <dl className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-hairline bg-inset px-3 py-2 text-xs font-medium text-subtle">
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Time taken</dt>
                    <dd className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /><span className="num">{fmtTime(interview.totalTimeTaken)}</span></dd>
                  </div>
                  {interview.violationCount > 0 && (
                    <div className="flex items-center gap-1.5 text-warning-500">
                      <dt className="sr-only">Violations</dt>
                      <dd className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /><span className="num">{interview.violationCount}</span> violations</dd>
                    </div>
                  )}
                  {interview.autoSubmitted && (
                    <div className="flex items-center gap-1.5">
                      <dt className="sr-only">Submission</dt>
                      <dd><StatusBadge tone="off">Auto-submitted</StatusBadge></dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </section>
        )}

        {/* Tabs */}
        <div data-enter className="mt-6">
          <Tabs ariaLabel="Candidate detail section" tabs={TAB_ITEMS} value={activeTab} onChange={setActiveTab} />
        </div>

        {/* ── PROFILE TAB ─────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div role="tabpanel" aria-label="Candidate profile" className="mt-6 grid gap-5 sm:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <h2 className="eyebrow mb-4">Candidate profile</h2>
              <dl className="divide-y divide-hairline text-sm">
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-subtle">Name</dt>
                  <dd className="text-right font-semibold text-ink">{candidate.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-subtle">Email</dt>
                  <dd className="num text-right break-all text-muted">{candidate.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-subtle">Type</dt>
                  <dd className="text-right capitalize text-muted">{candidate.userType}</dd>
                </div>
                {candidate.college && (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-subtle">College</dt>
                    <dd className="text-right text-muted">{candidate.college}</dd>
                  </div>
                )}
                {candidate.year && (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-subtle">Year</dt>
                    <dd className="text-right text-muted"><span className="num">{candidate.year}</span> — {candidate.branch}</dd>
                  </div>
                )}
                {candidate.company && (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-subtle">Company</dt>
                    <dd className="text-right text-muted">{candidate.company}</dd>
                  </div>
                )}
                {candidate.yearsOfExperience > 0 && (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-subtle">Experience</dt>
                    <dd className="text-right text-muted"><span className="num">{candidate.yearsOfExperience}</span> years</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-subtle">Level</dt>
                  <dd className="text-right capitalize text-muted">{candidate.experienceLevel || '—'}</dd>
                </div>
                {candidate.targetRole && (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-subtle">Target role</dt>
                    <dd className="text-right text-muted">{candidate.targetRole}</dd>
                  </div>
                )}
              </dl>
            </section>

            <div className="space-y-5">
              {/* Skills */}
              {candidate.skills?.length > 0 && (
                <section className="card p-5 sm:p-6">
                  <h2 className="eyebrow mb-3">Skills</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((sk) => (
                      <Badge key={sk} color="blue" className="num">{sk}</Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Resume */}
              <section className="card p-5 sm:p-6">
                <h2 className="eyebrow mb-3">Resume</h2>
                {candidate.resumeUrl ? (
                  <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${candidate.resumeUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors duration-fast hover:text-accent-hover">
                    <Download className="h-4 w-4" aria-hidden />
                    {candidate.resumeOriginalName || 'Download Resume'}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ) : (
                  <p className="t-sm">No resume uploaded</p>
                )}
              </section>

              {/* AI summaries */}
              {report?.strengthSummary && (
                <section className="card space-y-3 p-5 sm:p-6">
                  <h2 className="eyebrow mb-1">AI insights</h2>
                  <div className="card-inset flex items-start gap-3 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden />
                    <p className="text-sm font-medium leading-relaxed text-ink">{report.strengthSummary}</p>
                  </div>
                  <div className="card-inset flex items-start gap-3 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" aria-hidden />
                    <p className="text-sm font-medium leading-relaxed text-ink">{report.weaknessSummary}</p>
                  </div>
                  {report.candidateTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {report.candidateTags.map((t, i) => (
                        <Badge key={i}>{t}</Badge>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

        {/* ── REPORT TAB ─────────────────────────────────────────────── */}
        {activeTab === 'report' && report && (
          <div role="tabpanel" aria-label="AI report" className="mt-6 space-y-5">
            {/* Strengths / weaknesses */}
            <div className="grid gap-5 sm:grid-cols-2">
              <section className="card p-5 sm:p-6">
                <h2 className="eyebrow mb-3 flex items-center gap-1.5 text-success-500">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Strengths
                </h2>
                <ul className="space-y-2.5">
                  {report.strengths?.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-500" aria-hidden />{s}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card p-5 sm:p-6">
                <h2 className="eyebrow mb-3 flex items-center gap-1.5 text-danger-500">
                  <XCircle className="h-3.5 w-3.5" aria-hidden />Weaknesses
                </h2>
                <ul className="space-y-2.5">
                  {report.weaknesses?.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500" aria-hidden />{w}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Per-question breakdown */}
            <section>
              <h2 className="eyebrow mb-3">
                Per question analysis <span className="num text-subtle">({report.questionBreakdown?.length})</span>
              </h2>
              <div className="space-y-3">
                {report.questionBreakdown?.map((q, i) => (
                  <div key={q.questionId} className="card overflow-hidden">
                    <button onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                      aria-expanded={expandedQ === i}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-fast hover:bg-inset">
                      <span className={cx(
                        'badge num h-8 w-8 shrink-0 justify-center rounded-full font-semibold',
                        (q.score ?? 0) >= 7 ? 'badge-success' : (q.score ?? 0) >= 4 ? 'badge-warning' : 'badge-danger'
                      )}>{q.score?.toFixed(0) ?? 0}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{q.question}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge color={q.questionType === 'code' ? 'indigo' : q.questionType === 'system_design' ? 'cyan' : 'default'}>
                            {q.questionType}
                          </Badge>
                          <Badge>{q.difficulty}</Badge>
                          <span className="inline-flex items-center gap-1 text-2xs text-subtle">
                            <Clock className="h-3 w-3" aria-hidden />
                            <span className="num">{q.timeTaken ? `${Math.floor(q.timeTaken / 60)}m ${q.timeTaken % 60}s` : '—'}</span>
                          </span>
                          {q.followupCount > 0 && (
                            <Badge color="amber">
                              <MessageSquare className="h-3 w-3" aria-hidden />
                              <span className="num">{q.followupCount}</span> follow-ups
                            </Badge>
                          )}
                        </span>
                      </span>
                      <ChevronRight className={cx(
                        'ml-1 h-5 w-5 shrink-0 text-faint transition-transform duration-fast',
                        expandedQ === i && 'rotate-90'
                      )} aria-hidden />
                    </button>

                    <AnimatePresence>
                      {expandedQ === i && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden border-t border-hairline bg-inset">
                          <div className="space-y-5 p-4 sm:p-5">
                            {q.userAnswer && (
                              <div>
                                <p className="eyebrow mb-2">Candidate&apos;s answer</p>
                                <p className="card-inset p-4 text-sm leading-relaxed text-muted">{q.userAnswer}</p>
                              </div>
                            )}
                            {q.userCode && (
                              <div>
                                <p className="eyebrow mb-2">Submitted code</p>
                                <pre className="overflow-x-auto rounded-md border border-hairline bg-surface p-4 text-xs text-muted">{q.userCode}</pre>
                              </div>
                            )}
                            <div>
                              <p className="eyebrow mb-2">AI feedback</p>
                              <div className="card-inset p-4">
                                <p className="text-sm leading-relaxed text-ink">{q.feedback}</p>
                              </div>
                            </div>
                            <div>
                              <p className="eyebrow mb-2">Ideal answer</p>
                              <p className="text-sm italic leading-relaxed text-muted">{q.idealAnswer}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── PROCTORING TAB ──────────────────────────────────────────── */}
        {activeTab === 'proctoring' && (
          <div role="tabpanel" aria-label="Proctoring record" className="mt-6 space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="card-inset p-5 text-center">
                <p className="num-lg text-ink">{interview.violationCount || 0}</p>
                <p className="eyebrow mt-1">Total violations</p>
              </div>
              <div className="card-inset p-5 text-center">
                <p className={cx('num-lg', interview.autoSubmitted ? 'text-danger-500' : 'text-success-500')}>
                  {interview.autoSubmitted ? 'Yes' : 'No'}
                </p>
                <p className="eyebrow mt-1">Auto-submitted</p>
              </div>
              <div className="card-inset col-span-2 p-5 text-center sm:col-span-1">
                <p className="num-lg text-ink">{Object.keys(violationGroups).length}</p>
                <p className="eyebrow mt-1">Violation types</p>
              </div>
            </div>

            {/* Violation types */}
            {Object.entries(violationGroups).length > 0 && (
              <section className="card p-5 sm:p-6">
                <h2 className="eyebrow mb-4">Violation breakdown</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(violationGroups).map(([type, count]) => {
                    const cfg = VIOLATION_LABELS[type] || { label: type, icon: AlertTriangle }
                    const Icon = cfg.icon
                    return (
                      <div key={type} className="card-inset flex items-center justify-between gap-3 p-4">
                        <span className="flex min-w-0 items-center gap-3 text-sm font-medium text-ink">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface text-muted">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="truncate">{cfg.label}</span>
                        </span>
                        <Badge color="amber" className="num shrink-0">{count}×</Badge>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Timeline */}
            {interview.violations?.length > 0 && (
              <section className="card p-5 sm:p-6">
                <h2 className="eyebrow mb-4">
                  Violation timeline <span className="num text-subtle">({interview.violations.length})</span>
                </h2>
                <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
                  {interview.violations.map((v, i) => {
                    const cfg = VIOLATION_LABELS[v.type] || { label: v.type, icon: AlertTriangle }
                    const Icon = cfg.icon
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-3 text-sm transition-colors duration-fast hover:bg-inset">
                        <span className="num shrink-0 rounded-md border border-hairline bg-inset px-2 py-1 text-2xs text-subtle">
                          {new Date(v.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <span className="font-medium text-ink">{cfg.label}</span>
                        {v.details && (
                          <span className="ml-auto rounded-md border border-hairline bg-inset px-2 py-1 text-xs italic text-subtle">{v.details}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {interview.violations?.length === 0 && (
              <EmptyState icon={<Shield className="h-6 w-6 text-success-500" aria-hidden />}
                title="No violations recorded"
                description="Clean interview session — the proctoring stream never raised an event." />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
