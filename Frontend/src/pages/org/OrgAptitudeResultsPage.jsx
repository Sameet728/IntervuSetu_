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
  Send, X, Loader2, Brain, XCircle, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/index'

const fmtTime = (s) => {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

const CAT_COLORS = { numerical: 'text-blue-600 dark:text-blue-500', verbal: 'text-green-600 dark:text-green-500', logical: 'text-indigo-600 dark:text-indigo-500', situational: 'text-amber-600 dark:text-amber-500' }

function StatusSelect({ current, onChange, disabled }) {
  const opts = [
    { val: 'pending', label: 'Pending', color: 'text-zinc-500' },
    { val: 'shortlisted', label: 'Shortlisted', color: 'text-amber-600 dark:text-amber-500' },
    { val: 'selected', label: 'Selected', color: 'text-green-600 dark:text-green-500' },
    { val: 'rejected', label: 'Rejected', color: 'text-red-600 dark:text-red-500' },
  ]
  const cur = opts.find(o => o.val === current) || opts[0]
  return (
    <select value={current} onChange={e => onChange(e.target.value)} disabled={disabled}
      onClick={e => e.stopPropagation()}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-semibold px-2.5 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 ${cur.color} disabled:opacity-50 transition-shadow`}>
      {opts.map(o => <option key={o.val} value={o.val} className="text-zinc-700 dark:text-zinc-300 font-medium">{o.label}</option>)}
    </select>
  )
}

function ScoreBar({ val, max = 100 }) {
  const color = val >= 75 ? 'bg-green-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 rounded-full transition-all duration-500 ease-out`} style={{ width: `${Math.min(val, 100)}%` }} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 dark:bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
            Send Invites
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-4 h-4" /></button>
        </div>
        <textarea value={emails} onChange={e => setEmails(e.target.value)}
          placeholder={"Enter emails separated by comma, semicolon, or newline\ne.g.\nalice@college.edu\nbob@company.com"}
          rows={5}
          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-600 font-mono resize-none mb-5 transition-all" />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSend} disabled={sending} className="flex-1">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Invites'}
          </Button>
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
    if (rank === 1) return 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
    if (rank === 2) return 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
    if (rank === 3) return 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50'
    return 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      {/* Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/org/dashboard')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex-1 min-w-0 border-l border-zinc-200 dark:border-zinc-800 pl-4">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{test?.title || 'Aptitude Results'}</p>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">
              {test?.questionCount}Q • {test?.duration}min •{' '}
              {test?.categories?.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyJoinLink} className={copied ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : ''}>
              <Copy className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
              <Mail className="w-3.5 h-3.5" />Invite
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportOrgAptitudeCSV(testId)}>
              <Download className="w-3.5 h-3.5" />CSV
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 w-fit shadow-sm">
          {[{ id: 'board', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  tab === t.id 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm' 
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
        </div>

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Attempts', val: analytics.totalAttempts, icon: <Users className="w-5 h-5 text-blue-600 dark:text-blue-500" /> },
                { label: 'Completed', val: analytics.completedAttempts, icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" /> },
                { label: 'Avg Accuracy', val: analytics.avgAccuracy ? `${analytics.avgAccuracy}%` : '—', icon: <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> },
                { label: 'Completion Rate', val: `${analytics.completionRate}%`, icon: <BarChart3 className="w-5 h-5 text-amber-500" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
                      {s.icon}
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{s.val}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {/* Score Distribution */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 mb-5 tracking-wider uppercase">SCORE DISTRIBUTION</p>
                {Object.entries(analytics.scoreDist || {}).map(([range, count]) => (
                  <div key={range} className="flex items-center gap-3 mb-3 last:mb-0">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-14">{range}%</span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: analytics.completedAttempts > 0 ? `${(count / analytics.completedAttempts) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-sm font-mono font-medium text-zinc-600 dark:text-zinc-400 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>

              {/* Category Heatmap */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 mb-5 tracking-wider uppercase">CATEGORY ACCURACY (AVG)</p>
                {Object.entries(analytics.categoryHeatmap || {}).map(([cat, pct]) => (
                  <div key={cat} className="mb-4 last:mb-0">
                    <div className="flex justify-between mb-1.5">
                      <span className={`text-sm font-medium capitalize ${CAT_COLORS[cat] || 'text-zinc-500'}`}>{cat}</span>
                      <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">{pct}%</span>
                    </div>
                    <ScoreBar val={pct} />
                  </div>
                ))}
              </div>

              {/* Status distribution */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 mb-5 tracking-wider uppercase">CANDIDATE STATUS</p>
                {Object.entries(analytics.statusDist || {}).map(([k, v]) => {
                  const colors = { pending: 'text-zinc-500', shortlisted: 'text-amber-600 dark:text-amber-500', selected: 'text-green-600 dark:text-green-500', rejected: 'text-red-600 dark:text-red-500' }
                  return (
                    <div key={k} className="flex items-center justify-between mb-3 last:mb-0">
                      <span className={`text-sm font-medium capitalize ${colors[k]}`}>{k}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: analytics.completedAttempts > 0 ? `${(v / analytics.completedAttempts) * 100}%` : '0%' }} />
                        </div>
                        <span className="text-sm font-mono font-medium text-zinc-600 dark:text-zinc-400 w-6 text-right">{v}</span>
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
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search students..." onKeyDown={e => e.key === 'Enter' && loadData()}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-500 transition-all" />
              </div>
              <input type="number" value={scoreMin} onChange={e => setScoreMin(e.target.value)}
                placeholder="Min %" min={0} max={100}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-500 font-mono w-24 transition-all" />
              <input type="number" value={scoreMax} onChange={e => setScoreMax(e.target.value)}
                placeholder="Max %" min={0} max={100}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-400 dark:placeholder-zinc-500 font-mono w-24 transition-all" />
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-medium transition-all">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <Button variant="primary" onClick={loadData} className="px-5">Apply</Button>
              <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                <Users className="w-3.5 h-3.5" />
                {entries.length} students
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-zinc-500 text-sm font-medium">Loading results...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>No results yet</h3>
                <p className="text-zinc-500 text-sm">No students have completed this aptitude test matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, idx) => (
                  <motion.div key={entry.attemptId}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    className={`border rounded-xl p-5 hover:shadow-md transition-all duration-200 ${getRankBg(entry.rank)}`}>
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-12 text-center bg-white/50 dark:bg-black/20 rounded-lg py-2 border border-black/5 dark:border-white/5">
                        {getMedal(entry.rank)
                          ? <span className="text-2xl drop-shadow-sm">{getMedal(entry.rank)}</span>
                          : <span className="text-sm font-bold text-zinc-500 font-mono">#{entry.rank}</span>}
                      </div>

                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center flex-shrink-0 text-base font-bold text-blue-600 dark:text-blue-400 overflow-hidden shadow-sm">
                          {entry.profilePicture
                            ? <img src={entry.profilePicture} alt="" className="w-full h-full object-cover" />
                            : entry.candidateName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-base text-zinc-900 dark:text-zinc-100 truncate mb-0.5" style={{ fontFamily: 'Poppins, sans-serif' }}>{entry.candidateName}</p>
                          <p className="text-xs text-zinc-500 truncate flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            {entry.college || entry.company || entry.email}
                          </p>
                        </div>
                      </div>

                      {/* Accuracy + Category bars */}
                      <div className="flex items-center gap-6 flex-shrink-0 bg-white/50 dark:bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                        <div className="text-center px-2">
                          <p className={`font-bold text-2xl font-mono leading-none ${entry.accuracy >= 75 ? 'text-green-600 dark:text-green-500' : entry.accuracy >= 50 ? 'text-amber-600 dark:text-amber-500' : 'text-red-600 dark:text-red-500'}`}>
                            {entry.accuracy}%
                          </p>
                          <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">Accuracy</p>
                        </div>
                        <div className="hidden sm:flex flex-col gap-1.5 w-36 border-l border-zinc-200 dark:border-zinc-700 pl-4">
                          {Object.entries(entry.categoryScores || {}).filter(([, v]) => v?.total > 0).map(([cat, v]) => (
                            <div key={cat} className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-zinc-500 w-8 uppercase tracking-wide truncate">{cat.slice(0, 3)}</span>
                              <ScoreBar val={v.total > 0 ? (v.score / v.total) * 100 : 0} color={
                                cat === 'numerical' ? 'bg-blue-500' : 
                                cat === 'verbal' ? 'bg-green-500' : 
                                cat === 'logical' ? 'bg-indigo-500' : 'bg-amber-500'
                              } />
                              <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 font-mono w-8 text-right">{v.score}/{v.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right meta */}
                      <div className="flex items-center gap-5 flex-shrink-0 ml-auto">
                        <div className="text-center hidden lg:block bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono flex items-center justify-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-400"/>{fmtTime(entry.timeTaken)}</p>
                          <p className="text-[10px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-wider">Duration</p>
                        </div>
                        {entry.violations > 0 && (
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {entry.violations} violations
                          </span>
                        )}
                        <div className="border-l border-zinc-200 dark:border-zinc-700 pl-5">
                          <StatusSelect
                            current={entry.candidateStatus}
                            onChange={s => handleStatusChange(entry.attemptId, s)}
                            disabled={updatingStatus === entry.attemptId}
                          />
                        </div>
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
