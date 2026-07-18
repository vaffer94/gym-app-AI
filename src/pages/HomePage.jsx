import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const SECTIONS = [
  {
    to: '/allenamento',
    emoji: '🔥',
    title: 'Avvia allenamento',
    text: 'Scegli la scheda e parti',
    variant: 'card--primary',
  },
  {
    to: '/schede',
    emoji: '📋',
    title: 'Schede',
    text: 'Crea e gestisci le tue schede',
    variant: 'card--teal',
  },
  {
    to: '/storico',
    emoji: '📊',
    title: 'Storico',
    text: 'Allenamenti passati e statistiche',
    variant: 'card--yellow',
  },
]

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const firstName = (user.displayName || 'atleta').split(' ')[0]

  return (
    <div className="page">
      <header className="appbar">
        {user.photoURL ? (
          <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💪</div>
        )}
        <div>
          <h2>Ciao, {firstName}!</h2>
          <p className="small muted">Pronta ad allenarti?</p>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={signOut}>
          <i className="fa-solid fa-right-from-bracket" /> Esci
        </button>
      </header>

      <div className="stack">
        {SECTIONS.map((s) => (
          <div key={s.to} className={`card card--tap ${s.variant}`} onClick={() => navigate(s.to)}>
            <div className="row">
              <span className="emoji-xl">{s.emoji}</span>
              <div>
                <h3>{s.title}</h3>
                <p className="small muted">{s.text}</p>
              </div>
              <div className="spacer" />
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>

      {user.isDemo && (
        <p className="center small muted">Modalità demo — i dati non vengono salvati</p>
      )}
    </div>
  )
}
