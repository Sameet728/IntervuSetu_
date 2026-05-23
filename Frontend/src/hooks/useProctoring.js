import { useEffect, useRef, useCallback, useState } from 'react'

export function useProctoring({ onViolation, enabled = true }) {
  const videoRef         = useRef(null)
  const streamRef        = useRef(null)
  const faceIntervalRef  = useRef(null)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [faceStatus,   setFaceStatus]   = useState('ok') // ok | no_face | multiple
  const [cameraError,  setCameraError]  = useState(null)

  // ── Webcam setup ──────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      console.log('🎥 Starting camera for interview...')

      let stream = window.__interviewStream || null

      // Validate we still have live tracks from the pre-check screen
      if (!stream || stream.getVideoTracks().every(t => t.readyState === 'ended')) {
        console.log('🔄 Pre-check stream gone, requesting fresh stream...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        })
      } else {
        console.log('♻️ Reusing pre-check stream')
        // Make sure audio tracks from the pre-check stream don't interfere
        stream.getAudioTracks().forEach(t => t.stop())
        window.__interviewStream = null
      }

      streamRef.current = stream

      // Attach to video element — retry until it's in the DOM
      let retries = 0
      const attach = () => {
        const el = videoRef.current
        if (!el) {
          if (++retries > 60) {
            console.error('❌ Video element never mounted')
            setCameraError('Video element not available')
            stream.getTracks().forEach(t => t.stop())
            return
          }
          setTimeout(attach, 100)
          return
        }

        console.log('📹 Attaching stream to video element')
        el.srcObject = stream
        el.onloadedmetadata = () => {
          el.play()
            .then(() => { console.log('✅ Camera live'); setCameraReady(true); setCameraError(null) })
            .catch(err => { console.error('❌ Play err', err); setCameraError(err.message) })
        }
      }
      attach()

    } catch (e) {
      console.error('❌ Camera error:', e)
      setCameraReady(false)
      setCameraError(e.message)
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        alert(`Camera permission denied.\n\nAllow camera access in your browser settings and refresh.`)
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    clearInterval(faceIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
    console.log('🛑 Camera stopped')
  }, [])

  // ── Lightweight face detection via ImageData brightness heuristic ─
  // In production replace with face-api.js or MediaPipe
  const detectFace = useCallback(() => {
    if (!videoRef.current || !cameraReady) return
    const video = videoRef.current
    if (video.readyState < 2) return

    const canvas  = document.createElement('canvas')
    canvas.width  = 80
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, 80, 60)
    const data = ctx.getImageData(0, 0, 80, 60).data

    // Simple skin-tone pixel count heuristic
    let skinPixels = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2]
      // Rough skin tone range
      if (r > 95 && g > 40 && b > 20 && r > g && r > b &&
          Math.abs(r - g) > 15 && r - b > 15) skinPixels++
    }
    const skinRatio = skinPixels / (80 * 60)

    if (skinRatio < 0.04) {
      setFaceStatus('no_face')
      onViolation?.('no_face', `Skin ratio: ${skinRatio.toFixed(3)}`)
    } else if (skinRatio > 0.55) {
      setFaceStatus('multiple')
      onViolation?.('multiple_faces', `Skin ratio: ${skinRatio.toFixed(3)}`)
    } else {
      setFaceStatus('ok')
    }
  }, [cameraReady, onViolation])

  // ── Fullscreen management ────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement
    el.requestFullscreen?.() || el.webkitRequestFullscreen?.()
  }, [])

  // ── Event listeners for violations ──────────────────────────────
  useEffect(() => {
    if (!enabled) return

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        onViolation?.('fullscreen_exit', 'User exited fullscreen')
        // Beep sound
        playBeep()
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onViolation?.('tab_switch', 'Tab hidden / switched')
        playBeep()
      }
    }

    const handleBlur = () => {
      onViolation?.('focus_lost', 'Window lost focus')
    }

    document.addEventListener('fullscreenchange',       handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange',       handleVisibilityChange)
    window.addEventListener('blur',                     handleBlur)

    return () => {
      document.removeEventListener('fullscreenchange',       handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange',       handleVisibilityChange)
      window.removeEventListener('blur',                     handleBlur)
    }
  }, [enabled, onViolation])

  // Face check every 8 seconds
  useEffect(() => {
    if (!enabled || !cameraReady) return
    faceIntervalRef.current = setInterval(detectFace, 8000)
    return () => clearInterval(faceIntervalRef.current)
  }, [enabled, cameraReady, detectFace])

  return { videoRef, cameraReady, faceStatus, cameraError, startCamera, stopCamera, enterFullscreen }
}

// Simple beep using Web Audio API
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) { /* ignore */ }
}
