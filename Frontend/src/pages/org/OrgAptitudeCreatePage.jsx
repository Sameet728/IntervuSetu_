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

const CATS = ['numerical', 'verbal', 'logical', 'situational']

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-mono text-slate-400 mb-1.5">
      {children}{required && <span className="text-rose ml-0.5">*</span>}
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
      <div className="min-h-screen bg-void flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald/10 border border-emerald/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald" />
          </div>
          <h2 className="font-display font-bold text-2xl text-zinc-900 dark:text-white mb-2">Test Created!</h2>
          <p className="text-slate-400 font-body text-sm mb-6">
            Share the link with students. They'll need an account to take the test.
          </p>

          <div className="bg-surface border border-border rounded-xl p-4 mb-4 text-left">
            <p className="text-[10px] font-mono text-slate-500 mb-2">JOIN LINK</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-cyan font-mono break-all">{created.joinUrl}</code>
              <button onClick={copyLink}
                className={`flex-shrink-0 p-2 rounded-lg border transition-all ${copied ? 'border-emerald/30 bg-emerald/10 text-emerald' : 'border-border text-slate-500 hover:border-cyan/30 hover:text-cyan'}`}>
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 mb-6 text-left">
            <p className="text-[10px] font-mono text-slate-500 mb-3">TEST CONFIG</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-body">
              <div className="flex items-center gap-1 text-slate-400"><Hash className="w-3 h-3" />{created.questionCount} Questions</div>
              <div className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" />{created.duration} Minutes</div>
              {created.deadline && <div className="flex items-center gap-1 text-slate-400 col-span-2"><Calendar className="w-3 h-3" />Deadline: {new Date(created.deadline).toLocaleDateString()}</div>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {created.categories?.map(c => (
                <span key={c} className="text-[10px] font-mono px-2 py-0.5 bg-violet/10 text-violet border border-violet/20 rounded-full capitalize">{c}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/org/dashboard')}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm text-slate-400 hover:border-slate-600 transition-all font-body">
              ← Dashboard
            </button>
            <button onClick={() => navigate(`/org/aptitude/${created._id}/results`)}
              className="flex-1 py-2.5 bg-gradient-to-r from-violet to-cyan text-void font-display font-bold text-sm rounded-xl hover:shadow-lg transition-all">
              View Results
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/org/dashboard')} className="text-slate-500 hover:text-zinc-900 dark:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-0.5 h-4 bg-border" />
          <Brain className="w-4 h-4 text-indigo-400" />
          <span className="font-display font-semibold text-zinc-900 dark:text-white text-sm">Create Aptitude Test</span>
          <div className="ml-auto text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber" />
            Auto-duration: ~{duration} min
          </div>
        </div>
      </nav>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left — main fields */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic Info */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display font-semibold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-md flex items-center justify-center text-[10px] font-bold">1</span>
                Basic Info
              </h2>
              <div className="space-y-4">
                <div>
                  <FieldLabel required>Test Title</FieldLabel>
                  <input value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="e.g., Campus Recruitment — Aptitude Round 2025"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500/40 placeholder-slate-600 font-body"
                    required />
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <input value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="Brief description shown to students on the join page"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500/40 placeholder-slate-600 font-body" />
                </div>
                <div>
                  <FieldLabel>Instructions for Students</FieldLabel>
                  <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
                    placeholder="e.g., Read each question carefully. Do not use a calculator. Switching tabs will be recorded..."
                    rows={3}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500/40 placeholder-slate-600 font-body resize-none" />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display font-semibold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-md flex items-center justify-center text-[10px] font-bold">2</span>
                Categories
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {CATS.map(cat => {
                  const active = form.categories.includes(cat)
                  const icons = { numerical: '🔢', verbal: '📖', logical: '🧩', situational: '🎯' }
                  return (
                    <button key={cat} type="button" onClick={() => toggleCat(cat)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${active ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-border text-slate-500 hover:border-indigo-500/30'}`}>
                      <span className="text-xl">{icons[cat]}</span>
                      <div>
                        <p className={`text-sm font-body font-semibold capitalize ${active ? 'text-indigo-300' : 'text-slate-400'}`}>{cat}</p>
                        <p className="text-[10px] text-slate-600">Reasoning</p>
                      </div>
                      {active && <CheckCircle2 className="w-4 h-4 text-indigo-400 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Difficulty Mix */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display font-semibold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-md flex items-center justify-center text-[10px] font-bold">3</span>
                Difficulty Mix
              </h2>
              <div className="space-y-4">
                {[
                  { key: 'easy', label: 'Easy', color: 'text-emerald', bar: 'bg-emerald' },
                  { key: 'medium', label: 'Medium', color: 'text-amber', bar: 'bg-amber' },
                  { key: 'hard', label: 'Hard', color: 'text-rose', bar: 'bg-rose' },
                ].map(({ key, label, color, bar }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1.5">
                      <span className={`text-xs font-mono ${color}`}>{label}</span>
                      <span className="text-xs font-mono text-slate-400">{form.difficultyMix[key]}%</span>
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
                      className="w-full accent-indigo-400" />
                    <div className="h-1 bg-surface rounded-full mt-1">
                      <div className={`h-1 rounded-full ${bar}`} style={{ width: `${form.difficultyMix[key]}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-slate-600">Total: {form.difficultyMix.easy + form.difficultyMix.medium + form.difficultyMix.hard}% (should be 100%)</p>
              </div>
            </div>
          </div>

          {/* Right — config */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 sticky top-20">
              <h2 className="font-display font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 bg-cyan/20 text-cyan rounded-md flex items-center justify-center text-[10px] font-bold">4</span>
                Configuration
              </h2>

              <div>
                <FieldLabel>Number of Questions</FieldLabel>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <input type="number" value={form.questionCount} onChange={e => set('questionCount', parseInt(e.target.value))}
                    min={5} max={60}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan/40 font-mono" />
                  <span className="text-xs text-slate-500">5–60</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Auto duration: ~{duration} min</p>
              </div>

              <div>
                <FieldLabel>Max Attempts per Student</FieldLabel>
                <input type="number" value={form.maxAttempts} onChange={e => set('maxAttempts', parseInt(e.target.value))}
                  min={1} max={5}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan/40 font-mono" />
              </div>

              <div>
                <FieldLabel>Deadline (optional)</FieldLabel>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <input type="datetime-local" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan/40 font-mono" />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-body text-slate-400">Proctoring</span>
                </div>
                <button type="button" onClick={() => set('proctoringEnabled', !form.proctoringEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-all ${form.proctoringEnabled ? 'bg-emerald' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.proctoringEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet text-white font-display font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating test...</>
                ) : (
                  <><Brain className="w-4 h-4" />Create Aptitude Test</>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
