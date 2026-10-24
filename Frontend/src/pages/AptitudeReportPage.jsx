import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Card, ScoreRing, Badge, Spinner, EmptyState, SectionHeading } from '../components/ui/index'
import { getAptitudeReport, downloadAptitudePDF } from '../api/aptitudeAPI'
import { usePageEnter, useScrollReveal, prefersReducedMotion } from '../motion/index'
import toast from 'react-hot-toast'
import {
  Award, Target, Clock, AlertTriangle, LayoutDashboard, Code2, PieChart,
  Printer, CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react'

const cx = (...p) => p.filter(Boolean).join(' ')

/* Static class maps — no interpolated Tailwind names. */
const CAT_BAR = { success: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500' }
const catTone = (pct) => (pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger')
const OPT_STYLE = {
  correct: 'border-success-500 bg-success-bg text-success-500',
  wrong:   'border-danger-500 bg-danger-bg text-danger-500',
  neutral: 'border-hairline bg-inset text-muted',
}

export default function AptitudeReportPage() {
  const { attemptId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [expandedSolutions, setExpandedSolutions] = useState({})

  const toggleSolution = (idx) => {
    setExpandedSolutions(prev => ({...prev, [idx]: !prev[idx]}))
  }

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await getAptitudeReport(attemptId)
        setReport(res.data.data)
      } catch (err) {
        toast.error('Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [attemptId])

  const enterRef = usePageEnter([loading])
  const revealRef = useScrollReveal([loading, report])

  if (loading) {
    return (
      <div className="page-shell grid min-h-dvh place-items-center text-ink">
        <Spinner size="lg" />
        <span className="sr-only" role="status">Loading report…</span>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="page-shell text-ink">
        <Navbar />
        <div className="grid min-h-dvh place-items-center px-4">
          <EmptyState
            icon={<XCircle className="h-5 w-5" aria-hidden />}
            title="Report not available"
            description="We couldn't load this aptitude report."
            action={<Link to="/aptitude"><Button variant="secondary">Back to dashboard</Button></Link>}
          />
        </div>
      </div>
    )
  }

  const { totalScore, accuracy, categoryScores, answers, violations } = report
  const totalQuestions = answers.length

  const categories = Object.keys(categoryScores || {}).filter(k => categoryScores[k].total > 0)

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      await downloadAptitudePDF(attemptId, `Aptitude_Report_${Date.now()}.pdf`)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="page-shell text-ink">
      <Navbar />

      <main className="container-page max-w-4xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header ref={enterRef} className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div data-enter>
            <p className="eyebrow mb-1">Aptitude</p>
            <h1 className="t-h1">Score report</h1>
            <p className="t-sm mt-1">Detailed breakdown of your performance</p>
          </div>
          <div data-enter className="flex gap-2">
            <Button variant="secondary" onClick={handleDownloadPDF} loading={downloading} icon={!downloading && <Printer className="h-4 w-4" aria-hidden />}>
              {downloading ? 'Downloading…' : 'Download PDF'}
            </Button>
            <Link to="/aptitude">
              <Button variant="ghost" icon={<LayoutDashboard className="h-4 w-4" aria-hidden />}>Dashboard</Button>
            </Link>
          </div>
        </header>

        <div ref={revealRef} className="space-y-8">
          {/* ── Summary cards ─────────────────────────────────────────── */}
          <section data-reveal aria-label="Summary" className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              <p className="eyebrow mb-4">Total score</p>
              <ScoreRing score={totalScore} size={100} strokeWidth={8} label="score" />
              <p className="t-sm mt-4">Out of <span className="num">{totalQuestions}</span> questions</p>
            </Card>

            <Card className="flex flex-col justify-center gap-5 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Target className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="eyebrow">Accuracy</p>
                  <p className="num text-2xl font-semibold text-ink">{Math.round(accuracy)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-bg text-warning-500">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="eyebrow">Violations</p>
                  <p className="num text-2xl font-semibold text-ink">{violations?.length || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col justify-center p-6">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Award className="h-5 w-5" aria-hidden />
              </span>
              <p className="eyebrow mb-1.5">Verdict</p>
              <p className="t-body">
                {accuracy >= 80 ? 'Excellent performance — a strong grasp of the reasoning concepts.'
                  : accuracy >= 50 ? 'Good effort — focus on your weak areas to improve.'
                  : 'Needs improvement — more aptitude practice is recommended.'}
              </p>
            </Card>
          </section>

          {/* ── Category breakdown ────────────────────────────────────── */}
          <section data-reveal aria-labelledby="cat-heading">
            <SectionHeading eyebrow="Coverage" title="Category breakdown" />
            {categories.length === 0 ? (
              <p className="t-sm mt-3">No category data returned for this attempt.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {categories.map(c => {
                  const stat = categoryScores[c]
                  const pct = stat.total > 0 ? (stat.score / stat.total) * 100 : 0
                  return (
                    <Card key={c} className="p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold capitalize text-ink">{c} reasoning</h3>
                        <span className="num text-xs text-subtle">{stat.score} / {stat.total}</span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-inset"
                        role="meter"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${c}: ${Math.round(pct)} percent`}
                      >
                        <div className={`h-full rounded-full ${CAT_BAR[catTone(pct)]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Answer analysis ───────────────────────────────────────── */}
          <section data-reveal aria-labelledby="answers-heading">
            <SectionHeading eyebrow="Review" title="Answer analysis" />

            <div className="mt-4 space-y-4">
              {answers.map((ans, idx) => {
                const q = ans.questionId
                if (!q) return null // safety check
                const isOpen = !!expandedSolutions[idx]
                const panelId = `solution-panel-${idx}`

                return (
                  <Card key={idx} className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="num rounded-md bg-inset px-2 py-1 text-xs font-semibold uppercase tracking-wide text-subtle">
                        Q{idx + 1} • <span className="capitalize">{q.category}</span>
                      </span>
                      <Badge color={ans.isCorrect ? 'success' : 'danger'}>
                        {ans.isCorrect
                          ? <><CheckCircle2 className="h-3 w-3" aria-hidden /> Correct</>
                          : <><XCircle className="h-3 w-3" aria-hidden /> Incorrect</>}
                      </Badge>
                    </div>

                    <p className="mb-3 text-base font-medium whitespace-pre-wrap text-ink">{q.question}</p>

                    <div className="num mb-4 inline-flex items-center gap-1.5 rounded-md bg-inset px-3 py-1.5 text-xs text-subtle">
                      <Clock className="h-3 w-3" aria-hidden /> Time spent: {ans.timeTaken || 0}s
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const isSelected = ans.selectedOptionId === opt._id
                        const isOptionCorrect = opt.isCorrect
                        const variant = isOptionCorrect ? 'correct' : isSelected ? 'wrong' : 'neutral'
                        const letter = String.fromCharCode(65 + oi)
                        return (
                          <div key={opt._id} className={`flex items-start gap-3 rounded-lg border p-3 ${OPT_STYLE[variant]}`}>
                            <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-2xs font-semibold" aria-hidden>
                              {letter}
                            </span>
                            <span className="flex-1 text-sm">{opt.text}</span>
                            {isOptionCorrect && <span className="flex shrink-0 items-center gap-1 text-2xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Correct</span>}
                            {isSelected && !isOptionCorrect && <span className="shrink-0 text-2xs font-semibold">Your answer</span>}
                          </div>
                        )
                      })}
                    </div>

                    {q.detailedSolution && (
                      <div className="mt-4 border-t border-hairline pt-4">
                        <button
                          type="button"
                          onClick={() => toggleSolution(idx)}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          className="flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
                        >
                          <Code2 className="h-4 w-4" aria-hidden />
                          {isOpen ? 'Hide detailed solution' : 'View detailed solution'}
                          {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              id={panelId}
                              initial={prefersReducedMotion() ? false : { height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className="card-inset mt-3 p-5 text-sm leading-relaxed whitespace-pre-wrap text-muted">
                                {q.detailedSolution}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
