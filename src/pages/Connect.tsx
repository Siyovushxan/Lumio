import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googlePhotosProvider } from '../lib/firebase'
import { useStore } from '../store/useStore'
import { t } from '../lib/i18n'
import { setAccessToken, clearAccessToken, verifyPhotosScope } from '../lib/googlePhotos'
import {
  createPickerSession, getPickerSession, pollUntilPicked, PickerStore,
} from '../lib/photosPicker'
import Wordmark from '../components/Wordmark'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'

type Stage = 'idle' | 'signing' | 'creating' | 'picking' | 'done'

export default function Connect() {
  const navigate = useNavigate()
  const { uid, lang, setPhotosConnected } = useStore()
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [pickerUri, setPickerUri] = useState('')
  const [tick, setTick] = useState(0)
  const stopRef = useRef(false)

  useEffect(() => () => { stopRef.current = true }, [])

  const openPickerWindow = (uri: string) => {
    const pW = 720, pH = 880
    const left = Math.round(window.screenX + (window.outerWidth - pW) / 2)
    const top = Math.round(window.screenY + (window.outerHeight - pH) / 2)
    return window.open(uri, 'lumio_picker', `width=${pW},height=${pH},left=${left},top=${top},toolbar=no,location=no,menubar=no,status=no`)
  }

  const handleConnect = async () => {
    setError('')
    clearAccessToken()
    PickerStore.clearSession()
    setStage('signing')

    try {
      // 1) Firebase sign-in (o'zining popup'i — boshqa popup ochmaymiz)
      const res = await signInWithPopup(auth, googlePhotosProvider)
      const cred = GoogleAuthProvider.credentialFromResult(res)
      const token = cred?.accessToken
      if (!token) throw new Error('No access token')
      setAccessToken(token)

      // 2) Scope tekshiruvi
      const ok = await verifyPhotosScope(token, 'photospicker')
      if (!ok) throw new Error('SCOPE_NOT_GRANTED')

      // 3) Picker session yaratish
      setStage('creating')
      const session = await createPickerSession(token)
      PickerStore.setSession(session.id)
      setPickerUri(session.pickerUri)

      // 4) Picker oynani ochish (Firebase popup yopilgandan keyin)
      setStage('picking')
      const popup = openPickerWindow(session.pickerUri)
      if (!popup) {
        // Brauzer bloklagan bo'lishi mumkin — "Reopen" tugmasi ekranda ko'rinadi
        console.warn('Picker popup blocked — user can click reopen button')
      }

      // 5) Tanlash tugashini kutamiz
      await pollUntilPicked(token, session.id, {
        intervalMs: 1500,
        onTick: () => { if (!stopRef.current) setTick((t) => t + 1) },
      })

      // Picker tugadi — popup'ni yopamiz. COOP photos.google.com'da opener aloqasini
      // uzganligi sababli, oldin o'z domenimizga qaytaramiz, keyin yopamiz.
      const closePopup = () => {
        if (!popup || popup.closed) return
        try { popup.location.href = window.location.origin + '/?picker=done' } catch {}
        setTimeout(() => { try { popup.close() } catch {} }, 150)
        // Yana bir kafolat — agar yopilmasa, qayta urinamiz
        setTimeout(() => { try { popup.close() } catch {} }, 600)
      }
      closePopup()

      // 6) Firestore'ga ulanish belgisini saqlash
      if (uid) {
        try {
          await setDoc(doc(db, 'users', uid, 'data', 'profile'),
            { googlePhotosConnected: true, connectedAt: serverTimestamp() },
            { merge: true })
        } catch (e) { console.warn('Firestore profile:', e) }
      }

      setPhotosConnected(true)
      setStage('done')
      navigate('/analyzing')
    } catch (e: any) {
      const msg = String(e.message || e)
      console.error('Picker connect:', msg)
      if (msg.includes('SCOPE_NOT_GRANTED')) {
        setError(lang === 'uz'
          ? "Picker ruxsati berilmadi. Consent oynasida 'Просмотр Google Photos через выбор' belgilangan bo'lsin."
          : lang === 'ru'
          ? "Доступ к Picker не предоставлен."
          : "Picker scope not granted.")
      } else if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        setError(lang === 'uz'
          ? "Photos Picker API yoqilmagan yoki scope qo'shilmagan. Cloud Console → Data Access → photospicker.mediaitems.readonly qo'shing va Photos Picker API'ni yoqing."
          : lang === 'ru'
          ? 'Включите Photos Picker API и добавьте scope photospicker.mediaitems.readonly.'
          : 'Enable Photos Picker API and add photospicker.mediaitems.readonly scope.')
      } else if (msg.includes('PICKER_TIMEOUT')) {
        setError(lang === 'uz' ? 'Vaqt tugadi. Qayta urinib ko\'ring.' : lang === 'ru' ? 'Время истекло.' : 'Timed out.')
      } else if (msg.includes('popup-blocked')) {
        setError(lang === 'uz'
          ? "Brauzer popup'ni bloklamoqda. Adres satrining o'ng tarafidagi popup ikonkasini bosib, localhost uchun ruxsat bering va qayta urinib ko'ring."
          : lang === 'ru' ? 'Браузер блокирует popup. Разрешите popup для localhost.' : 'Browser blocked popups. Allow popups for localhost.')
      } else if (msg.includes('popup-closed') || msg.includes('cancelled-popup')) {
        setError(lang === 'uz' ? "Siz oynani yopdingiz." : lang === 'ru' ? 'Окно закрыто.' : 'Popup closed.')
      } else {
        setError(msg)
      }
      setStage('idle')
    }
  }

  const reopenPicker = () => {
    if (pickerUri) openPickerWindow(pickerUri)
  }

  const useDemoMode = () => {
    setPhotosConnected(true)
    navigate('/dashboard')
  }

  const titleByStage = (() => {
    if (stage === 'signing') return lang === 'uz' ? 'Google ulanmoqda...' : lang === 'ru' ? 'Подключение Google...' : 'Signing in...'
    if (stage === 'creating') return lang === 'uz' ? 'Picker tayyorlanmoqda...' : lang === 'ru' ? 'Подготовка Picker...' : 'Preparing picker...'
    if (stage === 'picking') return lang === 'uz' ? 'Rasm tanlashingizni kutyapmiz...' : lang === 'ru' ? 'Ожидаем выбор фото...' : 'Waiting for you to pick...'
    return lang === 'uz' ? 'Rasmlaringizni ulang' : lang === 'ru' ? 'Подключите фото' : 'Connect your photos'
  })()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 48px' }}>
        <Wordmark size={22} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ThemeToggle compact />
          <button className="btn btn-ghost" style={{ padding: '9px 18px', fontSize: 13.5 }} onClick={() => navigate('/auth')}>
            <Icon name="arrowL" /> {t('cta.back', lang)}
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div className="card" style={{ padding: 48, maxWidth: 560, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
            background: 'color-mix(in oklab, var(--accent) 14%, transparent)',
            border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
          }}>
            {stage === 'picking' ? <span className="spin" style={{ width: 28, height: 28, borderWidth: 2.5 }} /> : <Icon name="image" size={32} strokeWidth={1.4} />}
          </div>

          <h1 className="display" style={{ fontSize: 30, marginBottom: 12 }}>{titleByStage}</h1>

          {stage === 'idle' && (
            <p style={{ fontSize: 14.5, color: 'var(--ink-dim)', lineHeight: 1.6, marginBottom: 28 }}>
              {lang === 'uz'
                ? "Google'ning rasmiy 'Picker' oynasida o'zingiz tahlil uchun rasmlarni tanlaysiz. Lumio faqat tanlangan rasmlar metadatasini oladi."
                : lang === 'ru'
                ? 'В официальном окне Google Picker вы сами выбираете фото для анализа.'
                : 'You pick the photos in Google\'s official picker. Lumio only reads metadata of what you pick.'}
            </p>
          )}

          {stage === 'picking' && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.6, marginBottom: 18 }}>
                {lang === 'uz'
                  ? "Yangi tab ochildi. O'sha yerda rasmlarni tanlang va 'Done' bosing. Bu sahifa avtomatik davom etadi."
                  : lang === 'ru'
                  ? 'Открылась новая вкладка. Выберите фото и нажмите Done.'
                  : 'A new tab opened. Pick photos there and press Done.'}
              </p>
              <button className="btn btn-ghost" onClick={reopenPicker} style={{ padding: '10px 18px', fontSize: 13 }}>
                {lang === 'uz' ? 'Picker yopilgan bo\'lsa, qayta ochish' : lang === 'ru' ? 'Открыть Picker снова' : 'Reopen picker'}
              </button>
              <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--ink-mute)' }}>
                {lang === 'uz' ? 'Tekshirilmoqda' : lang === 'ru' ? 'Опрос' : 'Polling'} · {tick}
              </div>
            </div>
          )}

          {error && <div className="alert-err" style={{ textAlign: 'left' }}>{error}</div>}

          {stage === 'idle' && (
            <div style={{
              background: 'color-mix(in oklab, var(--success) 8%, transparent)',
              border: '1px solid color-mix(in oklab, var(--success) 25%, transparent)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 24, textAlign: 'left',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="lock" strokeWidth={1.6} />
              <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.55 }}>
                {lang === 'uz'
                  ? "Faqat siz tanlagan rasmlar uchun metadata o'qiladi. Rasm fayllari serverga kelmaydi."
                  : lang === 'ru'
                  ? 'Читается только метаданные выбранных вами фото. Файлы не загружаются.'
                  : 'Only metadata for the photos you pick is read. No files are uploaded.'}
              </div>
            </div>
          )}

          {stage !== 'picking' && (
            <button className="btn btn-primary" onClick={handleConnect} disabled={stage !== 'idle'} style={{ width: '100%', padding: '15px 18px', fontSize: 14.5 }}>
              {stage === 'idle'
                ? (lang === 'uz' ? "Google Photos'ni ochish" : lang === 'ru' ? 'Открыть Google Photos' : 'Open Google Photos')
                : <span className="spin" />}
            </button>
          )}

          {stage === 'idle' && (
            <button className="btn btn-ghost" onClick={useDemoMode} style={{ width: '100%', padding: '11px 18px', fontSize: 13, marginTop: 10 }}>
              {lang === 'uz' ? 'Demo rejimda davom etish' : lang === 'ru' ? 'Продолжить в демо' : 'Continue in demo mode'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
