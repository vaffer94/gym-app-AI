import { useEffect, useState } from 'react'
import Icona from '../icons'
import { applicaTema, ascoltaSistema, getTema, prossimoTema, setTema } from '../lib/tema'

const ETICHETTE = {
  sistema: ['Tema: come il telefono', 'sistema'],
  chiaro: ['Tema: chiaro', 'chiaro'],
  scuro: ['Tema: scuro', 'scuro'],
}

const ICONE = { sistema: 'orologio', chiaro: 'temaChiaro', scuro: 'temaScuro' }

/**
 * L'interruttore del tema: un pulsante che gira fra sistema, chiaro e scuro.
 *
 * Un pulsante che gira e non tre voci in fila: nella barra in alto ci sono gia'
 * l'avatar, il saluto e due pulsanti, e a 320px tre opzioni non ci stanno.
 * Il titolo dice sempre in che stato sei, cosi' "gira" non diventa "indovina".
 */
export default function SelettoreTema() {
  const [tema, setStato] = useState(getTema)

  // Il telefono puo' passare a modalita' notte mentre l'app e' aperta
  useEffect(() => ascoltaSistema(), [])
  useEffect(() => { applicaTema(tema) }, [tema])

  const gira = () => {
    const next = prossimoTema(tema)
    setTema(next)
    setStato(next)
  }

  const [titolo] = ETICHETTE[tema]
  return (
    <button className="btn" onClick={gira} aria-label={titolo} title={titolo}>
      <Icona nome={ICONE[tema]} />
    </button>
  )
}
