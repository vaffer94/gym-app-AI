import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import { formatDate } from '../data/planColors'

export default function SchedeListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repo = getRepo(user)
  const [plans, setPlans] = useState(null)

  useEffect(() => {
    repo.listPlans().then(setPlans)
  }, [repo])

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home"><i className="fa-solid fa-arrow-left" /></button>
        <h2>📋 Le tue schede</h2>
      </header>

      <button className="btn btn--primary btn--big" onClick={() => navigate('/schede/nuova')}>
        Nuova scheda
      </button>

      {plans === null && <p className="center muted">Carico…</p>}

      {plans?.length === 0 && (
        <div className="card center stack" style={{ padding: '40px 20px' }}>
          <span className="emoji-xl">📋</span>
          <p className="muted">Nessuna scheda ancora. Crea la tua prima!</p>
        </div>
      )}

      <div className="stack">
        {plans?.map((p) => (
          <div
            key={p.id}
            className="card card--tap"
            style={p.color ? { background: p.color } : undefined}
            onClick={() => navigate(`/schede/${p.id}`)}
          >
            <div className="row">
              <h3 style={{ flex: 1 }}>{p.name}</h3>
              <span className="small muted">{formatDate(p.createdAt)}</span>
            </div>
            <p className="small muted">
              {p.exercises.length} eserciz{p.exercises.length === 1 ? 'io' : 'i'}
            </p>
            {p.labels?.length > 0 && (
              <div className="chips-wrap" style={{ marginTop: 8 }}>
                {p.labels.map((l) => <span key={l} className="chip">{l}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
