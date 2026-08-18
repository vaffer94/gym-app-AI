import { useMemo } from 'react'
import { computeStats } from '../workout/sessionEngine'
import { formatClock } from '../workout/activeSession'
import { exerciseTypeInfo } from '../data/health'
import Icona from '../icons'

/** Finestra della legenda. Quattro settimane e non "il mese": i mesi sono lunghi
 *  diversi, e un confronto fra un febbraio e un marzo non e' un confronto. */
const GIORNI = 28

/**
 * Come si dividono le ultime quattro settimane: da una parte le schede fatte, dall'altra
 * le attivita' conteggiate da Google.
 *
 * "Ti sei allenata sette volte" non dice se sono sette volte la stessa scheda o quattro
 * schede diverse piu' tre nuotate. Il tempo medio accanto al contatore e' quello che
 * distingue l'abitudine breve dall'uscita lunga: due voci con lo stesso contatore
 * possono essere mezz'ora e due ore.
 *
 * I due elenchi stanno uno sopra l'altro e non affiancati: a 320px due colonne di nomi
 * mandano a capo ogni riga, e una legenda che si legge a fatica non e' una legenda.
 */
export default function MonthBreakdown({ activities }) {
  const { schede, esterne, totale } = useMemo(() => {
    const da = Date.now() - GIORNI * 24 * 3600 * 1000
    const recenti = (activities || []).filter((a) => a.startedAt >= da)

    const raggruppa = (righe) =>
      [...righe.reduce((m, r) => {
        const g = m.get(r.nome) || { nome: r.nome, icona: r.icona, volte: 0, sec: 0, conDurata: 0 }
        g.volte += 1
        // Le attivita' senza durata (Google ogni tanto non manda l'orario di fine) si
        // contano nel contatore ma non nella media: sommarle come zero abbasserebbe il
        // tempo medio di un allenamento che c'e' stato
        if (r.sec > 0) { g.sec += r.sec; g.conDurata += 1 }
        m.set(r.nome, g)
        return m
      }, new Map()).values()]
        .map((g) => ({ ...g, media: g.conDurata ? Math.round(g.sec / g.conDurata) : null }))
        .sort((a, b) => b.volte - a.volte || a.nome.localeCompare(b.nome, 'it'))

    const schede = raggruppa(
      recenti
        .filter((a) => a.source !== 'google')
        .map((s) => ({
          nome: s.planName || 'Senza scheda',
          icona: 'pesi',
          sec: computeStats(s).durationSec,
        }))
    )
    const esterne = raggruppa(
      recenti
        .filter((a) => a.source === 'google')
        .map((a) => {
          const [nome, icona] = exerciseTypeInfo(a.type)
          return { nome, icona, sec: a.endedAt ? Math.round((a.endedAt - a.startedAt) / 1000) : 0 }
        })
    )
    return { schede, esterne, totale: recenti.length }
  }, [activities])

  if (!totale) return null

  return (
    <div className="card stack">
      <div className="row">
        <span className="label" style={{ margin: 0, flex: 1 }}>Come si dividono le ultime 4 settimane</span>
        <span className="chip">{totale}</span>
      </div>

      <Blocco titolo="Schede" righe={schede} vuoto="Nessun allenamento registrato con l’app" />
      {esterne.length > 0 && <Blocco titolo="Conteggiate da Google" righe={esterne} />}
    </div>
  )
}

function Blocco({ titolo, righe, vuoto }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small muted" style={{ fontWeight: 800 }}>{titolo}</span>
      {righe.length === 0 && <p className="small muted" style={{ margin: 0 }}>{vuoto}</p>}
      {righe.map((r) => (
        <div key={r.nome} className="row" style={{ gap: 8 }}>
          <Icona nome={r.icona} style={{ width: 16, textAlign: 'center' }} />
          <span className="small" style={{ flex: 1, minWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.nome}
          </span>
          <span className="small" style={{ fontWeight: 800 }}>×{r.volte}</span>
          <span className="small muted" style={{ width: 56, textAlign: 'right' }}>
            {r.media ? formatClock(r.media) : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
