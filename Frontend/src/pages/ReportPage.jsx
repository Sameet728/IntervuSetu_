import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Spinner, ScoreRing, StatusBadge } from '../components/ui/index'
import { useChartColors } from '../hooks/useChartColors'
import { usePageEnter, useScrollReveal, prefersReducedMotion } from '../motion/index'
import { getReport, downloadPDF } from '../api/reportAPI'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import toast from 'react-hot-toast'
import {
  Download, ArrowLeft, CheckCircle2, XCircle, Clock,
  Code2, Brain, Users, AlertTriangle, ChevronDown,
  FileText, BookOpen, Target, TrendingUp, MessageSquare, Lightbulb, Layers,
  BarChart3, ThumbsUp, ThumbsDown, Scale, AudioLines, Plus, Gauge,
  ShieldCheck, Award, Sparkles, ArrowRight,
} from 'lucide-react'

/* Recommendation is carried by label + icon shape, never colour alone. */
const recommendationConfig = {
  strong_hire:    { tone: 'success', badge: 'badge-success', label: 'Strong Hire',    Icon: ThumbsUp },
  hire:           { tone: 'success', badge: 'badge-success', label: 'Hire',           Icon: CheckCircle2 },
  borderline:     { tone: 'warning', badge: 'badge-warning', label: 'Borderline',     Icon: Scale },
  no_hire:        { tone: 'danger',  badge: 'badge-danger',  label: 'No Hire',        Icon: XCircle },
  strong_no_hire: { tone: 'danger',  badge: 'badge-danger',  label: 'Strong No Hire', Icon: ThumbsDown },
}

const REC_PANEL = {
  success: { wrap: 'border-success-500/25 bg-success-soft/45', glow: 'from-success-500/[0.16]' },
  warning: { wrap: 'border-warning-500/25 bg-warning-soft/45', glow: 'from-warning-500/[0.16]' },
  danger:  { wrap: 'border-danger-500/25 bg-danger-soft/45',   glow: 'from-danger-500/[0.14]' },
}

const typeIcon = {
  code:          <Code2         className="h-3.5 w-3.5" aria-hidden />,
  theory:        <Brain         className="h-3.5 w-3.5" aria-hidden />,
  hr:            <Users         className="h-3.5 w-3.5" aria-hidden />,
  behavioral:    <MessageSquare className="h-3.5 w-3.5" aria-hidden />,
  system_design: <Layers        className="h-3.5 w-3.5" aria-hidden />,
}

const typeLabel = {
  code: 'Coding', theory: 'Theory', hr: 'HR', behavioral: 'Behavioral', system_design: 'System design',
}

/* Static class maps — interpolated Tailwind names never make it into the build. */
const TONE_CLASS = {
  success: { text: 'text-success-500', bar: 'bg-success-500', tile: 'bg-success-soft text-success-500' },
  warning: { text: 'text-warning-500', bar: 'bg-warning-500', tile: 'bg-warning-soft text-warning-500' },
  danger:  { text: 'text-danger-500',  bar: 'bg-danger-500',  tile: 'bg-danger-soft text-danger-500' },
}

const fmt = (sec = 0) => {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}m ${s}s`
}

const scoreTone = (s) => (s >= 8 ? 'success' : s >= 5 ? 'warning' : 'danger')

const SectionTitle = ({ icon: Icon, children, id, className = '' }) => (
  <h2 id={id} className={`flex items-center gap-2 text-sm font-semibold text-ink ${className}`}>
    <Icon className="h-4 w-4 text-accent-500" aria-hidden />
    {children}
  </h2>
)

export default function ReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report,      setReport]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [expanded,    setExpanded]    = useState({})
  const [retries,     setRetries]     = useState(0)

  const colors = useChartColors()
  const scoreColor = (s) => colors[scoreTone(s)]

  useEffect(() => {
    let timer
    const fetchReport = () => {
      getReport(id)
        .then(r => { setReport(r.data.data); setLoading(false) })
        .catch(() => {
          if (retries < 6) {
            timer = setTimeout(() => { setRetries(p => p + 1) }, 4000)
          } else { setLoading(false) }
        })
    }
    fetchReport()
    return () => clearTimeout(timer)
  }, [id, retries])

  const enterRef = usePageEnter([report])
  const revealRef = useScrollReveal([report])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadPDF(id, `interview_report_${report?.role?.replace(/\s+/g,'_')}_${Date.now()}.pdf`)
      toast.success('Report downloaded!')
    } catch { toast.error('Download failed') }
    finally { setDownloading(false) }
  }

  const toggle = (qid) => setExpanded(p => ({ ...p, [qid]: !p[qid] }))

  if (loading) return (
    <div className="page-shell">
      <Navbar />
      <div className="flex min-h-dvh items-center justify-center px-4 py-24">
        <div className="card relative w-full max-w-md overflow-hidden p-8 text-center">
          <div aria-hidden className="line-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <div>
              <p className="t-h3 text-ink">Synthesising your report</p>
              <p className="t-sm mt-1.5">
                Scoring each answer, writing feedback and assembling your study plan.
                This can take a few moments.
              </p>
            </div>
            <ul className="mt-2 grid w-full gap-1.5 text-left text-2xs text-subtle">
              {['Scores across every dimension', 'Feedback on each question', 'An action plan and topics to revise'].map(item => (
                <li key={item} className="flex items-center gap-2 rounded-lg border border-hairline bg-inset px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  if (!report) return (
    <div className="page-shell">
      <Navbar />
      <div className="flex min-h-dvh items-center justify-center px-4 py-24">
        <div className="card max-w-sm p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-inset text-subtle">
            <XCircle className="h-6 w-6" aria-hidden />
          </span>
          <p className="t-h3 mt-4 text-ink">Report not available</p>
          <p className="t-sm mt-1.5">This report may still be generating, or the interview was removed.</p>
          <Button className="mt-5" variant="secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  )

  const recCfg = recommendationConfig[report.recommendation] || recommendationConfig.borderline
  const RecIcon = recCfg.Icon
  const recPanel = REC_PANEL[recCfg.tone] || REC_PANEL.warning

  const radarData = [
    { subject: 'Technical',      value: report.technicalScore },
    { subject: 'Communication',  value: report.communicationScore },
    { subject: 'Problem Solving',value: report.problemSolvingScore },
    { subject: 'HR/Behavioral',  value: report.hrScore },
    ...(report.codeQualityScore ? [{ subject: 'Code Quality', value: report.codeQualityScore }] : []),
  ].filter(d => d.value != null)

  const barData = report.questionBreakdown?.map((q, i) => ({
    name: `Q${i + 1}`,
    score: q.score ?? 0,
    type: q.questionType,
  })) || []

  const scores = [
    { label: 'Technical Depth', value: report.technicalScore },
    { label: 'Communication',   value: report.communicationScore },
    { label: 'Problem Solving', value: report.problemSolvingScore },
    { label: 'HR & Culture',    value: report.hrScore },
    ...(report.codeQualityScore ? [{ label: 'Code Quality', value: report.codeQualityScore }] : []),
  ].filter(s => s.value != null)

  const questionCount = report.questionBreakdown?.length || 0
  const avgPerQuestion = Number.isFinite(report.averageTimePerQuestion)
    ? Math.round(report.averageTimePerQuestion)
    : (questionCount ? Math.round((report.totalTimeTaken || 0) / questionCount) : 0)

  const scoredQuestions = (report.questionBreakdown || [])
    .map((q, i) => ({ score: q.score, index: i }))
    .filter(q => q.score != null)
  const topQuestion = scoredQuestions.length
    ? scoredQuestions.reduce((a, b) => (b.score > a.score ? b : a))
    : null
  const focusQuestion = scoredQuestions.length
    ? scoredQuestions.reduce((a, b) => (b.score < a.score ? b : a))
    : null
  const showExtremes = scoredQuestions.length > 1 && topQuestion.index !== focusQuestion.index

  return (
    <div className="page-shell text-ink">
      <Navbar />

      <main className="container-page max-w-6xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">
        {/* ── Header actions ───────────────────────────────────────── */}
        <div ref={enterRef} className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            data-enter
            className="btn btn-ghost btn-sm -ml-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
          </button>
          <Button data-enter variant="secondary" size="sm" onClick={handleDownload} loading={downloading}>
            {!downloading && <Download className="h-4 w-4" aria-hidden />}
            {downloading ? 'Downloading…' : 'Export PDF'}
          </Button>
        </div>

        {/* ── Report cover ─────────────────────────────────────────── */}
        <section
          aria-labelledby="report-heading"
          className="card relative mb-5 overflow-hidden"
        >
          <div aria-hidden className="line-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(80%_90%_at_92%_0%,black,transparent)]" />
          <div aria-hidden className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-b ${recPanel.glow} to-transparent blur-3xl`} />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 h-44 w-44 rounded-full bg-accent/[0.08] blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 p-5 text-center sm:p-7 lg:flex-row lg:items-center lg:gap-9 lg:text-left">
            <div data-enter className="shrink-0">
              <ScoreRing score={report.overallScore} size={132} label="overall" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="eyebrow mb-2">Interview report</p>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:justify-start">
                <h1 id="report-heading" className="t-h1 min-w-0 text-balance">{report.role}</h1>
                <span className="badge capitalize">{report.experienceLevel}</span>
              </div>

              {report.techStack?.length > 0 && (
                <ul className="mt-3 flex flex-wrap justify-center gap-1.5 lg:justify-start">
                  {report.techStack.map(t => <li key={t} className="chip">{t}</li>)}
                </ul>
              )}

              <dl data-enter className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-subtle lg:justify-start">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-faint" aria-hidden />
                  <dt className="sr-only">Total time</dt>
                  <dd className="num">{fmt(report.totalTimeTaken)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-faint" aria-hidden />
                  <dt className="sr-only">Questions reviewed</dt>
                  <dd className="num">{questionCount} questions</dd>
                </div>
                {avgPerQuestion > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-faint" aria-hidden />
                    <dt className="sr-only">Average time per question</dt>
                    <dd className="num">{fmt(avgPerQuestion)} / question</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className={`w-full shrink-0 rounded-xl border p-4 text-left lg:w-56 ${recPanel.wrap}`}>
              <p className="eyebrow">Recommendation</p>
              <p className="mt-2">
                <span className={`${recCfg.badge} gap-1.5 px-2.5 py-1 font-semibold uppercase tracking-wide`}>
                  <RecIcon className="h-3.5 w-3.5" aria-hidden /> {recCfg.label}
                </span>
              </p>
              <p className="mt-2 text-2xs text-subtle">AI verdict for this session</p>
            </div>
          </div>

          <div className="hairline-t relative flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-2xs text-subtle sm:px-7">
            {report.violationCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-warning-500">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                <span className="num">{report.violationCount}</span> proctoring {report.violationCount === 1 ? 'violation' : 'violations'} recorded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success-500" aria-hidden />
                No proctoring violations
              </span>
            )}
            {report.autoSubmitted && <StatusBadge tone="warn">Auto-submitted</StatusBadge>}
            <span className="ml-auto hidden sm:inline">Generated from {questionCount} reviewed answers</span>
          </div>
        </section>

        {/* ── Overall feedback ─────────────────────────────────────── */}
        {report.overallFeedback && (
          <section className="card relative mb-5 overflow-hidden p-5 sm:p-6">
            <div aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent via-accent/60 to-ai/40" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle icon={MessageSquare} className="mb-0">Interviewer summary</SectionTitle>
              <span className="badge badge-accent gap-1">
                <Sparkles className="h-3 w-3" aria-hidden /> AI generated
              </span>
            </div>
            <p className="t-body prose-measure mt-3 text-pretty">{report.overallFeedback}</p>
          </section>
        )}

        {/* ── Scores + radar ───────────────────────────────────────── */}
        <div className="mb-5 grid gap-5 lg:grid-cols-12">
          <section aria-labelledby="breakdown-heading" className="card p-5 lg:col-span-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <SectionTitle id="breakdown-heading" icon={TrendingUp}>Score breakdown</SectionTitle>
              <span className="text-2xs text-subtle">out of 10</span>
            </div>
            <ul className="space-y-4">
              {scores.map((s) => {
                const tone = TONE_CLASS[scoreTone(s.value)]
                return (
                  <li key={s.label}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-xs font-medium text-muted">{s.label}</span>
                      <span className={`num text-xs font-semibold ${tone.text}`}>{s.value}<span className="text-faint">/10</span></span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-ink/[0.07]"
                      role="meter"
                      aria-valuenow={s.value}
                      aria-valuemin={0}
                      aria-valuemax={10}
                      aria-label={`${s.label}: ${s.value} out of 10`}
                    >
                      <div
                        className={`score-bar-fill h-full rounded-full ${tone.bar}`}
                        style={{ '--bar-width': `${(s.value / 10) * 100}%`, width: `${(s.value / 10) * 100}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {radarData.length > 2 && (
            <section aria-labelledby="radar-heading" className="card min-w-0 overflow-hidden p-5 lg:col-span-7">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SectionTitle id="radar-heading" icon={Gauge}>Skill radar</SectionTitle>
                  <p className="t-xs mt-1">The shape of this session across every scored dimension.</p>
                </div>
                <ul className="flex flex-wrap gap-1">
                  {radarData.map(d => (
                    <li key={d.subject} className="badge num text-2xs">
                      {d.subject} <span className="font-semibold text-ink">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <ResponsiveContainer width="100%" height={248}>
                  <RadarChart
                    data={radarData}
                    outerRadius="68%"
                    margin={{ top: 10, right: 16, bottom: 6, left: 16 }}
                  >
                    <PolarGrid stroke={colors.grid} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: colors.axis }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke={colors.accent}
                      fill={colors.accent}
                      fillOpacity={0.18}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>

        {/* ── Per-question scores ──────────────────────────────────── */}
        {barData.length > 0 && (
          <section ref={revealRef} data-reveal className="card mb-5 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <SectionTitle icon={BarChart3}>Per-question scores</SectionTitle>
                <p className="t-xs mt-1">Every reviewed question, in the order it was asked.</p>
              </div>
              {showExtremes && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge badge-success gap-1">
                    <Award className="h-3 w-3" aria-hidden />
                    Highest Q{topQuestion.index + 1} · <span className="num">{topQuestion.score}</span>
                  </span>
                  <span className="badge gap-1">
                    <Target className="h-3 w-3" aria-hidden />
                    Lowest Q{focusQuestion.index + 1} · <span className="num">{focusQuestion.score}</span>
                  </span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={barData} barSize={22} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.axis }} axisLine={false} tickLine={false} dy={8} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: colors.axis }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: colors.ink, opacity: 0.06 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const value = payload[0]?.value ?? 0
                    return (
                      <div className="card px-2.5 py-1.5 text-xs shadow-3">
                        <p className="num font-semibold" style={{ color: scoreColor(value) }}>{value}/10</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {barData.map((b, i) => <Cell key={i} fill={scoreColor(b.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* ── Strengths + areas to improve ─────────────────────────── */}
        <div className="mb-5 grid gap-5 sm:grid-cols-2">
          {report.strengths?.length > 0 && (
            <section aria-labelledby="strengths-heading" className="card p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success-500">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="strengths-heading" className="text-sm font-semibold text-ink">Top strengths</h2>
                  <p className="text-2xs text-subtle">What carried this session</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.weaknesses?.length > 0 && (
            <section aria-labelledby="improve-heading" className="card p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger-500">
                  <AudioLines className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="improve-heading" className="text-sm font-semibold text-ink">Areas to improve</h2>
                  <p className="text-2xs text-subtle">Where the next round can gain points</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {report.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-500" aria-hidden />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Action plan + topics ─────────────────────────────────── */}
        <div className="mb-8 grid gap-5 md:grid-cols-2">
          {report.improvementAreas?.length > 0 && (
            <section aria-labelledby="plan-heading" className="min-w-0 rounded-xl border border-warning-500/25 bg-warning-soft/40 p-5">
              <div className="mb-3.5 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-500">
                  <Target className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="plan-heading" className="text-sm font-semibold text-ink">Action plan</h2>
                  <p className="text-2xs text-subtle">Concrete next steps</p>
                </div>
              </div>
              <ol className="space-y-2.5">
                {report.improvementAreas.map((area, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                    <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-warning-500/30 bg-surface/60 text-2xs font-semibold text-warning-500">
                      {i + 1}
                    </span>
                    <span>{area}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {report.topicsToStudy?.length > 0 && (
            <section aria-labelledby="topics-heading" className="min-w-0 rounded-xl border border-accent/25 bg-accent-soft/35 p-5">
              <div className="mb-3.5 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <BookOpen className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="topics-heading" className="text-sm font-semibold text-ink">Topics to review</h2>
                  <p className="text-2xs text-subtle">Useful before the next attempt</p>
                </div>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {report.topicsToStudy.map((topic, i) => (
                  <li key={i} className="badge max-w-full whitespace-normal break-words border-accent/25 bg-surface/70 px-2.5 py-1.5 text-left text-2xs text-ink">
                    <Lightbulb className="h-3 w-3 shrink-0 text-accent" aria-hidden /> {topic}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Question breakdown ───────────────────────────────────── */}
        <section aria-labelledby="questions-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="questions-heading" className="t-h2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent-500" aria-hidden /> Question breakdown
              </h2>
              <p className="t-sm mt-1">
                {questionCount} {questionCount === 1 ? 'question' : 'questions'} reviewed — expand any row for the answer, feedback and score notes.
              </p>
            </div>
            <span className="num text-2xs text-subtle sm:hidden">Tap a row to open</span>
          </div>

          <div data-enter-group className="space-y-3">
            {report.questionBreakdown?.map((q, i) => {
              const key = q.questionId || i
              const isOpen = !!expanded[key]
              const score = q.score ?? 0
              const panelId = `question-panel-${key}`
              const tone = TONE_CLASS[scoreTone(score)]

              return (
                <article key={key} data-enter className="card group overflow-hidden text-left transition-colors duration-fast hover:border-hairline-strong">
                  <button
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full flex-col gap-3 p-4 text-left transition-colors duration-fast hover:bg-inset/60 focus-visible:bg-inset sm:flex-row sm:items-start sm:gap-4 sm:p-5"
                  >
                    <span className="flex w-full items-center justify-between gap-3 sm:contents">
                      <span
                        className={`num flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${tone.tile}`}
                        aria-label={`Score ${score} out of 10`}
                      >
                        <span className="text-base font-semibold leading-none">{score}</span>
                        <span className="mt-0.5 text-[9px] font-medium opacity-70" aria-hidden>/10</span>
                      </span>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-subtle transition-transform duration-fast sm:hidden ${isOpen ? 'rotate-180 border-accent/30 text-accent' : ''}`}>
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-ink">
                        <span className="num mr-2 text-xs text-faint">Q{i + 1}</span>
                        {q.question}
                        {q.status === 'skipped' && (
                          <StatusBadge tone="warn" className="ml-2 align-middle">Skipped</StatusBadge>
                        )}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5 text-2xs text-subtle">
                        <span className="inline-flex items-center gap-1 rounded-md border border-hairline bg-inset px-1.5 py-0.5 font-medium">
                          {typeIcon[q.questionType]} {typeLabel[q.questionType] || q.questionType?.replace('_', ' ')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-hairline bg-inset px-1.5 py-0.5 font-medium capitalize">
                          {q.difficulty}
                        </span>
                        <span className="num inline-flex items-center gap-1 rounded-md border border-hairline bg-inset px-1.5 py-0.5 font-medium">
                          <Clock className="h-3 w-3" aria-hidden /> {q.timeTaken || 0}s
                        </span>
                        {q.followupCount > 0 && (
                          <span className="num inline-flex items-center gap-1 rounded-md border border-hairline bg-inset px-1.5 py-0.5 font-medium">
                            {q.followupCount} follow-up{q.followupCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-subtle transition-transform duration-fast sm:grid ${isOpen ? 'rotate-180 border-accent/30 text-accent' : ''}`}>
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        initial={prefersReducedMotion() ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        className="hairline-t overflow-hidden"
                      >
                        <div className="space-y-4 bg-inset/60 p-4 sm:p-5">
                          {q.feedback && (
                            <div>
                              <p className="eyebrow mb-1.5">Interviewer feedback</p>
                              <p className="t-body">{q.feedback}</p>
                            </div>
                          )}

                          {q.userAnswer && (
                            <div className="relative overflow-hidden rounded-lg border border-hairline bg-surface p-3.5 pl-4">
                              <div aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-accent/60" />
                              <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                                <MessageSquare className="h-3 w-3" aria-hidden /> Your answer
                              </p>
                              <p className="t-body italic text-muted">“{q.userAnswer}”</p>
                            </div>
                          )}

                          {q.userCode && (
                            <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
                              <p className="hairline-b flex items-center gap-1.5 px-3 py-2 text-2xs uppercase tracking-wide text-faint">
                                <Code2 className="h-3 w-3" aria-hidden /> Your code
                              </p>
                              <pre className="num max-h-60 overflow-auto p-3 text-xs leading-relaxed text-muted">{q.userCode}</pre>
                            </div>
                          )}

                          {q.idealAnswer && (
                            <div className="rounded-lg border border-accent/20 bg-accent-soft/35 p-3.5">
                              <p className="eyebrow mb-1.5">Expected answer</p>
                              <p className="t-body">{q.idealAnswer}</p>
                            </div>
                          )}

                          {(q.strengths?.length > 0 || q.weaknesses?.length > 0) && (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {q.strengths?.length > 0 && (
                                <div>
                                  <p className="eyebrow mb-1.5 text-success-500">Strengths</p>
                                  <ul className="space-y-1">
                                    {q.strengths.map((s, j) => (
                                      <li key={j} className="flex items-start gap-2 text-sm text-muted">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" aria-hidden />{s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {q.weaknesses?.length > 0 && (
                                <div>
                                  <p className="eyebrow mb-1.5 text-danger-500">Improvements</p>
                                  <ul className="space-y-1">
                                    {q.weaknesses.map((w, j) => (
                                      <li key={j} className="flex items-start gap-2 text-sm text-muted">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-500" aria-hidden />{w}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              )
            })}
          </div>
        </section>

        {/* ── Next round ───────────────────────────────────────────── */}
        <section className="card relative mt-10 overflow-hidden p-6 text-center sm:p-8">
          <div aria-hidden className="line-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_80%_at_50%_0%,black,transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-accent/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-ai/10 blur-3xl" />
          <div className="relative mx-auto max-w-lg">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <Target className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="t-h2 mt-3">Ready for the next round?</h2>
            <p className="t-sm mx-auto mt-1.5 max-w-md">
              Re-run this role with a fresh question set, or apply the action plan in a focused practice round.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button size="lg" onClick={() => navigate('/interview/create')} icon={<Plus className="h-4 w-4" aria-hidden />}>
                Start another interview
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate('/dashboard')} icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                Back to dashboard
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
