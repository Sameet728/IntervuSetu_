import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { createOrgAptitudeTest } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  ArrowLeft, Brain, Clock, Hash, Shield, Calendar,
  Copy, CheckCircle2, Sigma, BookOpen, Puzzle, Target,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Textarea, Button, IconButton, StatusBadge } from '../../components/ui/index'
import { usePageEnter, useScrollReveal } from '../../motion/index'

const cx = (...parts) => parts.filter(Boolean).join(' ')

const CATS = ['numerical', 'verbal', 'logical', 'situational']

const CAT_META = {
  numerical:   { Icon: Sigma,     blurb: 'Quantitative reasoning' },
  verbal:      { Icon: BookOpen,  blurb: 'Language reasoning' },
  logical:     { Icon: Puzzle,    blurb: 'Analytical reasoning' },
  situational: { Icon: Target,    blurb: 'Judgement & situational' },
}

const STEP_BADGE = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-2xs font-semibold'

const MIX_ROWS = [
  { key: 'easy', label: 'Easy', tone: 'text-success-500', bar: 'bg-success-500' },
  { key: 'medium', label: 'Medium', tone: 'text-warning-500', bar: 'bg-warning-500' },
  { key: 'hard', label: 'Hard', tone: 'text-danger-500', bar: 'bg-danger-500' },
]

export default function OrgAptitudeCreatePage() {
  const navigate = useNavigate()
  const { org } = useOrgAuth()
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    questionCount: 20,
    categories: ['numerical', 'verbal', 'logical', 'situational'],
    difficultyMix: { easy: 30, medium: 50, hard: 20 },
    deadline: '',
    maxAttempts: 1,
    proctoringEnabled: true,
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleCat = (cat) => {
    if (form.categories.includes(cat)) {
      if (form.categories.length === 1) return toast.error('At least one category required')
      set('categories', form.categories.filter(c => c !== cat))
    } else {
      set('categories', [...form.categories, cat])
    }
  }

  const duration = Math.ceil(form.questionCount * 1.3)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title) return toast.error('Title is required')
    setLoading(true)
    try {
      const res = await createOrgAptitudeTest({
        ...form,
        duration,
        deadline: form.deadline || null,
      })
      setCreated({ ...res.data.data, joinUrl: `${window.location.origin}/aptitude/join/${res.data.data.shareCode}` })
      toast.success('Aptitude test created!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create test')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(created.joinUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const enterRef = usePageEnter([])
  const revealRef = useScrollReveal([])

  if (created) {
    return (
      <div ref={enterRef} className="page-shell flex min-h-dvh flex-col items-center justify-center p-4 text-ink">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          data-enter className="card w-full max-w-lg p-6 text-center shadow-3 sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-success/30 bg-success-bg">
            <CheckCircle2 className="h-7 w-7 text-success-500" aria-hidden />
          </div>
          <h1 className="t-h2 mb-2 text-ink">Test created</h1>
          <p className="t-sm mb-6">
            Share the link with students. They&apos;ll need an account to take the test.
          </p>

          <div className="card-inset mb-4 p-4 text-left">
            <p className="eyebrow mb-2">Join link</p>
            <div className="flex items-center gap-2">
              <code className="num flex-1 break-all rounded bg-accent-soft px-2 py-1.5 text-xs text-accent">{created.joinUrl}</code>
              <IconButton label={copied ? 'Join link copied' : 'Copy join link'} onClick={copyLink}
                className={cx('shrink-0', copied && 'text-success-500')}>
                {copied ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              </IconButton>
            </div>
          </div>

          <div className="card-inset mb-6 p-4 text-left">
            <p className="eyebrow mb-3">Test config</p>
            <dl className="grid grid-cols-1 gap-2 text-xs font-medium text-muted sm:grid-cols-2">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Questions</dt>
                <dd className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-subtle" aria-hidden /><span className="num">{created.questionCount}</span> questions</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Duration</dt>
                <dd className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-subtle" aria-hidden /><span className="num">{created.duration}</span> minutes</dd>
              </div>
              {created.deadline && (
                <div className="flex items-center gap-1.5 sm:col-span-2">
                  <dt className="sr-only">Deadline</dt>
                  <dd className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-subtle" aria-hidden />Deadline: <span className="num">{new Date(created.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {created.categories?.map(c => (
                <span key={c} className="badge badge-accent capitalize">{c}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/org/dashboard')}>
              Dashboard
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => navigate(`/org/aptitude/${created._id}/results`)}>
              View results
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="page-shell text-ink">
      <OrgNavbar />

      <main className="container-page max-w-6xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <header ref={enterRef} className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div data-enter className="flex min-w-0 items-center gap-3">
              <IconButton label="Back to dashboard" onClick={() => navigate('/org/dashboard')} className="-ml-1.5 shrink-0">
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </IconButton>
              <div className="min-w-0">
                <h1 className="t-h1 flex items-center gap-2 text-ink">
                  <Brain className="h-5 w-5 shrink-0 text-ai" aria-hidden /> Create aptitude test
                </h1>
                <p className="t-sm">Assess cognitive skills and reasoning.</p>
              </div>
            </div>
            <span data-enter className="badge badge-ai">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Auto-duration: ~<span className="num">{duration}</span> min
            </span>
          </header>

          <form onSubmit={handleSubmit}>
            <div ref={revealRef} className="grid gap-5 lg:grid-cols-3">

              {/* Left — main fields */}
              <div className="space-y-5 lg:col-span-2">
                {/* Basic info */}
                <section data-reveal aria-labelledby="apt-basic-heading" className="card p-5 sm:p-6">
                  <h2 id="apt-basic-heading" className="t-h3 mb-5 flex items-center gap-2 text-ink">
                    <span className={cx(STEP_BADGE, 'bg-accent-soft text-accent')}>1</span>
                    Basic info
                  </h2>
                  <div className="space-y-4">
                    <Input label="Test title" required value={form.title}
                      onChange={e => set('title', e.target.value)}
                      placeholder="e.g., Campus Recruitment — Aptitude Round 2025" />
                    <Input label="Description" value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Brief description shown to students on the join page" />
                    <Textarea label="Instructions for students" rows={3} value={form.instructions}
                      onChange={e => set('instructions', e.target.value)}
                      placeholder="e.g., Read each question carefully. Do not use a calculator. Switching tabs will be recorded..."
                      hint="Shown to the student before they start the test." />
                  </div>
                </section>

                {/* Categories */}
                <section data-reveal aria-labelledby="apt-categories-heading" className="card p-5 sm:p-6">
                  <h2 id="apt-categories-heading" className="t-h3 mb-5 flex items-center gap-2 text-ink">
                    <span className={cx(STEP_BADGE, 'bg-accent-soft text-accent')}>2</span>
                    Categories
                  </h2>
                  <div role="group" aria-label="Test categories" className="grid gap-3 sm:grid-cols-2">
                    {CATS.map(cat => {
                      const active = form.categories.includes(cat)
                      const Icon = CAT_META[cat].Icon
                      return (
                        <button key={cat} type="button" onClick={() => toggleCat(cat)}
                          aria-pressed={active}
                          className={cx(
                            'card-inset flex items-center gap-3 p-4 text-left transition-all duration-fast',
                            active ? 'border-accent/60 bg-accent-soft ring-1 ring-accent/25' : 'hover:border-hairline-strong'
                          )}>
                          <Icon className={cx('h-5 w-5 shrink-0', active ? 'text-accent' : 'text-subtle')} aria-hidden />
                          <span className="min-w-0">
                            <span className={cx('block text-sm font-semibold capitalize', active ? 'text-accent' : 'text-ink')}>{cat}</span>
                            <span className="block t-xs">{CAT_META[cat].blurb}</span>
                          </span>
                          {active && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-accent" aria-hidden />}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Difficulty mix */}
                <section data-reveal aria-labelledby="apt-mix-heading" className="card p-5 sm:p-6">
                  <h2 id="apt-mix-heading" className="t-h3 mb-5 flex items-center gap-2 text-ink">
                    <span className={cx(STEP_BADGE, 'bg-accent-soft text-accent')}>3</span>
                    Difficulty mix
                  </h2>
                  <div className="space-y-4">
                    {MIX_ROWS.map(({ key, label, tone, bar }) => (
                      <div key={key}>
                        <div className="mb-1.5 flex justify-between">
                          <label htmlFor={`org-mix-${key}`} className={`text-xs font-medium ${tone}`}>{label}</label>
                          <span className="num text-xs text-subtle">{form.difficultyMix[key]}%</span>
                        </div>
                        <input id={`org-mix-${key}`} type="range" min={0} max={100} value={form.difficultyMix[key]}
                          aria-label={`${label} share of questions`}
                          onChange={e => {
                            const val = parseInt(e.target.value)
                            const others = { easy: form.difficultyMix.easy, medium: form.difficultyMix.medium, hard: form.difficultyMix.hard }
                            others[key] = val
                            const total = others.easy + others.medium + others.hard
                            if (total !== 100) {
                              // Auto-balance remaining
                              const otherKeys = Object.keys(others).filter(k => k !== key)
                              const rem = 100 - val
                              const half = Math.floor(rem / 2)
                              others[otherKeys[0]] = half
                              others[otherKeys[1]] = 100 - val - half
                              Object.keys(others).forEach(k => { if (others[k] < 0) others[k] = 0 })
                            }
                            set('difficultyMix', others)
                          }}
                          className="w-full accent-accent" />
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hairline">
                          <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${form.difficultyMix[key]}%` }} />
                        </div>
                      </div>
                    ))}
                    <p className="t-xs mt-2 flex items-center gap-2">
                      <StatusBadge tone={form.difficultyMix.easy + form.difficultyMix.medium + form.difficultyMix.hard === 100 ? 'live' : 'warn'}>
                        <span className="num">
                          {form.difficultyMix.easy + form.difficultyMix.medium + form.difficultyMix.hard}%
                        </span>
                        allocated
                      </StatusBadge>
                      <span>Total must be <span className="num">100%</span></span>
                    </p>
                  </div>
                </section>
              </div>

              {/* Right — config */}
              <div className="space-y-4">
                <section data-reveal aria-labelledby="apt-config-heading" className="card space-y-4 p-5 sm:p-6 lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
                  <h2 id="apt-config-heading" className="t-h3 flex items-center gap-2 text-ink">
                    <span className={cx(STEP_BADGE, 'bg-ai-soft text-ai')}>4</span>
                    Configuration
                  </h2>

                  <Input id="org-question-count" label="Number of questions" type="number"
                    icon={<Hash className="h-4 w-4" aria-hidden />}
                    value={form.questionCount} onChange={e => set('questionCount', parseInt(e.target.value))}
                    min={5} max={60} className="num"
                    hint={`Between 5 and 60 · auto duration ~${duration} min`} />

                  <Input id="org-max-attempts" label="Max attempts per student" type="number"
                    icon={<Users className="h-4 w-4" aria-hidden />}
                    value={form.maxAttempts} onChange={e => set('maxAttempts', parseInt(e.target.value))}
                    min={1} max={5} className="num" hint="Between 1 and 5" />

                  <Input id="org-deadline" label="Deadline (optional)" type="datetime-local"
                    icon={<Calendar className="h-4 w-4" aria-hidden />}
                    value={form.deadline} onChange={e => set('deadline', e.target.value)} className="num" />

                  <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Shield className="h-4 w-4 text-subtle" aria-hidden />
                      Proctoring
                    </span>
                    <button type="button" role="switch" aria-checked={form.proctoringEnabled}
                      aria-label="Enable proctoring"
                      onClick={() => set('proctoringEnabled', !form.proctoringEnabled)}
                      className={cx(
                        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-fast',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2',
                        form.proctoringEnabled ? 'bg-accent' : 'bg-hairline-strong'
                      )}>
                      <span className={cx(
                        'absolute top-1 h-4 w-4 rounded-full bg-surface shadow-1 ring-1 ring-hairline transition-transform duration-fast',
                        form.proctoringEnabled ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  </div>

                  <Button type="submit" loading={loading} variant="primary" block
                    icon={<Brain className="h-4 w-4" aria-hidden />}>
                    {loading ? 'Creating test...' : 'Create aptitude test'}
                  </Button>
                </section>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
