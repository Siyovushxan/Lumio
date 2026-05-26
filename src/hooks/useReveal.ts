import { useEffect } from 'react'

export function useReveal(deps: any[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.in)'))
    const fired = new Set<HTMLElement>()
    let io: IntersectionObserver | undefined

    try {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('in')
            fired.add(e.target as HTMLElement)
            io?.unobserve(e.target)
          }
        })
      }, { threshold: 0.1 })
      els.forEach((el) => io?.observe(el))
    } catch {}

    const onScroll = () => {
      const vh = window.innerHeight
      els.forEach((el) => {
        if (fired.has(el)) return
        const r = el.getBoundingClientRect()
        if (r.top < vh * 0.9 && r.bottom > 0) {
          el.classList.add('in')
          fired.add(el)
        }
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    const safety = setTimeout(() => els.forEach((el) => el.classList.add('in')), 1200)

    return () => {
      io?.disconnect()
      window.removeEventListener('scroll', onScroll)
      clearTimeout(safety)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
