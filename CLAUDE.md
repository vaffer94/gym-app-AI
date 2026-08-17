# CLAUDE.md — istruzioni per chi lavora su questo repo

Questo file lo legge automaticamente ogni chat di Claude aperta qui. Serve a far
partire una chat nuova sapendo gia' le cose che altrimenti si scoprono sbagliando.

Il progetto e' di **Vania**, che lo usa davvero in palestra. Non e' un esercizio:
un dato sbagliato in uno storico e' un allenamento che non torna piu'.

## 1. Regole di lavoro (queste vengono prima di tutto)

- **Sul `main` ci va solo Vania.** Si lavora sempre su un branch (`web/...`,
  `watch/...`, `docs/...`). Il merge lo fa lei, dopo aver provato sul suo dispositivo.
- **I branch non si cancellano.** Nemmeno quelli mergiati, nemmeno per fare ordine.
- **Un punto alla volta.** Quando la richiesta contiene piu' punti: si analizza il
  primo, si fanno le domande che servono, si implementa, si committa, si passa al
  secondo. Niente batch da otto modifiche in un commit unico.
- **Prima le domande, poi il codice**, quando una scelta cambia il risultato. Le
  decisioni prese vanno scritte in `docs/flussi-utente.md` (il perche', non il cosa).
- **I file di configurazione non si toccano**: `.env.local`, `watch/local.properties`,
  `watch/app/google-services.json` sono locali e contengono credenziali reali. Se serve
  provare qualcosa senza credenziali, esiste la modalita' demo (§4).
- **Niente numeri inventati.** Formule, soglie fisiologiche e valori nutrizionali
  devono avere un riferimento verificabile citato nel commento accanto al codice
  (Keytel 2005, Mifflin-St Jeor 1990, CREA, ...). Se una fonte non c'e', si dice che
  non c'e' invece di assecondare. Vale anche quando Vania insiste.
- **Non dire "fatto" per qualcosa che non hai visto funzionare.** Se una cosa non e'
  verificabile qui (vedi §4), si consegna lo stesso e si dichiara esplicitamente cosa
  resta da provare sul dispositivo.

## 2. Cos'e'

Due applicazioni sullo stesso backend Firebase (progetto `gym-app-2dd77`):

| | dove | cosa fa |
|---|---|---|
| **Web app (PWA)** | `src/` — React 19 + Vite | schede, esecuzione allenamento, storico, statistiche, obiettivi, integrazione Google Health |
| **App watch** | `watch/` — Kotlin + Compose for Wear OS, Gradle proprio | esecuzione allenamento **standalone** sul Pixel Watch 2, HR continuo, upload sessioni |

Le due app scrivono le **stesse collezioni Firestore**: un allenamento fatto al polso
compare nello storico web e viceversa. Chi cambia il modello dati deve cambiarlo da
entrambe le parti (vedi `docs/architettura.md`, §"Contratto web ↔ watch").

## 3. Comandi

```bash
npm install
npm run dev            # web, http://localhost:5173  (meglio: preview_start "web-dev")
npm run build          # build di produzione — falla sempre prima di consegnare
npm run build:catalog  # rigenera src/data/catalog.json da free-exercise-db (raro)
firebase deploy        # pubblica su Firebase Hosting — lo fa Vania, non tu
```

```bash
cd watch && ./gradlew installRelease   # APK sul Pixel Watch collegato via ADB
```

Non ci sono test automatici: la verifica e' la build piu' la prova a schermo.

## 4. Come si verifica una modifica web

1. `preview_start` con `name: "web-dev"` (configurato in `.claude/launch.json`) — mai
   avviare il dev server da Bash.
2. Login: in sviluppo c'e' il pulsante **"Entra in modalita' demo (solo sviluppo)"**,
   che esiste solo con `import.meta.env.DEV` e non finisce nel bundle di produzione.
   La demo tiene i dati in `localStorage`, l'utente finto e' in memoria (un reload
   della pagina fa uscire).
3. Guarda `read_console_messages` — attenzione: restituisce lo **storico** anche dopo
   i reload, quindi un errore vecchio sembra nuovo. Leggi la coda, non il primo hit.
4. Controlla la larghezza a **375 px e 320 px**: e' un'app da telefono e il layout ha
   gia' sfondato lo schermo una volta.
5. `npx vite build` prima di dichiarare finito.

**Cosa non e' verificabile qui**, e va detto invece di essere aggirato: tutto cio' che
passa da un login Google vero (Firestore reale, OAuth di Google Health, quindi i
pulsanti di sincronizzazione), e tutto il watch, che richiede il dispositivo fisico.

## 5. Convenzioni

- **Tutto in italiano**: interfaccia, commenti, messaggi di commit, documentazione.
- Nei **commenti e nei messaggi di commit** gli accenti si scrivono in ASCII (`e'`,
  `piu'`, `perche'`). Nelle **stringhe di interfaccia** invece si usano gli accenti
  veri e l'apostrofo tipografico (`è`, `più`, `l’app`).
- **I commenti spiegano il perche', non il cosa.** Lo stile del repo e' quello: accanto
  a una scelta non ovvia c'e' scritto cosa si era provato prima e perche' non andava.
  Quando cambi una di quelle scelte, aggiorna anche il commento — un commento che
  difende una decisione morta e' peggio di nessun commento.
- **Commit**: `tipo(ambito): descrizione` con `feat` / `fix` / `docs` / `chore` e ambito
  `web` o `watch` (es. `fix(web): le kcal di Google si chiedono al minuto`). Frase in
  minuscolo, descrittiva del comportamento, non del file toccato.
- **Grafica**: si usano **solo** i componenti di `src/styles/global.css`, e le regole di
  `DESIGN.md` (bordi 3px, ombre piatte, palette corta) sono vincolanti. Serve qualcosa
  di nuovo? Prima si aggiunge al CSS, poi lo si usa.
- **Dati mostrati all'utente**: la fonte si dichiara sempre in interfaccia. Una stima
  porta scritto "(stima)". Un numero al ±20% presentato come misura e' una bugia.

## 6. Trappole gia' pagate

- **`watch/` non si aggiorna da solo.** Nessun deploy propaga le modifiche al watch:
  l'APK va reinstallato a mano con `./gradlew installRelease`, e il codice vecchio
  continua a girare senza dirlo. Il collegamento ADB al Pixel Watch ha un rito preciso
  (hotspot, watch in carica, porta A ≠ porta B) descritto nel README.
- **Re-export tra moduli e HMR di Vite**: `export { x } from './y'` fatto per compatibilita'
  ha rotto il dev server con `Export 'x' is not defined in module`, mentre la build di
  produzione passava. Se una cosa funziona in build e non in dev, guarda li'.
- **Gli esercizi si identificano per nome normalizzato** (`exerciseId`), mai per `key`:
  la chiave e' univoca dentro una scheda, e duplicando la scheda lo storico si
  spezzerebbe in due esercizi diversi. Unica eccezione documentata: la ricerca delle
  zone per segmento in `exerciseStats.js`, che lavora ancora per chiave.
- **Le chiavi di `localStorage` non si rinominano.** `gym.health.stepsGoal` sta nel
  namespace delle integrazioni anche se ora l'obiettivo passi vive negli obiettivi:
  rinominarla azzererebbe l'obiettivo gia' impostato sul telefono di Vania. Per
  invalidare una cache si cambia il **prefisso di versione** (`gym.kcal3.`).
- **Google Health rifiuta le finestre grandi**: `rollUp` va chiesto a finestre da 60
  secondi e sommato, se no risponde `400 Invalid argument`. Il limite reale (fra 5 e 15
  minuti) non e' documentato da Google, l'abbiamo misurato noi.
- **Firestore non supporta array annidati**: le curve HR stanno in due array paralleli
  `hrT` / `hrBpm`.

## 7. La documentazione

| file | cosa contiene |
|---|---|
| `README.md` | setup da zero: Firebase, Google Health, Android Studio, ADB, deploy |
| `docs/piano-sviluppo-gym-app.md` | decisioni architetturali, modello dati, roadmap in 8 step, rischi |
| `docs/flussi-utente.md` | **come si comporta l'app e perche'** — F0…F6, una sezione per iterazione |
| `docs/architettura.md` | mappa del codice: chi fa cosa, i contratti dati, dove mettere le mani |
| `DESIGN.md` | regole grafiche vincolanti |
| `watch/README.md` | setup, struttura e stato dell'app Wear OS |

**Dove scrivere una decisione nuova**: in `docs/flussi-utente.md`, nella sezione
dell'iterazione in corso, col motivo e con cosa era stato scartato. Le decisioni
strutturali (modello dati, scelte di piattaforma) vanno in
`docs/piano-sviluppo-gym-app.md`. La documentazione si aggiorna **nello stesso branch**
della modifica che la rende vera, non dopo.

## 8. Se ci sono piu' chat aperte su questo repo

C'e' una sola copia di lavoro: due chat che modificano gli stessi file si sovrascrivono
a vicenda senza accorgersene.

- **Prima di toccare qualsiasi cosa**: `git status` e `git branch --show-current`. Se il
  branch non e' quello che ti aspettavi, o ci sono modifiche non committate che non hai
  fatto tu, fermati e chiedi — un'altra chat sta lavorando.
- **Committa spesso**: un commit e' il modo in cui il lavoro sopravvive a un'altra chat.
- **Non fare `git checkout` / `git switch` di un branch altrui** per "dare un'occhiata":
  porta via il lavoro sotto i piedi dell'altra sessione.
- Se servono due lavori davvero in parallelo, si usa un **worktree** separato, non lo
  stesso branch a turno.
