/**
 * Percentuale di tempo per zona cardiaca, con dentro il contributo dei singoli esercizi.
 *
 * Ogni colonna e' una zona; i pezzi impilati dentro la colonna sono gli esercizi, con gli
 * stessi colori delle bande del grafico HR — cosi' l'occhio li ricollega senza doverli
 * imparare due volte. Su ogni pezzo abbastanza alto c'e' scritto il nome dell'esercizio,
 * perche' i pastelli adiacenti non sono distinguibili in modo affidabile e il colore da
 * solo non basta a dire di chi e' quel pezzo.
 *
 * Le colonne sono in scala sulla zona piu' battuta, non su 100%: con l'80% del tempo in
 * una zona sola, scalare su 100 lascerebbe le altre tre alte pochi pixel, e i pezzi
 * dentro sarebbero invisibili. La percentuale resta scritta sopra ogni colonna.
 */

import { exerciseId } from '../workout/hrAnalysis'

const H = 168 // altezza dell'area delle colonne, esclusa la riga delle percentuali

const fmt = (sec) => {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m}′${s ? ` ${String(s).padStart(2, '0')}″` : ''}` : `${s}″`
}

/**
 * I contributi si sommano per NOME e non per chiave: tre giri di cyclette nella stessa
 * scheda sono tre voci distinte nei dati, ma qui darebbero tre pezzi dello stesso colore
 * uno sopra l'altro, ognuno con la stessa scritta. La domanda a cui serve rispondere e'
 * "quanto del tempo in cardio ce l'ha messo la cyclette", non "il secondo giro di
 * cyclette quanto ha pesato" — stessa scelta gia' fatta per i colori del grafico HR.
 */
function perEsercizio(zona) {
  const m = new Map()
  for (const e of zona.byExercise) {
    const id = exerciseId(e.name)
    const cur = m.get(id) || { ...e, key: id, sec: 0 }
    cur.sec += e.sec
    m.set(id, cur)
  }
  return [...m.values()].sort((a, b) => b.sec - a.sec)
}

export default function ZoneBars({ data, thresholdSource }) {
  if (!data) return null
  const { perZone, totalSec } = data
  // Le zone mai toccate si nascondono: una colonna vuota non informa, ingombra
  const shown = perZone.filter((z) => z.sec > 0)
  if (!shown.length) return null

  const maxPct = Math.max(...shown.map((z) => z.pct))

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: H }}>
        {shown.map((z) => {
          const h = Math.max(8, Math.round((z.pct / maxPct) * (H - 20)))
          return (
            <div
              key={z.id}
              style={{
                flex: 1, minWidth: 0, height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              }}
            >
              <span className="small" style={{ fontWeight: 800, lineHeight: 1.2 }}>{Math.round(z.pct)}%</span>
              <div
                style={{
                  width: '100%', height: h, display: 'flex', flexDirection: 'column',
                  border: '2px solid var(--ink)', borderRadius: '6px 6px 0 0',
                  overflow: 'hidden', background: 'var(--card)',
                }}
              >
                {/* Ordine rovesciato: il pezzo piu' grande poggia sull'asse, dove l'occhio
                    parte a leggere; perEsercizio ordina dal piu' lungo */}
                {perEsercizio(z).reverse().map((e, i) => (
                  <Pezzo key={e.key} ex={e} zona={z} altezzaBarra={h} primo={i === 0} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 6, borderTop: '2px solid var(--ink)', paddingTop: 4 }}>
        {shown.map((z) => (
          <div key={z.id} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            {/* Due righe riservate al nome: "Brucia grassi" va a capo e "Cardio" no, e
                senza altezza fissa i tempi finirebbero a quote diverse. Il quadratino sta
                dentro allo stesso blocco, se no si prende una riga tutta per se' */}
            <span className="small" style={{ fontWeight: 800, display: 'block', minHeight: '2.4em', lineHeight: 1.2 }}>
              <span
                style={{
                  display: 'inline-block', width: 9, height: 9, background: z.color,
                  border: '1.5px solid var(--ink)', borderRadius: 2, marginRight: 4,
                }}
              />
              {z.label}
            </span>
            {/* Solo il tempo: i bpm della soglia stanno nella riga di dettaglio, che ha
                tutta la larghezza. Qui, dentro una colonna da ottanta pixel, "95–132 bpm"
                andava a capo e sfilacciava il piedino */}
            <span className="small muted" style={{ display: 'block', lineHeight: 1.3 }}>{fmt(z.sec)}</span>
          </div>
        ))}
      </div>

      {/* Rete di sicurezza per i nomi che non entrano dentro il pezzo colorato: una
          colonna larga una settantina di pixel taglia "Elastici polpacci" a meta'.
          Il campione a cavallo fra due esercizi finisce in entrambe le zone e crea
          schegge da pochi secondi: restano nella colonna (dove sono invisibili) ma
          non qui, che altrimenti si riempie di "Cyclette 5″". */}
      {shown.map((z) => {
        const voci = perEsercizio(z).filter((e) => e.sec >= 15)
        return (
          <p key={z.id} className="small muted" style={{ margin: 0 }}>
            <span style={{ fontWeight: 800 }}>{z.label}</span>
            {z.max > 0 && z.id !== 'sotto' && <> {z.min}–{z.max} bpm</>}
            {voci.length > 0 && `: ${voci.map((e) => `${e.name} ${fmt(e.sec)}`).join(' · ')}`}
          </p>
        )
      })}

      <p className="small muted" style={{ margin: 0 }}>
        Su {fmt(totalSec)} di battito registrato.{' '}
        {thresholdSource === 'google'
          ? 'Soglie personalizzate da Google Health (età e battito a riposo).'
          : 'Soglie stimate da 220 meno l’età: indicative, l’errore tipico è di ±10-12 bpm.'}
      </p>
    </div>
  )
}

/**
 * Un esercizio dentro una zona. Il nome si scrive solo se il pezzo e' alto abbastanza
 * da contenerlo: una scritta di 10px dentro 6 pixel di colore diventa una macchia
 * illeggibile, peggio del pezzo muto. Sotto quella soglia resta il dettaglio scritto.
 */
function Pezzo({ ex, zona, altezzaBarra, primo }) {
  const quota = ex.sec / zona.sec
  const altezza = quota * (altezzaBarra - 4) // meno i 2px di bordo sopra e sotto
  return (
    <div
      title={`${ex.name}: ${fmt(ex.sec)} in ${zona.label}`}
      style={{
        height: `${quota * 100}%`,
        background: ex.color,
        borderTop: primo ? 'none' : '1.5px solid var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      {altezza >= 13 && ex.sec >= 15 && (
        <span
          style={{
            fontSize: 10, fontWeight: 700, lineHeight: 1.1, color: 'var(--ink)',
            padding: '0 3px', maxWidth: '100%',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {ex.name}
        </span>
      )}
    </div>
  )
}
