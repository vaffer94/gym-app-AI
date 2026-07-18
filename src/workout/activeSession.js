/**
 * Persistenza continua della sessione attiva in localStorage:
 * se il browser si chiude a metà allenamento, si riprende da dove si era.
 */
const KEY = 'gym.activeSession'

export function loadActive() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function saveActive(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearActive() {
  localStorage.removeItem(KEY)
}

export function formatClock(totalSec) {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}
