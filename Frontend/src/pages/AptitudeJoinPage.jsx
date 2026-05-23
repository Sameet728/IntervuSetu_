import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getOrgAptitudeTestInfo } from '../api/orgAPI'
import { startAptitudeTest } from '../api/aptitudeAPI'
import Navbar from '../components/layout/Navbar'
import {
  Brain, Clock, Hash, Shield, AlertTriangle, CheckCircle2,
  LogIn, ChevronRight, Calendar, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AptitudeJoinPage() {
  const { shareCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [testInfo, setTestInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getOrgAptitudeTestInfo(shareCode)
        setTestInfo(res.data.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Test not found or has been closed')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [shareCode])

  const handleStart = async () => {
    if (!user) {
      // Save intended destination and redirect to login
      sessionStorage.setItem('aptitude_join_after_login', `/aptitude/join/${shareCode}`)
      navigate('/login')
      return
    }
    setStarting(true)
    try {
      const res = await startAptitudeTest({ shareCode })
      const { attemptId, sections, duration } = res.data.data
      navigate(`/aptitude/${attemptId}/test`, {
        state: { sections, duration, attemptId }
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start test')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Test Unavailable</h1>
          <p className="text-zinc-500 mb-6">{error}</p>
          <button onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold text-sm">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const cats = testInfo?.categories || []
  const catIcons = { numerical: '🔢', verbal: '📖', logical: '🧩', situational: '🎯' }
  const catColors = { numerical: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', verbal: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', logical: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800', situational: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">

          {/* Header Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              {testInfo?.organization?.logo
                ? <img src={testInfo.organization.logo} alt="" className="h-10 w-10 rounded-xl object-cover bg-white/10" />
                : <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Brain className="w-5 h-5" /></div>}
              <div>
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">
                  {testInfo?.organization?.name || 'Aptitude Assessment'}
                </p>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 leading-tight">{testInfo?.title}</h1>
            {testInfo?.description && <p className="text-indigo-200 text-sm leading-relaxed">{testInfo.description}</p>}
          </div>

          <div className="p-6">
            {/* Test Meta */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: <Hash className="w-4 h-4" />, label: 'Questions', val: testInfo?.questionCount },
                { icon: <Clock className="w-4 h-4" />, label: 'Duration', val: `${testInfo?.duration} min` },
                { icon: <Shield className="w-4 h-4" />, label: 'Proctored', val: testInfo?.proctoringEnabled ? 'Yes' : 'No' },
              ].map((m, i) => (
                <div key={i} className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-center">
                  <div className="text-indigo-500 flex justify-center mb-1">{m.icon}</div>
                  <p className="font-bold text-zinc-900 dark:text-white text-sm">{m.val}</p>
                  <p className="text-zinc-500 text-[11px]">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Categories */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Sections Covered</p>
              <div className="flex flex-wrap gap-2">
                {cats.map(cat => (
                  <span key={cat} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${catColors[cat] || ''}`}>
                    {catIcons[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Deadline */}
            {testInfo?.deadline && (
              <div className="flex items-center gap-2 mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Deadline: <strong>{new Date(testInfo.deadline).toLocaleString()}</strong></span>
              </div>
            )}

            {/* Instructions */}
            {testInfo?.instructions && (
              <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Instructions</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{testInfo.instructions}</p>
              </div>
            )}

            {/* Warnings */}
            {testInfo?.proctoringEnabled && (
              <div className="mb-6 flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-300">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Proctoring is Active</p>
                  <p className="text-xs">Tab switching, fullscreen exits, and other suspicious actions will be recorded and sent to the organizer.</p>
                </div>
              </div>
            )}

            {/* CTA */}
            {!user ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  You must be logged in to take this test.
                </div>
                <button onClick={handleStart}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Log In to Start Test
                </button>
              </div>
            ) : (
              <button onClick={handleStart} disabled={starting}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {starting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Starting Test...</>
                ) : (
                  <><Brain className="w-4 h-4" />Start Test <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
