import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { user, signInWithGoogle, signInDemo, isFirebaseConfigured } = useAuth()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleGoogle = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(`Login non riuscito (${e.code || e.message}). Riprova!`)
      console.error('Errore login:', e.code, e.message, e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="login-hero">
        <div className="logo">🏋️</div>
        <h1>Gym App</h1>
        <p className="muted">Il tuo compagno di allenamento</p>
      </div>

      <div className="stack">
        {isFirebaseConfigured ? (
          <button className="btn btn--primary btn--big" onClick={handleGoogle} disabled={busy}>
            Accedi con Google
          </button>
        ) : (
          <>
            <div className="card card--yellow center">
              <p className="small">
                <strong>Firebase non ancora configurato.</strong>
                <br />
                Copia <code>.env.example</code> in <code>.env.local</code> con i dati del tuo
                progetto (vedi README). Intanto puoi esplorare l'app:
              </p>
            </div>
            <button className="btn btn--teal btn--big" onClick={signInDemo}>
              Entra in modalità demo
            </button>
          </>
        )}
        {error && (
          <div className="card card--flat center" style={{ borderColor: 'var(--danger)' }}>
            <p className="small">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
