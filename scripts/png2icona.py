"""Converte un PNG di pixel art in un SVG multicolore pronto per l'app.

L'idea: disegni in Aseprite / Piskel / Pixelorama su una griglia 24x24 usando
POCHI colori, esporti PNG, e questo script produce un SVG in cui ogni colore
diventa un livello con la sua variabile CSS. Cosi' la stessa icona si ricolora
dal CSS senza ridisegnarla, che e' quello che un webfont non puo' fare (un glifo
di un font ha un colore solo).

    python3 scripts/png2icona.py pesi.png > src/icons/mie/Pesi.jsx

I pixel adiacenti vengono uniti in rettangoli: un'icona 24x24 esce sul migliaio
di byte invece che con 576 rettangoli da uno.
"""
import os
import re
import sys
from collections import OrderedDict

from PIL import Image

# I colori sorgente vengono mappati su variabili CSS in ordine di comparsa.
# Il valore di default e' il colore che hai disegnato, cosi' l'icona si vede
# giusta anche senza CSS.
NOMI = ["--ico-a", "--ico-b", "--ico-c", "--ico-d", "--ico-e", "--ico-f"]


def converti(path, dimensione=24, segui_testo=True):
    img = Image.open(path).convert("RGBA")
    if img.size != (dimensione, dimensione):
        # NEAREST e' obbligatorio: qualunque altro filtro inventa colori
        # intermedi e trasforma 4 tinte in 400.
        img = img.resize((dimensione, dimensione), Image.NEAREST)
    px = img.load()

    livelli = OrderedDict()
    for y in range(dimensione):
        x = 0
        while x < dimensione:
            r, g, b, a = px[x, y]
            if a < 128:
                x += 1
                continue
            colore = f"#{r:02x}{g:02x}{b:02x}"
            # quanto dura la striscia dello stesso colore su questa riga
            larghezza = 1
            while x + larghezza < dimensione:
                r2, g2, b2, a2 = px[x + larghezza, y]
                if a2 < 128 or f"#{r2:02x}{g2:02x}{b2:02x}" != colore:
                    break
                larghezza += 1
            livelli.setdefault(colore, []).append((x, y, larghezza))
            x += larghezza

    # Le strisce orizzontali identiche su righe consecutive diventano un solo
    # rettangolo alto: senza questo passaggio un manubrio esce 3,5 KB invece di 1.
    for colore, strisce in livelli.items():
        per_colonna = {}
        for x, y, w in strisce:
            per_colonna.setdefault((x, w), []).append(y)
        unite = []
        for (x, w), ys in per_colonna.items():
            ys.sort()
            inizio = precedente = ys[0]
            for y in ys[1:]:
                if y == precedente + 1:
                    precedente = y
                    continue
                unite.append((x, inizio, w, precedente - inizio + 1))
                inizio = precedente = y
            unite.append((x, inizio, w, precedente - inizio + 1))
        livelli[colore] = sorted(unite, key=lambda r: (r[1], r[0]))

    if len(livelli) > len(NOMI):
        print(f"attenzione: {len(livelli)} colori, ne gestisco {len(NOMI)}",
              file=sys.stderr)

    parti = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{dimensione}" '
             f'height="{dimensione}" viewBox="0 0 {dimensione} {dimensione}" '
             f'shape-rendering="crispEdges">']
    for i, (colore, strisce) in enumerate(livelli.items()):
        var = NOMI[i] if i < len(NOMI) else NOMI[-1]
        # `segui_testo` fa ripiegare il PRIMO colore su currentColor, cosi'
        # l'icona prende il colore del testo che accompagna. Ha senso per un
        # disegno di un colore solo (una freccia, una X), e NON ce l'ha per un
        # disegno a piu' tinte: li' il primo colore e' semplicemente la regione
        # piu' grande, e farla diventare il colore del testo dava un maiale
        # blu scuro col bordo rosa. Chi ha piu' tinte tiene i suoi colori.
        ripiego = "currentColor" if (segui_testo and i == 0) else colore
        parti.append(f'<g fill="var({var}, {ripiego})">')
        for x, y, w, h in strisce:
            alt = "" if h == 1 else f' height="{h}"'
            parti.append(f'<rect x="{x}" y="{y}" width="{w}"{alt or " height=\"1\""}/>')
        parti.append("</g>")
    parti.append("</svg>")
    return "\n".join(parti), list(livelli)


def componente(nome_componente, svg, dimensione, provenienza=None):
    """Impacchetta l'SVG in un componente React.

    Si genera un .jsx invece di importare il .svg perche' importare un SVG come
    componente richiederebbe vite-plugin-svgr, cioe' una dipendenza in piu' per
    fare una cosa che qui costa tre righe. E' anche il formato in cui li
    distribuisce pixelarticons, cosi' le nostre e le loro si usano allo stesso
    modo e il registro non deve sapere quale delle due sta montando.

    width e height escono dall'SVG e finiscono in {...props}: e' il componente
    Icona a deciderle, se restassero qui vincerebbero loro e l'icona non
    seguirebbe piu' la misura del testo.
    """
    corpo = svg.replace(
        f'width="{dimensione}" height="{dimensione}" ', ""
    ).replace("<svg ", "<svg {...props} ", 1)
    # In JSX gli attributi col trattino non esistono: shape-rendering deve
    # diventare shapeRendering, se no React lo ignora e i bordi tornano sfocati.
    corpo = re.sub(r'\b([a-z]+)-([a-z])([a-z]*)="',
                   lambda m: f'{m.group(1)}{m.group(2).upper()}{m.group(3)}="', corpo)
    rientrato = corpo.replace("\n", "\n    ")
    # La provenienza sta NEL file e non solo nei crediti: fra un anno, guardando
    # un singolo componente, si deve capire da dove viene e con che licenza
    # senza andare a cercare.
    testa = f"// {provenienza}\n" if provenienza else ""
    return (f"{testa}"
            f"// generato da scripts/png2icona.py — non si modifica a mano:\n"
            f"// si ridisegna il PNG e si rilancia lo script\n"
            f"export default function {nome_componente}(props) {{\n"
            f"  return (\n    {rientrato}\n  )\n}}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("uso: png2icona.py icona.png [lato]  >  src/icons/mie/Icona.jsx")
    lato = int(sys.argv[2]) if len(sys.argv) > 2 else 24
    svg, colori = converti(sys.argv[1], lato)

    grezzo = os.path.splitext(os.path.basename(sys.argv[1]))[0]
    nome = "".join(p.capitalize() for p in re.split(r"[-_ ]+", grezzo) if p)
    print(componente(nome, svg, lato))

    print(f"{len(colori)} colori -> {', '.join(NOMI[:len(colori)])}", file=sys.stderr)
    print(f"{len(svg)} byte di SVG", file=sys.stderr)
    print("\nper usarla, in src/icons/registry.js:", file=sys.stderr)
    print(f"  import {nome} from './mie/{nome}'", file=sys.stderr)
    print(f"  ...e nella mappa:  {grezzo}: {nome},", file=sys.stderr)
