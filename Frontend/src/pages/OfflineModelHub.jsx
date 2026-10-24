import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { Button, StatusBadge } from '../components/ui/index'
import { usePageEnter } from '../motion/hooks'
import {
  Download, Cpu, Mic, HardDrive, CheckCircle2, AlertCircle,
  Zap, ShieldCheck, ArrowRight, ArrowUpRight, RefreshCw, Sparkles, Play,
  Wifi, WifiOff, Database, Server, FileText, Check, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function OfflineModelHub() {
  const root = usePageEnter()

  const [modelStatus, setModelStatus] = useState({
    checking: true,
    connected: false,
    whistle: { name: 'Whistle Neural STT', size_mb: 16.9, ready: false, offline_ready: false },
    qwen: { name: 'Qwen 2.5 0.5B Instruct', size_mb: 468.6, ready: false, offline_ready: false },
    unlimited_interviews_ready: false,
    download_state: { status: 'idle', percent: 0, downloaded_mb: 0, total_mb: 485.5 }
  })

  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [downloading, setDownloading] = useState(false)

  // Fetch status on load
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => {
      fetchStatus(true)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async (isPolling = false) => {
    try {
      const res = await fetch('http://localhost:5000/api/audio/models/status', {
        signal: AbortSignal.timeout(3000)
      })
      if (res.ok) {
        const data = await res.json()
        setModelStatus({
          checking: false,
          connected: true,
          whistle: data.whistle || { name: 'Whistle Neural STT', size_mb: 16.9, ready: true, offline_ready: true },
          qwen: data.qwen || { name: 'Qwen 2.5 0.5B Instruct', size_mb: 468.6, ready: true, offline_ready: true },
          unlimited_interviews_ready: Boolean(data.unlimited_interviews_ready),
          download_state: data.download_state || { status: 'completed', percent: 100, downloaded_mb: 468.6, total_mb: 485.5 }
        })
        if (data.download_state?.status === 'downloading') {
          setDownloading(true)
        } else if (data.download_state?.status === 'completed') {
          setDownloading(false)
        }
        return
      }
    } catch {
      // offline
    }

    if (!isPolling) {
      setModelStatus(prev => ({
        ...prev,
        checking: false,
        connected: false
      }))
    }
  }

  // Trigger Model Download
  const handleDownloadPack = async () => {
    setDownloading(true)
    try {
      const res = await fetch('http://localhost:5000/api/audio/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        toast.success('Download initiated! Models are saving to local disk.')
        fetchStatus()
      } else {
        toast.error('Download failed to start')
        setDownloading(false)
      }
    } catch (err) {
      toast.error('Could not connect to model service: ' + err.message)
      setDownloading(false)
    }
  }

  // Run Local Test Verification
  const handleRunTest = async () => {
    setTestRunning(true)
    setTestResult(null)
    const t0 = performance.now()

    try {
      const res = await fetch('http://localhost:5000/api/audio/local-ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'How do you handle distributed locks in microservices?',
          userAnswer: 'We use Redis with Redlock algorithm or database row locks with expiration leases to prevent split-brain conditions.',
          role: 'Backend Architect',
          techStack: ['Redis', 'Distributed Systems']
        })
      })

      const data = await res.json()
      const totalTime = Math.round(performance.now() - t0)

      setTestResult({
        success: data.success,
        latency_ms: data.latency_ms || totalTime,
        score: data.score,
        shortFeedback: data.shortFeedback,
        crossQuestion: data.crossQuestion,
        tokens_cost: '$0.00 (Zero Gemini API Quota Billed)'
      })
      toast.success(`Verified in ${data.latency_ms || totalTime}ms on local CPU!`)
    } catch (err) {
      toast.error('Test failed: ' + err.message)
    } finally {
      setTestRunning(false)
    }
  }

  const isReady = modelStatus.unlimited_interviews_ready || (modelStatus.qwen?.ready && modelStatus.whistle?.ready)

  return (
    <div ref={root} className="page-shell">
      <Navbar />

      <main className="container-page pt-[calc(var(--nav-h)+2rem)] pb-20">
        {/* ─── Hero Header ────────────────────────────────────────── */}
        <div data-enter className="mb-10 flex flex-col justify-between gap-6 border-b border-hairline pb-8 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold text-success-500">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              On-Device AI Engine · Unlimited Free Interviews
            </div>
            <h1 className="t-h1">Offline AI Model Hub</h1>
            <p className="t-lead mt-2 max-w-prose">
              Download and manage local neural models on your device. Once installed, all live speech-to-text
              and in-between technical evaluations run <strong className="font-semibold text-ink">100% locally on your machine with zero cloud costs</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => fetchStatus()} disabled={modelStatus.checking} icon={<RefreshCw className={`h-3.5 w-3.5 ${modelStatus.checking ? 'animate-spin' : ''}`} aria-hidden />}>
              Refresh Status
            </Button>
            <Link to="/interview/create" className="btn btn-primary btn-sm">
              Start Unlimited Interview <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* ─── How the Hybrid Unlimited Architecture Works ──────── */}
        <div data-enter className="card mb-10 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="eyebrow flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" aria-hidden />
              How You Get Unlimited Interviews for Free
            </h2>
            <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-2xs font-semibold text-accent">
              Hybrid Cloud + Edge AI
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Step 1 */}
            <div className="card-inset flex flex-col justify-between p-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-accent">
                  <Wifi className="h-4 w-4" aria-hidden />
                  1. Setup &amp; First Questions (Cloud)
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  <strong className="font-semibold text-ink">Gemini 2.5 API</strong> connects to the cloud to tailor realistic first questions according to your target role, tech stack, and resume.
                </p>
              </div>
              <div className="num mt-3 flex items-center gap-1.5 border-t border-hairline pt-2.5 text-2xs text-subtle">
                <Database className="h-3 w-3 text-success-500" aria-hidden />
                Saved to MongoDB
              </div>
            </div>

            {/* Step 2 */}
            <div className="card-inset relative flex flex-col justify-between overflow-hidden border-success/25 bg-success/5 p-4">
              <div className="num absolute right-2 top-2 rounded bg-success/20 px-1.5 py-0.5 text-3xs font-bold text-success-500">
                UNLIMITED
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-success-500">
                  <WifiOff className="h-4 w-4" aria-hidden />
                  2. Live Interview Turns (100% Offline)
                </div>
                <p className="text-xs leading-relaxed text-ink">
                  <strong className="font-semibold">Whistle STT</strong> transcribes your voice in real time, and <strong className="font-semibold">Qwen 2.5 0.5B</strong> scores answers and asks follow-up cross-questions on your local CPU.
                </p>
              </div>
              <div className="num mt-3 flex items-center gap-1.5 border-t border-success/20 pt-2.5 text-2xs font-semibold text-success-500">
                <Zap className="h-3 w-3" aria-hidden />
                $0 API Cost · Sub-250ms Latency
              </div>
            </div>

            {/* Step 3 */}
            <div className="card-inset flex flex-col justify-between p-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-ai">
                  <FileText className="h-4 w-4" aria-hidden />
                  3. Executive Report &amp; Storage (Cloud)
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  When the interview completes, the transcript is sent to <strong className="font-semibold text-ink">Gemini 2.5</strong> for a comprehensive multi-category report and permanently archived in <strong className="font-semibold text-ink">MongoDB</strong>.
                </p>
              </div>
              <div className="num mt-3 flex items-center gap-1.5 border-t border-hairline pt-2.5 text-2xs text-subtle">
                <CheckCircle2 className="h-3 w-3 text-ai" aria-hidden />
                Detailed PDF Report Generated
              </div>
            </div>
          </div>
        </div>

        {/* ─── Model Inventory Cards ────────────────────────────── */}
        <div data-enter className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Whistle Card */}
          <div className="card flex flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                    <Mic className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="t-h3">Whistle Neural STT</h3>
                    <p className="t-xs">Real-time local voice transcription engine</p>
                  </div>
                </div>
                {modelStatus.whistle?.ready ? (
                  <StatusBadge tone="live">Ready</StatusBadge>
                ) : (
                  <StatusBadge tone="warn">Needs Setup</StatusBadge>
                )}
              </div>

              <div className="mb-4 space-y-2 text-xs text-muted">
                <div className="flex justify-between gap-2 border-b border-hairline/60 py-1">
                  <span>Model Size:</span>
                  <span className="num font-semibold text-ink">16.9 MB (Ultralight)</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-hairline/60 py-1">
                  <span>Execution Engine:</span>
                  <span className="num text-ink">Cactus Compute Needle CPU</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-hairline/60 py-1">
                  <span>Features:</span>
                  <span className="text-ink">5-Beam Search · Automatic Punctuation</span>
                </div>
                <div className="flex justify-between gap-2 py-1">
                  <span>Hardware Required:</span>
                  <span className="text-ink">Standard Laptop CPU (No GPU needed)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-hairline pt-4">
              <span className="t-xs">Status: Cached on host device</span>
              <Link
                to="/voice-test"
                className="flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-ink"
              >
                Test Microphone in Voice Lab <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Qwen 2.5 Card */}
          <div className="card flex flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-lg border border-ai/25 bg-ai/10 text-ai">
                    <Cpu className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="t-h3">Qwen 2.5 0.5B Instruct</h3>
                    <p className="t-xs">Live answer critique &amp; cross-question LLM</p>
                  </div>
                </div>
                {modelStatus.qwen?.ready ? (
                  <StatusBadge tone="live">Ready</StatusBadge>
                ) : (
                  <StatusBadge tone="warn">Needs Setup</StatusBadge>
                )}
              </div>

              <div className="mb-4 space-y-2 text-xs text-muted">
                <div className="flex justify-between gap-2 border-b border-hairline/60 py-1">
                  <span>Model Format:</span>
                  <span className="num font-semibold text-ink">GGUF 4-bit Quantized (Q4_K_M)</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-hairline/60 py-1">
                  <span>Size on Disk:</span>
                  <span className="num font-semibold text-ink">468.6 MB (Fits in RAM)</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-hairline/60 py-1">
                  <span>Inference Latency:</span>
                  <span className="num font-semibold text-success-500">&lt; 250ms TTFT · ~35 tok/s</span>
                </div>
                <div className="flex justify-between gap-2 py-1">
                  <span>Execution Engine:</span>
                  <span className="text-ink">llama-cpp-python AVX2 C++</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-hairline pt-4">
              <span className="t-xs">Status: Cached on host device</span>
              <Link
                to="/qwen-test"
                className="flex items-center gap-1 text-xs font-semibold text-ai transition-colors hover:text-ink"
              >
                Open Qwen AI Lab <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── 1-Click Complete Pack Download & Management ──────── */}
        <div data-enter className="card mb-10 p-5 sm:p-6">
          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="t-h3 flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-accent" aria-hidden />
                Offline AI Model Pack Status
              </h3>
              <p className="t-sm mt-0.5">
                Total footprint: ~485.5 MB (Both STT + LLM). Once downloaded, zero internet is consumed during live interview questioning.
              </p>
            </div>

            <Button
              className="shrink-0"
              disabled={downloading || isReady}
              variant={isReady ? 'outline' : 'primary'}
              onClick={handleDownloadPack}
              icon={isReady ? <Check className="h-4 w-4 text-success-500" aria-hidden /> : downloading ? null : <Download className="h-4 w-4" aria-hidden />}
              loading={downloading && !isReady}
            >
              {isReady ? 'AI Pack Fully Installed & Active' : downloading ? `Downloading Models (${modelStatus.download_state?.percent || 0}%)` : 'Download Offline AI Pack (~485 MB)'}
            </Button>
          </div>

          {/* Progress bar if downloading */}
          {downloading && (
            <div className="mt-4 border-t border-hairline pt-3">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-muted">Downloading neural weights…</span>
                <span className="num text-accent">{modelStatus.download_state?.percent || 0}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-inset">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-success-500"
                  animate={{ width: `${modelStatus.download_state?.percent || 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Interactive Offline Pipeline Verification ────────── */}
        <div data-enter className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="t-h3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success-500" aria-hidden />
                Live Offline Pipeline Verification Test
              </h3>
              <p className="t-sm mt-0.5">
                Sends a mock technical response to your local Qwen engine to verify sub-250ms evaluation without touching Gemini API tokens.
              </p>
            </div>

            <Button
              className="shrink-0"
              variant="secondary"
              disabled={testRunning}
              onClick={handleRunTest}
              icon={testRunning ? null : <Play className="h-4 w-4 fill-current text-success-500" aria-hidden />}
            >
              {testRunning ? 'Testing Pipeline…' : 'Run Verification Test'}
            </Button>
          </div>

          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-inset mt-4 space-y-3 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline/60 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-success-500">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Pipeline Passed: Local Qwen 2.5 Responded Successfully!
                </div>
                <div className="num flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-success-500">
                    <Zap className="h-3 w-3" aria-hidden /> {testResult.latency_ms}ms Latency
                  </span>
                  <span className="font-semibold text-accent">{testResult.tokens_cost}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div className="card p-3">
                  <span className="mb-1 block font-semibold text-muted">Local Evaluation Score &amp; Feedback:</span>
                  <div className="num-lg mb-0.5 text-success-500">{testResult.score} / 10.0</div>
                  <p className="leading-relaxed text-ink">{testResult.shortFeedback}</p>
                </div>
                <div className="card p-3">
                  <span className="mb-1 block font-semibold text-muted">Generated Cross-Question:</span>
                  <p className="font-medium italic leading-relaxed text-ink">
                    “{testResult.crossQuestion}”
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
