#!/usr/bin/env python3
"""
Segmenta l'output `pdftotext -layout` del CMRDM II (Lane 1975, "The Coins and
Gems") in un file per entry.

Uso:
    pdftotext -layout "CMDM V2.pdf" /tmp/cmrdm2.txt
    python3 segment_cmrdm2.py /tmp/cmrdm2.txt /tmp/entries2/ [--kind coins|gems]

Struttura di un'entry di Lane (monete):

    <Zecca> <numero>                                        Plate <N>
    Obv.: <descrizione del tipo>
    Inscription: <legenda>            (oppure "No inscription")
    Rev.: <descrizione del tipo>
    Inscription: <legenda>
          Bibliography:
          <voce>
          <voce>
    Weight: 8.53 gr. (Vienna)         (oppure un intervallo, oppure "unavailable")
    Illustrated example: Vienna
    Remarks: <commento di Lane>

Le gemme (sezione GEMS, da p. 164) hanno una faccia sola:

    G<numero>                                               Plate <N>
    Representation: <descrizione>
    Location: <collezione>
          Bibliography: …
    Dimensions: 18 X 14 mm

Il testo estratto è OCR: i numeri arabi di Lane escono spesso come lettere
(1→I, 5→S, 0→O, 11→"I I"), e l'iniziale maiuscola può staccarsi ("] uliopolis").
`normalizza_label` rimette a posto i casi ricorrenti; quelli che restano vanno
corretti a mano — lo script li segnala, non li indovina.
"""
import re
import sys
import unicodedata
from pathlib import Path

# Testata: etichetta a inizio riga (colonna 0), molti spazi, riferimento alla
# tavola. L'OCR sfigura "Plate": accettiamo anche PI./Pl./PWeU e simili.
HDR = re.compile(
    r'^(?![ \t])(?P<label>\S.*?)\s{2,}'
    r'(?P<plate>(?:Plates?|P[IlL][.,]?|P\S{1,3})\s*[IVXLC]{1,6}[a-z]?)\s*$'
)
# Righe di testatina/piede di pagina da scartare.
RUNNING = re.compile(r'^\s*(?:\d+\s+)?(?:COINS|GEMS|ADDENDA|CORRIGENDA)(?:\s+\d+)?\s*$')

CAMPI = ('Obv.', 'Rev.', 'Inscription:', 'Bibliography:', 'Weight:',
         'Illustrated example:', 'Remarks:', 'Representation:', 'Location:',
         'Dimensions:', 'Diameter:')

# Sostituzioni OCR ricorrenti nella parte numerica dell'etichetta.
OCR_CIFRE = {'I': '1', 'l': '1', 'O': '0', 'o': '0', 'S': '5', 'Z': '2', 'B': '8'}
# Il contrario, per l'iniziale del nome di zecca che l'OCR stacca e sfigura
# ("5 eleuceia" = Seleuceia, "] uliopolis" = Juliopolis, "A pollonia").
OCR_LETTERE = {'5': 'S', '1': 'I', '0': 'O', ']': 'J', '}': 'J', '|': 'I'}


def normalizza_label(label: str) -> tuple[str, str, bool]:
    """→ (zecca, numero, sospetta). `sospetta` = da verificare a mano."""
    label = unicodedata.normalize('NFKC', label)
    # "] uliopolis 3" → "Juliopolis 3": l'OCR rende la J iniziale come "] ".
    label = re.sub(r'^\]\s*', 'J', label)
    label = re.sub(r'\s{2,}', ' ', label).strip()
    # Iniziale staccata dal resto del nome: "A pollonia" → "Apollonia",
    # "5 eleuceia" → "Seleuceia". Si applica solo se il seguito è minuscolo,
    # per non fondere zecche dal nome composto di più parole.
    m_ini = re.match(r'^(?P<i>[A-Za-z0-9\]}|])\s(?P<resto>[a-z]\S*)(?P<coda>.*)$', label)
    if m_ini:
        iniziale = OCR_LETTERE.get(m_ini.group('i'), m_ini.group('i')).upper()
        label = iniziale + m_ini.group('resto') + m_ini.group('coda')

    # Gemme: G seguito da un numero (eventualmente OCR-sfigurato).
    m = re.match(r'^G\s*([0-9IlOoSZB]+)$', label)
    if m:
        cifre = ''.join(OCR_CIFRE.get(c, c) for c in m.group(1))
        return 'G', cifre, not m.group(1).isdigit()

    # Monete: <zecca> <numero>. Il numero può essere spezzato ("I I" = 11).
    m = re.match(r'^(?P<zecca>.+?)\s+(?P<num>[0-9IlOoSZB](?:\s?[0-9IlOoSZB])*)$', label)
    if not m:
        return label, '', True
    grezzo = m.group('num').replace(' ', '')
    cifre = ''.join(OCR_CIFRE.get(c, c) for c in grezzo)
    return m.group('zecca').strip(), cifre, not grezzo.isdigit()


def slug(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-').upper()


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    kind = sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else 'all'
    out.mkdir(parents=True, exist_ok=True)

    righe = src.read_text(encoding='utf-8', errors='replace').splitlines()
    testate = [(i, *normalizza_label(m.group('label')), m.group('plate'))
               for i, l in enumerate(righe) if (m := HDR.match(l))]

    scritte, sospette, saltate = 0, [], 0
    for pos, (i, zecca, numero, dubbia, plate) in enumerate(testate):
        fine = testate[pos + 1][0] if pos + 1 < len(testate) else len(righe)
        corpo = [l for l in righe[i + 1:fine] if not RUNNING.match(l)]
        # Una testata senza nessun campo di Lane sotto è un falso positivo
        # (riga di indice, rimando a tavola sciolto): si scarta.
        # Falsi positivi (righe di indice, rimandi sciolti, testatine come
        # "PREFACE"): una testata vera ha un numero e almeno un campo di Lane.
        if not numero or not any(c in l for l in corpo for c in CAMPI):
            saltate += 1
            continue
        gemma = zecca == 'G'
        if kind == 'coins' and gemma:
            continue
        if kind == 'gems' and not gemma:
            continue
        nome = (f'CMRDM-II-G{numero or "XX"}' if gemma
                else f'CMRDM-II-{slug(zecca)}-{numero or "XX"}')
        intestazione = [f'# zecca: {zecca}', f'# numero: {numero}',
                        f'# tavola: {plate}', f'# riga-pdf: {i + 1}']
        if dubbia:
            intestazione.append('# ATTENZIONE: numerazione OCR incerta, verificare sul PDF')
            sospette.append(nome)
        (out / f'{nome}.txt').write_text(
            '\n'.join(intestazione + [''] + corpo).rstrip() + '\n', encoding='utf-8')
        scritte += 1

    print(f'{scritte} entry in {out}  ({saltate} testate scartate come falsi positivi)')

    # Controllo di copertura: ogni moneta ha esattamente un "Obv.", ogni gemma
    # una "Representation:". Se i conti non tornano, alcune testate sono
    # sfuggite al regex perché l'OCR ha sfigurato il rimando alla tavola:
    # NON procedere alla codifica finché il divario non è chiarito.
    attese_monete = sum(1 for l in righe if l.lstrip().startswith('Obv.'))
    attese_gemme = sum(1 for l in righe if l.lstrip().startswith('Representation:'))
    if kind in ('all', 'coins') and kind != 'gems':
        print(f'  monete attese (righe "Obv."): {attese_monete}')
    if kind in ('all', 'gems') and kind != 'coins':
        print(f'  gemme attese (righe "Representation:"): {attese_gemme}')
    atteso = (attese_monete if kind == 'coins' else
              attese_gemme if kind == 'gems' else attese_monete + attese_gemme)
    if scritte != atteso:
        print(f'  ATTENZIONE: {atteso - scritte} entry non segmentate. '
              f'Cercarle con: grep -n "Obv\\.\\|Representation:" {src} '
              f'e confrontare con le testate trovate.')
    if sospette:
        print(f'{len(sospette)} da verificare a mano: {", ".join(sospette[:12])}'
              + (' …' if len(sospette) > 12 else ''))


if __name__ == '__main__':
    main()
