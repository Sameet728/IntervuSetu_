import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from './setup'

/**
 * Entrance choreography. Uses `from()` tweens so markup is visible on its own:
 * if scripts fail or motion is reduced, nothing stays hidden at opacity 0.
 *
 * Elements opt in with `data-enter`; siblings animate as one staggered group.
 */
export function usePageEnter(deps = []) {
  const scope = useRef(null)

  useEffect(() => {
    const root = scope.current
    if (!root || prefersReducedMotion()) return

    const targets = root.querySelectorAll('[data-enter]')
    if (!targets.length) return

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y: 14,
        duration: 0.55,
        ease: 'power3.out',
        stagger: { amount: 0.28, from: 'start' },
        clearProps: 'transform',
      })

      // Cards inside a group get a tighter, secondary stagger.
      root.querySelectorAll('[data-enter-group]').forEach((group) => {
        gsap.from(group.children, {
          opacity: 0,
          y: 12,
          scale: 0.985,
          duration: 0.5,
          delay: 0.12,
          ease: 'power2.out',
          stagger: { each: 0.06, from: 'start' },
          clearProps: 'transform',
        })
      })
    }, root)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return scope
}

/**
 * Scroll-linked reveals for content below the fold. Each `[data-reveal]`
 * element plays once; native scrolling is never hijacked.
 */
export function useScrollReveal(deps = []) {
  const scope = useRef(null)

  useEffect(() => {
    const root = scope.current
    if (!root || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      root.querySelectorAll('[data-reveal]').forEach((el) => {
        const stagger = Number(el.dataset.revealStagger || 0)
        gsap.from(el, {
          opacity: 0,
          y: Number(el.dataset.revealY ?? 22),
          duration: 0.65,
          ease: 'power3.out',
          stagger: stagger || undefined,
          clearProps: 'transform',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        })
      })
    }, root)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return scope
}

/**
 * Count a real value up when it becomes available. The element's final text is
 * written by the tween's onComplete, so reduced-motion users get the true
 * number immediately.
 */
export function useCountUp(value, { duration = 1, decimals = 0, prefix = '', suffix = '' } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      el.textContent = String(value ?? '')
      return
    }

    const render = (n) => {
      el.textContent = `${prefix}${n.toFixed(decimals)}${suffix}`
    }

    if (prefersReducedMotion()) {
      render(numeric)
      return
    }

    const state = { n: 0 }
    const tween = gsap.to(state, {
      n: numeric,
      duration,
      ease: 'power2.out',
      onUpdate: () => render(state.n),
      onComplete: () => render(numeric),
    })

    return () => tween.kill()
  }, [value, duration, decimals, prefix, suffix])

  return ref
}
