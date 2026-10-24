import { motion } from 'framer-motion'
import { useMicVolume } from '../../hooks/useMicVolume'
import { prefersReducedMotion } from '../../motion/index'

/**
 * Live mic / TTS meter. Height still tracks real microphone volume; only the
 * motion is gated, so reduced-motion users get an accurate static level bar
 * instead of a frozen one.
 * States: listening (accent waves), speaking (ai waves), thinking (warning dots).
 */

const SIZES = {
  sm: { height: 'h-6', bars: 7, gap: 'gap-[3px]', barW: 'w-[3px]' },
  md: { height: 'h-10', bars: 11, gap: 'gap-1', barW: 'w-1' },
  lg: { height: 'h-14', bars: 15, gap: 'gap-1', barW: 'w-1' },
}

const WAVE_SHAPE = [0.3, 0.5, 0.75, 0.9, 1, 0.9, 0.7, 0.9, 1, 0.9, 0.75, 0.5, 0.3, 0.5, 0.4]

export default function VoiceWave({ active = false, speaking = false, thinking = false, size = 'md' }) {
  const s = SIZES[size] || SIZES.md
  const reduced = prefersReducedMotion()
  const volume = useMicVolume(active)

  let barColor = 'bg-ink-faint'
  let role = 'img'
  let label = 'Microphone idle'
  if (thinking) {
    barColor = 'bg-warning-500'
    role = 'status'
    label = 'Preparing the next question'
  } else if (speaking) {
    barColor = 'bg-ai'
    role = 'status'
    label = 'Interviewer is speaking'
  } else if (active) {
    barColor = 'bg-accent'
    role = 'status'
    label = 'Listening — speak now'
  }

  if (thinking) {
    return (
      <span
        role={role}
        aria-label={label}
        className="flex items-center gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-warning-500"
            animate={reduced ? { opacity: 0.8 } : { y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={reduced ? { duration: 0.01 } : { duration: 1.4, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </span>
    )
  }

  const levelOf = (baseH) => {
    if (speaking) return baseH
    if (active) return Math.max(0.15, Math.min(1, 0.15 + (volume / 100) * baseH))
    return 0.15
  }

  return (
    <span
      role={role}
      aria-label={label}
      className={`flex items-center ${s.gap} ${s.height}`}
    >
      {Array.from({ length: s.bars }).map((_, i) => {
        const baseH = WAVE_SHAPE[i % WAVE_SHAPE.length] || 0.5
        const delay = (i / s.bars) * 0.8
        const duration = 0.8 + (i % 3) * 0.15
        const level = levelOf(baseH)

        return (
          <motion.span
            key={i}
            aria-hidden
            className={`${s.barW} ${barColor} rounded-full`}
            style={{ height: `${baseH * 100}%`, transformOrigin: 'center' }}
            animate={
              speaking && !reduced
                ? { scaleY: [baseH, 1, baseH * 0.4, 1, baseH], opacity: [0.6, 1, 0.7, 1, 0.6] }
                : { scaleY: level, opacity: active ? (volume > 5 ? 1 : 0.55) : 0.3 }
            }
            transition={
              speaking && !reduced
                ? { duration, delay, repeat: Infinity, ease: 'easeInOut' }
                : { duration: reduced ? 0 : 0.1 }
            }
          />
        )
      })}
    </span>
  )
}
