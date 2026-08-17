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
import { isHealthConnected, getHealthSummary, localISO, exerciseTypeInfo } from '../data/health'
import { getTrackedActivityTypes, syncGoals } from '../data/goals'
import {
  allActivities, trackedActivities, activityDaysISO, dentroFinestra,
  inizioFinestra, isDoppione, FINESTRA_GIORNI,
} from '../data/activities'
import WeekGoals from '../components/WeekGoals'
import WeekMedals from '../components/WeekMedals'
import MonthBreakdown from '../components/MonthBreakdown'
import { resolveKcalMany } from '../data/kcal'
import { getWorkoutEnergy } from '../data/health'
import { KcalChip } from '../components/KcalRow'
import ExerciseStats from '../components/ExerciseStats'
import { exerciseIndex } from '../data/exerciseStats'
import Icona from '../icons'

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
  const [tab, setTab] = useState('trends') // trends (default) | list | exercises
  const [openExercise, setOpenExercise] = useState(null)
  // Cambiare scheda azzera l'esercizio aperto: se no si torna su "Esercizi" e ci si
  // ritrova dentro la Cyclette visitata dieci minuti prima, senza sapere perche'.
  const goTab = (t) => { setTab(t); setOpenExercise(null) }
  const [period, setPeriod] = useState('week')
  const [fitbit, setFitbit] = useState(null) // {stepsByDay, stepsGoal, workoutDays}
  const [fitbitError, setFitbitError] = useState(null)
  const [kcalMap, setKcalMap] = useState(new Map())
  // I tipi scelti stanno in localStorage, ma servono anche in stato: la
  // sincronizzazione col profilo puo' cambiarli mentre la pagina e' aperta, e
  // obiettivi e medaglie vanno ricalcolati subito, non al prossimo ingresso
  const [tracked, setTracked] = useState(getTrackedActivityTypes)
  const [, setObiettiviAllineati] = useState(0) // solo per ridisegnare dopo la sincronizzazione

  // Gli obiettivi possono essere stati cambiati da un altro dispositivo: qui si legge
  // l'obiettivo passi, quello di allenamenti e le attivita' scelte, e mostrarli vecchi
  // sarebbe peggio che non mostrarli
  useEffect(() => {
    let vivo = true
    syncGoals(repo).then((esito) => {
      if (!vivo || !esito.cambiato) return
      setTracked(getTrackedActivityTypes())
      setObiettiviAllineati((n) => n + 1)
    }).catch((e) => console.warn('Obiettivi non allineati col profilo:', e.message))
    return () => { vivo = false }
  }, [repo])

  useEffect(() => {
    repo.listSessions().then(setSessions)
  }, [repo])

  /**
   * Le attivita' di Google che finiscono in elenco restano le ultime 4 settimane, anche
   * se per i conteggi se ne tengono tre mesi: ogni riga costa due chiamate all'API per
   * le kcal, e tre mesi di camminate farebbero dell'elenco un rotolo.
   */
  const detectedRecenti = useMemo(() => {
    const da = Date.now() - 28 * 24 * 3600 * 1000
    return (fitbit?.detectedWorkouts || [])
      .filter((w) => w.startMs >= da)
      .map((w) => ({ ...w, doppione: isDoppione(w, sessions) }))
  }, [fitbit, sessions])

  // kcal di tutte le righe dell'elenco, allenamenti nostri e camminate rilevate da
  // Google insieme: per il conto e' solo un intervallo di tempo. Risolte in blocco e
  // con un freno sulle richieste in volo (vedi resolveKcalMany), non una per riga.
  useEffect(() => {
    const items = [
      ...(sessions || []).map((s) => ({
        id: s.id, startedAt: s.startedAt, endedAt: s.endedAt, hrAvg: s.hrAvg, pausedMs: s.pausedMs,
      })),
      // I doppioni non si chiedono: sono lo stesso intervallo di una sessione gia' in
      // elenco, quindi due chiamate all'API per riscrivere un numero che c'e' gia'
      ...detectedRecenti
        .filter((w) => w.endMs && !w.doppione)
        .map((w) => ({ id: `d-${w.startMs}`, startedAt: w.startMs, endedAt: w.endMs })),
    ].filter((i) => i.endedAt)
    if (!items.length) return
    let alive = true
    resolveKcalMany(items, { isConnected: isHealthConnected(), fetchEnergy: getWorkoutEnergy })
      .then((m) => alive && setKcalMap(m))
    return () => { alive = false }
  }, [sessions, detectedRecenti])

  /**
   * Tutto cio' che conta come allenamento: le sessioni dell'app piu' le attivita' di
   * Google scelte, senza i doppioni di quelle che l'app ha gia' registrato.
   */
  const activities = useMemo(
    () => allActivities(sessions, fitbit?.detectedWorkouts, tracked),
    [sessions, fitbit, tracked]
  )
  // Da quando le due fonti hanno entrambe dati: e' il periodo su cui si possono
  // confrontare settimane fra loro senza barare
  const daFinestra = useMemo(() => inizioFinestra(fitbit?.detectedRaw), [fitbit])
  const mesiFinestra = Math.round(FINESTRA_GIORNI / 30)
  // Solo i giorni delle attivita' scelte: le camminate riconosciute e non spuntate non
  // devono costruire strisce di allenamento che non sono avvenute
  const giorniGoogle = useMemo(
    () => activityDaysISO(trackedActivities(fitbit?.detectedWorkouts, sessions, tracked)),
    [fitbit, sessions, tracked]
  )

  const loadHealth = () =>
    getHealthSummary().then((d) => { setFitbit(d); setFitbitError(null) }).catch((e) => setFitbitError(e.message))

  useEffect(() => {
    if (isHealthConnected()) loadHealth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <Icona nome="indietro" />
        </button>
        <h2><Icona nome="storicoSezione" /> Storico</h2>
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
      </div>

      {sessions === null && <p className="center muted">Carico…</p>}

      {/* Se i dati di Google non arrivano, il calendario e i conteggi restano zoppi
          senza dirlo: qui si dice, e si manda dove si aggiusta */}
      {fitbitError && (
        <p className="small center" style={{ color: 'var(--danger)' }}>
          Google Health: {fitbitError} — vedi <a href="/integrazioni" onClick={(e) => { e.preventDefault(); navigate('/integrazioni') }}>Integrazioni</a>
        </p>
      )}

      {sessions?.length === 0 && (
        <div className="card center stack" style={{ padding: '40px 20px' }}>
          <Icona nome="allenamento" size="2.4rem" />
          <p className="muted">Nessun allenamento ancora. Il primo è il più importante!</p>
          <button className="btn btn--primary" onClick={() => navigate('/allenamento')}>Inizia ora</button>
        </div>
      )}

      {tab === 'exercises' && sessions?.length > 0 && (
        openExercise ? (
          <div className="stack">
            <button className="btn" onClick={() => setOpenExercise(null)}>
              <Icona nome="indietro" /> Tutti gli esercizi
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
                  <Icona nome="avanti" />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'list' && sessions?.length > 0 && (
        <div className="stack">
          {[
            ...sessions.map((s) => ({ kind: 'session', ts: s.startedAt, s })),
            ...detectedRecenti.map((w) => ({ kind: 'detected', ts: w.startMs, w })),
          ]
            .sort((a, b) => b.ts - a.ts)
            .map((item) => {
              if (item.kind === 'detected') {
                const w = item.w
                const [label, icon] = exerciseTypeInfo(w.type)
                const d = new Date(w.startMs)
                const fmtTime = (ms) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                // Conteggiata = tipo scelto e non gia' registrata dall'app. Il doppione
                // resta grafica da "vista e basta": non entra in nessun conto
                const conta = tracked.includes(w.type) && !w.doppione
                return (
                  <div key={`d-${w.startMs}`} className={`tile ${conta ? 'tile--counted' : 'tile--ghost'}`}>
                    <div
                      className="thumb"
                      style={{ background: 'transparent', borderStyle: conta ? 'solid' : 'dashed' }}
                    >
                      <Icona nome={icon} />
                    </div>
                    <div className="tile-body">
                      <div className="tile-title">{label}</div>
                      <p className="small muted">
                        {d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{fmtTime(w.startMs)}{w.endMs ? ` → ${fmtTime(w.endMs)}` : ''}
                        {!w.doppione && <KcalChip result={kcalMap.get(`d-${w.startMs}`)} />}
                      </p>
                      {/* Il doppione resta visibile invece di sparire: se un giorno il
                          filtro sbagliasse, una riga scomparsa non lo direbbe a nessuno */}
                      {w.doppione && (
                        <p className="small muted" style={{ margin: 0 }}>
                          Non conteggiata: è l’allenamento che hai già registrato con l’app
                        </p>
                      )}
                    </div>
                    <span className={`small ${conta ? '' : 'muted'}`}>
                      <Icona nome="battito" /> Google
                    </span>
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
                  <Icona nome="durata" /> {formatClock(st.durationSec)}
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
          {/* Due finestre diverse sembrerebbero un difetto se non si dicesse che sono
              due scelte: qui si scorre, altrove si conta */}
          {detectedRecenti.length > 0 && (
            <p className="small muted center">
              Le attività rilevate da Google sono mostrate per le ultime 4 settimane. Negli
              obiettivi e nei record ne valgono {mesiFinestra} mesi.
            </p>
          )}
        </div>
      )}

      {/* STREAK + KPI + completamento */}
      {tab === 'trends' && sessions?.length > 0 && (
        <>
          <StreakCard
            sessions={sessions}
            fitbit={fitbit}
            navigate={navigate}
            medaglie={dentroFinestra(activities, daFinestra)}
            mesiFinestra={mesiFinestra}
            giorniGoogle={giorniGoogle}
          />

          <WeekGoals activities={activities} kcalById={kcalMap} onOpenGoals={() => navigate('/obiettivi')} />

          <MonthBreakdown activities={activities} />

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
              <div className="kpi"><Icona nome="medaglia" style={{ color: 'var(--primary)' }} /> {longestAppDayStreak(sessions)}</div>
              <p className="small muted">record giorni di fila (app)</p>
            </div>
            <div className="card card--flat center" style={{ flex: 1, padding: '14px 8px' }}>
              <div className="kpi"><Icona nome="trofeo" style={{ color: 'var(--teal)' }} /> {longestActivityStreakThisMonth(sessions, giorniGoogle)}</div>
              <p className="small muted">record del mese{giorniGoogle.length ? ' (app + Google)' : ''}</p>
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
                    {pct === 100 ? <><Icona nome="fatto" style={{ color: 'var(--teal)' }} /> tutte</> : `${st.doneSeries}/${st.totalSeries}`}
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
function StreakCard({ sessions, fitbit, navigate, medaglie, mesiFinestra, giorniGoogle = [] }) {
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
        <Icona nome="energia" size="2.4rem" />
        <div className="kpi" style={{ flex: 1, minWidth: 96, fontSize: '1.1rem' }}>
          {rest === 0 ? 'Ti sei allenata oggi!' : rest === 1 ? '1 giorno dall’ultimo allenamento' : `${rest} giorni dall’ultimo allenamento`}
        </div>
      </div>

      {/* A tutta larghezza: con l'emoji accanto, le sei colonne scendevano sotto i
          cinquanta pixel e le date andavano a capo */}
      <WeekMedals activities={medaglie} mesiFinestra={mesiFinestra} />

      <div className="cal-grid">
        {dayNames.map((d, i) => (
          <span key={`h${i}`} className="small muted center" style={{ fontWeight: 800 }}>{d}</span>
        ))}
        {cal.map((c) => {
          const iso = localISO(new Date(c.ts))
          const goalHit = fitbit && (fitbit.stepsByDay[iso] || 0) >= fitbit.stepsGoal
          // Due cose diverse: la cornice e' un'attivita' che conta, il cuoricino e'
          // qualcosa che Google ha visto e che si e' scelto di non conteggiare. Un
          // giorno con l'attivita' conteggiata non mostra anche il cuoricino, se no
          // direbbe due volte la stessa cosa con due significati diversi.
          const conteggiata = giorniGoogle.includes(iso)
          const detected = !conteggiata && fitbit && fitbit.workoutDays.includes(iso)
          return (
            <div
              key={c.ts}
              className={`cal-cell ${c.trained ? 'cal-cell--on' : ''} ${conteggiata ? 'cal-cell--activity' : ''} ${c.isToday ? 'cal-cell--today' : ''} ${c.future ? 'cal-cell--future' : ''}`}
              role={c.trained ? 'button' : undefined}
              tabIndex={c.trained ? 0 : undefined}
              aria-label={c.trained ? `Apri l'allenamento del ${new Date(c.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}` : undefined}
              style={c.trained ? { cursor: 'pointer' } : undefined}
              onClick={() => c.trained && openDay(c.ts)}
              onKeyDown={(e) => c.trained && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDay(c.ts))}
            >
              {c.trained ? <Icona nome="pesi" /> : c.dayNum}
              {(goalHit || detected) && (
                <span className="cal-badges">
                  {goalHit && <Icona nome="passi" title="Obiettivo passi raggiunto" />}
                  {detected && <Icona nome="battito" title="Allenamento rilevato da Google Health" />}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {fitbit && (
        <p className="small muted">
          <Icona nome="pesi" /> allenamento registrato qui ·{' '}
          <span
            style={{
              display: 'inline-block', width: 12, height: 12, verticalAlign: '-1px',
              border: '2px solid var(--teal)', borderRadius: 3,
            }}
            aria-hidden="true"
          />{' '}
          attività conteggiata da Google · <Icona nome="passi" /> obiettivo
          passi · <Icona nome="battito" /> attività rilevata ma non conteggiata
        </p>
      )}
    </div>
  )
}
