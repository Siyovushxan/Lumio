import { useEffect, useState } from 'react'

let toastFn: ((msg: string) => void) | null = null

export function showToast(msg: string) {
  toastFn?.(msg)
}

export default function Toast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    toastFn = (m) => {
      setMsg(m)
      setVisible(true)
      setTimeout(() => setVisible(false), 3000)
    }
    return () => { toastFn = null }
  }, [])

  if (!visible) return null
  return <div className="toast">{msg}</div>
}
