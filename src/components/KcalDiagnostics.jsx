import { useState } from 'react'
import { diagnosticaKcal, isHealthConnected } from '../data/health'
import { getProfile, estimateKcal, basalRate } from '../data/kcal'
import Icona from '../icons'

/**
 * Interroga Google in tre modi diversi sullo stesso intervallo, per rispondere con
 * dati veri al dubbio "queste kcal sono troppo basse" invece che con un'opinione.
 *
 * Le tre risposte separano tre ipotesi che altrimenti restano indistinguibili:
 * un nostro bug nella query, una differenza di grandezza (attive vs totali), o un
 * conteggio di Google che davvero sta basso.
 */
export default function KcalDiagnostics({ sessions }) {
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState(null)

  const ultima = (sessions || []).filter((s) => s.endedAt && s.hrAvg != null)[0]
  if (!isHealthConnected() || !ultima) return null

  const esegui = async () => {
    setBusy(true)
    setErrore(null)
    try {
      setRes(await diagnosticaKcal(ultima.startedAt, ultima.endedAt))
    } catch (e) {
      setErrore(e.message)
    } finally {
      setBusy(false)
    }
  }

  const profilo = getProfile()
  const stima = profilo
    ? estimateKcal({
        avgHr: ultima.hrAvg,
        durationSec: Math.round((ultima.endedAt - ultima.startedAt - (ultima.pausedMs || 0)) / 1000),
        profile: profilo,
      })
    : null
  // DUE numeri distinti, mostrati fianco a fianco invece di spacciare l'uno per l'altro:
  //
  // - la differenza fra i due dati di Google. La loro documentazione dice che
  //   total-calories e' "calculated from active energy expenditure and the user's basal
  //   metabolic rate", quindi la differenza DOVREBBE essere il basale
  // - il basale secondo Mifflin-St Jeor, cioe' la letteratura
  //
  // Se non coincidono, il confronto e' l'informazione: significa che il profilo
  // corporeo registrato su Google non e' quello impostato qui, oppure che i due tipi
  // di dato non sono allineati come la documentazione lascia intendere.
  const differenzaGoogle =
    res?.totale?.valore != null && res?.attivoAlMinuto?.valore != null
      ? Math.round(res.totale.valore - res.attivoAlMinuto.valore)
      : null
  const basale = basalRate(profilo)
  const basaleAtteso = basale && res ? Math.round(basale.kcalPerMin * (res.durataSec / 60)) : null

  return (
    <div className="card stack">
      <div className="row">
        <Icona nome="cerca" size="1.8rem" />
        <div style={{ flex: 1, minWidth: 96 }}>
          <h3>Da dove vengono le kcal</h3>
          <p className="small muted">
            Chiede a Google lo stesso intervallo in tre modi diversi, sull’ultimo allenamento
            con battito registrato.
          </p>
        </div>
      </div>

      <button className="btn" onClick={esegui} disabled={busy}>
        {busy ? 'Chiedo a Google…' : 'Verifica il conto'}
      </button>

      {errore && <p className="small" style={{ color: 'var(--danger)' }}>{errore}</p>}

      {res && (
        <>
          <p className="small muted" style={{ margin: 0 }}>
            {new Date(ultima.startedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} ·{' '}
            {Math.round(res.durataSec / 60)} minuti · {ultima.hrAvg} bpm medi
          </p>

          <Riga
            etichetta="Attive, finestre da 1 minuto"
            nota="è il numero che l’app usa: una finestra per minuto, sommate"
            v={res.attivoAlMinuto}
          />
          <Riga
            etichetta="Attive, finestra unica"
            nota="il vecchio metodo, tenuto solo per confronto: se dà meno della riga sopra, stava perdendo pezzi"
            v={res.attivoFinestraUnica}
          />
          <Riga
            etichetta="Totali (attive + basale)"
            nota="il criterio con cui l’app Fitbit mostra le calorie di un allenamento"
            v={res.totale}
          />

          {res.sonde?.length > 0 && (
            <div className="stack" style={{ gap: 2, borderTop: '2px dashed var(--paper)', paddingTop: 8 }}>
              <span className="small" style={{ fontWeight: 800 }}>Fin dove regge la finestra</span>
              {res.sonde.map((s) => (
                <div key={s.finestraSec} className="row">
                  <span className="small muted" style={{ flex: 1, minWidth: 96 }}>
                    finestre da {s.finestraSec < 60 ? `${s.finestraSec}s` : `${s.finestraSec / 60} min`}
                  </span>
                  <span className="small" style={{ fontWeight: 800 }}>
                    {s.errore ? '✕' : s.valore != null ? `${Math.round(s.valore)} kcal` : '—'}
                  </span>
                </div>
              ))}
              <p className="small muted" style={{ margin: 0 }}>
                Il limite non è documentato da Google: qui si misura. Dove risponde, il totale
                dovrebbe essere lo stesso — se cala al crescere della finestra, sta perdendo pezzi.
              </p>
            </div>
          )}

          {stima != null && (
            <div className="row">
              <span className="small" style={{ flex: 1 }}>
                Nostra stima dal battito <span className="muted">(Keytel, totale)</span>
              </span>
              <span className="small" style={{ fontWeight: 800 }}>{stima.total} kcal</span>
            </div>
          )}
          {(differenzaGoogle != null || basaleAtteso != null) && (
            <div className="stack" style={{ gap: 2, borderTop: '2px dashed var(--paper)', paddingTop: 8 }}>
              <span className="small" style={{ fontWeight: 800 }}>
                Metabolismo basale in {Math.round(res.durataSec / 60)} minuti
              </span>
              {differenzaGoogle != null && (
                <div className="row">
                  <span className="small muted" style={{ flex: 1, minWidth: 96 }}>differenza fra i due dati di Google</span>
                  <span className="small" style={{ fontWeight: 800 }}>{differenzaGoogle} kcal</span>
                </div>
              )}
              {basaleAtteso != null && (
                <div className="row">
                  <span className="small muted" style={{ flex: 1, minWidth: 96 }}>
                    atteso da {basale.fonte === 'mifflin' ? 'Mifflin-St Jeor' : '1 MET (ripiego, manca l’altezza)'}
                  </span>
                  <span className="small" style={{ fontWeight: 800 }}>{basaleAtteso} kcal</span>
                </div>
              )}
              <p className="small muted" style={{ margin: 0 }}>
                Google dichiara che i totali sono “attive + metabolismo basale”, quindi le due
                righe dovrebbero coincidere. Se non lo fanno, il profilo corporeo registrato su
                Google non è quello impostato qui, oppure i due tipi di dato non sono allineati
                come la documentazione lascia intendere.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Per i casi ricorrenti una frase in italiano dice piu' del JSON grezzo. Per tutti
 * gli altri si tiene il messaggio di Google.
 *
 * Prima riducevo ogni errore sconosciuto a "errore 400": comodo da leggere e inutile
 * da diagnosticare. Proprio sul 400 che ci interessava, il motivo l'aveva scritto
 * Google nel campo `message` e l'avevo buttato via. In una diagnostica il dettaglio
 * e' il prodotto, non il rumore.
 */
function messaggioErrore(testo = '') {
  if (/401|UNAUTHENTICATED/.test(testo)) return 'collegamento scaduto: premi di nuovo "Collega Google Health"'
  if (/403|PERMISSION_DENIED/.test(testo)) return 'permesso mancante per questo tipo di dato'
  if (/429|RESOURCE_EXHAUSTED/.test(testo)) return 'troppe richieste a Google: riprova fra qualche minuto'
  const m = testo.match(/"message":\s*"([^"]+)"/)
  if (m) {
    const codice = testo.match(/API (\d{3})/)
    return `${codice ? `${codice[1]}: ` : ''}${m[1]}`
  }
  return testo.slice(0, 200)
}

function Riga({ etichetta, nota, v }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <div className="row">
        <span className="small" style={{ flex: 1, minWidth: 96 }}>{etichetta}</span>
        <span className="small" style={{ fontWeight: 800 }}>
          {v?.errore ? '—' : v?.valore != null ? `${Math.round(v.valore)} kcal` : 'nessun dato'}
        </span>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {v?.errore ? messaggioErrore(v.errore) : nota}
        {v?.finestre != null && !v.errore ? ` · ${v.finestre} finestre` : ''}
      </p>
    </div>
  )
}
