# Piano di sviluppo — Gym Workout App (web + Pixel Watch)

**Data:** 13/07/2026 (rev. 2) · **Metodo:** incrementale/agile, ogni step rilasciabile e testabile in palestra

---

## 1. Decisioni architetturali

| Tema | Decisione | Motivazione |
|---|---|---|
| Architettura | **Web app (PWA) + app Wear OS standalone**. Niente app mobile nativa. | La web app copre creazione schede, storico, statistiche e coach da qualsiasi dispositivo; installabile come PWA sul telefono. Il watch esegue l'allenamento in autonomia. Un'app in meno da mantenere. |
| Web | React + Vite, Firebase Hosting (gratis) | Sviluppo e test rapidi, deploy gratuito con dominio https incluso |
| Watch | Kotlin + Compose for Wear OS, app **standalone** | Obbligato per Wear OS. Standalone = parla direttamente con Firestore, senza app companion |
| Backend | Firebase: Auth (login Google) + Firestore | Gratis in sviluppo (Spark), offline nativo, zero server; scala pay-as-you-go alla monetizzazione |
| Flusso dati watch → DB | Il watch scrive direttamente su Firestore (SDK Android). La rete passa dal Bluetooth-proxy del telefono accoppiato o dal Wi-Fi. Sessione salvata in locale (Room) e caricata quando c'è connettività | Nessuna Data Layer API necessaria; robusto anche offline in palestra |
| Catalogo esercizi | **free-exercise-db** (github.com/yuhonas/free-exercise-db): 800+ esercizi, licenza Unlicense (pubblico dominio), con immagini, muscoli primari/secondari, attrezzatura, livello | Unico dataset gratuito **utilizzabile commercialmente**. Il dataset hasaneyldrm/exercises-dataset è scartato: licenza "educational only", uso commerciale esplicitamente vietato |
| Modello dati | Scheda (template) separata dalla Sessione (istanza con snapshot) | Modificare una scheda non deve alterare lo storico |
| Distribuzione | Web: subito online (Firebase Hosting). Watch: sideload ADB in sviluppo → Play Store (25$ una tantum) alla monetizzazione | |
| Monetizzazione (futura) | Web: Stripe o simili. Watch su Play Store: Play Billing (trial 1 mese → abbonamento) | Doppio canale; da armonizzare in fase 8 |
| Garmin / iOS | Fuori scope. Il formato sessione resta agnostico rispetto alla sorgente (campo `origine`) per non chiudere porte | |

## 2. Terminologia e modello dati

**Gerarchia:** Scheda → Esercizi → Serie (sets) → Ripetizioni (reps) + peso + recupero target (la pausa è *tra le serie*).

Collezioni Firestore:

```
exercises (catalogo globale)   ← import da free-exercise-db: nome, muscoli,
                                  attrezzatura, livello, istruzioni, immagini
users/{uid}
  customExercises/{exId}       ← esercizio custom: nome libero, categoria
                                  (stessa tassonomia del catalogo), foto
                                  compressa lato client (WebP ~50KB, base64
                                  nel documento — resta nel piano gratuito
                                  senza Firebase Storage)
  workoutPlans/{planId}        ← scheda: nome, lista esercizi ordinata
                                  [exerciseId (catalogo o custom), sets, reps,
                                  pesoKg, recuperoSec]
  sessions/{sessionId}         ← sessione: snapshot scheda, startedAt, endedAt,
                                  origine (web|watch), per serie: start/stop,
                                  reps e peso EFFETTIVI (precompilati col target,
                                  modificabili con un tap), recupero effettivo vs
                                  target, skipped/postponed, RPE opzionale,
                                  (fase 6) HR medio/max, intensità movimento
  exerciseStats/{exerciseId}   ← serie temporale compatta aggiornata dal client
                                  a fine sessione: [data, e1RM, volume, aderenza
                                  recuperi] — è ciò che legge il coach
```

Regola anti-costi: pochi documenti grandi (1 doc per sessione, non 1 per serie).

## 3. Roadmap incrementale

### Step 1 — Fondamenta web e login
- Progetto React + Vite, Firebase (Auth Google, Firestore, Hosting), regole di sicurezza per-utente
- Login/logout, profilo, deploy online
- **Demo:** apri l'URL da qualsiasi dispositivo, fai login con Google

### Step 2 — Catalogo esercizi e schede
- Import di free-exercise-db (script una tantum → Firestore + immagini)
- Browser del catalogo: ricerca e filtri per gruppo muscolare / attrezzatura / livello, dettaglio con immagini e istruzioni
- **Tassonomia unica per categorie** (usata sia dal catalogo che dai custom): braccia superiori, braccia inferiori, spalle, petto, schiena, core/addome, gambe superiori, gambe inferiori, cardio, collo — con mappatura dei muscoli di free-exercise-db su queste categorie
- **Esercizi custom per utente**: nome libero, categoria dalla tassonomia, foto opzionale scattata/caricata dal telefono (input camera della PWA), compressa lato client via canvas a WebP ~50KB e salvata nel documento Firestore (niente Firebase Storage → si resta nel piano gratuito Spark). Gli esercizi custom appaiono nel catalogo accanto a quelli standard, filtrabili, e sono selezionabili nelle schede come qualsiasi altro
- CRUD schede: crea, modifica, riordina; per esercizio: serie, reps, peso, recupero
- **Demo:** crei una scheda completa mescolando esercizi dal catalogo e un esercizio custom con foto

### Step 3 — Esecuzione allenamento (web/PWA sul telefono)
- PWA installabile, funzionante offline (service worker)
- Selezione scheda → sessione (snapshot): esercizio corrente, serie X di Y, pulsanti grandi start/stop, timer recupero automatico con vibrazione (Vibration API), avanzamento automatico, skip "dopo/salta", schermo sempre attivo (Wake Lock API)
- A fine serie: reps/peso effettivi precompilati col target, modificabili con un tap (dato essenziale per il coach); RPE opzionale
- Salvataggio sessione con timestamp; ripresa se il browser si chiude
- **Demo:** allenamento reale in palestra guidato dal telefono (browser)
- **Rischi:** limiti PWA (timer in background, vibrazione su alcuni browser) — mitigati da wake lock; il watch diventerà comunque il dispositivo principale d'esecuzione

### Step 4 — Storico e statistiche
- Elenco sessioni con durata; dettaglio: tempi per esercizio/serie, recuperi effettivi vs target
- Confronti tra sessioni della stessa scheda: durata, aderenza recuperi, volume (serie × reps × kg), andamento nel tempo
- **Demo:** dopo 2-3 allenamenti vedi progressi e confronti

### Step 5 — App Watch standalone
- App Wear OS (Kotlin/Compose): login (Credential Manager / flusso assistito), download schede da Firestore, cache locale Room
- Esecuzione: sequenza esercizi con serie/reps, start/stop, timer recupero con vibrazione, skip "dopo/salta"; reps/peso effettivi precompilati col target, modificabili con la rotellina/tap
- Upload sessione su Firestore a fine allenamento (buffer locale se offline)
- **Demo:** allenamento completo usando solo il watch; sessione visibile nella web app
- **Rischi:** auth su watch (UX delicata), connettività via BT-proxy — test sul Pixel Watch fisico

### Step 6 — Watch: sensori e always-on
- Health Services: HR continuo; accelerometro **aggregato sul watch** (intensità per finestra, mai raw)
- Ambient mode (always-on) con timer visibile
- Dati sensori nel dettaglio sessione web
- **Demo:** display sempre attivo, HR e intensità nello storico
- **Rischi:** batteria su sessioni 1-2h; permessi BODY_SENSORS

### Step 7 — Coach post-sessione

**Principio architetturale: i calcoli li fa il codice, l'LLM fa solo il linguaggio.**

Pipeline: dati grezzi sessione → metriche derivate (deterministiche, client-side) → flag da motore di regole → (v2) LLM per consigli in linguaggio naturale.

*Prerequisito dati (inserito negli step 3 e 5):* registrare reps e peso **effettivi** per serie (precompilati col target, un tap se conformi) + RPE opzionale. Senza questi il coach è cieco sulla progressione.

*Metriche derivate (calcolate a fine sessione, salvate in `exerciseStats`):*
- e1RM stimato per esercizio (Epley: peso × (1 + reps/30)) — serie temporale = segnale di progressione
- Volume per esercizio e gruppo muscolare (serie × reps × kg), per sessione e settimana
- Aderenza recuperi (effettivo vs target), densità (volume/durata)
- Tasso completamento (% serie a target, skip), costanza (frequenza, gap)

*Flag rule-based (= la v1 del coach):* stagnazione (e1RM piatto da N sessioni), pronto per progressione (tutte le serie a target da N sessioni → +2,5-5%), recuperi sistematicamente sforati, squilibrio volume tra gruppi, sovraccarico (volume +X% in una settimana).

*v2 LLM (Gemini free tier, unica via compatibile col vincolo gratis):* riceve un payload JSON compatto (profilo, riassunto sessione, trend ultime 5 sessioni, flag) — mai timestamp grezzi. System prompt con vincoli: max 3 consigli, progressioni conservative, niente consigli medici, numeri solo dal payload. Output JSON strutturato: consiglio, motivazione, priorità. Una chiamata piccola per sessione, dentro i rate limit free.

- **Demo:** a fine allenamento ricevi 2-3 consigli concreti basati sui tuoi numeri
- **Punti ancora da definire:** tono e frequenza, anti-ripetitività dei consigli, disclaimer non-medico, gestione cold start (prime sessioni → consigli generici)

### Step 6.5 — Integrazione salute avanzata (Google Health API)
*(la base — OAuth Google, passi giornalieri e allenamenti rilevati nel calendario, tab Integrations, obiettivo passi — è già stata implementata nello Step 4. La Fitbit Web API legacy è stata scartata: chiude a settembre 2026 e non accetta nuove registrazioni)*
- **Dedup allenamenti**: quando Google Health rileva un allenamento coincidente con una sessione dell'app, viene marcato come stessa sessione (non doppione)
- Vista "Salute" completa: sonno, FC a riposo (scope aggiuntivi `sleep.readonly` / `health_metrics_and_measurements.readonly`)
- Dati salute nel payload del coach (Step 7)
- Al deploy: aggiungere l'origine di produzione al client OAuth
- **Vincolo da monitorare per la monetizzazione**: app OAuth non verificata = max 100 utenti; oltre serve la security review di terze parti di Google (potenziale costo/complessità → valutare allo Step 8)

### Step 8 — Pubblicazione e monetizzazione
- Play Console (25$) per l'app watch; web già pubblica
- Trial 1 mese → abbonamento: Play Billing (watch) + Stripe o gating lato web; stato abbonamento in Firestore
- Firestore su piano Blaze con budget alert

## 4. Definition of Done (ogni step)
Funziona offline dove pertinente · testato su dispositivo reale (browser telefono; Pixel Watch dagli step 5-6) · nessuna regressione · demo in condizioni reali.

## 5. Rischi trasversali
1. **Licenze contenuti**: usare solo free-exercise-db (pubblico dominio); mai media da dataset "educational only" in un prodotto che verrà monetizzato
2. **Frizione UX in allenamento** → dati sporchi: un-tap flow, correzioni a posteriori
3. **Batteria watch** (HR + always-on): misurare presto, non a fine progetto
4. **Limiti PWA** su esecuzione da telefono: accettabili perché il watch è il device primario d'esecuzione
5. **Costi Firestore** post-monetizzazione: modellazione dati parsimoniosa dallo step 1
