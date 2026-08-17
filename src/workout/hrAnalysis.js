import { exerciseColor } from '../data/planColors'

/**
 * Analisi del battito di una sessione: bande degli esercizi, recuperi, zone cardiache.
 *
 * Sta qui e non dentro il grafico perche' le stesse bande servono in tre posti — la
 * linea HR, gli istogrammi per zona e le statistiche per esercizio — e tre copie della
 * stessa logica divergerebbero al primo ritocco.
 */

/* ---------------- bande degli esercizi ---------------- */

/** Stessa chiave usata per riconoscere un esercizio fra sessioni diverse */
export const exerciseId = (name) => (name || '').trim().toLowerCase()

/**
 * Bande esercizio.
 *
 * Il colore segue il NOME, non la posizione nella scheda: tre "Cyclette" nella stessa
 * scheda prendevano tre colori diversi e tre voci di legenda, che rendeva il grafico
 * illeggibile proprio dove serviva di piu'. Ora la stessa cyclette e' sempre dello
 * stesso colore, ovunque compaia.
 */
export function buildSegments(session) {
  const t0 = session.startedAt

  // Un indice di colore per nome distinto, nell'ordine di prima apparizione
  const coloreDi = new Map()
  for (const e of session.exercises || []) {
    const id = exerciseId(e.name)
    if (!coloreDi.has(id)) coloreDi.set(id, coloreDi.size)
  }

  const raw = (session.exercises || [])
    .map((e) => {
      const i = coloreDi.get(exerciseId(e.name)) ?? 0
      const dones = (e.series || []).filter((s) => s.done && s.doneAt)
      const firstDone = dones.length ? Math.min(...dones.map((s) => s.doneAt)) : null
      const start = e.startedAt ?? firstDone
      const end = e.endedAt ?? (dones.length ? Math.max(...dones.map((s) => s.doneAt)) : null)
      if (start == null || end == null) return null
      return {
        key: e.key,
        name: e.name,
        color: exerciseColor(i),
        startSec: (start - t0) / 1000,
        endSec: (end - t0) / 1000,
        // Sessioni watch pre-fix (o esercizi da 1 serie): startedAt coincideva con la
        // prima "Fatta", quindi la banda partirebbe a fine serie (o sarebbe larga zero)
        degenerate: e.startedAt == null || firstDone == null || Math.abs(e.startedAt - firstDone) < 1500,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.endSec - b.endSec)

  // Fallback per le bande degeneri: l'esercizio parte dalla fine del precedente
  // (o dall'inizio sessione); le bande non si sovrappongono mai
  let prevEnd = 0
  for (const s of raw) {
    s.startSec = s.degenerate ? prevEnd : Math.max(s.startSec, prevEnd)
    prevEnd = s.endSec
  }
  return raw.filter((s) => s.endSec - s.startSec >= 2)
}

/**
 * Recuperi tra le serie: ritagli neutri da sovrapporre alle bande. Senza questi il
 * recupero tra due serie dello stesso esercizio resta coperto dal colore dell'esercizio
 * (la banda va dall'inizio alla fine), e il ritmo serie-recupero-serie non si legge.
 */
export function buildRests(session) {
  const t0 = session.startedAt
  return (session.exercises || [])
    .flatMap((e) => e.series || [])
    .filter((s) => s.doneAt && s.restSec > 0)
    .map((s) => ({
      startSec: (s.doneAt - t0) / 1000,
      endSec: (s.doneAt - t0) / 1000 + s.restSec,
    }))
}

/* ---------------- infittimento del grafico ---------------- */

/**
 * Passo nativo dei campioni: il watch NON salva i battiti grezzi, li media gia' in
 * bucket da 5 secondi (ExerciseRecorder.BUCKET_SEC). E' il pavimento sotto cui non
 * ha senso scendere, ed e' anche il caso "nessuna aggregazione in piu'".
 */
export const HR_STEP_SEC = 5

/**
 * Ampiezza della finestra con cui aggregare il battito, in secondi.
 *
 * NON e' un numero fisso perche' il problema non e' il rumore del sensore (i bucket
 * da 5s l'hanno gia' tolto) ma la DENSITA': un'ora di allenamento fa 720 punti, e
 * sull'area utile di un telefono (~264px) sono tre punti e mezzo per pixel. Disegnarli
 * tutti da' un pettine in cui la curva non si legge.
 *
 * Si punta quindi a ~1 punto ogni 2.5 pixel REALI: la stessa sessione si smorza molto
 * su telefono e poco su schermo largo, che e' esattamente il comportamento voluto —
 * dove c'e' spazio si mostra piu' dettaglio. Il risultato e' arrotondato a multipli
 * del passo nativo per tenere le finestre allineate ai campioni.
 *
 * Il tetto di 60s e' fisiologico prima che grafico: oltre si appiattiscono anche i
 * cali di recupero tra le serie, che sono il ritmo dell'allenamento e non rumore.
 */
export function hrWindowSec(tMax, plotPx) {
  if (!(plotPx > 0) || !(tMax > 0)) return HR_STEP_SEC
  const target = (tMax / plotPx) * 2.5
  const step = Math.round(target / HR_STEP_SEC) * HR_STEP_SEC
  return Math.min(60, Math.max(HR_STEP_SEC, step))
}

/**
 * Aggrega i campioni in finestre di `windowSec`: per ognuna media, minimo e massimo.
 *
 * Il minimo e il massimo non sono un di piu': la media da sola abbassa il picco (una
 * sessione arrivata a 117 bpm ne disegnerebbe ~110) e il grafico smentirebbe il
 * "max 117 bpm" scritto nella card sopra. Tenendo la fascia, il picco vero resta il
 * bordo della fascia e si vede anche quanto il battito ballava dentro la finestra.
 *
 * `sec` e' la media dei tempi dei campioni presenti, non il centro geometrico della
 * finestra: sull'ultima finestra, quasi sempre parziale, il centro cadrebbe dopo la
 * fine della sessione.
 *
 * @param {{sec:number, bpm:number}[]} points campioni in ordine di tempo
 * @returns {{idx:number, sec:number, bpm:number, min:number, max:number}[]}
 */
export function binHr(points, windowSec) {
  const bins = new Map()
  for (const p of points) {
    const idx = Math.floor(p.sec / windowSec)
    const b = bins.get(idx)
    if (b) {
      b.sum += p.bpm
      b.tSum += p.sec
      b.n += 1
      if (p.bpm < b.min) b.min = p.bpm
      if (p.bpm > b.max) b.max = p.bpm
    } else {
      bins.set(idx, { idx, sum: p.bpm, tSum: p.sec, n: 1, min: p.bpm, max: p.bpm })
    }
  }
  return [...bins.values()]
    .sort((a, b) => a.idx - b.idx)
    .map((b) => ({
      idx: b.idx,
      sec: b.tSum / b.n,
      bpm: Math.round(b.sum / b.n),
      min: b.min,
      max: b.max,
    }))
}

/**
 * Spezza la serie aggregata dove il campionamento si e' interrotto per piu' di 60s,
 * cosi' la linea non attraversa i buchi con un segmento inventato. Il confronto e'
 * sugli indici di finestra e non sui tempi: due finestre adiacenti distano sempre
 * `windowSec` anche quando i campioni dentro sono sbilanciati.
 */
export function splitHrRuns(series, windowSec) {
  const runs = []
  let run = []
  for (const b of series) {
    const prev = run[run.length - 1]
    if (prev && (b.idx - prev.idx) * windowSec > 60) {
      runs.push(run)
      run = []
    }
    run.push(b)
  }
  if (run.length) runs.push(run)
  return runs
}

/* ---------------- zone cardiache ---------------- */

/**
 * Modello a tre zone piu' il fuori-zona: e' quello di Fitbit/Google, non uno dei tanti
 * schemi a cinque zone del mondo della corsa. La scelta non e' estetica — cosi' le
 * soglie che l'app calcola da sola e quelle che arrivano da `daily-heart-rate-zones`
 * hanno la stessa forma e restano confrontabili.
 *
 * Percentuali della frequenza massima, da documentazione Fitbit:
 * brucia grassi 50-69%, cardio 70-84%, picco 85-100%.
 */
export const ZONE_DEFS = [
  { id: 'sotto', label: 'Sotto zona', color: '#d9d9e3' },
  { id: 'brucia', label: 'Brucia grassi', color: '#ffd23f', google: 'FAT_BURN' },
  { id: 'cardio', label: 'Cardio', color: '#ff6b35', google: 'CARDIO' },
  { id: 'picco', label: 'Picco', color: '#e63946', google: 'PEAK' },
]

/**
 * Soglie in bpm.
 *
 * @param {{ageYears:number}|null} profile
 * @param {{heartRateZone:string, minBeatsPerMinute:number, maxBeatsPerMinute:number}[]|null} googleZones
 * @returns {{zones: {id,label,color,min,max}[], source:'google'|'eta', maxHr:number|null}|null}
 */
export function zoneThresholds(profile, googleZones) {
  // Le soglie di Google sono personalizzate con Karvonen su eta' E battito a riposo:
  // valgono piu' di qualunque formula, quindi vincono quando ci sono.
  if (googleZones?.length) {
    const byType = new Map(googleZones.map((z) => [z.heartRateZone, z]))
    const brucia = byType.get('FAT_BURN')
    if (brucia) {
      const zones = [
        { ...ZONE_DEFS[0], min: 0, max: brucia.minBeatsPerMinute - 1 },
        ...ZONE_DEFS.slice(1).map((d) => {
          const g = byType.get(d.google)
          return g ? { ...d, min: g.minBeatsPerMinute, max: g.maxBeatsPerMinute } : null
        }).filter(Boolean),
      ]
      return { zones, source: 'google', maxHr: zones[zones.length - 1].max }
    }
  }

  // Ripiego: 220 meno l'eta'. E' la stima piu' nota e la piu' criticata (errore tipico
  // di ±10-12 bpm), ma senza il battito a riposo non c'e' di meglio, e va dichiarata.
  if (!profile?.ageYears) return null
  const maxHr = 220 - profile.ageYears
  const pct = (p) => Math.round((p / 100) * maxHr)
  return {
    source: 'eta',
    maxHr,
    zones: [
      { ...ZONE_DEFS[0], min: 0, max: pct(50) - 1 },
      { ...ZONE_DEFS[1], min: pct(50), max: pct(70) - 1 },
      { ...ZONE_DEFS[2], min: pct(70), max: pct(85) - 1 },
      { ...ZONE_DEFS[3], min: pct(85), max: maxHr },
    ],
  }
}

const zoneOf = (zones, bpm) => zones.find((z) => bpm >= z.min && bpm <= z.max) || zones[zones.length - 1]

/**
 * Tempo passato in ogni zona, con la ripartizione per esercizio.
 *
 * Il conteggio si fa sui NOSTRI campioni e non su `time-in-heart-rate-zone` di Google:
 * quello e' un totale d'intervallo e non e' scomponibile per esercizio, che e' proprio
 * la cosa che si vuole vedere. Da Google si prendono solo le soglie.
 *
 * Ogni campione vale l'intervallo che lo separa dal successivo, con un tetto di 30s
 * per non attribuire a una zona i buchi di campionamento (schermo spento, orologio
 * tolto): meglio perdere qualche secondo che inventarne minuti.
 *
 * @returns {{perZone: {...zona, sec:number, pct:number, byExercise:{key,name,color,sec}[]}[], totalSec:number}|null}
 */
export function timeInZones(session, zones) {
  const t = session?.hrT || []
  const bpm = session?.hrBpm || []
  if (!zones?.length || t.length < 2) return null

  const segments = buildSegments(session)
  const acc = new Map(zones.map((z) => [z.id, { ...z, sec: 0, byExercise: new Map() }]))

  for (let i = 0; i < t.length; i++) {
    const v = bpm[i]
    if (v == null) continue
    const dt = Math.min(30, i + 1 < t.length ? t[i + 1] - t[i] : 5)
    if (!(dt > 0)) continue

    const bucket = acc.get(zoneOf(zones, v).id)
    bucket.sec += dt

    const seg = segments.find((s) => t[i] >= s.startSec && t[i] <= s.endSec)
    const k = seg ? seg.key : '__pausa'
    const prev = bucket.byExercise.get(k) || {
      key: k,
      name: seg ? seg.name : 'recupero / pausa',
      color: seg ? seg.color : '#f2f2f5',
      sec: 0,
    }
    prev.sec += dt
    bucket.byExercise.set(k, prev)
  }

  const totalSec = [...acc.values()].reduce((n, z) => n + z.sec, 0)
  if (!totalSec) return null

  return {
    totalSec,
    perZone: [...acc.values()].map((z) => ({
      ...z,
      pct: (z.sec / totalSec) * 100,
      byExercise: [...z.byExercise.values()].sort((a, b) => b.sec - a.sec),
    })),
  }
}

/**
 * Lo stesso conteggio girato al contrario: per ogni esercizio, quanto tempo in quale
 * zona. Serve alle statistiche per esercizio, dove la domanda non e' "quanto sono stata
 * in cardio" ma "quanto mi fa salire il battito la cyclette".
 *
 * @returns {Map<string, {key, name, color, totalSec, perZone: {...zona, sec, pct}[]}>}
 */
export function zonesByExercise(session, zones) {
  const data = timeInZones(session, zones)
  if (!data) return new Map()

  const out = new Map()
  for (const z of data.perZone) {
    for (const e of z.byExercise) {
      if (e.key === '__pausa') continue // il recupero non e' un esercizio
      const cur = out.get(e.key) || { key: e.key, name: e.name, color: e.color, totalSec: 0, perZone: [] }
      cur.totalSec += e.sec
      cur.perZone.push({ id: z.id, label: z.label, color: z.color, min: z.min, max: z.max, sec: e.sec })
      out.set(e.key, cur)
    }
  }
  for (const ex of out.values()) {
    ex.perZone = zones
      .map((z) => {
        const found = ex.perZone.find((p) => p.id === z.id)
        return { ...z, sec: found ? found.sec : 0, pct: found ? (found.sec / ex.totalSec) * 100 : 0 }
      })
  }
  return out
}
