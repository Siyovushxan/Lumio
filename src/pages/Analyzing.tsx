import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStore, PickedPhoto } from '../store/useStore'
import { t } from '../lib/i18n'
import Wordmark from '../components/Wordmark'
import Icon from '../components/Icon'
import { getAccessToken } from '../lib/googlePhotos'
import {
  listPickedItems, computePickerStats,
  PickerStore, PickedItem,
} from '../lib/photosPicker'
import { generateInsight } from '../lib/gemini'

export default function Analyzing() {
  const navigate = useNavigate()
  const { uid, lang, setStats, setPickedPhotos } = useStore()
  const [pct, setPct] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const ranRef = useRef(false)

  const STEPS = [
    lang === 'uz' ? 'Tanlangan rasmlar o\'qilmoqda' : lang === 'ru' ? 'Чтение выбранных фото' : 'Reading picked photos',
    lang === 'uz' ? 'Statistika hisoblanmoqda' : lang === 'ru' ? 'Расчёт статистики' : 'Computing stats',
    lang === 'uz' ? 'AI tushuncha yozmoqda' : lang === 'ru' ? 'AI пишет вывод' : 'AI writing insight',
    lang === 'uz' ? 'Shifrlangan saqlash' : lang === 'ru' ? 'Зашифрованное хранение' : 'Saving encrypted',
  ]

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    run()
  }, [])

  async function run() {
    try {
      const token = getAccessToken()
      const sessionId = PickerStore.getSession()
      if (!token || !sessionId) {
        setError(lang === 'uz' ? "Avval rasm tanlang" : lang === 'ru' ? 'Сначала выберите фото' : 'Pick photos first')
        setTimeout(() => navigate('/connect'), 1500)
        return
      }

      setActiveStep(0); setPct(10)

      // 1) Picker'dan barcha tanlangan rasmlarni olamiz
      const all: PickedItem[] = []
      let nextToken: string | undefined
      let pages = 0
      do {
        const { items, nextPageToken } = await listPickedItems(token, sessionId, nextToken)
        all.push(...items)
        setCount(all.length)
        pages++
        setPct(Math.min(10 + pages * 15, 70))
        nextToken = nextPageToken
      } while (nextToken && pages < 20) // 20 sahifa = 2000 rasm chegarasi

      if (all.length === 0) {
        setError(lang === 'uz' ? "Hech qanday rasm tanlanmagan" : lang === 'ru' ? 'Фото не выбраны' : 'No photos picked')
        return
      }

      // Tanlangan rasmlarni store'ga saqlaymiz (Editor ulardan foydalanadi)
      const photos: PickedPhoto[] = all.map((it) => ({
        id: it.id,
        baseUrl: it.mediaFile?.baseUrl || '',
        createTime: it.createTime,
        mimeType: it.mediaFile?.mimeType,
        width: Number(it.mediaFile?.mediaFileMetadata?.width || 0),
        height: Number(it.mediaFile?.mediaFileMetadata?.height || 0),
      })).filter((p) => p.baseUrl)
      setPickedPhotos(photos)

      // 2) Statistika
      setActiveStep(1); setPct(78)
      const stats = computePickerStats(all)

      // 3) Gemini insight
      setActiveStep(2); setPct(88)
      let insight = ''
      try {
        insight = await generateInsight(stats, lang)
      } catch (e) {
        insight = lang === 'uz'
          ? `Tanlovingizda ${stats.totalPhotos} ta rasm, ${stats.yearsTracked} yil davomida.`
          : lang === 'ru' ? `В выборке ${stats.totalPhotos} фото за ${stats.yearsTracked} лет.`
          : `Your selection has ${stats.totalPhotos} photos across ${stats.yearsTracked} years.`
      }

      // 4) Firestore'ga saqlash
      setActiveStep(3); setPct(96)
      const fullStats = { ...stats, aiInsight: insight }
      if (uid) {
        try {
          await setDoc(doc(db, 'users', uid, 'data', 'stats'), { ...fullStats, lastAnalyzed: serverTimestamp() })
        } catch (e: any) { console.warn('Firestore:', e.message) }
      }
      setStats(fullStats as any)

      // Eslatma: sessionni o'chirmaymiz — baseUrls bir necha soat amal qiladi,
      // foydalanuvchi albom yaratish jarayonida rasmlarni ko'rishi uchun.
      setPct(100)
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (e: any) {
      console.error('Analyze:', e)
      setError(e.message || 'Failed')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '22px 48px' }}><Wordmark size={22} /></nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 36px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--accent)', animation: 'spin 2s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'color-mix(in oklab, var(--accent) 60%, var(--ink-dim))', animation: 'spin 2.8s linear infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 24, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--success)', animation: 'spin 1.8s linear infinite' }} />
            <div style={{
              position: 'absolute', inset: 36, borderRadius: '50%',
              background: 'color-mix(in oklab, var(--accent) 10%, var(--bg-card))',
              border: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
            }}>
              <Icon name="image" size={28} strokeWidth={1.4} />
            </div>
          </div>

          <h2 className="display" style={{ fontSize: 32, marginBottom: 12 }}>
            {lang === 'uz' ? 'Rasmlar o\'qilmoqda' : lang === 'ru' ? 'Чтение фото' : 'Reading your photos'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 32 }}>
            {lang === 'uz' ? 'Faqat metadata o\'qiladi — fayllar yuklanmaydi' : lang === 'ru' ? 'Читаются только метаданные' : 'Metadata only, no uploads'}
          </p>

          {error && <div className="alert-err" style={{ marginBottom: 16, textAlign: 'left' }}>{error}</div>}

          <div style={{ background: 'var(--bg-card)', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--line)' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(to right, var(--accent-deep), var(--accent-bright))', transition: 'width .5s ease', width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 28, fontVariantNumeric: 'tabular-nums' }}>
            {count > 0 ? `${count.toLocaleString()} ${t('dash.photos', lang)}` : `${Math.round(pct)}%`}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {STEPS.map((step, i) => {
              const done = i < activeStep
              const active = i === activeStep
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5,
                  color: done ? 'var(--ink)' : active ? 'var(--accent)' : 'var(--ink-mute)',
                  transition: 'color .3s var(--ease)',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: '#0A0908',
                    animation: active ? 'pulse 1.2s ease-in-out infinite' : 'none',
                  }}>
                    {done && <Icon name="check" size={12} strokeWidth={2.5} />}
                  </div>
                  {step}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  )
}
