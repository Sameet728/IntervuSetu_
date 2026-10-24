import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { getTemplates, getOrgAptitudeTests, closeTemplate, deleteTemplate, closeOrgAptitudeTest, deleteOrgAptitudeTest } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  Building2, Plus, BarChart3, Users, Settings, Copy,
  Trash2, XCircle, TrendingUp, ExternalLink, Brain, GraduationCap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, StatusBadge, Tabs, EmptyState, SkeletonList, SectionHeading } from '../../components/ui/index'
import { usePageEnter } from '../../motion/hooks'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const STATUS_TONE = {
  active: 'live',
  closed: 'off',
  draft: 'warn',
}

const TAB_ITEMS = [
  { value: 'interviews', label: 'Interviews', icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'aptitude', label: 'Aptitude tests', icon: <Brain className="h-3.5 w-3.5" aria-hidden /> },
  { value: 'settings', label: 'Settings', icon: <Settings className="h-3.5 w-3.5" aria-hidden /> },
]

export default function OrgDashboardPage() {
  const { org, orgLogout } = useOrgAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('interviews')
  const [templates, setTemplates] = useState([])
  const [aptitudeTests, setAptitudeTests] = useState([])
  const [loading, setLoading] = useState(true)

  const root = usePageEnter([])

  useEffect(() => {
    loadTemplates()
    loadAptitudeTests()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const res = await getTemplates()
      setTemplates(res.data.data)
    } catch {
      toast.error('Failed to load interviews')
    } finally {
      setLoading(false)
    }
  }

  const loadAptitudeTests = async () => {
    try {
      const res = await getOrgAptitudeTests()
      setAptitudeTests(res.data.data)
    } catch {}
  }

  const copyLink = (shareCode) => {
    const url = `${window.location.origin}/interview/join/${shareCode}`
    navigator.clipboard.writeText(url)
    toast.success('Join link copied!')
  }

  const handleClose = async (templateId) => {
    if (!confirm('Close this interview? No new candidates can join.')) return
    try {
      await closeTemplate(templateId)
      toast.success('Interview closed')
      loadTemplates()
    } catch { toast.error('Failed to close') }
  }

  const handleDelete = async (templateId) => {
    if (!confirm('Delete this interview and all its data? This cannot be undone.')) return
    try {
      await deleteTemplate(templateId)
      toast.success('Interview deleted')
      loadTemplates()
    } catch { toast.error('Failed to delete') }
  }

  const handleDeleteAptitude = async (testId) => {
    if (!confirm('Delete this aptitude test and all attempts? This cannot be undone.')) return
    try {
      await deleteOrgAptitudeTest(testId)
      toast.success('Aptitude test deleted')
      loadAptitudeTests()
    } catch { toast.error('Failed to delete') }
  }

  const handleCloseAptitude = async (testId) => {
    if (!confirm('Close this test? Students can no longer join.')) return
    try {
      await closeOrgAptitudeTest(testId)
      toast.success('Test closed')
      loadAptitudeTests()
    } catch { toast.error('Failed to close') }
  }

  const handleLogout = () => {
    orgLogout()
    navigate('/org/login')
  }

  // Aggregate stats — every value is derived from the organization's own records.
  const totalCandidates = templates.reduce((a, t) => a + (t.stats?.totalAttempts || 0), 0)
  const activeCount = templates.filter(t => t.status === 'active').length
  const activeAptitude = aptitudeTests.filter(t => t.status === 'active').length
  const scoredCampaigns = templates.filter(t => t.stats?.avgScore > 0)
  const avgScore = scoredCampaigns.length
    ? scoredCampaigns.reduce((a, t) => a + t.stats.avgScore, 0) / scoredCampaigns.length
    : null

  const summary = [
    {
      label: 'Interview campaigns',
      value: templates.length,
      sub: `${activeCount} currently active`,
      Icon: BarChart3,
      tone: 'bg-ai-soft text-ai',
    },
    {
      label: 'Aptitude tests',
      value: aptitudeTests.length,
      sub: `${activeAptitude} currently active`,
      Icon: Brain,
      tone: 'bg-accent-soft text-accent',
    },
    {
      label: 'Candidates',
      value: totalCandidates,
      sub: 'Interview attempts recorded',
      Icon: Users,
      tone: 'bg-success-bg text-success-500',
    },
    {
      label: 'Average score',
      value: avgScore != null ? `${avgScore.toFixed(1)}/10` : '—',
      sub: scoredCampaigns.length
        ? `Across ${scoredCampaigns.length} scored campaign${scoredCampaigns.length === 1 ? '' : 's'}`
        : 'No scored attempts yet',
      Icon: TrendingUp,
      tone: 'bg-warning-bg text-warning-500',
    },
  ]

  return (
    <div ref={root} className="page-shell flex flex-col">
      <OrgNavbar />

      <main className="container-page flex-1 pb-16 pt-[calc(var(--nav-h)+2rem)]">
        {/* ── Organization hero ─────────────────────────────────────── */}
        <header
          data-enter
          className="ambient relative mb-6 overflow-hidden rounded-3xl border border-hairline bg-surface p-6 shadow-2 sm:p-8"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 line-grid opacity-40" style={{ maskImage: 'radial-gradient(ellipse 70% 90% at 85% 0%, black, transparent 70%)' }} />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {org?.logo
                  ? <img src={org.logo} alt="" className="h-12 w-12 shrink-0 rounded-2xl border border-hairline object-cover" />
                  : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ai-soft text-ai"><Building2 className="h-5 w-5" aria-hidden /></span>}
                <div className="min-w-0">
                  <p className="eyebrow">Hiring console</p>
                  <p className="num mt-0.5 truncate text-2xs text-subtle">{org?.email}</p>
                </div>
              </div>

              <h1 className="t-h1 mt-4 break-words">{org?.name || 'Your organization'}</h1>
              <p className="t-body mt-1.5 max-w-xl">
                Run structured interview rounds and aptitude screens, then compare candidates in one place.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="badge badge-accent">{templates.length} interview{templates.length === 1 ? '' : 's'}</span>
                <span className="badge">{aptitudeTests.length} aptitude test{aptitudeTests.length === 1 ? '' : 's'}</span>
                {activeCount + activeAptitude > 0 && (
                  <StatusBadge tone="live" pulse>{activeCount + activeAptitude} live</StatusBadge>
                )}
              </div>
            </div>

            <div data-enter className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto">
              <Button className="flex-1 sm:flex-none" onClick={() => navigate('/org/interview/create')} icon={<Plus className="h-4 w-4" aria-hidden />}>
                New interview
              </Button>
              <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => navigate('/org/aptitude/create')} icon={<Brain className="h-4 w-4" aria-hidden />}>
                Aptitude test
              </Button>
            </div>
          </div>
        </header>

        {/* Stats row — real, derived values only */}
        <section aria-label="Campaign summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map(({ label, value, sub, Icon, tone }, i) => (
            <motion.div
              key={label}
              data-enter
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="eyebrow">{label}</p>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <p className="num-lg text-ink">{value}</p>
              <p className="t-xs mt-1 text-subtle">{sub}</p>
            </motion.div>
          ))}
        </section>

        {/* Tabs */}
        <div data-enter className="mb-6">
          <Tabs ariaLabel="Console section" tabs={TAB_ITEMS} value={tab} onChange={setTab} />
        </div>

        {/* Content */}
        {tab === 'interviews' && (
          <section role="tabpanel" aria-label="Interview campaigns">
            {loading ? (
              <SkeletonList rows={3} />
            ) : templates.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<BarChart3 className="h-5 w-5" aria-hidden />}
                  title="No interviews yet"
                  description="Create a template, invite candidates and the AI interviewer runs the rounds for you."
                  action={<Button size="md" onClick={() => navigate('/org/interview/create')} icon={<Plus className="h-4 w-4" aria-hidden />}>Create your first interview</Button>}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <motion.article key={t._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                    className="card relative overflow-hidden p-5 transition-colors duration-fast hover:border-hairline-strong">
                    {t.status === 'active' && (
                      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-success-500 via-success-500/40 to-transparent" />
                    )}
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <h3 className="t-h3 truncate">{t.title}</h3>
                          <StatusBadge tone={STATUS_TONE[t.status] || 'warn'} pulse={t.status === 'active'}>{t.status}</StatusBadge>
                        </div>
                        <p className="t-xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-muted">{t.role}</span>
                          <span aria-hidden>·</span>
                          <span className="capitalize">{t.interviewType}</span>
                          <span aria-hidden>·</span>
                          <span className="num">{t.questionCount} questions</span>
                          <span aria-hidden>·</span>
                          <span className="num">{t.duration} min</span>
                          {t.deadline && (
                            <>
                              <span aria-hidden>·</span>
                              <span>Deadline: <span className="num">{fmtDate(t.deadline)}</span></span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Stats */}
                      <dl className="card-inset grid w-full shrink-0 grid-cols-3 divide-x divide-hairline px-1 py-2 text-center sm:w-auto md:flex md:items-start md:gap-6 md:divide-x-0 md:border-0 md:bg-transparent md:p-0 md:text-right">
                        <div className="min-w-0 px-1.5 md:px-0">
                          <dd className="num text-sm font-semibold text-ink">{t.stats?.totalAttempts || 0}</dd>
                          <dt className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-faint">Candidates</dt>
                        </div>
                        <div className="min-w-0 px-1.5 md:px-0">
                          <dd className="num text-sm font-semibold text-accent">{t.stats?.avgScore || '—'}</dd>
                          <dt className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-faint">Avg score</dt>
                        </div>
                        <div className="min-w-0 px-1.5 md:px-0">
                          <dd className="num text-sm font-semibold text-success-500">{t.stats?.completionRate || 0}%</dd>
                          <dt className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-faint">Completion</dt>
                        </div>
                      </dl>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/org/interview/${t._id}/leaderboard`)} icon={<Users className="h-3.5 w-3.5" aria-hidden />}>
                        Leaderboard
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copyLink(t.shareCode)} icon={<Copy className="h-3.5 w-3.5" aria-hidden />}>
                        Copy link
                      </Button>
                      {t.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => handleClose(t._id)} className="text-warning-500 hover:text-warning-500" icon={<XCircle className="h-3.5 w-3.5" aria-hidden />}>
                          Close
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(t._id)} className="ml-auto text-danger-500 hover:text-danger-500" icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}>
                        Delete
                      </Button>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'aptitude' && (
          <section role="tabpanel" aria-label="Aptitude tests">
            {aptitudeTests.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Brain className="h-5 w-5" aria-hidden />}
                  title="No aptitude tests yet"
                  description="Screen a whole batch at once and rank students by accuracy."
                  action={<Button size="md" onClick={() => navigate('/org/aptitude/create')} icon={<Plus className="h-4 w-4" aria-hidden />}>Create your first aptitude test</Button>}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {aptitudeTests.map((t) => {
                  const joinUrl = `${window.location.origin}/aptitude/join/${t.shareCode}`
                  const copyAptLink = () => { navigator.clipboard.writeText(joinUrl); toast.success('Link copied!') }
                  return (
                    <motion.article key={t._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      className="card relative overflow-hidden p-5 transition-colors duration-fast hover:border-hairline-strong">
                      {t.status === 'active' && (
                        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-success-500 via-success-500/40 to-transparent" />
                      )}
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <h3 className="t-h3 truncate">{t.title}</h3>
                            <StatusBadge tone={t.status === 'active' ? 'live' : 'off'} pulse={t.status === 'active'}>{t.status}</StatusBadge>
                          </div>
                          <p className="t-xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="num">{t.questionCount} questions</span>
                            <span aria-hidden>·</span>
                            <span className="num">{t.duration} min</span>
                            <span aria-hidden>·</span>
                            <span className="capitalize">{t.categories?.join(', ')}</span>
                            {t.deadline && (
                              <>
                                <span aria-hidden>·</span>
                                <span>Deadline: <span className="num">{fmtDate(t.deadline)}</span></span>
                              </>
                            )}
                          </p>
                        </div>
                        <dl className="card-inset grid w-full shrink-0 grid-cols-2 divide-x divide-hairline px-1 py-2 text-center sm:w-auto md:flex md:items-start md:gap-6 md:divide-x-0 md:border-0 md:bg-transparent md:p-0 md:text-right">
                          <div className="min-w-0 px-1.5 md:px-0">
                            <dd className="num text-sm font-semibold text-ink">{t.stats?.totalAttempts || 0}</dd>
                            <dt className="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] uppercase tracking-[0.08em] text-faint md:justify-end">
                              <GraduationCap className="h-3 w-3" aria-hidden />Students
                            </dt>
                          </div>
                          <div className="min-w-0 px-1.5 md:px-0">
                            <dd className="num text-sm font-semibold text-accent">{t.stats?.avgAccuracy != null ? `${t.stats.avgAccuracy}%` : '—'}</dd>
                            <dt className="mt-0.5 text-[0.625rem] uppercase tracking-[0.08em] text-faint">Avg accuracy</dt>
                          </div>
                        </dl>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/org/aptitude/${t._id}/results`)} icon={<BarChart3 className="h-3.5 w-3.5" aria-hidden />}>
                          Results
                        </Button>
                        <Button variant="outline" size="sm" onClick={copyAptLink} icon={<Copy className="h-3.5 w-3.5" aria-hidden />}>
                          Copy link
                        </Button>
                        {t.status === 'active' && (
                          <Button variant="ghost" size="sm" onClick={() => handleCloseAptitude(t._id)} className="text-warning-500 hover:text-warning-500" icon={<XCircle className="h-3.5 w-3.5" aria-hidden />}>
                            Close
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAptitude(t._id)} className="ml-auto text-danger-500 hover:text-danger-500" icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}>
                          Delete
                        </Button>
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'settings' && (
          <section role="tabpanel" aria-label="Organization profile" className="mx-auto max-w-xl">
            <div className="card p-6">
              <SectionHeading title="Organization profile" className="mb-6" />
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  {org?.logo
                    ? <img src={org.logo} alt={`${org.name} logo`} className="h-16 w-16 rounded-xl border border-hairline object-cover" />
                    : <span className="grid h-16 w-16 place-items-center rounded-xl border border-hairline bg-inset text-subtle"><Building2 className="h-6 w-6" aria-hidden /></span>}
                  <div className="min-w-0">
                    <p className="t-h3 truncate">{org?.name}</p>
                    <p className="t-sm capitalize">{org?.type}</p>
                  </div>
                </div>
                <dl className="space-y-3 border-t border-hairline pt-6">
                  <div className="grid gap-1 md:grid-cols-3">
                    <dt className="t-sm font-medium text-subtle">Email address</dt>
                    <dd className="t-sm break-words text-ink md:col-span-2">{org?.email}</dd>
                  </div>
                  {org?.website && (
                    <div className="grid gap-1 md:grid-cols-3">
                      <dt className="t-sm font-medium text-subtle">Website</dt>
                      <dd className="t-sm md:col-span-2">
                        <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-accent transition-colors duration-fast hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />{org.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  {org?.description && (
                    <div className="grid gap-1 md:grid-cols-3">
                      <dt className="t-sm font-medium text-subtle">About</dt>
                      <dd className="t-body md:col-span-2">{org.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
