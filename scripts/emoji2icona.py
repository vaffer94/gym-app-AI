"""Trasforma un'emoji in un'icona a pixel multicolore.

Le emoji di sistema sono disegni ad alta risoluzione con centinaia di colori e
sfumature: dentro un'app a pixel stonano, ma ridisegnarne cinquanta a mano e' un
lavoro lungo. Questo script fa il passaggio intermedio — prende il disegno
ufficiale di un set di emoji libero, lo riduce a una griglia di 24x24 con pochi
colori e lo passa a png2icona.py, che ne fa un componente ricolorabile.

    python3 scripts/emoji2icona.py 👟 --nome passi > src/icons/mie/Passi.jsx
    python3 scripts/emoji2icona.py 👟 --png prova.png      # solo per guardarla

Le icone che escono da qui sono **segnaposto migliori delle emoji**, non disegni
definitivi: restano derivate dal set scelto, con la sua licenza (vedi FONTI).
Quando Vania ne ridisegna una, quella vince e questa sparisce.
"""
import argparse
import os
import ssl
import sys
import urllib.request

from PIL import Image

# Da dove arrivano i disegni. La licenza NON e' un dettaglio: l'icona che esce di
# qui e' un'opera derivata e si porta dietro la licenza della fonte.
FONTI = {
    # Grafica CC-BY 4.0 (serve attribuzione). Forme piatte e poche tinte: e' il
    # set che regge meglio la riduzione a 24x24.
    "twemoji": ("https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/{cp}.png",
                str.lower, "CC-BY 4.0 — attribuzione richiesta"),
    # Apache 2.0 / OFL. Piu' morbide e sfumate, perdono piu' definizione.
    "noto": ("https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/png/128/emoji_u{cp}.png",
             lambda s: s.lower().replace("-", "_"), "Apache 2.0 / OFL"),
    # CC BY-SA 4.0: lo share-alike si estende a cio' che ne deriva.
    "openmoji": ("https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@master/color/618x618/{cp}.png",
                 str.upper, "CC BY-SA 4.0 — share-alike"),
}

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache-emoji")


def codepoint(emoji):
    """U+1F45F -> '1f45f'. Il selettore di variazione FE0F va tolto: i file dei
    set non ce l'hanno nel nome, e con quello ogni scaricamento darebbe 404."""
    return "-".join(f"{ord(c):x}" for c in emoji if ord(c) != 0xFE0F)


def _contesto_ssl():
    """Su macOS il Python scaricato da python.org non usa i certificati di
    sistema, e ogni https fallisce con CERTIFICATE_VERIFY_FAILED. Se c'e'
    certifi lo si usa, se no si lascia il default: sulle installazioni normali
    funziona gia'."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return None


def scarica(emoji, fonte):
    modello, forma, _ = FONTI[fonte]
    cp = forma(codepoint(emoji))
    os.makedirs(CACHE, exist_ok=True)
    locale = os.path.join(CACHE, f"{fonte}-{cp}.png")
    if not os.path.exists(locale):
        url = modello.format(cp=cp)
        try:
            with urllib.request.urlopen(url, timeout=20, context=_contesto_ssl()) as r:
                dati = r.read()
        except Exception as e:
            raise SystemExit(
                f"{emoji}: non riesco a scaricarla da {fonte}\n  {url}\n  {e}\n"
                "  (se dice CERTIFICATE_VERIFY_FAILED:  pip install certifi)")
        with open(locale, "wb") as f:
            f.write(dati)
    return Image.open(locale).convert("RGBA")


def ritaglia(img):
    """Toglie il bordo trasparente. Le emoji hanno margini diversi da un set
    all'altro: senza questo passaggio la stessa emoji esce grande in un set e
    piccola in un altro, e in fila non si allineano."""
    bbox = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def quadra(img):
    """Mette il disegno al centro di una tela quadrata, senza deformarlo."""
    lato = max(img.size)
    tela = Image.new("RGBA", (lato, lato), (0, 0, 0, 0))
    tela.paste(img, ((lato - img.width) // 2, (lato - img.height) // 2))
    return tela


def pixella(img, lato=24, colori=6):
    """Riduce a griglia e a poche tinte.

    Il ridimensionamento usa BOX (media dell'area) e non NEAREST: scendendo da
    72 o 618 pixel a 24, NEAREST tiene un pixel ogni tre o ogni venticinque e i
    tratti sottili spariscono del tutto. La media li conserva come tinta
    intermedia, e la quantizzazione subito dopo li riporta a un colore netto.
    """
    piccola = img.resize((lato, lato), Image.BOX)

    # L'alfa va deciso PRIMA di quantizzare: quantizzando in RGBA i colori
    # semitrasparenti dei bordi diventerebbero tinte a se' stanti e sprecherebbero
    # meta' della palette in aloni.
    alfa = piccola.getchannel("A").point(lambda a: 255 if a >= 110 else 0)
    rgb = Image.new("RGB", piccola.size, (255, 255, 255))
    rgb.paste(piccola.convert("RGB"), mask=alfa)

    ridotta = rgb.quantize(colors=colori, method=Image.MEDIANCUT, dither=0).convert("RGB")
    ridotta.putalpha(alfa)
    return ridotta


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("emoji")
    ap.add_argument("--fonte", default="twemoji", choices=list(FONTI))
    ap.add_argument("--lato", type=int, default=24)
    ap.add_argument("--colori", type=int, default=6)
    ap.add_argument("--nome", help="nome nel registro, es. 'passi'")
    ap.add_argument("--png", help="scrive un PNG invece del componente")
    a = ap.parse_args()

    icona = pixella(quadra(ritaglia(scarica(a.emoji, a.fonte))), a.lato, a.colori)

    if a.png:
        icona.save(a.png)
        print(f"scritto {a.png}", file=sys.stderr)
        sys.exit()

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import re

    from png2icona import componente, converti

    tmp = os.path.join(CACHE, "_tmp.png")
    icona.save(tmp)
    svg, tinte = converti(tmp, a.lato)
    grezzo = a.nome or codepoint(a.emoji)
    nome = "".join(p.capitalize() for p in re.split(r"[-_ ]+", grezzo) if p)
    print(componente(nome, svg, a.lato))

    print(f"{a.emoji} da {a.fonte} ({FONTI[a.fonte][2]})", file=sys.stderr)
    print(f"{len(tinte)} tinte, {len(svg)} byte", file=sys.stderr)
    print(f"registro:  import {nome} from './mie/{nome}'   ...   {grezzo}: {nome},",
          file=sys.stderr)
