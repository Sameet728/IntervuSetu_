import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useProctoring } from '../hooks/useProctoring'
import { useSTT } from '../hooks/useSTT'
import { useTTS } from '../hooks/useTTS'
import VoiceWave from '../components/interview/VoiceWave'
import PreInterviewCheck from '../components/interview/PreInterviewCheck'
import CodeEditor from '../components/interview/CodeEditor'
import { getInterview } from '../api/interviewAPI'
import {
  Mic, MicOff, Send, SkipForward, RotateCcw, Code2,
  AlertTriangle, Camera, Clock, Radio,
  CheckCircle2, Shield, Lightbulb, Sparkles, ScrollText, PanelRight, Check, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Button, IconButton, ScorePill, Spinner } from '../components/ui/index'
import { prefersReducedMotion } from '../motion/setup'

// ─── Countdown component (3-2-1 overlay) ─────────────────────────────
function Countdown({ onComplete }) {
  const [count, setCount] = useState(3)
  const completedRef = useRef(false)
  
  useEffect(() => {
    if (count === 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }
    const t = setTimeout(() => setCount(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [count, onComplete])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-canvas/95 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div key={count}
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'backOut' }}
          className="text-center">
          <div className="num-xl text-accent" aria-hidden>
            {count > 0 ? count : <Mic className="inline h-16 w-16" />}
          </div>
          <p className="sr-only" role="status">{count > 0 ? `Starting in ${count}` : 'Interview started'}</p>
          <p className="t-lead mt-3 text-muted">{count > 0 ? 'Get ready' : 'Go'}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Violation counter ────────────────────────────────────────────────
function ViolationBadge({ count, max }) {
  const tone = count >= max - 1 ? 'danger' : count > 0 ? 'warning' : 'success'
  return (
    <span
      className="badge"
      style={{
        color: `rgb(var(--${tone}))`,
        borderColor: `rgb(var(--${tone}) / 0.32)`,
        backgroundColor: `rgb(var(--${tone}) / 0.08)`,
      }}
    >
      <Shield className="h-3 w-3" aria-hidden />
      <span className="num">{max - count}</span> chances left
    </span>
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
  const [maxViolations, setMaxViolations]   = useState(100)
  const [skipUsed, setSkipUsed]   = useState(false)
  const [lastScore, setLastScore] = useState(null)
  const [processingState, setProcessingState] = useState(false)
  const [isFollowup, setIsFollowup] = useState(false)
  const [timer, setTimer]         = useState(0) // seconds elapsed
  const [shortFeedback, setShortFeedback] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [pacingInfo, setPacingInfo] = useState(null)
  const [railOpen, setRailOpen] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────
  const wsRef              = useRef(null)
  const timerRef           = useRef(null)
  const feedbackTimeoutRef = useRef(null)
  const processNextRef     = useRef(null)
  const qStartTimeRef      = useRef(0)
  const transcriptRef      = useRef([])       // kept for legacy
  const transcriptEndRef   = useRef(null)     // auto-scroll target
  const elaborateReminderRef = useRef(null)   // 20-sec interval after blocked auto-submit
  const handleSubmitAnswerRef = useRef(null)
  // ⚠️ currentQ ref — keeps handleWSMessage closures always reading the LIVE question
  const currentQRef        = useRef(null)

  // ── Hooks ──────────────────────────────────────────────────────────
  const tts = useTTS()

  const processingStateRef = useRef(false)
  processingStateRef.current = processingState

  const handleSilence = useCallback((text) => {
    const candidateText = (text || '').trim()
    console.log('🎤 handleSilence received:', candidateText.substring(0, 40) + '...', 'processing:', processingStateRef.current)
    if (!candidateText || processingStateRef.current) return
    if (handleSubmitAnswerRef.current) {
      handleSubmitAnswerRef.current(candidateText, true)
    }
  }, [])

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

  // ── Must be declared before handleWSMessage (used in its dep array) ──
  const stopElaborateReminder = useCallback(() => {
    if (elaborateReminderRef.current) {
      clearInterval(elaborateReminderRef.current)
      elaborateReminderRef.current = null
    }
  }, [])

  const connectWS = useCallback(() => {
    const token = localStorage.getItem('token')
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:5000'}/ws/interview?token=${token}&interviewId=${interviewId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WS opened, waiting for connected event...')
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
      case 'connected': {
        sendMessage('START_INTERVIEW', { candidateName: user?.name || 'Candidate' })
        break
      }

      case 'INTERVIEW_STARTED': {
        const firstQ = payload.firstQuestion
        const introText = payload.greeting || firstQ?.question || ''
        const unifiedFirstQ = { ...firstQ, question: introText }
        setTranscript([{ role: 'ai', content: introText }])
        setCurrentQ(unifiedFirstQ)
        currentQRef.current = unifiedFirstQ
        setTotalQs(payload.totalQuestions)
        setQIndex(payload.questionIndex || 0)
        setPhase('active')
        setAiMessage(introText)
        const isCodeQ = firstQ?.questionType === 'code'
        setShowCode(isCodeQ)
        if (isCodeQ) {
          toast('💻 Coding Challenge! Code editor is open for your solution.', { icon: '⚡', duration: 4000 })
        }
        tts.speak(introText, () => {
          stt.start()
          sendMessage('QUESTION_STARTED', { questionId: firstQ?.questionId })
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
        stt.reset()
        setUserAnswer('')
        if (payload.evaluation?.score != null) setLastScore(payload.evaluation.score)
        if (payload.evaluation?.pacing) setPacingInfo(payload.evaluation.pacing)
        tts.stopThinking()

        // Use the live ref to avoid stale closure — read current question type accurately
        const liveCurrentQ = currentQRef.current
        if (liveCurrentQ?.questionType === 'code') {
          // Keep code editor open for follow-up on coding question
          setShowCode(true)
        }
        // Note: if it's not a code question, leave showCode as-is (already false)

        const processFollowup = () => {
          setShortFeedback(null)
          processNextRef.current = null
          const followupText = payload.question || ''
          setAiMessage(followupText)
          setTranscript(p => [...p, { role: 'ai', content: followupText }])
          stt.reset()
          setUserAnswer('')
          // TTS speaks the follow-up question, then mic auto-starts
          tts.speak(followupText, () => stt.start())
        }
        processNextRef.current = processFollowup

        if (payload.evaluation?.shortFeedback) {
          setShortFeedback(payload.evaluation)
          feedbackTimeoutRef.current = setTimeout(processFollowup, 4500)
        } else {
          processFollowup()
        }
        break
      }

      case 'NEXT_QUESTION': {
        setProcessingState(false)
        setIsFollowup(false)
        stt.reset()
        setUserAnswer('')
        if (payload.prevEvaluation?.score != null) setLastScore(payload.prevEvaluation.score)
        if (payload.prevEvaluation?.pacing) setPacingInfo(payload.prevEvaluation.pacing)
        setSkipUsed(payload.skipUsed || false)
        tts.stopThinking()

        const next = payload.question
        const isCodeQ = next?.questionType === 'code'

        // Automatically popup code editor immediately for coding questions
        if (isCodeQ) {
          setShowCode(true)
          toast('💻 Coding Question! Code editor is ready for your solution.', { icon: '⚡', duration: 4500 })
        } else {
          setShowCode(false)
        }

        const processNext = () => {
          stopElaborateReminder()
          setShortFeedback(null)
          processNextRef.current = null
          setCurrentQ(next)
          currentQRef.current = next  // keep live ref in sync
          setQIndex(payload.questionIndex)
          // Use conversationalText (with natural bridge phrase) if available, else raw question
          const displayText = next?.conversationalText || next?.question || ''
          setAiMessage(displayText)
          setTranscript(p => [...p, { role: 'ai', content: displayText }])
          stt.reset()
          setUserAnswer('')
          setCode('')

          // TTS speaks the full bridge + question, then mic auto-starts
          tts.speak(displayText, () => {
            stt.start()
            sendMessage('QUESTION_STARTED', { questionId: next?.questionId })
          })
        }
        processNextRef.current = processNext

        if (payload.prevEvaluation?.shortFeedback) {
          setShortFeedback(payload.prevEvaluation)
          feedbackTimeoutRef.current = setTimeout(processNext, 4000)
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

      case 'AI_HINT': {
        setProcessingState(false)
        tts.stopThinking()
        const hintMsg = payload.message || payload.hint || "Here is a hint to guide you."
        setAiMessage(hintMsg)
        setTranscript(p => [...p, { role: 'ai', content: hintMsg }])
        toast(payload.hint || hintMsg, { icon: '💡', duration: 8000 })
        tts.speak(hintMsg, () => stt.start())
        break
      }

      case 'AI_CLARIFICATION': {
        setProcessingState(false)
        tts.stopThinking()
        const clarifyMsg = payload.message || payload.clarification || "Here is clarification on the question."
        setAiMessage(clarifyMsg)
        setTranscript(p => [...p, { role: 'ai', content: clarifyMsg }])
        toast(payload.clarification || clarifyMsg, { icon: '💬', duration: 8000 })
        tts.speak(clarifyMsg, () => stt.start())
        break
      }

      case 'AI_REASSURANCE': {
        setProcessingState(false)
        tts.stopThinking()
        const msg = payload.message || "Take your time! Whenever you're ready."
        toast(msg, { icon: '⏳', duration: 5000 })
        tts.speak(msg, () => stt.start())
        break
      }

      case 'SKIP_DENIED': {
        setProcessingState(false)
        toast.error(payload.message || 'Cannot skip')
        break
      }

      case 'VIOLATION_RECORDED': {
        const vCount = (typeof payload.violationCount === 'number' && !isNaN(payload.violationCount)) ? payload.violationCount : 1
        const maxV = (typeof payload.maxViolations === 'number' && !isNaN(payload.maxViolations)) ? payload.maxViolations : 100
        setViolationCount(vCount)
        setMaxViolations(maxV)
        const warnMsg = (payload.warning && !payload.warning.includes('NaN')) ? payload.warning : `⚠️ Warning ${vCount}/${maxV}: ${payload.violationType || 'Violation recorded'}`
        toast(warnMsg, { icon: '⚠️', duration: 5000,
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
  // currentQ intentionally NOT in deps — we use currentQRef to avoid stale closures
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

  // ── Start camera when active ───────────────────────────────────────
  useEffect(() => {
    if (phase === 'active') {
      proctoring.startCamera()
    }
  }, [phase, proctoring.startCamera])

  // ── Auto-scroll transcript on new messages ─────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript])

  // ── Start after countdown ──────────────────────────────────────────
  const handleCountdownComplete = useCallback(() => {
    connectWS()

    // Start total timer
    timerRef.current = setInterval(() => {
      setTimer(p => p + 1)
    }, 1000)
  }, [connectWS, proctoring])

  // ── Answer submission ──────────────────────────────────────────────

  const handleSubmitAnswer = useCallback((text = null, isAuto = false) => {
    const finalAnswer = (text || stt.stop() || userAnswer || '').trim()
    if (!finalAnswer && !code.trim()) {
      if (!isAuto) toast('Please provide an answer before submitting', { icon: 'ℹ️' })
      return
    }

    if (isAuto) {
      if (showCode) {
        // In coding round — only auto-submit if candidate said a completion/tool command.
        // Regular silence while typing code should NOT interrupt.
        const isDoneOrCommand = /(repeat|again|hint|clue|clarify|skip|done|finished|ready to submit|submitted)/i.test(finalAnswer)
        if (!isDoneOrCommand) {
          return  // candidate is still coding — keep mic on
        }
      } else {
        const words = finalAnswer.split(/\s+/).filter(Boolean).length
        const isConversational = /(repeat|again|hint|clue|clarify|skip)/i.test(finalAnswer)
        // Require at least 25 words OR a conversational command to auto-submit
        if (words < 25 && !isConversational) {
          toast(`Please elaborate more (${words}/25 words) to auto-submit, or click Submit Answer.`, {
            id: 'min-words-toast',
            icon: '🎙️',
            duration: 4000,
          })
          return  // too short — keep listening!
        }
      }
      toast.success('Silence detected — submitting answer...', { icon: '🚀', duration: 2500 })
    }

    // Real submission — stop listening and clear any pending reminder loop
    stt.stop()
    stt.reset()
    setUserAnswer('')
    stopElaborateReminder()

    setTranscript(p => [...p, { role: 'user', content: showCode ? `${finalAnswer}\n\n[Code]:\n${code}` : finalAnswer }])

    sendMessage('SUBMIT_ANSWER', {
      userAnswer: finalAnswer || userAnswer || '',
      code: showCode ? code : null,
    })
  }, [stt, userAnswer, code, showCode, sendMessage, stopElaborateReminder])

  handleSubmitAnswerRef.current = handleSubmitAnswer


  const handleSkip = useCallback(() => {
    if (processingState) return
    setProcessingState(true)
    stt.stop()
    stt.reset()
    setUserAnswer('')
    tts.stop()
    toast('Skipping question (Score: 0)...', { icon: '⏭️' })
    sendMessage('SKIP_QUESTION', {})
  }, [processingState, stt, tts, sendMessage])

  const handleRepeat = useCallback(() => {
    stt.stop()
    tts.stop()
    sendMessage('REPEAT_QUESTION', {})
  }, [stt, tts, sendMessage])

  const handleRequestHint = useCallback(() => {
    if (processingState) return
    toast('Requesting hint...', { icon: '💡' })
    sendMessage('REQUEST_HINT', { code: showCode ? code : '' })
  }, [processingState, showCode, code, sendMessage])

  const skipFeedbackWait = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    tts.stop()
    stt.reset()
    setUserAnswer('')
    if (processNextRef.current) {
      processNextRef.current()
    }
  }, [tts, stt])

  // ── Timer display ─────────────────────────────────────────────────
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Render ──────────────────────────────────────────────────────────
  if (phase === 'check') {
    return (
      <PreInterviewCheck
        onComplete={() => {
          setPhase('countdown')
        }}
      />
    )
  }

  if (phase === 'loading') return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <Spinner size="lg" />
      <span className="sr-only" role="status">Loading your interview room</span>
    </div>
  )

  if (phase === 'countdown') return <Countdown onComplete={handleCountdownComplete} />

  if (phase === 'complete') return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-success-500" aria-hidden />
        <h1 className="t-h2">Interview complete</h1>
        <p className="t-body mt-2 text-muted">Scoring your answers and building the report…</p>
        <Spinner className="mx-auto mt-5" />
      </motion.div>
    </div>
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-hairline bg-surface px-3 py-2.5 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          {/* Progress */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden items-center gap-1 sm:flex" aria-hidden>
              {Array.from({ length: totalQs }).map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all duration-slow ease-out ${
                  i < qIndex ? 'w-4 bg-success-500' :
                  i === qIndex ? 'w-6 bg-accent' :
                  'w-4 bg-hairline-strong'
                }`} />
              ))}
            </div>
            <p className="num shrink-0 text-xs font-medium text-muted">
              Q{qIndex + 1}<span className="text-faint">/{totalQs}</span>
            </p>
            <progress
              className="h-1 w-16 shrink-0 accent-accent sm:hidden"
              value={qIndex}
              max={Math.max(totalQs - 1, 1)}
              aria-label={`Question ${qIndex + 1} of ${totalQs}`}
            />
          </div>

          {/* Status chips */}
          <div className="hidden items-center gap-1.5 md:flex">
            <Badge color="success">On-device voice AI</Badge>
            {(currentQ?.topic === 'Self Introduction' || currentQ?.questionId === 'q_intro') && (
              <Badge color="accent">Warm-up</Badge>
            )}
            {currentQ?.questionType === 'code' && (
              <Badge color="ai"><Code2 className="h-3 w-3" aria-hidden />Code round</Badge>
            )}
            {isFollowup && <Badge color="warning">Follow-up</Badge>}
            {pacingInfo?.urgency === 'tight' && (
              <Badge color="warning" className="num">{pacingInfo.minsPerRemainingQ}m/Q left</Badge>
            )}
            {pacingInfo?.urgency === 'critical' && <Badge color="danger">Final stretch</Badge>}
          </div>

          {/* Right — stats */}
          <div className="flex shrink-0 items-center gap-2">
            <ViolationBadge count={violationCount} max={maxViolations} />
            <p className="num flex items-center gap-1.5 rounded-md border border-hairline bg-inset px-2 py-1 text-xs font-medium text-muted">
              <Clock className="h-3.5 w-3.5 text-faint" aria-hidden />
              <span className="tabular-nums">{fmtTime(timer)}</span>
              <span className="sr-only">elapsed</span>
            </p>
            <IconButton
              className="lg:hidden"
              label={railOpen ? 'Close camera and transcript panel' : 'Open camera and transcript panel'}
              onClick={() => setRailOpen(p => !p)}
            >
              {railOpen ? <X className="h-4 w-4" aria-hidden /> : <PanelRight className="h-4 w-4" aria-hidden />}
            </IconButton>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-canvas-inset">

        {/* ── Left: question, answer, controls ──────────────────────── */}
        <div className={`flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 ${showCode ? 'overflow-y-auto' : 'overflow-hidden'}`}>

          {/* AI message */}
          <motion.div
            key={aiMessage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion() ? 0 : 0.25, ease: 'easeOut' }}
            className="card flex-shrink-0 p-4 sm:p-5"
            aria-live="polite"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ai/25 bg-ai-soft text-ai" aria-hidden>
                <Radio className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-sm font-semibold text-ink">AI interviewer</span>
                  {isFollowup && (
                    <Badge color={pacingInfo?.urgency === 'tight' || pacingInfo?.urgency === 'critical' ? 'warning' : 'default'}>
                      {pacingInfo?.urgency === 'tight' || pacingInfo?.urgency === 'critical' ? 'Quick follow-up' : 'Follow-up'}
                    </Badge>
                  )}
                  {processingState && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <VoiceWave thinking size="sm" /> Evaluating
                    </span>
                  )}
                  {tts.speaking && !processingState && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-ai">
                      <VoiceWave speaking size="sm" /> Speaking
                    </span>
                  )}
                  {stt.listening && !tts.speaking && !processingState && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-danger-500">
                      <span className="status-dot status-dot-off animate-pulse" aria-hidden /> Recording
                    </span>
                  )}
                </div>
                <p className="text-[0.9375rem] font-medium leading-relaxed text-ink">
                  {processingState
                    ? <span className="italic text-subtle">Evaluating your answer…</span>
                    : aiMessage}
                </p>
                {currentQ && !processingState && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
                    <span className="chip">{currentQ.questionType?.replace('_', ' ')}</span>
                    <span className="chip capitalize">{currentQ.difficulty}</span>
                    {currentQ.topic && <span className="chip border-ai/25 bg-ai-soft text-ai">{currentQ.topic}</span>}
                    {lastScore != null && (
                      <span className="ml-auto flex items-center gap-1.5 text-2xs text-subtle">
                        Previous answer <ScorePill score={lastScore} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Code editor with integrated question prompt & robust typing */}
          <AnimatePresence>
            {showCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-shrink-0"
              >
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  question={currentQ}
                  questionText={currentQ?.question || aiMessage}
                  onClose={() => setShowCode(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Live voice + accumulated answer ───────────────────────── */}
          <div className={`min-h-0 flex-1 overflow-hidden ${showCode ? 'flex flex-col gap-2' : 'grid grid-rows-2 gap-3'}`}>

            {/* Live STT */}
            <section className={`card flex min-h-0 flex-col overflow-hidden ${showCode ? 'max-h-24' : ''}`} aria-label="Live voice text">
              <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-hairline bg-inset px-3 py-2">
                <p className="flex items-center gap-1.5 text-2xs font-semibold text-subtle">
                  <Mic className="h-3.5 w-3.5" aria-hidden /> Live voice text
                </p>
                {stt.listening && (
                  <span className="flex items-center gap-1.5 text-2xs font-semibold text-danger-500">
                    <span className="status-dot status-dot-off animate-pulse" aria-hidden /> Live
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {stt.interimText ? (
                  <p className="text-sm italic leading-relaxed text-muted">{stt.interimText}</p>
                ) : stt.listening ? (
                  <p className="text-xs italic text-faint">Listening — speak your thought process while you code.</p>
                ) : (
                  <p className="text-xs italic text-faint">Press “Start speaking” to record your answer by voice.</p>
                )}
              </div>
            </section>

            {/* Accumulated answer */}
            <section className="card flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Your answer">
              <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-hairline bg-inset px-3 py-2">
                <p className="flex items-center gap-1.5 text-2xs font-semibold text-subtle">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Your answer so far
                </p>
                {(stt.transcript || userAnswer) && (() => {
                  const words = (stt.transcript || userAnswer).trim().split(/\s+/).filter(Boolean).length
                  const ready = words >= 25
                  return (
                    <span className={`num text-2xs font-semibold ${ready ? 'text-success-500' : 'text-subtle'}`}>
                      {words}/25 words{ready ? ' · ready' : ''}
                    </span>
                  )
                })()}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {stt.transcript || userAnswer ? (
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink">
                    {stt.transcript || userAnswer}
                  </p>
                ) : (
                  <p className="text-xs italic text-faint">Your spoken explanation and typed notes build up here.</p>
                )}
              </div>
              <textarea
                aria-label="Add typed notes to your answer"
                placeholder="Or type additional notes…"
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                className="flex-shrink-0 resize-none border-t border-hairline bg-transparent px-3 py-2 text-xs font-medium text-ink outline-none placeholder:text-faint focus:bg-accent-soft/30"
                rows={showCode ? 1 : 2}
              />
            </section>

          </div>

          {/* Live feedback */}
          <AnimatePresence>
            {shortFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: prefersReducedMotion() ? 0 : 0.22 }}
                className="card flex-shrink-0 border-ai/25 p-4"
                role="status"
              >
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Sparkles className="h-3.5 w-3.5 text-ai" aria-hidden /> Immediate feedback
                  </p>
                  <div className="flex items-center gap-2">
                    <ScorePill score={shortFeedback.score} />
                    <Button variant="ghost" size="xs" onClick={skipFeedbackWait}>Next question</Button>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-muted">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-500" aria-hidden />
                    <span>{shortFeedback.shortFeedback}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500" aria-hidden />
                    <span>{shortFeedback.brutalFeedback}</span>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Button
              variant={stt.listening ? 'danger' : 'secondary'}
              size="md"
              onClick={stt.listening ? stt.stop : stt.start}
              disabled={processingState || tts.speaking}
              icon={stt.listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
            >
              {stt.listening ? 'Stop recording' : 'Start speaking'}
            </Button>

            <Button variant="ghost" size="md" onClick={handleRepeat} disabled={processingState}
              icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
              Repeat
            </Button>

            <Button variant="ghost" size="md" onClick={handleRequestHint} disabled={processingState}
              title="Ask the interviewer for a hint"
              icon={<Lightbulb className="h-4 w-4" aria-hidden />}>
              Hint
            </Button>

            <Button
              variant={showCode ? 'secondary' : 'ghost'}
              size="md"
              onClick={() => setShowCode(p => !p)}
              disabled={processingState}
              className={showCode ? 'text-accent ring-1 ring-accent/30' : ''}
              icon={<Code2 className="h-4 w-4" aria-hidden />}
            >
              {showCode ? 'Hide editor' : 'Code editor'}
            </Button>

            <div className="ml-auto flex items-center gap-2 max-sm:w-full">
              <Button variant="ghost" size="md" onClick={handleSkip} disabled={processingState}
                title="Skip this question — it scores zero"
                className="max-sm:flex-1"
                icon={<SkipForward className="h-4 w-4" aria-hidden />}>
                Skip
              </Button>

              <Button
                size="md"
                onClick={() => handleSubmitAnswer()}
                disabled={processingState || tts.speaking}
                className="max-sm:flex-1"
                icon={<Send className="h-4 w-4" aria-hidden />}
              >
                {showCode ? 'Submit code & answer' : 'Submit answer'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right rail: camera, voice state, transcript ───────────── */}
        <aside
          aria-label="Camera and transcript"
          className={`${railOpen ? 'fixed inset-x-0 bottom-0 z-40 flex max-h-[72vh] overflow-y-auto rounded-t-2xl border-t border-hairline bg-surface p-3 shadow-4' : 'hidden'} min-h-0 flex-col gap-3 lg:static lg:z-auto lg:flex lg:max-h-none lg:w-72 lg:flex-shrink-0 lg:overflow-hidden lg:rounded-none lg:border-l lg:border-t-0 lg:bg-canvas-inset lg:p-4 lg:shadow-none xl:w-80`}
        >
          <button
            onClick={() => setRailOpen(false)}
            className="btn btn-ghost btn-sm w-full justify-between lg:hidden"
          >
            <span className="text-xs font-semibold">Camera &amp; transcript</span>
            <X className="h-4 w-4" aria-hidden />
          </button>

          {/* Webcam */}
          <div className="relative flex-shrink-0">
            <div className="aspect-video overflow-hidden rounded-lg border border-hairline bg-canvas-inset">
              <video ref={proctoring.videoRef} autoPlay muted playsInline className="h-full w-full object-cover" aria-label="Your camera preview" />
              {!proctoring.cameraReady && (
                <div className="absolute inset-0 grid place-items-center bg-canvas-inset">
                  <div className="px-3 text-center">
                    <Camera className="mx-auto mb-1.5 h-5 w-5 text-faint" aria-hidden />
                    <p className="text-2xs font-medium text-subtle">
                      {proctoring.cameraError || 'Starting camera…'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <span
              className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${
                proctoring.faceStatus === 'ok' ? 'bg-success-500' :
                proctoring.faceStatus === 'no_face' ? 'animate-pulse bg-danger-500' : 'animate-pulse bg-warning-500'
              }`}
              title={{ ok: 'Face detected', no_face: 'No face detected' }[proctoring.faceStatus] || 'Checking camera'}
            />
            <p className="sr-only" role="status">
              {proctoring.faceStatus === 'ok' ? 'Face detected' : proctoring.faceStatus === 'no_face' ? 'No face detected' : 'Checking camera'}
            </p>
          </div>

          {/* Voice state */}
          <div className="flex flex-shrink-0 items-center gap-3 rounded-lg border border-hairline bg-surface p-3">
            <VoiceWave active={stt.listening} speaking={tts.speaking} thinking={processingState} size="md" />
            <p className="text-xs font-medium text-muted">
              {processingState ? 'Evaluating' : tts.speaking ? 'AI speaking' : stt.listening ? 'Listening' : 'Microphone off'}
            </p>
          </div>

          {/* Proctoring alert */}
          {violationCount > 0 && (
            <div className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-warning-500/30 bg-warning-bg p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning-500" aria-hidden />
              <p className="num text-xs font-medium text-warning-500">
                {violationCount} of {maxViolations} proctoring flags used
              </p>
            </div>
          )}

          {/* Interview metadata */}
          {interview && (
            <dl className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-hairline bg-surface p-3 text-xs">
              <dt className="sr-only">Role</dt>
              <dd className="font-medium text-ink">{interview.role}</dd>
              <span className="text-faint" aria-hidden>·</span>
              <dt className="sr-only">Type</dt>
              <dd className="text-subtle">{interview.interviewType?.replace('_', ' ')}</dd>
            </dl>
          )}

          {/* Transcript */}
          <section className="card flex min-h-40 flex-1 flex-col overflow-hidden lg:min-h-0">
            <header className="flex flex-shrink-0 items-center gap-1.5 border-b border-hairline bg-inset px-3 py-2 text-2xs font-semibold text-subtle">
              <ScrollText className="h-3.5 w-3.5" aria-hidden /> Full transcript
            </header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {transcript.length === 0 && (
                <p className="pt-2 text-center text-xs text-faint">Everything said in this session lands here.</p>
              )}
              {transcript.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="mb-1 text-3xs font-medium text-faint">{msg.role === 'user' ? 'You' : 'Interviewer'}</span>
                  <p className={`max-w-[95%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[0.8125rem] leading-relaxed ${
                    msg.role === 'user'
                      ? 'border border-accent/20 bg-accent-soft/60 text-ink'
                      : 'border border-hairline bg-inset text-muted'
                  }`}>
                    {msg.content}
                  </p>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </section>

        </aside>
      </div>
    </div>
  )
}
