import { useEffect, useRef, useState } from 'react'

interface Props {
  to: number
  dur?: number
  start?: number
  format?: (n: number) => string
}

export default function CountUp({ to, dur = 1400, start = 0, format = (n) => n.toLocaleString('en-US') }: Props) {
  const [n, setN] = useState(start)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let t0 = 0
    let started = false
    const begin = () => {
      if (started) return
      started = true
      const step = (t: number) => {
        if (!t0) t0 = t
        const p = Math.min(1, (t - t0) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        setN(Math.round(start + (to - start) * eased))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    let io: IntersectionObserver | undefined
    try {
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { begin(); io?.disconnect() }
      }, { threshold: 0.2 })
      if (ref.current) io.observe(ref.current)
    } catch {}
    const fb = setTimeout(begin, 250)
    return () => { io?.disconnect(); cancelAnimationFrame(raf); clearTimeout(fb) }
  }, [to, dur, start])

  return <span ref={ref}>{format(n)}</span>
}
