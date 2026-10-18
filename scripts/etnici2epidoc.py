#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
etnici2epidoc — fase F4: etnici e toponimi dentro <div type="edition".

Decisione D2 (2026-10-18): l'etnico di comunità è `<placeName type="ethnic">`,
come nell'esempio delle EpiDoc Guidelines 9.8 (cap. «Place names») e come già
in ILA-107/108. Niente `nymRef` né `ref`: la forma standard e l'URI Pleiades
si aggiungono solo dove sono verificati (vedi il lavoro sui luoghi).

Volume piccolo e forme spezzate dagli a-capo: niente criterio meccanico, ogni
caso è una regola esplicita (scheda, regex, sostituzione) che deve trovare
UNA e una sola corrispondenza dentro l'edizione, altrimenti lo script si
ferma. L'<lb/> in mezzo alla parola resta dentro il placeName (TEI lo ammette).

Casi NON trattati, da decidere sul testo di Lane:
  - ILA-272 «Μακεδών»: già `<name>` dentro persName (cognomen), non etnico.
  - ILA-263 «[Μακ]εδών»: nome isolato in fondo al testo, funzione incerta.

Uso:  python3 scripts/etnici2epidoc.py --dry-run [--only ILA-056]
      python3 scripts/etnici2epidoc.py --apply
"""
import re, os, argparse

CORPUS = 'src/data/corpus'
ED_OPEN = re.compile(r'<div type="edition"[^>]*>')
OPEN = '<placeName type="ethnic">'
CLOSE = '</placeName>'

# scheda -> [(regex con UN gruppo = la porzione da avvolgere)]
REGOLE = {
    'ILA-056': [r'Ἡ (Ἀλιανῶν)'],
    'ILA-033': [r'ἡ (Ταζηνῶν)'],
    'ILA-076': [r'μος (Σελμηνῶν)'],
    'ILA-073': [r'δήμου (Ἀππολη-\s*<lb n="2"/>νῶν)'],
    'ILA-066': [r'(Ἀεζηνο-\s*<lb n="2"/>ί)'],
    'ILA-061': [r'(Οὐεζαεῖται)'],
    'ILA-058': [r'κώμης (Κερυζέων)'],
    'ILA-065': [r'(Κωμηνοὶ)'],
    'ILA-115': [r'(Μα-\s*<lb n="3"/>κροπεδειτῶν)'],
    # nel testo «νοπο λείτη» ha uno spazio: da riscontrare su Lane, non toccato
    'ILA-141': [r'(Ἀδρια-\s*<lb n="3"/>νοπο λείτη-\s*<lb n="4"/>ς)'],
    'ILA-064': [r'(Κολιανοκωμή\s*<lb n="5" rend="indent"/>τη)'],
    # CMRDM I 17 (Lane p. 12): «Ἀντιοχῇ», e Lane glossa che Hephaistion era
    # nativo di Antiochia di Pisidia. Le lettere restano com'erano (Ἀντιοχεῖ):
    # la grafia da riscontrare, la funzione di etnico è certa.
    'ILA-286': [r'(Ἀντιοχεῖ) θαλίνῳ'],
}

# Letture corrette prima della marcatura, da Lane (pagina renderizzata).
# CMRDM I 69 (Lane p. 46, PDF 58): «Μέγας Μεὶς Ἀξιοττηνὸς Τάρσι βασιλεύων».
# Il corpus aveva Ταρεῖ. Le altre divergenze di ILA-102 non si toccano qui
# (spetta alla collazione).
SOSTITUZIONI = {
    'ILA-102': [('Ταρεῖ', 'Τάρσι')],
}

# Toponimi nel testo (`<placeName>` senza type, come l'altro uso del corpus).
# Solo dove il nome sta nel testo: «κώμην βασιλεύων» o «κατοικίας» senza nome
# accanto non hanno nulla da marcare; Ἀξιοττα (ILA-054) è già dentro
# <rs type="epithet">; Ταρεῖ (ILA-102) è Τάρσι in Lane, corretto con SOSTITUZIONI.
# Niente @ref: nessun URI Pleiades verificato per Askaia.
TOPONIMI = {
    'ILA-150': [r'(Ἀσκαίης) ναέτην'],
    'ILA-151': [r'(Ἀσκαίης) τῷ μεδέοντι'],
    'ILA-102': [r'(Τάρσι) <w '],
}

# Schede già lavorate (segno di riconoscimento), per rendere lo script rilanciabile.
GIA_FATTE = {'ILA-150': '<placeName>Ἀσκαίης', 'ILA-151': '<placeName>Ἀσκαίης',
             'ILA-102': '<placeName>Τάρσι'}


def edition_span(src):
    m = ED_OPEN.search(src)
    if not m:
        return None
    i, depth = m.end(), 1
    tag = re.compile(r'<(/?)div\b')
    while depth:
        nxt = tag.search(src, i)
        if not nxt:
            return None
        depth += -1 if nxt.group(1) else 1
        i = nxt.end()
        if depth == 0:
            return m.end(), nxt.start()
    return None


def lavora(name, src):
    span = edition_span(src)
    if not span:
        raise SystemExit(f'{name}: edizione non trovata')
    a, b = span
    inner = src[a:b]
    for vecchio, nuovo in SOSTITUZIONI.get(name, []):
        if inner.count(vecchio) != 1:
            raise SystemExit(f'{name}: «{vecchio}» trovata {inner.count(vecchio)} volte (deve essere 1)')
        inner = inner.replace(vecchio, nuovo)
    for rx, apre in [(r, OPEN) for r in REGOLE.get(name, [])] + [(r, '<placeName>') for r in TOPONIMI.get(name, [])]:
        trovate = list(re.finditer(rx, inner))
        if len(trovate) != 1:
            raise SystemExit(f'{name}: «{rx}» trovata {len(trovate)} volte (deve essere 1)')
        m = trovate[0]
        s, e = m.span(1)
        inner = inner[:s] + apre + inner[s:e] + CLOSE + inner[e:]
    return src[:a] + inner + src[b:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--only')
    args = ap.parse_args()
    if args.dry_run == args.apply:
        raise SystemExit('indica --dry-run oppure --apply')
    for name in sorted(set(REGOLE) | set(TOPONIMI)):
        if args.only and name != args.only:
            continue
        path = os.path.join(CORPUS, name + '.xml')
        src = open(path, encoding='utf-8').read()
        if GIA_FATTE.get(name, '\0') in src or ('type="ethnic"' in src and name in REGOLE):
            print(f'{name}: già marcata, salto')
            continue
        new = lavora(name, src)
        for m in re.finditer(r'<placeName(?: type="ethnic")?>' + r'(.*?)' + re.escape(CLOSE), new, re.S):
            print(f'{name}: {re.sub(r"\s+", " ", m.group(1))}')
        if args.apply:
            open(path, 'w', encoding='utf-8').write(new)


if __name__ == '__main__':
    main()
