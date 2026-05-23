import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  Mic, LayoutDashboard, Plus, Sun, Moon, Monitor,
  User, LogOut, ChevronDown
} from 'lucide-react'

const THEME_ICONS = { dark: Moon, light: Sun, system: Monitor }

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/'); setDropdownOpen(false) }

  const cycleTheme = () => {
    const order = ['system', 'dark', 'light']
    setTheme(order[(order.indexOf(theme) + 1) % order.length])
  }

  const ThemeIcon = THEME_ICONS[theme] || Monitor
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800'
          : 'bg-white/80 dark:bg-white dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-900'
      }`}
      style={{ fontFamily: 'Inter, system-ui' }}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
            InterviewAI
          </span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ThemeIcon className="w-4 h-4" />
          </button>

          {user ? (
            <>
              {/* New Interview */}
              <Link
                to="/interview/create"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />New Interview
              </Link>

              {/* Dashboard */}
              {location.pathname !== '/dashboard' && (
                <Link
                  to="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-800 hover:text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />Dashboard
                </Link>
              )}

              {/* User menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(p => !p)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {initials}
                  </div>
                  <span className="hidden sm:block text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[96px] truncate">
                    {user.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 w-52 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50"
                    >
                      {/* User info */}
                      <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => { navigate('/profile'); setDropdownOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-left"
                        >
                          <User className="w-3.5 h-3.5" />Profile
                        </button>
                        <button
                          onClick={() => { navigate('/dashboard'); setDropdownOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-left"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />Dashboard
                        </button>
                      </div>

                      {/* Theme */}
                      <div className="border-t border-zinc-200 dark:border-zinc-800 py-2 px-3">
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider mb-1.5">Theme</p>
                        <div className="flex gap-1">
                          {(['dark', 'light', 'system']).map((t) => {
                            const Icon = THEME_ICONS[t]
                            return (
                              <button
                                key={t}
                                onClick={() => setTheme(t)}
                                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] transition-all ${
                                  theme === t
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-400 dark:border-blue-600/30'
                                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                {t}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                        >
                          <LogOut className="w-3.5 h-3.5" />Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-800 hover:text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
