import { useEffect, useState } from 'react'
import { sessionEnergyBreakdown } from '../data/exerciseStats'
import { getProfile, sessionKcal } from '../data/kcal'
import { getActiveEnergy, isHealthConnected } from '../data/health'

/**
 * Dove sono finite le kcal dell'allenamento, esercizio per esercizio.
 *
 * Esiste perche' senza questa vista i parziali e il totale sembravano contraddirsi:
 * il totale arriva misurato da Google, i parziali da una formula che legge alto, e
 * un singolo esercizio poteva dichiarare piu' dell'intera sessione. Qui i pezzi si
 * vedono sommare, e la riga del recupero chiude il conto.
 */
export default function EnergyBreakdown({ session }) {
  const [data, setData] = useState(undefined)

  useEffect(() => {
    let alive = true
    sessionKcal(session, { isConnected: isHealthConnected(), fetchActiveEnergy: getActiveEnergy })
      .then((misurato) => alive && setData(sessionEnergyBreakdown(session, getProfile(), misurato)))
      .catch(() => alive && setData(null))
    return () => { alive = false }
  }, [session])

  if (!data || data.parts.length < 2) return null

  const max = Math.max(...data.parts.map((p) => p.kcal), data.restKcal || 0, 1)

  return (
    <div className="card card--flat stack">
      <span className="label" style={{ margin: 0 }}>🔥 Energia per esercizio</span>

      {data.parts.map((p) => (
        <Riga key={p.key} colore={p.color} nome={p.name} kcal={p.kcal} max={max} />
      ))}

      {data.restKcal != null && data.restKcal > 0 && (
        <Riga colore="var(--paper)" nome="Recupero e pause" kcal={data.restKcal} max={max} />
      )}

      <div className="row" style={{ borderTop: '2px solid var(--ink)', paddingTop: 8 }}>
        <span className="small" style={{ flex: 1, fontWeight: 800 }}>Totale</span>
        <span className="small" style={{ fontWeight: 800 }}>{data.total} kcal</span>
      </div>

      <p className="small muted" style={{ margin: 0 }}>
        {data.source === 'google'
          ? 'Il totale è misurato dall’orologio; la ripartizione fra gli esercizi segue battito e durata di ciascuno.'
          : 'Tutto stimato dal battito: collega Google Health per il totale misurato.'}
      </p>
    </div>
  )
}

function Riga({ colore, nome, kcal, max }) {
  return (
    <div className="stack" style={{ gap: 3 }}>
      <div className="row" style={{ gap: 8 }}>
        <span
          style={{ width: 11, height: 11, background: colore, border: '1.5px solid var(--ink)', borderRadius: 3 }}
        />
        <span className="small" style={{ flex: 1, minWidth: 96 }}>{nome}</span>
        <span className="small" style={{ fontWeight: 800 }}>{kcal} kcal</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${(kcal / max) * 100}%`, background: colore }} />
      </div>
    </div>
  )
}
