/**
 * kcal di un allenamento, con due fonti in ordine di fiducia:
 *
 *  1. Google Health — energia attiva misurata dall'orologio sull'intervallo esatto
 *     della sessione. E' un dato, non un modello.
 *  2. Stima da battito (Keytel) — quando Google non e' collegato, o non ha dati per
 *     quell'ora. Serve un profilo minimo (eta', peso, sesso biologico).
 *
 * La fonte viene sempre restituita insieme al numero e mostrata in interfaccia:
 * una stima al ±15-20% presentata come misura sarebbe una bugia.
 */

const LS = { profile: 'gym.profile', kcal: 'gym.kcal.', weightLog: 'gym.weightLog' }

/* ---------- profilo (locale al dispositivo, come l'obiettivo passi) ---------- */

/** @returns {{ageYears:number, weightKg:number, sex:'f'|'m'}|null} null se incompleto */
export function getProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(LS.profile) || 'null')
    if (!p || !p.ageYears || !p.weightKg || !p.sex) return null
    return p
  } catch {
    return null
  }
}

export function setProfile(p) {
  localStorage.setItem(LS.profile, JSON.stringify(p))
  if (p?.weightKg) recordWeight(p.weightKg)
  clearKcalCache() // il profilo cambia => le stime gia' calcolate non valgono piu'
}

/* ---------- storico del peso ---------- */

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** @returns {{date:string, kg:number}[]} in ordine cronologico */
export function getWeightLog() {
  try {
    const log = JSON.parse(localStorage.getItem(LS.weightLog) || '[]')
    return Array.isArray(log) ? log.sort((a, b) => a.date.localeCompare(b.date)) : []
  } catch {
    return []
  }
}

/**
 * Una voce al giorno: toccare il +/- dello stepper cinque volte di fila non deve
 * lasciare cinque punti sul grafico, ma un unico peso per quella data.
 */
export function recordWeight(kg) {
  const log = getWeightLog().filter((e) => e.date !== today())
  log.push({ date: today(), kg })
  // Un anno di misure basta e avanza per un grafico di andamento
  localStorage.setItem(LS.weightLog, JSON.stringify(log.slice(-365)))
}

/** Valori grezzi per i campi del form, anche quando il profilo non e' ancora completo */
export function getProfileDraft() {
  try {
    return JSON.parse(localStorage.getItem(LS.profile) || 'null') || { ageYears: 30, weightKg: 65, sex: 'f' }
  } catch {
    return { ageYears: 30, weightKg: 65, sex: 'f' }
  }
}

/* ---------- stima da battito ---------- */

/**
 * Formula di Keytel et al. (2005), validata su 115 soggetti contro calorimetria
 * indiretta. Restituisce kJ al minuto, qui convertiti in kcal (1 kcal = 4,184 kJ).
 *
 * E' il modello standard per stimare il dispendio da frequenza cardiaca, ma resta
 * una stima: l'errore tipico e' del 15-20% e cresce sotto i ~90 bpm, dove la
 * relazione battito-consumo non e' piu' lineare.
 */
export function estimateKcal({ avgHr, durationSec, profile }) {
  if (!profile || !avgHr || !(durationSec > 0)) return null
  const { ageYears: a, weightKg: w, sex } = profile
  const kjPerMin =
    sex === 'm'
      ? -55.0969 + 0.6309 * avgHr + 0.1988 * w + 0.2017 * a
      : -20.4022 + 0.4472 * avgHr - 0.1263 * w + 0.074 * a
  const kcal = (kjPerMin / 4.184) * (durationSec / 60)
  // Battiti bassi mandano la formula sotto zero: meglio niente numero che un numero assurdo
  return kcal > 0 ? Math.round(kcal) : null
}

/* ---------- cache ---------- */

// Le kcal di una sessione conclusa non cambiano piu': si tiene il valore di Google
// per non richiamare l'API a ogni apertura del dettaglio. Le stime NON si salvano,
// cosi' seguono subito le correzioni al profilo.
const readCache = (id) => {
  const v = Number(localStorage.getItem(LS.kcal + id))
  return Number.isFinite(v) && v > 0 ? v : null
}
const writeCache = (id, kcal) => localStorage.setItem(LS.kcal + id, String(kcal))

export function clearKcalCache() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(LS.kcal)) localStorage.removeItem(k)
  }
}

/* ---------- orchestrazione ---------- */

/**
 * @returns {Promise<{kcal:number, source:'google'|'stima'}|null>}
 *   null quando non si puo' dire niente di sensato (niente Google e niente profilo,
 *   oppure sessione senza battito registrato).
 */
export async function sessionKcal(session, { isConnected, fetchActiveEnergy }) {
  if (!session?.startedAt || !session?.endedAt) return null

  const cached = readCache(session.id)
  if (cached) return { kcal: cached, source: 'google' }

  if (isConnected) {
    try {
      const kcal = await fetchActiveEnergy(session.startedAt, session.endedAt)
      if (kcal != null && kcal > 0) {
        writeCache(session.id, kcal)
        return { kcal, source: 'google' }
      }
    } catch {
      // token scaduto o API in errore: si scende alla stima invece di non mostrare nulla
    }
  }

  // Durata attiva, non da orologio da muro: il tempo in pausa e' gia' escluso da
  // "Durata" nel riepilogo, e sommarlo qui gonfierebbe le kcal di una sessione
  // interrotta a lungo.
  const activeSec = Math.round((session.endedAt - session.startedAt - (session.pausedMs || 0)) / 1000)
  const kcal = estimateKcal({ avgHr: session.hrAvg, durationSec: activeSec, profile: getProfile() })
  return kcal ? { kcal, source: 'stima' } : null
}

/**
 * Come sopra ma per una lista (lo storico), con al massimo 3 richieste in volo.
 *
 * Senza freno una pagina con venti allenamenti sparerebbe venti rollUp insieme al
 * primo caricamento, con ottime probabilita' di prendersi un rate limit e mostrare
 * meta' righe vuote. I valori di Google finiscono in cache, quindi il conto si paga
 * una volta sola: dalla seconda visita la lista si riempie all'istante.
 *
 * @param {{id:string, startedAt:number, endedAt:number, hrAvg?:number, pausedMs?:number}[]} items
 * @returns {Promise<Map<string, {kcal:number, source:'google'|'stima'}>>}
 */
export async function resolveKcalMany(items, deps, concurrency = 3) {
  const out = new Map()
  const queue = [...items]

  const worker = async () => {
    for (let it = queue.shift(); it; it = queue.shift()) {
      const r = await sessionKcal(it, deps).catch(() => null)
      if (r) out.set(it.id, r)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
  return out
}
