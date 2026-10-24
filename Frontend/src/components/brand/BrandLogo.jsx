import { useId } from 'react'
import { Link } from 'react-router-dom'

const MARK_SIZES = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
}

const TEXT_SIZES = {
  xs: 'text-sm',
  sm: 'text-[0.95rem]',
  md: 'text-base',
  lg: 'text-lg',
}

const cx = (...parts) => parts.filter(Boolean).join(' ')

export function BrandMark({ className = MARK_SIZES.sm }) {
  const raw = useId()
  const id = raw.replace(/:/g, '')
  const bg = `${id}-bg`
  const aurora = `${id}-aurora`
  const specular = `${id}-specular`
  const shade = `${id}-shade`

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={bg} x1="6" y1="60" x2="60" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B35B4" />
          <stop offset=".52" stopColor="#5B56DB" />
          <stop offset="1" stopColor="#9891F8" />
        </linearGradient>
        <radialGradient id={aurora} cx="0" cy="0" r="1" gradientTransform="translate(52 8) rotate(135) scale(46)">
          <stop stopColor="#DAD6FF" stopOpacity=".5" />
          <stop offset="1" stopColor="#DAD6FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={specular} cx="0" cy="0" r="1" gradientTransform="translate(17 8) rotate(44) scale(40)">
          <stop stopColor="#FFFFFF" stopOpacity=".28" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={shade} x1="32" y1="34" x2="32" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#050818" stopOpacity="0" />
          <stop offset="1" stopColor="#050818" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${bg})`} />
      <rect width="64" height="64" rx="18" fill={`url(#${aurora})`} />
      <rect width="64" height="64" rx="18" fill={`url(#${specular})`} />
      <rect width="64" height="64" rx="18" fill={`url(#${shade})`} />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="17.25" fill="none" stroke="#FFFFFF" strokeOpacity=".2" strokeWidth="1.5" />
      <path d="M18 45C20.5 22 43.5 22 46 45" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      <circle cx="18" cy="45" r="4.2" fill="#FFFFFF" />
      <circle cx="46" cy="45" r="4.2" fill="#FFFFFF" />
      <path
        d="M32 10.2l1.55 3.5 3.5 1.55-3.5 1.55-1.55 3.5-1.55-3.5-3.5-1.55 3.5-1.55z"
        fill="#F1EEFF"
        fillOpacity=".94"
      />
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
      <BrandMark className={cx(mark, 'shrink-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-[1.035]')} />
      <span className={cx('whitespace-nowrap font-display font-semibold tracking-[-0.03em]', text, inverse ? 'text-white' : 'text-ink', wordmarkClassName)}>
        Intervu<span className={inverse ? 'text-accent-300' : 'text-accent-500'}>Setu</span>
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
