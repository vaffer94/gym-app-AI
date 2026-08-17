/**
 * Il registro delle icone: l'UNICO posto che sa da dove viene un disegno.
 *
 * Le pagine chiedono un'icona per quello che SIGNIFICA (`pesi`, `battito`), mai
 * per come si chiama nella libreria. E' la ragione d'essere di questo file: il
 * giorno in cui una di queste viene ridisegnata a mano, si cambia una riga qui e
 * nessuna riga nelle pagine. Senza questo strato, sostituire un'icona vorrebbe
 * dire ripassare i 21 file che la usano.
 *
 * Da Font Awesome si e' passati a pixelarticons (MIT) per lo stile a pixel. Si
 * usano gli SVG e non il webfont, che pure esiste: un glifo di un font ha un
 * colore solo, e le icone disegnate in casa devono poter essere multicolore.
 *
 * Le icone proprie vanno in `mie/`, si aggiungono qui sotto e vincono su quella
 * della libreria che sostituiscono.
 */
import { ArrowLeft } from 'pixelarticons/react/ArrowLeft'
import { ArrowRight } from 'pixelarticons/react/ArrowRight'
import { ArrowUp } from 'pixelarticons/react/ArrowUp'
import { ArrowDown } from 'pixelarticons/react/ArrowDown'
import { Close } from 'pixelarticons/react/Close'
import { Check } from 'pixelarticons/react/Check'
import { Plus } from 'pixelarticons/react/Plus'
import { Minus } from 'pixelarticons/react/Minus'
import { Play } from 'pixelarticons/react/Play'
import { Pause } from 'pixelarticons/react/Pause'
import { Forward } from 'pixelarticons/react/Forward'
import { Reload } from 'pixelarticons/react/Reload'
import { Undo } from 'pixelarticons/react/Undo'
import { Trash } from 'pixelarticons/react/Trash'
import { Pencil } from 'pixelarticons/react/Pencil'
import { PenSquare } from 'pixelarticons/react/PenSquare'
import { Send } from 'pixelarticons/react/Send'
import { Logout } from 'pixelarticons/react/Logout'
import { Clock } from 'pixelarticons/react/Clock'
import { Hourglass } from 'pixelarticons/react/Hourglass'
import { Heart } from 'pixelarticons/react/Heart'
import { Star } from 'pixelarticons/react/Star'
import { Trophy } from 'pixelarticons/react/Trophy'
import { Target } from 'pixelarticons/react/Target'
import { WarningDiamond } from 'pixelarticons/react/WarningDiamond'
import { CircleInfo } from 'pixelarticons/react/CircleInfo'
import { Cloud } from 'pixelarticons/react/Cloud'
import { Bug } from 'pixelarticons/react/Bug'
import { Lightbulb } from 'pixelarticons/react/Lightbulb'
import { CommentText } from 'pixelarticons/react/CommentText'
import { Google } from 'pixelarticons/react/Google'
import { Music } from 'pixelarticons/react/Music'
import { Human } from 'pixelarticons/react/Human'
import { HumanArmsUp } from 'pixelarticons/react/HumanArmsUp'
import { SpeedFast } from 'pixelarticons/react/SpeedFast'
import { SpeedMedium } from 'pixelarticons/react/SpeedMedium'
import { Waves } from 'pixelarticons/react/Waves'
import { TreePine } from 'pixelarticons/react/TreePine'
import { Leaf } from 'pixelarticons/react/Leaf'
import { Flag } from 'pixelarticons/react/Flag'

// Derivate dalle emoji che l'app usava — vedi src/icons/CREDITI.md
import Allenamento from './da-emoji/Allenamento'
import Obiettivi from './da-emoji/Obiettivi'
import ObiettivoPassi from './da-emoji/ObiettivoPassi'
import ObiettivoEnergia from './da-emoji/ObiettivoEnergia'
import Festa from './da-emoji/Festa'
import Energia from './da-emoji/Energia'
import Schede from './da-emoji/Schede'
import StoricoSezione from './da-emoji/StoricoSezione'
import Integrazioni from './da-emoji/Integrazioni'
import Orologio from './da-emoji/Orologio'
import Cerca from './da-emoji/Cerca'
import NuotoSezione from './da-emoji/NuotoSezione'
import Scrivimi from './da-emoji/Scrivimi'
import NotaScritta from './da-emoji/NotaScritta'
import Parametri from './da-emoji/Parametri'
import CatBraccia from './da-emoji/CatBraccia'
import CatAvambracci from './da-emoji/CatAvambracci'
import CatSpalle from './da-emoji/CatSpalle'
import CatPetto from './da-emoji/CatPetto'
import CatSchiena from './da-emoji/CatSchiena'
import CatCore from './da-emoji/CatCore'
import CatGambe from './da-emoji/CatGambe'
import CatPolpacci from './da-emoji/CatPolpacci'
import CatCardio from './da-emoji/CatCardio'
import CatCollo from './da-emoji/CatCollo'
import CiboProsecco from './da-emoji/CiboProsecco'
import CiboVinoRosso from './da-emoji/CiboVinoRosso'
import CiboBirra from './da-emoji/CiboBirra'
import CiboGranita from './da-emoji/CiboGranita'
import CiboGinTonic from './da-emoji/CiboGinTonic'
import CiboTeLimone from './da-emoji/CiboTeLimone'
import CiboCola from './da-emoji/CiboCola'
import CiboSpritz from './da-emoji/CiboSpritz'
import CiboGelato from './da-emoji/CiboGelato'
import CiboCioccolato from './da-emoji/CiboCioccolato'
import CiboPatatine from './da-emoji/CiboPatatine'
import CiboFritte from './da-emoji/CiboFritte'
import CiboTiramisu from './da-emoji/CiboTiramisu'
import CiboSushi from './da-emoji/CiboSushi'
import CiboHamburger from './da-emoji/CiboHamburger'
import CiboRamen from './da-emoji/CiboRamen'
import CiboPizzaVerdure from './da-emoji/CiboPizzaVerdure'
import CiboPizza from './da-emoji/CiboPizza'
import CiboRamenMaiale from './da-emoji/CiboRamenMaiale'
import CiboPizzaFunghi from './da-emoji/CiboPizzaFunghi'
import CiboPizzaDiavola from './da-emoji/CiboPizzaDiavola'

export const ICONE = {
  // --- navigazione e azioni ---
  indietro: ArrowLeft,
  avanti: ArrowRight,
  su: ArrowUp,
  giu: ArrowDown,
  chiudi: Close,
  fatto: Check,
  aggiungi: Plus,
  togli: Minus,
  avvia: Play,
  pausa: Pause,
  salta: Forward,
  ricarica: Reload,
  elimina: Trash,
  modifica: Pencil,
  nota: PenSquare,
  invia: Send,
  esci: Logout,

  // --- tempo ---
  durata: Clock,
  storico: Clock,
  // "Posticipa" e' l'unico gesto che riporta indietro qualcosa gia' passato:
  // la freccia di ritorno lo dice meglio di un altro orologio, che si
  // confonderebbe con la durata mostrata due righe sopra.
  posticipa: Undo,
  attesa: Hourglass,

  // --- allenamento e risultati ---
  // Sostituisce fa-dumbbell: la libreria non ha manubri, e la figura che
  // solleva dice il gesto invece dell'attrezzo.
  pesi: HumanArmsUp,
  battito: Heart,
  medaglia: Star,
  trofeo: Trophy,
  passi: Target,

  // --- stati e messaggi ---
  avviso: WarningDiamond,
  info: CircleInfo,
  nuvola: Cloud,
  problema: Bug,
  idea: Lightbulb,
  commento: CommentText,
  googlePlay: Google,

  // --- attivita' rilevate da Google (tabella in data/health.js) ---
  camminata: Human,
  // Segnaposto dichiarati: `speed-fast` e `speed-medium` leggono come tachimetri,
  // non come una persona che corre o pedala. Distinguono le due attivita' fra
  // loro e nient'altro; sono le prime due da ridisegnare.
  corsa: SpeedFast,
  bici: SpeedMedium,
  nuoto: Waves,
  escursione: TreePine,
  yoga: Leaf,
  ballo: Music,
  sport: Flag,

  // --- derivate dalle emoji, a colori (src/icons/da-emoji/) ---
  allenamento: Allenamento,                 // 🏋 avvia allenamento, logo
  obiettivi: Obiettivi,                     // 🎯 sezione Obiettivi
  obiettivoPassi: ObiettivoPassi,           // 👟 obiettivo passi
  obiettivoEnergia: ObiettivoEnergia,       // 🍽 obiettivo energia, equivalenti
  festa: Festa,                             // 🎉 fine allenamento
  energia: Energia,                         // 🔥 avvia allenamento, obiettivo settimana, HIIT
  schede: Schede,                           // 📋 sezione Schede
  storicoSezione: StoricoSezione,           // 📊 sezione Storico
  integrazioni: Integrazioni,               // 🔌 sezione Integrazioni
  orologio: Orologio,                       // ⌚ watch, in home e in Integrazioni
  cerca: Cerca,                             // 🔍 diagnostica kcal
  nuotoSezione: NuotoSezione,               // 🏊 intestazione attivita' conteggiate
  scrivimi: Scrivimi,                       // 💬 intestazione Scrivimi
  notaScritta: NotaScritta,                 // 📝 nota di un esercizio nello storico
  parametri: Parametri,                     // ⚖ sezione Parametri: peso, altezza, eta'
  catBraccia: CatBraccia,                   // 💪 categoria Braccia
  catAvambracci: CatAvambracci,             // ✊ categoria Avambracci
  catSpalle: CatSpalle,                     // 🤸 categoria Spalle
  catPetto: CatPetto,                       // 🛡 categoria Petto
  catSchiena: CatSchiena,                   // 🧗 categoria Schiena
  catCore: CatCore,                         // 🍫 categoria Core / Addome
  catGambe: CatGambe,                       // 🦵 categoria Gambe
  catPolpacci: CatPolpacci,                 // 🦶 categoria Polpacci
  catCardio: CatCardio,                     // ❤ categoria Cardio
  catCollo: CatCollo,                       // 🦒 categoria Collo
  ciboProsecco: CiboProsecco,               // 🥂 calice di vino bianco
  ciboVinoRosso: CiboVinoRosso,             // 🍷 calice di vino rosso
  ciboBirra: CiboBirra,                     // 🍺 birra bionda
  ciboGranita: CiboGranita,                 // 🍧 gelato alla frutta
  ciboGinTonic: CiboGinTonic,               // 🍸 gin tonic
  ciboTeLimone: CiboTeLimone,               // 🍋 te' freddo al limone
  ciboCola: CiboCola,                       // 🥤 Coca-Cola
  ciboSpritz: CiboSpritz,                   // 🍹 spritz
  ciboGelato: CiboGelato,                   // 🍨 gelato alla crema
  ciboCioccolato: CiboCioccolato,           // 🍫 barretta di cioccolato
  ciboPatatine: CiboPatatine,               // 🥔 patatine in sacchetto
  ciboFritte: CiboFritte,                   // 🍟 patatine fritte
  ciboTiramisu: CiboTiramisu,               // 🍰 tiramisu'
  ciboSushi: CiboSushi,                     // 🍣 sushi misto
  ciboHamburger: CiboHamburger,             // 🍔 hamburger
  ciboRamen: CiboRamen,                     // 🍜 ramen di pollo
  ciboPizzaVerdure: CiboPizzaVerdure,       // 🫑 pizza con le verdure
  ciboPizza: CiboPizza,                     // 🍕 pizza margherita
  ciboRamenMaiale: CiboRamenMaiale,         // 🐖 ramen di maiale
  ciboPizzaFunghi: CiboPizzaFunghi,         // 🍄 pizza prosciutto e funghi
  ciboPizzaDiavola: CiboPizzaDiavola,       // 🌶 pizza diavola
}
