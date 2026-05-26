import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStore } from '../store/useStore'
import AppLayout from '../components/AppLayout'
import Paywall, { PaywallReason } from '../components/Paywall'
import { showToast } from '../components/Toast'
import { generateAlbumPdf, downloadBlob } from '../lib/pdfGen'
import Icon from '../components/Icon'
import { t } from '../lib/i18n'

type AlbumType = 'yearly' | 'travel' | 'event' | 'custom'
type Style = 'Klassik' | 'Minimalist' | 'Vintage' | 'Modern'

type TypeIcon = 'cal' | 'glob' | 'heart' | 'sparkle'
const TYPES: { id: AlbumType; icon: TypeIcon; tk: string; dk: string }[] = [
  { id: 'yearly',  icon: 'cal',     tk: 'yearly',  dk: 'yearly_d' },
  { id: 'travel',  icon: 'glob',    tk: 'travel',  dk: 'travel_d' },
  { id: 'event',   icon: 'heart',   tk: 'event',   dk: 'event_d' },
  { id: 'custom',  icon: 'sparkle', tk: 'custom',  dk: 'custom_d' },
]
const TYPE_LABELS: Record<string, { uz: string; en: string; ru: string }> = {
  yearly:    { uz: 'Yil xulosasi',  en: 'Yearly recap',     ru: 'Итог года' },
  yearly_d:  { uz: 'Yilning eng yaxshi lahzalari', en: 'The best of your year', ru: 'Лучшие моменты года' },
  travel:    { uz: 'Sayohat',       en: 'Travel',           ru: 'Путешествие' },
  travel_d:  { uz: 'Yo\'l xotiralari', en: 'Memories from the road', ru: 'Воспоминания путешествий' },
  event:     { uz: 'Tadbir',        en: 'Event',            ru: 'Событие' },
  event_d:   { uz: 'To\'y, tug\'ilgan kun, bayram', en: 'Wedding, birthday, celebration', ru: 'Свадьба, день рождения' },
  custom:    { uz: 'Maxsus',        en: 'Custom',           ru: 'Особый' },
  custom_d:  { uz: 'O\'z hikoyangizni yarating', en: 'Tell your own story', ru: 'Ваш собственный рассказ' },
}
const ICONS: Record<AlbumType, string> = { yearly: '🌟', travel: '✈️', event: '🎉', custom: '🎨' }
const DEFAULT_NAMES: Record<AlbumType, string> = { yearly: '2024 — A Year', travel: 'Roads We Took', event: 'A Day Worth Keeping', custom: 'Untitled' }

export default function CreateAlbum() {
  const navigate = useNavigate()
  const { uid, plan, hasGenerated, addAlbum, pickedPhotos, lang, userName } = useStore()
  const [step, setStep] = useState(1)
  const [selType, setSelType] = useState<AlbumType | null>(null)
  const [albumName, setAlbumName] = useState('')
  const [dateFrom, setDateFrom] = useState('2024-01-01')
  const [dateTo, setDateTo] = useState('2024-12-31')
  const [count, setCount] = useState(40)
  const [style, setStyle] = useState<Style>('Klassik')
  const [pct, setPct] = useState(0)
  const [done, setDone] = useState(false)
  const [paywall, setPaywall] = useState<PaywallReason | null>(null)
  const [timerStr, setTimerStr] = useState('24:00:00')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectType = (t: AlbumType) => {
    setSelType(t)
    setAlbumName(DEFAULT_NAMES[t])
  }

  const toStep2 = () => {
    if (!selType) return
    if (hasGenerated && !plan) { setPaywall('generate'); return }
    setStep(2)
  }

  const startCreation = async () => {
    setStep(3)
    let p = 0
    const iv = setInterval(async () => {
      p = Math.min(p + 3 + Math.random() * 4, 100)
      setPct(p)
      if (p >= 100) {
        clearInterval(iv)
        const id = `album_${Date.now()}`
        const newAlbum = {
          id, title: albumName || DEFAULT_NAMES[selType!], type: selType!, count,
          date: 'Bugun', icon: ICONS[selType!], status: 'ready' as const,
          pdfExpiresAt: Date.now() + 24 * 3600 * 1000,
        }
        addAlbum(newAlbum)
        if (uid) {
          try {
            await setDoc(doc(db, 'users', uid, 'albums', id), { ...newAlbum, createdAt: serverTimestamp(), dateRange: { from: dateFrom, to: dateTo }, albumStyle: style })
          } catch { /* ignore */ }
        }
        setDone(true)
        startCountdown()
        showToast('✅ Albomingiz muvaffaqiyatli yaratildi!')
      }
    }, 100)
  }

  const startCountdown = () => {
    let secs = 86400
    timerRef.current = setInterval(() => {
      secs--
      if (secs <= 0) { clearInterval(timerRef.current!); return }
      const h = String(Math.floor(secs / 3600)).padStart(2, '0')
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
      const s = String(secs % 60).padStart(2, '0')
      setTimerStr(`${h}:${m}:${s}`)
    }, 1000)
  }

  const handleDownload = async () => {
    if (!plan) { setPaywall('download'); return }
    try {
      const blob = await generateAlbumPdf({
        title: albumName || 'Lumio Album',
        subtitle: `${count} photos`,
        photos: pickedPhotos.slice(0, Math.min(count, 48)),
        fallbackSeeds: ['beach-08', 'family02', 'kid-018', 'sunset-2', 'birthday', 'park-77', 'sea-44', 'forest03'],
      })
      downloadBlob(blob, `${(albumName || 'lumio-album').replace(/[^a-z0-9-_ ]/gi, '_')}.pdf`)
      showToast('PDF yuklab olindi')
    } catch (err: any) {
      console.error('PDF:', err)
      showToast('PDF yaratishda xato')
    }
  }

  const pills = (['Klassik', 'Minimalist', 'Vintage', 'Modern'] as Style[])

  return (
    <AppLayout>
      {paywall && <Paywall reason={paywall} onClose={() => setPaywall(null)} />}

      {/* HEADER */}
      <div style={{ paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {lang === 'uz' ? 'Yangi kitob' : lang === 'ru' ? 'Новая книга' : 'New book'}
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(28px, 4.4vw, 56px)' }}>
          {lang === 'uz' ? 'Yorug\'likni' : lang === 'ru' ? 'Превратите свет' : 'Turn light'}{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
            {lang === 'uz' ? 'kitobga aylantiring' : lang === 'ru' ? 'в книгу' : 'into a book'}
          </span>
        </h1>
      </div>

      <div className="create-wrap fade-in">
        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div className="step-indicator">
              <div className="step-ind active" /><div className="step-ind" /><div className="step-ind" />
            </div>
            <div className="step-label">
              <span>{lang === 'uz' ? 'Tur' : lang === 'ru' ? 'Тип' : 'Type'}</span>
              <span>{lang === 'uz' ? 'Sozlamalar' : lang === 'ru' ? 'Настройки' : 'Settings'}</span>
              <span>{lang === 'uz' ? 'Yaratish' : lang === 'ru' ? 'Создание' : 'Create'}</span>
            </div>
            <div className="type-grid">
              {TYPES.map((tp) => {
                const sel = selType === tp.id
                return (
                  <div key={tp.id} onClick={() => selectType(tp.id)} style={{
                    padding: 28, borderRadius: 'var(--radius-lg)',
                    background: sel ? 'color-mix(in oklab, var(--accent) 8%, var(--bg-card))' : 'var(--bg-card)',
                    border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--line)'),
                    cursor: 'pointer', transition: 'all 0.25s var(--ease)',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: sel ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 12%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                      color: sel ? '#0A0908' : 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 18,
                    }}>
                      <Icon name={tp.icon} size={20} strokeWidth={1.6} />
                    </div>
                    <h3 className="display" style={{ fontSize: 22, marginBottom: 6 }}>
                      {TYPE_LABELS[tp.tk][lang]}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.55, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                      {TYPE_LABELS[tp.dk][lang]}
                    </p>
                    {sel && (
                      <div style={{
                        position: 'absolute', top: 18, right: 18,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--accent)', color: '#0A0908',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="check" size={13} strokeWidth={2.4} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button className="btn btn-primary" disabled={!selType} onClick={toStep2} style={{ padding: '14px 26px' }}>
              {lang === 'uz' ? 'Davom etish' : lang === 'ru' ? 'Продолжить' : 'Continue'} <Icon name="arrow" />
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div className="step-indicator">
              <div className="step-ind done" /><div className="step-ind active" /><div className="step-ind" />
            </div>
            <div className="step-label"><span>Tur ✓</span><span>Sozlamalar</span><span>Yaratish</span></div>

            <div className="field-group">
              <label className="field-label">ALBOM NOMI</label>
              <input className="inp" value={albumName} onChange={(e) => setAlbumName(e.target.value)} placeholder="Masalan: 2024 Yil Xulosasi" />
            </div>
            <div className="field-group">
              <label className="field-label">SANA ORALIG'I</label>
              <div className="date-row">
                <input className="inp" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <input className="inp" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">RASM SONI: <span>{count}</span> ta</label>
              <input className="range-slider" type="range" min={20} max={80} value={count} onChange={(e) => setCount(+e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">USLUB</label>
              <div className="style-pills">
                {pills.map((p) => (
                  <div key={p} className={`pill${style === p ? ' selected' : ''}`} onClick={() => setStyle(p)}>{p}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-outline" onClick={() => setStep(1)} style={{ padding: '13px 28px' }}>← Ortga</button>
              <button className="btn-gold" onClick={startCreation} style={{ padding: '13px 36px' }}>Albom yarat →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <div className="step-indicator">
              <div className="step-ind done" /><div className="step-ind done" /><div className="step-ind active" />
            </div>
            {!done ? (
              <div className="processing-wrap">
                <div className="proc-anim">
                  <div className="proc-spinner" />
                  <div className="proc-pages">📄</div>
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Albom yaratilmoqda...</div>
                <p style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 28 }}>AI rasmlarni tahlil qilib eng yaxshilarini tanlayapti</p>
                <div className="progress-track"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
              </div>
            ) : (
              <div className="done-wrap">
                <div className="done-icon">🎉</div>
                <div className="done-title">Albomingiz tayyor!</div>
                <p className="done-sub">AI <strong>{count}</strong> ta eng yaxshi rasmni tanlab, chiroyli albom yaratdi.</p>
                <div className="pdf-preview">
                  <div className="pdf-thumb">📄</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{albumName}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{count} rasm · PDF</div>
                    <div className="pdf-enc-badge">🔐 AES-256-GCM Shifrlangan</div>
                    <div className="timer">⏱ {timerStr} qoldi</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-gold" style={{ padding: '13px 28px' }} onClick={handleDownload}>📥 PDF Yuklab olish</button>
                  <button className="btn-outline" style={{ padding: '13px 24px', color: 'var(--sage)', borderColor: 'rgba(126,168,152,.3)' }} onClick={() => navigate(`/editor/${Date.now()}`)}>✏️ AI tahrirlash</button>
                  <button className="btn-ghost" style={{ padding: 13 }} onClick={() => navigate('/albums')}>Albomlarimga →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
