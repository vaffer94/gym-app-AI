import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import { categoryById } from '../data/catalog'
import {
  currentExercise, markSerieDone, updateSerieActuals, recordRest,
  postponeCurrent, skipCurrent, jumpTo, setNote, togglePause,
  finishSession, activeDuration, computeStats, getExercise,
  startSerie, nextUndoneSerie,
} from '../workout/sessionEngine'
import { ConfirmDialog, AlertDialog } from '../components/Dialog'
import { loadActive, saveActive, clearActive, formatClock } from '../workout/activeSession'
import { useWakeLock } from '../workout/useWakeLock'
import ExerciseThumb from '../components/ExerciseThumb'
import Stepper from '../components/Stepper'

const vibrate = (pattern = [300, 150, 300]) => navigator.vibrate?.(pattern)

export default function WorkoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repo = getRepo(user)

  const [state, setState] = useState(() => loadActive())
  const [, setTick] = useState(0)
  const [finished, setFinished] = useState(null)
  const [askNotes, setAskNotes] = useState(false)
  const [prevStats, setPrevStats] = useState(null)
  const [editingSerie, setEditingSerie] = useState(null) // {key, idx}
  const [noting, setNoting] = useState(null) // key esercizio per nota
  const [dialog, setDialog] = useState(null) // {type:'finish'|'skip'|'jump', key?} | {type:'alert', message}
  const savedRef = useRef(false)

  const session = state?.session
  const rest = state?.rest
  const paused = Boolean(session?.pauseStartedAt)

  useWakeLock(Boolean(session) && !finished)

  // orologio
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 500)
    return () => clearInterval(t)
  }, [])

  const update = (fn) =>
    setState((st) => {
      const next = fn(st)
      saveActive(next)
      return next
    })

  // fine recupero: vibra, registra durata effettiva e avvia in automatico
  // la prossima serie dello stesso esercizio (se ce n'è una)
  useEffect(() => {
    if (!session || !rest || paused || finished) return
    if (Date.now() < rest.endsAt) return
    vibrate()
    update((st) => {
      let s = recordRest(st.session, rest.key, rest.serieIdx, Math.round((rest.endsAt - rest.startedAt) / 1000))
      if (s.queue[0] === rest.key) {
        const idx = nextUndoneSerie(getExercise(s, rest.key))
        if (idx >= 0) s = startSerie(s, rest.key, idx)
      }
      return { session: s, rest: null }
    })
  })

  // allenamento completato automaticamente quando la coda è vuota
  useEffect(() => {
    if (session && !rest && !finished && session.queue.length === 0) beginFinish()
  })

  if (!session) {
    return (
      <div className="page center stack" style={{ paddingTop: '30vh' }}>
        <p className="muted">Nessun allenamento in corso.</p>
        <button className="btn btn--primary" onClick={() => navigate('/allenamento')}>Vai all'avvio</button>
      </div>
    )
  }

  const curr = currentExercise(session)

  function beginFinish() {
    const fin = finishSession(session)
    setFinished(fin)
    const executed = fin.exercises.filter((e) => e.series.some((x) => x.done) && !e.note)
    setAskNotes(executed.length > 0)
    if (executed.length === 0) persistFinished(fin)
  }

  async function persistFinished(fin) {
    if (savedRef.current) return
    savedRef.current = true
    clearActive()
    try {
      await repo.saveSession(fin)
      const all = await repo.listSessions()
      const prev = all.find(
        (x) => x.planId === fin.planId && x.id !== fin.id && x.status === 'completed' && x.startedAt < fin.startedAt
      )
      if (prev) setPrevStats(computeStats(prev))
    } catch (err) {
      console.error(err)
      setDialog({ type: 'alert', message: `Salvataggio sessione non riuscito: ${err.message}` })
    }
  }

  const handleStartSerie = (idx) =>
    update((st) => ({ ...st, session: startSerie(st.session, curr.key, idx) }))

  const doneSerie = (idx) => {
    const t = Date.now()
    update((st) => ({
      session: markSerieDone(st.session, curr.key, idx),
      rest: { key: curr.key, serieIdx: idx, startedAt: t, endsAt: t + st.session.restDefaultSec * 1000 },
    }))
  }

  const handlePause = () => {
    update((st) => {
      let nextRest = st.rest
      if (st.rest) {
        nextRest = st.session.pauseStartedAt
          ? { ...st.rest, endsAt: Date.now() + st.rest.remainingMs, remainingMs: undefined }
          : { ...st.rest, remainingMs: st.rest.endsAt - Date.now() }
      }
      return { session: togglePause(st.session), rest: nextRest }
    })
  }

  /* ---------- riepilogo finale ---------- */
  if (finished && !askNotes) {
    const stats = computeStats(finished)
    return <Summary stats={stats} prev={prevStats} planName={finished.planName} onHome={() => navigate('/')} />
  }

  /* ---------- richiesta note mancanti ---------- */
  if (finished && askNotes) {
    return (
      <NotesPrompt
        session={finished}
        onDone={(withNotes) => {
          setFinished(withNotes)
          setAskNotes(false)
          persistFinished(withNotes)
        }}
      />
    )
  }

  const elapsed = formatClock(activeDuration(session) / 1000)

  return (
    <div className="page">
      <header className="appbar">
        <span className="chip"><i className="fa-solid fa-stopwatch" /> {elapsed}</span>
        <div className="spacer" />
        <button className="btn btn--sm" onClick={handlePause}>
          <i className={`fa-solid ${paused ? 'fa-play' : 'fa-pause'}`} /> {paused ? 'Riprendi' : 'Pausa'}
        </button>
        <button
          className="btn btn--sm"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          onClick={() => setDialog({ type: 'finish' })}
        >
          Termina
        </button>
      </header>

      {paused && (
        <div className="sheet-backdrop">
          <div className="sheet center stack" style={{ padding: 32 }}>
            <span className="emoji-xl">⏸️</span>
            <h2>In pausa</h2>
            <p className="small muted">Il tempo di pausa non conta nelle statistiche</p>
            <button className="btn btn--primary btn--big" onClick={handlePause}>Riprendi</button>
          </div>
        </div>
      )}

      {rest ? (
        <RestView
          rest={rest}
          session={session}
          onPlusMinute={() => update((st) => ({ ...st, rest: { ...st.rest, endsAt: st.rest.endsAt + 60000 } }))}
          onSkip={() =>
            update((st) => ({
              session: recordRest(st.session, st.rest.key, st.rest.serieIdx, Math.round((Date.now() - st.rest.startedAt) / 1000)),
              rest: null,
            }))
          }
          onEditActuals={(actuals) =>
            update((st) => ({ ...st, session: updateSerieActuals(st.session, rest.key, rest.serieIdx, actuals) }))
          }
        />
      ) : curr ? (
        <>
          <div className="card" style={session.planColor ? { background: session.planColor } : undefined}>
            <p className="small muted" style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>
              Esercizio attuale
            </p>
            <div className="row" style={{ marginTop: 6 }}>
              <ExerciseThumb image={curr.image} category={curr.category} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2>{curr.name}</h2>
                <p className="small muted">
                  {categoryById(curr.category).emoji} {categoryById(curr.category).label}
                  {curr.hasWeight ? ` · target ${curr.weightKg} kg` : ''} · {curr.reps} ripetizioni
                </p>
              </div>
            </div>

            <div className="serie-grid" style={{ marginTop: 12 }}>
              {curr.series.map((s, i) => {
                const active = s.startedAt && !s.done
                const anyActive = curr.series.some((x) => x.startedAt && !x.done)
                return (
                  <button
                    key={i}
                    className={`serie ${s.done ? 'serie--done' : active ? 'serie--active' : ''}`}
                    onClick={() => {
                      if (s.done) setEditingSerie({ key: curr.key, idx: i })
                      else if (active) doneSerie(i)
                      else if (!anyActive) handleStartSerie(i)
                    }}
                  >
                    <span className="serie-num">{i + 1}</span>
                    {s.done ? (
                      <span className="small">✓ {s.actualReps}{s.actualWeightKg != null ? `×${s.actualWeightKg}kg` : ''}</span>
                    ) : active ? (
                      <span className="small" style={{ fontWeight: 800 }}>FINE SERIE</span>
                    ) : (
                      <span className="small muted">START</span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="small muted center" style={{ marginTop: 8 }}>
              START quando inizi la serie · FINE SERIE quando la completi · tocca una ✓ per correggerla
            </p>
          </div>

          <div className="row">
            <button className="btn" style={{ flex: 1 }} onClick={() => update((st) => ({ ...st, session: postponeCurrent(st.session) }))}>
              <i className="fa-solid fa-clock-rotate-left" /> Posticipa
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => setDialog({ type: 'skip' })}>
              <i className="fa-solid fa-forward" /> Salta
            </button>
            <button className="btn" onClick={() => setNoting(curr.key)}>
              <i className="fa-solid fa-pen-to-square" /> Nota
            </button>
          </div>

          {(curr.image || curr.description) && (
            <details className="card card--flat details">
              <summary className="label details-summary">
                <span>Come si fa</span>
                <span className="details-arrow">▾</span>
              </summary>
              <div className="row" style={{ alignItems: 'flex-start', marginTop: 10 }}>
                {curr.image && <ExerciseThumb image={curr.image} category={curr.category} />}
                <p className="small" style={{ flex: 1 }}>{curr.description || 'Nessuna descrizione'}</p>
              </div>
            </details>
          )}

          {session.queue.length > 1 && (
            <div className="field">
              <label className="label">Prossimi</label>
              <div className="stack">
                {session.queue.slice(1, 4).map((k) => {
                  const e = getExercise(session, k)
                  return (
                    <div key={k} className="tile tile--tap" onClick={() => setDialog({ type: 'jump', key: k })}>
                      <ExerciseThumb image={e.image} category={e.category} />
                      <div className="tile-body">
                        <div className="tile-title">{e.name}</div>
                        <p className="small muted">{e.sets}×{e.reps}{e.postponeCount > 0 ? ' · posticipato' : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : null}

      {editingSerie && (
        <SerieEditor
          serie={getExercise(session, editingSerie.key).series[editingSerie.idx]}
          hasWeight={getExercise(session, editingSerie.key).hasWeight}
          onClose={() => setEditingSerie(null)}
          onSave={(actuals) => {
            update((st) => ({ ...st, session: updateSerieActuals(st.session, editingSerie.key, editingSerie.idx, actuals) }))
            setEditingSerie(null)
          }}
        />
      )}

      {noting && (
        <NoteSheet
          initial={getExercise(session, noting).note}
          name={getExercise(session, noting).name}
          onClose={() => setNoting(null)}
          onSave={(text) => {
            update((st) => ({ ...st, session: setNote(st.session, noting, text) }))
            setNoting(null)
          }}
        />
      )}

      {dialog?.type === 'finish' && (
        <ConfirmDialog
          title="Terminare l'allenamento?"
          message="La sessione verrà salvata così com'è."
          confirmLabel="Termina"
          danger
          onConfirm={() => { setDialog(null); beginFinish() }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'skip' && (
        <ConfirmDialog
          title="Saltare questo esercizio?"
          message={`"${curr?.name}" non verrà riproposto in questa sessione.`}
          confirmLabel="Salta"
          danger
          onConfirm={() => { setDialog(null); update((st) => ({ ...st, session: skipCurrent(st.session) })) }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'jump' && (
        <ConfirmDialog
          title="Cambiare esercizio?"
          message={`Passi subito a "${getExercise(session, dialog.key)?.name}".`}
          confirmLabel="Vai"
          onConfirm={() => { setDialog(null); update((st) => ({ ...st, session: jumpTo(st.session, dialog.key) })) }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'alert' && (
        <AlertDialog message={dialog.message} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}

/* ---------- Recupero ---------- */

function RestView({ rest, session, onPlusMinute, onSkip, onEditActuals }) {
  const remaining = Math.max(0, (rest.endsAt - Date.now()) / 1000)
  const ex = getExercise(session, rest.key)
  const serie = ex.series[rest.serieIdx]
  const next = currentExercise(session)
  const exerciseDone = ex.series.every((s) => s.done)

  return (
    <>
      <div className="card card--teal center stack">
        <p className="small muted">Recupero</p>
        <div className="timer-hero">{formatClock(remaining)}</div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={onPlusMinute}>+1 min</button>
          <button className="btn btn--primary" onClick={onSkip}>Salta pausa</button>
        </div>
        {next && (
          <div className="tile" style={{ textAlign: 'left', width: '100%' }}>
            <ExerciseThumb
              image={exerciseDone ? next.image : ex.image}
              category={exerciseDone ? next.category : ex.category}
            />
            <div className="tile-body">
              <p className="small muted" style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>
                {exerciseDone ? 'Prossimo esercizio' : 'Poi tocca a'}
              </p>
              <div className="tile-title">
                {exerciseDone ? next.name : `${ex.name} — serie ${rest.serieIdx + 2} di ${ex.sets}`}
              </div>
              {exerciseDone && (
                <p className="small muted">{next.sets}×{next.reps}{next.hasWeight ? ` · ${next.weightKg} kg` : ''}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card card--flat stack">
        <p className="label" style={{ margin: 0 }}>Serie appena fatta — correggi se hai deviato</p>
        <div className="row">
          <span className="small muted" style={{ flex: 1 }}>Ripetizioni</span>
          <Stepper value={serie.actualReps} onChange={(v) => onEditActuals({ actualReps: v })} min={0} max={100} />
        </div>
        {ex.hasWeight && (
          <div className="row">
            <span className="small muted" style={{ flex: 1 }}>Peso</span>
            <Stepper value={serie.actualWeightKg ?? 0} onChange={(v) => onEditActuals({ actualWeightKg: v })} min={0} max={500} step={0.5} suffix=" kg" />
          </div>
        )}
      </div>
    </>
  )
}

/* ---------- Editor serie fatta ---------- */

function SerieEditor({ serie, hasWeight, onClose, onSave }) {
  const [reps, setReps] = useState(serie.actualReps)
  const [kg, setKg] = useState(serie.actualWeightKg ?? 0)
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <h2>Correggi serie</h2>
        <div className="row">
          <span className="label" style={{ margin: 0, flex: 1 }}>Ripetizioni</span>
          <Stepper value={reps} onChange={setReps} min={0} max={100} />
        </div>
        {hasWeight && (
          <div className="row">
            <span className="label" style={{ margin: 0, flex: 1 }}>Peso</span>
            <Stepper value={kg} onChange={setKg} min={0} max={500} step={0.5} suffix=" kg" />
          </div>
        )}
        <button className="btn btn--primary btn--big" onClick={() => onSave({ actualReps: reps, actualWeightKg: hasWeight ? kg : null })}>
          Salva
        </button>
      </div>
    </div>
  )
}

/* ---------- Nota esercizio ---------- */

function NoteSheet({ initial, name, onClose, onSave }) {
  const [text, setText] = useState(initial || '')
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <h2>Nota — {name}</h2>
        <textarea
          className="textarea"
          placeholder="Es. attrezzo occupato, usato 12kg invece di 15…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <button className="btn btn--primary btn--big" onClick={() => onSave(text)}>Salva nota</button>
      </div>
    </div>
  )
}

/* ---------- Note mancanti a fine allenamento ---------- */

function NotesPrompt({ session, onDone }) {
  const targets = session.exercises.filter((e) => e.series.some((x) => x.done) && !e.note)
  const [notes, setNotes] = useState({})

  const finishNotes = () => {
    let s = session
    for (const [key, text] of Object.entries(notes)) {
      if (text.trim()) s = setNote(s, key, text.trim())
    }
    onDone(s)
  }

  return (
    <div className="page">
      <h2>Note sull'allenamento</h2>
      <p className="small muted">Qualche nota sugli esercizi fatti? (facoltativo)</p>
      <div className="stack">
        {targets.map((e) => (
          <div key={e.key} className="card card--flat stack">
            <span className="label" style={{ margin: 0 }}>{e.name}</span>
            <textarea
              className="textarea"
              style={{ minHeight: 56 }}
              placeholder="Nessuna nota"
              value={notes[e.key] || ''}
              onChange={(ev) => setNotes((n) => ({ ...n, [e.key]: ev.target.value }))}
            />
          </div>
        ))}
      </div>
      <button className="btn btn--primary btn--big" onClick={finishNotes}>Continua</button>
    </div>
  )
}

/* ---------- Riepilogo ---------- */

function Summary({ stats, prev, planName, onHome }) {
  const delta = (a, b) => {
    if (b == null) return null
    const d = a - b
    return d === 0 ? '=' : d > 0 ? `+${Math.round(d)}` : `${Math.round(d)}`
  }
  return (
    <div className="page">
      <div className="center stack" style={{ paddingTop: 16 }}>
        <span className="emoji-xl">🎉</span>
        <h1>Fatto!</h1>
        <p className="muted">{planName}</p>
      </div>

      <div className="card stack">
        <StatRow label="Durata" value={formatClock(stats.durationSec)} />
        <StatRow
          label="Inizio → fine"
          value={`${new Date(stats.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} → ${new Date(stats.endedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
        />
        <StatRow label="Serie completate" value={`${stats.doneSeries} / ${stats.totalSeries}`} />
        <StatRow label="Esercizi completi" value={`${stats.doneExercises} / ${stats.totalExercises}${stats.skipped ? ` (${stats.skipped} saltati)` : ''}`} />
        {stats.volumeKg > 0 && <StatRow label="Volume sollevato" value={`${stats.volumeKg} kg`} />}
        {stats.avgRestSec != null && (
          <StatRow label="Recupero medio" value={`${stats.avgRestSec}s (target ${stats.restTargetSec}s)`} />
        )}
      </div>

      {Object.keys(stats.byCategory).length > 0 && (
        <div className="card card--flat stack">
          <span className="label" style={{ margin: 0 }}>Serie per categoria</span>
          {Object.entries(stats.byCategory).map(([cat, n]) => (
            <StatRow key={cat} label={`${categoryById(cat).emoji} ${categoryById(cat).label}`} value={`${Math.round((n / stats.doneSeries) * 100)}%`} />
          ))}
        </div>
      )}

      {prev && (
        <div className="card card--yellow stack">
          <span className="label" style={{ margin: 0 }}>Rispetto all'ultima volta</span>
          <StatRow label="Durata" value={`${formatClock(stats.durationSec)} (${delta(stats.durationSec / 60, prev.durationSec / 60)} min)`} />
          <StatRow label="Serie" value={`${stats.doneSeries} (${delta(stats.doneSeries, prev.doneSeries)})`} />
          {stats.volumeKg > 0 && <StatRow label="Volume" value={`${stats.volumeKg} kg (${delta(stats.volumeKg, prev.volumeKg)})`} />}
        </div>
      )}

      <div className="card card--flat stack">
        <span className="label" style={{ margin: 0 }}>Tempi per esercizio</span>
        {stats.perExercise.map((e) => (
          <StatRow
            key={e.key}
            label={e.name}
            value={e.skipped ? 'saltato' : `${e.done}/${e.sets} serie${e.durationSec ? ` · ${formatClock(e.durationSec)}` : ''}${e.avgRestSec ? ` · rec. ${e.avgRestSec}s` : ''}`}
          />
        ))}
      </div>

      <button className="btn btn--primary btn--big" onClick={onHome}>Torna alla home</button>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="row">
      <span className="small" style={{ flex: 1 }}>{label}</span>
      <span className="small" style={{ fontWeight: 800, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
