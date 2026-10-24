import { useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'

const READ = (name, fallback) => {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw ? `rgb(${raw})` : fallback
}

/**
 * Resolves chart colours from the live CSS custom properties so SVG-based
 * visualisations follow the theme instead of carrying their own hex values.
 */
export function useChartColors() {
  const { applied } = useTheme()

  return useMemo(() => ({
    accent: READ('--a-500', '#5854D6'),
    accentSoft: READ('--a-400', '#6A65E2'),
    grid: READ('--hairline', '#E4E1DA'),
    axis: READ('--ink-faint', '#8E949F'),
    surface: READ('--surface', '#FFFFFF'),
    ink: READ('--ink', '#101318'),
    success: READ('--success-500', '#0E7A52'),
    warning: READ('--warning-500', '#B07408'),
    danger: READ('--danger-500', '#BC2C22'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [applied])
}
