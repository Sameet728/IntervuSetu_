import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Camera, CameraOff, AlertTriangle } from 'lucide-react'

export default function WebcamFeed({ videoRef, cameraReady, faceStatus }) {
  useEffect(() => {
    console.log('🎬 WebcamFeed mounted, videoRef:', videoRef?.current)
  }, [])

  const borderColor = {
    ok:        'border-emerald/40',
    no_face:   'border-rose/60',
    multiple:  'border-amber/60',
  }[faceStatus] || 'border-border'

  const statusLabel = {
    ok:       null,
    no_face:  'No face detected',
    multiple: 'Multiple faces',
  }[faceStatus]

  return (
    <div className="relative">
      <motion.div
        animate={{ borderColor: faceStatus !== 'ok' ? (faceStatus === 'no_face' ? '#f43f5e' : '#f59e0b') : '#10b981' }}
        transition={{ duration: 0.4 }}
        className={`relative rounded-xl overflow-hidden border-2 aspect-video bg-surface ${borderColor}`}
        style={{ width: '100%', maxWidth: 220, minHeight: 165 }}
      >
        {/* Always render video element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {/* Show loading overlay when camera not ready */}
        {!cameraReady && (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600 bg-surface">
            <CameraOff className="w-8 h-8" />
            <span className="text-xs font-mono">Initializing...</span>
          </div>
        )}

        {/* Corner indicator */}
        <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full
          ${faceStatus === 'ok' ? 'bg-emerald' : faceStatus === 'no_face' ? 'bg-rose' : 'bg-amber'}
          shadow-[0_0_8px_currentColor]`} />

        {/* Warning overlay */}
        {statusLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-x-0 bottom-0 bg-rose/80 backdrop-blur-sm py-1 px-2 flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-white flex-shrink-0" />
            <span className="text-white text-[10px] font-mono truncate">{statusLabel}</span>
          </motion.div>
        )}
      </motion.div>

      <div className="flex items-center gap-1.5 mt-1.5">
        <Camera className="w-3 h-3 text-slate-600" />
        <span className="text-[10px] font-mono text-slate-600">
          {cameraReady ? 'Camera active' : 'Camera off'}
        </span>
      </div>
    </div>
  )
}
