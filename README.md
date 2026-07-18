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

## Documenti di progetto

- `DESIGN.md` — linee guida grafiche (stile cartoon)
- Piano di sviluppo e flussi utente: nei documenti di sessione Cowork

## Roadmap (step incrementali)

1. ✅ Fondamenta: login Google, home, PWA
2. ⬜ Catalogo esercizi (free-exercise-db) + creazione schede + esercizi custom
3. ⬜ Esecuzione allenamento (timer, serie, posticipa, note)
4. ⬜ Storico e statistiche
5. ⬜ App Wear OS standalone
6. ⬜ Sensori + always-on (watch)
7. ⬜ Coach post-sessione
8. ⬜ Play Store + monetizzazione
