import { computeStats } from '../workout/sessionEngine'

/** Chiave e etichetta del periodo per una data */
function periodOf(ts, period) {
  const d = new Date(ts)
  const year = d.getFullYear()
  if (period === 'month') {
    const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    return { key: `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`, label }
  }
  if (period === 'quarter') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return { key: `${year}-Q${q}`, label: `${q}º trimestre ${year}` }
  }
  // settimana ISO (lunedì-domenica)
  const monday = new Date(d)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (x) => x.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  return { key: monday.toISOString().slice(0, 10), label: `${fmt(monday)} – ${fmt(sunday)}` }
}

/**
 * Raggruppa le sessioni per periodo (week | month | quarter).
 * Ritorna i periodi dal più recente, con totali e medie.
 */
const DAY = 24 * 3600 * 1000
const mondayOf = (ts) => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/** Streak: settimane consecutive con almeno un allenamento (stile Hevy).
 *  La settimana corrente senza allenamenti non interrompe la streak. */
export function weekStreak(sessions) {
  const weeks = new Set(sessions.filter((s) => s.startedAt).map((s) => mondayOf(s.startedAt)))
  let cursor = mondayOf(Date.now())
  let streak = 0
  if (!weeks.has(cursor)) cursor -= 7 * DAY // grazia per la settimana in corso
  while (weeks.has(cursor)) {
    streak += 1
    cursor -= 7 * DAY
  }
  return streak
}

/** Giorni interi trascorsi dall'ultimo allenamento (null se mai allenato) */
export function daysSinceLast(sessions) {
  const last = sessions.reduce((m, s) => Math.max(m, s.startedAt || 0), 0)
  if (!last) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const lastDay = new Date(last); lastDay.setHours(0, 0, 0, 0)
  return Math.round((today - lastDay) / DAY)
}

/** Calendario ultime 4 settimane: 28 celle da lunedì, con conteggio sessioni per giorno */
export function last4Weeks(sessions) {
  const start = mondayOf(Date.now()) - 21 * DAY
  const byDay = new Map()
  for (const s of sessions) {
    if (!s.startedAt) continue
    const d = new Date(s.startedAt); d.setHours(0, 0, 0, 0)
    byDay.set(d.getTime(), (byDay.get(d.getTime()) || 0) + 1)
  }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Array.from({ length: 28 }, (_, i) => {
    const ts = start + i * DAY
    return {
      ts,
      dayNum: new Date(ts).getDate(),
      trained: (byDay.get(ts) || 0) > 0,
      isToday: ts === today.getTime(),
      future: ts > today.getTime(),
    }
  })
}

/** Media allenamenti a settimana nelle ultime 4 settimane */
export function avgPerWeek(sessions) {
  const start = mondayOf(Date.now()) - 21 * DAY
  const n = sessions.filter((s) => s.startedAt && s.startedAt >= start).length
  return Math.round((n / 4) * 10) / 10
}

export function aggregateSessions(sessions, period) {
  const groups = new Map()
  for (const s of sessions) {
    if (!s.startedAt) continue
    const { key, label } = periodOf(s.startedAt, period)
    if (!groups.has(key)) {
      groups.set(key, { key, label, count: 0, durationSec: 0, volumeKg: 0, doneSeries: 0, totalSeries: 0 })
    }
    const g = groups.get(key)
    const st = computeStats(s)
    g.count += 1
    g.durationSec += st.durationSec
    g.volumeKg += st.volumeKg
    g.doneSeries += st.doneSeries
    g.totalSeries += st.totalSeries
  }
  return [...groups.values()]
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map((g) => ({
      ...g,
      avgDurationSec: Math.round(g.durationSec / g.count),
      completionPct: g.totalSeries ? Math.round((g.doneSeries / g.totalSeries) * 100) : 0,
    }))
}
