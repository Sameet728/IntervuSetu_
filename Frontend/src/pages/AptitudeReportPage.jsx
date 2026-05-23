import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, Card, ScoreRing, Badge, Spinner } from '../components/ui/index'
import { getAptitudeReport, downloadAptitudePDF } from '../api/aptitudeAPI'
import toast from 'react-hot-toast'
import { Award, Target, Clock, AlertTriangle, LayoutDashboard, Zap, Brain, Code2, Users, PieChart, Printer, CheckCircle } from 'lucide-react'

export default function AptitudeReportPage() {
  const { attemptId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [expandedSolutions, setExpandedSolutions] = useState({})

  const toggleSolution = (idx) => {
    setExpandedSolutions(prev => ({...prev, [idx]: !prev[idx]}))
  }

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await getAptitudeReport(attemptId)
        setReport(res.data.data)
      } catch (err) {
        toast.error('Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [attemptId])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (!report) return <div className="min-h-screen flex items-center justify-center">Report not found.</div>

  const { totalScore, accuracy, categoryScores, answers, violations } = report
  const totalQuestions = answers.length

  const categories = Object.keys(categoryScores || {}).filter(k => categoryScores[k].total > 0)

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      await downloadAptitudePDF(attemptId, `Aptitude_Report_${Date.now()}.pdf`)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-[Poppins]">
              Aptitude Score Report
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Detailed breakdown of your performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} loading={downloading}>
              <Printer className="w-4 h-4 mr-1" /> {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Link to="/aptitude">
              <Button variant="secondary"><LayoutDashboard className="w-4 h-4" /> Dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Total Score</p>
            <ScoreRing score={totalScore} size={100} strokeWidth={8} />
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Out of {totalQuestions} questions</p>
          </Card>

          <Card className="p-6 flex flex-col justify-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Accuracy</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  {Math.round(accuracy)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Violations</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  {violations?.length || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-blue-600 border-transparent text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Award className="w-32 h-32" />
             </div>
             <div className="relative z-10 h-full flex flex-col justify-center">
               <h3 className="text-lg font-bold font-[Poppins] mb-2">Verdict</h3>
               <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                 {accuracy >= 80 ? 'Excellent performance! You have a strong grasp of reasoning concepts.'
                  : accuracy >= 50 ? 'Good effort! Focus on your weak areas to improve.'
                  : 'Needs improvement. Recommend practicing more aptitude questions.'}
               </p>
             </div>
          </Card>
        </div>

        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-[Poppins] mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-blue-500" /> Category Breakdown
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {categories.map(c => {
             const stat = categoryScores[c]
             const pct = stat.total > 0 ? (stat.score / stat.total) * 100 : 0
             return (
               <Card key={c} className="p-5 break-inside-avoid">
                 <div className="flex justify-between items-center mb-2">
                   <h3 className="capitalize font-semibold text-zinc-800 dark:text-zinc-200">{c} Reasoning</h3>
                   <span className="text-xs font-mono font-bold text-zinc-500">{stat.score} / {stat.total}</span>
                 </div>
                 <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                   <div 
                     className={`h-2.5 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                     style={{ width: `${pct}%` }}
                   ></div>
                 </div>
               </Card>
             )
          })}
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-[Poppins] mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" /> Answer Analysis
          </h2>
          
          <div className="space-y-6">
            {answers.map((ans, idx) => {
              const q = ans.questionId
              if (!q) return null // safety check
              return (
                <Card key={idx} className="p-6 break-inside-avoid shadow-sm border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                      Q{idx + 1} • {q.category}
                    </span>
                    <Badge color={ans.isCorrect ? 'green' : 'red'}>
                      {ans.isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                  </div>
                  <p className="text-base text-zinc-800 dark:text-zinc-200 font-medium mb-3 whitespace-pre-wrap">{q.question}</p>
                  
                  <div className="mb-4 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 inline-block px-3 py-1.5 rounded-md">
                    <Clock className="w-3 h-3 inline mr-1 -mt-0.5" /> Time Spent: {ans.timeTaken || 0}s
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {q.options.map((opt) => {
                      const isSelected = ans.selectedOptionId === opt._id
                      const isOptionCorrect = opt.isCorrect
                      
                      let borderClass = 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900'
                      let textColor = 'text-zinc-700 dark:text-zinc-300'
                      
                      if (isOptionCorrect) {
                        borderClass = 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        textColor = 'text-green-800 dark:text-green-300 font-medium'
                      } else if (isSelected && !isOptionCorrect) {
                        borderClass = 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        textColor = 'text-red-800 dark:text-red-300'
                      }

                      return (
                        <div key={opt._id} className={`p-3 rounded-lg border ${borderClass} flex items-start gap-3`}>
                          <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center mt-0.5 ${isOptionCorrect ? 'border-green-500 text-green-500' : isSelected ? 'border-red-500 text-red-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                            {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${isOptionCorrect ? 'bg-green-500' : 'bg-red-500'}`} />}
                          </div>
                          <span className={`${textColor}`}>{opt.text}</span>
                        </div>
                      )
                    })}
                  </div>

                  {q.detailedSolution && (
                    <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <button 
                        onClick={() => toggleSolution(idx)}
                        className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        <Code2 className="w-4 h-4" />
                        {expandedSolutions[idx] ? 'Hide Detailed Solution' : 'View Detailed Solution'}
                      </button>
                      
                      <AnimatePresence>
                        {expandedSolutions[idx] && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-zinc-50 dark:bg-zinc-900/80 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
                              {q.detailedSolution}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                </Card>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
