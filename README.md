# Gym App 🏋️

Web app (PWA) di supporto all'allenamento in palestra. Stack: React + Vite + Firebase.

## Avvio rapido

```bash
npm install
npm run dev        # apre su http://localhost:5173
```

Senza configurazione Firebase l'app parte in **modalità demo** (login finto, dati non salvati) — utile per vedere subito grafica e flussi.

## Configurare Firebase (una tantum)

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) → **Crea progetto** (es. `gym-app`), Analytics non necessario
2. Nel progetto: **Authentication → Inizia → Google → Abilita** (scegli l'email di supporto)
3. **Firestore Database → Crea database** → modalità produzione → regione `eur3 (europe-west)`
4. Impostazioni progetto (⚙️) → **Le tue app → Web (`</>`)** → registra l'app (es. `gym-web`) → copia i valori della configurazione
5. Nel repo: copia `.env.example` in `.env.local` e incolla i valori
6. Riavvia `npm run dev` → ora il login Google è reale
7. **Pubblica le regole di sicurezza** (senza questo passaggio ogni salvataggio fallisce con `permission-denied`): Console Firebase → **Firestore Database → Regole** → cancella il contenuto, incolla il testo del file `firestore.rules` del repo → **Pubblica**

## Integrazione Google Health (facoltativa)

I dati salute del Pixel Watch (passi, allenamenti rilevati) si leggono con la **Google Health API** (il successore della Fitbit Web API, che chiude a settembre 2026). Setup una tantum:

Tutto da [console.cloud.google.com](https://console.cloud.google.com), col progetto giusto selezionato in alto (va bene lo stesso progetto di Firebase) e l'account Google giusto. *Non usare il wizard di developers.google.com/health/setup: rifiuta le origini http://localhost.*

1. **API e servizi → Libreria** → cerca "Google Health API" → **Abilita**
2. **API e servizi → Credenziali → + Crea credenziali → ID client OAuth** (se richiesto, configura prima la schermata di consenso: tipo Esterno, nome `Gym App`). Tipo: **Applicazione web**
3. **Origini JavaScript autorizzate** → aggiungi `http://localhost:5173` (niente slash finale; in produzione aggiungerai `https://<tuo-dominio>`). URI di reindirizzamento: **vuoto** → Crea
4. **Schermata consenso OAuth → Data Access (Ambiti)** → aggiungi `.../auth/googlehealth.activity_and_fitness.readonly`
5. **Schermata consenso OAuth → Audience → Utenti di prova** → aggiungi la tua email (app non verificata = max 100 utenti)
6. Copia il **Client ID** (`...apps.googleusercontent.com`) in `.env.local` come `VITE_GOOGLE_HEALTH_CLIENT_ID`
7. Riavvia `npm run dev` → Storico → Integrations → **Collega Google Health**

## Deploy su Firebase Hosting

```bash
npm install -g firebase-tools    # una tantum
firebase login                   # una tantum
# in .firebaserc sostituisci IL-TUO-PROJECT-ID con l'id del progetto
npm run build
firebase deploy
```

L'app sarà online su `https://<project-id>.web.app`. Dal telefono: apri l'URL → menu del browser → **Aggiungi a schermata Home** per installarla come app.

## Struttura

```
src/
  auth/          AuthContext (login Google + modalità demo)
  lib/           init Firebase
  pages/         schermate (Login, Home, placeholder Schede/Storico/Allenamento)
  styles/        design system (vedi DESIGN.md)
```

## Setup sviluppo app Watch (Wear OS) — per lo Step 5

Tutto gratuito. Serve ~20 GB di disco.

1. **Android Studio**: scarica da [developer.android.com/studio](https://developer.android.com/studio) (su Mac scegli la versione giusta: Apple Silicon per M1/M2/M3/M4, Intel altrimenti). Apri il .dmg e trascina in Applicazioni
2. Al primo avvio il wizard **installa da solo** SDK e strumenti: accetta il setup "Standard" e le licenze. Il JDK è incluso, non serve installare Java
3. In **Settings → Languages & Frameworks → Android SDK**:
   - scheda *SDK Platforms*: spunta l'ultima piattaforma Android stabile
   - scheda *SDK Tools*: verifica che ci siano **Android SDK Platform-Tools** (contiene `adb`) e **Android Emulator**
4. **Emulatore Wear OS** (per sviluppare senza watch al polso): Device Manager → Create Device → categoria **Wear OS** → Wear OS Large Round → scarica l'immagine di sistema proposta → Fine
5. **Collegare il Pixel Watch fisico — LA PROCEDURA CHE FUNZIONA** (testata il 19/07/2026 dopo molte sofferenze):

   *Prerequisiti una tantum sul watch:* Impostazioni → Sistema → Informazioni → tocca 7 volte "Numero build" → nelle **Opzioni sviluppatore** attiva **Debug ADB** e **Debug wireless**.

   *Rito di collegamento (ogni sessione di sviluppo):*
   1. Telefono: **hotspot ON** (banda 2.4GHz se c'è l'opzione — Pixel Watch 1 e 2 non vedono il 5GHz)
   2. Mac connesso all'hotspot; **watch connesso all'hotspot e IN CARICA** (senza caricatore il watch molla il Wi-Fi per risparmiare batteria), schermo attivo
   3. Watch: Debug wireless → **"Accoppia nuovo dispositivo"** → LASCIA LA SCHERMATA APERTA. Mostra IP, **porta A** e **codice a 6 cifre**
   4. Sul Mac, tutto in UNA riga (il prompt interattivo del codice ha un bug che dà "protocol fault"):
      ```
      adb kill-server
      adb pair IP:PORTA_A CODICE     # es: adb pair 192.168.43.15:42123 123456
      ```
   5. `adb devices` — spesso il watch si collega da solo dopo il pairing. Se l'elenco è vuoto: prendi la **porta B** dalla schermata PRINCIPALE del Debug wireless (È DIVERSA dalla porta A!) e fai `adb connect IP:PORTA_B`
   6. `adb devices` deve elencare il watch → Android Studio lo vede come target di run

   *Note che salvano ore:*
   - Il **pairing è per sempre** (finché non revochi le autorizzazioni): le volte successive di solito basta `adb connect`, o parte da solo
   - **Confondere porta A e porta B è la causa n°1 di "protocol fault"**
   - Il debug **Bluetooth NON esiste** sul Pixel Watch, e il caricatore **non trasporta dati**: il Wi-Fi è l'unica strada
   - Se la connessione cade durante lo sviluppo (il watch risparmia energia): ricontrolla che sia in carica e rifai `adb connect`
   - Niente panico se `ping` verso il watch va in timeout: a schermo spento non risponde, non significa che la rete sia rotta
6. Se `adb` non è nel PATH del terminale: `export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"` (aggiungilo a `~/.zshrc`)

## App Watch (Wear OS standalone)

Progetto separato in `watch/` (Kotlin/Compose, Gradle proprio) — stesso backend
Firebase/Firestore della web app. Setup, struttura e stato di avanzamento: vedi
`watch/README.md`.

## Documenti di progetto

- `DESIGN.md` — linee guida grafiche (stile cartoon)
- Piano di sviluppo e flussi utente: nei documenti di sessione Cowork

## Roadmap (step incrementali)

1. ✅ Fondamenta: login Google, home, PWA
2. ⬜ Catalogo esercizi (free-exercise-db) + creazione schede + esercizi custom
3. ⬜ Esecuzione allenamento (timer, serie, posticipa, note)
4. ⬜ Storico e statistiche
5. 🔄 App Wear OS standalone — codice completo in `watch/`, installata sul Pixel Watch: login Google e download schede da Firestore verificati sul dispositivo (19/07/2026); manca solo il test di un allenamento completo in condizioni reali
6. ⬜ Sensori + always-on (watch)
7. ⬜ Coach post-sessione
8. ⬜ Play Store + monetizzazione
