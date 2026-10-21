import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import {
  Mic, MicOff, Volume2, VolumeX, Play, Pause, Square,
  RotateCcw, Sparkles, CheckCircle2, AlertCircle, Copy,
  ArrowRight, Activity, Radio, Cpu, RefreshCw, Sliders,
  Zap, ShieldCheck, Tag, Info
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
      toast.success('⚡ Whistle Neural STT Active! Speak continuously.')
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
        toast.success(`⚡ Evaluated by Local Qwen 2.5 0.5B (${data.latency_ms || 2500}ms)!`)
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

    if (!ttsText.trim()) return toast('Please enter text to speak', { icon: 'ℹ️' })

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors" style={{ fontFamily: 'Inter, system-ui' }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
              <Zap className="w-3.5 h-3.5" /> Whistle Neural & Web Speech Laboratory
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Voice System Check (STT & TTS)
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Test your Speech-to-Text with <strong>Whistle Neural AI (Rolling Chunker)</strong> and Text-to-Speech output.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={testSpeakerBeep}
              disabled={speakerTesting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold hover:border-blue-500 text-zinc-700 dark:text-zinc-200 transition-all shadow-sm disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-500" />
              {speakerTesting ? 'Playing chime...' : 'Test Speaker Chime'}
            </button>
            <Link
              to="/qwen-test"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-all shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5" />
              Qwen AI Playground
            </Link>
            <Link
              to="/interview/create"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20"
            >
              Go to Interview <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ── Engine Status Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Whistle Card */}
          <div className={`p-4 rounded-xl border transition-all ${whistleStatus.available ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" /> Whistle Neural STT
              </span>
              {whistleStatus.available ? (
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 16.9 MB Model Ready</span>
              ) : (
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Connecting...</span>
              )}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Cactus Compute CPU · 5-Beam Search · Punctuation</p>
          </div>

          {/* Qwen 2.5 0.5B Card */}
          <div className={`p-4 rounded-xl border transition-all ${llmStatus.available ? 'bg-purple-500/5 border-purple-500/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-500" /> Local AI (Qwen 2.5)
              </span>
              {llmStatus.available ? (
                <span className="text-xs font-bold text-purple-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 468 MB GGUF Ready</span>
              ) : (
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Connecting...</span>
              )}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Cross-Questioning & Brutal Feedback on CPU</p>
          </div>

          {/* TTS Card */}
          <div className={`p-4 rounded-xl border transition-all ${ttsSupported ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> TTS (AI Voice)
              </span>
              {ttsSupported ? (
                <span className="text-xs font-bold text-indigo-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {voices.length} Voices</span>
              ) : (
                <span className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Unavailable</span>
              )}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Web Speech Synthesis Audio Output</p>
          </div>
        </div>

        {/* ── Main Two-Column Testing Grid ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ════ COLUMN 1: SPEECH-TO-TEXT (STT) ════ */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            
            {/* STT Header & Mode Switcher */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sttEngine === 'whistle' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-blue-500/10 border border-blue-500/20 text-blue-500'}`}>
                    {sttEngine === 'whistle' ? <Zap className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      1. Speech-to-Text Engine
                    </h2>
                    <p className="text-xs text-zinc-500">Live candidate transcription</p>
                  </div>
                </div>

                {listening && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    LISTENING LIVE
                  </div>
                )}
              </div>

              {/* Mode Toggle Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 mt-4 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/50">
                <button
                  type="button"
                  onClick={() => { if (!listening) setSttEngine('whistle') }}
                  disabled={listening}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    sttEngine === 'whistle'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Whistle Neural (Punctuation & Chunker)
                </button>

                <button
                  type="button"
                  onClick={() => { if (!listening) setSttEngine('webspeech') }}
                  disabled={listening}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    sttEngine === 'webspeech'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Chrome Web Speech
                </button>
              </div>
            </div>

            {/* Whistle Keywords Bar */}
            {sttEngine === 'whistle' && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Technical Keyword Biasing (5-Beam Auto-Boost):
                  </span>
                  <span className="text-[10px] text-zinc-500">{keywords.length} active</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {keywords.map(kw => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-700 dark:text-zinc-300"
                    >
                      {kw}
                      {!listening && (
                        <button onClick={() => removeKeyword(kw)} className="text-zinc-400 hover:text-red-500 ml-0.5">×</button>
                      )}
                    </span>
                  ))}
                </div>
                {!listening && (
                  <form onSubmit={addKeyword} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      placeholder="Add keyword (e.g. Next.js, Redux, AWS)..."
                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-500"
                    />
                    <button type="submit" className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                      Add
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Mic Meter & Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-500" /> Microphone Input Level:</span>
                <span className="font-mono">{micLevel}%</span>
              </div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-zinc-700/50">
                <motion.div
                  className={`h-full rounded-full transition-all duration-75 ${
                    micLevel > 60
                      ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500'
                      : micLevel > 15
                      ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
                      : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                  style={{ width: `${Math.max(micLevel, 3)}%` }}
                />
              </div>

              {/* Status info bar */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                <span className="flex items-center gap-1">
                  {sttEngine === 'whistle' ? (
                    <><Zap className="w-3 h-3 text-emerald-500" /> Rolling Chunker with VAD Active (No 30s limit)</>
                  ) : (
                    <><Radio className="w-3 h-3 text-blue-500" /> Web Speech streaming</>
                  )}
                </span>
                {sttProcessing && (
                  <span className="text-emerald-500 font-semibold animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Neural decoding...
                  </span>
                )}
              </div>
            </div>

            {/* Mic Action Button */}
            <div className="flex gap-3">
              <button
                onClick={toggleRecording}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                  listening
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                    : sttEngine === 'whistle'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {listening ? (
                  <><MicOff className="w-4 h-4" /> Stop Recording</>
                ) : (
                  <>
                    {sttEngine === 'whistle' ? <Zap className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    Start {sttEngine === 'whistle' ? 'Whistle Neural STT' : 'Web Speech STT'}
                  </>
                )}
              </button>
              {transcript && (
                <button
                  onClick={clearTranscript}
                  className="px-3.5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-all"
                  title="Clear transcript"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Whistle Sentence History / Interim Stream */}
            <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 min-h-[90px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                  {sttEngine === 'whistle' ? 'Punctuated Sentence Chunks (Neural Stream)' : 'Live Speech Stream (Interim)'}
                </span>
                {lastMetrics && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    TTFT: {Math.round(lastMetrics.ttft)}ms · {Math.round(lastMetrics.tps)} tokens/s
                  </span>
                )}
              </div>

              {sttEngine === 'whistle' ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {chunksHistory.length > 0 ? (
                    chunksHistory.map((c, i) => (
                      <div key={i} className="text-xs text-zinc-800 dark:text-zinc-200 flex items-start gap-2">
                        <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{c.time}:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">"{c.text}"</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-400 italic">
                      {listening ? 'Speak naturally... sentences commit on pauses or every 15s with perfect punctuation.' : 'Click "Start Whistle Neural STT" and speak.'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm italic text-zinc-700 dark:text-zinc-300 leading-relaxed font-mono">
                  {liveInterim || (listening ? 'Speak into your microphone now...' : 'Click start to speak.')}
                </p>
              )}
            </div>

            {/* Final Accumulated Transcript Box */}
            <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex-1 min-h-[160px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Complete Stitched Transcript
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500">{wordCount} words</span>
                    {transcript && (
                      <button onClick={copyTranscript} className="text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1" title="Copy text">
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {transcript || <span className="text-xs text-zinc-400 italic">Recognized and punctuated words will be auto-stitched here...</span>}
                </p>
              </div>
            </div>

            {/* ════ Interactive Qwen 2.5 Local AI Tester ════ */}
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Local AI Reaction (Qwen 2.5 0.5B)
                </span>
                <span className="text-[10px] text-zinc-500">468 MB GGUF · CPU</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Interview Question Being Answered:
                </label>
                <select
                  value={testQuestion}
                  onChange={e => setTestQuestion(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-purple-500"
                >
                  {SAMPLE_PROMPTS.map((q, i) => (
                    <option key={i} value={q}>Q{i+1}: {q.slice(0, 60)}...</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={runQwenEvaluation}
                disabled={qwenLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-all shadow-sm shadow-purple-600/20"
              >
                {qwenLoading ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Qwen 2.5 Analyzing Answer...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" /> Test Qwen 2.5 Cross-Question & Brutal Feedback</>
                )}
              </button>

              {qwenResult && (
                <div className="bg-white dark:bg-zinc-900 border border-purple-500/30 rounded-xl p-3.5 space-y-2.5 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Score: {qwenResult.score} / 10
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      ⚡ {qwenResult.latency_ms}ms CPU
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Candidate Feedback:</span>
                    <p className="text-zinc-700 dark:text-zinc-300 font-medium">{qwenResult.shortFeedback}</p>
                  </div>

                  {qwenResult.brutalFeedback && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">Brutal Critique (Missing Detail):</span>
                      <p className="text-red-700 dark:text-red-300 font-medium text-[11px] mt-0.5">{qwenResult.brutalFeedback}</p>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Sharp Cross-Question:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTtsText(qwenResult.crossQuestion)
                          speakText()
                        }}
                        className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> Speak via TTS
                      </button>
                    </div>
                    <p className="text-purple-900 dark:text-purple-200 font-semibold italic text-xs">"{qwenResult.crossQuestion}"</p>
                  </div>
                </div>
              )}
            </div>

          </div>


          {/* ════ COLUMN 2: TEXT-TO-SPEECH (TTS) ════ */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    2. Text-to-Speech (AI Voice)
                  </h2>
                  <p className="text-xs text-zinc-500">AI audio output synthesis</p>
                </div>
              </div>

              {speaking && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  SPEAKING
                </div>
              )}
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Synthesizer Voice
              </label>
              <select
                value={selectedVoice}
                onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
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
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Speed / Rate:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">{rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.1"
                  value={rate}
                  onChange={e => setRate(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Pitch:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">{pitch}</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.1"
                  value={pitch}
                  onChange={e => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Sample Prompts */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Sample Interview Prompts
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setTtsText(p); stopTTS() }}
                    className={`text-left text-xs p-2.5 rounded-lg border transition-all truncate ${
                      ttsText === p
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    Question {idx + 1}: {p.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Text */}
            <div className="flex-1 flex flex-col">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Text to Speak
              </label>
              <textarea
                value={ttsText}
                onChange={e => setTtsText(e.target.value)}
                rows={4}
                className="w-full flex-1 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-300 dark:border-zinc-700/80 rounded-xl p-3.5 text-sm text-zinc-800 dark:text-zinc-200 outline-none resize-none focus:border-indigo-500 transition-colors"
                placeholder="Type anything for the AI interviewer to speak..."
              />
            </div>

            {/* Speaking Controls */}
            <div className="flex gap-2.5">
              <button
                onClick={speakText}
                disabled={speaking && !paused}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/20"
              >
                <Play className="w-4 h-4 fill-current" />
                {speaking ? 'Restart Speaking' : 'Play / Speak Text'}
              </button>

              {speaking && (
                <button
                  onClick={pauseResumeTTS}
                  className="px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
                >
                  {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
              )}

              {speaking && (
                <button
                  onClick={stopTTS}
                  className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-500 flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" /> Stop
                </button>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  )
}
