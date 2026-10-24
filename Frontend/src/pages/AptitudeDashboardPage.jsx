import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { Button, Card, Spinner, EmptyState, SectionHeading } from '../components/ui/index'
import { getAptitudeHistory } from '../api/aptitudeAPI'
import { usePageEnter, useScrollReveal } from '../motion/index'
import {
  Brain, ArrowUpRight, Plus, Calendar, Target, TrendingUp, Award,
  ListChecks, ArrowRight, Timer, ShieldCheck,
} from 'lucide-react'

/* Static tone lookups — never interpolate Tailwind class names. */
const ACC_TONE = {
  high: 'badge badge-success',
  mid:  'badge badge-warning',
  low:  'badge badge-danger',
}
const ACC_BAR = {
  high: 'bg-success-500',
  mid:  'bg-warning-500',
  low:  'bg-danger-500',
}
const accuracyTone = (a) => (a >= 70 ? 'high' : a >= 40 ? 'mid' : 'low')

const formatDate = (d) => new Date(d).toLocaleDateString(undefined, {
  month: 'short', day: 'numeric', year: 'numeric',
})

const SECTIONS = ['Numerical', 'Verbal', 'Logical', 'Situational']

export default function AptitudeDashboardPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getAptitudeHistory()
        setHistory(res.data.data)
      } catch (err) {
        console.error('Failed to load history', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const enterRef = usePageEnter([loading])
  const revealRef = useScrollReveal([loading, history])

  const scored = history.filter((a) => Number.isFinite(a.accuracy))
  const bestAccuracy = scored.length ? Math.max(...scored.map((a) => a.accuracy)) : null
  const avgAccuracy = scored.length
    ? scored.reduce((sum, a) => sum + a.accuracy, 0) / scored.length
    : null
  const totalQuestions = history.reduce((sum, a) => sum + (a.answers?.length || 0), 0)
  const totalCorrect = history.reduce((sum, a) => sum + (a.totalScore || 0), 0)

  const stats = history.length > 0 ? [
    {
      label: 'Tests completed',
      value: history.length,
      sub: 'All attempts on this account',
      Icon: ListChecks,
      tone: 'bg-accent-soft text-accent',
    },
    {
      label: 'Average accuracy',
      value: avgAccuracy != null ? `${Math.round(avgAccuracy)}%` : '—',
      sub: `${totalCorrect} of ${totalQuestions} answers correct`,
      Icon: Target,
      tone: 'bg-success-bg text-success-500',
    },
    {
      label: 'Best accuracy',
      value: bestAccuracy != null ? `${Math.round(bestAccuracy)}%` : '—',
      sub: 'Your strongest attempt so far',
      Icon: Award,
      tone: 'bg-warning-bg text-warning-500',
    },
    {
      label: 'Answer trend',
      value: avgAccuracy != null ? (avgAccuracy >= 70 ? 'Strong' : avgAccuracy >= 40 ? 'Building' : 'Needs work') : '—',
      sub: 'Based on your recorded accuracy',
      Icon: TrendingUp,
      tone: 'bg-ai-soft text-ai',
    },
  ] : []

  return (
    <div className="page-shell text-ink">
      <Navbar />

      <main className="container-page max-w-5xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <header
          ref={enterRef}
          className="ambient relative mb-8 overflow-hidden rounded-3xl border border-hairline bg-surface p-6 shadow-2 sm:p-8"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 line-grid opacity-40" style={{ maskImage: 'radial-gradient(ellipse 70% 80% at 80% 0%, black, transparent 72%)' }} />
          </div>

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div data-enter className="min-w-0">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-2xs font-semibold uppercase tracking-[0.12em] text-accent">
                <Brain className="h-3.5 w-3.5" aria-hidden />
                Aptitude lab
              </span>
              <h1 className="t-h1">Aptitude dashboard</h1>
              <p className="t-body mt-2 max-w-xl">
                Review every attempt, see where accuracy is trending, and start a fresh placement simulation.
              </p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {SECTIONS.map((section) => (
                  <li key={section} className="badge">{section}</li>
                ))}
                <li className="badge badge-warning"><Timer className="h-3 w-3" aria-hidden /> Timed</li>
                <li className="badge badge-danger"><ShieldCheck className="h-3 w-3" aria-hidden /> Proctored</li>
              </ul>
            </div>

            <div data-enter className="flex shrink-0 flex-wrap gap-2">
              <Link to="/aptitude/setup">
                <Button size="lg" icon={<Plus className="h-4 w-4" aria-hidden />}>Start new test</Button>
              </Link>
            </div>
          </div>
        </header>

        <div ref={revealRef} className="space-y-8">
          {/* ── Real, derived summary ────────────────────────────────── */}
          {!loading && history.length > 0 && (
            <section data-reveal aria-label="Performance summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map(({ label, value, sub, Icon, tone }) => (
                <Card key={label} className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="eyebrow">{label}</p>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                  <p className="num-lg text-ink">{value}</p>
                  <p className="t-xs mt-1 text-subtle">{sub}</p>
                </Card>
              ))}
            </section>
          )}

          {/* ── History ──────────────────────────────────────────────── */}
          <section aria-labelledby="apt-recent-heading" className="space-y-4">
            <div data-reveal>
              <SectionHeading
                eyebrow="History"
                title="Recent tests"
                description={loading ? undefined : history.length > 0
                  ? `${history.length} attempt${history.length === 1 ? '' : 's'} recorded · open any card for the full report`
                  : undefined}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : history.length === 0 ? (
              <div data-reveal className="space-y-4">
                <Card>
                  <EmptyState
                    icon={<Brain className="h-5 w-5" aria-hidden />}
                    title="No aptitude tests yet"
                    description="Your first attempt sets a baseline. Choose a mode, answer timed sections, and get a question-by-question report."
                    action={
                      <Link to="/aptitude/setup">
                        <Button variant="outline" icon={<Plus className="h-4 w-4" aria-hidden />}>Take your first test</Button>
                      </Link>
                    }
                  />
                </Card>

                <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { step: '01', title: 'Pick a mode', copy: 'Beginner, standard, advanced, or a custom question count.' },
                    { step: '02', title: 'Answer under a timer', copy: 'Numerical, verbal, logical and situational sections.' },
                    { step: '03', title: 'Review every answer', copy: 'See the correct option, your choice, and the full solution.' },
                  ].map((item) => (
                    <li key={item.step} className="card-inset p-4">
                      <p className="num text-2xs font-semibold text-accent">{item.step}</p>
                      <p className="mt-1.5 text-sm font-semibold text-ink">{item.title}</p>
                      <p className="t-xs mt-1">{item.copy}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {history.map((attempt) => {
                  const tone = accuracyTone(attempt.accuracy)
                  const total = attempt.answers?.length || 0
                  const pct = Math.max(0, Math.min(100, Math.round(attempt.accuracy)))
                  return (
                    <Card
                      key={attempt._id}
                      data-reveal
                      interactive
                      className="flex flex-col p-5"
                      onClick={() => navigate(`/aptitude/${attempt._id}/report`)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/aptitude/${attempt._id}/report`)
                        }
                      }}
                      aria-label={`View aptitude report from ${formatDate(attempt.completedAt)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                            <Brain className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">Aptitude test</p>
                            <p className="num mt-0.5 flex items-center gap-1.5 text-2xs text-subtle">
                              <Calendar className="h-3 w-3" aria-hidden />
                              {formatDate(attempt.completedAt)}
                            </p>
                          </div>
                        </div>
                        <span className={`${ACC_TONE[tone]} num shrink-0`}>{pct}%</span>
                      </div>

                      <div className="mt-5">
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-2xs">
                          <span className="text-subtle">Correct answers</span>
                          <span className="num font-semibold text-ink">
                            {attempt.totalScore}<span className="text-subtle"> / {total}</span>
                          </span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-inset"
                          role="meter"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${pct} percent accuracy`}
                        >
                          <div className={`h-full rounded-full ${ACC_BAR[tone]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-4">
                        <span className="text-xs font-medium text-muted">View full report</span>
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-inset text-accent" aria-hidden>
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          {!loading && history.length > 0 && (
            <div data-reveal className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-hairline bg-inset p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-ink">Ready for another round?</p>
                <p className="t-xs mt-0.5">Pick the same mode to compare, or change the filters for a new challenge.</p>
              </div>
              <Link to="/aptitude/setup" className="shrink-0">
                <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" aria-hidden />}>New test</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
