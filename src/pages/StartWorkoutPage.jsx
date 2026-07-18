import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import { formatDate } from '../data/planColors'
import { createSession } from '../workout/sessionEngine'
import { loadActive, saveActive, clearActive } from '../workout/activeSession'
import Stepper from '../components/Stepper'
import { ConfirmDialog } from '../components/Dialog'

export default function StartWorkoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repo = getRepo(user)

  const [plans, setPlans] = useState(null)
  const [selected, setSelected] = useState(null)
  const [choosing, setChoosing] = useState(false)
  const [restSec, setRestSec] = useState(60)
  const [pending, setPending] = useState(loadActive())
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    repo.listPlans().then((ps) => {
      setPlans(ps)
      setSelected((sel) => sel || ps[0] || null) // ultima creata/modificata
    })
  }, [repo])

  const start = () => {
    const session = createSession(selected, restSec)
    saveActive({ session, rest: null })
    navigate('/allenamento/attivo')
  }

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home"><i className="fa-solid fa-arrow-left" /></button>
        <h2>🔥 Allenamento</h2>
      </header>

      {pending?.session && (
        <div className="card card--yellow stack">
          <h3>Hai un allenamento in corso</h3>
          <p className="small muted">
            {pending.session.planName} — iniziato alle{' '}
            {new Date(pending.session.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="row">
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => navigate('/allenamento/attivo')}>
              Riprendi
            </button>
            <button className="btn" onClick={() => setConfirmDiscard(true)}>
              Scarta
            </button>
          </div>
        </div>
      )}

      {plans?.length === 0 && (
        <div className="card center stack" style={{ padding: '40px 20px' }}>
          <span className="emoji-xl">📋</span>
          <p className="muted">Prima crea una scheda!</p>
          <button className="btn btn--teal" onClick={() => navigate('/schede/nuova')}>Crea scheda</button>
        </div>
      )}

      {selected && (
        <>
          <div className="field">
            <label className="label">Scheda</label>
            <div className="card" style={selected.color ? { background: selected.color } : undefined}>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <h3>{selected.name}</h3>
                  <p className="small muted">
                    {selected.exercises.length} esercizi · creata il {formatDate(selected.createdAt)}
                  </p>
                </div>
                <button className="btn btn--sm" onClick={() => setChoosing(true)}>Cambia</button>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label">Recupero tra serie ed esercizi (in secondi)</label>
            <div className="card card--flat row">
              <span className="small muted" style={{ flex: 1 }}>
                {Math.floor(restSec / 60) > 0 ? `${Math.floor(restSec / 60)} min ` : ''}{restSec % 60 > 0 ? `${restSec % 60} sec` : ''} di pausa — durante l'allenamento puoi sempre aggiungere +1 min o saltare
              </span>
              <Stepper value={restSec} onChange={setRestSec} min={15} max={600} step={15} suffix=" sec" />
            </div>
          </div>

          <button className="btn btn--primary btn--big" style={{ fontSize: '1.5rem', padding: '24px' }} onClick={start}>
            START
          </button>
        </>
      )}

      {confirmDiscard && (
        <ConfirmDialog
          title="Scartare la sessione in corso?"
          message="I dati non salvati andranno persi."
          confirmLabel="Scarta"
          danger
          onConfirm={() => { clearActive(); setPending(null); setConfirmDiscard(false) }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}

      {choosing && (
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setChoosing(false)}>
          <div className="sheet">
            <div className="row">
              <h2>Scegli la scheda</h2>
              <div className="spacer" />
              <button className="btn btn--sm" onClick={() => setChoosing(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="stack">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="card card--tap card--flat"
                  style={p.color ? { background: p.color } : undefined}
                  onClick={() => { setSelected(p); setChoosing(false) }}
                >
                  <h3>{p.name}</h3>
                  <p className="small muted">{p.exercises.length} esercizi · {formatDate(p.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
