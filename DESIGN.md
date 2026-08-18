# Linee guida grafiche — stile "Cartoon" 🎨

Obiettivo: moderno, semplice, giocoso. Mai più di 3-4 elementi importanti per schermata.

## Regole fisse

1. **Contorni**: bordo `3px solid var(--bordo)` su card, bottoni, avatar. `--bordo` vale `--ink` di default; nel tema scuro ogni variante lo ridefinisce col proprio pastello
2. **Ombre "sticker"**: piatte, senza blur — `4px 4px 0 var(--ombra)`. Nel tema chiaro l'ombra è dello stesso ink del contorno; nel **tema scuro è il pastello della card**, mentre il contorno è quasi nero: è lì che vive il colore. Al tap l'elemento si "preme" (trasla di 4px e perde l'ombra)
3. **Angoli**: appena smussati — 10px card (`--radius`), 7px bottoni (`--radius-sm`). Non 90 gradi: lo squadrato secco è stato provato e scartato. Gli elementi **tondi** (avatar, swatch dei colori, il (+) fra due esercizi, la pastiglia dell'alimento) restano tondi: un cerchio non ha angoli
4. **Due temi**: chiaro e scuro, piu' "come il telefono" (default). Cambiano solo i **valori** delle variabili in `:root` e `[data-tema="scuro"]` — nessuna regola sa che tema e' attivo. Nello scuro i ruoli si ribaltano: il blu scuro fa da carta, il testo diventa crema, e **il colore di una card sta solo nell'ombra** (gli stessi pastelli che nel chiaro fanno da fondo), mentre interno e contorno sono uguali per tutte — il contorno è più scuro della carta. Coi bordi pastello c'era troppo colore per essere una modalità notte. Restano pieni **solo i pulsanti d'azione**, che devono staccare
   - ⚠️ `--border` e `--shadow` come token composti **non esistono piu'**: un custom property viene sostituito dove e' *dichiarato*, non dove e' usato, quindi `--border: 3px solid var(--bordo)` su `:root` ignorava le ridefinizioni di `--bordo` sulle varianti. Si scrive `border: 3px solid var(--bordo)` per esteso
5. **Palette limitata** (mai altri colori):
   - Ink `#2B2B3C` · Paper `#FDF6EC` (sfondo) · Bianco card
   - Primary arancio `#FF6B35` (azione principale, una sola per schermata)
   - Teal `#2EC4B6` · Giallo `#FFD23F` (secondari) + versioni soft
6. **Font**: Baloo 2 (titoli e bottoni), Nunito (testo)
7. **Icone**: SVG a pixel su griglia 24×24, sempre via `<Icona nome="..." />` (`src/icons/`). Il nome dice il **significato** (`indietro`, `pesi`, `durata`), mai la libreria: la corrispondenza col disegno sta solo in `src/icons/registry.js`, ed e' cio' che permette di ridisegnarne una alla volta. Servono su TUTTI i pulsanti: navigazione (`indietro`, `chiudi`, `su`/`giu`), azioni (`posticipa` · `salta` · `nota` · `pausa`/`avvia` · `aggiungi`/`togli`). Sui pulsanti con testo l'icona accompagna il testo. Un nome nuovo si aggiunge **prima** al registro, poi lo si usa. **Niente emoji**: quelle che c'erano (sezioni, categorie muscolari, alimenti) sono state pixellate e sono diventate icone come le altre — restano solo i segni tipografici dentro le frasi (`→` `✓` `✕`), che sono testo e non disegni
8. **Sfondo**: carta da parati di attrezzi da palestra a contorno, fitti e girati, in `--ink` al 10% sul crema. Sono le icone di [Tabler Icons](https://tabler.io/icons) (MIT) ridotte a griglia 20×20 con `scripts/pixella-tabler.html`, disposte da `scripts/genera-sfondo.py`. **Non si disegnano a mano**: provato, venivano storte. Le rotazioni sono solo a quarti di giro — un disegno a pixel ruotato di un angolo qualsiasi smette di esserlo
9. **Layout**: colonna singola max 480px, spaziatura generosa (gap 12-20px), mobile-first

## Anti-pattern (vietati)

- Gradienti **sfumati**, glassmorphism, blur, ombre sfumate — il divieto è sulle transizioni morbide, non sulla parola "gradient": bande a stop netti e piastrelle ripetute sono ammesse
- Grigi tristi come colore dominante
- Più di un bottone primary per schermata
- Testi lunghi: massimo una riga di sottotitolo per card

## Componenti disponibili (`src/styles/global.css`)

`.card` (+ `--primary/--teal/--yellow/--lilac/--tap/--flat`) · `.btn` (+ `--primary/--teal/--yellow/--big`) · `.chip` · `.appbar` · `.page` · `.stack` / `.row` · `.icona` (+ `--gira` al posto del vecchio `fa-spin`)

Ogni nuova schermata usa SOLO questi componenti; se serve qualcosa di nuovo, si aggiunge prima qui e al CSS.
