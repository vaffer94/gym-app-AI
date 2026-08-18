import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSegments, buildRests, binHr, hrWindowSec, splitHrRuns, HR_STEP_SEC } from '../workout/hrAnalysis'

/**
 * Grafico HR della sessione (step 6): linea del battito nel tempo sopra le bande
 * colorate degli esercizi (stessa palette per-esercizio dell'app watch); lo sfondo
 * neutro tra le bande e' recupero/pausa.
 *
 * I pastelli da soli non sono distinguibili in modo affidabile (validati: ΔE
 * adiacente ~4.5), quindi l'identita' NON e' affidata al colore: ogni banda ha il
 * nome scritto sopra, c'e' la legenda e il tooltip dice sempre in che esercizio sei.
 */

// L'SVG puo' usare le variabili CSS direttamente: cosi' segue il tema da solo,
// al contrario del canvas di Chart.js che va ridipinto a mano.
const INK = 'var(--ink)'
const MUTED = 'var(--muted)'
const GRID = 'rgba(43, 43, 60, 0.12)'

// Altezza fissa; la larghezza logica segue quella reale del contenitore
// (ResizeObserver) cosi' i font restano a dimensione vera anche su telefono
const H = 240
// left 56 e non 40: sull'asse verticale il tick piu' alto porta anche l'unita'. "130 bpm"
// misura ~45px a 11px di carattere, e con 50 di margine sbordava di 1px dal riquadro.
const M = { top: 24, right: 10, bottom: 26, left: 56 }
const PH = H - M.top - M.bottom

function fmtMin(sec) {
  return `${Math.round(sec / 60)}′`
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function HrChart({ session, zones }) {
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
    const rests = buildRests(session)
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

    // I bpm di soglia diventano tacche vere sull'asse: la riga colorata da sola dice
    // "qui comincia il cardio" ma non a quale battito, e leggerlo a occhio fra due
    // tacche da 20 bpm e' esattamente cio' che rendeva il grafico poco utile.
    const sogliaBpm = (zones || [])
      .filter((z) => z.id !== 'sotto' && z.min > yMin && z.min < yMax)
      .map((z) => z.min)
    for (const b of sogliaBpm) {
      // niente doppioni a ridosso: due etichette a 4 bpm di distanza si sovrappongono
      if (!yTicks.some((v) => Math.abs(v - b) < ySpan / 12)) yTicks.push(b)
    }
    yTicks.sort((a, b) => a - b)
    const xStepMin = [1, 2, 5, 10, 15, 20, 30, 60].find((s) => tMax / 60 / s <= 6) || 60
    const xTicks = []
    for (let sec = 0; sec <= tMax; sec += xStepMin * 60) xTicks.push(sec)

    // Confini di zona: solo quelli che cadono davvero dentro il grafico. Disegnare una
    // linea "Picco" a 160 bpm su una sessione arrivata a 131 riempirebbe il bordo di
    // etichette che non dicono niente.
    const zoneLines = (zones || [])
      .filter((z) => z.id !== 'sotto' && z.min > yMin && z.min < yMax)
      .map((z) => ({ id: z.id, label: z.label, color: z.color, bpm: z.min }))

    // La curva disegnata e' aggregata, non grezza: vedi hrWindowSec. Con finestra pari
    // al passo nativo ogni finestra contiene un campione solo, min e max coincidono con
    // la media e la fascia si richiude sulla linea: il caso "nessuna aggregazione" non
    // e' un ramo a parte, cade fuori da solo.
    const windowSec = hrWindowSec(tMax, PW)
    const series = binHr(points, windowSec)
    const runs = splitHrRuns(series, windowSec)
    const aggregata = windowSec > HR_STEP_SEC

    return { series, runs, windowSec, aggregata, segments, rests, tMax, x, y, yTicks, xTicks, zoneLines }
  }, [session, W, zones])

  if (!model) return <p className="small muted">Battito non registrato per questa sessione.</p>

  const { series, runs, windowSec, aggregata, segments, rests, x, y, yTicks, xTicks, zoneLines } = model
  const hoverPoint = hover != null ? series[hover] : null
  const hoverSegment = hoverPoint ? segments.find((s) => hoverPoint.sec >= s.startSec && hoverPoint.sec <= s.endSec) : null

  function onMove(ev) {
    const rect = wrapRef.current.getBoundingClientRect()
    const px = ((ev.clientX - rect.left) / rect.width) * W
    let best = 0
    let bestDist = Infinity
    series.forEach((p, i) => {
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
          {segments.map((s, i) => (
            <rect
              key={i}
              x={x(s.startSec)}
              y={M.top}
              width={Math.max(2, x(s.endSec) - x(s.startSec) - 2)}
              height={PH}
              fill={s.color}
              rx={4}
            />
          ))}

          {/* Recuperi: ritagliati sopra le bande, stesso colore dello sfondo del grafico.
              Larghezza minima 2px: un recupero da 15" sarebbe altrimenti invisibile, e
              una riga sottile basta a far capire che li' c'e' stata una pausa. */}
          {rests.map((r, i) => {
            const rx = x(r.startSec)
            const rw = Math.max(2, Math.min(x(r.endSec), W - M.right) - rx)
            return <rect key={i} x={rx} y={M.top} width={rw} height={PH} fill="var(--card)" />
          })}

          {/* Nomi degli esercizi: dopo i ritagli, se no un recupero puo' tagliare a meta'
              la scritta. I pastelli non bastano a distinguere le bande (ΔE ~4.5), quindi
              l'etichetta e' l'identita' vera e non deve mai risultare mangiata. */}
          {segments.map((s, i) => {
            const bx = x(s.startSec)
            const bw = Math.max(2, x(s.endSec) - bx - 2)
            if (bw <= 34) return null
            const label = s.name.length > bw / 7 ? `${s.name.slice(0, Math.max(0, Math.floor(bw / 7) - 1))}…` : s.name
            return (
              <text key={i} x={bx + 5} y={M.top + 13} fontSize="11" fontWeight="800" fill={INK}>
                {label}
              </text>
            )
          })}

          {/* Griglia e assi. Sull'asse verticale il valore porta l'unita': "120" da solo
              costringe a dedurre che si stanno leggendo battiti al minuto. */}
          {yTicks.map((v, i) => (
            <g key={v}>
              <line x1={M.left} y1={y(v)} x2={W - M.right} y2={y(v)} stroke={GRID} strokeWidth="1" />
              <text x={M.left - 6} y={y(v) + 4} fontSize="11" fill={MUTED} textAnchor="end">
                {v}{i === yTicks.length - 1 ? ' bpm' : ''}
              </text>
            </g>
          ))}
          {xTicks.map((sec) => (
            <text key={sec} x={x(sec)} y={H - 8} fontSize="11" fill={MUTED} textAnchor="middle">
              {fmtMin(sec)}
            </text>
          ))}

          {/* Confini delle zone cardiache: solo la linea, senza scritte. Il nome sta in
              legenda e il valore in bpm e' una tacca sull'asse: dentro il grafico le
              etichette finivano sopra le bande degli esercizi e si leggevano male. */}
          {zoneLines.map((z) => (
            <line
              key={z.id}
              x1={M.left}
              y1={y(z.bpm)}
              x2={W - M.right}
              y2={y(z.bpm)}
              stroke={z.color}
              strokeWidth="2"
              opacity="0.9"
            />
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

          {/* Fascia di oscillazione: min-max dentro ogni finestra, andata sui massimi e
              ritorno sui minimi. Sta SOTTO la linea perche' e' il contesto, non il dato
              che si legge; ed e' quello che impedisce al grafico di smentire il "max"
              scritto nella card sopra, che la sola media abbasserebbe. */}
          {aggregata && runs.map((r, i) => (
            <polygon
              key={`band-${i}`}
              points={[
                ...r.map((p) => `${x(p.sec).toFixed(1)},${y(p.max).toFixed(1)}`),
                ...[...r].reverse().map((p) => `${x(p.sec).toFixed(1)},${y(p.min).toFixed(1)}`),
              ].join(' ')}
              fill={INK}
              opacity="0.16"
            />
          ))}

          {/* Linea HR aggregata (spezzata sui buchi di campionamento) */}
          {runs.map((r, i) => (
            <polyline
              key={i}
              points={r.map((p) => `${x(p.sec).toFixed(1)},${y(p.bpm).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

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
              borderRadius: 5,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {fmtClock(hoverPoint.sec)} · {hoverPoint.bpm} bpm
            {/* Il range solo quando dice qualcosa: senza aggregazione min e max sono il
                campione stesso, e "(97-97)" e' solo rumore da leggere */}
            {hoverPoint.max > hoverPoint.min && (
              <span className="muted"> ({hoverPoint.min}–{hoverPoint.max})</span>
            )}
            <span className="muted"> — {hoverSegment ? hoverSegment.name : 'recupero / pausa'}</span>
          </div>
        )}
      </div>

      {/* Legenda: colore + nome, mai il solo colore. Una voce per esercizio DISTINTO:
          con tre cyclette nella stessa scheda comparivano tre voci uguali di tre colori
          diversi, ed era il punto in cui la legenda smetteva di aiutare. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {[...new Map(segments.map((s) => [s.name, s])).values()].map((s) => (
          <LegendChip key={s.name} color={s.color} label={s.name} />
        ))}
        {/* Stesso colore dei ritagli qui sopra, se no la legenda mente */}
        <LegendChip color="var(--card)" label="recupero / pausa" />
        {/* La curva e' una media: dirlo e' obbligatorio, se no il picco disegnato piu'
            basso del "max" della card sembra un errore invece che una scelta */}
        {aggregata && <LegendChip band label="oscillazione · media su" value={`${windowSec}s`} />}
        {session.hrAvg != null && <LegendChip dashed label="battito medio" value={`${session.hrAvg} bpm`} />}
        {/* Le soglie: qui e non piu' dentro il grafico */}
        {zoneLines.map((z) => (
          <LegendChip key={z.id} line color={z.color} label={`${z.label} da`} value={`${z.bpm} bpm`} />
        ))}
      </div>
    </div>
  )
}

/**
 * `dashed` = media di sessione, `line` = soglia di zona, `band` = fascia di
 * oscillazione, altrimenti quadratino pieno.
 * `value` e' la parte numerica: sta in grassetto perche' e' l'informazione che si
 * cerca, e in mezzo a cinque voci di legenda va trovata a colpo d'occhio.
 */
function LegendChip({ color, label, value, dashed, line, band }) {
  return (
    <span className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {dashed ? (
        <span style={{ width: 14, borderTop: `2px dashed ${MUTED}` }} />
      ) : line ? (
        <span style={{ width: 14, borderTop: `3px solid ${color}` }} />
      ) : band ? (
        // Stessa opacita' della fascia nel grafico, con la linea della media in mezzo:
        // il campioncino deve essere quello che si vede sopra, non un'approssimazione
        <span style={{ width: 14, height: 11, background: INK, opacity: 0.16, borderRadius: 2 }} />
      ) : (
        <span style={{ width: 11, height: 11, background: color, border: `1.5px solid ${INK}`, borderRadius: 3 }} />
      )}
      {label}
      {value && <strong>{value}</strong>}
    </span>
  )
}
