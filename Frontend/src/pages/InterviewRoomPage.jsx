import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useProctoring } from '../hooks/useProctoring'
import { useSTT } from '../hooks/useSTT'
import { useTTS } from '../hooks/useTTS'
import VoiceWave from '../components/interview/VoiceWave'
import PreInterviewCheck from '../components/interview/PreInterviewCheck'
import Editor from '@monaco-editor/react'
import { getInterview } from '../api/interviewAPI'
import {
  Mic, MicOff, Send, SkipForward, RotateCcw, Code2,
  AlertTriangle, Camera, Clock, Radio,
  CheckCircle2, XCircle, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Countdown component (3-2-1 overlay) ─────────────────────────────
function Countdown({ onComplete }) {
  const [count, setCount] = useState(3)
  useEffect(() => {
    if (count === 0) { onComplete(); return }
    const t = setTimeout(() => setCount(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [count, onComplete])

  return (
    <div className="fixed inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'backOut' }}
          className="text-center">
          <div className="font-display font-bold text-9xl text-blue-600 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {count > 0 ? count : '🎙️'}
          </div>
          <p className="text-zinc-500 font-medium text-lg">{count > 0 ? 'Get ready...' : "Let's go!"}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Violation toast ──────────────────────────────────────────────────
function ViolationBadge({ count, max }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium font-mono lowercase ${
      count >= max - 1 ? 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400' :
      count > 0        ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                         'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
    }`}>
      <Shield className="w-3 h-3" />
      <span>{max - count} chances left</span>
    </div>
  )
}

export default function InterviewRoomPage() {
  const { id: interviewId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState('check')   // check|loading|countdown|active|complete
  const [interview, setInterview] = useState(null)
  const [currentQ, setCurrentQ]   = useState(null)
  const [qIndex, setQIndex]       = useState(0)
  const [totalQs, setTotalQs]     = useState(0)
  const [aiMessage, setAiMessage] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [showCode, setShowCode]   = useState(false)
  const [code, setCode]           = useState('')
  const [violationCount, setViolationCount] = useState(0)
  const [maxViolations, setMaxViolations]   = useState(3)
  const [skipUsed, setSkipUsed]   = useState(false)
  const [lastScore, setLastScore] = useState(null)
  const [processingState, setProcessingState] = useState(false)
  const [isFollowup, setIsFollowup] = useState(false)
  const [timer, setTimer]         = useState(0) // seconds elapsed
  const [shortFeedback, setShortFeedback] = useState(null)
  const [transcript, setTranscript] = useState([])

  // ── Refs ───────────────────────────────────────────────────────────
  const wsRef              = useRef(null)
  const timerRef           = useRef(null)
  const feedbackTimeoutRef = useRef(null)
  const processNextRef     = useRef(null)
  const qStartTimeRef      = useRef(0)
  const transcriptRef      = useRef([])       // kept for legacy
  const transcriptEndRef   = useRef(null)     // auto-scroll target
  const elaborateReminderRef = useRef(null)   // 20-sec interval after blocked auto-submit

  // ── Hooks ──────────────────────────────────────────────────────────
  const tts = useTTS()

  const handleSilence = useCallback((text) => {
    if (text && !processingState) {
      handleSubmitAnswer(text, true)
    }
  }, [processingState])

  const handleStillThere = useCallback(() => {
    toast('👋 Still there? Take your time.', { icon: '⌛', duration: 4000 })
  }, [])

  const stt = useSTT({
    onResult: (text) => setUserAnswer(text),
    onSilence: handleSilence,
    onStillThere: handleStillThere,
  })

  const handleViolation = useCallback((type, details) => {
    if (!wsRef.current) return
    sendMessage('PROCTORING_VIOLATION', { violationType: type, details })
  }, [])

  const proctoring = useProctoring({ onViolation: handleViolation, enabled: phase === 'active' })

  // ── WebSocket ────────────────────────────────────────────────────────
  const sendMessage = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  const connectWS = useCallback(() => {
    const token = localStorage.getItem('token')
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:5000'}/ws/interview?token=${token}&interviewId=${interviewId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      sendMessage('START_INTERVIEW', { candidateName: user?.name || 'Candidate' })
    }

    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data)
      handleWSMessage(type, payload)
    }

    ws.onerror = () => toast.error('Connection error. Please refresh.')
    ws.onclose = (e) => {
      if (e.code !== 1000) toast.error('Connection lost.')
    }
  }, [interviewId, user])

  const handleWSMessage = useCallback((type, payload) => {
    switch (type) {
      case 'INTERVIEW_STARTED': {
        setAiMessage(payload.greeting)
        setTranscript(p => [...p, { role: 'ai', content: payload.greeting }, { role: 'ai', content: payload.firstQuestion?.question }])
        setCurrentQ(payload.firstQuestion)
        setTotalQs(payload.totalQuestions)
        setPhase('active')
        tts.speak(payload.greeting, () => {
          setTimeout(() => {
            tts.speak(payload.firstQuestion?.question, () => {
              stt.start()
              sendMessage('QUESTION_STARTED', { questionId: payload.firstQuestion?.questionId })
            })
          }, 300)
        })
        break
      }

      case 'PROCESSING': {
        setProcessingState(true)
        stt.stop()
        tts.startThinking()
        break
      }

      case 'FOLLOWUP_QUESTION': {
        setProcessingState(false)
        setIsFollowup(true)
        if (payload.evaluation?.score != null) setLastScore(payload.evaluation.score)
        tts.stopThinking()

        const processNext = () => {
          setShortFeedback(null)
          processNextRef.current = null
          setAiMessage(payload.question)
          setTranscript(p => [...p, { role: 'ai', content: payload.question }])
          stt.reset()
          setUserAnswer('')
          tts.speak(payload.question, () => stt.start())
        }
        processNextRef.current = processNext

        if (payload.evaluation?.shortFeedback) {
          const fb = payload.evaluation
          setShortFeedback(fb)
          feedbackTimeoutRef.current = setTimeout(processNext, 4500)
        } else {
          processNext()
        }
        break
      }

      case 'NEXT_QUESTION': {
        setProcessingState(false)
        setIsFollowup(false)
        if (payload.prevEvaluation?.score != null) setLastScore(payload.prevEvaluation.score)
        setSkipUsed(payload.skipUsed || false)
        tts.stopThinking()

        const processNext = () => {
          stopElaborateReminder()
          setShortFeedback(null)
          processNextRef.current = null
          const next = payload.question
          setCurrentQ(next)
          setQIndex(payload.questionIndex)
          setAiMessage(next?.question)
          setTranscript(p => [...p, { role: 'ai', content: next?.question }])
          stt.reset()
          setUserAnswer('')
          setCode('')
          setShowCode(next?.questionType === 'code')

          const questionText = next?.question
          const intro = payload.wasSkipped ? "Moving to the next question." : `Question ${payload.questionIndex + 1}.`
          tts.speak(intro + ' ' + questionText, () => {
            stt.start()
            sendMessage('QUESTION_STARTED', { questionId: next?.questionId })
          })
        }
        processNextRef.current = processNext

        if (payload.prevEvaluation?.shortFeedback) {
          const fb = payload.prevEvaluation
          setShortFeedback(fb)
          feedbackTimeoutRef.current = setTimeout(processNext, 4500)
        } else {
          processNext()
        }
        break
      }

      case 'QUESTION_REPEATED': {
        tts.stop()
        setTranscript(p => [...p, { role: 'user', content: '[Asked to repeat question]' }, { role: 'ai', content: payload.question }])
        tts.speak(payload.question, () => stt.start())
        break
      }

      case 'SKIP_DENIED': {
        toast.error(payload.message || 'Cannot skip')
        break
      }

      case 'VIOLATION_RECORDED': {
        setViolationCount(payload.violationCount)
        setMaxViolations(payload.maxViolations)
        toast(payload.warning, { icon: '⚠️', duration: 5000,
          style: { background: '#fef3c7', borderColor: '#f59e0b', color: '#b45309' } })
        break
      }

      case 'INTERVIEW_AUTO_SUBMITTED': {
        tts.stop()
        setPhase('complete')
        toast.error('Interview auto-submitted due to violations', { duration: 5000 })
        setTimeout(() => navigate(`/interview/${interviewId}/report`), 3000)
        break
      }

      case 'INTERVIEW_COMPLETE': {
        setProcessingState(false)
        tts.stopThinking()
        setPhase('complete')
        const closingMsg = payload.message || "Interview complete! Your report is being prepared."
        setAiMessage(closingMsg)
        tts.speak(closingMsg)
        setTimeout(() => navigate(`/interview/${interviewId}/report`), 5000)
        break
      }

      case 'error': {
        setProcessingState(false)
        tts.stopThinking()
        console.error('WS Error:', payload.message)
        toast.error(payload.message || 'An error occurred')
        break
      }
    }
  }, [tts, stt, sendMessage, navigate, interviewId, stopElaborateReminder])

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const res = await getInterview(interviewId)
        const iv = res.data.data
        if (['completed', 'auto_submitted'].includes(iv.status)) {
          navigate(`/interview/${interviewId}/report`)
          return
        }
        setInterview(iv)
        // Stay on 'check' phase — PreInterviewCheck.onComplete calls startCamera + setPhase('countdown')
      } catch {
        toast.error('Interview not found')
        navigate('/dashboard')
      }
    }
    init()

    return () => {
      wsRef.current?.close(1000)
      timerRef.current && clearInterval(timerRef.current)
      feedbackTimeoutRef.current && clearTimeout(feedbackTimeoutRef.current)
      stt.stop()
      tts.stop()
      proctoring.stopCamera()
    }
  }, [interviewId])

  // ── Auto-scroll transcript on new messages ─────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript])

  // ── Start after countdown ──────────────────────────────────────────
  const handleCountdownComplete = useCallback(() => {
    proctoring.enterFullscreen()
    connectWS()

    // Start total timer
    timerRef.current = setInterval(() => {
      setTimer(p => p + 1)
    }, 1000)
  }, [connectWS, proctoring])

  // ── Answer submission ──────────────────────────────────────────────
  const stopElaborateReminder = useCallback(() => {
    if (elaborateReminderRef.current) {
      clearInterval(elaborateReminderRef.current)
      elaborateReminderRef.current = null
    }
  }, [])

  const handleSubmitAnswer = useCallback((text = null, isAuto = false) => {
    const finalAnswer = text || stt.stop() || userAnswer
    if (!finalAnswer.trim() && !code.trim() && !showCode) {
      toast('Please provide an answer before submitting', { icon: 'ℹ️' })
      return
    }

    if (isAuto && !showCode) {
      const words = finalAnswer.trim().split(/\s+/).filter(Boolean).length
      if (words < 30) {
        // Block the auto-submit, restart mic
        stt.start()
        toast('⚠️ Answer too short — please elaborate or click Submit manually', { duration: 4000 })
        // Start 20-sec periodic reminder ONLY if one isn't already running
        if (!elaborateReminderRef.current) {
          elaborateReminderRef.current = setInterval(() => {
            toast('Still waiting... Please elaborate or click Submit manually.', { icon: '💬', duration: 3500 })
          }, 20000)
        }
        return
      }
    }

    // Real submission — clear any pending reminder loop
    stopElaborateReminder()

    setTranscript(p => [...p, { role: 'user', content: showCode ? `${finalAnswer}\n\n[Code]:\n${code}` : finalAnswer }])

    sendMessage('SUBMIT_ANSWER', {
      userAnswer: finalAnswer || userAnswer || '',
      code: showCode ? code : null,
    })
  }, [stt, userAnswer, code, showCode, sendMessage, stopElaborateReminder])


  const handleSkip = useCallback(() => {
    if (skipUsed) { toast.error('You can only skip once per interview'); return }
    stt.stop()
    tts.stop()
    sendMessage('SKIP_QUESTION', {})
  }, [skipUsed, stt, tts, sendMessage])

  const handleRepeat = useCallback(() => {
    stt.stop()
    tts.stop()
    sendMessage('REPEAT_QUESTION', {})
  }, [stt, tts, sendMessage])

  const skipFeedbackWait = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    tts.stop()
    if (processNextRef.current) {
      processNextRef.current()
    }
  }, [tts])

  // ── Timer display ─────────────────────────────────────────────────
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Render ──────────────────────────────────────────────────────────
  if (phase === 'check') {
    return (
      <PreInterviewCheck
        onComplete={() => {
          // Start camera AFTER user passes the check
          proctoring.startCamera()
          setPhase('countdown')
        }}
      />
    )
  }

  if (phase === 'loading') return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )

  if (phase === 'countdown') return <Countdown onComplete={handleCountdownComplete} />

  if (phase === 'complete') return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="font-display font-bold text-2xl text-zinc-900 dark:text-zinc-50 mb-2">Interview Complete!</h2>
        <p className="text-zinc-500 font-medium font-body">Generating your report...</p>
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mt-4" />
      </motion.div>
    </div>
  )

  return (
    <div className="h-screen bg-white dark:bg-zinc-950 flex flex-col overflow-hidden transition-colors" style={{ fontFamily: 'Inter, system-ui' }}>
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 backdrop-blur-sm z-10 transition-colors">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: totalQs }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
                i < qIndex      ? 'w-4 bg-green-500' :
                i === qIndex    ? 'w-6 bg-blue-600' :
                                  'w-4 bg-zinc-200 dark:bg-zinc-800'
              }`} />
            ))}
          </div>
          <span className="text-xs font-mono text-zinc-500 font-medium">Q{qIndex + 1}/{totalQs}</span>
        </div>

        {/* Center — Q type badge */}
        <div className="hidden sm:flex items-center gap-2">
          {currentQ?.questionType === 'code' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              <Code2 className="w-3.5 h-3.5" /> Code Round
            </span>
          )}
          {isFollowup && (
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              ↩ Follow-up
            </span>
          )}
        </div>

        {/* Right — stats */}
        <div className="flex items-center gap-4">
          <ViolationBadge count={violationCount} max={maxViolations} />
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-md">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />{fmtTime(timer)}
          </div>
        </div>
      </div>

      {/* ── Main content — fixed height ────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">

        {/* ── Left panel — AI Question + Answer ──────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-3">

          {/* AI Message */}
          <motion.div
            key={aiMessage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-600/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-display">AI Interviewer</span>
                  {processingState && <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium"><VoiceWave thinking size="sm" /> Thinking...</span>}
                  {tts.speaking && !processingState && <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium"><VoiceWave speaking size="sm" /> Speaking...</span>}
                  {stt.listening && !tts.speaking && !processingState && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-500 animate-pulse uppercase tracking-wider">● Recording</span>
                  )}
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium text-[15px] leading-relaxed">
                  {processingState
                    ? <span className="text-zinc-400 dark:text-zinc-500 italic">Evaluating your answer...</span>
                    : aiMessage}
                </p>
                {currentQ && !processingState && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">{currentQ.questionType?.replace('_', ' ')}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">{currentQ.difficulty}</span>
                    {currentQ.topic && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">{currentQ.topic}</span>}
                    {lastScore != null && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ml-auto ${lastScore >= 7 ? 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/20' : lastScore >= 4 ? 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20' : 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20'}`}>
                        Prev Score: {lastScore}/10
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Code editor */}
          <AnimatePresence>
            {showCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 280 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex-shrink-0 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" /> Code Editor
                  </span>
                  <button onClick={() => setShowCode(false)} className="text-zinc-500 hover:text-zinc-300 text-xs font-medium uppercase tracking-wider transition-colors">Hide</button>
                </div>
                <div style={{ height: 240 }} className="p-1">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, padding: { top: 12 } }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Two STT boxes ──────────────────────────────────── */}
          <div className="flex-1 grid grid-rows-2 gap-3 min-h-0 overflow-hidden">

            {/* Box A — Live STT */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-sm transition-colors">
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Live Voice Text
                </span>
                {stt.listening && <span className="text-[10px] font-bold text-red-500 animate-pulse uppercase tracking-wider">● LIVE</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {stt.interimText ? (
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 italic leading-relaxed">{stt.interimText}</p>
                ) : stt.listening ? (
                  <p className="text-xs text-zinc-400 font-medium italic">Listening... speak now</p>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium italic">Press Speak to start recording</p>
                )}
              </div>
            </div>

            {/* Box B — Accumulated Answer */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-sm transition-colors">
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Your Answer Draft
                </span>
                {(stt.transcript || userAnswer) && (
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {(stt.transcript || userAnswer).trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {stt.transcript || userAnswer ? (
                  <p className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {stt.transcript || userAnswer}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium italic">Your spoken answer will build up here...</p>
                )}
              </div>
              <textarea
                placeholder="Or type additional notes here..."
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 text-sm font-medium text-zinc-700 dark:text-zinc-300 outline-none resize-none px-4 py-3 placeholder-zinc-400 dark:placeholder-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                rows={2}
              />
            </div>

          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {shortFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-shrink-0 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-600/30 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-500" /> AI Feedback
                  </span>
                  <div className="flex gap-2 items-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${shortFeedback.score >= 7 ? 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/30' : shortFeedback.score >= 5 ? 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30' : 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/30'}`}>
                      Score: {shortFeedback.score}/10
                    </span>
                    <button onClick={skipFeedbackWait} className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                      Next →
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                    <span className="text-green-500 font-bold mr-1.5">✓</span>{shortFeedback.shortFeedback}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                    <span className="text-red-400 font-bold mr-1.5">✗</span>{shortFeedback.brutalFeedback}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex-shrink-0 flex items-center gap-3 flex-wrap">
            <button
              onClick={stt.listening ? stt.stop : stt.start}
              disabled={processingState || tts.speaking}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
                stt.listening
                  ? 'border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400'
              } disabled:opacity-50`}
            >
              {stt.listening ? <><MicOff className="w-4 h-4" /> Stop Recording</> : <><Mic className="w-4 h-4" /> Start Speaking</>}
            </button>

            <button onClick={handleRepeat} disabled={processingState}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold transition-all shadow-sm disabled:opacity-50">
              <RotateCcw className="w-4 h-4" /> Repeat
            </button>

            <button onClick={() => setShowCode(p => !p)} disabled={processingState}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all shadow-sm disabled:opacity-50 ${
                showCode ? 'border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}>
              <Code2 className="w-4 h-4" /> {showCode ? 'Hide Code' : 'Show Code Editor'}
            </button>

            {!skipUsed && (
              <button onClick={handleSkip} disabled={processingState}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-amber-200 dark:hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-500 text-sm font-semibold transition-all shadow-sm disabled:opacity-50 ml-auto mr-1">
                <SkipForward className="w-4 h-4" /> Skip
              </button>
            )}

            <button
              onClick={() => handleSubmitAnswer()}
              disabled={processingState || tts.speaking}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 ${skipUsed ? 'ml-auto' : ''}`}
            >
              <Send className="w-4 h-4" /> Submit Answer
            </button>
          </div>
        </div>

        {/* ── Right panel — Camera + Voice + Transcript ──────────── */}
        <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col gap-3 p-4 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 min-h-0 overflow-hidden transition-colors">

          {/* Webcam */}
          <div className="flex-shrink-0 relative">
            <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <video ref={proctoring.videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {!proctoring.cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <div className="text-center">
                    <Camera className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
                      {proctoring.cameraError || 'Initializing...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-900 ${
              proctoring.faceStatus === 'ok' ? 'bg-green-500' :
              proctoring.faceStatus === 'no_face' ? 'bg-red-500 animate-pulse' : 'bg-amber-500 animate-pulse'
            }`} />
          </div>

          {/* Voice state */}
          <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center gap-3 shadow-sm transition-colors">
            <VoiceWave active={stt.listening} speaking={tts.speaking} thinking={processingState} size="md" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-500">
              {processingState ? '🤔 Thinking...' : tts.speaking ? '🔊 AI Speaking...' : stt.listening ? '🎙️ Listening...' : '🔇 Mic off'}
            </p>
          </div>

          {/* Proctoring alert */}
          {violationCount > 0 && (
            <div className="flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">{violationCount}/{maxViolations} violations</span>
              </div>
            </div>
          )}

          {/* Interview metadata */}
          {interview && (
            <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 shadow-sm transition-colors">
              <span className="text-zinc-400 dark:text-zinc-600">Role: </span><span className="text-zinc-700 dark:text-zinc-300">{interview.role}</span>
              <span className="text-zinc-300 dark:text-zinc-700 mx-2">|</span>
              <span className="text-zinc-700 dark:text-zinc-300">{interview.interviewType?.replace('_', ' ')}</span>
            </div>
          )}

          {/* Transcript Panel — scrollable */}
          <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-sm transition-colors">
            <div className="flex-shrink-0 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Full Transcript
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcript.length === 0 && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center mt-4">Transcript will appear here...</p>
              )}
              {transcript.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1.5">{msg.role === 'user' ? 'You' : 'AI'}</span>
                  <div className={`px-3 py-2 rounded-xl text-[13px] font-medium max-w-[95%] whitespace-pre-wrap leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tr-none dark:bg-blue-600/10 dark:text-blue-100 dark:border-blue-600/20'
                      : 'bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-tl-none dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
