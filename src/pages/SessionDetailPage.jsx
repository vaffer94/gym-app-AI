import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import { computeStats } from '../workout/sessionEngine'
import { formatClock } from '../workout/activeSession'
import { categoryById } from '../data/catalog'
import { ConfirmDialog } from '../components/Dialog'

export default function SessionDetailPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const repo = getRepo(user)

  const [session, setSession] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    repo.getSession(id).then(setSession)
  }, [repo, id])

  if (!session) return <div className="page center muted">Carico…</div>

  const st = computeStats(session)
  const date = new Date(session.startedAt)

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/storico')} aria-label="Indietro">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <div
          className="card card--flat"
          style={{ flex: 1, padding: '12px 16px', background: session.planColor || 'var(--card)' }}
        >
          <h2>{session.planName}</h2>
          <p className="small muted">
            {date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="card stack">
        <Row label="Durata" value={formatClock(st.durationSec)} />
        <Row
          label="Inizio → fine"
          value={`${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} → ${new Date(st.endedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
        />
        <Row label="Serie" value={`${st.doneSeries} / ${st.totalSeries}`} />
        <Row label="Esercizi completi" value={`${st.doneExercises} / ${st.totalExercises}${st.skipped ? ` (${st.skipped} saltati)` : ''}`} />
        {st.volumeKg > 0 && <Row label="Volume" value={`${st.volumeKg} kg`} />}
        {st.avgRestSec != null && <Row label="Recupero medio" value={`${st.avgRestSec}s (target ${st.restTargetSec}s)`} />}
      </div>

      {Object.keys(st.byCategory).length > 0 && (
        <div className="card card--flat stack">
          <span className="label" style={{ margin: 0 }}>Serie per categoria</span>
          {Object.entries(st.byCategory).map(([cat, n]) => (
            <Row key={cat} label={`${categoryById(cat).emoji} ${categoryById(cat).label}`} value={`${n} (${Math.round((n / st.doneSeries) * 100)}%)`} />
          ))}
        </div>
      )}

      <div className="card card--flat stack">
        <span className="label" style={{ margin: 0 }}>Esercizi</span>
        {session.exercises.map((e) => (
          <div key={e.key} className="stack" style={{ gap: 4, paddingBottom: 8, borderBottom: '2px dashed var(--paper)' }}>
            <Row
              label={e.name}
              value={e.skipped ? 'saltato' : `${e.series.filter((x) => x.done).length}/${e.sets} serie`}
            />
            {!e.skipped && (
              <p className="small muted">
                {e.mode === 'duration'
                  ? e.series[0]?.done && e.series[0].startedAt && e.series[0].doneAt
                    ? `durata ${formatClock(Math.round((e.series[0].doneAt - e.series[0].startedAt) / 1000))}`
                    : ''
                  : e.series
                      .filter((x) => x.done)
                      .map((x) => `${x.actualReps}${x.actualWeightKg != null ? `×${x.actualWeightKg}kg` : ''}`)
                      .join(' · ')}
                {e.mode !== 'duration' && e.startedAt && e.endedAt ? ` — ${formatClock(Math.round((e.endedAt - e.startedAt) / 1000))}` : ''}
              </p>
            )}
            {e.note && <p className="small">📝 {e.note}</p>}
          </div>
        ))}
      </div>

      <button
        className="btn"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        onClick={() => setConfirmDelete(true)}
      >
        <i className="fa-solid fa-trash-can" /> Elimina sessione
      </button>

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminare questa sessione?"
          message="Sparirà dallo storico e dalle statistiche."
          confirmLabel="Elimina"
          danger
          onConfirm={async () => {
            await repo.deleteSession(session.id)
            navigate('/storico')
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="row">
      <span className="small" style={{ flex: 1 }}>{label}</span>
      <span className="small" style={{ fontWeight: 800, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
