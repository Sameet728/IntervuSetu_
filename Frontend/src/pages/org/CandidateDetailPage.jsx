import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getCandidateDetail, updateCandidateStatus } from '../../api/orgAPI'
import {
  ArrowLeft, User, FileText, Shield, Star, Clock, Code2, CheckCircle2,
  XCircle, AlertTriangle, ExternalLink, Download, ChevronRight, Loader2,
  MessageSquare, Brain, TrendingUp, Award, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Button } from '../../components/ui/index'

const BADGE_STYLES = {
  'Top Performer':       'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500',
  'Fast Solver':         'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
  'Strong Communicator': 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400',
  'Strong in DSA':       'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-600 dark:text-green-500',
}

const RECOMMENDATION_CONFIG = {
  strong_hire:    { label: 'Strong Hire',    color: 'text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-900/20' },
  hire:           { label: 'Hire',           color: 'text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-900/20' },
  borderline:     { label: 'Borderline',     color: 'text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-500 dark:border-amber-800 dark:bg-amber-900/20' },
  no_hire:        { label: 'No Hire',        color: 'text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-900/20' },
  strong_no_hire: { label: 'Strong No Hire', color: 'text-red-700 border-red-300 bg-red-50 dark:text-red-500 dark:border-red-800 dark:bg-red-900/10' },
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
        <circle cx="30" cy="30" r={r} fill="none" className="stroke-zinc-100 dark:stroke-zinc-800" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 -mt-10 font-mono">{val?.toFixed(1) ?? '—'}</span>
      <span className="text-[10px] font-semibold text-zinc-500 mt-8 tracking-wider uppercase">{label}</span>
    </div>
  )
}

function Tab({ id, active, onClick, icon, label }) {
  return (
    <button onClick={() => onClick(id)}
      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
        active 
          ? 'border-blue-600 text-blue-600 dark:text-blue-500 dark:border-blue-500' 
          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
      }`}>
      {icon}{label}
    </button>
  )
}

const fmtTime = (s) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—'

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
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-zinc-500">Loading candidate profile...</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <User className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500 font-medium">Candidate not found</p>
      </div>
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      {/* Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(`/org/interview/${templateId}/leaderboard`)}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0 border-l border-zinc-200 dark:border-zinc-800 pl-4">
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 overflow-hidden flex-shrink-0 border border-blue-100 dark:border-blue-800/50">
              {candidate.profilePicture
                ? <img src={candidate.profilePicture} alt="" className="w-full h-full object-cover" />
                : candidate.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{candidate.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{candidate.email}</p>
            </div>
          </div>

          {/* Badge */}
          {report?.badge && (
            <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border hidden sm:inline-flex items-center gap-1 ${BADGE_STYLES[report.badge]}`}>
              {report.badge}
            </span>
          )}

          {/* HR Status */}
          <div className="flex items-center gap-1.5 ml-auto">
            {['pending', 'shortlisted', 'selected', 'rejected'].map((s) => (
              <button key={s} onClick={() => handleStatus(s)} disabled={updatingStatus}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all disabled:opacity-50 ${
                  report?.candidateStatus === s
                    ? s === 'selected' ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 shadow-sm'
                    : s === 'rejected' ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 shadow-sm'
                    : s === 'shortlisted' ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-500 dark:border-amber-800/50 shadow-sm'
                    : 'bg-zinc-200 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 shadow-sm'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
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
            <div className="flex-1 min-w-[280px] space-y-3 border-l border-zinc-100 dark:border-zinc-800 pl-6">
              {rec && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${rec.color}`}>
                  {rec.label}
                </span>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{report.overallFeedback}</p>
              <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{fmtTime(interview.totalTimeTaken)}</span>
                {interview.violationCount > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500"><AlertTriangle className="w-3.5 h-3.5" />{interview.violationCount} violations</span>
                )}
                {interview.autoSubmitted && (
                  <span className="flex items-center gap-1.5 text-red-600 dark:text-red-500"><XCircle className="w-3.5 h-3.5" />Auto-submitted</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 bg-white dark:bg-zinc-900/50 rounded-t-xl px-2">
          <Tab id="profile"   active={activeTab === 'profile'}   onClick={setActiveTab} icon={<User className="w-4 h-4" />}       label="Profile Details" />
          <Tab id="report"    active={activeTab === 'report'}    onClick={setActiveTab} icon={<FileText className="w-4 h-4" />}    label="Detailed Report" />
          <Tab id="proctoring" active={activeTab === 'proctoring'} onClick={setActiveTab} icon={<Shield className="w-4 h-4" />}  label="Proctoring Logs" />
        </div>

        {/* ── PROFILE TAB ─────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <p className="text-[10px] font-bold text-zinc-400 mb-5 tracking-wider uppercase">CANDIDATE PROFILE</p>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                  <span className="text-zinc-500">Name</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.name}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                  <span className="text-zinc-500">Email</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.email}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                  <span className="text-zinc-500">Type</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{candidate.userType}</span>
                </div>
                {candidate.college && (
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                    <span className="text-zinc-500">College</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 text-right">{candidate.college}</span>
                  </div>
                )}
                {candidate.year && (
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                    <span className="text-zinc-500">Year</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.year} — {candidate.branch}</span>
                  </div>
                )}
                {candidate.company && (
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                    <span className="text-zinc-500">Company</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.company}</span>
                  </div>
                )}
                {candidate.yearsOfExperience > 0 && (
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                    <span className="text-zinc-500">Experience</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.yearsOfExperience} years</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                  <span className="text-zinc-500">Level</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{candidate.experienceLevel || '—'}</span>
                </div>
                {candidate.targetRole && (
                  <div className="flex justify-between pb-1">
                    <span className="text-zinc-500">Target Role</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{candidate.targetRole}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Skills */}
              {candidate.skills?.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-zinc-400 mb-4 tracking-wider uppercase">SKILLS</p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((sk) => (
                      <span key={sk} className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-3 py-1 rounded-full">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 mb-4 tracking-wider uppercase">RESUME</p>
                {candidate.resumeUrl ? (
                  <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${candidate.resumeUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <Download className="w-4 h-4" />
                    {candidate.resumeOriginalName || 'Download Resume'}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                ) : (
                  <p className="text-zinc-500 text-sm italic">No resume uploaded</p>
                )}
              </div>

              {/* AI Summaries */}
              {report?.strengthSummary && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <p className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">AI INSIGHTS</p>
                  <div className="flex items-start gap-3 bg-green-50/50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{report.strengthSummary}</p>
                  </div>
                  <div className="flex items-start gap-3 bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{report.weaknessSummary}</p>
                  </div>
                  {report.candidateTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {report.candidateTags.map((t, i) => (
                        <span key={i} className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-md uppercase tracking-wide">{t}</span>
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
              <div className="bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-900/50 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-green-700 dark:text-green-500 mb-4 flex items-center gap-2 uppercase tracking-wider"><CheckCircle2 className="w-4 h-4" />STRENGTHS</p>
                <ul className="space-y-3">
                  {report.strengths?.map((s, i) => (
                    <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
                      <span className="text-green-500 dark:text-green-400 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-red-700 dark:text-red-500 mb-4 flex items-center gap-2 uppercase tracking-wider"><XCircle className="w-4 h-4" />WEAKNESSES</p>
                <ul className="space-y-3">
                  {report.weaknesses?.map((w, i) => (
                    <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
                      <span className="text-red-500 dark:text-red-400 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 mb-4 tracking-wider uppercase">PER QUESTION ANALYSIS ({report.questionBreakdown?.length})</p>
              <div className="space-y-3">
                {report.questionBreakdown?.map((q, i) => (
                  <div key={q.questionId}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                    <button onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                      className="w-full p-4 flex items-center justify-between text-left focus:outline-none">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono flex-shrink-0 ${
                          (q.score ?? 0) >= 7 ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                          (q.score ?? 0) >= 4 ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-500 dark:border-amber-800/50' : 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                        }`}>{q.score?.toFixed(0) ?? 0}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate mb-1">{q.question}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                              q.questionType === 'code' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              q.questionType === 'system_design' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                              'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}>{q.questionType}</span>
                            <span className="text-[10px] font-medium text-zinc-500 capitalize px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 rounded-md border border-zinc-100 dark:border-zinc-800">{q.difficulty}</span>
                            <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {q.timeTaken ? `${Math.floor(q.timeTaken / 60)}m ${q.timeTaken % 60}s` : '—'}
                            </span>
                            {q.followupCount > 0 && (
                              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500 ml-2 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20">
                                {q.followupCount} follow-ups
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform duration-300 flex-shrink-0 ${expandedQ === i ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {expandedQ === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800">
                          <div className="p-5 space-y-5 bg-zinc-50/50 dark:bg-zinc-950/50">
                            {q.userAnswer && (
                              <div>
                                <p className="text-[10px] font-bold text-zinc-400 mb-2 tracking-wider uppercase">CANDIDATE'S ANSWER</p>
                                <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                  {q.userAnswer}
                                </div>
                              </div>
                            )}
                            {q.userCode && (
                              <div>
                                <p className="text-[10px] font-bold text-zinc-400 mb-2 tracking-wider uppercase flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5"/>SUBMITTED CODE</p>
                                <pre className="text-xs font-mono text-zinc-800 dark:text-zinc-300 bg-zinc-100 dark:bg-[#0d1117] rounded-xl p-4 overflow-x-auto border border-zinc-200 dark:border-zinc-800 shadow-sm">{q.userCode}</pre>
                              </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-bold text-zinc-400 mb-2 tracking-wider uppercase flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5"/>FEEDBACK</p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{q.feedback}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-zinc-400 mb-2 tracking-wider uppercase flex items-center gap-1.5"><Brain className="w-3.5 h-3.5"/>IDEAL ANSWER</p>
                                <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">{q.idealAnswer}</p>
                              </div>
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
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{interview.violationCount || 0}</p>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Violations</p>
              </div>
              <div className={`bg-white dark:bg-zinc-900 border rounded-2xl p-6 text-center shadow-sm ${interview.autoSubmitted ? 'border-red-200 dark:border-red-900/50' : 'border-green-200 dark:border-green-900/50'}`}>
                <p className={`text-2xl font-bold mb-1 ${interview.autoSubmitted ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {interview.autoSubmitted ? 'Yes' : 'No'}
                </p>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Auto-submitted</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{Object.keys(violationGroups).length}</p>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Violation Types</p>
              </div>
            </div>

            {/* Violation types */}
            {Object.entries(violationGroups).length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 mb-5 tracking-wider uppercase">VIOLATION BREAKDOWN</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(violationGroups).map(([type, count]) => {
                    const cfg = VIOLATION_LABELS[type] || { label: type, icon: '⚠️' }
                    return (
                      <div key={type} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/50">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-3">
                          <span className="text-lg bg-white dark:bg-zinc-800 w-8 h-8 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center">{cfg.icon}</span>{cfg.label}
                        </span>
                        <span className="text-lg font-mono text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg border border-amber-100 dark:border-amber-800/50">{count}×</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            {interview.violations?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 mb-5 tracking-wider uppercase">VIOLATION TIMELINE ({interview.violations.length})</p>
                <div className="space-y-1 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {interview.violations.map((v, i) => {
                    const cfg = VIOLATION_LABELS[v.type] || { label: v.type, icon: '⚠️' }
                    return (
                      <div key={i} className="flex items-center gap-4 text-sm py-2.5 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 px-2 rounded-lg transition-colors">
                        <span className="text-zinc-500 font-mono text-xs flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                          {new Date(v.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-lg">{cfg.icon}</span>
                        <span className="text-zinc-800 dark:text-zinc-200 font-medium">{cfg.label}</span>
                        {v.details && <span className="text-zinc-500 ml-auto text-xs italic">{v.details}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {interview.violations?.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-green-600 dark:text-green-400 text-lg font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>No violations recorded</p>
                <p className="text-zinc-500 text-sm mt-2">Clean interview session</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
