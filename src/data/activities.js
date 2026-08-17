import { getTrackedActivityTypes } from './goals'

/**
 * L'unione fra gli allenamenti registrati dall'app e le attivita' che Google riconosce
 * da solo e che l'utente ha scelto di far contare.
 *
 * Esiste perche' la domanda "quante volte ti sei allenata questa settimana" ha una
 * risposta sola, e prima ne aveva due: una in palestra e una in piscina, che non si
 * parlavano. Chi conta (obiettivi, medaglie, record) riceve da qui un elenco unico e
 * non deve sapere da dove viene ogni riga.
 */

const GIORNO = 24 * 3600 * 1000

/** Giorni di storico Google che teniamo. Vedi getHealthSummary: la finestra e' la' */
export const FINESTRA_GIORNI = 90

/**
 * Da quando i conteggi misti hanno davvero entrambe le fonti.
 *
 * Prima di questo istante l'app sa tutto e Google non sa niente: sommare le due cose
 * darebbe settimane vecchie sistematicamente piu' magre di quelle recenti, e il
 * confronto — che e' tutto il senso di una medaglia — sarebbe truccato.
 */
export function inizioFinestra(detectedRaw, now = Date.now()) {
  const perDefault = now - FINESTRA_GIORNI * GIORNO
  if (!detectedRaw) return perDefault
  // Storico di Google piu' corto della finestra chiesta: vale quello che c'e' davvero
  if (!detectedRaw.completa && detectedRaw.since) return Math.max(perDefault, detectedRaw.since)
  return perDefault
}

/** Sovrapposizione in millisecondi fra due intervalli, 0 se disgiunti */
const sovrapposizione = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))

/**
 * Un'attivita' di Google e' lo stesso allenamento che l'app ha gia' registrato?
 *
 * Non e' un caso di scuola: l'app del watch registra con Health Services, e quella
 * sessione ricompare dentro Google Health come "esercizio". Senza questo filtro, chi
 * spunta "Pesi" vedrebbe ogni allenamento in palestra contare due volte sull'obiettivo,
 * con le sue kcal sommate a se stesse.
 *
 * La soglia e' meta' dell'attivita' rilevata, non un istante qualsiasi in comune: una
 * camminata cominciata mentre l'allenamento finiva condivide qualche secondo con esso,
 * e non e' lo stesso allenamento.
 */
export function isDoppione(w, sessions) {
  const fine = w.endMs || w.startMs
  const durata = fine - w.startMs
  return (sessions || []).some((s) => {
    if (!s.startedAt) return false
    const sFine = s.endedAt || s.startedAt
    // Senza orario di fine (Google ogni tanto non lo da') non c'e' una durata da
    // confrontare: vale l'unica cosa osservabile, cioe' se comincia dentro
    // l'allenamento. Con la regola della meta' non risultava mai un doppione, perche'
    // meta' di zero e' zero e la disuguaglianza cadeva sempre dalla parte sbagliata.
    if (durata <= 0) return w.startMs >= s.startedAt && w.startMs <= sFine
    return sovrapposizione(w.startMs, fine, s.startedAt, sFine) >= durata / 2
  })
}

/**
 * Le attivita' di Google che valgono come allenamento, nella forma delle sessioni.
 *
 * `id` e `startedAt` portano gli stessi nomi che hanno nelle sessioni dell'app apposta:
 * weekSessions, weeklyMedals e le altre continuano a funzionare senza sapere che
 * esistono due sorgenti. `id` e' `d-<startMs>` perche' e' gia' la chiave con cui le kcal
 * di quelle attivita' stanno nella mappa risolta.
 */
export function trackedActivities(detectedWorkouts, sessions, tracked) {
  const set = new Set(tracked ?? getTrackedActivityTypes())
  if (!set.size) return []
  return (detectedWorkouts || [])
    .filter((w) => set.has(w.type) && !isDoppione(w, sessions))
    .map((w) => ({
      id: `d-${w.startMs}`,
      startedAt: w.startMs,
      endedAt: w.endMs,
      source: 'google',
      type: w.type,
    }))
}

/**
 * Tutto quello che conta come allenamento, dalla piu' recente.
 *
 * Le sessioni dell'app NON si tagliano alla finestra: il loro storico e' completo e
 * troncarlo perderebbe dei record veri. A tagliare e' chi confronta periodi fra loro
 * (le medaglie), non chi somma la settimana in corso — e lo fa con `dentroFinestra`.
 */
export function allActivities(sessions, detectedWorkouts, tracked) {
  return [
    ...(sessions || []).map((s) => ({ ...s, source: 'app' })),
    ...trackedActivities(detectedWorkouts, sessions, tracked),
  ].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
}

/** Solo quello che cade nella finestra con entrambe le fonti */
export const dentroFinestra = (activities, da) =>
  (activities || []).filter((a) => a.startedAt >= da)

/** I giorni (ISO locale) con almeno un'attivita', per le strisce del calendario */
export function activityDaysISO(activities) {
  const out = new Set()
  for (const a of activities || []) {
    if (!a.startedAt) continue
    const d = new Date(a.startedAt)
    out.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return [...out]
}
