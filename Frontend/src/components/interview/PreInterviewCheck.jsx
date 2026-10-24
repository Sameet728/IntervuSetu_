import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Video, Volume2, CheckCircle2, ArrowUpRight,
  AlertCircle, VideoOff, RefreshCw, Eye, MonitorOff, Cpu, Headphones
} from 'lucide-react'
import { Badge, Button, StatusBadge } from '../ui/index'
import { prefersReducedMotion } from '../../motion/setup'

const INSTRUCTIONS = [
  { icon: Mic,         text: 'Speak clearly and at a normal pace' },
  { icon: Eye,         text: 'Stay visible and centred in frame' },
  { icon: Volume2,     text: 'Use headphones in a quiet room' },
  { icon: Video,       text: 'The interview runs in fullscreen — stay in it' },
  { icon: MonitorOff,  text: 'Do not switch tabs or windows during the session' },
]

export default function PreInterviewCheck({ onComplete }) {
  const [micLevel, setMicLevel]     = useState(0)
  const [micReady, setMicReadyState]= useState(false)
  const [camStatus, setCamStatus]   = useState('idle')   // idle | loading | ready | denied | error
  const [speakerReady, setSpeakerReady] = useState(false)
  const [speakerTesting, setSpeakerTesting] = useState(false)
  const [offlineEngineReady, setOfflineEngineReady] = useState(false)

  useEffect(() => {
    fetch('http://localhost:5000/api/audio/models/status')
      .then(r => r.json())
      .then(d => {
        if (d && (d.unlimited_interviews_ready || (d.whistle?.ready && d.qwen?.ready))) {
          setOfflineEngineReady(true)
        }
      })
      .catch(() => {})
  }, [])

  const videoRef      = useRef(null)
  const streamRef     = useRef(null)
  const audioCtxRef   = useRef(null)
  const analyserRef   = useRef(null)
  const rafRef        = useRef(null)
  const micReadyRef   = useRef(false)        // avoid stale closure in rAF
  const willStart     = useRef(false)

  const setMicReady = (v) => { micReadyRef.current = v; setMicReadyState(v) }

  // ── Attach video stream to element once it mounts ─────────────────
  const attachToVideo = useCallback((el) => {
    if (!el || !streamRef.current) return
    if (el.srcObject === streamRef.current) return   // already attached
    el.srcObject = streamRef.current
    el.onloadedmetadata = () => {
      el.play().catch(() => {})
      setCamStatus('ready')
    }
  }, [])

  // Store latest videoRef
  const videoCallbackRef = useCallback((el) => {
    videoRef.current = el
    if (el && streamRef.current) attachToVideo(el)
  }, [attachToVideo])

  // ── Start media devices ───────────────────────────────────────────
  const startMedia = useCallback(async () => {
    setCamStatus('loading')

    try {
      // Request both video + audio in one call (avoids double permission prompts)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream

      // Attach to video element if it's already mounted
      if (videoRef.current) attachToVideo(videoRef.current)
      else setCamStatus('ready') // will attach via callback ref

      // ── Mic analyser ──────────────────────────────────────────────
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
        const pct = Math.min(100, rms * 1800)
        setMicLevel(pct)
        if (pct > 12 && !micReadyRef.current) setMicReady(true)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()

    } catch (err) {
      console.error('[Media]', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCamStatus('denied')
      } else {
        setCamStatus('error')
      }
    }
  }, [attachToVideo])

  useEffect(() => {
    startMedia()
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (!willStart.current) {
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
      audioCtxRef.current?.close()
      analyserRef.current = null
    }
  }, [])  // eslint-disable-line

  // ── Speaker test ─────────────────────────────────────────────────
  const testSpeaker = () => {
    if (speakerTesting) return
    setSpeakerTesting(true)
    // Use the Web Audio API to generate a beep — no external URL needed
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
      osc.onended = () => { ctx.close(); setSpeakerReady(true); setSpeakerTesting(false) }
    } catch {
      setSpeakerReady(true)
      setSpeakerTesting(false)
    }
  }

  // ── Start interview ───────────────────────────────────────────────
  const handleStart = () => {
    willStart.current = true
    // Hand off the already-open stream to the proctoring hook via window global
    // so startCamera() can re-attach without re-requesting permission
    window.__interviewStream = streamRef.current
    // Stop the audio-only analysis but KEEP video tracks alive
    cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
    onComplete()
  }

  const allReady = micReady && camStatus === 'ready' && speakerReady

  return (
    <div className="min-h-dvh bg-canvas px-4 py-8 text-ink sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion() ? 0 : 0.4, ease: 'easeOut' }}
        className="mx-auto w-full max-w-4xl"
      >
        {/* Header */}
        <header className="mb-7 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-ai/25 bg-ai-soft text-ai" aria-hidden>
            <Mic className="h-5 w-5" />
          </span>
          <p className="eyebrow mb-1">Before you begin</p>
          <h1 className="t-h1">System check</h1>
          <p className="t-body mx-auto mt-2 max-w-sm">
            Camera, microphone and audio are verified once — then the room opens.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {/* ── Left: camera preview + rules ───────────────────────── */}
          <div className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-hairline bg-canvas-inset">
              <video
                ref={videoCallbackRef}
                autoPlay
                playsInline
                muted
                aria-label="Camera preview"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-slow ${
                  camStatus === 'ready' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <AnimatePresence mode="wait">
                {camStatus === 'idle' || camStatus === 'loading' ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-content-center justify-items-center gap-2.5 text-subtle">
                    <VideoOff className="h-7 w-7 animate-pulse" aria-hidden />
                    <p className="text-xs">Requesting camera access…</p>
                  </motion.div>
                ) : camStatus === 'denied' ? (
                  <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-content-center justify-items-center gap-2.5 px-6 text-center text-danger-500">
                    <AlertCircle className="h-7 w-7" aria-hidden />
                    <p className="text-xs text-muted">
                      Camera access was blocked. Allow it in your browser settings, then retry.
                    </p>
                    <Button variant="secondary" size="sm" onClick={startMedia} icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}>
                      Try again
                    </Button>
                  </motion.div>
                ) : camStatus === 'error' ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-content-center justify-items-center gap-2.5 px-6 text-center text-warning-500">
                    <VideoOff className="h-7 w-7" aria-hidden />
                    <p className="text-xs text-muted">No camera was found. Plug one in or pick another device.</p>
                    <Button variant="secondary" size="sm" onClick={startMedia} icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}>
                      Retry
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {camStatus === 'ready' && (
                <span className="absolute bottom-2 left-2">
                  <StatusBadge tone="live" pulse>Live</StatusBadge>
                </span>
              )}
            </div>

            <section className="card p-4" aria-label="Interview rules">
              <h2 className="eyebrow mb-3">Ground rules</h2>
              <ul className="space-y-2">
                {INSTRUCTIONS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ── Right: device checks ───────────────────────────────── */}
          <div className="flex flex-col gap-3.5">
            <CheckCard
              icon={<Video className="h-5 w-5" />}
              label="Camera"
              ready={camStatus === 'ready'}
              denied={camStatus === 'denied' || camStatus === 'error'}
              statusText={
                camStatus === 'ready' ? 'Camera online' :
                camStatus === 'denied' ? 'Permission denied' :
                camStatus === 'error' ? 'Not available' :
                'Requesting access…'
              }
            />

            <CheckCard
              icon={<Mic className="h-5 w-5" />}
              label="Microphone"
              ready={micReady}
              statusText={micReady ? 'Picking you up' : 'Make some noise to test'}
            >
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline" role="meter" aria-valuenow={Math.round(micLevel)} aria-valuemin={0} aria-valuemax={100} aria-label="Microphone level">
                  <motion.div
                    className={`h-full rounded-full ${micReady ? 'bg-success-500' : 'bg-accent'}`}
                    animate={{ width: `${micLevel}%` }}
                    transition={{ duration: 0.08 }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-2xs text-subtle">Speak — the bar should move</p>
                  <a href="/voice-test" target="_blank" rel="noreferrer" className="text-2xs font-medium text-accent hover:underline">
                    Voice lab
                  </a>
                </div>
              </div>
            </CheckCard>

            <CheckCard
              icon={<Headphones className="h-5 w-5" />}
              label="Speaker"
              ready={speakerReady}
              statusText={speakerReady ? 'Audio confirmed' : 'Play the test tone to confirm'}
            >
              {!speakerReady && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={testSpeaker}
                  loading={speakerTesting}
                  icon={speakerTesting ? null : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
                >
                  {speakerTesting ? 'Playing…' : 'Play test tone'}
                </Button>
              )}
            </CheckCard>

            <CheckCard
              icon={<Cpu className="h-5 w-5" />}
              label="Answer engine"
              ready={offlineEngineReady}
              statusText={
                offlineEngineReady
                  ? 'On-device Whisper STT + Qwen 2.5 ready'
                  : 'Cloud engine — offline pack optional'
              }
            >
              {offlineEngineReady ? (
                <Badge color="success" className="mt-2.5">Unlimited local mode</Badge>
              ) : (
                <a href="/offline-ai" target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs mt-2.5">
                  Download offline pack <ArrowUpRight className="h-3 w-3" aria-hidden />
                </a>
              )}
            </CheckCard>

            <div className="flex items-start gap-3 rounded-lg border border-warning-500/30 bg-warning-bg p-3.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-warning-500">Proctoring is on</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Leaving fullscreen, switching tabs, or hiding your face is logged as a violation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer: progress + start ─────────────────────────────── */}
        <div className="mt-6">
          <div className="mb-3 flex gap-1.5" role="group" aria-label="Checklist progress">
            {[camStatus === 'ready', micReady, speakerReady].map((done, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-slow ${done ? 'bg-success-500' : 'bg-hairline-strong'}`} />
            ))}
          </div>
          <p className="sr-only" role="status">
            {[camStatus === 'ready', micReady, speakerReady].filter(Boolean).length} of 3 checks complete
          </p>

          <Button
            size="lg"
            block
            disabled={!allReady}
            onClick={handleStart}
            icon={allReady ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
          >
            {allReady ? 'Start interview' : 'Finish the checks above to continue'}
          </Button>

          <button
            type="button"
            onClick={handleStart}
            className="mx-auto mt-2 block text-2xs font-medium text-subtle underline-offset-2 hover:text-ink hover:underline"
          >
            Skip checks and start now
          </button>
        </div>

      </motion.div>
    </div>
  )
}

// ── One device check row ──────────────────────────────────────────────
function CheckCard({ icon, label, ready, denied = false, statusText, children }) {
  const Icon = ready ? CheckCircle2 : denied ? AlertCircle : null
  return (
    <motion.section
      animate={{
        borderColor: ready ? 'rgb(var(--success) / 0.35)' : denied ? 'rgb(var(--danger) / 0.35)' : 'rgb(var(--hairline))',
        backgroundColor: ready ? 'rgb(var(--success-soft))' : denied ? 'rgb(var(--danger-soft))' : 'rgb(var(--surface))',
      }}
      transition={{ duration: prefersReducedMotion() ? 0 : 0.35 }}
      className="rounded-lg border p-4"
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={ready ? 'text-success-500' : denied ? 'text-danger-500' : 'text-faint'} aria-hidden>
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{label}</p>
            <p className={`mt-0.5 text-xs ${ready ? 'text-success-500' : denied ? 'text-danger-500' : 'text-subtle'}`}>
              {statusText}
            </p>
          </div>
        </div>
        {Icon && (
          <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} aria-hidden>
            <Icon className={`h-4 w-4 ${ready ? 'text-success-500' : 'text-danger-500'}`} />
          </motion.span>
        )}
      </div>
      {children}
    </motion.section>
  )
}
