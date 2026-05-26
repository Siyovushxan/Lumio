import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'
import { useStore } from '../store/useStore'
import { t } from '../lib/i18n'
import Wordmark from '../components/Wordmark'
import Icon from '../components/Icon'
import { Polaroid } from '../components/Photo'
import ThemeToggle from '../components/ThemeToggle'

const AUTH_PHOTOS: { seed: string; x: string; y: string; r: number; w: number }[] = [
  { seed: 'kid-018',  x: '20%', y: '15%', r: -8, w: 200 },
  { seed: 'sunset-2', x: '55%', y: '8%',  r: 6,  w: 180 },
  { seed: 'beach-08', x: '15%', y: '50%', r: 5,  w: 220 },
  { seed: 'birthday', x: '52%', y: '48%', r: -6, w: 220 },
  { seed: 'park-77',  x: '30%', y: '78%', r: 3,  w: 180 },
]

export default function Auth() {
  const navigate = useNavigate()
  const { uid, lang, setUser } = useStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (uid) navigate('/dashboard') }, [uid])

  const saveProfile = async (uid: string, name: string, email: string) => {
    const ref = doc(db, 'users', uid, 'data', 'profile')
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, { name, email, googlePhotosConnected: false, createdAt: serverTimestamp() })
    }
  }

  const afterLogin = async (user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }) => {
    // displayName 2 belgidan qisqa bo'lsa — email prefiksini ishlatamiz
    const dn = (user.displayName || '').trim()
    const emailPrefix = user.email?.split('@')[0] || 'User'
    const base = dn.length >= 2 ? dn : emailPrefix
    const cap = base.charAt(0).toUpperCase() + base.slice(1)
    setUser(user.uid, cap, user.email || '', user.photoURL || '')
    try { await saveProfile(user.uid, cap, user.email || '') } catch { /* firestore rules yet */ }
    navigate('/connect')
  }

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      const res = await signInWithPopup(auth, googleProvider)
      await afterLogin(res.user)
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') setError(lang === 'uz' ? "Google orqali kirishda xato." : lang === 'ru' ? "Ошибка входа через Google." : "Google sign-in failed.")
    } finally { setLoading(false) }
  }

  const handleEmail = async () => {
    setError('')
    if (!email.includes('@')) { setError(lang === 'uz' ? "To'g'ri email kiriting" : lang === 'ru' ? 'Введите корректный email' : 'Enter a valid email'); return }
    if (pass.length < 6) { setError(lang === 'uz' ? 'Parol kamida 6 belgi bo\'lsin' : lang === 'ru' ? 'Пароль минимум 6 символов' : 'Password min 6 characters'); return }
    if (mode === 'signup' && !name.trim()) { setError(lang === 'uz' ? 'Ismingizni kiriting' : lang === 'ru' ? 'Введите имя' : 'Enter your name'); return }

    setLoading(true)
    try {
      if (mode === 'signin') {
        const res = await signInWithEmailAndPassword(auth, email, pass)
        await afterLogin(res.user)
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, pass)
        await updateProfile(res.user, { displayName: name.trim() })
        await afterLogin({ ...res.user, displayName: name.trim() })
      }
    } catch (e: any) {
      const msgs: Record<string, string> = {
        'auth/user-not-found': lang === 'uz' ? 'Hisob topilmadi' : lang === 'ru' ? 'Аккаунт не найден' : 'Account not found',
        'auth/wrong-password': lang === 'uz' ? "Parol noto'g'ri" : lang === 'ru' ? 'Неверный пароль' : 'Wrong password',
        'auth/email-already-in-use': lang === 'uz' ? 'Bu email allaqachon ishlatilgan' : lang === 'ru' ? 'Email уже занят' : 'Email already in use',
        'auth/too-many-requests': lang === 'uz' ? 'Juda ko\'p urinish.' : lang === 'ru' ? 'Слишком много попыток.' : 'Too many attempts.',
      }
      setError(msgs[e.code] || (lang === 'uz' ? 'Xato yuz berdi' : lang === 'ru' ? 'Произошла ошибка' : 'Something went wrong'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1.2fr' }}>
      {/* LEFT — photo collage */}
      <div style={{
        position: 'relative', background: 'var(--bg-soft)', overflow: 'hidden',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', padding: 48,
      }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-dim)', fontSize: 13 }}>
          <Icon name="arrowL" /> {t('cta.back', lang)}
        </button>

        <div style={{ flex: 1, position: 'relative', marginTop: 40 }}>
          {AUTH_PHOTOS.map((p, i) => (
            <div key={p.seed} style={{
              position: 'absolute', left: p.x, top: p.y,
              transform: `rotate(${p.r}deg)`,
              animation: `float ${4 + i * 0.4}s ease-in-out ${i * 0.3}s infinite alternate`,
            }}>
              <Polaroid seed={p.seed} w={p.w} />
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.4, maxWidth: 420, color: 'var(--ink)' }}>
            {lang === 'uz' ? '"Yorug\'likni xotiraga aylantiramiz."' : lang === 'ru' ? '«Мы превращаем свет в память».' : '"We turn light into memory."'}
          </p>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>— Lumio</p>
        </div>
      </div>

      {/* RIGHT — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <ThemeToggle compact />
        </div>

        <div style={{ width: '100%', maxWidth: 420 }}>
          <Wordmark size={28} />
          <h1 className="display" style={{ fontSize: 48, marginTop: 36, lineHeight: 1.05 }}>
            {mode === 'signin' ? t('auth.welcome', lang) : (
              <>{t('auth.begin.a', lang)} <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{t('auth.begin.b', lang)}</span> {t('auth.begin.c', lang)}</>
            )}
          </h1>
          <p style={{ marginTop: 12, color: 'var(--ink-dim)', fontSize: 14.5 }}>
            {mode === 'signin' ? t('auth.welcome.sub', lang) : t('auth.begin.sub', lang)}
          </p>

          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleGoogle} disabled={loading} className="btn btn-ghost" style={{ padding: '14px 18px', justifyContent: 'flex-start', gap: 14 }}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M19.6 10.2c0-.7-.06-1.4-.18-2H10v3.87h5.4c-.23 1.25-.94 2.3-2 3.02v2.5h3.23c1.89-1.74 2.97-4.3 2.97-7.4z" fill="#4285F4" />
                <path d="M10 20c2.7 0 4.96-.9 6.61-2.41l-3.22-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.6-4.12H1.07v2.59A9.99 9.99 0 0 0 10 20z" fill="#34A853" />
                <path d="M4.4 11.92a6 6 0 0 1 0-3.83V5.5H1.07a10 10 0 0 0 0 8.99l3.33-2.58z" fill="#FBBC05" />
                <path d="M10 3.98c1.47 0 2.79.5 3.83 1.49l2.86-2.86C14.96.99 12.7 0 10 0A9.99 9.99 0 0 0 1.07 5.5L4.4 8.09C5.2 5.74 7.4 3.98 10 3.98z" fill="#EA4335" />
              </svg>
              {t('auth.continue.g', lang)}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0', color: 'var(--ink-mute)', fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span>{t('auth.or_email', lang)}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {error && <div className="alert-err">{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <input className="field" type="text" placeholder={t('auth.field.name.ph', lang)} value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input className="field" type="email" placeholder={t('auth.field.email', lang)} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEmail()} />
            <input className="field" type="password" placeholder={t('auth.field.pass', lang)} value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEmail()} />

            <button className="btn btn-primary" onClick={handleEmail} disabled={loading} style={{ marginTop: 8, padding: '14px 18px', fontSize: 14.5 }}>
              {loading ? <span className="spin" /> : mode === 'signin' ? t('cta.signin', lang) : t('cta.start', lang)}
              {!loading && <Icon name="arrow" />}
            </button>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--ink-dim)' }}>
            <a onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
              style={{ color: 'var(--accent)', cursor: 'pointer' }}>
              {mode === 'signin' ? t('auth.toggle.signup', lang) : t('auth.toggle.signin', lang)}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
