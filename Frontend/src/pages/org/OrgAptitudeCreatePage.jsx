import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { createOrgAptitudeTest } from '../../api/orgAPI'
import {
  ArrowLeft, Brain, Clock, Hash, Shield, Calendar,
  Loader2, Copy, CheckCircle2, AlertTriangle, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/index'

const CATS = ['numerical', 'verbal', 'logical', 'situational']

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5" style={{ fontFamily: 'Inter, system-ui' }}>
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

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

  if (created) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Test Created!</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Share the link with students. They'll need an account to take the test.
          </p>

          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4 text-left">
            <p className="text-[10px] font-semibold text-zinc-500 mb-2 tracking-wider">JOIN LINK</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-blue-600 dark:text-blue-400 font-mono break-all">{created.joinUrl}</code>
              <button onClick={copyLink}
                className={`flex-shrink-0 p-2 rounded-lg border transition-all ${copied ? 'border-green-200 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-blue-300 hover:text-blue-500'}`}>
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-[10px] font-semibold text-zinc-500 mb-3 tracking-wider">TEST CONFIG</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-1"><Hash className="w-3 h-3" />{created.questionCount} Questions</div>
              <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{created.duration} Minutes</div>
              {created.deadline && <div className="flex items-center gap-1 col-span-2"><Calendar className="w-3 h-3" />Deadline: {new Date(created.deadline).toLocaleDateString()}</div>}
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {created.categories?.map(c => (
                <span key={c} className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full capitalize">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/org/dashboard')} className="flex-1">
              ← Dashboard
            </Button>
            <Button variant="primary" onClick={() => navigate(`/org/aptitude/${created._id}/results`)} className="flex-1">
              View Results
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/org/dashboard')} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-0.5 h-4 bg-zinc-200 dark:bg-zinc-800" />
          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-500" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>Create Aptitude Test</span>
          <div className="ml-auto text-[10px] font-medium text-zinc-500 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-blue-500" />
            Auto-duration: ~{duration} min
          </div>
        </div>
      </nav>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left — main fields */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic Info */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-50 mb-5 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <span className="w-5 h-5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md flex items-center justify-center text-[10px] font-bold">1</span>
                Basic Info
              </h2>
              <div className="space-y-4">
                <div>
                  <FieldLabel required>Test Title</FieldLabel>
                  <input value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="e.g., Campus Recruitment — Aptitude Round 2025"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all"
                    required />
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <input value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="Brief description shown to students on the join page"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all" />
                </div>
                <div>
                  <FieldLabel>Instructions for Students</FieldLabel>
                  <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
                    placeholder="e.g., Read each question carefully. Do not use a calculator. Switching tabs will be recorded..."
                    rows={3}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all resize-none" />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-50 mb-5 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <span className="w-5 h-5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md flex items-center justify-center text-[10px] font-bold">2</span>
                Categories
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {CATS.map(cat => {
                  const active = form.categories.includes(cat)
                  const icons = { numerical: '🔢', verbal: '📖', logical: '🧩', situational: '🎯' }
                  return (
                    <button key={cat} type="button" onClick={() => toggleCat(cat)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                      <span className="text-xl">{icons[cat]}</span>
                      <div>
                        <p className={`text-sm font-semibold capitalize ${active ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{cat}</p>
                        <p className={`text-[10px] ${active ? 'text-blue-500/80 dark:text-blue-400/80' : 'text-zinc-500'}`}>Reasoning</p>
                      </div>
                      {active && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-500 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Difficulty Mix */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-50 mb-5 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <span className="w-5 h-5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md flex items-center justify-center text-[10px] font-bold">3</span>
                Difficulty Mix
              </h2>
              <div className="space-y-4">
                {[
                  { key: 'easy', label: 'Easy', color: 'text-green-600 dark:text-green-500', bar: 'bg-green-500' },
                  { key: 'medium', label: 'Medium', color: 'text-amber-600 dark:text-amber-500', bar: 'bg-amber-500' },
                  { key: 'hard', label: 'Hard', color: 'text-red-600 dark:text-red-500', bar: 'bg-red-500' },
                ].map(({ key, label, color, bar }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1.5">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</span>
                      <span className="text-xs font-mono text-zinc-500">{form.difficultyMix[key]}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={form.difficultyMix[key]}
                      onChange={e => {
                        const val = parseInt(e.target.value)
                        const others = { easy: form.difficultyMix.easy, medium: form.difficultyMix.medium, hard: form.difficultyMix.hard }
                        others[key] = val
                        const total = others.easy + others.medium + others.hard
                        if (total !== 100) {
                          const otherKeys = Object.keys(others).filter(k => k !== key)
                          const rem = 100 - val
                          const half = Math.floor(rem / 2)
                          others[otherKeys[0]] = half
                          others[otherKeys[1]] = 100 - val - half
                          Object.keys(others).forEach(k => { if (others[k] < 0) others[k] = 0 })
                        }
                        set('difficultyMix', others)
                      }}
                      className="w-full accent-blue-600 dark:accent-blue-500" />
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${bar}`} style={{ width: `${form.difficultyMix[key]}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-zinc-500 mt-2">Total: {form.difficultyMix.easy + form.difficultyMix.medium + form.difficultyMix.hard}% (should be 100%)</p>
              </div>
            </div>
          </div>

          {/* Right — config */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5 sticky top-20 shadow-sm">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <span className="w-5 h-5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md flex items-center justify-center text-[10px] font-bold">4</span>
                Configuration
              </h2>

              <div>
                <FieldLabel>Number of Questions</FieldLabel>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <input type="number" value={form.questionCount} onChange={e => set('questionCount', parseInt(e.target.value))}
                    min={5} max={60}
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono transition-all" />
                  <span className="text-xs text-zinc-500">5–60</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Auto duration: ~{duration} min</p>
              </div>

              <div>
                <FieldLabel>Max Attempts per Student</FieldLabel>
                <input type="number" value={form.maxAttempts} onChange={e => set('maxAttempts', parseInt(e.target.value))}
                  min={1} max={5}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono transition-all" />
              </div>

              <div>
                <FieldLabel>Deadline (optional)</FieldLabel>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <input type="datetime-local" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono transition-all" />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Proctoring</span>
                </div>
                <button type="button" onClick={() => set('proctoringEnabled', !form.proctoringEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${form.proctoringEnabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.proctoringEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {!loading && <Brain className="w-4 h-4" />}
                Create Aptitude Test
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
