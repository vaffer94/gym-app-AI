import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import ExerciseThumb from '../components/ExerciseThumb'
import { categoryById } from '../data/catalog'

export default function PlanDetailPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const repo = getRepo(user)
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    repo.getPlan(id).then(setPlan)
  }, [repo, id])

  if (!plan) return <div className="page center muted">Carico…</div>

  const duplicate = async () => {
    const name = prompt('Nome della copia:', `${plan.name} (copia)`)
    if (!name) return
    const copy = { ...plan, id: null, name, createdAt: null }
    const saved = await repo.savePlan(copy)
    navigate(`/schede/${saved.id}/modifica`)
  }

  const remove = async () => {
    if (!confirm(`Eliminare la scheda "${plan.name}"? Lo storico degli allenamenti non verrà toccato.`)) return
    await repo.deletePlan(plan.id)
    navigate('/schede')
  }

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/schede')} aria-label="Indietro">←</button>
        <div
          className="card card--flat"
          style={{ flex: 1, padding: '12px 16px', background: plan.color || 'var(--card)' }}
        >
          <h2>{plan.name}</h2>
          {plan.labels?.length > 0 && (
            <div className="chips-wrap" style={{ marginTop: 6 }}>
              {plan.labels.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          )}
        </div>
      </header>

      <div className="stack">
        {plan.exercises.map((e) => (
          <div key={e.key} className="tile">
            <ExerciseThumb image={e.image} category={e.category} />
            <div className="tile-body">
              <div className="tile-title">{e.name}</div>
              <p className="small muted">
                {categoryById(e.category).label} · {e.sets}×{e.reps}
                {e.hasWeight ? ` · ${e.weightKg} kg` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={() => navigate(`/schede/${plan.id}/modifica`)}>
          Modifica
        </button>
        <button className="btn" style={{ flex: 1 }} onClick={duplicate}>
          Duplica
        </button>
        <button className="btn" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={remove}>
          Elimina
        </button>
      </div>
    </div>
  )
}
