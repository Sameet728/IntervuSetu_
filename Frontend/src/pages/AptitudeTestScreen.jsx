import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { submitAptitudeTest } from '../api/aptitudeAPI'
import toast from 'react-hot-toast'
import { AlertTriangle, Clock, ChevronLeft, ChevronRight, Maximize2, Building2, Check } from 'lucide-react'
import { Button, Card, Modal, Spinner } from '../components/ui/index'

const cx = (...p) => p.filter(Boolean).join(' ')

/* Static class maps — no interpolated Tailwind names. */
const DIFF_TONE = { hard: 'badge badge-danger', medium: 'badge badge-warning', easy: 'badge badge-success' }
const MAP_CURRENT  = 'border-accent bg-accent text-accent-on'
const MAP_ANSWERED = 'border-success-500 bg-success-bg text-success-500'
const MAP_IDLE     = 'border-hairline bg-surface text-subtle hover:border-hairline-strong'

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
    if (count >= 100) {
      toast.error('Maximum proctoring violations reached. Auto-submitting test.')
      handleFinalSubmit('Maximum proctoring violations reached.')
    } else {
      toast.error(`Warning: ${type === 'tab_switch' ? 'Tab change' : 'Exited fullscreen'} detected! (${count}/100)`)
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
  const lowTime = timeLeft <= 300

  // Overall progress
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0)
  const answeredQuestions = Object.keys(answers).length
  const progressPct = (answeredQuestions / totalQuestions) * 100

  return (
    <div ref={containerRef} className="page-shell relative flex h-dvh flex-col overflow-hidden text-ink">

      {!hasStarted ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-canvas p-6">
          <Card className="flex w-full max-w-md flex-col items-center p-8 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Maximize2 className="h-8 w-8" aria-hidden />
            </div>
            <h1 className="t-h1 mb-3">Ready to begin?</h1>
            <p className="t-body mb-8">
              This exam uses strict proctoring. Starting will lock your browser into fullscreen mode.
              <strong className="text-ink"> Exiting fullscreen or switching tabs records a violation and may auto-submit.</strong>
            </p>
            <Button block size="lg" onClick={beginTest} icon={<Maximize2 className="h-4 w-4" aria-hidden />}>
              Enter fullscreen &amp; start
            </Button>
          </Card>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="h-1 w-full shrink-0 bg-inset">
            <div className="h-full bg-accent transition-all duration-base ease-out" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface px-4 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-ink sm:text-lg">{section.title}</h1>
              <p className="eyebrow">Section {currentSectionIndex + 1} of {sections.length}</p>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <div className="flex flex-col items-end">
                <span className="eyebrow">Section time</span>
                <div className={`num flex items-center gap-2 rounded-md border-2 px-3 py-1 font-semibold ${
                  lowTime ? 'border-danger-500 bg-danger-bg text-danger-500' : 'border-hairline bg-inset text-ink'
                }`}>
                  <Clock className="h-4 w-4" aria-hidden />
                  {fmtTime(timeLeft)}
                </div>
                {lowTime && <span className="mt-1 text-2xs font-bold uppercase text-danger-500">5 min warning</span>}
              </div>

              <Button onClick={handleManualNextSection}>
                {currentSectionIndex >= sections.length - 1 ? 'Finish test' : 'Next section'}
              </Button>
            </div>
          </header>

          {/* Main body */}
          <div className="flex min-h-0 flex-1 overflow-hidden">

            {/* Question area */}
            <div className="relative flex flex-1 flex-col overflow-y-auto p-6 lg:p-10">
              <div className="mx-auto w-full max-w-3xl flex-1">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-xs font-semibold uppercase tracking-wider text-accent">
                      Question {currentIndex + 1} of {section.questions.length}
                    </span>
                    {q.companies && q.companies.length > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2 py-0.5 text-2xs font-medium text-success-500">
                        <Building2 className="h-3 w-3" aria-hidden /> {q.companies.join(', ')}
                      </span>
                    )}
                    {q.difficulty && (
                      <span className={DIFF_TONE[q.difficulty] || 'badge'}>{q.difficulty}</span>
                    )}
                  </div>
                  <span className="num text-xs text-subtle">Time spent: {fmtTime(questionTimers[q._id] || 0)}</span>
                </div>

                <h2 className="mb-8 select-none text-xl leading-relaxed text-ink whitespace-pre-wrap lg:text-2xl">
                  {q.question}
                </h2>

                {/* Options — real radios, selected state carries shape + text + colour */}
                <div role="radiogroup" aria-label={`Options for question ${currentIndex + 1}`} className="space-y-3 pb-24">
                  {q.options.map((opt, i) => {
                    const isSelected = answers[q._id] === opt._id
                    const letter = String.fromCharCode(65 + i)
                    return (
                      <label key={opt._id} className="block cursor-pointer">
                        <input
                          type="radio"
                          name={`q-${q._id}`}
                          className="peer sr-only"
                          value={opt._id}
                          checked={isSelected}
                          onChange={() => handleSelect(opt._id)}
                        />
                        <div className={cx(
                          'flex items-start gap-4 rounded-xl border-2 p-4 transition-colors duration-fast peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50',
                          isSelected ? 'border-accent bg-accent-soft' : 'border-hairline bg-surface hover:border-hairline-strong',
                        )}>
                          <span className={cx(
                            'num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                            isSelected ? 'border-accent bg-accent text-accent-on' : 'border-hairline-strong text-subtle',
                          )}>
                            {letter}
                          </span>
                          <span className="text-base leading-relaxed text-ink">{opt.text}</span>
                          {isSelected && (
                            <span className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-accent">
                              <Check className="h-4 w-4" aria-hidden /> Selected
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Bottom navigation */}
              <div className="absolute inset-x-0 bottom-0 flex shrink-0 justify-center gap-4 border-t border-hairline bg-surface p-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                  disabled={currentIndex === 0}
                  className="w-32"
                  icon={<ChevronLeft className="h-4 w-4" aria-hidden />}
                >
                  Previous
                </Button>
                <Button
                  variant={currentIndex === section.questions.length - 1 ? 'outline' : 'secondary'}
                  onClick={() => {
                    if (currentIndex < section.questions.length - 1) setCurrentIndex(p => p + 1)
                    else handleManualNextSection()
                  }}
                  className="w-32"
                >
                  {currentIndex === section.questions.length - 1
                    ? 'Finish section'
                    : <>Next <ChevronRight className="h-4 w-4" aria-hidden /></>}
                </Button>
              </div>
            </div>

            {/* Question map */}
            <aside className="flex w-64 shrink-0 flex-col border-l border-hairline bg-inset" aria-label="Question navigation">
              <div className="flex items-center justify-between border-b border-hairline p-4">
                <span className="eyebrow">Question map</span>
                <span className="num text-xs text-subtle">{section.questions.length} items</span>
              </div>
              <div className="grid flex-1 content-start grid-cols-5 gap-2 overflow-y-auto p-4">
                {section.questions.map((_, i) => {
                  const qId = section.questions[i]._id
                  const isAns = !!answers[qId]
                  const isCur = currentIndex === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentIndex(i)}
                      aria-label={`Question ${i + 1}${isAns ? ', answered' : ''}${isCur ? ', current' : ''}`}
                      aria-current={isCur ? 'true' : undefined}
                      className={cx('num aspect-square rounded-md border text-xs font-bold transition-colors',
                        isCur ? MAP_CURRENT : isAns ? MAP_ANSWERED : MAP_IDLE)}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-hairline p-3 text-2xs text-subtle">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden /> Current</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-success-500 bg-success-bg" aria-hidden /> Answered</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-hairline bg-surface" aria-hidden /> Not answered</span>
              </div>
            </aside>

          </div>

          {/* Submitting overlay */}
          {submitting && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-canvas/85 backdrop-blur-sm">
              <Spinner size="lg" />
              <p className="t-body text-ink">Submitting your answers…</p>
            </div>
          )}

          {/* Confirm modal */}
          <Modal
            open={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            title={currentSectionIndex >= sections.length - 1 ? 'Submit test' : 'Proceed to next section?'}
            footer={
              <>
                <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                <Button onClick={proceedSection}>
                  {currentSectionIndex >= sections.length - 1 ? 'Submit test' : 'Proceed'}
                </Button>
              </>
            }
          >
            <p className="t-body flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" aria-hidden />
              <span>
                Are you sure? You <strong className="text-ink">cannot</strong> return to this section once you move forward.
              </span>
            </p>
          </Modal>
        </>
      )}
    </div>
  )
}
