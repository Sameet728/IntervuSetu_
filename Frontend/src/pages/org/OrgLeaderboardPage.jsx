import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { getLeaderboard, getAnalytics, updateCandidateStatus, sendInvite } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  ArrowLeft, Trophy, Medal, Award, Search, Download, Mail, Copy,
  Clock, Star, Zap, MessageSquare, Code2, TrendingUp, Users, BarChart3,
  CheckCircle2, Send, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button, Badge, StatusBadge, Modal, Textarea, Tabs,
  EmptyState, SkeletonList, IconButton,
} from '../../components/ui/index'
import { usePageEnter } from '../../motion/hooks'

/* ─── Badge chip ──────────────────────────────────────────────────────────── */
const BADGE_META = {
  'Top Performer':       { color: 'amber',   Icon: Trophy },
  'Fast Solver':         { color: 'cyan',    Icon: Zap },
  'Strong Communicator': { color: 'violet',  Icon: MessageSquare },
  'Strong in DSA':       { color: 'emerald', Icon: Code2 },
}

function BadgeChip({ badge }) {
  if (!badge) return null
  const meta = BADGE_META[badge]
  const Icon = meta?.Icon
  return (
    <Badge color={meta?.color ?? 'default'}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {badge}
    </Badge>
  )
}

const STATUS_TONE = {
  pending:     'text-subtle',
  shortlisted: 'text-warning-500',
  selected:    'text-success-500',
  rejected:    'text-danger-500',
}

function StatusSelect({ current, onChange, disabled }) {
  const opts = [
    { val: 'pending',     label: 'Pending',     color: 'text-subtle' },
    { val: 'shortlisted', label: 'Shortlisted', color: 'text-warning-500' },
    { val: 'selected',    label: 'Selected',    color: 'text-success-500' },
    { val: 'rejected',    label: 'Rejected',    color: 'text-danger-500' },
  ]
  const cur = opts.find(o => o.val === current) || opts[0]
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      aria-label="Candidate decision"
      className={`cursor-pointer rounded-md border border-hairline bg-transparent px-2 py-1 text-2xs font-medium transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 ${cur.color}`}
    >
      {opts.map(o => <option key={o.val} value={o.val} className="bg-surface text-ink">{o.label}</option>)}
    </select>
  )
}

function ScoreBar({ val, max = 10, color = 'bg-ai-blue' }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
      <div className={`h-full rounded-full transition-all duration-slow ${color}`} style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
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

/* ─── Invite modal ────────────────────────────────────────────────────────── */
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
    <Modal
      open
      onClose={onClose}
      title="Send invites"
      description="Candidates receive the join link by email."
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
        onChange={(e) => setEmails(e.target.value)}
        placeholder={'Separate with comma, semicolon or newline\ne.g. alice@college.edu\nbob@company.com'}
        rows={6}
        hint="One address per line, or comma separated."
      />
    </Modal>
  )
}

/* ─── Table cells ─────────────────────────────────────────────────────────── */
const TH = 'px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-[0.06em] text-subtle whitespace-nowrap'
const TD = 'px-3 py-3 align-middle'

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

  const root = usePageEnter([])

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

  // Rank markers — the numeric rank is always visible alongside the icon
  const getMedal = (rank) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-warning-500" aria-hidden />
    if (rank === 2) return <Medal className="h-4 w-4 text-ink-faint" aria-hidden />
    if (rank === 3) return <Award className="h-4 w-4 text-ai" aria-hidden />
    return null
  }

  const analyticsStats = analytics ? [
    { label: 'Total candidates', val: analytics.totalAttempts, Icon: Users },
    { label: 'Completed', val: analytics.completedAttempts, Icon: CheckCircle2 },
    { label: 'Avg score', val: analytics.avgScore ? `${analytics.avgScore}/10` : '—', Icon: Star },
    { label: 'Completion rate', val: `${analytics.completionRate}%`, Icon: TrendingUp },
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
            <h1 className="truncate text-sm font-semibold text-ink">{template?.title || 'Leaderboard'}</h1>
            <p className="t-xs truncate">
              <span className="capitalize">{template?.role}</span>
              {template?.interviewType && <><span aria-hidden> · </span><span className="capitalize">{template.interviewType}</span></>}
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
            <Button variant="ghost" size="sm" onClick={exportCSV} icon={<Download className="h-3.5 w-3.5" aria-hidden />}>
              CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container-page flex-1 pb-16 pt-6">
        <div data-enter>
          <Tabs
            ariaLabel="Leaderboard view"
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
          <div data-enter role="tabpanel" aria-label="Interview analytics" className="space-y-4">
            <section aria-label="Analytics summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <section aria-label="Status distribution" className="card p-5">
                <h2 className="eyebrow mb-4">Status distribution</h2>
                {Object.entries(analytics.statusDistribution || {}).map(([k, v]) => (
                  <div key={k} className="mb-3 flex items-center justify-between gap-3">
                    <span className="t-sm capitalize">{k}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-hairline">
                        <div className="h-full rounded-full bg-accent-500" style={{ width: `${analytics.totalAttempts > 0 ? (v / analytics.totalAttempts) * 100 : 0}%` }} />
                      </div>
                      <span className="num w-6 text-right text-xs text-muted">{v}</span>
                    </div>
                  </div>
                ))}
              </section>

              <section aria-label="Badge distribution" className="card p-5">
                <h2 className="eyebrow mb-4">Badge distribution</h2>
                {Object.entries(analytics.badgeDistribution || {}).length === 0
                  ? <p className="t-sm">No badges assigned yet</p>
                  : Object.entries(analytics.badgeDistribution || {}).map(([k, v]) => (
                    <div key={k} className="mb-3 flex items-center justify-between gap-3">
                      <BadgeChip badge={k} />
                      <span className="num text-xs text-muted">{v}</span>
                    </div>
                  ))}
              </section>

              <section aria-label="Skill heatmap" className="card p-5">
                <h2 className="eyebrow mb-4">Skill heatmap (avg)</h2>
                {analytics.skillHeatmap && Object.entries(analytics.skillHeatmap).map(([k, v]) => (
                  <div key={k} className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="t-sm capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="num text-xs text-muted">{v}/10</span>
                    </div>
                    <ScoreBar val={v} max={10} color={
                      v >= 8 ? 'bg-success-500' : v >= 6 ? 'bg-warning-500' : 'bg-danger-500'
                    } />
                  </div>
                ))}
              </section>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ───────────────────────────────────────────── */}
        {tab === 'board' && (
          <div data-enter role="tabpanel" aria-label="Candidate leaderboard">
            {/* Filters */}
            <section aria-label="Filter candidates" className="mb-5 flex flex-wrap items-end gap-2">
              <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates"
                  onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  aria-label="Search candidates"
                  className="input pl-9" />
              </div>
              <div>
                <label htmlFor="score-min" className="field-label mb-1">Min score</label>
                <input id="score-min" type="number" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)}
                  placeholder="0" min={0} max={10} step={0.5} className="num input w-24" />
              </div>
              <div>
                <label htmlFor="score-max" className="field-label mb-1">Max score</label>
                <input id="score-max" type="number" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)}
                  placeholder="10" min={0} max={10} step={0.5} className="num input w-24" />
              </div>
              <div>
                <label htmlFor="status-filter" className="field-label mb-1">Status</label>
                <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input cursor-pointer">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <Button variant="secondary" onClick={loadData}>Apply</Button>
              <span className="num badge ml-auto">{entries.length} candidates</span>
            </section>

            {/* Table */}
            {loading ? (
              <div className="card p-4"><SkeletonList rows={6} /></div>
            ) : entries.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Trophy className="h-5 w-5" aria-hidden />}
                  title="No candidates found"
                  description="Nobody matches this filter for this interview yet."
                />
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full min-w-[62rem] border-collapse text-left">
                    <caption className="sr-only">
                      Candidate leaderboard for {template?.title || 'this interview'}, sorted by rank.
                    </caption>
                    <thead className="sticky top-0 z-10 bg-surface shadow-1">
                      <tr className="border-b border-hairline">
                        <th scope="col" className={TH}>Rank</th>
                        <th scope="col" className={TH}>Candidate</th>
                        <th scope="col" className={`${TH} text-right`}>Overall</th>
                        <th scope="col" className={TH}>Scores</th>
                        <th scope="col" className={`${TH} text-right`}>Time</th>
                        <th scope="col" className={TH}>Signal</th>
                        <th scope="col" className={TH}>Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {entries.map((entry, idx) => (
                        <motion.tr
                          key={entry.interviewId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.015, duration: 0.18 }}
                          onClick={() => navigate(`/org/interview/${templateId}/candidate/${entry.interviewId}`)}
                          className="cursor-pointer transition-colors duration-fast hover:bg-inset"
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
                                <p className="num max-w-[16rem] truncate text-2xs text-subtle">{entry.email}</p>
                                {entry.candidateTags?.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {entry.candidateTags.map((tag) => (
                                      <span key={tag} className="rounded-md border border-hairline bg-inset px-1.5 py-0.5 text-3xs text-muted">{tag}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className={`${TD} text-right`}>
                            <span className={`num text-lg font-semibold ${
                              entry.overallScore >= 8 ? 'text-success-500' :
                              entry.overallScore >= 6 ? 'text-warning-500' : 'text-danger-500'
                            }`}>{entry.overallScore.toFixed(1)}</span>
                          </td>

                          <td className={TD}>
                            <div className="flex w-44 flex-col gap-1.5">
                              {[
                                { k: 'Tech', v: entry.technicalScore, c: 'bg-accent-500' },
                                { k: 'Comm', v: entry.communicationScore, c: 'bg-ai-blue' },
                                { k: 'Prob', v: entry.problemSolvingScore, c: 'bg-success-500' },
                              ].map((row) => (
                                <div key={row.k} className="flex items-center gap-2">
                                  <span className="w-10 shrink-0 text-3xs text-subtle">{row.k}</span>
                                  <ScoreBar val={row.v} color={row.c} />
                                  <span className="num w-7 shrink-0 text-right text-3xs font-medium text-muted">{row.v.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className={`${TD} text-right whitespace-nowrap`}>
                            <span className="num text-xs text-muted">{fmtTime(entry.totalTimeTaken)}</span>
                          </td>

                          <td className={TD}>
                            <div className="flex flex-col items-start gap-1.5">
                              <BadgeChip badge={entry.badge} />
                              {entry.status === 'Auto-submitted' && (
                                <StatusBadge tone="off">Auto-submit</StatusBadge>
                              )}
                            </div>
                          </td>

                          <td className={`${TD} whitespace-nowrap border-l border-hairline pl-3`}>
                            <StatusSelect
                              current={entry.candidateStatus}
                              onChange={(s) => handleStatusChange(entry.interviewId, s)}
                              disabled={updatingStatus === entry.interviewId}
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

      {showInvite && <InviteModal templateId={templateId} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
