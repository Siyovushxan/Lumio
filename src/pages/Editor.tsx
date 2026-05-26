import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore, PickedPhoto } from '../store/useStore'
import AppLayout from '../components/AppLayout'
import Paywall, { PaywallReason } from '../components/Paywall'
import { showToast } from '../components/Toast'
import Photo from '../components/Photo'
import Icon from '../components/Icon'
import AuthImage from '../components/AuthImage'
import { editAlbumCommand } from '../lib/gemini'

interface Message { role: 'bot' | 'user'; text: string; thinking?: boolean }

const FALLBACK_SEEDS = ['beach-08', 'family02', 'kid-018', 'forest03', 'sunset-2', 'birthday', 'park-77', 'kids-x4', 'sea-44']

/* ============ COMMAND PARSER ============ */
type Action =
  | { kind: 'remove_selected' }
  | { kind: 'remove_index'; idx: number }
  | { kind: 'keep_top'; n: number }
  | { kind: 'shuffle' }
  | { kind: 'reverse' }
  | { kind: 'reset' }
  | { kind: 'unknown' }

function parseCommand(prompt: string): Action {
  const s = prompt.toLowerCase()
  // Remove
  if (/olib tash|o['']?chir|delete|remove|удал/.test(s)) {
    const m = s.match(/(\d+)/)
    if (m) return { kind: 'remove_index', idx: parseInt(m[1]) - 1 }
    return { kind: 'remove_selected' }
  }
  // Keep top N
  const keepMatch = s.match(/(\d+)\s*(ta|rasm|photo|фото)?\s*(qoldir|keep|оставь|лучш|best|eng yaxshi)/) ||
                    s.match(/(qoldir|keep|оставь|eng yaxshi|best|top)\D*(\d+)/)
  if (keepMatch) {
    const n = parseInt(keepMatch[1].match(/\d+/) ? keepMatch[1] : keepMatch[2])
    if (n > 0 && n < 100) return { kind: 'keep_top', n }
  }
  // Reverse / chronological
  if (/teskari|reverse|перевернуть|inverse/.test(s)) return { kind: 'reverse' }
  // Shuffle / reorder
  if (/qayta tartib|shuffle|перетас|reorder|aralashtir/.test(s)) return { kind: 'shuffle' }
  // Reset
  if (/qayta tikla|reset|сбрось|restore/.test(s)) return { kind: 'reset' }
  return { kind: 'unknown' }
}

function actionConfirmation(act: Action, lang: 'en' | 'uz' | 'ru', count?: number): string {
  if (lang === 'uz') {
    switch (act.kind) {
      case 'remove_selected': return count === 0 ? 'Rasm tanlanmagan — biror rasmga bosing.' : `${count} ta rasm albomdan olib tashlandi.`
      case 'remove_index': return `${act.idx + 1}-rasm olib tashlandi.`
      case 'keep_top': return `Eng yaxshi ${act.n} ta rasm qoldirildi.`
      case 'shuffle': return 'Rasmlar yangi tartibga keltirildi.'
      case 'reverse': return "Rasmlar teskari tartiblandi (oxiridan boshigacha)."
      case 'reset': return 'Albom asl holatiga qaytarildi.'
      case 'unknown': return ''
    }
  }
  if (lang === 'ru') {
    switch (act.kind) {
      case 'remove_selected': return count === 0 ? 'Не выбрано фото — щёлкните по фото.' : `Удалено ${count} фото.`
      case 'remove_index': return `Фото ${act.idx + 1} удалено.`
      case 'keep_top': return `Оставлено лучших ${act.n} фото.`
      case 'shuffle': return 'Фото перетасованы.'
      case 'reverse': return 'Фото перевёрнуты.'
      case 'reset': return 'Альбом восстановлен.'
      case 'unknown': return ''
    }
  }
  switch (act.kind) {
    case 'remove_selected': return count === 0 ? 'No photo selected — click one first.' : `Removed ${count} photo(s).`
    case 'remove_index': return `Photo ${act.idx + 1} removed.`
    case 'keep_top': return `Kept top ${act.n} photos.`
    case 'shuffle': return 'Photos shuffled.'
    case 'reverse': return 'Photos reversed.'
    case 'reset': return 'Album reset.'
    case 'unknown': return ''
  }
}

export default function Editor() {
  const navigate = useNavigate()
  const { albumId } = useParams()
  const { albums, plan, lang, freeEditUsed, setFreeEditUsed, pickedPhotos } = useStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: lang === 'uz' ? 'Salom! Buyruq yozing — masalan: "Eng yaxshi 5 rasmni qoldiring" yoki rasmni tanlab "Bu rasmni olib tashlang".' : lang === 'ru' ? 'Привет! Напишите команду — например, «Оставь 5 лучших» или выберите фото и «Удали это».' : 'Hi! Type a command — e.g. "Keep top 5 photos" or select one and "Remove this".' }
  ])
  const [input, setInput] = useState('')
  const [editCount, setEditCount] = useState(0)
  const [paywall, setPaywall] = useState<PaywallReason | null>(null)
  const [saving, setSaving] = useState(false)
  const msgEnd = useRef<HTMLDivElement>(null)

  const album = albums.find((a) => a.id === albumId)
  const isStory = album?.type === 'story'

  // Albom rasmlari — boshlang'ich holat va tahrirlanadigan
  const sourcePhotos: PickedPhoto[] = pickedPhotos.length > 0
    ? pickedPhotos.slice(0, Math.min(album?.count || 12, pickedPhotos.length))
    : FALLBACK_SEEDS.map((s) => ({ id: s, baseUrl: '', mimeType: 'image/jpeg' }))

  const [albumPhotos, setAlbumPhotos] = useState<PickedPhoto[]>(sourcePhotos)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pickedphotos o'zgarganda albumPhotos'ni yangilash (faqat birinchi marta)
  useEffect(() => {
    if (albumPhotos.length === 0 && sourcePhotos.length > 0) {
      setAlbumPhotos(sourcePhotos)
    }
    // eslint-disable-next-line
  }, [pickedPhotos.length])

  const QUICK_PROMPTS = isStory
    ? lang === 'uz'
      ? ['Bu qismni she\'riyroq qiling', 'Ertakni qisqartiring', 'Ko\'proq tavsif qo\'shing']
      : lang === 'ru' ? ['Сделай поэтичнее', 'Сократи', 'Больше описания']
      : ['Make this more poetic', 'Shorten the chapter', 'Add more description']
    : lang === 'uz'
      ? ['Eng yaxshi 5 rasmni qoldiring', 'Tanlanganlarni olib tashlang', 'Qayta tartiblashtiring', 'Asl holatiga qaytaring']
      : lang === 'ru' ? ['Оставь 5 лучших', 'Удали выбранные', 'Перетасуй', 'Сбросить']
      : ['Keep top 5', 'Remove selected', 'Shuffle', 'Reset']

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const addMsg = (role: 'bot' | 'user', text: string, thinking = false) => {
    setMessages((prev) => [...prev, { role, text, thinking }])
  }

  const canEdit = () => {
    if (!plan && freeEditUsed) { setPaywall('edit'); return false }
    if (plan === 'monthly' && editCount >= 3) { setPaywall('edit'); return false }
    return true
  }

  // HAQIQATAN albom holatini o'zgartiradi
  const executeAction = (act: Action): { changed: boolean; affectedCount: number } => {
    switch (act.kind) {
      case 'remove_selected': {
        if (selectedIds.size === 0) return { changed: false, affectedCount: 0 }
        const n = selectedIds.size
        setAlbumPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)))
        setSelectedIds(new Set())
        return { changed: true, affectedCount: n }
      }
      case 'remove_index': {
        if (act.idx < 0 || act.idx >= albumPhotos.length) return { changed: false, affectedCount: 0 }
        setAlbumPhotos((prev) => prev.filter((_, i) => i !== act.idx))
        return { changed: true, affectedCount: 1 }
      }
      case 'keep_top': {
        setAlbumPhotos((prev) => prev.slice(0, Math.min(act.n, prev.length)))
        setSelectedIds(new Set())
        return { changed: true, affectedCount: act.n }
      }
      case 'shuffle': {
        setAlbumPhotos((prev) => [...prev].sort(() => Math.random() - 0.5))
        return { changed: true, affectedCount: albumPhotos.length }
      }
      case 'reverse': {
        setAlbumPhotos((prev) => [...prev].reverse())
        return { changed: true, affectedCount: albumPhotos.length }
      }
      case 'reset': {
        setAlbumPhotos(sourcePhotos)
        setSelectedIds(new Set())
        return { changed: true, affectedCount: sourcePhotos.length }
      }
      case 'unknown':
        return { changed: false, affectedCount: 0 }
    }
  }

  const send = async (prompt: string) => {
    if (!prompt.trim()) return
    if (!canEdit()) return
    if (!plan) setFreeEditUsed(true)

    addMsg('user', prompt)
    setInput('')
    setEditCount((c) => c + 1)

    // 1) Avval mahalliy parse — buyruqni bajaramiz
    const act = parseCommand(prompt)
    if (act.kind !== 'unknown') {
      const { changed, affectedCount } = executeAction(act)
      const confirm = actionConfirmation(act, lang, affectedCount)
      addMsg('bot', confirm)
      if (changed) showToast(confirm)
      return
    }

    // 2) Aniq buyruq emas — AI'dan ijodiy javob so'raymiz
    addMsg('bot', '...', true)
    try {
      const reply = await editAlbumCommand(prompt, lang)
      setMessages((prev) => prev.filter((m) => !m.thinking))
      addMsg('bot', reply || (lang === 'uz' ? "Buyruqni tushunmadim. Misol: 'Eng yaxshi 5 rasmni qoldiring'." : 'I didn\'t understand.'))
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => !m.thinking))
      const raw = String(e?.message || e)
      let msg: string
      if (raw.includes('VITE_GROQ_API_KEY') || raw.includes('Invalid API Key') || raw.includes('invalid_api_key')) {
        msg = lang === 'uz' ? "Groq API kalit noto'g'ri." : 'Invalid API key.'
      } else if (raw.includes('rate_limit') || raw.includes('429')) {
        msg = lang === 'uz' ? "Kvota tugadi." : 'Rate limit.'
      } else if (raw.includes('NETWORK_BLOCKED') || raw.includes('Failed to fetch')) {
        msg = lang === 'uz' ? 'Tarmoq xato.' : 'Network error.'
      } else {
        msg = (lang === 'uz' ? 'AI xato: ' : 'AI error: ') + raw.slice(0, 160)
      }
      addMsg('bot', msg)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setAlbumPhotos((prev) => prev.filter((p) => p.id !== id))
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    addMsg('bot', lang === 'uz' ? 'Rasm olib tashlandi.' : 'Removed.')
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    showToast(lang === 'uz' ? `Albom saqlandi (${albumPhotos.length} ta rasm)` : `Saved (${albumPhotos.length} photos)`)
  }

  return (
    <AppLayout>
      {paywall && <Paywall reason={paywall} onClose={() => setPaywall(null)} />}

      <div style={{ padding: '0 0 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => navigate('/albums')}>
          <Icon name="arrowL" /> {lang === 'uz' ? 'Ortga' : lang === 'ru' ? 'Назад' : 'Back'}
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
          {album?.title || (lang === 'uz' ? 'Albom' : 'Album')}
        </div>
        <span className="chip" style={{ marginLeft: 'auto' }}>
          <Icon name="lock" size={12} strokeWidth={1.8} /> AES-256
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
          {albumPhotos.length} {lang === 'uz' ? 'rasm' : 'photos'}
          {selectedIds.size > 0 && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>· {selectedIds.size} {lang === 'uz' ? 'tanlangan' : 'selected'}</span>}
        </span>
        <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} onClick={handleSave} disabled={saving}>
          {saving ? <span className="spin" /> : (lang === 'uz' ? 'Saqlash' : 'Save')}
        </button>
      </div>

      <div className="editor-layout">
        <div className="editor-preview">
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            {lang === 'uz' ? 'Bosing — tanlash / qaytadan bosish — bekor qilish' : 'Click to select / again to deselect'}
          </div>

          <div className="photo-grid">
            {albumPhotos.map((p, i) => {
              const selected = selectedIds.has(p.id)
              return (
                <div
                  key={p.id}
                  className={`photo-slot${selected ? ' selected' : ''}`}
                  onClick={() => toggleSelect(p.id)}
                  style={{ background: 'var(--bg-elev)', position: 'relative' }}
                >
                  {p.baseUrl
                    ? <AuthImage baseUrl={p.baseUrl} size="w400-h300-c" local={p.local} />
                    : <Photo seed={p.id} w={300} h={220} />}

                  {/* Index badge */}
                  <div style={{
                    position: 'absolute', top: 6, left: 6,
                    background: 'rgba(10,9,8,0.6)', backdropFilter: 'blur(6px)',
                    padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                    color: '#F5EFE0',
                  }}>{i + 1}</div>

                  {/* Selected check */}
                  {selected && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--accent)', color: '#0A0908',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icon name="check" size={12} strokeWidth={2.4} /></div>
                  )}

                  {/* Remove button (X) */}
                  <button className="remove-btn" onClick={(e) => removeOne(p.id, e)}>
                    <Icon name="x" size={12} strokeWidth={2.2} />
                  </button>
                </div>
              )
            })}
          </div>

          {albumPhotos.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
              {lang === 'uz' ? 'Albom bo\'sh. "Asl holatiga qaytaring" deb yozing.' : 'Album empty. Type "Reset".'}
            </div>
          )}
        </div>

        <div className="editor-ai">
          <div className="editor-ai-header">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkle" size={14} strokeWidth={1.8} /> {lang === 'uz' ? 'AI Tahrirlash' : 'AI Edit'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              {lang === 'uz' ? 'Matn yozing — albomga qo\'llaniladi' : 'Type — applies to album'}
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
              placeholder={lang === 'uz' ? 'Buyruq yozing...' : 'Type a command...'}
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
