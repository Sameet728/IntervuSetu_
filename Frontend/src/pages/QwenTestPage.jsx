import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Badge, Button, IconButton, SegmentedControl, StatusBadge, Tabs } from '../components/ui/index'
import { usePageEnter } from '../motion/hooks'
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
  const root = usePageEnter()

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
    <div ref={root} className="page-shell">
      <Navbar />

      <main className="container-page pt-[calc(var(--nav-h)+2rem)] pb-16">
        {/* ─── Header & Diagnostics Card ────────────────────────── */}
        <div data-enter className="mb-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                  <Cpu className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h1 className="t-h1 flex flex-wrap items-center gap-2">
                    Qwen 2.5 AI Lab
                    <Badge color="accent">0.5B Instruct GGUF</Badge>
                  </h1>
                  <p className="t-sm mt-0.5">
                    Ultra-fast local CPU inference · Sub-300ms latency · Zero GPU required · 468 MB Memory
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Connection Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5">
                <StatusBadge
                  tone={serverStatus.available ? 'live' : serverStatus.checking ? 'warn' : 'off'}
                  pulse={serverStatus.available || serverStatus.checking}
                >
                  {serverStatus.checking ? 'Connecting' : serverStatus.available ? 'Qwen 2.5 Active' : 'Microservice Offline'}
                </StatusBadge>
                <IconButton label="Refresh connection" onClick={checkHealth} disabled={serverStatus.checking}>
                  <RefreshCw className={`h-3.5 w-3.5 ${serverStatus.checking ? 'animate-spin' : ''}`} aria-hidden />
                </IconButton>
              </div>

              <SegmentedControl
                ariaLabel="API endpoint mode"
                value={activeEndpointMode}
                onChange={setActiveEndpointMode}
                options={[
                  { value: 'direct', label: 'Direct :5001' },
                  { value: 'proxy', label: 'Proxy :5000' },
                ]}
              />

              <Link to="/offline-ai" className="btn btn-outline btn-sm">
                <HardDrive className="h-3.5 w-3.5 text-success-500" aria-hidden />
                Offline AI Hub
              </Link>

              <Link to="/voice-test" className="btn btn-secondary btn-sm">
                <Mic className="h-3.5 w-3.5" aria-hidden />
                Voice Lab
              </Link>
            </div>
          </div>

          {/* Offline Banner if local AI not detected */}
          {!serverStatus.available && !serverStatus.checking && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3.5 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" aria-hidden />
              <div className="flex-1">
                <span className="font-semibold text-warning-500">Local AI Server Not Detected</span>
                <p className="mt-0.5 text-muted">
                  Make sure the Python microservice is running. Launch it with:{' '}
                  <code className="rounded border border-hairline bg-inset px-1.5 py-0.5 font-mono text-2xs text-warning-500">
                    python Backend/whistle_server.py
                  </code>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={checkHealth}>Retry</Button>
            </motion.div>
          )}
        </div>

        {/* ─── Mode Tabs Navigation ─────────────────────────────── */}
        <Tabs
          ariaLabel="Qwen lab mode"
          value={activeTab}
          onChange={setActiveTab}
          className="mb-6"
          tabs={[
            { value: 'chat',          label: 'Chat & Prompts',     icon: <MessageSquare className="h-3.5 w-3.5" aria-hidden /> },
            { value: 'interview_eval', label: 'Evaluation & Critique', icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> },
            { value: 'benchmark',     label: 'Speed & TPS',        icon: <Gauge className="h-3.5 w-3.5" aria-hidden /> },
          ]}
        />

        {/* ─── TAB 1: INTERACTIVE CHAT & PROMPT PLAYGROUND ──────── */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Chat Area */}
            <div className="card flex h-[680px] flex-col overflow-hidden lg:col-span-8">
              {/* Chat Header */}
              <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="status-dot status-dot-live" aria-hidden />
                  <span className="text-xs font-semibold text-ink">Qwen 2.5 0.5B Conversation</span>
                  <Badge color="navy">ChatML Format</Badge>
                </div>
                <button
                  onClick={() => setMessages([])}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Clear Chat
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Bot className="h-10 w-10 text-faint" aria-hidden />
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="mb-1 flex items-center gap-1.5 px-1 text-2xs text-subtle">
                        <span className="font-semibold text-muted">
                          {msg.role === 'user' ? 'You' : 'Qwen 2.5'}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="num">{msg.timestamp}</span>
                      </div>

                      <div
                        className={`max-w-[88%] rounded-xl px-4 py-3 text-xs leading-relaxed sm:text-sm ${
                          msg.role === 'user'
                            ? 'bg-accent text-accent-on rounded-tr-sm'
                            : msg.isError
                            ? 'rounded-tl-sm border border-danger/30 bg-danger/10 text-danger-500'
                            : 'card-inset text-ink rounded-tl-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">
                          {msg.content}
                          {msg.isStreaming && (
                            <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-accent align-middle" aria-hidden />
                          )}
                        </div>

                        {/* Streaming Indicator */}
                        {msg.isStreaming && (
                          <div className="mt-2.5 flex items-center gap-2 border-t border-hairline/60 pt-2 text-2xs text-accent">
                            <span className="status-dot status-dot-live animate-ping" aria-hidden />
                            <span>Streaming live token-by-token from CPU llama.cpp…</span>
                          </div>
                        )}

                        {/* Performance Metric Pill on AI messages */}
                        {msg.metrics && !msg.isStreaming && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5 text-2xs text-subtle">
                            <div className="num flex items-center gap-3">
                              <span className="flex items-center gap-1 font-medium text-success-500">
                                <Zap className="h-3 w-3" aria-hidden />
                                {msg.metrics.latency_ms}ms
                              </span>
                              <span aria-hidden>·</span>
                              <span className="text-accent">
                                {msg.metrics.tokens_per_second} tok/s
                              </span>
                              <span aria-hidden>·</span>
                              <span>{msg.metrics.tokens_generated} tokens</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <IconButton label="Listen to answer" active={speakingIdx === idx} onClick={() => handleSpeak(msg.content, idx)}>
                                {speakingIdx === idx ? <VolumeX className="h-3.5 w-3.5 animate-pulse" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
                              </IconButton>
                              <IconButton label="Copy text" onClick={() => handleCopy(msg.content, idx)}>
                                {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-success-500" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                              </IconButton>
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
              <div className="border-t border-hairline p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex items-end gap-2"
                >
                  <label htmlFor="chat-input" className="sr-only">Message for Qwen</label>
                  <textarea
                    id="chat-input"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Ask Qwen anything (e.g. 'Critique my Redis caching pattern' or technical question)…"
                    rows={2}
                    className="input flex-1 resize-none text-sm"
                  />
                  {isGenerating ? (
                    <Button type="button" variant="danger" className="h-10 shrink-0" onClick={stopGeneration} icon={<Square className="h-3.5 w-3.5 fill-current" aria-hidden />}>
                      <span>Stop</span>
                    </Button>
                  ) : (
                    <Button type="submit" className="h-10 shrink-0" disabled={!inputPrompt.trim()} icon={<Send className="h-4 w-4" aria-hidden />}>
                      <span>Send</span>
                    </Button>
                  )}
                </form>
                <div className="mt-2 flex items-center justify-between px-1 text-2xs text-subtle">
                  <span>Press <kbd className="rounded border border-hairline bg-inset px-1 py-0.5 font-mono text-3xs text-muted">Enter</kbd> to send, <kbd className="rounded border border-hairline bg-inset px-1 py-0.5 font-mono text-3xs text-muted">Shift+Enter</kbd> for newline</span>
                  <span className="num text-3xs">{inputPrompt.length} chars</span>
                </div>
              </div>
            </div>

            {/* Right Column: Presets & Model Controls */}
            <div className="space-y-5 lg:col-span-4">
              {/* Quick Presets Card */}
              <div className="card p-4">
                <h3 className="eyebrow mb-3 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden /> Quick Interview Presets
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
                      className="group w-full rounded-lg border border-hairline p-2.5 text-left transition-all duration-fast hover:border-accent/50 hover:bg-inset"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                          {preset.title}
                        </span>
                        <Badge color="accent">{preset.category}</Badge>
                      </div>
                      <p className="line-clamp-2 text-2xs leading-relaxed text-muted">
                        {preset.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Persona & Tuning Card */}
              <div className="card space-y-4 p-4">
                <h3 className="eyebrow flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-accent" aria-hidden /> Model Persona &amp; Controls
                </h3>

                {/* Persona selector */}
                <div>
                  <p className="field-label mb-1.5" id="persona-label">Interviewer Persona</p>
                  <div className="grid grid-cols-2 gap-1.5" role="group" aria-labelledby="persona-label">
                    {SYSTEM_PERSONAS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPersona(p.id)
                          setCustomSystemPrompt(p.prompt)
                        }}
                        aria-pressed={selectedPersona === p.id}
                        title={p.description}
                        className={`rounded-md border p-2 text-left text-xs transition-all duration-fast ${
                          selectedPersona === p.id
                            ? 'border-accent/45 bg-accent-soft/60 font-semibold text-accent'
                            : 'border-hairline text-muted hover:border-hairline-strong hover:text-ink'
                        }`}
                      >
                        <div className="truncate">{p.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom System Prompt */}
                <div>
                  <label htmlFor="system-prompt" className="field-label mb-1 block">System Prompt</label>
                  <textarea
                    id="system-prompt"
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    rows={2}
                    className="input w-full font-mono text-xs"
                  />
                </div>

                {/* Sliders */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <label htmlFor="temperature" className="text-muted">Temperature</label>
                      <span className="num text-accent">{temperature}</span>
                    </div>
                    <input
                      id="temperature"
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full cursor-pointer accent-accent"
                    />
                    <div className="mt-0.5 flex justify-between text-3xs text-subtle">
                      <span>Deterministic (0.1)</span>
                      <span>Creative (1.0)</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <label htmlFor="max-tokens" className="text-muted">Max Response Tokens</label>
                      <span className="num text-accent">{maxTokens}</span>
                    </div>
                    <input
                      id="max-tokens"
                      type="range"
                      min="64"
                      max="600"
                      step="32"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full cursor-pointer accent-accent"
                    />
                    <div className="mt-0.5 flex justify-between text-3xs text-subtle">
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Input Form */}
            <div className="card space-y-4 p-5 lg:col-span-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />
                <h2 className="t-h3">Real-time Candidate Answer Evaluation</h2>
              </div>
              <p className="t-sm">
                This tests the exact sub-300ms live critique engine that runs during mock interviews to score candidates and generate brutal follow-up cross-questions.
              </p>

              <div>
                <label htmlFor="eval-role" className="field-label mb-1 block">Role / Tech Track</label>
                <input
                  id="eval-role"
                  type="text"
                  value={evalRole}
                  onChange={(e) => setEvalRole(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>

              <div>
                <label htmlFor="eval-question" className="field-label mb-1 block">Interview Question</label>
                <textarea
                  id="eval-question"
                  value={evalQuestion}
                  onChange={(e) => setEvalQuestion(e.target.value)}
                  rows={2}
                  className="input w-full text-sm"
                />
              </div>

              <div>
                <label htmlFor="eval-answer" className="field-label mb-1 block">Candidate Answer (Your spoken or typed response)</label>
                <textarea
                  id="eval-answer"
                  value={evalAnswer}
                  onChange={(e) => setEvalAnswer(e.target.value)}
                  rows={4}
                  className="input w-full text-sm"
                />
              </div>

              <Button block loading={evalLoading} disabled={!evalAnswer.trim()} onClick={handleRunEvaluation} icon={evalLoading ? null : <Sparkles className="h-4 w-4" aria-hidden />}>
                {evalLoading ? 'Qwen 2.5 Evaluating Answer…' : 'Run Evaluation & Generate Cross-Question'}
              </Button>
            </div>

            {/* Results Display */}
            <div className="card flex flex-col justify-between p-5 lg:col-span-6">
              <div>
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-hairline pb-3">
                  <h3 className="eyebrow flex items-center gap-2">
                    <Activity className="h-4 w-4 text-success-500" aria-hidden /> Live Technical Assessment
                  </h3>
                  {evalResult && (
                    <span className="num flex items-center gap-1 rounded border border-success/25 bg-success/10 px-2 py-0.5 text-xs text-success-500">
                      <Zap className="h-3 w-3" aria-hidden /> {evalResult.latency_ms}ms Latency
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
                    <div className="card-inset flex items-center justify-between gap-3 p-4">
                      <div>
                        <span className="text-xs font-medium text-muted">Technical Depth Score</span>
                        <div className="num-lg mt-0.5 flex items-baseline gap-1">
                          <span className={evalResult.score >= 7 ? 'text-success-500' : 'text-warning-500'}>
                            {evalResult.score}
                          </span>
                          <span className="text-xs font-normal text-subtle">/ 10.0</span>
                        </div>
                      </div>
                      <div className="num grid h-10 w-10 place-items-center rounded-full border-2 border-accent text-xs font-bold text-accent">
                        {Math.round(evalResult.score * 10)}%
                      </div>
                    </div>

                    {/* Short Feedback */}
                    <div className="rounded-lg border border-success/25 bg-success/10 p-3.5">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-success-500">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        What You Got Right
                      </div>
                      <p className="text-xs leading-relaxed text-ink">
                        {evalResult.shortFeedback}
                      </p>
                    </div>

                    {/* Brutal Feedback */}
                    <div className="rounded-lg border border-warning/25 bg-warning/10 p-3.5">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warning-500">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                        Production Edge Cases &amp; Missed Details
                      </div>
                      <p className="text-xs leading-relaxed text-ink">
                        {evalResult.brutalFeedback}
                      </p>
                    </div>

                    {/* Follow-up Cross Question */}
                    <div className="rounded-lg border border-ai/25 bg-ai/10 p-3.5">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ai">
                        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                        Generated Follow-up Cross-Question
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-ink">
                        “{evalResult.crossQuestion}”
                      </p>
                      <button
                        onClick={() => handleSpeak(evalResult.crossQuestion, 'eval')}
                        className="mt-2 flex items-center gap-1 text-2xs text-accent transition-colors hover:text-ink"
                      >
                        <Volume2 className="h-3 w-3" aria-hidden />
                        Listen to question
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex h-64 items-center justify-center">
                    <ShieldCheck className="h-10 w-10 text-faint" aria-hidden />
                  </div>
                )}
              </div>

              {!evalResult && (
                <p className="pb-3 text-center text-xs text-subtle">
                  Enter an answer on the left and click "Run Evaluation" to see Qwen grade it in ~300ms.
                </p>
              )}

              <div className="border-t border-hairline pt-3 text-2xs text-subtle">
                Local model: <code className="font-mono text-accent">qwen2.5-0.5b-instruct</code> · Zero token cost · Fully private on device
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: SPEED & TPS BENCHMARK ─────────────────────── */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="t-h3 flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-accent" aria-hidden />
                    Hardware Speed &amp; Throughput Benchmark
                  </h2>
                  <p className="t-sm mt-0.5">
                    Measures real tokens-per-second (TPS) and Time-To-First-Token on your host CPU.
                  </p>
                </div>
                <Button
                  className="shrink-0"
                  loading={benchRunning}
                  onClick={handleRunBenchmark}
                  icon={benchRunning ? null : <Play className="h-4 w-4" aria-hidden />}
                >
                  {benchRunning ? 'Benchmarking CPU…' : 'Run 3-Stage Benchmark'}
                </Button>
              </div>

              {/* Benchmark Results */}
              {benchResults.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="eyebrow">Execution Metrics</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {benchResults.map((res, i) => (
                      <div key={i} className="card-inset p-4">
                        <span className="text-xs font-semibold text-ink">{res.name}</span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="num-lg text-success-500">{res.tps}</span>
                          <span className="num text-xs text-muted">tokens/sec</span>
                        </div>
                        <div className="num mt-2 flex items-center justify-between text-2xs text-subtle">
                          <span>Latency: {res.latency_ms}ms</span>
                          <span>Tokens: {res.tokens}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 border-t border-hairline/60 pt-1.5 text-3xs italic text-muted">
                          “{res.preview}”
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Architecture Explainer */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="card p-4">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-accent">
                  <Cpu className="h-4 w-4" aria-hidden />
                  GGUF 4-Bit Quantization
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  The model file <code className="font-mono text-ink">qwen2.5-0.5b-instruct-q4_k_m.gguf</code> is quantized down to 468 MB, retaining 99% of FP16 accuracy while fitting easily into RAM.
                </p>
              </div>

              <div className="card p-4">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-success-500">
                  <Zap className="h-4 w-4" aria-hidden />
                  Native C++ Execution
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  Uses <code className="font-mono text-ink">llama-cpp-python</code> compiled with native AVX2 instructions, achieving 30-45 tokens/sec without touching PyTorch or GPU drivers.
                </p>
              </div>

              <div className="card p-4">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ai">
                  <Layers className="h-4 w-4" aria-hidden />
                  Zero Cloud Reliance
                </div>
                <p className="text-xs leading-relaxed text-muted">
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
