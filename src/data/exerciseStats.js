import { buildSegments, zonesByExercise, zoneThresholds, exerciseId } from '../workout/hrAnalysis'
import { estimateTotal } from './kcal'

export { exerciseId }

/**
 * Statistiche per singolo esercizio, attraverso tutte le sessioni.
 *
 * Gli esercizi sono identificati per NOME normalizzato e non per `key`: la chiave e'
 * univoca dentro una scheda, ma duplicando o rifacendo una scheda la stessa "Cyclette"
 * prende una chiave nuova, e lo storico si spezzerebbe in due esercizi diversi proprio
 * mentre si cerca di guardarne l'andamento nel tempo.
 */

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

/** Battito medio nel tempo FUORI dalle bande degli esercizi: recuperi e transizioni */
function avgHrOutsideRanges(session, ranges) {
  const t = session.hrT || []
  const bpm = session.hrBpm || []
  let sum = 0
  let n = 0
  for (let i = 0; i < t.length; i++) {
    if (bpm[i] == null) continue
    if (ranges.some((r) => t[i] >= r.startSec && t[i] <= r.endSec)) continue
    sum += bpm[i]
    n++
  }
  return n ? Math.round(sum / n) : null
}

/**
 * Come si distribuisce il consumo dentro una sessione: una quota per ogni esercizio
 * piu' una per il recupero, tutte stimate con Keytel sul battito di quel tratto.
 *
 * Il totale di riferimento si ricava sommando le stesse quote, e NON ricalcolando la
 * sessione con `hrAvg`: erano due strade diverse per lo stesso numero e potevano non
 * coincidere (hrAvg e' tirato in basso dai recuperi), col risultato che i parziali non
 * sommavano al totale. Cosi' invece il conto chiude per costruzione.
 */
function energyShape(session, profile) {
  const segs = buildSegments(session)
  const parts = segs
    .map((seg) => {
      const sec = Math.round(seg.endSec - seg.startSec)
      const stima = estimateTotal({ avgHr: avgHrInRange(session, seg.startSec, seg.endSec), durationSec: sec, profile })
      return stima == null ? null : { key: seg.key, name: seg.name, color: seg.color, sec, stima }
    })
    .filter(Boolean)
  if (!parts.length) return null

  const activeSec = Math.round((session.endedAt - session.startedAt - (session.pausedMs || 0)) / 1000)
  const restSec = Math.max(0, activeSec - parts.reduce((a, p) => a + p.sec, 0))
  const restStima = restSec > 0
    ? estimateTotal({ avgHr: avgHrOutsideRanges(session, segs), durationSec: restSec, profile }) || 0
    : 0

  const base = parts.reduce((a, p) => a + p.stima, 0) + restStima
  return base > 0 ? { parts, restSec, restStima, base } : null
}

/**
 * IL PUNTO: Google sa dire quanto si e' bruciato in un intervallo, ma non come quel
 * consumo si ripartisce fra un esercizio e l'altro; Keytel sa la ripartizione, perche'
 * tiene conto di battito e durata di ogni tratto, ma la sua scala e' una stima. Usati
 * separatamente si contraddicono: sulla sessione del 03/08 il totale misurato era 105
 * kcal e la sola cyclette, stimata, ne dichiarava di piu' dell'intero allenamento.
 *
 * Qui si prende da ognuno cio' che sa fare: **Google da' la scala, Keytel la forma**.
 *
 * Spezzare il totale in proporzione al solo TEMPO sarebbe stato piu' semplice, ma
 * darebbe lo stesso numero a dieci minuti di cyclette e a dieci di stretching.
 *
 * La scala e' il TOTALE (attive + basale), la stessa grandezza mostrata come "Energia":
 * cosi' qualunque numero si guardi nell'app parla della stessa cosa.
 *
 * @returns {number|null} fattore di riscalatura, null se non c'e' un dato misurato
 */
export function measuredScaleFactor(session, profile, measured) {
  if (!measured || measured.source !== 'google' || !(measured.kcal > 0)) return null
  const shape = energyShape(session, profile)
  return shape ? measured.kcal / shape.base : null
}

/**
 * Arrotonda una lista di valori facendo in modo che la somma degli interi sia esatta.
 * Arrotondare ogni voce per conto suo lasciava scarti di qualche kcal, e "i parziali
 * devono tornare col totale" era proprio la richiesta da soddisfare.
 * (metodo dei resti maggiori)
 */
function roundToSum(values, target) {
  const floors = values.map((v) => Math.floor(v))
  let resto = target - floors.reduce((a, b) => a + b, 0)
  const ordine = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (const { i } of ordine) {
    if (resto <= 0) break
    floors[i] += 1
    resto -= 1
  }
  return floors
}

/**
 * Una riga per ogni volta che quell'esercizio e' stato fatto, dalla piu' recente.
 *
 * @param kcalBySession Map(sessionId -> {kcal, source}) dei totali gia' risolti: dove
 *   c'e' il dato misurato di Google, le kcal dell'esercizio ci vengono riscalate sopra
 *   (vedi measuredScaleFactor). Dove non c'e', resta la stima grezza, etichettata.
 */
export function exerciseHistory(sessions, name, profile, googleZonesBySession, kcalBySession) {
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

    // Si passa dalla ripartizione della sessione invece di riscalare a mano: cosi' il
    // numero mostrato qui e' *lo stesso* che compare nel dettaglio dell'allenamento,
    // arrotondamenti inclusi. Due schermate che dicono 60 e 61 sarebbero un bug.
    const misurato = kcalBySession?.get(s.id)
    const ripartizione = sessionEnergyBreakdown(s, profile, misurato)
    const quota = ripartizione?.parts.find((p) => p.key === seg.key)
    const kcal = quota ? quota.kcal : estimateTotal({ avgHr, durationSec, profile })

    rows.push({
      sessionId: s.id,
      startedAt: s.startedAt,
      planName: s.planName,
      name: seg.name,
      color: seg.color,
      durationSec,
      avgHr,
      kcal,
      kcalSource: kcal == null ? null : ripartizione?.source || 'stima',
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

/**
 * Ripartizione dell'energia di una sessione, esercizio per esercizio piu' il recupero.
 * Serve a rendere visibile che i parziali tornano col totale: senza vederli sommare,
 * "la cyclette ha fatto 60 kcal" resta un numero di cui fidarsi sulla parola.
 *
 * @returns {{parts, restSec, restKcal, total, source}|null}
 */
export function sessionEnergyBreakdown(session, profile, measured) {
  if (!session?.startedAt || !session?.endedAt) return null
  const shape = energyShape(session, profile)
  if (!shape) return null

  const fattore = measuredScaleFactor(session, profile, measured)
  const total = fattore ? measured.kcal : Math.round(shape.base)

  // Esercizi e recupero insieme: il recupero brucia anch'esso ed e' dentro
  // l'intervallo misurato da Google, quindi deve avere la sua fetta
  const grezzi = [...shape.parts.map((p) => p.stima), shape.restStima].map((v) => (fattore ? v * fattore : v))
  const interi = roundToSum(grezzi, total)

  return {
    parts: shape.parts.map((p, i) => ({ ...p, kcal: interi[i] })),
    restSec: shape.restSec,
    restKcal: interi[interi.length - 1],
    total,
    source: fattore ? 'google' : 'stima',
  }
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
