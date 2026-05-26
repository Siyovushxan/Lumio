import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, Album } from '../store/useStore'
import { t } from '../lib/i18n'
import AppLayout from '../components/AppLayout'
import Paywall, { PaywallReason } from '../components/Paywall'
import { showToast } from '../components/Toast'
import { generateAlbumPdf, downloadBlob } from '../lib/pdfGen'
import AuthImage from '../components/AuthImage'
import Photo from '../components/Photo'
import Icon from '../components/Icon'

type Filter = 'all' | 'yearly' | 'story' | 'travel' | 'event' | 'custom'

const FILTERS: { id: Filter; uz: string; en: string; ru: string }[] = [
  { id: 'all', uz: 'Barchasi', en: 'All', ru: 'Все' },
  { id: 'yearly', uz: 'Yil xulosasi', en: 'Yearly', ru: 'Год' },
  { id: 'story', uz: 'Ertak', en: 'Story', ru: 'История' },
  { id: 'travel', uz: 'Sayohat', en: 'Travel', ru: 'Путешествие' },
  { id: 'event', uz: 'Tadbir', en: 'Event', ru: 'Событие' },
]

export default function Albums() {
  const navigate = useNavigate()
  const { albums, plan, pickedPhotos, lang, userName } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [paywall, setPaywall] = useState<PaywallReason | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const filtered = filter === 'all' ? albums : albums.filter((a) => a.type === filter)

  const handleDownload = async (a: Album, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!plan) { setPaywall('download'); return }
    if (a.pdfExpiresAt && Date.now() > a.pdfExpiresAt) {
      showToast(lang === 'uz' ? 'Albom muddati o\'tgan' : 'Album expired')
      return
    }
    if (downloadingId) return
    setDownloadingId(a.id)
    try {
      const blob = await generateAlbumPdf({
        title: a.title,
        subtitle: `${a.count} photographs · curated by Lumio`,
        photos: pickedPhotos.slice(0, Math.min(a.count, 48)),
        ownerName: userName,
        fallbackSeeds: ['beach-08', 'family02', 'kid-018', 'sunset-2', 'birthday', 'park-77', 'sea-44', 'forest03'],
      })
      downloadBlob(blob, `${a.title.replace(/[^a-z0-9-_ ]/gi, '_')}.pdf`)
      showToast(lang === 'uz' ? 'PDF yuklab olindi' : 'PDF downloaded')
    } catch (err: any) {
      console.error('PDF generation:', err)
      showToast(lang === 'uz' ? 'PDF yaratishda xato' : 'PDF error')
    } finally {
      setDownloadingId(null)
    }
  }

  const isExpired = (a: Album) => a.pdfExpiresAt ? Date.now() > a.pdfExpiresAt : false

  // Albom uchun cover rasm — picked photos'dan birinchi yoki fallback
  const coverFor = (a: Album, idx: number) => {
    const p = pickedPhotos[idx % Math.max(pickedPhotos.length, 1)]
    return p?.baseUrl ? p : null
  }

  // Album turi badge labellari
  const typeLabel = (type: string) => {
    if (lang === 'uz') return type === 'story' ? 'Ertak' : type === 'travel' ? 'Sayohat' : type === 'yearly' ? 'Yil' : type === 'event' ? 'Tadbir' : 'Albom'
    if (lang === 'ru') return type === 'story' ? 'История' : type === 'travel' ? 'Путешествие' : type === 'yearly' ? 'Год' : type === 'event' ? 'Событие' : 'Альбом'
    return type === 'story' ? 'Story' : type === 'travel' ? 'Travel' : type === 'yearly' ? 'Year' : type === 'event' ? 'Event' : 'Album'
  }

  return (
    <AppLayout>
      {paywall && <Paywall reason={paywall} onClose={() => setPaywall(null)} />}

      {/* HEADER */}
      <div className="topbar-row" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 24, paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 36,
      }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t('nav.albums', lang)}</div>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 4.4vw, 56px)' }}>
            {lang === 'uz' ? 'Sizning' : lang === 'ru' ? 'Ваши' : 'Your'}{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
              {lang === 'uz' ? 'kutubxonangiz' : lang === 'ru' ? 'библиотека' : 'library'}
            </span>
          </h1>
          <p style={{ marginTop: 8, color: 'var(--ink-dim)', fontSize: 14 }}>
            {albums.length} {lang === 'uz' ? 'ta kitob' : lang === 'ru' ? 'книг' : 'books'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/create')} style={{ padding: '12px 22px' }}>
          <Icon name="plus" strokeWidth={1.8} /> {t('cta.new_album', lang)}
        </button>
      </div>

      {/* FILTER PILLS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              letterSpacing: '0.04em',
              color: active ? '#0A0908' : 'var(--ink-dim)',
              background: active ? 'var(--accent)' : 'transparent',
              border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line)'),
              cursor: 'pointer', transition: 'all 0.2s var(--ease)',
            }}>{f[lang]}</button>
          )
        })}
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: 'color-mix(in oklab, var(--accent) 14%, transparent)',
            border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
          }}>
            <Icon name="book" size={28} strokeWidth={1.4} />
          </div>
          <h2 className="display" style={{ fontSize: 26, marginBottom: 8 }}>
            {lang === 'uz' ? 'Hali bironta kitob yo\'q' : lang === 'ru' ? 'Книг пока нет' : 'No books yet'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 24 }}>
            {lang === 'uz' ? 'Birinchi kutubxonangizni boshlang' : lang === 'ru' ? 'Начните вашу библиотеку' : 'Start your library'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/create')} style={{ padding: '13px 24px' }}>
            {t('cta.new_album', lang)} <Icon name="arrow" />
          </button>
        </div>
      ) : (
        // MAGAZINE GRID
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {filtered.map((a, i) => {
            const cover = coverFor(a, i)
            const expired = isExpired(a)
            return (
              <div key={a.id} onClick={() => navigate(`/editor/${a.id}`)}
                style={{
                  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden', cursor: 'pointer',
                  border: '1px solid var(--line)',
                  transition: 'all 0.3s var(--ease)',
                  display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {/* COVER (book-style: portrait 4:5) */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', background: 'var(--bg-elev)' }}>
                  {cover
                    ? <AuthImage baseUrl={cover.baseUrl} size="w600-h750-c" />
                    : <Photo seed={`album-${i}-${a.type}`} w={500} h={625} />}

                  {/* Bottom gradient overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(10,9,8,0.85) 0%, rgba(10,9,8,0.3) 35%, transparent 60%)',
                    pointerEvents: 'none',
                  }} />

                  {/* Type chip (top-left) */}
                  <div style={{
                    position: 'absolute', top: 14, left: 14,
                    padding: '5px 11px', borderRadius: 999,
                    background: 'rgba(10,9,8,0.6)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(245,239,224,0.18)',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: '#ECC892',
                  }}>{typeLabel(a.type)}</div>

                  {/* Encrypted badge or expired (top-right) */}
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    padding: '5px 9px', borderRadius: 999,
                    background: expired ? 'rgba(224,120,86,0.18)' : 'rgba(143,184,126,0.18)',
                    border: '1px solid ' + (expired ? 'rgba(224,120,86,0.4)' : 'rgba(143,184,126,0.4)'),
                    fontSize: 10, fontWeight: 600,
                    color: expired ? '#E07856' : '#8FB87E',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Icon name="lock" size={10} strokeWidth={2} />
                    {expired
                      ? (lang === 'uz' ? "O'tgan" : 'Expired')
                      : 'AES-256'}
                  </div>

                  {/* Title + meta at bottom */}
                  <div style={{ position: 'absolute', left: 18, right: 18, bottom: 16, color: '#F5EFE0' }}>
                    <h3 className="display" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6, color: '#F5EFE0' }}>
                      {a.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: 'rgba(245,239,224,0.7)', letterSpacing: '0.04em' }}>
                      <span>{a.count} {lang === 'uz' ? 'rasm' : 'photos'}</span>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{a.date}</span>
                    </div>
                  </div>
                </div>

                {/* ACTION BAR */}
                <div style={{
                  padding: '14px 16px', display: 'flex', gap: 8,
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                }}>
                  <button
                    onClick={(e) => handleDownload(a, e)}
                    disabled={expired || downloadingId === a.id}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10,
                      background: 'var(--accent)', color: '#0A0908',
                      fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
                      opacity: expired ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'background 0.2s var(--ease)',
                    }}
                    onMouseEnter={(e) => !expired && (e.currentTarget.style.background = 'var(--accent-bright)')}
                    onMouseLeave={(e) => !expired && (e.currentTarget.style.background = 'var(--accent)')}
                  >
                    {downloadingId === a.id ? (
                      <><span className="spin" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> PDF</>
                    ) : (
                      <><Icon name="download" size={14} strokeWidth={1.8} /> PDF</>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/editor/${a.id}`) }}
                    style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'transparent', color: 'var(--ink-dim)',
                      border: '1px solid var(--line-strong)',
                      fontSize: 12.5, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Icon name="sparkle" size={13} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
