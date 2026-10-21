import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Input, Select, Card } from '../components/ui/index'
import { createInterview, getPrebuiltInterviews, startPrebuiltInterview } from '../api/interviewAPI'
import toast from 'react-hot-toast'
import {
  Mic, Plus, X, Sparkles, Code2, Brain,
  Users, Layers, Zap, Clock, CheckCircle2, ArrowRight, Cpu, Check
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from '../components/ui/UpgradeModal'

const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher (0 yrs)' },
  { value: 'junior',  label: 'Junior (1-2 yrs)' },
  { value: 'mid',     label: 'Mid (3-5 yrs)' },
  { value: 'senior',  label: 'Senior (5-8 yrs)' },
  { value: 'lead',    label: 'Lead (8+ yrs)' },
]

const INTERVIEW_TYPES = [
  { value: 'technical',     label: 'Technical',     desc: 'Coding + concepts',   icon: <Code2 className="w-5 h-5" />,    color: 'blue' },
  { value: 'hr',            label: 'HR Round',      desc: 'Culture + values',    icon: <Users className="w-5 h-5" />,    color: 'violet' },
  { value: 'behavioral',    label: 'Behavioral',    desc: 'STAR method stories', icon: <Brain className="w-5 h-5" />,    color: 'amber' },
  { value: 'system_design', label: 'System Design', desc: 'Architecture scale',  icon: <Layers className="w-5 h-5" />,   color: 'emerald' },
  { value: 'mixed',         label: 'Mixed',         desc: 'All of the above',    icon: <Sparkles className="w-5 h-5" />, color: 'rose' },
]

const DIFFICULTIES = [
  { value: 'easy',     label: 'Easy',     desc: 'Basic concepts' },
  { value: 'medium',   label: 'Medium',   desc: 'Industry standard' },
  { value: 'hard',     label: 'Hard',     desc: 'Senior level' },
  { value: 'adaptive', label: 'Adaptive', desc: 'Adjusts to you' },
]

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
    badgeColor: "cyan",
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
    badgeColor: "emerald",
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
    badgeColor: "blue",
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
    badgeColor: "amber",
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
    badgeColor: "rose",
    difficulty: "hard",
    duration: 40,
    questionCount: 4,
    techStack: ["Algorithms", "Data Structures", "Time Complexity", "Optimization"],
    description: "Algorithmic thinking, data structures, space/time complexity tradeoffs, and edge case problem solving.",
  },
];

export default function CreateInterviewPage() {
  const { user } = useAuth()
  const isFree = user?.plan === 'free' && user?.role !== 'admin'
  const navigate = useNavigate()

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Instant Assessment Suite
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Start An Interview
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                Take a ready-made interview immediately or create custom questions with AI.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 rounded-xl bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('ready-made')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'ready-made'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-blue-500" /> Ready-Made (Instant Start)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'custom'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-purple-500" /> Custom AI Generator
              </button>
            </div>
          </div>

          {/* ═════════ TAB 1: READY-MADE INTERVIEWS ═════════ */}
          {activeTab === 'ready-made' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prebuilts.map((item) => {
                  const isStarting = startingPrebuiltId === item.id

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-blue-500/40 hover:shadow-lg dark:hover:shadow-blue-500/5 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Badges & Meta */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {item.badge || 'Ready to Give'}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration || 30}m</span>
                            <span>•</span>
                            <span>{item.questionCount || 4} Questions</span>
                          </div>
                        </div>

                        {/* Title & Role */}
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {item.title}
                        </h3>
                        <p className="text-xs font-semibold text-zinc-500 mb-3">{item.role}</p>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                          {item.description}
                        </p>

                        {/* Tech stack tags */}
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {item.techStack?.map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Start button */}
                      <button
                        onClick={() => handleStartPrebuilt(item.id)}
                        disabled={isStarting || startingPrebuiltId !== null}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50"
                      >
                        {isStarting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Loading Interview Room...
                          </>
                        ) : (
                          <>
                            Start Interview Now ⚡
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Helper tip banner */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Ready-made interviews have pre-curated high quality questions that start instantly with 0ms AI generation delay.
                </span>
                <button
                  onClick={() => setActiveTab('custom')}
                  className="text-blue-500 hover:underline font-semibold shrink-0 ml-3"
                >
                  Need a custom role? Switch to AI generator →
                </button>
              </div>
            </motion.div>
          )}

          {/* ═════════ TAB 2: CUSTOM AI GENERATOR FORM ═════════ */}
          {activeTab === 'custom' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">

                {/* ── Interview Type ─────────────────────────────────────────── */}
                <Card className="p-5 sm:p-6">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600 dark:text-blue-500" />Interview Type
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {INTERVIEW_TYPES.map(t => {
                      const active = form.interviewType === t.value
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => set('interviewType', t.value)}
                          className={`flex flex-col items-start gap-1 p-3 rounded-lg border transition-all text-left ${
                            active
                              ? 'border-blue-600/50 bg-blue-50 text-blue-700 dark:bg-blue-600/10 dark:text-blue-400'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <span className={active ? `text-${t.color}-400` : 'text-zinc-500'}>{t.icon}</span>
                          <span className={`text-sm font-medium mt-1 ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>{t.label}</span>
                          <span className={`text-[10px] uppercase tracking-wider ${active ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-500'}`}>{t.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </Card>

                {/* ── Role & Experience ─────────────────────────────────────── */}
                <Card className="p-5 sm:p-6">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600 dark:text-blue-500" />Role & Experience
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Job Role"
                        placeholder="e.g. Backend Developer"
                        value={form.role}
                        error={errors.role}
                        onChange={e => { set('role', e.target.value); setErrors(p => ({ ...p, role: '' })) }}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {SUGGESTED_ROLES.map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => { set('role', r); setErrors(p => ({ ...p, role: '' })) }}
                            className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                              form.role === r
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Experience Level
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {EXPERIENCE_LEVELS.map(exp => (
                          <button
                            key={exp.value}
                            type="button"
                            onClick={() => set('experienceLevel', exp.value)}
                            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                              form.experienceLevel === exp.value
                                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-600/10 dark:text-blue-400 dark:border-blue-500'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            {exp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* ── Tech Stack ────────────────────────────────────────────── */}
                <Card className="p-5 sm:p-6">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-500" />Tech Stack
                  </h2>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add technology (e.g. Docker, Redis) and press Enter"
                        value={techInput}
                        onChange={e => setTechInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(techInput) } }}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => addTag(techInput)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {errors.techStack && (
                      <p className="text-xs text-red-500">{errors.techStack}</p>
                    )}

                    {techStack.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {techStack.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setTechStack(p => p.filter(t => t !== tag))}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Quick Stacks:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_STACKS.map((stack, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setTechStack(stack)}
                            className="text-xs px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            {stack.join(' + ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* ── Difficulty & Duration ─────────────────────────────────── */}
                <Card className="p-5 sm:p-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Difficulty
                      </label>
                      <Select
                        value={form.difficulty}
                        onChange={e => set('difficulty', e.target.value)}
                      >
                        {DIFFICULTIES.map(d => (
                          <option key={d.value} value={d.value}>
                            {d.label} — {d.desc}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Target Duration
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {DURATIONS.map(d => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setDuration(d.value)}
                            className={`py-2 px-2 text-center rounded-lg border text-xs font-medium transition-all ${
                              form.targetDuration === d.value
                                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-600/10 dark:text-blue-400 dark:border-blue-500'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* ── Question Generator Engine Selector ────────────────────── */}
                <Card className="p-4 sm:p-5 border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        AI Model (1st Questions & Final Report)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      In-between turns run on-device
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => set('aiEngine', 'groq')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.aiEngine === 'groq'
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-950/40 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Zap className={`w-3.5 h-3.5 ${form.aiEngine === 'groq' ? 'text-blue-500' : 'text-zinc-400'}`} />
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Groq AI (Cloud LPU)</span>
                        </div>
                        {form.aiEngine === 'groq' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Llama 3.3 70B. Fastest reasoning & tailored questions.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => set('aiEngine', 'qwen_local')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.aiEngine === 'qwen_local'
                          ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Cpu className={`w-3.5 h-3.5 ${form.aiEngine === 'qwen_local' ? 'text-cyan-500' : 'text-zinc-400'}`} />
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Local Qwen 2.5 (Offline)</span>
                        </div>
                        {form.aiEngine === 'qwen_local' && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        100% On-Device (468.6 MB). $0.00 token cost & unlimited.
                      </p>
                    </button>
                  </div>
                </Card>

                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Custom Questions with AI...
                    </span>
                  ) : (
                    'Generate Custom Questions & Start'
                  )}
                </Button>

              </form>
            </motion.div>
          )}

        </motion.div>

        {showUpgradeModal && (
          <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        )}

      </div>
    </div>
  )
}
