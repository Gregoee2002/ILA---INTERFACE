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
import re, sys, glob, os, collections, unicodedata
import xml.etree.ElementTree as ET

# ILA_CORPUS permette di puntare alla repo dati (fonte di verità) invece che
# alla cache locale: è così che lo usano i controlli notturni.
CORPUS = os.environ.get('ILA_CORPUS') or os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'corpus')
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

    # anno dell'era nel testo contro <origDate> (segnalato dalla sessione tesi, 2026-09-25)
    controlla_era(name, src, txt, warnings, counters)

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
    # Impaginazione simulata con spazi: dentro <div type="edition"> gli spazi
    # multipli non sono markup e in HTML collassano, quindi l'allineamento che
    # si vede nell'editor sparisce nella scheda. Un testo su colonne va reso con
    # <div type="textpart" subtype="column">, un vacat sulla pietra con <space/>.
    spazi = len(re.findall(r'\S {3,}\S', txt))
    if spazi:
        errors.append((name, '%d punt%s di impaginazione a spazi nel testo dell\'edizione: se sono'
                               ' colonne servono <div type="textpart" subtype="column">,'
                               ' se è un vacat serve <space/>' % (spazi, 'o' if spazi == 1 else 'i')))
    counters['impaginazioni a spazi'] += spazi

    counters['[ ] non convertite'] += quadre
    counters['( ) non convertite'] += tonde
    counters['lacune non uniformate'] += puntini
    for tag in ('supplied', 'gap', 'unclear', 'expan', 'num', 'date', 'placeName'):
        counters['<%s>' % tag] += ed.count('<' + tag)

# Era sillana (Asia): l'anno 1 corre dall'autunno dell'85 a.C., quindi l'anno N
# cade a cavallo di (N-85)/(N-84) d.C. È la conversione che Lane stampa accanto
# ai testi (n. 70: ρπγ΄ = 183 → 98-9 A.D.). Le schede in un'era diversa si
# dichiarano qui: per quelle lo scarto non è cablato, si controllano a mano.
EPOCA_SILLANA = 85
ALTRE_ERE = {
    'ILA-071': 'era cibiratica',
    'ILA-079': 'era galatica',
}
ANNO_ERA = re.compile(r'[ἜἔΕ]τους\s+([α-ωϛϙϡ]{1,4})\s*[΄\'ʹ]')

def controlla_era(name, src, txt, warnings, counters):
    m = ANNO_ERA.search(txt)
    if not m:
        return
    anno = valore_numerale(m.group(1))
    if anno is None:
        return
    if name in ALTRE_ERE:
        counters['anni d\'era da controllare a mano'] += 1
        return
    counters['anni d\'era controllati'] += 1
    atteso = anno - EPOCA_SILLANA
    od = re.search(r'<origDate[^>]*notBefore(?:-custom)?="(-?\d+)"', src)
    if not od:
        return  # l'origDate vuota è già segnalata sopra
    if int(od.group(1)) != atteso:
        warnings.append((name, 'Ἔτους %s΄ = anno %d dell\'era sillana → %d/%d d.C., ma <origDate> comincia dal %s:'
                               ' verificare il numerale sull\'edizione a stampa prima della data'
                               % (m.group(1), anno, atteso, atteso + 1, od.group(1))))

# Copertura del markup (segnalazioni della sessione «Integrazione dati Antiochia
# di Pisidia», 2026-09-25): una forma marcata con @lemma in una scheda e presente
# senza marcatura in un'altra; un epiteto nell'edizione che manca dalle keywords.
# Sono avvisi: un falso positivo è possibile (un omografo, un nome proprio).
W_LEMMA = re.compile(r'<w\b[^>]*\blemma="([^"]+)"[^>]*>(.*?)</w>', re.S)

def compatta(s):
    # senza spazi né punteggiatura, accento grave reso acuto e in minuscolo:
    # εὐχὴν a metà frase e Εὐχήν a inizio riga sono la stessa forma
    t = re.sub(r'[-\[\]\s·.,:;΄\'’]+', '', plain(s))
    t = unicodedata.normalize('NFD', t).replace('\u0300', '\u0301')
    return unicodedata.normalize('NFC', t).lower()

def controlla_copertura(sorgenti, warnings, counters):
    forme = collections.defaultdict(set)   # lemma -> forme compatte attestate
    for name, src in sorgenti:
        for lemma, forma in W_LEMMA.findall(edition_of(src)):
            f = compatta(forma)
            if len(f) >= 5:   # sotto le 5 lettere gli omografi fanno solo rumore
                forme[lemma].add(f)
    for name, src in sorgenti:
        ed = edition_of(src)
        testo_compatto = compatta(ed)
        marcati = collections.Counter(l for l, _ in W_LEMMA.findall(ed))
        for lemma, fs in forme.items():
            # un'unica alternativa, le forme lunghe prima: due forme che si
            # sovrappongono (τεκμορεύσας / ἐτεκμορεύσας) non si contano due volte
            alt = '|'.join(re.escape(f) for f in sorted(fs, key=len, reverse=True))
            presenti = len(re.findall(alt, testo_compatto))
            if presenti > marcati[lemma]:
                counters['forme del lessico non marcate'] += 1
                warnings.append((name, 'la forma di «%s» compare %d volt%s ma è marcata %d: manca un <w lemma>?'
                                       % (lemma, presenti, 'a' if presenti == 1 else 'e', marcati[lemma])))
        # epiteti: ogni persName divino con epiteto deve avere l'epiteto fra le keywords
        kw = re.search(r'<keywords scheme="epiteti">(.*?)</keywords>', src, re.S)
        termini = {t.strip().lower() for t in re.findall(r'<term>(.*?)</term>', kw.group(1) if kw else '')}
        for m in re.finditer(r'<persName type="divine" key="([^"]+)"[^>]*>(.*?)</persName>', ed, re.S):
            if '<rs type="epithet"' not in m.group(2):
                continue
            parti = m.group(1).split()
            epiteto = ' '.join(parti[1:])
            if epiteto and epiteto.lower() not in termini and parti[-1].lower() not in termini:
                counters['epiteti fuori dalle keywords'] += 1
                warnings.append((name, 'epiteto «%s» nell\'edizione ma non nelle keywords «epiteti»' % epiteto))
                break

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
    sorgenti = []

    for f in files:
        name = os.path.basename(f)[:-4]
        src = open(f, encoding='utf-8').read()
        try:
            ET.fromstring(src)
        except ET.ParseError as e:
            errors.append((name, 'XML non valido: %s' % e))
            continue
        check(name, src, errors, warnings, counters)
        sorgenti.append((name, src))

    controlla_copertura(sorgenti, warnings, counters)
    warnings.sort()

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
    for k in ("anni d'era controllati", "anni d'era da controllare a mano",
              'forme del lessico non marcate', 'epiteti fuori dalle keywords'):
        if counters[k]:
            print('  %-32s %5d' % (k, counters[k]))
    for k in ('[ ] non convertite', '( ) non convertite', 'lacune non uniformate',
              '<supplied>', '<gap>', '<unclear>', '<expan>', '<num>', '<date>', '<placeName>'):
        print('  %-24s %5d' % (k, counters[k]))

    if not errors:
        print('\nNessun errore.')
    return 1 if errors else 0

if __name__ == '__main__':
    sys.exit(main())
