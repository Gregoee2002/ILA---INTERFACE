#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Controlli sul corpus ILA, oltre alla buona formazione XML.

    python3 scripts/lint-corpus.py                  # tutto il corpus
    python3 scripts/lint-corpus.py ILA-026 ILA-103  # solo alcune schede
    python3 scripts/lint-corpus.py --progress       # solo i contatori di avanzamento

Esce con codice 1 se c'è almeno un ERRORE. Gli avvisi di avanzamento
(residui Leiden non ancora convertiti in markup) non fanno fallire il comando:
servono a misurare le fasi F1-F3 del piano, non a bloccarle.
Vedi docs/piano-markup-esecuzione.md.
"""
import re, sys, glob, os, collections
import xml.etree.ElementTree as ET

CORPUS = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'corpus')
EDITION = re.compile(r'<div type="edition".*?\n\s*</div>', re.S)
TAGS = re.compile(r'<[^>]+>')

# Formulari che devono portare @ana="#formula-fissa" (tassonomia-funzioni-cultuali.md §3).
# Le varianti grafiche sono incluse di proposito: è così che ILA-139 era sfuggita.
# I pattern si cercano sul testo "compatto" (senza spazi, trattini di fine riga
# e parentesi), perché il formulario può essere spezzato fra due righe e diviso
# da un'integrazione: è così che ILA-139 «[χεχολω-] / [μένον]» era sfuggita.
FORMULE = {
    'κεχολωμ|χεχολωμ':          'κεχολωμένος',
    'ξορκίζ|ρκίζω|ρχίσζ':       'ἐξορκίζω / ὁρκίζω',
    'σκῆπτρ|σκήπτρ':            'σκῆπτρον',
    'ὗεκύε|ὕεκύε':              'ὗε κύε',
    'Χρηστοὶχαίρετε|χρηστὲχαῖρε': 'χρηστὲ χαῖρε',
}

def edition_of(src):
    m = EDITION.search(src)
    return m.group(0) if m else ''

def plain(xml_fragment):
    return TAGS.sub('', xml_fragment)

def check(name, src, errors, warnings, counters):
    ed = edition_of(src)
    if not ed:
        errors.append((name, 'manca <div type="edition">'))
        return
    txt = plain(ed)
    # parole spezzate a fine riga: ricompone, altrimenti i formulari a cavallo
    # di due righe sfuggono ai controlli (è così che ILA-139 era sfuggita)
    compatto = re.sub(r'[-\[\]\s]+', '', txt)

    # --- ERRORI -------------------------------------------------------
    if txt.count('[') != txt.count(']'):
        errors.append((name, 'parentesi quadre sbilanciate: [=%d ]=%d'
                             % (txt.count('['), txt.count(']'))))
    if txt.count('(') != txt.count(')'):
        errors.append((name, 'parentesi tonde sbilanciate: (=%d )=%d'
                             % (txt.count('('), txt.count(')'))))

    for pattern, etichetta in FORMULE.items():
        if re.search(pattern, compatto) and 'formula-fissa' not in ed:
            errors.append((name, 'formulario «%s» presente ma senza @ana="#formula-fissa"' % etichetta))

    # <origDate> attesa quando il testo porta un anno
    if re.search(r'[ἜἔΕ]τ(?:ους|ει)', txt):
        counters['schede datate'] += 1
        m = re.search(r'<origDate[^>]*>(.*?)</origDate>', src, re.S)
        if not (m and m.group(1).strip()):
            warnings.append((name, 'il testo porta ἔτους ma <origDate> è vuota'))

    # coerenza <num @value> con il numerale greco che avvolge
    for m in re.finditer(r'<num[^>]*value="(\d+)"[^>]*>(.*?)</num>', ed, re.S):
        atteso, greco = int(m.group(1)), plain(m.group(2))
        calcolato = valore_numerale(greco)
        if calcolato is not None and calcolato != atteso:
            errors.append((name, '<num value="%d"> ma «%s» vale %d' % (atteso, greco.strip(), calcolato)))

    # --- F1/F2 chiuse: il ritorno delle convenzioni-carattere è un ERRORE ---
    # Non è pedanteria: una modifica applicata solo in locale e poi
    # sovrascritta dal sync torna esattamente così, e senza questo controllo
    # non se ne accorge nessuno finché non lo si rilegge a mano.
    quadre = txt.count('[')
    tonde = len(re.findall(r'\([^)]{1,25}\)', txt))
    puntini = len(re.findall(r'\.{3,}|·\s*·', txt))
    if quadre:
        errors.append((name, 'F1 regredita: %d parentesi quadre nel testo dell\'edizione'
                             ' (vanno in <supplied>/<gap>)' % quadre))
    if tonde:
        errors.append((name, 'F2 regredita: %d parentesi tonde nel testo dell\'edizione'
                             ' (vanno in <expan>/<supplied reason="omitted">)' % tonde))
    if puntini:
        errors.append((name, 'F1 regredita: %d sequenze di puntini nel testo dell\'edizione'
                             ' (vanno in <gap>)' % puntini))
    counters['[ ] non convertite'] += quadre
    counters['( ) non convertite'] += tonde
    counters['lacune non uniformate'] += puntini
    for tag in ('supplied', 'gap', 'unclear', 'expan', 'num', 'date', 'placeName'):
        counters['<%s>' % tag] += ed.count('<' + tag)

VALORI = {'α':1,'β':2,'γ':3,'δ':4,'ε':5,'ϛ':6,'ς':6,'ζ':7,'η':8,'θ':9,
          'ι':10,'κ':20,'λ':30,'μ':40,'ν':50,'ξ':60,'ο':70,'π':80,'ϙ':90,'Ϙ':90,
          'ρ':100,'σ':200,'τ':300,'υ':400,'φ':500,'χ':600,'ψ':700,'ω':800,'ϡ':900}

def valore_numerale(s):
    """Somma di un numerale alfabetico greco. None se contiene lettere ignote."""
    s = s.strip().rstrip('΄').strip()
    if not s:
        return None
    tot = 0
    for ch in s:
        if ch in VALORI:
            tot += VALORI[ch]
        elif ch.isspace():
            continue
        else:
            return None
    return tot

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    solo_progress = '--progress' in sys.argv
    files = sorted(glob.glob(os.path.join(CORPUS, '*.xml')))
    if args:
        voluti = {a if a.endswith('.xml') else a + '.xml' for a in args}
        files = [f for f in files if os.path.basename(f) in voluti]

    errors, warnings = [], []
    counters = collections.Counter()

    for f in files:
        name = os.path.basename(f)[:-4]
        src = open(f, encoding='utf-8').read()
        try:
            ET.fromstring(src)
        except ET.ParseError as e:
            errors.append((name, 'XML non valido: %s' % e))
            continue
        check(name, src, errors, warnings, counters)

    print('Schede esaminate: %d\n' % len(files))

    if not solo_progress:
        if errors:
            print('ERRORI (%d)' % len(errors))
            for n, m in errors:
                print('  %-9s %s' % (n, m))
            print()
        if warnings:
            print('AVVISI (%d)' % len(warnings))
            for n, m in warnings:
                print('  %-9s %s' % (n, m))
            print()

    print('AVANZAMENTO')
    for k in ('[ ] non convertite', '( ) non convertite', 'lacune non uniformate',
              '<supplied>', '<gap>', '<unclear>', '<expan>', '<num>', '<date>', '<placeName>'):
        print('  %-24s %5d' % (k, counters[k]))

    if not errors:
        print('\nNessun errore.')
    return 1 if errors else 0

if __name__ == '__main__':
    sys.exit(main())
