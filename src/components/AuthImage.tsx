import { useEffect, useState } from 'react'
import { getAccessToken } from '../lib/googlePhotos'

const cache = new Map<string, string>()

interface Props {
  baseUrl: string
  size?: string
  alt?: string
  style?: React.CSSProperties
  fallback?: React.ReactNode
  local?: boolean
}

export default function AuthImage({ baseUrl, size = 'w400-h300-c', alt = '', style, fallback, local }: Props) {
  const isLocal = local || baseUrl.startsWith('data:') || baseUrl.startsWith('blob:')
  const cacheKey = isLocal ? baseUrl : `${baseUrl}=${size}`
  const [url, setUrl] = useState<string>(isLocal ? baseUrl : (cache.get(cacheKey) || ''))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (isLocal) { setUrl(baseUrl); return }
    if (cache.has(cacheKey)) { setUrl(cache.get(cacheKey)!); return }
    const token = getAccessToken()
    if (!token || !baseUrl) { setFailed(true); return }

    let cancelled = false
    fetch(cacheKey, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.blob() : null)
      .then((blob) => {
        if (cancelled) return
        if (!blob) { setFailed(true); return }
        const obj = URL.createObjectURL(blob)
        cache.set(cacheKey, obj)
        setUrl(obj)
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true }
  }, [cacheKey, isLocal])

  if (failed || !url) {
    return <>{fallback || <div style={{ ...style, background: 'var(--bg-elev)' }} />}</>
  }
  return <img src={url} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />
}

export function clearAuthImageCache() {
  cache.forEach((url) => { try { URL.revokeObjectURL(url) } catch {} })
  cache.clear()
}
