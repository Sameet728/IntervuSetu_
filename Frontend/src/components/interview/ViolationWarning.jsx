import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, X } from 'lucide-react'

export default function ViolationWarning({ violation, onDismiss }) {
  return (
    <AnimatePresence>
      {violation && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md mx-4"
        >
          <div className="bg-rose/10 border-2 border-rose/50 rounded-2xl p-4 shadow-[0_0_40px_rgba(244,63,94,0.3)] backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display font-semibold text-rose text-sm">Proctoring Violation</p>
                  <button onClick={onDismiss} className="text-rose/60 hover:text-rose">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-slate-300 text-xs font-body mt-1">{violation.warning}</p>
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: violation.maxViolations }).map((_, i) => (
                    <div key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300
                        ${i < violation.violationCount ? 'bg-rose' : 'bg-border'}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 font-mono mt-1.5">
                  {violation.remainingChances === 0
                    ? 'Interview will be auto-submitted!'
                    : `${violation.remainingChances} chance${violation.remainingChances !== 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
