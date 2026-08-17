# Flussi utente — Gym Workout App (prima iterazione, web/PWA)

**Data:** 13/07/2026 · Livello macro: il dettaglio fine si definisce coi mockup, step per step.

---

## F0 — Accesso

1. Prima apertura → schermata di benvenuto → **login con Google**
2. Dopo il login, home con 3 azioni principali:
   - **Schede**
   - **Storico / Statistiche**
   - **Avvia allenamento**
3. Stati vuoti al primo accesso: nessuna scheda → invito "Crea la tua prima scheda"
4. Logout dal profilo. (Eliminazione account: progettata prima della pubblicazione sul Play Store, non in v1)

## F1 — Sezione Schede

### F1.1 Creare una scheda
1. Nome della scheda (obbligatorio, deciso dall'utente, riconoscibile)
2. **Finalità** (label personali): selezione da lista propria + possibilità di aggiungere nuove voci, riproposte le volte successive (es. cardio, muscoli, yoga, fisioterapia, recupero)
3. Aggiunta esercizi, uno alla volta — **campo unico ricerca-o-crea**:
   - Scrivi il nome → ricerca live nel catalogo (free-exercise-db) → selezioni l'esercizio, oppure
   - Nessun match / vuoi crearlo da zero → diventa esercizio custom
   - **Foto**: default quella del catalogo se selezionato da lì; sempre possibile scattarne/caricarne una nuova (override personale)
   - **Categoria**: preimpostata dal catalogo o scelta dall'utente tra le categorie fisse della tassonomia (braccia sup./inf., spalle, petto, schiena, core/addome, gambe sup./inf., cardio, collo). Non estendibile dall'utente
   - **Descrizione**: precompilata dal catalogo se presente, modificabile
   - **Serie** (es. 3-4) e **ripetizioni** (es. 13-15)
   - **Opzione pesi** (default ON) → campo peso in kg
4. Ogni esercizio inserito appare come **tile** (nome, miniatura, serie × ripetizioni) nella scheda in costruzione
5. Si continua ad aggiungere finché non si **convalida** la scheda

### F1.2 Vedere / gestire le schede
- Elenco schede esistenti; dettaglio con esercizi, serie/reps, pesi, tempistiche
- **Duplica e modifica**: crea una copia (con nuovo nome scelto dall'utente) modificabile a partire dagli esercizi esistenti. Le sessioni passate non cambiano mai (snapshot)
- **Elimina scheda** (lo storico resta intatto)
- Elimina/modifica esercizi custom (le schede che li usano mantengono lo snapshot)

## F2 — Avvia allenamento

### F2.1 Setup
1. Propone l'**ultima scheda creata/modificata**; pulsante per cambiarla
2. Configurazione della **soglia di recupero** per questa sessione (default 1 min) — vale sia tra le serie sia tra gli esercizi
3. **Pulsante grande START** → parte il cronometro della sessione

### F2.2 Esecuzione
- Vista lista-scheda: si vede tutta la scheda; l'app propone il prossimo esercizio secondo le **regole di ordinamento** (sotto). Possibile scegliere manualmente o premere **Posticipa**
- Vista esercizio: tante **tile quante sono le serie**, con stato fatto/da fare; sotto: foto e descrizione dell'esercizio
- **Done** su una serie → parte il recupero automatico
  - Sul tile della serie: **reps e peso effettivi precompilati col target**, modificabili con tocco lungo/matita solo in caso di deviazione (dato strutturato per statistiche e coach)
- **Recupero** (stessa logica tra serie e tra esercizi):
  - countdown della soglia configurata; pulsante **+1 min** (ripetibile); pulsante **Salta pausa**
  - al termine ricompare l'elenco serie (o parte il prossimo esercizio se le serie sono finite)
- **Note**: a inizio/fine esercizio, pulsante per aggiungere una nota libera (es. "oggi 12kg invece di 15", "attrezzo occupato"). Se non inserite durante, vengono richieste a fine allenamento
- **Pausa allenamento**: pulsante dedicato; il tempo in pausa è escluso dalle statistiche
- **Ripresa automatica**: se il browser si chiude a metà, la sessione riprende da dove era

### F2.3 Regole di ordinamento e posticipa
1. Gli esercizi vengono proposti **nell'ordine della scheda**. Fino al 01/08/2026 erano raggruppati per categoria: la regola tirava avanti tutti gli esercizi della prima categoria (es. tre cyclette di fila) rompendo l'alternanza voluta da chi aveva creato la scheda
2. **Posticipa** (1ª volta) → l'esercizio va in coda alla propria categoria
3. **Posticipa** (2ª volta) → va in fondo all'intero allenamento
4. Se rifiutato anche lì → marcato saltato per questa sessione
5. (Stessa logica da replicare sull'app watch)

### F2.4 Fine allenamento
- **Automatica** quando tutte le serie sono done, oppure **pulsante Termina** sempre disponibile → sessione salvata come parziale
- Richiesta note mancanti
- **Riepilogo statistiche di sessione**: durata, data/ora inizio e fine, esercizi e serie completati vs scheda, note, tempi per esercizio, tempi di pausa, confronto con l'allenamento precedente della stessa scheda e differenze, percentuale esercizi per categoria
- **Energia (kcal) + equivalente alimentare** (dal 09/08/2026): vedi F4

## F4 — Energia e equivalente alimentare

0. **Quale grandezza si mostra** (deciso il 10/08/2026): il numero grande e' il **totale** (`total-calories` = attive + metabolismo basale), lo stesso criterio con cui l'app Fitbit mostra le calorie di un allenamento. Sotto, in piccolo, "di cui N kcal attive". Prima si mostravano solo le attive e sembravano sistematicamente troppo basse: su una sessione da 30 minuti facevano 89 kcal contro 145 totali. Anche l'equivalente alimentare e la ripartizione per esercizio usano il totale, cosi' qualunque numero si guardi nell'app parla della stessa cosa
1. **Fonte del dato, in ordine di fiducia:**
   - **Google Health**, tipi `total-calories` e `active-energy-burned`, `rollUp` con **finestre da 60 secondi sommate**. Scope `activity_and_fitness.readonly`, gia' concesso. Funziona sia per gli allenamenti registrati da Google sia per i nostri, perche' la domanda e' su un intervallo di tempo e non su una sessione
   - ⚠️ **La finestra unica grande quanto l'intervallo non funziona**: Google risponde `400 Invalid argument in request`. Sondando le dimensioni (10/08/2026) il limite e' risultato **fra 5 e 15 minuti** per finestra, e non e' documentato — la documentazione dichiara solo un minimo di 1 secondo e nessun massimo. Verificato anche che finestre da 1 e da 5 minuti danno lo **stesso identico totale**, quindi sommare non perde pezzi. Il numero di finestre restituite e' un controllo a occhio: deve tornare coi minuti dell'allenamento
   - **Stima da battito** (Keytel et al. 2005) quando Google non e' collegato o non ha dati per quell'ora. Richiede eta', peso, **altezza** e sesso biologico, impostati nella card **Parametri in home** e tenuti in `localStorage` (non su Firestore)
   - **Metabolismo basale: Mifflin-St Jeor** (1990), indicata dalla letteratura clinica come la piu' affidabile fra le equazioni predittive (entro il 10% della calorimetria indiretta piu' spesso di ogni altra). Keytel predice il dispendio *totale* durante l'esercizio: sottraendo il basale si ottiene la quota attiva
     - ⚠️ Fino al 10/08/2026 il basale era approssimato a **1 MET** (0,0175 kcal/min per kg). E' una convenzione di fisiologia dell'esercizio tarata su un uomo di 70 kg e 40 anni, **non** un'equazione di metabolismo basale: su una donna di 62 kg e 165 cm sovrastimava del **17%** (33 kcal invece di 28 in mezz'ora). L'avevo scelta per non chiedere l'altezza — una scorciatoia pagata in accuratezza, segnalata dall'utente
     - Senza altezza si ripiega ancora su 1 MET, ma **dichiarandolo** in interfaccia
   - La stima resta piu' alta del misurato (Keytel e' documentato come tendente a sovrastimare). Nessun coefficiente correttivo inventato: si dichiara che la stima legge alto
2. La fonte e' **sempre dichiarata** in interfaccia: la stima porta la scritta "(stima)". Un ±15-20% presentato come misura sarebbe una bugia
3. Le kcal di Google vengono messe in cache per sessione (non cambiano piu'); le stime **no**, cosi' seguono subito le correzioni al profilo
4. **Equivalente alimentare**: accanto alle kcal l'emoji dell'alimento piu' calorico che sta *sotto* al valore bruciato. Toccandola si apre la lista completa (21 voci, kcal crescenti) con la riga corrispondente evidenziata e gia' portata in vista. Sotto la voce piu' piccola (88 kcal) si mostra comunque quella, preceduta da "Quasi:"
5. La lista sta in `src/data/foods.js` con le fonti in testa. I valori sono **ordini di grandezza**, non misure: la porzione fa parte del nome perche' e' lei a fare la differenza

## F3 — Storico e statistiche

- Elenco sessioni passate; dettaglio = stesse grandezze del riepilogo di fine sessione
- **Andamenti aggregati** per settimana / mese / trimestre (durate, volume, completamento, distribuzione per categoria, andamento pesi per esercizio)
- Correzione a posteriori di una sessione: done errati, note, eliminazione sessione

## Decisioni presi in questa sessione di raccolta requisiti

| Tema | Decisione |
|---|---|
| Deviazioni da target | Note libere **+** reps/peso effettivi strutturati (precompilati, un tocco se conformi) |
| Fine allenamento | Automatica a completamento + pulsante Termina (sessione parziale) |
| Interruzioni | Pausa sessione + Salta pausa + ripresa automatica |
| Recupero | Unica soglia globale configurata a inizio sessione, applicata dopo ogni serie e tra esercizi; +1 min a pressione. Override per esercizio: rimandato |
| Auto-avvio esercizio dopo pausa | Accettato come trade-off v1; nota rapida "attrezzo occupato" per marcare tempi falsati |

## F5 — Calendario, zone del cuore, statistiche per esercizio (09/08/2026)

### F5.1 Il calendario apre l'allenamento
Nel calendario di Andamento, toccare un giorno con l'icona del manubrio apre **direttamente il dettaglio dell'allenamento**. Con piu' sessioni nello stesso giorno si apre la prima: e' l'unico caso ambiguo e l'elenco completo resta a un tocco.

### F5.2 Zone del cuore
Modello a **tre zone piu' il fuori-zona** (`FAT_BURN`, `CARDIO`, `PEAK`), cioe' quello di Fitbit/Google e non uno dei tanti schemi a cinque zone: cosi' le soglie calcolate da noi e quelle che arrivano da Google hanno la stessa forma e restano confrontabili.

1. **Soglie**, in ordine di fiducia:
   - `daily-heart-rate-zones` di Google → min/max bpm **reali**, personalizzati con Karvonen su eta' e battito a riposo
   - ripiego: 220 meno l'eta' con le percentuali Fitbit (50-69% / 70-84% / 85-100%), dichiarato in interfaccia come stima con errore tipico ±10-12 bpm
   - Lo scope `health_metrics_and_measurements.readonly` si chiede **separatamente**, con un pulsante dedicato in Integrazioni: allargare il consenso iniziale significherebbe che un rifiuto fa saltare anche passi e allenamenti, che gia' funzionano. Va comunque aggiunto alla schermata di consenso in Google Cloud
2. **Linee nel grafico HR** ai confini di zona, con sigla e valore in bpm. Testo scuro con alone bianco e non colorato: il giallo di "brucia grassi" sopra la banda gialla di un esercizio era illeggibile
3. **Istogrammi della percentuale per zona**, con dentro il **contributo dei singoli esercizi**, negli stessi colori delle bande del grafico
   - Il tempo per zona lo calcoliamo **noi** dai campioni `hrT`/`hrBpm`, non da `time-in-heart-rate-zone` di Google: quello e' un totale d'intervallo e non e' scomponibile per esercizio, che e' proprio la cosa da vedere. Da Google solo le soglie
   - Ogni campione vale l'intervallo fino al successivo, con **tetto di 30s**: senza, un orologio tolto per dieci minuti regalerebbe dieci minuti a una zona
   - I contributi sotto i 15s spariscono dall'elenco scritto (restano nella barra): sono il campione a cavallo fra due esercizi, e riempivano la riga di "Cyclette 5″"

### F5.3 Statistiche per esercizio
Scheda **Esercizi** nello Storico: elenco degli esercizi con quante volte e il tempo totale, e per ognuno una pagina con tempo totale, durata, battito medio, kcal, volume e zone del cuore.

- Gli esercizi si identificano per **nome normalizzato**, non per `key`: la chiave e' univoca dentro una scheda, e duplicando la scheda la stessa "Cyclette" ne prenderebbe una nuova, spezzando in due lo storico proprio mentre se ne guarda l'andamento
- **kcal per esercizio: Google da' la scala, Keytel la forma.** Google misura solo il totale dell'intervallo (`active-energy-burned` su finestre di pochi minuti non e' affidabile); Keytel sa come il consumo si distribuisce, perche' tiene conto di battito e durata di ogni tratto. Usati separatamente si contraddicevano: sul 03/08/2026 Google diceva 105 kcal in tutto e la sola cyclette, stimata, ne dichiarava di piu' dell'intero allenamento. Ora le stime dei tratti si riscalano sul totale misurato
  - Il totale di riferimento si ricava **sommando le stesse quote**, non ricalcolando la sessione con `hrAvg`: erano due strade diverse per lo stesso numero e non coincidevano (`hrAvg` e' tirato in basso dai recuperi), coi parziali che non sommavano al totale
  - Arrotondamento **coi resti maggiori**: arrotondare ogni voce per conto suo lasciava scarti di qualche kcal
  - Il **recupero ha la sua fetta**: brucia anch'esso ed e' dentro l'intervallo misurato, quindi senza quella riga il conto non chiuderebbe
  - Spezzare il totale in proporzione al solo *tempo* sarebbe stato piu' semplice, ma darebbe lo stesso numero a dieci minuti di cyclette e a dieci di stretching
  - La scheda Esercizi legge il numero **dalla stessa ripartizione** del dettaglio sessione: due schermate che dicono 60 e 61 sarebbero un difetto
- **Confronto** fra ultima volta, volta prima e media dell'ultimo mese (esclusa l'ultima, se no si confronterebbe con se stessa) nello stesso grafico: pieno / a righe / contorno tratteggiato, tutti nel colore dell'esercizio. Tre trattamenti grafici e non tre colori — si distinguono anche senza distinguere le tinte, e non competono con la codifica per colore usata altrove

## F6 — Obiettivi, e grafici piu' leggibili (10/08/2026)

### F6.1 Obiettivi
Terza voce della home, con pagina propria. Tre obiettivi in un posto solo — prima l'unico che esisteva (i passi) stava fra le **Integrazioni**, cioe' fra i collegamenti a servizi esterni, che e' un'altra categoria. In Integrazioni resta solo un rimando.

1. **Allenamenti a settimana** (lunedi'–domenica). Nello Storico si vedono le **settimane di fila** in cui l'obiettivo e' stato rispettato. La settimana in corso non spezza il conto finche' non e' finita: mercoledi' con un allenamento su tre non e' un fallimento, e' una settimana a meta' — stessa grazia gia' usata per le settimane di fila
2. **Passi al giorno**, spostato qui dalle Integrazioni. Chiave di salvataggio invariata: rinominarla avrebbe azzerato l'obiettivo gia' impostato
3. **Energia a settimana, misurata in alimenti.** L'obiettivo si compone scegliendo cibi con le quantita': "due gelati e una pizza" dice qualcosa, "1210 kcal" no
   - Il **carrello e' l'obiettivo**, il numero e' la sua somma: non due impostazioni che possono contraddirsi
   - Il totale resta scrivibile a mano e in quel caso **l'elenco si svuota**: tenere un carrello che somma a un altro numero vorrebbe dire mostrare due obiettivi diversi
   - Nel carrello si salva l'`id` dell'alimento, non l'oggetto: correggere una porzione aggiorna anche gli obiettivi gia' impostati

Nello Storico, in cima all'Andamento, **una medaglietta per settimana**: piena (gialla) se l'obiettivo di allenamenti e' stato raggiunto, altrimenti solo il bordo e niente giallo dentro. Ha sostituito "3 settimane di fila", che era un numero senza contesto — non diceva quali settimane, quante ne fossero state saltate, ne' se prima fosse andata meglio. Cinque settimane visibili piu' un contatore col totale storico; la settimana in corso ha il bordo tratteggiato, perche' non e' ancora giudicabile.

Sotto, la card **"Questa settimana"**: allenamenti fatti sul totale e un alimento per barra che si riempie con l'energia guadagnata.

- Contano **solo gli allenamenti registrati dall'app**. Se valessero anche le attivita' che Google riconosce da solo (una camminata, le scale) la settimana si chiuderebbe stando in piedi, e l'obiettivo smetterebbe di dire qualcosa
- Gli alimenti si riempiono **dal piu' economico in avanti**, che e' anche l'ordine in cui appaiono: partendo dalla pizza da 850 kcal, per meta' settimana sarebbero tutte barre vuote
- La parte mancante e' **trasparente**, non grigia: il grigio sembrerebbe un secondo dato invece che il vuoto

### F6.2 Grafici piu' leggibili
- **Un colore e una voce di legenda per esercizio**, per nome e non per posizione: tre "Cyclette" nella stessa scheda prendevano tre colori e tre voci, e rendevano il grafico illeggibile proprio dove serviva di piu'. Stessa regola nelle zone del cuore, dove i contributi si sommano per nome
- **Soglie di zona in legenda** invece che scritte sulle linee, e i bpm di soglia diventano **tacche vere dell'asse**: la scritta sulla linea copriva il tracciato, e il valore senza asse non era confrontabile. Margine sinistro 40 → 56 px, misurato: "130 bpm" era tagliato di un pixel a 320 px di larghezza
- **Confronto fra allenamenti a istogrammi verticali**: in orizzontale, dentro una colonna di telefono, tre lunghezze quasi uguali in sessanta pixel non dicevano niente. Base a **zero** e non al minimo — la lunghezza della barra *e'* il valore, e far partire l'asse da 150 farebbe sembrare 155 bpm il doppio di 152; il prezzo e' che su grandezze poco variabili le barre si somigliano, per questo il numero e' scritto sopra ciascuna
- Confronto su **durata, battito medio, serie, ripetizioni e peso sollevato**. Niente kcal: su una finestra di pochi minuti non sono calcolabili con abbastanza accuratezza da reggere un confronto (la ripartizione ancorata al totale misurato resta nel dettaglio della sessione). Niente volume: sommare kg di esercizi diversi produce un numero che non corrisponde a nessuna grandezza reale — "peso sollevato" e' il **carico**, non ripetizioni per kg
- **Zone del cuore a istogrammi verticali** nel dettaglio dell'allenamento, con il nome dell'esercizio scritto **su ogni pezzo colorato**: i pastelli adiacenti dentro una barra alta 22 px non erano distinguibili in modo affidabile. Colonne in scala sulla zona piu' battuta e non su 100%, se no con l'80% del tempo in una zona sola le altre sarebbero alte pochi pixel e i pezzi dentro invisibili. Il nome si scrive solo sopra i 13 px di altezza; sotto quella soglia (e per i nomi troppo lunghi per la colonna) resta la riga di dettaglio

### F6.3 Parametri
Da riquadro aperto in home a **pagina propria**: erano stepper, grafico del peso e pieghevole, cioe' piu' spazio dei tre gesti quotidiani per la cosa che si tocca meno spesso. Nella pagina i campi sono **tutti aperti**: il pieghevole serviva a non rubare spazio in home, e in una pagina propria nasconderli aggiunge solo un tocco per arrivare a un campo che si viene apposta a cercare.

### F6.4 Conferma del tocco
Due punti dove il tocco non dava segno di essere arrivato.

- **Alimenti dell'obiettivo**: il carrello che si aggiorna sta sotto al foglio aperto, quindi l'unico modo di sapere se il tocco era andato a segno era chiudere e guardare. La riga lampeggia, e accanto al nome resta un "×N" con le quantita' gia' scelte: il lampo dice "ho sentito", il numero dice quanto ne hai
- **Pulsanti di Google Health**: sincronizzare vuol dire aspettare la rete, e senza stato visibile si preme, non succede niente, e si ripreme. Il pulsante si disabilita e dice cosa sta facendo
- Con `prefers-reduced-motion` resta il lampo di colore e sparisce il movimento

## F7 — Le attivita' importate da Google che contano davvero (17/08/2026)

L'app non e' solo un registratore di palestra: e' anche un tracciatore delle abitudini di
movimento. Google riconosce da solo nuotate, uscite in bici e camminate, ma finora
finivano tutte nello stesso mucchio, viste ma mai conteggiate.

### F7.1 La scelta e' dell'utente, una volta sola

In **Integrazioni** compare "Attivita' da conteggiare": l'elenco dei tipi che Google
riconosce, **tutti spenti di default**, e quelli spuntati valgono come allenamento.

Perche' cosi' e non con una regola automatica: non esiste una regola che valga per due
persone. La stessa bici e' allenamento per chi esce la domenica e trasporto per chi va al
lavoro; la stessa camminata e' un obiettivo per uno e il tragitto alla fermata per un
altro. Prima la regola era "nessuna attivita' di Google conta", che era giusta contro le
camminate e falsa contro le nuotate.

Decisioni prese:

- **L'elenco e' l'unione** fra i tipi che sappiamo nominare e quelli comparsi davvero nei
  dati. Solo i primi lascerebbero fuori un tipo che Google usa e noi non conosciamo; solo
  i secondi obbligherebbero a nuotare una volta prima di poter dire che il nuoto conta.
- **Raggruppati per etichetta**: `CYCLING` e `BIKING` sono un chip solo, se no si vedono
  due voci "Bici" identiche e sembra un difetto.
- **Sta in Integrazioni e non in Obiettivi**, al contrario dell'obiettivo passi che da
  li' era stato spostato: la domanda non e' "quanto voglio fare" ma "di questo servizio,
  cosa mi interessa", e si risponde guardando l'elenco di cio' che l'orologio ha visto.
- **Nessun pulsante Salva**: la spunta e' gia' la conferma.

### F7.2 I doppioni: l'app che si conta due volte

L'app del watch registra con Health Services, e quella sessione **ricompare dentro Google
Health come "esercizio"**. Senza filtro, chi spunta "Pesi" vedrebbe ogni allenamento in
palestra valere due volte sull'obiettivo, con le kcal sommate a se stesse.

Un'attivita' di Google si scarta quando si sovrappone a una sessione dell'app per **almeno
meta' della propria durata**. Non basta un istante in comune: una camminata cominciata
mentre l'allenamento finiva condivide qualche secondo e non e' lo stesso allenamento.
Le attivita' senza orario di fine si giudicano sull'unica cosa osservabile, cioe' se
cominciano dentro l'allenamento.

Lo scarto **si vede**: la riga resta in elenco con scritto "Non conteggiata: e'
l'allenamento che hai gia' registrato con l'app". Se un giorno il filtro sbagliasse, una
riga scomparsa non lo direbbe a nessuno.

### F7.3 La finestra dei 3 mesi

I conteggi misti (app + Google) valgono solo dove **entrambe le fonti hanno dati**: prima
di allora l'app sa tutto e Google non sa niente, e le settimane vecchie risulterebbero
sistematicamente piu' magre di quelle recenti. Il confronto fra settimane — che e' tutto
il senso di una medaglia — sarebbe truccato.

Misurato il 17/08/2026 sui dati veri: Google ha **almeno un anno** di storico (300
attivita' fino al 25/08/2025, paginato), e il taglio a 28 giorni che c'era prima era
**nostro**, non suo. La finestra e' stata portata a **90 giorni**, che coincide col
"Trimestre" del selettore di periodo, cioe' il periodo piu' lungo che una schermata
guardi. Piu' indietro il dato non servirebbe a niente e renderebbe l'elenco dispersivo.

Due finestre diverse, ed e' voluto:

| dove | finestra | perche' |
|---|---|---|
| conteggi (obiettivi, medaglie, record) | 90 giorni | e' il periodo confrontabile |
| elenco "Allenamenti" | 4 settimane | ogni riga costa due chiamate all'API per le kcal |

La differenza e' dichiarata in fondo all'elenco, se no sembra un difetto.

Conseguenza accettata: il totale delle medaglie non dice piu' "in tutto" ma **"in 3
mesi"**. Era una promessa che il dato non puo' piu' mantenere — meglio dichiarare il
periodo che dire "sempre" contando tre mesi. Il **record di giorni di fila (app)** resta
invece su tutto lo storico e app-only: e' un primato gia' conquistato, e troncarlo per
simmetria significherebbe cancellarlo.

### F7.4 Tre stati, riconoscibili senza leggere

| cosa | come si vede |
|---|---|
| allenamento registrato dall'app | card col colore della scheda, ombra, si apre al tocco |
| attivita' di Google conteggiata | riquadro a fondo teal chiaro, bordo pieno, niente ombra |
| attivita' vista ma non conteggiata | bordo tratteggiato, fondo spento, testo attenuato |

Il fondo a righe era stato valutato e scartato: DESIGN.md esclude i gradienti, e le righe
si fanno con `repeating-linear-gradient`.

Nel **calendario** l'attivita' conteggiata e' una **cornice dentro la cella**, non un
secondo fondo: cosi' convive con l'arancione dell'allenamento registrato dall'app invece
di sostituirlo, e in una giornata si vedono tutte e due le cose. E' un `::after` e non un
`box-shadow: inset` perche' `.cal-cell--today` usa gia' `box-shadow` per la sua ombra, e
la seconda regola cancellerebbe la prima.

Il cuoricino resta, ma cambia significato: ora dice "vista e non conteggiata". Un giorno
con la cornice non lo mostra, se no direbbe due volte la stessa cosa con due significati
diversi.

### F7.5 Come si dividono le ultime 4 settimane

"Ti sei allenata sette volte" non dice se sono sette volte la stessa scheda o quattro
schede diverse piu' tre nuotate. Nel riepilogo compare la divisione: da una parte i nomi
delle schede, dall'altra i tipi di attivita' conteggiati, ognuno con **contatore e tempo
medio** — due voci con lo stesso contatore possono essere mezz'ora e due ore.

- **Quattro settimane e non "il mese"**: i mesi sono lunghi diversi, e il confronto fra un
  febbraio e un marzo non e' un confronto.
- **I due elenchi uno sopra l'altro, non affiancati**: a 320px due colonne di nomi mandano
  a capo ogni riga.
- Le attivita' senza orario di fine si contano nel contatore ma **non nella media**:
  sommarle come zero abbasserebbe il tempo medio di un allenamento che c'e' stato.

### F7.6 Correzioni dopo la prova sul telefono (17/08/2026)

- **La cornice del giorno conteggiato passa sotto le icone** dei passi e delle attivita'
  non conteggiate: dicono cose diverse dalla cornice e devono restare leggibili.
- **Cornice piu' spessa e attaccata al bordo** (`inset: 0`, 5px): staccata di qualche
  pixel sembrava un secondo bordo messo per sbaglio, attaccata sembra il giorno colorato
  fin dove finisce.
- **Barra degli allenamenti a tacche**, una per allenamento previsto. La barra continua
  funziona per le kcal, che sono centinaia, ma non per un obiettivo da tre: riempita a un
  terzo non dice "uno su tre", dice "circa un terzo", e la differenza fra uno e due
  allenamenti diventa una questione di pixel. Le barre dell'energia restano continue.

### F7.7 Gli obiettivi seguono la persona, non il dispositivo

Gli obiettivi erano nati come impostazioni locali — "come il profilo, non hanno bisogno
di sincronizzazione" — e con un telefono solo la differenza non si vedeva. Si e' vista
aprendo l'app dal portatile: obiettivo di energia sparito, obiettivo di allenamenti
apparentemente intatto **solo perche' il valore scelto era per caso quello di default**
(3). Il secondo caso e' il piu' insidioso: un default che somiglia a un'impostazione fa
credere che tutto funzioni.

Ora gli obiettivi stanno anche su `users/{uid}/meta/goals`, insieme alla scelta delle
attivita' da conteggiare. `localStorage` resta la copia da cui si legge, perche' le
schermate leggono gli obiettivi mentre disegnano e non possono aspettare la rete.

- **Vince l'ultimo che ha scritto**, confrontando `updatedAt`. Non si fondono: fondere
  "tre allenamenti" con "quattro" non da' un numero che qualcuno abbia scelto.
- **I default non si mandano mai**: un dispositivo che non ha mai impostato niente ha
  timbro 0, e senza questa regola sovrascriverebbe col nulla gli obiettivi veri.
- **Le scritture aspettano 800 ms**: lo stepper si preme piu' volte di fila, e "da 3 a 6"
  sono tre tocchi per un'unica decisione.
- Il **profilo** (eta', peso, altezza) ha lo stesso problema e non e' stato ancora
  spostato: e' il candidato successivo.

## F8 — Integrazioni fuori dallo Storico (17/08/2026)

Le integrazioni erano la quarta scheda dello Storico, insieme a Andamento, Allenamenti
ed Esercizi. Ma le prime tre rispondono a "come sto andando", e questa risponde a "da
dove arrivano i dati": per collegare l'orologio bisognava entrare in una pagina di
statistiche e cercare una scheda, cioe' passare dai risultati per arrivare alla loro
causa.

Ora e' una voce della home, l'**ultima**: si tocca il giorno che si collega Google e poi
quasi mai, come Parametri. Bianca come Parametri per lo stesso motivo — la palette e'
corta e questi due non sono gesti quotidiani.

Conseguenza da non perdere: se Google Health smette di rispondere, l'errore compariva
solo dentro quella scheda. Ora lo Storico mostra una riga rossa con il motivo e il
rimando a Integrazioni, perche' un calendario a cui mancano meta' dei dati, se sta
zitto, sembra semplicemente un calendario vuoto.

La freccia delle schede della home andava a capo da sola sui 320 px, su una riga tutta
sua. Non era il testo nuovo a essere troppo lungo: la riga era `.row` (che va a capo) con
uno `.spacer` in mezzo, quindi il testo spingeva finche' la freccia cadeva sotto. Ora il
testo sta in un blocco `flex: 1; min-width: 0` e va a capo dentro il suo spazio. Il
commento su Parametri che diceva "tienilo corto o la freccia va a capo" e' stato tolto:
difendeva un vincolo che non c'e' piu'.

### F8.1 Scrivere a chi mantiene l'app

Un pulsante 💬 nella barra della home apre una pagina dove si segnala un difetto o si
propone un'idea. Serviva soprattutto per chi non e' Vania: chi trova un problema, oggi,
non ha nessun modo di dirlo.

**Perche' non un `mailto:`**, che era la strada ovvia: un link di posta mette
l'indirizzo in chiaro dentro il bundle JavaScript, che su Hosting si scarica **senza
login** e lo leggono anche i raccoglitori di indirizzi. Il messaggio finisce invece in
`feedback/` su Firestore, che di indirizzi non ne espone nessuno.

**Perche' nessun CAPTCHA**, che era la domanda di partenza: un CAPTCHA protegge un
endpoint pubblico e anonimo, e qui non ce n'e' uno — tutta l'app sta dietro il login
Google, quindi per scrivere una riga un bot dovrebbe prima farsi un account e
autenticarsi. **L'autenticazione e' gia' la scrematura**; un CAPTCHA in piu' fermerebbe
solo le persone. L'unico freno nelle regole e' il tetto di 2000 caratteri sul testo:
non contro i bot, contro un singolo messaggio che riempie il database.

Insieme al testo partono nome, indirizzo dell'account, `userAgent` e **la data della
build** — e la pagina lo dice prima, non dopo, perche' sono dati di chi scrive. La build
serve per la trappola gia' pagata due volte: il service worker puo' servire il bundle
vecchio per un po' dopo un aggiornamento, e senza quel dato si cerca nel codice di oggi
un difetto di quello di ieri.

Le segnalazioni non le rilegge nessuno dall'app (le regole vietano la lettura): si
guardano dalla console Firebase. Una pagina di lettura dentro l'app avrebbe voluto dire
distinguere chi mantiene l'app da chi la usa, e non c'e' ancora niente che lo faccia.

### F8.2 Le due modalita' si presentano a vicenda

Ci si puo' allenare dalla PWA o dall'app da polso, e **nessuna delle due dice che
esiste l'altra**. Finche' gli utenti siamo noi non e' un problema; il giorno che l'app
sta sul Play Store, chi la scarica da li' non sa che c'e' il resto, e chi installa la
PWA non sa che puo' lasciare il telefono a casa.

Accanto ad "Avvia allenamento" c'e' un pulsante ⌚ che porta a una paginetta: cosa fa
l'app da polso, se risulta collegata, e il link al Play Store.

Cosa **non** facciamo, ed e' la parte importante: non rileviamo niente. Un browser non
vede i dispositivi accoppiati e nessuna API glielo permette; le API Wearable
(`NodeClient`, `CapabilityClient`) risponderebbero a "sull'altro dispositivo c'e' la
nostra app?", ma vivono dentro un'app Android che non esiste e che non serve. L'unica
prova vera che abbiamo e' **un allenamento arrivato dal polso** (`origine: 'watch'`, che
il watch scrive gia' dallo Step 5): se c'e', il collegamento funziona di sicuro.

E' una prova che vale in un verso solo. Dice "c'e'", non sa dire "non c'e'": chi ha
appena installato l'app al polso non ha ancora fatto nessun allenamento. Per questo il
messaggio negativo e' *"non risulta ancora nessun allenamento fatto dall'orologio"* e
non *"orologio non collegato"* — la seconda sarebbe una diagnosi, e noi non l'abbiamo.

Il link al Play Store e' una costante vuota (`PLAY_URL` in `WatchPage.jsx`) finche' l'app
non e' pubblicata, e con la costante vuota la pagina scrive "non e' ancora sul Play
Store" invece di offrire un pulsante che porta a un 404.

Nella stessa pagina c'e' la **versione della web app** con la data della build. Non e'
curiosita': dopo un deploy il service worker puo' servire ancora il bundle vecchio, e
senza una data visibile "l'ho gia' aggiornata" e "sto guardando quella di ieri" sono
indistinguibili — e' costato una serata. Il pulsante non promette "sei aggiornata":
chiede l'aggiornamento al service worker, ricarica, e lascia che sia la data a dire come
e' andata.

**Non fatto, e perche'**: un registro dei dispositivi (`users/{uid}/devices/{id}`) in cui
il watch scrive versione e ultimo contatto. Direbbe *quale APK* sta girando al polso, che
e' l'unico modo per vedere la trappola del §6 di CLAUDE.md (l'APK non si aggiorna da
solo). Richiede pero' di toccare `watch/` e di reinstallare l'APK a mano, quindi vale
come punto a se' — con l'ironia che il primo APK che scrive la sua versione e' anche
l'ultimo di cui non la sappiamo.

## Fuori scope v1 (idee registrate)

- **Gruppi di utenti**: condivisione schede, sfide — dopo web app + watch + pagamenti
- Coach LLM (Step 7 del piano di sviluppo)
- Eliminazione account (necessaria prima del Play Store)
