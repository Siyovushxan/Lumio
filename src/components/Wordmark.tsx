interface Props { size?: number; dot?: boolean }

export default function Wordmark({ size = 22, dot = true }: Props) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontFamily: 'var(--font-display)', fontSize: size,
      fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)',
    }}>
      {dot && (
        <span style={{
          width: Math.round(size * 0.38), height: Math.round(size * 0.38),
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, var(--accent-bright), var(--accent-deep))',
          boxShadow: '0 0 14px 0 color-mix(in oklab, var(--accent) 50%, transparent)',
        }} />
      )}
      <span>Lumio</span>
    </span>
  )
}
