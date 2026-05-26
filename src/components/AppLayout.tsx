import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useStore } from '../store/useStore'
import { t } from '../lib/i18n'
import Wordmark from './Wordmark'
import Icon from './Icon'
import Toast from './Toast'

interface Item { to: string; icon: 'home' | 'plus' | 'book' | 'settings' | 'sparkle'; k: string }

const ITEMS: Item[] = [
  { to: '/dashboard', icon: 'home', k: 'nav.dashboard' },
  { to: '/create', icon: 'plus', k: 'nav.create' },
  { to: '/story', icon: 'sparkle', k: 'nav.story' },
  { to: '/albums', icon: 'book', k: 'nav.albums' },
  { to: '/settings', icon: 'settings', k: 'nav.settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userName, lang, clearUser } = useStore()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 820)

  useEffect(() => {
    const on = () => setIsMobile(window.innerWidth <= 820)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const logout = async () => {
    await signOut(auth)
    clearUser()
    navigate('/')
  }

  if (isMobile) {
    return (
      <>
        <aside style={{
          borderBottom: '1px solid var(--line)', padding: '12px 16px',
          background: 'var(--bg-soft)', position: 'sticky', top: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <button onClick={() => navigate('/dashboard')}><Wordmark size={18} /></button>
          <div style={{ display: 'flex', gap: 4 }}>
            {ITEMS.map((it) => (
              <NavLink key={it.to} to={it.to}
                title={t(it.k, lang)}
                className={({ isActive }) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}
                style={({ isActive }) => ({
                  width: 38, height: 38, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? 'var(--ink)' : 'var(--ink-dim)',
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  border: isActive ? '1px solid var(--line-strong)' : '1px solid transparent',
                  textDecoration: 'none',
                })}>
                <Icon name={it.icon} />
              </NavLink>
            ))}
          </div>
        </aside>
        <main className="app-main">{children}</main>
        <Toast />
      </>
    )
  }

  return (
    <div className="app-shell">
      <aside style={{
        borderRight: '1px solid var(--line)', padding: '28px 18px',
        display: 'flex', flexDirection: 'column', gap: 4,
        background: 'var(--bg-soft)', position: 'sticky', top: 0, height: '100vh',
      }}>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 22px' }}>
          <Wordmark size={22} />
        </button>

        <div style={{ height: 1, background: 'var(--line)', margin: '0 12px 12px' }} />

        {ITEMS.map((it) => (
          <NavLink key={it.to} to={it.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 12, fontSize: 14,
              color: isActive ? 'var(--ink)' : 'var(--ink-dim)',
              background: isActive ? 'var(--bg-card)' : 'transparent',
              border: isActive ? '1px solid var(--line-strong)' : '1px solid transparent',
              transition: 'all 0.2s var(--ease)', textDecoration: 'none',
            })}>
            {({ isActive }) => (
              <>
                <Icon name={it.icon} />
                <span>{t(it.k, lang)}</span>
                {isActive && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
              </>
            )}
          </NavLink>
        ))}

        {/* User block */}
        <div style={{
          marginTop: 'auto', padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderTop: '1px solid var(--line)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-bright), var(--accent-deep))',
            color: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>{userName.charAt(0).toUpperCase() || 'U'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName.split(' ')[0]}</div>
            <div onClick={logout} style={{ fontSize: 11, color: 'var(--ink-mute)', cursor: 'pointer' }}>{lang === 'uz' ? 'Chiqish' : lang === 'ru' ? 'Выйти' : 'Sign out'}</div>
          </div>
          <Icon name="lock" size={14} strokeWidth={1.4} className="" />
        </div>

        <div style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
          color: 'var(--accent)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500,
          borderTop: '1px solid var(--line)',
        }}>
          {t('enc.title', lang)}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--ink-mute)' }}>AES-256</span>
        </div>
      </aside>

      <main className="app-main">{children}</main>
      <Toast />
    </div>
  )
}
