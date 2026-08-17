# Da dove vengono le icone

Questo file e' l'elenco autorevole: se un giorno serve sapere cosa si puo' fare con
un disegno di questa cartella, la risposta e' qui e non altrove.

Le icone stanno **dentro il codice sorgente** e finiscono nel bundle. Non si
scaricano da nessuna parte a runtime: l'app deve funzionare in palestra anche con la
connessione che va e viene, e delle icone che a volte non compaiono sarebbero
peggio di nessuna icona.

## Le tre provenienze

| cartella | da dove | licenza | cosa comporta |
|---|---|---|---|
| — (dal pacchetto npm) | [pixelarticons](https://pixelarticons.com/) | **MIT** | va conservato l'avviso di copyright |
| `da-emoji/` | [Twemoji](https://github.com/jdecked/twemoji) | **CC-BY 4.0** | serve l'attribuzione, ed e' quella qui sotto |
| `mie/` | disegnate da Vania | nessun vincolo | sono sue |

## L'attribuzione

Le icone in `da-emoji/` sono **opere derivate** delle emoji di Twemoji: lo script
`scripts/genera-icone-emoji.py` scarica il disegno originale, lo riduce a 24×24 e
gli toglie i colori di troppo. Ridurre non e' creare, quindi la licenza di partenza
resta.

> Emoji grafiche di [Twemoji](https://github.com/jdecked/twemoji), copyright Twitter,
> Inc. e collaboratori, distribuite con licenza
> [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Ridotte a pixel art.

Questa frase compare **anche nell'app** (schermata "Scrivimi"): CC-BY chiede
l'attribuzione dove il lavoro viene usato, e un file nel repository non la mostra a
chi apre l'app dal telefono.

Ogni file di `da-emoji/` porta la stessa informazione nella prima riga, cosi' aprendo
un singolo componente si capisce da dove viene senza tornare qui.

## Perche' Twemoji e non le altre

- **Noto Emoji** (Apache 2.0) e **OpenMoji** (CC BY-SA 4.0) andavano bene come
  disegno, ma lo share-alike di OpenMoji obbliga a distribuire le derivate con la
  stessa licenza — un vincolo in piu' in un repository pubblico dove convivono
  disegni di tre provenienze.
- **Fluent Emoji** di Microsoft e' **MIT**, cioe' la licenza piu' comoda, ed era la
  prima scelta. Scartato per un motivo pratico: pubblica SVG e non PNG, e
  rasterizzarli richiede `cairo`, una libreria di sistema da installare a parte.
  Se un giorno quel passaggio smette di essere un fastidio, cambiare fonte e' un
  parametro dello script.
- Le emoji di **Apple** e di **Google sul telefono** non si possono usare: sono
  proprietarie, e uno screenshot non cambia le cose.

## Cosa NON serve fare

Non serve chiedere permesso, non serve pagare, non serve tenere traccia di quante
volte un'icona viene mostrata. CC-BY chiede solo di dire di chi e' il disegno
originale, ed e' fatto.

## Quando una diventa tua

Ridisegnandola da zero (vedi `mie/LEGGIMI.md`) e cambiando la riga corrispondente in
`registry.js`, quella derivata smette di essere usata: **va cancellata da
`da-emoji/`** e tolta dalla lista in `scripts/genera-icone-emoji.py`, se no resta
nel bundle un disegno di qualcun altro che non serve piu' a niente. Quando la
cartella `da-emoji/` si svuota, sparisce anche l'obbligo di attribuzione.
