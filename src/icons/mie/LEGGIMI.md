# Le icone disegnate a mano

Qui dentro vanno le icone nostre, quelle che sostituiscono una alla volta i
segnaposto presi da pixelarticons. La cartella parte vuota: e' normale.

## Come se ne aggiunge una

1. **Disegna** su una tela **24×24** con **massimo 3-4 colori**, sfondo
   trasparente. Vanno bene [Piskel](https://www.piskelapp.com/) (gratis, nel
   browser), [Pixelorama](https://orama-interactive.itch.io/pixelorama) (gratis)
   o [Aseprite](https://www.aseprite.org/). Esporta in **PNG**.

2. **Converti**:

   ```
   python3 scripts/png2icona.py pesi.png > src/icons/mie/Pesi.jsx
   ```

   Serve Pillow (`pip install pillow`). Lo script stampa le due righe da
   incollare al passo 3.

3. **Registra** in `../registry.js`: l'import in cima e la voce nella mappa.
   Quella riga sostituisce l'icona della libreria — **nessun'altra riga
   dell'app va toccata**, ed e' tutto il senso di avere un registro.

## I colori

Ogni colore del PNG diventa un livello con la sua variabile CSS, in ordine di
comparsa: `--ico-a`, `--ico-b`, `--ico-c`... Il valore che hai disegnato resta
come ripiego, quindi l'icona si vede giusta anche senza scrivere una riga di CSS.

Il **primo** colore ripiega su `currentColor`: e' la convenzione del resto
dell'app, e serve a far seguire all'icona il colore del testo che accompagna.
Conviene disegnare con quel colore il **contorno**, cosi' le tue e quelle della
libreria condividono lo scheletro e nella fase mista non stonano.

Per ricolorare un'icona in un punto solo, si danno le variabili al genitore:

```jsx
<span style={{ '--ico-b': 'var(--teal)' }}><Icona nome="pesi" /></span>
```

## Le prime da rifare

In ordine di quanto la sostituzione attuale regge poco:

| nome | oggi | perche' va rifatta |
|---|---|---|
| `corsa` | `speed-fast` | legge come un tachimetro, non come una persona che corre |
| `bici` | `speed-medium` | idem, e si distingue da `corsa` solo perche' e' un altro disegno |
| `pesi` | `human-arms-up` | dice il gesto, non l'attrezzo: un manubrio sarebbe piu' chiaro |
| `passi` | `target` | un bersaglio per un obiettivo di passi e' un'astrazione in piu' |
| `escursione` | `tree-pine` | un albero al posto di chi cammina in montagna |

Le altre trentasette reggono: si possono rifare per gusto, non perche' serva.

## Cosa NON sta qui

Le emoji delle **categorie muscolari** e degli **equivalenti alimentari** sono
rimaste emoji apposta. Per gli alimenti la sostituzione non e' proponibile —
pizza, birra, sushi e ramen non esistono in nessuna libreria a pixel, e mostrare
la stessa icona generica per cibi diversi toglie al carrello l'unica cosa che lo
rende leggibile. Per le categorie servirebbero dieci disegni: cinque avrebbero un
equivalente, gli altri cinque (schiena, addome, gambe, polpacci, collo) no, e
meta' pixel e meta' emoji nella stessa lista sta peggio di dieci emoji.
Se un giorno le disegni tutte e dieci, quel giorno si cambia.
