import { Link } from 'react-router-dom'
import { usePageEnter } from '../../motion/hooks'
import { AudioLines, ShieldCheck } from 'lucide-react'
import BrandLogo, { BrandMark } from '../brand/BrandLogo'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* Static heights keep the ornamental signal from shifting between renders. */
const SIGNAL = [18, 32, 24, 46, 30, 54, 38, 62, 34, 48, 26, 56, 40, 30, 50, 22, 36, 18, 28, 12]

/**
 * Shared split-screen frame for every authentication screen. The left panel
 * carries product context; the right panel holds one focused task. Kept in one
 * place so candidate and organization flows stay visually identical.
 */
export default function AuthShell({
  variant = 'candidate',
  eyebrow,
  headline,
  description,
  features = [],
  children,
  footer,
  maxWidth = 'max-w-[28rem]',
}) {
  const scope = usePageEnter([])
  const isOrg = variant === 'org'

  const pipeline = isOrg
    ? ['Template', 'Invite', 'Review']
    : ['Listen', 'Adapt', 'Report']

  return (
    <div ref={scope} className="page-shell relative min-h-dvh text-ink lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
      {/* ── Brand panel ───────────────────────────────────────────────── */}
      <aside className="relative hidden min-h-dvh overflow-hidden bg-[rgb(var(--b-950))] text-white lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className={cx(
            'absolute -left-40 -top-24 h-[36rem] w-[36rem] rounded-full blur-[120px]',
            isOrg ? 'bg-[rgb(var(--ai))]/25' : 'bg-accent-500/25'
          )} />
          <div className="absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent-400/[0.14] blur-[110px]" />
          <div
            className="absolute inset-0 line-grid opacity-[0.16]"
            style={{ maskImage: 'radial-gradient(ellipse 90% 70% at 30% 30%, black 20%, transparent 78%)' }}
          />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[rgb(var(--b-950))] via-[rgb(var(--b-950))]/70 to-transparent" />
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col p-10 xl:p-14">
          <div data-enter className="w-fit">
            <BrandLogo to="/" size="md" inverse badge={isOrg ? 'Organizations' : 'Candidates'} />
          </div>

          <div className="my-auto max-w-md py-14 [@media(max-height:820px)]:py-8">
            <p data-enter className="flex items-center gap-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/50">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-success-400/60 motion-safe:animate-ping" aria-hidden />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success-400" aria-hidden />
              </span>
              {eyebrow}
            </p>
            <h2
              data-enter
              className="mt-5 font-display text-[clamp(2.15rem,1.3rem+2.4vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
            >
              {headline}
            </h2>
            <p data-enter className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              {description}
            </p>

            {features.length > 0 && (
              <ul data-enter className="mt-9 space-y-3.5">
                {features.map(({ icon: FeatureIcon, label, detail }) => (
                  <li key={label} className="flex gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-white/70">
                      <FeatureIcon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.8125rem] font-medium text-white/90">{label}</p>
                      {detail && <p className="mt-0.5 text-xs leading-relaxed text-white/45">{detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ornamental session signal — no invented metrics, just the flow */}
          <div data-enter className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm [@media(max-height:820px)]:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white/55">
                <AudioLines className="h-3.5 w-3.5 text-accent-400" aria-hidden />
                Interview session
              </span>
              <span className="inline-flex items-center gap-1.5 text-[0.625rem] font-medium text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-success-400" aria-hidden />
                Live voice AI
              </span>
            </div>

            <div className="mt-4 flex h-14 items-center gap-[3px]" aria-hidden>
              {SIGNAL.map((height, i) => (
                <span
                  key={i}
                  className={cx(
                    'w-full rounded-full',
                    i > 6 && i < 14 ? 'bg-accent-400/80' : 'bg-white/20'
                  )}
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>

            <ol className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
              {pipeline.map((step, i) => (
                <li key={step} className="flex items-center gap-1.5 text-[0.625rem] font-medium text-white/55">
                  <span className="num grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[0.5625rem] text-white/70">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-5 flex items-center gap-1.5 text-[0.625rem] text-white/35">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Built for real interview practice and structured hiring.
          </p>
        </div>
      </aside>

      {/* ── Task panel ────────────────────────────────────────────────── */}
      <main className="relative flex min-h-dvh flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-8 lg:h-20 lg:px-10">
          <BrandLogo to="/" size="sm" className="lg:hidden" />
          <p className="eyebrow hidden lg:block">{isOrg ? 'Hiring console' : 'Candidate portal'}</p>
          <Link
            to={isOrg ? '/login' : '/org/login'}
            className="tap-link text-2xs font-medium text-subtle transition-colors duration-fast hover:text-ink"
          >
            {isOrg ? 'Candidate sign in' : 'Organization sign in'}
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-8 lg:px-10">
          <div data-enter className={cx('w-full', maxWidth)}>
            <div className="card p-5 shadow-3 sm:p-7">{children}</div>
            {footer && <div className="mt-4 text-center">{footer}</div>}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 pb-6 text-2xs text-faint">
          <span className="inline-flex items-center gap-1.5"><BrandMark className="h-3.5 w-3.5" />IntervuSetu</span>
          <span aria-hidden>·</span>
          <span>AI voice interviews</span>
          <span aria-hidden>·</span>
          <span>Structured feedback</span>
        </footer>
      </main>
    </div>
  )
}
