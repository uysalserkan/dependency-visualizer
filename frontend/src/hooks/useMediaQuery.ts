import { useEffect, useState } from 'react'

/**
 * Subscribes to a media query (e.g. (max-width: 767px) for max-md).
 * Returns true when the query matches (e.g. viewport is mobile).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const m = window.matchMedia(query)
    setMatches(m.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    m.addEventListener('change', handler)
    return () => m.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** True when viewport width < 768px (Tailwind max-md). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/** True when viewport width < 1024px (Tailwind max-lg). */
export function useIsCompact(): boolean {
  return useMediaQuery('(max-width: 1023px)')
}

const STABLE_MOBILE_DELAY_MS = 150

/**
 * Like useIsMobile but only flips to true after the viewport has been mobile for a short delay.
 * Use this for mounting heavy mobile-only UI (e.g. BottomSheet) to avoid "getValue" / store
 * errors during the exact resize moment when layout and refs are in flux.
 */
export function useStableIsMobile(): boolean {
  const isMobile = useIsMobile()
  const [stable, setStable] = useState(() => isMobile)

  useEffect(() => {
    if (isMobile) {
      const t = setTimeout(() => setStable(true), STABLE_MOBILE_DELAY_MS)
      return () => clearTimeout(t)
    } else {
      setStable(false)
    }
  }, [isMobile])

  return stable
}
