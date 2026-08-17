import { foodById } from './foods'
import { mondayOf } from './aggregate'

/**
 * Gli obiettivi dell'utente: passi al giorno, allenamenti a settimana, energia a
 * settimana. Stanno insieme perche' sono la stessa cosa — quello che ti sei ripromessa
 * — mentre prima l'unico che esisteva (i passi) era finito fra le integrazioni, cioe'
 * fra i collegamenti a servizi esterni, che e' un'altra categoria.
 *
 * Sono impostazioni locali al dispositivo, come il profilo: non hanno bisogno di
 * sincronizzazione e non devono sparire se l'utente non e' collegato alla rete.
 */

const DAY = 24 * 3600 * 1000

const LS = {
  // Chiave storica: rinominarla azzererebbe l'obiettivo passi gia' impostato
  steps: 'gym.health.stepsGoal',
  workouts: 'gym.goal.workouts',
  kcal: 'gym.goal.kcal',
  activities: 'gym.goal.activityTypes',
}

/* ---------- passi ---------- */

export const getStepsGoal = () => Number(localStorage.getItem(LS.steps)) || 10000
export const setStepsGoal = (v) => localStorage.setItem(LS.steps, String(v))

/* ---------- allenamenti a settimana ---------- */

export const DEFAULT_WORKOUT_GOAL = 3

export const getWorkoutGoal = () => Number(localStorage.getItem(LS.workouts)) || DEFAULT_WORKOUT_GOAL
export const setWorkoutGoal = (v) => localStorage.setItem(LS.workouts, String(v))

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

export const setKcalGoal = (goal) => localStorage.setItem(LS.kcal, JSON.stringify(goal))

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

export const setTrackedActivityTypes = (types) =>
  localStorage.setItem(LS.activities, JSON.stringify([...new Set(types)]))

/**
 * Predicato pronto da passare a un filtro. Legge localStorage una volta sola: fatto
 * dentro il filtro, lo rileggerebbe per ogni riga dell'elenco.
 */
export function trackedActivityFilter() {
  const set = new Set(getTrackedActivityTypes())
  return (w) => set.has(w?.type)
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
