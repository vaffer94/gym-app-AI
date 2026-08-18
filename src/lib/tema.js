/**
 * Il tema chiaro/scuro.
 *
 * Tre stati e non due: "sistema" (segue il telefono), "chiaro", "scuro".
 * Senza lo stato "sistema" chi non ha mai toccato l'interruttore resterebbe
 * inchiodato al chiaro anche col telefono in modalita' notte, che e' proprio il
 * caso in cui il tema scuro serve.
 *
 * Il tema si scrive su <html> e non su <body> perche' lo sfondo della pagina lo
 * dipinge <html> quando si scorre oltre il contenuto: mettendolo su <body> in
 * fondo alla pagina comparirebbe una striscia bianca.
 */
import { useEffect, useState } from 'react'

const CHIAVE = 'gym.tema'
const SCELTE = ['sistema', 'chiaro', 'scuro']

const preferenzaSistema = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro'

export function getTema() {
  const salvato = localStorage.getItem(CHIAVE)
  return SCELTE.includes(salvato) ? salvato : 'sistema'
}

/** Il tema davvero applicato: "sistema" si risolve guardando il telefono. */
export const temaEffettivo = (scelta = getTema()) =>
  scelta === 'sistema' ? preferenzaSistema() : scelta

export function applicaTema(scelta = getTema()) {
  document.documentElement.dataset.tema = temaEffettivo(scelta)
  // La barra del browser (e la barra di stato quando l'app e' installata) non
  // legge il CSS: va detta a parte. Nel chiaro resta l'arancio del marchio,
  // che e' anche il theme_color del manifest; nello scuro diventa il blu, se
  // no sopra una pagina scura resta una striscia arancione accesa.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.content = temaEffettivo(scelta) === 'scuro' ? '#16162b' : '#FF6B35'
  }
}

export function setTema(scelta) {
  if (!SCELTE.includes(scelta)) return
  // "sistema" si salva come assenza di scelta: cosi' chi non ha mai deciso e
  // chi e' tornato al sistema si comportano uguale, e non restano due strade
  // diverse da tenere allineate.
  if (scelta === 'sistema') localStorage.removeItem(CHIAVE)
  else localStorage.setItem(CHIAVE, scelta)
  applicaTema(scelta)
}

/** Il giro completo dell'interruttore. */
export const prossimoTema = (scelta = getTema()) =>
  SCELTE[(SCELTE.indexOf(scelta) + 1) % SCELTE.length]

/**
 * Segue il telefono mentre l'app e' aperta, ma solo se la scelta e' "sistema":
 * chi ha scelto a mano non deve vedersi cambiare il tema sotto le dita quando
 * scatta la modalita' notte automatica.
 */
export function ascoltaSistema() {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!mq) return () => {}
  const cambia = () => { if (getTema() === 'sistema') applicaTema('sistema') }
  mq.addEventListener('change', cambia)
  return () => mq.removeEventListener('change', cambia)
}

/**
 * Il tema attivo come stato React, per chi disegna su canvas.
 *
 * Chart.js dipinge su un canvas: non legge il CSS, e i colori vanno passati a
 * mano. Questo hook fa ridisegnare i grafici quando il tema cambia — se no le
 * scritte restano del colore di prima e su fondo scuro spariscono.
 */
export function useTemaAttivo() {
  // Si legge l'ATTRIBUTO su <html>, non la scelta salvata: l'attributo e' cio'
  // che il CSS guarda davvero, ed e' l'unica fonte che non puo' andare fuori
  // sincrono con i colori calcolati.
  const letto = () => document.documentElement.dataset.tema || temaEffettivo()
  const [tema, setStato] = useState(letto)
  useEffect(() => {
    const aggiorna = () => setStato(letto())
    // Il tema puo' cambiare per due strade: l'interruttore (che riscrive
    // l'attributo su <html>) o il telefono che passa a modalita' notte.
    const osservatore = new MutationObserver(aggiorna)
    osservatore.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-tema'],
    })
    const stop = ascoltaSistema()
    return () => { osservatore.disconnect(); stop() }
  }, [])
  return tema
}

/** Il valore calcolato di una variabile CSS, per passarlo a Chart.js. */
export const colore = (nome) =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
