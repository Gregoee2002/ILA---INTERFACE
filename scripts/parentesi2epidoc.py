#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parentesi2epidoc — fase F2: le parentesi TONDE dentro <div type="edition">.

Le tonde della trascrizione dicono due cose diverse, e la differenza è
strutturale, non grafica:

  A. SCIOGLIMENTO di abbreviazione — la parentesi chiude la parola
     (`μη(νὸς) Δαισίου`, `leg(ionis) voto`): le lettere non erano sulla pietra
     perché il lapicida ha abbreviato.
        -> <expan><abbr>μη</abbr><ex>νὸς</ex></expan>
  B. LETTERE OMESSE dal lapicida e ripristinate dall'editore — dopo la
     parentesi la parola continua (`α(ὐ)τούς`, `Κλ(α)ύδιος`), oppure la tonda
     racchiude una parola intera saltata (`Παπᾶς (ὑπὲρ) τέκνων`).
        -> <supplied reason="omitted">ὐ</supplied>
  C. Abbreviazione NON sciolta (`P(?)`): l'editore dichiara di non saperla
     sciogliere. Non è un <expan> — un expan senza scioglimento è una
     affermazione falsa.
        -> <abbr>P</abbr>

Il criterio è meccanico e verificabile: guarda che cosa segue la parentesi
chiusa. Lettera = B, qualsiasi altra cosa = A; niente lettere prima
dell'aperta = B (parola intera).

Uso:  python3 scripts/parentesi2epidoc.py --dry-run [--only ILA-049]
      python3 scripts/parentesi2epidoc.py --apply
"""
import re, os, glob, argparse

CORPUS = 'src/data/corpus'
ED_OPEN = re.compile(r'<div type="edition"[^>]*>')
LETTER = re.compile(r'\w', re.U)

# Casi singoli che il criterio meccanico non copre, decisi a mano sul testo.
# chiave = (scheda, testo fra tonde) -> XML sostitutivo dell'intero `pre(…)`.
MANUALI = {
    # CMRDM I 213: Lane dichiara di non saper sciogliere l'abbreviazione.
    # Un <expan> senza <ex> sarebbe un'affermazione falsa: resta <abbr> nudo.
    ('ILA-201', '?'): '<abbr>P</abbr>',
    # CMRDM I 79 (Lane p. 52): non sono parole fra tonde ma DUE SEGNI incisi,
    # che Lane scioglie in calce al testo («Δᴬ = τετράμφορα», «⨯ = ἑκοντάχους»).
    # La trascrizione ILA aveva sostituito i segni con lo scioglimento.
    ('ILA-049', 'ἑκοντάχους'):
        '<expan><abbr><g type="hekontachous"/></abbr><ex>ἑκοντάχους</ex></expan>',
    ('ILA-049', 'τετράμφορα'):
        '<expan><abbr>Δ<hi rend="superscript">A</hi></abbr><ex>τετράμφορα</ex></expan>',
}

# Sostituzioni letterali applicate PRIMA del passaggio meccanico: casi in cui
# le tonde stanno dentro un altro elemento, o in cui il pezzo da sostituire è
# più largo di `pre(…)`.
SOSTITUZIONI = {
    # CMRDM I 44: lo scioglimento era finito dentro il <supplied>. Le lettere
    # di un'abbreviazione non sono "cadute": non sono mai state incise.
    'ILA-101': [('μη<supplied reason="lost">(νὸς)</supplied>',
                 '<expan><abbr>μη</abbr><ex>νὸς</ex></expan>')],
    # CMRDM I 68: μ[η(νὸς)] — la η è integrata, νὸς è lo scioglimento.
    'ILA-039': [('μ<supplied reason="lost">η(νὸς)</supplied>',
                 '<expan><abbr>μ<supplied reason="lost">η</supplied></abbr><ex>νὸς</ex></expan>')],
    # Lane (CMRDM II p. 171 e I nr. 289) gloss a FFLL = Flaviis: è lo
    # scioglimento dell'abbreviazione, non una nota editoriale.
    'ILA-291': [('FFLL (i.e., Flaviis)',
                 '<expan><abbr>FFLL</abbr><ex>Flaviis</ex></expan>')],
    # CMRDM I 192 (Lane p. 118): μετὰ, con l'accento grave; la parola non è
    # sulla pietra, l'editore la supplisce.
    'ILA-180': [('(μετά)', '<supplied reason="omitted">μετὰ</supplied>')],
}


def edition_span(src):
    m = ED_OPEN.search(src)
    if not m:
        return None
    i, depth = m.end(), 1
    while depth:
        nxt = re.compile(r'<(/?)div\b').search(src, i)
        if not nxt:
            return None
        depth += -1 if nxt.group(1) else 1
        i = nxt.end()
        if depth == 0:
            return m.end(), nxt.start()
    return None


def mask_tags(inner):
    """Copia di pari lunghezza in cui i tag sono \x01: le tonde dentro gli
    attributi (`key="Damas (1)"`) non sono testo dell'iscrizione."""
    out = list(inner)
    for m in re.finditer(r'<[^>]*>', inner):
        for k in range(m.start(), m.end()):
            out[k] = '\x01'
    return ''.join(out)


def abbr_start(inner, masked, a):
    """Inizio dell'abbreviazione che precede la tonda aperta in `a`.

    Non si ferma al primo tag: un'integrazione dentro la parola
    (`l<supplied>e</supplied>g(ionis)`, `Ci<supplied>l</supplied>vastion(o)`)
    fa parte dell'abbreviazione, e l'<expan> deve contenerla. Si attraversano
    solo coppie di tag bilanciate — quelle che l'<expan> può inglobare senza
    rompere l'annidamento."""
    j = a
    while j > 0:
        c = masked[j - 1]
        if LETTER.match(c):
            j -= 1
            continue
        if c != '\x01':
            break
        k = j - 1
        while k > 0 and masked[k - 1] == '\x01':
            k -= 1
        tag = inner[k:j]
        if not tag.startswith('</'):
            break                       # apertura o self-closing: si esce
        nome = tag[2:-1].split()[0]
        aperture = list(re.finditer(r'<%s\b[^>]*>' % re.escape(nome), inner[:k]))
        if not aperture:
            break
        j = aperture[-1].start()
    return j


def classify(inner, name):
    """Ritorna la lista dei casi trovati: (start, end, tipo, pre, dentro, xml, nota)."""
    out = []
    masked = mask_tags(inner)
    for m in re.finditer(r'\(([^()\x01]*)\)', masked):
        dentro = m.group(1)
        a, b = m.start(), m.end()
        j = abbr_start(inner, masked, a)
        pre = inner[j:a]
        dopo = inner[b:b + 1]
        nota = ''
        chiave = (name, dentro)
        if chiave in MANUALI:
            tipo, xml = 'MANUALE', MANUALI[chiave]
            j = a - len(pre)
        elif LETTER.match(dopo or ' '):
            tipo = 'B-omesse'
            xml = '<supplied reason="omitted">%s</supplied>' % dentro
            j = a                       # `pre` resta testo normale
        elif not pre:
            tipo = 'C-parola-omessa'
            xml = '<supplied reason="omitted">%s</supplied>' % dentro
            j = a
        else:
            tipo = 'A-expan'
            xml = '<expan><abbr>%s</abbr><ex>%s</ex></expan>' % (pre, dentro)
            # l'abbreviazione prosegue oltre un tag (μ<supplied>η(νὸς)): un
            # solo <expan> non può attraversarlo, va rivisto a mano
            if j > 0 and masked[j - 1] == '\x01':
                k = j - 1
                while k > 0 and masked[k - 1] == '\x01':
                    k -= 1
                if k > 0 and LETTER.match(masked[k - 1]):
                    nota = 'abbreviazione spezzata da un tag: <expan> non può attraversarlo'
        out.append((j, b, tipo, pre, dentro, xml, nota))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only', default=None)
    args = ap.parse_args()
    if not (args.apply or args.dry_run):
        ap.error('specificare --dry-run oppure --apply')

    files = sorted(glob.glob(os.path.join(CORPUS, '*.xml')))
    if args.only:
        files = [f for f in files if args.only in f]

    tot = {'A-expan': 0, 'B-omesse': 0, 'C-parola-omessa': 0, 'MANUALE': 0}
    note, nfile = [], 0
    for p in files:
        src = open(p, encoding='utf-8').read()
        span = edition_span(src)
        if not span:
            continue
        a, b = span
        inner = src[a:b]
        name = os.path.basename(p)[:-4]
        for vecchio, nuovo in SOSTITUZIONI.get(name, []):
            if vecchio not in inner:
                print('ATTENZIONE %s: sostituzione non trovata: %r' % (name, vecchio))
            inner = inner.replace(vecchio, nuovo)
        casi = classify(inner, name)
        if not casi and inner == src[a:b]:
            continue
        nfile += 1
        for j, end, tipo, pre, dentro, xml, nt in casi:
            tot[tipo] += 1
            if nt:
                note.append((name, pre + '(' + dentro + ')', nt))
            if args.dry_run:
                ctx = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', inner[max(0, j - 28):end + 22]))
                print('%-9s %-16s %-22s ...%s...' % (name, tipo, pre + '(' + dentro + ')', ctx))
        if args.apply:
            for j, end, tipo, pre, dentro, xml, nt in reversed(casi):
                inner = inner[:j] + xml + inner[end:]
            open(p, 'w', encoding='utf-8').write(src[:a] + inner + src[b:])

    print('\nschede: %d' % nfile)
    for k, v in tot.items():
        print('  %-18s %d' % (k, v))
    if note:
        print('\nda verificare a mano (%d):' % len(note))
        for n, f, t in note:
            print('  %-9s %-20s %s' % (n, f, t))


if __name__ == '__main__':
    main()
