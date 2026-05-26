import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useStore, Palette, Lang } from '../store/useStore'
import { t } from '../lib/i18n'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { showToast } from '../components/Toast'
import { clearAccessToken } from '../lib/googlePhotos'
import { PickerStore } from '../lib/photosPicker'

const PALETTES: { id: Palette; bg: string; acc: string; name: string }[] = [
  { id: 'gold',  bg: '#0A0908', acc: '#D4A574', name: 'Midnight Gold' },
  { id: 'amber', bg: '#0E0B07', acc: '#E8A552', name: 'Amber' },
  { id: 'rose',  bg: '#0F0A0C', acc: '#E8B4A0', name: 'Rose' },
  { id: 'ink',   bg: '#07090C', acc: '#B8B0A0', name: 'Ink' },
]

export default function Settings() {
  const navigate = useNavigate()
  const { uid, userName, userEmail, photosConnected, plan, theme, palette, lang, setTheme, setPalette, setLang, clearUser, setPhotosConnected, setPickedPhotos, setStats } = useStore()

  const logout = async () => {
    await signOut(auth)
    clearUser()
    navigate('/')
  }

  const disconnectPhotos = async () => {
    // Local state — token, picker session, picked photos
    clearAccessToken()
    PickerStore.clearSession()
    setPickedPhotos([])
    setStats(null)
    setPhotosConnected(false)

    // Firestore'da belgilab qo'yamiz (qoidalar yo'l qo'ysa)
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid, 'data', 'profile'),
          { googlePhotosConnected: false }, { merge: true })
      } catch (e) { console.warn('Firestore disconnect:', e) }
    }

    showToast(lang === 'uz' ? 'Google Photos uzildi' : lang === 'ru' ? 'Google Photos отключён' : 'Google Photos disconnected')
  }

  return (
    <AppLayout>
      <div style={{ paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{lang === 'uz' ? 'Sozlamalar' : lang === 'ru' ? 'Настройки' : 'Settings'}</div>
        <h1 className="display" style={{ fontSize: 'clamp(28px, 4.4vw, 56px)' }}>
          {lang === 'uz' ? 'Sozlamalar' : lang === 'ru' ? 'Настройки' : 'Settings'}
        </h1>
      </div>

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* APPEARANCE */}
        <section className="card" style={{ padding: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            {lang === 'uz' ? 'Ko\'rinish' : lang === 'ru' ? 'Внешний вид' : 'Appearance'}
          </div>

          {/* Theme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>{lang === 'uz' ? 'Mavzu' : lang === 'ru' ? 'Тема' : 'Theme'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: 2 }}>
                {lang === 'uz' ? 'Kunduzgi va tungi rejim' : lang === 'ru' ? 'Светлый и тёмный режимы' : 'Light and dark mode'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
              {(['dark', 'light'] as const).map((m) => (
                <button key={m} onClick={() => setTheme(m)} style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  color: theme === m ? '#0A0908' : 'var(--ink-dim)',
                  background: theme === m ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Icon name={m === 'dark' ? 'moon' : 'sun'} size={14} strokeWidth={1.8} />
                  {m === 'dark' ? (lang === 'uz' ? 'Tungi' : lang === 'ru' ? 'Тёмный' : 'Dark') : (lang === 'uz' ? 'Kunduzgi' : lang === 'ru' ? 'Светлый' : 'Light')}
                </button>
              ))}
            </div>
          </div>

          {/* Palette */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 500 }}>{lang === 'uz' ? 'Palitra' : lang === 'ru' ? 'Палитра' : 'Palette'}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: 2 }}>
                  {lang === 'uz' ? 'Ranglar kombinatsiyasi' : lang === 'ru' ? 'Цветовая комбинация' : 'Color combination'}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {PALETTES.map((p) => {
                const sel = palette === p.id
                return (
                  <button key={p.id} onClick={() => setPalette(p.id)} style={{
                    padding: 10, borderRadius: 12,
                    background: sel ? 'var(--bg-elev)' : 'transparent',
                    border: sel ? '1px solid var(--accent)' : '1px solid var(--line)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s var(--ease)',
                  }}>
                    <div style={{ width: '100%', height: 36, borderRadius: 6, background: p.bg, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: p.acc }} />
                    </div>
                    <div style={{ fontSize: 11, color: sel ? 'var(--ink)' : 'var(--ink-dim)' }}>{p.name}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>{lang === 'uz' ? 'Til' : lang === 'ru' ? 'Язык' : 'Language'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: 2 }}>
                {lang === 'uz' ? 'Interfeys tili' : lang === 'ru' ? 'Язык интерфейса' : 'Interface language'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
              {(['en', 'uz', 'ru'] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500,
                  color: lang === l ? '#0A0908' : 'var(--ink-dim)',
                  background: lang === l ? 'var(--accent)' : 'transparent',
                }}>{l}</button>
              ))}
            </div>
          </div>
        </section>

        {/* ACCOUNT */}
        <section className="card" style={{ padding: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            {lang === 'uz' ? 'Hisob' : lang === 'ru' ? 'Аккаунт' : 'Account'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>{userName}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>{userEmail}</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12.5 }} onClick={() => showToast(lang === 'uz' ? 'Tez kunda...' : lang === 'ru' ? 'Скоро...' : 'Coming soon...')}>
              {lang === 'uz' ? 'Tahrirlash' : lang === 'ru' ? 'Изменить' : 'Edit'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>{lang === 'uz' ? 'Obuna' : lang === 'ru' ? 'Подписка' : 'Plan'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
                {plan === 'yearly' ? 'Pro · $29/year' : plan === 'monthly' ? 'Pro · $4.99/mo' : (lang === 'uz' ? 'Bepul' : lang === 'ru' ? 'Бесплатный' : 'Free')}
              </div>
            </div>
            <span className="chip">{plan ? (lang === 'uz' ? 'Faol' : lang === 'ru' ? 'Активен' : 'Active') : (lang === 'uz' ? 'Bepul' : lang === 'ru' ? 'Бесплатный' : 'Free')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>Google Photos</div>
              <div style={{ fontSize: 12.5, color: photosConnected ? 'var(--success)' : 'var(--ink-mute)' }}>
                {photosConnected ? (lang === 'uz' ? 'Ulangan' : lang === 'ru' ? 'Подключено' : 'Connected') : (lang === 'uz' ? 'Ulanmagan' : lang === 'ru' ? 'Не подключено' : 'Not connected')}
              </div>
            </div>
            {photosConnected
              ? <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12.5, color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }} onClick={disconnectPhotos}>
                  {lang === 'uz' ? 'Uzish' : lang === 'ru' ? 'Отключить' : 'Disconnect'}
                </button>
              : <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12.5 }} onClick={() => navigate('/connect')}>
                  {lang === 'uz' ? 'Ulash' : lang === 'ru' ? 'Подключить' : 'Connect'}
                </button>}
          </div>
        </section>

        {/* PRIVACY */}
        <section className="card" style={{ padding: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>{t('priv.eyebrow', lang)}</div>

          {[
            { icon: 'lock' as const, title: t('priv.c2.t', lang), sub: t('priv.c2.s', lang) },
            { icon: 'image' as const, title: t('priv.c1.t', lang), sub: t('priv.c1.s', lang) },
            { icon: 'check' as const, title: t('priv.c3.t', lang), sub: t('priv.c3.s', lang) },
          ].map((row, i) => (
            <div key={row.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
                border: '1px solid color-mix(in oklab, var(--accent) 22%, transparent)',
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name={row.icon} size={16} strokeWidth={1.6} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{row.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: 2, lineHeight: 1.5 }}>{row.sub}</div>
              </div>
            </div>
          ))}
        </section>

        <button className="btn btn-ghost" style={{ padding: '14px 22px', color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }} onClick={logout}>
          {lang === 'uz' ? 'Chiqish' : lang === 'ru' ? 'Выйти' : 'Sign out'}
        </button>
      </div>
    </AppLayout>
  )
}
