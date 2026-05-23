import { motion } from 'framer-motion'
import { Clock, Timer } from 'lucide-react'

export function TimerDisplay({ questionDisplay, totalDisplay, questionIndex, totalQuestions }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Per-question timer */}
      <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5">
        <Timer className="w-3.5 h-3.5 text-cyan" />
        <span className="font-mono text-sm text-cyan tabular-nums">{questionDisplay}</span>
        <span className="text-[10px] text-slate-600 font-mono">this Q</span>
      </div>

      {/* Total timer */}
      <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-mono text-sm text-slate-400 tabular-nums">{totalDisplay}</span>
        <span className="text-[10px] text-slate-600 font-mono">total</span>
      </div>

      {/* Q counter */}
      <div className="flex items-center gap-1.5 bg-cyan/5 border border-cyan/20 rounded-lg px-3 py-1.5">
        <span className="font-mono text-sm text-cyan">
          {questionIndex + 1}<span className="text-slate-600">/</span>{totalQuestions}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">questions</span>
      </div>
    </div>
  )
}

export function ProgressBar({ current, total }) {
  const pct = total > 0 ? ((current) / total) * 100 : 0
  return (
    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-cyan to-violet rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}
