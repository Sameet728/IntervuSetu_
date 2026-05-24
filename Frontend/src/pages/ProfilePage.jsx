import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Card, Button, Input, Select } from '../components/ui/index'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../api/authAPI'
import toast from 'react-hot-toast'
import {
  User, Briefcase, GraduationCap, Code2, Target, Upload,
  Plus, X, Save, ArrowLeft, FileText, CheckCircle2, CreditCard
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
  })

  const [skills, setSkills] = useState(user?.skills || [])
  const [skillInput, setSkillInput] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

      await updateProfile(payload)
      setSaved(true)
      toast.success('Profile updated!')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 text-sm font-medium mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-zinc-900 dark:text-white text-xl font-bold font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>My Profile</h1>
                  {user?.plan === 'pro' ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800">PRO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">FREE</span>
                  )}
                </div>
                <p className="text-zinc-500 text-sm mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">

            {/* ── Basic Info ─────────────────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-500" />Basic Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
                <Input label="Phone Number" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </Card>

            {/* ── Background ─────────────────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-500" />Current Status
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { val: 'student',      icon: <GraduationCap className="w-4 h-4" />, label: 'Student' },
                  { val: 'professional', icon: <Briefcase     className="w-4 h-4" />, label: 'Professional' },
                ].map(({ val, icon, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => set('userType', val)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.userType === val
                        ? 'border-blue-600/50 bg-blue-600/10 text-blue-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>

              {form.userType === 'student' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <Input label="College / University" value={form.college} onChange={e => set('college', e.target.value)} placeholder="MIT, IIT Bombay, etc." />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Branch / Major" value={form.branch} onChange={e => set('branch', e.target.value)} placeholder="Computer Science" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">Year</label>
                    <div className="grid grid-cols-4 gap-1">
                      {YEARS.map(y => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => set('year', y)}
                          className={`py-2 text-xs font-medium rounded border transition-all ${
                            form.year === y ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Company" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Current Employer" />
                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">Years of Experience</label>
                    <input
                      type="number"
                      min={0} max={40}
                      value={form.yearsOfExperience}
                      onChange={e => set('yearsOfExperience', parseInt(e.target.value))}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* ── Career Goals ───────────────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-500" />Career Goals
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Target Role" value={form.targetRole} onChange={e => set('targetRole', e.target.value)} placeholder="Senior Software Engineer" />
                <Select label="Target Level" value={form.experienceLevel} onChange={e => set('experienceLevel', e.target.value)}>
                  <option value="">Select level...</option>
                  {EXP_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              </div>
            </Card>

            {/* ── Skills ─────────────────────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-500" />Technical Skills
              </h2>

              <div className="flex gap-2 mb-3">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput) } }}
                  placeholder="Type skill and press Enter..."
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
                <Button type="button" variant="secondary" onClick={() => addSkill(skillInput)}>
                  Add
                </Button>
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {skills.map(s => (
                    <motion.span
                      key={s}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-md px-2.5 py-1 text-xs"
                    >
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="hover:text-red-500 dark:hover:text-red-400 mt-0.5 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </div>
              )}

              <div>
                <p className="text-xs text-zinc-500 mb-2">Suggested skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 15).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="text-[11px] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-800 hover:text-zinc-800 dark:text-zinc-200 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── Resume ─────────────────────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-500" />Resume
              </h2>

              {user?.resumeUrl && !resumeFile && (
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">Current Resume Active</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{user.resumeOriginalName || 'resume.pdf'}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Replace
                  </Button>
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-zinc-500 hover:bg-zinc-900/50 transition-all group"
              >
                <Upload className="w-6 h-6 text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 mx-auto mb-2 transition-colors" />
                {resumeFile ? (
                  <>
                    <p className="text-sm font-medium text-green-400">{resumeFile.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">Click to upload new resume</p>
                    <p className="text-xs text-zinc-600 mt-1">PDF Only · Max 5MB</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </Card>

            {/* ── Transaction History ────────────────────────────────────── */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-500" />Transaction History
              </h2>
              {(!user?.transactions || user.transactions.length === 0) ? (
                <div className="text-sm text-zinc-500 text-center py-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  No past transactions.
                </div>
              ) : (
                <div className="space-y-3">
                  {user.transactions.map((t, i) => (
                    <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">
                          Order: <span className="font-mono text-xs">{t.orderId}</span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(t.date).toLocaleDateString()} at {new Date(t.date).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="mt-2 sm:mt-0 text-right">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {t.currency === 'INR' ? '₹' : t.currency} {t.amount}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${t.status === 'success' ? 'text-green-500' : 'text-amber-500'}`}>
                          {t.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── Save ───────────────────────────────────────────────────── */}
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
              size="lg"
              className={`w-full py-3 ${saved ? '!bg-green-600 hover:!bg-green-700' : ''}`}
            >
              {saved ? <><CheckCircle2 className="w-4 h-4" />Saved Successfully</> : <><Save className="w-4 h-4" />Save Profile Settings</>}
            </Button>

          </form>
        </motion.div>
      </div>
    </div>
  )
}
