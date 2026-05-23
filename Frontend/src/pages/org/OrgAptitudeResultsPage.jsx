import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import {
  getOrgAptitudeLeaderboard, getOrgAptitudeAnalytics,
  updateOrgCandidateStatus, sendOrgAptitudeInvite, exportOrgAptitudeCSV,
  closeOrgAptitudeTest,
} from '../../api/orgAPI'
import {
  ArrowLeft, Trophy, Search, Download, Mail, Copy,
  Clock, TrendingUp, Users, BarChart3, CheckCircle2, Shield,
  Send, X, Loader2, Brain, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

const fmtTime = (s) => {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

const CAT_COLORS = { numerical: 'text-blue-400', verbal: 'text-emerald', logical: 'text-violet', situational: 'text-amber' }

function StatusSelect({ current, onChange, disabled }) {
  const opts = [
    { val: 'pending', label: 'Pending', color: 'text-slate-400' },
    { val: 'shortlisted', label: 'Shortlisted', color: 'text-amber' },
    { val: 'selected', label: 'Selected', color: 'text-emerald' },
    { val: 'rejected', label: 'Rejected', color: 'text-rose' },
  ]
  const cur = opts.find(o => o.val === current) || opts[0]
  return (
    <select value={current} onChange={e => onChange(e.target.value)} disabled={disabled}
      onClick={e => e.stopPropagation()}
      className={`bg-transparent border border-border rounded-lg text-[11px] font-mono px-2 py-1 outline-none cursor-pointer ${cur.color} disabled:opacity-50`}>
      {opts.map(o => <option key={o.val} value={o.val} className="bg-[#0d1117] text-slate-300">{o.label}</option>)}
    </select>
  )
}

function ScoreBar({ val, max = 100 }) {
  const color = val >= 75 ? 'bg-emerald' : val >= 50 ? 'bg-amber' : 'bg-rose'
  return (
    <div className="w-full bg-surface rounded-full h-1">
      <div className={`${color} h-1 rounded-full`} style={{ width: `${Math.min(val, 100)}%` }} />
    </div>
  )
}

function InviteModal({ testId, onClose }) {
  const [emails, setEmails] = useState('')
  const [sending, setSending] = useState(false)
  const handleSend = async () => {
    const list = emails.split(/[\n,;]/).map(e => e.trim()).filter(Boolean)
    if (!list.length) return toast.error('Enter at least one email')
    setSending(true)
    try {
      const res = await sendOrgAptitudeInvite(testId, { emails: list })
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
          <h3 className="font-display font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Mail className="w-4 h-4 text-indigo-400" />Send Invites</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-zinc-900 dark:text-white"><X className="w-4 h-4" /></button>
        </div>
        <textarea value={emails} onChange={e => setEmails(e.target.value)}
          placeholder={"Enter emails separated by comma, semicolon, or newline\ne.g.\nalice@college.edu\nbob@company.com"}
          rows={5}
          className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-indigo-500/40 placeholder-slate-600 font-mono resize-none mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-border rounded-xl text-sm text-slate-400 hover:border-slate-600 transition-all">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-violet text-white font-bold rounded-xl text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Sending...' : 'Send Invites'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function OrgAptitudeResultsPage() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const { org } = useOrgAuth()
  const [loading, setLoading] = useState(true)
  const [test, setTest] = useState(null)
  const [entries, setEntries] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [scoreMin, setScoreMin] = useState('')
  const [scoreMax, setScoreMax] = useState('')
  const [tab, setTab] = useState('board')
  const [showInvite, setShowInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [lb, an] = await Promise.all([
        getOrgAptitudeLeaderboard(testId, { search, scoreMin, scoreMax, status: statusFilter }),
        getOrgAptitudeAnalytics(testId),
      ])
      setTest(lb.data.test)
      setEntries(lb.data.data)
      setAnalytics(an.data.data)
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }, [testId, search, scoreMin, scoreMax, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  const handleStatusChange = async (attemptId, status) => {
    setUpdatingStatus(attemptId)
    try {
      await updateOrgCandidateStatus(testId, attemptId, status)
      setEntries(prev => prev.map(e => e.attemptId === attemptId ? { ...e, candidateStatus: status } : e))
      toast.success(`Marked as ${status}`)
    } catch { toast.error('Failed to update') }
    finally { setUpdatingStatus(null) }
  }

  const copyJoinLink = () => {
    const url = `${window.location.origin}/aptitude/join/${test?.shareCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

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
            <p className="font-display font-semibold text-zinc-900 dark:text-white text-sm truncate">{test?.title || 'Aptitude Results'}</p>
            <p className="text-[10px] font-mono text-slate-500">
              {test?.questionCount}Q • {test?.duration}min •{' '}
              {test?.categories?.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyJoinLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-body transition-all ${copied ? 'border-emerald/30 text-emerald' : 'border-border text-slate-400 hover:border-cyan/30 hover:text-cyan'}`}>
              <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-body hover:bg-indigo-500/20 transition-all">
              <Mail className="w-3 h-3" />Invite
            </button>
            <button onClick={() => exportOrgAptitudeCSV(testId)}
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
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-medium transition-all ${tab === t.id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                {t.icon}{t.label}
              </button>
            ))}
        </div>

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Attempts', val: analytics.totalAttempts, icon: <Users className="w-4 h-4 text-violet" /> },
                { label: 'Completed', val: analytics.completedAttempts, icon: <CheckCircle2 className="w-4 h-4 text-emerald" /> },
                { label: 'Avg Accuracy', val: analytics.avgAccuracy ? `${analytics.avgAccuracy}%` : '—', icon: <TrendingUp className="w-4 h-4 text-cyan" /> },
                { label: 'Completion Rate', val: `${analytics.completionRate}%`, icon: <BarChart3 className="w-4 h-4 text-amber" /> },
              ].map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-[10px] font-mono text-slate-500">{s.label}</span></div>
                  <p className="font-display font-bold text-2xl text-zinc-900 dark:text-white">{s.val}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Score Distribution */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-mono text-slate-400 mb-4">SCORE DISTRIBUTION</p>
                {Object.entries(analytics.scoreDist || {}).map(([range, count]) => (
                  <div key={range} className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono text-slate-500 w-14">{range}%</span>
                    <div className="flex-1 bg-surface rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: analytics.completedAttempts > 0 ? `${(count / analytics.completedAttempts) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-4">{count}</span>
                  </div>
                ))}
              </div>

              {/* Category Heatmap */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-mono text-slate-400 mb-4">CATEGORY ACCURACY (AVG)</p>
                {Object.entries(analytics.categoryHeatmap || {}).map(([cat, pct]) => (
                  <div key={cat} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs font-body capitalize ${CAT_COLORS[cat] || 'text-slate-400'}`}>{cat}</span>
                      <span className="text-xs font-mono text-slate-300">{pct}%</span>
                    </div>
                    <ScoreBar val={pct} />
                  </div>
                ))}
              </div>

              {/* Status distribution */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-mono text-slate-400 mb-4">CANDIDATE STATUS</p>
                {Object.entries(analytics.statusDist || {}).map(([k, v]) => {
                  const colors = { pending: 'text-slate-400', shortlisted: 'text-amber', selected: 'text-emerald', rejected: 'text-rose' }
                  return (
                    <div key={k} className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-body capitalize ${colors[k]}`}>{k}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-surface rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: analytics.completedAttempts > 0 ? `${(v / analytics.completedAttempts) * 100}%` : '0%' }} />
                        </div>
                        <span className="text-xs font-mono text-slate-500 w-4">{v}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === 'board' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search students..." onKeyDown={e => e.key === 'Enter' && loadData()}
                  className="bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500/40 placeholder-slate-600 font-body w-48" />
              </div>
              <input type="number" value={scoreMin} onChange={e => setScoreMin(e.target.value)}
                placeholder="Min %" min={0} max={100}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono w-20" />
              <input type="number" value={scoreMax} onChange={e => setScoreMax(e.target.value)}
                placeholder="Max %" min={0} max={100}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono w-20" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-slate-300 outline-none font-mono">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
              <button onClick={loadData} className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-body hover:bg-indigo-500/20 transition-all">Apply</button>
              <span className="ml-auto text-[11px] font-mono text-slate-500">{entries.length} students</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20">
                <Brain className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-body">No students have completed this test yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, idx) => (
                  <motion.div key={entry.attemptId}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                    className={`border rounded-xl p-4 ${getRankBg(entry.rank)}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-10 text-center">
                        {getMedal(entry.rank)
                          ? <span className="text-xl">{getMedal(entry.rank)}</span>
                          : <span className="text-sm font-mono text-slate-500">#{entry.rank}</span>}
                      </div>

                      {/* Avatar + name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-400 overflow-hidden">
                          {entry.profilePicture
                            ? <img src={entry.profilePicture} alt="" className="w-full h-full object-cover" />
                            : entry.candidateName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-body font-semibold text-sm text-zinc-900 dark:text-white truncate">{entry.candidateName}</p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">{entry.college || entry.company || entry.email}</p>
                        </div>
                      </div>

                      {/* Accuracy + Category bars */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-center">
                          <p className={`font-display font-bold text-lg ${entry.accuracy >= 75 ? 'text-emerald' : entry.accuracy >= 50 ? 'text-amber' : 'text-rose'}`}>
                            {entry.accuracy}%
                          </p>
                          <p className="text-[9px] font-mono text-slate-600">Accuracy</p>
                        </div>
                        <div className="hidden sm:flex flex-col gap-1 w-32">
                          {Object.entries(entry.categoryScores || {}).filter(([, v]) => v?.total > 0).map(([cat, v]) => (
                            <div key={cat} className="flex items-center gap-1">
                              <span className="text-[9px] font-mono text-slate-600 w-8 capitalize">{cat.slice(0, 3)}</span>
                              <ScoreBar val={v.total > 0 ? (v.score / v.total) * 100 : 0} />
                              <span className="text-[9px] font-mono text-slate-500 w-8">{v.score}/{v.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right meta */}
                      <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                        <div className="text-center hidden md:block">
                          <p className="text-sm font-mono text-slate-400">{fmtTime(entry.timeTaken)}</p>
                          <p className="text-[9px] font-mono text-slate-600">Time</p>
                        </div>
                        {entry.violations > 0 && (
                          <span className="text-[9px] font-mono text-rose bg-rose/10 border border-rose/20 px-1.5 py-0.5 rounded-full">
                            ⚠ {entry.violations} violations
                          </span>
                        )}
                        <StatusSelect
                          current={entry.candidateStatus}
                          onChange={s => handleStatusChange(entry.attemptId, s)}
                          disabled={updatingStatus === entry.attemptId}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showInvite && <InviteModal testId={testId} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
