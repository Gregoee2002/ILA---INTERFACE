#!/usr/bin/env python3
"""assegna-phi-tm.py — trova i numeri PHI e TM delle schede a partire dal testo.

Il corpus ha schede senza <idno type="PHI"> o <idno type="TM">. Tre passi:

  1. rimando: scheda con TM e senza PHI (o viceversa) → API TexRelations di
     Trismegistos, che collega i due numeri;
  2. testo: scheda senza PHI → confronto dell'edizione, ridotta alle sole
     lettere greche, con i testi di I.PHI (88.202 testi PHI puliti);
  3. conferma: dal PHI trovato si ricava il TM con la stessa API.

Livelli di fiducia nel CSV di uscita:
  sicuro    rimando dell'API, oppure testo quasi identico senza concorrenti
            (soglie sotto, tarate con --taratura sulle schede già numerate);
  probabile testo molto simile, ma breve o con un secondo candidato vicino;
  dubbio    somiglianza solo parziale: spesso formulario, non la stessa pietra.
Con --applica entrano nell'XML soltanto i «sicuro».

Limite: I.PHI è un sottoinsieme di PHI (ne restano fuori circa quattro testi
su dieci delle nostre schede già numerate, soprattutto i brevi). «Nessun
candidato» non significa quindi che PHI non abbia il testo. Anche il sito PHI
e le pagine di Trismegistos rifiutano i client automatici: lo script usa solo
il dataset e l'API ufficiale, e non tenta di aggirare il blocco.

Preparazione, una volta sola (scarica circa 30 MB fuori dalla repo; serve
pyarrow, basta un ambiente temporaneo):
    python3 scripts/assegna-phi-tm.py --prepara
Uso:
    python3 scripts/assegna-phi-tm.py --taratura     # misura sulle già numerate
    python3 scripts/assegna-phi-tm.py [--out f.csv]  # sola lettura
    python3 scripts/assegna-phi-tm.py --applica      # scrive i «sicuro» in XML
Variabili: ILA_DATA_REPO (default ~/Documents/GitHub/ILA)
           ILA_IPHI (default ~/Library/Caches/ila/iphi.jsonl)
"""
import argparse
import array
import csv
import difflib
import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_REPO = Path(os.environ.get('ILA_DATA_REPO', Path.home() / 'Documents/GitHub/ILA'))
CORPUS = DATA_REPO / 'corpus'
IPHI = Path(os.environ.get('ILA_IPHI', Path.home() / 'Library/Caches/ila/iphi.jsonl'))
CONCORDANZA = ROOT / 'concordanza_TM.csv'
OUT = ROOT / 'docs/assegnazione-phi-tm.csv'
HF = 'https://huggingface.co/datasets/GBaker/I.PHI/resolve/main/data/{}-00000-of-00001.parquet'
TM_API = 'https://www.trismegistos.org/dataservices/texrelations/xml/{}'
UA = 'ILA-assegna-phi-tm/1.0 (+https://github.com/Gregoee2002/ILA)'
PAUSA = 0.5  # secondi fra due richieste a Trismegistos

# Soglie: vedi --taratura. Un testo breve è formulare, quindi chiede di più.
GRAMMA = 5
MIN_LETTERE = 40       # sotto, mai «sicuro» per solo testo
RATIO_SICURO = 0.90
MARGINE_SICURO = 0.15  # distacco dal secondo candidato
RATIO_LUNGO = 0.85      # edizioni diverse dello stesso testo lungo
MIN_LETTERE_LUNGO = 60
MARGINE_LUNGO = 0.30
RATIO_PROBABILE = 0.75
MIN_LETTERE_PROB = 20
FREQ_MAX = 8000        # grammi più comuni di così non discriminano
MAX_CANDIDATI = 200


def normalizza(t):
    """Solo lettere greche, senza accenti né maiuscole: ῳ e ωι coincidono."""
    t = unicodedata.normalize('NFD', t.lower())
    t = ''.join(c for c in t if 'GREEK' in unicodedata.name(c, '') and not unicodedata.combining(c))
    t = t.replace('ς', 'σ').replace('ϲ', 'σ')
    return t.replace('ωι', 'ω').replace('ηι', 'η')


def grammi(x):
    return {x[i:i + GRAMMA] for i in range(len(x) - GRAMMA + 1)}


def edizione(xml):
    """Testo del <div type="edition">, anche con <div type="textpart"> dentro."""
    xml = re.sub(r'(?s)<!--.*?-->', '', xml)
    m = re.search(r'<div\b[^>]*type="edition"[^>]*>', xml)
    if not m:
        return ''
    livello, pos = 1, m.end()
    for tag in re.finditer(r'<(/?)div\b[^>]*?(/?)>', xml[pos:]):
        if tag.group(2):
            continue
        livello += -1 if tag.group(1) else 1
        if livello == 0:
            testo = xml[pos:pos + tag.start()]
            break
    else:
        testo = xml[pos:]
    testo = re.sub(r'(?s)<note\b.*?</note>', '', testo)
    return html.unescape(re.sub(r'<[^>]+>', '', testo))


def carica_schede():
    schede = {}
    for f in sorted(CORPUS.glob('ILA-*.xml')):
        xml = f.read_text(encoding='utf8')
        tm = [x.strip() for x in re.findall(r'<idno type="TM"[^>]*>([^<]*)', xml) if re.fullmatch(r'\s*\d+\s*', x)]
        phi = [re.sub(r'\D', '', x) for x in re.findall(r'<idno type="PHI"[^>]*>([^<]*)', xml) if re.search(r'\d', x)]
        schede[f.stem] = {'file': f, 'testo': normalizza(edizione(xml)), 'tm': tm, 'phi': phi}
    return schede


def carica_iphi():
    if not IPHI.exists():
        sys.exit(f'Manca {IPHI}: esegui prima  python3 scripts/assegna-phi-tm.py --prepara')
    righe = [json.loads(r) for r in IPHI.open(encoding='utf8')]
    return righe, [normalizza(r['text']) for r in righe]


def prepara():
    """Scarica I.PHI (parquet) e lo riduce a JSONL, in cache fuori dalla repo."""
    try:
        import pyarrow.parquet as pq
    except ImportError:
        sys.exit('Serve pyarrow. Per esempio:\n'
                 '  python3 -m venv /tmp/ila-venv && /tmp/ila-venv/bin/pip install pyarrow\n'
                 '  /tmp/ila-venv/bin/python scripts/assegna-phi-tm.py --prepara')
    IPHI.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with IPHI.open('w', encoding='utf8') as w:
        for parte in ('train', 'test', 'validation'):
            tmp = IPHI.with_name(f'{parte}.parquet')
            print('scarico', parte)
            urllib.request.urlretrieve(HF.format(parte), tmp)
            for r in pq.read_table(tmp, columns=['id', 'text', 'metadata', 'region_main', 'region_sub']).to_pylist():
                w.write(json.dumps(r, ensure_ascii=False) + '\n')
                n += 1
            tmp.unlink()
    print(f'{n} testi in {IPHI}')


class Indice:
    def __init__(self, testi, schede):
        self.testi = testi
        q = set()
        for s in schede:
            q |= grammi(s['testo'])
        self.post = defaultdict(lambda: array.array('I'))
        for i, t in enumerate(testi):
            for g in grammi(t) & q:
                self.post[g].append(i)

    def candidati(self, testo, quanti=12):
        """I testi con più grammi in comune, ordinati per somiglianza effettiva."""
        conta = Counter()
        for g in grammi(testo):
            p = self.post.get(g)
            if p is not None and len(p) < FREQ_MAX:
                conta.update(p)
        out = []
        # A parità di grammi l'ordine sarebbe casuale: entrano tutti i pari merito
        # dell'ultimo posto, fino a un tetto, così l'esito non cambia fra due giri.
        ordinati = sorted(conta.items(), key=lambda x: (-x[1], x[0]))
        soglia = ordinati[min(quanti, len(ordinati)) - 1][1] if ordinati else 0
        for i, _ in [x for x in ordinati if x[1] >= soglia][:MAX_CANDIDATI]:
            ratio = difflib.SequenceMatcher(None, testo, self.testi[i], autojunk=False).ratio()
            out.append((round(ratio, 3), i))
        return sorted(out, key=lambda x: (-x[0], x[1]))


def livello(lettere, primo, secondo):
    margine = primo - secondo
    if primo >= RATIO_SICURO and lettere >= MIN_LETTERE and margine >= MARGINE_SICURO:
        return 'sicuro'
    if primo >= RATIO_LUNGO and lettere >= MIN_LETTERE_LUNGO and margine >= MARGINE_LUNGO:
        return 'sicuro'  # testo lungo, lontano da ogni altro: varianti di lettura
    if primo >= RATIO_PROBABILE and lettere >= MIN_LETTERE_PROB:
        return 'probabile'
    return 'dubbio'


def tm_api(numero, sorgente=None):
    """Interroga TexRelations. Ritorna (tm trovati, PHI collegati)."""
    url = TM_API.format(numero) + (f'?source={sorgente}' if sorgente else '')
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for tentativo in range(3):
        try:
            x = urllib.request.urlopen(req, timeout=30).read().decode('utf8')
            break
        except OSError:
            if tentativo == 2:
                raise
            time.sleep(5)
    time.sleep(PAUSA)
    return re.findall(r"<tmid id\s*=\s*'(\d+)'", x), re.findall(r"<link cp='PHI'>([^<]+)", x)


def taratura(schede, righe, testi):
    """Quanto sbaglierebbero le soglie sulle schede di cui conosciamo il PHI."""
    ids = {r['id']: i for i, r in enumerate(righe)}
    note = {k: s for k, s in schede.items() if any(int(p) in ids for p in s['phi'])}
    tutte_phi = sum(1 for s in schede.values() if s['phi'])
    indice = Indice(testi, note.values())
    esito = Counter()
    errori = []
    for k, s in note.items():
        giusti = {ids[int(p)] for p in s['phi'] if int(p) in ids}
        c = indice.candidati(s['testo'])
        if not c:
            esito['nessun candidato'] += 1
            continue
        lv = livello(len(s['testo']), c[0][0], c[1][0] if len(c) > 1 else 0)
        ok = c[0][1] in giusti
        esito[(lv, 'giusto' if ok else 'SBAGLIATO')] += 1
        if not ok:
            errori.append((k, lv, len(s['testo']), c[0][0], righe[c[0][1]]['id'], sorted(s['phi'])))
    print(f'Schede con PHI: {tutte_phi}; testo in I.PHI: {len(note)}')
    for k, v in sorted(esito.items(), key=str):
        print(' ', k, v)
    for e in errori:
        print('  errore:', e)


def trova(schede, righe, testi):
    """Righe del rapporto, una per ogni scheda a cui manca qualcosa."""
    gia_phi = {p: k for k, s in schede.items() for p in s['phi']}
    uscita = []
    senza_phi = {k: s for k, s in schede.items() if not s['phi']}
    # 1. rimando TM → PHI, poi PHI → TM per chi ha solo il PHI
    for k, s in schede.items():
        if s['tm'] and not s['phi']:
            _, phi = tm_api(s['tm'][0])
            if phi:
                uscita.append(dict(scheda=k, livello='sicuro', metodo='API TM→PHI', phi=' '.join(phi),
                                   tm=s['tm'][0], nuovo_phi=1, nuovo_tm=0))
                senza_phi.pop(k, None)
        elif s['phi'] and not s['tm']:
            tm, _ = tm_api(s['phi'][0], 'phi')
            if len(tm) == 1:
                uscita.append(dict(scheda=k, livello='sicuro', metodo='API PHI→TM', phi=s['phi'][0],
                                   tm=tm[0], nuovo_phi=0, nuovo_tm=1))
    # 2. testo
    assegnabili = [s for s in senza_phi.values() if len(s['testo']) >= 8]
    indice = Indice(testi, assegnabili)
    gara = defaultdict(list)
    for k, s in senza_phi.items():
        lettere = len(s['testo'])
        if lettere < 8:
            continue  # anepigrafe, latina o quasi illeggibile: niente da confrontare
        c = indice.candidati(s['testo'])
        if not c or c[0][0] < 0.5:
            uscita.append(dict(scheda=k, livello='nessuno', metodo='testo', lettere=lettere,
                               ratio=c[0][0] if c else 0, tm=s['tm'][0] if s['tm'] else ''))
            continue
        primo, i = c[0]
        secondo = c[1][0] if len(c) > 1 else 0
        lv = livello(lettere, primo, secondo)
        r = dict(scheda=k, livello=lv, metodo='testo', phi=str(righe[i]['id']), lettere=lettere, ratio=primo,
                 margine=round(primo - secondo, 3), fonte_phi=righe[i]['metadata'][:120],
                 tm=s['tm'][0] if s['tm'] else '', nuovo_phi=1, nuovo_tm=0)
        altra = gia_phi.get(r['phi'])
        if altra:
            r['livello'], r['nota'] = 'dubbio', f'PHI già su {altra}'
        gara[r['phi']].append(r)
        uscita.append(r)
    for phi, rr in gara.items():
        if len(rr) > 1:  # due schede sullo stesso testo PHI: vale solo la più simile,
            rr.sort(key=lambda r: -r['ratio'])  # e solo se le altre sono lontane
            nomi = ', '.join(x['scheda'] for x in rr)
            for r in rr[1:]:
                r['livello'], r['nota'] = 'dubbio', f'stesso PHI per {nomi}'
            if rr[1]['ratio'] >= RATIO_PROBABILE:
                rr[0]['livello'], rr[0]['nota'] = 'dubbio', f'stesso PHI per {nomi}'
            else:
                rr[0]['nota'] = f'stesso PHI anche per {nomi}: questa è la più simile'
    # 3. TM dal PHI, solo dove può servire
    for r in uscita:
        if r['metodo'] == 'testo' and r.get('phi') and r['livello'] in ('sicuro', 'probabile') and not r['tm']:
            tm, _ = tm_api(r['phi'], 'phi')
            if len(tm) == 1:
                r['tm'], r['nuovo_tm'] = tm[0], 1
            elif tm:
                r['nota'] = 'più TM per questo PHI: ' + ' '.join(tm)
    return sorted(uscita, key=lambda r: r['scheda'])


def imposta_idno(xml, tipo, valore, attr=''):
    """Riempie l'<idno> vuoto o col segnaposto; se manca, lo mette prima di
    </publicationStmt>. Non tocca mai un valore già compilato."""
    nuovo = f'<idno type="{tipo}"{attr}>{valore}</idno>'
    vuoto = re.compile(rf'<idno type="{tipo}"[^>]*>\s*(?:<!--.*?-->|&lt;!--.*?--&gt;)?\s*</idno>')
    if vuoto.search(xml):
        return vuoto.sub(lambda _: nuovo, xml, count=1)
    if re.search(rf'<idno type="{tipo}"', xml):
        raise ValueError(f'{tipo} già compilato')
    return re.sub(r'([ \t]*)</publicationStmt>',
                  lambda m: f'                {nuovo}\n{m.group(1)}</publicationStmt>', xml, count=1)


def applica(righe_rapporto):
    fatte = 0
    for r in righe_rapporto:
        if r['livello'] != 'sicuro':
            continue
        f = CORPUS / f"{r['scheda']}.xml"
        xml = f.read_text(encoding='utf8')
        if r.get('nuovo_tm') and r.get('tm'):
            xml = imposta_idno(xml, 'TM', r['tm'], f' corresp="https://www.trismegistos.org/text/{r["tm"]}"')
        if r.get('nuovo_phi'):
            for p in r['phi'].split():
                xml = imposta_idno(xml, 'PHI', f'PH{p}')
        f.write_text(xml, encoding='utf8')
        fatte += 1
    aggiorna_concordanza(righe_rapporto)
    print(f'{fatte} schede scritte in {CORPUS}')


def aggiorna_concordanza(righe_rapporto):
    with CONCORDANZA.open(newline='', encoding='utf8') as h:
        rd = csv.DictReader(h)
        campi, voci = rd.fieldnames, {v['file']: v for v in rd}
    for r in righe_rapporto:
        if r['livello'] != 'sicuro':
            continue
        nome = f"{r['scheda']}.xml"
        v = voci.setdefault(nome, {c: '' for c in campi} | {'file': nome})
        v['tm'] = r.get('tm') or v['tm']
        v['phi'] = ' '.join(f'PH{p}' for p in r['phi'].split())
        v['status'] = 'auto-api' if r['metodo'].startswith('API') else 'auto-testo'
    with CONCORDANZA.open('w', newline='', encoding='utf8') as h:
        w = csv.DictWriter(h, campi, lineterminator='\n')
        w.writeheader()
        w.writerows(voci[k] for k in sorted(voci))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--prepara', action='store_true', help='scarica I.PHI in cache')
    ap.add_argument('--taratura', action='store_true', help='misura il metodo sulle schede già numerate')
    ap.add_argument('--applica', action='store_true', help='scrive i «sicuro» nelle schede')
    ap.add_argument('--out', type=Path, default=OUT)
    a = ap.parse_args()
    if a.prepara:
        return prepara()
    schede = carica_schede()
    righe, testi = carica_iphi()
    if a.taratura:
        return taratura(schede, righe, testi)
    rapporto = trova(schede, righe, testi)
    campi = ['scheda', 'livello', 'metodo', 'phi', 'tm', 'nuovo_phi', 'nuovo_tm', 'lettere', 'ratio', 'margine',
             'fonte_phi', 'nota']
    with a.out.open('w', newline='', encoding='utf8') as h:
        w = csv.DictWriter(h, campi, extrasaction='ignore', lineterminator='\n')
        w.writeheader()
        w.writerows(rapporto)
    print(Counter(r['livello'] for r in rapporto), '→', a.out)
    if a.applica:
        applica(rapporto)


if __name__ == '__main__':
    main()
