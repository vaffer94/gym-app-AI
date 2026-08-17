"""Genera lo sfondo: attrezzi da palestra a contorno, sparsi e piu' fitti in basso.

Lo sfondo e' tinta unita (--paper) con attrezzi disegnati **solo di contorno**,
in una tinta scura ma chiaramente secondaria: devono leggersi come decorazione,
mai competere con quello che sta dentro le card.

Escono due piastrelle:
  sfondo-rado.svg   ripetuta su tutto lo schermo, pochi attrezzi
  sfondo-fitto.svg  ripetuta solo in orizzontale in fondo, tanti e piu' piccoli

Due immagini e non una perche' la densita' non e' uniforme: una piastrella sola,
ripetuta, distribuirebbe tutto allo stesso modo. Sovrapponendo la fascia fitta
in basso si ottiene "sparso ovunque, ammucchiato per terra" senza deformare
niente e a qualunque dimensione di schermo.

Gli attrezzi NON si sovrappongono mai: il controllo di collisione tiene conto
anche del bordo della piastrella (distanza "a ciambella"), se no due attrezzi
finivano addosso l'uno all'altro attraverso la giunzione fra una copia e la
successiva.

    python3 scripts/genera-sfondo.py
    python3 scripts/genera-sfondo.py --opacita 0.18
    python3 scripts/genera-sfondo.py --controlla    # verifica i disegni e basta
"""
import argparse
import os
import gzip
import random
import re

# ------------------------------------------------------------------ i disegni
#
# Tre modi di definire un attrezzo:
#   [righe]                        ASCII PIENO, il contorno lo calcola lo script
#   {"contorno": [righe]}          ASCII gia' di contorno, usato tale e quale
#                                  (serve quando ci vanno dettagli DENTRO la
#                                  sagoma: una ruota, un telaio)
#   {"pixelarticons": "nome"}      un'icona della libreria, gia' a linee
#
# Si usano solo '#' e '.', e il disegno deve essere quadrato: c'e' un controllo.

# Gli attrezzi NON sono disegnati qui: sono le icone di Tabler Icons (MIT),
# scaricate e ridotte a una griglia 20x20 con scripts/pixella-tabler.html.
# Ridisegnarle a mano era stato un errore — venivano storte e non somigliavano a
# niente. Qui si trasforma un disegno che esiste gia', come si fa con le emoji.
ATTREZZI = {
    # manubrio — tabler/dumbbell
    "manubrio": {"contorno": [
        "....................",
        "....................",
        ".....##########.....",
        "....##........##....",
        "....##........##....",
        "....##........##....",
        ".....##########.....",
        ".....##########.....",
        "....###......###....",
        "...###........###...",
        "...##..........##...",
        "...##..........##...",
        "..##............##..",
        "..##...######...##..",
        "...#...######...#...",
        "...##..........##...",
        "...##..........##...",
        "....############....",
        "....................",
        "....................",
    ]},
    # bilanciere — tabler/barbell
    "bilanciere": {"contorno": [
        "....................",
        "....................",
        "....................",
        "....................",
        ".....###....###.....",
        "....####....####....",
        "..####.#....#.####..",
        "..####.#....#.####..",
        "..#.##.#....#.##.#..",
        ".##.##.######.##.##.",
        ".##.##.######.##.##.",
        "..#.##.#....#.##.#..",
        "..####.#....#.####..",
        "..####.#....#.####..",
        "....####....####....",
        ".....###....###.....",
        "....................",
        "....................",
        "....................",
        "....................",
    ]},
    # corda per saltare — tabler/jump-rope
    "corda": {"contorno": [
        "....................",
        "....................",
        ".............####...",
        "......###....####...",
        ".....#####..##..##..",
        "....##...##.##..##..",
        "....##...##.##..##..",
        "....##...##..####...",
        "....##...##..####...",
        "....##...##...##....",
        "....##...##...##....",
        "...####..##...##....",
        "...####..##...##....",
        "..##..##.##...##....",
        "..##..##.##...##....",
        "..##..##..#####.....",
        "...####....###......",
        "...####.............",
        "....................",
        "....................",
    ]},
    # scarpa — tabler/shoe
    "scarpa": {"contorno": [
        "....................",
        "....................",
        "....................",
        "....................",
        "..#######...........",
        "..########..........",
        "..#.....##..........",
        "..#......###........",
        "..#.....########....",
        "..#.....##.######...",
        "..###...#..##...##..",
        "..#####....#....##..",
        "..#..##..........#..",
        "..#...#..........#..",
        "..################..",
        "..################..",
        "....................",
        "....................",
        "....................",
        "....................",
    ]},
    # cronometro — tabler/stopwatch
    "cronometro": {"contorno": [
        "....................",
        "....................",
        "........####........",
        "....................",
        "........####........",
        "......##########....",
        ".....###....####....",
        "....##........##....",
        "....##.....##.##....",
        "...##.....###..##...",
        "...##....###...##...",
        "...##..........##...",
        "....#..........##...",
        "....##........##....",
        "....###......###....",
        ".....###....###.....",
        "......########......",
        ".........##.........",
        "....................",
        "....................",
    ]},
    # bici — tabler/bike
    "bici": {"contorno": [
        "....................",
        "....................",
        "...........###......",
        "..........##.##.....",
        "..........##.##.....",
        "..........#####.....",
        "..........###.......",
        ".........####.......",
        "........###.####....",
        ".......###...####...",
        ".......##...........",
        "........##..........",
        "..####...##...####..",
        ".###.##..##..##.###.",
        ".##...##.##.##...##.",
        ".##...##.##.##...##.",
        ".###.##......##.###.",
        "..####........####..",
        "....................",
        "....................",
    ]},
    # nuotatore — tabler/swimming
    "nuoto": {"contorno": [
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
        "............###.....",
        "......####..###.....",
        ".....######.###.....",
        "....##...###........",
        "..........##........",
        ".........##.........",
        ".....####..####.....",
        "..####.######.####..",
        "..###...####...###..",
        "....................",
        "....................",
        "....................",
        "....................",
        "....................",
    ]},
    # borraccia — le due righe della vita sono ritoccate a mano,
    # l'icona originale ha i fianchi dritti — tabler/bottle
    "borraccia": {"contorno": [
        "....................",
        "........####........",
        ".......######.......",
        ".......######.......",
        ".......######.......",
        ".......##..##.......",
        "......##....##......",
        "......##....##......",
        ".....##......##.....",
        ".....##......##.....",
        ".....#####...##.....",
        ".....######.###.....",
        ".....##...#####.....",
        "......##....##......",
        "......##....##......",
        ".....##......##.....",
        ".....##......##.....",
        "......########......",
        "....................",
        "....................",
    ]},
    # posizione yoga — tabler/yoga
    "yoga": {"contorno": [
        "....................",
        "....................",
        "........####........",
        "........####........",
        ".......##..##.......",
        "........####........",
        ".......#####........",
        "...############.....",
        "...###...##.#####...",
        ".........##....##...",
        ".........#..........",
        "........###.........",
        "........######......",
        ".......#....##......",
        ".......##....##.....",
        "......##.....##.....",
        "...#####.....##.....",
        "...####.............",
        "....................",
        "....................",
    ]},
    # palla da pallavolo, disegnata al 72% per venire piu' piccola delle altre — tabler/ball-volleyball
    "pallavolo": {"contorno": [
        "....................",
        "....................",
        "....................",
        "....................",
        ".......######.......",
        "......########......",
        ".....##..##..##.....",
        "....#######..###....",
        "....###...#..###....",
        "....##...##.##.#....",
        "....#..####.##.#....",
        "....####..###.##....",
        "....###.#...####....",
        ".....##.###..##.....",
        "......########......",
        ".......######.......",
        "....................",
        "....................",
        "....................",
        "....................",
    ]},
    # battito cardiaco — tabler/heartbeat
    "battito": {"contorno": [
        "....................",
        "....................",
        "....................",
        ".....###....###.....",
        "...##############...",
        "..###...####...##...",
        "..##............##..",
        "..##............##..",
        "..#...###........#..",
        "......###.......##..",
        "..###.######....##..",
        "..#########....##...",
        "....###.......##....",
        ".....##......##.....",
        ".......#....##......",
        ".......##..##.......",
        "........####........",
        ".........##.........",
        "....................",
        "....................",
    ]},
    # tapis roulant — tabler/treadmill
    "tapisroulant": {"contorno": [
        "....................",
        "........###.........",
        ".......####.........",
        "........###.........",
        "....................",
        "......###...........",
        "....######..........",
        "....##.######...##..",
        "....##.##.###..###..",
        ".......##......##...",
        ".......##......##...",
        "..#####.##.....#....",
        "..#####..##....#....",
        ".........##...##....",
        ".........##...##....",
        ".........##...##....",
        "..............##....",
        "..################..",
        "..##............##..",
        "....................",
    ]},
    # medaglia — tabler/medal
    "medaglia": {"contorno": [
        "....................",
        "....................",
        "....................",
        "......##.##.##......",
        "......##.##.##......",
        "......##.##.##......",
        "......##....##......",
        "......##....##......",
        "......#......#......",
        ".........##.........",
        "........####........",
        "......########......",
        "......###..###......",
        "......###..###......",
        ".......##..##.......",
        ".......######.......",
        ".......######.......",
        ".......#............",
        "....................",
        "....................",
    ]},
}


PXA = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "..", "node_modules", "pixelarticons", "svg")


def da_pixelarticons(nome_icona):
    """Il <path> di un'icona della libreria, usato tale e quale."""
    f = os.path.join(PXA, f"{nome_icona}.svg")
    if not os.path.exists(f):
        raise SystemExit(f"{nome_icona}: non c'e' in pixelarticons (npm install?)")
    m = re.search(r'<path d="([^"]+)"', open(f).read())
    if not m:
        raise SystemExit(f"{nome_icona}: non trovo il path nell'SVG")
    return m.group(1)


def griglia_di(forma):
    """L'ASCII di un attrezzo, o None se viene da pixelarticons."""
    if isinstance(forma, dict):
        return forma.get("contorno")
    return forma


def lato_di(forma):
    g = griglia_di(forma)
    return len(g) if g else 20


def verifica(nome, forma, simmetrici=()):
    """Controlli sui disegni.

    Un ASCII storto non da' errore: disegna storto, e ci si mette un quarto
    d'ora a capire perche'. La simmetria si controlla perche' uno sfasamento di
    un pixel nell'ASCII non si vede, e sul disegno finito si vede benissimo —
    e' successo col manubrio e con la panca."""
    g = griglia_di(forma)
    if g is None:
        return
    larghezze = {len(r) for r in g}
    if len(larghezze) != 1:
        raise SystemExit(f"{nome}: righe di lunghezza diversa {sorted(larghezze)}")
    if larghezze != {len(g)}:
        raise SystemExit(f"{nome}: non e' quadrato ({len(g)} righe da {larghezze.pop()})")
    if set("".join(g)) - {"#", "."}:
        raise SystemExit(f"{nome}: si usano solo '#' e '.'")
    if nome in simmetrici:
        storte = [i for i, r in enumerate(g) if r != r[::-1]]
        if storte:
            raise SystemExit(f"{nome}: deve essere simmetrico, righe storte {storte}")


# La kettlebell non c'e': il riflesso in diagonale e' asimmetrico apposta.
# Nessuna: sono icone altrui, si prendono come sono.
SIMMETRICI = ()


def contorno(griglia):
    """Da forma piena a solo contorno: resta il pixel pieno che confina col vuoto."""
    h, w = len(griglia), len(griglia[0])
    pieno = lambda x, y: 0 <= x < w and 0 <= y < h and griglia[y][x] == "#"
    return [(x, y) for y in range(h) for x in range(w)
            if pieno(x, y) and not all(pieno(x + dx, y + dy)
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]


def pieni(griglia):
    return [(x, y) for y, r in enumerate(griglia) for x, c in enumerate(r) if c == "#"]


def rettangoli(punti, passo):
    """Unisce i pixel contigui di una riga in un rettangolo solo."""
    per_riga = {}
    for x, y in punti:
        per_riga.setdefault(y, []).append(x)
    out = []
    for y, xs in per_riga.items():
        xs.sort()
        inizio = prec = xs[0]
        for x in xs[1:]:
            if x == prec + 1:
                prec = x
                continue
            out.append((inizio * passo, y * passo, (prec - inizio + 1) * passo, passo))
            inizio = prec = x
        out.append((inizio * passo, y * passo, (prec - inizio + 1) * passo, passo))
    return out


def _posa(gx, gy, passo, giro, specchiato):
    """La trasformazione che porta il disegno in posizione, girato e specchiato
    attorno al proprio centro."""
    c = 10 * passo                     # meta' di una griglia 20x20
    t = f"translate({gx},{gy})"
    if giro:
        t += f" rotate({giro} {c} {c})"
    if specchiato:
        t += f" translate({2 * c},0) scale(-1,1)"
    return t


def disegna(forma, passo, gx, gy, giro=0, specchiato=False):
    """Il markup di un attrezzo posato in (gx, gy), eventualmente girato.

    Il giro e' a QUARTI (0, 90, 180, 270) e non a un angolo qualsiasi: un
    disegno a pixel ruotato di 37 gradi non e' piu' un disegno a pixel, i
    quadretti cadono fra due pixel e i bordi si sfrangiano. Coi quarti di giro,
    piu' lo specchio, si hanno otto orientamenti che restano tutti sulla
    griglia."""
    if isinstance(forma, dict) and "pixelarticons" in forma:
        d = da_pixelarticons(forma["pixelarticons"])
        return f'<g transform="{_posa(gx, gy, passo, giro, specchiato)} scale({passo})"><path d="{d}"/></g>'
    g = griglia_di(forma)
    # Un ASCII gia' di contorno si disegna com'e'; uno pieno passa da contorno().
    gia_contorno = isinstance(forma, dict)
    punti = pieni(g) if gia_contorno else contorno(g)
    r = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>'
                for x, y, w, h in rettangoli(punti, passo))
    return f'<g transform="{_posa(gx, gy, passo, giro, specchiato)}">{r}</g>'


def riquadro(forma, passo):
    """Il rettangolo davvero occupato dal disegno, non l'intera griglia.

    Gli attrezzi hanno margini vuoti diversi (il manubrio occupa sei righe su
    venti): misurare le collisioni sulla griglia intera li teneva lontanissimi
    e faceva sembrare lo sfondo vuoto."""
    g = griglia_di(forma)
    if g is None:
        return 0, 0, 20 * passo, 20 * passo      # pixelarticons: tutta la griglia
    punti = pieni(g) if isinstance(forma, dict) else contorno(g)
    xs = [x for x, _ in punti]
    ys = [y for _, y in punti]
    return (min(xs) * passo, min(ys) * passo,
            (max(xs) - min(xs) + 1) * passo, (max(ys) - min(ys) + 1) * passo)


def sfondo(lato, quanti, passo, colore, opacita, seme, aria=1):
    """Piastrella quadrata che si ripete su tutta la pagina: attrezzi fitti e
    girati, come una carta da parati.

    Uniforme e non addensata da qualche parte: una piastrella ripetuta ha la
    stessa densita' ovunque per costruzione, e va bene cosi' — l'alternativa
    (un'immagine sola, non ripetuta) copre bene un telefono ma lascia i lati
    vuoti su uno schermo largo.

    Le collisioni si misurano "a ciambella": l'immagine si affianca a se stessa
    su tutti e quattro i lati, quindi due attrezzi ai bordi opposti possono
    toccarsi attraverso la giunzione.
    """
    rnd = random.Random(seme)
    nomi = list(ATTREZZI)
    occupati = []
    parti = []

    def libero(x0, y0, w, h):
        for ox in (-lato, 0, lato):
            for oy in (-lato, 0, lato):
                ax0, ay0 = x0 + ox - aria, y0 + oy - aria
                ax1, ay1 = x0 + ox + w + aria, y0 + oy + h + aria
                for bx, by, bw, bh in occupati:
                    if ax0 < bx + bw and bx < ax1 and ay0 < by + bh and by < ay1:
                        return False
        return True

    for _ in range(quanti * 200):
        if len(occupati) >= quanti:
            break
        nome = nomi[rnd.randrange(len(nomi))]
        forma = ATTREZZI[nome]
        giro = rnd.choice((0, 90, 180, 270))
        specchiato = rnd.random() < 0.5

        rx, ry, rw, rh = riquadro(forma, passo)
        if giro in (90, 270):                 # girando, largo e alto si scambiano
            misura = 20 * passo
            rx, ry, rw, rh = misura - ry - rh, rx, rh, rw
        if specchiato:
            rx = 20 * passo - rx - rw

        px, py = rnd.randrange(lato), rnd.randrange(lato)
        if not libero(px + rx, py + ry, rw, rh):
            continue

        occupati.append((px + rx, py + ry, rw, rh))
        # le copie che sbordano vanno ridisegnate dall'altro lato, se no la
        # giunzione taglia l'attrezzo a meta'
        for ox in (-lato, 0, lato):
            for oy in (-lato, 0, lato):
                if (px + rx + ox + rw > 0 and px + rx + ox < lato
                        and py + ry + oy + rh > 0 and py + ry + oy < lato):
                    parti.append(disegna(forma, passo, px + ox, py + oy, giro, specchiato))

    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{lato}" height="{lato}" '
            f'viewBox="0 0 {lato} {lato}" shape-rendering="crispEdges">'
            f'<g fill="{colore}" fill-opacity="{opacita}">{"".join(parti)}</g></svg>')


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--colore", default="#2b2b3c")
    ap.add_argument("--opacita", type=float, default=0.10)
    ap.add_argument("--seme", type=int, default=11)
    ap.add_argument("--controlla", action="store_true",
                    help="verifica i disegni senza scrivere niente")
    ap.add_argument("--lato", type=int, default=300)
    ap.add_argument("--passo", type=int, default=2)
    ap.add_argument("--quanti", type=int, default=30)
    ap.add_argument("--dir", default=None)
    a = ap.parse_args()

    for nome, forma in ATTREZZI.items():
        verifica(nome, forma, SIMMETRICI)
    if a.controlla:
        print(f"{len(ATTREZZI)} disegni, tutti a posto: {', '.join(ATTREZZI)}")
        raise SystemExit

    dest = a.dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
    os.makedirs(dest, exist_ok=True)
    svg = sfondo(a.lato, a.quanti, a.passo, a.colore, a.opacita, a.seme)
    p = os.path.join(dest, "sfondo-attrezzi.svg")
    with open(p, "w") as f:
        f.write(svg)
    print(f"{os.path.relpath(p)}  {len(svg)} byte "
          f"({len(gzip.compress(svg.encode()))} compressi)")
