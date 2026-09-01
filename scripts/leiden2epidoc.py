#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
leiden2epidoc — converte le convenzioni Leiden scritte come CARATTERI
dentro <div type="edition"> nei corrispondenti elementi EpiDoc/TEI.

Fase F1 del piano (docs/piano-markup-esecuzione.md):

    [αβγ]          -> <supplied reason="lost">αβγ</supplied>
    [....] [····]  -> <gap reason="lost" extent="unknown" unit="character"/>
    [2-3]          -> <gap reason="lost" unit="character" atLeast="2" atMost="3"/>
    [----]         -> <gap reason="lost" extent="unknown" unit="character"/>
    [illegible line] -> <gap reason="illegible" extent="unknown" unit="line"/>
    .... ···· nudi -> <gap reason="illegible" extent="unknown" unit="character"/>
    λ̣ά̣ (punto sottoscritto) -> <unclear>λά</unclear>

Criterio (decisione D1 + istruzione «nel dubbio, non si conosce»):
  - dentro parentesi = testo CADUTO  -> reason="lost"
  - fuori parentesi  = tracce ILLEGGIBILI in situ -> reason="illegible"
  - la QUANTITÀ non viene mai dedotta dal numero di puntini: sempre
    extent="unknown", tranne dove la trascrizione dà un intervallo esplicito
    (`2-3`). I conteggi originali sono salvati in docs/f1-lacune-quantita.csv
    perché un passaggio successivo possa promuoverli a @quantity sullo stampato.

Un gruppo `[ … ]` che attraversa il confine di un elemento (p. es.
`Μητρ[ός</name> 2-3]`) non può essere avvolto da un solo <supplied> senza
rompere l'XML: viene spezzato in più <supplied>, uno per contesto, come
prescritto dalle EpiDoc Guidelines. Questi casi sono elencati nel report.

Uso:
    python3 scripts/leiden2epidoc.py --dry-run
    python3 scripts/leiden2epidoc.py --only ILA-006 --dry-run
    python3 scripts/leiden2epidoc.py --apply
"""
import re, os, sys, glob, csv, argparse, unicodedata

CORPUS = 'src/data/corpus'
ED_OPEN = re.compile(r'<div type="edition"[^>]*>')
TAG = re.compile(r'<[^>]+>')
DOTS = '.·'
COMB_DOT = '̣'          # combining dot below (lettera incerta)

GAP_LOST = '<gap reason="lost" extent="unknown" unit="character"/>'
GAP_ILLEG = '<gap reason="illegible" extent="unknown" unit="character"/>'
GAP_ILLEG_LINE = '<gap reason="illegible" extent="unknown" unit="line"/>'
SUP_OPEN = '<supplied reason="lost">'
SUP_CLOSE = '</supplied>'


# ── individuazione del div edition (il regex non basta: <div> annidati) ──────
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


# ── albero delle parentesi ──────────────────────────────────────────────────
def atomize(inner):
    out = []
    for part in re.split(r'(<[^>]+>)', inner):
        if not part:
            continue
        if part.startswith('<'):
            out.append(('tag', part))
        else:
            out.extend(('chr', c) for c in part)
    return out


def parse_brackets(atoms, i=0, depth=0):
    """[ … ] annidate comprese (ILA-114). Ritorna (nodi, indice)."""
    nodes = []
    while i < len(atoms):
        kind, v = atoms[i]
        if kind == 'tag':
            nodes.append(('tag', v)); i += 1
        elif v == '[':
            sub, i = parse_brackets(atoms, i + 1, depth + 1)
            nodes.append(('br', sub))
        elif v == ']':
            if depth == 0:      # ] orfana: non dovrebbe accadere (0 su 295)
                nodes.append(('chr', v)); i += 1
                continue
            return nodes, i + 1
        else:
            nodes.append(('chr', v)); i += 1
    return nodes, i


# ── classificazione del testo dentro/fuori parentesi ────────────────────────
RANGE_RE = re.compile(r'(?<!\d)(\d+)\s*-\s*(\d+)(?!\d)')
DASH_RE = re.compile(r'-{2,}')
DOTRUN_RE = re.compile(r'[%s](?:\s*[%s])*' % (DOTS, DOTS))
ILLEG_LINE_RE = re.compile(r'illegible line', re.I)


def split_text(s, inside, quant_log, min_run=2):
    """Spezza una stringa in pezzi ('txt', s) / ('gap', xml).

    `inside` = siamo dentro un gruppo di parentesi (testo caduto) oppure no
    (tracce illeggibili). `min_run` = quanti puntini servono perché la
    sequenza valga come lacuna: 2, tranne quando il gruppo è fatto di un
    puntino solo (`[.]`, `[·]`). Sotto quella soglia il puntino è
    punteggiatura (εὐχήν.) o abbreviazione latina (Π.). `quant_log`
    raccoglie i conteggi originali."""
    pieces, pos = [], 0
    pattern = re.compile('|'.join([
        r'(?P<illeg>illegible line)',
        r'(?P<rng>(?<!\d)\d+\s*-\s*\d+(?!\d))',
        r'(?P<dash>-{2,})',
        r'(?P<dots>[%s](?:\s*[%s])*)' % (DOTS, DOTS),
    ]), re.I)
    for m in pattern.finditer(s):
        kind = m.lastgroup
        raw = m.group(0)
        if kind == 'dots':
            n = sum(1 for c in raw if c in DOTS)
            if n < min_run:
                continue
            quant_log.append((n, raw))
        if m.start() > pos:
            pieces.append(('txt', s[pos:m.start()]))
        if kind == 'illeg':
            pieces.append(('gap', GAP_ILLEG_LINE))
        elif kind == 'rng':
            a, b = re.findall(r'\d+', raw)
            pieces.append(('gap', '<gap reason="lost" unit="character" atLeast="%s" atMost="%s"/>' % (a, b)))
        else:
            pieces.append(('gap', GAP_LOST if inside else GAP_ILLEG))
        pos = m.end()
    if pos < len(s):
        pieces.append(('txt', s[pos:]))
    return pieces


# ── resa ────────────────────────────────────────────────────────────────────
def render(nodes, inside, stats, quant_log, crossing):
    """Ritorna la stringa XML dei nodi. `inside` = dentro un <supplied>."""
    pieces = []          # ('txt', s) | ('tag', raw) | ('xml', s) — già completo
    buf = []

    def flush():
        if buf:
            pieces.append(('txt', ''.join(buf)))
            buf.clear()

    for kind, v in nodes:
        if kind == 'chr':
            buf.append(v)
        elif kind == 'tag':
            flush(); pieces.append(('tag', v))
        else:                                    # gruppo [ … ] annidato
            flush()
            pieces.append(('xml', render_bracket(v, stats, quant_log, crossing)))
    flush()

    if not inside:
        out = []
        for k, v in pieces:
            if k == 'txt':
                for pk, pv in split_text(v, False, quant_log):
                    out.append(pv)
                    if pk == 'gap':
                        stats['gap_illegible'] += 1
            else:
                out.append(v)
        return ''.join(out)
    return pieces        # il chiamante (render_bracket) fa lo splitting


def render_bracket(nodes, stats, quant_log, crossing):
    pieces = render(nodes, True, stats, quant_log, crossing)
    # `[.]` / `[·]`: un puntino solo che è tutto il gruppo vale come lacuna
    plain = ''.join(v for k, v in pieces if k == 'txt').strip()
    min_run = 1 if len(plain) == 1 and plain in DOTS else 2

    # tag che aprono o chiudono FUORI dal gruppo: lì il <supplied> va spezzato
    stack, unmatched = [], set()
    for idx, (k, v) in enumerate(pieces):
        if k != 'tag' or v.endswith('/>'):
            continue
        if v.startswith('</'):
            if stack:
                stack.pop()
            else:
                unmatched.add(idx)
        else:
            stack.append(idx)
    unmatched.update(stack)
    if unmatched:
        crossing.append(''.join(v for _, v in pieces)[:90])

    out, open_ = [], False

    def op():
        nonlocal open_
        if not open_:
            out.append(SUP_OPEN); open_ = True

    def cl():
        nonlocal open_
        if open_:
            out.append(SUP_CLOSE); open_ = False

    for idx, (k, v) in enumerate(pieces):
        if k == 'tag' and idx in unmatched:
            cl(); out.append(v); continue
        if k == 'txt':
            for pk, pv in split_text(v, True, quant_log, min_run):
                if pk == 'gap':
                    cl(); out.append(pv); stats['gap_lost'] += 1
                else:
                    op(); out.append(pv)
        else:
            op(); out.append(v)
    cl()
    stats['supplied'] += ''.join(out).count(SUP_OPEN)
    return ''.join(out)


# ── puntini sottoscritti -> <unclear> ───────────────────────────────────────
def convert_unclear(inner, stats):
    def rep(m):
        stats['unclear'] += 1
        return '<unclear>%s</unclear>' % m.group(0).replace(COMB_DOT, '')
    # una o più lettere consecutive con punto sottoscritto -> un solo <unclear>
    return re.sub(r'(?:\w%s)+' % COMB_DOT, rep, inner)


# ── pulizia ─────────────────────────────────────────────────────────────────
def tidy(s):
    # <supplied> vuoto o di solo spazio: lo spazio esce, l'elemento sparisce
    s = re.sub(r'<supplied reason="lost">(\s*)</supplied>', r'\1', s)
    # spazi ai bordi interni: fuori dall'elemento, non dentro
    s = re.sub(r'<supplied reason="lost">(\s+)', r'\1<supplied reason="lost">', s)
    s = re.sub(r'(\s+)</supplied>', r'</supplied>\1', s)
    s = re.sub(r'<supplied reason="lost">(\s*)</supplied>', r'\1', s)
    return s


def convert_file(path, stats_all):
    src = open(path, encoding='utf-8').read()
    span = edition_span(src)
    if not span:
        return None, {}, [], []
    a, b = span
    inner = src[a:b]
    if '[' not in inner and COMB_DOT not in inner and not DOTRUN_RE.search(TAG.sub('', inner)):
        return None, {}, [], []
    stats = {'supplied': 0, 'gap_lost': 0, 'gap_illegible': 0, 'unclear': 0}
    quant_log, crossing = [], []
    work = convert_unclear(inner, stats)
    nodes, _ = parse_brackets(atomize(work))
    out = tidy(render(nodes, False, stats, quant_log, crossing))
    if out == inner:
        return None, stats, quant_log, crossing
    for k, v in stats.items():
        stats_all[k] = stats_all.get(k, 0) + v
    return src[:a] + out + src[b:], stats, quant_log, crossing


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

    stats_all, changed, rows, cross_report = {}, [], [], []
    for p in files:
        name = os.path.basename(p)[:-4]
        new, st, quant, cross = convert_file(p, stats_all)
        if new is None:
            continue
        changed.append(name)
        for n, raw in quant:
            rows.append((name, n, raw.replace('\n', ' ')))
        for c in cross:
            cross_report.append((name, re.sub(r'\s+', ' ', c)))
        if args.apply:
            open(p, 'w', encoding='utf-8').write(new)

    print('schede modificate: %d' % len(changed))
    for k in ('supplied', 'gap_lost', 'gap_illegible', 'unclear'):
        print('  %-16s %d' % (k, stats_all.get(k, 0)))
    print('gruppi che attraversano un tag (supplied spezzato): %d' % len(cross_report))
    if args.apply:
        with open('docs/f1-lacune-quantita.csv', 'w', encoding='utf-8', newline='') as fh:
            w = csv.writer(fh)
            w.writerow(['scheda', 'puntini_originali', 'sequenza'])
            w.writerows(rows)
        print('conteggi originali salvati in docs/f1-lacune-quantita.csv (%d righe)' % len(rows))
    else:
        print('\n-- gruppi spezzati --')
        for n, c in cross_report:
            print('%-9s %s' % (n, c))


if __name__ == '__main__':
    main()
