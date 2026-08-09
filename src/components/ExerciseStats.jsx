import { useMemo } from 'react'
import { exerciseHistory, exerciseComparison } from '../data/exerciseStats'
import { getProfile } from '../data/kcal'

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
  const rows = useMemo(() => exerciseHistory(sessions, name, getProfile()), [sessions, name])
  const cmp = useMemo(() => exerciseComparison(rows), [rows])

  if (!cmp) return <p className="small muted">Nessun dato per questo esercizio.</p>

  const { ultima, precedente, mediaMese } = cmp

  const METRICHE = [
    { id: 'durationSec', label: 'Durata', fmt: (v) => fmtMin(v) },
    { id: 'avgHr', label: 'Battito medio', fmt: (v) => `${Math.round(v)} bpm` },
    { id: 'kcal', label: 'Energia (stima)', fmt: (v) => `${Math.round(v)} kcal` },
    { id: 'volumeKg', label: 'Volume', fmt: (v) => `${Math.round(v)} kg` },
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
              { key: 'ultima', label: 'Ultima volta', v: ultima[m.id], stile: 'pieno' },
              precedente && { key: 'prec', label: 'Volta prima', v: precedente[m.id], stile: 'righe' },
              mediaMese && { key: 'mese', label: `Media ultimo mese (${mediaMese.campioni})`, v: mediaMese[m.id], stile: 'contorno' },
            ].filter((x) => x && x.v != null)
            const max = Math.max(...valori.map((x) => x.v), 1)

            return (
              <div key={m.id} className="stack" style={{ gap: 4 }}>
                <span className="small" style={{ fontWeight: 800 }}>{m.label}</span>
                {valori.map((x) => (
                  <div key={x.key} className="row" style={{ gap: 8 }}>
                    <span className="small muted" style={{ width: 96, flex: '0 0 96px' }}>{x.label}</span>
                    <div style={{ flex: 1, minWidth: 60, height: 18, position: 'relative' }}>
                      <div style={{ ...barStyle(x.stile, color), width: `${Math.max(3, (x.v / max) * 100)}%` }} />
                    </div>
                    <span className="small" style={{ fontWeight: 800, width: 76, textAlign: 'right' }}>{m.fmt(x.v)}</span>
                  </div>
                ))}
                {precedente && ultima[m.id] != null && precedente[m.id] != null && (
                  <p className="small muted" style={{ margin: 0 }}>
                    {delta(ultima[m.id], precedente[m.id], m)}
                  </p>
                )}
              </div>
            )
          })}

          <p className="small muted" style={{ margin: 0 }}>
            Pieno = ultima volta · a righe = volta prima · tratteggiato = media dell’ultimo mese
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

/** Tre trattamenti grafici sullo stesso colore: leggibili anche senza distinguere tinte */
function barStyle(stile, color) {
  const base = { height: '100%', border: '2px solid var(--ink)', borderRadius: 999 }
  if (stile === 'pieno') return { ...base, background: color }
  if (stile === 'righe') {
    return {
      ...base,
      background: `repeating-linear-gradient(45deg, ${color}, ${color} 5px, var(--card) 5px, var(--card) 10px)`,
    }
  }
  return { ...base, background: 'transparent', borderStyle: 'dashed' }
}

/** Variazione rispetto alla volta prima, con il verso scritto a parole */
function delta(now, prev, m) {
  const d = now - prev
  if (Math.abs(d) < (m.id === 'avgHr' ? 1 : 0.5)) return 'Uguale alla volta prima.'
  const segno = d > 0 ? '+' : '−'
  const abs = Math.abs(d)
  const valore = m.id === 'durationSec' ? `${Math.round(abs / 60)}′` : Math.round(abs)
  const unita = m.id === 'avgHr' ? ' bpm' : m.id === 'kcal' ? ' kcal' : m.id === 'volumeKg' ? ' kg' : ''
  return `${segno}${valore}${unita} rispetto alla volta prima.`
}
