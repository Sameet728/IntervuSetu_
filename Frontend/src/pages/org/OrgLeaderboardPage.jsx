import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { getLeaderboard, getAnalytics, updateCandidateStatus, sendInvite, closeTemplate } from '../../api/orgAPI'
import {
  ArrowLeft, Trophy, Search, Filter, Download, Mail, Copy, ChevronDown,
  Clock, Star, Zap, MessageSquare, Code2, TrendingUp, Users, BarChart3,
  CheckCircle2, XCircle, AlertCircle, Shield, Send, X, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Badge chip ────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  'Top Performer':       'bg-amber/10 border-amber/30 text-amber',
  'Fast Solver':         'bg-cyan/10 border-cyan/30 text-cyan',
  'Strong Communicator': 'bg-violet/10 border-violet/30 text-violet',
  'Strong in DSA':       'bg-emerald/10 border-emerald/30 text-emerald',
}

function BadgeChip({ badge }) {
  if (!badge) return null
  const icons = {
    'Top Performer': '🏆',
    'Fast Solver': '⚡',
    'Strong Communicator': '💬',
    'Strong in DSA': '💻',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${BADGE_STYLES[badge] || ''}`}>
      {icons[badge]} {badge}
    </span>
  )
}

function StatusSelect({ current, onChange, disabled }) {
  const opts = [
    { val: 'pending',     label: 'Pending',     color: 'text-slate-400' },
    { val: 'shortlisted', label: 'Shortlisted', color: 'text-amber' },
    { val: 'selected',    label: 'Selected',    color: 'text-emerald' },
    { val: 'rejected',    label: 'Rejected',    color: 'text-rose' },
  ]
  const cur = opts.find(o => o.val === current) || opts[0]
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      className={`bg-transparent border border-border rounded-lg text-[11px] font-mono px-2 py-1 outline-none cursor-pointer ${cur.color} disabled:opacity-50`}
    >
      {opts.map(o => <option key={o.val} value={o.val} className="bg-[#0d1117] text-slate-300">{o.label}</option>)}
    </select>
  )
}

function ScoreBar({ val, max = 10, color = 'bg-cyan' }) {
  return (
    <div className="w-full bg-surface rounded-full h-1">
      <div className={`${color} h-1 rounded-full transition-all`} style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
    </div>
  )
}

const fmtTime = (s) => {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

// ─── Invite Modal ──────────────────────────────────────────────────────────
function InviteModal({ templateId, onClose }) {
  const [emails, setEmails] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const list = emails.split(/[\n,;]/).map(e => e.trim()).filter(Boolean)
    if (!list.length) { toast.error('Enter at least one email'); return }
    setSending(true)
    try {
      const res = await sendInvite(templateId, { emails: list })
      toast.success(`Sent to ${res.data.data.sent} / ${res.data.data.total} emails`)
      onClose()
    } catch { toast.error('Failed to send invites') }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Mail className="w-4 h-4 text-violet" />Send Invites</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-zinc-900 dark:text-white"><X className="w-4 h-4" /></button>
        </div>
        <textarea value={emails} onChange={(e) => setEmails(e.target.value)}
          placeholder="Enter emails separated by comma, semicolon, or newline&#10;e.g.&#10;alice@college.edu&#10;bob@company.com"
          rows={5}
          className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-mono resize-none mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-border rounded-xl text-sm text-slate-400 hover:border-slate-600 transition-all">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 py-2 bg-gradient-to-r from-violet to-cyan text-void font-bold rounded-xl text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Sending...' : 'Send Invites'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function OrgLeaderboardPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { org } = useOrgAuth()
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState(null)
  const [entries, setEntries] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [search, setSearch] = useState('')
  const [scoreMin, setScoreMin] = useState('')
  const [scoreMax, setScoreMax] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showInvite, setShowInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(null)
  const [tab, setTab] = useState('board') // board | analytics

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [lb, an] = await Promise.all([
        getLeaderboard(templateId, { search, scoreMin, scoreMax, status: statusFilter }),
        getAnalytics(templateId),
      ])
      setTemplate(lb.data.template)
      setEntries(lb.data.data)
      setAnalytics(an.data.data)
    } catch {
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [templateId, search, scoreMin, scoreMax, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  const handleStatusChange = async (interviewId, status) => {
    setUpdatingStatus(interviewId)
    try {
      await updateCandidateStatus(templateId, interviewId, status)
      setEntries(prev => prev.map(e =>
        e.interviewId === interviewId || e.interviewId?.toString() === interviewId
          ? { ...e, candidateStatus: status }
          : e
      ))
      toast.success(`Marked as ${status}`)
    } catch { toast.error('Failed to update status') }
    finally { setUpdatingStatus(null) }
  }

  const copyJoinLink = () => {
    const url = `${window.location.origin}/interview/join/${template?.shareCode || ''}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCSV = () => {
    const token = localStorage.getItem('orgToken')
    const baseUrl = import.meta.env.VITE_API_URL || '/api'
    window.open(`${baseUrl}/org/candidates/${templateId}/export`, '_blank')
  }

  // Rank medal helpers
  const getMedal = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-amber/5 border-amber/20'
    if (rank === 2) return 'bg-slate-500/5 border-slate-500/20'
    if (rank === 3) return 'bg-orange-800/5 border-orange-800/20'
    return 'bg-card border-border'
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/org/dashboard')} className="text-slate-500 hover:text-zinc-900 dark:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-0.5 h-4 bg-border" />
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-zinc-900 dark:text-white text-sm truncate">{template?.title || 'Leaderboard'}</p>
            <p className="text-[10px] font-mono text-slate-500 capitalize">{template?.role} • {template?.interviewType}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyJoinLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-body transition-all ${copied ? 'border-emerald/30 text-emerald' : 'border-border text-slate-400 hover:border-cyan/30 hover:text-cyan'}`}>
              <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-violet/30 bg-violet/10 text-violet rounded-lg text-xs font-body hover:bg-violet/20 transition-all">
              <Mail className="w-3 h-3" />Invite
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs font-body hover:border-emerald/30 hover:text-emerald transition-all">
              <Download className="w-3 h-3" />CSV
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5">
          {[{ id: 'board', label: 'Leaderboard', icon: <Trophy className="w-3.5 h-3.5" /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-medium transition-all ${
                tab === t.id ? 'bg-violet/10 text-violet border border-violet/30' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── ANALYTICS TAB ─────────────────────────────────────────── */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Candidates', val: analytics.totalAttempts, icon: <Users className="w-4 h-4 text-violet" /> },
                { label: 'Completed', val: analytics.completedAttempts, icon: <CheckCircle2 className="w-4 h-4 text-emerald" /> },
                { label: 'Avg Score', val: analytics.avgScore ? `${analytics.avgScore}/10` : '—', icon: <Star className="w-4 h-4 text-amber" /> },
                { label: 'Completion Rate', val: `${analytics.completionRate}%`, icon: <TrendingUp className="w-4 h-4 text-cyan" /> },
              ].map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-[10px] font-mono text-slate-500">{s.label}</span></div>
                  <p className="font-display font-bold text-2xl text-zinc-900 dark:text-white">{s.val}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-mono text-slate-400 mb-4">STATUS DISTRIBUTION</p>
                {Object.entries(analytics.statusDistribution || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between mb-2">
                    <span className="text-xs font-body text-slate-400 capitalize">{k}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-surface rounded-full h-1.5">
                        <div className="bg-violet h-1.5 rounded-full" style={{ width: `${analytics.totalAttempts > 0 ? (v / analytics.totalAttempts) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500 w-4">{v}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-mono text-slate-400 mb-4">BADGE DISTRIBUTION</p>
                {Object.entries(analytics.badgeDistribution || {}).length === 0
                  ? <p className="text-slate-600 text-sm font-body">No badges assigned yet</p>
                  : Object.entries(analytics.badgeDistribution || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between mb-2">
                      <BadgeChip badge={k} />
                      <span className="text-xs font-mono text-slate-500">{v}</span>
                    </div>
                  ))}
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-mono text-slate-400 mb-4">SKILL HEATMAP (AVG)</p>
                {analytics.skillHeatmap && Object.entries(analytics.skillHeatmap).map(([k, v]) => (
                  <div key={k} className="flex flex-col mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-body text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-xs font-mono text-slate-300">{v}/10</span>
                    </div>
                    <ScoreBar val={v} max={10} color={
                      v >= 8 ? 'bg-emerald' : v >= 6 ? 'bg-amber' : 'bg-rose'
                    } />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ────────────────────────────────────────── */}
        {tab === 'board' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates..." onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  className="bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-body w-48" />
              </div>
              <input type="number" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)}
                placeholder="Min score" min={0} max={10} step={0.5}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-mono w-24" />
              <input type="number" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)}
                placeholder="Max score" min={0} max={10} step={0.5}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet/40 placeholder-slate-600 font-mono w-24" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-violet/40 font-mono">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
              <button onClick={loadData} className="px-3 py-2 bg-violet/10 border border-violet/30 text-violet rounded-lg text-xs font-body hover:bg-violet/20 transition-all">Apply</button>
              <span className="ml-auto text-[11px] font-mono text-slate-500">{entries.length} candidates</span>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-violet/30 border-t-violet rounded-full animate-spin" /></div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20">
                <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-body">No candidates have completed this interview yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, idx) => (
                  <motion.div key={entry.interviewId}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                    onClick={() => navigate(`/org/interview/${templateId}/candidate/${entry.interviewId}`)}
                    className={`border rounded-xl p-4 cursor-pointer hover:border-violet/30 transition-all ${getRankBg(entry.rank)}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-10 text-center">
                        {getMedal(entry.rank)
                          ? <span className="text-xl">{getMedal(entry.rank)}</span>
                          : <span className="text-sm font-mono text-slate-500">#{entry.rank}</span>}
                      </div>

                      {/* Avatar + name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-violet/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-violet overflow-hidden">
                          {entry.profilePicture
                            ? <img src={entry.profilePicture} alt="" className="w-full h-full object-cover" />
                            : entry.candidateName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-body font-semibold text-sm text-zinc-900 dark:text-white truncate">{entry.candidateName}</p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {entry.college || entry.company || entry.email}
                          </p>
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-center">
                          <p className={`font-display font-bold text-lg ${
                            entry.overallScore >= 8 ? 'text-emerald' :
                            entry.overallScore >= 6 ? 'text-amber' : 'text-rose'
                          }`}>{entry.overallScore.toFixed(1)}</p>
                          <p className="text-[9px] font-mono text-slate-600">Overall</p>
                        </div>
                        <div className="hidden sm:flex flex-col gap-1 w-32">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-slate-600 w-5">Tech</span>
                            <ScoreBar val={entry.technicalScore} color="bg-violet" />
                            <span className="text-[9px] font-mono text-slate-500 w-6">{entry.technicalScore.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-slate-600 w-5">Comm</span>
                            <ScoreBar val={entry.communicationScore} color="bg-cyan" />
                            <span className="text-[9px] font-mono text-slate-500 w-6">{entry.communicationScore.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-slate-600 w-5">PS</span>
                            <ScoreBar val={entry.problemSolvingScore} color="bg-emerald" />
                            <span className="text-[9px] font-mono text-slate-500 w-6">{entry.problemSolvingScore.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Time + badge + status */}
                      <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                        <div className="text-center hidden md:block">
                          <p className="text-sm font-mono text-slate-400">{fmtTime(entry.totalTimeTaken)}</p>
                          <p className="text-[9px] font-mono text-slate-600">Time</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <BadgeChip badge={entry.badge} />
                          {entry.status === 'Auto-submitted' && (
                            <span className="text-[9px] font-mono text-rose bg-rose/10 border border-rose/20 px-1.5 py-0.5 rounded-full">Auto-submit</span>
                          )}
                        </div>
                        <StatusSelect
                          current={entry.candidateStatus}
                          onChange={(s) => handleStatusChange(entry.interviewId, s)}
                          disabled={updatingStatus === entry.interviewId}
                        />
                      </div>
                    </div>

                    {/* Tags row */}
                    {entry.candidateTags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 ml-13 pl-10">
                        {entry.candidateTags.map((tag, ti) => (
                          <span key={ti} className="text-[9px] font-mono text-slate-500 bg-surface border border-border px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showInvite && <InviteModal templateId={templateId} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
