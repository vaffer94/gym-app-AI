import { useMemo, useState } from 'react'
import { activityTypeOptions } from '../data/health'
import { getTrackedActivityTypes, setTrackedActivityTypes } from '../data/goals'
import Icona from '../icons'

/**
 * Quali attivita' riconosciute da Google valgono come allenamento.
 *
 * Sta in Integrazioni e non in Obiettivi — al contrario dell'obiettivo passi, che da
 * qui era stato spostato — perche' la domanda non e' "quanto voglio fare" ma "di questo
 * servizio, cosa mi interessa". Si risponde guardando l'elenco di cio' che l'orologio
 * ha visto, ed e' qui che quell'elenco esiste.
 *
 * Nessun pulsante Salva: la spunta e' gia' la conferma, e un salvataggio in piu' e'
 * solo un modo per uscire dalla pagina avendo perso la scelta.
 */
export default function TrackedActivities({ detectedWorkouts, onChange }) {
  const [scelti, setScelti] = useState(() => new Set(getTrackedActivityTypes()))
  const gruppi = useMemo(() => activityTypeOptions(detectedWorkouts), [detectedWorkouts])

  const toggle = (g) => {
    const next = new Set(scelti)
    const acceso = g.types.some((t) => next.has(t))
    for (const t of g.types) {
      if (acceso) next.delete(t)
      else next.add(t)
    }
    setScelti(next)
    setTrackedActivityTypes([...next])
    onChange?.([...next])
  }

  return (
    <div className="card stack">
      <div className="row">
        <Icona nome="nuotoSezione" size="1.8rem" />
        <div style={{ flex: 1, minWidth: 96 }}>
          <h3>Attività da conteggiare</h3>
          <p className="small muted">
            Google riconosce da solo camminate, bici e altro. Qui scegli quali valgono
            come allenamento: solo le attività spuntate entrano negli obiettivi.
          </p>
        </div>
      </div>

      <div className="chips-wrap">
        {gruppi.map((g) => {
          const on = g.types.some((t) => scelti.has(t))
          return (
            <span
              key={g.label}
              className={`chip chip--select ${on ? 'chip--on' : ''}`}
              role="checkbox"
              aria-checked={on}
              tabIndex={0}
              onClick={() => toggle(g)}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(g))
              }
            >
              <Icona nome={g.icon} />
              {g.label}
              {/* Quante volte e' comparsa: distingue a colpo d'occhio cio' che fai
                  davvero dal resto dell'elenco, che altrimenti e' un catalogo */}
              {g.volte > 0 && <span style={{ opacity: 0.7 }}>· {g.volte}</span>}
            </span>
          )
        })}
      </div>

      <p className="small muted" style={{ margin: 0 }}>
        {scelti.size === 0
          ? 'Nessuna attività conteggiata: per ora valgono solo gli allenamenti registrati dall’app.'
          : 'Il numero accanto al nome è quante volte Google l’ha registrata nel periodo scaricato.'}
      </p>
    </div>
  )
}
