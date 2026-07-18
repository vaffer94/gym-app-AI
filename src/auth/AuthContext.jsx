import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  browserPopupRedirectResolver,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'

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
  }

  const value = { user, loading, signInWithGoogle, signInDemo, signOut, isFirebaseConfigured }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
