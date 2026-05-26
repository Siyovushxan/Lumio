import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import AppLayout from '../components/AppLayout'
import Paywall, { PaywallReason } from '../components/Paywall'
import { showToast } from '../components/Toast'
import Photo from '../components/Photo'
import Icon from '../components/Icon'
import AuthImage from '../components/AuthImage'
import { editAlbumCommand } from '../lib/gemini'

interface Message { role: 'bot' | 'user'; text: string; thinking?: boolean }

// Fallback (faqat hech narsa tanlanmaganda)
const FALLBACK_SEEDS = ['beach-08', 'family02', 'kid-018', 'forest03', 'sunset-2', 'birthday', 'park-77', 'kids-x4', 'sea-44']

const STORY_ERAS = [
  { era: '🍼', label: 'Chaqaloq', seed: 'kid-018' },
  { era: '🚼', label: 'Emaklash', seed: 'birthday' },
  { era: '👶', label: 'Birinchi qadamlar', seed: 'park-77' },
  { era: '📚', label: 'Maktab', seed: 'family02' },
]

export default function Editor() {
  const navigate = useNavigate()
  const { albumId } = useParams()
  const { albums, plan, lang, freeEditUsed, setFreeEditUsed, pickedPhotos } = useStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: lang === 'uz' ? 'Salom! Albomingizni qanday tahrirlamoqchisiz?' : lang === 'ru' ? 'Привет! Как изменить альбом?' : 'Hi! How would you like to edit your album?' }
  ])
  const [input, setInput] = useState('')
  const [editCount, setEditCount] = useState(0)
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [paywall, setPaywall] = useState<PaywallReason | null>(null)
  const [saving, setSaving] = useState(false)
  const msgEnd = useRef<HTMLDivElement>(null)

  const album = albums.find((a) => a.id === albumId)
  const isStory = album?.type === 'story'

  const QUICK_PROMPTS = isStory
    ? lang === 'uz'
      ? ['Bu qismni she\'riyroq qiling', 'Ertakni qisqartiring', 'Ko\'proq tavsif qo\'shing', 'Boshqa davr qo\'shing']
      : lang === 'ru' ? ['Сделай поэтичнее', 'Сократи', 'Больше описания', 'Добавь главу']
      : ['Make this more poetic', 'Shorten the chapter', 'Add more description', 'Add another era']
    : lang === 'uz'
      ? ['Bu rasmni olib tashlang', 'Eng yaxshi 5 rasmni qoldiring', 'Dekabr rasmlarini qo\'shing', 'Qayta tartiblashtiring']
      : lang === 'ru' ? ['Удали это фото', 'Оставь 5 лучших', 'Добавь фото декабря', 'Перетасуй']
      : ['Remove this photo', 'Keep top 5', 'Add December photos', 'Reorder']

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const addMsg = (role: 'bot' | 'user', text: string, thinking = false) => {
    setMessages((prev) => [...prev, { role, text, thinking }])
  }

  const canEdit = () => {
    if (!plan && freeEditUsed) { setPaywall('edit'); return false }
    if (plan === 'monthly' && editCount >= 3) { setPaywall('edit'); return false }
    return true
  }

  const send = async (prompt: string) => {
    if (!prompt.trim()) return
    if (!canEdit()) return
    if (!plan) setFreeEditUsed(true)

    addMsg('user', prompt)
    addMsg('bot', '...', true)
    setInput('')
    setEditCount((c) => c + 1)

    try {
      const reply = await editAlbumCommand(prompt, lang)
      setMessages((prev) => prev.filter((m) => !m.thinking))
      addMsg('bot', reply || (lang === 'uz' ? "O'zgartirish qo'llanildi." : lang === 'ru' ? 'Применено.' : 'Applied.'))
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => !m.thinking))
      const raw = String(e?.message || e)
      let msg: string
      if (raw.includes('API_KEY_INVALID') || raw.includes('API key not valid')) {
        msg = lang === 'uz' ? "Gemini API kalit noto'g'ri. .env.local'da VITE_GEMINI_API_KEY ni tekshiring." : 'Invalid API key.'
      } else if (raw.includes('SERVICE_DISABLED') || raw.includes('has not been used') || raw.includes('PERMISSION_DENIED')) {
        msg = lang === 'uz'
          ? "Generative Language API yoqilmagan. https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=lumio-28eac ga o'tib ENABLE bosing."
          : 'Enable Generative Language API in Google Cloud Console.'
      } else if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
        msg = lang === 'uz' ? 'Kvota tugadi. Bir oz kutib qayta urinib ko\'ring.' : 'Quota exhausted.'
      } else {
        msg = (lang === 'uz' ? 'AI xatosi: ' : 'AI error: ') + raw.slice(0, 200)
      }
      addMsg('bot', msg)
    }
  }

  const removePhoto = (i: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setRemoved((prev) => new Set([...prev, i]))
    addMsg('bot', `${i + 1}-${lang === 'uz' ? 'rasm olib tashlandi' : lang === 'ru' ? 'фото удалено' : 'photo removed'}`)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 1200))
    setSaving(false)
    showToast(lang === 'uz' ? "O'zgartirishlar saqlandi" : lang === 'ru' ? 'Сохранено' : 'Saved')
  }

  return (
    <AppLayout>
      {paywall && <Paywall reason={paywall} onClose={() => setPaywall(null)} />}

      <div style={{ padding: '0 0 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => navigate('/albums')}>
          <Icon name="arrowL" /> {lang === 'uz' ? 'Ortga' : lang === 'ru' ? 'Назад' : 'Back'}
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
          {album?.title || (lang === 'uz' ? 'Albom' : lang === 'ru' ? 'Альбом' : 'Album')}
        </div>
        <span className="chip" style={{ marginLeft: 'auto' }}>
          <Icon name="lock" size={12} strokeWidth={1.8} /> AES-256-GCM
        </span>
        <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} onClick={handleSave} disabled={saving}>
          {saving ? <span className="spin" /> : (lang === 'uz' ? 'Saqlash' : lang === 'ru' ? 'Сохранить' : 'Save')}
        </button>
      </div>

      <div className="editor-layout">
        <div className="editor-preview">
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            {isStory
              ? (lang === 'uz' ? 'Ertak-albom — rasmlar va matnlar' : lang === 'ru' ? 'Сюжет — фото и текст' : 'Story album — photos & text')
              : (lang === 'uz' ? `${album?.count || 9} ta rasm` : lang === 'ru' ? `${album?.count || 9} фото` : `${album?.count || 9} photos`)}
          </div>

          {isStory ? (
            <div>
              {STORY_ERAS.map((s, i) => {
                const real = pickedPhotos[i * Math.max(1, Math.floor(pickedPhotos.length / STORY_ERAS.length))]
                return (
                  <div key={i} className="story-slot">
                    <div className="story-img" style={{ overflow: 'hidden' }}>
                      {real
                        ? <AuthImage baseUrl={real.baseUrl} size="w200-h150-c" />
                        : <Photo seed={s.seed} w={140} h={105} />}
                    </div>
                    <div className="story-text-area">
                      <div className="era">{s.era} {s.label}</div>
                      <div>
                        {lang === 'uz'
                          ? `${s.label} davri — Lumio bu yerga AI yozgan matnni qo'yadi.`
                          : lang === 'ru' ? `${s.label} — AI напишет текст здесь.`
                          : `${s.label} era — AI narration goes here.`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="photo-grid">
              {(pickedPhotos.length > 0 ? pickedPhotos.slice(0, 12) : FALLBACK_SEEDS.map((s) => ({ id: s, baseUrl: '' }))).map((p, i) => (
                <div key={p.id} className="photo-slot" style={{
                  opacity: removed.has(i) ? 0.3 : 1,
                  pointerEvents: removed.has(i) ? 'none' : 'auto',
                  background: 'var(--bg-elev)',
                }}>
                  {p.baseUrl
                    ? <AuthImage baseUrl={p.baseUrl} size="w400-h300-c" />
                    : <Photo seed={p.id} w={300} h={220} />}
                  <button className="remove-btn" onClick={(e) => removePhoto(i, e)} title={lang === 'uz' ? 'Olib tashlash' : lang === 'ru' ? 'Удалить' : 'Remove'}>
                    <Icon name="x" size={12} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="editor-ai">
          <div className="editor-ai-header">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkle" size={14} strokeWidth={1.8} /> {lang === 'uz' ? 'AI Tahrirlash' : lang === 'ru' ? 'AI Правка' : 'AI Edit'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              {lang === 'uz' ? 'Matn yozing — AI bajaradi' : lang === 'ru' ? 'Напишите — AI выполнит' : 'Type — AI does it'}
              {plan === 'monthly' && <span style={{ marginLeft: 8 }}>({editCount}/3)</span>}
            </div>
          </div>

          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}${m.thinking ? ' thinking' : ''}`}>
                {m.thinking ? <span className="spin" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : m.text}
              </div>
            ))}
            <div ref={msgEnd} />
          </div>

          <div className="quick-prompts">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} className="quick-prompt" onClick={() => send(p)}>{p}</button>
            ))}
          </div>

          <div className="ai-input-area">
            <input
              className="field"
              style={{ flex: 1, padding: '10px 14px' }}
              placeholder={lang === 'uz' ? 'Buyruq yozing...' : lang === 'ru' ? 'Введите команду...' : 'Type a command...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
            />
            <button className="ai-send" onClick={() => send(input)}>
              <Icon name="arrow" size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
