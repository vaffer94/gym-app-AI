import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getRepo } from '../data/repo'
import ExercisePicker, { SetsRepsWeight } from '../components/ExercisePicker'
import ExerciseThumb from '../components/ExerciseThumb'
import { PLAN_COLORS, pickDefaultColor } from '../data/planColors'
import { formatEntryTarget } from '../data/format'
import { AlertDialog } from '../components/Dialog'
import Stepper from '../components/Stepper'

export default function PlanEditorPage() {
  const { user } = useAuth()
  const { id } = useParams() // undefined = nuova scheda
  const navigate = useNavigate()
  const repo = getRepo(user)

  const [plan, setPlan] = useState({ name: '', labels: [], exercises: [], color: null })
  const [allLabels, setAllLabels] = useState([])
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState(null) // entry esercizio in modifica
  const [busy, setBusy] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)

  useEffect(() => {
    repo.getLabels().then(setAllLabels)
    if (id) {
      repo.getPlan(id).then((p) => p && setPlan(p))
    } else {
      // colore di default: casuale tra quelli non usati dalle altre schede
      repo.listPlans().then((plans) => {
        const used = plans.map((p) => p.color).filter(Boolean)
        setPlan((p) => (p.color ? p : { ...p, color: pickDefaultColor(used) }))
      })
    }
  }, [repo, id])

  const toggleLabel = (l) =>
    setPlan((p) => ({
      ...p,
      labels: p.labels.includes(l) ? p.labels.filter((x) => x !== l) : [...p.labels, l],
    }))

  const addNewLabel = (raw) => {
    const l = raw.trim()
    if (!l) return
    if (!allLabels.includes(l)) setAllLabels((a) => [...a, l])
    setPlan((p) => (p.labels.includes(l) ? p : { ...p, labels: [...p.labels, l] }))
  }

  const deleteLabel = async (l) => {
    setAllLabels((a) => a.filter((x) => x !== l))
    setPlan((p) => ({ ...p, labels: p.labels.filter((x) => x !== l) }))
    try {
      await repo.removeLabel(l)
    } catch (err) {
      console.error(err)
      setAlertMsg(`Eliminazione non riuscita: ${err.message}`)
    }
  }

  const move = (index, dir) =>
    setPlan((p) => {
      const ex = [...p.exercises]
      const j = index + dir
      if (j < 0 || j >= ex.length) return p
      ;[ex[index], ex[j]] = [ex[j], ex[index]]
      return { ...p, exercises: ex }
    })

  const removeExercise = (key) =>
    setPlan((p) => ({ ...p, exercises: p.exercises.filter((e) => e.key !== key) }))

  const save = async () => {
    setBusy(true)
    try {
      await repo.addLabels(plan.labels)
      await repo.savePlan(plan)
      navigate('/schede')
    } catch (err) {
      console.error(err)
      setAlertMsg(`Salvataggio non riuscito: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const valid = plan.name.trim() && plan.exercises.length > 0

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate(-1)} aria-label="Indietro"><i className="fa-solid fa-arrow-left" /></button>
        <h2>{id ? 'Modifica scheda' : 'Nuova scheda'}</h2>
      </header>

      <div className="field">
        <label className="label">Nome della scheda</label>
        <input
          className="input"
          placeholder="Es. Push A, Gambe lunedì…"
          value={plan.name}
          onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
        />
      </div>

      <div className="field">
        <label className="label">Colore</label>
        <div className="swatches">
          {PLAN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${plan.color === c ? 'swatch--on' : ''}`}
              style={{ background: c }}
              onClick={() => setPlan((p) => ({ ...p, color: c }))}
              aria-label={`Colore ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Finalità</label>
        <FinalitaDropdown
          allLabels={allLabels}
          selected={plan.labels}
          onToggle={toggleLabel}
          onAddNew={addNewLabel}
          onDelete={deleteLabel}
        />
      </div>

      <div className="field">
        <label className="label">Esercizi ({plan.exercises.length})</label>
        <div className="stack">
          {plan.exercises.map((e, i) => (
            <div key={e.key} className="tile">
              <div className="row tile--tap" style={{ flex: 1, minWidth: 0 }} onClick={() => setEditing(e)}>
                <ExerciseThumb image={e.image} category={e.category} />
                <div className="tile-body">
                  <div className="tile-title">{e.name}</div>
                  <p className="small muted">{formatEntryTarget(e)}</p>
                </div>
              </div>
              <div className="stack" style={{ gap: 4 }}>
                <button className="btn btn--sm" onClick={() => move(i, -1)} disabled={i === 0}><i className="fa-solid fa-arrow-up" /></button>
                <button className="btn btn--sm" onClick={() => move(i, 1)} disabled={i === plan.exercises.length - 1}><i className="fa-solid fa-arrow-down" /></button>
              </div>
              <button className="btn btn--sm" onClick={() => removeExercise(e.key)} aria-label="Rimuovi"><i className="fa-solid fa-xmark" /></button>
            </div>
          ))}
        </div>
        <button className="btn btn--teal btn--big" style={{ marginTop: 12 }} onClick={() => setPicking(true)}>
          Aggiungi esercizio
        </button>
      </div>

      <button className="btn btn--primary btn--big" disabled={!valid || busy} onClick={save}>
        {id ? 'Salva modifiche' : 'Convalida scheda'}
      </button>

      {picking && (
        <ExercisePicker
          repo={repo}
          onClose={() => setPicking(false)}
          onAdd={(entry) => setPlan((p) => ({ ...p, exercises: [...p.exercises, entry] }))}
        />
      )}

      {alertMsg && <AlertDialog message={alertMsg} onClose={() => setAlertMsg(null)} />}

      {editing && (
        <EditEntrySheet
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            setPlan((p) => ({
              ...p,
              exercises: p.exercises.map((e) => (e.key === updated.key ? updated : e)),
            }))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/** Popup di modifica di un esercizio già nella scheda (serie/reps/peso oppure durata) */
function EditEntrySheet({ entry, onClose, onSave }) {
  const isDuration = entry.mode === 'duration'
  const [sets, setSets] = useState(entry.sets)
  const [reps, setReps] = useState(entry.reps ?? 12)
  const [hasWeight, setHasWeight] = useState(entry.hasWeight)
  const [weightKg, setWeightKg] = useState(entry.weightKg ?? 10)
  const [durationMin, setDurationMin] = useState(Math.round((entry.durationSec || 1200) / 60))

  const save = () =>
    onSave(
      isDuration
        ? { ...entry, durationSec: durationMin * 60 }
        : { ...entry, sets, reps, hasWeight, weightKg: hasWeight ? weightKg : null }
    )

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="row">
          <ExerciseThumb image={entry.image} category={entry.category} />
          <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {entry.name}
          </h2>
          <button className="btn btn--sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        {isDuration ? (
          <div className="card card--flat row">
            <span className="label" style={{ margin: 0, flex: 1 }}>
              <i className="fa-solid fa-stopwatch" /> Durata
            </span>
            <Stepper value={durationMin} onChange={setDurationMin} min={1} max={240} step={1} suffix=" min" />
          </div>
        ) : (
          <SetsRepsWeight
            sets={sets} setSets={setSets}
            reps={reps} setReps={setReps}
            hasWeight={hasWeight} setHasWeight={setHasWeight}
            weightKg={weightKg} setWeightKg={setWeightKg}
          />
        )}

        <button className="btn btn--primary btn--big" onClick={save}>
          Salva
        </button>
      </div>
    </div>
  )
}

/** Dropdown con checklist delle finalità passate + inserimento di una nuova */
function FinalitaDropdown({ allLabels, selected, onToggle, onAddNew, onDelete }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const addNew = () => {
    if (!text.trim()) return
    onAddNew(text)
    setText('')
  }

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="input dropdown-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={selected.length ? '' : 'muted'}>
          {selected.length ? selected.join(', ') : 'Scegli le finalità…'}
        </span>
        <span>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="dropdown-panel">
          {allLabels.length === 0 && (
            <p className="small muted" style={{ padding: '4px 8px' }}>
              Nessuna finalità ancora: scrivi la prima qui sotto
            </p>
          )}
          {allLabels.map((l) => (
            <label key={l} className="dropdown-item">
              <input type="checkbox" checked={selected.includes(l)} onChange={() => onToggle(l)} />
              <span style={{ flex: 1 }}>{l}</span>
              <button
                type="button"
                className="btn btn--sm"
                aria-label={`Elimina finalità ${l}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(l) }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </label>
          ))}
          <div className="row" style={{ marginTop: 6 }}>
            <input
              className="input"
              placeholder="Nuova finalità…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNew())}
            />
            <button type="button" className="btn btn--sm" onClick={addNew} disabled={!text.trim()}>
              Aggiungi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
