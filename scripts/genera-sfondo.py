"""Genera la piastrella dello sfondo: righe diagonali a scaletta di pixel.

Un `repeating-linear-gradient(45deg, ...)` disegna diagonali LISCE, con i bordi
antialiasati: accanto a icone su griglia 24x24 stona. Qui la diagonale e' fatta
di blocchi quadrati, come la disegnerebbe una console a 8 bit.

    python3 scripts/genera-sfondo.py            # scrive public/sfondo-righe.svg
    python3 scripts/genera-sfondo.py --passo 12 --banda 60

I colori stanno QUI e non nelle variabili CSS: finiscono dentro l'SVG, e una
variabile che non ha effetto sarebbe peggio che non averla. Per cambiarli si
cambiano qui e si rilancia lo script.
"""
import argparse
import os

# I colori dell'app schiariti fin quasi al bianco. Devono farsi notare come
# arcobaleno e sparire come rumore appena ci si appoggia sopra una card; piu'
# saturi di cosi' e il testo grigio fuori dalle card comincia a faticare.
COLORI = [
    "#fdf5f0",  # arancio
    "#fefaeb",  # giallo
    "#f2fbf9",  # teal
    "#f8f4fe",  # lilla
    "#fdf4f8",  # rosa
]


def piastrella(passo, banda):
    """passo = lato del blocco quadrato; banda = larghezza di una riga colorata.

    La banda deve essere un multiplo del passo, se no i gradini escono
    irregolari: alcuni larghi uno e altri due blocchi.
    """
    if banda % passo:
        raise SystemExit(f"banda ({banda}) deve essere un multiplo del passo ({passo})")

    n = len(COLORI)
    # Il colore dipende da (x + y): e' questo che rende la riga diagonale.
    # Il disegno si ripete ogni banda*n, quindi la piastrella e' quadrata di
    # quel lato — cosi' background-repeat la affianca senza giunte visibili.
    lato = banda * n
    blocchi = lato // passo

    # Un rettangolo per ogni blocco sarebbe migliaia di nodi: i blocchi
    # contigui della stessa riga si uniscono in un rettangolo solo.
    per_colore = {c: [] for c in COLORI}
    for by in range(blocchi):
        bx = 0
        while bx < blocchi:
            c = COLORI[((bx + by) * passo // banda) % n]
            larg = 1
            while bx + larg < blocchi and \
                    COLORI[((bx + larg + by) * passo // banda) % n] == c:
                larg += 1
            per_colore[c].append((bx * passo, by * passo, larg * passo, passo))
            bx += larg

    parti = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{lato}" '
             f'height="{lato}" viewBox="0 0 {lato} {lato}" '
             f'shape-rendering="crispEdges">']
    for c, rett in per_colore.items():
        parti.append(f'<g fill="{c}">')
        parti += [f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x, y, w, h in rett]
        parti.append("</g>")
    parti.append("</svg>")
    return "\n".join(parti), lato, sum(len(v) for v in per_colore.values())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--passo", type=int, default=8, help="lato del blocco (px)")
    ap.add_argument("--banda", type=int, default=48, help="larghezza di una riga (px)")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    svg, lato, n = piastrella(a.passo, a.banda)
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "public", "sfondo-righe.svg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        f.write(svg)
    print(f"{os.path.relpath(out)}: piastrella {lato}x{lato}, "
          f"blocchi da {a.passo}px, bande da {a.banda}px, "
          f"{n} rettangoli, {len(svg)} byte")
