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

## Fuori scope v1 (idee registrate)

- **Gruppi di utenti**: condivisione schede, sfide — dopo web app + watch + pagamenti
- Coach LLM (Step 7 del piano di sviluppo)
- Eliminazione account (necessaria prima del Play Store)
