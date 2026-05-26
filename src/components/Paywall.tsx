import { useStore } from '../store/useStore'

export type PaywallReason = 'download' | 'generate' | 'story' | 'edit'

interface Props {
  reason: PaywallReason
  onClose: () => void
}

const content: Record<PaywallReason, { icon: string; title: string; sub: string }> = {
  download: {
    icon: '📥',
    title: 'PDF yuklab olish uchun obuna kerak',
    sub: 'Albomingiz tayyor va AES-256-GCM bilan shifrlangan holda saqlanmoqda. Yuklab olish uchun oylik yoki yillik obunani tanlang.',
  },
  generate: {
    icon: '✨',
    title: 'Yangi albom yaratish uchun obuna kerak',
    sub: "Birinchi bepul generatsiyangizdan foydalandingiz. Cheksiz albomlar yaratish uchun obunani tanlang.",
  },
  story: {
    icon: '📖',
    title: 'Ertak-Albom faqat Yillik tarif uchun',
    sub: "Ertak-Albom funksiyasi faqat Yillik tarifda mavjud. Hozir Yillik tarifga o'ting.",
  },
  edit: {
    icon: '✏️',
    title: 'AI tahrirlash uchun obuna kerak',
    sub: 'Bepul AI tahrirlashdan foydalandingiz. Davom etish uchun obunani tanlang.',
  },
}

export default function Paywall({ reason, onClose }: Props) {
  const setPlan = useStore((s) => s.setPlan)
  const { icon, title, sub } = content[reason]

  const subscribe = (plan: 'monthly' | 'yearly') => {
    setPlan(plan)
    onClose()
    // TODO: Stripe Checkout integration
  }

  return (
    <div className="paywall-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="paywall-card fade-in">
        <span className="paywall-icon">{icon}</span>
        <div className="paywall-title">{title}</div>
        <p className="paywall-sub">{sub}</p>
        <div className="paywall-plans">
          <div className="paywall-plan" onClick={() => subscribe('monthly')}>
            <div className="pp-top">
              <span className="pp-name">Oylik</span>
              <span className="pp-price">$4.99<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>/oy</span></span>
            </div>
            <div className="pp-desc">3 albom/oy · AI tahrirlash (3 prompt/albom) · 48 soat saqlash</div>
          </div>
          <div className="paywall-plan best" onClick={() => subscribe('yearly')}>
            <div className="pp-top">
              <span className="pp-name">Yillik <span className="pp-badge">Eng yaxshi</span></span>
              <span className="pp-price">$34.99<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>/yil</span></span>
            </div>
            <div className="pp-desc">Cheksiz albomlar · Ertak-Albom · AI tahrirlash · 6 til · Statistika</div>
          </div>
        </div>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: 13 }}>Keyinroq ←</button>
      </div>
    </div>
  )
}
