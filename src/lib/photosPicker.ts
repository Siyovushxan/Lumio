/* Google Photos Picker API (2025+ siyosat uchun) */

const API = 'https://photospicker.googleapis.com/v1'

export interface PickerSession {
  id: string
  pickerUri: string
  pollingConfig?: { pollInterval: string; timeoutIn: string }
  mediaItemsSet: boolean
  expireTime?: string
}

export interface PickedItem {
  id: string
  createTime?: string
  type?: string
  mediaFile?: {
    baseUrl: string
    mimeType: string
    filename: string
    mediaFileMetadata?: {
      width?: string
      height?: string
      photoMetadata?: { creationTime?: string }
    }
  }
}

export interface PickerStats {
  totalPhotos: number
  yearsTracked: number
  yearlyBreakdown: Record<string, number>
  seasonBreakdown: { winter: number; spring: number; summer: number; autumn: number }
  topMonths: string[]
  monthBreakdown: Record<string, number>
  lastAnalyzed: number
}

export async function createPickerSession(token: string): Promise<PickerSession> {
  const res = await fetch(`${API}/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(`Picker create ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function getPickerSession(token: string, id: string): Promise<PickerSession> {
  const res = await fetch(`${API}/sessions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Picker get ${res.status}`)
  return res.json()
}

export async function deletePickerSession(token: string, id: string): Promise<void> {
  try {
    await fetch(`${API}/sessions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch { /* ignore cleanup errors */ }
}

export async function listPickedItems(
  token: string,
  sessionId: string,
  pageToken?: string
): Promise<{ items: PickedItem[]; nextPageToken?: string }> {
  const url = new URL(`${API}/mediaItems`)
  url.searchParams.set('sessionId', sessionId)
  url.searchParams.set('pageSize', '100')
  if (pageToken) url.searchParams.set('pageToken', pageToken)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Picker items ${res.status}`)
  const data = await res.json()
  return { items: (data.mediaItems || []) as PickedItem[], nextPageToken: data.nextPageToken }
}

/** Foydalanuvchi tanlab tugatguncha session statusni so'rab turadi */
export async function pollUntilPicked(
  token: string,
  sessionId: string,
  opts: { intervalMs?: number; timeoutMs?: number; onTick?: () => void } = {}
): Promise<PickerSession> {
  const interval = opts.intervalMs ?? 1500
  const timeout = opts.timeoutMs ?? 30 * 60 * 1000
  const start = Date.now()
  while (Date.now() - start < timeout) {
    await new Promise((r) => setTimeout(r, interval))
    opts.onTick?.()
    const s = await getPickerSession(token, sessionId)
    if (s.mediaItemsSet) return s
  }
  throw new Error('PICKER_TIMEOUT')
}

function seasonOf(month: number): 'winter' | 'spring' | 'summer' | 'autumn' {
  if (month <= 2 || month === 12) return 'winter'
  if (month <= 5) return 'spring'
  if (month <= 8) return 'summer'
  return 'autumn'
}

export function computePickerStats(items: PickedItem[]): PickerStats {
  const yearly: Record<string, number> = {}
  const monthly: Record<string, number> = {}
  const seasons = { winter: 0, spring: 0, summer: 0, autumn: 0 }

  for (const it of items) {
    const t = it.createTime
      || it.mediaFile?.mediaFileMetadata?.photoMetadata?.creationTime
    if (!t) continue
    const d = new Date(t)
    if (isNaN(d.getTime())) continue
    const y = String(d.getFullYear())
    const m = d.getMonth() + 1
    yearly[y] = (yearly[y] || 0) + 1
    monthly[String(m)] = (monthly[String(m)] || 0) + 1
    seasons[seasonOf(m)]++
  }

  const total = items.length
  const seasonPcts = {
    winter: total ? Math.round((seasons.winter / total) * 100) : 0,
    spring: total ? Math.round((seasons.spring / total) * 100) : 0,
    summer: total ? Math.round((seasons.summer / total) * 100) : 0,
    autumn: total ? Math.round((seasons.autumn / total) * 100) : 0,
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const topMonths = Object.entries(monthly)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => monthNames[Number(m) - 1])

  return {
    totalPhotos: total,
    yearsTracked: Object.keys(yearly).length,
    yearlyBreakdown: yearly,
    seasonBreakdown: seasonPcts,
    topMonths,
    monthBreakdown: monthly,
    lastAnalyzed: Date.now(),
  }
}

const SESSION_KEY = 'lumio_picker_session_id'
export const PickerStore = {
  setSession: (id: string) => sessionStorage.setItem(SESSION_KEY, id),
  getSession: () => sessionStorage.getItem(SESSION_KEY),
  clearSession: () => sessionStorage.removeItem(SESSION_KEY),
}
