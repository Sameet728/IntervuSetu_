import { useCallback, useRef, useState } from 'react'

/**
 * Play a subtle two-tone "thinking" audio cue using Web Audio API
 */
function playThinkingCue() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime

    // Two soft ascending tones
    [0, 0.18].forEach((delay, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 440 + i * 110    // 440Hz then 550Hz
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(0.08, now + delay + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25)
      osc.start(now + delay)
      osc.stop(now + delay + 0.3)
    })
  } catch (e) { /* ignore in environments without audio */ }
}

export function useTTS() {
  const [speaking, setSpeaking] = useState(false)
  const [thinking, setThinking] = useState(false)
  const utteranceRef = useRef(null)

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance

    // Pick best available voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v =>
        v.name.includes('Google UK English Female') ||
        v.name.includes('Microsoft Aria')  ||
        v.name.includes('Samantha')        ||
        v.name.includes('Karen')           ||
        (v.lang.startsWith('en') && v.localService === false)
      ) || voices.find(v => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred
    }

    if (window.speechSynthesis.getVoices().length) setVoice()
    else window.speechSynthesis.onvoiceschanged = setVoice

    utterance.rate   = 0.92
    utterance.pitch  = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => { setSpeaking(true); setThinking(false) }
    utterance.onend   = () => { setSpeaking(false); if (onEnd) onEnd() }
    utterance.onerror = () => { setSpeaking(false); if (onEnd) onEnd() }

    window.speechSynthesis.speak(utterance)
  }, [])

  /**
   * Start "thinking" state — play audio cue + show animation
   * Call this before making the AI call, then speak() when ready
   */
  const startThinking = useCallback(() => {
    setThinking(true)
    playThinkingCue()
  }, [])

  const stopThinking = useCallback(() => {
    setThinking(false)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    setThinking(false)
  }, [])

  /**
   * Interrupt AI speech if user starts speaking
   */
  const interrupt = useCallback(() => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [])

  return { speak, stop, speaking, thinking, startThinking, stopThinking, interrupt }
}
