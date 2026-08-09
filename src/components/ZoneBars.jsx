/**
 * Percentuale di tempo per zona cardiaca, con dentro il contributo dei singoli esercizi.
 *
 * Ogni barra e' una zona; i segmenti dentro la barra sono gli esercizi, con gli stessi
 * colori delle bande del grafico HR — cosi' l'occhio li ricollega senza doverli imparare
 * due volte. La distinzione fra segmenti NON e' affidata al solo colore (i pastelli
 * adiacenti non sono distinguibili in modo affidabile): c'e' il separatore scuro, il
 * dettaglio scritto sotto ogni barra e il tooltip su ciascun segmento.
 */

const fmt = (sec) => {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m}′${s ? ` ${String(s).padStart(2, '0')}″` : ''}` : `${s}″`
}

export default function ZoneBars({ data, thresholdSource }) {
  if (!data) return null
  const { perZone, totalSec } = data
  // Le zone mai toccate si nascondono: una fila di barre vuote non informa, ingombra
  const shown = perZone.filter((z) => z.sec > 0)

  return (
    <div className="stack" style={{ gap: 12 }}>
      {shown.map((z) => (
        <div key={z.id} className="stack" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="small" style={{ fontWeight: 800, flex: 1, minWidth: 96 }}>
              <span
                style={{
                  display: 'inline-block', width: 11, height: 11, background: z.color,
                  border: '1.5px solid var(--ink)', borderRadius: 3, marginRight: 6,
                }}
              />
              {z.label}
              {z.max > 0 && z.id !== 'sotto' && (
                <span className="muted" style={{ fontWeight: 400 }}> {z.min}–{z.max} bpm</span>
              )}
            </span>
            <span className="small" style={{ fontWeight: 800 }}>
              {Math.round(z.pct)}% · {fmt(z.sec)}
            </span>
          </div>

          {/* Barra: larghezza = quota della zona sul totale; dentro, gli esercizi */}
          <div
            style={{
              height: 22,
              border: '2px solid var(--ink)',
              borderRadius: 999,
              overflow: 'hidden',
              background: 'var(--card)',
            }}
          >
            <div style={{ display: 'flex', height: '100%', width: `${z.pct}%`, minWidth: z.sec > 0 ? 6 : 0 }}>
              {z.byExercise.map((e, i) => (
                <div
                  key={e.key}
                  title={`${e.name}: ${fmt(e.sec)} in ${z.label}`}
                  style={{
                    width: `${(e.sec / z.sec) * 100}%`,
                    background: e.color,
                    borderLeft: i ? '1.5px solid var(--ink)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Il campione a cavallo fra due esercizi finisce in entrambe le zone e crea
              schegge da pochi secondi. Restano nella barra (dove sono invisibili) ma
              non nell'elenco scritto, che altrimenti si riempie di "Cyclette 5″". */}
          <p className="small muted" style={{ margin: 0 }}>
            {z.byExercise.filter((e) => e.sec >= 15).map((e) => `${e.name} ${fmt(e.sec)}`).join(' · ')}
          </p>
        </div>
      ))}

      <p className="small muted" style={{ margin: 0 }}>
        Su {fmt(totalSec)} di battito registrato.{' '}
        {thresholdSource === 'google'
          ? 'Soglie personalizzate da Google Health (età e battito a riposo).'
          : 'Soglie stimate da 220 meno l’età: indicative, l’errore tipico è di ±10-12 bpm.'}
      </p>
    </div>
  )
}
