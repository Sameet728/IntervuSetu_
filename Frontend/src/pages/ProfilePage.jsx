import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { Card, Button, Input, Select, StatusBadge } from '../components/ui/index'
import { useAuth } from '../context/AuthContext'
import { updateProfile, testGroqKey } from '../api/authAPI'
import { usePageEnter } from '../motion/index'
import toast from 'react-hot-toast'
import {
  User, Briefcase, GraduationCap, Code2, Target, Upload,
  X, Save, ArrowLeft, FileText, CheckCircle2, CreditCard,
  Cpu, Key, ExternalLink, Zap, Check, AlertCircle, Eye, EyeOff,
  Plus, Sparkles,
} from 'lucide-react'

const SKILL_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++',
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express',
  'Django', 'FastAPI', 'Spring Boot', 'MongoDB', 'PostgreSQL',
  'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'System Design', 'Algorithms',
]

const YEARS = ['FE', 'SE', 'TE', 'BE']
const EXP_LEVELS = [
  { value: 'fresher', label: 'Fresher (0 yrs)' },
  { value: 'junior',  label: 'Junior (1-2 yrs)' },
  { value: 'mid',     label: 'Mid (3-5 yrs)' },
  { value: 'senior',  label: 'Senior (5-8 yrs)' },
  { value: 'lead',    label: 'Lead (8+ yrs)' },
]

const SECTION_TONE = {
  accent:  'bg-accent-soft text-accent',
  ai:      'bg-ai-soft text-ai',
  success: 'bg-success-soft text-success-500',
  warning: 'bg-warning-soft text-warning-500',
  neutral: 'bg-inset text-muted',
}

const SECTIONS = [
  { id: 'profile-basic',   label: 'Basic info',   Icon: User },
  { id: 'profile-status',  label: 'Status',       Icon: Briefcase },
  { id: 'profile-goals',   label: 'Career goals', Icon: Target },
  { id: 'profile-skills',  label: 'Skills',       Icon: Code2 },
  { id: 'profile-resume',  label: 'Resume',       Icon: FileText },
  { id: 'profile-billing', label: 'Transactions', Icon: CreditCard },
  { id: 'profile-ai',      label: 'AI engine',    Icon: Cpu },
]

function Section({ id, icon: Icon, tone = 'accent', title, description, action, children }) {
  return (
    <Card id={id} className="scroll-mt-28 overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${SECTION_TONE[tone] || SECTION_TONE.accent}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="t-h3 leading-tight">{title}</h2>
            {description && <p className="t-xs mt-1">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-5">{children}</div>
    </Card>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    userType: user?.userType || 'professional',
    college: user?.college || '',
    year: user?.year || '',
    branch: user?.branch || '',
    company: user?.company || '',
    yearsOfExperience: user?.yearsOfExperience || 0,
    targetRole: user?.targetRole || '',
    experienceLevel: user?.experienceLevel || '',
    preferredAIEngine: user?.preferredAIEngine || localStorage.getItem('intervusetu_ai_engine') || 'groq',
    groqApiKey: user?.groqApiKey || localStorage.getItem('intervusetu_groq_key') || '',
  })

  const [skills, setSkills] = useState(user?.skills || [])
  const [skillInput, setSkillInput] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testingGroq, setTestingGroq] = useState(false)
  const [groqStatus, setGroqStatus] = useState(null)
  const [showGroqKey, setShowGroqKey] = useState(false)

  const enterRef = usePageEnter([])

  const handleTestGroq = async () => {
    if (!form.groqApiKey.trim()) {
      toast.error('Please enter a Groq API key first')
      return
    }
    setTestingGroq(true)
    setGroqStatus(null)
    try {
      const res = await testGroqKey(form.groqApiKey.trim())
      if (res.data?.success) {
        toast.success('Groq API Key is valid and working!')
        setGroqStatus({ success: true, message: res.data.message })
      } else {
        toast.error(res.data?.message || 'Invalid Groq API Key')
        setGroqStatus({ success: false, message: res.data?.message })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Groq connection failed')
      setGroqStatus({ success: false, message: err.response?.data?.message || err.message })
    } finally {
      setTestingGroq(false)
    }
  }

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const addSkill = (s) => {
    const t = s.trim()
    if (t && !skills.includes(t) && skills.length < 15) {
      setSkills(p => [...p, t])
    }
    setSkillInput('')
  }

  const removeSkill = (s) => setSkills(p => p.filter(x => x !== s))

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Resume must be under 5MB'); return }
    setResumeFile(f)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }

    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      skills.forEach(s => fd.append('skills[]', s))
      if (resumeFile) fd.append('resume', resumeFile)

      let payload = resumeFile ? fd : { ...form, skills }

      localStorage.setItem('intervusetu_ai_engine', form.preferredAIEngine)
      if (form.groqApiKey) {
        localStorage.setItem('intervusetu_groq_key', form.groqApiKey)
      }

      await updateProfile(payload)
      setSaved(true)
      toast.success('Profile & AI Settings updated!')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const isGroq = form.preferredAIEngine === 'groq'
  const isStudent = form.userType === 'student'
  const resumeState = resumeFile ? resumeFile.name : user?.resumeUrl ? (user.resumeOriginalName || 'Resume on file') : 'Not uploaded'

  const metaChips = [
    isStudent
      ? { Icon: GraduationCap, text: form.college ? `${form.college}${form.year ? ` · ${form.year}` : ''}` : 'Student' }
      : { Icon: Briefcase, text: form.company || 'Professional' },
    form.targetRole && { Icon: Target, text: form.targetRole },
    { Icon: isGroq ? Zap : Cpu, text: isGroq ? 'Groq engine' : 'Local Qwen' },
  ].filter(Boolean)

  const saveLabel = saved ? 'Saved successfully' : 'Save profile settings'

  return (
    <div className="page-shell text-ink">
      <Navbar />

      <main ref={enterRef} className="container-page max-w-6xl pb-24 pt-[calc(var(--nav-h)+1.5rem)]">
        {/* ── Back ───────────────────────────────────────────────── */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost btn-sm -ml-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
          </button>
        </div>

        {/* ── Profile hero ───────────────────────────────────────── */}
        <header
          data-enter
          className="relative mb-5 overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface via-surface to-ai-soft/35 p-5 sm:p-7"
        >
          <div aria-hidden className="line-grid pointer-events-none absolute inset-0 opacity-55 [mask-image:radial-gradient(80%_90%_at_90%_0%,black,transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-ai/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-ai text-2xl font-semibold text-white shadow-2" aria-hidden>
                {form.name?.[0]?.toUpperCase() || 'U'}
              </span>
              <div className="min-w-0">
                <p className="eyebrow mb-1">My profile</p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="t-h1 break-words">{form.name.trim() || 'Your profile'}</h1>
                  <span className={user?.plan === 'pro' ? 'badge badge-accent' : 'badge'}>
                    {user?.plan === 'pro' ? 'Pro plan' : 'Free plan'}
                  </span>
                </div>
                <p className="t-sm mt-0.5 truncate">{user?.email}</p>
              </div>
            </div>

            <ul className="flex flex-wrap gap-1.5 sm:max-w-xs sm:justify-end">
              {metaChips.map(({ Icon, text }, i) => (
                <li key={`${text}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-hairline bg-surface/80 px-2.5 py-1.5 text-2xs font-medium text-muted shadow-1 backdrop-blur">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                  <span className="truncate">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <nav aria-label="Jump to profile section" className="mb-4 lg:hidden">
          <ul className="flex gap-1.5 overflow-x-auto pb-1">
            {SECTIONS.map(({ id, label, Icon }) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  className="chip gap-1.5 whitespace-nowrap text-2xs transition-colors duration-fast hover:border-hairline-strong hover:text-ink"
                >
                  <Icon className="h-3 w-3 text-faint" aria-hidden />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* ── Settings form ──────────────────────────────────────── */}
          <form id="profile-form" onSubmit={handleSave} className="min-w-0 space-y-4">
            <Section
              id="profile-basic"
              icon={User}
              title="Basic information"
              description="How we address you and reach you."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" autoComplete="name" />
                <Input label="Phone number" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
              </div>
            </Section>

            <Section
              id="profile-status"
              icon={Briefcase}
              title="Current status"
              description="This sets the default context for generated rounds."
              tone="ai"
            >
              <div role="group" aria-label="Are you a student or a professional" className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  { val: 'student',      Icon: GraduationCap, label: 'Student',      desc: 'Projects, internships and placements' },
                  { val: 'professional', Icon: Briefcase,     label: 'Professional', desc: 'Full-time roles and career moves' },
                ].map(({ val, Icon, label, desc }) => {
                  const active = form.userType === val
                  return (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={active}
                      onClick={() => set('userType', val)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-fast ${
                        active
                          ? 'border-accent/45 bg-accent-soft/50 shadow-1'
                          : 'border-hairline bg-inset hover:border-hairline-strong'
                      }`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-accent-soft text-accent' : 'bg-canvas text-faint'}`}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{label}</span>
                          {active && (
                            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent text-accent-on" aria-hidden>
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-2xs text-subtle">{desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {isStudent ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Input label="College / University" value={form.college} onChange={e => set('college', e.target.value)} placeholder="MIT, IIT Bombay, etc." />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Branch / Major" value={form.branch} onChange={e => set('branch', e.target.value)} placeholder="Computer Science" />
                  </div>
                  <div>
                    <span className="field-label mb-1.5 block">Year</span>
                    <div role="group" aria-label="Academic year" className="grid grid-cols-4 gap-1">
                      {YEARS.map(y => (
                        <button
                          key={y}
                          type="button"
                          aria-pressed={form.year === y}
                          onClick={() => set('year', y)}
                          className={`rounded-lg border py-2.5 text-xs font-medium transition-all duration-fast ${
                            form.year === y
                              ? 'border-accent/45 bg-accent-soft/60 text-accent'
                              : 'border-hairline bg-inset text-muted hover:border-hairline-strong hover:text-ink'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Company" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Current Employer" autoComplete="organization" />
                  <Input
                    label="Years of experience"
                    type="number"
                    min={0}
                    max={40}
                    value={form.yearsOfExperience}
                    onChange={e => set('yearsOfExperience', parseInt(e.target.value))}
                  />
                </div>
              )}
            </Section>

            <Section
              id="profile-goals"
              icon={Target}
              title="Career goals"
              description="Where the next role should take you."
              tone="warning"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Target role" value={form.targetRole} onChange={e => set('targetRole', e.target.value)} placeholder="Senior Software Engineer" />
                <Select label="Target level" value={form.experienceLevel} onChange={e => set('experienceLevel', e.target.value)}>
                  <option value="">Select level…</option>
                  {EXP_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              </div>
            </Section>

            <Section
              id="profile-skills"
              icon={Code2}
              title="Technical skills"
              description="The generator anchors technical questions to these."
              action={<span className="num text-2xs text-subtle">{skills.length}/15</span>}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput) } }}
                  placeholder="Type a skill and press Enter"
                  aria-label="Add a skill"
                  className="input min-w-0 flex-1"
                />
                <Button type="button" variant="secondary" onClick={() => addSkill(skillInput)} icon={<Plus className="h-4 w-4" aria-hidden />}>
                  Add
                </Button>
              </div>

              {skills.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {skills.map(s => (
                    <li key={s} className="inline-flex items-center gap-1.5 rounded-md border border-accent/25 bg-accent-soft/40 px-2.5 py-1 text-xs text-ink">
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(s)}
                        aria-label={`Remove ${s}`}
                        className="-mr-1 grid h-5 w-5 place-items-center rounded text-subtle transition-colors duration-fast hover:bg-danger-soft hover:text-danger-500"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-hairline-strong bg-inset px-3 py-2.5 text-2xs text-subtle">
                  No skills yet — add at least three for sharper, stack-specific questions.
                </p>
              )}

              <div className="mt-4">
                <p className="t-xs mb-2">Suggested skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 15).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="chip text-2xs transition-colors duration-fast hover:border-hairline-strong hover:text-ink"
                    >
                      <Plus className="h-3 w-3 text-faint" aria-hidden /> {s}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section
              id="profile-resume"
              icon={FileText}
              title="Resume"
              description="Used for resume-aware follow-ups and role matching."
              tone="success"
              action={user?.resumeUrl ? <StatusBadge tone="live">On file</StatusBadge> : null}
            >
              {user?.resumeUrl && !resumeFile && (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-hairline bg-inset px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success-500">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">Current resume active</p>
                    <p className="mt-0.5 truncate text-xs text-subtle">{user.resumeOriginalName || 'resume.pdf'}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Replace
                  </Button>
                </div>
              )}

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload a new resume"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
                className="group cursor-pointer rounded-xl border border-dashed border-hairline-strong bg-inset p-6 text-center transition-colors duration-fast hover:border-accent/50 hover:bg-accent-soft/20"
              >
                <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-canvas text-subtle transition-colors group-hover:text-accent">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                {resumeFile ? (
                  <>
                    <p className="text-sm font-medium text-success-500">{resumeFile.name}</p>
                    <p className="num mt-1 text-xs text-subtle">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB · ready to upload</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">Click to upload a new resume</p>
                    <p className="t-xs mt-1">PDF only · Max 5 MB</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </Section>

            <Section
              id="profile-billing"
              icon={CreditCard}
              title="Transaction history"
              description="Plan and payment records for this account."
              tone="neutral"
              action={<span className={user?.plan === 'pro' ? 'badge badge-accent' : 'badge'}>{user?.plan === 'pro' ? 'Pro' : 'Free'}</span>}
            >
              {(!user?.transactions || user.transactions.length === 0) ? (
                <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-hairline-strong bg-inset px-4 py-5 text-center">
                  <CreditCard className="h-5 w-5 text-faint" aria-hidden />
                  <p className="mt-1 text-sm text-muted">No past transactions</p>
                  <p className="text-2xs text-subtle">Purchases and plan changes will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {user.transactions.map((tx, i) => (
                    <li key={i} className="flex flex-col items-start justify-between gap-2 rounded-lg border border-hairline bg-inset p-3.5 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-subtle">
                          <CreditCard className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="mb-0.5 text-sm font-medium text-ink">
                            Order <span className="num text-xs text-subtle">{tx.orderId}</span>
                          </p>
                          <p className="num text-xs text-subtle">
                            {new Date(tx.date).toLocaleDateString()} · {new Date(tx.date).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                        <p className="num text-sm font-semibold text-ink">
                          {tx.currency === 'INR' ? '₹' : `${tx.currency} `}{tx.amount}
                        </p>
                        <span className={`badge ${tx.status === 'success' ? 'badge-success' : 'badge-warning'}`}>
                          {tx.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              id="profile-ai"
              icon={Cpu}
              title="AI model engine"
              description="Choose which model generates questions and synthesises the final report."
              tone="ai"
              action={
                <span className={`badge ${isGroq ? 'badge-accent' : 'badge-ai'}`}>
                  {isGroq ? <Zap className="h-3 w-3" aria-hidden /> : <Cpu className="h-3 w-3" aria-hidden />}
                  {isGroq ? 'Groq LPU' : 'Local Qwen'}
                </span>
              }
            >
              <div role="group" aria-label="AI model engine" className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={isGroq}
                  onClick={() => set('preferredAIEngine', 'groq')}
                  className={`rounded-xl border p-4 text-left transition-all duration-fast ${
                    isGroq ? 'border-accent/45 bg-accent-soft/50 shadow-1' : 'border-hairline bg-inset hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${isGroq ? 'bg-accent-soft text-accent' : 'bg-canvas text-faint'}`}>
                        <Zap className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">Groq cloud</span>
                        <span className="block text-2xs text-subtle">Llama 3.3 70B &amp; 3.1 8B</span>
                      </span>
                    </div>
                    {isGroq && (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-on" aria-hidden>
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-2xs leading-relaxed text-subtle">Ultra-fast question synthesis and deep evaluation reasoning.</p>
                </button>

                <button
                  type="button"
                  aria-pressed={!isGroq}
                  onClick={() => set('preferredAIEngine', 'qwen_local')}
                  className={`rounded-xl border p-4 text-left transition-all duration-fast ${
                    !isGroq ? 'border-ai/45 bg-ai-soft/50 shadow-1' : 'border-hairline bg-inset hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${!isGroq ? 'bg-ai-soft text-ai' : 'bg-canvas text-faint'}`}>
                        <Cpu className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">Local Qwen</span>
                        <span className="block text-2xs text-subtle">Qwen 2.5 · on-device</span>
                      </span>
                    </div>
                    {!isGroq && (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ai text-white" aria-hidden>
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-2xs leading-relaxed text-subtle">Runs on this machine — no cloud tokens, works offline.</p>
                </button>
              </div>

              {isGroq ? (
                <div className="space-y-3 rounded-xl border border-hairline bg-inset p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="groq-key" className="field-label flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-accent" aria-hidden />
                      Groq API key
                    </label>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="t-xs flex shrink-0 items-center gap-1 font-medium text-accent transition-colors duration-fast hover:text-accent-hover"
                    >
                      Get free key <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <input
                        id="groq-key"
                        type={showGroqKey ? 'text' : 'password'}
                        value={form.groqApiKey}
                        onChange={(e) => set('groqApiKey', e.target.value)}
                        placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        autoComplete="off"
                        aria-label="Groq API key"
                        className="input num pr-11 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(p => !p)}
                        aria-label={showGroqKey ? 'Hide API key' : 'Show API key'}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        <span className="btn-icon h-8 w-8">
                          {showGroqKey ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                        </span>
                      </button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={testingGroq}
                      disabled={testingGroq || !form.groqApiKey.trim()}
                      onClick={handleTestGroq}
                      className="shrink-0"
                    >
                      Test key
                    </Button>
                  </div>

                  {groqStatus && (
                    <div className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
                      groqStatus.success
                        ? 'border-success-500/25 bg-success-soft text-success-500'
                        : 'border-danger-500/25 bg-danger-soft text-danger-500'
                    }`}>
                      {groqStatus.success
                        ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                        : <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />}
                      <span>{groqStatus.message}</span>
                    </div>
                  )}

                  <p className="t-xs">
                    Your API key is saved with your account and used to generate questions and reports via Groq Llama 3.3.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-ai/25 bg-ai-soft/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <StatusBadge tone="live">On-device engine activated</StatusBadge>
                    <p className="t-xs mt-2">Questions and final reports run completely on-device, without cloud API calls.</p>
                  </div>
                  <Link
                    to="/offline-ai"
                    className="t-xs flex shrink-0 items-center gap-1 font-medium text-ai transition-colors duration-fast hover:underline"
                  >
                    Manage Model Hub <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              )}
            </Section>

            <p aria-live="polite" className="sr-only">
              {saving ? 'Saving your profile…' : saved ? 'Profile saved' : ''}
            </p>

            <div className="pt-1 lg:hidden">
              <Button type="submit" loading={saving} disabled={saving} size="lg" block variant={saved ? 'secondary' : 'primary'}>
                {saved
                  ? <><CheckCircle2 className="h-4 w-4" aria-hidden /> Saved successfully</>
                  : <><Save className="h-4 w-4" aria-hidden /> Save profile settings</>}
              </Button>
            </div>
          </form>

          {/* ── Sticky account rail ─────────────────────────────────── */}
          <aside className="hidden min-w-0 space-y-4 lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:block">
            <Card className="overflow-hidden">
              <div className="hairline-b bg-gradient-to-br from-surface to-accent-soft/35 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-ai text-sm font-semibold text-white" aria-hidden>
                    {form.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{form.name.trim() || 'Your profile'}</p>
                    <p className="truncate text-2xs text-subtle">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={user?.plan === 'pro' ? 'badge badge-accent' : 'badge'}>
                    {user?.plan === 'pro' ? 'Pro plan' : 'Free plan'}
                  </span>
                  <span className="badge capitalize">{isStudent ? 'Student' : 'Professional'}</span>
                </div>
              </div>

              <div className="p-4">
                <dl className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-subtle"><Target className="h-3.5 w-3.5 text-faint" aria-hidden /> Target role</dt>
                    <dd className="truncate text-right font-medium text-ink">{form.targetRole || 'Not set'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-subtle"><Code2 className="h-3.5 w-3.5 text-faint" aria-hidden /> Skills</dt>
                    <dd className="num font-medium text-ink">{skills.length} added</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-subtle"><FileText className="h-3.5 w-3.5 text-faint" aria-hidden /> Resume</dt>
                    <dd className="max-w-[9rem] truncate text-right font-medium text-ink">{resumeState}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-subtle"><Cpu className="h-3.5 w-3.5 text-faint" aria-hidden /> AI engine</dt>
                    <dd className="font-medium text-ink">{isGroq ? 'Groq LPU' : 'Local Qwen'}</dd>
                  </div>
                </dl>

                <Button
                  type="submit"
                  form="profile-form"
                  className="mt-4 hidden w-full lg:inline-flex"
                  size="lg"
                  loading={saving}
                  disabled={saving}
                  variant={saved ? 'secondary' : 'primary'}
                  icon={saved ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                >
                  {saveLabel}
                </Button>
                <p className="mt-2 hidden text-center text-2xs text-subtle lg:block">
                  Changes apply to your next generated round.
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <p className="eyebrow mb-2.5">On this page</p>
              <nav aria-label="Profile sections">
                <ul className="grid grid-cols-2 gap-1 lg:grid-cols-1">
                  {SECTIONS.map(({ id, label, Icon }) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted transition-colors duration-fast hover:bg-inset hover:text-ink"
                      >
                        <Icon className="h-3.5 w-3.5 text-faint" aria-hidden />
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </Card>

            <div className="rounded-xl border border-dashed border-hairline-strong bg-inset/60 p-4">
              <p className="flex items-center gap-1.5 text-2xs font-semibold text-ink">
                <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
                Better inputs, sharper rounds
              </p>
              <p className="mt-1.5 text-2xs leading-relaxed text-subtle">
                Your role, level, skills and resume shape the generated questions — keep them current.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
