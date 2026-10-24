import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getOrgAptitudeTestInfo } from '../api/orgAPI'
import { startAptitudeTest } from '../api/aptitudeAPI'
import Navbar from '../components/layout/Navbar'
import BrandLogo from '../components/brand/BrandLogo'
import { Button, Spinner, EmptyState } from '../components/ui/index'
import { usePageEnter } from '../motion/index'
import {
  Brain, Clock, Hash, Shield, AlertTriangle, LogIn, ChevronRight,
  Calendar, Calculator, BookOpen, Puzzle, Target,
} from 'lucide-react'
import toast from 'react-hot-toast'

const cx = (...p) => p.filter(Boolean).join(' ')

/* Static icon + tone map (no emoji, no interpolated class names). */
const CAT_META = {
  numerical:   { Icon: Calculator, badge: 'badge badge-accent' },
  verbal:      { Icon: BookOpen,   badge: 'badge badge-success' },
  logical:     { Icon: Puzzle,     badge: 'badge badge-ai' },
  situational: { Icon: Target,     badge: 'badge badge-warning' },
}

export default function AptitudeJoinPage() {
  const { shareCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [testInfo, setTestInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  const enterRef = usePageEnter([loading, error, testInfo])

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getOrgAptitudeTestInfo(shareCode)
        setTestInfo(res.data.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Test not found or has been closed')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [shareCode])

  const handleStart = async () => {
    if (!user) {
      // Save intended destination and redirect to login
      sessionStorage.setItem('aptitude_join_after_login', `/aptitude/join/${shareCode}`)
      navigate('/login')
      return
    }
    setStarting(true)
    try {
      const res = await startAptitudeTest({ shareCode })
      const { attemptId, sections, duration } = res.data.data
      navigate(`/aptitude/${attemptId}/test`, {
        state: { sections, duration, attemptId }
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start test')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-shell grid min-h-dvh place-items-center text-ink">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo to="/" size="sm" />
          <Spinner size="lg" />
          <span className="sr-only" role="status">Loading test details…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-shell text-ink">
        <Navbar />
        <div className="grid min-h-dvh place-items-center px-4">
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            title="Test unavailable"
            description={error}
            action={<Button onClick={() => navigate('/')}>Go home</Button>}
          />
        </div>
      </div>
    )
  }

  const cats = testInfo?.categories || []

  const meta = [
    { Icon: Hash,   label: 'Questions', val: <span className="num">{testInfo?.questionCount}</span> },
    { Icon: Clock,  label: 'Duration',  val: <span className="num">{testInfo?.duration}<span className="text-subtle"> min</span></span> },
    { Icon: Shield, label: 'Proctored', val: testInfo?.proctoringEnabled ? 'Yes' : 'No' },
  ]

  return (
    <div className="page-shell text-ink">
      <Navbar />

      <main className="container-page max-w-2xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">
        <div ref={enterRef} className="card overflow-hidden">
          {/* ── Header banner ─────────────────────────────────────────── */}
          <header data-enter className="panel-navy p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              {testInfo?.organization?.logo
                ? <img src={testInfo.organization.logo} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15" />
                : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(244_246_251/0.10)]"><Brain className="h-5 w-5" aria-hidden /></div>}
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                {testInfo?.organization?.name || 'Aptitude Assessment'}
              </p>
            </div>
            <h1 className="t-h1 text-white">{testInfo?.title}</h1>
            {testInfo?.description && <p className="t-sm mt-2 text-white/70">{testInfo.description}</p>}
          </header>

          <div className="space-y-6 p-6">
            {/* ── Meta ────────────────────────────────────────────────── */}
            <div data-reveal className="grid grid-cols-3 gap-3">
              {meta.map((m, i) => (
                <div key={i} className="rounded-xl border border-hairline bg-inset p-3 text-center">
                  <div className="mb-1 flex justify-center text-accent"><m.Icon className="h-4 w-4" aria-hidden /></div>
                  <p className="text-sm font-semibold text-ink">{m.val}</p>
                  <p className="text-2xs text-subtle">{m.label}</p>
                </div>
              ))}
            </div>

            {/* ── Sections covered ────────────────────────────────────── */}
            {cats.length > 0 && (
              <section aria-label="Sections covered">
                <p className="eyebrow mb-2">Sections covered</p>
                <div className="flex flex-wrap gap-2">
                  {cats.map(cat => {
                    const meta = CAT_META[cat]
                    const Icon = meta?.Icon || Brain
                    return (
                      <span key={cat} className={cx(meta?.badge || 'badge', 'gap-1.5 capitalize')}>
                        <Icon className="h-3.5 w-3.5" aria-hidden /> {cat}
                      </span>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Deadline ────────────────────────────────────────────── */}
            {testInfo?.deadline && (
              <div className="flex items-center gap-2 rounded-xl border border-warning-500/25 bg-warning-bg p-3 text-sm text-warning-500">
                <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                <span>Deadline: <strong className="num">{new Date(testInfo.deadline).toLocaleString()}</strong></span>
              </div>
            )}

            {/* ── Instructions ────────────────────────────────────────── */}
            {testInfo?.instructions && (
              <section aria-label="Instructions" className="card-inset p-4">
                <p className="eyebrow mb-2">Instructions</p>
                <p className="t-body whitespace-pre-wrap">{testInfo.instructions}</p>
              </section>
            )}

            {/* ── Proctoring notice ───────────────────────────────────── */}
            {testInfo?.proctoringEnabled && (
              <div className="flex items-start gap-3 rounded-xl border border-danger-500/25 bg-danger-bg p-4 text-sm">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" aria-hidden />
                <div>
                  <p className="font-semibold text-danger-500">Proctoring is active</p>
                  <p className="t-xs mt-0.5">Tab switching, fullscreen exits and other suspicious actions are recorded and sent to the organizer.</p>
                </div>
              </div>
            )}

            {/* ── CTA ─────────────────────────────────────────────────── */}
            {!user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent-soft/50 p-3 text-sm text-accent">
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                  You must be logged in to take this test.
                </div>
                <Button block size="lg" onClick={handleStart} icon={<LogIn className="h-4 w-4" aria-hidden />}>
                  Log in to start test
                </Button>
              </div>
            ) : (
              <Button
                block
                size="lg"
                loading={starting}
                onClick={handleStart}
                icon={!starting && <Brain className="h-4 w-4" aria-hidden />}
              >
                {starting ? 'Starting test…' : <>Start test <ChevronRight className="h-4 w-4" aria-hidden /></>}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
