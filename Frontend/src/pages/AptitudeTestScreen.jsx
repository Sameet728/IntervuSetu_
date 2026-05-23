import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { submitAptitudeTest } from '../api/aptitudeAPI'
import toast from 'react-hot-toast'
import { AlertTriangle, Clock, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { Button, Card } from '../components/ui/index'
import { motion } from 'framer-motion'

export default function AptitudeTestScreen() {
  const { attemptId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [sections] = useState(state?.sections || [])
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Initialize section time
  const [timeLeft, setTimeLeft] = useState(0)
  
  const [answers, setAnswers] = useState({}) // qId -> selectedOptId
  const [questionTimers, setQuestionTimers] = useState({}) // qId -> seconds spent
  const [violations, setViolations] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  
  const containerRef = useRef(null)

  // Format MM:SS
  const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  useEffect(() => {
    if (!sections.length) {
      toast.error('Invalid session')
      navigate(-1)
      return
    }
  }, [sections, navigate])

  const beginTest = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch (e) {
      console.error("Fullscreen error", e)
    }
    setTimeLeft(sections[0].timeLimit)
    setHasStarted(true)
  }

  // Timer & Question time tracking
  useEffect(() => {
    if (!hasStarted) return
    
    if (timeLeft <= 0 && sections.length) {
      handleNextSection()
      return
    }
    
    const timer = setInterval(() => {
      setTimeLeft(p => p - 1)
      
      const qId = sections[currentSectionIndex]?.questions[currentIndex]?._id
      if (qId) {
        setQuestionTimers(p => ({ ...p, [qId]: (p[qId] || 0) + 1 }))
      }
    }, 1000)
    
    return () => clearInterval(timer)
  }, [timeLeft, currentSectionIndex, currentIndex, sections])

  // Proctoring listeners
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) addViolation('tab_switch')
    }
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) addViolation('fullscreen_exit')
    }

    document.addEventListener("visibilitychange", onVisChange)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    
    return () => {
      document.removeEventListener("visibilitychange", onVisChange)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [violations, hasStarted])

  const addViolation = (type) => {
    if (!sections.length || !hasStarted) return
    const newVio = { type, timestamp: new Date() }
    const updated = [...violations, newVio]
    setViolations(updated)
    
    const count = updated.length
    if (count >= 3) {
      toast.error('Maximum proctoring violations reached. Auto-submitting test.')
      handleFinalSubmit('Maximum proctoring violations reached.')
    } else {
      toast.error(`Warning: ${type === 'tab_switch' ? 'Tab change' : 'Exited fullscreen'} detected! (${count}/3)`)
    }
  }

  const handleSelect = (optId) => {
    const qId = sections[currentSectionIndex].questions[currentIndex]._id
    setAnswers(p => ({ ...p, [qId]: optId }))
  }

  const handleNextSection = () => {
    if (currentSectionIndex >= sections.length - 1) {
      handleFinalSubmit('Time is up for the final section! Auto-submitting...')
    } else {
      toast.success('Section time up! Proceeding to next section.')
      setCurrentSectionIndex(p => p + 1)
      setCurrentIndex(0)
      setTimeLeft(sections[currentSectionIndex + 1].timeLimit)
    }
  }

  const proceedSection = () => {
    setShowConfirmModal(false)
    if (currentSectionIndex >= sections.length - 1) {
      handleFinalSubmit()
    } else {
      setCurrentSectionIndex(p => p + 1)
      setCurrentIndex(0)
      setTimeLeft(sections[currentSectionIndex + 1].timeLimit)
    }
  }

  const handleManualNextSection = () => {
    setShowConfirmModal(true)
  }

  const handleFinalSubmit = async (customMsg) => {
    if (submitting) return
    setSubmitting(true)
    
    const payload = {
      answers: Object.entries(answers).map(([qId, optId]) => ({
        questionId: qId,
        selectedOptionId: optId,
        timeTaken: questionTimers[qId] || 0
      })),
      violations
    }

    try {
      if (customMsg) toast(customMsg, { icon: '⚠️' })
      await submitAptitudeTest(attemptId, payload)
      if (document.fullscreenElement) document.exitFullscreen().catch(()=>{})
      navigate(`/aptitude/${attemptId}/report`, { replace: true })
    } catch (err) {
      toast.error('Failed to submit test. Please retry.')
      setSubmitting(false)
    }
  }

  if (!sections.length || !sections[currentSectionIndex]) return null

  const section = sections[currentSectionIndex]
  const q = section.questions[currentIndex]

  // Overall progress
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0)
  const answeredQuestions = Object.keys(answers).length
  const progressPct = (answeredQuestions / totalQuestions) * 100

  return (
    <div ref={containerRef} className="w-full h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans relative">
      
      {!hasStarted ? (
        <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-6 z-50">
          <Card className="max-w-md w-full p-8 flex flex-col items-center text-center shadow-2xl border-blue-100 dark:border-blue-900/30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 mb-6">
              <Maximize2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-zinc-100 font-[Poppins]">Ready to Begin?</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8 leading-relaxed">
              This exam uses strict proctoring. Clicking the button below will lock your browser into Fullscreen mode. <strong className="text-zinc-800 dark:text-zinc-200">Exiting fullscreen or switching tabs will result in an automatic submission.</strong>
            </p>
            <Button variant="primary" className="w-full h-12 text-lg" onClick={beginTest}>
              Enter Fullscreen & Start
            </Button>
          </Card>
        </div>
      ) : (
        <>
          {/* ProgressBar */}
          <div className="h-1 bg-zinc-200 dark:bg-zinc-800 w-full shrink-0">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Header */}
          <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between shrink-0">
            <div>
              <h1 className="font-bold text-lg dark:text-zinc-100">{section.title}</h1>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Section {currentSectionIndex + 1} of {sections.length}</p>
            </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-zinc-500 font-semibold uppercase">Section Time</span>
             <div className={`flex items-center gap-2 px-3 py-1 rounded-md font-mono font-bold text-base border-2 transition-all ${
              timeLeft <= 300 
                ? 'text-red-600 border-red-500 bg-red-50 dark:bg-red-900/40 animate-pulse' 
                : 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700'
            }`}>
              <Clock className="w-4 h-4" />
              {fmtTime(timeLeft)}
            </div>
            {timeLeft <= 300 && (
              <span className="text-[10px] text-red-600 font-bold uppercase mt-1 animate-pulse">5 Min Warning!</span>
            )}
          </div>
          
          <Button variant="primary" onClick={handleManualNextSection}>
            {currentSectionIndex >= sections.length - 1 ? 'Finish Test' : 'Next Section'}
          </Button>
        </div>
      </header>
      
      {/* Main Body */}
      <div className="flex-1 overflow-hidden flex">
        
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative flex flex-col">
          <div className="max-w-3xl mx-auto w-full flex-1">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {section.questions.length}
                </span>
                {q.companies && q.companies.length > 0 && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    💼 {q.companies.join(', ')}
                  </span>
                )}
                {q.difficulty && (
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    q.difficulty === 'hard' ? 'border-red-500 text-red-600' : 
                    q.difficulty === 'medium' ? 'border-amber-500 text-amber-600' : 'border-green-500 text-green-600'
                  }`}>
                    {q.difficulty}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-zinc-400">Time spent: {fmtTime(questionTimers[q._id] || 0)}</span>
            </div>
            
            <h2 className="text-xl lg:text-2xl font-medium text-zinc-900 dark:text-zinc-100 mb-8 leading-relaxed whitespace-pre-wrap select-none">
              {q.question}
            </h2>
            
            <div className="space-y-3 pb-24">
              {q.options.map((opt, i) => {
                const isSelected = answers[q._id] === opt._id
                return (
                  <button
                    key={opt._id}
                    onClick={() => handleSelect(opt._id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 text-blue-900 dark:text-blue-100'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'border-blue-600' : 'border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                    </div>
                    <span className="text-base leading-relaxed">{opt.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Bottom Fixed Navigation */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4 shrink-0 flex justify-center gap-4">
             <Button
                variant="secondary"
                onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
                className="w-32"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Previous
              </Button>
              <Button
                variant={currentIndex === section.questions.length - 1 ? 'outline' : 'secondary'}
                onClick={() => {
                  if (currentIndex < section.questions.length - 1) setCurrentIndex(p => p + 1)
                  else handleManualNextSection()
                }}
                className="w-32"
              >
                {currentIndex === section.questions.length - 1 ? 'Finish Section' : 'Next'}
                {currentIndex !== section.questions.length - 1 && <ChevronRight className="w-5 h-5 ml-1" />}
              </Button>
          </div>
        </div>
        
        {/* Navigation Sidebar */}
        <div className="w-64 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Question Map</span>
            <span className="text-xs font-bold text-zinc-400">{section.questions.length} Items</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-5 gap-2 content-start">
            {section.questions.map((_, i) => {
              const qId = section.questions[i]._id
              const isAns = !!answers[qId]
              const isCur = currentIndex === i
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-full aspect-square rounded-md text-xs font-bold border transition-colors ${
                    isCur 
                      ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500 shadow-md'
                      : isAns 
                        ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30'
                        : 'border-zinc-200 bg-white dark:bg-zinc-800 dark:border-zinc-700 text-zinc-500'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
        
      </div>
      
      {/* Submitting Overlay */}
      {submitting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Submitting your answers...</p>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirm Action
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to proceed? You <strong className="text-zinc-900 dark:text-zinc-200">cannot</strong> return to this section once you move forward.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={proceedSection}>
                {currentSectionIndex >= sections.length - 1 ? 'Submit Test' : 'Proceed'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </>)}
    </div>
  )
}
