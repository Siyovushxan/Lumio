type IconName = 'home' | 'grid' | 'plus' | 'book' | 'settings' | 'arrow' | 'arrowL' | 'sparkle' | 'lock' | 'download' | 'check' | 'play' | 'user' | 'cal' | 'glob' | 'image' | 'sun' | 'moon' | 'chev' | 'chevD' | 'x' | 'search' | 'heart'

const paths: Record<IconName, JSX.Element> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  book: <><path d="M4 4h7a4 4 0 0 1 4 4v12"/><path d="M20 4h-5a4 4 0 0 0-4 4v12"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.4l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
  arrowL: <path d="M19 12H5M11 6l-6 6 6 6"/>,
  sparkle: <path d="M12 3v6m0 6v6M3 12h6m6 0h6M5.6 5.6l4.2 4.2m4.4 4.4 4.2 4.2M5.6 18.4l4.2-4.2m4.4-4.4 4.2-4.2"/>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  download: <><path d="M12 4v12m0 0 5-5m-5 5-5-5"/><path d="M4 20h16"/></>,
  check: <path d="M5 12.5 10 17l9-10"/>,
  play: <path d="M6 4v16l14-8L6 4z" fill="currentColor" stroke="none"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  glob: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 16-5-5L5 21"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon: <path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/>,
  chev: <path d="m9 6 6 6-6 6"/>,
  chevD: <path d="m6 9 6 6 6-6"/>,
  x: <path d="M6 6l12 12M18 6 6 18"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  heart: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>,
}

interface Props { name: IconName; size?: number; strokeWidth?: number; className?: string }

export default function Icon({ name, size = 18, strokeWidth = 1.5, className = '' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ width: size, height: size, flexShrink: 0 }}
      className={className} aria-hidden>
      {paths[name] || <circle cx="12" cy="12" r="9"/>}
    </svg>
  )
}
