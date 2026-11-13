#!/usr/bin/env python3
"""Pannello A1 del lessico cultuale: lemmi in oro (il dio agisce) e argento (l'uomo).

Legge docs/spoglio-lessico-cultuale.csv, scrive docs/pannello-a1/pannello-a1-lessico.html
e, con Chrome headless, il PDF vettoriale 594 x 841 mm accanto.

    python3 scripts/pannello-a1-lessico.py
"""
import csv, collections, json, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV = ROOT / "docs" / "spoglio-lessico-cultuale.csv"
OUT = ROOT / "docs" / "pannello-a1"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

FAMIGLIE = {
    "agency": "il dio agisce",
    "atto-cultuale": "atti cultuali",
    "ruolo-istituzione": "ruoli e istituzioni",
    "formula-fissa": "formule fisse",
    "colpa": "la colpa",
}

rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
occ = collections.Counter((r["famiglia"], r["lemma"]) for r in rows)
schede = collections.defaultdict(set)
for r in rows:
    schede[(r["famiglia"], r["lemma"])].add(r["scheda"])
words = [
    {"lemma": l, "fam": f, "n": n, "s": len(schede[(f, l)]),
     "metal": "oro" if f == "agency" else "argento"}
    for (f, l), n in sorted(occ.items(), key=lambda t: (-t[1], t[0][1]))
]
tot_schede = len({r["scheda"] for r in rows})

HTML = r"""<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<title>ILA — Lessico cultuale, pannello A1</title>
<style>
@page { size: 594mm 841mm; margin: 0 }
html, body { margin: 0; padding: 0; background: #0c111c }
svg { display: block; width: 594mm; height: 841mm }
text { font-family: 'Libertinus Serif', 'Brill', serif }
.sc { font-variant-caps: all-small-caps; letter-spacing: .12em }
</style></head><body>
<svg id="p" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 594 841">
<defs>
  <linearGradient id="oro" x1="0" y1="0" x2="0.25" y2="1">
    <stop offset="0" stop-color="#7a5714"/><stop offset=".28" stop-color="#f4dc8e"/>
    <stop offset=".5" stop-color="#b98a2c"/><stop offset=".72" stop-color="#f8e7ad"/>
    <stop offset="1" stop-color="#8c6519"/>
  </linearGradient>
  <linearGradient id="argento" x1="0" y1="0" x2="0.25" y2="1">
    <stop offset="0" stop-color="#5d636c"/><stop offset=".28" stop-color="#f1f3f6"/>
    <stop offset=".5" stop-color="#9299a3"/><stop offset=".72" stop-color="#e7eaee"/>
    <stop offset="1" stop-color="#626973"/>
  </linearGradient>
  <radialGradient id="luna" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#1b2335"/><stop offset="1" stop-color="#0c111c"/>
  </radialGradient>
</defs>
<rect width="594" height="841" fill="#0c111c"/>
<ellipse cx="297" cy="370" rx="300" ry="290" fill="url(#luna)"/>
<!-- cornice -->
<rect x="18" y="18" width="558" height="805" fill="none" stroke="url(#oro)" stroke-width=".8"/>
<rect x="22" y="22" width="550" height="797" fill="none" stroke="url(#argento)" stroke-width=".3"/>
<!-- intestazione -->
<text x="297" y="58" text-anchor="middle" font-size="9" fill="url(#argento)" class="sc">Index Lunae Antiquae</text>
<text x="297" y="88" text-anchor="middle" font-size="26" fill="url(#oro)">Il lessico cultuale di Men</text>
<text x="297" y="104" text-anchor="middle" font-size="8.5" fill="#aab1bc" font-style="italic">__SOTTO__</text>
<line x1="217" y1="114" x2="377" y2="114" stroke="url(#oro)" stroke-width=".4"/>
<g id="cloud"></g>
<g id="indice"></g>
<text x="297" y="806" text-anchor="middle" font-size="5.5" fill="#7d8592" class="sc">__PIEDE__</text>
</svg>
<script>
const W = __WORDS__;
const FAM = __FAM__;
const NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("p");
const cloud = document.getElementById("cloud");
const maxN = Math.max(...W.map(w => w.n));
const size = n => 9.5 + 82 * Math.sqrt((n - 1) / (maxN - 1));
// area della nuvola
const CX = 297, CY = 358, RX = 268, RY = 232;
const placed = [];
const hit = (a) => placed.some(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
const inside = (a) => {
  // tutti e quattro gli angoli dentro l'ellisse
  return [[a.x, a.y], [a.x + a.w, a.y], [a.x, a.y + a.h], [a.x + a.w, a.y + a.h]]
    .every(([x, y]) => ((x - CX) / RX) ** 2 + ((y - CY) / RY) ** 2 <= 1);
};
for (const w of W) {
  const t = document.createElementNS(NS, "text");
  const fs = size(w.n);
  t.setAttribute("font-size", fs.toFixed(2));
  t.setAttribute("fill", "url(#" + w.metal + ")");
  t.setAttribute("stroke", w.metal === "oro" ? "#5b400c" : "#3e434a");
  t.setAttribute("stroke-width", (fs / 220).toFixed(3));
  t.setAttribute("paint-order", "stroke");
  if (w.n >= 6 && w.metal === "oro") t.setAttribute("font-weight", "600");
  t.textContent = w.lemma;
  cloud.appendChild(t);
  const bb = t.getBBox();
  const pad = Math.max(1.6, fs * 0.06);
  let ok = false;
  for (let i = 0; i < 40000 && !ok; i++) {
    const th = i * 0.06, r = 0.32 * th;
    const x = CX + r * Math.cos(th) * (RX / RY) - bb.width / 2;
    const y = CY + r * Math.sin(th) - bb.height / 2;
    const box = { x: x - pad, y: y - pad, w: bb.width + 2 * pad, h: bb.height + 2 * pad };
    if (!hit(box) && inside(box)) {
      t.setAttribute("x", (x - bb.x).toFixed(2));
      t.setAttribute("y", (y - bb.y).toFixed(2));
      placed.push(box); ok = true;
    }
  }
  if (!ok) { svg.dataset.miss = (svg.dataset.miss || "") + w.lemma + " "; t.remove(); }
}
// indice a stampa in basso
const ind = document.getElementById("indice");
const order = ["agency", "atto-cultuale", "ruolo-istituzione", "formula-fissa", "colpa"];
const colX = [44, 150, 256, 362, 468], top0 = 612;
const rule = document.createElementNS(NS, "line");
Object.entries({ x1: 44, x2: 550, y1: 600, y2: 600, stroke: "url(#argento)", "stroke-width": ".3" })
  .forEach(([k, v]) => rule.setAttribute(k, v));
ind.appendChild(rule);
order.forEach((f, ci) => {
  const metal = f === "agency" ? "oro" : "argento";
  const h = document.createElementNS(NS, "text");
  h.setAttribute("x", colX[ci]); h.setAttribute("y", top0);
  h.setAttribute("font-size", "7"); h.setAttribute("fill", "url(#" + metal + ")");
  h.setAttribute("class", "sc");
  h.textContent = FAM[f];
  ind.appendChild(h);
  const items = W.filter(w => w.fam === f);
  let y = top0 + 11;
  for (const w of items) {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", colX[ci]); t.setAttribute("y", y);
    t.setAttribute("font-size", "5.2"); t.setAttribute("fill", metal === "oro" ? "#e3c977" : "#c9ced6");
    t.textContent = w.lemma;
    const n = document.createElementNS(NS, "tspan");
    n.setAttribute("fill", "#7d8592"); n.setAttribute("font-size", "4.6");
    n.textContent = "  " + w.n;
    t.appendChild(n);
    ind.appendChild(t);
    y += 5.7;
  }
});
svg.dataset.placed = cloud.childNodes.length;
</script>
</body></html>
"""

sotto = (f"{len(words)} lemmi · {len(rows)} occorrenze · {tot_schede} schede — "
         "in oro il dio che agisce, in argento l'uomo che risponde")
piede = ("Corpo del lemma proporzionale alla radice delle occorrenze · fonte: spoglio del "
         "lessico cultuale, edizione ILA")
html = (HTML.replace("__WORDS__", json.dumps(words, ensure_ascii=False))
            .replace("__FAM__", json.dumps(FAMIGLIE, ensure_ascii=False))
            .replace("__SOTTO__", sotto).replace("__PIEDE__", piede))

OUT.mkdir(parents=True, exist_ok=True)
h = OUT / "pannello-a1-lessico.html"
h.write_text(html, encoding="utf-8")
pdf = OUT / "pannello-a1-lessico.pdf"
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                "--virtual-time-budget=5000", f"--print-to-pdf={pdf}", h.as_uri()],
               check=True, capture_output=True)
print(h, pdf, sep="\n")
