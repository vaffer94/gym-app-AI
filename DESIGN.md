# Linee guida grafiche — stile "Cartoon" 🎨

Obiettivo: moderno, semplice, giocoso. Mai più di 3-4 elementi importanti per schermata.

## Regole fisse

1. **Contorni**: bordo `3px solid var(--ink)` (#2B2B3C) su card, bottoni, avatar
2. **Ombre "sticker"**: piatte, senza blur — `4px 4px 0 var(--ink)`. Al tap l'elemento si "preme" (trasla di 4px e perde l'ombra)
3. **Angoli**: molto stondati — 20px card, 14px bottoni
4. **Palette limitata** (mai altri colori):
   - Ink `#2B2B3C` · Paper `#FDF6EC` (sfondo) · Bianco card
   - Primary arancio `#FF6B35` (azione principale, una sola per schermata)
   - Teal `#2EC4B6` · Giallo `#FFD23F` (secondari) + versioni soft
5. **Font**: Baloo 2 (titoli e bottoni), Nunito (testo)
6. **Icone**: Font Awesome Free (`@fortawesome/fontawesome-free`, importato in main.jsx) per TUTTI i pulsanti: navigazione (`fa-arrow-left`, `fa-xmark`, `fa-arrow-up/down`), azioni (`fa-clock-rotate-left` Posticipa · `fa-forward` Salta · `fa-pen-to-square` Nota · `fa-pause`/`fa-play` · `fa-plus`/`fa-minus`). Sui pulsanti con testo l'icona accompagna il testo. Le emoji restano SOLO per sezioni (🔥 📋 📊) e categorie muscolari (💪 🦵 …)
7. **Layout**: colonna singola max 480px, spaziatura generosa (gap 12-20px), mobile-first

## Anti-pattern (vietati)

- Gradienti, glassmorphism, blur, ombre sfumate
- Grigi tristi come colore dominante
- Più di un bottone primary per schermata
- Testi lunghi: massimo una riga di sottotitolo per card

## Componenti disponibili (`src/styles/global.css`)

`.card` (+ `--primary/--teal/--yellow/--tap/--flat`) · `.btn` (+ `--primary/--teal/--yellow/--big`) · `.chip` · `.appbar` · `.page` · `.stack` / `.row` · `.emoji-xl/lg`

Ogni nuova schermata usa SOLO questi componenti; se serve qualcosa di nuovo, si aggiunge prima qui e al CSS.
