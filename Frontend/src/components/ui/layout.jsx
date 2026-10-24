import { useId } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

/* ── Page header ──────────────────────────────────────────────────────────
   One editorial header for every screen: eyebrow, display title, supporting
   copy and actions on one baseline. */
export function PageHeader({ eyebrow, title, description, actions, meta, className = '' }) {
  return (
    <header className={`flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="eyebrow mb-2.5 flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 rounded-full bg-accent shadow-[0_0_0_3px_rgb(var(--accent)/0.14)]" />
            {eyebrow}
          </p>
        )}
        <h1 className="t-h1 text-balance">{title}</h1>
        {description && <p className="t-body mt-2.5 max-w-2xl text-pretty">{description}</p>}
        {meta && <div className="mt-4">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:pb-0.5">{actions}</div>}
    </header>
  )
}

/* ── Metric tile ───────────────────────────────────────────────────────── */
const TONES = {
  accent:  { icon: 'bg-accent-soft text-accent',        glow: 'from-accent/[0.18]',  value: 'text-ink' },
  ai:      { icon: 'bg-ai-soft text-ai',                glow: 'from-ai/[0.18]',      value: 'text-ink' },
  success: { icon: 'bg-success-soft text-success-500',  glow: 'from-success-500/[0.16]', value: 'text-ink' },
  warning: { icon: 'bg-warning-soft text-warning-500',  glow: 'from-warning-500/[0.16]', value: 'text-ink' },
  neutral: { icon: 'bg-inset text-muted',               glow: 'from-ink/[0.06]',     value: 'text-ink' },
}

export function StatTile({ icon: Icon, label, value, unit, hint, tone = 'accent', className = '' }) {
  const t = TONES[tone] || TONES.accent
  return (
    <div className={`card relative isolate overflow-hidden p-4 sm:p-5 ${className}`}>
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-b ${t.glow} to-transparent blur-2xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.icon}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className={`num-xl relative mt-3 ${t.value}`}>
        {value}
        {unit && <span className="ml-1 align-baseline text-sm font-medium text-subtle">{unit}</span>}
      </p>
      {hint && <p className="t-xs relative mt-1.5">{hint}</p>}
    </div>
  )
}

/* ── Panel ─────────────────────────────────────────────────────────────── */
export function Panel({ icon: Icon, title, description, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-inset text-muted">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="t-h3 leading-tight">{title}</h2>}
              {description && <p className="t-xs mt-1">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName || 'p-5 sm:p-6'}>{children}</div>
    </section>
  )
}

/* ── Sparkline ─────────────────────────────────────────────────────────── */
export function Sparkline({ points = [], height = 44, className = '', strokeWidth = 2 }) {
  const uid = useId().replace(/[:]/g, '')
  const values = points.filter((n) => Number.isFinite(n))
  if (values.length < 2) return null

  const w = 120
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = w / (values.length - 1)
  const xy = values.map((v, i) => [i * step, height - 4 - ((v - min) / span) * (height - 8)])
  const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`text-accent ${className}`} aria-hidden>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Meter ─────────────────────────────────────────────────────────────── */
const METER_TONES = {
  accent: 'bg-accent',
  ai: 'bg-ai',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
}

export function Meter({ value = 0, max = 10, tone = 'accent', className = '', label }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / (Number(max) || 1)) * 100))
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07] ${className}`}
      role="img"
      aria-label={label || `${Math.round(pct)} percent`}
    >
      <div className={`h-full rounded-full ${METER_TONES[tone] || METER_TONES.accent}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ── Empty-ish call to action row used inside panels ───────────────────── */
export function InlineLink({ to, children, className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors duration-fast hover:text-accent-hover ${className}`}>
      {children}
      <ArrowUpRight className="h-3 w-3" aria-hidden />
    </Link>
  )
}
