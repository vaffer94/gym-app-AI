import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import {
  isHealthConfigured, isHealthConnected, connectHealth, disconnectHealth,
  getHealthSummary, clearHealthCache, healthNeedsReconnect,
  connectHealthZones, hasZonesScope,
} from '../data/health'
import { getStepsGoal, pushGoals } from '../data/goals'
import TrackedActivities from '../components/TrackedActivities'
import KcalDiagnostics from '../components/KcalDiagnostics'
import Icona from '../icons'

/**
 * Le integrazioni erano una scheda dello Storico, ma non parlano di allenamenti passati:
 * dicono da dove arrivano i dati e quali contano. Stavano dentro la pagina che poi ne
 * mostra i risultati, e per collegare l'orologio bisognava passare da una pagina di
 * statistiche — un giro che non ha un motivo. Ora sono una voce della home come le altre.
 */
export default function IntegrationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repo = getRepo(user)

  const [sessions, setSessions] = useState(null)
  const [fitbit, setFitbit] = useState(null)
  const [errore, setErrore] = useState(null)

  // La diagnostica kcal lavora sull'ultimo allenamento con battito: serve l'elenco
  useEffect(() => {
    repo.listSessions().then(setSessions)
  }, [repo])

  const loadHealth = () =>
    getHealthSummary().then((d) => { setFitbit(d); setErrore(null) }).catch((e) => setErrore(e.message))

  useEffect(() => {
    if (isHealthConnected()) loadHealth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Quale operazione e' in corso, per dare al pulsante premuto uno stato visibile.
   * Sincronizzare vuol dire aspettare la rete: senza, si preme, non succede niente
   * per qualche secondo, e l'unica reazione sensata e' premere di nuovo.
   */
  const [busy, setBusy] = useState(null) // 'connect' | 'refresh' | 'zones' | null
  const conAttesa = async (nome, fn) => {
    setBusy(nome)
    try {
      await fn()
    } catch (e) {
      setErrore(e.message)
    } finally {
      setBusy(null)
    }
  }

  const [, setZonesOn] = useState(hasZonesScope()) // solo per ridisegnare dopo il consenso

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          <Icona nome="indietro" />
        </button>
        <h2><Icona nome="integrazioni" /> Integrazioni</h2>
      </header>

      <div className="stack">
        <div className="card stack">
          <div className="row">
            <Icona nome="orologio" size="1.8rem" />
            <div style={{ flex: 1 }}>
              <h3>Google Health</h3>
              <p className="small muted">Passi e allenamenti rilevati dal tuo Pixel Watch (ecosistema Fitbit)</p>
            </div>
            {isHealthConnected() && (healthNeedsReconnect()
              ? <span className="chip"><Icona nome="avviso" /> da ricollegare</span>
              : <span className="chip"><Icona nome="fatto" /> collegato</span>)}
          </div>

          {!isHealthConfigured && (
            <p className="small">
              Per attivare l'integrazione serve un Client ID OAuth di Google Cloud in{' '}
              <code>.env.local</code> — i passaggi sono nel README (sezione "Integrazione Google Health").
            </p>
          )}

          {isHealthConfigured && !isHealthConnected() && (
            <button
              className="btn btn--primary btn--big"
              disabled={busy === 'connect'}
              onClick={() => conAttesa('connect', async () => {
                await connectHealth(user.email)
                await loadHealth()
              })}
            >
              {busy === 'connect'
                ? <><Icona nome="ricarica" className="icona--gira" /> Collego…</>
                : 'Collega Google Health'}
            </button>
          )}

          {/* Il permesso di Google dura un'ora e si rinnova da solo. Quando il rinnovo
              non riesce, l'app smette di riprovare (vedi ensureToken in data/health.js)
              e la ripartenza torna una scelta di chi la usa: e' l'unico modo perche' la
              finestra di Google compaia solo quando la si e' chiesta. */}
          {isHealthConnected() && healthNeedsReconnect() && (
            <>
              <p className="small" style={{ color: 'var(--danger)' }}>
                <Icona nome="avviso" /> Il permesso di Google è
                scaduto e non si è rinnovato da solo. I passi e gli allenamenti che vedi in
                giro per l’app sono gli ultimi arrivati prima di adesso.
              </p>
              <button
                className="btn btn--primary btn--big"
                disabled={busy === 'connect'}
                onClick={() => conAttesa('connect', async () => {
                  await connectHealth(user.email)
                  clearHealthCache()
                  await loadHealth()
                })}
              >
                {busy === 'connect'
                  ? <><Icona nome="ricarica" className="icona--gira" /> Collego…</>
                  : <><Icona nome="ricarica" /> Ricollega Google Health</>}
              </button>
            </>
          )}

          {isHealthConnected() && (
            <>
              <p className="small muted">
                I dati compaiono nel calendario dell'Andamento (icone sui giorni) e nel grafico dei passi.
                Aggiornati al massimo ogni 30 minuti.
              </p>
              {/* Quanto indietro arrivano i dati: serve a sapere fin dove i conteggi
                  misti (app + Google) hanno davvero entrambe le fonti, invece di
                  darlo per scontato */}
              {fitbit?.detectedRaw && (
                <p className="small muted">
                  <Icona nome="storico" />{' '}
                  {fitbit.detectedRaw.count} attività negli ultimi {fitbit.detectedRaw.giorni} giorni
                  {fitbit.detectedRaw.since
                    ? `, dal ${new Date(fitbit.detectedRaw.since).toLocaleDateString('it-IT')}`
                    : ''}
                  {fitbit.detectedRaw.completa
                    ? '. Più indietro Google ne ha ancora, ma ci fermiamo qui.'
                    : '. È tutto lo storico che Google ha: la finestra vera è più corta.'}
                </p>
              )}
              {/* L'obiettivo passi e' un obiettivo, non un'impostazione della
                  connessione: sta in Obiettivi insieme agli altri due */}
              <button className="btn" onClick={() => navigate('/obiettivi')}>
                <Icona nome="obiettivi" /> Obiettivo passi: {getStepsGoal().toLocaleString('it-IT')}
              </button>
            </>
          )}

          {/* Consenso separato: le zone stanno sotto uno scope diverso da passi e
              allenamenti. Chiederlo a tutti in blocco significherebbe che un rifiuto
              fa saltare anche cio' che gia' funziona. */}
          {isHealthConnected() && !hasZonesScope() && (
            <button
              className="btn"
              disabled={busy === 'zones'}
              onClick={() => conAttesa('zones', async () => {
                await connectHealthZones(user.email)
                setZonesOn(true)
              })}
            >
              {busy === 'zones'
                ? <><Icona nome="ricarica" className="icona--gira" /> Chiedo il permesso…</>
                : <><Icona nome="battito" /> Usa le mie zone cardiache vere</>}
            </button>
          )}
          {isHealthConnected() && hasZonesScope() && (
            <p className="small muted">
              <Icona nome="fatto" /> Zone cardiache personalizzate attive
              (età e battito a riposo, non “220 meno l’età”).
            </p>
          )}

          {isHealthConnected() && (
            <>
              <button
                className="btn"
                disabled={busy === 'refresh'}
                onClick={() => conAttesa('refresh', async () => {
                  clearHealthCache()
                  await loadHealth()
                })}
              >
                {busy === 'refresh'
                  ? <><Icona nome="ricarica" className="icona--gira" /> Aggiorno…</>
                  : <><Icona nome="ricarica" /> Aggiorna dati adesso</>}
              </button>
              <button
                className="btn"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={() => { disconnectHealth(); setFitbit(null) }}
              >
                Scollega
              </button>
            </>
          )}

          {/* Se il permesso e' scaduto lo dice gia' il blocco "da ricollegare" qui sopra,
              col pulsante accanto: ripeterlo in rosso in fondo sarebbe lo stesso problema
              detto due volte in due punti diversi */}
          {errore && !healthNeedsReconnect() && (
            <p className="small" style={{ color: 'var(--danger)' }}>{errore}</p>
          )}
        </div>

        {isHealthConnected() && (
          <TrackedActivities
            detectedWorkouts={fitbit?.detectedWorkouts}
            // La scelta e' un obiettivo come gli altri: segue la persona, non il
            // dispositivo, quindi va sul profilo appena si tocca un chip
            onChange={() => pushGoals(repo)}
          />
        )}

        <KcalDiagnostics sessions={sessions} />

        <div className="card center" style={{ padding: '28px 20px' }}>
          <p className="small muted">Altre integrazioni arriveranno qui <Icona nome="integrazioni" /></p>
        </div>
      </div>
    </div>
  )
}
