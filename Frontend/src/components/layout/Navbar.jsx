import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { prefersReducedMotion } from '../../motion/setup'
import BrandLogo from '../brand/BrandLogo'
import {
  Mic, LayoutDashboard, Plus, Sun, Moon, Monitor, User, LogOut,
  ChevronDown, Cpu, HardDrive, Brain, Menu, X, Sparkles
} from 'lucide-react'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

/* On-device AI labs live in the menu rather than the bar: they are real
   destinations, but not the primary task for someone here to practise. */
const LAB_ITEMS = [
  { to: '/offline-ai', label: 'Offline AI Pack', hint: 'Unlimited on-device', Icon: HardDrive, tone: 'text-success-500' },
  { to: '/qwen-test', label: 'Qwen AI Lab', hint: 'Local 0.5B model', Icon: Cpu, tone: 'text-ai' },
  { to: '/voice-test', label: 'Voice Lab', hint: 'STT / TTS bench', Icon: Mic, tone: 'text-accent-500' },
]

function useDismiss(onDismiss) {
  const ref = useRef(null)
  useEffect(() => {
    const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) onDismiss() }
    const onKey = (e) => { if (e.key === 'Escape') onDismiss() }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [onDismiss])
  return ref
}

function Wordmark({ to }) {
  return <BrandLogo to={to} size="sm" className="py-1 pr-2" />
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useDismiss(() => setMenuOpen(false))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Route changes should never leave a stale menu open behind them.
  useEffect(() => { setMenuOpen(false); setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const handleLogout = () => { logout(); navigate('/') }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const navLink = (active) =>
    `relative flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[0.8125rem] font-medium transition-colors duration-fast ${
      active ? 'bg-accent-soft text-accent-600' : 'text-muted hover:bg-ink/[0.05] hover:text-ink'
    }`

  const primaryLinks = [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/aptitude', label: 'Aptitude', Icon: Brain },
    { to: '/interview/create', label: 'New interview', Icon: Plus },
  ]

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 h-nav transition-[background-color,box-shadow,border-color] duration-base ease-out ${
        scrolled
          ? 'glass border-b border-hairline shadow-1'
          : 'border-b border-transparent bg-canvas/70 backdrop-blur-[6px]'
      }`}
    >
      <div className="container-page flex h-full items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-1">
          <Wordmark to={user ? '/dashboard' : '/'} />

          {user && (
            <div className="ml-2 hidden items-center gap-0.5 lg:flex">
              {primaryLinks.map(({ to, label, Icon }) => {
                const active = to === '/interview/create'
                  ? location.pathname === to
                  : location.pathname === to || location.pathname.startsWith(`${to}/`)
                return (
                  <Link key={to} to={to} className={navLink(active)} aria-current={active ? 'page' : undefined}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Plan marker — real account state, not decoration */}
          {user && (
            <span className={`badge hidden sm:inline-flex ${user.plan === 'pro' ? 'badge-accent' : ''}`}>
              {user.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          )}

          {user ? (
            <>
              <Link to="/interview/create" className="btn btn-primary btn-sm hidden md:inline-flex">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New interview
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((p) => !p)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-controls="account-menu"
                  aria-label="Account menu"
                  className="flex min-h-[2.25rem] items-center gap-2 rounded-lg border border-transparent pl-1 pr-2 transition-colors duration-fast hover:border-hairline hover:bg-ink/[0.04]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-600 text-[0.625rem] font-semibold text-white">
                    {initials}
                  </span>
                  <span className="hidden max-w-[7rem] truncate text-xs font-medium text-ink sm:block">
                    {user.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className={`h-3 w-3 text-subtle transition-transform duration-fast ${menuOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      id="account-menu"
                      role="menu"
                      initial={{ opacity: 0, y: prefersReducedMotion() ? 0 : -6, scale: prefersReducedMotion() ? 1 : 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: prefersReducedMotion() ? 0 : -6, scale: prefersReducedMotion() ? 1 : 0.98 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="card absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden p-0 shadow-4"
                    >
                      <div className="border-b border-hairline px-4 py-3.5">
                        <p className="truncate font-display text-sm font-semibold text-ink">{user.name}</p>
                        <p className="num mt-0.5 truncate text-2xs text-subtle">{user.email}</p>
                      </div>

                      <div className="py-1.5">
                        <Link role="menuitem" to="/profile" className="flex min-h-[2.75rem] items-center gap-2.5 px-4 text-[0.8125rem] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink">
                          <User className="h-4 w-4 text-subtle" aria-hidden />Profile
                        </Link>
                        <Link role="menuitem" to="/dashboard" className="flex min-h-[2.75rem] items-center gap-2.5 px-4 text-[0.8125rem] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink">
                          <LayoutDashboard className="h-4 w-4 text-subtle" aria-hidden />Dashboard
                        </Link>
                      </div>

                      <div className="border-t border-hairline py-1.5">
                        <p className="eyebrow px-4 pb-1 pt-2">On-device labs</p>
                        {LAB_ITEMS.map(({ to, label, hint, Icon, tone }) => (
                          <Link key={to} role="menuitem" to={to} className="flex min-h-[2.75rem] items-center gap-2.5 px-4 text-[0.8125rem] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink">
                            <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
                            <span className="flex-1">{label}</span>
                            <span className="text-3xs text-faint">{hint}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="border-t border-hairline px-4 py-3">
                        <p className="eyebrow mb-2">Appearance</p>
                        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg border border-hairline bg-inset p-1">
                          {THEME_OPTIONS.map(({ value, label, Icon }) => (
                            <button
                              key={value}
                              role="radio"
                              aria-checked={theme === value}
                              onClick={() => setTheme(value)}
                              className={`flex flex-col items-center gap-1 rounded-md py-2 text-3xs font-medium transition-all duration-fast ${
                                theme === value
                                  ? 'bg-surface text-accent-600 shadow-1 ring-1 ring-accent/20'
                                  : 'text-muted hover:text-ink'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" aria-hidden />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-hairline">
                        <button
                          role="menuitem"
                          onClick={handleLogout}
                          className="flex min-h-[2.75rem] w-full items-center gap-2.5 px-4 text-[0.8125rem] text-danger-500 transition-colors hover:bg-danger-500/[0.07]"
                        >
                          <LogOut className="h-4 w-4" aria-hidden />Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Get started
              </Link>
            </div>
          )}

          {/* Mobile trigger */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            className="btn-icon lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile navigation — full-width sheet, 44px+ targets */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReducedMotion() ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass overflow-hidden border-t border-hairline lg:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-3 safe-bottom">
              {user ? (
                <>
                  {primaryLinks.map(({ to, label, Icon }) => (
                    <Link key={to} to={to} className="flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.05]">
                      <Icon className="h-4 w-4 text-subtle" aria-hidden />{label}
                    </Link>
                  ))}
                  <Link to="/profile" className="flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.05]">
                    <User className="h-4 w-4 text-subtle" aria-hidden />Profile
                  </Link>
                  <div className="my-2 hairline-t" />
                  {LAB_ITEMS.map(({ to, label, Icon, tone }) => (
                    <Link key={to} to={to} className="flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-ink/[0.05]">
                      <Icon className={`h-4 w-4 ${tone}`} aria-hidden />{label}
                    </Link>
                  ))}
                  <div className="my-2 hairline-t" />
                  <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg border border-hairline bg-inset p-1">
                    {THEME_OPTIONS.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        role="radio"
                        aria-checked={theme === value}
                        onClick={() => setTheme(value)}
                        className={`flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-md text-2xs font-medium transition-colors ${
                          theme === value ? 'bg-surface text-accent-600 shadow-1' : 'text-muted'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />{label}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleLogout} className="mt-1 flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm text-danger-500 transition-colors hover:bg-danger-500/[0.07]">
                    <LogOut className="h-4 w-4" aria-hidden />Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/offline-ai" className="flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm text-muted">
                    <HardDrive className="h-4 w-4 text-success-500" aria-hidden />Offline AI Pack
                  </Link>
                  <Link to="/voice-test" className="flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm text-muted">
                    <Mic className="h-4 w-4 text-accent-500" aria-hidden />Voice Lab
                  </Link>
                  <div className="mt-2 flex gap-2">
                    <Link to="/login" className="btn btn-secondary btn-md flex-1">Sign in</Link>
                    <Link to="/register" className="btn btn-primary btn-md flex-1">Get started</Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
