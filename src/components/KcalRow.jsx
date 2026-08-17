import { useEffect, useState } from 'react'
import { nearestFood } from '../data/foods'
import { sessionKcal } from '../data/kcal'
import { getWorkoutEnergy, isHealthConnected } from '../data/health'
import { FoodButton, foodLabel } from './FoodEquivalent'

/**
 * Riga "Energia" con l'equivalente alimentare: le kcal da sole non dicono niente a
 * nessuno, il cibo che ti sei guadagnata si'.
 *
 * L'icona non e' decorativa, e' un pulsante: aprendola si vede l'intera scala e si
 * capisce dove sta l'allenamento appena fatto rispetto al resto.
 */
export default function KcalRow({ session }) {
  const [res, setRes] = useState(undefined) // undefined = sto caricando, null = niente da dire

  useEffect(() => {
    let alive = true
    sessionKcal(session, { isConnected: isHealthConnected(), fetchEnergy: getWorkoutEnergy })
      .then((r) => alive && setRes(r))
      .catch(() => alive && setRes(null))
    return () => { alive = false }
  }, [session])

  // Niente Google e niente profilo: si tace, invece di mostrare "— kcal"
  if (res === undefined || res === null) return null

  const match = nearestFood(res.kcal)

  return (
    <>
      <div className="row">
        <span className="small" style={{ flex: 1 }}>
          Energia {res.source === 'stima' && <span className="muted">(stima)</span>}
        </span>
        <span className="small" style={{ fontWeight: 800 }}>{res.kcal} kcal</span>
        <FoodButton kcal={res.kcal} />
      </div>

      {match && <p className="small muted" style={{ margin: 0 }}>{foodLabel(match)}</p>}

      {res.source === 'stima' && (
        <p className="small muted" style={{ margin: 0 }}>
          Stimata dal battito medio, e la formula tende a leggere alto. Con Google Health
          collegato compare invece il dato misurato dall'orologio.
        </p>
      )}
    </>
  )
}

/**
 * Versione compatta per le righe dello storico. Non fa richieste: il valore arriva
 * gia' risolto da chi disegna l'elenco, cosi' venti allenamenti non diventano venti
 * chiamate scoordinate all'API.
 */
export function KcalChip({ result }) {
  if (!result) return null
  return (
    <>
      {' · '}
      {result.kcal} kcal{result.source === 'stima' ? '*' : ''}{' '}
      <FoodButton kcal={result.kcal} compact />
    </>
  )
}
