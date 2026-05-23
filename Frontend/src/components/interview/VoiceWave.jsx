import { motion } from 'framer-motion'
import { useMicVolume } from '../../hooks/useMicVolume'

/**
 * Animated voice waveform component
 * States: listening (cyan waves), speaking (violet waves), thinking (amber pulse)
 */
export default function VoiceWave({ active = false, speaking = false, thinking = false, size = 'md' }) {
  const sizes = {
    sm: { height: 'h-6',  bars: 7,  gap: 'gap-[3px]', barW: 'w-[3px]' },
    md: { height: 'h-10', bars: 11, gap: 'gap-1',      barW: 'w-1' },
    lg: { height: 'h-14', bars: 15, gap: 'gap-1',      barW: 'w-1' },
  }
  const s = sizes[size] || sizes.md

  // Only measure mic volume if user is 'active' (listening)
  const volume = useMicVolume(active)

  // Determine color and animation based on state
  let barColor = 'bg-slate-700'
  let animated = false

  if (thinking) {
    barColor = 'bg-amber'
    animated = true
  } else if (speaking) {
    barColor = 'bg-violet'
    animated = true
  } else if (active) {
    barColor = 'bg-cyan'
    animated = true
  }

  // Wave heights for a natural waveform shape
  const waveShape = [0.3, 0.5, 0.75, 0.9, 1, 0.9, 0.7, 0.9, 1, 0.9, 0.75, 0.5, 0.3, 0.5, 0.4]

  if (thinking) {
    // Thinking state: three bouncing dots
    return (
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${barColor}`}
            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`flex items-center ${s.gap} ${s.height}`}>
      {Array.from({ length: s.bars }).map((_, i) => {
        const baseH    = waveShape[i % waveShape.length] || 0.5
        const delay    = (i / s.bars) * 0.8
        const duration = 0.8 + (i % 3) * 0.15
        
        let scaleVal = 0.15
        if (speaking) {
           // AI speaking
           scaleVal = baseH
        } else if (active) {
           // User speaking - map mic volume!
           const dynH = 0.15 + (volume / 100) * baseH
           scaleVal = Math.max(0.15, Math.min(1, dynH))
        }

        return (
          <motion.div
            key={i}
            className={`${s.barW} ${barColor} rounded-full transition-colors duration-300`}
            style={{ height: `${baseH * 100}%` }}
            animate={speaking ? {
              scaleY: [baseH, 1, baseH * 0.4, 1, baseH],
              opacity: [0.6, 1, 0.7, 1, 0.6],
            } : {
              scaleY: scaleVal,
              opacity: active ? (volume > 5 ? 1 : 0.5) : 0.3,
            }}
            transition={speaking ? {
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
            } : { duration: 0.1 }}
          />
        )
      })}
    </div>
  )
}
