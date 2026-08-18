"""Genera in blocco le icone derivate dalle emoji che l'app usava.

Tiene la mappa completa: quale emoji e' diventata quale icona. Serve a poterle
rifare tutte se un giorno si cambia fonte o grana, e a sapere per ognuna da dove
viene senza aprire i file.

    python3 scripts/genera-icone-emoji.py            # scrive src/icons/da-emoji/
    python3 scripts/genera-icone-emoji.py --lista    # stampa solo la mappa

Le emoji che avevano gia' un'icona buona in pixelarticons NON stanno qui: quelle
usano la libreria, ed e' elencato in fondo per non far credere che siano state
dimenticate.
"""
import argparse
import os
import sys

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)

from emoji2icona import FONTI, pixella, quadra, ritaglia, scarica  # noqa: E402
from png2icona import componente, converti  # noqa: E402

DESTINAZIONE = os.path.join(QUI, "..", "src", "icons", "da-emoji")

# (emoji, nome nel registro, a cosa serve)
DA_GENERARE = [
    # --- sezioni e schermate ---
    # Regola: dove prima c'era un'EMOJI va un'icona colorata, dove c'era
    # un'icona di Font Awesome resta il disegno monocromatico di pixelarticons.
    # Le monocromatiche funzionano dentro un pulsante, accanto a "Indietro" o
    # "Pausa", dove devono solo ripetere il verbo; da sole a 2.4rem come
    # illustrazione di sezione sono povere, e infatti la home con la fiamma di
    # contorno sembrava spenta.
    ("🏋", "allenamento", "avvia allenamento, logo"),
    ("🎯", "obiettivi", "sezione Obiettivi"),
    ("👟", "obiettivoPassi", "obiettivo passi"),
    # Era 🍽, il piatto con le posate: a 24 px e 4 tinte veniva tutto grigio,
    # cioe' l'icona piu' spenta di tutta l'app proprio su un obiettivo.
    ("⚡", "obiettivoEnergia", "obiettivo energia, equivalenti"),
    ("🎉", "festa", "fine allenamento"),
    ("🔥", "energia", "avvia allenamento, obiettivo settimana, HIIT"),
    ("📋", "schede", "sezione Schede"),
    ("📈", "storicoSezione", "sezione Storico"),
    ("🔌", "integrazioni", "sezione Integrazioni"),
    ("⌚", "orologio", "watch, in home e in Integrazioni"),
    ("🔍", "cerca", "diagnostica kcal"),
    ("🏊", "nuotoSezione", "intestazione attivita' conteggiate"),
    ("💬", "scrivimi", "intestazione Scrivimi"),
    ("📝", "notaScritta", "nota di un esercizio nello storico"),
    # In pixelarticons "scale" e' il ridimensionamento (le frecce in diagonale),
    # non una bilancia: messa in home diceva "ingrandisci", non "peso".
    ("⚖", "parametri", "sezione Parametri: peso, altezza, eta'"),

    # --- categorie muscolari (data/catalog.js) ---
    ("💪", "catBraccia", "categoria Braccia"),
    ("✊", "catAvambracci", "categoria Avambracci"),
    ("🤸", "catSpalle", "categoria Spalle"),
    ("🛡", "catPetto", "categoria Petto"),
    ("🧗", "catSchiena", "categoria Schiena"),
    ("🍫", "catCore", "categoria Core / Addome"),
    ("🦵", "catGambe", "categoria Gambe"),
    ("🦶", "catPolpacci", "categoria Polpacci"),
    ("❤", "catCardio", "categoria Cardio"),
    ("🦒", "catCollo", "categoria Collo"),

    # --- equivalenti alimentari (data/foods.js) ---
    # Qui la grana fine conta: bisogna riconoscere QUALE cibo, non "un cibo".
    ("🥂", "ciboProsecco", "calice di vino bianco"),
    ("🍷", "ciboVinoRosso", "calice di vino rosso"),
    ("🍺", "ciboBirra", "birra bionda"),
    ("🍧", "ciboGranita", "gelato alla frutta"),
    ("🍸", "ciboGinTonic", "gin tonic"),
    ("🍋", "ciboTeLimone", "te' freddo al limone"),
    ("🥤", "ciboCola", "Coca-Cola"),
    ("🍹", "ciboSpritz", "spritz"),
    ("🍨", "ciboGelato", "gelato alla crema"),
    ("🍫", "ciboCioccolato", "barretta di cioccolato"),
    ("🥔", "ciboPatatine", "patatine in sacchetto"),
    ("🍟", "ciboFritte", "patatine fritte"),
    ("🍰", "ciboTiramisu", "tiramisu'"),
    ("🍣", "ciboSushi", "sushi misto"),
    ("🍔", "ciboHamburger", "hamburger"),
    ("🍜", "ciboRamen", "ramen di pollo"),
    ("🫑", "ciboPizzaVerdure", "pizza con le verdure"),
    ("🍕", "ciboPizza", "pizza margherita"),
    ("🐖", "ciboRamenMaiale", "ramen di maiale"),
    ("🍄", "ciboPizzaFunghi", "pizza prosciutto e funghi"),
    ("🌶", "ciboPizzaDiavola", "pizza diavola"),
]

# Emoji che NON diventano icone derivate, perche' nel loro punto sono AZIONI e
# non illustrazioni: dentro un pulsante l'icona accompagna un verbo, e li' la
# monocromatica di pixelarticons e' quella giusta (oltre a essere MIT).
GIA_IN_LIBRERIA = [
    ("⏸", "pausa", "Pause — pulsante Pausa/Riprendi"),
    ("⏱", "durata", "Clock — cronometro accanto a un tempo"),
    ("📝", "nota", "PenSquare — pulsante Nota"),
    ("💬", "commento", "CommentText — pulsante 'scrivimi' in home"),
    ("🏊", "nuoto", "Waves — riga dell'attivita' Nuoto"),
]

# Restano caratteri di testo, e non e' una dimenticanza: stanno dentro le frasi,
# sono segni tipografici e non disegni.
RESTANO_TESTO = ["→", "✓", "✕"]


def nome_componente(chiave):
    return chiave[0].upper() + chiave[1:]


def genera(fonte, lato, colori):
    os.makedirs(DESTINAZIONE, exist_ok=True)
    tmp = os.path.join(os.path.dirname(DESTINAZIONE), ".tmp-icona.png")
    fatte, falliti = [], []

    for emoji, chiave, uso in DA_GENERARE:
        try:
            img = pixella(quadra(ritaglia(scarica(emoji, fonte))), lato, colori)
        except SystemExit as e:
            falliti.append((emoji, chiave, str(e).splitlines()[0]))
            continue
        img.save(tmp)
        svg, tinte = converti(tmp, lato, segui_testo=False)
        comp = nome_componente(chiave)
        prov = f"{emoji} ({uso}) — pixellata da {fonte}, {FONTI[fonte][2]}"
        with open(os.path.join(DESTINAZIONE, f"{comp}.jsx"), "w") as f:
            f.write(componente(comp, svg, lato, prov))
        fatte.append((emoji, chiave, comp, len(tinte), len(svg)))

    if os.path.exists(tmp):
        os.remove(tmp)
    return fatte, falliti


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonte", default="twemoji", choices=list(FONTI))
    ap.add_argument("--lato", type=int, default=24)
    ap.add_argument("--colori", type=int, default=6)
    ap.add_argument("--lista", action="store_true", help="stampa la mappa e basta")
    a = ap.parse_args()

    if a.lista:
        print(f"{'emoji':<6} {'nome nel registro':<20} a cosa serve")
        for emoji, chiave, uso in DA_GENERARE:
            print(f"{emoji:<6} {chiave:<20} {uso}")
        print(f"\n--- gia' coperte da pixelarticons ({len(GIA_IN_LIBRERIA)}) ---")
        for emoji, chiave, comp in GIA_IN_LIBRERIA:
            print(f"{emoji:<6} {chiave:<20} {comp}")
        sys.exit()

    fatte, falliti = genera(a.fonte, a.lato, a.colori)

    print(f"scritte {len(fatte)} icone in src/icons/da-emoji/ "
          f"(fonte {a.fonte}, {a.lato}px, max {a.colori} tinte)\n")
    print("--- da incollare in src/icons/registry.js ---")
    for _, _, comp, _, _ in fatte:
        print(f"import {comp} from './da-emoji/{comp}'")
    print()
    for emoji, chiave, comp, tinte, byte in fatte:
        print(f"  {chiave}: {comp},".ljust(40) + f"// {emoji}  {tinte} tinte, {byte} B")

    if falliti:
        print("\n--- NON scaricate ---", file=sys.stderr)
        for emoji, chiave, err in falliti:
            print(f"  {emoji} ({chiave}): {err}", file=sys.stderr)
