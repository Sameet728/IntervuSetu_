import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, User, Bot } from 'lucide-react'

export default function TranscriptBox({ entries = [], interimText = '', className = '' }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries, interimText])

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border flex-shrink-0">
        <FileText className="w-4 h-4 text-cyan" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Live Transcript</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {entries.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5
                ${entry.role === 'ai' ? 'bg-cyan/10 border border-cyan/20' : 'bg-violet/10 border border-violet/20'}`}>
                {entry.role === 'ai'
                  ? <Bot className="w-3.5 h-3.5 text-cyan" />
                  : <User className="w-3.5 h-3.5 text-violet" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-xs font-body leading-relaxed
                ${entry.role === 'ai'
                  ? 'bg-surface border border-border text-slate-300 rounded-tl-none'
                  : 'bg-violet/10 border border-violet/20 text-slate-200 rounded-tr-none'}`}>
                {entry.content}
                <div className="text-[9px] text-slate-600 mt-1.5 font-mono">
                  {new Date(entry.timestamp || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Interim text (in-progress STT) */}
        {interimText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 flex-row-reverse"
          >
            <div className="w-7 h-7 rounded-full bg-violet/10 border border-violet/20 flex items-center justify-center mt-0.5 flex-shrink-0">
              <User className="w-3.5 h-3.5 text-violet" />
            </div>
            <div className="max-w-[80%] px-4 py-2.5 rounded-xl rounded-tr-none bg-violet/5 border border-violet/10 text-slate-500 text-xs font-body italic leading-relaxed">
              {interimText}
              <span className="inline-block w-1 h-3 bg-violet/50 ml-1 animate-pulse" />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
