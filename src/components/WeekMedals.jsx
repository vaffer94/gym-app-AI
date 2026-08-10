import { getWorkoutGoal, weeklyMedals } from '../data/goals'

/**
 * Una medaglietta per settimana: piena quando l'obiettivo di allenamenti e' stato
 * raggiunto, solo contorno quando no.
 *
 * Sostituisce "3 settimane di fila", che non diceva quali settimane, quante ne erano
 * state saltate, ne' se prima andasse meglio. Cinque medaglie sono quelle che stanno
 * in larghezza su un telefono senza rimpicciolire il disco sotto la soglia in cui si
 * capisce se e' pieno o vuoto; il resto della storia sta nel contatore accanto.
 */
export default function WeekMedals({ sessions }) {
  const goal = getWorkoutGoal()
  const { settimane, totale } = weeklyMedals(sessions, goal, 5)

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
        {settimane.map((w) => (
          <div key={w.monday} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div
              title={`${w.count} allenament${w.count === 1 ? 'o' : 'i'} su ${goal}`}
              aria-label={`Settimana del ${fmt(w.monday)}: ${w.count} allenamenti su ${goal}`}
              style={{
                width: 38, height: 38, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                // Non raggiunta: solo il bordo, niente giallo dentro. Il bordo resta
                // quello scuro del resto dell'app e non un grigio, se no la medaglia
                // vuota sembra disattivata invece che da conquistare
                border: '3px solid var(--ink)',
                background: w.hit ? 'var(--yellow)' : 'transparent',
                boxShadow: w.hit ? '2px 2px 0 var(--ink)' : 'none',
                // La settimana in corso non e' ancora giudicabile: tratteggio finche' e' aperta
                borderStyle: w.corrente && !w.hit ? 'dashed' : 'solid',
              }}
            >
              <i
                className="fa-solid fa-medal"
                style={{ color: 'var(--ink)', opacity: w.hit ? 1 : 0.35 }}
                aria-hidden="true"
              />
            </div>
            <span className="small muted" style={{ display: 'block', lineHeight: 1.2, fontSize: '0.72rem' }}>
              {fmt(w.monday)}
            </span>
            <span className="small" style={{ display: 'block', lineHeight: 1.2, fontWeight: 800 }}>
              {w.count}/{goal}
            </span>
          </div>
        ))}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div
            style={{
              width: 38, height: 38, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', border: '3px dotted var(--ink)',
              fontWeight: 800, fontSize: '0.9rem',
            }}
          >
            {totale}
          </div>
          <span className="small muted" style={{ display: 'block', lineHeight: 1.2, fontSize: '0.72rem' }}>
            in tutto
          </span>
        </div>
      </div>

      <p className="small muted" style={{ margin: 0 }}>
        Una medaglia per settimana: piena se hai fatto almeno <strong>{goal}</strong>{' '}
        allenament{goal === 1 ? 'o' : 'i'}. L’ultima è la settimana in corso.
      </p>
    </div>
  )
}

const fmt = (ts) => new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
