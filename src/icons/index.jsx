import { ICONE } from './registry'

/**
 * Un'icona, chiesta per quello che significa: `<Icona nome="pesi" />`.
 *
 * La misura di default e' 1em invece di un numero fisso, cosi' l'icona cresce
 * col testo che accompagna: dentro un .btn segue il font del bottone, dentro un
 * .small si rimpicciolisce da sola. Con Font Awesome funzionava cosi' e le
 * pagine ci contano.
 *
 * Il colore arriva da `currentColor`, quindi `style={{ color: ... }}` sul
 * genitore continua a funzionare come prima. Le icone disegnate in casa possono
 * avere piu' colori: quelli in piu' si comandano con le variabili --ico-b,
 * --ico-c... (vedi mie/LEGGIMI.md).
 */
export default function Icona({ nome, size = '1em', className = '', style, ...resto }) {
  const Disegno = ICONE[nome]
  if (!Disegno) {
    // Meglio niente che un quadratino misterioso: un nome sbagliato si vede in
    // console durante lo sviluppo, non in palestra.
    if (import.meta.env.DEV) console.warn(`Icona sconosciuta: "${nome}"`)
    return null
  }
  return (
    <Disegno
      width={size}
      height={size}
      className={`icona ${className}`.trim()}
      style={style}
      aria-hidden="true"
      focusable="false"
      {...resto}
    />
  )
}
