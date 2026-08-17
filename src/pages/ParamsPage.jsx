import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Stepper from '../components/Stepper'
import { getProfileDraft, setProfile, getWeightLog } from '../data/kcal'
import Icona from '../icons'

/**
 * Parametri personali: pagina a se' e non piu' un riquadro aperto in home.
 *
 * Non sono un collegamento a un servizio esterno (per questo non stanno fra le
 * integrazioni), ma non sono nemmeno roba di tutti i giorni: il peso si aggiorna una
 * volta ogni tanto, altezza ed eta' una volta e basta. Tenerli aperti in home voleva
 * dire dare a un dato che si tocca di rado lo stesso spazio dei tre gesti quotidiani.
 *
 * Il peso e' in evidenza perche' e' l'unico che cambia nel tempo — ed e' l'unico che
 * ha senso rappresentare con un grafico. Gli altri campi stanno sotto, sempre aperti:
 * il pieghevole aveva senso in home, dove rubava spazio; in una pagina sua nasconderli
 * aggiunge solo un tocco per arrivare a un campo che si viene apposta a cercare.
 */
export default function ParamsPage() {
  const navigate = useNavigate()
  const [p, setP] = useState(getProfileDraft)
  const [log, setLog] = useState(getWeightLog)

  const save = (next) => {
    setP(next)
    setProfile(next)
    setLog(getWeightLog())
  }

  const first = log[0]
  const last = log[log.length - 1]
  const delta = log.length > 1 ? last.kg - first.kg : null

  return (
    <div className="page">
      <header className="appbar">
        <button className="btn" onClick={() => navigate('/')} aria-label="Torna alla home">
          <Icona nome="indietro" />
        </button>
        <h2>⚖️ Parametri</h2>
      </header>

      <div className="card stack">
        <p className="small muted">
          Servono a stimare le kcal degli allenamenti quando Google Health non ha dati
          per quell’intervallo.
        </p>

        <div className="row">
          <span className="label" style={{ margin: 0, flex: 1, minWidth: 96 }}>Peso (kg)</span>
          <Stepper value={p.weightKg} onChange={(v) => save({ ...p, weightKg: v })} min={30} max={200} step={0.5} />
        </div>

        {log.length >= 2 ? (
          <>
            <WeightSparkline log={log} />
            <p className="small muted" style={{ margin: 0 }}>
              {fmtDate(first.date)} → oggi:{' '}
              <strong>
                {delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10} kg
              </strong>{' '}
              in {log.length} misurazioni
            </p>
          </>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            Il grafico dell'andamento compare dalla seconda misurazione: una sola non è una tendenza.
          </p>
        )}

        {/* Niente pieghevole: aveva senso quando questa roba stava aperta in home e
            rubava spazio ai gesti quotidiani. Ora che e' una pagina sua, nasconderla
            aggiunge solo un tocco per arrivare a un campo che si viene apposta a vedere */}
        <div className="stack" style={{ borderTop: '2px dashed var(--paper)', paddingTop: 10 }}>
          <div className="row">
            <span className="label" style={{ margin: 0, flex: 1, minWidth: 96 }}>Altezza (cm)</span>
            <Stepper value={p.heightCm} onChange={(v) => save({ ...p, heightCm: v })} min={120} max={220} step={1} />
          </div>
          <div className="row">
            <span className="label" style={{ margin: 0, flex: 1, minWidth: 96 }}>Età</span>
            <Stepper value={p.ageYears} onChange={(v) => save({ ...p, ageYears: v })} min={12} max={99} step={1} />
          </div>
          <div className="row">
            <span className="label" style={{ margin: 0, flex: 1, minWidth: 96 }}>Sesso biologico</span>
            <div className="chips-wrap">
              <span className={`chip chip--select ${p.sex === 'f' ? 'chip--on' : ''}`} onClick={() => save({ ...p, sex: 'f' })}>F</span>
              <span className={`chip chip--select ${p.sex === 'm' ? 'chip--on' : ''}`} onClick={() => save({ ...p, sex: 'm' })}>M</span>
            </div>
          </div>
          <p className="small muted">
            Altezza, età e sesso servono al calcolo del metabolismo basale con l’equazione
            di <strong>Mifflin-St Jeor</strong>, la più affidabile fra quelle predittive.
            Il battito diventa kcal con la formula di <strong>Keytel (2005)</strong>, che è
            validata per sesso biologico: la stima vale ±15-20%.
          </p>
        </div>
      </div>
    </div>
  )
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

/**
 * Sparkline in SVG puro: qui serve la forma della curva, non un asse leggibile al
 * grammo, e non vale la pena tirarsi dietro chart.js nella schermata iniziale.
 *
 * L'asse verticale NON parte da zero ma dal minimo misurato: su un peso corporeo la
 * variazione utile e' di un paio di chili, e uno zero a fondo scala la appiattirebbe
 * fino a farla sparire. Per questo agli estremi sono scritti i valori veri.
 */
function WeightSparkline({ log }) {
  const W = 300
  const H = 68
  const PAD = 6

  const values = log.map((e) => e.kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1 // tutte le misure uguali: linea piatta a meta' altezza

  const x = (i) => PAD + (i / Math.max(1, log.length - 1)) * (W - PAD * 2)
  const y = (kg) => PAD + (1 - (kg - min) / span) * (H - PAD * 2)

  const points = log.map((e, i) => `${x(i).toFixed(1)},${y(e.kg).toFixed(1)}`).join(' ')
  const lastI = log.length - 1

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block' }}
        role="img"
        aria-label={`Andamento del peso: da ${log[0].kg} a ${log[lastI].kg} kg`}
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {log.map((e, i) => (
          <circle
            key={e.date}
            cx={x(i)}
            cy={y(e.kg)}
            r={i === lastI ? 5 : 3}
            fill={i === lastI ? 'var(--primary)' : 'var(--card)'}
            stroke="var(--ink)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="small muted">min {min} kg</span>
        <span className="small muted">max {max} kg</span>
      </div>
    </div>
  )
}
