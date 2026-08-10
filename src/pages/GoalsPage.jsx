import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Stepper from '../components/Stepper'
import { SheetDialog } from '../components/Dialog'
import { FOODS, foodById } from '../data/foods'
import {
  getStepsGoal, setStepsGoal,
  getWorkoutGoal, setWorkoutGoal,
  getKcalGoal, setKcalGoal, cartKcal,
} from '../data/goals'
import { isHealthConnected } from '../data/health'

/**
 * Gli obiettivi, tutti in un posto solo.
 *
 * Ognuno dice a cosa serve in una riga: un numero senza conseguenze e' una cifra da
 * cambiare a caso. Sotto ognuno c'e' dove si vede l'avanzamento, perche' impostare un
 * obiettivo e poi non sapere dove si controlla e' il modo piu' rapido per dimenticarlo.
 */
export default function GoalsPage() {
  const navigate = useNavigate()
  const [steps, setSteps] = useState(getStepsGoal)
  const [workouts, setWorkouts] = useState(getWorkoutGoal)
  const [energia, setEnergia] = useState(getKcalGoal)

  const salvaEnergia = (next) => { setEnergia(next); setKcalGoal(next) }

  // Cambiare le quantita' ricalcola il totale: il carrello E' l'obiettivo
  const cambiaQta = (id, qty) => {
    const cart = energia.cart
      .map((i) => (i.id === id ? { ...i, qty } : i))
      .filter((i) => i.qty > 0)
    salvaEnergia({ kcal: cartKcal(cart), cart })
  }

  const aggiungi = (id) => {
    const gia = energia.cart.find((i) => i.id === id)
    const cart = gia
      ? energia.cart.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i))
      : [...energia.cart, { id, qty: 1 }]
    salvaEnergia({ kcal: cartKcal(cart), cart })
  }

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h2>🎯 Obiettivi</h2>
      </header>

      <div className="card stack">
        <div className="row">
          <span className="emoji-lg">🏋️</span>
          <div style={{ flex: 1, minWidth: 96 }}>
            <h3>Allenamenti a settimana</h3>
            <p className="small muted">Quante volte vuoi allenarti da lunedì a domenica</p>
          </div>
        </div>
        <div className="row">
          <span className="label" style={{ margin: 0, flex: 1, minWidth: 96 }}>Obiettivo</span>
          <Stepper
            value={workouts}
            onChange={(v) => { setWorkouts(v); setWorkoutGoal(v) }}
            min={1} max={14} step={1}
          />
        </div>
        <p className="small muted">
          Nello Storico vedi le <strong>settimane di fila</strong> in cui l’hai rispettato.
          Contano solo gli allenamenti registrati dall’app.
        </p>
      </div>

      <div className="card stack">
        <div className="row">
          <span className="emoji-lg">👟</span>
          <div style={{ flex: 1, minWidth: 96 }}>
            <h3>Passi al giorno</h3>
            <p className="small muted">Serve a segnare i giorni buoni nel calendario</p>
          </div>
        </div>
        <div className="row">
          <span className="label" style={{ margin: 0, flex: 1, minWidth: 96 }}>Obiettivo</span>
          <Stepper
            value={steps}
            onChange={(v) => { setSteps(v); setStepsGoal(v) }}
            min={1000} max={50000} step={500}
          />
        </div>
        {!isHealthConnected() && (
          <p className="small muted">
            I passi arrivano dall’orologio: finché Google Health non è collegato
            (Storico → Integrazioni) questo obiettivo resta lì senza fare niente.
          </p>
        )}
      </div>

      <EnergyGoalCard goal={energia} onQty={cambiaQta} onAdd={aggiungi} onSet={salvaEnergia} />
    </div>
  )
}

/**
 * L'obiettivo di energia si compone con gli alimenti, che sono l'unita' di misura
 * comprensibile: "due gelati e una pizza" si sa cosa vuol dire, "1210 kcal" no.
 */
function EnergyGoalCard({ goal, onQty, onAdd, onSet }) {
  const [picker, setPicker] = useState(false)
  // Quale riga ha appena lampeggiato, e quante volte: il contatore serve a far
  // ripartire l'animazione quando si tocca due volte lo stesso alimento
  const [lampo, setLampo] = useState({ id: null, n: 0 })
  const totale = goal.kcal

  const tocca = (id) => {
    onAdd(id)
    setLampo((l) => ({ id, n: l.n + 1 }))
  }

  // Il segno si toglie a lampo finito: se restasse, riaprendo l'elenco l'ultima riga
  // toccata lampeggerebbe di nuovo per un'azione fatta cinque minuti prima
  useEffect(() => {
    if (!lampo.id) return undefined
    const t = setTimeout(() => setLampo((l) => ({ id: null, n: l.n })), 500)
    return () => clearTimeout(t)
  }, [lampo])

  return (
    <div className="card stack">
      <div className="row">
        <span className="emoji-lg">🍽</span>
        <div style={{ flex: 1, minWidth: 96 }}>
          <h3>Energia a settimana</h3>
          <p className="small muted">Quanto vuoi bruciare, misurato in cose buone</p>
        </div>
      </div>

      {goal.cart.length === 0 && totale === 0 && (
        <p className="small muted">
          Nessun obiettivo: scegli gli alimenti che vuoi guadagnarti in una settimana.
        </p>
      )}

      {goal.cart.map((i) => {
        const f = foodById(i.id)
        return (
          <div key={i.id} className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{f.emoji}</span>
            <div style={{ flex: 1, minWidth: 96 }}>
              <span className="small" style={{ fontWeight: 800 }}>{f.name}</span>
              <p className="small muted" style={{ margin: 0 }}>
                {f.portion} · {f.kcal} kcal l’uno
              </p>
            </div>
            <Stepper value={i.qty} onChange={(v) => onQty(i.id, v)} min={0} max={20} step={1} />
          </div>
        )
      })}

      <button className="btn" onClick={() => setPicker(true)}>
        <i className="fa-solid fa-plus" /> Aggiungi un alimento
      </button>

      <div className="row" style={{ borderTop: '2px dashed var(--paper)', paddingTop: 10 }}>
        <span className="label" style={{ margin: 0, flex: 1, minWidth: 96 }}>Totale (kcal)</span>
        <Stepper
          value={totale}
          // Scrivere il numero a mano svuota il carrello: tenere "due gelati" accanto a
          // un totale che non e' 360 vorrebbe dire mostrare due obiettivi diversi
          onChange={(v) => onSet({ kcal: v, cart: v === cartKcal(goal.cart) ? goal.cart : [] })}
          min={0} max={20000} step={50}
        />
      </div>
      {goal.cart.length > 0 && (
        <p className="small muted" style={{ margin: 0 }}>
          Somma degli alimenti qui sopra. Se scrivi il totale a mano, l’elenco si svuota.
        </p>
      )}

      <p className="small muted" style={{ margin: 0 }}>
        Nello Storico ogni alimento diventa una barra che si riempie con l’energia degli
        allenamenti della settimana. Contano solo quelli registrati dall’app: quelli che
        Google riconosce da solo (una camminata, le scale) non riempiono niente.
      </p>

      {picker && (
        <SheetDialog onClose={() => setPicker(false)}>
          <h2>🍽 Cosa vuoi guadagnarti</h2>
          <p className="small muted">Tocca un alimento per aggiungerlo all’obiettivo della settimana.</p>
          <div className="stack" style={{ gap: 2, maxHeight: '52vh', overflowY: 'auto', margin: '8px 0' }}>
            {FOODS.map((f) => {
              const qty = goal.cart.find((i) => i.id === f.id)?.qty || 0
              return (
                <button
                  // La key cambia a ogni tocco su questa riga: rimonta l'elemento e
                  // fa ripartire il lampo anche alla seconda pressione di fila
                  key={`${f.id}-${lampo.id === f.id ? lampo.n : 0}`}
                  type="button"
                  className={`row ${lampo.id === f.id ? 'tap-flash' : ''}`}
                  onClick={() => tocca(f.id)}
                  style={{
                    gap: 10, padding: '8px', width: '100%', textAlign: 'left',
                    background: 'transparent', border: '2px solid transparent',
                    borderRadius: 'var(--radius-sm)', font: 'inherit', color: 'inherit', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{f.emoji}</span>
                  <span className="small" style={{ flex: 1, minWidth: 96 }}>
                    {f.name} <span className="muted">({f.portion})</span>
                  </span>
                  {/* Il conto di quel che hai gia' messo: il lampo dice "ho sentito",
                      questo dice quanto ne hai. Uno passa, l'altro resta */}
                  {qty > 0 && <span className="chip">×{qty}</span>}
                  <span className="small" style={{ fontWeight: 800 }}>{f.kcal}</span>
                </button>
              )
            })}
          </div>
          <button className="btn btn--primary btn--big" onClick={() => setPicker(false)}>Chiudi</button>
        </SheetDialog>
      )}
    </div>
  )
}
