#!/usr/bin/env python3
"""raccogli-revisione.py — porta i rapporti delle routine nell'hub «Revisione».

Le routine (controlli notturni e attività serali) lasciano i rapporti in
logs/, che è ignorata da git e quindi invisibile al sito. Questo script li
copia nella repo dati, in revisione/, dove la linguetta Strumenti › Revisione
li legge con il token dell'editor:

  revisione/rapporti/<routine>/AAAA-MM-GG.md   copia del rapporto
  revisione/indice.json                        elenco dei rapporti e delle
                                               proposte, rigenerato ogni volta
  revisione/controlli.json                     lint e avanzamento dei controlli
                                               notturni, per le linguette
                                               Coerenza e Completezza
  revisione/decisioni.json                     NON lo tocca: lo scrive il sito
                                               (accetta, scarta, invia) e la
                                               routine ila-applica-correzioni

Le proposte vengono dai file logs/serali/<routine>/AAAA-MM-GG.json accanto ai
rapporti (formato in docs/routine-serali.md, § «Hub di revisione»). L'id di
una proposta dipende solo dal contenuto, così se una routine ripropone la
stessa correzione in un giro successivo la decisione già presa resta valida.

Uso:
  python3 scripts/raccogli-revisione.py            copia, committa e fa push
  python3 scripts/raccogli-revisione.py --no-push  copia soltanto
  python3 scripts/raccogli-revisione.py --dry-run  dice che cosa farebbe
Variabili: ILA_DATA_REPO (default ~/Documents/GitHub/ILA)
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOGS = ROOT / "logs"
DATA_REPO = Path(os.environ.get("ILA_DATA_REPO", Path.home() / "Documents/GitHub/ILA"))
DEST = "revisione"

# Cartella dei rapporti → nome mostrato nell'hub. L'ordine è quello delle
# linguette nel filtro per routine.
ROUTINE = {
    "controlli": "Controlli notturni",
    "collazione": "Collazione con Lane",
    "lessico": "Lessico cultuale",
    "traduzioni": "Traduzioni",
    "cura-traduzioni": "Cura delle traduzioni",
    "supplementi": "Supplementi di Lane",
    "numerali": "Numerali e date",
    "lacune": "Lacune sulla scansione",
    "tesi": "Tesi e corpus",
    "luoghi": "Luoghi e Pleiades",
    "link": "Link e bibliografia",
    "diario": "Diario della settimana",
    "memoria": "Memoria di Claude",
}

DATA_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.(md|json)$")
CAMPI_TESTO = ("scheda", "tipo", "titolo", "riga", "attuale", "proposta", "dettaglio", "classe", "destinazione")


def sorgenti() -> list[tuple[str, Path]]:
    """(routine, cartella) per ogni cartella di rapporti che esiste."""
    out = []
    for routine in ROUTINE:
        cartella = LOGS / "controlli" if routine == "controlli" else LOGS / "serali" / routine
        if cartella.is_dir():
            out.append((routine, cartella))
    # Una routine nuova non ancora in ROUTINE si vede lo stesso, col suo nome.
    serali = LOGS / "serali"
    if serali.is_dir():
        for c in sorted(serali.iterdir()):
            if c.is_dir() and not c.name.startswith(".") and c.name not in ROUTINE:
                out.append((c.name, c))
    return out


def sommario(md: str, routine: str) -> list[str]:
    """Le prime righe utili dopo il titolo: le routine ne mettono tre in testa."""
    righe = []
    for r in md.splitlines()[1:]:
        s = r.strip()
        if not s:
            if righe and routine != "controlli":
                # Il sommario delle serali è un blocco unico: basta il primo.
                if len(righe) >= 3:
                    break
            continue
        if s.startswith(("## ", "---", "<details", "|", "```")):
            break
        if routine == "controlli" and not s.startswith("- "):
            continue
        righe.append(s.lstrip("- ").strip())
        if len(righe) >= 6:
            break
    return righe


def titolo(md: str, fallback: str) -> str:
    for r in md.splitlines():
        if r.startswith("# "):
            return r[2:].strip()
    return fallback


def id_proposta(routine: str, p: dict) -> str:
    chiave = "\x1f".join([routine] + [str(p.get(k, "")).strip() for k in ("scheda", "riga", "attuale", "proposta", "titolo")])
    patch = p.get("patch")
    if patch:
        chiave += json.dumps(patch, ensure_ascii=False, sort_keys=True)
    return f"{routine}-{hashlib.sha1(chiave.encode('utf-8')).hexdigest()[:10]}"


def normalizza_patch(p: dict, avvisi: list[str], dove: str):
    """patch: {file, cerca, sostituisci} oppure una lista di questi."""
    grezzo = p.get("patch")
    if not grezzo:
        return None
    lista = grezzo if isinstance(grezzo, list) else [grezzo]
    buone = []
    for x in lista:
        if isinstance(x, dict) and isinstance(x.get("file"), str) and isinstance(x.get("cerca"), str) and isinstance(x.get("sostituisci"), str):
            buone.append({"file": x["file"], "cerca": x["cerca"], "sostituisci": x["sostituisci"]})
        else:
            avvisi.append(f"{dove}: patch malformata, ignorata")
    return buone or None


def leggi_proposte(routine: str, data: str, path: Path, avvisi: list[str]) -> list[dict]:
    try:
        grezzo = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        avvisi.append(f"{path.relative_to(ROOT)}: JSON illeggibile ({e})")
        return []
    elenco = grezzo.get("proposte") if isinstance(grezzo, dict) else grezzo
    if not isinstance(elenco, list):
        avvisi.append(f"{path.relative_to(ROOT)}: manca l'elenco «proposte»")
        return []
    out = []
    for i, p in enumerate(elenco, 1):
        dove = f"{path.relative_to(ROOT)} n. {i}"
        if not isinstance(p, dict) or not str(p.get("titolo", "")).strip():
            avvisi.append(f"{dove}: senza titolo, ignorata")
            continue
        q = {k: str(p[k]).strip() for k in CAMPI_TESTO if p.get(k) not in (None, "")}
        patch = normalizza_patch(p, avvisi, dove)
        if patch:
            q["patch"] = patch
        if p.get("dubbio"):
            q["dubbio"] = True
        q.setdefault("destinazione", "dati")
        q["id"] = id_proposta(routine, q)
        q["routine"] = routine
        q["data"] = data
        q["rapporto"] = f"{DEST}/rapporti/{routine}/{data}.md"
        out.append(q)
    return out


def raccogli():
    rapporti, proposte, avvisi, copie = [], [], [], []
    visti: dict[str, dict] = {}
    for routine, cartella in sorgenti():
        per_data: dict[str, dict[str, Path]] = {}
        for f in cartella.iterdir():
            m = DATA_RE.match(f.name)
            if m:
                per_data.setdefault(m.group(1), {})[m.group(2)] = f
        for data in sorted(per_data):
            file = per_data[data]
            voce = {"routine": routine, "etichetta": ROUTINE.get(routine, routine), "data": data, "proposte": 0}
            if "md" in file:
                md = file["md"].read_text(encoding="utf-8")
                voce["titolo"] = titolo(md, voce["etichetta"])
                voce["sommario"] = sommario(md, routine)
                voce["file"] = f"{DEST}/rapporti/{routine}/{data}.md"
                copie.append((file["md"], voce["file"]))
            else:
                voce["titolo"] = voce["etichetta"]
                voce["sommario"] = []
            if "json" in file:
                for q in leggi_proposte(routine, data, file["json"], avvisi):
                    # Stessa proposta in due giri: vale la più recente, ma la
                    # decisione (legata all'id) è una sola.
                    if q["id"] in visti:
                        visti[q["id"]].update(q)
                        continue
                    visti[q["id"]] = q
                    proposte.append(q)
                    voce["proposte"] += 1
            rapporti.append(voce)
    rapporti.sort(key=lambda r: (r["data"], r["routine"]), reverse=True)
    proposte.sort(key=lambda q: (q["data"], q["routine"], q.get("scheda", "")), reverse=False)
    return rapporti, proposte, avvisi, copie


STATO_CONTROLLI = LOGS / "controlli" / ".stato"
GIORNI_AVANZAMENTO = 30
LINT_RE = re.compile(r"^(ILA-\d+|\S+)\s+(.*)$")


def genere_lint(testo: str) -> str:
    """Raggruppa i problemi del lint come li mostra la linguetta Coerenza."""
    if "manca un <w lemma>" in testo:
        return "lemma"      # le proposte le fa ila-lessico-candidati
    if "nelle keywords" in testo:
        return "keywords"
    return "altro"


def controlli() -> dict | None:
    """Lint e avanzamento dell'ultima notte, da logs/controlli/.stato/.

    Il lint viene da problemi.tsv (righe «ERRORI|AVVISI<tab>ILA-NNN  testo»),
    i nuovi da nuovi.tsv; l'avanzamento dagli stato-AAAA-MM-GG.json degli
    ultimi GIORNI_AVANZAMENTO giorni. Le chiavi dei campi sono quelle di
    scripts/stato-corpus.py, che coincidono con src/lib/mancanze.ts.
    """
    problemi = STATO_CONTROLLI / "problemi.tsv"
    if not problemi.exists():
        return None
    nuovi_f = STATO_CONTROLLI / "nuovi.tsv"
    nuovi = set(nuovi_f.read_text(encoding="utf-8").splitlines()) if nuovi_f.exists() else set()
    lint = {"errori": [], "avvisi": []}
    for riga in problemi.read_text(encoding="utf-8").splitlines():
        if "\t" not in riga:
            continue
        sez, resto = riga.split("\t", 1)
        m = LINT_RE.match(resto.strip())
        scheda, testo = (m.group(1), m.group(2).strip()) if m else ("", resto.strip())
        voce = {"scheda": scheda, "testo": testo, "genere": genere_lint(testo)}
        if riga in nuovi:
            voce["nuovo"] = True
        lint["errori" if sez == "ERRORI" else "avvisi"].append(voce)
    storico = []
    for f in sorted(STATO_CONTROLLI.glob("stato-*.json"))[-GIORNI_AVANZAMENTO:]:
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        storico.append({"data": f.stem[len("stato-"):], "schede": d.get("schede"), "campi": d.get("campi", {})})
    data = dt.datetime.fromtimestamp(problemi.stat().st_mtime).astimezone().isoformat(timespec="minutes")
    return {"data": data, "lint": lint, "avanzamento": storico}


def git(*args, check=True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(DATA_REPO), *args], capture_output=True, text=True, check=check)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--no-push", action="store_true", help="scrive i file nella repo dati senza commit né push")
    ap.add_argument("--dry-run", action="store_true", help="non scrive niente")
    a = ap.parse_args()

    if not (DATA_REPO / "corpus").is_dir():
        print(f"Repo dati non trovata in {DATA_REPO}", file=sys.stderr)
        return 1

    rapporti, proposte, avvisi, copie = raccogli()
    print(f"Rapporti: {len(rapporti)} · proposte: {len(proposte)}")
    for x in avvisi:
        print(f"  avviso: {x}")
    if a.dry_run:
        return 0

    spingere = not a.no_push
    if spingere:
        # Prima si allinea, così il push è un fast-forward. Con modifiche
        # locali non committate su altri file il pull va bene lo stesso,
        # purché non tocchino revisione/.
        r = git("pull", "--ff-only", "-q", check=False)
        if r.returncode != 0:
            print(f"git pull non riuscito nella repo dati, niente push:\n{r.stderr.strip()}", file=sys.stderr)
            spingere = False

    cambiati = []
    for src, rel in copie:
        dst = DATA_REPO / rel
        testo = src.read_text(encoding="utf-8")
        if dst.exists() and dst.read_text(encoding="utf-8") == testo:
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(testo, encoding="utf-8")
        cambiati.append(rel)

    indice_path = DATA_REPO / DEST / "indice.json"
    vecchio = {}
    if indice_path.exists():
        try:
            vecchio = json.loads(indice_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    nuovo = {"rapporti": rapporti, "proposte": proposte}
    if {k: vecchio.get(k) for k in nuovo} != nuovo:
        nuovo = {"generato": dt.datetime.now().astimezone().isoformat(timespec="seconds"), **nuovo}
        indice_path.parent.mkdir(parents=True, exist_ok=True)
        indice_path.write_text(json.dumps(nuovo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        cambiati.append(f"{DEST}/indice.json")

    ctrl = controlli()
    if ctrl is not None:
        ctrl_path = DATA_REPO / DEST / "controlli.json"
        testo = json.dumps(ctrl, ensure_ascii=False, indent=2) + "\n"
        if not ctrl_path.exists() or ctrl_path.read_text(encoding="utf-8") != testo:
            ctrl_path.parent.mkdir(parents=True, exist_ok=True)
            ctrl_path.write_text(testo, encoding="utf-8")
            cambiati.append(f"{DEST}/controlli.json")

    if not cambiati:
        print("Niente di nuovo da portare nell'hub.")
        return 0
    print(f"File aggiornati nella repo dati: {len(cambiati)}")
    if a.no_push or not spingere:
        return 0 if a.no_push else 2

    percorsi = [f"{DEST}/rapporti", f"{DEST}/indice.json"]
    if (DATA_REPO / DEST / "controlli.json").exists():
        percorsi.append(f"{DEST}/controlli.json")
    git("add", "--", *percorsi)
    nuovi = sorted({c.split("/")[2] for c in cambiati if c.startswith(f"{DEST}/rapporti/")})
    msg = "revisione: " + (", ".join(nuovi) if nuovi else "indice") + f" ({len(proposte)} proposte)"
    r = git("commit", "-q", "-m", msg, "--", *percorsi, check=False)
    if r.returncode != 0:
        print(f"commit non riuscito:\n{r.stdout}{r.stderr}", file=sys.stderr)
        return 2
    r = git("push", "-q", check=False)
    if r.returncode != 0:
        print(f"push non riuscito (il commit resta in locale):\n{r.stderr.strip()}", file=sys.stderr)
        return 2
    print(f"Fatto: {msg}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
