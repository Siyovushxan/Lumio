/* Google Photos Library API — real ulanish */

const PHOTOS_API = 'https://photoslibrary.googleapis.com/v1/mediaItems'

export interface PhotoMeta {
  id: string
  filename: string
  baseUrl: string
  mimeType: string
  creationTime: string  // ISO date
  width: number
  height: number
}

export interface PhotosFetchResult {
  photos: PhotoMeta[]
  pageToken?: string
}

export interface RealStats {
  totalPhotos: number
  yearsTracked: number
  yearlyBreakdown: Record<string, number>
  seasonBreakdown: { winter: number; spring: number; summer: number; autumn: number }
  topMonths: string[]
  monthBreakdown: Record<string, number>
  lastAnalyzed: number
}

/** Access token'ni sessionStorage'dan oladi */
export function getAccessToken(): string | null {
  return sessionStorage.getItem('google_access_token')
}

/** Token'da kerakli photos scope bor-yo'qligini tekshiradi */
export async function verifyPhotosScope(token: string, kind: 'photoslibrary' | 'photospicker' = 'photoslibrary'): Promise<boolean> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`)
    if (!res.ok) return false
    const data = await res.json()
    const scope: string = data.scope || ''
    return scope.includes(kind)
  } catch {
    return false
  }
}

export function setAccessToken(token: string) {
  sessionStorage.setItem('google_access_token', token)
  sessionStorage.setItem('google_token_at', String(Date.now()))
}

export function clearAccessToken() {
  sessionStorage.removeItem('google_access_token')
  sessionStorage.removeItem('google_token_at')
}

/** Bir sahifa media itemlarini olib keladi (maks. 100 ta) */
export async function fetchPhotosPage(token: string, pageToken?: string): Promise<PhotosFetchResult> {
  const url = new URL(PHOTOS_API)
  url.searchParams.set('pageSize', '100')
  if (pageToken) url.searchParams.set('pageToken', pageToken)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Photos API ${res.status}: ${text || res.statusText}`)
  }

  const data = await res.json()
  const items: PhotoMeta[] = (data.mediaItems || []).map((it: any) => ({
    id: it.id,
    filename: it.filename,
    baseUrl: it.baseUrl,
    mimeType: it.mimeType,
    creationTime: it.mediaMetadata?.creationTime,
    width: Number(it.mediaMetadata?.width || 0),
    height: Number(it.mediaMetadata?.height || 0),
  }))
  return { photos: items, pageToken: data.nextPageToken }
}

/** Hammasini (yoki maks. N sahifani) yig'adi va statistika hisoblaydi */
export async function analyzeAllPhotos(
  token: string,
  maxPages = 10,
  onProgress?: (count: number, page: number) => void
): Promise<RealStats> {
  const all: PhotoMeta[] = []
  let nextToken: string | undefined

  for (let i = 0; i < maxPages; i++) {
    const { photos, pageToken } = await fetchPhotosPage(token, nextToken)
    all.push(...photos)
    onProgress?.(all.length, i + 1)
    if (!pageToken) break
    nextToken = pageToken
  }

  return computeStats(all)
}

function seasonOf(month: number): keyof RealStats['seasonBreakdown'] {
  if (month <= 2 || month === 12) return 'winter'
  if (month <= 5) return 'spring'
  if (month <= 8) return 'summer'
  return 'autumn'
}

export function computeStats(photos: PhotoMeta[]): RealStats {
  const yearly: Record<string, number> = {}
  const monthly: Record<string, number> = {}
  const seasons = { winter: 0, spring: 0, summer: 0, autumn: 0 }

  for (const p of photos) {
    if (!p.creationTime) continue
    const d = new Date(p.creationTime)
    if (isNaN(d.getTime())) continue
    const y = String(d.getFullYear())
    const m = d.getMonth() + 1
    yearly[y] = (yearly[y] || 0) + 1
    monthly[String(m)] = (monthly[String(m)] || 0) + 1
    seasons[seasonOf(m)]++
  }

  const total = photos.length
  const seasonPcts = {
    winter: total ? Math.round((seasons.winter / total) * 100) : 0,
    spring: total ? Math.round((seasons.spring / total) * 100) : 0,
    summer: total ? Math.round((seasons.summer / total) * 100) : 0,
    autumn: total ? Math.round((seasons.autumn / total) * 100) : 0,
  }
  const yearsTracked = Object.keys(yearly).length
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const topMonths = Object.entries(monthly)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => monthNames[Number(m) - 1])

  return {
    totalPhotos: total,
    yearsTracked,
    yearlyBreakdown: yearly,
    seasonBreakdown: seasonPcts,
    topMonths,
    monthBreakdown: monthly,
    lastAnalyzed: Date.now(),
  }
}
