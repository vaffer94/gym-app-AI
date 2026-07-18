/**
 * Integrazione Google Health API (sostituisce la Fitbit Web API, deprecata a sett. 2026).
 * - OAuth 2.0 standard Google via Google Identity Services (token client, solo browser)
 * - Endpoint: https://health.googleapis.com/v4
 * Richiede VITE_GOOGLE_HEALTH_CLIENT_ID in .env.local (Google Cloud, vedi README).
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_HEALTH_CLIENT_ID
export const isHealthConfigured = Boolean(CLIENT_ID)

const SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly'
const LS = { token: 'gym.health.token', cache: 'gym.health.cache', goal: 'gym.health.stepsGoal' }

/* ---------- obiettivo passi (impostazione locale dell'app) ---------- */
export function getStepsGoal() {
  return Number(localStorage.getItem(LS.goal)) || 10000
}
export function setStepsGoal(v) {
  localStorage.setItem(LS.goal, String(v))
}

/* ---------- stato connessione ---------- */
function getToken() {
  try { return JSON.parse(localStorage.getItem(LS.token)) } catch { return null }
}
export const isHealthConnected = () => Boolean(getToken())

export function disconnectHealth() {
  localStorage.removeItem(LS.token)
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

function requestToken({ silent } = {}) {
  return new Promise((resolve, reject) => {
    loadGis()
      .then(() => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          callback: (resp) => {
            if (resp.error) return reject(new Error(resp.error))
            const tok = {
              access_token: resp.access_token,
              expiresAt: Date.now() + (Number(resp.expires_in) - 60) * 1000,
            }
            localStorage.setItem(LS.token, JSON.stringify(tok))
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
export const connectHealth = () => requestToken({ silent: false })

async function ensureToken() {
  const tok = getToken()
  if (tok && Date.now() < tok.expiresAt) return tok
  if (!tok) return null
  // token scaduto: tentativo silenzioso (funziona se la sessione Google è attiva)
  try {
    return await requestToken({ silent: true })
  } catch {
    return null
  }
}

/* ---------- chiamate API ---------- */
async function api(path, options = {}) {
  const tok = await ensureToken()
  if (!tok) throw new Error('Collegamento scaduto: premi di nuovo "Collega"')
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
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) {
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
  const stepsByDay = {}
  for (const p of stepsRes.rollupDataPoints || []) {
    const s = p.interval?.start?.date
    if (!s) continue
    const key = `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`
    stepsByDay[key] = p.steps?.countSum ?? 0
  }

  // Allenamenti rilevati: sessioni "exercise"
  let workoutDays = []
  try {
    const exRes = await api('/users/me/dataTypes/exercise/dataPoints?pageSize=200')
    const startMs = start.getTime()
    workoutDays = [
      ...new Set(
        (exRes.dataPoints || [])
          .map((p) => p.exercise?.interval)
          .filter(Boolean)
          .map((iv) => {
            // preferisci il tempo civile (già nel fuso dell'utente), fallback sul timestamp
            const cd = iv.civilStartTime?.date
            const d = cd ? new Date(cd.year, cd.month - 1, cd.day) : iv.startTime ? new Date(iv.startTime) : null
            return d && d.getTime() >= startMs ? localISO(d) : null
          })
          .filter(Boolean)
      ),
    ]
  } catch (e) {
    console.warn('Lettura allenamenti rilevati fallita (non bloccante):', e.message)
  }

  const data = { stepsByDay, workoutDays }
  localStorage.setItem(LS.cache, JSON.stringify({ at: Date.now(), data }))
  return { ...data, stepsGoal: getStepsGoal() }
}

export { localISO }
