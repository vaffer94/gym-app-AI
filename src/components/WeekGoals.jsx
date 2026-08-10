import { getWorkoutGoal, getKcalGoal, weekSessions, weekKcal, fillCart } from '../data/goals'

/**
 * Come sta andando la settimana rispetto agli obiettivi.
 *
 * Contano SOLO gli allenamenti registrati dall'app. Le attivita' che Google riconosce
 * da solo (una camminata, le scale) restano fuori: se valessero anche quelle la
 * settimana si chiuderebbe stando in piedi, e l'obiettivo smetterebbe di dire qualcosa.
 */
export default function WeekGoals({ sessions, kcalById, onOpenGoals }) {
  const goalW = getWorkoutGoal()
  const goalE = getKcalGoal()
  const fatti = weekSessions(sessions).length
  const guadagnate = Math.round(weekKcal(sessions, kcalById))
  // Le settimane in linea non si ripetono qui: stanno gia' nelle medaglie, in cima

  const pieni = fillCart(goalE.cart, guadagnate)
  // Obiettivo scritto a mano (nessun alimento): resta comunque una barra sola, se no
  // chi ha impostato solo il numero non vedrebbe niente
  const barre = goalE.kcal > 0 && pieni.length === 0
    ? [{ id: '__totale', food: { emoji: '🔥', name: 'Obiettivo della settimana' }, qty: 1,
         totKcal: goalE.kcal, filled: Math.min(goalE.kcal, guadagnate),
         pct: Math.min(100, (guadagnate / goalE.kcal) * 100) }]
    : pieni

  return (
    <div className="card card--lilac stack">
      <div className="row">
        <span className="emoji-lg">🎯</span>
        <div style={{ flex: 1, minWidth: 96 }}>
          <h3>Questa settimana</h3>
          <p className="small muted">Da lunedì, solo allenamenti registrati dall’app</p>
        </div>
        <button className="btn btn--sm" onClick={onOpenGoals} aria-label="Modifica gli obiettivi">
          <i className="fa-solid fa-pen" />
        </button>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="small" style={{ flex: 1, minWidth: 96 }}>Allenamenti</span>
          <span className="small" style={{ fontWeight: 800 }}>{fatti} di {goalW}</span>
        </div>
        <div className="bar-track">
          <div
            className="bar-fill"
            style={{
              width: `${Math.min(100, (fatti / goalW) * 100)}%`,
              background: fatti >= goalW ? 'var(--teal)' : 'var(--yellow)',
            }}
          />
        </div>
      </div>

      {goalE.kcal > 0 ? (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="small" style={{ flex: 1, minWidth: 96 }}>Energia</span>
            <span className="small" style={{ fontWeight: 800 }}>
              {guadagnate} di {goalE.kcal} kcal
            </span>
          </div>
          {barre.map((b) => (
            <FoodBar key={b.id} b={b} />
          ))}
          <p className="small muted" style={{ margin: 0 }}>
            Ogni alimento si riempie con le kcal degli allenamenti, dal più economico in
            avanti. Il contorno è quello che ti manca.
          </p>
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>
          Nessun obiettivo di energia: scegli gli alimenti che vuoi guadagnarti.
        </p>
      )}
    </div>
  )
}

/**
 * Un alimento dell'obiettivo: il contorno e' la porzione intera, il pieno e' quanto
 * ci si e' guadagnate finora. Trasparente e non grigio, cosi' la parte mancante non
 * sembra un secondo dato — e' semplicemente vuota.
 */
function FoodBar({ b }) {
  const completo = b.pct >= 100
  return (
    <div className="row" style={{ gap: 8 }}>
      <span
        style={{ fontSize: '1.3rem', lineHeight: 1, opacity: completo ? 1 : 0.55 }}
        title={completo ? 'Guadagnato!' : 'Ancora da guadagnare'}
      >
        {b.food.emoji}
      </span>
      <div style={{ flex: 1, minWidth: 96 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="small" style={{ flex: 1, minWidth: 60 }}>
            {b.qty > 1 ? `${b.qty} × ` : ''}{b.food.name}
          </span>
          <span className="small" style={{ fontWeight: 800 }}>
            {completo ? '✓' : `${Math.round(b.filled)}/${b.totKcal}`}
          </span>
        </div>
        <div
          style={{
            height: 14, border: '2px solid var(--ink)', borderRadius: 999,
            background: 'transparent', overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%', width: `${b.pct}%`,
              background: completo ? 'var(--teal)' : 'var(--primary)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
