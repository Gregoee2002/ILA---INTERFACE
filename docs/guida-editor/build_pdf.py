#!/usr/bin/env python3
"""
build_pdf.py — assembla e rende la "Guida completa all'editor di ILA".

Legge le "parti" elencate in parts/manifest.json (nell'ordine dato), estrae
ogni blocco <section>...</section> di livello superiore, RINUMERA in automatico
i badge <span class="num">N</span> secondo l'ordine finale (il numero scritto
a mano nel sorgente è solo un placeholder leggibile — non serve tenerlo
aggiornato quando si inserisce una sezione in mezzo alle altre), genera
l'indice a partire dai titoli (<h2>) e dai sottotitoli (<h3>) trovati, e
produce sia l'HTML unito sia il PDF finale con WeasyPrint.

Uso:
    python3 build_pdf.py
    (richiede weasyprint — vedi README.md per l'ambiente virtuale)

Output:
    guida-editor-ila.html   — sorgente HTML unito (utile per ispezionare/diffare)
    guida-editor-ila.pdf    — PDF pronto per la consegna

Per aggiungere una nuova sezione: vedi README.md — in breve, o si aggiunge un
nuovo <section> a un file in parts/, o si crea un nuovo file part*.html e lo
si registra in parts/manifest.json, poi si rilancia questo script.
"""
import json
import re
from html import escape
from pathlib import Path

HERE = Path(__file__).parent
PARTS_DIR = HERE / "parts"
MANIFEST = PARTS_DIR / "manifest.json"
STYLE = HERE / "style.css"
COVER = HERE / "cover.html"
OUT_HTML = HERE / "guida-editor-ila.html"
OUT_PDF = HERE / "guida-editor-ila.pdf"

SECTION_RE = re.compile(r"<section\b[^>]*>.*?</section>", re.DOTALL | re.IGNORECASE)
H2_RE = re.compile(
    r'<h2>\s*<span class="num">\s*\d+\s*</span>\s*(.*?)\s*(?:<span class="grp">(.*?)</span>)?\s*</h2>',
    re.DOTALL | re.IGNORECASE,
)
H3_RE = re.compile(r"<h3>\s*(?:\d+(?:\.\d+)?\s*[—-]\s*)?(.*?)\s*</h3>", re.DOTALL | re.IGNORECASE)
NUM_SPAN_RE = re.compile(r'(<span class="num">)\s*\d+\s*(</span>)')


def load_manifest():
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for e in entries:
        e["path"] = PARTS_DIR / e["file"]
        if not e["path"].exists():
            raise FileNotFoundError(f"Parte mancante elencata in manifest.json: {e['file']}")
    return entries


def strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()


def main():
    entries = load_manifest()

    toc_parts = []      # [(label, [ (num, title, subs) ]) ]
    assembled_sections = []
    n = 0

    for entry in entries:
        raw = entry["path"].read_text(encoding="utf-8")
        sections = SECTION_RE.findall(raw)
        if not sections:
            raise ValueError(f"Nessun <section> trovato in {entry['file']}")
        toc_rows = []
        for sec in sections:
            n += 1
            # rinumera il badge del titolo secondo l'ordine finale
            sec, count = NUM_SPAN_RE.subn(rf"\g<1>{n}\g<2>", sec, count=1)
            if count == 0:
                raise ValueError(f"Sezione senza <span class=\"num\"> in {entry['file']} (posizione {n})")
            assembled_sections.append(sec)

            m = H2_RE.search(sec)
            if not m:
                raise ValueError(f"<h2> non nel formato atteso in {entry['file']} (sezione {n})")
            title = strip_tags(m.group(1))
            subs = [strip_tags(h) for h in H3_RE.findall(sec)]
            toc_rows.append((n, title, subs))
        toc_parts.append((entry["label"], toc_rows))

    # ---- indice ----
    toc_html = ['<div class="toc">', "<h2>Indice</h2>"]
    for label, rows in toc_parts:
        toc_html.append(f'<div class="part">{escape(label)}</div>')
        toc_html.append("<ol>")
        for num, title, subs in rows:
            toc_html.append(f"<li><b>{num}.</b><span>{escape(title)}</span></li>")
            if subs:
                joined = " · ".join(escape(s) for s in subs)
                toc_html.append(f'<li class="sub">{joined}</li>')
        toc_html.append("</ol>")
    toc_html.append("</div>")

    # ---- assemblaggio finale ----
    style_css = STYLE.read_text(encoding="utf-8")
    cover_html = COVER.read_text(encoding="utf-8")
    body = "\n".join(assembled_sections)

    doc = f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>ILA — Guida completa all'editor</title>
<style>
{style_css}
</style>
</head>
<body>

{cover_html}

{''.join(toc_html)}

{body}

</body>
</html>
"""
    OUT_HTML.write_text(doc, encoding="utf-8")
    print(f"Scritto {OUT_HTML} ({n} sezioni)")

    try:
        from weasyprint import HTML
    except ImportError:
        print("weasyprint non installato in questo interprete — vedi README.md per l'ambiente virtuale.")
        print("HTML unito comunque scritto; PDF NON generato.")
        return

    HTML(filename=str(OUT_HTML)).write_pdf(str(OUT_PDF))
    print(f"Scritto {OUT_PDF}")


if __name__ == "__main__":
    main()
