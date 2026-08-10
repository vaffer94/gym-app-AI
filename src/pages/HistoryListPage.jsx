import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import {
  aggregateSessions, daysSinceLast, last4Weeks, avgPerWeek,
  longestAppDayStreak, longestActivityStreakThisMonth,
} from '../data/aggregate'
import { computeStats } from '../workout/sessionEngine'
import { formatClock } from '../workout/activeSession'
import TrendChart from '../components/TrendChart'
import {
  isHealthConfigured, isHealthConnected, connectHealth, disconnectHealth,
  getHealthSummary, clearHealthCache, localISO, exerciseTypeInfo,
  connectHealthZones, hasZonesScope,
} from '../data/health'
import { getStepsGoal } from '../data/goals'
import WeekGoals from '../components/WeekGoals'
import WeekMedals from '../components/WeekMedals'
import { resolveKcalMany } from '../data/kcal'
import { getWorkoutEnergy } from '../data/health'
import { KcalChip } from '../components/KcalRow'
import ExerciseStats from '../components/ExerciseStats'
import { exerciseIndex } from '../data/exerciseStats'
import KcalDiagnostics from '../components/KcalDiagnostics'

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
  const [tab, setTab] = useState('trends') // trends (default) | list | exercises | integrations
  const [openExercise, setOpenExercise] = useState(null)
  // Cambiare scheda azzera l'esercizio aperto: se no si torna su "Esercizi" e ci si
  // ritrova dentro la Cyclette visitata dieci minuti prima, senza sapere perche'.
  const goTab = (t) => { setTab(t); setOpenExercise(null) }
  const [period, setPeriod] = useState('week')
  const [fitbit, setFitbit] = useState(null) // {stepsByDay, stepsGoal, workoutDays}
  const [fitbitError, setFitbitError] = useState(null)
  const [kcalMap, setKcalMap] = useState(new Map())
  const [, setZonesOn] = useState(hasZonesScope()) // solo per ridisegnare dopo il consenso

  useEffect(() => {
    repo.listSessions().then(setSessions)
  }, [repo])

  // kcal di tutte le righe dell'elenco, allenamenti nostri e camminate rilevate da
  // Google insieme: per il conto e' solo un intervallo di tempo. Risolte in blocco e
  // con un freno sulle richieste in volo (vedi resolveKcalMany), non una per riga.
  useEffect(() => {
    const items = [
      ...(sessions || []).map((s) => ({
        id: s.id, startedAt: s.startedAt, endedAt: s.endedAt, hrAvg: s.hrAvg, pausedMs: s.pausedMs,
      })),
      ...(fitbit?.detectedWorkouts || [])
        .filter((w) => w.endMs)
        .map((w) => ({ id: `d-${w.startMs}`, startedAt: w.startMs, endedAt: w.endMs })),
    ].filter((i) => i.endedAt)
    if (!items.length) return
    let alive = true
    resolveKcalMany(items, { isConnected: isHealthConnected(), fetchEnergy: getWorkoutEnergy })
      .then((m) => alive && setKcalMap(m))
    return () => { alive = false }
  }, [sessions, fitbit])

  const loadHealth = () =>
    getHealthSummary().then((d) => { setFitbit(d); setFitbitError(null) }).catch((e) => setFitbitError(e.message))

  useEffect(() => {
    if (isHealthConnected()) loadHealth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Quale operazione e' in corso, per dare al pulsante premuto uno stato visibile.
   * Sincronizzare vuol dire aspettare la rete: senza, si preme, non succede niente
   * per qualche secondo, e l'unica reazione sensata e' premere di nuovo.
   */
  const [busy, setBusy] = useState(null) // 'connect' | 'refresh' | 'zones' | null
  const conAttesa = async (nome, fn) => {
    setBusy(nome)
    try {
      await fn()
    } catch (e) {
      setFitbitError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const connect = () => conAttesa('connect', async () => {
    await connectHealth()
    await loadHealth()
  })

  const trends = useMemo(
    () => (sessions ? aggregateSessions(sessions, period) : []),
    [sessions, period]
  )
  // dati per i grafici in ordine cronologico
  const chrono = useMemo(() => [...trends].reverse(), [trends])
  const chartLabels = chrono.map((g) => g.label)
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

      <div className="row tabs">
        <button className={`btn ${tab === 'trends' ? 'btn--teal' : ''}`} onClick={() => goTab('trends')}>
          Andamento
        </button>
        <button className={`btn ${tab === 'list' ? 'btn--teal' : ''}`} onClick={() => goTab('list')}>
          Allenamenti
        </button>
        <button className={`btn ${tab === 'exercises' ? 'btn--teal' : ''}`} onClick={() => goTab('exercises')}>
          Esercizi
        </button>
        <button className={`btn ${tab === 'integrations' ? 'btn--teal' : ''}`} onClick={() => goTab('integrations')}>
          Integrazioni
        </button>
      </div>

      {sessions === null && <p className="center muted">Carico…</p>}

      {sessions?.length === 0 && tab !== 'integrations' && (
        <div className="card center stack" style={{ padding: '40px 20px' }}>
          <span className="emoji-xl">🏋️</span>
          <p className="muted">Nessun allenamento ancora. Il primo è il più importante!</p>
          <button className="btn btn--primary" onClick={() => navigate('/allenamento')}>Inizia ora</button>
        </div>
      )}

      {tab === 'exercises' && sessions?.length > 0 && (
        openExercise ? (
          <div className="stack">
            <button className="btn" onClick={() => setOpenExercise(null)}>
              <i className="fa-solid fa-arrow-left" /> Tutti gli esercizi
            </button>
            <ExerciseStats sessions={sessions} name={openExercise.name} color={openExercise.color} />
          </div>
        ) : (
          <div className="stack">
            {exerciseIndex(sessions).map((e) => (
              <div key={e.id} className="card card--tap" onClick={() => setOpenExercise(e)}>
                <div className="row">
                  <span style={{ width: 14, height: 14, background: e.color, border: '2px solid var(--ink)', borderRadius: 4 }} />
                  <div style={{ flex: 1, minWidth: 96 }}>
                    <h3>{e.name}</h3>
                    <p className="small muted">
                      {e.times} volt{e.times === 1 ? 'a' : 'e'} · {formatClock(e.totalSec)} in totale
                    </p>
                  </div>
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'integrations' && (
        <div className="stack">
          <div className="card stack">
            <div className="row">
              <span className="emoji-lg">⌚</span>
              <div style={{ flex: 1 }}>
                <h3>Google Health</h3>
                <p className="small muted">Passi e allenamenti rilevati dal tuo Pixel Watch (ecosistema Fitbit)</p>
              </div>
              {isHealthConnected() && <span className="chip"><i className="fa-solid fa-circle-check" /> collegato</span>}
            </div>

            {!isHealthConfigured && (
              <p className="small">
                Per attivare l'integrazione serve un Client ID OAuth di Google Cloud in{' '}
                <code>.env.local</code> — i passaggi sono nel README (sezione "Integrazione Google Health").
              </p>
            )}

            {isHealthConfigured && !isHealthConnected() && (
              <button className="btn btn--primary btn--big" onClick={connect} disabled={busy === 'connect'}>
                {busy === 'connect'
                  ? <><i className="fa-solid fa-rotate fa-spin" /> Collego…</>
                  : 'Collega Google Health'}
              </button>
            )}

            {isHealthConnected() && (
              <>
                <p className="small muted">
                  I dati compaiono nel calendario dell'Andamento (icone sui giorni) e nel grafico dei passi.
                  Aggiornati al massimo ogni 30 minuti.
                </p>
                {/* L'obiettivo passi e' un obiettivo, non un'impostazione della
                    connessione: sta in Obiettivi insieme agli altri due */}
                <button className="btn" onClick={() => navigate('/obiettivi')}>
                  🎯 Obiettivo passi: {getStepsGoal().toLocaleString('it-IT')}
                </button>
              </>
            )}

            {/* Consenso separato: le zone stanno sotto uno scope diverso da passi e
                allenamenti. Chiederlo a tutti in blocco significherebbe che un rifiuto
                fa saltare anche cio' che gia' funziona. */}
            {isHealthConnected() && !hasZonesScope() && (
              <button
                className="btn"
                disabled={busy === 'zones'}
                onClick={() => conAttesa('zones', async () => {
                  await connectHealthZones()
                  setZonesOn(true)
                })}
              >
                {busy === 'zones'
                  ? <><i className="fa-solid fa-rotate fa-spin" /> Chiedo il permesso…</>
                  : <><i className="fa-solid fa-heart-pulse" /> Usa le mie zone cardiache vere</>}
              </button>
            )}
            {isHealthConnected() && hasZonesScope() && (
              <p className="small muted">
                <i className="fa-solid fa-circle-check" /> Zone cardiache personalizzate attive
                (età e battito a riposo, non “220 meno l’età”).
              </p>
            )}

            {isHealthConnected() && (
              <>
                <button
                  className="btn"
                  disabled={busy === 'refresh'}
                  onClick={() => conAttesa('refresh', async () => {
                    clearHealthCache()
                    await loadHealth()
                  })}
                >
                  {busy === 'refresh'
                    ? <><i className="fa-solid fa-rotate fa-spin" /> Aggiorno…</>
                    : <><i className="fa-solid fa-rotate" /> Aggiorna dati adesso</>}
                </button>
                <button
                  className="btn"
                  style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  onClick={() => { disconnectHealth(); setFitbit(null) }}
                >
                  Scollega
                </button>
              </>
            )}

            {fitbitError && <p className="small" style={{ color: 'var(--danger)' }}>{fitbitError}</p>}
          </div>

          <KcalDiagnostics sessions={sessions} />

          <div className="card card--flat center" style={{ padding: '28px 20px' }}>
            <p className="small muted">Altre integrazioni arriveranno qui 🔌</p>
          </div>
        </div>
      )}

      {tab === 'list' && sessions?.length > 0 && (
        <div className="stack">
          {[
            ...sessions.map((s) => ({ kind: 'session', ts: s.startedAt, s })),
            ...(fitbit?.detectedWorkouts || []).map((w) => ({ kind: 'detected', ts: w.startMs, w })),
          ]
            .sort((a, b) => b.ts - a.ts)
            .map((item) => {
              if (item.kind === 'detected') {
                const w = item.w
                const [label, icon] = exerciseTypeInfo(w.type)
                const d = new Date(w.startMs)
                const fmtTime = (ms) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={`d-${w.startMs}`} className="tile tile--ghost">
                    <div className="thumb" style={{ background: 'transparent', borderStyle: 'dashed' }}>
                      <i className={`fa-solid ${icon}`} />
                    </div>
                    <div className="tile-body">
                      <div className="tile-title">{label}</div>
                      <p className="small muted">
                        {d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{fmtTime(w.startMs)}{w.endMs ? ` → ${fmtTime(w.endMs)}` : ''}
                        <KcalChip result={kcalMap.get(`d-${w.startMs}`)} />
                      </p>
                    </div>
                    <span className="small muted"><i className="fa-solid fa-heart-pulse" /> Google</span>
                  </div>
                )
              }
              const s = item.s
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
                  <KcalChip result={kcalMap.get(s.id)} />
                </p>
              </div>
              )
            })}
          {/* L'asterisco senza spiegazione e' rumore: la legenda compare solo se in
              elenco c'e' almeno un valore stimato invece che misurato */}
          {[...kcalMap.values()].some((r) => r.source === 'stima') && (
            <p className="small muted center">
              * kcal stimate dal battito (la formula tende a leggere alto), non misurate dall'orologio
            </p>
          )}
        </div>
      )}

      {/* STREAK + KPI + completamento */}
      {tab === 'trends' && sessions?.length > 0 && (
        <>
          <StreakCard sessions={sessions} fitbit={fitbit} navigate={navigate} />

          <WeekGoals sessions={sessions} kcalById={kcalMap} onOpenGoals={() => navigate('/obiettivi')} />

          {fitbit && (
            <div className="card card--flat stack">
              <div className="row">
                <span className="label" style={{ margin: 0, flex: 1 }}>
                  Passi giornalieri <span className="small muted">(obiettivo {fitbit.stepsGoal.toLocaleString('it-IT')})</span>
                </span>
                <span className="chip">
                  oggi: {(fitbit.stepsByDay[localISO(new Date())] ?? 0).toLocaleString('it-IT')}
                </span>
              </div>
              <TrendChart
                type="line"
                labels={Object.keys(fitbit.stepsByDay).map((d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }))}
                datasets={[(() => {
                  const values = Object.values(fitbit.stepsByDay)
                  return {
                    label: 'Passi',
                    data: values,
                    borderColor: '#ff6b35',
                    backgroundColor: '#ff6b35',
                    borderWidth: 3,
                    tension: 0.35,
                    // giorni a zero: crocetta scura ben visibile invece del pallino
                    pointStyle: values.map((v) => (v === 0 ? 'crossRot' : 'circle')),
                    pointRadius: values.map((v) => (v === 0 ? 7 : 4)),
                    pointBackgroundColor: values.map((v) =>
                      v === 0 ? '#2b2b3c' : v >= fitbit.stepsGoal ? '#2ec4b6' : '#ffd23f'
                    ),
                    pointBorderColor: '#2b2b3c',
                    pointBorderWidth: 2,
                  }
                })()]}
              />
              <p className="small muted">
                Pallino teal = obiettivo raggiunto · giallo = sotto obiettivo · ✕ = nessun passo registrato
              </p>
            </div>
          )}

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

          <div className="row">
            <div className="card card--flat center" style={{ flex: 1, padding: '14px 8px' }}>
              <div className="kpi"><i className="fa-solid fa-medal" style={{ color: 'var(--primary)' }} /> {longestAppDayStreak(sessions)}</div>
              <p className="small muted">record giorni di fila (app)</p>
            </div>
            <div className="card card--flat center" style={{ flex: 1, padding: '14px 8px' }}>
              <div className="kpi"><i className="fa-solid fa-trophy" style={{ color: 'var(--teal)' }} /> {longestActivityStreakThisMonth(sessions, fitbit?.workoutDays)}</div>
              <p className="small muted">record del mese{fitbit ? ' (app + Google)' : ''}</p>
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

          {/* Niente grafico del volume aggregato: sommare i kg di esercizi diversi
              produce un numero che non corrisponde a nessuna grandezza reale. Il peso
              sollevato resta dov'e' confrontabile, cioe' dentro il singolo esercizio. */}
          {chrono.length > 0 && (
            <div className="card card--flat stack">
              <span className="label" style={{ margin: 0 }}>Durata media e frequenza</span>
              <TrendChart type="line" labels={chartLabels} datasets={durationData} />
            </div>
          )}

          <div className="stack">
            {trends.map((g) => (
              <div key={g.key} className="card card--flat stack" style={{ gap: 8 }}>
                <div className="row">
                  <h3 style={{ flex: 1 }}>{g.label}</h3>
                  <span className="chip">{g.count} allenament{g.count === 1 ? 'o' : 'i'}</span>
                </div>
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

/** Card streak: settimane di fila + calendario ultime 4 settimane (+ badge Fitbit) */
function StreakCard({ sessions, fitbit, navigate }) {
  const rest = daysSinceLast(sessions)
  const cal = last4Weeks(sessions)
  const dayNames = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

  // Allenamenti per giorno: la cella con il manubrio deve poter aprire la sessione,
  // se no il calendario dice "ti sei allenata" e poi obbliga a cercarla nell'elenco.
  const byDay = new Map()
  for (const s of sessions) {
    if (!s.startedAt) continue
    const d = new Date(s.startedAt)
    d.setHours(0, 0, 0, 0)
    const k = d.getTime()
    byDay.set(k, [...(byDay.get(k) || []), s])
  }
  // Piu' sessioni nello stesso giorno: si apre la prima: e' l'unico caso ambiguo e
  // resta comunque a un tocco di distanza dall'elenco completo.
  const openDay = (ts) => {
    const list = byDay.get(ts)
    if (list?.length) navigate(`/storico/${list[0].id}`)
  }

  return (
    <div className="card card--primary stack">
      {/* "3 settimane di fila" e' sparito a favore delle medaglie: era un numero che
          non diceva quali settimane, quante ne erano state saltate, ne' se prima fosse
          andata meglio. Resta il tempo dall'ultimo allenamento, che invece e' una cosa
          sola e si legge a colpo d'occhio. */}
      <div className="row">
        <span className="emoji-xl">🔥</span>
        <div className="kpi" style={{ flex: 1, minWidth: 96, fontSize: '1.1rem' }}>
          {rest === 0 ? 'Ti sei allenata oggi!' : rest === 1 ? '1 giorno dall’ultimo allenamento' : `${rest} giorni dall’ultimo allenamento`}
        </div>
      </div>

      {/* A tutta larghezza: con l'emoji accanto, le sei colonne scendevano sotto i
          cinquanta pixel e le date andavano a capo */}
      <WeekMedals sessions={sessions} />

      <div className="cal-grid">
        {dayNames.map((d, i) => (
          <span key={`h${i}`} className="small muted center" style={{ fontWeight: 800 }}>{d}</span>
        ))}
        {cal.map((c) => {
          const iso = localISO(new Date(c.ts))
          const goalHit = fitbit && (fitbit.stepsByDay[iso] || 0) >= fitbit.stepsGoal
          const detected = fitbit && fitbit.workoutDays.includes(iso)
          return (
            <div
              key={c.ts}
              className={`cal-cell ${c.trained ? 'cal-cell--on' : ''} ${c.isToday ? 'cal-cell--today' : ''} ${c.future ? 'cal-cell--future' : ''}`}
              role={c.trained ? 'button' : undefined}
              tabIndex={c.trained ? 0 : undefined}
              aria-label={c.trained ? `Apri l'allenamento del ${new Date(c.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}` : undefined}
              style={c.trained ? { cursor: 'pointer' } : undefined}
              onClick={() => c.trained && openDay(c.ts)}
              onKeyDown={(e) => c.trained && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDay(c.ts))}
            >
              {c.trained ? <i className="fa-solid fa-dumbbell" /> : c.dayNum}
              {(goalHit || detected) && (
                <span className="cal-badges">
                  {goalHit && <i className="fa-solid fa-shoe-prints" title="Obiettivo passi raggiunto" />}
                  {detected && <i className="fa-solid fa-heart-pulse" title="Allenamento rilevato da Google Health" />}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {fitbit && (
        <p className="small muted">
          <i className="fa-solid fa-shoe-prints" /> obiettivo passi · <i className="fa-solid fa-heart-pulse" /> allenamento rilevato da Google Health
        </p>
      )}
    </div>
  )
}
