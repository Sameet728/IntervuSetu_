import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, RotateCcw, ChevronDown, ChevronUp,
  FileCode, HelpCircle, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, IconButton } from '../ui/index'
import { prefersReducedMotion } from '../../motion/index'

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'python',     label: 'Python',     ext: 'py' },
  { id: 'java',       label: 'Java',       ext: 'java' },
  { id: 'cpp',        label: 'C++',        ext: 'cpp' },
  { id: 'go',         label: 'Go',         ext: 'go' },
]

/* Static class strings — interpolated names never reach the Tailwind build. */
const DIFFICULTY_BADGE = { easy: 'green', medium: 'amber', hard: 'red' }

const LANGUAGE_TEMPLATES = {
  javascript: (prompt) => `// JavaScript Solution\n// Problem: ${prompt ? prompt.replace(/\n/g, ' ') : 'Write your solution below'}\n\nfunction solution() {\n  // Write your code here\n  \n}\n`,
  typescript: (prompt) => `// TypeScript Solution\n// Problem: ${prompt ? prompt.replace(/\n/g, ' ') : 'Write your solution below'}\n\nfunction solution(): void {\n  // Write your code here\n  \n}\n`,
  python: (prompt) => `# Python Solution\n# Problem: ${prompt ? prompt.replace(/\n/g, ' ') : 'Write your solution below'}\n\ndef solution():\n    # Write your code here\n    pass\n`,
  java: (prompt) => `// Java Solution\n// Problem: ${prompt ? prompt.replace(/\n/g, ' ') : 'Write your solution below'}\n\nclass Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`,
  cpp: (prompt) => `// C++ Solution\n// Problem: ${prompt ? prompt.replace(/\n/g, ' ') : 'Write your solution below'}\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
  go: (prompt) => `// Go Solution\n// Problem: ${prompt ? prompt.replace(/\n/g, ' ') : 'Write your solution below'}\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}\n`,
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
    toast('Code template restored', { icon: <RotateCcw className="inline h-3.5 w-3.5" /> })
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
    toast(`Switched to ${newLang.toUpperCase()}`, { icon: <FileCode className="inline h-3.5 w-3.5" /> })
  }

  const handleKeyDown = (e) => {
    // Prevent browser Save Page As dialog on Ctrl+S / Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      toast('Code progress saved', { icon: <Check className="inline h-3.5 w-3.5" />, duration: 2000 })
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

  const lines = (value || '').split('\n')
  const fileLang = LANGUAGES.find((l) => l.id === lang) || LANGUAGES[0]

  return (
    <div className="card flex flex-col overflow-hidden transition-all">
      {/* ── Problem statement ─────────────────────────────────────── */}
      {promptText && (
        <div className="border-b border-hairline bg-surface-2 p-3 sm:p-4">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="eyebrow flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" aria-hidden /> Coding question
              </span>
              <Badge color="accent">{topic}</Badge>
              <Badge color={DIFFICULTY_BADGE[difficulty] ? difficulty : 'warning'} className="capitalize">
                {difficulty}
              </Badge>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setShowQuestion((p) => !p)}
                aria-expanded={showQuestion}
                aria-controls="code-question-body"
                className="btn btn-ghost btn-sm"
              >
                {showQuestion
                  ? <><ChevronUp className="h-3 h-3" aria-hidden /> Hide prompt</>
                  : <><ChevronDown className="h-3 h-3" aria-hidden /> Show prompt</>}
              </button>
              {onClose && <IconButton label="Close code editor" onClick={onClose}><X className="h-3.5 w-3.5" /></IconButton>}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showQuestion && (
              <motion.div
                id="code-question-body"
                initial={prefersReducedMotion() ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="card-inset mt-1 max-h-36 overflow-y-auto p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink select-text">
                    {promptText}
                  </p>
                  {question?.expectedAnswer && (
                    <p className="mt-2 border-t border-hairline pt-2 text-xs text-muted">
                      <span className="font-semibold text-ink">Goal: </span>
                      {question.expectedAnswer}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-hairline bg-surface px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs font-medium text-muted">
          <FileCode className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          <span className="truncate">solution.{fileLang.ext}</span>
        </span>

        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor="code-lang">Programming language</label>
          <select
            id="code-lang"
            value={lang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="input h-7 w-auto max-w-[9rem] py-0 font-mono text-xs"
          >
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>

          <button type="button" onClick={handleResetTemplate} className="btn btn-ghost btn-sm" title="Reset to starter template">
            <RotateCcw className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button type="button" onClick={handleCopy} className="btn btn-secondary btn-sm" aria-label={copied ? 'Code copied' : 'Copy code'}>
            {copied ? <Check className="h-3 w-3 text-success" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── Gutter + editor ───────────────────────────────────────── */}
      <div className="relative flex min-h-[220px] flex-1 overflow-hidden bg-inset max-lg:max-h-[46vh] lg:max-h-[360px]">
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="num flex min-w-[2.5rem] select-none flex-col border-r border-hairline bg-surface-2 px-2.5 py-3 text-right text-xs leading-6 text-faint"
        >
          {lines.map((_, i) => <span key={i}>{i + 1}</span>)}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Solution code"
          className="flex-1 resize-none overflow-y-auto bg-transparent p-3 font-mono text-[13px] leading-6 text-ink outline-none placeholder:text-faint selection:bg-accent/25"
          placeholder="// Your solution appears here — Tab indents, Ctrl+S marks progress"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* ── Status bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-hairline bg-surface px-3 py-1.5 text-2xs text-subtle">
        <p className="num flex items-center gap-3">
          <span>{lines.length} {lines.length === 1 ? 'line' : 'lines'}</span>
          <span>{value.length} chars</span>
        </p>
        <p className="flex items-center gap-1.5">
          <kbd className="chip px-1.5 py-0 font-mono">Tab · 2 spaces</kbd>
          <kbd className="chip px-1.5 py-0 font-mono">Ctrl+S · save</kbd>
        </p>
      </div>
    </div>
  )
}
