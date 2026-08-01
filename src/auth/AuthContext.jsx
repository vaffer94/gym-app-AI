import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  browserPopupRedirectResolver,
} from 'firebase/auth'
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase'
import { disconnectHealth } from '../data/health'

const AuthContext = createContext(null)

const DEMO_USER = {
  uid: 'demo',
  displayName: 'Utente Demo',
  email: 'demo@example.com',
  photoURL: null,
  isDemo: true,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver)
  }

  const signInDemo = () => setUser(DEMO_USER)

  const signOut = async () => {
    if (user?.isDemo) {
      setUser(null)
      return
    }
    await fbSignOut(auth)
    // Su un computer condiviso il logout deve rimuovere anche i dati locali residui:
    // token+cache Google Health (localStorage) e cache offline Firestore (IndexedDB).
    disconnectHealth()
    try {
      await terminate(db)
      await clearIndexedDbPersistence(db)
    } catch { /* cache gia' pulita o db in uso in un altro tab */ }
    // Firestore e' stato terminato: ricarico l'app per ripartire pulita sul login
    window.location.replace('/')
  }

  const value = { user, loading, signInWithGoogle, signInDemo, signOut, isFirebaseConfigured }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
