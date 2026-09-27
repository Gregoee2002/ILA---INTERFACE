#!/usr/bin/env python3
"""controlla-link.py — gli URI esterni del corpus rispondono ancora?

Raccoglie dalle schede della repo dati gli URI verso Pleiades, Trismegistos e
i vocabolari EAGLE, li interroga e segnala quelli che non rispondono più, con
le schede che li usano. Sola lettura: non tocca il corpus.

Logeion è escluso: è un'applicazione a pagina unica e risponde 200 a qualunque
indirizzo, quindi il controllo non direbbe niente.

Per non martellare i server, gli esiti restano in cache
(logs/serali/.stato/link.json): un URI che rispondeva viene riprovato solo
dopo RICONTROLLO_GIORNI; quelli guasti a ogni giro.

Uso:  python3 scripts/controlla-link.py [--tutti] [--out rapporto.md]
Variabili: ILA_DATA_REPO (default ~/Documents/GitHub/ILA)
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_REPO = Path(os.environ.get('ILA_DATA_REPO', Path.home() / 'Documents/GitHub/ILA'))
CACHE = ROOT / 'logs/serali/.stato/link.json'
RICONTROLLO_GIORNI = 28
PAUSA = 0.5  # secondi fra una richiesta e l'altra
UA = 'ILA-controlla-link/1.0 (+https://github.com/Gregoee2002/ILA)'

DOMINI = {
    'pleiades.stoa.org': 'Pleiades',
    'www.trismegistos.org': 'Trismegistos',
    'www.eagle-network.eu': 'EAGLE',
}
URI = re.compile(r'https?://(?:%s)/[^\s"<>\']+' % '|'.join(re.escape(d) for d in DOMINI))


def raccogli():
    uso = defaultdict(set)
    for f in sorted((DATA_REPO / 'corpus').glob('ILA-*.xml')):
        for u in URI.findall(f.read_text(encoding='utf-8')):
            uso[u.rstrip('.,;)')].add(f.stem)
    return uso


def _get(url):
    """Una GET con curl (il Python di sistema non ha i certificati CA)."""
    out = subprocess.run(
        ['curl', '-sS', '-L', '--max-time', '20', '-A', UA, '-w', '\n%{http_code} %{url_effective}', url],
        capture_output=True, text=True, errors='replace')
    if out.returncode != 0:
        return 0, '', url, out.stderr.strip().split('\n')[-1][:80]
    corpo, _, coda = out.stdout.rpartition('\n')
    codice, _, finale = coda.partition(' ')
    return int(codice), corpo, finale, ''


def _norm(u):
    return re.sub(r'^https?://|(\.html?)?/?$', '', u)


def _schede(ids):
    ids = sorted(ids)
    return ', '.join(ids) if len(ids) <= 8 else f'{", ".join(ids[:5])} e altre {len(ids) - 5}'


def prova(url):
    """Esito: (codice, nota). Codice 0 = errore di rete; un 5xx o un errore si riprova una volta."""
    codice, corpo, finale, errore = _get(url)
    if codice == 0 or codice >= 500:
        time.sleep(3)
        codice, corpo, finale, errore = _get(url)
    if codice == 0:
        return 0, errore
    nota = ''
    # Trismegistos risponde 403 a qualunque client automatico: non vuol dire
    # che la pagina manchi, solo che da qui non si può verificare.
    if codice == 403 and 'trismegistos' in url:
        return codice, 'non verificabile (blocco anti-robot)'
    # Pleiades tiene in piedi le pagine dei luoghi ritirati o fusi.
    if codice == 200 and 'pleiades' in url and re.search(r'withdrawn|has been merged|superseded', corpo, re.I):
        nota = 'luogo ritirato o fuso'
    # Un reindirizzamento che cambia solo http→https o aggiunge .html è la
    # normale risoluzione di un URI LOD (EAGLE fa così): non va segnalato.
    if codice == 200 and _norm(finale) != _norm(url):
        nota = (nota + '; ' if nota else '') + f'reindirizza a {finale}'
    return codice, nota


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tutti', action='store_true', help='ignora la cache e riprova tutto')
    ap.add_argument('--out', help='scrive il rapporto in Markdown qui (sennò su stdout)')
    a = ap.parse_args()

    if not (DATA_REPO / 'corpus').is_dir():
        sys.exit(f'Repo dati non trovata in {DATA_REPO}')

    uso = raccogli()
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    oggi = date.today()
    provati = 0
    for url in sorted(uso):
        c = cache.get(url)
        if c and not a.tutti and c['codice'] == 200 and not c.get('nota') \
                and (oggi - date.fromisoformat(c['data'])).days < RICONTROLLO_GIORNI:
            continue
        codice, nota = prova(url)
        cache[url] = {'codice': codice, 'nota': nota, 'data': oggi.isoformat()}
        provati += 1
        time.sleep(PAUSA)
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True))

    nonverif = [u for u in sorted(uso) if cache[u]['nota'].startswith('non verificabile')]
    guasti = [u for u in sorted(uso) if cache[u]['codice'] != 200 and u not in nonverif]
    avvisi = [u for u in sorted(uso) if cache[u]['codice'] == 200 and cache[u].get('nota')]
    per_dominio = defaultdict(int)
    for u in uso:
        per_dominio[DOMINI[u.split('/')[2]]] += 1

    r = [f'# Link esterni del corpus — {datetime.now():%d/%m/%Y %H:%M}', '',
         f'URI distinti: {len(uso)} ('
         + ', '.join(f'{k} {v}' for k, v in sorted(per_dominio.items()))
         + f') · riprovati stasera: {provati} · guasti: {len(guasti)} · da guardare: {len(avvisi)}'
         + f' · non verificabili: {len(nonverif)}', '']
    if guasti:
        r += ['## Non rispondono', '', '| URI | esito | schede |', '|---|---|---|']
        r += [f'| {u} | {cache[u]["codice"] or cache[u]["nota"]} | {_schede(uso[u])} |' for u in guasti]
        r.append('')
    if avvisi:
        r += ['## Rispondono, ma da guardare', '', '| URI | nota | schede |', '|---|---|---|']
        r += [f'| {u} | {cache[u]["nota"]} | {_schede(uso[u])} |' for u in avvisi]
        r.append('')
    if nonverif:
        r += [f'Non verificabili da qui ({len(nonverif)}): Trismegistos blocca i client automatici. '
              'Se servisse, si controllano a mano dal browser.', '']
    if not guasti and not avvisi:
        r.append('Nessun URI guasto.')
    testo = '\n'.join(r) + '\n'
    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text(testo, encoding='utf-8')
    else:
        sys.stdout.write(testo)


if __name__ == '__main__':
    main()
