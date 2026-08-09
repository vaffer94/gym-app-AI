import { useEffect, useRef, useState } from 'react'
import { FOODS, nearestFood } from '../data/foods'
import { SheetDialog } from './Dialog'

/**
 * L'equivalente alimentare delle kcal, in due pezzi riusabili: il pulsante-emoji e
 * il foglio con la scala intera. Stanno qui e non dentro KcalRow perche' servono in
 * due posti con layout diversi — il dettaglio di una sessione e le righe dello storico.
 */

/** Testo dell'equivalente, con il "Quasi:" per chi sta sotto alla voce piu' piccola */
export function foodLabel(match) {
  if (!match) return ''
  // "Quasi:" e non "Quasi un/una": l'articolo cambia genere e numero da un cibo
  // all'altro (un calice, una birra, delle patatine) e non lo si puo' dedurre dal nome.
  return `${match.almost ? 'Quasi: ' : ''}${match.food.name} (${match.food.portion})`
}

/** Emoji cliccabile: apre la scala completa. `compact` = versione da riga di elenco. */
export function FoodButton({ kcal, compact = false }) {
  const [open, setOpen] = useState(false)
  const match = nearestFood(kcal)
  if (!match) return null

  return (
    <>
      <button
        type="button"
        className={compact ? 'food-chip' : 'btn btn--sm'}
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        title={`${foodLabel(match)} — tocca per la lista`}
        aria-label={`Equivalente: ${foodLabel(match)}. Apri la lista degli alimenti`}
      >
        <span style={{ fontSize: compact ? '1rem' : '1.25rem', lineHeight: 1 }}>{match.food.emoji}</span>
      </button>
      {open && <FoodDialog kcal={kcal} onClose={() => setOpen(false)} />}
    </>
  )
}

export function FoodDialog({ kcal, onClose }) {
  const match = nearestFood(kcal)
  const matchRef = useRef(null)
  const listRef = useRef(null)

  // La lista e' lunga e si apre in cima: senza questo il risultato — l'unica riga che
  // si sta cercando — resta fuori schermo, tagliato dal bordo del foglio. Si scorre a
  // mano il contenitore invece di scrollIntoView, che trascinerebbe anche la pagina.
  useEffect(() => {
    const list = listRef.current
    const el = matchRef.current
    if (!list || !el) return
    list.scrollTop = Math.max(0, el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2)
  }, [])

  return (
    <SheetDialog onClose={onClose}>
      <h2>🍽 Quanto vale un allenamento</h2>
      <p className="small muted">
        Hai bruciato <strong>{kcal} kcal</strong>. Gli alimenti evidenziati sono quelli che ci stanno dentro.
      </p>
      <div
        ref={listRef}
        className="stack"
        style={{ gap: 2, maxHeight: '52vh', overflowY: 'auto', margin: '8px 0', position: 'relative' }}
      >
        {FOODS.map((f) => {
          const within = f.kcal <= kcal
          const isMatch = f === match.food && !match.almost
          return (
            <div
              key={f.name}
              ref={f === match.food ? matchRef : null}
              className="row"
              style={{
                gap: 10,
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                background: isMatch ? 'var(--yellow-soft)' : 'transparent',
                border: isMatch ? '2px solid var(--ink)' : '2px solid transparent',
                opacity: within ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{f.emoji}</span>
              <span className="small" style={{ flex: 1, minWidth: 96 }}>
                {f.name} <span className="muted">({f.portion})</span>
              </span>
              <span className="small" style={{ fontWeight: 800 }}>{f.kcal}</span>
            </div>
          )
        })}
      </div>
      <p className="small muted">
        Valori indicativi per porzioni tipiche: la stessa pizza può variare di centinaia di kcal.
      </p>
      <button className="btn btn--primary btn--big" onClick={onClose}>Chiudi</button>
    </SheetDialog>
  )
}
