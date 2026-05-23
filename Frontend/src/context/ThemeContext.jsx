import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Load user override from localStorage, fallback to 'system'
    return localStorage.getItem('theme') || 'system'
  })

  // Resolve the actual applied theme (dark|light) based on system pref
  const getApplied = (t) => {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return t
  }

  const [applied, setApplied] = useState(() => getApplied(localStorage.getItem('theme') || 'system'))

  const applyTheme = (t) => {
    const resolved = getApplied(t)
    setApplied(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.classList.toggle('light', resolved === 'light')
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, applied, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
