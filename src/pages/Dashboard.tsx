import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStore, UserStats, Album } from '../store/useStore'
import { t } from '../lib/i18n'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import CountUp from '../components/CountUp'
import ThemeToggle from '../components/ThemeToggle'

function YearChart({ data }: { data: { year: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const w = 760, h = 200
  const pad = { l: 40, r: 20, t: 16, b: 30 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const pts = data.map((d, i) => ({
    x: pad.l + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
    y: pad.t + innerH - (d.count / max) * innerH,
    d,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${pad.t + innerH} L ${pts[0].x} ${pad.t + innerH} Z`
    : ''

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="lumio-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((tt) => (
        <line key={tt} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * tt} y2={pad.t + innerH * tt} stroke="var(--line)" strokeWidth="1" />
      ))}
      {areaPath && <path d={areaPath} fill="url(#lumio-area)" />}
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.5" />
          <text x={p.x} y={h - 10} textAnchor="middle" fontSize="11" fill="var(--ink-dim)" fontFamily="var(--font-body)">{p.d.year}</text>
          <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fill="var(--accent)" fontFamily="var(--font-body)" fontWeight="500">{p.d.count.toLocaleString()}</text>
        </g>
      ))}
    </svg>
  )
}

function timeAgo(ts: number | undefined, lang: 'en' | 'uz' | 'ru'): string {
  if (!ts) return lang === 'uz' ? 'hali yo\'q' : lang === 'ru' ? 'ещё нет' : 'never'
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return lang === 'uz' ? 'hozir' : lang === 'ru' ? 'сейчас' : 'now'
  if (m < 60) return lang === 'uz' ? `${m} daqiqa oldin` : lang === 'ru' ? `${m} мин назад` : `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return lang === 'uz' ? `${h} soat oldin` : lang === 'ru' ? `${h} ч назад` : `${h}h ago`
  const d = Math.round(h / 24)
  return lang === 'uz' ? `${d} kun oldin` : lang === 'ru' ? `${d} дн назад` : `${d}d ago`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { uid, lang, stats, userName, setStats, setAlbums, albums } = useStore()
  const [loading, setLoading] = useState(true)
  const [permError, setPermError] = useState(false)

  // Firestore'dan stats va albumlarni yuklash
  useEffect(() => {
    if (!uid) { setLoading(false); return }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'data', 'stats'))
        if (snap.exists()) setStats(snap.data() as UserStats)

        const albsSnap = await getDocs(collection(db, 'users', uid, 'albums'))
        const albs: Album[] = albsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        if (albs.length) setAlbums(albs)
      } catch (e: any) {
        if (e.code === 'permission-denied') setPermError(true)
        console.warn('Dashboard load:', e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [uid])

  const firstName = userName?.split(' ')[0] || ''
  const greeting = (() => {
    const h = new Date().getHours()
    if (lang === 'uz') return h < 12 ? 'Xayrli tong' : h < 18 ? 'Salom' : 'Xayrli kech'
    if (lang === 'ru') return h < 12 ? 'Доброе утро' : h < 18 ? 'Здравствуйте' : 'Добрый вечер'
    return h < 12 ? 'Good morning' : h < 18 ? 'Hello' : 'Good evening'
  })()

  // No stats yet — empty state
  if (!loading && !stats) {
    return (
      <AppLayout>
        <div style={{ paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t('dash.sub', lang)}</div>
            <h1 className="display" style={{ fontSize: 'clamp(28px, 4.4vw, 56px)' }}>
              {greeting}{firstName ? <>, <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{firstName}</span></> : ''}.
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: 'color-mix(in oklab, var(--accent) 14%, transparent)',
            border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
          }}>
            <Icon name="image" size={28} strokeWidth={1.4} />
          </div>
          <h2 className="display" style={{ fontSize: 28, marginBottom: 10 }}>
            {lang === 'uz' ? 'Rasmlaringizni hali tahlil qilmadik' : lang === 'ru' ? 'Фото ещё не проанализированы' : 'No analysis yet'}
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--ink-dim)', marginBottom: 24, lineHeight: 1.6 }}>
            {lang === 'uz' ? 'Google Photos\'ni ulang — Lumio rasmlaringizni o\'qiydi va statistikani shu yerda ko\'rsatadi.'
              : lang === 'ru' ? 'Подключите Google Photos — статистика появится здесь.'
              : 'Connect Google Photos — statistics will appear here.'}
          </p>
          {permError && (
            <div className="alert-err" style={{ textAlign: 'left', marginBottom: 16 }}>
              {lang === 'uz' ? 'Firestore Rules taqiqlangan. Firebase Console → Firestore → Rules\'ni yangilang (firestore.rules faylidagi qoidalarni nusxalang).'
                : lang === 'ru' ? 'Firestore Rules блокирует. Обновите правила в Firebase Console.'
                : 'Firestore Rules block access. Update rules in Firebase Console.'}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/connect')} style={{ padding: '13px 24px' }}>
            {lang === 'uz' ? 'Google Photos bilan ulash' : lang === 'ru' ? 'Подключить Google Photos' : 'Connect Google Photos'}
            <Icon name="arrow" />
          </button>
        </div>
      </AppLayout>
    )
  }

  // Loading
  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
          <span className="spin" style={{ width: 32, height: 32, borderWidth: 2 }} />
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            {lang === 'uz' ? 'Yuklanmoqda...' : lang === 'ru' ? 'Загрузка...' : 'Loading...'}
          </div>
        </div>
      </AppLayout>
    )
  }

  // Real stats display
  const s = stats!
  const yearly = Object.entries(s.yearlyBreakdown)
    .map(([y, c]) => ({ year: Number(y), count: c }))
    .sort((a, b) => a.year - b.year)

  // Top season
  const seasonsArr = Object.entries(s.seasonBreakdown) as [keyof typeof s.seasonBreakdown, number][]
  const topSeason = seasonsArr.sort((a, b) => b[1] - a[1])[0]
  const topSeasonName = t(`season.${topSeason[0]}`, lang)
  const topMonthsLine = (s.topMonths || []).slice(0, 3).join(' · ')

  return (
    <AppLayout>
      {/* TOP BAR */}
      <div className="topbar-row" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 24, paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 36,
      }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t('dash.sub', lang)}</div>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 4.4vw, 56px)' }}>
            {greeting}{firstName ? <>, <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{firstName}</span></> : ''}.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <ThemeToggle />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-dim)', fontSize: 12.5 }}>
            <span className="spin" style={{ width: 8, height: 8, borderWidth: 1 }} />
            {t('dash.synced', lang)} · {timeAgo(s.lastAnalyzed, lang)}
          </div>
          <button onClick={() => navigate('/create')} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 13.5 }}>
            <Icon name="plus" strokeWidth={1.8} /> {t('cta.new_album', lang)}
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid-stat-3" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card" style={{
          padding: 32, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--bg-elev), var(--bg-card))',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: 220,
        }}>
          <div className="eyebrow">{t('dash.total', lang)}</div>
          <div className="display" style={{ fontSize: 'clamp(60px, 6vw, 96px)', lineHeight: 1 }}>
            <CountUp to={s.totalPhotos} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            {t('dash.across_a', lang)} <span style={{ color: 'var(--accent)' }}>{s.yearsTracked || yearly.length}</span> {t('dash.across_b', lang)}
          </div>
        </div>

        <div className="card" style={{ padding: 26 }}>
          <div className="eyebrow">{t('dash.seasons', lang)}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 22, height: 120 }}>
            {seasonsArr.map(([season, pct]) => {
              const isTop = season === topSeason[0]
              return (
                <div key={season} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: '100%', height: `${Math.max(pct * 1.6, 4)}px`,
                    background: isTop ? 'linear-gradient(to top, var(--accent-deep), var(--accent-bright))' : 'var(--bg-elev)',
                    border: '1px solid var(--line-strong)', borderRadius: 6, position: 'relative',
                  }}>
                    {isTop && (
                      <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{pct}%</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t(`season.${season}`, lang)}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-mute)', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            {lang === 'uz' ? `Eng faol fasl — ${topSeasonName}` : lang === 'ru' ? `Самый активный сезон — ${topSeasonName}` : `Most active season — ${topSeasonName}`}
          </div>
        </div>

        <div className="card" style={{ padding: 26 }}>
          <div className="eyebrow">{lang === 'uz' ? 'Faol oylar' : lang === 'ru' ? 'Активные месяцы' : 'Active months'}</div>
          <div style={{ marginTop: 22 }}>
            {(s.topMonths || []).slice(0, 3).map((m, i) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i === 0 ? 'var(--accent)' : 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  color: i === 0 ? '#0A0908' : 'var(--ink-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{m}</div>
              </div>
            ))}
            {(!s.topMonths || s.topMonths.length === 0) && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-mute)' }}>{lang === 'uz' ? 'Ma\'lumot yo\'q' : lang === 'ru' ? 'Нет данных' : 'No data'}</div>
            )}
          </div>
        </div>
      </div>

      {/* AI INSIGHT — real, from Gemini */}
      {s.aiInsight && (
        <div className="card" style={{
          padding: 36, marginBottom: 18,
          background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 12%, var(--bg-card)), var(--bg-card))',
          border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--line))',
          display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 24, alignItems: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'color-mix(in oklab, var(--accent) 22%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', border: '1px solid color-mix(in oklab, var(--accent) 40%, transparent)',
          }}>
            <Icon name="sparkle" strokeWidth={1.6} />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{t('dash.ai_eyebrow', lang)}</div>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, lineHeight: 1.45, color: 'var(--ink)' }}>
              "{s.aiInsight}"
            </p>
          </div>
          <button onClick={() => navigate('/story')} className="btn btn-ghost" style={{ padding: '11px 18px', fontSize: 13.5, whiteSpace: 'nowrap' }}>
            {t('dash.turn_story', lang)} <Icon name="arrow" />
          </button>
        </div>
      )}

      {/* CHART */}
      <div className="card" style={{ padding: 28, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div className="eyebrow">{t('dash.year_eyebrow', lang)}</div>
            <h3 className="display" style={{ fontSize: 26, marginTop: 8 }}>{t('dash.year_title', lang)}</h3>
          </div>
        </div>
        {yearly.length > 0 ? <YearChart data={yearly} /> : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
            {lang === 'uz' ? 'Ma\'lumot yo\'q' : lang === 'ru' ? 'Нет данных' : 'No data'}
          </div>
        )}
      </div>

      {/* RECENT ALBUMS */}
      {albums.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 className="display" style={{ fontSize: 26 }}>
              {lang === 'uz' ? 'So\'nggi albomlar' : lang === 'ru' ? 'Последние альбомы' : 'Recent albums'}
            </h3>
            <button onClick={() => navigate('/albums')} style={{ fontSize: 13, color: 'var(--ink-dim)', textDecoration: 'underline', textUnderlineOffset: 4 }}>
              {t('dash.sugg_all', lang)}
            </button>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {albums.slice(0, 3).map((a) => (
              <button key={a.id} onClick={() => navigate(`/editor/${a.id}`)} style={{
                padding: 24, borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)', border: '1px solid var(--line)',
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s var(--ease)',
              }}>
                <div className="chip chip-mute" style={{ marginBottom: 8 }}>
                  {a.type === 'story' ? t('dash.kind.story', lang) : t('dash.kind.travel', lang)} · {a.count} {t('dash.photos', lang)}
                </div>
                <h4 className="display" style={{ fontSize: 22, marginBottom: 4 }}>{a.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{a.date}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
