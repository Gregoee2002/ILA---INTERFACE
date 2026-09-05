#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OCR politonico dei soli blocchi greci di una fonte a stampa.

    python3 scripts/ocr-print-source.py --pdf <scansione.pdf> [--pagine 12-166]

Perché serve. Molti PDF di corpora epigrafici hanno un livello di testo che
rende bene il latino ma **non mappa il font greco in Unicode**: `pdftotext`
restituisce il greco come mojibake ($LA'Yj't"OC; per Φίλητος). Il testo a
stampa risulta quindi inservibile proprio nella parte che conta, e la
collazione (scripts/collate-source.ts) gira a vuoto.

Come funziona, e perché non si limita a passare la pagina a Tesseract.
Dare l'intera pagina a `tesseract -l grc` produce greco corretto sulle
iscrizioni **e greco falso sul testo inglese**, che verrebbe letto come lettere
greche e sporcherebbe la collazione più di quanto la aiuti. Qui invece:

  1. `pdftotext -bbox-layout` dà ogni riga con le sue coordinate;
  2. le righe si classificano in inglese e mojibake — il mojibake ha tratti
     che l'inglese non ha mai (cifre dentro le parole, ':' e '~' interni,
     maiuscole in mezzo a una parola);
  3. le righe mojibake contigue formano un blocco, di cui si ritaglia il
     rettangolo dalla pagina (`pdftoppm -x -y -W -H`);
  4. **solo quel ritaglio** passa a `tesseract -l grc`;
  5. la pagina viene ricomposta: inglese dal livello di testo (che è giusto),
     greco dall'OCR.

Il risultato è un .txt con la stessa geometria di `pdftotext -layout`, che
`collate-source.ts` sa già leggere (`--txt`).

Nessuna fonte è cablata: si passa il PDF che si vuole. Vedi il registro in
src/lib/printSources.ts.

Dipendenze: poppler (pdftotext, pdftoppm) e tesseract con la lingua `grc`.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass

# ── classificazione delle righe ────────────────────────────────────────────
# Tratti che il mojibake ha e l'inglese no. Nessuno di essi da solo basta:
# si contano le parole che ne mostrano almeno uno.
TRATTI = [
    re.compile(r"[A-Za-z][0-9]|[0-9][A-Za-z]"),   # cifra dentro la parola: 7tClP, 6e:wv
    re.compile(r"[A-Za-z][:~$&<>][A-Za-z]"),      # segno interno: Xe:XpU, O[LClA
    re.compile(r"[a-z][A-Z]"),                    # maiuscola in mezzo: XClL, ALVOUV
    re.compile(r"[A-Za-z][\"'][A-Za-z]"),         # apostrofo interno: 't\"OC
    re.compile(r"[A-Za-z][\"'~$&<>]|[\"'~$&<>][A-Za-z]"),  # segno attaccato a una lettera: 't\"<il, 'Yj-
]
# Parole inglesi frequentissime in questo genere di pagine: la loro presenza
# smentisce il mojibake anche quando la riga ha qualche carattere strano.
INGLESI = re.compile(
    r"\b(the|of|and|in|with|from|found|height|width|depth|cm|no|p{1,2}|op|cit|col|vol|"
    r"stone|altar|marble|inscription|bears|now|museum|left|right|top|line|lines)\b",
    re.I,
)


def e_mojibake(testo: str) -> bool:
    parole = [p for p in testo.split() if len(p) >= 2]
    if not parole:
        return False
    strane = sum(1 for p in parole if any(t.search(p) for t in TRATTI))
    quota = strane / len(parole)
    if quota >= 0.5:
        # una riga tutta greca non contiene parole inglesi vere; se ne contiene
        # più di una è quasi sempre inglese con dentro una parola greca citata.
        return len(INGLESI.findall(testo)) <= 1
    return False


@dataclass
class Riga:
    testo: str
    x0: float
    y0: float
    x1: float
    y1: float
    greca: bool


@dataclass
class Pagina:
    numero: int          # 1-based, come lo intende pdftotext/pdftoppm
    larghezza: float     # in punti
    altezza: float
    righe: list


def leggi_bbox(pdf: str, prima: int, ultima: int) -> list:
    """Le righe di ogni pagina, con le coordinate in punti."""
    with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as tmp:
        percorso = tmp.name
    try:
        subprocess.run(
            ["pdftotext", "-bbox-layout", "-f", str(prima), "-l", str(ultima), pdf, percorso],
            check=True, capture_output=True,
        )
        xml = open(percorso, encoding="utf-8", errors="replace").read()
    finally:
        os.unlink(percorso)

    pagine = []
    numero = prima - 1
    for pm in re.finditer(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', xml, re.S):
        numero += 1
        righe = []
        for lm in re.finditer(
            r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>',
            pm.group(3), re.S,
        ):
            parole = [html.unescape(w) for w in re.findall(r"<word[^>]*>(.*?)</word>", lm.group(5), re.S)]
            testo = " ".join(parole).strip()
            if not testo:
                continue
            righe.append(Riga(
                testo=testo,
                x0=float(lm.group(1)), y0=float(lm.group(2)),
                x1=float(lm.group(3)), y1=float(lm.group(4)),
                greca=e_mojibake(testo),
            ))
        pagine.append(Pagina(numero=numero, larghezza=float(pm.group(1)), altezza=float(pm.group(2)), righe=righe))
    return pagine


def raggruppa(righe: list) -> list:
    """Righe greche contigue → blocchi.

    Due passaggi. Prima si recuperano le righe che la classificazione perde:
    una riga corta, senza parole inglesi, attaccata a una riga greca è quasi
    sempre la coda di un'iscrizione (l'ultima parola, un accento finito da
    solo). La vicinanza verticale è la garanzia che non si stia inghiottendo
    il numero di pagina, che sta lontano.

    Poi si spezzano i blocchi dove il salto verticale dice che sono due cose
    diverse: due iscrizioni separate non vanno ritagliate insieme.
    """
    if not righe:
        return []
    altezza_tipica = sorted(r.y1 - r.y0 for r in righe)[len(righe) // 2] or 10.0

    # Un numero di pagina o di riga non è mai testo greco, per quanto sia
    # corto e per quanto stia vicino: va escluso prima di ogni recupero.
    # Deve contenere almeno una cifra (o un numerale romano): una virgola
    # sciolta non è un numero di pagina, è l'accento di un'iscrizione.
    solo_numero = re.compile(r"^(?=.*[\dIVX])[\dIVXlio.,;:\-]+$")

    greche = [r.greca for r in righe]
    # Il recupero si propaga: la coda di un'iscrizione può essere una catena di
    # righe corte (l'ultima parola, un accento staccato). Si itera finché non
    # cambia più nulla, non una volta sola.
    cambiato = True
    while cambiato:
        cambiato = False
        for i, r in enumerate(righe):
            if greche[i] or len(r.testo) > 4 or INGLESI.search(r.testo) or solo_numero.match(r.testo):
                continue
            for j in (i - 1, i + 1):
                if 0 <= j < len(righe) and greche[j] and abs(righe[j].y0 - r.y0) < 1.8 * altezza_tipica:
                    greche[i] = True
                    cambiato = True
                    break

    blocchi, corrente = [], []
    for i, r in enumerate(righe):
        if not greche[i]:
            if corrente:
                blocchi.append(corrente)
                corrente = []
            continue
        if corrente and (r.y0 - righe[corrente[-1]].y0) > 3.0 * altezza_tipica:
            blocchi.append(corrente)
            corrente = []
        corrente.append(i)
    if corrente:
        blocchi.append(corrente)
    return blocchi


# Righe di soli segni sciolti: sul libro gli accenti stanno sopra il rigo e la
# scansione a volte li stacca in una riga propria. Tesseract li legge come
# caratteri isolati. Non sono testo: sono l'ombra del testo di sotto.
def riga_di_diacritici(riga: str) -> bool:
    pezzi = riga.split()
    if len(pezzi) < 3:
        return False
    isolati = sum(1 for p in pezzi if len(p) <= 1)
    return isolati / len(pezzi) >= 0.7


def ritaglia_e_ocr(pdf: str, pagina: Pagina, indici: list, dpi: int, lingua: str, cache: str) -> str:
    righe = [pagina.righe[i] for i in indici]
    margine = 4.0  # punti: le lettere greche sbordano dal riquadro dichiarato
    x0 = max(0.0, min(r.x0 for r in righe) - margine)
    y0 = max(0.0, min(r.y0 for r in righe) - margine)
    x1 = min(pagina.larghezza, max(r.x1 for r in righe) + margine)
    y1 = min(pagina.altezza, max(r.y1 for r in righe) + margine)

    scala = dpi / 72.0
    px, py = int(x0 * scala), int(y0 * scala)
    pw, ph = int((x1 - x0) * scala), int((y1 - y0) * scala)
    if pw < 10 or ph < 10:
        return ""

    chiave = hashlib.sha1(f"{pdf}|{pagina.numero}|{px},{py},{pw},{ph}|{dpi}|{lingua}".encode()).hexdigest()[:16]
    atteso = os.path.join(cache, f"{chiave}.txt")
    if os.path.exists(atteso):
        return open(atteso, encoding="utf-8").read()

    with tempfile.TemporaryDirectory() as tmp:
        prefisso = os.path.join(tmp, "crop")
        subprocess.run(
            ["pdftoppm", "-png", "-r", str(dpi), "-f", str(pagina.numero), "-l", str(pagina.numero),
             "-x", str(px), "-y", str(py), "-W", str(pw), "-H", str(ph), pdf, prefisso],
            check=True, capture_output=True,
        )
        immagini = sorted(f for f in os.listdir(tmp) if f.endswith(".png"))
        if not immagini:
            return ""
        uscita = os.path.join(tmp, "ocr")
        subprocess.run(
            ["tesseract", os.path.join(tmp, immagini[0]), uscita, "-l", lingua, "--psm", "6"],
            check=True, capture_output=True,
        )
        grezzo = open(uscita + ".txt", encoding="utf-8", errors="replace").read().strip("\n")
        testo = "\n".join(r for r in grezzo.split("\n") if not riga_di_diacritici(r))

    os.makedirs(cache, exist_ok=True)
    with open(atteso, "w", encoding="utf-8") as f:
        f.write(testo)
    return testo


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", required=True, help="la scansione della fonte a stampa")
    ap.add_argument("--pagine", default="", help="intervallo 1-based, es. 12-166 (default: tutte)")
    ap.add_argument("--out", default="", help="file di uscita (default: accanto al PDF, .ocr.txt)")
    ap.add_argument("--dpi", type=int, default=400)
    ap.add_argument("--lingua", default="grc", help="lingua Tesseract dei blocchi (default: grc)")
    ap.add_argument("--cache", default="", help="cartella della cache OCR (default: accanto all'uscita)")
    args = ap.parse_args()

    for strumento in ("pdftotext", "pdftoppm", "tesseract"):
        if not shutil.which(strumento):
            print(f"Manca «{strumento}»: servono poppler e tesseract.", file=sys.stderr)
            return 1
    lingue = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout
    if args.lingua not in lingue.split():
        print(f"Tesseract non ha la lingua «{args.lingua}». Installala in tessdata.", file=sys.stderr)
        return 1

    if args.pagine:
        m = re.match(r"^(\d+)(?:-(\d+))?$", args.pagine)
        if not m:
            print("--pagine vuole «12-166» o «12».", file=sys.stderr)
            return 1
        prima, ultima = int(m.group(1)), int(m.group(2) or m.group(1))
    else:
        info = subprocess.run(["pdfinfo", args.pdf], capture_output=True, text=True).stdout
        tot = re.search(r"Pages:\s+(\d+)", info)
        prima, ultima = 1, int(tot.group(1)) if tot else 1

    out = args.out or re.sub(r"\.pdf$", "", args.pdf, flags=re.I) + ".ocr.txt"
    cache = args.cache or os.path.join(os.path.dirname(os.path.abspath(out)) or ".", ".ocr-cache")

    print(f"Pagine {prima}-{ultima} · {args.dpi} dpi · lingua {args.lingua}")
    pagine = leggi_bbox(args.pdf, prima, ultima)
    print(f"Livello di testo letto: {len(pagine)} pagine.")

    fuori, blocchi_tot, righe_greche = [], 0, 0
    for n, pagina in enumerate(pagine, 1):
        blocchi = raggruppa(pagina.righe)
        ocr_per_indice = {}
        for b in blocchi:
            testo = ritaglia_e_ocr(args.pdf, pagina, b, args.dpi, args.lingua, cache)
            ocr_per_indice[b[0]] = testo
            for i in b[1:]:
                ocr_per_indice[i] = None      # righe assorbite dal blocco
            blocchi_tot += 1
            righe_greche += len(b)
        parti = []
        for i, r in enumerate(pagina.righe):
            if i in ocr_per_indice:
                if ocr_per_indice[i] is not None:
                    parti.append(ocr_per_indice[i])
            else:
                parti.append(r.testo)
        fuori.append("\n".join(parti))
        if n % 20 == 0 or n == len(pagine):
            print(f"  {n}/{len(pagine)} pagine · {blocchi_tot} blocchi greci")

    with open(out, "w", encoding="utf-8") as f:
        f.write("\f".join(fuori))

    print(f"\n{blocchi_tot} blocchi greci ({righe_greche} righe) → {out}")
    testo = "\f".join(fuori)
    greci = len(re.findall(r"[Ͱ-Ͽἀ-῿]", testo))
    print(f"Caratteri greci nel risultato: {greci}")
    if greci == 0:
        print("Nessun greco: o la classificazione non ha riconosciuto i blocchi, o la lingua è sbagliata.")
    print("\nOra la collazione ha qualcosa da confrontare:")
    print(f"  npm run collate -- --source <id> --txt {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
