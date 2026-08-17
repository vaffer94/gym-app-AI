import { foodById } from './foods'
import { mondayOf } from './aggregate'

/**
 * Gli obiettivi dell'utente: passi al giorno, allenamenti a settimana, energia a
 * settimana. Stanno insieme perche' sono la stessa cosa — quello che ti sei ripromessa
 * — mentre prima l'unico che esisteva (i passi) era finito fra le integrazioni, cioe'
 * fra i collegamenti a servizi esterni, che e' un'altra categoria.
 *
 * Vivono in localStorage e in piu' sul profilo (vedi syncGoals). Erano solo locali,
 * "come il profilo, non hanno bisogno di sincronizzazione": vero con un dispositivo
 * solo, falso appena si apre l'app dal portatile e l'obiettivo di energia non c'e' piu'.
 * localStorage resta la copia da cui si legge, perche' le schermate leggono gli
 * obiettivi mentre disegnano e non possono aspettare la rete; il profilo e' quello che
 * li fa sopravvivere al cambio di dispositivo.
 */

const DAY = 24 * 3600 * 1000

const LS = {
  // Chiave storica: rinominarla azzererebbe l'obiettivo passi gia' impostato
  steps: 'gym.health.stepsGoal',
  workouts: 'gym.goal.workouts',
  kcal: 'gym.goal.kcal',
  activities: 'gym.goal.activityTypes',
  // Quando questo dispositivo ha cambiato un obiettivo l'ultima volta: e' l'unico
  // criterio con cui si decide chi ha ragione fra due copie diverse
  stamp: 'gym.goal.updatedAt',
}

/** Da chiamare a ogni modifica locale: senza il timbro, la copia sul profilo vince
 *  sempre e riporterebbe indietro quello che hai appena scelto */
const timbra = () => localStorage.setItem(LS.stamp, String(Date.now()))

/* ---------- passi ---------- */

export const getStepsGoal = () => Number(localStorage.getItem(LS.steps)) || 10000
export const setStepsGoal = (v) => { localStorage.setItem(LS.steps, String(v)); timbra() }

/* ---------- allenamenti a settimana ---------- */

export const DEFAULT_WORKOUT_GOAL = 3

export const getWorkoutGoal = () => Number(localStorage.getItem(LS.workouts)) || DEFAULT_WORKOUT_GOAL
export const setWorkoutGoal = (v) => { localStorage.setItem(LS.workouts, String(v)); timbra() }

/* ---------- energia a settimana ---------- */

/**
 * L'obiettivo di energia si compone scegliendo alimenti: "due gelati e una pizza" dice
 * qualcosa, "1210 kcal" no. Il carrello e' quindi la forma in cui l'obiettivo si
 * scrive, e il numero e' la sua somma — non due impostazioni separate che possono
 * contraddirsi.
 *
 * Il numero resta comunque modificabile a mano: chi ha in testa la cifra non deve
 * ricostruirla a forza di panini. In quel caso il carrello si svuota, ed e' l'unico
 * comportamento onesto: tenere un carrello che somma a un altro numero significherebbe
 * mostrare un obiettivo diverso da quello impostato.
 *
 * @returns {{kcal:number, cart:{id:string, qty:number}[]}} kcal 0 = nessun obiettivo
 */
export function getKcalGoal() {
  try {
    const g = JSON.parse(localStorage.getItem(LS.kcal) || 'null')
    if (g && g.kcal > 0) {
      // Le voci sparite dall'elenco alimenti si scartano qui: senza, il grafico
      // proverebbe a disegnare una barra di un cibo che non esiste piu'
      const cart = (g.cart || []).filter((i) => foodById(i.id) && i.qty > 0)
      return { kcal: Math.round(g.kcal), cart }
    }
  } catch { /* impostazione corrotta: si riparte da zero */ }
  return { kcal: 0, cart: [] }
}

export const setKcalGoal = (goal) => { localStorage.setItem(LS.kcal, JSON.stringify(goal)); timbra() }

/** Somma di un carrello, in kcal */
export const cartKcal = (cart) =>
  (cart || []).reduce((a, i) => a + (foodById(i.id)?.kcal || 0) * i.qty, 0)

/* ---------- attivita' di Google che valgono come allenamento ---------- */

/**
 * I tipi di attivita' che Google riconosce da solo (nuoto, bici, camminata...) e che
 * l'utente ha deciso di far contare fra i propri allenamenti.
 *
 * Vuoto di default, e non e' pigrizia: la bici usata per andare al lavoro e le
 * camminate arrivano comunque, e se contassero senza che nessuno l'abbia chiesto la
 * settimana si chiuderebbe spostandosi. Quello che vale lo si sceglie una volta, e da
 * quel momento vale davvero — chi va in piscina due volte a settimana si sta allenando
 * quanto chi va in palestra, e fingere di non saperlo sarebbe altrettanto falso.
 *
 * Impostazione locale al dispositivo come gli altri obiettivi: sta qui e non fra le
 * integrazioni perche' non cambia quali dati arrivano, cambia quali contano.
 */
export function getTrackedActivityTypes() {
  try {
    const v = JSON.parse(localStorage.getItem(LS.activities) || '[]')
    return Array.isArray(v) ? v.filter((t) => typeof t === 'string') : []
  } catch {
    return [] // impostazione corrotta: meglio non contare niente che contare a caso
  }
}

export const setTrackedActivityTypes = (types) => {
  localStorage.setItem(LS.activities, JSON.stringify([...new Set(types)]))
  timbra()
}

/**
 * Predicato pronto da passare a un filtro. Legge localStorage una volta sola: fatto
 * dentro il filtro, lo rileggerebbe per ogni riga dell'elenco.
 */
export function trackedActivityFilter() {
  const set = new Set(getTrackedActivityTypes())
  return (w) => set.has(w?.type)
}

/* ---------- sincronizzazione fra dispositivi ---------- */

/** Tutti gli obiettivi in un oggetto solo: e' l'unita' con cui viaggiano e con cui si
 *  confrontano due copie. Salvarli separati vorrebbe dire poter avere l'obiettivo di
 *  energia di ieri accanto a quello di allenamenti di oggi. */
export function readAllGoals() {
  return {
    steps: getStepsGoal(),
    workouts: getWorkoutGoal(),
    kcal: getKcalGoal(),
    activityTypes: getTrackedActivityTypes(),
    updatedAt: Number(localStorage.getItem(LS.stamp)) || 0,
  }
}

/** Scrive in locale quello che arriva dal profilo, timbro compreso: e' una copia di
 *  qualcosa deciso altrove, non una modifica fatta qui */
function applyGoals(g) {
  if (Number(g.steps) > 0) localStorage.setItem(LS.steps, String(Math.round(g.steps)))
  if (Number(g.workouts) > 0) localStorage.setItem(LS.workouts, String(Math.round(g.workouts)))
  if (g.kcal && typeof g.kcal === 'object') localStorage.setItem(LS.kcal, JSON.stringify(g.kcal))
  if (Array.isArray(g.activityTypes)) localStorage.setItem(LS.activities, JSON.stringify(g.activityTypes))
  localStorage.setItem(LS.stamp, String(g.updatedAt || Date.now()))
}

/**
 * Allinea gli obiettivi di questo dispositivo con quelli del profilo.
 *
 * Vince chi ha scritto per ultimo, confrontando i timbri. Non e' una fusione: fondere
 * "tre allenamenti" con "quattro allenamenti" non da' un numero che qualcuno abbia
 * scelto, e su un'impostazione che si cambia una volta ogni tanto l'ultima parola e'
 * il criterio che non sorprende nessuno.
 *
 * Un dispositivo nuovo ha timbro 0 e quindi perde sempre, che e' esattamente il caso da
 * cui e' nata questa funzione: aprire l'app dal portatile e ritrovare i propri obiettivi
 * invece dei valori di default.
 *
 * Ritorna anche com'e' andata, e non solo se ridisegnare: una sincronizzazione che
 * fallisce in silenzio non si distingue da una che non e' mai partita, ed e' esattamente
 * l'equivoco costato una serata a capire che l'app sul telefono era ancora quella vecchia.
 *
 * @returns {Promise<{cambiato:boolean, stato:string, updatedAt?:number}>}
 *   stato: 'ricevuti' (vinceva il profilo) | 'inviati' (vinceva questo dispositivo)
 *   | 'allineati' | 'mai-impostati' | 'non-disponibile' (repo senza profilo, cioe' demo)
 */
export async function syncGoals(repo) {
  if (!repo?.getGoals) return { cambiato: false, stato: 'non-disponibile' }
  const locali = readAllGoals()
  const remoti = await repo.getGoals()

  if (!remoti) {
    // Sul profilo non c'e' ancora niente: ci va quello che c'e' qui, ma solo se
    // qualcuno l'ha scelto davvero. Mandare i default sovrascriverebbe col nulla il
    // primo dispositivo che si collega dopo.
    if (locali.updatedAt) {
      await repo.saveGoals(locali)
      return { cambiato: false, stato: 'inviati', updatedAt: locali.updatedAt }
    }
    return { cambiato: false, stato: 'mai-impostati' }
  }
  if ((remoti.updatedAt || 0) > locali.updatedAt) {
    applyGoals(remoti)
    return { cambiato: true, stato: 'ricevuti', updatedAt: remoti.updatedAt }
  }
  if (locali.updatedAt > (remoti.updatedAt || 0)) {
    await repo.saveGoals(locali)
    return { cambiato: false, stato: 'inviati', updatedAt: locali.updatedAt }
  }
  return { cambiato: false, stato: 'allineati', updatedAt: remoti.updatedAt }
}

/**
 * Manda al profilo gli obiettivi appena cambiati.
 *
 * Con un ritardo perche' lo stepper si preme piu' volte di fila: "da 3 a 6" sono tre
 * tocchi, e senza attesa sarebbero tre scritture per un'unica decisione.
 *
 * Se la rete non c'e' non succede niente di grave: il valore e' gia' in locale e
 * funziona, e Firestore ha la sua cache che riprova da sola. L'unico caso davvero perso
 * e' cambiare obiettivo offline e non riaprire piu' l'app su questo dispositivo.
 */
let attesaPush = null
export function pushGoals(repo, onEsito, ritardo = 800) {
  if (!repo?.saveGoals) return
  clearTimeout(attesaPush)
  attesaPush = setTimeout(() => {
    const g = readAllGoals()
    repo.saveGoals(g)
      .then(() => onEsito?.({ stato: 'inviati', updatedAt: g.updatedAt }))
      .catch((e) => {
        console.warn('Obiettivi non salvati sul profilo:', e.message)
        onEsito?.({ stato: 'errore', errore: e.message })
      })
  }, ritardo)
}

/* ---------- avanzamento ---------- */

/**
 * Le attivita' di questa settimana, da lunedi'.
 *
 * Prima qui contavano solo gli allenamenti registrati dall'app, per non far chiudere la
 * settimana a forza di camminate riconosciute dall'orologio. Il motivo era giusto ma la
 * regola era troppo larga: chi va in piscina due volte a settimana si sta allenando, e
 * far finta di non saperlo era falso quanto contare le scale.
 *
 * Ora la distinzione la fa l'utente una volta sola (vedi getTrackedActivityTypes) e
 * questa funzione non se ne occupa: riceve gia' l'elenco di cio' che conta, costruito da
 * allActivities in data/activities.js.
 */
export function weekSessions(sessions, now = Date.now()) {
  const start = mondayOf(now)
  return (sessions || []).filter((s) => s.startedAt >= start)
}

/**
 * kcal guadagnate questa settimana.
 * @param kcalById Map(sessionId -> {kcal}) gia' risolta (vedi resolveKcalMany)
 */
export function weekKcal(sessions, kcalById, now = Date.now()) {
  return weekSessions(sessions, now).reduce((a, s) => a + (kcalById?.get(s.id)?.kcal || 0), 0)
}

/**
 * Settimane di fila in cui l'obiettivo di allenamenti e' stato raggiunto.
 *
 * La settimana in corso non lo spezza se non e' ancora completa: e' mercoledi', hai
 * fatto un allenamento su tre, e non e' un fallimento — e' una settimana a meta'.
 * Stessa grazia gia' usata da weekStreak per le settimane di fila.
 */
export function weeksInLine(sessions, goal, now = Date.now()) {
  if (!(goal > 0)) return 0
  const perWeek = new Map()
  for (const s of sessions || []) {
    if (!s.startedAt) continue
    const k = mondayOf(s.startedAt)
    perWeek.set(k, (perWeek.get(k) || 0) + 1)
  }
  let cursor = mondayOf(now)
  if ((perWeek.get(cursor) || 0) < goal) cursor -= 7 * DAY
  let n = 0
  while ((perWeek.get(cursor) || 0) >= goal) {
    n += 1
    cursor -= 7 * DAY
  }
  return n
}

/**
 * Le ultime `quante` settimane, dalla piu' vecchia alla settimana in corso, con quanti
 * allenamenti in ognuna e se l'obiettivo e' stato raggiunto. Piu' il totale delle
 * settimane a obiettivo, che e' il numero che dice se e' un'abitudine o un caso.
 *
 * "3 settimane di fila" da solo non diceva molto: non si vedeva ne' quali, ne' quante
 * ne erano state saltate, ne' se prima era andata meglio.
 *
 * Il totale copre esattamente il periodo che gli si passa, e non "sempre": da quando
 * contano anche le attivita' scelte su Google, chi chiama deve dare solo la finestra in
 * cui entrambe le fonti hanno dati. Un totale piu' lungo sommerebbe settimane misurate
 * con due metri diversi.
 *
 * @returns {{settimane: {monday:number, count:number, hit:boolean, corrente:boolean}[], totale:number}}
 */
export function weeklyMedals(sessions, goal, quante = 5, now = Date.now()) {
  const perWeek = new Map()
  for (const s of sessions || []) {
    if (!s.startedAt) continue
    const k = mondayOf(s.startedAt)
    perWeek.set(k, (perWeek.get(k) || 0) + 1)
  }
  const corrente = mondayOf(now)
  const settimane = Array.from({ length: quante }, (_, i) => {
    const monday = corrente - (quante - 1 - i) * 7 * DAY
    const count = perWeek.get(monday) || 0
    return { monday, count, hit: goal > 0 && count >= goal, corrente: monday === corrente }
  })
  let totale = 0
  for (const [, count] of perWeek) if (goal > 0 && count >= goal) totale += 1
  return { settimane, totale }
}

/**
 * Come si riempiono gli alimenti dell'obiettivo con l'energia guadagnata.
 *
 * Si riempie dal piu' economico al piu' caro: cosi' qualcosa si completa presto e si
 * vede il progresso: partendo dalla pizza da 850 kcal, per meta' settimana sarebbero
 * tutte barre vuote. L'ordine di riempimento e' anche quello di visualizzazione, se no
 * la barra piena finirebbe in fondo.
 *
 * @returns {{id, qty, food, totKcal, filled, pct}[]}
 */
export function fillCart(cart, earned) {
  let resto = Math.max(0, earned)
  return (cart || [])
    .map((i) => ({ ...i, food: foodById(i.id) }))
    .filter((x) => x.food)
    .sort((a, b) => a.food.kcal - b.food.kcal)
    .map((x) => {
      const totKcal = x.food.kcal * x.qty
      const filled = Math.min(totKcal, resto)
      resto -= filled
      return { ...x, totKcal, filled, pct: totKcal ? (filled / totKcal) * 100 : 0 }
    })
}
