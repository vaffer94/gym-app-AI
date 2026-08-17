# Architettura — mappa del codice

Dove sta cosa e perche' sta li'. Le decisioni di *prodotto* stanno in
`flussi-utente.md`, quelle di *piattaforma* in `piano-sviluppo-gym-app.md`: qui c'e'
solo la struttura, cioe' quello che serve per sapere dove mettere le mani.

## 1. Le due app e il confine fra loro

```
                      ┌──────────────────────────┐
   src/  (React) ────▶│  Firebase                │◀──── watch/ (Kotlin)
   PWA sul telefono   │  Auth Google             │      Wear OS standalone
                      │  Firestore users/{uid}/… │
                      └──────────────────────────┘
```

Nessuna delle due app parla con l'altra: **si parlano solo attraverso Firestore**.
Non c'e' app companion, non c'e' Data Layer API, non c'e' server nostro. Tutto il
calcolo (kcal, zone, statistiche, obiettivi) e' **client-side**.

La conseguenza pratica: il modello dati e' un contratto fra due codebase in due
linguaggi, senza niente che verifichi che siano d'accordo. Vedi §5.

## 2. Gli strati della web app

```
src/
  main.jsx          bootstrap: React, router, Font Awesome, service worker PWA
  App.jsx           tutte le rotte, tutte dentro <Protected>
  auth/             AuthContext: login Google, utente demo, pulizia al logout
  lib/              firebase.js (init + cache persistente), image.js (compressione foto)
  pages/            una schermata = un file. Contengono la UI e l'orchestrazione
  components/       pezzi riusabili e grafici (chart.js)
  data/             accesso ai dati e calcoli di dominio — nessun JSX
  workout/          logica dell'allenamento: motore sessione e analisi del battito
  styles/global.css il design system per intero (vedi DESIGN.md)
```

**Regola di dipendenza**: `pages` → `components` → `data` / `workout` → `lib`.
Mai al contrario. Se un calcolo serve in due schermate, scende in `data/` o
`workout/`: e' la ragione per cui `hrAnalysis.js` non vive dentro il grafico HR —
le stesse bande servono alla linea, agli istogrammi di zona e alle statistiche per
esercizio, e tre copie divergono al primo ritocco.

## 3. Chi fa cosa

### `data/` — dati e dominio

| file | responsabilita' |
|---|---|
| `repo.js` | **unico punto d'accesso** a schede, esercizi custom, label, sessioni. Due implementazioni con la stessa interfaccia — Firestore e `localStorage` (demo) — scelte da `getRepo(user)`. Nessuna pagina importa `firebase/firestore` da sola |
| `catalog.js` | tassonomia fissa delle 10 categorie, etichette attrezzatura/livello, ricerca nel catalogo |
| `catalog.json` | 800+ esercizi da free-exercise-db (pubblico dominio), **generato** da `scripts/build-catalog.mjs`. Non si modifica a mano |
| `health.js` | Google Health API v4: OAuth, passi, allenamenti rilevati, energia, zone cardiache, diagnostica. Due scope, chiesti separatamente |
| `kcal.js` | profilo utente (eta', peso, altezza, sesso), storico peso, stima Keytel, basale Mifflin-St Jeor, cache kcal per sessione |
| `foods.js` | 21 equivalenti alimentari con fonti in testa e `id` stabile |
| `goals.js` | i tre obiettivi (passi, allenamenti, energia) e il calcolo del progresso settimanale |
| `aggregate.js` | aggregazioni dello storico per settimana/mese/trimestre, streak, `mondayOf` (definizione unica di "settimana") |
| `exerciseStats.js` | statistiche per esercizio attraverso le sessioni, ripartizione dell'energia, confronti |
| `planColors.js` | palette schede/esercizi, **allineata a `watch/.../ui/theme/PlanColor.kt`** |
| `format.js` | etichette target (`3×12 · 10 kg`) |
| `fitbit.js` | vuoto, deprecato — eliminabile |

### `workout/` — l'allenamento

| file | responsabilita' |
|---|---|
| `sessionEngine.js` | logica pura della sessione: ordine, posticipa, serie, recuperi, pausa, statistiche finali. **Portato 1:1 in `watch/.../engine/SessionEngine.kt`** |
| `hrAnalysis.js` | bande esercizio, recuperi, soglie di zona, tempo per zona e per esercizio |
| `activeSession.js` | persistenza continua della sessione in corso (ripresa dopo chiusura del browser) |
| `useWakeLock.js` | schermo acceso durante l'allenamento |

### `pages/` — le schermate

`HomePage` (5 sezioni) · `SchedeListPage` / `PlanEditorPage` / `PlanDetailPage` ·
`StartWorkoutPage` → `WorkoutPage` (la piu' grossa: e' l'allenamento) ·
`HistoryListPage` (elenco + Andamento + Esercizi + Integrazioni) → `SessionDetailPage` ·
`GoalsPage` · `ParamsPage` · `LoginPage`.

### `components/` — riusabili

Grafici: `HrChart` (linea HR con zone), `ZoneBars` (istogrammi verticali per zona),
`ExerciseStats`, `TrendChart`. Dati: `KcalRow`, `EnergyBreakdown`, `FoodEquivalent`,
`WeekGoals`, `WeekMedals`, `KcalDiagnostics`. Controlli: `Stepper`, `Dialog` /
`SheetDialog`, `ExercisePicker`, `ExerciseThumb`.

## 4. I dati

### Firestore

```
exercises/{id}                 catalogo globale (lettura per utenti loggati, scrittura vietata)
users/{uid}/
  workoutPlans/{planId}        scheda: nome, colore, finalita', esercizi ordinati
  customExercises/{exId}       esercizio custom: nome, categoria, foto WebP base64 (~50KB)
  meta/labels                  { values: [...] } le finalita' personali
  sessions/{sessionId}         una sessione = un documento (regola anti-costi)
```

Le regole di sicurezza (`firestore.rules`, nella root) valgono per web e watch
insieme, e vanno **pubblicate a mano** dalla console Firebase quando cambiano.

**Documento sessione** — lo scrivono sia la web app che il watch:

```
id, planId, planName, planColor, origine: 'web' | 'watch',
startedAt, endedAt, status: 'active' | 'completed' | 'aborted',
restDefaultSec, pausedMs, pauseStartedAt, queue[],
exercises[]: { key, refType, refId, name, category, image, description,
               mode: 'reps' | 'duration', durationSec, sets, reps,
               hasWeight, weightKg, postponeCount, skipped,
               startedAt, endedAt, note,
               series[]: { done, startedAt, doneAt,
                           actualReps, actualWeightKg, restSec } }
hrT[], hrBpm[]      curve del battito, array PARALLELI (Firestore non annida array)
hrAvg, hrMax        aggregati calcolati sul watch a fine sessione
autoClosed          true se chiusa dal watchdog anti-dimenticanza
```

La sessione e' uno **snapshot**: modificare o cancellare una scheda non tocca lo
storico. E' il motivo per cui i campi dell'esercizio sono copiati e non referenziati.

### localStorage

Non e' cache: e' lo strato di persistenza scelto per tutto cio' che e' locale al
dispositivo e non ha senso sincronizzare. **Le chiavi non si rinominano** (§CLAUDE.md).

| chiave | contenuto |
|---|---|
| `gym.profile` | eta', peso, altezza, sesso biologico — servono a Keytel e Mifflin-St Jeor |
| `gym.weightLog` | storico peso per il grafico in Parametri |
| `gym.health.stepsGoal` | obiettivo passi (chiave storica, namespace ereditato dalle integrazioni) |
| `gym.goal.workouts`, `gym.goal.kcal` | obiettivo allenamenti e carrello alimenti |
| `gym.health.token`, `gym.health.cache` | token OAuth e riepilogo Google Health |
| `gym.kcal3.` (prefisso) | kcal misurate per sessione. Il numero e' la **versione**: si incrementa per invalidare |
| `gym.activeSession` | sessione in corso, per riprendere dopo la chiusura del browser |
| `gym.plans`, `gym.sessions`, `gym.customExercises`, `gym.labels` | dati della **sola modalita' demo** |

## 5. Contratto web ↔ watch

Cambiare una di queste cose senza cambiare l'altra parte rompe l'app in silenzio —
e non c'e' niente che se ne accorga al posto tuo:

| cosa | web | watch |
|---|---|---|
| campi della sessione | `workout/sessionEngine.js` | `data/model/WorkoutSession.kt` |
| campi della scheda | `data/repo.js` | `data/model/WorkoutPlan.kt` |
| regole di ordinamento e posticipa | `workout/sessionEngine.js` | `engine/SessionEngine.kt` |
| palette per esercizio | `data/planColors.js` | `ui/theme/PlanColor.kt` |
| regole Firestore | `firestore.rules` (condiviso) | — |

Il verso normale dei dati e': il **watch scrive** le sessioni (e' il dispositivo
d'esecuzione), la **web legge** e ci costruisce sopra storico, statistiche e obiettivi.
La web app scrive sessioni solo quando l'allenamento e' guidato dal telefono.

## 6. Le catene di calcolo

Tre catene attraversano piu' file: vale la pena conoscerle prima di toccarle.

**Energia di una sessione** — `kcal.js:sessionKcal()` chiede a
`health.js:getWorkoutEnergy()` il totale misurato sull'intervallo (finestre da 60s
sommate); se Google non e' collegato o non ha dati, stima con Keytel dal battito.
La ripartizione per esercizio (`exerciseStats.js:sessionEnergyBreakdown()`) stima ogni
tratto con Keytel e poi **riscala tutto sul totale misurato**: Google da' la scala,
Keytel la forma. Arrotondamento coi resti maggiori, cosi' i parziali sommano al totale.

**Zone del cuore** — `hrAnalysis.js:zoneThresholds()` prende le soglie da Google
(`daily-heart-rate-zones`, scope separato) o ripiega su 220−eta' con le percentuali
Fitbit. Il tempo per zona lo calcoliamo noi dai campioni `hrT`/`hrBpm`, con tetto di
30s per campione, perche' il dato di Google non e' scomponibile per esercizio.

**Obiettivi** — `goals.js` legge le sessioni dal repo e le taglia per settimana con
`aggregate.js:mondayOf()` (una sola definizione di "settimana" in tutto il progetto).
Contano **solo** le sessioni dell'app, mai le attivita' rilevate da Google.

## 7. Devo fare X, dove metto le mani

| se vuoi... | parti da |
|---|---|
| cambiare una schermata | il file in `pages/`, e i componenti che usa |
| aggiungere un colore o uno stile | `styles/global.css` **prima**, poi lo usi (mai stili nuovi inline) |
| toccare come si svolge l'allenamento | `workout/sessionEngine.js` — e il gemello Kotlin |
| cambiare un calcolo su kcal o battito | `data/kcal.js` / `workout/hrAnalysis.js`, con la fonte in commento |
| aggiungere un dato da Google Health | `data/health.js`, e valuta se serve uno scope nuovo (chiedilo separato) |
| aggiungere un obiettivo | `data/goals.js` + `pages/GoalsPage.jsx` + `components/WeekGoals.jsx` |
| salvare qualcosa di nuovo per utente | `data/repo.js`, **entrambe** le implementazioni |
| aggiungere un alimento | `data/foods.js`, con la fonte nell'intestazione del file |
</content>
