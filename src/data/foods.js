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
 * `icona` e' un nome del registro (src/icons/registry.js), non un'emoji: i disegni
 * sono icone a pixel derivate dalle emoji che stavano qui prima, generate da
 * scripts/genera-icone-emoji.py. Restano dentro il bundle, quindi funziona ancora
 * tutto offline.
 *
 * Icone volutamente diverse anche per piatti della stessa famiglia (le tre pizze):
 * nel riepilogo si vede l'icona da sola, e tre pizze identiche non direbbero nulla.
 * E' anche il motivo per cui questi disegni non si possono accorpare: qui serve
 * riconoscere QUALE cibo, non "un cibo".
 */

/**
 * Ordine crescente di kcal: e' l'ordine in cui la lista viene mostrata.
 *
 * Nel carrello dell'obiettivo settimanale finisce l'`id`, non l'oggetto: cosi'
 * correggere una porzione o un valore aggiorna anche gli obiettivi gia' impostati,
 * invece di lasciarli con dentro una copia vecchia.
 */
export const FOODS = [
  { id: 'vino-bianco', icona: 'ciboProsecco', name: 'Calice di vino bianco', portion: '125 ml', kcal: 88 },
  { id: 'vino-rosso', icona: 'ciboVinoRosso', name: 'Calice di vino rosso', portion: '125 ml', kcal: 91 },
  { id: 'birra', icona: 'ciboBirra', name: 'Birra bionda', portion: '0,33 L', kcal: 108 },
  { id: 'gelato-frutta', icona: 'ciboGranita', name: 'Gelato in coppetta, gusto alla frutta', portion: '1 gusto', kcal: 110 },
  { id: 'gin-tonic', icona: 'ciboGinTonic', name: 'Gin tonic', portion: 'classico', kcal: 120 },
  { id: 'te-limone', icona: 'ciboTeLimone', name: 'Tè freddo al limone', portion: 'lattina 330 ml', kcal: 132 },
  { id: 'coca-cola', icona: 'ciboCola', name: 'Coca-Cola', portion: 'lattina 330 ml', kcal: 139 },
  { id: 'spritz', icona: 'ciboSpritz', name: 'Spritz', portion: 'calice 200 ml', kcal: 170 },
  { id: 'gelato-crema', icona: 'ciboGelato', name: 'Gelato in coppetta, gusti alla crema', portion: '2 palline', kcal: 180 },
  { id: 'snickers', icona: 'ciboCioccolato', name: 'Barretta di cioccolato', portion: 'Snickers, 50 g', kcal: 241 },
  { id: 'patatine-sacchetto', icona: 'ciboPatatine', name: 'Patatine in sacchetto', portion: '50 g', kcal: 274 },
  { id: 'patatine-fritte', icona: 'ciboFritte', name: 'Patatine fritte', portion: 'porzione media', kcal: 340 },
  { id: 'tiramisu', icona: 'ciboTiramisu', name: 'Tiramisù', portion: '1 porzione', kcal: 420 },
  { id: 'sushi', icona: 'ciboSushi', name: 'Sushi misto', portion: '11 pezzi', kcal: 500 },
  { id: 'hamburger', icona: 'ciboHamburger', name: 'Hamburger classico', portion: 'senza patatine', kcal: 600 },
  { id: 'ramen-pollo', icona: 'ciboRamen', name: 'Ramen di pollo', portion: '1 ciotola', kcal: 700 },
  { id: 'pizza-verdure', icona: 'ciboPizzaVerdure', name: 'Pizza con le verdure', portion: 'intera', kcal: 750 },
  { id: 'pizza-margherita', icona: 'ciboPizza', name: 'Pizza margherita', portion: 'intera', kcal: 850 },
  { id: 'ramen-maiale', icona: 'ciboRamenMaiale', name: 'Ramen di maiale', portion: '1 ciotola', kcal: 900 },
  { id: 'pizza-funghi', icona: 'ciboPizzaFunghi', name: 'Pizza prosciutto e funghi', portion: 'intera', kcal: 950 },
  { id: 'pizza-diavola', icona: 'ciboPizzaDiavola', name: 'Pizza diavola', portion: 'intera', kcal: 1050 },
]

/** @returns {object|null} null se l'id non esiste piu' (voce tolta dall'elenco) */
export const foodById = (id) => FOODS.find((f) => f.id === id) || null

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
