import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './lib/firebase'
import { useStore } from './store/useStore'

import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Connect from './pages/Connect'
import Analyzing from './pages/Analyzing'
import Dashboard from './pages/Dashboard'
import CreateAlbum from './pages/CreateAlbum'
import StoryAlbum from './pages/StoryAlbum'
import Albums from './pages/Albums'
import Editor from './pages/Editor'
import Settings from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const uid = useStore((s) => s.uid)
  const location = useLocation()
  if (!uid) return <Navigate to="/auth" state={{ from: location }} replace />
  return <>{children}</>
}

function App() {
  const [loading, setLoading] = useState(true)
  const { setUser, clearUser, setStats, theme, palette } = useStore()

  // Apply theme + palette to <body>
  useEffect(() => {
    document.body.dataset.theme = theme
    document.body.dataset.palette = palette
  }, [theme, palette])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const name = user.displayName || user.email?.split('@')[0] || 'Foydalanuvchi'
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
        setUser(user.uid, capitalized, user.email || '', user.photoURL || '')

        // Firestore dan stats va albomlarni yukla
        try {
          const statsDoc = await getDoc(doc(db, 'users', user.uid, 'data', 'stats'))
          if (statsDoc.exists()) setStats(statsDoc.data() as any)
        } catch { /* first time user */ }
      } else {
        clearUser()
      }
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="analyzing-anim" style={{ width: 80, height: 80 }}>
          <div className="anim-ring anim-ring-1" />
          <div className="anim-ring anim-ring-2" />
          <div className="anim-center" style={{ fontSize: 20 }}>L</div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />
        <Route path="/analyzing" element={<ProtectedRoute><Analyzing /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateAlbum /></ProtectedRoute>} />
        <Route path="/story" element={<ProtectedRoute><StoryAlbum /></ProtectedRoute>} />
        <Route path="/albums" element={<ProtectedRoute><Albums /></ProtectedRoute>} />
        <Route path="/editor/:albumId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
