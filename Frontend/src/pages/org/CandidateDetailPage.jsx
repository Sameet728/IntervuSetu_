import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getCandidateDetail, updateCandidateStatus } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  ArrowLeft, User, FileText, Shield, Star, Clock, Code2, CheckCircle2,
  XCircle, AlertTriangle, ExternalLink, Download, ChevronRight, Loader2,
  MessageSquare, Brain, TrendingUp, Award, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

const BADGE_STYLES = {
  'Top Performer':       'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400',
  'Fast Solver':         'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400',
  'Strong Communicator': 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400',
  'Strong in DSA':       'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400',
}

const RECOMMENDATION_CONFIG = {
  strong_hire:    { label: 'Strong Hire',    color: 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10' },
  hire:           { label: 'Hire',           color: 'text-cyan-700 border-cyan-200 bg-cyan-50 dark:text-cyan-400 dark:border-cyan-500/30 dark:bg-cyan-500/10' },
  borderline:     { label: 'Borderline',     color: 'text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10' },
  no_hire:        { label: 'No Hire',        color: 'text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-400 dark:border-rose-500/30 dark:bg-rose-500/10' },
  strong_no_hire: { label: 'Strong No Hire', color: 'text-rose-800 border-rose-300 bg-rose-100 dark:text-rose-500 dark:border-rose-600/30 dark:bg-rose-900/10' },
}

const VIOLATION_LABELS = {
  no_face:         { label: 'No Face Detected',   icon: '👤' },
  multiple_faces:  { label: 'Multiple Faces',      icon: '👥' },
  fullscreen_exit: { label: 'Exited Fullscreen',   icon: '⛶' },
  tab_switch:      { label: 'Tab Switched',         icon: '🗂' },
  focus_lost:      { label: 'Focus Lost',           icon: '🔍' },
}

function ScoreCircle({ val, label, color = '#3b82f6', size = 64 }) {
  const pct = Math.min((val / 10) * 100, 100)
  const r = 24
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 60 60" className="-rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" className="drop-shadow-sm" />
      </svg>
      <span className="text-lg font-bold text-zinc-900 dark:text-white -mt-10" style={{ fontFamily: 'Poppins, sans-serif' }}>{val?.toFixed(1) ?? '—'}</span>
      <span className="text-[10px] font-mono text-zinc-500 mt-8 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function Tab({ id, active, onClick, icon, label }) {
  return (
    <button onClick={() => onClick(id)}
      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
        active ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
      }`}>
      {icon}{label}
    </button>
  )
}

const fmtTime = (s) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function CandidateDetailPage() {
  const { templateId, interviewId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [expandedQ, setExpandedQ] = useState(null)

  useEffect(() => {
    getCandidateDetail(templateId, interviewId)
      .then((res) => setData(res.data.data))
      .catch(() => toast.error('Failed to load candidate'))
      .finally(() => setLoading(false))
  }, [templateId, interviewId])

  const handleStatus = async (status) => {
    setUpdatingStatus(true)
    try {
      await updateCandidateStatus(templateId, interviewId, status)
      setData(prev => ({ ...prev, report: { ...prev.report, candidateStatus: status } }))
      toast.success(`Candidate marked as ${status}`)
    } catch { toast.error('Failed to update status') }
    finally { setUpdatingStatus(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500 font-medium">Candidate not found</p>
    </div>
  )

  const { candidate, interview, report } = data
  const rec = report?.recommendation ? RECOMMENDATION_CONFIG[report.recommendation] : null

  // Violation counts grouped by type
  const violationGroups = interview?.violations?.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col" style={{ fontFamily: 'Inter, system-ui' }}>
      <OrgNavbar />

      {/* Header Sticky */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-14 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/org/interview/${templateId}/leaderboard`)}
            className="p-1.5 -ml-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 overflow-hidden flex-shrink-0">
              {candidate.profilePicture
                ? <img src={candidate.profilePicture} alt="" className="w-full h-full object-cover" />
                : candidate.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{candidate.name}</p>
              <p className="text-xs font-mono text-zinc-500 truncate">{candidate.email}</p>
            </div>
          </div>

          {/* Badge */}
          {report?.badge && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1 shadow-sm ${BADGE_STYLES[report.badge]}`}>
              {report.badge}
            </span>
          )}

          {/* HR Status */}
          <div className="flex items-center gap-1">
            {['pending', 'shortlisted', 'selected', 'rejected'].map((s) => (
              <button key={s} onClick={() => handleStatus(s)} disabled={updatingStatus}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all disabled:opacity-50 ${
                  report?.candidateStatus === s
                    ? s === 'selected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 shadow-sm'
                    : s === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 shadow-sm'
                    : s === 'shortlisted' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 shadow-sm'
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        {/* Score summary row */}
        {report && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6 flex flex-wrap items-center gap-8 shadow-sm">
            <div className="flex gap-6 flex-wrap">
              <ScoreCircle val={report.overallScore} label="Overall" color="#3b82f6" />
              <ScoreCircle val={report.technicalScore} label="Technical" color="#8b5cf6" />
              <ScoreCircle val={report.communicationScore} label="Communication" color="#10b981" />
              <ScoreCircle val={report.problemSolvingScore} label="Problem Solving" color="#f59e0b" />
              {report.codeQualityScore != null && <ScoreCircle val={report.codeQualityScore} label="Code Quality" color="#ec4899" />}
            </div>
            <div className="flex-1 min-w-[280px] space-y-3 border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-800 pt-4 sm:pt-0 sm:pl-8">
              {rec && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-sm ${rec.color}`}>
                  {rec.label}
                </span>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{report.overallFeedback}</p>
              <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 mt-2 bg-zinc-50 dark:bg-zinc-950 inline-flex px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{fmtTime(interview.totalTimeTaken)}</span>
                {interview.violationCount > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500"><AlertTriangle className="w-3.5 h-3.5" />{interview.violationCount} violations</span>
                )}
                {interview.autoSubmitted && (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Auto-submitted</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <Tab id="profile"   active={activeTab === 'profile'}   onClick={setActiveTab} icon={<User className="w-4 h-4" />}       label="Profile" />
          <Tab id="report"    active={activeTab === 'report'}    onClick={setActiveTab} icon={<FileText className="w-4 h-4" />}    label="AI Report" />
          <Tab id="proctoring" active={activeTab === 'proctoring'} onClick={setActiveTab} icon={<Shield className="w-4 h-4" />}  label="Proctoring" />
        </div>

        {/* ── PROFILE TAB ─────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <p className="text-[10px] font-semibold text-zinc-500 mb-5 uppercase tracking-wider">CANDIDATE PROFILE</p>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 font-medium">Name</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{candidate.name}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 font-medium">Email</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{candidate.email}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 font-medium">Type</span>
                  <span className="text-zinc-700 dark:text-zinc-300 capitalize">{candidate.userType}</span>
                </div>
                {candidate.college && (
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-medium">College</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{candidate.college}</span>
                  </div>
                )}
                {candidate.year && (
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-medium">Year</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{candidate.year} — {candidate.branch}</span>
                  </div>
                )}
                {candidate.company && (
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-medium">Company</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{candidate.company}</span>
                  </div>
                )}
                {candidate.yearsOfExperience > 0 && (
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-medium">Experience</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{candidate.yearsOfExperience} years</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 font-medium">Level</span>
                  <span className="text-zinc-700 dark:text-zinc-300 capitalize">{candidate.experienceLevel || '—'}</span>
                </div>
                {candidate.targetRole && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Target Role</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{candidate.targetRole}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Skills */}
              {candidate.skills?.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-[10px] font-semibold text-zinc-500 mb-4 uppercase tracking-wider">SKILLS</p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((sk) => (
                      <span key={sk} className="text-[11px] font-mono bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 px-2.5 py-1 rounded-full shadow-sm">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-500 mb-4 uppercase tracking-wider">RESUME</p>
                {candidate.resumeUrl ? (
                  <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${candidate.resumeUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline transition-all">
                    <Download className="w-4 h-4" />
                    {candidate.resumeOriginalName || 'Download Resume'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <p className="text-zinc-500 text-sm">No resume uploaded</p>
                )}
              </div>

              {/* AI Summaries */}
              {report?.strengthSummary && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">AI INSIGHTS</p>
                  <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed">{report.strengthSummary}</p>
                  </div>
                  <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-3 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium leading-relaxed">{report.weaknessSummary}</p>
                  </div>
                  {report.candidateTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {report.candidateTags.map((t, i) => (
                        <span key={i} className="text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-md shadow-sm">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPORT TAB ─────────────────────────────────────────────── */}
        {activeTab === 'report' && report && (
          <div className="space-y-6">
            {/* Strengths / Weaknesses */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-1.5 uppercase tracking-wider"><CheckCircle2 className="w-3.5 h-3.5" />STRENGTHS</p>
                <ul className="space-y-2.5">
                  {report.strengths?.map((s, i) => (
                    <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-500 mt-0.5">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-1.5 uppercase tracking-wider"><XCircle className="w-3.5 h-3.5" />WEAKNESSES</p>
                <ul className="space-y-2.5">
                  {report.weaknesses?.map((w, i) => (
                    <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-rose-500 mt-0.5">✗</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 mb-4 uppercase tracking-wider">PER QUESTION ANALYSIS ({report.questionBreakdown?.length})</p>
              <div className="space-y-3">
                {report.questionBreakdown?.map((q, i) => (
                  <div key={q.questionId}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm flex-shrink-0 ${
                          (q.score ?? 0) >= 7 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' :
                          (q.score ?? 0) >= 4 ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30' : 
                          'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                        }`}>{q.score?.toFixed(0) ?? 0}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{q.question}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                              q.questionType === 'code' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30' :
                              q.questionType === 'system_design' ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30' :
                              'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                            }`}>{q.questionType}</span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{q.difficulty}</span>
                            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {q.timeTaken ? `${Math.floor(q.timeTaken / 60)}m ${q.timeTaken % 60}s` : '—'}
                            </span>
                            {q.followupCount > 0 && (
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> {q.followupCount} follow-ups
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform flex-shrink-0 ml-4 ${expandedQ === i ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {expandedQ === i && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                          <div className="p-5 space-y-5">
                            {q.userAnswer && (
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">CANDIDATE'S ANSWER</p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">{q.userAnswer}</p>
                              </div>
                            )}
                            {q.userCode && (
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">SUBMITTED CODE</p>
                                <pre className="text-sm font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-[#0d1117] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 overflow-x-auto shadow-sm">{q.userCode}</pre>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">AI FEEDBACK</p>
                              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4">
                                <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{q.feedback}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">IDEAL ANSWER</p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed italic">{q.idealAnswer}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PROCTORING TAB ──────────────────────────────────────────── */}
        {activeTab === 'proctoring' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 text-center shadow-sm">
                <p className="text-3xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{interview.violationCount || 0}</p>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-1">Total Violations</p>
              </div>
              <div className={`bg-white dark:bg-zinc-900 border rounded-xl p-5 text-center shadow-sm ${interview.autoSubmitted ? 'border-rose-200 dark:border-rose-500/30' : 'border-emerald-200 dark:border-emerald-500/30'}`}>
                <p className={`text-2xl font-bold ${interview.autoSubmitted ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {interview.autoSubmitted ? 'Yes' : 'No'}
                </p>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-1">Auto-submitted</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 text-center shadow-sm">
                <p className="text-3xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{Object.keys(violationGroups).length}</p>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-1">Violation Types</p>
              </div>
            </div>

            {/* Violation types */}
            {Object.entries(violationGroups).length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-500 mb-5 uppercase tracking-wider">VIOLATION BREAKDOWN</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(violationGroups).map(([type, count]) => {
                    const cfg = VIOLATION_LABELS[type] || { label: type, icon: '⚠️' }
                    return (
                      <div key={type} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-3">
                          <span className="text-lg bg-white dark:bg-zinc-800 p-1.5 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700">{cfg.icon}</span>{cfg.label}
                        </span>
                        <span className="text-lg font-mono text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-500/20">{count}×</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            {interview.violations?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-500 mb-5 uppercase tracking-wider">VIOLATION TIMELINE ({interview.violations.length})</p>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {interview.violations.map((v, i) => {
                    const cfg = VIOLATION_LABELS[v.type] || { label: v.type, icon: '⚠️' }
                    return (
                      <div key={i} className="flex items-center gap-4 text-sm py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors rounded-lg px-2">
                        <span className="text-zinc-500 font-mono text-xs flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                          {new Date(v.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-base">{cfg.icon}</span>
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{cfg.label}</span>
                        {v.details && <span className="text-zinc-500 ml-auto text-xs italic bg-zinc-50 dark:bg-zinc-950 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-800">{v.details}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {interview.violations?.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-xl text-emerald-600 dark:text-emerald-400 font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>No violations recorded</p>
                <p className="text-zinc-500 font-medium mt-2">Clean interview session</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
