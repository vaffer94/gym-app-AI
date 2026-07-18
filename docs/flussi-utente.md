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
1. Gli esercizi vengono proposti **raggruppati per categoria**; l'ordine delle categorie è quello di prima apparizione nella scheda; dentro la categoria, l'ordine della scheda
2. **Posticipa** (1ª volta) → l'esercizio va in coda alla propria categoria
3. **Posticipa** (2ª volta) → va in fondo all'intero allenamento
4. Se rifiutato anche lì → marcato saltato per questa sessione
5. (Stessa logica da replicare sull'app watch)

### F2.4 Fine allenamento
- **Automatica** quando tutte le serie sono done, oppure **pulsante Termina** sempre disponibile → sessione salvata come parziale
- Richiesta note mancanti
- **Riepilogo statistiche di sessione**: durata, data/ora inizio e fine, esercizi e serie completati vs scheda, note, tempi per esercizio, tempi di pausa, confronto con l'allenamento precedente della stessa scheda e differenze, percentuale esercizi per categoria

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

## Fuori scope v1 (idee registrate)

- **Gruppi di utenti**: condivisione schede, sfide — dopo web app + watch + pagamenti
- **Obiettivi** nella sezione statistiche
- Coach LLM (Step 7 del piano di sviluppo)
- Eliminazione account (necessaria prima del Play Store)
