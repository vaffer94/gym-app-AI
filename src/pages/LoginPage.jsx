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

        {/* Anche con Firebase configurato, in sviluppo serve poter entrare senza le
            credenziali vere: e' l'unico modo di provare a schermo le pagine protette.
            import.meta.env.DEV e' falso in build, quindi in produzione questo blocco
            non esiste proprio nel bundle — non e' nascosto, e' assente. */}
        {isFirebaseConfigured && import.meta.env.DEV && (
          <button className="btn btn--teal" onClick={signInDemo}>
            Entra in modalità demo (solo sviluppo)
          </button>
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
