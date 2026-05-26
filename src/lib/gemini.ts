/* AI provider — Groq (OpenAI-compatible).
   Fayl tarixiy nomi gemini.ts deb qoldi. Eski export'lar saqlangan. */

import { getAccessToken } from './googlePhotos'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

const TEXT_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it']
const VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-3.2-11b-vision-preview',
]
const TEXT_CACHE = 'lumio_groq_text_model'
const VISION_CACHE = 'lumio_groq_vision_model'

interface GroqResponse {
  choices?: { message: { content: string } }[]
  error?: { message: string; type?: string; code?: string }
}

async function callGroq(model: string, messages: any[], opts: { temperature?: number; max_tokens?: number; response_format?: any } = {}): Promise<string> {
  if (!GROQ_KEY) throw new Error('VITE_GROQ_API_KEY not set')
  const body: any = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 600,
  }
  if (opts.response_format) body.response_format = opts.response_format

  let res: Response
  try {
    res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify(body),
    })
  } catch (e: any) {
    throw new Error('NETWORK_BLOCKED: ' + (e?.message || 'Failed to reach Groq'))
  }
  const data: GroqResponse = await res.json()
  if (!res.ok || data.error) {
    const msg = data.error?.message || `HTTP ${res.status}`
    const code = data.error?.code || ''
    const isModelIssue = code === 'model_not_found' || /not found|decommissioned|does not exist/i.test(msg)
    throw new Error((isModelIssue ? 'MODEL_NOT_FOUND: ' : '') + msg)
  }
  return data.choices?.[0]?.message?.content?.trim() || ''
}

async function tryModels(models: string[], cacheKey: string, callFn: (model: string) => Promise<string>): Promise<string> {
  const cached = sessionStorage.getItem(cacheKey)
  const order = cached ? [cached, ...models.filter((m) => m !== cached)] : models
  let lastErr: Error | null = null
  for (const m of order) {
    try {
      const result = await callFn(m)
      if (result) {
        sessionStorage.setItem(cacheKey, m)
        return result
      }
    } catch (e: any) {
      lastErr = e
      const msg = String(e?.message || '')
      if (msg.includes('MODEL_NOT_FOUND')) {
        if (cached === m) sessionStorage.removeItem(cacheKey)
        continue
      }
      throw e
    }
  }
  throw lastErr || new Error('All models failed')
}

/* ============ TEXT API ============ */

export async function generateText(prompt: string, system?: string): Promise<string> {
  const messages: any[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })
  return tryModels(TEXT_MODELS, TEXT_CACHE, (model) =>
    callGroq(model, messages, { temperature: 0.7, max_tokens: 600 })
  )
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

/* ============ VISION ============ */

async function imageToBase64(baseUrl: string, size = 'w800-h800', isLocal = false): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (isLocal || baseUrl.startsWith('data:')) {
      const m = baseUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (m) return { mimeType: m[1] || 'image/jpeg', data: m[2] }
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

export async function generateStoryFromPhotos(opts: {
  title: string
  style: string
  lang: 'en' | 'uz' | 'ru'
  photos: { id: string; baseUrl: string; local?: boolean }[]
  onProgress?: (done: number, total: number) => void
}): Promise<{ chapters: { era: string; text: string; photoId: string }[] }> {
  if (!GROQ_KEY) throw new Error('VITE_GROQ_API_KEY not set')

  const langName = opts.lang === 'uz' ? "O'zbek" : opts.lang === 'ru' ? 'Russian' : 'English'
  const styleHints: Record<string, string> = {
    children: "A magical children's fairy-tale. Talking animals, clouds, dreams. Soft and wondrous.",
    romantic: 'A tender romantic narrative. Warm and intimate.',
    poetic: 'A poetic, dreamlike narrative with rich metaphors.',
    bio: 'A biographical narrative — warm, grounded, true to life.',
  }
  const styleHint = styleHints[opts.style] || styleHints.children

  const chapters: { era: string; text: string; photoId: string }[] = []
  const photos = opts.photos.slice(0, 12)

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i]
    const img = await imageToBase64(p.baseUrl, 'w512-h512', !!p.local)
    if (!img) {
      chapters.push({ era: `Chapter ${i + 1}`, text: '', photoId: p.id })
      opts.onProgress?.(i + 1, photos.length)
      continue
    }

    const imageDataUrl = `data:${img.mimeType};base64,${img.data}`
    const promptText = `You are a storyteller writing the album "${opts.title}". Style: ${styleHint} Language: ${langName}. Look at the photo carefully. Invent a short fairy-tale chapter (2-3 sentences, max 280 chars) where the photo IS the illustration — describe what is happening as a scene from your tale (e.g. "the boy soared above the clouds in a tiny airplane made of dreams"). Return ONLY valid JSON: {"era":"3-5 word chapter title","text":"the narrative"}.`

    try {
      const raw = await tryModels(VISION_MODELS, VISION_CACHE, (model) =>
        callGroq(
          model,
          [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          }],
          { temperature: 0.95, max_tokens: 400, response_format: { type: 'json_object' } }
        )
      )

      let parsed: { era?: string; text?: string } = {}
      try {
        parsed = JSON.parse(raw)
      } catch {
        const jsonMatch = raw.match(/\{[\s\S]*?\}/)
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]) } catch { /* fallback below */ }
        }
        if (!parsed.text) {
          const eraMatch = raw.match(/"era"\s*:\s*"([^"]+)"/)
          const textMatch = raw.match(/"text"\s*:\s*"([^"]+)"/)
          parsed = {
            era: eraMatch?.[1],
            text: textMatch?.[1] || raw.replace(/[{}"`]/g, '').slice(0, 280),
          }
        }
      }
      chapters.push({
        era: parsed.era || `Chapter ${i + 1}`,
        text: parsed.text || '',
        photoId: p.id,
      })
    } catch (e: any) {
      console.warn(`Story chapter ${i + 1} failed:`, e?.message)
      chapters.push({ era: `Chapter ${i + 1}`, text: '', photoId: p.id })
    }
    opts.onProgress?.(i + 1, photos.length)
  }

  return { chapters }
}
