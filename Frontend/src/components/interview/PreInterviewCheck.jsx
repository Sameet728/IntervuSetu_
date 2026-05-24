import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Video, Volume2, CheckCircle2, ChevronRight,
  AlertCircle, VideoOff, RefreshCw, WifiOff
} from 'lucide-react'

// Instructions list
const INSTRUCTIONS = [
  { icon: '🎙️', text: 'Speak clearly and at a normal pace' },
  { icon: '👁️', text: 'Stay visible and centered in frame' },
  { icon: '🔇', text: 'Find a quiet environment with no interruptions' },
  { icon: '🖥️', text: 'Interview runs in fullscreen — do not exit' },
  { icon: '🚫', text: 'Do not switch tabs or windows during the session' },
]

export default function PreInterviewCheck({ onComplete }) {
  const [micLevel, setMicLevel]     = useState(0)
  const [micReady, setMicReadyState]= useState(false)
  const [camStatus, setCamStatus]   = useState('idle')   // idle | loading | ready | denied | error
  const [speakerReady, setSpeakerReady] = useState(false)
  const [speakerTesting, setSpeakerTesting] = useState(false)

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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan/20 to-violet/20 border border-cyan/30 flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-2xl">🎙️</span>
          </motion.div>
          <h1 className="text-2xl font-display font-bold text-white mb-1">System Check</h1>
          <p className="text-slate-400 text-sm font-body">Complete all checks before your interview begins</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* ── Left: Camera Preview ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-surface aspect-video flex items-center justify-center">
              {/* Always render the video element; control visibility with CSS */}
              <video
                ref={videoCallbackRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  camStatus === 'ready' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Overlay states */}
              <AnimatePresence mode="wait">
                {camStatus === 'idle' || camStatus === 'loading' ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 text-slate-500">
                    <VideoOff className="w-8 h-8 animate-pulse" />
                    <span className="text-xs font-mono">Requesting camera...</span>
                  </motion.div>
                ) : camStatus === 'denied' ? (
                  <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 text-rose text-center px-6">
                    <WifiOff className="w-8 h-8" />
                    <p className="text-xs font-body">Camera access denied.<br />Allow it in your browser settings and reload.</p>
                    <button onClick={startMedia}
                      className="flex items-center gap-1.5 text-xs bg-rose/20 border border-rose/30 px-3 py-1.5 rounded-lg hover:bg-rose/30 transition-colors">
                      <RefreshCw className="w-3 h-3" /> Try again
                    </button>
                  </motion.div>
                ) : camStatus === 'error' ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 text-amber text-center px-6">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-xs font-body">Camera not available.<br />Check connection and try again.</p>
                    <button onClick={startMedia}
                      className="flex items-center gap-1.5 text-xs bg-amber/20 border border-amber/30 px-3 py-1.5 rounded-lg hover:bg-amber/30 transition-colors">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Connected badge */}
              {camStatus === 'ready' && (
                <div className="absolute bottom-2 left-2 bg-bg/80 backdrop-blur text-xs px-2 py-1 rounded-full text-emerald border border-emerald/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Live
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
              <p className="text-xs font-mono text-slate-500 uppercase mb-3">Interview Rules</p>
              {INSTRUCTIONS.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-body text-slate-400">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Checks ────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Camera check */}
            <CheckCard
              icon={<Video className="w-5 h-5" />}
              label="Camera"
              ready={camStatus === 'ready'}
              denied={camStatus === 'denied' || camStatus === 'error'}
              statusText={
                camStatus === 'ready' ? 'Camera online' :
                camStatus === 'denied' ? 'Permission denied' :
                camStatus === 'error' ? 'Not available' :
                'Requesting access...'
              }
            />

            {/* Mic check */}
            <CheckCard
              icon={<Mic className="w-5 h-5" />}
              label="Microphone"
              ready={micReady}
              statusText={micReady ? 'Microphone detected' : 'Make some noise to test'}
            >
              <div className="mt-3">
                <div className="h-2 w-full bg-bg rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                    animate={{ width: `${micLevel}%` }}
                    transition={{ duration: 0.08 }}
                  />
                </div>
                {!micReady && (
                  <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
                    Speak aloud — bar should move
                  </p>
                )}
              </div>
            </CheckCard>

            {/* Speaker check */}
            <CheckCard
              icon={<Volume2 className="w-5 h-5" />}
              label="Speaker / Headphones"
              ready={speakerReady}
              statusText={speakerReady ? 'Audio confirmed' : 'Click to play test sound'}
            >
              {!speakerReady && (
                <button
                  onClick={testSpeaker}
                  disabled={speakerTesting}
                  className="mt-3 flex items-center gap-2 text-xs bg-violet hover:bg-violet/80 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {speakerTesting ? (
                    <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Playing...</>
                  ) : (
                    <><Volume2 className="w-3.5 h-3.5" />Play Test Sound</>
                  )}
                </button>
              )}
            </CheckCard>

            {/* Proctoring warning */}
            <div className="p-4 rounded-xl border border-amber/30 bg-amber/5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber">Proctoring Active</p>
                <p className="text-xs text-slate-400 mt-0.5 font-body">
                  Your session is monitored. Leaving fullscreen, switching tabs, or hiding your face will be logged as violations.
                </p>
              </div>
            </div>

            {/* Overall readiness */}
            <div className="mt-auto">
              <div className="flex gap-2 mb-4">
                {[camStatus === 'ready', micReady, speakerReady].map((done, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${done ? 'bg-emerald' : 'bg-border'}`} />
                ))}
              </div>
              <button
                onClick={handleStart}
                disabled={!allReady}
                className="w-full bg-gradient-to-r from-violet to-cyan text-void font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-violet/20 disabled:opacity-40 disabled:grayscale cursor-pointer disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {allReady
                  ? <><CheckCircle2 className="w-5 h-5" /> Start Interview</>
                  : <>Complete all checks to continue <ChevronRight className="w-4 h-4" /></>
                }
              </button>
            </div>

          </div>
        </div>

      </motion.div>
    </div>
  )
}

// ── Reusable check card ───────────────────────────────────────────────
function CheckCard({ icon, label, ready, denied = false, statusText, children }) {
  return (
    <motion.div
      animate={{
        borderColor: ready ? 'rgba(52,211,153,0.4)' : denied ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)',
        backgroundColor: ready ? 'rgba(52,211,153,0.05)' : denied ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
      }}
      transition={{ duration: 0.4 }}
      className="p-4 rounded-xl border"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={ready ? 'text-emerald' : denied ? 'text-rose' : 'text-slate-400'}>
            {icon}
          </span>
          <div>
            <p className="font-semibold text-sm text-slate-200">{label}</p>
            <p className={`text-xs mt-0.5 font-mono ${ready ? 'text-emerald' : denied ? 'text-rose' : 'text-slate-500'}`}>
              {statusText}
            </p>
          </div>
        </div>
        {ready && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
            <CheckCircle2 className="w-5 h-5 text-emerald" />
          </motion.div>
        )}
      </div>
      {children}
    </motion.div>
  )
}
