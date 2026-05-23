import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Input, Select, Card } from '../components/ui/index'
import { createInterview } from '../api/interviewAPI'
import toast from 'react-hot-toast'
import {
  Mic, Plus, X, Sparkles, Code2, Brain,
  Users, Layers, Zap, Clock
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

export default function CreateInterviewPage() {
  const { user } = useAuth()
  const isFree = user?.plan === 'free' && user?.role !== 'admin'

  const [form, setForm] = useState({
    role: '',
    experienceLevel: 'mid',
    interviewType: 'mixed',
    difficulty: isFree ? 'medium' : 'adaptive',
    targetDuration: isFree ? 30 : 45,
    questionCount: isFree ? 5 : 8,
  })
  const [techInput,  setTechInput]  = useState('')
  const [techStack,  setTechStack]  = useState([])
  const [loading,    setLoading]    = useState(false)
  const [errors,     setErrors]     = useState({})
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const navigate = useNavigate()

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await createInterview({ ...form, techStack })
      toast.success(`${res.data.data.totalQuestions} questions generated!`)
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-50 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Create Interview</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Configure parameters and let AI generate tailored questions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

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
                        onClick={() => set('role', r)}
                        className="text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <Select
                  label="Experience Level"
                  value={form.experienceLevel}
                  onChange={e => set('experienceLevel', e.target.value)}
                >
                  {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              </div>
            </Card>

            {/* ── Tech Stack ─────────────────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-500" />Tech Stack
              </h2>

              <div className="flex gap-2 mb-3">
                <input
                  value={techInput}
                  onChange={e => setTechInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(techInput) } }}
                  placeholder="Type tech and press Enter..."
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
                <Button type="button" variant="secondary" onClick={() => addTag(techInput)}>
                  Add
                </Button>
              </div>

              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {techStack.map(t => (
                    <motion.span
                      key={t}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-md px-2.5 py-1 text-xs"
                    >
                      {t}
                      <button type="button" onClick={() => setTechStack(p => p.filter(x => x !== t))} className="text-zinc-500 hover:text-red-500 dark:hover:text-red-400 mt-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </div>
              )}
              {errors.techStack && <p className="text-xs text-red-400 mb-3">{errors.techStack}</p>}

              <div>
                <p className="text-xs text-zinc-500 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_STACKS.map((stack, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => stack.forEach(t => { if (!techStack.includes(t)) setTechStack(p => [...p, t]) })}
                      className="text-[11px] bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                      {stack.join(' + ')}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── Duration + Difficulty ──────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-500" />Duration & Difficulty
              </h2>

              <div className="mb-6">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDuration(d.value)}
                      className={`relative py-2 rounded-lg border text-center transition-all ${
                        form.targetDuration === d.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600/50 dark:bg-blue-600/10 dark:text-blue-400'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {isFree && d.value > 30 && <Sparkles className="absolute top-1 right-1 w-3 h-3 text-blue-500" />}
                      <div className="text-sm font-medium">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-2">Difficulty</label>
                <div className="grid grid-cols-4 gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        if (isFree && (d.value === 'hard' || d.value === 'adaptive')) return setShowUpgradeModal(true)
                        set('difficulty', d.value)
                      }}
                      className={`relative py-2 rounded-lg border text-center transition-all ${
                        form.difficulty === d.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600/50 dark:bg-blue-600/10 dark:text-blue-400'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {isFree && (d.value === 'hard' || d.value === 'adaptive') && <Sparkles className="absolute top-1 right-1 w-3 h-3 text-blue-500" />}
                      <div className="text-sm font-medium">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex justify-between mb-2">
                  <span>Questions to generate</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono">{form.questionCount}</span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={form.questionCount}
                  onChange={e => {
                    const val = +e.target.value;
                    if (isFree && val > 5) return setShowUpgradeModal(true);
                    set('questionCount', val)
                  }}
                  className="w-full accent-blue-600 dark:accent-blue-500 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </Card>

            <Button type="submit" loading={loading} size="lg" className="w-full py-3" disabled={loading}>
              {loading ? 'Generative AI is working...' : 'Create Interview'}
            </Button>
          </form>
        </motion.div>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}
