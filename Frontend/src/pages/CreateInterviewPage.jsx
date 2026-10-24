import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { Badge, Button, Card, Input, Tabs } from '../components/ui/index'
import { createInterview, getPrebuiltInterviews, startPrebuiltInterview } from '../api/interviewAPI'
import toast from 'react-hot-toast'
import {
  Plus, X, Sparkles, Code2, Brain, Users, Layers, Zap, Clock,
  CheckCircle2, ArrowRight, Cpu, Check, ListChecks, SlidersHorizontal, Play,
  Server, Binary, Gauge, Lock, Timer, Terminal, Wand2, Circle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/ui/UpgradeModal'
import { usePageEnter } from '../motion/hooks'

const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher', desc: '0 yrs' },
  { value: 'junior',  label: 'Junior',  desc: '1–2 yrs' },
  { value: 'mid',     label: 'Mid',     desc: '3–5 yrs' },
  { value: 'senior',  label: 'Senior',  desc: '5–8 yrs' },
  { value: 'lead',    label: 'Lead',    desc: '8+ yrs' },
]

const INTERVIEW_TYPES = [
  { value: 'technical',     label: 'Technical',     desc: 'Coding + concepts',   icon: Code2 },
  { value: 'hr',            label: 'HR Round',      desc: 'Culture + values',    icon: Users },
  { value: 'behavioral',    label: 'Behavioral',    desc: 'STAR method stories', icon: Brain },
  { value: 'system_design', label: 'System Design', desc: 'Architecture scale',  icon: Layers },
  { value: 'mixed',         label: 'Mixed',         desc: 'All of the above',    icon: Sparkles },
]

const DIFFICULTIES = [
  { value: 'easy',     label: 'Easy',     desc: 'Basic concepts',    bars: 1, tone: 'success' },
  { value: 'medium',   label: 'Medium',   desc: 'Industry standard', bars: 2, tone: 'accent' },
  { value: 'hard',     label: 'Hard',     desc: 'Senior level',      bars: 3, tone: 'danger' },
  { value: 'adaptive', label: 'Adaptive', desc: 'Adjusts to you',    bars: 4, tone: 'ai' },
]

const DIFF_PILL = {
  easy:     'bg-success-soft text-success-500',
  medium:   'bg-accent-soft text-accent',
  hard:     'bg-danger-soft text-danger-500',
  adaptive: 'bg-ai-soft text-ai',
}

const BAR_TONE = {
  success: 'bg-success-500',
  accent:  'bg-accent',
  danger:  'bg-danger-500',
  ai:      'bg-ai',
}

const DURATIONS = [
  { value: 30, label: '30 min',  qs: 5 },
  { value: 45, label: '45 min',  qs: 8 },
  { value: 60, label: '60 min',  qs: 10 },
  { value: 90, label: '90 min',  qs: 15 },
]

const QUICK_STACKS = [
  ['React', 'Node.js'],
  ['Python', 'Django'],
  ['Java', 'Spring Boot'],
  ['Vue', 'FastAPI'],
  ['React Native', 'Firebase'],
  ['Go', 'Kubernetes'],
]

const SUGGESTED_ROLES = [
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer',
  'Full Stack', 'Data Scientist', 'DevOps', 'Product Manager'
]

const FALLBACK_PREBUILTS = [
  {
    id: "frontend-react",
    title: "Frontend React Specialist",
    role: "Frontend Engineer",
    badge: "Most Popular",
    difficulty: "medium",
    duration: 30,
    questionCount: 4,
    techStack: ["React", "JavaScript", "CSS", "Performance"],
    description: "Deep dive into React hooks, Fiber reconciliation, state architecture, and Core Web Vitals optimization.",
  },
  {
    id: "backend-node",
    title: "Backend & Distributed Systems",
    role: "Backend Engineer",
    badge: "High Demand",
    difficulty: "hard",
    duration: 45,
    questionCount: 4,
    techStack: ["Node.js", "Express", "Distributed Systems", "MongoDB"],
    description: "Master event loop mechanics, scalable microservices, database transactions, and idempotent API design.",
  },
  {
    id: "fullstack-mern",
    title: "Full Stack Developer (MERN)",
    role: "Full Stack Engineer",
    badge: "Ready to Test",
    difficulty: "medium",
    duration: 35,
    questionCount: 4,
    techStack: ["React", "Node.js", "Express", "MongoDB"],
    description: "Comprehensive evaluation of full stack architecture, secure JWT auth, state flow, and database modeling.",
  },
  {
    id: "behavioral-leadership",
    title: "Behavioral & Leadership Round",
    role: "Engineering Lead / Senior SDE",
    badge: "Core STAR Format",
    difficulty: "medium",
    duration: 30,
    questionCount: 4,
    techStack: ["Communication", "Conflict Resolution", "Agile", "Mentorship"],
    description: "Sharpen your STAR-method answers on engineering leadership, conflict resolution, missed deadlines, and ownership.",
  },
  {
    id: "dsa-problem-solving",
    title: "DSA & Problem Solving",
    role: "Software Engineer",
    badge: "Coding Focus",
    difficulty: "hard",
    duration: 40,
    questionCount: 4,
    techStack: ["Algorithms", "Data Structures", "Time Complexity", "Optimization"],
    description: "Algorithmic thinking, data structures, space/time complexity tradeoffs, and edge case problem solving.",
  },
];

const TRACK_META = {
  'frontend-react':        { Icon: Code2,    wrap: 'bg-accent-soft text-accent',   glow: 'from-accent/[0.16]' },
  'backend-node':          { Icon: Server,   wrap: 'bg-ai-soft text-ai',           glow: 'from-ai/[0.16]' },
  'fullstack-mern':        { Icon: Layers,   wrap: 'bg-accent-soft text-accent',   glow: 'from-accent/[0.16]' },
  'behavioral-leadership': { Icon: Users,    wrap: 'bg-warning-soft text-warning-500', glow: 'from-warning-500/[0.16]' },
  'dsa-problem-solving':   { Icon: Binary,   wrap: 'bg-ai-soft text-ai',           glow: 'from-ai/[0.16]' },
}

const DEFAULT_TRACK = { Icon: Sparkles, wrap: 'bg-accent-soft text-accent', glow: 'from-accent/[0.16]' }

const tileClass = (active) => [
  'rounded-xl border p-3 text-left transition-all duration-fast ease-out',
  active
    ? 'border-accent/45 bg-accent-soft/55 text-ink shadow-1'
    : 'border-hairline bg-inset text-muted hover:border-hairline-strong hover:text-ink',
].join(' ')

function Step({ index, title, description, action, children }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="num mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-hairline bg-inset text-2xs font-semibold text-subtle">
            {index}
          </span>
          <div className="min-w-0">
            <h2 className="t-h3 leading-tight">{title}</h2>
            {description && <p className="t-sm mt-1">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  )
}

function TrackCard({ item, index, featured, starting, disabled, onStart }) {
  const meta = TRACK_META[item.id] || DEFAULT_TRACK
  const Icon = meta.Icon
  const difficulty = item.difficulty || 'medium'

  return (
    <Card
      interactive
      className={`group relative flex h-full flex-col justify-between gap-5 overflow-hidden p-5 sm:p-6 ${
        featured ? 'bg-gradient-to-br from-surface via-surface to-accent-soft/45' : ''
      }`}
    >
      {featured && (
        <>
          <div aria-hidden className="line-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_70%_at_90%_10%,black,transparent)]" />
          <div aria-hidden className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-b ${meta.glow} to-transparent blur-2xl`} />
        </>
      )}

      <div className="relative">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${meta.wrap}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="num text-2xs text-faint">{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge color="accent">{(item.badge || 'Ready now').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim()}</Badge>
            <span className={`badge capitalize ${DIFF_PILL[difficulty] || DIFF_PILL.medium}`}>{difficulty}</span>
          </div>
        </div>

        <h3 className={featured ? 't-h2' : 't-h3'}>{item.title}</h3>
        <p className="mt-1 text-xs font-medium text-subtle">{item.role}</p>
        <p className="t-sm mt-3 leading-relaxed">{item.description}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {item.techStack?.map((tag) => (
            <li key={tag} className="chip">{tag}</li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <p className="num flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-faint" aria-hidden />{item.duration || 30} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-faint" aria-hidden />{item.questionCount || 4} questions
          </span>
        </p>
        <Button
          size="sm"
          variant={featured ? 'primary' : 'secondary'}
          loading={starting}
          disabled={disabled}
          onClick={onStart}
          icon={starting ? null : <Play className="h-3.5 w-3.5 fill-current" aria-hidden />}
        >
          {starting ? 'Opening room…' : 'Start now'}
        </Button>
      </div>
    </Card>
  )
}

export default function CreateInterviewPage() {
  const { user } = useAuth()
  const isFree = user?.plan === 'free' && user?.role !== 'admin'
  const navigate = useNavigate()
  const root = usePageEnter()

  const [activeTab, setActiveTab] = useState('ready-made') // 'ready-made' | 'custom'
  const [prebuilts, setPrebuilts] = useState(FALLBACK_PREBUILTS)
  const [startingPrebuiltId, setStartingPrebuiltId] = useState(null)

  const [form, setForm] = useState({
    role: '',
    experienceLevel: 'mid',
    interviewType: 'mixed',
    difficulty: isFree ? 'medium' : 'adaptive',
    targetDuration: isFree ? 30 : 45,
    questionCount: isFree ? 5 : 8,
    aiEngine: user?.preferredAIEngine || localStorage.getItem('intervusetu_ai_engine') || 'groq',
  })
  const [techInput,  setTechInput]  = useState('')
  const [techStack,  setTechStack]  = useState([])
  const [loading,    setLoading]    = useState(false)
  const [errors,     setErrors]     = useState({})
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Load prebuilt interviews from server
  useEffect(() => {
    getPrebuiltInterviews()
      .then(res => {
        if (res.data?.data?.length) {
          setPrebuilts(res.data.data)
        }
      })
      .catch(() => {})
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const addTag = (tag) => {
    const t = tag.trim()
    if (t && !techStack.includes(t) && techStack.length < 10) {
      setTechStack(p => [...p, t])
    }
    setTechInput('')
  }

  const setDuration = (dur) => {
    if (isFree && dur > 30) return setShowUpgradeModal(true)
    const found = DURATIONS.find(d => d.value === dur)
    set('targetDuration', dur)
    if (found) set('questionCount', isFree ? Math.min(found.qs, 5) : found.qs)
  }

  const validate = () => {
    const e = {}
    if (!form.role.trim())    e.role      = 'Role is required'
    if (techStack.length < 1) e.techStack = 'Add at least one technology'
    return e
  }

  const handleStartPrebuilt = async (prebuiltId) => {
    setStartingPrebuiltId(prebuiltId)
    try {
      const res = await startPrebuiltInterview(prebuiltId)
      toast.success('Ready-made interview loaded instantly!')
      navigate(`/interview/${res.data.data.interviewId}/room`)
    } catch (err) {
      toast.error('Failed to start ready-made interview')
    } finally {
      setStartingPrebuiltId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await createInterview({ ...form, techStack, aiEngine: form.aiEngine })
      toast.success(`${res.data.data.totalQuestions} questions generated via ${form.aiEngine === 'groq' ? 'Groq' : 'Local Qwen'}!`)
      navigate(`/interview/${res.data.data.interviewId}/room`)
    } catch (err) {
      if (err.response?.data?.requiresUpgrade) {
         setShowUpgradeModal(true)
      } else {
         toast.error(err.response?.data?.message || 'Failed to create interview')
      }
    } finally { setLoading(false) }
  }

  const activeType = INTERVIEW_TYPES.find(t => t.value === form.interviewType) || INTERVIEW_TYPES[4]
  const activeLevel = EXPERIENCE_LEVELS.find(l => l.value === form.experienceLevel) || EXPERIENCE_LEVELS[2]
  const activeDiff  = DIFFICULTIES.find(d => d.value === form.difficulty) || DIFFICULTIES[1]
  const TypeIcon = activeType.icon
  const isGroq = form.aiEngine === 'groq'
  const ready = !!form.role.trim() && techStack.length > 0

  return (
    <div ref={root} className="page-shell">
      <Navbar />
      <main className="container-page pt-[calc(var(--nav-h)+1.75rem)] pb-20">

        {/* ── Header ─────────────────────────────────────────────── */}
        <header
          data-enter
          className="relative mb-6 overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface via-surface to-accent-soft/45 p-6 sm:p-8"
        >
          <div aria-hidden className="line-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(75%_85%_at_88%_5%,black,transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-ai/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="eyebrow mb-2.5 flex items-center gap-2">
                <span aria-hidden className="h-1 w-1 rounded-full bg-accent shadow-[0_0_0_3px_rgb(var(--accent)/0.14)]" />
                Interview setup
              </p>
              <h1 className="t-h1 text-balance">
                Start an <span className="gradient-text">interview</span>
              </h1>
              <p className="t-body mt-2.5 max-w-xl text-pretty">
                Jump straight into a curated track, or build a round that adapts to your
                stack and experience. The room opens with a checklist before the timer starts.
              </p>

              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-2xs text-subtle">
                <li className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-500" aria-hidden />
                  Questions anchored to your stack
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-accent" aria-hidden />
                  Groq or on-device Qwen
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-faint" aria-hidden />
                  Ready-made tracks open instantly
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end md:gap-2.5">
              {isFree ? (
                <Badge color="warning">Free plan · 30 min · 5 questions</Badge>
              ) : (
                <Badge color="accent">Pro plan · full length sessions</Badge>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface/80 px-3 py-1.5 text-2xs font-medium text-muted shadow-1 backdrop-blur">
                <Gauge className="h-3.5 w-3.5 text-ai" aria-hidden />
                Setup takes about a minute
              </span>
            </div>
          </div>
        </header>

        {/* ── Source switcher ────────────────────────────────────── */}
        <div data-enter className="card mb-5 flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            ariaLabel="Interview source"
            value={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
            tabs={[
              { value: 'ready-made', label: 'Ready-made', icon: <Zap className="h-3.5 w-3.5" aria-hidden />, count: prebuilts.length },
              { value: 'custom',     label: 'Custom with AI', icon: <Wand2 className="h-3.5 w-3.5" aria-hidden /> },
            ]}
          />
          <p className="hidden pb-0.5 text-2xs text-subtle sm:block">
            {activeTab === 'ready-made' ? 'Curated question sets, no generation wait' : 'Generated for your exact role and stack'}
          </p>
        </div>

        {/* ═════════ READY-MADE ═════════ */}
        {activeTab === 'ready-made' && (
          <div role="tabpanel" aria-label="Ready-made interviews" className="animate-slide-up">
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {prebuilts.map((item, index) => (
                <li
                  key={item.id}
                  className={`min-w-0 ${index === 0 ? 'md:col-span-2 xl:col-span-1' : ''}`}
                >
                  <TrackCard
                    item={item}
                    index={index}
                    featured={index === 0}
                    starting={startingPrebuiltId === item.id}
                    disabled={startingPrebuiltId !== null}
                    onStart={() => handleStartPrebuilt(item.id)}
                  />
                </li>
              ))}
            </ul>

            <div
              data-enter
              className="card-inset mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ai-soft text-ai">
                  <Wand2 className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">Need a different role or stack?</p>
                  <p className="t-sm mt-0.5">
                    Build a custom round — the generator anchors every question to your tech and level.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 justify-start sm:justify-center"
                onClick={() => setActiveTab('custom')}
                icon={<ArrowRight className="h-3.5 w-3.5" aria-hidden />}
              >
                Build a custom role
              </Button>
            </div>
          </div>
        )}

        {/* ═════════ CUSTOM GENERATOR ═════════ */}
        {activeTab === 'custom' && (
          <form
            id="custom-interview-form"
            onSubmit={handleSubmit}
            role="tabpanel"
            aria-label="Custom AI interview"
            className="grid animate-slide-up items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]"
          >
            <div className="min-w-0 space-y-5">
              {/* 01 — Type */}
              <Step
                index="01"
                title="Interview type"
                description="Sets the balance of coding, concept and behavioural questions."
              >
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Interview type">
                  {INTERVIEW_TYPES.map((t, i) => {
                    const active = form.interviewType === t.value
                    const Icon = t.icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => set('interviewType', t.value)}
                        className={`${tileClass(active)} ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <Icon className={`h-4 w-4 ${active ? 'text-accent' : 'text-faint'}`} aria-hidden />
                          {active && <Check className="h-3.5 w-3.5 text-accent" aria-hidden />}
                        </span>
                        <span className="mt-2 block text-sm font-semibold text-ink">{t.label}</span>
                        <span className="mt-0.5 block text-2xs text-subtle">{t.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </Step>

              {/* 02 — Role & experience */}
              <Step index="02" title="Role & experience" description="The interviewer speaks to this level and function.">
                <div className="space-y-4">
                  <div>
                    <Input
                      label="Job role"
                      placeholder="e.g. Backend Developer"
                      value={form.role}
                      error={errors.role}
                      onChange={e => { set('role', e.target.value); setErrors(p => ({ ...p, role: '' })) }}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggested roles">
                      {SUGGESTED_ROLES.map(r => (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={form.role === r}
                          onClick={() => { set('role', r); setErrors(p => ({ ...p, role: '' })) }}
                          className={`chip transition-colors duration-fast ${
                            form.role === r ? 'border-accent/40 bg-accent-soft/60 text-accent' : 'hover:border-hairline-strong hover:text-ink'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="field-label" id="exp-label">Experience level</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-labelledby="exp-label">
                      {EXPERIENCE_LEVELS.map((exp) => {
                        const active = form.experienceLevel === exp.value
                        return (
                          <button
                            key={exp.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => set('experienceLevel', exp.value)}
                            className={`${tileClass(active)} text-center`}
                          >
                            <span className="block text-sm font-semibold text-ink">{exp.label}</span>
                            <span className="num mt-0.5 block text-2xs text-subtle">{exp.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Step>

              {/* 03 — Tech stack */}
              <Step
                index="03"
                title="Tech stack"
                description="The generator anchors questions to these technologies."
                action={<span className="num text-2xs text-subtle">{techStack.length}/10</span>}
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <Input
                        label="Add a technology"
                        placeholder="e.g. Docker, Redis — press Enter"
                        value={techInput}
                        error={errors.techStack}
                        icon={<Terminal className="h-3.5 w-3.5" />}
                        onChange={e => { setTechInput(e.target.value); setErrors(p => ({ ...p, techStack: '' })) }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(techInput) } }}
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => addTag(techInput)} icon={<Plus className="h-4 w-4" aria-hidden />}>
                      Add
                    </Button>
                  </div>

                  {techStack.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 pt-1">
                      {techStack.map(tag => (
                        <li key={tag} className="chip gap-1 border-accent/30 bg-accent-soft/50 text-accent">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setTechStack(p => p.filter(t => t !== tag))}
                            aria-label={`Remove ${tag}`}
                            className="-mr-0.5 grid h-4 w-4 place-items-center rounded text-accent/70 transition-colors hover:bg-accent/15 hover:text-accent"
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div>
                    <p className="text-2xs font-medium text-subtle">Quick stacks</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {QUICK_STACKS.map((stack, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setTechStack(stack)}
                          className="chip transition-colors duration-fast hover:border-hairline-strong hover:text-ink"
                        >
                          {stack.join(' + ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Step>

              {/* 04 — Difficulty & length */}
              <Step index="04" title="Difficulty & length" description="How hard, how long, and how many questions.">
                <div className="space-y-5">
                  <div>
                    <p className="field-label" id="diff-label">Difficulty</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-labelledby="diff-label">
                      {DIFFICULTIES.map((d) => {
                        const active = form.difficulty === d.value
                        return (
                          <button
                            key={d.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => set('difficulty', d.value)}
                            className={tileClass(active)}
                          >
                            <span className="flex gap-1" aria-hidden>
                              {[1, 2, 3, 4].map(n => (
                                <span
                                  key={n}
                                  className={`h-3 w-1 rounded-full ${
                                    n <= d.bars ? BAR_TONE[d.tone] : 'bg-ink/10'
                                  } ${active ? '' : 'opacity-70'}`}
                                />
                              ))}
                            </span>
                            <span className="mt-2 block text-sm font-semibold text-ink">{d.label}</span>
                            <span className="mt-0.5 block text-2xs text-subtle">{d.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="field-label" id="dur-label">Target duration</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-labelledby="dur-label">
                      {DURATIONS.map(d => {
                        const active = form.targetDuration === d.value
                        const locked = isFree && d.value > 30
                        return (
                          <button
                            key={d.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setDuration(d.value)}
                            className={`relative rounded-xl border px-2 py-2.5 text-center transition-all duration-fast ${
                              active
                                ? 'border-accent/45 bg-accent-soft/55 text-accent shadow-1'
                                : 'border-hairline bg-inset text-muted hover:border-hairline-strong hover:text-ink'
                            }`}
                          >
                            {locked && (
                              <Lock className="absolute right-2 top-2 h-3 w-3 text-warning-500" aria-hidden />
                            )}
                            <span className="num block text-sm font-semibold">{d.label}</span>
                            <span className="num mt-0.5 flex items-center justify-center gap-1 text-2xs text-subtle">
                              {locked ? 'Pro' : `${isFree ? Math.min(d.qs, 5) : d.qs} questions`}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <p className="flex items-start gap-1.5 rounded-lg border border-hairline bg-inset px-3 py-2.5 text-2xs text-subtle">
                    <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                    <span>
                      <span className="num text-ink">{form.questionCount}</span> questions across{' '}
                      <span className="num text-ink">{form.targetDuration}</span> minutes.
                      {form.difficulty === 'adaptive'
                        ? ' Difficulty adapts as you answer.'
                        : ` Difficulty is fixed at ${form.difficulty}.`}
                    </span>
                  </p>
                </div>
              </Step>

              {/* 05 — Engine */}
              <Step index="05" title="Question & report model" description="Follow-up turns always run on-device; this sets the generated set and final synthesis.">
                <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Question generator model">
                  {[
                    { value: 'groq', name: 'Groq cloud', sub: 'Llama 3.3 70B', note: 'Fastest reasoning and the most tailored question set.', Icon: Zap, badge: 'Fastest' },
                    { value: 'qwen_local', name: 'Qwen 2.5 local', sub: 'On-device', note: 'No token cost and works without internet.', Icon: Cpu, badge: 'Offline' },
                  ].map((engine) => {
                    const active = form.aiEngine === engine.value
                    const Icon = engine.Icon
                    return (
                      <button
                        key={engine.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => set('aiEngine', engine.value)}
                        className={`${tileClass(active)} relative`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? 'bg-ai-soft text-ai' : 'bg-canvas text-faint'}`}>
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-ink">{engine.name}</span>
                              <span className="block text-2xs text-subtle">{engine.sub}</span>
                            </span>
                          </span>
                          <span className={`badge shrink-0 ${active ? 'badge-ai' : ''}`}>{engine.badge}</span>
                        </span>
                        <span className="mt-2.5 block text-2xs leading-relaxed text-subtle">{engine.note}</span>
                        {active && (
                          <span className="absolute bottom-2.5 right-2.5 grid h-5 w-5 place-items-center rounded-full bg-ai text-white" aria-hidden>
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </Step>
            </div>

            {/* ── Live blueprint rail ───────────────────────────────── */}
            <aside className="min-w-0 lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
              <div className="card overflow-hidden">
                <div className="hairline-b bg-gradient-to-br from-surface to-accent-soft/40 px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="eyebrow flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-accent" aria-hidden />
                      Session blueprint
                    </p>
                    <span className={`badge ${ready ? 'badge-success' : 'badge-warning'}`}>
                      {ready ? 'Ready' : 'Incomplete'}
                    </span>
                  </div>
                  <p className="t-h3 mt-2">{form.role.trim() || 'Your next round'}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-subtle">
                    <span className="inline-flex items-center gap-1">
                      <TypeIcon className="h-3 w-3" aria-hidden />
                      {activeType.label}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{activeLevel.label}</span>
                    <span aria-hidden>·</span>
                    <span>{activeDiff.label}</span>
                  </p>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-subtle">Duration</dt>
                      <dd className="num font-medium text-ink">{form.targetDuration} min</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-subtle">Questions</dt>
                      <dd className="num font-medium text-ink">{form.questionCount}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-subtle">Model</dt>
                      <dd className="flex items-center gap-1.5 font-medium text-ink">
                        {isGroq ? <Zap className="h-3.5 w-3.5 text-accent" aria-hidden /> : <Cpu className="h-3.5 w-3.5 text-ai" aria-hidden />}
                        {isGroq ? 'Groq LPU' : 'Local Qwen'}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <p className="eyebrow mb-1.5">Tech stack</p>
                    {techStack.length > 0 ? (
                      <ul className="flex flex-wrap gap-1">
                        {techStack.map(tag => <li key={tag} className="chip text-2xs">{tag}</li>)}
                      </ul>
                    ) : (
                      <p className="text-2xs text-subtle">Add at least one technology.</p>
                    )}
                  </div>

                  <div className="hairline-t pt-3.5">
                    <ul className="space-y-1.5 text-2xs">
                      <li className={`flex items-center gap-2 ${form.role.trim() ? 'text-muted' : 'text-subtle'}`}>
                        {form.role.trim() ? <CheckCircle2 className="h-3.5 w-3.5 text-success-500" aria-hidden /> : <Circle className="h-3.5 w-3.5 text-faint" aria-hidden />}
                        Role {form.role.trim() ? 'set' : 'needed'}
                      </li>
                      <li className={`flex items-center gap-2 ${techStack.length ? 'text-muted' : 'text-subtle'}`}>
                        {techStack.length ? <CheckCircle2 className="h-3.5 w-3.5 text-success-500" aria-hidden /> : <Circle className="h-3.5 w-3.5 text-faint" aria-hidden />}
                        Stack {techStack.length ? `set (${techStack.length})` : 'needed'}
                      </li>
                      <li className="flex items-center gap-2 text-muted">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success-500" aria-hidden />
                        {form.targetDuration} min · {form.questionCount} questions
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button
                      type="submit"
                      form="custom-interview-form"
                      size="lg"
                      block
                      loading={loading}
                      icon={loading ? null : <SlidersHorizontal className="h-4 w-4" aria-hidden />}
                    >
                      {loading ? 'Generating…' : 'Generate & start'}
                    </Button>
                    <p className="text-center text-2xs text-subtle">
                      Review the room checklist before the timer starts.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('ready-made')}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-2xs font-medium text-subtle transition-colors duration-fast hover:text-ink"
              >
                <Clock className="h-3.5 w-3.5" aria-hidden />
                In a hurry? Open a ready-made track
              </button>
            </aside>
          </form>
        )}

        {showUpgradeModal && (
          <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        )}

      </main>
    </div>
  )
}
