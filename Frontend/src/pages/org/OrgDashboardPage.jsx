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
import { Badge, Button, StatCard } from '../../components/ui/index'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function StatusBadge({ status }) {
  const styles = {
    active: 'green',
    closed: 'red',
    draft: 'amber',
  }
  return (
    <Badge color={styles[status] || styles.draft} className="capitalize">
      {status}
    </Badge>
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
      {/* Top Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>InterviewAI</span>
            <Badge color="blue" className="ml-1">Org</Badge>
          </Link>

          <div className="flex items-center gap-3">
            {org?.logo && <img src={org.logo} alt={org.name} className="w-7 h-7 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800" />}
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{org?.name}</p>
              <p className="text-[10px] text-zinc-500 capitalize leading-tight">{org?.type}</p>
            </div>
            <button onClick={handleLogout} className="text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Total Interviews" 
            value={templates.length} 
            icon={<BarChart3 className="w-4 h-4 text-blue-500" />} 
          />
          <StatCard 
            label="Aptitude Tests" 
            value={aptitudeTests.length} 
            icon={<Brain className="w-4 h-4 text-blue-500" />} 
          />
          <StatCard 
            label="Total Candidates" 
            value={templates.reduce((a, t) => a + (t.stats?.totalAttempts || 0), 0)} 
            icon={<Users className="w-4 h-4 text-green-500" />} 
          />
          <StatCard 
            label="Avg Score" 
            value={(() => { const scored = templates.filter(t => t.stats?.avgScore > 0); return scored.length ? `${(scored.reduce((a,t) => a + t.stats.avgScore, 0) / scored.length).toFixed(1)}/10` : '—' })()} 
            icon={<TrendingUp className="w-4 h-4 text-amber-500" />} 
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-1">
          {[
            { id: 'interviews', label: 'Interviews', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'aptitude', label: 'Aptitude Tests', icon: <Brain className="w-3.5 h-3.5" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[5px] ${
                tab === t.id 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-500 dark:border-blue-500' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}

          {tab === 'interviews' && (
            <Button variant="primary" size="sm" onClick={() => navigate('/org/interview/create')} className="ml-auto">
              <Plus className="w-3.5 h-3.5" />Create Interview
            </Button>
          )}
          {tab === 'aptitude' && (
            <Button variant="primary" size="sm" onClick={() => navigate('/org/aptitude/create')} className="ml-auto">
              <Plus className="w-3.5 h-3.5" />Create Aptitude Test
            </Button>
          )}
        </div>

        {/* Content */}
        {tab === 'interviews' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : templates.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-sm">
                <BarChart3 className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>No interviews yet</h3>
                <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">Create your first interview template to start screening candidates automatically.</p>
                <Button variant="primary" onClick={() => navigate('/org/interview/create')}>
                  Create your first interview
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((t) => (
                  <motion.div key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>{t.title}</h3>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap mt-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{t.role}</span>
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
                      <div className="hidden sm:flex items-center gap-8 text-center flex-shrink-0 bg-zinc-50 dark:bg-zinc-950/50 py-2 px-6 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div>
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">{t.stats?.totalAttempts || 0}</p>
                          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Candidates</p>
                        </div>
                        <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                        <div>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-500 font-mono">{t.stats?.avgScore || '—'}</p>
                          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Avg Score</p>
                        </div>
                        <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                        <div>
                          <p className="text-lg font-bold text-green-600 dark:text-green-500 font-mono">{t.stats?.completionRate || 0}%</p>
                          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Completion</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/org/interview/${t._id}/leaderboard`)}>
                        <Users className="w-3.5 h-3.5" />Leaderboard
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copyLink(t.shareCode)}>
                        <Copy className="w-3.5 h-3.5" />Copy Link
                      </Button>
                      {t.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={() => handleClose(t._id)} className="text-amber-600 dark:text-amber-500 hover:text-amber-700 hover:bg-amber-50">
                          <XCircle className="w-3.5 h-3.5" />Close
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(t._id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto">
                        <Trash2 className="w-3.5 h-3.5" />Delete
                      </Button>
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
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-sm">
                <Brain className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>No aptitude tests yet</h3>
                <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">Create standard aptitude tests for campus recruitment and general logic screening.</p>
                <Button variant="primary" onClick={() => navigate('/org/aptitude/create')}>
                  Create your first aptitude test
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {aptitudeTests.map((t) => {
                  const joinUrl = `${window.location.origin}/aptitude/join/${t.shareCode}`
                  const copyAptLink = () => { navigator.clipboard.writeText(joinUrl); toast.success('Link copied!') }
                  return (
                    <motion.div key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>{t.title}</h3>
                            <StatusBadge status={t.status} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap mt-2">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{t.questionCount}Q</span>
                            <span>•</span>
                            <span>{t.duration}min</span>
                            <span>•</span>
                            <span className="capitalize">{t.categories?.join(', ')}</span>
                            {t.deadline && <><span>•</span><span>Deadline: {new Date(t.deadline).toLocaleDateString()}</span></>}
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-8 text-center flex-shrink-0 bg-zinc-50 dark:bg-zinc-950/50 py-2 px-6 rounded-lg border border-zinc-100 dark:border-zinc-800">
                          <div>
                            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">{t.stats?.totalAttempts || 0}</p>
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Students</p>
                          </div>
                          <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                          <div>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-500 font-mono">{t.stats?.avgAccuracy != null ? `${t.stats.avgAccuracy}%` : '—'}</p>
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Avg Accuracy</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/org/aptitude/${t._id}/results`)}>
                          <BarChart3 className="w-3.5 h-3.5" />Results
                        </Button>
                        <Button variant="outline" size="sm" onClick={copyAptLink}>
                          <Copy className="w-3.5 h-3.5" />Copy Link
                        </Button>
                        {t.status === 'active' && (
                          <Button variant="outline" size="sm" onClick={() => handleCloseAptitude(t._id)} className="text-amber-600 dark:text-amber-500 hover:text-amber-700 hover:bg-amber-50">
                            <XCircle className="w-3.5 h-3.5" />Close
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAptitude(t._id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto">
                          <Trash2 className="w-3.5 h-3.5" />Delete
                        </Button>
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
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>Organization Profile</h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-4">
                  {org?.logo
                    ? <img src={org.logo} alt={org.name} className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800" />
                    : <div className="w-16 h-16 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"><Building2 className="w-6 h-6 text-zinc-400" /></div>}
                  <div>
                    <p className="text-zinc-900 dark:text-zinc-100 font-bold text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>{org?.name}</p>
                    <Badge color="blue" className="mt-1 capitalize">{org?.type}</Badge>
                  </div>
                </div>
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 w-20 flex-shrink-0">Email</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{org?.email}</span>
                  </div>
                  {org?.website && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 w-20 flex-shrink-0">Website</span>
                      <a href={org.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{org.website}</a>
                    </div>
                  )}
                  {org?.description && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 w-20 flex-shrink-0">About</span>
                      <span className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{org.description}</span>
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
