import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Timers ────────────────────────────────────────────────────────────
const SILENCE_SUBMIT_MS     = 2200 // 2.2s of unbroken silence after speech → auto-submit
const STILL_THERE_PROMPT_MS = 25000 // 25s of complete silence without speaking → gentle prompt

export function useSTT({ onResult, onSilence, onStillThere }) {
  const [listening,       setListening]       = useState(false)
  const [transcript,      setTranscript]      = useState('')
  const [interimText,     setInterimText]     = useState('')
  const [showStillThere,  setShowStillThere]  = useState(false)

  const recognitionRef        = useRef(null)
  const isListeningDesiredRef  = useRef(false)
  const stillThereTimer       = useRef(null)
  const silenceTimer          = useRef(null)
  const finalTextRef          = useRef('')
  const hasSpokenRef          = useRef(false)

  // ⚠️ Keep callback refs fresh on EVERY render to eliminate stale closures
  const onResultRef     = useRef(onResult)
  const onSilenceRef    = useRef(onSilence)
  const onStillThereRef = useRef(onStillThere)

  useEffect(() => {
    onResultRef.current     = onResult
    onSilenceRef.current    = onSilence
    onStillThereRef.current = onStillThere
  })

  const clearAllTimers = useCallback(() => {
    clearTimeout(stillThereTimer.current)
    clearTimeout(silenceTimer.current)
  }, [])

  const startStillThereTimer = useCallback(() => {
    clearTimeout(stillThereTimer.current)
    stillThereTimer.current = setTimeout(() => {
      setShowStillThere(true)
      if (onStillThereRef.current) onStillThereRef.current()
    }, STILL_THERE_PROMPT_MS)
  }, [])

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported. Please use Google Chrome.')
      return
    }

    isListeningDesiredRef.current = true

    // If already active, don't recreate
    if (recognitionRef.current && listening) {
      return
    }

    // Clean up previous instance if any
    try {
      recognitionRef.current?.abort()
    } catch {}

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous      = true
    recognition.interimResults  = true
    recognition.lang            = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      startStillThereTimer()
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) finalChunk += text + ' '
        else interim += text
      }

      // Any speech resets the silence countdown
      clearTimeout(silenceTimer.current)

      if (finalChunk) {
        finalTextRef.current += finalChunk
        hasSpokenRef.current = true
        setTranscript(finalTextRef.current)
        if (onResultRef.current) onResultRef.current(finalTextRef.current.trim())

        // Speech detected — clear prompt timer
        setShowStillThere(false)
        clearTimeout(stillThereTimer.current)
        startStillThereTimer()
      }

      setInterimText(interim)

      if (interim) {
        setShowStillThere(false)
        clearTimeout(stillThereTimer.current)
      }

      const currentFullText = (finalTextRef.current + (interim ? ' ' + interim : '')).trim()
      const wordCount = currentFullText.split(/\s+/).filter(Boolean).length
      const isConversational = /(repeat|again|hint|clue|clarify|skip)/i.test(currentFullText)

      // Start silence countdown whenever candidate has spoken at least 2 words or a command
      if (wordCount >= 2 || isConversational) {
        silenceTimer.current = setTimeout(() => {
          if (isListeningDesiredRef.current && onSilenceRef.current) {
            const answerToSubmit = (finalTextRef.current + (interim ? ' ' + interim : '')).trim()
            if (answerToSubmit) {
              console.log('🎤 silenceTimer fired after unbroken pause:', wordCount, 'words')
              onSilenceRef.current(answerToSubmit)
            }
          }
        }, SILENCE_SUBMIT_MS)
      }
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        return
      }
      console.warn('STT non-fatal warning:', e.error)
    }

    recognition.onend = () => {
      const currentFullText = (finalTextRef.current + (interimText ? ' ' + interimText : '')).trim()
      const wordCount = currentFullText.split(/\s+/).filter(Boolean).length
      const isConversational = /(repeat|again|hint|clue|clarify|skip)/i.test(currentFullText)

      // If candidate has completed a full response (>= 25 words or conversational command)
      // and Chrome ended on silence, trigger auto-submit!
      if (isListeningDesiredRef.current && (wordCount >= 25 || isConversational)) {
        console.log('🎤 STT onend: Chrome detected end-of-speech with full answer (', wordCount, 'words). Auto-submitting!')
        clearAllTimers()
        isListeningDesiredRef.current = false
        setListening(false)
        if (onSilenceRef.current) {
          onSilenceRef.current(currentFullText)
        }
        return
      }

      // If listening is still desired (candidate is still answering, under 25 words or brief pause),
      // seamlessly restart recognition
      if (isListeningDesiredRef.current) {
        setTimeout(() => {
          if (isListeningDesiredRef.current) {
            try {
              recognition.start()
            } catch {
              // Re-bind fresh instance if current one locked
              start()
            }
          }
        }, 150)
      } else {
        setListening(false)
        setInterimText('')
        clearAllTimers()
      }
    }

    try {
      recognition.start()
    } catch {
      // already started or transitioning
    }
  }, [startStillThereTimer, listening])

  const stop = useCallback(() => {
    isListeningDesiredRef.current = false
    clearAllTimers()
    setShowStillThere(false)
    try {
      recognitionRef.current?.stop()
    } catch {}
    setListening(false)

    // Capture both finalized text and any uncommitted interim speech
    const combined = (finalTextRef.current + (interimText ? ' ' + interimText : '')).trim()
    finalTextRef.current = combined
    setTranscript(combined)
    setInterimText('')
    return combined
  }, [clearAllTimers, interimText])

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
