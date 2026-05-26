import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

/** Oddiy kirish — faqat email/profile */
export const googleProvider = new GoogleAuthProvider()

/** Photos uchun alohida provider — Picker API scope (2025+ siyosat) */
export const googlePhotosProvider = new GoogleAuthProvider()
googlePhotosProvider.addScope('https://www.googleapis.com/auth/photospicker.mediaitems.readonly')
googlePhotosProvider.setCustomParameters({
  prompt: 'consent',
  include_granted_scopes: 'true',
})
