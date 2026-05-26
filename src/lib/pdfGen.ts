/* PDF generatsiya — magazine-style wow-effekt layoutlar.
   Picker URLs uchun Bearer token bilan fetch qilamiz. */

import jsPDF from 'jspdf'
import { PickedPhoto, StoryChapter } from '../store/useStore'
import { getAccessToken } from './googlePhotos'

interface LoadedImage { data: string; w: number; h: number }

const imgCache = new Map<string, LoadedImage | null>()

async function loadImage(url: string, useAuth: boolean): Promise<LoadedImage | null> {
  if (imgCache.has(url)) return imgCache.get(url)!
  try {
    const headers: HeadersInit = {}
    if (useAuth) {
      const token = getAccessToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(url, { headers })
    if (!res.ok) { imgCache.set(url, null); return null }
    const blob = await res.blob()
    const result = await new Promise<LoadedImage | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => resolve({ data: reader.result as string, w: img.width, h: img.height })
        img.onerror = () => resolve(null)
        img.src = reader.result as string
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    imgCache.set(url, result)
    return result
  } catch {
    imgCache.set(url, null)
    return null
  }
}

/* ============ COLOR PALETTE ============ */
const COL = {
  ink: [10, 9, 8] as [number, number, number],
  cream: [245, 239, 224] as [number, number, number],
  gold: [212, 165, 116] as [number, number, number],
  goldLight: [236, 200, 146] as [number, number, number],
  goldDeep: [139, 106, 62] as [number, number, number],
  dim: [182, 174, 159] as [number, number, number],
  mute: [111, 104, 93] as [number, number, number],
}

/* ============ HELPERS ============ */
function drawImageCover(doc: jsPDF, img: LoadedImage, x: number, y: number, w: number, h: number) {
  const ratioImg = img.w / img.h
  const ratioBox = w / h
  let dw = w, dh = h, dx = x, dy = y
  if (ratioImg > ratioBox) {
    dw = h * ratioImg
    dx = x - (dw - w) / 2
  } else {
    dh = w / ratioImg
    dy = y - (dh - h) / 2
  }
  // Clipping via rectangle path
  const internal = doc as any
  internal.saveGraphicsState?.()
  doc.rect(x, y, w, h).clip().discardPath()
  doc.addImage(img.data, 'JPEG', dx, dy, dw, dh, undefined, 'FAST')
  internal.restoreGraphicsState?.()
}

function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(x, y, w, h, 'F')
}

function setText(doc: jsPDF, color: [number, number, number], size: number, style: 'normal' | 'bold' | 'italic' = 'normal') {
  doc.setTextColor(color[0], color[1], color[2])
  doc.setFontSize(size)
  doc.setFont('helvetica', style)
}

function drawDivider(doc: jsPDF, x: number, y: number, w: number, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(0.3)
  doc.line(x, y, x + w, y)
}

/* ============ LAYOUTS ============ */
function layoutCover(doc: jsPDF, pageW: number, pageH: number, title: string, subtitle: string, heroImg: LoadedImage | null) {
  // Full-bleed hero photo
  if (heroImg) {
    drawImageCover(doc, heroImg, 0, 0, pageW, pageH)
  } else {
    fillRect(doc, 0, 0, pageW, pageH, COL.ink)
  }

  // Heavy dark gradient overlay from bottom for text legibility
  for (let i = 0; i < 30; i++) {
    const op = 0.02 + i * 0.025
    ;(doc as any).setGState?.(new (doc as any).GState({ opacity: Math.min(op, 0.85) }))
    doc.setFillColor(10, 9, 8)
    doc.rect(0, pageH - 130 + i * 4.3, pageW, 5, 'F')
  }
  ;(doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }))

  // Top decorative frame
  doc.setDrawColor(...COL.gold)
  doc.setLineWidth(0.4)
  doc.line(20, 22, 60, 22)
  doc.line(pageW - 60, 22, pageW - 20, 22)
  setText(doc, COL.gold, 8)
  doc.setFont('helvetica', 'normal')
  doc.text('L  U  M  I  O', pageW / 2, 24, { align: 'center' })

  // Volume number (top right)
  setText(doc, COL.gold, 7)
  doc.text('VOL.  I', pageW - 16, 32, { align: 'right' })

  // Year (top left)
  setText(doc, COL.gold, 7)
  doc.text(String(new Date().getFullYear()), 16, 32)

  // Main title — bottom left, big
  const titleY = pageH - 56
  setText(doc, COL.cream, 42, 'normal')
  const titleLines = doc.splitTextToSize(title, pageW - 40)
  let yOff = titleY - (titleLines.length - 1) * 14
  doc.text(titleLines, 20, yOff)
  yOff += titleLines.length * 14

  // Gold separator line
  doc.setDrawColor(...COL.gold)
  doc.setLineWidth(0.5)
  doc.line(20, yOff + 4, 60, yOff + 4)

  // Subtitle italic
  if (subtitle) {
    setText(doc, COL.dim, 10, 'italic')
    doc.text(subtitle, 20, yOff + 14)
  }

  // Bottom right: "A book by Lumio"
  setText(doc, COL.gold, 8, 'italic')
  doc.text('a book by  L u m i o', pageW - 20, pageH - 18, { align: 'right' })
}

function layoutHero(doc: jsPDF, pageW: number, pageH: number, img: LoadedImage | null, caption: string) {
  fillRect(doc, 0, 0, pageW, pageH, COL.cream)
  // Photo with margin
  const margin = 16
  const photoH = pageH * 0.72
  if (img) drawImageCover(doc, img, margin, margin, pageW - margin * 2, photoH)
  else { fillRect(doc, margin, margin, pageW - margin * 2, photoH, [220, 210, 195]) }

  // Caption block
  setText(doc, COL.goldDeep, 8)
  doc.text('— CHAPTER —', pageW / 2, photoH + margin + 14, { align: 'center' })
  setText(doc, COL.ink, 14, 'italic')
  const lines = doc.splitTextToSize(caption, pageW - margin * 4)
  doc.text(lines, pageW / 2, photoH + margin + 26, { align: 'center' })
}

function layoutDuo(doc: jsPDF, pageW: number, pageH: number, imgA: LoadedImage | null, imgB: LoadedImage | null, label?: string) {
  fillRect(doc, 0, 0, pageW, pageH, COL.cream)
  const margin = 12
  const gap = 6
  const colW = (pageW - margin * 2 - gap) / 2
  const photoH = pageH * 0.78
  if (imgA) drawImageCover(doc, imgA, margin, margin + 14, colW, photoH)
  else fillRect(doc, margin, margin + 14, colW, photoH, [220, 210, 195])
  if (imgB) drawImageCover(doc, imgB, margin + colW + gap, margin + 14, colW, photoH)
  else fillRect(doc, margin + colW + gap, margin + 14, colW, photoH, [220, 210, 195])

  // Top label
  setText(doc, COL.goldDeep, 8)
  doc.text(label || 'TWO MOMENTS', pageW / 2, margin + 8, { align: 'center' })
}

function layoutMosaic(doc: jsPDF, pageW: number, pageH: number, imgs: (LoadedImage | null)[]) {
  fillRect(doc, 0, 0, pageW, pageH, COL.ink)
  const margin = 10
  const gap = 4
  const innerW = pageW - margin * 2
  const innerH = pageH - margin * 2
  // 1 large left + 3 small right
  const largeW = innerW * 0.62
  const smallW = innerW - largeW - gap
  const smallH = (innerH - gap * 2) / 3

  if (imgs[0]) drawImageCover(doc, imgs[0]!, margin, margin, largeW, innerH)
  else fillRect(doc, margin, margin, largeW, innerH, [40, 35, 30])

  for (let i = 0; i < 3; i++) {
    const x = margin + largeW + gap
    const y = margin + i * (smallH + gap)
    if (imgs[i + 1]) drawImageCover(doc, imgs[i + 1]!, x, y, smallW, smallH)
    else fillRect(doc, x, y, smallW, smallH, [40, 35, 30])
  }
}

function layoutFullBleed(doc: jsPDF, pageW: number, pageH: number, img: LoadedImage | null) {
  fillRect(doc, 0, 0, pageW, pageH, COL.ink)
  if (img) drawImageCover(doc, img, 0, 0, pageW, pageH)
}

function layoutQuote(doc: jsPDF, pageW: number, pageH: number, quote: string, attribution: string) {
  fillRect(doc, 0, 0, pageW, pageH, COL.cream)

  // Decorative quote mark
  setText(doc, COL.gold, 80, 'italic')
  doc.text('"', pageW / 2 - 6, pageH / 2 - 18, { align: 'center' })

  // Quote text
  setText(doc, COL.ink, 18, 'italic')
  const lines = doc.splitTextToSize(quote, pageW - 60)
  doc.text(lines, pageW / 2, pageH / 2 + 5, { align: 'center' })

  // Attribution
  drawDivider(doc, pageW / 2 - 12, pageH / 2 + 5 + lines.length * 8 + 10, 24, COL.goldDeep)
  setText(doc, COL.goldDeep, 9)
  doc.text(attribution, pageW / 2, pageH / 2 + 5 + lines.length * 8 + 20, { align: 'center' })
}

function layoutClosing(doc: jsPDF, pageW: number, pageH: number, name: string) {
  fillRect(doc, 0, 0, pageW, pageH, COL.ink)

  // Decorative top frame
  doc.setDrawColor(...COL.gold)
  doc.setLineWidth(0.3)
  doc.rect(12, 12, pageW - 24, pageH - 24)

  // Inner content
  setText(doc, COL.gold, 10)
  doc.text('— END —', pageW / 2, pageH / 2 - 24, { align: 'center' })

  setText(doc, COL.cream, 22, 'italic')
  doc.text('We turned light', pageW / 2, pageH / 2 - 6, { align: 'center' })
  doc.text('into memory.', pageW / 2, pageH / 2 + 8, { align: 'center' })

  setText(doc, COL.dim, 9)
  doc.text(name, pageW / 2, pageH / 2 + 32, { align: 'center' })

  setText(doc, COL.mute, 7)
  doc.text(`LUMIO · ${new Date().toLocaleDateString()}`, pageW / 2, pageH - 22, { align: 'center' })
  doc.text('AES-256-GCM · End-to-end encrypted', pageW / 2, pageH - 16, { align: 'center' })
}

/* ============ STORY LAYOUTS ============ */
// Chap — to'liq rasm, o'ng — bob matni. Kitobcha estetikasi.
function layoutStoryChapter(doc: jsPDF, pageW: number, pageH: number, img: LoadedImage | null, era: string, text: string, chapNum: number) {
  fillRect(doc, 0, 0, pageW, pageH, COL.cream)

  // CHAP — illustratsiya (full-bleed)
  const photoW = pageW * 0.55
  if (img) drawImageCover(doc, img, 0, 0, photoW, pageH)
  else fillRect(doc, 0, 0, photoW, pageH, [220, 210, 195])

  // Yumshoq cream gradient o'ng tomonda (kitob tikuvi effekti)
  for (let i = 0; i < 20; i++) {
    ;(doc as any).setGState?.(new (doc as any).GState({ opacity: 0.06 - i * 0.003 }))
    fillRect(doc, photoW + i * 0.3, 0, 0.4, pageH, COL.ink)
  }
  ;(doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }))

  // O'NG — matn bloki
  const textX = photoW + 18
  const textW = pageW - photoW - 36

  // Yuqorida dekorativ ornament
  doc.setDrawColor(...COL.gold)
  doc.setLineWidth(0.4)
  doc.line(textX, 24, textX + 30, 24)
  doc.setFillColor(...COL.gold)
  doc.circle(textX + 35, 24, 0.7, 'F')
  doc.line(textX + 40, 24, textX + 70, 24)

  // Bob raqami — katta serif
  setText(doc, COL.gold, 48, 'italic')
  doc.text(String(chapNum).padStart(2, '0'), textX, 50)

  // Bob sarlavhasi (era)
  setText(doc, COL.goldDeep, 9)
  const eraText = (era || `Chapter ${chapNum}`).toUpperCase()
  doc.text(eraText, textX, 62)

  // Yana bir dekorativ chiziq
  doc.setDrawColor(...COL.gold)
  doc.setLineWidth(0.4)
  doc.line(textX, 66, textX + 18, 66)

  // Hikoya matni — serif italic, drop cap
  const narrative = text && text.length > 0 ? text : '~ silence ~'
  setText(doc, COL.ink, 14, 'italic')
  const lines = doc.splitTextToSize(narrative, textW)

  // Vertikal markazlash (matn 100mm dan boshlanadi)
  const startY = Math.max(90, (pageH - lines.length * 7) / 2)
  doc.text(lines, textX, startY, { maxWidth: textW, lineHeightFactor: 1.6 })

  // Pastki ornament
  doc.setDrawColor(...COL.gold)
  doc.setLineWidth(0.3)
  doc.line(textX + textW / 2 - 12, pageH - 22, textX + textW / 2 + 12, pageH - 22)

  // Sahifa raqami — italic
  setText(doc, COL.mute, 8, 'italic')
  doc.text(`~ ${chapNum} ~`, textX + textW / 2, pageH - 14, { align: 'center' })
}

/* ============ MAIN ============ */
export interface AlbumPdfOptions {
  title: string
  subtitle?: string
  photos: PickedPhoto[]
  fallbackSeeds?: string[]
  ownerName?: string
  chapters?: StoryChapter[]   // story-album mode
  storyMode?: boolean         // use chapter layouts
  onProgress?: (done: number, total: number) => void
}

export async function generateAlbumPdf(opts: AlbumPdfOptions): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Image source list
  const usePicker = opts.photos.length > 0
  const sources: { url: string; auth: boolean }[] = usePicker
    ? opts.photos.map((p) => {
        // Local rasm (data: yoki blob:) auth talab qilmaydi va size suffix qo'shilmaydi
        if (p.local || p.baseUrl.startsWith('data:') || p.baseUrl.startsWith('blob:')) {
          return { url: p.baseUrl, auth: false }
        }
        return { url: `${p.baseUrl}=w1200-h1600`, auth: true }
      })
    : (opts.fallbackSeeds || []).map((s) => ({ url: `https://picsum.photos/seed/${s}/1200/1600`, auth: false }))

  // Load all images
  const images: (LoadedImage | null)[] = []
  for (let i = 0; i < sources.length; i++) {
    const img = await loadImage(sources[i].url, sources[i].auth)
    images.push(img)
    opts.onProgress?.(i + 1, sources.length)
  }

  // Quotes pool (rotated)
  const QUOTES = [
    { q: 'A photograph is a secret about a secret.', a: 'Diane Arbus' },
    { q: 'The light tells a story even when we don\'t.', a: 'Lumio' },
    { q: 'Memory is a way of holding onto the things you love.', a: 'Kevin Arnold' },
    { q: 'Every picture is a frozen moment, breathing still.', a: 'Lumio' },
  ]

  // === COVER ===
  layoutCover(doc, pageW, pageH, opts.title, opts.subtitle || '', images[0])

  // === Title spread (table of contents-ish) ===
  doc.addPage()
  fillRect(doc, 0, 0, pageW, pageH, COL.cream)
  setText(doc, COL.goldDeep, 9)
  doc.text('— THE BOOK OF —', pageW / 2, pageH / 3, { align: 'center' })
  setText(doc, COL.ink, 32, 'italic')
  const titleLines = doc.splitTextToSize(opts.title, pageW - 40)
  doc.text(titleLines, pageW / 2, pageH / 3 + 18, { align: 'center' })
  drawDivider(doc, pageW / 2 - 30, pageH / 2 + 10, 60, COL.gold)
  setText(doc, COL.mute, 9)
  doc.text(`${images.length} photographs · curated by Lumio AI`, pageW / 2, pageH / 2 + 22, { align: 'center' })

  // === STORY MODE — bob-bob narrative ===
  if (opts.storyMode && opts.chapters && opts.chapters.length > 0) {
    for (let c = 0; c < opts.chapters.length; c++) {
      const ch = opts.chapters[c]
      let img: LoadedImage | null = null
      if (ch.photoBaseUrl) {
        const isLocal = ch.photoBaseUrl.startsWith('data:') || ch.photoBaseUrl.startsWith('blob:')
        img = await loadImage(isLocal ? ch.photoBaseUrl : `${ch.photoBaseUrl}=w1200-h1600`, !isLocal)
      } else if (images[c]) {
        img = images[c]
      }
      doc.addPage()
      layoutStoryChapter(doc, pageW, pageH, img, ch.era, ch.text, c + 1)
    }
    // Closing
    doc.addPage()
    layoutClosing(doc, pageW, pageH, opts.ownerName || '')
    return doc.output('blob')
  }

  // === Content pages — alternating layouts for wow effect ===
  let idx = 0
  let qIdx = 0
  let pageCount = 0
  while (idx < images.length) {
    doc.addPage()
    pageCount++
    const remaining = images.length - idx
    // Pattern: hero, duo, mosaic (4), full-bleed, quote, repeat
    const patternStep = pageCount % 6

    if (patternStep === 1 && remaining >= 1) {
      // HERO
      layoutHero(doc, pageW, pageH, images[idx], `Frame ${idx + 1}`)
      idx += 1
    } else if (patternStep === 2 && remaining >= 2) {
      // DUO
      layoutDuo(doc, pageW, pageH, images[idx], images[idx + 1], 'TWO MOMENTS')
      idx += 2
    } else if (patternStep === 3 && remaining >= 4) {
      // MOSAIC
      layoutMosaic(doc, pageW, pageH, [images[idx], images[idx + 1], images[idx + 2], images[idx + 3]])
      idx += 4
    } else if (patternStep === 4 && remaining >= 1) {
      // FULL BLEED
      layoutFullBleed(doc, pageW, pageH, images[idx])
      idx += 1
    } else if (patternStep === 5) {
      // QUOTE break (uses no image)
      const q = QUOTES[qIdx % QUOTES.length]
      qIdx++
      layoutQuote(doc, pageW, pageH, q.q, q.a)
    } else if (remaining >= 1) {
      // HERO fallback
      layoutHero(doc, pageW, pageH, images[idx], `Frame ${idx + 1}`)
      idx += 1
    }
  }

  // === CLOSING ===
  doc.addPage()
  layoutClosing(doc, pageW, pageH, opts.ownerName || '')

  return doc.output('blob')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
