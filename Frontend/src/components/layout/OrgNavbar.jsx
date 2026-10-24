import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useOrgAuth } from '../../context/OrgAuthContext'
import { useTheme } from '../../context/ThemeContext'
import { prefersReducedMotion } from '../../motion/setup'
import { IconButton } from '../ui/index'
import BrandLogo from '../brand/BrandLogo'
import {
  LayoutDashboard, Plus, Sun, Moon, Monitor, LogOut, ChevronDown, Menu, X
} from 'lucide-react'

/* Theme cycle order is unchanged from the original shell. */
const THEME_ICONS = { dark: Moon, light: Sun, system: Monitor }
const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
]

function Wordmark({ to, label = 'Org' }) {
  return <BrandLogo to={to} size="sm" badge={label} className="py-1 pr-2" />
}

export default function OrgNavbar() {
  const { org, orgLogout } = useOrgAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setDropdownOpen(false); setMobileOpen(false); return }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [])

  /* A route change should never leave a stale menu open behind it. */
  useEffect(() => { setDropdownOpen(false); setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const handleLogout = () => { orgLogout(); navigate('/org/login'); setDropdownOpen(false); setMobileOpen(false) }

  const cycleTheme = () => {
    const order = ['system', 'dark', 'light']
    setTheme(order[(order.indexOf(theme) + 1) % order.length])
  }

  const ThemeIcon = THEME_ICONS[theme] || Monitor
  const initials = org?.name
    ? org.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'O'

  const mobileLink = 'flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.05]'

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 h-14 transition-[background-color,box-shadow,border-color] duration-base ease-out ${
        scrolled
          ? 'glass border-b border-hairline shadow-1'
          : 'border-b border-transparent bg-canvas/70 backdrop-blur-[6px]'
      }`}
    >
      <div className="container-page flex h-full items-center justify-between gap-3">

        {/* Logo */}
        <Wordmark to={org ? '/org/dashboard' : '/'} />

        {/* Desktop cluster */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <IconButton label={`Theme: ${theme}. Switch theme`} onClick={cycleTheme}>
            <ThemeIcon className="h-4 w-4" aria-hidden />
          </IconButton>

          {org ? (
            <>
              {/* New Interview */}
              <Link to="/org/interview/create" className="btn btn-primary btn-sm">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Create interview
              </Link>

              {/* Dashboard — hidden on the dashboard itself, as before */}
              {location.pathname !== '/org/dashboard' && (
                <Link to="/org/dashboard" className="btn btn-ghost btn-sm">
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
                  Dashboard
                </Link>
              )}

              {/* User menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(p => !p)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  aria-controls="org-account-menu"
                  aria-label="Organization account menu"
                  className="flex min-h-[2.25rem] items-center gap-2 rounded-lg border border-transparent pl-1 pr-2 transition-colors duration-fast hover:border-hairline hover:bg-ink/[0.04]"
                >
                  {org?.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-hairline"
                    />
                  ) : (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-600 text-[0.625rem] font-semibold text-white">
                      {initials}
                    </span>
                  )}
                  <span className="hidden max-w-[7rem] truncate text-xs font-medium text-ink lg:block">
                    {org.name}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-subtle transition-transform duration-fast ${dropdownOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      id="org-account-menu"
                      role="menu"
                      initial={{ opacity: 0, y: prefersReducedMotion() ? 0 : -6, scale: prefersReducedMotion() ? 1 : 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: prefersReducedMotion() ? 0 : -6, scale: prefersReducedMotion() ? 1 : 0.98 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="card absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden p-0 shadow-4"
                    >
                      {/* Org identity */}
                      <div className="border-b border-hairline px-4 py-3.5">
                        <p className="truncate font-display text-sm font-semibold text-ink">{org.name}</p>
                        <p className="num mt-0.5 truncate text-2xs text-subtle">{org.email}</p>
                      </div>

                      <div className="py-1.5">
                        <button
                          role="menuitem"
                          onClick={() => { navigate('/org/dashboard'); setDropdownOpen(false) }}
                          className="flex min-h-[2.75rem] w-full items-center gap-2.5 px-4 text-[0.8125rem] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
                        >
                          <LayoutDashboard className="h-4 w-4 text-subtle" aria-hidden />
                          Dashboard
                        </button>
                      </div>

                      {/* Appearance */}
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
                          <LogOut className="h-4 w-4" aria-hidden />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/org/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/org/register" className="btn btn-primary btn-sm">Get started</Link>
            </div>
          )}
        </div>

        {/* Mobile disclosure trigger — the only control shown under sm */}
        <button
          onClick={() => setMobileOpen(p => !p)}
          aria-expanded={mobileOpen}
          aria-controls="org-mobile-nav"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          className="btn-icon sm:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile navigation — full-width sheet, 44px+ targets, no horizontal overflow */}
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            id="org-mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReducedMotion() ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass overflow-hidden border-t border-hairline sm:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-3 safe-bottom">
              {org ? (
                <>
                  {/* Org identity — the bar hides the name below sm, so the sheet carries it */}
                  <div className="flex min-w-0 items-center gap-3 px-3 py-2">
                    {org.logo ? (
                      <img src={org.logo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-hairline" />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-600 text-2xs font-semibold text-white" aria-hidden>
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-ink">{org.name}</p>
                      <p className="num truncate text-2xs text-subtle">{org.email}</p>
                    </div>
                  </div>
                  <div className="my-1 hairline-t" />
                  <Link to="/org/interview/create" className={mobileLink}>
                    <Plus className="h-4 w-4 text-subtle" aria-hidden />Create interview
                  </Link>
                  {location.pathname !== '/org/dashboard' && (
                    <Link to="/org/dashboard" className={mobileLink}>
                      <LayoutDashboard className="h-4 w-4 text-subtle" aria-hidden />Dashboard
                    </Link>
                  )}
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
                  {/* Theme stays reachable on small screens even when signed out */}
                  <button
                    onClick={cycleTheme}
                    className="flex min-h-[2.75rem] items-center gap-3 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <ThemeIcon className="h-4 w-4 text-subtle" aria-hidden />
                    <span>Theme: <span className="capitalize">{theme}</span></span>
                  </button>
                  <div className="flex gap-2 pt-1">
                    <Link to="/org/login" className="btn btn-secondary btn-md flex-1">Sign in</Link>
                    <Link to="/org/register" className="btn btn-primary btn-md flex-1">Get started</Link>
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
