import { useCallback, useRef, useState } from 'react'

// ─── Silence detection settings (spec: 1.5–2s buffer) ────────────────
const SILENCE_AFTER_SPEECH_MS = 2000   // 2s after last word → auto submit
const STILL_THERE_PROMPT_MS   = 10000  // 10s of no speech → show "Still there?"
const FORCE_SUBMIT_MS         = 30000  // 30s complete silence → auto next question

export function useSTT({ onResult, onSilence, onStillThere }) {
  const [listening,    setListening]    = useState(false)
  const [transcript,   setTranscript]   = useState('')
  const [interimText,  setInterimText]  = useState('')
  const [showStillThere, setShowStillThere] = useState(false)

  const recognitionRef   = useRef(null)
  const silenceTimer     = useRef(null)   // fires after 2s silence to submit
  const stillThereTimer  = useRef(null)   // fires after 10s to prompt user
  const forceSubmitTimer = useRef(null)   // fires after 30s to force-submit empty
  const finalTextRef     = useRef('')
  const hasSpokenRef     = useRef(false)  // tracks if user has said anything

  const clearAllTimers = useCallback(() => {
    clearTimeout(silenceTimer.current)
    clearTimeout(stillThereTimer.current)
    clearTimeout(forceSubmitTimer.current)
  }, [])

  const resetSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimer.current)
    setShowStillThere(false)

    // 2s after last speech → auto submit
    silenceTimer.current = setTimeout(() => {
      const text = finalTextRef.current.trim()
      if (text && onSilence) {
        onSilence(text)
      }
    }, SILENCE_AFTER_SPEECH_MS)
  }, [onSilence])

  const startStillThereTimer = useCallback(() => {
    clearTimeout(stillThereTimer.current)
    clearTimeout(forceSubmitTimer.current)

    // 10s no speech → "Still there?"
    stillThereTimer.current = setTimeout(() => {
      setShowStillThere(true)
      if (onStillThere) onStillThere()

      // 30s total → auto-advance even if no answer
      forceSubmitTimer.current = setTimeout(() => {
        if (onSilence) onSilence(finalTextRef.current.trim() || '')
      }, FORCE_SUBMIT_MS - STILL_THERE_PROMPT_MS)
    }, STILL_THERE_PROMPT_MS)
  }, [onSilence, onStillThere])

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported. Please use Google Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous      = true
    recognition.interimResults  = true
    recognition.lang            = 'en-US'
    recognition.maxAlternatives = 1

    finalTextRef.current = ''
    hasSpokenRef.current = false
    setTranscript('')
    setInterimText('')
    setShowStillThere(false)

    recognition.onstart = () => {
      setListening(true)
      startStillThereTimer()  // start 10s "still there?" countdown
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) finalChunk += text + ' '
        else interim += text
      }

      if (finalChunk) {
        finalTextRef.current += finalChunk
        hasSpokenRef.current = true
        setTranscript(finalTextRef.current)
        if (onResult) onResult(finalTextRef.current.trim())

        // Speech detected — reset all timers
        setShowStillThere(false)
        clearTimeout(stillThereTimer.current)
        clearTimeout(forceSubmitTimer.current)
        resetSilenceTimer()  // 2s buffer after last word
      }

      setInterimText(interim)

      // If interim detected, user is actively speaking — clear "still there?"
      if (interim) {
        setShowStillThere(false)
        clearTimeout(stillThereTimer.current)
        clearTimeout(forceSubmitTimer.current)
      }
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        // Continue listening, don't error on silence
      } else {
        console.error('STT error:', e.error)
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterimText('')
      clearAllTimers()
    }

    recognition.start()
  }, [onResult, resetSilenceTimer, startStillThereTimer, clearAllTimers])

  const stop = useCallback(() => {
    clearAllTimers()
    setShowStillThere(false)
    recognitionRef.current?.stop()
    setListening(false)
    setInterimText('')
    return finalTextRef.current.trim()
  }, [clearAllTimers])

  const reset = useCallback(() => {
    finalTextRef.current = ''
    hasSpokenRef.current = false
    setTranscript('')
    setInterimText('')
    setShowStillThere(false)
  }, [])

  return {
    start,
    stop,
    reset,
    listening,
    transcript,
    interimText,
    showStillThere,
    fullText: transcript,
  }
}
