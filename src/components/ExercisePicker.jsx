import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, categoryById, EQUIPMENT_LABELS, loadCatalog, searchCatalog } from '../data/catalog'
import { compressPhoto } from '../lib/image'
import ExerciseThumb from './ExerciseThumb'
import Stepper from './Stepper'
import { AlertDialog } from './Dialog'

/**
 * Popup "ricerca-o-crea":
 * - cerchi nel catalogo (+ tuoi esercizi custom), filtri per categoria,
 *   selezioni -> configuri serie/reps/peso -> aggiungi alla scheda
 * - nessun match -> crei un esercizio custom in UN SOLO passaggio
 *   (nome, categoria, descrizione, foto, serie, reps, peso insieme)
 */
export default function ExercisePicker({ repo, onAdd, onClose }) {
  const [catalog, setCatalog] = useState(null)
  const [custom, setCustom] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadCatalog().then(setCatalog)
    repo.listCustomExercises().then(setCustom)
  }, [repo])

  const results = useMemo(() => {
    if (!catalog) return []
    const own = custom
      .filter((e) => (!category || e.category === category))
      .filter((e) => !query.trim() || e.name.toLowerCase().includes(query.trim().toLowerCase()))
      .map((e) => ({ ...e, isCustom: true }))
    return [...own, ...searchCatalog(catalog, query, category)].slice(0, 40)
  }, [catalog, custom, query, category])

  const done = (entry) => { onAdd(entry); onClose() }

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        {selected ? (
          <ConfigStep exercise={selected} onBack={() => setSelected(null)} onConfirm={done} />
        ) : creating ? (
          <CustomForm initialName={query} initialCategory={category} repo={repo} onBack={() => setCreating(false)} onDone={done} />
        ) : (
          <>
            <div className="row">
              <h2>Aggiungi esercizio</h2>
              <div className="spacer" />
              <button className="btn btn--sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
            </div>

            <input
              className="input"
              placeholder="Cerca o scrivi un nuovo esercizio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            <div className="chips-wrap">
              {CATEGORIES.map((c) => (
                <span
                  key={c.id}
                  className={`chip chip--select ${category === c.id ? 'chip--on' : ''}`}
                  onClick={() => setCategory(category === c.id ? null : c.id)}
                >
                  {c.emoji} {c.label}
                </span>
              ))}
            </div>

            {!catalog && <p className="center muted">Carico il catalogo…</p>}

            <div className="stack">
              {results.map((e) => (
                <div key={(e.isCustom ? 'c-' : '') + e.id} className="tile tile--tap" onClick={() => setSelected(e)}>
                  <ExerciseThumb image={e.image || e.photo} category={e.category} />
                  <div className="tile-body">
                    <div className="tile-title">{e.name}</div>
                    <p className="small muted">
                      {categoryById(e.category).label}
                      {e.equipment ? ` · ${EQUIPMENT_LABELS[e.equipment] || e.equipment}` : ''}
                      {e.isCustom ? ' · tuo' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {catalog && (
              <button className="btn btn--teal btn--big" onClick={() => setCreating(true)}>
                {query.trim() ? `Crea "${query.trim()}"` : 'Crea esercizio personalizzato'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** Configurazione serie/reps/peso per un esercizio esistente (catalogo o custom) */
function ConfigStep({ exercise, onBack, onConfirm }) {
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(12)
  const [hasWeight, setHasWeight] = useState(true)
  const [weightKg, setWeightKg] = useState(10)
  const [isDuration, setIsDuration] = useState(false)
  const [durationMin, setDurationMin] = useState(20)
  const [photoOverride, setPhotoOverride] = useState(null)
  const [alertMsg, setAlertMsg] = useState(null)

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setPhotoOverride(await compressPhoto(file)) } catch { setAlertMsg('Foto non valida, riprova') }
  }

  const confirm = () =>
    onConfirm({
      key: newKey(),
      refType: exercise.isCustom ? 'custom' : 'catalog',
      refId: exercise.id,
      name: exercise.name,
      category: exercise.category,
      image: photoOverride || exercise.image || exercise.photo || null,
      description: exercise.description || exercise.instructions || '',
      mode: isDuration ? 'duration' : 'reps',
      durationSec: isDuration ? durationMin * 60 : null,
      sets: isDuration ? 1 : sets,
      reps: isDuration ? null : reps,
      hasWeight: isDuration ? false : hasWeight,
      weightKg: !isDuration && hasWeight ? weightKg : null,
    })

  return (
    <>
      <div className="row">
        <button className="btn btn--sm" onClick={onBack}><i className="fa-solid fa-arrow-left" /></button>
        <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exercise.name}</h2>
      </div>

      <div className="row">
        <ExerciseThumb image={photoOverride || exercise.image || exercise.photo} category={exercise.category} />
        <label className="btn btn--sm">
          {photoOverride ? 'Cambia la tua foto' : 'Usa una tua foto'}
          <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
        </label>
      </div>

      <DurationToggle isDuration={isDuration} setIsDuration={setIsDuration} durationMin={durationMin} setDurationMin={setDurationMin} />

      {!isDuration && (
        <SetsRepsWeight
          sets={sets} setSets={setSets}
          reps={reps} setReps={setReps}
          hasWeight={hasWeight} setHasWeight={setHasWeight}
          weightKg={weightKg} setWeightKg={setWeightKg}
        />
      )}

      <button className="btn btn--primary btn--big" onClick={confirm}>
        Aggiungi alla scheda
      </button>
      {alertMsg && <AlertDialog message={alertMsg} onClose={() => setAlertMsg(null)} />}
    </>
  )
}

/** Toggle "esercizio a tempo": solo durata, niente serie/reps/peso (es. tapis roulant) */
export function DurationToggle({ isDuration, setIsDuration, durationMin, setDurationMin }) {
  return (
    <div className="card card--flat stack">
      <label className="toggle">
        <input type="checkbox" checked={isDuration} onChange={(e) => setIsDuration(e.target.checked)} />
        <span className="label" style={{ margin: 0 }}>
          <i className="fa-solid fa-stopwatch" /> A tempo (solo durata)
        </span>
      </label>
      {isDuration && (
        <div className="row">
          <span className="label" style={{ margin: 0, flex: 1 }}>Durata</span>
          <Stepper value={durationMin} onChange={setDurationMin} min={1} max={240} step={1} suffix=" min" />
        </div>
      )}
    </div>
  )
}

/** Creazione esercizio custom: tutto in un solo passaggio */
function CustomForm({ initialName, initialCategory, repo, onBack, onDone }) {
  const [name, setName] = useState(initialName.trim())
  const [category, setCategory] = useState(initialCategory || null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(12)
  const [hasWeight, setHasWeight] = useState(true)
  const [weightKg, setWeightKg] = useState(10)
  const [isDuration, setIsDuration] = useState(false)
  const [durationMin, setDurationMin] = useState(20)
  const [busy, setBusy] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setPhoto(await compressPhoto(file)) } catch { setAlertMsg('Foto non valida, riprova') }
  }

  const save = async () => {
    setBusy(true)
    try {
      const ex = await repo.saveCustomExercise({
        name: name.trim(), category, description, photo: photo || null,
      })
      onDone({
        key: newKey(),
        refType: 'custom',
        refId: ex.id,
        name: ex.name,
        category: ex.category,
        image: ex.photo || null,
        description: ex.description || '',
        mode: isDuration ? 'duration' : 'reps',
        durationSec: isDuration ? durationMin * 60 : null,
        sets: isDuration ? 1 : sets,
        reps: isDuration ? null : reps,
        hasWeight: isDuration ? false : hasWeight,
        weightKg: !isDuration && hasWeight ? weightKg : null,
      })
    } catch (err) {
      console.error(err)
      setAlertMsg(`Salvataggio non riuscito: ${err.message}`)
      setBusy(false)
    }
  }

  return (
    <>
      <div className="row">
        <button className="btn btn--sm" onClick={onBack}><i className="fa-solid fa-arrow-left" /></button>
        <h2>Nuovo esercizio</h2>
      </div>

      <div className="field">
        <label className="label">Nome</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Alzate laterali al cavo" />
      </div>

      <div className="field">
        <label className="label">Categoria</label>
        <div className="chips-wrap">
          {CATEGORIES.map((c) => (
            <span
              key={c.id}
              className={`chip chip--select ${category === c.id ? 'chip--on' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      </div>

      <DurationToggle isDuration={isDuration} setIsDuration={setIsDuration} durationMin={durationMin} setDurationMin={setDurationMin} />

      {!isDuration && (
        <SetsRepsWeight
          sets={sets} setSets={setSets}
          reps={reps} setReps={setReps}
          hasWeight={hasWeight} setHasWeight={setHasWeight}
          weightKg={weightKg} setWeightKg={setWeightKg}
        />
      )}

      <div className="field">
        <label className="label">Descrizione (facoltativa)</label>
        <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="field">
        <label className="label">Foto (facoltativa)</label>
        <div className="row">
          {photo && <ExerciseThumb image={photo} category={category} />}
          <label className="btn">
            {photo ? 'Cambia foto' : 'Scatta o carica'}
            <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
          </label>
        </div>
      </div>

      <button className="btn btn--primary btn--big" disabled={!name.trim() || !category || busy} onClick={save}>
        Crea e aggiungi alla scheda
      </button>
      {alertMsg && <AlertDialog message={alertMsg} onClose={() => setAlertMsg(null)} />}
    </>
  )
}

/** Blocco riusabile serie / ripetizioni / pesi */
export function SetsRepsWeight({ sets, setSets, reps, setReps, hasWeight, setHasWeight, weightKg, setWeightKg }) {
  return (
    <div className="card card--flat stack">
      <div className="row">
        <span className="label" style={{ margin: 0, flex: 1 }}>Serie</span>
        <Stepper value={sets} onChange={setSets} min={1} max={20} />
      </div>
      <div className="row">
        <span className="label" style={{ margin: 0, flex: 1 }}>Ripetizioni</span>
        <Stepper value={reps} onChange={setReps} min={1} max={100} />
      </div>
      <label className="toggle">
        <input type="checkbox" checked={hasWeight} onChange={(e) => setHasWeight(e.target.checked)} />
        <span className="label" style={{ margin: 0 }}>Con pesi</span>
      </label>
      {hasWeight && (
        <div className="row">
          <span className="label" style={{ margin: 0, flex: 1 }}>Peso</span>
          <Stepper value={weightKg} onChange={setWeightKg} min={0.5} max={500} step={0.5} suffix=" kg" />
        </div>
      )}
    </div>
  )
}
