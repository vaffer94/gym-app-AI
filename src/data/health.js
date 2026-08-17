/**
 * Integrazione Google Health API (sostituisce la Fitbit Web API, deprecata a sett. 2026).
 * - OAuth 2.0 standard Google via Google Identity Services (token client, solo browser)
 * - Endpoint: https://health.googleapis.com/v4
 * Richiede VITE_GOOGLE_HEALTH_CLIENT_ID in .env.local (Google Cloud, vedi README).
 */

// L'obiettivo passi e' un obiettivo dell'utente, non un dettaglio dell'integrazione:
// vive in data/goals.js insieme agli altri. Qui serve solo perche' getHealthSummary
// lo allega al riepilogo.
import { getStepsGoal } from './goals'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_HEALTH_CLIENT_ID
export const isHealthConfigured = Boolean(CLIENT_ID)

const SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly'
/**
 * Scope aggiuntivo, chiesto solo su richiesta esplicita: serve unicamente per
 * `daily-heart-rate-zones`, cioe' le soglie di zona personalizzate. Tenerlo separato
 * evita di allargare il consenso a tutti per una funzione che molti non useranno — e
 * soprattutto evita che un consenso piu' ampio, se rifiutato, faccia saltare anche
 * passi e allenamenti, che invece funzionano gia'.
 */
const SCOPE_METRICS = 'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly'
const LS = {
  token: 'gym.health.token',
  cache: 'gym.health.cache',
  // Segna che l'ultimo rinnovo automatico e' andato male: vedi ensureToken()
  fallito: 'gym.health.rinnovoFallito',
}

/* ---------- stato connessione ---------- */
function getToken() {
  try { return JSON.parse(localStorage.getItem(LS.token)) } catch { return null }
}
export const isHealthConnected = () => Boolean(getToken())

/**
 * Collegamento ancora presente ma da rifare a mano: il token e' scaduto e il rinnovo
 * automatico non e' riuscito. Serve all'interfaccia per mostrare "Ricollega" invece di
 * far ripartire da sola una finestra di Google a ogni apertura di pagina.
 */
export const healthNeedsReconnect = () =>
  Boolean(getToken()) && localStorage.getItem(LS.fallito) === '1'

export function disconnectHealth() {
  localStorage.removeItem(LS.token)
  localStorage.removeItem(LS.cache)
  localStorage.removeItem(LS.fallito)
}

/** Forza il refresh ignorando la cache dei 30 minuti */
export function clearHealthCache() {
  localStorage.removeItem(LS.cache)
}

/* ---------- Google Identity Services (caricato al bisogno) ---------- */
let gisPromise = null
function loadGis() {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Impossibile caricare Google Identity Services'))
    document.head.appendChild(s)
  })
  return gisPromise
}

function requestToken({ silent, scope = SCOPE, hint } = {}) {
  return new Promise((resolve, reject) => {
    loadGis()
      .then(() => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope,
          // QUALE ACCOUNT: senza questo, al rinnovo Google non ha modo di sapere di
          // quale dei conti collegati al browser si tratta, e allora lo chiede — anche
          // quando gli abbiamo detto di non chiedere, perche' `prompt: ''` e' una
          // preferenza ("non disturbare se puoi evitarlo"), non un ordine. Il risultato
          // era il selettore degli account a ogni apertura dello Storico.
          // Il suggerimento e' l'indirizzo con cui si e' entrati nell'app: se poi il
          // consenso a Google Health e' stato dato con un altro account, Google lo
          // ignora e chiede lo stesso — resta un suggerimento, non un vincolo.
          ...(hint ? { login_hint: hint } : {}),
          callback: (resp) => {
            if (resp.error) return reject(new Error(resp.error))
            const tok = {
              access_token: resp.access_token,
              expiresAt: Date.now() + (Number(resp.expires_in) - 60) * 1000,
              // Si segna cosa e' stato davvero concesso: Google puo' restituire meno di
              // quanto chiesto, e chiedere le zone con un token che non le copre
              // significherebbe solo prendersi un 403 a ogni apertura del dettaglio.
              scope: resp.scope || scope,
              // ...e a chi lo si era chiesto, per poterlo ridire al rinnovo, che
              // avviene dentro una chiamata API dove non c'e' piu' nessuno a saperlo
              hint: hint || null,
            }
            localStorage.setItem(LS.token, JSON.stringify(tok))
            localStorage.removeItem(LS.fallito)
            resolve(tok)
          },
          error_callback: (err) => reject(new Error(err?.message || 'Autorizzazione annullata')),
        })
        client.requestAccessToken({ prompt: silent ? '' : 'consent' })
      })
      .catch(reject)
  })
}

/** Avvia il collegamento (mostra il consenso Google) */
export const connectHealth = (email) => requestToken({ silent: false, hint: email })

/** Consenso allargato alle metriche di salute: sblocca le soglie di zona vere */
export const connectHealthZones = (email) =>
  requestToken({ silent: false, scope: `${SCOPE} ${SCOPE_METRICS}`, hint: email })

export const hasZonesScope = () => Boolean(getToken()?.scope?.includes(SCOPE_METRICS))

/**
 * UN SOLO TENTATIVO AUTOMATICO, POI SI FERMA.
 *
 * Il token dura un'ora e non esiste un refresh token: Google li da' solo a chi scambia
 * il codice da un server, e qui un server non c'e'. Quindi ogni ora il token va
 * richiesto da capo, e ogni richiesta — anche quella "silenziosa" — apre una finestra
 * di Google. Se il rinnovo riesce si richiude da sola; se non riesce resta li' a
 * chiedere con quale account stai accedendo.
 *
 * Prima non se lo ricordava nessuno, e la stessa richiesta fallita ripartiva a ogni
 * apertura dello Storico: non era il token che scadeva dieci volte, era lo stesso
 * fallimento ripetuto. Ora un rinnovo andato male si segna, e finche' non si preme
 * "Ricollega" nessuna finestra si apre da sola — anche perche' i browser bloccano le
 * finestre aperte senza che l'utente abbia toccato niente, quindi quei tentativi in
 * buona parte non arrivavano nemmeno in fondo.
 */
async function ensureToken() {
  const tok = getToken()
  if (tok && Date.now() < tok.expiresAt) return tok
  if (!tok) return null
  if (localStorage.getItem(LS.fallito) === '1') return null
  // token scaduto: tentativo silenzioso, conservando gli scope gia' concessi e
  // ricordando a Google quale account era
  try {
    return await requestToken({ silent: true, scope: tok.scope || SCOPE, hint: tok.hint })
  } catch {
    localStorage.setItem(LS.fallito, '1')
    return null
  }
}

/* ---------- chiamate API ---------- */
async function api(path, options = {}) {
  const tok = await ensureToken()
  if (!tok) throw new Error('collegamento con Google scaduto, va rifatto a mano')
  const res = await fetch(`https://health.googleapis.com/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Health API ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// CivilDateTime: { date: {year, month, day}, time?: {...} }
const civil = (d) => ({ date: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() } })

/**
 * Riassunto ultimi 28 giorni: passi per giorno + giorni con allenamenti rilevati.
 * Cache 30 minuti.
 */
export async function getHealthSummary() {
  try {
    const cached = JSON.parse(localStorage.getItem(LS.cache) || 'null')
    if (cached && cached.data?.detectedWorkouts && Date.now() - cached.at < 30 * 60 * 1000) {
      return { ...cached.data, stepsGoal: getStepsGoal() }
    }
  } catch { /* cache corrotta */ }

  const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1) // esclusivo: domani
  const start = new Date(end); start.setDate(start.getDate() - 28)

  // Passi: rollup giornaliero
  const stepsRes = await api('/users/me/dataTypes/steps/dataPoints:dailyRollUp', {
    method: 'POST',
    body: JSON.stringify({ range: { start: civil(start), end: civil(end) }, windowSizeDays: 1 }),
  })
  const readStepsValue = (p) => {
    const v = p.steps || p.stepsRollupValue || {}
    for (const k of ['countSum', 'count', 'sum', 'total', 'value']) {
      if (typeof v[k] === 'number') return v[k]
      if (typeof v[k] === 'string' && v[k] !== '') return Number(v[k])
    }
    return 0
  }

  const fromApi = {}
  for (const p of stepsRes.rollupDataPoints || []) {
    // il rollup usa civilStartTime; teniamo interval.start come fallback
    const s = p.civilStartTime?.date || p.interval?.start?.date
    if (!s) continue
    const key = `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`
    fromApi[key] = readStepsValue(p)
  }
  // tutti i 28 giorni in ordine cronologico, 0 dove l'API non ha (ancora) dati:
  // così oggi compare sempre nel grafico anche prima della sincronizzazione
  const stepsByDay = {}
  for (let i = 0; i < 28; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = localISO(d)
    stepsByDay[key] = fromApi[key] ?? 0
  }

  // Allenamenti rilevati: sessioni "exercise"
  let workoutDays = []
  let detectedWorkouts = []
  let detectedRaw = null
  try {
    // QUANTO INDIETRO ARRIVA GOOGLE, E PERCHE' SI PAGINA.
    //
    // La richiesta non ha nessun filtro di data. Con `pageSize=200` Google ha risposto
    // comunque 25 punti piu' un `nextPageToken`: il tetto della pagina non e' quello
    // che chiediamo noi, lo decide lui. Fermarsi alla prima pagina significava vedere
    // ~35 giorni e credere che fosse tutto lo storico.
    //
    // Serve profondita' perche' le attivita' scelte devono contare anche nei record:
    // se i dati di Google finissero prima di quelli dell'app, le settimane vecchie
    // risulterebbero magre non perche' ci si e' allenate meno, ma perche' meta' delle
    // fonti tace — ed e' esattamente il confronto falso che si vuole evitare.
    //
    // I due freni non sono arbitrari. Tre mesi sono esattamente il "Trimestre" del
    // selettore di periodo, cioe' il piu' lungo che una schermata guardi: piu' indietro
    // il dato non servirebbe a niente e renderebbe dispersivo l'elenco. Verificato sui
    // dati veri del 17/08/2026 che Google ne ha molti di piu' (almeno un anno, 300
    // attivita' fino al 25/08/2025), quindi il taglio e' una scelta, non un limite suo.
    // Il tetto di pagine e' il freno di sicurezza: senza, una sincronizzazione sarebbe
    // un'attesa muta di lunghezza ignota, ogni 30 minuti.
    const PAGE_SIZE = 200
    const MAX_PAGINE = 12
    const GIORNI_FINESTRA = 90
    const LIMITE_MS = Date.now() - GIORNI_FINESTRA * 24 * 3600 * 1000

    const tutte = []
    const viste = new Set() // guardia anti-ciclo, vedi sotto
    let pageToken = null
    let pagine = 0
    do {
      const q = new URLSearchParams({ pageSize: String(PAGE_SIZE) })
      if (pageToken) q.set('pageToken', pageToken)
      const exRes = await api(`/users/me/dataTypes/exercise/dataPoints?${q}`)

      let nuovi = 0
      for (const p of exRes.dataPoints || []) {
        const ex = p.exercise
        if (!ex?.interval?.startTime) continue
        const startMs = new Date(ex.interval.startTime).getTime()
        const chiave = `${ex.exerciseType || 'UNKNOWN'}|${startMs}`
        if (viste.has(chiave)) continue
        viste.add(chiave)
        nuovi += 1
        tutte.push({
          type: ex.exerciseType || 'UNKNOWN',
          startMs,
          endMs: ex.interval.endTime ? new Date(ex.interval.endTime).getTime() : null,
        })
      }
      pagine += 1
      pageToken = exRes.nextPageToken || null

      // Se il nome del parametro di paginazione fosse sbagliato, Google ignorerebbe il
      // token e ci ridarebbe la prima pagina all'infinito: dodici richieste per gli
      // stessi venticinque punti, con un conteggio che sembrerebbe pure aumentato.
      // Una pagina che non porta niente di nuovo e' l'unico sintomo osservabile.
      if (nuovi === 0) break
      // Le pagine arrivano dalla piu' recente, ma non lo diamo per garantito: il minimo
      // si ricalcola su tutto quello che si ha in mano
      if (tutte.some((w) => w.startMs < LIMITE_MS)) break
    } while (pageToken && pagine < MAX_PAGINE)

    tutte.sort((a, b) => b.startMs - a.startMs)

    // La finestra dei dati grezzi e' quella dichiarata, non i 28 giorni dei passi: i
    // conteggi misti (medaglie, record) hanno bisogno di sapere cosa e' successo prima
    // di quattro settimane fa, se no le settimane vecchie risulterebbero magre solo
    // perche' meta' delle fonti tace.
    detectedWorkouts = tutte.filter((w) => w.startMs >= LIMITE_MS)

    // Cosa teniamo davvero, non cosa e' passato dalla rete: `giorni` e' la finestra
    // entro cui i conteggi misti sono confrontabili, ed e' il numero da dichiarare in
    // interfaccia. `completa` dice se ci siamo fermati noi al limite dichiarato (caso
    // normale) o se e' finito lo storico di Google prima — nel secondo caso la finestra
    // vera e' piu' corta di quella chiesta.
    detectedRaw = {
      count: detectedWorkouts.length,
      since: detectedWorkouts.length ? detectedWorkouts[detectedWorkouts.length - 1].startMs : null,
      giorni: GIORNI_FINESTRA,
      pagine,
      completa: Boolean(pageToken) || tutte.some((w) => w.startMs < LIMITE_MS),
    }
    workoutDays = [...new Set(detectedWorkouts.map((w) => localISO(new Date(w.startMs))))]
  } catch (e) {
    console.warn('Lettura allenamenti rilevati fallita (non bloccante):', e.message)
  }

  const data = { stepsByDay, workoutDays, detectedWorkouts, detectedRaw }
  localStorage.setItem(LS.cache, JSON.stringify({ at: Date.now(), data }))
  return { ...data, stepsGoal: getStepsGoal() }
}

/**
 * kcal di un intervallo, misurate dall'orologio.
 *
 * Funziona sia per gli allenamenti registrati da Google sia per i nostri, perche'
 * la domanda e' su un intervallo di tempo e non su una sessione: la piattaforma
 * calcola l'energia di continuo, indipendentemente da quale app possieda
 * l'esercizio su Health Services.
 *
 * @returns {Promise<{total:number|null, active:number|null}>}
 *   `total` = attive + metabolismo basale. E' il criterio con cui l'app Fitbit mostra
 *   le calorie di un allenamento, quindi e' il numero che l'utente si aspetta.
 *   `active` = la sola energia in piu' spesa allenandosi.
 */
export async function getWorkoutEnergy(startMs, endMs) {
  const [total, active] = await Promise.all([
    getTotalCalories(startMs, endMs).catch(() => null),
    getActiveEnergy(startMs, endMs).catch(() => null),
  ])
  return { total, active }
}

/** kcal totali (attive + basale) dell'intervallo */
export async function getTotalCalories(startMs, endMs) {
  return rollupKcal('total-calories', startMs, endMs, ['totalCalories', 'total_calories'])
}

export async function getActiveEnergy(startMs, endMs) {
  return rollupKcal('active-energy-burned', startMs, endMs, ['activeEnergyBurned', 'active_energy_burned'])
}

async function rollupKcal(tipo, startMs, endMs, campi) {
  const seconds = Math.round((endMs - startMs) / 1000)
  if (!(seconds > 0)) return null

  // FINESTRE DA UN MINUTO, non una sola grande quanto l'intervallo.
  //
  // La finestra unica sembrava piu' pulita — una domanda, una risposta — ma sui dati
  // veri del 09/08/2026 Google le ha risposto 400 ("Invalid argument in request"),
  // mentre la stessa domanda spezzata al minuto tornava 89 kcal su 29 finestre.
  // Sondando le dimensioni si e' visto che il limite sta fra 5 e 15 minuti per
  // finestra, e non e' documentato: la documentazione dichiara solo un minimo di
  // 1 secondo e nessun massimo.
  //
  // Verificato anche che non si perdono pezzi: finestre da 1 e da 5 minuti danno lo
  // stesso identico totale. E il numero di finestre e' controllabile a occhio, deve
  // tornare coi minuti dell'allenamento.
  //
  // pageSize resta al default (1440): un minuto per finestra copre 24 ore, e nessun
  // allenamento si avvicina a quel limite.
  const res = await api(`/users/me/dataTypes/${tipo}/dataPoints:rollUp`, {
    method: 'POST',
    body: JSON.stringify({
      range: { startTime: new Date(startMs).toISOString(), endTime: new Date(endMs).toISOString() },
      windowSize: '60s',
    }),
  })

  // Il JSON REST dovrebbe essere camelCase (kcalSum), ma il riferimento RPC mostra
  // gli snake_case: si leggono entrambi, come gia' si fa per i passi.
  const points = res.rollupDataPoints || []
  let somma = 0
  let found = false
  for (const p of points) {
    const v = campi.map((c) => p[c]).find(Boolean) || {}
    for (const k of ['kcalSum', 'kcal_sum', 'kcal', 'sum']) {
      if (typeof v[k] === 'number' || (typeof v[k] === 'string' && v[k] !== '')) {
        somma += Number(v[k])
        found = true
        break
      }
    }
  }
  // Nessun punto, o punti senza valore: Google non ha dati per quell'ora. Va
  // distinto da "zero kcal", se no si mostrerebbe 0 al posto della stima.
  return found ? Math.round(somma) : null
}

/** Somma di un rollUp, leggendo sia camelCase (REST) sia snake_case (riferimento RPC) */
function sumRollup(points, campi) {
  let total = 0
  let found = false
  for (const p of points) {
    for (const c of campi) {
      const v = p[c]
      if (!v) continue
      for (const k of ['kcalSum', 'kcal_sum', 'kcal', 'sum']) {
        if (typeof v[k] === 'number' || (typeof v[k] === 'string' && v[k] !== '')) {
          total += Number(v[k])
          found = true
          break
        }
      }
    }
  }
  return found ? total : null
}

/**
 * Diagnostica del conto delle kcal su un intervallo. Serve a rispondere con dati veri
 * al dubbio "questi numeri sono troppo bassi", separando tre ipotesi diverse:
 *
 * 1. `attivoFinestraUnica` — quello che l'app mostra oggi
 * 2. `attivoAlMinuto` — stessa domanda spezzata in finestre da un minuto. Se il totale
 *    differisce dal punto 1, il nostro rollUp sta perdendo pezzi: sarebbe un bug nostro
 * 3. `totale` — `total-calories`, cioe' attivo + metabolismo basale. E' il criterio con
 *    cui l'app Fitbit mostra le calorie di un allenamento, quindi e' il numero con cui
 *    l'utente sta istintivamente confrontando il nostro
 */
export async function diagnosticaKcal(startMs, endMs) {
  const seconds = Math.round((endMs - startMs) / 1000)
  if (!(seconds > 0)) return null
  const range = { startTime: new Date(startMs).toISOString(), endTime: new Date(endMs).toISOString() }

  const chiedi = async (tipo, windowSize) => {
    try {
      const res = await api(`/users/me/dataTypes/${tipo}/dataPoints:rollUp`, {
        method: 'POST',
        body: JSON.stringify({ range, windowSize, pageSize: 10000 }),
      })
      const points = res.rollupDataPoints || []
      return {
        valore: sumRollup(points, ['activeEnergyBurned', 'active_energy_burned', 'totalCalories', 'total_calories']),
        finestre: points.length,
      }
    } catch (e) {
      return { errore: e.message }
    }
  }

  const [attivoAlMinuto, attivoFinestraUnica, totale] = await Promise.all([
    chiedi('active-energy-burned', '60s'),
    chiedi('active-energy-burned', `${seconds}s`),
    // total-calories con la stessa forma che funziona per l'energia attiva: con la
    // finestra unica rispondeva 400 come l'altra, ed e' proprio la riga che serve
    // per confrontarsi con quello che mostra l'app Fitbit
    chiedi('total-calories', '60s'),
  ])

  // La documentazione dichiara solo "almeno 1 secondo" e nessun massimo, ma sul campo
  // le finestre grandi vengono rifiutate. Non essendo scritto da nessuna parte, il
  // limite si misura: si prova a scalare e si guarda dove smette di rispondere.
  const sonde = await Promise.all(
    [60, 300, 900, 1800].map(async (s) => ({ finestraSec: s, ...(await chiedi('active-energy-burned', `${s}s`)) }))
  )

  return { durataSec: seconds, attivoAlMinuto, attivoFinestraUnica, totale, sonde }
}

/**
 * Soglie di zona cardiaca per un giorno: min/max bpm reali di FAT_BURN, CARDIO, PEAK,
 * calcolate da Google con Karvonen su eta' e battito a riposo. Molto piu' affidabili
 * del "220 meno l'eta'", che ignora del tutto quanto e' allenato il cuore.
 *
 * Restituisce null (e non solleva) quando lo scope non e' stato concesso: chi chiama
 * ripiega sulle soglie da eta', che e' meglio di non mostrare le zone del tutto.
 *
 * @returns {Promise<{heartRateZone:string, minBeatsPerMinute:number, maxBeatsPerMinute:number}[]|null>}
 */
export async function getHeartRateZones(dateMs) {
  if (!hasZonesScope()) return null
  const day = new Date(dateMs)
  try {
    const res = await api('/users/me/dataTypes/daily-heart-rate-zones/dataPoints?pageSize=60')
    const points = (res.dataPoints || [])
      .map((p) => p.dailyHeartRateZones || p.daily_heart_rate_zones)
      .filter((z) => z?.date && (z.heartRateZones || z.heart_rate_zones))
    if (!points.length) return null

    // La soglia del giorno dell'allenamento; se manca, la piu' recente che lo precede:
    // le zone cambiano lentamente, quella di ieri vale piu' di nessuna.
    const key = (d) => d.year * 10000 + d.month * 100 + d.day
    const target = key({ year: day.getFullYear(), month: day.getMonth() + 1, day: day.getDate() })
    const best = points
      .filter((p) => key(p.date) <= target)
      .sort((a, b) => key(b.date) - key(a.date))[0] || points[0]

    return (best.heartRateZones || best.heart_rate_zones).map((z) => ({
      heartRateZone: z.heartRateZoneType || z.heart_rate_zone_type,
      minBeatsPerMinute: Number(z.minBeatsPerMinute ?? z.min_beats_per_minute),
      maxBeatsPerMinute: Number(z.maxBeatsPerMinute ?? z.max_beats_per_minute),
    })).filter((z) => z.heartRateZone && Number.isFinite(z.minBeatsPerMinute))
  } catch (e) {
    console.warn('Lettura zone cardiache fallita (non bloccante):', e.message)
    return null
  }
}

/**
 * Etichetta e nome d'icona per i tipi di allenamento rilevati.
 *
 * I nomi sono quelli del registro (src/icons/registry.js), non di una libreria:
 * qui si dice COSA e', il disegno lo sceglie il registro. Sono undici delle
 * dodici icone che Font Awesome aveva e pixelarticons no, per questo stanno
 * quasi tutte in questa tabella.
 */
const EXERCISE_TYPES = {
  WALKING: ['Camminata', 'camminata'],
  RUNNING: ['Corsa', 'corsa'],
  TREADMILL_RUNNING: ['Corsa su tapis roulant', 'corsa'],
  WEIGHTLIFTING: ['Pesi', 'pesi'],
  STRENGTH_TRAINING: ['Allenamento forza', 'pesi'],
  CYCLING: ['Bici', 'bici'],
  BIKING: ['Bici', 'bici'],
  SPINNING: ['Spinning', 'bici'],
  SWIMMING: ['Nuoto', 'nuoto'],
  HIKING: ['Escursione', 'escursione'],
  YOGA: ['Yoga', 'yoga'],
  PILATES: ['Pilates', 'yoga'],
  ELLIPTICAL: ['Ellittica', 'corsa'],
  HIIT: ['HIIT', 'energia'],
  AEROBICS: ['Aerobica', 'battito'],
  DANCING: ['Ballo', 'ballo'],
  SPORT: ['Sport', 'sport'],
}

export function exerciseTypeInfo(type) {
  if (EXERCISE_TYPES[type]) return EXERCISE_TYPES[type]
  const label = (type || 'Attività').toLowerCase().replaceAll('_', ' ')
  return [label.charAt(0).toUpperCase() + label.slice(1), 'battito']
}

/**
 * Le voci fra cui scegliere quali attivita' conteggiare.
 *
 * Non esiste una chiamata "dammi i tipi che monitori": l'elenco e' l'unione fra i tipi
 * che sappiamo nominare e quelli comparsi davvero nei dati. Solo i primi lascerebbero
 * fuori un tipo che Google usa e noi non conosciamo; solo i secondi obbligherebbero a
 * nuotare una volta prima di poter dire che il nuoto conta.
 *
 * Raggruppate per etichetta: CYCLING e BIKING sono la stessa cosa per chi legge, e due
 * voci "Bici" identiche sembrerebbero un difetto. Il gruppo si porta dietro tutti i
 * codici, cosi' spuntando "Bici" contano entrambi.
 *
 * @returns {{label:string, icon:string, types:string[], volte:number}[]}
 *   ordinate per quante volte sono comparse, poi per nome
 */
export function activityTypeOptions(detectedWorkouts = []) {
  const visti = new Map()
  for (const w of detectedWorkouts || []) {
    if (w?.type) visti.set(w.type, (visti.get(w.type) || 0) + 1)
  }

  const gruppi = new Map()
  for (const type of new Set([...Object.keys(EXERCISE_TYPES), ...visti.keys()])) {
    const [label, icon] = exerciseTypeInfo(type)
    const g = gruppi.get(label) || { label, icon, types: [], volte: 0 }
    g.types.push(type)
    g.volte += visti.get(type) || 0
    gruppi.set(label, g)
  }

  return [...gruppi.values()].sort((a, b) => b.volte - a.volte || a.label.localeCompare(b.label, 'it'))
}

export { localISO }
