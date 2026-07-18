import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import { aggregateSessions, weekStreak, daysSinceLast, last4Weeks, avgPerWeek } from '../data/aggregate'
import { computeStats } from '../workout/sessionEngine'
import { formatClock } from '../workout/activeSession'
import TrendChart from '../components/TrendChart'

const PERIODS = [
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
  { id: 'quarter', label: 'Trimestre' },
]

export default function HistoryListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repo = getRepo(user)

  const [sessions, setSessions] = useState(null)
  const [tab, setTab] = useState('trends') // trends (default) | list
  const [period, setPeriod] = useState('week')

  useEffect(() => {
    repo.listSessions().then(setSessions)
  }, [repo])

  const trends = useMemo(
    () => (sessions ? aggregateSessions(sessions, period) : []),
    [sessions, period]
  )
  const maxVolume = Math.max(1, ...trends.map((g) => g.volumeKg))

  // dati per i grafici in ordine cronologico
  const chrono = useMemo(() => [...trends].reverse(), [trends])
  const chartLabels = chrono.map((g) => g.label)
  const volumeData = useMemo(
    () => [{ label: 'Volume (kg)', data: chrono.map((g) => g.volumeKg), backgroundColor: '#ff6b35', borderColor: '#2b2b3c', borderWidth: 2, borderRadius: 8 }],
    [chrono]
  )
  const durationData = useMemo(
    () => [
      { label: 'Durata media (min)', data: chrono.map((g) => Math.round(g.avgDurationSec / 60)), borderColor: '#2ec4b6', backgroundColor: '#2ec4b6', borderWidth: 3, tension: 0.35, pointRadius: 5, pointBorderColor: '#2b2b3c', pointBorderWidth: 2 },
      { label: 'Allenamenti', data: chrono.map((g) => g.count), borderColor: '#ffd23f', backgroundColor: '#ffd23f', borderWidth: 3, tension: 0.35, pointRadius: 5, pointBorderColor: '#2b2b3c', pointBorderWidth: 2 },
    ],
    [chrono]
  )

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h2>📊 Storico</h2>
      </header>

      <div className="row">
        <button className={`btn ${tab === 'trends' ? 'btn--teal' : ''}`} style={{ flex: 1 }} onClick={() => setTab('trends')}>
          Andamento
        </button>
        <button className={`btn ${tab === 'list' ? 'btn--teal' : ''}`} style={{ flex: 1 }} onClick={() => setTab('list')}>
          Allenamenti
        </button>
      </div>

      {sessions === null && <p className="center muted">Carico…</p>}

      {sessions?.length === 0 && (
        <div className="card center stack" style={{ padding: '40px 20px' }}>
          <span className="emoji-xl">🏋️</span>
          <p className="muted">Nessun allenamento ancora. Il primo è il più importante!</p>
          <button className="btn btn--primary" onClick={() => navigate('/allenamento')}>Inizia ora</button>
        </div>
      )}

      {tab === 'list' && sessions?.length > 0 && (
        <div className="stack">
          {sessions.map((s) => {
            const st = computeStats(s)
            const date = new Date(s.startedAt)
            return (
              <div
                key={s.id}
                className="card card--tap"
                style={s.planColor ? { background: s.planColor } : undefined}
                onClick={() => navigate(`/storico/${s.id}`)}
              >
                <div className="row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{s.planName}</h3>
                    <p className="small muted">
                      {date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!s.completedFully && <span className="chip">parziale</span>}
                </div>
                <p className="small muted" style={{ marginTop: 6 }}>
                  <i className="fa-solid fa-stopwatch" /> {formatClock(st.durationSec)}
                  {' · '}{st.doneSeries}/{st.totalSeries} serie
                  {st.volumeKg > 0 ? ` · ${st.volumeKg} kg` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* STREAK + KPI + completamento */}
      {tab === 'trends' && sessions?.length > 0 && (
        <>
          <StreakCard sessions={sessions} />

          <div className="row">
            <div className="card card--flat center" style={{ flex: 1, padding: '14px 8px' }}>
              <div className="kpi">{avgPerWeek(sessions)}</div>
              <p className="small muted">allenamenti / settimana</p>
            </div>
            <div className="card card--flat center" style={{ flex: 1, padding: '14px 8px' }}>
              <div className="kpi">
                {(() => {
                  const tot = sessions.reduce((a, s) => a + computeStats(s).totalSeries, 0)
                  const done = sessions.reduce((a, s) => a + computeStats(s).doneSeries, 0)
                  return tot ? `${Math.round((done / tot) * 100)}%` : '—'
                })()}
              </div>
              <p className="small muted">serie completate</p>
            </div>
          </div>

          <div className="card card--flat stack">
            <span className="label" style={{ margin: 0 }}>Ultimi allenamenti: tutto completato?</span>
            {sessions.slice(0, 5).map((s) => {
              const st = computeStats(s)
              const pct = st.totalSeries ? Math.round((st.doneSeries / st.totalSeries) * 100) : 0
              return (
                <div key={s.id} className="row" onClick={() => navigate(`/storico/${s.id}`)} style={{ cursor: 'pointer' }}>
                  <span className="small" style={{ width: 92 }}>
                    {new Date(s.startedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="bar-track" style={{ flex: 1 }}>
                    <div className="bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--teal)' : 'var(--yellow)' }} />
                  </div>
                  <span className="small" style={{ fontWeight: 800, width: 74, textAlign: 'right' }}>
                    {pct === 100 ? <><i className="fa-solid fa-circle-check" style={{ color: 'var(--teal)' }} /> tutte</> : `${st.doneSeries}/${st.totalSeries}`}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="chips-wrap">
            {PERIODS.map((p) => (
              <span
                key={p.id}
                className={`chip chip--select ${period === p.id ? 'chip--on' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </span>
            ))}
          </div>

          {chrono.length > 0 && (
            <>
              <div className="card card--flat stack">
                <span className="label" style={{ margin: 0 }}>Volume sollevato</span>
                <TrendChart type="bar" labels={chartLabels} datasets={volumeData} yLabel="kg" />
              </div>
              <div className="card card--flat stack">
                <span className="label" style={{ margin: 0 }}>Durata media e frequenza</span>
                <TrendChart type="line" labels={chartLabels} datasets={durationData} />
              </div>
            </>
          )}

          <div className="stack">
            {trends.map((g) => (
              <div key={g.key} className="card card--flat stack" style={{ gap: 8 }}>
                <div className="row">
                  <h3 style={{ flex: 1 }}>{g.label}</h3>
                  <span className="chip">{g.count} allenament{g.count === 1 ? 'o' : 'i'}</span>
                </div>
                {g.volumeKg > 0 && (
                  <div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.round((g.volumeKg / maxVolume) * 100)}%` }} />
                    </div>
                    <p className="small muted">{g.volumeKg} kg di volume</p>
                  </div>
                )}
                <p className="small muted">
                  Durata media {formatClock(g.avgDurationSec)} · completamento {g.completionPct}% · {g.doneSeries} serie
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Card streak: settimane di fila + calendario ultime 4 settimane */
function StreakCard({ sessions }) {
  const streak = weekStreak(sessions)
  const rest = daysSinceLast(sessions)
  const cal = last4Weeks(sessions)
  const dayNames = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

  return (
    <div className="card card--primary stack">
      <div className="row">
        <span className="emoji-xl">🔥</span>
        <div style={{ flex: 1 }}>
          <div className="kpi">{streak} settiman{streak === 1 ? 'a' : 'e'} di fila</div>
          <p className="small muted">
            {rest === 0 ? 'Ti sei allenata oggi!' : rest === 1 ? '1 giorno dall’ultimo allenamento' : `${rest} giorni dall’ultimo allenamento`}
          </p>
        </div>
      </div>

      <div className="cal-grid">
        {dayNames.map((d, i) => (
          <span key={`h${i}`} className="small muted center" style={{ fontWeight: 800 }}>{d}</span>
        ))}
        {cal.map((c) => (
          <div
            key={c.ts}
            className={`cal-cell ${c.trained ? 'cal-cell--on' : ''} ${c.isToday ? 'cal-cell--today' : ''} ${c.future ? 'cal-cell--future' : ''}`}
          >
            {c.trained ? <i className="fa-solid fa-dumbbell" /> : c.dayNum}
          </div>
        ))}
      </div>
    </div>
  )
}
