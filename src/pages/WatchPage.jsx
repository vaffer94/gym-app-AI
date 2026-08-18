import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import Icona from '../icons'

/**
 * Quando l'app del watch sara' pubblicata, qui va il suo indirizzo sul Play Store.
 * Finche' e' vuoto la pagina dice "in arrivo" invece di offrire un pulsante che porta
 * a una pagina che non esiste: un link rotto e' peggio di un link assente.
 */
const PLAY_URL = ''

/**
 * Le due modalita' per allenarsi.
 *
 * Nasce da un problema di scoperta, non di dati: chi installa la PWA non ha modo di
 * sapere che esiste anche l'app da polso, e chi installa quella dal Play Store non sa
 * che c'e' il resto qui. Le due meta' non si presentano a vicenda.
 *
 * Il collegamento non lo "rileviamo": un browser non vede i dispositivi accoppiati, e
 * nessuna API glielo permette. Lo si deduce dall'unica prova che esiste davvero, cioe'
 * un allenamento arrivato dal polso (`origine: 'watch'`, che il watch scrive gia'). E'
 * una prova debole in un verso solo — dice "c'e'", non sa dire "non c'e'" — e la
 * pagina lo scrive invece di far finta di saperne di piu'.
 */
export default function WatchPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const repo = getRepo(user)

  const [sessions, setSessions] = useState(null)

  useEffect(() => {
    repo.listSessions().then(setSessions)
  }, [repo])

  const daWatch = (sessions || []).filter((s) => s.origine === 'watch')
  const ultima = daWatch[0]

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          <Icona nome="indietro" />
        </button>
        <h2><Icona nome="orologio" /> Dal polso</h2>
      </header>

      <div className="card stack">
        <div className="row">
          <Icona nome="orologio" size="1.8rem" />
          <div style={{ flex: 1, minWidth: 96 }}>
            <h3>App per l’orologio</h3>
            <p className="small muted">Wear OS — Pixel Watch e simili</p>
          </div>
        </div>

        <p className="small muted" style={{ margin: 0 }}>
          Puoi allenarti anche dall’orologio, <strong>senza portarti dietro il telefono</strong>:
          la scheda si vede al polso, il battito viene registrato per tutto l’allenamento, e
          quando finisci la sessione arriva qui. È lo stesso storico, gli stessi obiettivi.
        </p>

        {sessions === null ? (
          <p className="small muted" style={{ margin: 0 }}>Controllo…</p>
        ) : ultima ? (
          <p className="small" style={{ margin: 0, color: 'var(--teal)' }}>
            <Icona nome="fatto" />{' '}
            Funziona: {daWatch.length} allenament{daWatch.length === 1 ? 'o arrivato' : 'i arrivati'} dall’orologio,
            l’ultimo il {new Date(ultima.startedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}.
          </p>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            {/* "Non risulta" e non "non ce l'hai": l'unica prova che abbiamo e' un
                allenamento arrivato dal polso, e chi ha appena installato l'app non ne
                ha ancora fatto nessuno */}
            <Icona nome="info" /> Non risulta ancora nessun allenamento
            fatto dall’orologio. Se hai appena installato l’app, è normale: si vede da qui
            dopo il primo.
          </p>
        )}

        {PLAY_URL ? (
          <a
            className="btn btn--primary btn--big"
            href={PLAY_URL}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
          >
            <Icona nome="googlePlay" /> Scarica l’app per l’orologio
          </a>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            <Icona nome="attesa" /> L’app per l’orologio non è ancora
            sul Play Store: quando ci sarà, il pulsante per scaricarla compare qui.
          </p>
        )}
      </div>

      <VersioneApp />
    </div>
  )
}

/**
 * Quale versione stai usando davvero.
 *
 * Non e' curiosita': il service worker puo' continuare a servire il bundle vecchio per
 * un po' dopo un aggiornamento, e senza una data visibile "l'ho gia' aggiornata" e "sto
 * guardando quella di ieri" sono indistinguibili. E' costato una serata una volta.
 */
function VersioneApp() {
  const [controllo, setControllo] = useState(null) // null | 'in-corso' | 'fatto'

  const [installata, setInstallata] = useState(false)
  useEffect(() => {
    setInstallata(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  const controlla = async () => {
    setControllo('in-corso')
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.update()
    } catch {
      // Un controllo fallito non e' un errore da mostrare: il ricaricamento qui sotto
      // fa comunque il suo lavoro, e la data dira' come e' andata
    }
    setControllo('fatto')
  }

  return (
    <div className="card stack">
      <span className="label" style={{ margin: 0 }}>Versione</span>
      <p className="small muted" style={{ margin: 0 }}>
        App web <strong>{__APP_VERSION__}</strong> · build del {__APP_BUILD__}
        {installata ? ' · installata sul dispositivo' : ' · aperta nel browser'}
      </p>

      {controllo !== 'fatto' ? (
        <button className="btn" onClick={controlla} disabled={controllo === 'in-corso'}>
          {controllo === 'in-corso'
            ? <><Icona nome="ricarica" className="icona--gira" /> Controllo…</>
            : <><Icona nome="ricarica" /> Controlla se c’è una versione più recente</>}
        </button>
      ) : (
        <>
          <button className="btn btn--teal" onClick={() => window.location.reload()}>
            <Icona nome="ricarica" /> Ricarica
          </button>
          {/* Non promettiamo "aggiornato": il ricaricamento e' l'unica cosa che
              possiamo garantire, il resto lo dice la data qui sopra */}
          <p className="small muted" style={{ margin: 0 }}>
            Dopo il ricaricamento, se la data della build non è cambiata stavi già usando
            l’ultima versione.
          </p>
        </>
      )}
    </div>
  )
}
