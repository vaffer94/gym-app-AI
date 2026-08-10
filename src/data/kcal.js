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

// Prefisso della cache kcal con un numero di versione: i valori salvati fino al
// 09/08/2026 venivano dalla query a finestra unica, che sottostimava. Cambiando
// prefisso si invalidano da soli, senza chiedere a nessuno di svuotare niente.
const LS = { profile: 'gym.profile', kcal: 'gym.kcal3.', weightLog: 'gym.weightLog' }

/* ---------- profilo (locale al dispositivo, come l'obiettivo passi) ---------- */

/** @returns {{ageYears:number, weightKg:number, heightCm:number, sex:'f'|'m'}|null} null se incompleto */
export function getProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(LS.profile) || 'null')
    if (!p || !p.ageYears || !p.weightKg || !p.sex) return null
    return p
  } catch {
    return null
  }
}

/**
 * Metabolismo basale con l'equazione di **Mifflin-St Jeor** (1990), che la letteratura
 * clinica indica come la piu' affidabile fra quelle predittive: prevede il valore entro
 * il 10% della calorimetria indiretta piu' spesso di ogni altra.
 *
 *   uomini:  BMR = 10·peso + 6,25·altezza − 5·eta' + 5
 *   donne:   BMR = 10·peso + 6,25·altezza − 5·eta' − 161      (kcal al giorno)
 *
 * Senza altezza l'equazione non si puo' applicare e si ripiega su 1 MET
 * (3,5 ml O2/kg/min ≈ 0,0175 kcal/min per kg). ATTENZIONE: 1 MET e' una convenzione
 * di fisiologia dell'esercizio tarata su un uomo di 70 kg e 40 anni, NON un'equazione
 * di metabolismo basale, e su una donna di corporatura media sovrastima di circa il
 * 15%. Serve solo a non restare senza numero, e viene dichiarato come ripiego.
 *
 * @returns {{kcalPerMin:number, fonte:'mifflin'|'met'}|null}
 */
export function basalRate(profile) {
  if (!profile?.weightKg || !profile?.ageYears) return null
  const { weightKg: w, heightCm: h, ageYears: a, sex } = profile
  if (h) {
    const perDay = 10 * w + 6.25 * h - 5 * a + (sex === 'm' ? 5 : -161)
    return perDay > 0 ? { kcalPerMin: perDay / 1440, fonte: 'mifflin' } : null
  }
  return { kcalPerMin: 0.0175 * w, fonte: 'met' }
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
  const vuoto = { ageYears: 30, weightKg: 65, heightCm: 165, sex: 'f' }
  try {
    return { ...vuoto, ...(JSON.parse(localStorage.getItem(LS.profile) || 'null') || {}) }
  } catch {
    return vuoto
  }
}

/* ---------- stima da battito ---------- */

/**
 * Formula di Keytel et al. (2005), validata su 115 soggetti contro calorimetria
 * indiretta. Restituisce kJ al minuto, qui convertiti in kcal (1 kcal = 4,184 kJ).
 *
 * ATTENZIONE, ED E' IL PUNTO DELICATO: Keytel predice il dispendio **totale** durante
 * l'esercizio, metabolismo basale compreso. Google Health, con `active-energy-burned`,
 * restituisce invece la sola quota **attiva**. Mostrarli nella stessa riga "Energia"
 * senza allinearli significherebbe far cambiare significato al numero a seconda di chi
 * ha risposto — quindi qui il basale si sottrae.
 *
 * Il basale a riposo vale 1 MET = 3,5 ml O2/kg/min ≈ 0,0175 kcal al minuto per kg:
 * dipende dal solo peso, cosi' non serve chiedere anche l'altezza per una Mifflin-St Jeor.
 *
 * Resta comunque una stima, e per giunta prudente: la letteratura documenta che Keytel
 * tende a sovrastimare. Per questo il numero e' sempre etichettato come tale.
 */
export function estimateKcal({ avgHr, durationSec, profile }) {
  if (!profile || !avgHr || !(durationSec > 0)) return null
  const { ageYears: a, weightKg: w, sex } = profile
  const min = durationSec / 60
  const kjPerMin =
    sex === 'm'
      ? -55.0969 + 0.6309 * avgHr + 0.1988 * w + 0.2017 * a
      : -20.4022 + 0.4472 * avgHr - 0.1263 * w + 0.074 * a
  // Keytel predice il dispendio TOTALE durante l'esercizio, quota basale compresa.
  // Per ricavare la sola parte attiva si sottrae il basale con Mifflin-St Jeor.
  const totale = (kjPerMin / 4.184) * min
  const basale = (basalRate(profile)?.kcalPerMin ?? 0) * min
  // Battiti bassi mandano la formula sotto zero: meglio niente numero che un numero assurdo
  if (!(totale > 0)) return null
  return { total: Math.round(totale), active: Math.max(0, Math.round(totale - basale)) }
}

/** Solo il totale, che e' la grandezza mostrata in interfaccia */
export const estimateTotal = (args) => estimateKcal(args)?.total ?? null

/* ---------- cache ---------- */

// Le kcal di una sessione conclusa non cambiano piu': si tiene il valore di Google
// per non richiamare l'API a ogni apertura del dettaglio. Le stime NON si salvano,
// cosi' seguono subito le correzioni al profilo.
const readCache = (id) => {
  try {
    const v = JSON.parse(localStorage.getItem(LS.kcal + id) || 'null')
    return v && v.kcal > 0 ? v : null
  } catch {
    return null
  }
}
const writeCache = (id, valore) => localStorage.setItem(LS.kcal + id, JSON.stringify(valore))

export function clearKcalCache() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(LS.kcal)) localStorage.removeItem(k)
  }
}

// Ripulitura dei prefissi precedenti: cambiare versione bastava a non leggerli piu',
// ma senza questo resterebbero sul dispositivo per sempre.
try {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('gym.kcal.') || k.startsWith('gym.kcal2.')) localStorage.removeItem(k)
  }
} catch { /* localStorage non disponibile */ }

/* ---------- orchestrazione ---------- */

/**
 * `kcal` e' il TOTALE (attive + metabolismo basale): e' il criterio con cui l'app
 * Fitbit mostra le calorie di un allenamento, quindi e' il numero che l'utente si
 * aspetta di leggere. `active` resta disponibile come dettaglio secondario — la sola
 * energia in piu' spesa allenandosi.
 *
 * Fino al 09/08/2026 si mostravano le attive: su una sessione da 30 minuti facevano
 * 89 kcal contro le 145 totali, e sembravano sistematicamente troppo basse rispetto
 * a qualunque altra app.
 *
 * @returns {Promise<{kcal:number, active:number|null, source:'google'|'stima'}|null>}
 *   null quando non si puo' dire niente di sensato (niente Google e niente profilo,
 *   oppure sessione senza battito registrato).
 */
export async function sessionKcal(session, { isConnected, fetchEnergy }) {
  if (!session?.startedAt || !session?.endedAt) return null

  const cached = readCache(session.id)
  if (cached) return { ...cached, source: 'google' }

  if (isConnected) {
    try {
      const { total, active } = await fetchEnergy(session.startedAt, session.endedAt)
      // Se Google ha solo le attive si usano quelle: meglio la grandezza sbagliata
      // ma misurata che nessun numero
      const kcal = total ?? active
      if (kcal != null && kcal > 0) {
        const valore = { kcal, active: active ?? null }
        writeCache(session.id, valore)
        return { ...valore, source: 'google' }
      }
    } catch {
      // token scaduto o API in errore: si scende alla stima invece di non mostrare nulla
    }
  }

  // Durata attiva, non da orologio da muro: il tempo in pausa e' gia' escluso da
  // "Durata" nel riepilogo, e sommarlo qui gonfierebbe le kcal di una sessione
  // interrotta a lungo.
  const activeSec = Math.round((session.endedAt - session.startedAt - (session.pausedMs || 0)) / 1000)
  const stima = estimateKcal({ avgHr: session.hrAvg, durationSec: activeSec, profile: getProfile() })
  return stima ? { kcal: stima.total, active: stima.active, source: 'stima' } : null
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
