import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import {
  getOrgAptitudeLeaderboard, getOrgAptitudeAnalytics,
  updateOrgCandidateStatus, sendOrgAptitudeInvite, exportOrgAptitudeCSV,
} from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  ArrowLeft, Trophy, Medal, Award, Search, Download, Mail, Copy,
  Clock, TrendingUp, Users, BarChart3, CheckCircle2, Shield,
  Send, Loader2, Brain, GraduationCap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button, StatusBadge, Modal, Textarea, Tabs,
  EmptyState, SkeletonList, IconButton,
} from '../../components/ui/index'
import { usePageEnter } from '../../motion/hooks'

const fmtTime = (s) => {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

const CAT_TONES = {
  numerical: 'text-accent',
  verbal: 'text-success-500',
  logical: 'text-ai',
  situational: 'text-warning-500',
}

const STATUS_TONES = {
  pending: 'text-subtle',
  shortlisted: 'text-warning-500',
  selected: 'text-success-500',
  rejected: 'text-danger-500',
}

function StatusSelect({ current, onChange, disabled }) {
  const opts = [
    { val: 'pending', label: 'Pending', color: 'text-subtle' },
    { val: 'shortlisted', label: 'Shortlisted', color: 'text-warning-500' },
    { val: 'selected', label: 'Selected', color: 'text-success-500' },
    { val: 'rejected', label: 'Rejected', color: 'text-danger-500' },
  ]
  const cur = opts.find(o => o.val === current) || opts[0]
  return (
    <select value={current} onChange={e => onChange(e.target.value)} disabled={disabled}
      onClick={e => e.stopPropagation()}
      aria-label="Student decision"
      className={`cursor-pointer rounded-md border border-hairline bg-transparent px-2 py-1 text-2xs font-medium transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 ${cur.color}`}>
      {opts.map(o => <option key={o.val} value={o.val} className="bg-surface text-ink">{o.label}</option>)}
    </select>
  )
}

function ScoreBar({ val, max = 100, color = 'bg-accent-500' }) {
  const tone = color || (val >= 75 ? 'bg-success-500' : val >= 50 ? 'bg-warning-500' : 'bg-danger-500')
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
      <div className={`h-full rounded-full transition-all duration-slow ${tone}`} style={{ width: `${Math.min(val, max)}%` }} />
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
    <Modal
      open
      onClose={onClose}
      title="Send invites"
      description="Students receive the join link by email."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} icon={sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}>
            {sending ? 'Sending…' : 'Send invites'}
          </Button>
        </>
      }
    >
      <Textarea
        label="Email addresses"
        value={emails}
        onChange={e => setEmails(e.target.value)}
        placeholder={"Separate with comma, semicolon or newline\ne.g. alice@college.edu\nbob@company.com"}
        rows={6}
        hint="One address per line, or comma separated."
      />
    </Modal>
  )
}

const TH = 'px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-[0.06em] text-subtle whitespace-nowrap'
const TD = 'px-3 py-3 align-middle'

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

  const root = usePageEnter([])

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

  const getMedal = (rank) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-warning-500" aria-hidden />
    if (rank === 2) return <Medal className="h-4 w-4 text-ink-faint" aria-hidden />
    if (rank === 3) return <Award className="h-4 w-4 text-ai" aria-hidden />
    return null
  }

  const analyticsStats = analytics ? [
    { label: 'Total attempts', val: analytics.totalAttempts, Icon: Users },
    { label: 'Completed', val: analytics.completedAttempts, Icon: CheckCircle2 },
    { label: 'Avg accuracy', val: analytics.avgAccuracy ? `${analytics.avgAccuracy}%` : '—', Icon: TrendingUp },
    { label: 'Completion rate', val: `${analytics.completionRate}%`, Icon: BarChart3 },
  ] : []

  return (
    <div ref={root} className="page-shell flex flex-col">
      <OrgNavbar />

      <header data-enter className="glass sticky top-14 z-30 border-b border-hairline">
        <div className="container-page flex flex-wrap items-center gap-3 py-3">
          <IconButton label="Back to dashboard" onClick={() => navigate('/org/dashboard')} className="-ml-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </IconButton>
          <span className="hidden h-4 w-px bg-hairline sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-ink">{test?.title || 'Aptitude results'}</h1>
            <p className="num t-xs truncate">
              {test?.questionCount}Q<span aria-hidden> · </span>{test?.duration}min
              {test?.categories?.length > 0 && <><span aria-hidden> · </span><span className="capitalize">{test.categories.join(', ')}</span></>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={copied ? 'secondary' : 'outline'} size="sm" onClick={copyJoinLink}
              className={copied ? 'border-success/40 text-success-500' : ''}
              icon={<Copy className="h-3.5 w-3.5" aria-hidden />}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowInvite(true)} icon={<Mail className="h-3.5 w-3.5" aria-hidden />}>
              Invite
            </Button>
            <Button variant="ghost" size="sm" onClick={() => exportOrgAptitudeCSV(testId)} icon={<Download className="h-3.5 w-3.5" aria-hidden />}>
              CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container-page flex-1 pb-16 pt-6">
        <div data-enter>
          <Tabs
            ariaLabel="Results view"
            value={tab}
            onChange={setTab}
            className="mb-6"
            tabs={[
              { value: 'board', label: 'Leaderboard', icon: <Trophy className="h-3.5 w-3.5" aria-hidden /> },
              { value: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden /> },
            ]}
          />
        </div>

        {/* ── ANALYTICS ─────────────────────────────────────────────── */}
        {tab === 'analytics' && analytics && (
          <div data-enter role="tabpanel" aria-label="Aptitude analytics" className="space-y-4">
            <section aria-label="Results summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {analyticsStats.map((s) => (
                <div key={s.label} className="card p-4">
                  <p className="eyebrow mb-2 flex items-center gap-2">
                    <s.Icon className="h-4 w-4 text-subtle" aria-hidden />{s.label}
                  </p>
                  <p className="num-lg text-ink">{s.val}</p>
                </div>
              ))}
            </section>

            <div className="grid gap-4 sm:grid-cols-3">
              <section aria-label="Score distribution" className="card p-5">
                <h2 className="eyebrow mb-4">Score distribution</h2>
                {Object.entries(analytics.scoreDist || {}).map(([range, count]) => (
                  <div key={range} className="mb-3 flex items-center gap-3">
                    <span className="num w-14 shrink-0 text-xs text-subtle">{range}%</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: analytics.completedAttempts > 0 ? `${(count / analytics.completedAttempts) * 100}%` : '0%' }} />
                    </div>
                    <span className="num w-6 shrink-0 text-right text-xs text-muted">{count}</span>
                  </div>
                ))}
              </section>

              <section aria-label="Category accuracy" className="card p-5">
                <h2 className="eyebrow mb-4">Category accuracy (avg)</h2>
                {Object.entries(analytics.categoryHeatmap || {}).map(([cat, pct]) => (
                  <div key={cat} className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className={`t-sm font-medium capitalize ${CAT_TONES[cat] || 'text-muted'}`}>{cat}</span>
                      <span className="num text-xs text-muted">{pct}%</span>
                    </div>
                    <ScoreBar val={pct} />
                  </div>
                ))}
              </section>

              <section aria-label="Candidate status" className="card p-5">
                <h2 className="eyebrow mb-4">Candidate status</h2>
                {Object.entries(analytics.statusDist || {}).map(([k, v]) => (
                  <div key={k} className="mb-3 flex items-center justify-between gap-3">
                    <span className={`t-sm capitalize ${STATUS_TONES[k] || 'text-muted'}`}>{k}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-hairline">
                        <div className="h-full rounded-full bg-accent-500" style={{ width: analytics.completedAttempts > 0 ? `${(v / analytics.completedAttempts) * 100}%` : '0%' }} />
                      </div>
                      <span className="num w-6 shrink-0 text-right text-xs text-muted">{v}</span>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ───────────────────────────────────────────── */}
        {tab === 'board' && (
          <div data-enter role="tabpanel" aria-label="Student leaderboard">
            <section aria-label="Filter students" className="mb-5 flex flex-wrap items-end gap-2">
              <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search students"
                  onKeyDown={e => e.key === 'Enter' && loadData()}
                  aria-label="Search students"
                  className="input pl-9" />
              </div>
              <div>
                <label htmlFor="acc-min" className="field-label mb-1">Min %</label>
                <input id="acc-min" type="number" value={scoreMin} onChange={e => setScoreMin(e.target.value)}
                  placeholder="0" min={0} max={100} className="num input w-24" />
              </div>
              <div>
                <label htmlFor="acc-max" className="field-label mb-1">Max %</label>
                <input id="acc-max" type="number" value={scoreMax} onChange={e => setScoreMax(e.target.value)}
                  placeholder="100" min={0} max={100} className="num input w-24" />
              </div>
              <div>
                <label htmlFor="status-filter" className="field-label mb-1">Status</label>
                <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input cursor-pointer">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <Button variant="secondary" onClick={loadData}>Apply</Button>
              <span className="num badge ml-auto">{entries.length} students</span>
            </section>

            {loading ? (
              <div className="card p-4"><SkeletonList rows={6} /></div>
            ) : entries.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Brain className="h-5 w-5" aria-hidden />}
                  title="No students found"
                  description="Nobody matches this filter for this aptitude test yet."
                />
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full min-w-[58rem] border-collapse text-left">
                    <caption className="sr-only">
                      Student results for {test?.title || 'this aptitude test'}, sorted by rank.
                    </caption>
                    <thead className="sticky top-0 z-10 bg-surface shadow-1">
                      <tr className="border-b border-hairline">
                        <th scope="col" className={TH}>Rank</th>
                        <th scope="col" className={TH}>Student</th>
                        <th scope="col" className={`${TH} text-right`}>Accuracy</th>
                        <th scope="col" className={TH}>Categories</th>
                        <th scope="col" className={`${TH} text-right`}>Time</th>
                        <th scope="col" className={`${TH} text-right`}>Proctoring</th>
                        <th scope="col" className={TH}>Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {entries.map((entry, idx) => (
                        <motion.tr
                          key={entry.attemptId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.015, duration: 0.18 }}
                          onClick={() => navigate(`/org/aptitude/${testId}/student/${entry.attemptId}`)}
                          className="transition-colors duration-fast hover:bg-inset"
                        >
                          <td className={TD}>
                            <span className="flex items-center gap-1.5">
                              {getMedal(entry.rank)}
                              <span className="num text-xs font-semibold text-subtle">#{entry.rank}</span>
                            </span>
                          </td>

                          <td className={TD}>
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline bg-accent-soft/60 text-xs font-bold text-accent" aria-hidden>
                                {entry.profilePicture
                                  ? <img src={entry.profilePicture} alt="" className="h-full w-full object-cover" />
                                  : entry.candidateName[0]?.toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-[16rem] truncate text-[0.8125rem] font-semibold text-ink">{entry.candidateName}</p>
                                <p className="num max-w-[16rem] truncate text-2xs text-subtle">{entry.college || entry.company || entry.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className={`${TD} text-right`}>
                            <span className={`num text-lg font-semibold ${
                              entry.accuracy >= 75 ? 'text-success-500' : entry.accuracy >= 50 ? 'text-warning-500' : 'text-danger-500'
                            }`}>{entry.accuracy}%</span>
                          </td>

                          <td className={TD}>
                            <div className="flex w-44 flex-col gap-1.5">
                              {Object.entries(entry.categoryScores || {}).filter(([, v]) => v?.total > 0).map(([cat, v]) => (
                                <div key={cat} className="flex items-center gap-2">
                                  <span className="w-10 shrink-0 text-3xs capitalize text-subtle">{cat.slice(0, 4)}</span>
                                  <ScoreBar val={v.total > 0 ? (v.score / v.total) * 100 : 0} />
                                  <span className="num w-9 shrink-0 text-right text-3xs font-medium text-muted">{v.score}/{v.total}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className={`${TD} text-right whitespace-nowrap`}>
                            <span className="num text-xs text-muted">{fmtTime(entry.timeTaken)}</span>
                          </td>

                          <td className={`${TD} text-right whitespace-nowrap`}>
                            {entry.violations > 0
                              ? <StatusBadge tone="warn" className="justify-end"><span className="num">{entry.violations}</span> violations</StatusBadge>
                              : <span className="t-xs">None</span>}
                          </td>

                          <td className={`${TD} whitespace-nowrap border-l border-hairline pl-3`}>
                            <StatusSelect
                              current={entry.candidateStatus}
                              onChange={s => handleStatusChange(entry.attemptId, s)}
                              disabled={updatingStatus === entry.attemptId}
                            />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showInvite && <InviteModal testId={testId} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
