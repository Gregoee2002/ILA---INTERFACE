#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quanto è completo il corpus, campo per campo.

Non giudica la qualità di una scheda: conta solo se un campo è compilato
(«DA_COMPILARE», commenti segnaposto e tag vuoti contano come vuoti).
Serve ai controlli notturni per tenere un registro giornaliero
dell'avanzamento, e alla tesi per avere i numeri a una data.

Uso:
  python3 scripts/stato-corpus.py                  tabella leggibile
  python3 scripts/stato-corpus.py --json out.json  scrive anche i conteggi
  ILA_CORPUS=~/Documents/GitHub/ILA/corpus python3 scripts/stato-corpus.py
"""
import re, sys, glob, os, json

CORPUS = os.environ.get('ILA_CORPUS') or os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'corpus')
TAGS = re.compile(r'<[^>]+>')
COMMENTI = re.compile(r'<!--.*?-->', re.S)


def testo(frammento):
    """Testo visibile di un frammento XML, senza segnaposto."""
    if frammento is None:
        return ''
    t = TAGS.sub('', COMMENTI.sub('', frammento))
    t = t.replace('DA_COMPILARE', '')
    return t.strip()


def div(src, tipo, lang=None):
    attr = r'type="%s"' % tipo
    if lang:
        attr += r'[^>]*xml:lang="%s"' % lang
    m = re.search(r'<div [^>]*%s[^>]*?(?:/>|>(.*?)</div>)' % attr, src, re.S)
    return m.group(1) if m else None


def edrif(s):
    """Il contenuto di <bibl type="edition" subtype="reference">, o None."""
    m = re.search(r'<bibl\s+type="edition"\s+subtype="reference"\s*>(.*?)</bibl>', s, re.S)
    return m.group(1) if m else None


def cita_solo_phi(c):
    # Stessa regola di citaSoloPhi in src/lib/mancanze.ts.
    return bool(re.search(r'\bPHI\b|Packard', c, re.I)) and not re.search(
        r'CMRDM|Corpus Monumentorum|TAM|SEG|MAMA|IG\b|I\.\s?\w', c)


RUOLI = {'encoding': ('encoding', 'encoder'), 'revision': ('revision', 'editor'), 'review': ('review', 'reviewer')}


def ha_ruolo(s, ruolo):
    for resp in re.findall(r'<respStmt>(.*?)</respStmt>', s, re.S):
        r = re.search(r'<resp[^>]*>(.*?)</resp>', resp, re.S)
        n = re.search(r'<(?:persName|name)[^>]*>(.*?)</(?:persName|name)>', resp, re.S)
        if r and n and testo(r.group(1)).lower() in RUOLI[ruolo] and testo(n.group(1)):
            return True
    return False


# (chiave, etichetta, test). Le chiavi sono quelle di REQUISITI in
# src/lib/mancanze.ts, così il registro notturno e il pannello in app
# parlano degli stessi campi. L'ordine è quello della tabella.
CAMPI = [
    # scheda bibliografica: le richieste della professoressa del 2026-09-23
    ('edrif', 'edizione di riferimento', lambda s: bool(testo(re.sub(r'<editor>.*?</editor>', '', edrif(s) or '', flags=re.S)))),
    ('edrif_editore', 'editore dell\'ed. di rif.', lambda s: bool(re.search(r'<editor>\s*[^<\s]', edrif(s) or ''))),
    ('edrif_non_phi', 'ed. di rif. non solo PHI', lambda s: edrif(s) is not None and not cita_solo_phi(testo(edrif(s)))),
    ('codifica', 'codifica', lambda s: ha_ruolo(s, 'encoding')),
    ('revisione', 'revisione', lambda s: ha_ruolo(s, 'revision')),
    ('controllo', 'controllo scientifico', lambda s: ha_ruolo(s, 'review')),
    ('stato', 'stato di pubblicazione', lambda s: bool(re.search(r'<revisionDesc[^>]*\sstatus="[^"]+"', s))),

    ('edizione', 'edizione', lambda s: bool(testo(div(s, 'edition')))),
    ('trad_it', 'traduzione italiana', lambda s: bool(testo(div(s, 'translation', 'it')))),
    ('trad_en', 'traduzione inglese', lambda s: bool(testo(div(s, 'translation', 'en')))),
    ('commento', 'commento', lambda s: bool(testo(div(s, 'commentary')))),
    ('datazione', 'datazione', lambda s: bool(re.search(
        r'<origDate[^>]*(?:notBefore|notAfter|when)(?:-custom)?="[^"]+"|<origDate[^>]*>[^<\s]', s))),
    ('misure', 'misure', lambda s: bool(re.search(r'<(?:height|width)[^>]*>\s*[\d.,]+', s))),
    ('tm', 'numero TM', lambda s: bool(re.search(r'<idno type="TM"[^>]*>\s*\d', s))),
    ('luogo_ref', 'luogo antico con ref', lambda s: bool(re.search(
        r'<placeName type="ancient" ref="(?!DA_COMPILARE)[^"]+"', s))),
    ('bibliografia', 'bibliografia', lambda s: '<bibl' in (div(s, 'bibliography') or '')),
    ('cultuale', 'lessico cultuale (@ana)', lambda s: bool(re.search(r'\sana="#', div(s, 'edition') or ''))),
]


def main():
    files = sorted(glob.glob(os.path.join(os.path.expanduser(CORPUS), '*.xml')))
    tot = len(files)
    conteggi = {k: 0 for k, _, _ in CAMPI}
    for f in files:
        src = open(f, encoding='utf-8').read()
        for k, _, test in CAMPI:
            if test(src):
                conteggi[k] += 1

    print('Schede: %d\n' % tot)
    for k, etichetta, _ in CAMPI:
        n = conteggi[k]
        print('  %-28s %4d  %5.1f%%' % (etichetta, n, 100.0 * n / tot if tot else 0))

    if '--json' in sys.argv:
        out = sys.argv[sys.argv.index('--json') + 1]
        with open(out, 'w', encoding='utf-8') as fh:
            json.dump({'schede': tot, 'campi': conteggi,
                       'etichette': {k: e for k, e, _ in CAMPI}}, fh, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
