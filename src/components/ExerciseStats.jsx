import { useEffect, useMemo, useState } from 'react'
import { exerciseHistory, exerciseComparison } from '../data/exerciseStats'
import { getProfile, resolveKcalMany } from '../data/kcal'
import { getWorkoutEnergy, isHealthConnected } from '../data/health'

/**
 * Statistiche di un singolo esercizio: quanto dura, quanto fa salire il battito, in
 * quali zone ti tiene, e come sta andando rispetto a prima.
 *
 * Il confronto sta in un unico grafico per metrica, con tre trattamenti grafici diversi
 * invece di tre colori diversi: pieno = l'ultima volta, righe = la volta prima, contorno
 * tratteggiato = la media dell'ultimo mese. Il colore resta quello dell'esercizio, cosi'
 * non compete con la codifica dei colori usata ovunque; e la differenza si vede anche
 * senza distinguere le tinte.
 */

const fmtMin = (sec) => `${Math.round(sec / 60)}′`
const fmtSec = (sec) => {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m}′${s ? ` ${String(s).padStart(2, '0')}″` : ''}` : `${s}″`
}

export default function ExerciseStats({ sessions, name, color }) {
  // I totali misurati servono a riscalare le stime dei singoli esercizi: senza,
  // un esercizio puo' dichiarare piu' kcal dell'intera sessione da cui viene.
  const [kcalBySession, setKcalBySession] = useState(new Map())
  useEffect(() => {
    let alive = true
    const items = sessions
      .filter((s) => s.endedAt)
      .map((s) => ({ id: s.id, startedAt: s.startedAt, endedAt: s.endedAt, hrAvg: s.hrAvg, pausedMs: s.pausedMs }))
    resolveKcalMany(items, { isConnected: isHealthConnected(), fetchEnergy: getWorkoutEnergy })
      .then((m) => alive && setKcalBySession(m))
    return () => { alive = false }
  }, [sessions])

  const rows = useMemo(
    () => exerciseHistory(sessions, name, getProfile(), null, kcalBySession),
    [sessions, name, kcalBySession]
  )
  const cmp = useMemo(() => exerciseComparison(rows), [rows])

  if (!cmp) return <p className="small muted">Nessun dato per questo esercizio.</p>

  const { ultima, precedente, mediaMese } = cmp

  // Niente kcal qui: su una finestra di pochi minuti non sono calcolabili con
  // abbastanza accuratezza da reggere un confronto fra allenamenti. La ripartizione
  // ancorata al totale misurato resta nel dettaglio della singola sessione.
  // "se c'e' il peso sollevato": le metriche a zero spariscono da sole.
  const METRICHE = [
    { id: 'durationSec', label: 'Durata', fmt: (v) => fmtMin(v), breve: (v) => fmtMin(v) },
    { id: 'avgHr', label: 'Battito medio', fmt: (v) => `${Math.round(v)} bpm`, breve: (v) => Math.round(v) },
    { id: 'doneSeries', label: 'Serie', fmt: (v) => `${Math.round(v * 10) / 10}`, breve: (v) => Math.round(v * 10) / 10 },
    { id: 'reps', label: 'Ripetizioni', fmt: (v) => `${Math.round(v)}`, breve: (v) => Math.round(v) },
    { id: 'weightKg', label: 'Peso sollevato', fmt: (v) => `${Math.round(v * 10) / 10} kg`, breve: (v) => Math.round(v * 10) / 10 },
  ].filter((m) => ultima[m.id] != null && ultima[m.id] > 0)

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row">
          <span style={{ width: 14, height: 14, background: color, border: '2px solid var(--ink)', borderRadius: 4 }} />
          <div style={{ flex: 1, minWidth: 96 }}>
            <h3>{ultima.name}</h3>
            <p className="small muted">
              {rows.length} volt{rows.length === 1 ? 'a' : 'e'} · ultima{' '}
              {new Date(ultima.startedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="row">
          <span className="small" style={{ flex: 1 }}>Tempo totale in questo esercizio</span>
          <span className="small" style={{ fontWeight: 800 }}>
            {fmtSec(rows.reduce((a, r) => a + r.durationSec, 0))}
          </span>
        </div>
      </div>

      {METRICHE.length > 0 && (
        <div className="card card--flat stack">
          <span className="label" style={{ margin: 0 }}>Rispetto a prima</span>

          {METRICHE.map((m) => {
            const valori = [
              { key: 'ultima', label: 'Ultima', v: ultima[m.id], stile: 'pieno' },
              precedente && { key: 'prec', label: 'Prima', v: precedente[m.id], stile: 'righe' },
              mediaMese && { key: 'mese', label: `Media (${mediaMese.campioni})`, v: mediaMese[m.id], stile: 'contorno' },
            ].filter((x) => x && x.v != null)

            return (
              <div key={m.id} className="stack" style={{ gap: 4, paddingBottom: 4 }}>
                <span className="small" style={{ fontWeight: 800 }}>{m.label}</span>
                <BarreVerticali valori={valori} colore={color} formato={m.breve} />
                {precedente && ultima[m.id] != null && precedente[m.id] != null && (
                  <p className="small muted" style={{ margin: 0 }}>
                    {delta(ultima[m.id], precedente[m.id], m)}
                  </p>
                )}
              </div>
            )
          })}

          <p className="small muted" style={{ margin: 0 }}>
            Pieno = ultima volta · a righe = volta prima · tratteggiato = media dell’ultimo mese.
            Le barre partono da zero, così le altezze sono confrontabili fra loro.
          </p>
        </div>
      )}

      {ultima.perZone && (
        <div className="card card--flat stack">
          <span className="label" style={{ margin: 0 }}>Zone del cuore in questo esercizio</span>
          {/* >= 15s: sotto c'e' solo il campione di transizione fra un esercizio e l'altro */}
          {ultima.perZone.filter((z) => z.sec >= 15).map((z) => (
            <div key={z.id} className="stack" style={{ gap: 3 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="small" style={{ flex: 1, minWidth: 96 }}>
                  <span style={{ display: 'inline-block', width: 11, height: 11, background: z.color, border: '1.5px solid var(--ink)', borderRadius: 3, marginRight: 6 }} />
                  {z.label}
                </span>
                <span className="small" style={{ fontWeight: 800 }}>{Math.round(z.pct)}% · {fmtSec(z.sec)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${z.pct}%`, background: z.color }} />
              </div>
            </div>
          ))}
          <p className="small muted" style={{ margin: 0 }}>
            Dell’ultima volta.{' '}
            {ultima.zoneSource === 'google'
              ? 'Soglie personalizzate da Google Health.'
              : 'Soglie stimate da 220 meno l’età.'}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Istogramma verticale a tre barre.
 *
 * Prima erano barre orizzontali dentro una colonna stretta di telefono: lo spazio
 * disponibile era una sessantina di pixel, e tre lunghezze quasi uguali dentro
 * sessanta pixel non dicono niente. In verticale l'altezza disponibile la decidiamo
 * noi, quindi la differenza si vede.
 *
 * Base a ZERO e non al minimo: in un istogramma la lunghezza della barra *e'* il
 * valore, e far partire l'asse da 150 farebbe sembrare 155 bpm il doppio di 152.
 * Il prezzo e' che su grandezze poco variabili come il battito le barre si
 * somigliano — per questo il numero e' scritto sopra ciascuna.
 */
function BarreVerticali({ valori, colore, formato }) {
  const H = 96 // altezza dell'area delle barre, esclusa la riga dei numeri
  const max = Math.max(...valori.map((x) => x.v), 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: H }}>
        {valori.map((x) => (
          <div key={x.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <span className="small" style={{ fontWeight: 800, lineHeight: 1.2 }}>{formato(x.v)}</span>
            {/* minimo 4px: una barra alta zero sparirebbe e sembrerebbe un dato mancante */}
            <div style={{ ...barStyle(x.stile, colore), width: '100%', height: Math.max(4, Math.round((x.v / max) * (H - 20))) }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, borderTop: '2px solid var(--ink)', paddingTop: 4 }}>
        {valori.map((x) => (
          <span key={x.key} className="small muted" style={{ flex: 1, textAlign: 'center', lineHeight: 1.2 }}>
            {x.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Tre trattamenti grafici sullo stesso colore: leggibili anche senza distinguere tinte */
function barStyle(stile, color) {
  const base = { border: '2px solid var(--ink)', borderRadius: '6px 6px 0 0' }
  if (stile === 'pieno') return { ...base, background: color }
  if (stile === 'righe') {
    return {
      ...base,
      background: `repeating-linear-gradient(45deg, ${color}, ${color} 5px, var(--card) 5px, var(--card) 10px)`,
    }
  }
  return { ...base, background: 'transparent', borderStyle: 'dashed' }
}

const UNITA = { avgHr: ' bpm', weightKg: ' kg', doneSeries: ' serie', reps: ' ripetizioni' }

/** Variazione rispetto alla volta prima, con il verso scritto a parole */
function delta(now, prev, m) {
  const d = now - prev
  if (Math.abs(d) < (m.id === 'avgHr' ? 1 : 0.5)) return 'Uguale alla volta prima.'
  const segno = d > 0 ? '+' : '−'
  const abs = Math.abs(d)
  const valore = m.id === 'durationSec' ? `${Math.round(abs / 60)}′` : Math.round(abs)
  return `${segno}${valore}${UNITA[m.id] || ''} rispetto alla volta prima.`
}
