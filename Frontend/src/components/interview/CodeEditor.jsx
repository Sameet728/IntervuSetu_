import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Copy, Check, RotateCcw, ChevronDown, ChevronUp,
  FileCode, Terminal, HelpCircle, Sparkles, X
} from 'lucide-react'
import toast from 'react-hot-toast'

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python',     label: 'Python' },
  { id: 'java',       label: 'Java' },
  { id: 'cpp',        label: 'C++' },
  { id: 'go',         label: 'Go' },
]

const LANGUAGE_TEMPLATES = {
  javascript: (prompt) => `// JavaScript Solution\n// Problem: ${prompt ? prompt.replace(/\\n/g, ' ') : 'Write your solution below'}\n\nfunction solution() {\n  // Write your code here\n  \n}\n`,
  typescript: (prompt) => `// TypeScript Solution\n// Problem: ${prompt ? prompt.replace(/\\n/g, ' ') : 'Write your solution below'}\n\nfunction solution(): void {\n  // Write your code here\n  \n}\n`,
  python: (prompt) => `# Python Solution\n# Problem: ${prompt ? prompt.replace(/\\n/g, ' ') : 'Write your solution below'}\n\ndef solution():\n    # Write your code here\n    pass\n`,
  java: (prompt) => `// Java Solution\n// Problem: ${prompt ? prompt.replace(/\\n/g, ' ') : 'Write your solution below'}\n\nclass Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`,
  cpp: (prompt) => `// C++ Solution\n// Problem: ${prompt ? prompt.replace(/\\n/g, ' ') : 'Write your solution below'}\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
  go: (prompt) => `// Go Solution\n// Problem: ${prompt ? prompt.replace(/\\n/g, ' ') : 'Write your solution below'}\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}\n`,
}

export default function CodeEditor({
  value = '',
  onChange,
  question = null,
  questionText = '',
  onClose,
}) {
  const [lang, setLang]               = useState('javascript')
  const [copied, setCopied]           = useState(false)
  const [showQuestion, setShowQuestion] = useState(true)

  const textareaRef    = useRef(null)
  const lineNumbersRef = useRef(null)

  const promptText = question?.question || questionText || ''
  const topic      = question?.topic || 'Coding Challenge'
  const difficulty = question?.difficulty || 'medium'

  // Initialize with starter template if empty
  useEffect(() => {
    if (!value && promptText && onChange) {
      const templateFn = LANGUAGE_TEMPLATES[lang] || LANGUAGE_TEMPLATES.javascript
      onChange(templateFn(promptText.slice(0, 100)))
    }
  }, [lang, promptText])

  // Auto-focus editor when it pops up so user can start typing immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [promptText])

  // Sync line numbers scroll with textarea scroll
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop
    }
  }

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleResetTemplate = () => {
    const templateFn = LANGUAGE_TEMPLATES[lang] || LANGUAGE_TEMPLATES.javascript
    const starter = templateFn(promptText.slice(0, 100))
    onChange(starter)
    toast('Code template restored', { icon: '🔄' })
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleLanguageChange = (newLang) => {
    setLang(newLang)
    // If editor has just empty/default code, load new template
    if (!value.trim() || value.includes('Solution') || value.length < 50) {
      const templateFn = LANGUAGE_TEMPLATES[newLang] || LANGUAGE_TEMPLATES.javascript
      onChange(templateFn(promptText.slice(0, 100)))
    }
    toast(`Switched to ${newLang.toUpperCase()}`, { icon: '⚡' })
  }

  const handleKeyDown = (e) => {
    // Prevent browser Save Page As dialog on Ctrl+S / Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      toast('Code progress saved', { icon: '💾', duration: 2000 })
      return
    }

    // Tab key inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target
      const start = target.selectionStart
      const end = target.selectionEnd
      const val = target.value

      const updated = val.substring(0, start) + '  ' + val.substring(end)
      onChange(updated)

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  const lines = (value || '').split('\\n')

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* ── Problem Statement Header Card ────────────────────────── */}
      {promptText && (
        <div className="bg-zinc-900/90 border-b border-zinc-800 p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
                <HelpCircle className="w-3.5 h-3.5" /> Coding Question
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                {topic}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                difficulty === 'hard'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : difficulty === 'easy'
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {difficulty}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQuestion(p => !p)}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
                title={showQuestion ? 'Collapse question details' : 'Expand question details'}
              >
                {showQuestion ? <><ChevronUp className="w-3 h-3" /> Hide Prompt</> : <><ChevronDown className="w-3 h-3" /> Show Prompt</>}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-zinc-400 hover:text-zinc-200 p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Close Code Editor"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showQuestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 mt-1 max-h-36 overflow-y-auto">
                  <p className="text-sm font-medium text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                    {promptText}
                  </p>
                  {question?.expectedAnswer && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                      <span className="font-semibold text-zinc-300">Goal: </span>
                      {question.expectedAnswer}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Editor Toolbar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Mac-style status dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>

          <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-300">
            <Terminal className="w-3.5 h-3.5 text-blue-400" /> solution.{lang === 'python' ? 'py' : lang === 'java' ? 'java' : lang === 'cpp' ? 'cpp' : lang === 'go' ? 'go' : lang === 'typescript' ? 'ts' : 'js'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={lang}
            onChange={e => handleLanguageChange(e.target.value)}
            className="bg-zinc-950 border border-zinc-700/80 hover:border-zinc-600 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-zinc-200 outline-none focus:border-blue-500 cursor-pointer transition-colors"
          >
            {LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>

          {/* Reset Template */}
          <button
            type="button"
            onClick={handleResetTemplate}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Reset to starter template"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── Line Numbers + Textarea Editor ────────────────────────── */}
      <div className="relative flex flex-1 min-h-[220px] max-h-[360px] bg-[#0c0d12] overflow-hidden">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="select-none flex flex-col pt-3 pb-3 px-2.5 text-right min-w-[40px] bg-[#090a0e] border-r border-zinc-800/80 overflow-hidden"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <span key={i} className="text-xs font-mono text-zinc-600 leading-6">{i + 1}</span>
          ))}
        </div>

        {/* Code Input Area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 resize-none bg-transparent text-zinc-100 font-mono text-[13px] leading-6 p-3 outline-none focus:outline-none placeholder-zinc-600 selection:bg-blue-600/30 overflow-y-auto"
          placeholder="// Type your code here... (all keys and shortcuts work seamlessly)"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 border-t border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between text-[11px] font-mono text-zinc-500 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>{lines.length} lines</span>
          <span>{value.length} chars</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Tab: 2 spaces</span>
          <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Ctrl+S: Save</span>
        </div>
      </div>
    </div>
  )
}
