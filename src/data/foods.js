/**
 * Equivalenti alimentari delle kcal bruciate in allenamento.
 *
 * ATTENZIONE ALLA NATURA DI QUESTI NUMERI: sono ordini di grandezza, non misure.
 * Lo stesso piatto varia enormemente con la porzione e la ricetta — il CREA misura
 * 1084 kcal su una margherita STG napoletana, una margherita da 300 g di pizzeria
 * normale ne fa ~800. Qui stanno valori centrali e realistici, mai i massimi, e la
 * porzione e' sempre esplicita nel nome: e' lei a fare la differenza fra una birra
 * da 108 kcal e una da 250.
 *
 * Fonti consultate (08/2026):
 * - CREA / INRAN per la pizza (stima su 10 pizze di 5 pizzerie, disciplinare STG)
 * - lecalorie.it per bibite in lattina (Coca-Cola 330 ml = 138,6 kcal; te' limone = 132)
 * - calcolatorecalorie.it per alcolici (birra chiara 33 cl = 108; vino rosso 125 ml = 91)
 * - cibo360.it / Istituto del Gelato Italiano per il gelato artigianale (~180 kcal
 *   la coppetta da 2 palline alla crema, 165-180 kcal/100 g)
 * - immieats.com / fatsecret per il ramen (tonkotsu con chashu ~900, pollo ~700)
 * - torrinomedica / sushisenpai per il sushi misto (nigiri 35-80 kcal a pezzo)
 * - fatsecret / calorie.it per la fascia 200-500 (patatine in sacchetto 274 a busta,
 *   patatine fritte medie McDonald's 340, Snickers 482 kcal/100 g = 241 la barretta)
 *
 * La fascia fra il gelato (180) e il sushi (500) e' stata riempita apposta: con un
 * buco di 300 kcal la maggior parte degli allenamenti sarebbe finita sempre sullo
 * stesso premio, e il paragone avrebbe smesso di dire qualcosa.
 *
 * Le emoji sono le icone: e' la convenzione del design system dell'app
 * ("emoji come icone", vedi l'intestazione di global.css). Niente immagini da
 * scaricare, funziona offline e non pesa sul bundle.
 *
 * Emoji volutamente diverse anche per piatti della stessa famiglia (le tre pizze):
 * nel riepilogo si vede l'icona da sola, e tre 🍕 identiche non direbbero nulla.
 */

/** Ordine crescente di kcal: e' l'ordine in cui la lista viene mostrata. */
export const FOODS = [
  { emoji: '🥂', name: 'Calice di vino bianco', portion: '125 ml', kcal: 88 },
  { emoji: '🍷', name: 'Calice di vino rosso', portion: '125 ml', kcal: 91 },
  { emoji: '🍺', name: 'Birra bionda', portion: '0,33 L', kcal: 108 },
  { emoji: '🍧', name: 'Gelato in coppetta, gusto alla frutta', portion: '1 gusto', kcal: 110 },
  { emoji: '🍸', name: 'Gin tonic', portion: 'classico', kcal: 120 },
  { emoji: '🍋', name: 'Tè freddo al limone', portion: 'lattina 330 ml', kcal: 132 },
  { emoji: '🥤', name: 'Coca-Cola', portion: 'lattina 330 ml', kcal: 139 },
  { emoji: '🍹', name: 'Spritz', portion: 'calice 200 ml', kcal: 170 },
  { emoji: '🍨', name: 'Gelato in coppetta, gusti alla crema', portion: '2 palline', kcal: 180 },
  { emoji: '🍫', name: 'Barretta di cioccolato', portion: 'Snickers, 50 g', kcal: 241 },
  { emoji: '🥔', name: 'Patatine in sacchetto', portion: '50 g', kcal: 274 },
  { emoji: '🍟', name: 'Patatine fritte', portion: 'porzione media', kcal: 340 },
  { emoji: '🍰', name: 'Tiramisù', portion: '1 porzione', kcal: 420 },
  { emoji: '🍣', name: 'Sushi misto', portion: '11 pezzi', kcal: 500 },
  { emoji: '🍔', name: 'Hamburger classico', portion: 'senza patatine', kcal: 600 },
  { emoji: '🍜', name: 'Ramen di pollo', portion: '1 ciotola', kcal: 700 },
  { emoji: '🫑', name: 'Pizza con le verdure', portion: 'intera', kcal: 750 },
  { emoji: '🍕', name: 'Pizza margherita', portion: 'intera', kcal: 850 },
  { emoji: '🐖', name: 'Ramen di maiale', portion: '1 ciotola', kcal: 900 },
  { emoji: '🍄', name: 'Pizza prosciutto e funghi', portion: 'intera', kcal: 950 },
  { emoji: '🌶️', name: 'Pizza diavola', portion: 'intera', kcal: 1050 },
]

/**
 * L'alimento piu' calorico che sta *sotto* alle kcal bruciate: quello che ti sei
 * effettivamente guadagnata.
 *
 * Sotto agli 88 kcal del vino bianco non c'e' niente da premiare, ma togliere
 * l'icona lascerebbe la riga a volte con e a volte senza figura. Si mostra allora
 * il piu' piccolo con `almost`, che l'interfaccia rende come "quasi".
 *
 * @returns {{food: object, almost: boolean}|null} null solo se kcal non e' un numero
 */
export function nearestFood(kcal) {
  if (!Number.isFinite(kcal) || kcal <= 0) return null
  let match = null
  for (const f of FOODS) {
    if (f.kcal <= kcal) match = f
    else break // FOODS e' gia' ordinata: il primo che sfora chiude la ricerca
  }
  return match ? { food: match, almost: false } : { food: FOODS[0], almost: true }
}
