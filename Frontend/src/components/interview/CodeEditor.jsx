import { useState } from 'react'
import { motion } from 'framer-motion'
import { Code2, Copy, Check } from 'lucide-react'

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust']

export default function CodeEditor({ value, onChange, questionText = '' }) {
  const [lang,    setLang]    = useState('javascript')
  const [copied,  setCopied]  = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-[#0d0d14] border border-border rounded-xl overflow-hidden"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose/60" />
            <div className="w-3 h-3 rounded-full bg-amber/60" />
            <div className="w-3 h-3 rounded-full bg-emerald/60" />
          </div>
          <Code2 className="w-4 h-4 text-cyan ml-2" />
          <span className="text-xs font-mono text-slate-400">code_editor</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan/40"
          >
            {LANGUAGES.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Copy */}
          <button onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-cyan hover:bg-cyan/5 border border-transparent hover:border-cyan/20 transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Line numbers + textarea */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Line numbers */}
        <LineNumbers code={value} />

        {/* Editor area */}
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          className="flex-1 resize-none bg-transparent text-slate-200 font-mono text-sm leading-6
                     p-4 focus:outline-none min-h-[200px] placeholder-slate-700"
          placeholder={`// Write your solution here...\n// Question: ${questionText.slice(0, 80)}...`}
          style={{ tabSize: 2 }}
          onKeyDown={e => {
            // Tab inserts spaces
            if (e.key === 'Tab') {
              e.preventDefault()
              const s = e.target.selectionStart
              const before = value.slice(0, s)
              const after  = value.slice(e.target.selectionEnd)
              onChange(before + '  ' + after)
              setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = s + 2 }, 0)
            }
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-surface flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-mono text-slate-600">
          {value.split('\n').length} lines · {value.length} chars
        </span>
        <span className="text-[10px] font-mono text-cyan/50">{lang}</span>
      </div>
    </motion.div>
  )
}

function LineNumbers({ code }) {
  const lines = (code || '').split('\n')
  return (
    <div className="select-none flex flex-col pt-4 pb-4 px-3 text-right min-w-[42px] bg-[#0a0a11] border-r border-border overflow-hidden">
      {lines.map((_, i) => (
        <span key={i} className="text-xs font-mono text-slate-700 leading-6">{i + 1}</span>
      ))}
    </div>
  )
}
