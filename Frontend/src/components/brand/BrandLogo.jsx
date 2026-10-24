import { useId } from 'react'
import { Link } from 'react-router-dom'

const MARK_SIZES = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

const TEXT_SIZES = {
  xs: 'text-sm',
  sm: 'text-[0.95rem]',
  md: 'text-[1.0625rem]',
  lg: 'text-lg',
}

const S_PATH =
  'M45 20.5C45 12.9 39.1 7.5 31.5 7.5C23.9 7.5 18 12.9 18 20.5C18 28.1 23.9 33.5 31.5 33.5C39.1 33.5 45 38.9 45 46.5C45 54.1 39.1 59.5 31.5 59.5C23.9 59.5 18 54.1 18 46.5'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* Flat mark for lockups. Stops resolve from the theme tokens, so the same
   component works on porcelain, near-black, and the inverse navy panel. */
export function BrandMark({ className = MARK_SIZES.sm, inverse = false }) {
  const raw = useId()
  const id = raw.replace(/:/g, '')
  const gradient = `${id}-s`

  return (
    <svg
      viewBox="0 0 64 64"
      className={cx(className, inverse && 'brand-mark-inverse')}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradient} x1="16" y1="58" x2="47" y2="6" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: 'rgb(var(--mark-a))' }} />
          <stop offset=".52" style={{ stopColor: 'rgb(var(--mark-b))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--mark-c))' }} />
        </linearGradient>
      </defs>
      <path d={S_PATH} fill="none" stroke={`url(#${gradient})`} strokeWidth="9.5" strokeLinecap="round" />
    </svg>
  )
}

/* Standalone app icon: obsidian plate, lit S. Kept self-contained so it reads
   the same on a bright page, a black canvas, and the OS home screen. */
export function BrandIcon({ className = 'h-10 w-10' }) {
  const raw = useId()
  const id = raw.replace(/:/g, '')
  const tile = `${id}-tile`
  const glow = `${id}-glow`
  const gradient = `${id}-s`

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={tile} x1="8" y1="60" x2="56" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#111522" />
          <stop offset="1" stopColor="#05070D" />
        </linearGradient>
        <radialGradient id={glow} cx="0" cy="0" r="1" gradientTransform="translate(49 9) rotate(130) scale(44)">
          <stop stopColor="#7D64FF" stopOpacity=".34" />
          <stop offset="1" stopColor="#7D64FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={gradient} x1="20" y1="56" x2="45" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8D7AFF" />
          <stop offset=".5" stopColor="#B5A2FF" />
          <stop offset="1" stopColor="#EEE7FF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill={`url(#${tile})`} />
      <rect width="64" height="64" rx="17" fill={`url(#${glow})`} />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="16.25" fill="none" stroke="#FFFFFF" strokeOpacity=".13" strokeWidth="1.5" />
      <g transform="translate(32 32) scale(.72) translate(-31.5 -33.5)">
        <path d={S_PATH} fill="none" stroke={`url(#${gradient})`} strokeWidth="9.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function BrandLogo({
  to,
  size = 'sm',
  badge,
  inverse = false,
  className = '',
  wordmarkClassName = '',
  onClick,
}) {
  const mark = MARK_SIZES[size] || MARK_SIZES.sm
  const text = TEXT_SIZES[size] || TEXT_SIZES.sm

  const content = (
    <>
      <BrandMark
        inverse={inverse}
        className={cx(mark, 'shrink-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]')}
      />
      <span className={cx('whitespace-nowrap font-display font-semibold tracking-[-0.035em]', text, inverse ? 'text-white' : 'text-ink', wordmarkClassName)}>
        IntervuSetu
      </span>
      {badge && (
        <span
          className={cx(
            'ml-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em]',
            inverse
              ? 'border-white/15 bg-white/[0.06] text-white/65'
              : 'border-accent/20 bg-accent-soft text-accent'
          )}
        >
          {badge}
        </span>
      )}
    </>
  )

  const classes = cx('group inline-flex min-w-0 items-center gap-2.5 rounded-md', className)

  if (!to) return <span className={classes}>{content}</span>

  return (
    <Link to={to} onClick={onClick} className={classes} aria-label="IntervuSetu home">
      {content}
    </Link>
  )
}
