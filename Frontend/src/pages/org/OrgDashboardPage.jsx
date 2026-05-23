import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { getTemplates, getAnalytics, closeTemplate, deleteTemplate, getOrgAptitudeTests, closeOrgAptitudeTest, deleteOrgAptitudeTest } from '../../api/orgAPI'
import {
  Building2, Plus, BarChart3, Users, Settings, LogOut, Copy,
  ExternalLink, Trash2, XCircle, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, Mic, ChevronRight, Mail, Brain
} from 'lucide-react'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald/10 text-emerald border-emerald/30',
    closed: 'bg-rose/10 text-rose border-rose/30',
    draft: 'bg-amber/10 text-amber border-amber/30',
  }
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize ${styles[status] || styles.draft}`}>
      {status}
    </span>
  )
}

export default function OrgDashboardPage() {
  const { org, orgLogout } = useOrgAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('interviews')
  const [templates, setTemplates] = useState([])
  const [aptitudeTests, setAptitudeTests] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Aggregate stats
  const totalCandidates = templates.reduce((a, t) => a + (t.stats?.totalAttempts || 0), 0)
  const avgScore = templates.length
    ? templates.reduce((a, t) => a + (t.stats?.avgScore || 0), 0) / templates.filter(t => t.stats?.avgScore > 0).length || 0
    : 0
  const activeCount = templates.filter(t => t.status === 'active').length

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Top Nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-violet to-cyan rounded-lg flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-void" strokeWidth={3} />
            </div>
            <span className="font-display font-bold text-zinc-900 dark:text-white text-sm">InterviewAI</span>
            <span className="text-[10px] font-mono bg-violet/20 text-violet px-1.5 py-0.5 rounded-full border border-violet/30">Org</span>
          </Link>

          <div className="flex items-center gap-3">
            {org?.logo && <img src={org.logo} alt={org.name} className="w-7 h-7 rounded-lg object-cover border border-border" />}
            <div className="hidden sm:block">
              <p className="text-xs font-body text-zinc-900 dark:text-white">{org?.name}</p>
              <p className="text-[10px] font-mono text-slate-500 capitalize">{org?.type}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-600 hover:text-rose transition-colors ml-2">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Interviews', value: templates.length, icon: <BarChart3 className="w-4 h-4 text-violet" />, color: 'violet' },
            { label: 'Aptitude Tests', value: aptitudeTests.length, icon: <Brain className="w-4 h-4 text-indigo-400" />, color: 'indigo' },
            { label: 'Total Candidates', value: templates.reduce((a, t) => a + (t.stats?.totalAttempts || 0), 0), icon: <Users className="w-4 h-4 text-cyan" />, color: 'cyan' },
            { label: 'Avg Score', value: (() => { const scored = templates.filter(t => t.stats?.avgScore > 0); return scored.length ? `${(scored.reduce((a,t) => a + t.stats.avgScore, 0) / scored.length).toFixed(1)}/10` : '—' })(), icon: <TrendingUp className="w-4 h-4 text-amber" />, color: 'amber' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-[11px] font-mono text-slate-500">{s.label}</span></div>
              <p className="font-display font-bold text-2xl text-zinc-900 dark:text-white">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6">
          {[
            { id: 'interviews', label: 'Interviews', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'aptitude', label: 'Aptitude Tests', icon: <Brain className="w-3.5 h-3.5" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-medium transition-all ${
                tab === t.id ? 'bg-violet/10 text-violet border border-violet/30' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}

          {tab === 'interviews' && (
            <button onClick={() => navigate('/org/interview/create')}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet to-cyan text-void font-display font-bold text-xs rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all">
              <Plus className="w-3.5 h-3.5" />Create Interview
            </button>
          )}
          {tab === 'aptitude' && (
            <button onClick={() => navigate('/org/aptitude/create')}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet text-white font-display font-bold text-xs rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all">
              <Plus className="w-3.5 h-3.5" />Create Aptitude Test
            </button>
          )}
        </div>

        {/* Content */}
        {tab === 'interviews' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-violet/30 border-t-violet rounded-full animate-spin" /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-20">
                <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-body">No interviews yet.</p>
                <button onClick={() => navigate('/org/interview/create')}
                  className="mt-4 px-6 py-2.5 bg-violet/10 border border-violet/30 text-violet rounded-xl text-sm font-body hover:bg-violet/20 transition-all">
                  Create your first interview
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <motion.div key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-violet/20 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-display font-semibold text-zinc-900 dark:text-white text-sm">{t.title}</h3>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 flex-wrap">
                          <span>{t.role}</span>
                          <span>•</span>
                          <span className="capitalize">{t.interviewType}</span>
                          <span>•</span>
                          <span>{t.questionCount}Q</span>
                          <span>•</span>
                          <span>{t.duration}min</span>
                          {t.deadline && <><span>•</span><span>Deadline: {fmtDate(t.deadline)}</span></>}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-center flex-shrink-0">
                        <div>
                          <p className="text-lg font-display font-bold text-zinc-900 dark:text-white">{t.stats?.totalAttempts || 0}</p>
                          <p className="text-[10px] font-mono text-slate-600">Candidates</p>
                        </div>
                        <div>
                          <p className="text-lg font-display font-bold text-cyan">{t.stats?.avgScore || '—'}</p>
                          <p className="text-[10px] font-mono text-slate-600">Avg Score</p>
                        </div>
                        <div>
                          <p className="text-lg font-display font-bold text-emerald">{t.stats?.completionRate || 0}%</p>
                          <p className="text-[10px] font-mono text-slate-600">Completion</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                      <button onClick={() => navigate(`/org/interview/${t._id}/leaderboard`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet/10 border border-violet/30 text-violet rounded-lg text-xs font-body hover:bg-violet/20 transition-all">
                        <Users className="w-3 h-3" />Leaderboard
                      </button>
                      <button onClick={() => copyLink(t.shareCode)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs font-body hover:border-cyan/30 hover:text-cyan transition-all">
                        <Copy className="w-3 h-3" />Copy Link
                      </button>
                      {t.status === 'active' && (
                        <button onClick={() => handleClose(t._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs font-body hover:border-amber/30 hover:text-amber transition-all">
                          <XCircle className="w-3 h-3" />Close
                        </button>
                      )}
                      <button onClick={() => handleDelete(t._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-600 rounded-lg text-xs font-body hover:border-rose/30 hover:text-rose transition-all ml-auto">
                        <Trash2 className="w-3 h-3" />Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'aptitude' && (
          <div>
            {aptitudeTests.length === 0 ? (
              <div className="text-center py-20">
                <Brain className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-body">No aptitude tests yet.</p>
                <button onClick={() => navigate('/org/aptitude/create')}
                  className="mt-4 px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl text-sm font-body hover:bg-indigo-500/20 transition-all">
                  Create your first aptitude test
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {aptitudeTests.map((t) => {
                  const joinUrl = `${window.location.origin}/aptitude/join/${t.shareCode}`
                  const copyAptLink = () => { navigator.clipboard.writeText(joinUrl); toast.success('Link copied!') }
                  return (
                    <motion.div key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-card border border-border rounded-xl p-4 hover:border-indigo-500/20 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-display font-semibold text-zinc-900 dark:text-white text-sm">{t.title}</h3>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize ${t.status === 'active' ? 'bg-emerald/10 text-emerald border-emerald/30' : 'bg-rose/10 text-rose border-rose/30'}`}>{t.status}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 flex-wrap">
                            <span>{t.questionCount}Q</span><span>•</span>
                            <span>{t.duration}min</span><span>•</span>
                            <span className="capitalize">{t.categories?.join(', ')}</span>
                            {t.deadline && <><span>•</span><span>Deadline: {new Date(t.deadline).toLocaleDateString()}</span></>}
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-6 text-center flex-shrink-0">
                          <div>
                            <p className="text-lg font-display font-bold text-zinc-900 dark:text-white">{t.stats?.totalAttempts || 0}</p>
                            <p className="text-[10px] font-mono text-slate-600">Students</p>
                          </div>
                          <div>
                            <p className="text-lg font-display font-bold text-cyan">{t.stats?.avgAccuracy != null ? `${t.stats.avgAccuracy}%` : '—'}</p>
                            <p className="text-[10px] font-mono text-slate-600">Avg Accuracy</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                        <button onClick={() => navigate(`/org/aptitude/${t._id}/results`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-body hover:bg-indigo-500/20 transition-all">
                          <BarChart3 className="w-3 h-3" />Results
                        </button>
                        <button onClick={copyAptLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs font-body hover:border-cyan/30 hover:text-cyan transition-all">
                          <Copy className="w-3 h-3" />Copy Link
                        </button>
                        {t.status === 'active' && (
                          <button onClick={() => handleCloseAptitude(t._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-400 rounded-lg text-xs font-body hover:border-amber/30 hover:text-amber transition-all">
                            <XCircle className="w-3 h-3" />Close
                          </button>
                        )}
                        <button onClick={() => handleDeleteAptitude(t._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-600 rounded-lg text-xs font-body hover:border-rose/30 hover:text-rose transition-all ml-auto">
                          <Trash2 className="w-3 h-3" />Delete
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-lg">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display font-bold text-zinc-900 dark:text-white mb-4">Organization Profile</h2>
              <div className="space-y-3 text-sm font-body">
                <div className="flex items-center gap-3">
                  {org?.logo
                    ? <img src={org.logo} alt={org.name} className="w-12 h-12 rounded-xl object-cover border border-border" />
                    : <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center"><Building2 className="w-5 h-5 text-slate-600" /></div>}
                  <div>
                    <p className="text-zinc-900 dark:text-white font-semibold">{org?.name}</p>
                    <p className="text-slate-500 capitalize">{org?.type}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-border space-y-2 text-slate-400">
                  <p><span className="text-slate-600">Email:</span> {org?.email}</p>
                  {org?.website && <p><span className="text-slate-600">Website:</span> {org.website}</p>}
                  {org?.description && <p><span className="text-slate-600">About:</span> {org.description}</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
