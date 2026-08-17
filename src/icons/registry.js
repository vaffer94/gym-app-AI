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
import { Fire } from 'pixelarticons/react/Fire'
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
  energia: Fire,

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
}
