#!/usr/bin/env python3
"""applica-revisione.py — attrezzo della routine ila-applica-correzioni.

Lavora sulla coda dell'hub Strumenti › Revisione: le proposte che sul sito
sono state accettate e inviate (stato «inviata» in revisione/decisioni.json
della repo dati). Non fa commit né push: quelli li fa la routine, dopo il lint.

  elenco                 la coda, in JSON: proposta + decisione (nota,
                         correzione riscritta a mano)
  patch ID               applica le sostituzioni esatte della proposta, se ce
                         l'ha e se la correzione non è stata riscritta sul sito;
                         si ferma senza toccare nulla se un «cerca» non compare
                         esattamente una volta
  esito ID STATO MSG [--commit SHA]
                         scrive l'esito in decisioni.json (STATO: applicata o
                         bloccata); MSG dice che cosa si è fatto o perché no

Destinazioni: «dati» = repo dati (~/Documents/GitHub/ILA), «tesi» =
~/Documents/Tesi-ILA (non è una repo git: prima di scriverci si salva una
copia in logs/serali/.stato/copie-tesi/).
Variabili: ILA_DATA_REPO, ILA_TESI.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_REPO = Path(os.environ.get("ILA_DATA_REPO", Path.home() / "Documents/GitHub/ILA"))
TESI = Path(os.environ.get("ILA_TESI", Path.home() / "Documents/Tesi-ILA"))
DECISIONI = DATA_REPO / "revisione/decisioni.json"
INDICE = DATA_REPO / "revisione/indice.json"
RADICI = {"dati": DATA_REPO, "tesi": TESI}


def carica():
    indice = json.loads(INDICE.read_text(encoding="utf-8")) if INDICE.exists() else {"proposte": []}
    decisioni = json.loads(DECISIONI.read_text(encoding="utf-8")) if DECISIONI.exists() else {}
    return {p["id"]: p for p in indice.get("proposte", [])}, decisioni


def coda():
    proposte, decisioni = carica()
    out = []
    for pid, d in decisioni.items():
        if d.get("stato") != "inviata":
            continue
        p = proposte.get(pid)
        out.append({"id": pid, "proposta": p, "decisione": d, "nota": "proposta non più nell'indice" if p is None else None})
    out.sort(key=lambda x: (x["decisione"].get("inviataIl", ""), x["id"]))
    return out


def dentro(radice: Path, rel: str) -> Path:
    f = (radice / rel).resolve()
    if radice.resolve() not in f.parents:
        raise SystemExit(f"percorso fuori dalla destinazione: {rel}")
    return f


def applica_patch(pid: str) -> int:
    proposte, decisioni = carica()
    p, d = proposte.get(pid), decisioni.get(pid, {})
    if not p:
        print(f"{pid}: proposta non trovata nell'indice")
        return 1
    if not p.get("patch"):
        print(f"{pid}: nessuna sostituzione pronta, va applicata a mano dalla descrizione")
        return 3
    if d.get("propostaModificata"):
        print(f"{pid}: la correzione è stata riscritta sul sito, la sostituzione pronta non vale più: applicala a mano")
        return 3
    radice = RADICI.get(p.get("destinazione", "dati"))
    if radice is None:
        print(f"{pid}: destinazione «{p.get('destinazione')}» non gestita")
        return 1
    # Prima si controlla tutto, poi si scrive: o tutte le sostituzioni o nessuna.
    testi: dict[Path, str] = {}
    for x in p["patch"]:
        f = dentro(radice, x["file"])
        if not f.exists():
            print(f"{pid}: file assente {x['file']}")
            return 2
        t = testi.get(f) or f.read_text(encoding="utf-8")
        n = t.count(x["cerca"])
        if n != 1:
            print(f"{pid}: in {x['file']} il testo da cercare compare {n} volte (deve essere 1): forse è già stato corretto o il file è cambiato")
            return 2
        testi[f] = t.replace(x["cerca"], x["sostituisci"], 1)
    for f, t in testi.items():
        if radice == TESI:
            copia = ROOT / "logs/serali/.stato/copie-tesi" / dt.datetime.now().strftime("%Y%m%d-%H%M%S") / f.relative_to(TESI)
            copia.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, copia)
        f.write_text(t, encoding="utf-8")
        print(f"{pid}: modificato {f.relative_to(radice)}")
    return 0


def scrivi_esito(pid: str, stato: str, msg: str, commit: str | None) -> int:
    if stato not in ("applicata", "bloccata"):
        print("STATO deve essere applicata o bloccata")
        return 1
    _, decisioni = carica()
    d = decisioni.get(pid)
    if not d:
        print(f"{pid}: nessuna decisione registrata")
        return 1
    d["stato"] = stato
    d["esito"] = msg
    d["applicataIl"] = dt.datetime.now().astimezone().isoformat(timespec="seconds")
    if commit:
        d["commit"] = commit
    DECISIONI.write_text(json.dumps(decisioni, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{pid}: {stato}")
    return 0


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    cmd, *resto = argv
    if cmd == "elenco":
        print(json.dumps(coda(), ensure_ascii=False, indent=2))
        return 0
    if cmd == "patch" and len(resto) == 1:
        return applica_patch(resto[0])
    if cmd == "esito" and len(resto) >= 3:
        commit = None
        if "--commit" in resto:
            i = resto.index("--commit")
            commit = resto[i + 1] if i + 1 < len(resto) else None
            resto = resto[:i] + resto[i + 2:]
        return scrivi_esito(resto[0], resto[1], " ".join(resto[2:]), commit)
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
