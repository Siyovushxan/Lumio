import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStore, Album, StoryChapter } from '../store/useStore'
import { t } from '../lib/i18n'
import AppLayout from '../components/AppLayout'
import Paywall, { PaywallReason } from '../components/Paywall'
import { showToast } from '../components/Toast'
import Icon from '../components/Icon'
import AuthImage from '../components/AuthImage'
import { generateStoryFromPhotos } from '../lib/gemini'
import { generateAlbumPdf, downloadBlob } from '../lib/pdfGen'

type StoryStyleKey = 'children' | 'romantic' | 'poetic' | 'bio'

const STYLE_LABELS: Record<StoryStyleKey, { uz: string; en: string; ru: string }> = {
  children: { uz: 'Bolalar ertagi', en: 'Children\'s tale', ru: 'Детская сказка' },
  romantic: { uz: 'Romantik', en: 'Romantic', ru: 'Романтика' },
  poetic:   { uz: 'She\'riy', en: 'Poetic', ru: 'Поэтический' },
  bio:      { uz: 'Biografik', en: 'Biographic', ru: 'Биография' },
}

export default function StoryAlbum() {
  const navigate = useNavigate()
  const { uid, plan, addAlbum, lang, pickedPhotos, userName, photosConnected, setPickedPhotos } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Qurilmadan rasm yuklash + siqish (xotira tejash uchun)
  const compressImage = (file: File, maxSize = 1280, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          if (width > maxSize || height > maxSize) {
            const ratio = width / height
            if (width > height) { width = maxSize; height = Math.round(maxSize / ratio) }
            else { height = maxSize; width = Math.round(maxSize * ratio) }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = reject
        img.src = reader.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const newOnes = await Promise.all(Array.from(files).slice(0, 12).map(async (file) => {
        const dataUrl = await compressImage(file)
        return {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          baseUrl: dataUrl,
          mimeType: 'image/jpeg',
          local: true,
        }
      }))
      setPickedPhotos([...pickedPhotos, ...newOnes].slice(0, 24))
    } catch (err) {
      console.error('Upload error:', err)
      showToast(lang === 'uz' ? 'Rasm yuklashda xato' : 'Upload error')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const [step, setStep] = useState(1)
  const [albumTitle, setAlbumTitle] = useState('')
  const [styleKey, setStyleKey] = useState<StoryStyleKey>('children')
  const [paywall, setPaywall] = useState<PaywallReason | null>(null)

  // Generation state
  const [pct, setPct] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')
  const [chapters, setChapters] = useState<StoryChapter[]>([])
  const [done, setDone] = useState(false)
  const [createdAlbum, setCreatedAlbum] = useState<Album | null>(null)
  const [downloading, setDownloading] = useState(false)

  const photosToUse = pickedPhotos.slice(0, 12)
  const canStart = albumTitle.trim().length >= 2 && photosToUse.length >= 2

  const toStep2 = () => {
    if (!plan) { setPaywall('story'); return }
    if (plan === 'monthly') { setPaywall('story'); return }
    if (!albumTitle.trim()) return
    setStep(2)
  }

  const startStory = async () => {
    setStep(3)
    setError('')
    setPct(5)
    setProgressLabel(lang === 'uz' ? 'Rasmlar tahlil qilinmoqda...' : 'Reading photos...')

    try {
      const { chapters: chs } = await generateStoryFromPhotos({
        title: albumTitle,
        style: styleKey,
        lang,
        photos: photosToUse.map((p) => ({ id: p.id, baseUrl: p.baseUrl })),
        onProgress: (cur, total) => {
          setPct(5 + Math.round((cur / total) * 90))
          setProgressLabel(lang === 'uz' ? `Bob ${cur}/${total} yozildi` : `Chapter ${cur}/${total}`)
        },
      })

      const fullChapters: StoryChapter[] = chs.map((c) => {
        const p = pickedPhotos.find((pp) => pp.id === c.photoId)
        return { era: c.era, text: c.text, photoId: c.photoId, photoBaseUrl: p?.baseUrl }
      })

      setChapters(fullChapters)
      setProgressLabel(lang === 'uz' ? 'Saqlanmoqda...' : 'Saving...')
      setPct(98)

      const id = `story_${Date.now()}`
      const album: Album = {
        id,
        title: albumTitle,
        type: 'story',
        count: photosToUse.length,
        date: new Date().toLocaleDateString(),
        icon: '📖',
        status: 'ready',
        pdfExpiresAt: Date.now() + 7 * 24 * 3600 * 1000,
        chapters: fullChapters,
        photoIds: photosToUse.map((p) => p.id),
      }
      addAlbum(album)
      setCreatedAlbum(album)

      if (uid) {
        try {
          await setDoc(doc(db, 'users', uid, 'albums', id), {
            ...album, style: styleKey, language: lang, createdAt: serverTimestamp(),
          })
        } catch { /* rules may block */ }
      }

      setPct(100)
      setDone(true)
      showToast(lang === 'uz' ? 'Ertak-albom tayyor!' : 'Story album ready!')
    } catch (e: any) {
      const raw = String(e?.message || e)
      let msg: string
      if (raw.includes('VITE_GROQ_API_KEY') || raw.includes('Invalid API Key') || raw.includes('invalid_api_key')) {
        msg = lang === 'uz' ? "Groq API kalit noto'g'ri." : 'Invalid Groq API key.'
      } else if (raw.includes('rate_limit') || raw.includes('429')) {
        msg = lang === 'uz' ? 'Kvota tugadi. Bir oz kutib qayta urinib ko\'ring.' : 'Rate limit reached.'
      } else if (raw.includes('NETWORK_BLOCKED') || raw.includes('Failed to fetch')) {
        msg = lang === 'uz' ? 'Tarmoq xato. Internet aloqasini tekshiring.' : 'Network error.'
      } else {
        msg = (lang === 'uz' ? 'Xato: ' : 'Error: ') + raw.slice(0, 200)
      }
      setError(msg)
    }
  }

  const handleDownload = async () => {
    if (!plan) { setPaywall('download'); return }
    if (!createdAlbum) return
    setDownloading(true)
    try {
      const blob = await generateAlbumPdf({
        title: createdAlbum.title,
        subtitle: `${STYLE_LABELS[styleKey][lang]} · ${chapters.length} chapters`,
        photos: photosToUse,
        ownerName: userName,
        chapters,
        storyMode: true,
      })
      downloadBlob(blob, `${createdAlbum.title.replace(/[^a-z0-9-_ ]/gi, '_')}.pdf`)
      showToast(lang === 'uz' ? 'PDF yuklab olindi' : 'PDF downloaded')
    } catch (e) {
      console.error('PDF:', e)
      showToast(lang === 'uz' ? 'PDF xatosi' : 'PDF error')
    } finally { setDownloading(false) }
  }

  const styleOpts: StoryStyleKey[] = ['children', 'romantic', 'poetic', 'bio']

  return (
    <AppLayout>
      {paywall && <Paywall reason={paywall} onClose={() => setPaywall(null)} />}

      <div style={{ paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {lang === 'uz' ? 'Ertak-Albom' : lang === 'ru' ? 'Сюжетный альбом' : 'Story Album'}
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(28px, 4.4vw, 56px)' }}>
          {lang === 'uz' ? 'Rasmlaringizdan' : lang === 'ru' ? 'Из ваших фото' : 'A fairy-tale from'}{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
            {lang === 'uz' ? 'ertak' : lang === 'ru' ? 'сказка' : 'your photos'}
          </span>
        </h1>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* STEPPER */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              flex: 1, height: 3, borderRadius: 999,
              background: step >= n
                ? (step === n ? 'linear-gradient(to right, var(--accent-deep), var(--accent-bright))' : 'var(--accent)')
                : 'var(--line)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 32 }}>
          <span>{lang === 'uz' ? 'Sarlavha' : lang === 'ru' ? 'Название' : 'Title'}</span>
          <span>{lang === 'uz' ? 'Uslub' : lang === 'ru' ? 'Стиль' : 'Style'}</span>
          <span>{lang === 'uz' ? 'Yaratish' : lang === 'ru' ? 'Создание' : 'Create'}</span>
        </div>

        {/* STEP 1 — Title + check photos */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                {lang === 'uz' ? 'Ertak-Albom nomi' : lang === 'ru' ? 'Название альбома' : 'Album title'}
              </div>
              <input
                className="field"
                style={{ fontSize: 22, fontFamily: 'var(--font-display)', padding: '16px 18px' }}
                placeholder={lang === 'uz' ? 'Misol: Mening sehrli bog\'im' : lang === 'ru' ? 'Пример: Мой волшебный сад' : 'e.g. My Magic Garden'}
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                maxLength={60}
                autoFocus
              />
            </div>

            {/* Photos status */}
            <div className="card" style={{ padding: 22, marginBottom: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                {lang === 'uz' ? 'Tanlangan rasmlar' : lang === 'ru' ? 'Выбранные фото' : 'Picked photos'}
              </div>
              {photosToUse.length === 0 ? (
                <div>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginBottom: 14, lineHeight: 1.55 }}>
                    {lang === 'uz'
                      ? "Google Photos'dan tanlang yoki qurilmangizdan rasm yuklang. AI har biri uchun ertak yozadi."
                      : lang === 'ru' ? 'Выберите из Google Photos или загрузите с устройства.'
                      : 'Pick from Google Photos or upload from device.'}
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/connect')} style={{ padding: '11px 20px', fontSize: 13.5 }}>
                      <Icon name="image" strokeWidth={1.7} /> {lang === 'uz' ? 'Google Photos' : 'Google Photos'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} style={{ padding: '11px 20px', fontSize: 13.5 }}>
                      <Icon name="download" strokeWidth={1.7} /> {lang === 'uz' ? 'Qurilmadan yuklash' : lang === 'ru' ? 'С устройства' : 'From device'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleLocalUpload} />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'color-mix(in oklab, var(--success) 18%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--success) 30%, transparent)',
                      color: 'var(--success)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icon name="check" size={16} strokeWidth={2} /></div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {photosToUse.length} {lang === 'uz' ? 'ta rasm tayyor' : 'photos ready'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>
                        {lang === 'uz' ? 'Har biri uchun alohida bob yoziladi' : 'A chapter for each'}
                      </div>
                    </div>
                  </div>
                  {/* Thumbnails preview */}
                  <div style={{ display: 'flex', gap: 6, overflow: 'hidden', marginBottom: 14 }}>
                    {photosToUse.slice(0, 8).map((p) => (
                      <div key={p.id} style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-elev)' }}>
                        <AuthImage baseUrl={p.baseUrl} size="w112-h112-c" local={p.local} />
                      </div>
                    ))}
                    {photosToUse.length > 8 && (
                      <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--ink-dim)', flexShrink: 0 }}>
                        +{photosToUse.length - 8}
                      </div>
                    )}
                  </div>
                  {/* "Ko'proq qo'shish" tugmalari */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/connect')} style={{ padding: '8px 14px', fontSize: 12 }}>
                      <Icon name="plus" size={14} /> Google Photos
                    </button>
                    <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 14px', fontSize: 12 }}>
                      <Icon name="plus" size={14} /> {lang === 'uz' ? 'Qurilmadan' : lang === 'ru' ? 'С устройства' : 'From device'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleLocalUpload} />
                  </div>
                </>
              )}
            </div>

            <button
              className="btn btn-primary"
              disabled={!canStart}
              onClick={toStep2}
              style={{ padding: '14px 26px' }}
            >
              {lang === 'uz' ? 'Davom etish' : lang === 'ru' ? 'Продолжить' : 'Continue'} <Icon name="arrow" />
            </button>
          </div>
        )}

        {/* STEP 2 — Style */}
        {step === 2 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              {lang === 'uz' ? 'Ertak uslubini tanlang' : lang === 'ru' ? 'Стиль повествования' : 'Choose a tone'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>
              {styleOpts.map((s) => {
                const sel = styleKey === s
                return (
                  <div key={s} onClick={() => setStyleKey(s)} style={{
                    padding: 22, borderRadius: 'var(--radius-lg)',
                    background: sel ? 'color-mix(in oklab, var(--accent) 8%, var(--bg-card))' : 'var(--bg-card)',
                    border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--line)'),
                    cursor: 'pointer', transition: 'all 0.2s var(--ease)',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontStyle: 'italic',
                      fontSize: 20, marginBottom: 6, color: sel ? 'var(--accent)' : 'var(--ink)',
                    }}>{STYLE_LABELS[s][lang]}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', fontStyle: 'italic' }}>
                      {s === 'children' && (lang === 'uz' ? 'Sehrli, samimiy ertak' : 'Magical and warm')}
                      {s === 'romantic' && (lang === 'uz' ? 'Issiq, yaqin tuyg\'ular' : 'Tender and intimate')}
                      {s === 'poetic' && (lang === 'uz' ? 'Metaforali, tushga o\'xshash' : 'Dreamlike and rich')}
                      {s === 'bio' && (lang === 'uz' ? 'Iliq, haqqoniy' : 'Warm, grounded')}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ padding: '12px 22px' }}>
                <Icon name="arrowL" /> {lang === 'uz' ? 'Ortga' : 'Back'}
              </button>
              <button className="btn btn-primary" onClick={startStory} style={{ padding: '12px 26px' }}>
                <Icon name="sparkle" /> {lang === 'uz' ? 'Ertakni yaratish' : 'Generate fairy-tale'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Generating / Done */}
        {step === 3 && (
          <div>
            {!done ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 28px' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', animation: 'spin 1.5s linear infinite' }} />
                  <div style={{ position: 'absolute', inset: 24, borderRadius: '50%', background: 'color-mix(in oklab, var(--accent) 10%, var(--bg-card))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Icon name="sparkle" size={32} strokeWidth={1.4} />
                  </div>
                </div>
                <h3 className="display" style={{ fontSize: 26, marginBottom: 8 }}>
                  {lang === 'uz' ? 'Ertak yozilmoqda...' : lang === 'ru' ? 'Сказка пишется...' : 'Weaving the tale...'}
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginBottom: 24, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
                  {progressLabel}
                </p>
                <div style={{ background: 'var(--bg-card)', borderRadius: 999, height: 6, overflow: 'hidden', maxWidth: 360, margin: '0 auto', border: '1px solid var(--line)' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(to right, var(--accent-deep), var(--accent-bright))', transition: 'width 0.4s ease' }} />
                </div>
                {error && <div className="alert-err" style={{ marginTop: 24, textAlign: 'left' }}>{error}</div>}
              </div>
            ) : (
              <div>
                {/* DONE — show preview */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>
                    {lang === 'uz' ? 'Tayyor' : 'Ready'}
                  </div>
                  <h2 className="display" style={{ fontSize: 32, marginBottom: 8 }}>{albumTitle}</h2>
                  <p style={{ fontSize: 13, color: 'var(--ink-dim)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
                    {chapters.length} {lang === 'uz' ? 'ta bob yozildi' : 'chapters written'}
                  </p>
                </div>

                {/* Chapters preview */}
                <div style={{ maxHeight: 380, overflowY: 'auto', marginBottom: 28, paddingRight: 8 }}>
                  {chapters.slice(0, 4).map((ch, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16,
                      padding: 16, marginBottom: 10,
                      background: 'var(--bg-card)', border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                    }}>
                      <div style={{ width: 90, height: 90, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-elev)' }}>
                        {ch.photoBaseUrl && (
                          <AuthImage
                            baseUrl={ch.photoBaseUrl}
                            size="w180-h180-c"
                            local={ch.photoBaseUrl.startsWith('data:') || ch.photoBaseUrl.startsWith('blob:')}
                          />
                        )}
                      </div>
                      <div>
                        <div className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>{ch.era}</div>
                        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                          {ch.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {chapters.length > 4 && (
                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-mute)', padding: 12 }}>
                      +{chapters.length - 4} {lang === 'uz' ? 'ta bob PDF\'da' : 'more chapters in PDF'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handleDownload} disabled={downloading} style={{ padding: '13px 26px' }}>
                    {downloading
                      ? <span className="spin" />
                      : <><Icon name="download" /> {lang === 'uz' ? 'PDF yuklab olish' : 'Download PDF'}</>}
                  </button>
                  <button className="btn btn-ghost" onClick={() => navigate('/albums')} style={{ padding: '13px 22px' }}>
                    {lang === 'uz' ? 'Albomlarim' : 'My albums'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
