import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import {
  Button, ScorePill, StatusBadge, SkeletonList, EmptyState, SegmentedControl,
  IconButton, Tooltip, StatTile, Meter,
} from '../components/ui/index'
import { getMyInterviews, deleteInterview, startPrebuiltInterview } from '../api/interviewAPI'
import { AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import {
  Plus, Search, Trash2, CheckCircle2, RotateCw, Circle, Code2, Brain,
  Users, Layers, Sparkles, ArrowUpRight, Clock, Gauge, Flame, Play, Zap,
  CalendarDays, TrendingUp, TrendingDown, FileText, ChevronRight, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { usePageEnter, useScrollReveal, useCountUp, prefersReducedMotion } from '../motion/index'
import { useChartColors } from '../hooks/useChartColors'

const STATUS_CONFIG = {
  completed:      { label: 'Completed',   tone: 'success', icon: CheckCircle2 },
  auto_submitted: { label: 'Auto-submitted', tone: 'warn', icon: Circle },
  created:        { label: 'Not started', tone: 'neutral', icon: Circle },
  active:         { label: 'In progress', tone: 'info', icon: RotateCw },
  paused:         { label: 'Paused',      tone: 'warn', icon: Circle },
}

const TYPE_META = {
  technical:     { Icon: Code2,  label: 'Technical',     cls: 'bg-accent-soft text-accent' },
  hr:            { Icon: Users,  label: 'HR',            cls: 'bg-ai-soft text-ai' },
  behavioral:    { Icon: Brain,  label: 'Behavioural',   cls: 'bg-warning-soft text-warning-500' },
  system_design: { Icon: Layers, label: 'System design', cls: 'bg-accent-soft text-accent' },
  mixed:         { Icon: Sparkles, label: 'Mixed',       cls: 'bg-ai-soft text-ai' },
}

const RECOM = {
  strong_hire: { label: 'Strong hire', cls: 'text-success-500' },
  hire:        { label: 'Hire',        cls: 'text-success-500' },
  borderline:  { label: 'Borderline',  cls: 'text-warning-500' },
  no_hire:     { label: 'No hire',     cls: 'text-danger-500' },
  strong_no_hire: { label: 'No hire',  cls: 'text-danger-500' },
}

const TRACKS = [
  { id: 'frontend-react', title: 'Frontend React Specialist', focus: 'React, hooks, performance', diff: 'Medium', dur: '30 min', Icon: Code2, cls: 'bg-accent-soft text-accent' },
  { id: 'backend-node', title: 'Backend & Distributed Systems', focus: 'Node.js, Redis, system design', diff: 'Hard', dur: '45 min', Icon: Layers, cls: 'bg-ai-soft text-ai' },
  { id: 'fullstack-mern', title: 'Full Stack Developer', focus: 'MERN stack, REST, auth', diff: 'Medium', dur: '35 min', Icon: Sparkles, cls: 'bg-warning-soft text-warning-500' },
]

const fmtTime = (s = 0) => (s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—')
const timeAgo = (d) => {
  const diff = (Date.now() - new Date(d)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 shadow-3">
      <p className="text-2xs text-subtle">{label}</p>
      <p className="num text-sm font-semibold text-ink">{payload[0]?.value?.toFixed(1)}<span className="text-2xs text-subtle">/10</span></p>
      {payload[0]?.payload?.role && <p className="mt-0.5 max-w-[12rem] truncate text-3xs text-faint">{payload[0].payload.role}</p>}
    </div>
  )
}

function AnimatedValue({ value, decimals = 0 }) {
  const numeric = Number(value)
  const ref = useCountUp(Number.isFinite(numeric) ? numeric : 0, { decimals, duration: 0.9 })
  if (value == null || value === '') return <span>—</span>
  return <span ref={ref}>{Number.isFinite(numeric) ? numeric.toFixed(decimals) : value}</span>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const colors = useChartColors()
  const [interviews, setInterviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [deleting, setDeleting] = useState(null)
  const [startingPrebuilt, setStartingPrebuilt] = useState(null)

  const enterRef = usePageEnter([])
  const revealRef = useScrollReveal([])

  const handleStartPrebuilt = async (id) => {
    setStartingPrebuilt(id)
    try {
      const res = await startPrebuiltInterview(id)
      toast.success('Ready-made interview loaded instantly!')
      navigate(`/interview/${res.data.data.interviewId}/room`)
    } catch {
      toast.error('Failed to start interview')
    } finally {
      setStartingPrebuilt(null)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await getMyInterviews({ limit: 50, sort })
      setInterviews(res.data.data || [])
      setStats(res.data.stats || null)
    } catch { toast.error('Failed to load interviews') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [sort])

  const handleDelete = async (id, e) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this interview?')) return
    setDeleting(id)
    try {
      await deleteInterview(id)
      setInterviews((p) => p.filter((i) => i._id !== id))
      toast.success('Deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete active interview')
    } finally { setDeleting(null) }
  }

  const filtered = useMemo(() => interviews.filter((iv) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      iv.role?.toLowerCase().includes(q) ||
      iv.techStack?.some((t) => t.toLowerCase().includes(q))
    const matchStatus = statusFilter === 'all' || iv.status === statusFilter
    return matchSearch && matchStatus
  }), [interviews, search, statusFilter])

  const chartData = useMemo(() => interviews
    .filter((iv) => iv.reportData?.overallScore != null)
    .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt))
    .slice(-10)
    .map((iv, i) => ({ name: `#${i + 1}`, score: iv.reportData.overallScore, role: iv.role })), [interviews])

  const strongScores = useMemo(() => interviews.filter((i) => i.reportData?.overallScore >= 7).length, [interviews])
  const scoredCount = useMemo(() => interviews.filter((i) => i.reportData?.overallScore != null).length, [interviews])
  const firstName = user?.name?.split(' ')[0] || 'there'

  const completionRate = stats?.total ? Math.round((stats.completed / stats.total) * 100) : null
  const latestScore = chartData.length ? chartData[chartData.length - 1].score : null
  const scoreDelta = chartData.length > 1
    ? chartData[chartData.length - 1].score - chartData[chartData.length - 2].score
    : null
  const averageScore = stats?.avgScore ?? (scoredCount
    ? chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length
    : null)

  const resumeTarget = useMemo(() => (
    interviews.find((i) => i.status === 'active') ||
    interviews.find((i) => i.status === 'paused') ||
    interviews.find((i) => i.status === 'created') ||
    null
  ), [interviews])

  const latestReport = useMemo(() => (
    interviews
      .filter((i) => ['completed', 'auto_submitted'].includes(i.status) && i.reportData?.overallScore != null)
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))[0] || null
  ), [interviews])

  const roundMix = useMemo(() => {
    const total = interviews.length
    const counts = interviews.reduce((acc, iv) => {
      acc[iv.interviewType] = (acc[iv.interviewType] || 0) + 1
      return acc
    }, {})
    return Object.entries(TYPE_META)
      .map(([key, meta]) => ({
        key,
        ...meta,
        count: counts[key] || 0,
        pct: total ? Math.round(((counts[key] || 0) / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [interviews])

  const nextStep = resumeTarget || latestReport

  return (
    <div className="page-shell">
      <Navbar />

      <main className="container-page max-w-6xl pb-24 pt-[calc(var(--nav-h)+1.5rem)] sm:pt-[calc(var(--nav-h)+2.5rem)]">
        {/* ── Greeting band ──────────────────────────────────────── */}
        <header
          ref={enterRef}
          className="relative overflow-hidden rounded-[var(--r-2xl)] border border-hairline bg-gradient-to-br from-surface via-surface to-accent-soft/45 shadow-2"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="line-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_90%_at_100%_0%,black_20%,transparent_75%)]" />
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-ai/10 blur-3xl" />
            <div className="absolute right-10 top-8 hidden h-36 w-36 rounded-full border border-accent/15 lg:block" />
            <div className="absolute right-20 top-16 hidden h-20 w-20 rounded-full border border-ai/20 lg:block" />
          </div>

          <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
            <div data-enter className="min-w-0">
              <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
                <CalendarDays className="h-3.5 w-3.5 text-accent" aria-hidden />
                {todayLabel()}
                <span aria-hidden className="h-3 w-px bg-hairline" />
                {greeting()}
              </p>
              <h1 className="t-h1 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-balance">
                <span className="min-w-0">Welcome back, {firstName}</span>
                <span className={`badge ${user?.plan === 'pro' ? 'badge-accent' : ''}`}>
                  {user?.plan === 'pro' ? 'Pro plan' : 'Free plan'}
                </span>
              </h1>
              <p className="t-body mt-2.5 max-w-xl text-pretty">
                {loading
                  ? 'Loading your preparation history…'
                  : interviews.length
                    ? `${stats?.completed ?? 0} completed of ${stats?.total ?? 0} sessions. ${
                        completionRate >= 50 ? 'You’re building real momentum.' : 'Every round sharpens the next one.'
                      }`
                    : 'Set up your first session — the interviewer adapts to what you say.'}
              </p>
            </div>

            <div data-enter className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0">
              <Link to="/aptitude" className="btn btn-secondary btn-md flex-1 sm:flex-none">
                <Brain className="h-4 w-4" aria-hidden /> Aptitude
              </Link>
              <Link to="/interview/create" className="btn btn-primary btn-lg flex-1 sm:flex-none">
                <Plus className="h-4 w-4" aria-hidden /> New interview
              </Link>
            </div>
          </div>
        </header>

        <div ref={revealRef} className="mt-5 space-y-5">
          {/* ── Metrics ───────────────────────────────────────────── */}
          <section aria-label="Performance summary" data-reveal className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
            <StatTile
              icon={Layers}
              label="Sessions"
              value={<AnimatedValue value={stats?.total ?? 0} />}
              hint="Across all round types"
              tone="accent"
            />
            <StatTile
              icon={CheckCircle2}
              label="Completed"
              value={<AnimatedValue value={stats?.completed ?? 0} />}
              hint={completionRate != null ? `${completionRate}% completion rate` : 'No sessions yet'}
              tone="success"
            />
            <StatTile
              icon={Sparkles}
              label="Average score"
              value={averageScore != null ? <AnimatedValue value={averageScore} decimals={1} /> : '—'}
              unit={averageScore != null ? '/10' : undefined}
              hint={scoredCount ? `Across ${scoredCount} scored ${scoredCount === 1 ? 'round' : 'rounds'}` : 'Complete a round to see'}
              tone="ai"
            />
            <StatTile
              icon={Flame}
              label="Strong rounds"
              value={<AnimatedValue value={strongScores} />}
              hint="Scored 7 or higher"
              tone="warning"
            />
          </section>

          {/* ── Trend + next step ─────────────────────────────────── */}
          <div data-reveal className="grid gap-5 lg:grid-cols-12">
            <section aria-labelledby="trend-heading" className="card overflow-hidden lg:col-span-8">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                    <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="trend-heading" className="t-h3 leading-tight">Score progression</h2>
                    <p className="mt-0.5 text-xs text-subtle">
                      {scoredCount
                        ? `Your last ${chartData.length} scored ${chartData.length === 1 ? 'round' : 'rounds'}`
                        : 'No scored rounds yet'}
                    </p>
                  </div>
                </div>

                {latestScore != null && (
                  <div className="flex items-center gap-3">
                    <span className="num rounded-full bg-inset px-2.5 py-1 text-xs font-semibold text-ink">
                      {latestScore.toFixed(1)}<span className="text-2xs font-medium text-faint">/10</span>
                    </span>
                    {scoreDelta != null && (
                      <span className={`inline-flex items-center gap-1 text-2xs font-semibold ${scoreDelta >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
                        {scoreDelta >= 0
                          ? <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                          : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
                        {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}
                        <span className="font-medium text-faint">vs last</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="px-4 pb-5 pt-4 sm:px-6">
                {chartData.length > 1 ? (
                  <>
                    <ResponsiveContainer width="100%" height={212}>
                      <AreaChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                        <defs>
                          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.26} />
                            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={colors.grid} strokeDasharray="2 6" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.axis }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10, fill: colors.axis }} axisLine={false} tickLine={false} />
                        {averageScore != null && (
                          <ReferenceLine y={averageScore} stroke={colors.axis} strokeDasharray="4 5" strokeOpacity={0.55} />
                        )}
                        <ReTooltip content={<ChartTooltip />} cursor={{ stroke: colors.grid }} />
                        <Area type="monotone" dataKey="score" stroke={colors.accent} strokeWidth={2.25}
                          fill="url(#scoreFill)" dot={{ fill: colors.accent, r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4.5, strokeWidth: 2, stroke: colors.surface }} />
                      </AreaChart>
                    </ResponsiveContainer>
                    {averageScore != null && (
                      <p className="mt-2 text-2xs text-faint">
                        Dashed line marks your average of {averageScore.toFixed(1)}.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex h-[212px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-inset/60 px-4 text-center">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                      <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">Your trend appears after two scored rounds</p>
                      <p className="mt-1 text-xs text-subtle">Finish one more interview to draw the line.</p>
                    </div>
                    <Link to="/interview/create" className="btn btn-secondary btn-sm mt-1">
                      Start a round <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Next step — resume in-flight work, open the latest report, or start */}
            <section aria-labelledby="next-heading" className="card relative isolate overflow-hidden lg:col-span-4">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-accent/[0.10] to-transparent" />
              <div className="relative flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="next-heading" className="t-h3 leading-tight">Next step</h2>
                  <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-inset text-muted">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                </div>

                {resumeTarget ? (
                  <div className="mt-4 flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={STATUS_CONFIG[resumeTarget.status]?.tone === 'info' ? 'live' : STATUS_CONFIG[resumeTarget.status]?.tone || 'neutral'}>
                        {STATUS_CONFIG[resumeTarget.status]?.label || 'Ready'}
                      </StatusBadge>
                      <span className="num text-2xs text-faint">{timeAgo(resumeTarget.startedAt || resumeTarget.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold leading-snug text-ink">{resumeTarget.role}</p>
                    <p className="mt-1 text-xs text-subtle">
                      {TYPE_META[resumeTarget.interviewType]?.label || 'Mixed'} round
                      {resumeTarget.totalQuestions ? ` · ${resumeTarget.totalQuestions} questions` : ''}
                    </p>
                    {resumeTarget.techStack?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {resumeTarget.techStack.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full border border-hairline bg-inset px-2 py-0.5 text-2xs text-muted">{t}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-auto pt-6">
                      <Link to={`/interview/${resumeTarget._id}/room`} className="btn btn-primary btn-lg w-full">
                        Resume session <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                      <p className="mt-2 text-center text-2xs text-faint">Your transcript and timer are exactly where you left them.</p>
                    </div>
                  </div>
                ) : latestReport ? (
                  <div className="mt-4 flex flex-1 flex-col">
                    <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">Latest report</p>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-ink">{latestReport.role}</p>
                        <p className="mt-1 text-xs text-subtle">
                          {TYPE_META[latestReport.interviewType]?.label || 'Mixed'} · {timeAgo(latestReport.completedAt || latestReport.createdAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="num text-3xl font-semibold leading-none text-ink">{latestReport.reportData.overallScore.toFixed(1)}</p>
                        <p className="mt-1 text-2xs text-faint">out of 10</p>
                      </div>
                    </div>
                    {RECOM[latestReport.reportData.recommendation] && (
                      <p className={`mt-3 inline-flex w-fit rounded-full bg-inset px-2.5 py-1 text-2xs font-semibold ${RECOM[latestReport.reportData.recommendation].cls}`}>
                        {RECOM[latestReport.reportData.recommendation].label}
                      </p>
                    )}
                    <div className="mt-auto pt-6">
                      <Link to={`/interview/${latestReport._id}/report`} className="btn btn-secondary btn-lg w-full">
                        <FileText className="h-4 w-4" aria-hidden /> Open report
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-1 flex-col">
                    <p className="text-sm leading-relaxed text-muted">
                      Nothing in flight. Pick a track and get a baseline score in one sitting.
                    </p>
                    <div className="mt-auto pt-6">
                      <Link to="/interview/create" className="btn btn-primary btn-lg w-full">
                        <Plus className="h-4 w-4" aria-hidden /> Start a round
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Quick practice + round mix ────────────────────────── */}
          <div data-reveal className="grid gap-5 lg:grid-cols-12">
            <section aria-labelledby="quick-heading" className="card p-5 sm:p-6 lg:col-span-7">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai" aria-hidden>
                    <Zap className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="quick-heading" className="t-h3 leading-tight">Quick practice</h2>
                    <p className="mt-0.5 text-xs text-subtle">Curated tracks, ready instantly</p>
                  </div>
                </div>
                <Link to="/interview/create" className="btn btn-ghost btn-xs shrink-0">
                  All tracks <ArrowUpRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {TRACKS.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleStartPrebuilt(track.id)}
                    disabled={startingPrebuilt !== null}
                    aria-label={`Start ${track.title}`}
                    className="group flex h-full flex-col rounded-xl border border-hairline bg-inset p-4 text-left transition-[background-color,border-color,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent-soft/25 disabled:pointer-events-none disabled:opacity-60"
                  >
                    <span className={`grid h-9 w-9 place-items-center rounded-lg ${track.cls}`} aria-hidden>
                      <track.Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <p className="mt-3 text-[0.8125rem] font-semibold leading-snug text-ink">{track.title}</p>
                    <p className="mt-1 text-2xs leading-relaxed text-subtle">{track.focus}</p>
                    <span className="mt-auto flex w-full items-center justify-between gap-2 pt-4">
                      <span className="num text-3xs text-faint">{track.dur} · {track.diff}</span>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-on transition-transform duration-fast group-hover:scale-105" aria-hidden>
                        {startingPrebuilt === track.id
                          ? <RotateCw className="h-3 w-3 animate-spin" />
                          : <Play className="h-3 w-3 fill-current" />}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="mix-heading" className="card p-5 sm:p-6 lg:col-span-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-inset text-muted" aria-hidden>
                    <Gauge className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="mix-heading" className="t-h3 leading-tight">Round mix</h2>
                    <p className="mt-0.5 text-xs text-subtle">
                      {interviews.length ? `Across ${interviews.length} ${interviews.length === 1 ? 'session' : 'sessions'}` : 'No sessions yet'}
                    </p>
                  </div>
                </div>
              </div>

              {interviews.length === 0 ? (
                <p className="rounded-lg border border-dashed border-hairline px-4 py-6 text-center text-xs text-subtle">
                  Your mix appears after your first round.
                </p>
              ) : (
                <ul className="space-y-3.5">
                  {roundMix.map((row, i) => (
                    <li key={row.key}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${row.cls}`} aria-hidden>
                          <row.Icon className="h-3 w-3" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted">{row.label}</span>
                        <span className="num shrink-0 text-2xs text-subtle">{row.count}</span>
                        <span className="num w-8 shrink-0 text-right text-2xs text-faint">{row.pct}%</span>
                      </div>
                      <Meter
                        value={row.pct}
                        max={100}
                        tone={i === 0 ? 'accent' : i === 1 ? 'ai' : i === 2 ? 'success' : i === 3 ? 'warning' : 'accent'}
                        label={`${row.label}: ${row.count} of ${interviews.length} sessions`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ── History ───────────────────────────────────────────── */}
          <section aria-labelledby="history-heading" data-reveal className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-inset text-muted" aria-hidden>
                  <Clock className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h2 id="history-heading" className="t-h3 leading-tight">Interview history</h2>
                  <p className="mt-0.5 text-xs text-subtle">
                    {loading ? 'Loading sessions…' : `${filtered.length} ${filtered.length === 1 ? 'session' : 'sessions'} shown`}
                  </p>
                </div>
              </div>
              <Link to="/interview/create" className="btn btn-primary btn-sm">
                <Plus className="h-3.5 w-3.5" aria-hidden /> New round
              </Link>
            </div>

            <div className="flex flex-col gap-2.5 border-b border-hairline bg-surface-2/50 p-3 sm:flex-row sm:items-center sm:px-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search role or tech stack"
                  aria-label="Search interviews"
                  className="input pl-9"
                />
              </div>
              <SegmentedControl
                ariaLabel="Filter by status"
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'completed', label: 'Done' },
                  { value: 'active', label: 'Live' },
                  { value: 'created', label: 'Queued' },
                ]}
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort interviews"
                className="input w-auto shrink-0 sm:w-36"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            {loading ? (
              <div className="p-4"><SkeletonList rows={4} /></div>
            ) : filtered.length === 0 ? (
              interviews.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="h-5 w-5" aria-hidden />}
                  title="No interviews yet"
                  description="Your first session builds a baseline score you can improve against."
                  action={
                    <Link to="/interview/create">
                      <Button size="md"><Plus className="h-4 w-4" aria-hidden />Create interview</Button>
                    </Link>
                  }
                />
              ) : (
                <EmptyState title="No matches" description="Nothing fits this search or filter." />
              )
            ) : (
              <ul className="divide-y divide-hairline">
                <AnimatePresence initial={false}>
                  {filtered.map((iv) => {
                    const cfg = STATUS_CONFIG[iv.status] || STATUS_CONFIG.created
                    const type = TYPE_META[iv.interviewType] || TYPE_META.technical
                    const rd = iv.reportData
                    const canView = ['completed', 'auto_submitted'].includes(iv.status)
                    const canResume = ['created', 'active', 'paused'].includes(iv.status)
                    const rec = RECOM[rd?.recommendation]
                    const actionable = canView || canResume

                    return (
                      <motion.li
                        key={iv._id}
                        layout={!prefersReducedMotion()}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div
                          role={actionable ? 'link' : undefined}
                          tabIndex={actionable ? 0 : undefined}
                          onClick={() => { if (canView) navigate(`/interview/${iv._id}/report`); else if (canResume) navigate(`/interview/${iv._id}/room`) }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' || !actionable) return
                            navigate(canView ? `/interview/${iv._id}/report` : `/interview/${iv._id}/room`)
                          }}
                          className={`group flex items-center gap-3 px-4 py-4 transition-colors duration-fast sm:px-6 ${
                            actionable ? 'cursor-pointer hover:bg-inset' : ''
                          }`}
                        >
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${type.cls} transition-transform duration-fast group-hover:scale-[1.04]`} aria-hidden>
                            <type.Icon className="h-4 w-4" strokeWidth={1.75} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="truncate text-sm font-semibold text-ink">{iv.role}</p>
                              {rec && <span className={`text-2xs font-semibold ${rec.cls}`}>{rec.label}</span>}
                            </div>
                            <div className="mt-1 flex flex-nowrap items-center gap-x-1.5 overflow-hidden whitespace-nowrap text-2xs text-subtle sm:flex-wrap sm:overflow-visible sm:whitespace-normal">
                              <span className="sm:hidden"><StatusBadge tone={cfg.tone === 'info' ? 'live' : cfg.tone}>{cfg.label}</StatusBadge></span>
                              <span>{type.label}</span>
                              {iv.techStack?.slice(0, 3).map((t) => (
                                <span key={t} className="num text-faint">· {t}</span>
                              ))}
                              {(iv.techStack?.length || 0) > 3 && (
                                <span className="num text-faint">· +{iv.techStack.length - 3}</span>
                              )}
                              <span className="num text-faint sm:hidden">
                                · {iv.totalTimeTaken ? fmtTime(iv.totalTimeTaken) : timeAgo(iv.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="hidden w-28 shrink-0 sm:block">
                            <StatusBadge tone={cfg.tone === 'info' ? 'live' : cfg.tone}>{cfg.label}</StatusBadge>
                          </div>

                          <div className="w-16 shrink-0 text-right">
                            {rd?.overallScore != null
                              ? <ScorePill score={rd.overallScore} />
                              : <span className="num text-xs text-faint">—</span>}
                          </div>

                          <div className="hidden w-20 shrink-0 text-right sm:block">
                            <Tooltip content={iv.completedAt ? new Date(iv.completedAt).toLocaleDateString() : timeAgo(iv.createdAt)}>
                              <span className="num text-2xs text-subtle">
                                {iv.totalTimeTaken ? fmtTime(iv.totalTimeTaken) : timeAgo(iv.createdAt)}
                              </span>
                            </Tooltip>
                          </div>

                          {actionable && (
                            <ChevronRight className="hidden h-4 w-4 shrink-0 text-faint transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-accent sm:block" aria-hidden />
                          )}

                          <IconButton
                            label={`Delete ${iv.role} interview`}
                            onClick={(e) => handleDelete(iv._id, e)}
                            disabled={iv.status === 'active' || deleting === iv._id}
                            className="shrink-0 text-subtle opacity-100 hover:text-danger-500 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            {deleting === iv._id
                              ? <RotateCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                          </IconButton>
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </div>
      </main>

    </div>
  )
}
