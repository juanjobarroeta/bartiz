import { useEffect, useState } from 'react'

/**
 * Reports whether the viewport matches a phone-width media query. Used to
 * mount the mobile PWA shell instead of the desktop layout on phones.
 * Initialized synchronously from matchMedia so there's no desktop flash.
 */
export function useIsMobile(query = '(max-width: 768px)') {
  const read = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false

  const [isMobile, setIsMobile] = useState(read)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
