import { useEffect, useRef, useState } from 'react'
import { FOODS, nearestFood } from '../data/foods'
import { sessionKcal } from '../data/kcal'
import { getActiveEnergy, isHealthConnected } from '../data/health'
import { SheetDialog } from './Dialog'

/**
 * Riga "Energia" con l'equivalente alimentare: le kcal da sole non dicono niente a
 * nessuno, il cibo che ti sei guadagnata si'.
 *
 * L'icona non e' decorativa, e' un pulsante: aprendola si vede l'intera scala e si
 * capisce dove sta l'allenamento appena fatto rispetto al resto.
 */
export default function KcalRow({ session }) {
  const [res, setRes] = useState(undefined) // undefined = sto caricando, null = niente da dire
  const [open, setOpen] = useState(false)
  const matchRef = useRef(null)
  const listRef = useRef(null)

  // La lista e' lunga e si apre in cima: senza questo il risultato — l'unica riga
  // che l'utente sta cercando — resta fuori schermo, tagliato dal bordo del foglio.
  // Si scorre a mano il contenitore invece di scrollIntoView, che trascinerebbe con
  // se' anche la pagina sotto al foglio.
  useEffect(() => {
    const list = listRef.current
    const el = matchRef.current
    if (!open || !list || !el) return
    list.scrollTop = Math.max(0, el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2)
  }, [open])

  useEffect(() => {
    let alive = true
    sessionKcal(session, { isConnected: isHealthConnected(), fetchActiveEnergy: getActiveEnergy })
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
        {match && (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setOpen(true)}
            title={`${match.almost ? 'Quasi: ' : ''}${match.food.name} — tocca per la lista`}
            aria-label={`Equivalente: ${match.almost ? 'quasi ' : ''}${match.food.name}. Apri la lista degli alimenti`}
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{match.food.emoji}</span>
          </button>
        )}
      </div>

      {/* "Quasi:" e non "Quasi un/una": l'articolo cambia genere e numero da un cibo
          all'altro (un calice, una birra, delle patatine) e non lo si puo' dedurre dal
          nome. I due punti reggono tutta la lista senza casi particolari. */}
      {match && (
        <p className="small muted" style={{ margin: 0 }}>
          {match.almost ? 'Quasi: ' : ''}{match.food.name} ({match.food.portion})
        </p>
      )}

      {res.source === 'stima' && (
        <p className="small muted" style={{ margin: 0 }}>
          Stimata dal battito medio: collega Google Health per il dato misurato dall'orologio.
        </p>
      )}

      {open && (
        <SheetDialog onClose={() => setOpen(false)}>
          <h2>🍽 Quanto vale un allenamento</h2>
          <p className="small muted">
            Hai bruciato <strong>{res.kcal} kcal</strong>. Gli alimenti evidenziati sono quelli che ci stanno dentro.
          </p>
          <div
            ref={listRef}
            className="stack"
            style={{ gap: 2, maxHeight: '52vh', overflowY: 'auto', margin: '8px 0', position: 'relative' }}
          >
            {FOODS.map((f) => {
              const within = f.kcal <= res.kcal
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
            Valori indicativi per porzioni tipiche: la stessa pizza puo' variare di centinaia di kcal.
          </p>
          <button className="btn btn--primary btn--big" onClick={() => setOpen(false)}>Chiudi</button>
        </SheetDialog>
      )}
    </>
  )
}
