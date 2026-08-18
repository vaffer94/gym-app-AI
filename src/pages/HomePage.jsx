import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Icona from '../icons'
import SelettoreTema from '../components/SelettoreTema'

/**
 * La home e' un indice: una riga per posto dove andare, nient'altro. I parametri erano
 * l'eccezione — un riquadro aperto con stepper e grafico — e prendevano piu' spazio dei
 * tre gesti quotidiani pur essendo la cosa che si tocca meno spesso.
 */
const SECTIONS = [
  {
    to: '/allenamento',
    icona: 'energia',
    title: 'Avvia allenamento',
    text: 'Scegli la scheda e parti',
    variant: 'card--primary',
    watch: true,
  },
  {
    to: '/schede',
    icona: 'schede',
    title: 'Schede',
    text: 'Crea e gestisci le tue schede',
    variant: 'card--teal',
  },
  {
    to: '/obiettivi',
    icona: 'obiettivi',
    title: 'Obiettivi',
    text: 'Allenamenti, passi ed energia',
    variant: 'card--lilac',
  },
  {
    to: '/storico',
    icona: 'storicoSezione',
    title: 'Storico',
    text: 'Allenamenti passati e statistiche',
    variant: 'card--yellow',
  },
  {
    to: '/parametri',
    icona: 'parametri',
    title: 'Parametri',
    text: 'Peso, altezza, età',
    // Bianco e non un quarto colore: la palette e' volutamente corta, e queste sono
    // le voci che non si aprono tutti i giorni
    variant: '',
  },
  {
    to: '/integrazioni',
    icona: 'integrazioni',
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
          <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icona nome="catBraccia" size="1.6rem" />
          </div>
        )}
        {/* minWidth:0 perche' a 320 px il saluto, non potendo restringersi, spingeva
            fuori i pulsanti a destra */}
        <div style={{ minWidth: 0 }}>
          <h2>Ciao, {firstName}!</h2>
          <p className="small muted">Pronta ad allenarti?</p>
        </div>
        {/* I tre pulsanti stanno in un gruppo, non sciolti nella barra: a 320px
            andavano a capo uno alla volta e il tema restava da solo sopra gli
            altri due. Cosi' o ci stanno tutti in riga, o scendono insieme. */}
        <div className="appbar-azioni">
          <SelettoreTema />
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
        </div>
      </header>

      <div className="stack">
        {SECTIONS.map((s) => (
          <div key={s.to} className={`card card--tap ${s.variant}`} onClick={() => navigate(s.to)}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Icona nome={s.icona} size="2.4rem" />
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
                  {/* Lo stesso disegno che segna il watch in Integrazioni: due punti
                      diversi che parlano dello stesso dispositivo devono somigliarsi.
                      (Con Font Awesome qui c'era un'emoji, perche' nella versione
                      gratuita l'orologio da polso non esisteva; pixelarticons ce l'ha) */}
                  <Icona nome="orologio" />
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
