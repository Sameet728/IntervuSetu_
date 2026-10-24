import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, IconButton, StatusBadge } from '../components/ui/index'
import { usePageEnter } from '../motion/hooks'
import {
  Mic, MicOff, Volume2, VolumeX, Play, Pause, Square,
  RotateCcw, Sparkles, CheckCircle2, AlertCircle, Copy,
  ArrowRight, Activity, Radio, Cpu, RefreshCw, Sliders,
  Zap, ShieldCheck, Tag, Info, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { WhistleRecorder } from '../services/whistleSTT'

const SAMPLE_PROMPTS = [
  "Hello! Welcome to your technical interview. Let's start with a brief overview of your background and key projects.",
  "Can you explain the difference between optimistic and pessimistic locking in high-concurrency database systems?",
  "How does React's Fiber architecture enable concurrent features and prioritized state updates?",
  "Tell me about a production incident you investigated. How did you diagnose the issue and mitigate downtime?",
]

const DEFAULT_KEYWORDS = [
  'React', 'Fiber', 'Virtual DOM', 'Node.js', 'Express',
  'MongoDB', 'SQL', 'JWT', 'TypeScript', 'Docker', 'Kubernetes'
]

export default function VoiceTestPage() {
  const navigate = useNavigate()
  const root = usePageEnter()

  // ─── Mode: Whistle Neural vs Chrome Web Speech ────────────────────
  const [sttEngine, setSttEngine] = useState('whistle') // 'whistle' | 'webspeech'
  const [whistleStatus, setWhistleStatus] = useState({ available: false, loading: true })
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS)
  const [newKeyword, setNewKeyword] = useState('')

  // ─── Diagnostics Support ──────────────────────────────────────────
  const [sttSupported, setSttSupported] = useState(false)
  const [ttsSupported, setTtsSupported] = useState(false)

  // ─── TTS State ────────────────────────────────────────────────────
  const [ttsText, setTtsText]           = useState(SAMPLE_PROMPTS[0])
  const [voices, setVoices]             = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [rate, setRate]                 = useState(1.0)
  const [pitch, setPitch]               = useState(1.0)
  const [volume, setVolume]             = useState(1.0)
  const [speaking, setSpeaking]         = useState(false)
  const [paused, setPaused]             = useState(false)
  const [ttsCharIndex, setTtsCharIndex] = useState(0)

  // ─── STT Shared State ─────────────────────────────────────────────
  const [listening, setListening]       = useState(false)
  const [sttProcessing, setSttProcessing] = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [chunksHistory, setChunksHistory] = useState([])
  const [micLevel, setMicLevel]         = useState(0)
  const [liveInterim, setLiveInterim]   = useState('')
  const [wordCount, setWordCount]       = useState(0)
  const [lastMetrics, setLastMetrics]   = useState(null)

  // ─── Speaker Test State ───────────────────────────────────────────
  const [speakerTesting, setSpeakerTesting] = useState(false)

  // ─── Refs ─────────────────────────────────────────────────────────
  const whistleRecorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const streamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const synthRef = useRef(null)

  // ─── Initial checks & voice loading ───────────────────────────────
  useEffect(() => {
    // Check TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTtsSupported(true)
      synthRef.current = window.speechSynthesis

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices()
        setVoices(available)
        if (available.length > 0 && !selectedVoice) {
          const natural = available.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Zira') || v.name.includes('Samantha')))
          setSelectedVoice(natural ? natural.name : available[0].name)
        }
      }

      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }

    // Check Web Speech API
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    setSttSupported(Boolean(SpeechRecognition))

    // Check Whistle Neural Engine Status
    checkWhistleEngine()

    return () => {
      synthRef.current?.cancel()
      stopAllSTT()
    }
  }, [])

  // ─── Local Qwen 2.5 LLM State ─────────────────────────────────────
  const [llmStatus, setLlmStatus]       = useState({ available: false, model: 'qwen2.5-0.5b-instruct-q4_k_m', size_mb: 468.6 })
  const [qwenLoading, setQwenLoading]   = useState(false)
  const [qwenResult, setQwenResult]     = useState(null)
  const [testQuestion, setTestQuestion] = useState(SAMPLE_PROMPTS[1])

  const checkWhistleEngine = async () => {
    setWhistleStatus(prev => ({ ...prev, loading: true }))
    try {
      const resp = await fetch('http://localhost:5000/api/audio/whistle/status')
      if (resp.ok) {
        const data = await resp.json()
        setWhistleStatus({
          available: Boolean(data.available),
          model: (data.stt && data.stt.model) || data.model || 'whistle-16.9mb',
          engine: 'cactus-needle-cpu',
          loading: false
        })
        if (data.llm) {
          setLlmStatus({
            available: Boolean(data.llm.ready),
            model: data.llm.model || 'qwen2.5-0.5b-instruct-q4_k_m',
            size_mb: data.llm.size_mb || 468.6
          })
        }
        return
      }
    } catch {}

    // Direct check to port 5001
    try {
      const directResp = await fetch('http://localhost:5001/health')
      if (directResp.ok) {
        const d = await directResp.json()
        setWhistleStatus({
          available: Boolean(d.stt ? d.stt.ready : d.ready),
          model: (d.stt && d.stt.model) || 'whistle-16.9mb',
          engine: 'needle-cpu',
          loading: false
        })
        if (d.llm) {
          setLlmStatus({
            available: Boolean(d.llm.ready),
            model: d.llm.model || 'qwen2.5-0.5b-instruct-q4_k_m',
            size_mb: d.llm.size_mb || 468.6
          })
        }
        return
      }
    } catch {}

    setWhistleStatus({ available: false, loading: false })
  }

  // ─── Whistle Neural STT Handlers ──────────────────────────────────
  const startWhistleSTT = async () => {
    stopAllSTT()

    const recorder = new WhistleRecorder({
      keywords,
      onVolume: (vol) => setMicLevel(vol),
      onStatus: (status) => {
        if (status === 'transcribing') setSttProcessing(true)
        else if (status === 'recording') setSttProcessing(false)
        else if (status === 'idle') {
          setListening(false)
          setSttProcessing(false)
        }
      },
      onChunk: (sentence, chunkInfo) => {
        setSttProcessing(false)
        setChunksHistory(prev => [...prev, {
          text: sentence,
          time: new Date().toLocaleTimeString(),
          ttft: chunkInfo.ttft_ms,
          tps: chunkInfo.decode_tps
        }])
        if (chunkInfo.ttft_ms) {
          setLastMetrics({
            ttft: chunkInfo.ttft_ms,
            tps: chunkInfo.decode_tps,
            lang: chunkInfo.language
          })
        }
      },
      onTranscript: (full) => {
        setTranscript(full)
        setWordCount(full.split(/\s+/).filter(Boolean).length)
      },
      onError: (err) => {
        toast.error('Whistle mic error: ' + err.message)
        setListening(false)
        setSttProcessing(false)
      }
    })

    whistleRecorderRef.current = recorder

    try {
      await recorder.start()
      setListening(true)
      toast.success('Whistle Neural STT active! Speak continuously.')
    } catch (err) {
      console.error(err)
      toast.error('Could not start microphone: ' + err.message)
    }
  }

  const stopWhistleSTT = () => {
    if (whistleRecorderRef.current) {
      whistleRecorderRef.current.stop()
      whistleRecorderRef.current = null
    }
    setListening(false)
    setSttProcessing(false)
    setMicLevel(0)
  }

  // ─── Chrome Web Speech API Handlers ───────────────────────────────
  const startWebSpeechSTT = async () => {
    stopAllSTT()
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      return toast.error('Web Speech API requires Google Chrome or Microsoft Edge.')
    }

    try {
      // Audio stream for live volume meter
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 128
      ctx.createMediaStreamSource(stream).connect(analyser)

      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / buf.length)
        const pct = Math.min(100, Math.round(rms * 1600))
        setMicLevel(pct)
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()

      const rec = new SpeechRecognition()
      recognitionRef.current = rec
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'

      rec.onstart = () => {
        setListening(true)
        toast.success('Chrome Web Speech listening!')
      }

      rec.onresult = (event) => {
        let interim = ''
        let finalChunk = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const txt = event.results[i][0].transcript
          if (event.results[i].isFinal) finalChunk += txt + ' '
          else interim += txt
        }

        if (finalChunk) {
          setTranscript(prev => {
            const updated = (prev ? prev.trim() + ' ' : '') + finalChunk.trim()
            setWordCount(updated.split(/\s+/).filter(Boolean).length)
            return updated
          })
        }

        setLiveInterim(interim)
      }

      rec.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.error('STT error:', e.error)
        }
      }

      rec.onend = () => {
        if (listening) {
          try { rec.start() } catch {}
        }
      }

      rec.start()
    } catch (err) {
      toast.error('Could not access microphone: ' + err.message)
      stopWebSpeechSTT()
    }
  }

  const stopWebSpeechSTT = () => {
    setListening(false)
    setLiveInterim('')
    setMicLevel(0)

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
  }

  const stopAllSTT = () => {
    stopWhistleSTT()
    stopWebSpeechSTT()
  }

  const toggleRecording = () => {
    if (listening) {
      stopAllSTT()
    } else {
      if (sttEngine === 'whistle') {
        startWhistleSTT()
      } else {
        startWebSpeechSTT()
      }
    }
  }

  const clearTranscript = () => {
    setTranscript('')
    setLiveInterim('')
    setChunksHistory([])
    setWordCount(0)
    setLastMetrics(null)
    setQwenResult(null)
    whistleRecorderRef.current?.clear()
  }

  const runQwenEvaluation = async () => {
    const answerToTest = transcript.trim() || "In optimistic locking, you have a version number column on the record. When updating, you check if the version matches. If someone else changed it, your update fails and you retry."
    setQwenLoading(true)
    try {
      const res = await fetch('http://localhost:5000/api/audio/local-ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testQuestion,
          userAnswer: answerToTest,
          role: 'Software Engineer',
          techStack: keywords
        })
      })
      if (res.ok) {
        const data = await res.json()
        setQwenResult(data)
        toast.success(`Evaluated by Local Qwen 2.5 0.5B (${data.latency_ms || 2500}ms)!`)
      } else {
        toast.error('Local AI error')
      }
    } catch (err) {
      toast.error('Could not connect to Local AI server')
    } finally {
      setQwenLoading(false)
    }
  }

  const addKeyword = (e) => {
    e.preventDefault()
    if (!newKeyword.trim()) return
    if (!keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
    }
    setNewKeyword('')
  }

  const removeKeyword = (kw) => {
    setKeywords(keywords.filter(k => k !== kw))
  }

  // ─── TTS Controls ─────────────────────────────────────────────────
  const speakText = () => {
    if (!synthRef.current) return toast.error('TTS is not supported in this browser.')
    synthRef.current.cancel()

    if (!ttsText.trim()) return toast('Please enter text to speak')

    const utterance = new SpeechSynthesisUtterance(ttsText)
    const voiceObj = voices.find(v => v.name === selectedVoice)
    if (voiceObj) utterance.voice = voiceObj
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onstart = () => {
      setSpeaking(true)
      setPaused(false)
      setTtsCharIndex(0)
    }

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        setTtsCharIndex(e.charIndex)
      }
    }

    utterance.onend = () => {
      setSpeaking(false)
      setPaused(false)
      setTtsCharIndex(0)
    }

    utterance.onerror = (e) => {
      console.warn('TTS error:', e)
      setSpeaking(false)
      setPaused(false)
    }

    synthRef.current.speak(utterance)
  }

  const pauseResumeTTS = () => {
    if (!synthRef.current) return
    if (paused) {
      synthRef.current.resume()
      setPaused(false)
    } else {
      synthRef.current.pause()
      setPaused(true)
    }
  }

  const stopTTS = () => {
    synthRef.current?.cancel()
    setSpeaking(false)
    setPaused(false)
    setTtsCharIndex(0)
  }

  // ─── Speaker Test Chime ───────────────────────────────────────────
  const testSpeakerBeep = () => {
    try {
      setSpeakerTesting(true)
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

      osc.start()
      osc.stop(ctx.currentTime + 0.5)

      setTimeout(() => {
        setSpeakerTesting(false)
        ctx.close().catch(() => {})
        toast.success('Speaker test chime played!')
      }, 500)
    } catch {
      setSpeakerTesting(false)
    }
  }

  const copyTranscript = () => {
    if (!transcript) return
    navigator.clipboard.writeText(transcript)
    toast.success('Transcript copied to clipboard!')
  }

  return (
    <div ref={root} className="page-shell">
      <Navbar />

      <main className="container-page pt-[calc(var(--nav-h)+2rem)] pb-16">

        {/* ── Header ────────────────────────────────────────────── */}
        <div data-enter className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-hairline pb-6 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold text-success-500">
              <Zap className="h-3.5 w-3.5" aria-hidden /> Whistle Neural &amp; Web Speech Laboratory
            </div>
            <h1 className="t-h1">Voice System Check (STT &amp; TTS)</h1>
            <p className="t-sm mt-1">
              Test your Speech-to-Text with <strong className="font-semibold text-ink">Whistle Neural AI (Rolling Chunker)</strong> and Text-to-Speech output.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={testSpeakerBeep}
              disabled={speakerTesting}
              icon={<Volume2 className="h-3.5 w-3.5 text-accent" aria-hidden />}
            >
              {speakerTesting ? 'Playing chime…' : 'Test Speaker Chime'}
            </Button>
            <Link
              to="/qwen-test"
              className="btn btn-ai btn-sm"
            >
              <Cpu className="h-3.5 w-3.5" aria-hidden />
              Qwen AI Playground
            </Link>
            <Link
              to="/interview/create"
              className="btn btn-primary btn-sm"
            >
              Go to Interview <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* ── Engine Status Cards ─────────────────────────────────── */}
        <div data-enter className="mb-8 grid gap-4 sm:grid-cols-3">
          {/* Whistle Card */}
          <div className={`card-inset p-4 ${whistleStatus.available ? 'border-success/30' : 'border-warning/30'}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="eyebrow flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-success-500" aria-hidden /> Whistle Neural STT
              </span>
              {whistleStatus.available ? (
                <StatusBadge tone="live">16.9 MB Model Ready</StatusBadge>
              ) : (
                <StatusBadge tone="warn" pulse>Connecting</StatusBadge>
              )}
            </div>
            <p className="t-xs">Cactus Compute CPU · 5-Beam Search · Punctuation</p>
          </div>

          {/* Qwen 2.5 0.5B Card */}
          <div className={`card-inset p-4 ${llmStatus.available ? 'border-ai/30' : 'border-warning/30'}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="eyebrow flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-ai" aria-hidden /> Local AI (Qwen 2.5)
              </span>
              {llmStatus.available ? (
                <StatusBadge tone="live">468 MB GGUF Ready</StatusBadge>
              ) : (
                <StatusBadge tone="warn" pulse>Connecting</StatusBadge>
              )}
            </div>
            <p className="t-xs">Cross-Questioning &amp; Brutal Feedback on CPU</p>
          </div>

          {/* TTS Card */}
          <div className={`card-inset p-4 ${ttsSupported ? 'border-accent/30' : 'border-danger/30'}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="eyebrow flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-accent" aria-hidden /> TTS (AI Voice)
              </span>
              {ttsSupported ? (
                <StatusBadge tone="live">{voices.length} Voices</StatusBadge>
              ) : (
                <StatusBadge tone="off">Unavailable</StatusBadge>
              )}
            </div>
            <p className="t-xs">Web Speech Synthesis Audio Output</p>
          </div>
        </div>

        {/* ── Main Two-Column Testing Grid ────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ════ COLUMN 1: SPEECH-TO-TEXT (STT) ════ */}
          <div className="card flex flex-col gap-6 p-5 sm:p-6">

            {/* STT Header & Mode Switcher */}
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg border ${sttEngine === 'whistle' ? 'border-success/25 bg-success/10 text-success-500' : 'border-accent/25 bg-accent/10 text-accent'}`}>
                    {sttEngine === 'whistle' ? <Zap className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
                  </div>
                  <div>
                    <h2 className="t-h3">1. Speech-to-Text Engine</h2>
                    <p className="t-xs">Live candidate transcription</p>
                  </div>
                </div>

                {listening && (
                  <StatusBadge tone="off" pulse>Listening live</StatusBadge>
                )}
              </div>

              {/* Mode Toggle Tabs */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-hairline bg-inset p-1">
                <button
                  type="button"
                  onClick={() => { if (!listening) setSttEngine('whistle') }}
                  disabled={listening}
                  aria-pressed={sttEngine === 'whistle'}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all duration-fast ${
                    sttEngine === 'whistle'
                      ? 'bg-surface text-success-500 shadow-1 ring-1 ring-success/25'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" aria-hidden />
                  Whistle Neural (Punctuation &amp; Chunker)
                </button>

                <button
                  type="button"
                  onClick={() => { if (!listening) setSttEngine('webspeech') }}
                  disabled={listening}
                  aria-pressed={sttEngine === 'webspeech'}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all duration-fast ${
                    sttEngine === 'webspeech'
                      ? 'bg-surface text-accent shadow-1 ring-1 ring-accent/25'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" aria-hidden />
                  Chrome Web Speech
                </button>
              </div>
            </div>

            {/* Whistle Keywords Bar */}
            {sttEngine === 'whistle' && (
              <div className="card-inset space-y-2 border-success/25 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-success-500">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" aria-hidden /> Technical Keyword Biasing (5-Beam Auto-Boost):
                  </span>
                  <span className="num text-2xs text-subtle">{keywords.length} active</span>
                </div>
                <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                  {keywords.map(kw => (
                    <span
                      key={kw}
                      className="chip gap-1 border-hairline bg-surface text-ink"
                    >
                      {kw}
                      {!listening && (
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          aria-label={`Remove ${kw}`}
                          className="-mr-0.5 grid h-4 w-4 place-items-center rounded text-subtle transition-colors hover:bg-danger/15 hover:text-danger-500"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {!listening && (
                  <form onSubmit={addKeyword} className="flex gap-2 pt-1">
                    <label htmlFor="whistle-keyword" className="sr-only">Add technical keyword</label>
                    <input
                      id="whistle-keyword"
                      type="text"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      placeholder="Add keyword (e.g. Next.js, Redux, AWS)…"
                      className="input flex-1 text-xs"
                    />
                    <Button type="submit" size="sm">Add</Button>
                  </form>
                )}
              </div>
            )}

            {/* Mic Meter & Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-accent" aria-hidden /> Microphone Input Level:</span>
                <span className="num">{micLevel}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full border border-hairline bg-inset p-0.5">
                <motion.div
                  className={`h-full rounded-full transition-all duration-75 ${
                    micLevel > 60
                      ? 'bg-gradient-to-r from-success-500 via-warning-500 to-danger-500'
                      : micLevel > 15
                      ? 'bg-gradient-to-r from-accent to-success-500'
                      : 'bg-hairline-strong'
                  }`}
                  style={{ width: `${Math.max(micLevel, 3)}%` }}
                />
              </div>

              {/* Status info bar */}
              <div className="flex items-center justify-between gap-2 pt-1 text-xs text-subtle">
                <span className="flex items-center gap-1">
                  {sttEngine === 'whistle' ? (
                    <><Zap className="h-3 w-3 text-success-500" aria-hidden /> Rolling Chunker with VAD Active (No 30s limit)</>
                  ) : (
                    <><Radio className="h-3 w-3 text-accent" aria-hidden /> Web Speech streaming</>
                  )}
                </span>
                {sttProcessing && (
                  <span className="flex items-center gap-1 font-semibold text-success-500">
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden /> Neural decoding…
                  </span>
                )}
              </div>
            </div>

            {/* Mic Action Button */}
            <div className="flex gap-3">
              <Button
                block
                onClick={toggleRecording}
                variant={listening ? 'danger' : 'primary'}
                icon={listening ? <MicOff className="h-4 w-4" aria-hidden /> : sttEngine === 'whistle' ? <Zap className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
              >
                {listening ? (
                  'Stop Recording'
                ) : (
                  `Start ${sttEngine === 'whistle' ? 'Whistle Neural STT' : 'Web Speech STT'}`
                )}
              </Button>
              {transcript && (
                <IconButton label="Clear transcript" onClick={clearTranscript} className="btn-secondary">
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </IconButton>
              )}
            </div>

            {/* Whistle Sentence History / Interim Stream */}
            <div className="card-inset flex min-h-[90px] flex-col justify-between gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow flex items-center gap-1">
                  <Radio className="h-3 w-3 text-success-500" aria-hidden />
                  {sttEngine === 'whistle' ? 'Punctuated Sentence Chunks (Neural Stream)' : 'Live Speech Stream (Interim)'}
                </span>
                {lastMetrics && (
                  <span className="num text-2xs text-subtle">
                    TTFT: {Math.round(lastMetrics.ttft)}ms · {Math.round(lastMetrics.tps)} tokens/s
                  </span>
                )}
              </div>

              {sttEngine === 'whistle' ? (
                <div className="max-h-32 space-y-1.5 overflow-y-auto">
                  {chunksHistory.length > 0 ? (
                    chunksHistory.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-ink">
                        <span className="num mt-0.5 text-2xs text-subtle">{c.time}:</span>
                        <span className="font-medium text-success-500">“{c.text}”</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs italic text-faint">
                      {listening ? 'Speak naturally… sentences commit on pauses or every 15s with perfect punctuation.' : 'Click "Start Whistle Neural STT" and speak.'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium italic leading-relaxed text-ink">
                  {liveInterim || (listening ? 'Speak into your microphone now…' : 'Click start to speak.')}
                </p>
              )}
            </div>

            {/* Final Accumulated Transcript Box */}
            <div className="card-inset flex min-h-[160px] flex-1 flex-col justify-between p-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-hairline pb-2">
                  <span className="eyebrow flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success-500" aria-hidden /> Complete Stitched Transcript
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="num text-2xs text-subtle">{wordCount} words</span>
                    {transcript && (
                      <IconButton label="Copy transcript" onClick={copyTranscript}>
                        <Copy className="h-3 w-3" aria-hidden />
                      </IconButton>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium leading-relaxed text-ink">
                  {transcript || <span className="text-xs italic text-faint">Recognized and punctuated words will be auto-stitched here…</span>}
                </p>
              </div>
            </div>

            {/* ════ Interactive Qwen 2.5 Local AI Tester ════ */}
            <div className="card-inset space-y-3 border-ai/25 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow flex items-center gap-1.5 text-ai">
                  <Cpu className="h-3.5 w-3.5" aria-hidden /> Local AI Reaction (Qwen 2.5 0.5B)
                </span>
                <span className="num text-2xs text-subtle">468 MB GGUF · CPU</span>
              </div>

              <div>
                <label htmlFor="qwen-test-question" className="field-label mb-1 block text-2xs">
                  Interview Question Being Answered:
                </label>
                <select
                  id="qwen-test-question"
                  value={testQuestion}
                  onChange={e => setTestQuestion(e.target.value)}
                  className="input w-full text-xs"
                >
                  {SAMPLE_PROMPTS.map((q, i) => (
                    <option key={i} value={q}>Q{i+1}: {q.slice(0, 60)}…</option>
                  ))}
                </select>
              </div>

              <Button
                block
                type="button"
                variant="ai"
                size="sm"
                onClick={runQwenEvaluation}
                loading={qwenLoading}
                icon={qwenLoading ? null : <Zap className="h-3.5 w-3.5" aria-hidden />}
              >
                {qwenLoading ? 'Qwen 2.5 Analyzing Answer…' : 'Test Qwen 2.5 Cross-Question & Brutal Feedback'}
              </Button>

              {qwenResult && (
                <div className="animate-fade-in space-y-2.5 rounded-lg border border-ai/25 bg-surface p-3.5 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-hairline pb-2">
                    <span className="flex items-center gap-1 font-bold text-ai">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden /> Score: <span className="num">{qwenResult.score} / 10</span>
                    </span>
                    <span className="num flex items-center gap-1 text-2xs text-subtle">
                      <Zap className="h-3 w-3" aria-hidden /> {qwenResult.latency_ms}ms CPU
                    </span>
                  </div>

                  <div>
                    <span className="eyebrow block">Candidate Feedback:</span>
                    <p className="font-medium text-ink">{qwenResult.shortFeedback}</p>
                  </div>

                  {qwenResult.brutalFeedback && (
                    <div className="rounded-md border border-danger/25 bg-danger/10 p-2">
                      <span className="eyebrow block text-danger-500">Brutal Critique (Missing Detail):</span>
                      <p className="mt-0.5 text-2xs font-medium text-danger-500">{qwenResult.brutalFeedback}</p>
                    </div>
                  )}

                  <div className="rounded-md border border-ai/25 bg-ai/10 p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="eyebrow text-ai">Sharp Cross-Question:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTtsText(qwenResult.crossQuestion)
                          speakText()
                        }}
                        className="flex items-center gap-1 text-2xs font-semibold text-accent transition-colors hover:text-ink"
                      >
                        <Volume2 className="h-3 w-3" aria-hidden /> Speak via TTS
                      </button>
                    </div>
                    <p className="text-xs font-semibold italic text-ink">“{qwenResult.crossQuestion}”</p>
                  </div>
                </div>
              )}
            </div>

          </div>


          {/* ════ COLUMN 2: TEXT-TO-SPEECH (TTS) ════ */}
          <div className="card flex flex-col gap-6 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                  <Volume2 className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="t-h3">2. Text-to-Speech (AI Voice)</h2>
                  <p className="t-xs">AI audio output synthesis</p>
                </div>
              </div>

              {speaking && (
                <StatusBadge tone="info" pulse>Speaking</StatusBadge>
              )}
            </div>

            {/* Voice Selection */}
            <div>
              <label htmlFor="tts-voice" className="field-label mb-1.5 flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-accent" aria-hidden /> Synthesizer Voice
              </label>
              <select
                id="tts-voice"
                value={selectedVoice}
                onChange={e => setSelectedVoice(e.target.value)}
                className="input w-full text-xs"
              >
                {voices.map((v, i) => (
                  <option key={i} value={v.name}>
                    {v.name} ({v.lang}) {v.default ? '— Default' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sliders: Rate & Pitch */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <label htmlFor="tts-rate">Speed / Rate:</label>
                  <span className="num font-bold text-ink">{rate}x</span>
                </div>
                <input
                  id="tts-rate"
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.1"
                  value={rate}
                  onChange={e => setRate(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-accent"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <label htmlFor="tts-pitch">Pitch:</label>
                  <span className="num font-bold text-ink">{pitch}</span>
                </div>
                <input
                  id="tts-pitch"
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.1"
                  value={pitch}
                  onChange={e => setPitch(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-accent"
                />
              </div>
            </div>

            {/* Quick Sample Prompts */}
            <div>
              <span className="eyebrow mb-2 block">Sample Interview Prompts</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SAMPLE_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setTtsText(p); stopTTS() }}
                    aria-pressed={ttsText === p}
                    className={`truncate rounded-md border p-2.5 text-left text-xs transition-all duration-fast ${
                      ttsText === p
                        ? 'border-accent/45 bg-accent-soft/60 font-semibold text-accent'
                        : 'border-hairline bg-inset text-muted hover:border-hairline-strong hover:text-ink'
                    }`}
                  >
                    Question {idx + 1}: {p.slice(0, 32)}…
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Text */}
            <div className="flex flex-1 flex-col">
              <label htmlFor="tts-text" className="field-label mb-1.5">
                Text to Speak
              </label>
              <textarea
                id="tts-text"
                value={ttsText}
                onChange={e => setTtsText(e.target.value)}
                rows={4}
                className="input w-full flex-1 resize-none text-sm"
                placeholder="Type anything for the AI interviewer to speak…"
              />
            </div>

            {/* Speaking Controls */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                className="flex-1"
                onClick={speakText}
                disabled={speaking && !paused}
                icon={<Play className="h-4 w-4 fill-current" aria-hidden />}
              >
                {speaking ? 'Restart Speaking' : 'Play / Speak Text'}
              </Button>

              {speaking && (
                <Button variant="secondary" size="sm" onClick={pauseResumeTTS} icon={paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}>
                  {paused ? 'Resume' : 'Pause'}
                </Button>
              )}

              {speaking && (
                <Button variant="danger" size="sm" onClick={stopTTS} icon={<Square className="h-3.5 w-3.5 fill-current" aria-hidden />}>
                  Stop
                </Button>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  )
}
