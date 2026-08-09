import { useState } from 'react'
import { diagnosticaKcal, isHealthConnected } from '../data/health'
import { getProfile, estimateKcal } from '../data/kcal'

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
  const basale = profilo ? Math.round(0.0175 * profilo.weightKg * (res ? res.durataSec / 60 : 0)) : null

  return (
    <div className="card stack">
      <div className="row">
        <span className="emoji-lg">🔍</span>
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
            etichetta="Attive, finestra unica"
            nota="il numero che l’app mostra oggi"
            v={res.attivoFinestraUnica}
          />
          <Riga
            etichetta="Attive, finestre da 1 minuto"
            nota="se differisce dalla riga sopra, la nostra query perde pezzi"
            v={res.attivoAlMinuto}
          />
          <Riga
            etichetta="Totali (attive + basale)"
            nota="il criterio con cui l’app Fitbit mostra le calorie di un allenamento"
            v={res.totale}
          />

          {stima != null && (
            <div className="row">
              <span className="small" style={{ flex: 1 }}>
                Nostra stima dal battito <span className="muted">(Keytel, attive)</span>
              </span>
              <span className="small" style={{ fontWeight: 800 }}>{stima} kcal</span>
            </div>
          )}
          {basale != null && basale > 0 && (
            <p className="small muted" style={{ margin: 0 }}>
              Il tuo metabolismo basale in {Math.round(res.durataSec / 60)} minuti vale circa {basale} kcal:
              è la differenza che ti aspetti fra la prima riga e la terza.
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * L'errore grezzo dell'API e' un blocco JSON di trecento caratteri: illeggibile in una
 * riga di diagnostica, e per i casi ricorrenti dice meno di una frase in italiano.
 */
function messaggioErrore(testo = '') {
  if (/401|UNAUTHENTICATED/.test(testo)) return 'collegamento scaduto: premi di nuovo "Collega Google Health"'
  if (/403|PERMISSION_DENIED/.test(testo)) return 'permesso mancante per questo tipo di dato'
  if (/429|RESOURCE_EXHAUSTED/.test(testo)) return 'troppe richieste a Google: riprova fra qualche minuto'
  const m = testo.match(/API (\d{3})/)
  return m ? `Google ha risposto con errore ${m[1]}` : testo.slice(0, 90)
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
