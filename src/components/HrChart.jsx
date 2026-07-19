import { useEffect, useMemo, useRef, useState } from 'react'
import { exerciseColor } from '../data/planColors'

/**
 * Grafico HR della sessione (step 6): linea del battito nel tempo sopra le bande
 * colorate degli esercizi (stessa palette per-esercizio dell'app watch); lo sfondo
 * neutro tra le bande e' recupero/pausa.
 *
 * I pastelli da soli non sono distinguibili in modo affidabile (validati: ΔE
 * adiacente ~4.5), quindi l'identita' NON e' affidata al colore: ogni banda ha il
 * nome scritto sopra, c'e' la legenda e il tooltip dice sempre in che esercizio sei.
 */

const INK = '#2b2b3c'
const MUTED = '#63637a'
const GRID = 'rgba(43, 43, 60, 0.12)'

// Altezza fissa; la larghezza logica segue quella reale del contenitore
// (ResizeObserver) cosi' i font restano a dimensione vera anche su telefono
const H = 240
const M = { top: 24, right: 10, bottom: 26, left: 40 }
const PH = H - M.top - M.bottom

function fmtMin(sec) {
  return `${Math.round(sec / 60)}′`
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Bande esercizio: [prima serie fatta → ultima], colore per posizione nella scheda */
function buildSegments(session) {
  const t0 = session.startedAt
  return (session.exercises || [])
    .map((e, i) => {
      const dones = (e.series || []).filter((s) => s.done && s.doneAt)
      const start = e.startedAt ?? (dones.length ? Math.min(...dones.map((s) => s.doneAt)) : null)
      const end = e.endedAt ?? (dones.length ? Math.max(...dones.map((s) => s.doneAt)) : null)
      if (start == null || end == null || end - start < 1000) return null
      return { name: e.name, color: exerciseColor(i), startSec: (start - t0) / 1000, endSec: (end - t0) / 1000 }
    })
    .filter(Boolean)
}

export default function HrChart({ session }) {
  const wrapRef = useRef(null)
  const [hover, setHover] = useState(null) // indice del campione
  const [W, setW] = useState(640)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setW(Math.max(320, Math.round(entries[0].contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const PW = W - M.left - M.right

  const model = useMemo(() => {
    const t = session.hrT || []
    const bpm = session.hrBpm || []
    const points = t.map((sec, i) => ({ sec, bpm: bpm[i] })).filter((p) => p.bpm != null)
    if (points.length < 2) return null

    const segments = buildSegments(session)
    const sessionEndSec = session.endedAt ? (session.endedAt - session.startedAt) / 1000 : points[points.length - 1].sec
    const tMax = Math.max(sessionEndSec, points[points.length - 1].sec, 60)

    const bpmValues = points.map((p) => p.bpm)
    const yMin = Math.max(0, Math.floor((Math.min(...bpmValues) - 8) / 10) * 10)
    const yMax = Math.ceil((Math.max(...bpmValues) + 8) / 10) * 10

    const x = (sec) => M.left + (sec / tMax) * PW
    const y = (v) => M.top + PH - ((v - yMin) / (yMax - yMin)) * PH

    // Tick y: 4 step "tondi"; tick x: passo scelto per avere <=6 etichette
    const ySpan = yMax - yMin
    const yStep = ySpan <= 40 ? 10 : ySpan <= 80 ? 20 : 40
    const yTicks = []
    for (let v = yMin; v <= yMax; v += yStep) yTicks.push(v)
    const xStepMin = [1, 2, 5, 10, 15, 20, 30, 60].find((s) => tMax / 60 / s <= 6) || 60
    const xTicks = []
    for (let sec = 0; sec <= tMax; sec += xStepMin * 60) xTicks.push(sec)

    return { points, segments, tMax, x, y, yTicks, xTicks }
  }, [session, W])

  if (!model) return <p className="small muted">Battito non registrato per questa sessione.</p>

  const { points, segments, x, y, yTicks, xTicks } = model
  const hoverPoint = hover != null ? points[hover] : null
  const hoverSegment = hoverPoint ? segments.find((s) => hoverPoint.sec >= s.startSec && hoverPoint.sec <= s.endSec) : null

  function onMove(ev) {
    const rect = wrapRef.current.getBoundingClientRect()
    const px = ((ev.clientX - rect.left) / rect.width) * W
    let best = 0
    let bestDist = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(x(p.sec) - px)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    setHover(best)
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block', touchAction: 'pan-y' }}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Andamento del battito cardiaco durante la sessione"
        >
          {/* Bande esercizio (2px di stacco tra bande adiacenti) */}
          {segments.map((s, i) => {
            const bx = x(s.startSec)
            const bw = Math.max(2, x(s.endSec) - bx - 2)
            const label = s.name.length > bw / 7 ? `${s.name.slice(0, Math.max(0, Math.floor(bw / 7) - 1))}…` : s.name
            return (
              <g key={i}>
                <rect x={bx} y={M.top} width={bw} height={PH} fill={s.color} rx={4} />
                {bw > 34 && (
                  <text x={bx + 5} y={M.top + 13} fontSize="11" fontWeight="800" fill={INK}>
                    {label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Griglia e assi */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} y1={y(v)} x2={W - M.right} y2={y(v)} stroke={GRID} strokeWidth="1" />
              <text x={M.left - 6} y={y(v) + 4} fontSize="11" fill={MUTED} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {xTicks.map((sec) => (
            <text key={sec} x={x(sec)} y={H - 8} fontSize="11" fill={MUTED} textAnchor="middle">
              {fmtMin(sec)}
            </text>
          ))}

          {/* Media di sessione come riferimento */}
          {session.hrAvg != null && (
            <line
              x1={M.left}
              y1={y(session.hrAvg)}
              x2={W - M.right}
              y2={y(session.hrAvg)}
              stroke={MUTED}
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          )}

          {/* Linea HR (spezzata sui buchi di campionamento) */}
          {(() => {
            const runs = []
            let run = [points[0]]
            for (let i = 1; i < points.length; i++) {
              if (points[i].sec - points[i - 1].sec > 60) {
                runs.push(run)
                run = []
              }
              run.push(points[i])
            }
            runs.push(run)
            return runs.map((r, i) => (
              <polyline
                key={i}
                points={r.map((p) => `${x(p.sec).toFixed(1)},${y(p.bpm).toFixed(1)}`).join(' ')}
                fill="none"
                stroke={INK}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))
          })()}

          {/* Crosshair + marker sul punto piu' vicino */}
          {hoverPoint && (
            <g pointerEvents="none">
              <line x1={x(hoverPoint.sec)} y1={M.top} x2={x(hoverPoint.sec)} y2={M.top + PH} stroke={MUTED} strokeWidth="1" />
              <circle cx={x(hoverPoint.sec)} cy={y(hoverPoint.bpm)} r="5" fill={INK} stroke="#fff" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hoverPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(x(hoverPoint.sec) / W) * 100}%`,
              top: 0,
              transform: `translate(${x(hoverPoint.sec) > W / 2 ? '-105%' : '8px'}, 0)`,
              background: 'var(--card)',
              border: '2px solid var(--ink)',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {fmtClock(hoverPoint.sec)} · {hoverPoint.bpm} bpm
            <span className="muted"> — {hoverSegment ? hoverSegment.name : 'recupero / pausa'}</span>
          </div>
        )}
      </div>

      {/* Legenda: colore + nome, mai il solo colore */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {segments.map((s, i) => (
          <LegendChip key={i} color={s.color} label={s.name} />
        ))}
        <LegendChip color="var(--paper)" label="recupero / pausa" />
        {session.hrAvg != null && <LegendChip dashed label={`media ${session.hrAvg} bpm`} />}
      </div>
    </div>
  )
}

function LegendChip({ color, label, dashed }) {
  return (
    <span className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {dashed ? (
        <span style={{ width: 14, borderTop: `2px dashed ${MUTED}` }} />
      ) : (
        <span style={{ width: 11, height: 11, background: color, border: `1.5px solid ${INK}`, borderRadius: 3 }} />
      )}
      {label}
    </span>
  )
}
