import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, X, ChevronDown } from 'lucide-react'
import { prefersReducedMotion } from '../../motion/setup'

/* ════════════════════════════════════════════════════════════════════════════
   IntervuSetu UI primitives.

   Every screen composes from these, so interaction states, focus rings and
   elevation stay identical across the app. Colours come from the semantic
   tokens in index.css — never a hardcoded hex.
   ════════════════════════════════════════════════════════════════════════════ */

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* ─── Button ───────────────────────────────────────────────────────────────── */
const BTN_SIZES = {
  xs: 'btn-sm text-2xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  xl: 'btn-xl',
}

const BTN_LINK_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn-danger',
  ai: 'btn-ai',
}

export const Button = forwardRef(function Button(
  { children, icon, variant = 'primary', size = 'md', loading = false, block = false, className = '', disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cx(BTN_LINK_VARIANTS[variant] ?? BTN_LINK_VARIANTS.primary, BTN_SIZES[size] ?? BTN_SIZES.md, block && 'w-full', className)}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

export const IconButton = forwardRef(function IconButton(
  { children, label, active = false, className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cx(
        'btn-icon',
        active && 'bg-ink/[0.07] text-ink',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})

/* ─── Form controls ────────────────────────────────────────────────────────── */
function FieldShell({ label, hint, error, id, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-1 text-danger-500" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input(
  { label, error, hint, icon, className = '', required, ...props },
  ref
) {
  const autoId = useId()
  const id = props.id || autoId
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} required={required}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cx('input', icon && 'pl-9', error && 'input-error', className)}
          {...props}
        />
      </div>
    </FieldShell>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', rows = 4, required, ...props },
  ref
) {
  const autoId = useId()
  const id = props.id || autoId
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} required={required}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx('input resize-y', error && 'input-error', className)}
        {...props}
      />
    </FieldShell>
  )
})

export const Select = forwardRef(function Select(
  { label, error, hint, children, className = '', required, ...props },
  ref
) {
  const autoId = useId()
  const id = props.id || autoId
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} required={required}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cx('input', error && 'input-error', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" aria-hidden />
      </div>
    </FieldShell>
  )
})

/* ─── Segmented control ────────────────────────────────────────────────────── */
export function SegmentedControl({ options, value, onChange, ariaLabel, size = 'md', className = '' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-2xs' : 'px-3.5 py-2 text-xs'
  const refs = useRef([])
  const active = Math.max(0, options.findIndex((o) => o.value === value))
  const move = (delta) => {
    const next = (active + delta + options.length) % options.length
    onChange(options[next].value)
    requestAnimationFrame(() => refs.current[next]?.focus())
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1) }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
      }}
      className={cx('inline-flex flex-wrap gap-1 rounded-lg border border-hairline bg-inset p-1', className)}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-fast ease-out',
              pad,
              selected
                ? 'bg-surface text-accent shadow-1 ring-1 ring-accent/25'
                : 'text-muted hover:text-ink'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Badges ───────────────────────────────────────────────────────────────── */
const BADGE_STYLES = {
  default: 'badge',
  slate: 'badge',
  blue: 'badge badge-accent',
  accent: 'badge badge-accent',
  indigo: 'badge badge-accent',
  cyan: 'badge badge-ai',
  violet: 'badge badge-ai',
  purple: 'badge badge-ai',
  green: 'badge badge-success',
  emerald: 'badge badge-success',
  yellow: 'badge badge-warning',
  amber: 'badge badge-warning',
  red: 'badge badge-danger',
  rose: 'badge badge-danger',
  navy: 'badge badge-navy',
  ai: 'badge badge-ai',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
}

export function Badge({ children, color = 'default', className = '' }) {
  return <span className={cx(BADGE_STYLES[color] ?? BADGE_STYLES.default, className)}>{children}</span>
}

/** Status is never colour alone: a shape plus the label carries the meaning. */
const STATUS_TONE = {
  neutral: 'bg-ink-faint',
  live: 'bg-success-500',
  warn: 'bg-warning-500',
  off: 'bg-danger-500',
  info: 'bg-accent-500',
}

export function StatusBadge({ tone = 'neutral', children, pulse = false, className = '' }) {
  return (
    <span className={cx('badge', className)}>
      <span className={cx('relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full', STATUS_TONE[tone] ?? STATUS_TONE.neutral)}>
        {pulse && !prefersReducedMotion() && (
          <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', STATUS_TONE[tone] ?? STATUS_TONE.neutral)} />
        )}
      </span>
      {children}
    </span>
  )
}

/* ─── Surfaces ─────────────────────────────────────────────────────────────── */
export function Card({ children, className = '', interactive = false, ...props }) {
  return (
    <div className={cx(interactive ? 'card-interactive' : 'card', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, description, action, className = '' }) {
  return (
    <div className={cx('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="t-h2">{title}</h2>
        {description && <p className="t-sm mt-1 max-w-prose">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ─── Feedback states ──────────────────────────────────────────────────────── */
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size] ?? 'h-6 w-6'
  return <Loader2 role="status" aria-label="Loading" className={cx(s, 'animate-spin text-accent-500', className)} />
}

export function Skeleton({ className = '', ...props }) {
  return <div aria-hidden className={cx('skeleton', className)} {...props} />
}

/** Matches the shape of the rows it replaces, so nothing shifts on load. */
export function SkeletonList({ rows = 4, className = '' }) {
  return (
    <div className={cx('flex flex-col gap-2', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3 p-3.5">
          <Skeleton className="h-8 w-8 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={cx('empty-state', className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-inset text-subtle">
          {icon}
        </div>
      )}
      <p className="t-h3 text-ink">{title}</p>
      {description && <p className="t-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Divider({ className = '' }) {
  return <div role="separator" className={cx('hairline-t', className)} />
}

/* ─── Scores ───────────────────────────────────────────────────────────────── */
const scoreTone = (score) => (score >= 8 ? 'success' : score >= 5 ? 'warning' : 'danger')

export function ScorePill({ score, suffix = '/10', className = '' }) {
  const tone = scoreTone(score)
  return (
    <span className={cx('badge num', `badge-${tone}`, className)}>
      {score}{suffix}
    </span>
  )
}

export function ScoreRing({ score = 0, size = 80, strokeWidth = 6, label }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(score / 10, 0), 1)
  const tone = scoreTone(score)
  const stroke = { success: 'rgb(var(--success-400))', warning: 'rgb(var(--warning-400))', danger: 'rgb(var(--danger-400))' }[tone]

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`${score} out of 10`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--hairline-strong))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={stroke} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: prefersReducedMotion() ? 'none' : 'stroke-dashoffset 0.9s var(--ease-out)' }}
        />
      </svg>
      <span className="num absolute font-semibold text-ink" style={{ fontSize: size * 0.24 }}>
        {score}
      </span>
      {label && <span className="absolute text-3xs text-subtle" style={{ bottom: size * 0.14 }}>{label}</span>}
    </div>
  )
}

/* ─── Modal ────────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', labelledBy }) {
  const panelRef = useRef(null)
  const restoreTo = useRef(null)
  const headingId = useId()
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size] ?? 'max-w-lg'

  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    const focusTimer = setTimeout(() => {
      panelRef.current?.querySelector('[data-autofocus]')?.focus() ?? panelRef.current?.focus()
    }, 30)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      clearTimeout(focusTimer)
      document.body.style.overflow = overflow
      restoreTo.current?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy || headingId}
            tabIndex={-1}
            initial={{ opacity: 0, y: prefersReducedMotion() ? 0 : 16, scale: prefersReducedMotion() ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: prefersReducedMotion() ? 0 : 12, scale: prefersReducedMotion() ? 1 : 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={cx(
              'card relative w-full overflow-hidden rounded-b-none p-0 shadow-4 sm:rounded-2xl',
              width
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
              <div className="min-w-0">
                <h2 id={headingId} className="t-h3 truncate">{title}</h2>
                {description && <p className="t-sm mt-1">{description}</p>}
              </div>
              <IconButton label="Close dialog" onClick={onClose} data-autofocus>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="px-5 pb-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-hairline bg-inset px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* ─── Tooltip (hover + keyboard) ───────────────────────────────────────────── */
export function Tooltip({ content, children, side = 'top' }) {
  const [shown, setShown] = useState(false)
  const id = useId()
  if (!content) return children

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
      onFocus={() => setShown(true)}
      onBlur={() => setShown(false)}
    >
      <span aria-describedby={shown ? id : undefined} className="contents">{children}</span>
      {shown && (
        <span
          role="tooltip"
          id={id}
          className={cx(
            'pointer-events-none absolute z-50 w-max max-w-[16rem] rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-2xs text-ink shadow-3',
            side === 'top' && 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
            side === 'bottom' && 'top-full left-1/2 mt-1.5 -translate-x-1/2'
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/* ─── Tabs ─────────────────────────────────────────────────────────────────── */
export function Tabs({ tabs, value, onChange, ariaLabel, className = '' }) {
  const listRef = useRef(null)

  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.value === value)
    if (i === -1) return
    let next = null
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = tabs.length - 1
    if (next === null) return
    e.preventDefault()
    onChange(tabs[next].value)
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}
      className={cx('flex gap-1 overflow-x-auto border-b border-hairline', className)}>
      {tabs.map((tab) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cx(
              'relative -mb-px inline-flex min-h-[2.75rem] shrink-0 items-center border-b-2 px-3.5 text-xs font-medium transition-colors duration-fast',
              selected
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            )}
          >
            {tab.icon && <span className="mr-1.5 hidden align-[-2px] sm:inline-flex">{tab.icon}</span>}
            {tab.label}
            {tab.count != null && <span className="num ml-1.5 text-2xs text-subtle">{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export * from './layout'
