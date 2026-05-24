import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { getTemplates, getAnalytics, closeTemplate, deleteTemplate, getOrgAptitudeTests, closeOrgAptitudeTest, deleteOrgAptitudeTest } from '../../api/orgAPI'
import OrgNavbar from '../../components/layout/OrgNavbar'
import {
  Building2, Plus, BarChart3, Users, Settings, LogOut, Copy,
  ExternalLink, Trash2, XCircle, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, Mic, ChevronRight, Mail, Brain
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/index'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
    closed: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
    draft: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col" style={{ fontFamily: 'Inter, system-ui' }}>
      <OrgNavbar />

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-16 w-full flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Interviews', value: templates.length, icon: <BarChart3 className="w-4 h-4 text-violet-500" />, color: 'violet' },
            { label: 'Aptitude Tests', value: aptitudeTests.length, icon: <Brain className="w-4 h-4 text-indigo-500" />, color: 'indigo' },
            { label: 'Total Candidates', value: templates.reduce((a, t) => a + (t.stats?.totalAttempts || 0), 0), icon: <Users className="w-4 h-4 text-cyan-500" />, color: 'cyan' },
            { label: 'Avg Score', value: (() => { const scored = templates.filter(t => t.stats?.avgScore > 0); return scored.length ? `${(scored.reduce((a,t) => a + t.stats.avgScore, 0) / scored.length).toFixed(1)}/10` : '—' })(), icon: <TrendingUp className="w-4 h-4 text-amber-500" />, color: 'amber' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-[11px] font-mono text-zinc-500">{s.label}</span></div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          {[
            { id: 'interviews', label: 'Interviews', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'aptitude', label: 'Aptitude Tests', icon: <Brain className="w-4 h-4" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id 
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}

          {tab === 'interviews' && (
            <button onClick={() => navigate('/org/interview/create')}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />Create Interview
            </button>
          )}
          {tab === 'aptitude' && (
            <button onClick={() => navigate('/org/aptitude/create')}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />Create Aptitude Test
            </button>
          )}
        </div>

        {/* Content */}
        {tab === 'interviews' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-20">
                <BarChart3 className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-500">No interviews yet.</p>
                <button onClick={() => navigate('/org/interview/create')}
                  className="mt-4 px-6 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                  Create your first interview
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <motion.div key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:border-blue-200 dark:hover:border-blue-500/30 transition-all">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <h3 className="font-semibold text-lg text-zinc-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{t.title}</h3>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 flex-wrap">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.role}</span>
                          <span>•</span>
                          <span className="capitalize">{t.interviewType}</span>
                          <span>•</span>
                          <span>{t.questionCount} Questions</span>
                          <span>•</span>
                          <span>{t.duration} min</span>
                          {t.deadline && <><span>•</span><span>Deadline: {fmtDate(t.deadline)}</span></>}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-1 text-center md:text-right flex-shrink-0 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-lg">
                        <div className="flex md:flex-row-reverse items-center gap-1.5">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.stats?.totalAttempts || 0}</span>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Candidates</span>
                        </div>
                        <div className="flex md:flex-row-reverse items-center gap-1.5">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{t.stats?.avgScore || '—'}</span>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Avg Score</span>
                        </div>
                        <div className="flex md:flex-row-reverse items-center gap-1.5">
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t.stats?.completionRate || 0}%</span>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Completion</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                      <button onClick={() => navigate(`/org/interview/${t._id}/leaderboard`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                        <Users className="w-3.5 h-3.5" />Leaderboard
                      </button>
                      <button onClick={() => copyLink(t.shareCode)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <Copy className="w-3.5 h-3.5" />Copy Link
                      </button>
                      {t.status === 'active' && (
                         <button onClick={() => handleClose(t._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-amber-600 dark:text-amber-500 rounded-lg text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                          <XCircle className="w-3.5 h-3.5" />Close
                        </button>
                      )}
                      <button onClick={() => handleDelete(t._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto">
                        <Trash2 className="w-3.5 h-3.5" />Delete
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
                <Brain className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-500">No aptitude tests yet.</p>
                <button onClick={() => navigate('/org/aptitude/create')}
                  className="mt-4 px-6 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
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
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <h3 className="font-semibold text-lg text-zinc-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{t.title}</h3>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'}`}>{t.status}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 flex-wrap">
                            <span>{t.questionCount} Questions</span><span>•</span>
                            <span>{t.duration} min</span><span>•</span>
                            <span className="capitalize">{t.categories?.join(', ')}</span>
                            {t.deadline && <><span>•</span><span>Deadline: {new Date(t.deadline).toLocaleDateString()}</span></>}
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-1 text-center md:text-right flex-shrink-0 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-lg">
                           <div className="flex md:flex-row-reverse items-center gap-1.5">
                             <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.stats?.totalAttempts || 0}</span>
                             <span className="text-[10px] uppercase tracking-wider text-zinc-500">Students</span>
                           </div>
                           <div className="flex md:flex-row-reverse items-center gap-1.5">
                             <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{t.stats?.avgAccuracy != null ? `${t.stats.avgAccuracy}%` : '—'}</span>
                             <span className="text-[10px] uppercase tracking-wider text-zinc-500">Avg Accuracy</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                        <button onClick={() => navigate(`/org/aptitude/${t._id}/results`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                          <BarChart3 className="w-3.5 h-3.5" />Results
                        </button>
                        <button onClick={copyAptLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <Copy className="w-3.5 h-3.5" />Copy Link
                        </button>
                        {t.status === 'active' && (
                          <button onClick={() => handleCloseAptitude(t._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-amber-600 dark:text-amber-500 rounded-lg text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />Close
                          </button>
                        )}
                        <button onClick={() => handleDeleteAptitude(t._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto">
                          <Trash2 className="w-3.5 h-3.5" />Delete
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
          <div className="max-w-xl">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>Organization Profile</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {org?.logo
                    ? <img src={org.logo} alt={org.name} className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
                    : <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"><Building2 className="w-6 h-6 text-zinc-500" /></div>}
                  <div>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>{org?.name}</p>
                    <p className="text-sm text-zinc-500 capitalize">{org?.type}</p>
                  </div>
                </div>
                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                    <span className="text-sm font-medium text-zinc-500">Email Address</span>
                    <span className="text-sm text-zinc-900 dark:text-zinc-300 md:col-span-2">{org?.email}</span>
                  </div>
                  {org?.website && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                       <span className="text-sm font-medium text-zinc-500">Website</span>
                       <a href={org.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline md:col-span-2">{org.website}</a>
                     </div>
                  )}
                  {org?.description && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                       <span className="text-sm font-medium text-zinc-500">About</span>
                       <span className="text-sm text-zinc-900 dark:text-zinc-300 md:col-span-2 leading-relaxed">{org.description}</span>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
