/**
 * WhistleSTT - Client-side Rolling Audio Chunker and Neural Transcription Engine
 * 
 * Records 16kHz mono audio from candidate mic, detects natural breath/silence pauses (VAD)
 * or 15-20s duration limits, and sends audio chunks to the Whistle Neural Engine (Cactus Compute).
 * Solves the 30-second cap completely by rolling chunking and sentence stitching!
 */

// Helper to convert float32 samples to 16-bit PCM WAV ArrayBuffer
export function floatTo16BitPCM(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // Write RIFF header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)        // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true)         // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true)         // NumChannels (1 mono)
  view.setUint32(24, 16000, true)     // SampleRate (16000 Hz)
  view.setUint32(28, 32000, true)     // ByteRate (16000 * 1 * 2)
  view.setUint16(32, 2, true)         // BlockAlign (1 * 2)
  view.setUint16(34, 16, true)        // BitsPerSample (16 bits)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // Write PCM audio samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return buffer
}

export function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export class WhistleRecorder {
  constructor(options = {}) {
    this.apiBase = options.apiBase || 'http://localhost:5000/api/audio/whistle'
    this.directWhistleUrl = options.directWhistleUrl || 'http://localhost:5001'
    this.keywords = options.keywords || [
      'React', 'Fiber', 'Virtual DOM', 'Node.js', 'Express', 'MongoDB',
      'SQL', 'JWT', 'TypeScript', 'JavaScript', 'Docker', 'Kubernetes',
      'API', 'REST', 'GraphQL', 'Redis', 'Kafka', 'PostgreSQL'
    ]
    this.language = options.language || 'en'
    
    // Callbacks
    this.onVolume = options.onVolume || (() => {})
    this.onStatus = options.onStatus || (() => {})
    this.onChunk = options.onChunk || (() => {})
    this.onTranscript = options.onTranscript || (() => {})
    this.onError = options.onError || (() => {})

    // Audio internals
    this.audioCtx = null
    this.mediaStream = null
    this.processor = null
    this.analyser = null
    this.isRecording = false

    // Rolling buffer
    this.recordedSamples = []
    this.chunkSampleCount = 0
    this.lastVoiceTime = 0
    this.silenceDurationMs = 0
    this.fullTranscript = ''
    this.pendingChunks = 0

    // VAD settings
    this.SILENCE_THRESHOLD = 0.025     // RMS threshold for speech
    this.SILENCE_COMMIT_MS = 800       // 0.8s silence = commit natural sentence
    this.MAX_CHUNK_DURATION_SEC = 20   // Never exceed 20s (well below Whistle's 30s cap)
    this.MIN_CHUNK_SAMPLES = 16000 * 0.8 // At least 0.8s of speech to avoid transcribing pure breath
  }

  async checkStatus() {
    try {
      // Try backend proxy first, fallback to direct Whistle server
      let res = await fetch(`${this.apiBase}/status`).catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        if (data.available) return data
      }
      
      let directRes = await fetch(`${this.directWhistleUrl}/health`).catch(() => null)
      if (directRes && directRes.ok) {
        const data = await directRes.json()
        return { available: data.ready, model: data.model, engine: data.engine }
      }
    } catch {}
    return { available: false }
  }

  async start() {
    if (this.isRecording) return

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      this.audioCtx = new AudioContextClass({ sampleRate: 16000 })

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream)
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      // ScriptProcessor for 16kHz PCM audio chunking
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
      source.connect(this.processor)
      this.processor.connect(this.audioCtx.destination)

      this.recordedSamples = []
      this.chunkSampleCount = 0
      this.lastVoiceTime = Date.now()
      this.isRecording = true
      this.onStatus('recording')

      const sampleRate = this.audioCtx.sampleRate || 16000

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return

        const inputData = e.inputBuffer.getChannelData(0)
        // Clone samples into rolling chunk
        const chunk = new Float32Array(inputData.length)
        chunk.set(inputData)
        this.recordedSamples.push(chunk)
        this.chunkSampleCount += chunk.length

        // Compute RMS for volume and VAD
        let sum = 0
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i]
        }
        const rms = Math.sqrt(sum / inputData.length)
        const volumePct = Math.min(100, Math.round(rms * 1500))
        this.onVolume(volumePct)

        const now = Date.now()
        const durationSec = this.chunkSampleCount / sampleRate

        if (rms > this.SILENCE_THRESHOLD) {
          this.lastVoiceTime = now
        }

        const silenceMs = now - this.lastVoiceTime

        // Check if we should commit this chunk:
        // 1. Natural sentence boundary: candidate spoke enough audio and paused for SILENCE_COMMIT_MS
        // 2. Maximum duration reached: chunk reached 20s cap
        const hasEnoughSpeech = this.chunkSampleCount >= this.MIN_CHUNK_SAMPLES
        const isNaturalPause = hasEnoughSpeech && (silenceMs >= this.SILENCE_COMMIT_MS)
        const isMaxDuration = durationSec >= this.MAX_CHUNK_DURATION_SEC

        if (isNaturalPause || isMaxDuration) {
          this.commitCurrentChunk()
        }
      }

    } catch (err) {
      this.onError(err)
      this.stop()
      throw err
    }
  }

  commitCurrentChunk() {
    if (this.recordedSamples.length === 0 || this.chunkSampleCount < this.MIN_CHUNK_SAMPLES) {
      this.recordedSamples = []
      this.chunkSampleCount = 0
      this.lastVoiceTime = Date.now()
      return
    }

    // Flatten all recorded chunks into single Float32Array
    const totalSamples = this.chunkSampleCount
    const flatSamples = new Float32Array(totalSamples)
    let offset = 0
    for (const chunk of this.recordedSamples) {
      flatSamples.set(chunk, offset)
      offset += chunk.length
    }

    // Reset rolling buffer for the NEXT continuous chunk immediately
    this.recordedSamples = []
    this.chunkSampleCount = 0
    this.lastVoiceTime = Date.now()

    // Dispatch async transcription in background without blocking audio capture
    this.transcribeChunkAsync(flatSamples)
  }

  async transcribeChunkAsync(samples) {
    this.pendingChunks++
    this.onStatus('transcribing')

    try {
      const wavBuffer = floatTo16BitPCM(samples)
      const base64Audio = arrayBufferToBase64(wavBuffer)

      // Try backend proxy first, fallback to direct Whistle
      let result = null

      try {
        const resp = await fetch(`${this.apiBase}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Audio,
            keywords: this.keywords,
            language: this.language,
            word_timestamps: true
          })
        })
        if (resp.ok) {
          result = await resp.json()
        }
      } catch {}

      if (!result) {
        // Direct call to port 5001
        const directResp = await fetch(`${this.directWhistleUrl}/transcribe-base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Audio,
            keywords: this.keywords,
            language: this.language,
            word_timestamps: true
          })
        })
        if (directResp.ok) {
          result = await directResp.json()
        }
      }

      if (result && result.text) {
        const cleanText = result.text.trim()
        if (cleanText) {
          this.fullTranscript = this.fullTranscript
            ? `${this.fullTranscript} ${cleanText}`
            : cleanText
          
          this.onChunk(cleanText, result)
          this.onTranscript(this.fullTranscript)
        }
      }
    } catch (err) {
      console.warn('Whistle chunk transcription error:', err)
    } finally {
      this.pendingChunks = Math.max(0, this.pendingChunks - 1)
      if (this.isRecording) {
        this.onStatus(this.pendingChunks > 0 ? 'transcribing' : 'recording')
      }
    }
  }

  stop() {
    this.isRecording = false
    this.onStatus('idle')
    this.onVolume(0)

    // Flush any remaining audio
    if (this.chunkSampleCount >= this.MIN_CHUNK_SAMPLES) {
      this.commitCurrentChunk()
    }

    if (this.processor) {
      try { this.processor.disconnect() } catch {}
      this.processor = null
    }

    if (this.analyser) {
      try { this.analyser.disconnect() } catch {}
      this.analyser = null
    }

    if (this.audioCtx) {
      try { this.audioCtx.close() } catch {}
      this.audioCtx = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop())
      this.mediaStream = null
    }

    this.recordedSamples = []
    this.chunkSampleCount = 0
  }

  clear() {
    this.fullTranscript = ''
    this.onTranscript('')
  }
}
