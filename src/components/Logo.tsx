import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

interface Props { onClick?: () => void }

export default function Logo({ onClick }: Props) {
  const navigate = useNavigate()
  const uid = useStore((s) => s.uid)

  const handleClick = () => {
    if (onClick) { onClick(); return }
    navigate(uid ? '/dashboard' : '/')
  }

  return (
    <span className="logo" onClick={handleClick}>
      <svg className="logo-icon" viewBox="0 0 36 36">
        <rect width="36" height="36" rx="10" fill="#c9a96e" opacity="0.13"/>
        <rect x="1" y="1" width="34" height="34" rx="9" fill="none" stroke="#c9a96e" strokeWidth="1.4"/>
        <circle cx="24.5" cy="11.5" r="3.2" fill="#c9a96e"/>
        <path d="M4 28 L12.5 16 L19.5 22.5 L24 18 L32 28Z" fill="#c9a96e" opacity="0.85"/>
      </svg>
      <span className="logo-text">Lu<em>mio</em></span>
    </span>
  )
}
