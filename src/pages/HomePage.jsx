import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Icona from '../icons'

/**
 * La home e' un indice: una riga per posto dove andare, nient'altro. I parametri erano
 * l'eccezione — un riquadro aperto con stepper e grafico — e prendevano piu' spazio dei
 * tre gesti quotidiani pur essendo la cosa che si tocca meno spesso.
 */
const SECTIONS = [
  {
    to: '/allenamento',
    emoji: '🔥',
    title: 'Avvia allenamento',
    text: 'Scegli la scheda e parti',
    variant: 'card--primary',
    watch: true,
  },
  {
    to: '/schede',
    emoji: '📋',
    title: 'Schede',
    text: 'Crea e gestisci le tue schede',
    variant: 'card--teal',
  },
  {
    to: '/obiettivi',
    emoji: '🎯',
    title: 'Obiettivi',
    text: 'Allenamenti, passi ed energia',
    variant: 'card--lilac',
  },
  {
    to: '/storico',
    emoji: '📊',
    title: 'Storico',
    text: 'Allenamenti passati e statistiche',
    variant: 'card--yellow',
  },
  {
    to: '/parametri',
    emoji: '⚖️',
    title: 'Parametri',
    text: 'Peso, altezza, età',
    // Bianco e non un quarto colore: la palette e' volutamente corta, e queste sono
    // le voci che non si aprono tutti i giorni
    variant: '',
  },
  {
    to: '/integrazioni',
    emoji: '🔌',
    title: 'Integrazioni',
    text: 'Google Health e attività da conteggiare',
    variant: '',
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
        {/* minWidth:0 perche' a 320 px il saluto, non potendo restringersi, spingeva
            fuori i pulsanti a destra */}
        <div style={{ minWidth: 0 }}>
          <h2>Ciao, {firstName}!</h2>
          <p className="small muted">Pronta ad allenarti?</p>
        </div>
        <div className="spacer" />
        {/* Solo icona: e' l'unico posto da cui si scrive a chi mantiene l'app, ma non
            e' una cosa che si fa spesso, e con l'etichetta accanto a "Esci" la barra
            sui telefoni stretti non ci sta */}
        <button
          className="btn"
          onClick={() => navigate('/scrivimi')}
          aria-label="Segnala un problema o proponi un’idea"
          title="Segnala un problema o proponi un’idea"
        >
          <Icona nome="commento" />
        </button>
        <button className="btn" onClick={signOut}>
          <Icona nome="esci" /> Esci
        </button>
      </header>

      <div className="stack">
        {SECTIONS.map((s) => (
          <div key={s.to} className={`card card--tap ${s.variant}`} onClick={() => navigate(s.to)}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="emoji-xl">{s.emoji}</span>
              {/* flex:1 + minWidth:0 e non uno .spacer: con lo spacer il testo lungo
                  spingeva la freccia a capo, e sui 320 px finiva da sola su una riga
                  vuota. Cosi' e' il testo ad andare a capo dentro il suo spazio */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{s.title}</h3>
                <p className="small muted">{s.text}</p>
              </div>
              {/* Il secondo modo di allenarsi sta accanto al primo, non in fondo a una
                  pagina di impostazioni: chi installa solo la PWA non ha nessun motivo
                  di sospettare che esista anche l'app da polso, e viceversa */}
              {s.watch && (
                <button
                  className="btn btn--sm"
                  aria-label="Allenarsi dall’orologio"
                  title="Allenarsi dall’orologio"
                  onClick={(e) => { e.stopPropagation(); navigate('/watch') }}
                >
                  {/* Emoji e non Font Awesome, che nella versione gratuita l'orologio
                      da polso non ce l'ha: il cronometro si legge come "durata" e il
                      quadrante come "orario". ⌚ e' gia' il segno del watch in
                      Integrazioni, e vale la pena restare coerenti con quello */}
                  <span aria-hidden="true">⌚</span>
                </button>
              )}
              <Icona nome="avanti" />
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
