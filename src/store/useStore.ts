import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Plan = 'monthly' | 'yearly' | null

export interface StoryChapter {
  era: string         // chapter title / era label
  text: string        // narrative text
  photoId?: string    // matching picked photo id (optional)
  photoBaseUrl?: string
}

export interface Album {
  id: string
  title: string
  type: 'yearly' | 'travel' | 'event' | 'custom' | 'story'
  count: number
  date: string
  icon: string
  status: 'processing' | 'ready' | 'expired'
  pdfUrl?: string
  pdfExpiresAt?: number
  chapters?: StoryChapter[]      // story-album AI-generated text
  photoIds?: string[]            // picked photos snapshot
}

export interface PickedPhoto {
  id: string
  baseUrl: string                // picker URL yoki dataURL (local bo'lsa)
  createTime?: string
  mimeType?: string
  width?: number
  height?: number
  local?: boolean                // true bo'lsa — qurilmadan yuklangan, auth talab qilmaydi
}

export interface UserStats {
  totalPhotos: number
  yearsTracked?: number
  yearlyBreakdown: Record<string, number>
  seasonBreakdown: { winter: number; spring: number; summer: number; autumn: number }
  topMonths: string[]
  monthBreakdown?: Record<string, number>
  aiInsight: string
  lastAnalyzed?: number
}

export type Theme = 'light' | 'dark'
export type Palette = 'gold' | 'amber' | 'rose' | 'ink'
export type Lang = 'en' | 'uz' | 'ru'

interface State {
  uid: string | null
  userName: string
  userEmail: string
  userAvatar: string
  photosConnected: boolean
  plan: Plan
  albums: Album[]
  stats: UserStats | null
  pickedPhotos: PickedPhoto[]
  hasGenerated: boolean
  freeEditUsed: boolean

  // UI preferences
  theme: Theme
  palette: Palette
  lang: Lang

  setUser: (uid: string, name: string, email: string, avatar?: string) => void
  clearUser: () => void
  setPhotosConnected: (v: boolean) => void
  setPlan: (p: Plan) => void
  addAlbum: (a: Album) => void
  setAlbums: (a: Album[]) => void
  setStats: (s: UserStats | null) => void
  setPickedPhotos: (items: PickedPhoto[]) => void
  setHasGenerated: (v: boolean) => void
  setFreeEditUsed: (v: boolean) => void
  setTheme: (t: Theme) => void
  setPalette: (p: Palette) => void
  setLang: (l: Lang) => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      uid: null,
      userName: '',
      userEmail: '',
      userAvatar: '',
      photosConnected: false,
      plan: null,
      albums: [],
      stats: null,
      pickedPhotos: [],
      hasGenerated: false,
      freeEditUsed: false,

      theme: 'dark',
      palette: 'gold',
      lang: 'uz',

      setUser: (uid, name, email, avatar = '') =>
        set({ uid, userName: name, userEmail: email, userAvatar: avatar }),
      clearUser: () =>
        set({ uid: null, userName: '', userEmail: '', userAvatar: '', photosConnected: false, plan: null, albums: [], stats: null, pickedPhotos: [], hasGenerated: false, freeEditUsed: false }),
      setPhotosConnected: (v) => set({ photosConnected: v }),
      setPlan: (p) => set({ plan: p }),
      addAlbum: (a) => set((s) => ({ albums: [a, ...s.albums], hasGenerated: true })),
      setAlbums: (a) => set({ albums: a }),
      setStats: (s) => set({ stats: s }),
      setPickedPhotos: (items) => set({ pickedPhotos: items }),
      setHasGenerated: (v) => set({ hasGenerated: v }),
      setFreeEditUsed: (v) => set({ freeEditUsed: v }),
      setTheme: (t) => set({ theme: t }),
      setPalette: (p) => set({ palette: p }),
      setLang: (l) => set({ lang: l }),
    }),
    {
      name: 'lumio-store',
      // pickedPhotos (data URLs juda katta) va stats'ni localStorage'ga yozmaymiz —
      // QuotaExceededError'dan saqlanish uchun. Bular session davomida xotirada turadi.
      partialize: (state) => ({
        uid: state.uid,
        userName: state.userName,
        userEmail: state.userEmail,
        userAvatar: state.userAvatar,
        photosConnected: state.photosConnected,
        plan: state.plan,
        hasGenerated: state.hasGenerated,
        freeEditUsed: state.freeEditUsed,
        theme: state.theme,
        palette: state.palette,
        lang: state.lang,
        // Albums chapter matnlari ham katta bo'lishi mumkin — saqlamaymiz
        albums: state.albums.map((a) => ({ ...a, chapters: undefined, photoIds: undefined })),
      }),
    }
  )
)
