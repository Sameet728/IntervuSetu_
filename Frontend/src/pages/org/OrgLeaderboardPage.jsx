import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { getLeaderboard, getAnalytics, updateCandidateStatus, sendInvite, closeTemplate } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  ArrowLeft, Trophy, Search, Filter, Download, Mail, Copy, ChevronDown,
  Clock, Star, Zap, MessageSquare, Code2, TrendingUp, Users, BarChart3,
  CheckCircle2, XCircle, AlertCircle, Shield, Send, X, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Button, Badge } from '../../components/ui/index'

// ─── Badge chip ────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  'Top Performer':       'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400',
  'Fast Solver':         'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400',
  'Strong Communicator': 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400',
  'Strong in DSA':       'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400',
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
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${BADGE_STYLES[badge] || 'bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'}`}>
      {icons[badge]} {badge}
    </span>
  )
}

function StatusSelect({ current, onChange, disabled }) {
  const opts = [
    { val: 'pending',     label: 'Pending',     color: 'text-zinc-500 dark:text-zinc-400' },
    { val: 'shortlisted', label: 'Shortlisted', color: 'text-amber-600 dark:text-amber-500' },
    { val: 'selected',    label: 'Selected',    color: 'text-emerald-600 dark:text-emerald-500' },
    { val: 'rejected',    label: 'Rejected',    color: 'text-rose-600 dark:text-rose-500' },
  ]
  const cur = opts.find(o => o.val === current) || opts[0]
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      className={`bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-mono px-2 py-1 outline-none cursor-pointer ${cur.color} disabled:opacity-50`}
    >
      {opts.map(o => <option key={o.val} value={o.val} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-300">{o.label}</option>)}
    </select>
  )
}

function ScoreBar({ val, max = 10, color = 'bg-cyan-500' }) {
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl" style={{ fontFamily: 'Inter, system-ui' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}><Mail className="w-4 h-4 text-blue-600 dark:text-blue-500" />Send Invites</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <textarea value={emails} onChange={(e) => setEmails(e.target.value)}
          placeholder="Enter emails separated by comma, semicolon, or newline&#10;e.g.&#10;alice@college.edu&#10;bob@company.com"
          rows={5}
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 font-mono resize-none mb-4 transition-all" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
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
    if (rank === 1) return 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700/30'
    if (rank === 2) return 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700'
    if (rank === 3) return 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800/30'
    return 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col" style={{ fontFamily: 'Inter, system-ui' }}>
      <OrgNavbar />

      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-14 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/org/dashboard')} className="p-1.5 -ml-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{template?.title || 'Leaderboard'}</p>
            <p className="text-[10px] font-mono text-zinc-500 capitalize">{template?.role} • {template?.interviewType}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyJoinLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${copied ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
              <Copy className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors shadow-sm">
              <Mail className="w-3.5 h-3.5" />Invite
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <Download className="w-3.5 h-3.5" />CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          {[{ id: 'board', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id 
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
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
                { label: 'Total Candidates', val: analytics.totalAttempts, icon: <Users className="w-4 h-4 text-blue-500" /> },
                { label: 'Completed', val: analytics.completedAttempts, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                { label: 'Avg Score', val: analytics.avgScore ? `${analytics.avgScore}/10` : '—', icon: <Star className="w-4 h-4 text-amber-500" /> },
                { label: 'Completion Rate', val: `${analytics.completionRate}%`, icon: <TrendingUp className="w-4 h-4 text-cyan-500" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-[11px] font-mono text-zinc-500">{s.label}</span></div>
                  <p className="text-2xl font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-500 mb-4 uppercase tracking-wider">STATUS DISTRIBUTION</p>
                {Object.entries(analytics.statusDistribution || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between mb-3">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">{k}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${analytics.totalAttempts > 0 ? (v / analytics.totalAttempts) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 w-4 text-right">{v}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-500 mb-4 uppercase tracking-wider">BADGE DISTRIBUTION</p>
                {Object.entries(analytics.badgeDistribution || {}).length === 0
                  ? <p className="text-zinc-500 text-sm">No badges assigned yet</p>
                  : Object.entries(analytics.badgeDistribution || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between mb-3">
                      <BadgeChip badge={k} />
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{v}</span>
                    </div>
                  ))}
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-500 mb-4 uppercase tracking-wider">SKILL HEATMAP (AVG)</p>
                {analytics.skillHeatmap && Object.entries(analytics.skillHeatmap).map(([k, v]) => (
                  <div key={k} className="flex flex-col mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{v}/10</span>
                    </div>
                    <ScoreBar val={v} max={10} color={
                      v >= 8 ? 'bg-emerald-500' : v >= 6 ? 'bg-amber-500' : 'bg-rose-500'
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
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates..." onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all w-48 sm:w-64" />
              </div>
              <input type="number" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)}
                placeholder="Min score" min={0} max={10} step={0.5}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 font-mono w-24 transition-all" />
              <input type="number" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)}
                placeholder="Max score" min={0} max={10} step={0.5}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 font-mono w-24 transition-all" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
              <button onClick={loadData} className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors shadow-sm">Apply</button>
              <span className="ml-auto text-xs font-mono font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">{entries.length} candidates</span>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <Trophy className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500">No candidates found for this filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, idx) => (
                  <motion.div key={entry.interviewId}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                    onClick={() => navigate(`/org/interview/${templateId}/candidate/${entry.interviewId}`)}
                    className={`rounded-xl p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md transition-all shadow-sm border ${getRankBg(entry.rank)}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      
                      {/* Rank & User Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 text-center">
                          {getMedal(entry.rank)
                            ? <span className="text-2xl drop-shadow-sm">{getMedal(entry.rank)}</span>
                            : <span className="text-sm font-mono font-bold text-zinc-400">#{entry.rank}</span>}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-base font-bold text-blue-600 dark:text-blue-400 overflow-hidden border border-blue-200 dark:border-blue-500/30">
                          {entry.profilePicture
                            ? <img src={entry.profilePicture} alt="" className="w-full h-full object-cover" />
                            : entry.candidateName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{entry.candidateName}</p>
                          <p className="text-[11px] font-mono text-zinc-500 truncate">
                            {entry.email}
                          </p>
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="flex items-center gap-6 flex-shrink-0 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div className="text-center w-14">
                          <p className={`font-bold text-xl ${
                            entry.overallScore >= 8 ? 'text-emerald-600 dark:text-emerald-500' :
                            entry.overallScore >= 6 ? 'text-amber-600 dark:text-amber-500' : 'text-rose-600 dark:text-rose-500'
                          }`} style={{ fontFamily: 'Poppins, sans-serif' }}>{entry.overallScore.toFixed(1)}</p>
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Overall</p>
                        </div>
                        <div className="hidden lg:flex flex-col gap-1.5 w-32">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-500 w-6">Tech</span>
                            <ScoreBar val={entry.technicalScore} color="bg-indigo-500" />
                            <span className="text-[9px] font-mono font-medium text-zinc-700 dark:text-zinc-300 w-5">{entry.technicalScore.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-500 w-6">Comm</span>
                            <ScoreBar val={entry.communicationScore} color="bg-cyan-500" />
                            <span className="text-[9px] font-mono font-medium text-zinc-700 dark:text-zinc-300 w-5">{entry.communicationScore.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-500 w-6">Prob</span>
                            <ScoreBar val={entry.problemSolvingScore} color="bg-emerald-500" />
                            <span className="text-[9px] font-mono font-medium text-zinc-700 dark:text-zinc-300 w-5">{entry.problemSolvingScore.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Meta & Status */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0 sm:w-64">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">{fmtTime(entry.totalTimeTaken)}</p>
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Time</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <BadgeChip badge={entry.badge} />
                          {entry.status === 'Auto-submitted' && (
                            <span className="text-[9px] font-mono text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-1.5 py-0.5 rounded-md shadow-sm">Auto-submit</span>
                          )}
                        </div>
                        <div className="pl-2 border-l border-zinc-200 dark:border-zinc-800">
                           <StatusSelect
                             current={entry.candidateStatus}
                             onChange={(s) => handleStatusChange(entry.interviewId, s)}
                             disabled={updatingStatus === entry.interviewId}
                           />
                        </div>
                      </div>
                    </div>

                    {/* Tags row */}
                    {entry.candidateTags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 ml-0 sm:ml-12 lg:ml-14 border-t border-zinc-100 dark:border-zinc-800/50 pt-3">
                        {entry.candidateTags.map((tag, ti) => (
                          <span key={ti} className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-md shadow-sm">{tag}</span>
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
