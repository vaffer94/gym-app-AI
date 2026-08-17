# Linee guida grafiche — stile "Cartoon" 🎨

Obiettivo: moderno, semplice, giocoso. Mai più di 3-4 elementi importanti per schermata.

## Regole fisse

1. **Contorni**: bordo `3px solid var(--ink)` (#2B2B3C) su card, bottoni, avatar
2. **Ombre "sticker"**: piatte, senza blur — `4px 4px 0 var(--ink)`. Al tap l'elemento si "preme" (trasla di 4px e perde l'ombra)
3. **Angoli**: appena smussati — 10px card (`--radius`), 7px bottoni (`--radius-sm`). Non 90 gradi: lo squadrato secco è stato provato e scartato. Gli elementi **tondi** (avatar, swatch dei colori, il (+) fra due esercizi, la pastiglia dell'alimento) restano tondi: un cerchio non ha angoli
4. **Palette limitata** (mai altri colori):
   - Ink `#2B2B3C` · Paper `#FDF6EC` (sfondo) · Bianco card
   - Primary arancio `#FF6B35` (azione principale, una sola per schermata)
   - Teal `#2EC4B6` · Giallo `#FFD23F` (secondari) + versioni soft
5. **Font**: Baloo 2 (titoli e bottoni), Nunito (testo)
6. **Icone**: SVG a pixel su griglia 24×24, sempre via `<Icona nome="..." />` (`src/icons/`). Il nome dice il **significato** (`indietro`, `pesi`, `durata`), mai la libreria: la corrispondenza col disegno sta solo in `src/icons/registry.js`, ed e' cio' che permette di ridisegnarne una alla volta. Servono su TUTTI i pulsanti: navigazione (`indietro`, `chiudi`, `su`/`giu`), azioni (`posticipa` · `salta` · `nota` · `pausa`/`avvia` · `aggiungi`/`togli`). Sui pulsanti con testo l'icona accompagna il testo. Un nome nuovo si aggiunge **prima** al registro, poi lo si usa. **Niente emoji**: quelle che c'erano (sezioni, categorie muscolari, alimenti) sono state pixellate e sono diventate icone come le altre — restano solo i segni tipografici dentro le frasi (`→` `✓` `✕`), che sono testo e non disegni
7. **Sfondo**: righe diagonali arcobaleno a scaletta di pixel, colori dell'app schiariti fin quasi al bianco. E' una piastrella SVG (`public/sfondo-righe.svg`) generata da `scripts/genera-sfondo.py`, non un gradiente CSS: a 45 gradi un gradiente disegna diagonali lisce e antialiasate, che accanto alle icone a pixel stonano. I colori stanno nello script, non in variabili CSS
8. **Layout**: colonna singola max 480px, spaziatura generosa (gap 12-20px), mobile-first

## Anti-pattern (vietati)

- Gradienti **sfumati**, glassmorphism, blur, ombre sfumate — il divieto e' sulle transizioni morbide, non sulla parola "gradient": bande a stop netti e piastrelle ripetute sono ammesse (lo sfondo della pagina e' fatto cosi')
- Grigi tristi come colore dominante
- Più di un bottone primary per schermata
- Testi lunghi: massimo una riga di sottotitolo per card

## Componenti disponibili (`src/styles/global.css`)

`.card` (+ `--primary/--teal/--yellow/--tap/--flat`) · `.btn` (+ `--primary/--teal/--yellow/--big`) · `.chip` · `.appbar` · `.page` · `.stack` / `.row` · `.icona` (+ `--gira` al posto del vecchio `fa-spin`)

Ogni nuova schermata usa SOLO questi componenti; se serve qualcosa di nuovo, si aggiunge prima qui e al CSS.
