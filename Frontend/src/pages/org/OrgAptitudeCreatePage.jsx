import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { createOrgAptitudeTest } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  ArrowLeft, Brain, Clock, Hash, Shield, Calendar,
  Loader2, Copy, CheckCircle2, AlertTriangle, ChevronRight,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Button } from '../../components/ui/index'

const CATS = ['numerical', 'verbal', 'logical', 'situational']

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4" style={{ fontFamily: 'Inter, system-ui' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Test Created!</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Share the link with students. They'll need an account to take the test.
          </p>

          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4 text-left">
            <p className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">JOIN LINK</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono break-all bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1.5 rounded">{created.joinUrl}</code>
              <button onClick={copyLink}
                className={`flex-shrink-0 p-2 rounded-lg border transition-all ${copied ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-indigo-200 hover:text-indigo-600 dark:hover:border-indigo-500/30 dark:hover:text-indigo-400'}`}>
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-[10px] font-semibold text-zinc-500 mb-3 uppercase tracking-wider">TEST CONFIG</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-zinc-400" />{created.questionCount} Questions</div>
              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-400" />{created.duration} Minutes</div>
              {created.deadline && <div className="flex items-center gap-1.5 col-span-2"><Calendar className="w-3.5 h-3.5 text-zinc-400" />Deadline: {new Date(created.deadline).toLocaleDateString()}</div>}
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {created.categories?.map(c => (
                <span key={c} className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30 rounded-md capitalize shadow-sm">{c}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/org/dashboard')}
              className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              ← Dashboard
            </button>
            <button onClick={() => navigate(`/org/aptitude/${created._id}/results`)}
              className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
              View Results
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col" style={{ fontFamily: 'Inter, system-ui' }}>
      <OrgNavbar />

      <div className="max-w-4xl mx-auto px-4 py-8 pt-24 w-full flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/org/dashboard')} className="p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                 <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Create Aptitude Test
              </h1>
              <p className="text-sm text-zinc-500">Assess cognitive skills and reasoning</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-400">
            <Clock className="w-3.5 h-3.5" />
            Auto-duration: ~{duration} min
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Left — main fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="w-6 h-6 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md flex items-center justify-center text-[11px] font-bold">1</span>
                  Basic Info
                </h2>
                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Test Title</FieldLabel>
                    <input value={form.title} onChange={e => set('title', e.target.value)}
                      placeholder="e.g., Campus Recruitment — Aptitude Round 2025"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all"
                      required />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <input value={form.description} onChange={e => set('description', e.target.value)}
                      placeholder="Brief description shown to students on the join page"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all" />
                  </div>
                  <div>
                    <FieldLabel>Instructions for Students</FieldLabel>
                    <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
                      placeholder="e.g., Read each question carefully. Do not use a calculator. Switching tabs will be recorded..."
                      rows={3}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all resize-none" />
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="w-6 h-6 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md flex items-center justify-center text-[11px] font-bold">2</span>
                  Categories
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {CATS.map(cat => {
                    const active = form.categories.includes(cat)
                    const icons = { numerical: '🔢', verbal: '📖', logical: '🧩', situational: '🎯' }
                    return (
                      <button key={cat} type="button" onClick={() => toggleCat(cat)}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${active ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-900'}`}>
                        <span className="text-xl">{icons[cat]}</span>
                        <div>
                          <p className={`text-sm font-semibold capitalize ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-600 dark:text-zinc-400'}`}>{cat}</p>
                          <p className="text-[10px] text-zinc-500">Reasoning</p>
                        </div>
                        {active && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Difficulty Mix */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="w-6 h-6 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md flex items-center justify-center text-[11px] font-bold">3</span>
                  Difficulty Mix
                </h2>
                <div className="space-y-4">
                  {[
                    { key: 'easy', label: 'Easy', color: 'text-emerald-600 dark:text-emerald-500', bar: 'bg-emerald-500' },
                    { key: 'medium', label: 'Medium', color: 'text-amber-600 dark:text-amber-500', bar: 'bg-amber-500' },
                    { key: 'hard', label: 'Hard', color: 'text-rose-600 dark:text-rose-500', bar: 'bg-rose-500' },
                  ].map(({ key, label, color, bar }) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1.5">
                        <span className={`text-xs font-mono font-medium ${color}`}>{label}</span>
                        <span className="text-xs font-mono text-zinc-500">{form.difficultyMix[key]}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={form.difficultyMix[key]}
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
                        className="w-full accent-indigo-600 dark:accent-indigo-400" />
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${form.difficultyMix[key]}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-zinc-500 mt-2">Total: {form.difficultyMix.easy + form.difficultyMix.medium + form.difficultyMix.hard}% (should be 100%)</p>
                </div>
              </div>
            </div>

            {/* Right — config */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <span className="w-6 h-6 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-md flex items-center justify-center text-[11px] font-bold">4</span>
                  Configuration
                </h2>

                <div>
                  <FieldLabel>Number of Questions</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <input type="number" value={form.questionCount} onChange={e => set('questionCount', parseInt(e.target.value))}
                      min={5} max={60}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 font-mono transition-all" />
                    <span className="text-xs text-zinc-500 w-8">5–60</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1.5">Auto duration: ~{duration} min</p>
                </div>

                <div>
                  <FieldLabel>Max Attempts per Student</FieldLabel>
                  <div className="flex items-center gap-2">
                     <Users className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                     <input type="number" value={form.maxAttempts} onChange={e => set('maxAttempts', parseInt(e.target.value))}
                       min={1} max={5}
                       className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 font-mono transition-all" />
                     <span className="text-xs text-zinc-500 w-8">x</span>
                  </div>
                </div>

                <div>
                  <FieldLabel>Deadline (optional)</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <input type="datetime-local" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 font-mono transition-all" />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Proctoring</span>
                  </div>
                  <button type="button" onClick={() => set('proctoringEnabled', !form.proctoringEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${form.proctoringEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.proctoringEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <Button type="submit" disabled={loading} variant="primary"
                  className="w-full py-2.5 !bg-indigo-600 hover:!bg-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all mt-4">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Creating test...</>
                  ) : (
                    <><Brain className="w-4 h-4" />Create Aptitude Test</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
