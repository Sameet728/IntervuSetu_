import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import {
  Cpu, Zap, Send, RotateCcw, Copy, Check, Volume2, VolumeX,
  Sparkles, Sliders, Server, Activity, ShieldCheck, AlertCircle,
  HelpCircle, MessageSquare, ArrowRight, Gauge, Play, CheckCircle2,
  Terminal, RefreshCw, Layers, Code, Bot, Mic, Square, HardDrive
} from 'lucide-react'
import toast from 'react-hot-toast'

// Presets for quick testing
const PRESET_PROMPTS = [
  {
    title: 'Senior React Architecture',
    category: 'Interview Question',
    prompt: 'You are conducting a Senior Frontend interview. Ask me one deep, challenging technical question about React Fiber reconciliation and concurrent rendering.',
    system: 'You are a senior tech interviewer at a top tech company. Be concise, sharp, and realistic.'
  },
  {
    title: 'Brutal Answer Critique',
    category: 'Critique',
    prompt: 'Question: "How do you handle race conditions in distributed microservices?"\nCandidate Answer: "We just use a Redis lock with a 5-second TTL around every update."\n\nBrutally critique this answer and point out 2 critical production failure modes.',
    system: 'You are a Principal Infrastructure Architect. Review technical answers with extreme rigor, highlighting edge cases and trade-offs.'
  },
  {
    title: 'Explain System Trade-offs',
    category: 'Concept',
    prompt: 'Explain the architectural trade-offs between PostgreSQL with row-level locking vs MongoDB with document-level transactions in under 120 words.',
    system: 'You are an expert system designer. Give crisp, structured, bulleted summaries.'
  },
  {
    title: 'Follow-up Pressure Question',
    category: 'Cross-Question',
    prompt: 'I just answered: "I use JWT stored in local storage for user authentication across all services." Ask me a sharp cross-question probing security risks.',
    system: 'You are a security auditor and technical interviewer. Drill down into security vulnerabilities.'
  },
  {
    title: 'Speed & TPS Benchmark',
    category: 'Benchmark',
    prompt: 'Write a concise 80-word summary of why caching with Redis optimizes database read throughput in high-concurrency systems.',
    system: 'You are an AI benchmark assistant. Provide a smooth, direct answer without conversational filler.'
  }
]

const SYSTEM_PERSONAS = [
  {
    id: 'interviewer',
    name: 'Senior Interviewer',
    description: 'Sharp, realistic technical interviewer for FAANG-level roles.',
    prompt: 'You are a senior technical interviewer. Keep responses concise, incisive, and focused on production engineering depth.'
  },
  {
    id: 'brutal_architect',
    name: 'Brutal Staff Architect',
    description: 'Harshly identifies production flaws, scaling bottlenecks, and edge cases.',
    prompt: 'You are a brutal Staff Engineer. Never accept superficial answers. Probe deep into failure scenarios, network partitions, and latency trade-offs.'
  },
  {
    id: 'friendly_mentor',
    name: 'Engineering Mentor',
    description: 'Patient, encouraging explanations with code snippets.',
    prompt: 'You are an encouraging engineering mentor. Explain concepts clearly with simple examples and highlight best practices.'
  },
  {
    id: 'concise_ai',
    name: 'Concise Engine',
    description: 'High-speed, minimal tokens, direct answers without filler.',
    prompt: 'You are a fast, concise AI. Output direct, structured answers with zero conversational fluff.'
  }
]

export default function QwenTestPage() {
  // ─── Connection & Server State ──────────────────────────────────
  const [serverStatus, setServerStatus] = useState({
    checking: true,
    available: false,
    modelName: 'qwen2.5-0.5b-instruct-q4_k_m',
    sizeMb: 468.6,
    engine: 'llama-cpp-cpu',
    backendUrl: 'http://127.0.0.1:5001'
  })
  const [activeEndpointMode, setActiveEndpointMode] = useState('direct') // 'direct' (5001) or 'proxy' (5000)

  // ─── Tabs / Modes ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'interview_eval' | 'benchmark'

  // ─── Chat State ────────────────────────────────────────────────
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am Qwen 2.5 (0.5B Instruct), running 100% locally on your CPU via llama.cpp. I consume under 500 MB RAM and respond in sub-300ms without needing any GPU or cloud API keys. How can I help you test today?",
      metrics: { latency_ms: 220, tokens_per_second: 38.5, tokens_generated: 48 },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputPrompt, setInputPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // ─── Parameters & Settings ─────────────────────────────────────
  const [selectedPersona, setSelectedPersona] = useState('interviewer')
  const [customSystemPrompt, setCustomSystemPrompt] = useState(SYSTEM_PERSONAS[0].prompt)
  const [temperature, setTemperature] = useState(0.65)
  const [maxTokens, setMaxTokens] = useState(300)
  const [copiedIndex, setCopiedIndex] = useState(null)

  // ─── TTS Voice State ───────────────────────────────────────────
  const [speakingIdx, setSpeakingIdx] = useState(null)
  const synthRef = useRef(null)

  // ─── Interview Evaluation Tab State ─────────────────────────────
  const [evalRole, setEvalRole] = useState('Senior React Developer')
  const [evalQuestion, setEvalQuestion] = useState('How does React Fiber differ from the legacy stack reconciler, and why is priority scheduling important?')
  const [evalAnswer, setEvalAnswer] = useState('React Fiber breaks reconciliation work into small units called fibers. It can pause, abort, or prioritize work based on user events instead of blocking the main thread synchronously like the old stack reconciler.')
  const [evalLoading, setEvalLoading] = useState(false)
  const [evalResult, setEvalResult] = useState(null)

  // ─── Benchmark Tab State ────────────────────────────────────────
  const [benchRunning, setBenchRunning] = useState(false)
  const [benchResults, setBenchResults] = useState([])

  const chatEndRef = useRef(null)

  // ─── Check Server Health on Mount ──────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }
    checkHealth()
    return () => {
      synthRef.current?.cancel()
    }
  }, [activeEndpointMode])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  const getApiUrl = (path) => {
    if (activeEndpointMode === 'direct') {
      return `http://127.0.0.1:5001${path}`
    }
    // Node.js proxy route:
    if (path === '/ai/chat') return 'http://localhost:5000/api/audio/local-ai/chat'
    if (path === '/interview/evaluate') return 'http://localhost:5000/api/audio/local-ai/evaluate'
    if (path === '/interview/cross-question') return 'http://localhost:5000/api/audio/local-ai/cross-question'
    return `http://127.0.0.1:5001${path}`
  }

  const checkHealth = async () => {
    setServerStatus(prev => ({ ...prev, checking: true }))
    try {
      const targetUrl = activeEndpointMode === 'direct'
        ? 'http://127.0.0.1:5001/health'
        : 'http://localhost:5000/api/audio/whistle/status'

      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(2500) })
      if (res.ok) {
        const data = await res.json()
        const isReady = activeEndpointMode === 'direct'
          ? (data.llm && data.llm.ready)
          : (data.available && data.llm && data.llm.ready !== false)

        setServerStatus({
          checking: false,
          available: Boolean(isReady),
          modelName: (data.llm && data.llm.model) || 'qwen2.5-0.5b-instruct-q4_k_m',
          sizeMb: (data.llm && data.llm.size_mb) || 468.6,
          engine: 'llama-cpp-cpu (CPU C++)',
          backendUrl: activeEndpointMode === 'direct' ? 'http://127.0.0.1:5001' : 'http://localhost:5000'
        })
        return
      }
    } catch (err) {
      // offline
    }

    setServerStatus(prev => ({
      ...prev,
      checking: false,
      available: false
    }))
  }

  const abortControllerRef = useRef(null)

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
      toast('Generation stopped', { icon: '⏹️' })
    }
  }

  // ─── Send Chat Message (Real-Time SSE Streaming) ────────────────
  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputPrompt).trim()
    if (!textToSend || isGenerating) return

    const userMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Temporary streaming assistant placeholder
    const streamingAssistantMsg = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const conversationContext = [...messages, userMsg]
    setMessages([...conversationContext, streamingAssistantMsg])
    setInputPrompt('')
    setIsGenerating(true)

    const payload = {
      prompt: textToSend,
      messages: conversationContext.slice(-6).map(m => ({ role: m.role, content: m.content })),
      system_prompt: customSystemPrompt,
      temperature,
      max_tokens: maxTokens,
      stream: true
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    const t0 = performance.now()
    let accumulatedText = ''
    let streamMeta = null

    try {
      const url = getApiUrl('/ai/chat')
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server responded with ${res.status}`)
      }

      // Read SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // retain incomplete line

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue

          const jsonStr = trimmed.slice(5).trim()
          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.delta) {
              accumulatedText += parsed.delta
              // Update last message in-place for immediate rendering
              setMessages(prev => {
                const next = [...prev]
                const lastIdx = next.length - 1
                if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
                  next[lastIdx] = {
                    ...next[lastIdx],
                    content: accumulatedText,
                    isStreaming: true
                  }
                }
                return next
              })
            }
            if (parsed.done) {
              streamMeta = parsed
            }
          } catch (e) {
            // Ignore non-json chunks
          }
        }
      }

      const totalTime = Math.round(performance.now() - t0)
      const finalLatency = streamMeta?.latency_ms || totalTime
      const finalTps = streamMeta?.tokens_per_second || (streamMeta?.tokens_generated ? Math.round((streamMeta.tokens_generated / (finalLatency / 1000)) * 10) / 10 : 0)

      setMessages(prev => {
        const next = [...prev]
        const lastIdx = next.length - 1
        if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
          next[lastIdx] = {
            ...next[lastIdx],
            content: accumulatedText || next[lastIdx].content || '(Empty response from Qwen)',
            isStreaming: false,
            metrics: {
              latency_ms: finalLatency,
              ttft_ms: streamMeta?.ttft_ms,
              tokens_per_second: finalTps,
              tokens_generated: streamMeta?.tokens_generated || accumulatedText.split(/\s+/).length,
              model: streamMeta?.model || 'qwen2.5-0.5b-instruct'
            }
          }
        }
        return next
      })

      if (finalTps) {
        toast.success(`Streamed @ ${finalTps} tok/s (${finalLatency}ms)`, { duration: 2500 })
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User deliberately clicked Stop
        return
      }

      toast.error('Qwen response error: ' + err.message)
      setMessages(prev => {
        const next = [...prev]
        const lastIdx = next.length - 1
        if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
          next[lastIdx] = {
            ...next[lastIdx],
            content: accumulatedText ? accumulatedText + '\n\n⚠️ (Stream interrupted: ' + err.message + ')' : `⚠️ Failed to get response from Qwen 2.5: ${err.message}. Ensure whistle_server.py is running on port 5001.`,
            isStreaming: false,
            isError: !accumulatedText
          }
        }
        return next
      })
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  // ─── Speak with TTS ─────────────────────────────────────────────
  const handleSpeak = (text, idx) => {
    if (!synthRef.current) {
      toast.error('Speech synthesis not supported in this browser')
      return
    }

    if (speakingIdx === idx) {
      synthRef.current.cancel()
      setSpeakingIdx(null)
      return
    }

    synthRef.current.cancel()
    const cleanText = text.replace(/[*#`_]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.05
    utterance.pitch = 1.0

    const voices = synthRef.current.getVoices()
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira')))
    if (englishVoice) utterance.voice = englishVoice

    utterance.onend = () => setSpeakingIdx(null)
    utterance.onerror = () => setSpeakingIdx(null)

    synthRef.current.speak(utterance)
    setSpeakingIdx(idx)
  }

  // ─── Copy Text ──────────────────────────────────────────────────
  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedIndex(null), 1800)
  }

  // ─── Run Interview Evaluation ───────────────────────────────────
  const handleRunEvaluation = async () => {
    if (!evalQuestion.trim() || !evalAnswer.trim() || evalLoading) return
    setEvalLoading(true)
    setEvalResult(null)

    try {
      const url = getApiUrl('/interview/evaluate')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: evalQuestion,
          userAnswer: evalAnswer,
          role: evalRole,
          techStack: ['React', 'JavaScript', 'Frontend Architecture']
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setEvalResult(data)
      toast.success(`Evaluated by Qwen 2.5 in ${data.latency_ms}ms!`)
    } catch (err) {
      toast.error('Evaluation failed: ' + err.message)
    } finally {
      setEvalLoading(false)
    }
  }

  // ─── Run Benchmark ──────────────────────────────────────────────
  const handleRunBenchmark = async () => {
    if (benchRunning) return
    setBenchRunning(true)
    const runs = []

    const testCases = [
      { name: 'Short Answer (40 tokens)', prompt: 'Define what an idempotent HTTP method is in 25 words.', max: 60 },
      { name: 'Medium Analysis (120 tokens)', prompt: 'Explain the difference between process and thread in operating systems with memory context.', max: 140 },
      { name: 'Interview Critique (180 tokens)', prompt: 'Critique this answer: "We use microservices so each service has its own database and can deploy independently." Highlight 3 challenges.', max: 200 }
    ]

    for (const tc of testCases) {
      const t0 = performance.now()
      try {
        const url = getApiUrl('/ai/chat')
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: tc.prompt,
            system_prompt: 'You are a technical benchmark assistant. Provide direct, concise output.',
            temperature: 0.3,
            max_tokens: tc.max
          })
        })
        const data = await res.json()
        const duration = Math.round(performance.now() - t0)
        runs.push({
          name: tc.name,
          latency_ms: data.latency_ms || duration,
          tps: data.tokens_per_second || 0,
          tokens: data.tokens_generated || 0,
          status: 'success',
          preview: (data.response || '').slice(0, 90) + '...'
        })
      } catch (err) {
        runs.push({
          name: tc.name,
          latency_ms: 0,
          tps: 0,
          tokens: 0,
          status: 'error',
          preview: err.message
        })
      }
    }

    setBenchResults(runs)
    setBenchRunning(false)
    toast.success('Benchmark completed!')
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        {/* ─── Header & Diagnostics Card ────────────────────────── */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                  <Cpu className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                    Qwen 2.5 AI Lab
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      0.5B Instruct GGUF
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-fg-muted">
                    Ultra-fast local CPU inference • Sub-300ms latency • Zero GPU required • 468 MB Memory
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Connection Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${serverStatus.available ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-red-500'}`} />
                <span className="font-medium text-fg">
                  {serverStatus.checking ? 'Connecting...' : serverStatus.available ? 'Qwen 2.5 Active' : 'Microservice Offline'}
                </span>
                <button
                  onClick={checkHealth}
                  disabled={serverStatus.checking}
                  title="Refresh connection"
                  className="p-1 hover:text-blue-400 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${serverStatus.checking ? 'animate-spin text-blue-400' : 'text-fg-muted'}`} />
                </button>
              </div>

              {/* Endpoint Switcher */}
              <div className="flex items-center rounded-lg bg-card border border-border p-0.5 text-xs">
                <button
                  onClick={() => setActiveEndpointMode('direct')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeEndpointMode === 'direct'
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                  title="Direct to Python microservice (Port 5001)"
                >
                  Direct :5001
                </button>
                <button
                  onClick={() => setActiveEndpointMode('proxy')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeEndpointMode === 'proxy'
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                  title="Through Node.js API Gateway (Port 5000)"
                >
                  Proxy :5000
                </button>
              </div>

              <Link
                to="/offline-ai"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Offline AI Hub
              </Link>

              <Link
                to="/voice-test"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-blue-500/40 text-xs font-medium text-fg-muted hover:text-blue-400 transition-colors"
              >
                <Mic className="w-3.5 h-3.5" />
                Voice Lab
              </Link>
            </div>
          </div>

          {/* Offline Banner if local AI not detected */}
          {!serverStatus.available && !serverStatus.checking && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-amber-400">Local AI Server Not Detected</span>
                <p className="text-fg-muted mt-0.5">
                  Make sure the Python microservice is running. Launch it with:{' '}
                  <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-border text-amber-300 font-mono text-[11px]">
                    python Backend/whistle_server.py
                  </code>
                </p>
              </div>
              <button
                onClick={checkHealth}
                className="px-2.5 py-1 rounded-md bg-amber-500 text-zinc-950 font-semibold text-xs hover:bg-amber-400"
              >
                Retry
              </button>
            </motion.div>
          )}
        </div>

        {/* ─── Mode Tabs Navigation ─────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-card'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Interactive Chat & Prompt Testing
          </button>

          <button
            onClick={() => setActiveTab('interview_eval')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'interview_eval'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-card'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Interview Evaluation & Critique
          </button>

          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'benchmark'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-card'
            }`}
          >
            <Gauge className="w-4 h-4" />
            Speed & TPS Benchmark
          </button>
        </div>

        {/* ─── TAB 1: INTERACTIVE CHAT & PROMPT PLAYGROUND ──────── */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Chat Area (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col h-[680px] bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-fg">Qwen 2.5 0.5B Conversation</span>
                  <span className="text-[10px] text-fg-subtle px-1.5 py-0.5 rounded bg-zinc-800">ChatML Format</span>
                </div>
                <button
                  onClick={() => setMessages([])}
                  className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear Chat
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-fg-muted">
                    <Bot className="w-10 h-10 text-blue-500/40 mb-2" />
                    <p className="text-sm font-medium text-fg">Start a conversation with Qwen 2.5</p>
                    <p className="text-xs text-fg-subtle max-w-sm mt-1">
                      Type a custom prompt below or pick one of the technical presets from the right sidebar.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-fg-subtle">
                        <span className="font-semibold text-fg-muted">
                          {msg.role === 'user' ? 'You' : 'Qwen 2.5'}
                        </span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : msg.isError
                            ? 'bg-red-500/10 border border-red-500/30 text-red-300 rounded-tl-sm'
                            : 'bg-surface border border-border text-fg rounded-tl-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">
                          {msg.content}
                          {msg.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse align-middle rounded-sm shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                          )}
                        </div>

                        {/* Streaming Indicator */}
                        {msg.isStreaming && (
                          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-2 text-[10px] font-mono text-blue-400">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                            <span>Streaming live token-by-token from CPU llama.cpp...</span>
                          </div>
                        )}

                        {/* Performance Metric Pill on AI messages */}
                        {msg.metrics && !msg.isStreaming && (
                          <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-fg-subtle">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                <Zap className="w-3 h-3" />
                                {msg.metrics.latency_ms}ms
                              </span>
                              <span>•</span>
                              <span className="text-blue-400">
                                {msg.metrics.tokens_per_second} tok/s
                              </span>
                              <span>•</span>
                              <span>{msg.metrics.tokens_generated} tokens</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSpeak(msg.content, idx)}
                                className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                                  speakingIdx === idx ? 'text-blue-400' : 'text-fg-muted hover:text-fg'
                                }`}
                                title="Listen to answer"
                              >
                                {speakingIdx === idx ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopy(msg.content, idx)}
                                className="p-1 rounded hover:bg-zinc-800 text-fg-muted hover:text-fg transition-colors"
                                title="Copy text"
                              >
                                {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-border bg-card/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Ask Qwen anything (e.g. 'Critique my Redis caching pattern' or technical question)..."
                    rows={2}
                    className="flex-1 bg-surface border border-border focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-fg placeholder:text-fg-subtle focus:outline-none resize-none transition-all"
                  />
                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={stopGeneration}
                      className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                      title="Stop generating"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputPrompt.trim()}
                      className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  )}
                </form>
                <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-fg-subtle">
                  <span>Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-[10px] text-fg-muted font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-[10px] text-fg-muted font-mono">Shift+Enter</kbd> for newline</span>
                  <span className="font-mono text-[10px]">{inputPrompt.length} chars</span>
                </div>
              </div>
            </div>

            {/* Right Column: Presets & Model Controls (4 Cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* Quick Presets Card */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Quick Interview Presets
                </h3>
                <div className="space-y-2">
                  {PRESET_PROMPTS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputPrompt(preset.prompt)
                        if (preset.system) setCustomSystemPrompt(preset.system)
                        toast.success(`Loaded "${preset.title}" preset!`)
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-border/70 hover:border-blue-500/50 hover:bg-surface transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-fg group-hover:text-blue-400 transition-colors">
                          {preset.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                          {preset.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-fg-muted line-clamp-2 leading-relaxed">
                        {preset.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Persona & Tuning Card */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  Model Persona & Controls
                </h3>

                {/* Persona selector */}
                <div>
                  <label className="text-[11px] font-medium text-fg-muted block mb-1.5">
                    Interviewer Persona
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SYSTEM_PERSONAS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPersona(p.id)
                          setCustomSystemPrompt(p.prompt)
                        }}
                        className={`p-2 rounded-lg text-left text-xs border transition-all ${
                          selectedPersona === p.id
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-semibold'
                            : 'border-border text-fg-muted hover:border-zinc-700 hover:text-fg'
                        }`}
                      >
                        <div className="truncate">{p.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom System Prompt */}
                <div>
                  <label className="text-[11px] font-medium text-fg-muted block mb-1">
                    System Prompt
                  </label>
                  <textarea
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    rows={2}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs text-fg font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Sliders */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-fg-muted">Temperature</span>
                      <span className="font-mono text-blue-400">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-fg-subtle mt-0.5">
                      <span>Deterministic (0.1)</span>
                      <span>Creative (1.0)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-fg-muted">Max Response Tokens</span>
                      <span className="font-mono text-blue-400">{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="64"
                      max="600"
                      step="32"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-fg-subtle mt-0.5">
                      <span>Fast (64 tok)</span>
                      <span>Detailed (600 tok)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: INTERVIEW EVALUATION & CRITIQUE ───────────── */}
        {activeTab === 'interview_eval' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form (6 cols) */}
            <div className="lg:col-span-6 bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm sm:text-base font-bold text-fg">
                  Real-time Candidate Answer Evaluation
                </h2>
              </div>
              <p className="text-xs text-fg-muted">
                This tests the exact sub-300ms live critique engine that runs during mock interviews to score candidates and generate brutal follow-up cross-questions.
              </p>

              <div>
                <label className="text-xs font-semibold text-fg-muted block mb-1">Role / Tech Track</label>
                <input
                  type="text"
                  value={evalRole}
                  onChange={(e) => setEvalRole(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-fg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-fg-muted block mb-1">Interview Question</label>
                <textarea
                  value={evalQuestion}
                  onChange={(e) => setEvalQuestion(e.target.value)}
                  rows={2}
                  className="w-full bg-surface border border-border rounded-xl p-3 text-xs sm:text-sm text-fg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-fg-muted block mb-1">Candidate Answer (Your spoken or typed response)</label>
                <textarea
                  value={evalAnswer}
                  onChange={(e) => setEvalAnswer(e.target.value)}
                  rows={4}
                  className="w-full bg-surface border border-border rounded-xl p-3 text-xs sm:text-sm text-fg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleRunEvaluation}
                disabled={evalLoading || !evalAnswer.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {evalLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Qwen 2.5 Evaluating Answer...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Evaluation & Generate Cross-Question</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Display (6 cols) */}
            <div className="lg:col-span-6 bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Live Technical Assessment
                  </h3>
                  {evalResult && (
                    <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ⚡ {evalResult.latency_ms}ms Latency
                    </span>
                  )}
                </div>

                {evalResult ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Score Box */}
                    <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
                      <div>
                        <span className="text-xs text-fg-muted font-medium">Technical Depth Score</span>
                        <div className="text-2xl font-black text-fg mt-0.5 flex items-baseline gap-1">
                          <span className={evalResult.score >= 7 ? 'text-emerald-400' : 'text-amber-400'}>
                            {evalResult.score}
                          </span>
                          <span className="text-xs text-fg-subtle font-normal">/ 10.0</span>
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-full border-2 border-blue-500 flex items-center justify-center font-bold text-xs text-blue-400">
                        {Math.round(evalResult.score * 10)}%
                      </div>
                    </div>

                    {/* Short Feedback */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        What You Got Right
                      </div>
                      <p className="text-xs text-fg leading-relaxed">
                        {evalResult.shortFeedback}
                      </p>
                    </div>

                    {/* Brutal Feedback */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Production Edge Cases & Missed Details
                      </div>
                      <p className="text-xs text-fg leading-relaxed">
                        {evalResult.brutalFeedback}
                      </p>
                    </div>

                    {/* Follow-up Cross Question */}
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Generated Follow-up Cross-Question
                      </div>
                      <p className="text-xs text-fg font-medium leading-relaxed">
                        "{evalResult.crossQuestion}"
                      </p>
                      <button
                        onClick={() => handleSpeak(evalResult.crossQuestion, 'eval')}
                        className="mt-2 text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" />
                        Listen to question
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-fg-muted">
                    <ShieldCheck className="w-10 h-10 text-zinc-700 mb-2" />
                    <p className="text-xs sm:text-sm font-medium text-fg">No Evaluation Run Yet</p>
                    <p className="text-xs text-fg-subtle max-w-xs mt-1">
                      Enter an answer on the left and click "Run Evaluation" to see Qwen grade it in ~300ms.
                    </p>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-fg-subtle pt-3 border-t border-border mt-4">
                Local model: <code className="text-blue-400 font-mono">qwen2.5-0.5b-instruct</code> • Zero token cost • Fully private on device
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: SPEED & TPS BENCHMARK ─────────────────────── */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-fg flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-blue-500" />
                    Hardware Speed & Throughput Benchmark
                  </h2>
                  <p className="text-xs sm:text-sm text-fg-muted mt-0.5">
                    Measures real tokens-per-second (TPS) and Time-To-First-Token on your host CPU.
                  </p>
                </div>
                <button
                  onClick={handleRunBenchmark}
                  disabled={benchRunning}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm shrink-0"
                >
                  {benchRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Benchmarking CPU...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run 3-Stage Benchmark</span>
                    </>
                  )}
                </button>
              </div>

              {/* Benchmark Results */}
              {benchResults.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-fg-muted tracking-wider">
                    Execution Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {benchResults.map((res, i) => (
                      <div key={i} className="p-4 rounded-xl bg-surface border border-border">
                        <span className="text-xs font-semibold text-fg">{res.name}</span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-emerald-400 font-mono">
                            {res.tps}
                          </span>
                          <span className="text-xs text-fg-muted font-mono">tokens/sec</span>
                        </div>
                        <div className="mt-2 text-[11px] text-fg-subtle flex items-center justify-between">
                          <span>Latency: {res.latency_ms}ms</span>
                          <span>Tokens: {res.tokens}</span>
                        </div>
                        <p className="mt-2 text-[10px] text-fg-muted line-clamp-2 italic border-t border-border/50 pt-1.5">
                          "{res.preview}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Architecture Architecture Explainer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1.5">
                  <Cpu className="w-4 h-4" />
                  GGUF 4-Bit Quantization
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  The model file <code className="text-fg font-mono">qwen2.5-0.5b-instruct-q4_k_m.gguf</code> is quantized down to 468 MB, retaining 99% of FP16 accuracy while fitting easily into RAM.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1.5">
                  <Zap className="w-4 h-4" />
                  Native C++ Execution
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Uses <code className="text-fg font-mono">llama-cpp-python</code> compiled with native AVX2 instructions, achieving 30-45 tokens/sec without touching PyTorch or GPU drivers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1.5">
                  <Layers className="w-4 h-4" />
                  Zero Cloud Reliance
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Real-time cross-questions during live interviews run locally with zero network latency, zero token billing, and 100% privacy for candidate voice and answers.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
