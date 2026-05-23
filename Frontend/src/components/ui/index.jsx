import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// ─── Button ──────────────────────────────────────────────────────────────────
export const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', loading = false, className = '', ...props },
  ref
) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.98] font-["Inter",system-ui]'

  const variants = {
    primary:   'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm',
    secondary: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:border-zinc-700',
    ghost:     'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70',
    danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    outline:   'border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  }

  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
    xl: 'px-6 py-3 text-base',
  }

  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
})

// ─── Input ───────────────────────────────────────────────────────────────────
export const Input = forwardRef(function Input(
  { label, error, icon, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" style={{ fontFamily: 'Inter, system-ui' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600
            transition-all duration-150 outline-none
            border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500/70 focus:border-red-500' : ''}
            ${icon ? 'pl-9' : ''}
            ${className}`}
          style={{ fontFamily: 'Inter, system-ui' }}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
})

// ─── Badge ───────────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  default:  'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  blue:     'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800/50',
  green:    'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800/50',
  emerald:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800/50',
  amber:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800/50',
  yellow:   'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800/50',
  red:      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800/50',
  rose:     'bg-rose-50 text-rose-700 border-rose-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800/50',
  slate:    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  cyan:     'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800/50',
  violet:   'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800/50',
  purple:   'bg-purple-50 text-purple-700 border-purple-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800/50',
}

export function Badge({ children, color = 'default', className = '' }) {
  const style = BADGE_STYLES[color] ?? BADGE_STYLES.default
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border leading-none ${style} ${className}`}
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {children}
    </span>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size] ?? 'w-6 h-6'
  return <Loader2 className={`${s} animate-spin text-blue-500 ${className}`} />
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ className = '' }) {
  return <div className={`border-t border-zinc-200 dark:border-zinc-800 ${className}`} />
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4 text-zinc-500 dark:text-zinc-600">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-300 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</p>
      {description && <p className="text-xs text-zinc-500 mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, valueColor = 'text-zinc-900 dark:text-zinc-100', change }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500" style={{ fontFamily: 'Inter, system-ui' }}>{label}</span>
        {icon && <span className="text-zinc-400 dark:text-zinc-600">{icon}</span>}
      </div>
      <div className={`text-xl font-semibold ${valueColor}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
        {value}
      </div>
      {change != null && (
        <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-400'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last session
        </p>
      )}
    </div>
  )
}

// ─── Score Pill ──────────────────────────────────────────────────────────────
export function ScorePill({ score }) {
  const color =
    score >= 8 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800/50' :
    score >= 5 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800/50' :
                 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800/50'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border tabular-nums ${color}`}
      style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {score}/10
    </span>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm ${
        hover ? 'transition-colors duration-150 hover:border-blue-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = forwardRef(function Select(
  { label, error, children, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" style={{ fontFamily: 'Inter, system-ui' }}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100
          transition-all duration-150 outline-none
          focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20
          ${error ? 'border-red-500/70' : ''}
          ${className}`}
        style={{ fontFamily: 'Inter, system-ui' }}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
})

// ─── ScoreRing ────────────────────────────────────────────────────────────────
// SVG ring used by ReportPage
export function ScoreRing({ score = 0, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(score / 10, 0), 1)
  const dashOffset = circumference * (1 - pct)
  const color = score >= 8 ? '#16a34a' : score >= 5 ? '#ca8a04' : '#dc2626'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-zinc-100 dark:stroke-zinc-800" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <span
        className="absolute text-base font-bold tabular-nums text-zinc-900 dark:text-white"
        style={{ fontFamily: 'Poppins, sans-serif', fontSize: size * 0.22 }}
      >
        {score}
      </span>
    </div>
  )
}

