import { useStore, Lang, Palette } from '../store/useStore'
import Icon from './Icon'

interface Props { compact?: boolean }

export default function ThemeToggle({ compact = false }: Props) {
  const { theme, palette, lang, setTheme, setPalette, setLang } = useStore()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 12 }}>
      {/* Lang switcher */}
      <div style={{
        display: 'flex', gap: 2, padding: 2, borderRadius: 999,
        background: 'var(--bg-card)', border: '1px solid var(--line)',
      }}>
        {(['en', 'uz', 'ru'] as Lang[]).map((l) => (
          <button key={l} onClick={() => setLang(l)} style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500,
            color: lang === l ? '#0A0908' : 'var(--ink-dim)',
            background: lang === l ? 'var(--accent)' : 'transparent',
            transition: 'all 0.2s var(--ease)',
          }}>{l}</button>
        ))}
      </div>

      {/* Palette picker — only show if not compact */}
      {!compact && (
        <div style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 999,
          background: 'var(--bg-card)', border: '1px solid var(--line)',
        }}>
          {([
            { id: 'gold' as Palette, color: '#D4A574' },
            { id: 'amber' as Palette, color: '#E8A552' },
            { id: 'rose' as Palette, color: '#E8B4A0' },
            { id: 'ink' as Palette, color: '#B8B0A0' },
          ]).map((p) => (
            <button key={p.id} onClick={() => setPalette(p.id)}
              title={p.id}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: p.color,
                border: palette === p.id ? '2px solid var(--ink)' : '2px solid transparent',
                transition: 'all 0.2s var(--ease)',
              }} />
          ))}
        </div>
      )}

      {/* Theme toggle */}
      <button className="btn-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} strokeWidth={1.6} />
      </button>
    </div>
  )
}
