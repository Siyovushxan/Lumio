/* Google Gemini API — avtomatik model aniqlash bilan */

const API = 'https://generativelanguage.googleapis.com/v1beta'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL_CACHE_KEY = 'lumio_gemini_model'

interface GeminiResponse {
  candidates?: { content: { parts: { text: string }[] } }[]
  error?: { message: string; status?: string }
}

interface ModelInfo {
  name: string
  supportedGenerationMethods?: string[]
}

/** Mavjud modellardan generateContent qo'llab-quvvatlaydiganini topadi */
async function discoverModel(): Promise<string> {
  const cached = sessionStorage.getItem(MODEL_CACHE_KEY)
  if (cached) return cached

  let res: Response
  try {
    res = await fetch(`${API}/models?key=${API_KEY}`)
  } catch (e: any) {
    // Network/firewall/region blok
    throw new Error('NETWORK_BLOCKED: ' + (e?.message || 'Failed to reach Gemini API'))
  }
  if (!res.ok) throw new Error(`ListModels HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  const models: ModelInfo[] = data.models || []

  // Prefer modern fast models — sort by name patterns
  const priority = [
    /gemini-2\.5-flash/,
    /gemini-2\.0-flash$/,
    /gemini-2\.0-flash-001/,
    /gemini-2\.5-pro/,
    /gemini-1\.5-flash-002/,
    /gemini-1\.5-flash$/,
    /gemini-1\.5-flash-latest/,
    /gemini-flash-latest/,
    /gemini-1\.5-pro/,
  ]

  const supports = (m: ModelInfo) => m.supportedGenerationMethods?.includes('generateContent')

  for (const re of priority) {
    const found = models.find((m) => re.test(m.name) && supports(m))
    if (found) {
      const name = found.name.replace(/^models\//, '')
      sessionStorage.setItem(MODEL_CACHE_KEY, name)
      return name
    }
  }
  // Fallback: any model supporting generateContent
  const any = models.find(supports)
  if (any) {
    const name = any.name.replace(/^models\//, '')
    sessionStorage.setItem(MODEL_CACHE_KEY, name)
    return name
  }
  throw new Error('No Gemini model supports generateContent for this API key')
}

export async function generateText(prompt: string, system?: string): Promise<string> {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY not set')

  const model = await discoverModel()

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
  }

  const res = await fetch(`${API}/models/${model}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data: GeminiResponse = await res.json()
  if (!res.ok || data.error) {
    // Agar cached model endi ishlamasa — keshni tozalab keyingisida qayta aniqlanadi
    if (res.status === 404 || res.status === 400) sessionStorage.removeItem(MODEL_CACHE_KEY)
    throw new Error(data.error?.message || `HTTP ${res.status}`)
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

export async function generateInsight(stats: {
  totalPhotos: number
  topMonths: string[]
  seasonBreakdown: { winter: number; spring: number; summer: number; autumn: number }
  yearsTracked: number
}, lang: 'en' | 'uz' | 'ru' = 'uz'): Promise<string> {
  const langName = lang === 'uz' ? "O'zbek" : lang === 'ru' ? 'Russian' : 'English'
  const sys = `You are an empathetic photo-library narrator for Lumio. Write ONE short insight (1-2 sentences, max 180 chars) in ${langName} about the user's photo habits. No emojis, no quotes, plain text.`
  const seasonTop = Object.entries(stats.seasonBreakdown).sort((a, b) => b[1] - a[1])[0]
  const usr = `User has ${stats.totalPhotos} photos across ${stats.yearsTracked} years. Top months: ${stats.topMonths.join(', ')}. Most photos in ${seasonTop[0]} (${seasonTop[1]}%).`
  return generateText(usr, sys)
}

export async function editAlbumCommand(prompt: string, lang: 'en' | 'uz' | 'ru' = 'uz'): Promise<string> {
  const langName = lang === 'uz' ? "O'zbek" : lang === 'ru' ? 'Russian' : 'English'
  const sys = `You are an album editor AI for Lumio. The user gives a command to edit a photo album. Respond briefly (1 sentence, max 120 chars) in ${langName} confirming what was done. No emojis.`
  return generateText(prompt, sys)
}

export async function generateChapter(opts: {
  personName: string
  era: string
  style: string
  lang: 'en' | 'uz' | 'ru'
}): Promise<string> {
  const langName = opts.lang === 'uz' ? "O'zbek" : opts.lang === 'ru' ? 'Russian' : 'English'
  const sys = `You are a tender narrator. Write a ${opts.style} short chapter (2-3 sentences) in ${langName} about ${opts.personName}'s life during "${opts.era}". Warm, literary, no emojis, no quotes.`
  return generateText(`Write chapter for ${opts.personName} — ${opts.era}.`, sys)
}

import { getAccessToken } from './googlePhotos'

/** Rasm baseUrl'ini base64'ga aylantiradi (picker yoki local) */
async function imageToBase64(baseUrl: string, size = 'w800-h800', isLocal = false): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Local data URL — to'g'ridan-to'g'ri parse qilamiz
    if (isLocal || baseUrl.startsWith('data:')) {
      const m = baseUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (m) return { mimeType: m[1] || 'image/jpeg', data: m[2] }
      // blob: URL — fetch qilamiz auth'siz
    }
    const url = isLocal || baseUrl.startsWith('blob:') || baseUrl.startsWith('data:') ? baseUrl : `${baseUrl}=${size}`
    const headers: HeadersInit = {}
    if (!isLocal && !baseUrl.startsWith('blob:') && !baseUrl.startsWith('data:')) {
      const token = getAccessToken()
      if (!token) return null
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const blob = await res.blob()
    const mimeType = blob.type || 'image/jpeg'
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return { data, mimeType }
  } catch {
    return null
  }
}

/** Rasmlardan AI ertak yaratish — Gemini Vision orqali */
export async function generateStoryFromPhotos(opts: {
  title: string
  style: string                       // children / romantic / poetic / bio
  lang: 'en' | 'uz' | 'ru'
  photos: { id: string; baseUrl: string; local?: boolean }[]
  onProgress?: (done: number, total: number) => void
}): Promise<{ chapters: { era: string; text: string; photoId: string }[] }> {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY not set')

  const model = await discoverModel()
  const langName = opts.lang === 'uz' ? "O'zbek" : opts.lang === 'ru' ? 'Russian' : 'English'

  const styleHints: Record<string, string> = {
    children:  'A magical children\'s fairy-tale. Talking animals, clouds, dreams. Soft and wondrous.',
    romantic:  'A tender romantic narrative. Warm and intimate.',
    poetic:    'A poetic, dreamlike narrative with rich metaphors.',
    bio:       'A biographical narrative — warm, grounded, true to life.',
  }
  const styleHint = styleHints[opts.style] || styleHints.children

  const chapters: { era: string; text: string; photoId: string }[] = []
  // Bitta-bittadan Vision so'rovi (token tejash uchun rasm soni cheklangan)
  const photos = opts.photos.slice(0, 12)

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i]
    const img = await imageToBase64(p.baseUrl, 'w512-h512', !!p.local)
    if (!img) { opts.onProgress?.(i + 1, photos.length); continue }

    const sys = `You are a storyteller writing the album "${opts.title}". Style: ${styleHint} Language: ${langName}. For the photo, invent a short fairy-tale chapter (2-3 sentences, max 280 chars). The photo IS an illustration of this chapter — describe what is happening as if the photo is a scene from your tale (e.g. "the boy soared above the clouds in a tiny airplane made of dreams"). Return JSON: {"era":"chapter title (3-5 words)","text":"narrative"} — no markdown, just raw JSON.`

    const body = {
      contents: [{
        parts: [
          { inlineData: { mimeType: img.mimeType, data: img.data } },
          { text: 'Write the chapter for this photo.' },
        ],
      }],
      systemInstruction: { parts: [{ text: sys }] },
      generationConfig: { temperature: 0.95, maxOutputTokens: 400, responseMimeType: 'application/json' },
    }

    try {
      const res = await fetch(`${API}/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: GeminiResponse = await res.json()
      if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`)
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      // Try parse JSON
      let parsed: { era?: string; text?: string } = {}
      try { parsed = JSON.parse(raw) } catch {
        // Fallback — extract era/text via regex
        const eraMatch = raw.match(/"era"\s*:\s*"([^"]+)"/)
        const textMatch = raw.match(/"text"\s*:\s*"([^"]+)"/)
        parsed = { era: eraMatch?.[1], text: textMatch?.[1] || raw.slice(0, 280) }
      }
      chapters.push({
        era: parsed.era || `Chapter ${i + 1}`,
        text: parsed.text || '',
        photoId: p.id,
      })
    } catch (e) {
      console.warn(`Story chapter ${i + 1} failed:`, e)
      chapters.push({ era: `Chapter ${i + 1}`, text: '', photoId: p.id })
    }
    opts.onProgress?.(i + 1, photos.length)
  }

  return { chapters }
}
