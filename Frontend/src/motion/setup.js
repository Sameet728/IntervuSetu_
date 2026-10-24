import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

const QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches
}

/** Live subscription for components that need to re-run when the OS setting changes. */
export function onReducedMotionChange(handler) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

/**
 * Refresh triggers after an async layout change (data arriving, a panel
 * opening) so start/end positions stay correct across viewport sizes.
 */
export function refreshReveals() {
  if (prefersReducedMotion()) return
  requestAnimationFrame(() => ScrollTrigger.refresh())
}
