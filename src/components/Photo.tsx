interface Props {
  seed: string
  w?: number
  h?: number
  alt?: string
  style?: React.CSSProperties
}

export default function Photo({ seed, w = 600, h = 800, alt = '', style }: Props) {
  const src = `https://picsum.photos/seed/${seed}/${w}/${h}`
  return (
    <img src={src} loading="lazy" alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />
  )
}

interface PolaroidProps {
  seed: string
  w?: number
  rotate?: number
  caption?: string
  children?: React.ReactNode
}

export function Polaroid({ seed, w = 280, rotate = 0, caption, children }: PolaroidProps) {
  return (
    <div className="polaroid" style={{ width: w, transform: `rotate(${rotate}deg)` }}>
      <div style={{ aspectRatio: '4 / 5', overflow: 'hidden', borderRadius: 2 }}>
        <Photo seed={seed} w={Math.round(w * 1.2)} h={Math.round(w * 1.5)} />
      </div>
      {caption && (
        <div style={{
          position: 'absolute', bottom: 8, left: 14, right: 14,
          fontFamily: 'Caveat, "Bradley Hand", cursive', fontSize: 18, color: '#3a312a',
        }}>{caption}</div>
      )}
      {children}
    </div>
  )
}
