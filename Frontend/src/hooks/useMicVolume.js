import { useState, useEffect, useRef } from 'react'

export function useMicVolume(active = false) {
  const [volume, setVolume] = useState(0)
  const streamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!active) {
      setVolume(0)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioCtxRef.current) audioCtxRef.current.close()
      return
    }

    let mounted = true
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        audioCtxRef.current = audioCtx
        const analyser = audioCtx.createAnalyser()
        analyserRef.current = analyser
        analyser.fftSize = 64
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const loop = () => {
          if (!mounted) return
          analyser.getByteTimeDomainData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128
            sum += val * val
          }
          const rms = Math.sqrt(sum / dataArray.length)
          setVolume(Math.min(100, rms * 1500))
          frameRef.current = requestAnimationFrame(loop)
        }
        loop()
      } catch (err) {
        console.error('Volume track error:', err)
      }
    }
    init()

    return () => {
      mounted = false
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [active])

  return volume
}
