import { buildSegments, zonesByExercise, zoneThresholds } from '../workout/hrAnalysis'
import { estimateKcal } from './kcal'

/**
 * Statistiche per singolo esercizio, attraverso tutte le sessioni.
 *
 * Gli esercizi sono identificati per NOME normalizzato e non per `key`: la chiave e'
 * univoca dentro una scheda, ma duplicando o rifacendo una scheda la stessa "Cyclette"
 * prende una chiave nuova, e lo storico si spezzerebbe in due esercizi diversi proprio
 * mentre si cerca di guardarne l'andamento nel tempo.
 */

export const exerciseId = (name) => (name || '').trim().toLowerCase()

/** Battito medio nella finestra di un esercizio */
function avgHrInRange(session, startSec, endSec) {
  const t = session.hrT || []
  const bpm = session.hrBpm || []
  let sum = 0
  let n = 0
  for (let i = 0; i < t.length; i++) {
    if (t[i] < startSec || t[i] > endSec) continue
    if (bpm[i] == null) continue
    sum += bpm[i]
    n++
  }
  return n ? Math.round(sum / n) : null
}

/**
 * Una riga per ogni volta che quell'esercizio e' stato fatto, dalla piu' recente.
 *
 * Le kcal per esercizio sono per forza una stima dal battito: `active-energy-burned`
 * su finestre di pochi minuti e' molto meno affidabile che su una sessione intera, e
 * spezzare il totale in proporzione al tempo darebbe lo stesso numero a dieci minuti
 * di cyclette e a dieci minuti di stretching. Sempre etichettate come stima.
 */
export function exerciseHistory(sessions, name, profile, googleZonesBySession) {
  const wanted = exerciseId(name)
  const rows = []

  for (const s of sessions) {
    const segs = buildSegments(s)
    const seg = segs.find((g) => exerciseId(g.name) === wanted)
    if (!seg) continue

    const ex = (s.exercises || []).find((e) => e.key === seg.key)
    const durationSec = Math.round(seg.endSec - seg.startSec)
    const avgHr = avgHrInRange(s, seg.startSec, seg.endSec)
    const info = zoneThresholds(profile, googleZonesBySession?.get(s.id))
    const perZone = info ? zonesByExercise(s, info.zones).get(seg.key)?.perZone || null : null

    rows.push({
      sessionId: s.id,
      startedAt: s.startedAt,
      planName: s.planName,
      name: seg.name,
      color: seg.color,
      durationSec,
      avgHr,
      kcal: estimateKcal({ avgHr, durationSec, profile }),
      doneSeries: (ex?.series || []).filter((x) => x.done).length,
      sets: ex?.sets ?? null,
      volumeKg: (ex?.series || [])
        .filter((x) => x.done && x.actualWeightKg != null)
        .reduce((a, x) => a + (x.actualReps || 0) * x.actualWeightKg, 0),
      perZone,
      zoneSource: info?.source || null,
    })
  }

  return rows.sort((a, b) => b.startedAt - a.startedAt)
}

/** Elenco degli esercizi presenti nello storico, con quante volte e quando l'ultima */
export function exerciseIndex(sessions) {
  const map = new Map()
  for (const s of sessions) {
    for (const seg of buildSegments(s)) {
      const id = exerciseId(seg.name)
      const cur = map.get(id) || { id, name: seg.name, color: seg.color, times: 0, lastAt: 0, totalSec: 0 }
      cur.times += 1
      cur.lastAt = Math.max(cur.lastAt, s.startedAt)
      cur.totalSec += Math.round(seg.endSec - seg.startSec)
      map.set(id, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.lastAt - a.lastAt)
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/**
 * I tre termini del confronto chiesto: l'ultima volta, la volta prima, e la media
 * dell'ultimo mese (esclusa l'ultima, se no si confronterebbe con se stessa).
 */
export function exerciseComparison(rows, now = Date.now()) {
  if (!rows.length) return null
  const [ultima, precedente] = rows
  const MESE = 30 * 24 * 60 * 60 * 1000
  const delMese = rows.slice(1).filter((r) => now - r.startedAt <= MESE)

  const num = (key, list) => mean(list.map((r) => r[key]).filter((v) => v != null))

  return {
    ultima,
    precedente: precedente || null,
    mediaMese: delMese.length
      ? {
          campioni: delMese.length,
          durationSec: num('durationSec', delMese),
          avgHr: num('avgHr', delMese),
          kcal: num('kcal', delMese),
          volumeKg: num('volumeKg', delMese),
        }
      : null,
  }
}
