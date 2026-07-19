# Gym App — Watch (Wear OS standalone)

Step 5 del piano di sviluppo: app Kotlin/Compose per Wear OS, **standalone** (parla
direttamente con Firestore, nessuna app companion sul telefono). Stesso progetto
Firebase della web app (`gym-app-2dd77`), stesse collezioni Firestore — le sessioni
fatte dal watch appaiono nello storico della web app e viceversa.

## Cosa c'e' in questo primo taglio (fine step 5)

- **Login**: Google Sign-In via Credential Manager, direttamente sul watch (nessun telefono richiesto)
- **Home**: elenco schede scaricate da `users/{uid}/workoutPlans`, cache offline in Room
- **Esecuzione**: sequenza esercizi con le stesse regole di ordinamento/posticipa della
  web app (`engine/SessionEngine.kt`, porting 1:1 di `src/workout/sessionEngine.js`),
  serie con reps/peso precompilati col target e modificabili, recupero con countdown
  e vibrazione, pausa, "Termina allenamento" sempre disponibile
- **Upload**: a fine allenamento la sessione va sempre prima nel buffer locale Room
  (`pending_sessions`), poi tenta l'upload su `users/{uid}/sessions`; se offline resta
  in coda e un WorkManager la ritenta appena torna la rete

**Non ancora in questo taglio** (prossimi step del piano): Health Services (HR,
always-on/ambient mode — step 6), immagini esercizi sul watch (per ora solo testo,
da valutare con Coil vista la dimensione schermo), input vocale per le note libere
(per ora solo tramite editor rapido reps/peso).

## Struttura

```
watch/
  app/src/main/java/com/gymapp/watch/
    data/model/       WorkoutPlan, WorkoutSession, ... — stessi field name di src/data/repo.js
    data/remote/       Firestore (FirebaseModule, PlansRemoteSource, SessionsRemoteSource)
    data/local/         Room (cache schede + buffer sessioni offline) e DataStore (sessione attiva)
    engine/             SessionEngine.kt — porting di src/workout/sessionEngine.js
    auth/               AuthManager.kt — Credential Manager -> Firebase Auth
    sync/               SessionSyncWorker.kt — WorkManager, svuota il buffer offline
    ui/                 Compose per Wear OS: login, home, workout (setup/esecuzione/recupero/riepilogo)
```

## Setup (una tantum)

### 1. Android Studio

Se non l'hai gia' fatto per lo sviluppo Wear OS, vedi la sezione "Setup sviluppo app
Watch" nel README principale del repo (installazione Android Studio, emulatore Wear OS,
collegamento del Pixel Watch fisico via ADB — quella procedura resta identica, e per
oggi il Pixel Watch risulta gia' accoppiato via ADB).

### 2. Apri il progetto

Apri la cartella `watch/` (non la root del repo) in Android Studio con **File → Open**
e fai **Sync Project with Gradle Files**. Il Gradle wrapper (8.14.3) e' gia' incluso
nel progetto, non serve generarlo.

Nota versioni: il build e' stato verificato da riga di comando il 19/07/2026
(`./gradlew :app:assembleDebug` → APK ok, con le versioni dichiarate in
`build.gradle.kts` e il JDK incluso in Android Studio). L'unico aggiustamento
emerso e' gia' applicato: `rememberScalingLazyListState` va importato da
`androidx.wear.compose.foundation.lazy` (non da `compose-material`, dove e'
deprecato), coerentemente con `ScalingLazyColumn`.

### 3. Registra l'app Android nel progetto Firebase esistente

Nella [Console Firebase](https://console.firebase.google.com), progetto `gym-app-2dd77`
(lo stesso della web app):

1. Impostazioni progetto (⚙️) → **Le tue app → Aggiungi app → Android**
2. Nome pacchetto Android: `com.gymapp.watch`
3. **SHA-1 obbligatorio per il login** (il wizard lo presenta come facoltativo, ma
   senza questo Google rifiuta l'OAuth e il login fallisce): nella pagina dell'app
   → **Aggiungi impronta** → incolla lo SHA-1 di debug del Mac che compila, ottenuto con
   `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`
4. Scarica il file **`google-services.json`** generato → salvalo come
   `watch/app/google-services.json` (NON il file `.example` gia' presente, che resta
   solo come riferimento del formato)
5. **Authentication → Sign-in method → Google**: verifica che sia abilitato (dovrebbe
   esserlo gia' per la web app). Questo e' cio' che fa comparire automaticamente
   `R.string.default_web_client_id` usato da `AuthManager.kt` — nessuna configurazione
   manuale aggiuntiva

Le regole Firestore (`firestore.rules` nella root del repo) sono gia' condivise tra
web e watch, nessuna modifica necessaria.

### 4. Account Google sul Pixel Watch

Il login Credential Manager funziona solo se il watch ha gia' un account Google
aggiunto: **Impostazioni (sul watch) → Account → Aggiungi account**. Senza questo
passaggio il login mostra "Nessun account disponibile" (gestito in `LoginScreen`).

## Build e sideload sul Pixel Watch

Con il watch collegato via ADB (vedi README principale):

```bash
cd watch
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"  # solo se non hai un JDK nel PATH
./gradlew installRelease
```

**Usa `installRelease` per l'uso reale**: e' la build ottimizzata da R8 (5,6 MB vs 37,7 MB
della debug) ed e' MOLTO piu' fluida sul watch — la debug gira senza ottimizzazioni e
con i check runtime attivi, e sul processore del watch si sente parecchio. La release
e' gia' firmata con la chiave di debug per il sideload (vedi `build.gradle.kts`);
`installDebug` resta utile solo se serve il debugger.

Se il build fallisce con "File google-services.json is missing" e' il promemoria
che manca il passo 3 del setup (il file vero da Firebase Console).

Oppure da Android Studio: seleziona il Pixel Watch come target di run e premi ▶️.

## Rischi noti (dal piano di sviluppo, step 5)

- ~~**UX del login sul watch**~~ VERIFICATO sul Pixel Watch il 19/07/2026: Credential
  Manager funziona (selettore account nativo + "Continua"). Attenzione: richiede lo
  **SHA-1 del certificato di firma** registrato nell'app Android su Firebase Console
  (Impostazioni progetto → app `com.gymapp.watch` → Aggiungi impronta), altrimenti
  Google rifiuta la richiesta OAuth. Per build da un altro Mac va aggiunto anche il
  suo SHA-1 di debug (`keytool -list -v -keystore ~/.android/debug.keystore -alias
  androiddebugkey -storepass android`); per la release su Play Store servira' quello
  del certificato di release
- **Countdown del recupero in ambient/doze**: il countdown attuale gira su una
  coroutine in `WorkoutViewModel`; se il watch entra in risparmio energetico aggressivo
  durante il recupero il timer potrebbe rallentare. Da misurare sul dispositivo reale;
  se necessario si passa ad `AlarmManager` esatto nello step 6 insieme ad always-on
- **Connettivita' via BT-proxy del telefono o Wi-Fi diretto**: la cache Firestore
  offline + il buffer Room dovrebbero coprire entrambi i casi, ma va testato in palestra
