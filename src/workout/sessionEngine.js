/**
 * Motore della sessione di allenamento (logica pura, senza UI).
 *
 * Regole di ordinamento (dal documento dei flussi):
 * - esercizi raggruppati per categoria; ordine categorie = prima apparizione nella scheda
 * - Posticipa 1ª volta -> in coda alla propria categoria
 * - Posticipa 2ª volta -> in fondo all'allenamento
 * - Posticipa 3ª volta -> saltato per questa sessione
 */

const now = () => Date.now()

/** Ordine iniziale: raggruppa per categoria mantenendo l'ordine della scheda */
export function buildOrder(exercises) {
  const catOrder = []
  for (const e of exercises) if (!catOrder.includes(e.category)) catOrder.push(e.category)
  const order = []
  for (const cat of catOrder) {
    for (const e of exercises) if (e.category === cat) order.push(e.key)
  }
  return order
}

/** Crea la sessione (snapshot della scheda + stato runtime) */
export function createSession(plan, restDefaultSec) {
  const exercises = plan.exercises.map((e) => ({
    key: e.key,
    refType: e.refType,
    refId: e.refId,
    name: e.name,
    category: e.category,
    image: e.image || null,
    description: e.description || '',
    mode: e.mode || 'reps',
    durationSec: e.durationSec ?? null,
    sets: e.sets,
    reps: e.reps ?? null,
    hasWeight: e.hasWeight,
    weightKg: e.weightKg ?? null,
    postponeCount: 0,
    skipped: false,
    startedAt: null,
    endedAt: null,
    note: '',
    series: Array.from({ length: e.sets }, () => ({
      done: false,
      startedAt: null,
      doneAt: null,
      actualReps: e.reps ?? null,
      actualWeightKg: e.hasWeight ? e.weightKg : null,
      restSec: null,
    })),
  }))
  return {
    id: `s-${now()}-${Math.random().toString(36).slice(2, 7)}`,
    planId: plan.id,
    planName: plan.name,
    planColor: plan.color || null,
    origine: 'web',
    restDefaultSec,
    startedAt: now(),
    endedAt: null,
    status: 'active', // active | completed | aborted
    pausedMs: 0,
    pauseStartedAt: null,
    exercises,
    queue: buildOrder(plan.exercises), // chiavi degli esercizi ancora da fare
  }
}

export const getExercise = (s, key) => s.exercises.find((e) => e.key === key)
export const currentExercise = (s) => (s.queue.length ? getExercise(s, s.queue[0]) : null)

/** Avvia una serie (stato "in corso") */
export function startSerie(session, key, serieIdx) {
  const s = structuredClone(session)
  const ex = getExercise(s, key)
  if (!ex.startedAt) ex.startedAt = now()
  ex.series[serieIdx].startedAt = now()
  return s
}

/** Indice della prossima serie non fatta, o -1 */
export function nextUndoneSerie(exercise) {
  return exercise.series.findIndex((x) => !x.done)
}

/** Serie fatta: registra effettivi e timestamp. Ritorna la sessione aggiornata. */
export function markSerieDone(session, key, serieIdx, actuals = {}) {
  const s = structuredClone(session)
  const ex = getExercise(s, key)
  if (!ex.startedAt) ex.startedAt = now()
  const serie = ex.series[serieIdx]
  serie.done = true
  serie.doneAt = now()
  if (actuals.actualReps != null) serie.actualReps = actuals.actualReps
  if (actuals.actualWeightKg !== undefined) serie.actualWeightKg = actuals.actualWeightKg
  if (ex.series.every((x) => x.done)) {
    ex.endedAt = now()
    s.queue = s.queue.filter((k) => k !== key)
  }
  return s
}

/** Correzione a posteriori di reps/peso di una serie */
export function updateSerieActuals(session, key, serieIdx, actuals) {
  const s = structuredClone(session)
  const serie = getExercise(s, key).series[serieIdx]
  if (actuals.actualReps != null) serie.actualReps = actuals.actualReps
  if (actuals.actualWeightKg !== undefined) serie.actualWeightKg = actuals.actualWeightKg
  return s
}

/** Registra la durata effettiva del recupero dopo una serie */
export function recordRest(session, key, serieIdx, restSec) {
  const s = structuredClone(session)
  const ex = getExercise(s, key)
  if (ex && ex.series[serieIdx]) ex.series[serieIdx].restSec = restSec
  return s
}

/** Posticipa l'esercizio corrente secondo le regole */
export function postponeCurrent(session) {
  const s = structuredClone(session)
  const key = s.queue[0]
  const ex = getExercise(s, key)
  ex.postponeCount += 1
  s.queue = s.queue.slice(1)

  if (ex.postponeCount === 1) {
    // in coda alla propria categoria
    let insertAt = s.queue.length
    for (let i = s.queue.length - 1; i >= 0; i--) {
      if (getExercise(s, s.queue[i]).category === ex.category) { insertAt = i + 1; break }
    }
    s.queue.splice(insertAt, 0, key)
  } else if (ex.postponeCount === 2) {
    s.queue.push(key)
  } else {
    ex.skipped = true // terza volta: saltato per questa sessione
  }
  return s
}

/** Salta definitivamente l'esercizio corrente */
export function skipCurrent(session) {
  const s = structuredClone(session)
  const ex = getExercise(s, s.queue[0])
  ex.skipped = true
  s.queue = s.queue.slice(1)
  return s
}

/** Sposta un esercizio scelto manualmente in testa alla coda */
export function jumpTo(session, key) {
  const s = structuredClone(session)
  if (!s.queue.includes(key)) return s
  s.queue = [key, ...s.queue.filter((k) => k !== key)]
  return s
}

export function setNote(session, key, note) {
  const s = structuredClone(session)
  getExercise(s, key).note = note
  return s
}

export function togglePause(session) {
  const s = structuredClone(session)
  if (s.pauseStartedAt) {
    s.pausedMs += now() - s.pauseStartedAt
    s.pauseStartedAt = null
  } else {
    s.pauseStartedAt = now()
  }
  return s
}

export function finishSession(session) {
  const s = structuredClone(session)
  if (s.pauseStartedAt) {
    s.pausedMs += now() - s.pauseStartedAt
    s.pauseStartedAt = null
  }
  s.endedAt = now()
  const allDone = s.exercises.every((e) => e.skipped || e.series.every((x) => x.done))
  const anyDone = s.exercises.some((e) => e.series.some((x) => x.done))
  s.status = allDone || anyDone ? 'completed' : 'aborted'
  s.completedFully = allDone
  return s
}

/** Durata attiva in ms (esclude le pause) */
export function activeDuration(s, at = now()) {
  const end = s.endedAt || at
  let paused = s.pausedMs
  if (s.pauseStartedAt) paused += end - s.pauseStartedAt
  return Math.max(0, end - s.startedAt - paused)
}

/** Statistiche di riepilogo */
export function computeStats(s) {
  const totalSeries = s.exercises.reduce((n, e) => n + e.sets, 0)
  const doneSeries = s.exercises.reduce((n, e) => n + e.series.filter((x) => x.done).length, 0)
  const doneExercises = s.exercises.filter((e) => e.series.every((x) => x.done)).length
  const skipped = s.exercises.filter((e) => e.skipped).length

  const perExercise = s.exercises.map((e) => ({
    key: e.key,
    name: e.name,
    category: e.category,
    done: e.series.filter((x) => x.done).length,
    sets: e.sets,
    skipped: e.skipped,
    durationSec: e.startedAt && e.endedAt ? Math.round((e.endedAt - e.startedAt) / 1000) : null,
    avgRestSec: (() => {
      const rests = e.series.map((x) => x.restSec).filter((r) => r != null)
      return rests.length ? Math.round(rests.reduce((a, b) => a + b, 0) / rests.length) : null
    })(),
    note: e.note,
  }))

  const byCategory = {}
  for (const e of s.exercises) {
    const d = e.series.filter((x) => x.done).length
    if (d > 0) byCategory[e.category] = (byCategory[e.category] || 0) + d
  }

  const volumeKg = s.exercises.reduce(
    (v, e) =>
      v +
      e.series
        .filter((x) => x.done && x.actualWeightKg != null)
        .reduce((a, x) => a + x.actualReps * x.actualWeightKg, 0),
    0
  )

  const allRests = s.exercises.flatMap((e) => e.series.map((x) => x.restSec).filter((r) => r != null))
  const avgRestSec = allRests.length ? Math.round(allRests.reduce((a, b) => a + b, 0) / allRests.length) : null

  return {
    durationSec: Math.round(activeDuration(s) / 1000),
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    totalSeries,
    doneSeries,
    doneExercises,
    totalExercises: s.exercises.length,
    skipped,
    perExercise,
    byCategory,
    volumeKg: Math.round(volumeKg),
    avgRestSec,
    restTargetSec: s.restDefaultSec,
    notes: s.exercises.filter((e) => e.note).map((e) => ({ name: e.name, note: e.note })),
  }
}
