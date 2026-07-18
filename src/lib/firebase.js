import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** true se .env.local è stato configurato con un progetto Firebase reale */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId)

let auth = null
let googleProvider = null
let db = null

if (isFirebaseConfigured) {
  const app = initializeApp(config)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  // Cache locale persistente: l'app funziona offline (palestra!) e sincronizza quando torna la rete
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
}

export { auth, googleProvider, db }
