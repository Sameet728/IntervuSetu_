import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Badge, Spinner, ScorePill } from '../components/ui/index'
import { getMyInterviews, deleteInterview } from '../api/interviewAPI'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Plus, Search, Trash2, BarChart3, Clock, Code2, Brain,
  Users, Layers, Sparkles, ChevronRight, RotateCw, TrendingUp,
  CheckCircle2, AlertCircle, Circle, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STATUS_CONFIG = {
  completed:      { label: 'Completed',   color: 'green',  icon: <CheckCircle2 className="w-3 h-3" /> },
  auto_submitted: { label: 'Auto-Submit', color: 'amber',  icon: <AlertCircle  className="w-3 h-3" /> },
  created:        { label: 'Not Started', color: 'slate',  icon: <Circle       className="w-3 h-3" /> },
  active:         { label: 'In Progress', color: 'blue',   icon: <RotateCw     className="w-3 h-3 animate-spin" /> },
}

const TYPE_ICONS = {
  technical:    <Code2    className="w-4 h-4" />,
  hr:           <Users    className="w-4 h-4" />,
  behavioral:   <Brain    className="w-4 h-4" />,
  system_design:<Layers   className="w-4 h-4" />,
  mixed:        <Sparkles className="w-4 h-4" />,
}

const RECOM = {
  strong_hire: { label: 'Strong Hire', color: 'text-green-400' },
  hire:        { label: 'Hire',        color: 'text-green-400' },
  borderline:  { label: 'Borderline',  color: 'text-amber-400' },
  no_hire:     { label: 'No Hire',     color: 'text-red-400'   },
  strong_no_hire: { label: 'No Hire',  color: 'text-red-400'   },
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-500">{label}</p>
      <p className="text-blue-400 font-semibold font-mono">{payload[0]?.value?.toFixed(1)}/10</p>
    </div>
  )
}

const fmtTime = (s = 0) => { if (!s) return '—'; const m = Math.floor(s / 60); return `${m}m ${s % 60}s` }
const timeAgo = (d) => {
  const diff = (Date.now() - new Date(d)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort]             = useState('newest')
  const [deleting, setDeleting]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getMyInterviews({ limit: 50, sort })
      setInterviews(res.data.data || [])
      setStats(res.data.stats || null)
    } catch { toast.error('Failed to load interviews') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [sort])

  const handleDelete = async (id, e) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this interview?')) return
    setDeleting(id)
    try {
      await deleteInterview(id)
      setInterviews(p => p.filter(i => i._id !== id))
      toast.success('Deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete active interview')
    } finally { setDeleting(null) }
  }

  const filtered = useMemo(() => {
    return interviews.filter(iv => {
      const matchSearch = !search ||
        iv.role?.toLowerCase().includes(search.toLowerCase()) ||
        iv.techStack?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      const matchStatus = statusFilter === 'all' || iv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [interviews, search, statusFilter])

  const chartData = useMemo(() => {
    return interviews
      .filter(iv => iv.reportData?.overallScore != null)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .slice(-10)
      .map((iv, i) => ({ name: `#${i + 1}`, score: iv.reportData.overallScore, role: iv.role }))
  }, [interviews])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-6 border-b border-zinc-200 dark:border-zinc-900 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Welcome back, {user?.name?.split(' ')[0] || 'there'}
              </h1>
              {user?.plan === 'pro' ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800">PRO</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">FREE</span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">Track your interview performance</p>
          </div>
          <div className="flex gap-2">
            <Link to="/aptitude">
              <Button variant="secondary" size="sm">
                <Brain className="w-3.5 h-3.5 text-blue-500" />Aptitude Test
              </Button>
            </Link>
            <Link to="/interview/create">
              <Button variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5" />New Interview
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',      value: stats?.total ?? '—',     icon: <BarChart3  className="w-4 h-4" />, color: 'text-zinc-900 dark:text-zinc-100' },
            { label: 'Completed',  value: stats?.completed ?? '—', icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, color: 'text-green-400' },
            { label: 'Avg Score',  value: stats?.avgScore != null ? `${stats.avgScore}/10` : '—', icon: <TrendingUp className="w-4 h-4 text-blue-400" />, color: 'text-blue-400' },
            { label: 'High Score', value: interviews.filter(i => i.reportData?.overallScore >= 7).length || '—', icon: <Sparkles className="w-4 h-4 text-amber-400" />, color: 'text-amber-400' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">{s.label}</span>
                <span className="text-zinc-600">{s.icon}</span>
              </div>
              <div className={`text-xl font-semibold tabular-nums ${s.color}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                {s.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Score chart ──────────────────────────────────────── */}
        {chartData.length > 1 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200" style={{ fontFamily: 'Poppins, sans-serif' }}>Score Progression</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Filter Row ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by role or tech..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'completed', 'active', 'created'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === f
                    ? 'border-blue-600/50 bg-blue-600/10 text-blue-400'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-700 dark:text-zinc-300'
                }`}>
                {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
              </button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-600 dark:text-zinc-400 px-3 py-2 outline-none focus:border-zinc-700 min-w-[130px]">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {/* ── Interview list ───────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            {interviews.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-zinc-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">No interviews yet</p>
                <p className="text-xs text-zinc-600 mb-4">Start your first AI interview session</p>
                <Link to="/interview/create"><Button variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Create Interview</Button></Link>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No interviews match your filter.</p>
            )}
          </div>
        ) : (
          /* ── Table-style list ─── */
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-zinc-600 w-8" />
              <span className="text-xs font-medium text-zinc-500">Role / Tech Stack</span>
              <span className="text-xs font-medium text-zinc-500 hidden sm:block w-24">Status</span>
              <span className="text-xs font-medium text-zinc-500 hidden sm:block w-16 text-right">Score</span>
              <span className="text-xs font-medium text-zinc-500 w-16 text-right">Time</span>
            </div>

            <AnimatePresence>
              {filtered.map((iv, i) => {
                const cfg = STATUS_CONFIG[iv.status] || STATUS_CONFIG.created
                const rd = iv.reportData
                const canView   = ['completed', 'auto_submitted'].includes(iv.status)
                const canResume = ['created', 'active', 'paused'].includes(iv.status)
                const rec = RECOM[rd?.recommendation]

                return (
                  <motion.div
                    key={iv._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      if (canView)   navigate(`/interview/${iv._id}/report`)
                      else if (canResume) navigate(`/interview/${iv._id}/room`)
                    }}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950
                      transition-colors group
                      ${(canView || canResume) ? 'hover:bg-white dark:bg-zinc-900 cursor-pointer' : ''}
                      ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                  >
                    {/* Type icon */}
                    <div className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover:text-zinc-600 dark:text-zinc-400 transition-colors shrink-0">
                      {TYPE_ICONS[iv.interviewType] || <Brain className="w-4 h-4" />}
                    </div>

                    {/* Role + meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{iv.role}</p>
                        {rec && <span className={`text-[10px] font-mono ${rec.color} hidden lg:inline`}>{rec.label}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {iv.techStack?.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] text-zinc-600 font-mono">{t}</span>
                        ))}
                        {(iv.techStack?.length || 0) > 3 && (
                          <span className="text-[10px] text-zinc-700">+{iv.techStack.length - 3}</span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="hidden sm:flex w-24">
                      <Badge color={cfg.color}>{cfg.icon}{cfg.label}</Badge>
                    </div>

                    {/* Score */}
                    <div className="hidden sm:flex w-16 justify-end">
                      {rd?.overallScore != null
                        ? <ScorePill score={rd.overallScore} />
                        : <span className="text-xs text-zinc-700">—</span>
                      }
                    </div>

                    {/* Time + delete */}
                    <div className="w-16 flex items-center justify-end gap-1.5">
                      <span className="text-[11px] font-mono text-zinc-600">
                        {iv.totalTimeTaken ? fmtTime(iv.totalTimeTaken) : timeAgo(iv.createdAt)}
                      </span>
                      <button
                        onClick={(e) => handleDelete(iv._id, e)}
                        disabled={iv.status === 'active' || deleting === iv._id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-700 hover:text-red-400 transition-all"
                      >
                        {deleting === iv._id ? (
                          <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Mobile FAB */}
        <div className="sm:hidden fixed bottom-6 right-5 z-20">
          <Link to="/interview/create">
            <button className="w-12 h-12 rounded-full bg-blue-600 text-zinc-900 dark:text-white flex items-center justify-center shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
