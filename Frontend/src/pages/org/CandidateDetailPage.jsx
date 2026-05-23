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

const BADGE_STYLES = {
  'Top Performer':       'bg-amber/10 border-amber/30 text-amber',
  'Fast Solver':         'bg-cyan/10 border-cyan/30 text-cyan',
  'Strong Communicator': 'bg-violet/10 border-violet/30 text-violet',
  'Strong in DSA':       'bg-emerald/10 border-emerald/30 text-emerald',
}

const RECOMMENDATION_CONFIG = {
  strong_hire:    { label: 'Strong Hire',    color: 'text-emerald border-emerald/30 bg-emerald/10' },
  hire:           { label: 'Hire',           color: 'text-cyan border-cyan/30 bg-cyan/10' },
  borderline:     { label: 'Borderline',     color: 'text-amber border-amber/30 bg-amber/10' },
  no_hire:        { label: 'No Hire',        color: 'text-rose border-rose/30 bg-rose/10' },
  strong_no_hire: { label: 'Strong No Hire', color: 'text-rose border-rose/30 bg-rose/5' },
}

const VIOLATION_LABELS = {
  no_face:         { label: 'No Face Detected',   icon: '👤' },
  multiple_faces:  { label: 'Multiple Faces',      icon: '👥' },
  fullscreen_exit: { label: 'Exited Fullscreen',   icon: '⛶' },
  tab_switch:      { label: 'Tab Switched',         icon: '🗂' },
  focus_lost:      { label: 'Focus Lost',           icon: '🔍' },
}

function ScoreCircle({ val, label, color = '#06b6d4', size = 64 }) {
  const pct = Math.min((val / 10) * 100, 100)
  const r = 24
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 60 60" className="-rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="text-lg font-display font-bold text-zinc-900 dark:text-white -mt-10">{val?.toFixed(1) ?? '—'}</span>
      <span className="text-[10px] font-mono text-slate-500 mt-8">{label}</span>
    </div>
  )
}

function Tab({ id, active, onClick, icon, label }) {
  return (
    <button onClick={() => onClick(id)}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-body font-medium transition-all border-b-2 ${
        active ? 'border-violet text-violet' : 'border-transparent text-slate-500 hover:text-slate-300'
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
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <p className="text-slate-500 font-body">Candidate not found</p>
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
    <div className="min-h-screen bg-void">
      {/* Nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/org/interview/${templateId}/leaderboard`)}
            className="text-slate-500 hover:text-zinc-900 dark:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-0.5 h-4 bg-border" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-violet/20 flex items-center justify-center text-sm font-bold text-violet overflow-hidden flex-shrink-0">
              {candidate.profilePicture
                ? <img src={candidate.profilePicture} alt="" className="w-full h-full object-cover" />
                : candidate.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-zinc-900 dark:text-white text-sm truncate">{candidate.name}</p>
              <p className="text-[10px] font-mono text-slate-500">{candidate.email}</p>
            </div>
          </div>

          {/* Badge */}
          {report?.badge && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1 ${BADGE_STYLES[report.badge]}`}>
              {report.badge}
            </span>
          )}

          {/* HR Status */}
          <div className="flex items-center gap-1.5">
            {['pending', 'shortlisted', 'selected', 'rejected'].map((s) => (
              <button key={s} onClick={() => handleStatus(s)} disabled={updatingStatus}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono capitalize transition-all disabled:opacity-50 ${
                  report?.candidateStatus === s
                    ? s === 'selected' ? 'bg-emerald/20 text-emerald border border-emerald/40'
                    : s === 'rejected' ? 'bg-rose/20 text-rose border border-rose/40'
                    : s === 'shortlisted' ? 'bg-amber/20 text-amber border border-amber/40'
                    : 'bg-slate-800 text-slate-300 border border-border'
                    : 'text-slate-600 hover:text-slate-400 border border-transparent hover:border-border'
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
          <div className="bg-card border border-border rounded-2xl p-5 mb-5 flex flex-wrap items-center gap-6">
            <div className="flex gap-5 flex-wrap">
              <ScoreCircle val={report.overallScore} label="Overall" color="#06b6d4" />
              <ScoreCircle val={report.technicalScore} label="Technical" color="#8b5cf6" />
              <ScoreCircle val={report.communicationScore} label="Communication" color="#10b981" />
              <ScoreCircle val={report.problemSolvingScore} label="Problem Solving" color="#f59e0b" />
              {report.codeQualityScore != null && <ScoreCircle val={report.codeQualityScore} label="Code Quality" color="#ec4899" />}
            </div>
            <div className="flex-1 min-w-fit space-y-2">
              {rec && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono border ${rec.color}`}>
                  {rec.label}
                </span>
              )}
              <p className="text-xs font-body text-slate-400">{report.overallFeedback}</p>
              <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(interview.totalTimeTaken)}</span>
                {interview.violationCount > 0 && (
                  <span className="flex items-center gap-1 text-amber"><AlertTriangle className="w-3 h-3" />{interview.violationCount} violations</span>
                )}
                {interview.autoSubmitted && (
                  <span className="text-rose">Auto-submitted</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-5">
          <Tab id="profile"   active={activeTab === 'profile'}   onClick={setActiveTab} icon={<User className="w-3.5 h-3.5" />}       label="Profile" />
          <Tab id="report"    active={activeTab === 'report'}    onClick={setActiveTab} icon={<FileText className="w-3.5 h-3.5" />}    label="Report" />
          <Tab id="proctoring" active={activeTab === 'proctoring'} onClick={setActiveTab} icon={<Shield className="w-3.5 h-3.5" />}  label="Proctoring" />
        </div>

        {/* ── PROFILE TAB ─────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-[10px] font-mono text-slate-500 mb-4">CANDIDATE PROFILE</p>
              <div className="space-y-3 text-sm font-body">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-200">{candidate.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-200 text-xs">{candidate.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-200 capitalize">{candidate.userType}</span>
                </div>
                {candidate.college && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">College</span>
                    <span className="text-slate-200">{candidate.college}</span>
                  </div>
                )}
                {candidate.year && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Year</span>
                    <span className="text-slate-200">{candidate.year} — {candidate.branch}</span>
                  </div>
                )}
                {candidate.company && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Company</span>
                    <span className="text-slate-200">{candidate.company}</span>
                  </div>
                )}
                {candidate.yearsOfExperience > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Experience</span>
                    <span className="text-slate-200">{candidate.yearsOfExperience} years</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Level</span>
                  <span className="text-slate-200 capitalize">{candidate.experienceLevel || '—'}</span>
                </div>
                {candidate.targetRole && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Role</span>
                    <span className="text-slate-200">{candidate.targetRole}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Skills */}
              {candidate.skills?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-[10px] font-mono text-slate-500 mb-3">SKILLS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((sk) => (
                      <span key={sk} className="text-[11px] font-mono bg-violet/10 text-violet border border-violet/20 px-2 py-0.5 rounded-full">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-[10px] font-mono text-slate-500 mb-3">RESUME</p>
                {candidate.resumeUrl ? (
                  <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${candidate.resumeUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-cyan hover:text-cyan/80 transition-colors">
                    <Download className="w-4 h-4" />
                    {candidate.resumeOriginalName || 'Download Resume'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-slate-600 text-sm">No resume uploaded</p>
                )}
              </div>

              {/* AI Summaries */}
              {report?.strengthSummary && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <p className="text-[10px] font-mono text-slate-500">AI INSIGHTS</p>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 font-body">{report.strengthSummary}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 font-body">{report.weaknessSummary}</p>
                  </div>
                  {report.candidateTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {report.candidateTags.map((t, i) => (
                        <span key={i} className="text-[10px] font-mono text-slate-500 bg-surface border border-border px-2 py-0.5 rounded-full">{t}</span>
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
          <div className="space-y-5">
            {/* Strengths / Weaknesses */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card border border-emerald/20 rounded-2xl p-5">
                <p className="text-[10px] font-mono text-emerald mb-3 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />STRENGTHS</p>
                <ul className="space-y-1.5">
                  {report.strengths?.map((s, i) => (
                    <li key={i} className="text-xs font-body text-slate-300 flex items-start gap-1.5">
                      <span className="text-emerald mt-0.5">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border border-rose/20 rounded-2xl p-5">
                <p className="text-[10px] font-mono text-rose mb-3 flex items-center gap-1"><XCircle className="w-3 h-3" />WEAKNESSES</p>
                <ul className="space-y-1.5">
                  {report.weaknesses?.map((w, i) => (
                    <li key={i} className="text-xs font-body text-slate-300 flex items-start gap-1.5">
                      <span className="text-rose mt-0.5">✗</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div>
              <p className="text-[10px] font-mono text-slate-500 mb-3">PER QUESTION ANALYSIS ({report.questionBreakdown?.length})</p>
              <div className="space-y-2">
                {report.questionBreakdown?.map((q, i) => (
                  <div key={q.questionId}
                    className="bg-card border border-border rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-surface/50 transition-all">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono flex-shrink-0 ${
                          (q.score ?? 0) >= 7 ? 'bg-emerald/20 text-emerald' :
                          (q.score ?? 0) >= 4 ? 'bg-amber/20 text-amber' : 'bg-rose/20 text-rose'
                        }`}>{q.score?.toFixed(0) ?? 0}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-body text-slate-300 truncate">{q.question}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              q.questionType === 'code' ? 'bg-violet/10 text-violet' :
                              q.questionType === 'system_design' ? 'bg-cyan/10 text-cyan' :
                              'bg-slate-800 text-slate-500'
                            }`}>{q.questionType}</span>
                            <span className="text-[9px] font-mono text-slate-600">{q.difficulty}</span>
                            <span className="text-[9px] font-mono text-slate-600">
                              {q.timeTaken ? `${Math.floor(q.timeTaken / 60)}m ${q.timeTaken % 60}s` : '—'}
                            </span>
                            {q.followupCount > 0 && (
                              <span className="text-[9px] font-mono text-amber">{q.followupCount} follow-ups</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform flex-shrink-0 ${expandedQ === i ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {expandedQ === i && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden border-t border-border">
                          <div className="p-4 space-y-3">
                            {q.userAnswer && (
                              <div>
                                <p className="text-[10px] font-mono text-slate-500 mb-1">CANDIDATE'S ANSWER</p>
                                <p className="text-xs font-body text-slate-300 leading-relaxed bg-surface rounded-lg p-3">{q.userAnswer}</p>
                              </div>
                            )}
                            {q.userCode && (
                              <div>
                                <p className="text-[10px] font-mono text-slate-500 mb-1">SUBMITTED CODE</p>
                                <pre className="text-xs font-mono text-slate-300 bg-[#0d1117] rounded-lg p-3 overflow-x-auto">{q.userCode}</pre>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-mono text-slate-500 mb-1">FEEDBACK</p>
                              <p className="text-xs font-body text-slate-400">{q.feedback}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-mono text-slate-500 mb-1">IDEAL ANSWER</p>
                              <p className="text-xs font-body text-cyan/80">{q.idealAnswer}</p>
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
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-display font-bold text-zinc-900 dark:text-white">{interview.violationCount || 0}</p>
                <p className="text-[10px] font-mono text-slate-500">Total Violations</p>
              </div>
              <div className={`bg-card border rounded-xl p-4 text-center ${interview.autoSubmitted ? 'border-rose/30' : 'border-emerald/30'}`}>
                <p className={`text-lg font-display font-bold ${interview.autoSubmitted ? 'text-rose' : 'text-emerald'}`}>
                  {interview.autoSubmitted ? 'Yes' : 'No'}
                </p>
                <p className="text-[10px] font-mono text-slate-500">Auto-submitted</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-display font-bold text-zinc-900 dark:text-white">{Object.keys(violationGroups).length}</p>
                <p className="text-[10px] font-mono text-slate-500">Violation Types</p>
              </div>
            </div>

            {/* Violation types */}
            {Object.entries(violationGroups).length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-[10px] font-mono text-slate-500 mb-4">VIOLATION BREAKDOWN</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(violationGroups).map(([type, count]) => {
                    const cfg = VIOLATION_LABELS[type] || { label: type, icon: '⚠️' }
                    return (
                      <div key={type} className="flex items-center justify-between bg-surface rounded-xl p-3 border border-border">
                        <span className="text-sm font-body text-slate-300 flex items-center gap-2">
                          <span>{cfg.icon}</span>{cfg.label}
                        </span>
                        <span className="text-sm font-mono text-amber font-bold">{count}×</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            {interview.violations?.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-[10px] font-mono text-slate-500 mb-4">VIOLATION TIMELINE ({interview.violations.length})</p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {interview.violations.map((v, i) => {
                    const cfg = VIOLATION_LABELS[v.type] || { label: v.type, icon: '⚠️' }
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs font-body py-1.5 border-b border-border last:border-0">
                        <span className="text-slate-600 font-mono text-[10px] flex-shrink-0">
                          {new Date(v.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span>{cfg.icon}</span>
                        <span className="text-slate-400">{cfg.label}</span>
                        {v.details && <span className="text-slate-600 ml-auto text-[10px]">{v.details}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {interview.violations?.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-10 h-10 text-emerald mx-auto mb-3" />
                <p className="text-emerald font-display font-semibold">No violations recorded</p>
                <p className="text-slate-500 text-sm font-body mt-1">Clean interview session</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
