import { useState, useEffect, useRef, useCallback } from 'react'

export function useInterviewTimer() {
  const [totalSeconds,    setTotalSeconds]    = useState(0)
  const [questionSeconds, setQuestionSeconds] = useState(0)
  const [running,         setRunning]         = useState(false)
  const intervalRef = useRef(null)

  const start = useCallback(() => {
    setRunning(true)
  }, [])

  const pause = useCallback(() => setRunning(false), [])

  const resetQuestion = useCallback(() => setQuestionSeconds(0), [])

  const stop = useCallback(() => {
    setRunning(false)
    clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setTotalSeconds(t    => t + 1)
      setQuestionSeconds(q => q + 1)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return {
    totalSeconds,
    questionSeconds,
    running,
    start,
    pause,
    stop,
    resetQuestion,
    totalDisplay:    fmt(totalSeconds),
    questionDisplay: fmt(questionSeconds),
  }
}
