import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Card, Button, Spinner, ScoreRing } from '../components/ui/index'
import { getReport, downloadPDF } from '../api/reportAPI'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import toast from 'react-hot-toast'
import {
  Download, ArrowLeft, CheckCircle2, XCircle, Clock,
  Code2, Brain, Users, AlertTriangle, ChevronDown, ChevronUp,
  FileText, BookOpen, Target, TrendingUp, MessageSquare, Lightbulb, Layers, BarChart3
} from 'lucide-react'

const recommendationConfig = {
  strong_hire:    { color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20',     label: 'Strong Hire' },
  hire:           { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',     label: 'Hire' },
  borderline:     { color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20',     label: 'Borderline' },
  no_hire:        { color: 'text-red-500',   bg: 'bg-red-500/10 border-red-500/20',         label: 'No Hire' },
  strong_no_hire: { color: 'text-red-600',   bg: 'bg-red-500/10 border-red-500/20',         label: 'Strong No Hire' },
}

const typeIcon = {
  code:          <Code2     className="w-3.5 h-3.5" />,
  theory:        <Brain     className="w-3.5 h-3.5" />,
  hr:            <Users     className="w-3.5 h-3.5" />,
  behavioral:    <MessageSquare className="w-3.5 h-3.5" />,
  system_design: <Layers   className="w-3.5 h-3.5" />,
}

const fmt = (sec = 0) => {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}m ${s}s`
}

const getScoreColor = (s) => {
  if (s >= 8) return '#16a34a' // green-600
  if (s >= 5) return '#ca8a04' // amber-600
  return '#dc2626'             // red-600
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-blue-400 font-semibold font-mono">{payload[0]?.value}/10</p>
    </div>
  )
}

export default function ReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report,      setReport]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [expanded,    setExpanded]    = useState({})
  const [retries,     setRetries]     = useState(0)

  useEffect(() => {
    let timer
    const fetchReport = () => {
      getReport(id)
        .then(r => { setReport(r.data.data); setLoading(false) })
        .catch(() => {
          if (retries < 6) {
            timer = setTimeout(() => { setRetries(p => p + 1) }, 4000)
          } else { setLoading(false) }
        })
    }
    fetchReport()
    return () => clearTimeout(timer)
  }, [id, retries])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadPDF(id, `interview_report_${report?.role?.replace(/\s+/g,'_')}_${Date.now()}.pdf`)
      toast.success('Report downloaded!')
    } catch { toast.error('Download failed') }
    finally { setDownloading(false) }
  }

  const toggle = (qid) => setExpanded(p => ({ ...p, [qid]: !p[qid] }))

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Spinner size="lg" />
        <div className="text-center">
          <p className="text-zinc-800 dark:text-zinc-200 font-medium mb-1">Generating your report...</p>
          <p className="text-zinc-500 text-sm">AI is analyzing your performance</p>
        </div>
      </div>
    </div>
  )

  if (!report) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <XCircle className="w-12 h-12 text-zinc-700" />
        <p className="text-zinc-600 dark:text-zinc-400">Report not available</p>
        <Button onClick={() => navigate('/dashboard')} variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
        </Button>
      </div>
    </div>
  )

  const recCfg = recommendationConfig[report.recommendation] || recommendationConfig.borderline

  const radarData = [
    { subject: 'Technical',      value: report.technicalScore },
    { subject: 'Communication',  value: report.communicationScore },
    { subject: 'Problem Solving',value: report.problemSolvingScore },
    { subject: 'HR/Behavioral',  value: report.hrScore },
    ...(report.codeQualityScore ? [{ subject: 'Code Quality', value: report.codeQualityScore }] : []),
  ].filter(d => d.value != null)

  const barData = report.questionBreakdown?.map((q, i) => ({
    name: `Q${i + 1}`,
    score: q.score ?? 0,
    type: q.questionType,
  })) || []

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16">

        {/* ── Header Actions ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <Button variant="secondary" size="sm" onClick={handleDownload} loading={downloading}>
            <Download className="w-4 h-4 mr-1.5" /> {downloading ? 'Downloading...' : 'Export PDF'}
          </Button>
        </div>

        {/* ── Hero Score Banner ──────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-6 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="shrink-0">
              <ScoreRing score={report.overallScore} size={110} />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{report.role}</h1>
                <span className="text-zinc-500 text-sm capitalize bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 rounded-md">{report.experienceLevel}</span>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                {report.techStack?.map(t => (
                  <span key={t} className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-2.5 py-0.5">{t}</span>
                ))}
              </div>

              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider ${recCfg.bg} ${recCfg.color}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {recCfg.label}
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2 mt-4 text-xs font-medium text-zinc-500">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {fmt(report.totalTimeTaken)}</span>
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {report.questionBreakdown?.length || 0} Questions</span>
                {report.violationCount > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-500"><AlertTriangle className="w-3.5 h-3.5" /> {report.violationCount} Violations</span>
                )}
                {report.autoSubmitted && (
                  <span className="flex items-center gap-1.5 text-red-400"><Clock className="w-3.5 h-3.5" /> Auto-submitted</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Overall Feedback ──────────────────────────────────────── */}
        {report.overallFeedback && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-500" /> Overall Feedback
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">{report.overallFeedback}</p>
          </div>
        )}

        {/* ── Score Breakdown + Radar ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-500" /> Score Breakdown
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Technical Depth',  value: report.technicalScore },
                { label: 'Communication',    value: report.communicationScore },
                { label: 'Problem Solving',  value: report.problemSolvingScore },
                { label: 'HR & Culture',     value: report.hrScore },
                ...(report.codeQualityScore ? [{ label: 'Code Quality', value: report.codeQualityScore }] : []),
              ].filter(s => s.value != null).map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{s.label}</span>
                    <span className="text-xs font-bold" style={{ color: getScoreColor(s.value) }}>{s.value}/10</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.value / 10) * 100}%` }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getScoreColor(s.value) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Skill Radar</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#71717a' }} />
                <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Per-question bar chart ────────────────────────────────── */}
        {barData.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-500" /> Per-Question Scores
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} dy={8} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} dx={-8} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {barData.map((b, i) => (
                    <Cell key={i} fill={getScoreColor(b.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Strengths + Weaknesses ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Top Strengths
            </h2>
            <ul className="space-y-2.5">
              {report.strengths?.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="text-green-500 mt-0.5">•</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Areas to Improve
            </h2>
            <ul className="space-y-2.5">
              {report.weaknesses?.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="text-red-400 mt-0.5">•</span> {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Improvement Areas & Topics ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {report.improvementAreas?.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h2 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> Action Plan
              </h2>
              <ul className="space-y-2">
                {report.improvementAreas.map((area, i) => (
                  <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <span className="text-amber-500 text-xs mt-0.5 border border-amber-500/30 rounded-full w-4 h-4 flex items-center justify-center shrink-0">{i+1}</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.topicsToStudy?.length > 0 && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
              <h2 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Topics to Review
              </h2>
              <div className="flex flex-wrap gap-2">
                {report.topicsToStudy.map((topic, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded px-2 py-1 text-xs font-medium">
                    <Lightbulb className="w-3 h-3" /> {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Per-Question Summary ──────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Question Breakdown
          </h2>
          <div className="space-y-3">
            {report.questionBreakdown?.map((q, i) => {
              const isOpen = expanded[q.questionId || i]
              const score = q.score ?? 0
              return (
                <div key={q.questionId || i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden text-left">
                  {/* Header */}
                  <button
                    onClick={() => toggle(q.questionId || i)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded border flex items-center justify-center"
                        style={{ borderColor: getScoreColor(score) + '50', background: getScoreColor(score) + '15' }}>
                        <span className="text-sm font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2">
                        <span className="text-zinc-500 mr-2 text-xs">Q{i+1}</span>{q.question}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="text-[10px] uppercase text-zinc-500 flex items-center gap-1 font-semibold tracking-wider">
                          {typeIcon[q.questionType]} {q.questionType?.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">{q.difficulty}</span>
                        <span className="text-[10px] uppercase text-zinc-500 flex items-center gap-1 font-semibold tracking-wider">
                          <Clock className="w-3 h-3" /> {q.timeTaken || 0}s
                        </span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-zinc-500 shrink-0" /> : <ChevronDown className="w-5 h-5 text-zinc-500 shrink-0" />}
                  </button>

                  {/* Expanded Body */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-200 dark:border-zinc-800"
                      >
                        <div className="p-5 space-y-5 bg-zinc-50 dark:bg-zinc-900/50">
                          {/* Feedback */}
                          {q.feedback && (
                            <div>
                              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">AI Feedback</p>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{q.feedback}</p>
                            </div>
                          )}

                          {/* Answer */}
                          {q.userAnswer && (
                            <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800">
                              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Your Answer
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{q.userAnswer}"</p>
                            </div>
                          )}

                          {/* Code */}
                          {q.userCode && (
                            <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                              <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                <Code2 className="w-3 h-3" /> Your Code
                              </div>
                              <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 p-3 overflow-auto max-h-60">{q.userCode}</pre>
                            </div>
                          )}

                          {/* Ideal */}
                          {q.idealAnswer && (
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">Expected Answer</p>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{q.idealAnswer}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            {q.strengths?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-1.5">Strengths</p>
                                {q.strengths.map((s, j) => <p key={j} className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">• {s}</p>)}
                              </div>
                            )}
                            {q.weaknesses?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">Improvements</p>
                                {q.weaknesses.map((w, j) => <p key={j} className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">• {w}</p>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-center mt-10">
          <Button onClick={() => navigate('/interview/create')} size="lg" className="px-8">
            Start Another Interview
          </Button>
        </div>

      </div>
    </div>
  )
}
