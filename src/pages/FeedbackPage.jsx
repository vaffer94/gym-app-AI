import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import Icona from '../icons'

const MAX = 2000

const TIPI = [
  { id: 'bug', icon: 'problema', label: 'Qualcosa non va' },
  { id: 'idea', icon: 'idea', label: 'Ho un’idea' },
]

/**
 * Segnalazioni e idee.
 *
 * Il messaggio finisce in una collezione Firestore, non in un `mailto:`: un link di
 * posta avrebbe messo un indirizzo in chiaro dentro il bundle, che su Hosting e'
 * scaricabile senza login e lo leggono anche i raccoglitori di indirizzi. Qui non c'e'
 * nessun indirizzo da raccogliere.
 *
 * Nessun CAPTCHA, e non per pigrizia: l'app sta dietro il login Google, quindi per
 * scrivere qui un bot dovrebbe prima farsi un account e autenticarsi. L'autenticazione
 * e' gia' la scrematura; un CAPTCHA in piu' fermerebbe solo le persone.
 */
export default function FeedbackPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const repo = getRepo(user)

  const [tipo, setTipo] = useState('bug')
  const [testo, setTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [esito, setEsito] = useState(null) // {recapitata} | null
  const [errore, setErrore] = useState(null)

  const invia = async () => {
    const pulito = testo.trim()
    if (!pulito) return
    setInviando(true)
    setErrore(null)
    try {
      const res = await repo.sendFeedback({
        uid: user.uid,
        tipo,
        testo: pulito.slice(0, MAX),
        // Chi scrive e da dove: senza questi, una segnalazione di un difetto e'
        // impossibile da riprodurre e impossibile da riscontrare
        nome: user.displayName || null,
        email: user.email || null,
        userAgent: navigator.userAgent,
        // Quale versione dell'app stava girando davvero. Il service worker puo'
        // servire un bundle vecchio per un po' dopo un aggiornamento, e senza questo
        // dato si cercherebbe nel codice di oggi un difetto di quello di ieri
        build: __APP_BUILD__,
        creatoIl: Date.now(),
      })
      setEsito(res)
      setTesto('')
    } catch (e) {
      setErrore(e.message)
    } finally {
      setInviando(false)
    }
  }

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          <Icona nome="indietro" />
        </button>
        <h2>💬 Scrivimi</h2>
      </header>

      <div className="card stack">
        <p className="small muted" style={{ margin: 0 }}>
          Hai trovato qualcosa che non funziona, o ti è venuta un’idea per migliorare
          l’app? Scrivila qui: la leggo io.
        </p>

        <div className="row">
          {TIPI.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tipo === t.id}
              className={`chip chip--select ${tipo === t.id ? 'chip--on' : ''}`}
              onClick={() => setTipo(t.id)}
            >
              <Icona nome={t.icon} /> {t.label}
            </button>
          ))}
        </div>

        <textarea
          className="textarea"
          value={testo}
          maxLength={MAX}
          onChange={(e) => { setTesto(e.target.value); setEsito(null) }}
          placeholder={tipo === 'bug'
            ? 'Cosa stavi facendo, e cosa è successo invece di quello che ti aspettavi'
            : 'Cosa vorresti poter fare'}
        />
        {/* Il contatore compare solo quando il limite e' vicino: prima e' un numero che
            non serve a nessuno */}
        {testo.length > MAX - 300 && (
          <p className="small muted" style={{ margin: 0 }}>{MAX - testo.length} caratteri rimasti</p>
        )}

        <button
          className="btn btn--primary btn--big"
          disabled={inviando || !testo.trim()}
          onClick={invia}
        >
          {inviando
            ? <><Icona nome="ricarica" className="icona--gira" /> Invio…</>
            : <><Icona nome="invia" /> Invia</>}
        </button>

        {errore && (
          <p className="small" style={{ color: 'var(--danger)' }}>
            Non è partita: {errore}. Riprova più tardi — il messaggio non si è perso solo
            se lo ricopi da qualche parte.
          </p>
        )}

        {esito && (
          <p className="small" style={{ margin: 0, color: 'var(--teal)' }}>
            <Icona nome="fatto" />{' '}
            {esito.recapitata
              ? 'Ricevuto, grazie. Se serve ti rispondo all’indirizzo del tuo account.'
              : 'Modalità demo: il messaggio è rimasto su questo dispositivo, non è stato inviato.'}
          </p>
        )}

        {/* Cosa parte insieme al testo si dice prima, non dopo: sono dati suoi */}
        <p className="small muted" style={{ margin: 0 }}>
          Insieme al messaggio parte il tuo nome e l’indirizzo del tuo account (per poterti
          rispondere), il browser che stai usando e la versione dell’app. Nient’altro: né
          allenamenti né obiettivi.
        </p>
      </div>
    </div>
  )
}
