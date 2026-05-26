import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { t } from '../lib/i18n'
import Wordmark from '../components/Wordmark'
import Icon from '../components/Icon'
import Photo, { Polaroid } from '../components/Photo'
import CountUp from '../components/CountUp'
import ThemeToggle from '../components/ThemeToggle'
import { useReveal } from '../hooks/useReveal'

const HERO_SEEDS = ['beach-08','family02','kid-018','forest03','sunset-2','birthday','park-77','kids-x4','sea-44','street1','window5','morning7']

/* ============================================================================
   NAV
============================================================================ */
function LandingNav({ go }: { go: (s: string) => void }) {
  const { lang } = useStore()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30)
    on()
    window.addEventListener('scroll', on)
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <nav className="landing-nav" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: scrolled ? '14px 36px' : '22px 48px',
      transition: 'all 0.3s var(--ease)',
      background: scrolled ? 'color-mix(in oklab, var(--bg) 88%, transparent)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
    }}>
      <Wordmark size={22} />
      <div className="nav-links-desk" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <a onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ fontSize: 13.5, color: 'var(--ink-dim)', cursor: 'pointer' }}>{t('nav.how', lang)}</a>
        <a onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ fontSize: 13.5, color: 'var(--ink-dim)', cursor: 'pointer' }}>{t('nav.story', lang)}</a>
        <a onClick={() => document.getElementById('privacy')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ fontSize: 13.5, color: 'var(--ink-dim)', cursor: 'pointer' }}>{t('nav.privacy', lang)}</a>
        <a onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ fontSize: 13.5, color: 'var(--ink-dim)', cursor: 'pointer' }}>{t('nav.pricing', lang)}</a>

        <ThemeToggle />

        <button onClick={() => go('/auth')} className="btn btn-ghost" style={{ padding: '9px 18px', fontSize: 13.5 }}>{t('cta.signin', lang)}</button>
        <button onClick={() => go('/auth')} className="btn btn-primary" style={{ padding: '9px 18px', fontSize: 13.5 }}>{t('cta.start', lang)}</button>
      </div>
    </nav>
  )
}

/* ============================================================================
   HERO
============================================================================ */
function FloatingPhotos({ seeds, focusedIdx }: { seeds: string[]; focusedIdx: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {seeds.map((seed, i) => {
        const total = seeds.length
        const angle = (i / total) * Math.PI * 2
        const cx = 50 + Math.cos(angle) * 30
        const cy = 50 + Math.sin(angle) * 28
        const rotate = -8 + (i * 7) % 18
        const focused = i === focusedIdx
        const size = focused ? 280 : 130 + (i % 3) * 28
        return (
          <div key={seed} style={{
            position: 'absolute', left: `${cx}%`, top: `${cy}%`,
            width: size, height: size * 1.25,
            transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
            transition: 'all 1.2s var(--ease-out)',
            zIndex: focused ? 10 : 1,
            opacity: focused ? 1 : 0.62,
            filter: focused ? 'none' : 'brightness(0.7) saturate(0.95)',
          }}>
            <div style={{
              width: '100%', height: '100%',
              padding: focused ? 10 : 6,
              paddingBottom: focused ? 36 : 18,
              background: 'var(--ink)', borderRadius: 4,
              boxShadow: focused
                ? '0 36px 80px -20px rgba(0,0,0,0.5), 0 16px 28px -12px rgba(0,0,0,0.4)'
                : '0 18px 40px -16px rgba(0,0,0,0.4)',
            }}>
              <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 2 }}>
                <Photo seed={seed} w={focused ? 600 : 300} h={focused ? 800 : 400} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Hero({ go }: { go: (s: string) => void }) {
  const { lang } = useStore()
  const [focusedIdx, setFocusedIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFocusedIdx((i) => (i + 1) % HERO_SEEDS.length), 2600)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="hero-grid" style={{
      position: 'relative', minHeight: '92vh',
      display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center',
      padding: '110px 64px 60px', gap: 40, overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '20%', right: '-10%', width: 800, height: 800,
        borderRadius: '50%',
        background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 20%, transparent), transparent 60%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 640 }}>
        <div className="eyebrow" style={{ marginBottom: 24 }}>{t('hero.kicker', lang)}</div>

        <h1 className="display" style={{ fontSize: 'clamp(56px, 7.6vw, 116px)', lineHeight: 0.92 }}>
          {t('hero.title.a', lang)}{' '}
          <span style={{ color: 'var(--accent)' }}>
            <CountUp to={5847} start={5200} />
          </span>{' '}
          {t('hero.title.b', lang)}
          <br />
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-dim)' }}>{t('hero.title.c', lang)} </span>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span className="gold-underline" style={{ fontStyle: 'italic' }}>{t('hero.title.d', lang)}</span>
          </span>{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-dim)' }}>{t('hero.title.e', lang)}</span>
        </h1>

        <p style={{ marginTop: 32, fontSize: 18, lineHeight: 1.55, color: 'var(--ink-dim)', maxWidth: 520 }}>
          {t('hero.sub', lang)}
        </p>

        <div style={{ marginTop: 38, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => go('/auth')} className="btn btn-primary" style={{ padding: '15px 26px', fontSize: 15 }}>
            {t('cta.start', lang)} <Icon name="arrow" />
          </button>
          <button onClick={() => go('/dashboard')} className="btn btn-ghost" style={{ padding: '15px 26px', fontSize: 14.5 }}>
            {t('cta.demo', lang)}
          </button>
        </div>

        <div style={{ marginTop: 42, display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ink-mute)', fontSize: 12.5 }}>
          <Icon name="lock" strokeWidth={1.4} />
          <span>{t('hero.privacy_line', lang)}</span>
        </div>
      </div>

      <div style={{ position: 'relative', height: 560 }}>
        <FloatingPhotos seeds={HERO_SEEDS} focusedIdx={focusedIdx} />
        <div style={{
          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--line-strong)',
          borderRadius: 999, padding: '10px 18px',
          display: 'flex', gap: 12, alignItems: 'center',
          fontSize: 12.5, color: 'var(--ink-dim)', whiteSpace: 'nowrap', zIndex: 20,
        }}>
          <span className="spin" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
          {t('hero.ai_reading', lang)} <span style={{ color: 'var(--accent)' }}>{focusedIdx + 1}</span> / {HERO_SEEDS.length}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        color: 'var(--ink-mute)', fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>
        <span>{t('hero.scroll', lang)}</span>
        <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, var(--accent), transparent)' }} />
      </div>
    </section>
  )
}

/* ============================================================================
   PROBLEM
============================================================================ */
function ProblemSection() {
  const { lang } = useStore()
  return (
    <section style={{ padding: '100px 64px', position: 'relative', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
        <div className="reveal">
          <div className="eyebrow" style={{ marginBottom: 24 }}>{t('prob.eyebrow', lang)}</div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 76px)', lineHeight: 1 }}>
            {t('prob.title.a', lang)} <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{t('prob.title.b', lang)}</span> {t('prob.title.c', lang)}
          </h2>
          <p style={{ marginTop: 28, color: 'var(--ink-dim)', fontSize: 17, maxWidth: 460, lineHeight: 1.55 }}>{t('prob.body', lang)}</p>
          <div style={{ marginTop: 36, display: 'flex', gap: 32 }}>
            <div>
              <div className="display" style={{ fontSize: 56, color: 'var(--accent)' }}><CountUp to={73} />%</div>
              <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 4 }}>{t('prob.stat1.label', lang)}</div>
            </div>
            <div>
              <div className="display" style={{ fontSize: 56, color: 'var(--accent)' }}><CountUp to={3} />+h</div>
              <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 4 }}>{t('prob.stat2.label', lang)}</div>
            </div>
          </div>
        </div>

        <div className="reveal" style={{ position: 'relative', height: 480 }}>
          {['beach-08', 'street1', 'sea-44', 'sunset-2'].map((seed, i) => (
            <div key={seed} style={{
              position: 'absolute', left: `${i * 28}px`, top: `${i * 14}px`,
              transform: `rotate(${(i - 1.5) * 4}deg)`,
              opacity: 1 - i * 0.22,
              filter: `blur(${i * 0.8}px) brightness(${1 - i * 0.12})`,
              zIndex: 10 - i, width: 320,
            }}>
              <Polaroid seed={seed} w={320} />
            </div>
          ))}
          <div style={{
            position: 'absolute', bottom: 0, left: 200, width: 360,
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            color: 'var(--ink-mute)', fontSize: 17, lineHeight: 1.5,
          }}>
            {t('prob.quote', lang)}<br />
            <span style={{ fontSize: 13, fontStyle: 'normal', fontFamily: 'var(--font-body)', color: 'var(--ink-mute)' }}>{t('prob.quote.sub', lang)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   HOW IT WORKS
============================================================================ */
function HowItWorks() {
  const { lang } = useStore()
  const steps = [
    { num: '01', icon: 'image' as const, k: '1' },
    { num: '02', icon: 'sparkle' as const, k: '2' },
    { num: '03', icon: 'book' as const, k: '3' },
    { num: '04', icon: 'lock' as const, k: '4' },
  ]
  return (
    <section id="how" style={{ padding: '100px 64px', borderTop: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>{t('how.eyebrow', lang)}</div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 76px)' }}>{t('how.title', lang)}</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }}>
          {steps.map((s, i) => (
            <div key={s.num} className="reveal" style={{
              padding: 28, borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--line)', background: 'var(--bg-card)',
              transitionDelay: `${i * 80}ms`, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 38 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 32, color: 'var(--accent)' }}>{s.num}</div>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'color-mix(in oklab, var(--accent) 14%, transparent)',
                  border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)',
                }}>
                  <Icon name={s.icon} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>{t(`how.${s.k}.title`, lang)}</h3>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14.5, lineHeight: 1.55 }}>{t(`how.${s.k}.body`, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   STORY
============================================================================ */
function StorySection() {
  const { lang } = useStore()
  return (
    <section id="story" style={{ padding: '110px 64px', borderTop: '1px solid var(--line)', overflow: 'hidden', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 80, alignItems: 'center' }}>
        <div className="reveal">
          <div className="eyebrow" style={{ marginBottom: 24 }}>{t('storysec.eyebrow', lang)}</div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 76px)', lineHeight: 0.98 }}>
            {t('storysec.title.a', lang)}<br />
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{t('storysec.title.b', lang)}</span> {t('storysec.title.c', lang)}
          </h2>
          <p style={{ marginTop: 28, color: 'var(--ink-dim)', fontSize: 17, lineHeight: 1.55 }}>{t('storysec.body', lang)}</p>

          <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['children', 'romantic', 'poetic', 'love', 'bio'].map((s) => (
              <span key={s} className="chip">{t(`st.style.${s}`, lang)}</span>
            ))}
          </div>

          <div style={{ marginTop: 44, padding: 24, borderLeft: '2px solid var(--accent)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.45, color: 'var(--ink)' }}>
              {t('storysec.quote', lang)}
            </p>
            <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink-mute)' }}>
              {t('storysec.quote.sub', lang)} <em>{t('ch.title', lang)}</em>
            </p>
          </div>
        </div>

        <div className="reveal" style={{ position: 'relative', perspective: 1600 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: '#F5EFE0', color: '#1A1612',
            borderRadius: 6,
            boxShadow: '0 60px 120px -30px rgba(0,0,0,0.5), 0 30px 60px -20px rgba(0,0,0,0.3)',
            transform: 'rotateY(-8deg) rotateX(2deg)', transformOrigin: 'center', overflow: 'hidden',
          }}>
            <div style={{ aspectRatio: '3 / 4', position: 'relative' }}>
              <Photo seed="kid-018" w={500} h={680} />
              <div style={{
                position: 'absolute', bottom: 14, left: 14,
                fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase',
                color: '#F5EFE0', mixBlendMode: 'difference',
              }}>{t('ch.ch1.label', lang)} · 2019</div>
            </div>
            <div style={{ padding: '40px 36px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#8B6A3E', marginBottom: 10 }}>
                  {t('ch.ch1.title', lang)}
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, lineHeight: 1.6, color: '#1A1612' }}>
                  {t('ch.ch1.text', lang).slice(0, 180) + '…'}
                </p>
              </div>
              <div style={{ fontSize: 10.5, color: '#8B6A3E', textAlign: 'right', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>~ 7 ~</div>
            </div>
          </div>

          <div style={{
            position: 'absolute', top: -18, right: -18, width: 100, height: 100,
            borderRadius: '50%', background: 'var(--accent)', color: '#0A0908',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            textAlign: 'center', fontSize: 13, lineHeight: 1.15, padding: 12,
            transform: 'rotate(12deg)', boxShadow: '0 12px 24px -8px rgba(0,0,0,0.4)',
          }}>
            {t('storysec.stamp', lang)}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   PRIVACY
============================================================================ */
function PrivacySection() {
  const { lang } = useStore()
  const steps: { icon: any; label: string }[] = [
    { icon: 'image', label: lang === 'uz' ? 'Rasm' : lang === 'ru' ? 'Фото' : 'Photo' },
    { icon: 'sparkle', label: lang === 'uz' ? 'AI' : lang === 'ru' ? 'ИИ' : 'AI' },
    { icon: 'lock', label: lang === 'uz' ? 'Shifr' : lang === 'ru' ? 'Шифр' : 'Encrypt' },
    { icon: 'download', label: 'PDF' },
    { icon: 'check', label: lang === 'uz' ? 'Sizniki' : lang === 'ru' ? 'Ваш' : 'Yours' },
  ]
  return (
    <section id="privacy" style={{ padding: '100px 64px', borderTop: '1px solid var(--line)', background: 'var(--bg-soft)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
        <div className="reveal">
          <div className="eyebrow" style={{ marginBottom: 24 }}>{t('priv.eyebrow', lang)}</div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 5.4vw, 86px)', lineHeight: 1 }}>{t('priv.title', lang)}</h2>
          <p style={{ marginTop: 28, color: 'var(--ink-dim)', fontSize: 18, lineHeight: 1.55, maxWidth: 620, margin: '28px auto 0' }}>
            {t('priv.body', lang)}
          </p>

          <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {(['c1', 'c2', 'c3'] as const).map((c) => (
              <div key={c} style={{
                padding: 22, borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)', border: '1px solid var(--line)',
                textAlign: 'left',
              }}>
                <Icon name="lock" strokeWidth={1.4} />
                <div style={{ marginTop: 16, fontSize: 16, fontWeight: 500 }}>{t(`priv.${c}.t`, lang)}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-dim)' }}>{t(`priv.${c}.s`, lang)}</div>
              </div>
            ))}
          </div>

          <div className="reveal" style={{
            marginTop: 48, padding: '32px 28px',
            background: 'var(--bg-card)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            alignItems: 'center', gap: 8,
          }}>
            {steps.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: i === 2 ? 'var(--accent)' : 'var(--bg-elev)',
                  border: i === 2 ? '1px solid var(--accent)' : '1px solid var(--line-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === 2 ? '#0A0908' : 'var(--accent)', position: 'relative',
                }}>
                  <Icon name={step.icon} strokeWidth={1.6} />
                  {i < steps.length - 1 && (
                    <svg width="60" height="2" viewBox="0 0 60 2" style={{
                      position: 'absolute', left: '100%', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--line-strong)', overflow: 'visible',
                    }}>
                      <line x1="6" y1="1" x2="54" y2="1" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   PRICING
============================================================================ */
function PricingSection({ go }: { go: (s: string) => void }) {
  const { lang } = useStore()
  const plans = [
    { key: 'free', price: '$0', fkeys: ['f1', 'f2', 'f3', 'f4'], highlight: false },
    { key: 'story', price: '$4.99', fkeys: ['f1', 'f2', 'f3', 'f4', 'f5'], highlight: true },
    { key: 'year', price: '$29', fkeys: ['f1', 'f2', 'f3', 'f4', 'f5'], highlight: false },
  ]
  return (
    <section id="pricing" style={{ padding: '110px 64px', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>{t('pri.eyebrow', lang)}</div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 76px)' }}>{t('pri.title', lang)}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {plans.map((p) => (
            <div key={p.key} className="reveal" style={{
              padding: 34, borderRadius: 'var(--radius-lg)',
              background: p.highlight ? 'var(--bg-elev)' : 'var(--bg-card)',
              border: p.highlight ? '1px solid var(--accent)' : '1px solid var(--line)',
              position: 'relative',
              boxShadow: p.highlight ? '0 40px 80px -30px color-mix(in oklab, var(--accent) 40%, transparent)' : 'none',
            }}>
              {p.highlight && (
                <div style={{
                  position: 'absolute', top: -12, left: 28,
                  padding: '4px 12px', borderRadius: 999, fontSize: 10.5,
                  background: 'var(--accent)', color: '#0A0908',
                  letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
                }}>{t('pri.most', lang)}</div>
              )}
              <div style={{ fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
                {p.key === 'free' ? 'Free' : p.key === 'story' ? 'Story' : 'Year'}
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="display" style={{ fontSize: 56 }}>{p.price}</span>
                <span style={{ color: 'var(--ink-mute)', fontSize: 13 }}>/ {t(`pri.${p.key}.sub`, lang)}</span>
              </div>
              <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.fkeys.map((fk) => (
                  <div key={fk} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink-dim)' }}>
                    <Icon name="check" strokeWidth={1.8} />
                    <span>{t(`pri.${p.key}.${fk}`, lang)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => go('/auth')} className={p.highlight ? 'btn btn-primary' : 'btn btn-ghost'} style={{ marginTop: 32, width: '100%', padding: '13px 18px' }}>
                {t(`pri.${p.key}.cta`, lang)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   FOOTER
============================================================================ */
function Footer() {
  const { lang } = useStore()
  const t_ = (en: string, uz: string, ru: string) => lang === 'uz' ? uz : lang === 'ru' ? ru : en
  const cols = [
    { tk: 'ft.col.product', items: [t_('Features', 'Imkoniyatlar', 'Возможности'), t_('Story albums', 'Ertak-albomlar', 'Сюжетные'), t_('Pricing', 'Narxlar', 'Цены'), t_('Roadmap', 'Reja', 'План')] },
    { tk: 'ft.col.privacy', items: [t_('Security', 'Xavfsizlik', 'Безопасность'), t_('Zero-knowledge', 'Zero-knowledge', 'Zero-knowledge'), 'GDPR', t_('Terms', 'Shartlar', 'Условия')] },
    { tk: 'ft.col.company', items: [t_('About', 'Biz haqimizda', 'О нас'), t_('Blog', 'Blog', 'Блог'), t_('Press', 'Matbuot', 'Пресса'), t_('Contact', 'Aloqa', 'Контакты')] },
  ]
  return (
    <footer style={{ padding: '80px 64px 48px', borderTop: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 60 }}>
        <div>
          <Wordmark size={26} />
          <p style={{ marginTop: 18, color: 'var(--ink-dim)', fontSize: 14, maxWidth: 320, lineHeight: 1.55 }}>{t('ft.tagline', lang)}</p>
        </div>
        {cols.map((col) => (
          <div key={col.tk}>
            <div style={{ fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>{t(col.tk, lang)}</div>
            {col.items.map((i) => (
              <div key={i} style={{ marginBottom: 8, fontSize: 14, color: 'var(--ink-dim)', cursor: 'pointer' }}>{i}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        maxWidth: 1200, margin: '60px auto 0',
        paddingTop: 24, borderTop: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 12, color: 'var(--ink-mute)',
      }}>
        <span>{t('ft.copy', lang)}</span>
        <span>{t('ft.made_in', lang)}</span>
      </div>
    </footer>
  )
}

/* ============================================================================
   LANDING (root)
============================================================================ */
export default function Landing() {
  const navigate = useNavigate()
  const { uid, lang } = useStore()
  const go = (s: string) => navigate(s === 'landing' ? '/' : s.startsWith('/') ? s : `/${s}`)
  useReveal([lang])

  // If already logged in, redirect to dashboard
  useEffect(() => { if (uid) navigate('/dashboard') }, [uid])

  return (
    <div data-screen="landing">
      <LandingNav go={(s) => go(s === '/auth' ? '/auth' : s)} />
      <Hero go={go} />
      <ProblemSection />
      <HowItWorks />
      <StorySection />
      <PrivacySection />
      <PricingSection go={go} />
      <Footer />
    </div>
  )
}
