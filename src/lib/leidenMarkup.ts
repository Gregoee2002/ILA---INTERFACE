/**
 * leidenMarkup.ts — ILA / MENISKOS
 * ------------------------------------------------------------------
 * Motore per l'inserimento assistito del markup Leiden/EpiDoc nella
 * sezione Edizione. Fonte normativa: skill cmrdm-epidoc (unificata, sostituisce leiden-to-epidoc).
 *
 *  - parse/serialize dell'edizione in righe (<lb n/> impliciti)
 *  - tokenizer/serializer del markup inline di ogni riga
 *  - operazioni wrap/replace/unwrap/updateAttrs su percorsi di token
 *  - catalogo delle azioni di markup (tabella di conversione completa)
 *  - validazione in tempo reale (regole non negoziabili)
 *  - scanner diagnostico epiteti separati (solo segnalazione)
 *
 * Nessuna dipendenza. Node + browser.
 * ------------------------------------------------------------------
 */

/* ================================================================ */
/* Modello dell'edizione: flusso unico di token con <lb> inline      */
/* Gli lb possono stare anche DENTRO altri elementi (persName che    */
/* attraversa il cambio riga, epiteti multiriga, supplied spezzati). */
/* ================================================================ */

import { OFFICES } from "./eagleVocab";
import {
  CULT_FAMILY_IDS,
  CULT_LEMMATA,
  lookupCultLemma,
  lemmaRefFor,
  matchCultLemma,
} from "./cultLexicon";

const AB_INDENT = "                ";      // 16 spazi (ab dentro div a 12)
const LB_INDENT = "                    ";  // 20 spazi

/** Da m.testo (inner del div edition, o testo semplice legacy) al flusso di token. */
export function parseEdition(testo: string): MarkupToken[] {
  const t = (testo || "").trim();
  if (!t) return [{ kind: "el", name: "lb", attrs: { n: "1" }, children: [], selfClosing: true }];

  if (!t.includes("<")) {
    // testo semplice legacy: newline → lb
    const out: MarkupToken[] = [];
    t.split("\n").forEach((l, i) => {
      out.push({ kind: "el", name: "lb", attrs: { n: String(i + 1) }, children: [], selfClosing: true });
      if (l.trim()) out.push({ kind: "text", value: l.trim() });
    });
    return out;
  }

  let inner = t;
  const abMatch = inner.match(/<ab[^>]*>([\s\S]*)<\/ab>/);
  if (abMatch) inner = abMatch[1];

  const tokens = tokenize(inner);
  normalizeWhitespace(tokens, true);
  return tokens;
}

/** Rimuove il whitespace di pretty-printing attorno agli lb, a ogni profondità. */
function normalizeWhitespace(tokens: MarkupToken[], root: boolean): void {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    if (tok.kind === "text") {
      tok.value = tok.value.replace(/\s*\n\s*/g, " ");
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      if (!prev || (prev.kind === "el" && prev.name === "lb")) tok.value = tok.value.replace(/^\s+/, "");
      if (!next || (next.kind === "el" && next.name === "lb")) tok.value = tok.value.replace(/\s+$/, "");
      if (!tok.value) tokens.splice(i, 1);
    } else {
      normalizeWhitespace(tok.children, false);
    }
  }
  if (root) {
    while (tokens[0]?.kind === "text" && !(tokens[0] as any).value.trim()) tokens.shift();
  }
}

/** Serializza il flusso in inner XML canonico (wrapper <ab>, un lb per riga, numerazione ricalcolata). */
export function serializeEdition(tokens: MarkupToken[]): string {
  let n = 0;
  const walkRenumber = (toks: MarkupToken[]) => {
    toks.forEach(tok => {
      if (tok.kind === "el") {
        if (tok.name === "lb") {
          n += 1;
          tok.attrs.n = String(n);
          if (n === 1) delete tok.attrs.break;
        } else walkRenumber(tok.children);
      }
    });
  };
  const copy: MarkupToken[] = JSON.parse(JSON.stringify(tokens));
  walkRenumber(copy);

  const ser = (toks: MarkupToken[]): string =>
    toks.map(tok => {
      if (tok.kind === "text") return escapeText(tok.value);
      const attrs = Object.entries(tok.attrs)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => ` ${k}="${v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")}"`)
        .join("");
      if (tok.name === "lb") return `\n${LB_INDENT}<lb${attrs}/>`;
      if (tok.selfClosing || (tok.children.length === 0 && ["gap", "space"].includes(tok.name))) return `<${tok.name}${attrs}/>`;
      return `<${tok.name}${attrs}>${ser(tok.children)}</${tok.name}>`;
    }).join("");

  return `${AB_INDENT}<ab>${ser(copy)}\n${AB_INDENT}</ab>`;
}

/** Mappa degli lb nel flusso: percorso → numero di riga, per il rendering e i controlli del gutter. */
export interface LbInfo { path: TokenPath; n: number; breakNo: boolean; atRoot: boolean; }
export function collectLbs(tokens: MarkupToken[]): LbInfo[] {
  const out: LbInfo[] = [];
  const walk = (toks: MarkupToken[], base: TokenPath) => {
    toks.forEach((tok, i) => {
      if (tok.kind !== "el") return;
      const path = [...base, i];
      if (tok.name === "lb") out.push({ path, n: out.length + 1, breakNo: tok.attrs.break === "no", atRoot: base.length === 0 });
      else walk(tok.children, path);
    });
  };
  walk(tokens, []);
  return out;
}

/* ================================================================ */
/* Tokenizer del markup inline                                       */
/* ================================================================ */

export type MarkupToken =
  | { kind: "text"; value: string }
  | { kind: "el"; name: string; attrs: Record<string, string>; children: MarkupToken[]; selfClosing: boolean };

export type TokenPath = number[];

export function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function unescapeText(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const TAG_RE = /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[^<>]*?)?)(\/?)\s*>/g;

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) attrs[m[1]] = unescapeText(m[2]);
  return attrs;
}

/** Tokenizza il markup di una riga. Lancia Error se malformato. */
export function tokenize(xml: string): MarkupToken[] {
  const root: MarkupToken[] = [];
  const stack: { name: string; children: MarkupToken[] }[] = [];
  const top = () => (stack.length > 0 ? stack[stack.length - 1].children : root);

  let last = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(xml)) !== null) {
    if (m.index > last) {
      const txt = unescapeText(xml.slice(last, m.index));
      if (txt) top().push({ kind: "text", value: txt });
    }
    const [, closing, name, rawAttrs, selfClose] = m;
    if (closing) {
      const frame = stack.pop();
      if (!frame || frame.name !== name) throw new Error(`Tag </${name}> senza apertura corrispondente`);
    } else if (selfClose) {
      top().push({ kind: "el", name, attrs: parseAttrs(rawAttrs || ""), children: [], selfClosing: true });
    } else {
      const el: MarkupToken = { kind: "el", name, attrs: parseAttrs(rawAttrs || ""), children: [], selfClosing: false };
      top().push(el);
      stack.push({ name, children: el.children });
    }
    last = m.index + m[0].length;
  }
  if (last < xml.length) {
    const txt = unescapeText(xml.slice(last));
    if (txt) top().push({ kind: "text", value: txt });
  }
  if (stack.length > 0) throw new Error(`Tag <${stack[stack.length - 1].name}> mai chiuso`);
  // controllo residuo di '<' o '>' malformati (es. <lb> n="2"/>)
  return root;
}

export function serializeTokens(tokens: MarkupToken[]): string {
  return tokens
    .map(t => {
      if (t.kind === "text") return escapeText(t.value);
      const attrs = Object.entries(t.attrs)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
        .join("");
      if (t.selfClosing || t.children.length === 0 && ["gap", "space", "lb"].includes(t.name)) {
        return `<${t.name}${attrs}/>`;
      }
      return `<${t.name}${attrs}>${serializeTokens(t.children)}</${t.name}>`;
    })
    .join("");
}

/* ── operazioni sui percorsi ───────────────────────────────────── */

export function getTokenAt(tokens: MarkupToken[], path: TokenPath): MarkupToken | null {
  let list = tokens;
  let tok: MarkupToken | null = null;
  for (const i of path) {
    tok = list[i] || null;
    if (!tok) return null;
    list = tok.kind === "el" ? tok.children : [];
  }
  return tok;
}

function cloneTokens(tokens: MarkupToken[]): MarkupToken[] {
  return JSON.parse(JSON.stringify(tokens));
}

function spliceAt(tokens: MarkupToken[], path: TokenPath, replacement: MarkupToken[]): MarkupToken[] {
  const out = cloneTokens(tokens);
  let list = out;
  for (let d = 0; d < path.length - 1; d++) {
    const t = list[path[d]];
    if (!t || t.kind !== "el") return out;
    list = t.children;
  }
  list.splice(path[path.length - 1], 1, ...replacement);
  return out;
}

/** Avvolge (o sostituisce) l'intervallo [start,end) di un token testo con l'elemento prodotto da make. */
export function applyOnTextRange(
  tokens: MarkupToken[],
  path: TokenPath,
  start: number,
  end: number,
  make: (selected: string) => MarkupToken
): MarkupToken[] {
  const tok = getTokenAt(tokens, path);
  if (!tok || tok.kind !== "text") return tokens;
  const pre = tok.value.slice(0, start);
  const sel = tok.value.slice(start, end);
  const post = tok.value.slice(end);
  const replacement: MarkupToken[] = [];
  if (pre) replacement.push({ kind: "text", value: pre });
  replacement.push(make(sel));
  if (post) replacement.push({ kind: "text", value: post });
  return spliceAt(tokens, path, replacement);
}

/**
 * Figli "effettivi" di un elemento a semantica correttiva: per <expan> solo
 * <abbr>, per <choice> solo <corr>, per <subst> solo <add> (la lettura
 * attuale/corretta) — mai la parte cancellata/superata (<del>), altrimenti
 * il testo cancellato e quello corretto finiscono concatenati. Per ogni
 * altro elemento, tutti i figli.
 */
function effectiveChildren(tok: MarkupToken & { kind: "el" }): MarkupToken[] {
  if (tok.name === "expan") {
    const abbr = tok.children.find(c => c.kind === "el" && c.name === "abbr");
    return abbr && abbr.kind === "el" ? abbr.children : tok.children;
  }
  if (tok.name === "choice") {
    const corr = tok.children.find(c => c.kind === "el" && c.name === "corr");
    return corr && corr.kind === "el" ? corr.children : tok.children;
  }
  if (tok.name === "subst") {
    const add = tok.children.find(c => c.kind === "el" && c.name === "add");
    return add && add.kind === "el" ? add.children : tok.children;
  }
  return tok.children;
}

/** Testo piano concatenato di una lista di token (per prefill e diagnostica). */
export function sliceText(tokens: MarkupToken[]): string {
  return tokens.map(t => t.kind === "text" ? t.value : t.name === "lb" ? " " : sliceText(effectiveChildren(t))).join("");
}

/**
 * Avvolge un intervallo che puo' attraversare piu' token fratelli (incluso <lb>):
 * i token intermedi finiscono DENTRO il nuovo elemento. start/end devono essere
 * token testo con lo stesso genitore.
 */
export function wrapSlice(
  tokens: MarkupToken[],
  startPath: TokenPath,
  startOffset: number,
  endPath: TokenPath,
  endOffset: number,
  compose: (slice: MarkupToken[]) => MarkupToken
): MarkupToken[] {
  const parentA = startPath.slice(0, -1).join(".");
  const parentB = endPath.slice(0, -1).join(".");
  if (parentA !== parentB) return tokens;
  const si = startPath[startPath.length - 1];
  const ei = endPath[endPath.length - 1];
  if (si === ei) {
    return applyOnTextRange(tokens, startPath, Math.min(startOffset, endOffset), Math.max(startOffset, endOffset),
      s => compose([{ kind: "text", value: s }]));
  }
  const out = cloneTokens(tokens);
  let list = out;
  for (const d of startPath.slice(0, -1)) {
    const t = list[d];
    if (!t || t.kind !== "el") return tokens;
    list = t.children;
  }
  const startTok = list[si], endTok = list[ei];
  if (!startTok || startTok.kind !== "text" || !endTok || endTok.kind !== "text") return tokens;

  const pre = startTok.value.slice(0, startOffset);
  const slice: MarkupToken[] = [];
  const selStart = startTok.value.slice(startOffset);
  if (selStart) slice.push({ kind: "text", value: selStart });
  for (let i = si + 1; i < ei; i++) slice.push(list[i]);
  const selEnd = endTok.value.slice(0, endOffset);
  if (selEnd) slice.push({ kind: "text", value: selEnd });
  const post = endTok.value.slice(endOffset);

  const replacement: MarkupToken[] = [];
  if (pre) replacement.push({ kind: "text", value: pre });
  replacement.push(compose(slice));
  if (post) replacement.push({ kind: "text", value: post });
  list.splice(si, ei - si + 1, ...replacement);
  return out;
}

/** Sostituisce un elemento con i propri figli (rimozione del markup, testo conservato). */
export function unwrapElement(tokens: MarkupToken[], path: TokenPath): MarkupToken[] {
  const tok = getTokenAt(tokens, path);
  if (!tok || tok.kind !== "el") return tokens;
  // per expan si conserva solo il contenuto di <abbr>; per choice solo <corr>;
  // per subst solo <add> (mai la lettera cancellata in <del>)
  const children = effectiveChildren(tok);
  return spliceAt(tokens, path, children);
}

export function removeElement(tokens: MarkupToken[], path: TokenPath): MarkupToken[] {
  return spliceAt(tokens, path, []);
}

export function updateElementAttrs(tokens: MarkupToken[], path: TokenPath, attrs: Record<string, string>): MarkupToken[] {
  const out = cloneTokens(tokens);
  const tok = getTokenAt(out, path);
  if (tok && tok.kind === "el") {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === "") delete tok.attrs[k];
      else tok.attrs[k] = v;
    }
  }
  return out;
}

export function appendElement(tokens: MarkupToken[], el: MarkupToken): MarkupToken[] {
  return [...cloneTokens(tokens), el];
}

/* ================================================================ */
/* Vocabolario chiavi divine (attestate nel corpus; lista estendibile)*/
/* ================================================================ */

export const DIVINE_KEYS = [
  "Men Tyrannos",
  "Men Askaenos",
  "Men Axiottenos",
];

/** Normalizzazioni note grafia greca → key (solo forme attestate; mai inventare). */
export const EPITHET_KEY_HINTS: Record<string, string> = {
  "Τύραννος": "Men Tyrannos", "Τυράννου": "Men Tyrannos", "Τυράννῳ": "Men Tyrannos",
  "Τυράνου": "Men Tyrannos", "Τυράνῳ": "Men Tyrannos",
  "Ἀσκαηνός": "Men Askaenos", "Ἀσκαηνοῦ": "Men Askaenos", "Ἀσκαηνῷ": "Men Askaenos",
  "Ἀξιοττηνός": "Men Axiottenos", "Ἀξιοττηνοῦ": "Men Axiottenos", "Ἀξιοττηνῷ": "Men Axiottenos",
  "Ἀξιοτηνός": "Men Axiottenos", "Ἀξιοττηνὸς": "Men Axiottenos",
};

export function guessDivineKey(epithet: string): string {
  const clean = epithet.trim().replace(/[.,·;]$/, "");
  return EPITHET_KEY_HINTS[clean] || "";
}

/* ================================================================ */
/* Catalogo azioni di markup (tabella di conversione completa)       */
/* ================================================================ */

export interface ActionParam {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "datalist";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  /** precompilazione a partire dal testo selezionato */
  prefill?: (selected: string) => string;
}

export interface MarkupAction {
  id: string;
  label: string;
  /** notazione Leiden mostrata come glifo nel menu */
  glyph: string;
  group: "Lacune e integrazioni" | "Lettere e correzioni" | "Nomi e luoghi" | "Numeri e date" | "Spazi e altro" | "Lessico cultuale";
  /** wrap = avvolge la selezione; replace = la sostituisce; insert = inserisce (anche senza selezione) */
  mode: "wrap" | "replace" | "insert";
  params?: ActionParam[];
  hint?: string;
  build: (selected: string, p: Record<string, string>) => MarkupToken;
  /** Composizione da slice di token (selezioni che attraversano lb): se assente, il default avvolge lo slice. */
  compose?: (slice: MarkupToken[], p: Record<string, string>) => MarkupToken;
}

const el = (name: string, attrs: Record<string, string>, children: MarkupToken[] = [], selfClosing = false): MarkupToken =>
  ({ kind: "el", name, attrs, children, selfClosing });
const txt = (value: string): MarkupToken => ({ kind: "text", value });

/** Nome frammentario (casi-complessi §1.2): <seg part> + <gap> nell'ordine giusto. */
function buildFragmentName(p: Record<string, string>, inner: MarkupToken[]): MarkupToken {
  const part = (p.part || "I").charAt(0); // "I" | "F" | "M"
  const gap = () => el("gap", { reason: "lost", extent: "unknown", unit: "character" }, [], true);
  const seg = el("seg", { part }, inner);
  const children = part === "I" ? [seg, gap()] : part === "F" ? [gap(), seg] : [gap(), seg, gap()];
  const attrs: Record<string, string> = {};
  if (p.nymRef) attrs.nymRef = p.nymRef;
  if (p.patronymic === "sì") attrs.type = "patronymic";
  return el("name", attrs, children);
}

/** Prefill teonimo/epiteto: riconosce i teonimi noti (Μην-, Ζευ-/Δι-, Απολλων- ecc.)
 *  in qualunque posizione, così Ἀγαθὰ Τύχα non viene scambiato per "teonimo Ἀγαθὰ". */
const THEONYM_STEMS = ["Μη", "Μῆ", "Ζε", "Δι", "Ἀπολλ", "Ἀπόλλ", "Ἀρτεμ", "Ἀθην", "Ἀθαν", "Τυχ", "Τύχ", "Ἡλι", "Ἥλι", "Σεληνη", "Σελήν", "Μητ", "Κυβελ", "Ἑρμ", "Ἀσκληπ"];
function guessTheonym(s: string): { theonym: string; epithet: string } {
  const words = s.trim().split(/\s+/);
  if (words.length <= 1) return { theonym: words[0] || "", epithet: "" };
  const idx = words.findIndex(w => THEONYM_STEMS.some(st => w.startsWith(st)));
  if (idx > 0) {
    // teonimo non in testa: tutto il resto è epiteto (anteposto e/o posposto)
    return { theonym: words[idx], epithet: [...words.slice(0, idx), ...words.slice(idx + 1)].join(" ") };
  }
  return { theonym: words[0], epithet: words.slice(1).join(" ") };
}

/** Sovrani/imperatori: epiteto onorifico dentro il persName (come per le divinità),
 *  MA key = identità storica nuda — decisione skill cmrdm-epidoc 2026-07, provvisoria. */
function buildRulerLike(type: "ruler" | "emperor", s: string, p: Record<string, string>): MarkupToken {
  const epi = (p.epithet || "").trim();
  let nameText = s, sep = " ", epiText = epi;
  if (epi && s.includes(epi)) {
    // l'epiteto è dentro la selezione: scindo rispettando l'ordine reale del testo
    const idx = s.indexOf(epi);
    const before = s.slice(0, idx).trimEnd();
    const after = s.slice(idx + epi.length).trimStart();
    nameText = (before + (before && after ? " " : "") + after).trim() || s.replace(epi, "").trim();
    if (idx === 0) {
      // epiteto PRIMA del nome: ordine della pietra comanda
      return el("persName", { type, key: p.key }, [
        el("rs", { type: "epithet" }, [txt(epi)]), txt(" "),
        el("name", { nymRef: p.nymRef }, [txt(nameText)]),
      ]);
    }
  }
  const children: MarkupToken[] = [el("name", { nymRef: p.nymRef }, [txt(nameText)])];
  if (epi) children.push(txt(sep), el("rs", { type: "epithet" }, [txt(epiText)]));
  return el("persName", { type, key: p.key }, children);
}

function composeRulerLike(type: "ruler" | "emperor", slice: MarkupToken[], p: Record<string, string>): MarkupToken {
  const epi = (p.epithet || "").trim();
  if (!epi) return el("persName", { type, key: p.key }, [el("name", { nymRef: p.nymRef }, slice)]);
  // selezione multi-token con epiteto dichiarato: se il primo token testo inizia
  // o finisce con l'epiteto lo scorporo, altrimenti tutto nel name e epiteto in coda
  const first = slice[0];
  if (first && first.kind === "text") {
    const t = first.value;
    if (t.trimStart().startsWith(epi)) {
      const rest = t.slice(t.indexOf(epi) + epi.length);
      const restToks: MarkupToken[] = [];
      if (rest.trim()) restToks.push(txt(rest.replace(/^\s+/, "")));
      restToks.push(...slice.slice(1));
      return el("persName", { type, key: p.key }, [
        el("rs", { type: "epithet" }, [txt(epi)]), txt(" "),
        el("name", { nymRef: p.nymRef }, restToks),
      ]);
    }
  }
  const last = slice[slice.length - 1];
  if (last && last.kind === "text" && last.value.trimEnd().endsWith(epi)) {
    const t = last.value;
    const cut = t.lastIndexOf(epi);
    const head = t.slice(0, cut);
    const nameToks = [...slice.slice(0, -1)];
    if (head.trim()) nameToks.push(txt(head.replace(/\s+$/, "")));
    return el("persName", { type, key: p.key }, [
      el("name", { nymRef: p.nymRef }, nameToks), txt(" "),
      el("rs", { type: "epithet" }, [txt(epi)]),
    ]);
  }
  return el("persName", { type, key: p.key }, [
    el("name", { nymRef: p.nymRef }, slice), txt(" "),
    el("rs", { type: "epithet" }, [txt(epi)]),
  ]);
}

export const MARKUP_ACTIONS: MarkupAction[] = [
  /* ── Lacune e integrazioni ── */
  {
    id: "supplied_lost", label: "Integrazione (lacuna)", glyph: "[αβγ]",
    group: "Lacune e integrazioni", mode: "wrap",
    hint: "Lettere perdute, integrate dall'editore",
    params: [
      { id: "cert", label: "Certezza", type: "select", options: ["sicura", "dubbia [αβγ?]"] },
    ],
    build: (s, p) => el("supplied", { reason: "lost", ...(p.cert?.startsWith("dubbia") ? { cert: "low" } : {}) }, [txt(s)]),
    compose: (slice, p) => el("supplied", { reason: "lost", ...(p.cert?.startsWith("dubbia") ? { cert: "low" } : {}) }, slice),
  },
  {
    id: "supplied_previous", label: "Testo da editori precedenti", glyph: "[K&P]",
    group: "Lacune e integrazioni", mode: "wrap",
    hint: "Pietra oggi danneggiata/perduta in quel punto: testimonianza, non congettura (Lane: \u201cKeil and Premerstein read\u2026\u201d)",
    params: [
      { id: "evidence", label: "Fonte", type: "select", options: ["previouseditor", "parallel"], hint: "previouseditor = letto da editore precedente; parallel = da testo parallelo formulare" },
    ],
    build: (s, p) => el("supplied", { reason: "undefined", evidence: p.evidence || "previouseditor" }, [txt(s)]),
    compose: (slice, p) => el("supplied", { reason: "undefined", evidence: p.evidence || "previouseditor" }, slice),
  },
  {
    id: "gap_unknown", label: "Lacuna di lunghezza ignota", glyph: "[- - -]",
    group: "Lacune e integrazioni", mode: "replace",
    params: [
      { id: "unit", label: "Unità", type: "select", options: ["character", "line"] },
    ],
    build: (_s, p) => el("gap", { reason: "lost", extent: "unknown", unit: p.unit || "character" }, [], true),
  },
  {
    id: "gap_quantity", label: "Lacuna di N caratteri/righe", glyph: "[ca. 5]",
    group: "Lacune e integrazioni", mode: "replace",
    params: [
      { id: "quantity", label: "Quantità", type: "number", required: true, placeholder: "5" },
      { id: "unit", label: "Unità", type: "select", options: ["character", "line"] },
      { id: "precision", label: "Precisione", type: "select", options: ["esatta [5]", "stimata [ca. 5]"] },
    ],
    build: (_s, p) => el("gap", {
      reason: "lost", quantity: p.quantity, unit: p.unit || "character",
      ...(p.precision?.startsWith("stimata") ? { precision: "low" } : {}),
    }, [], true),
  },
  {
    id: "gap_range", label: "Lacuna di N–M caratteri", glyph: "[2-4]",
    group: "Lacune e integrazioni", mode: "replace",
    params: [
      { id: "atLeast", label: "Minimo", type: "number", required: true, placeholder: "2" },
      { id: "atMost", label: "Massimo", type: "number", required: true, placeholder: "4" },
    ],
    build: (_s, p) => el("gap", { reason: "lost", atLeast: p.atLeast, atMost: p.atMost, unit: "character" }, [], true),
  },
  {
    id: "gap_illegible", label: "Testo illeggibile", glyph: "·····",
    group: "Lacune e integrazioni", mode: "replace",
    hint: "Tracce visibili ma non identificabili",
    params: [
      { id: "unit", label: "Unità", type: "select", options: ["character", "line"], required: true },
      { id: "quantity", label: "Quantità (vuoto = ignota)", type: "number", placeholder: "" },
    ],
    build: (_s, p) =>
      p.quantity
        ? el("gap", { reason: "illegible", quantity: p.quantity, unit: p.unit || "character" }, [], true)
        : el("gap", { reason: "illegible", extent: "unknown", unit: p.unit || "character" }, [], true),
  },
  /* ── Lettere e correzioni ── */
  {
    id: "unclear", label: "Lettere incerte", glyph: "ạḅ",
    group: "Lettere e correzioni", mode: "wrap",
    hint: "Danneggiate ma leggibili (puntini sottoscritti)",
    build: (s) => el("unclear", {}, [txt(s)]),
    compose: (slice) => el("unclear", {}, slice),
  },
  {
    id: "expan", label: "Abbreviazione sciolta", glyph: "(αβγ)",
    group: "Lettere e correzioni", mode: "wrap",
    hint: "La selezione è la forma sulla pietra; indica lo scioglimento",
    params: [{ id: "ex", label: "Scioglimento", type: "text", required: true, placeholder: "lettere integrate" }],
    build: (s, p) => el("expan", {}, [el("abbr", {}, [txt(s)]), el("ex", {}, [txt(p.ex)])]),
    compose: (slice, p) => el("expan", {}, [el("abbr", {}, slice), el("ex", {}, [txt(p.ex)])]),
  },
  {
    id: "supplied_omitted", label: "Omesse dal lapicida", glyph: "⟨αβγ⟩",
    group: "Lettere e correzioni", mode: "wrap",
    build: (s) => el("supplied", { reason: "omitted" }, [txt(s)]),
    compose: (slice) => el("supplied", { reason: "omitted" }, slice),
  },
  {
    id: "surplus", label: "Lettere spurie", glyph: "{αβγ}",
    group: "Lettere e correzioni", mode: "wrap",
    hint: "Da espungere",
    build: (s) => el("surplus", {}, [txt(s)]),
    compose: (slice) => el("surplus", {}, slice),
  },
  {
    id: "corr", label: "Correzione editoriale", glyph: "«αβγ»",
    group: "Lettere e correzioni", mode: "wrap",
    hint: "La selezione è la forma corretta; indica la forma sulla pietra",
    params: [{ id: "sic", label: "Sulla pietra (sic)", type: "text", required: true, placeholder: "forma errata del lapicida" }],
    build: (s, p) => el("choice", {}, [el("sic", {}, [txt(p.sic)]), el("corr", {}, [txt(s)])]),
    compose: (slice, p) => el("choice", {}, [el("sic", {}, [txt(p.sic)]), el("corr", {}, slice)]),
  },
  /* ── Nomi e luoghi ── */
  {
    id: "divine", label: "Divinità + epiteto", glyph: "☾",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Teonimo ed epiteto nello stesso persName — mai separati",
    params: [
      { id: "theonym", label: "Teonimo (nel testo)", type: "text", required: true, prefill: s => guessTheonym(s).theonym, hint: "l\u2019ordine del testo comanda: pu\u00f2 anche venire dopo l\u2019epiteto" },
      { id: "epithet", label: "Epiteto (nel testo)", type: "text", prefill: s => guessTheonym(s).epithet },
      { id: "nymRef", label: "Lemma (nymRef)", type: "text", required: true, prefill: () => "Μήν", hint: "sul <name>, mai sul persName" },
      { id: "key", label: "Key normalizzato", type: "datalist", options: DIVINE_KEYS, required: true, prefill: s => guessDivineKey(s.trim().split(/\s+/).slice(1).join(" ")), placeholder: "Men …" },
    ],
    build: (s, p) => {
      const epi = (p.epithet || "").trim();
      // ordine della pietra: se nella selezione l'epiteto viene prima del teonimo, rispettalo
      if (epi && p.theonym && s.indexOf(epi) !== -1 && s.indexOf(p.theonym) > s.indexOf(epi)) {
        return el("persName", { type: "divine", key: p.key }, [
          el("rs", { type: "epithet" }, [txt(epi)]), txt(" "),
          el("name", { nymRef: p.nymRef || "Μήν" }, [txt(p.theonym)]),
        ]);
      }
      const children: MarkupToken[] = [el("name", { nymRef: p.nymRef || "Μήν" }, [txt(p.theonym)])];
      if (epi) children.push(txt(" "), el("rs", { type: "epithet" }, [txt(epi)]));
      return el("persName", { type: "divine", key: p.key }, children);
    },
    compose: (slice, p) => {
      // L'ordine sulla pietra comanda (skill §2.1): l'epiteto può PRECEDERE il
      // teonimo (es. Ἀγαθὰ Τύχα). Guardo dove sta il teonimo dichiarato nel testo:
      // ciò che lo precede diventa epiteto anteposto, ciò che lo segue epiteto posposto.
      const first = slice[0];
      if (!first || first.kind !== "text") {
        return el("persName", { type: "divine", key: p.key }, [el("name", { nymRef: p.nymRef || "Μήν" }, slice)]);
      }
      const text = first.value;
      const theo = (p.theonym || "").trim();
      const theoIdx = theo ? text.indexOf(theo) : 0;

      if (theo && theoIdx > 0) {
        // epiteto (o parte del testo) PRIMA del teonimo
        const before = text.slice(0, theoIdx);
        const sepBefore = before.match(/\s+$/)?.[0] || " ";
        const epiBefore = before.slice(0, before.length - (sepBefore === " " && !before.endsWith(" ") ? 0 : sepBefore.length)).trimEnd();
        let rest = text.slice(theoIdx + theo.length);
        const sepAfter = rest.match(/^\s+/)?.[0] || "";
        rest = rest.slice(sepAfter.length);
        const children: MarkupToken[] = [];
        if (epiBefore) children.push(el("rs", { type: "epithet" }, [txt(epiBefore)]), txt(sepBefore));
        children.push(el("name", { nymRef: p.nymRef || "Μήν" }, [txt(theo)]));
        const epithetAfter: MarkupToken[] = [];
        if (rest) epithetAfter.push(txt(rest));
        epithetAfter.push(...slice.slice(1));
        if (epithetAfter.length > 0) children.push(txt(sepAfter || " "), el("rs", { type: "epithet" }, epithetAfter));
        return el("persName", { type: "divine", key: p.key }, children);
      }

      // caso standard: teonimo in testa
      let cut = theo && text.startsWith(theo) ? theo.length : (text.match(/^\S+/)?.[0].length ?? text.length);
      const theonym = text.slice(0, cut);
      let rest = text.slice(cut);
      const sep = rest.match(/^\s+/)?.[0] || "";
      rest = rest.slice(sep.length);
      const epithetSlice: MarkupToken[] = [];
      if (rest) epithetSlice.push(txt(rest));
      epithetSlice.push(...slice.slice(1));
      const children: MarkupToken[] = [el("name", { nymRef: p.nymRef || "Μήν" }, [txt(theonym)])];
      if (epithetSlice.length > 0) children.push(txt(sep || " "), el("rs", { type: "epithet" }, epithetSlice));
      return el("persName", { type: "divine", key: p.key }, children);
    },
  },
  {
    id: "divine_freeform", label: "Divinità (nome libero)", glyph: "☾ —",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Il teonimo compare da solo, o come frase intera non scomponibile in nome+epiteto",
    params: [
      { id: "key", label: "Key normalizzato", type: "datalist", options: DIVINE_KEYS, required: true, placeholder: "Men … (solo teonimo, senza epiteto)" },
    ],
    build: (s, p) => el("persName", { type: "divine", key: p.key }, [txt(s)]),
    compose: (slice, p) => el("persName", { type: "divine", key: p.key }, slice),
  },
  {
    id: "person_attested", label: "Persona attestata", glyph: "Ξάνθος",
    group: "Nomi e luoghi", mode: "wrap",
    params: [
      { id: "key", label: "Key (forma normalizzata)", type: "text", required: true, placeholder: "Xanthos" },
      { id: "nymRef", label: "Lemma greco (nominativo)", type: "text", required: true, placeholder: "Ξάνθος" },
    ],
    build: (s, p) => el("persName", { type: "attested", key: p.key }, [el("name", { nymRef: p.nymRef }, [txt(s)])]),
    compose: (slice, p) => el("persName", { type: "attested", key: p.key }, [el("name", { nymRef: p.nymRef }, slice)]),
  },
  {
    id: "person_ruler", label: "Sovrano", glyph: "Εὐμένους",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Re, dinasti ellenistici. Epiteto onorifico annidato; il key resta l\u2019identità nuda (Eumene II, non Eumene II Theos)",
    params: [
      { id: "key", label: "Key (identità storica nuda)", type: "text", required: true, placeholder: "Eumene II" },
      { id: "nymRef", label: "Lemma greco (nominativo)", type: "text", required: true, placeholder: "Εὐμένης" },
      { id: "epithet", label: "Epiteto onorifico (nel testo)", type: "text", placeholder: "θεοῦ (se presente)" },
    ],
    build: (s, p) => buildRulerLike("ruler", s, p),
    compose: (slice, p) => composeRulerLike("ruler", slice, p),
  },
  {
    id: "person_emperor", label: "Imperatore", glyph: "Ἁδριανοῦ",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Imperatori romani. Epiteto onorifico annidato; il key resta l\u2019identità nuda",
    params: [
      { id: "key", label: "Key (identità storica nuda)", type: "text", required: true, placeholder: "Hadrianus" },
      { id: "nymRef", label: "Lemma greco (nominativo)", type: "text", required: true, placeholder: "Ἁδριανός" },
      { id: "epithet", label: "Epiteto onorifico (nel testo)", type: "text", placeholder: "θεοῦ (se presente)" },
    ],
    build: (s, p) => buildRulerLike("emperor", s, p),
    compose: (slice, p) => composeRulerLike("emperor", slice, p),
  },
  {
    id: "patronymic", label: "Nome + patronimico", glyph: "Ἀπολλόδωρος Μητροφάνου",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Seleziona nome e patronimico insieme: persName annidato, come in 52.xml",
    params: [
      { id: "ownKey", label: "Key persona", type: "text", required: true, prefill: s => s.trim().split(/\s+/)[0] || "", placeholder: "Apollodoros" },
      { id: "ownNymRef", label: "Lemma persona (nominativo)", type: "text", required: true, prefill: s => s.trim().split(/\s+/)[0] || "" },
      { id: "fatherKey", label: "Key padre", type: "text", required: true, placeholder: "Metrophanes" },
      { id: "fatherNymRef", label: "Lemma padre (nominativo)", type: "text", required: true },
    ],
    build: (s, p) => {
      const words = s.trim().split(/\s+/);
      const own = words[0] || s;
      const rest = words.slice(1).join(" ");
      const inner = el("persName", { type: "attested", key: p.fatherKey }, [el("name", { type: "patronymic", nymRef: p.fatherNymRef }, [txt(rest || s)])]);
      return el("persName", { type: "attested", key: `${p.ownKey} figlio di ${p.fatherKey}` }, [
        el("name", { nymRef: p.ownNymRef }, [txt(own)]), txt(" "), inner,
      ]);
    },
    compose: (slice, p) => {
      const first = slice[0];
      const own = first && first.kind === "text" ? (first.value.match(/^\S+/)?.[0] ?? "") : "";
      const restFirst = first && first.kind === "text" ? first.value.slice(own.length).replace(/^\s+/, "") : "";
      const fatherSlice: MarkupToken[] = [];
      if (restFirst) fatherSlice.push(txt(restFirst));
      fatherSlice.push(...slice.slice(1));
      const inner = el("persName", { type: "attested", key: p.fatherKey }, [el("name", { type: "patronymic", nymRef: p.fatherNymRef }, fatherSlice)]);
      return el("persName", { type: "attested", key: `${p.ownKey} figlio di ${p.fatherKey}` }, [
        el("name", { nymRef: p.ownNymRef }, [txt(own)]), txt(" "), inner,
      ]);
    },
  },
  {
    id: "office", label: "Carica (vocabolario)", glyph: "στραταγός",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Cariche del vocabolario controllato office — key = id traslitterato",
    params: [
      {
        id: "key", label: "Carica", type: "datalist", required: true,
        options: OFFICES.map(o => `${o.id} — ${o.label}`),
        placeholder: "strategos, hiereus…",
        hint: "se la carica non è in elenco, usare «Carica / titolo (generico)» e segnalarla",
      },
    ],
    build: (s, p) => el("rs", { type: "office", key: p.key.split(" — ")[0].trim() }, [txt(s)]),
    compose: (slice, p) => el("rs", { type: "office", key: p.key.split(" — ")[0].trim() }, slice),
  },
  {
    id: "official", label: "Carica / titolo (generico)", glyph: "βασιλέως",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Istituzioni e titoli non nel vocabolario (il re, il popolo, l\u2019assemblea) — senza key",
    build: (s) => el("rs", { type: "official" }, [txt(s)]),
    compose: (slice) => el("rs", { type: "official" }, slice),
  },
  {
    id: "ethnic", label: "Etnico", glyph: "Λυκίου",
    group: "Nomi e luoghi", mode: "wrap",
    params: [
      { id: "nymRef", label: "Lemma (nominativo)", type: "text", required: true, placeholder: "Λύκιος" },
      { id: "ref", label: "URI Pleiades (se certo)", type: "text", placeholder: "https://pleiades.stoa.org/places/…", hint: "mai dedotto" },
    ],
    build: (s, p) => {
      const attrs: Record<string, string> = { type: "ethnic", nymRef: p.nymRef };
      if (p.ref) attrs.ref = p.ref;
      return el("placeName", attrs, [txt(s)]);
    },
    compose: (slice, p) => {
      const attrs: Record<string, string> = { type: "ethnic", nymRef: p.nymRef };
      if (p.ref) attrs.ref = p.ref;
      return el("placeName", attrs, slice);
    },
  },
  /* ── Numeri e date (skill cmrdm-epidoc, casi-complessi §5-§6) ── */
  {
    id: "num", label: "Numerale", glyph: "ρκγʹ",
    group: "Numeri e date", mode: "wrap",
    hint: "Numeri scritti a lettere o con segni alfabetici",
    params: [
      { id: "numtype", label: "Tipo", type: "select", options: ["cardinal", "ordinal", "fraction", "total"] },
      { id: "value", label: "Valore (cifre arabe)", type: "text", required: true, placeholder: "63 · 0.5 per frazioni" },
      { id: "alphabetic", label: "Notazione", type: "select", options: ["a lettere (ἑκατόν)", "segni alfabetici (γξ)"] },
    ],
    build: (s, p) => {
      const inner: MarkupToken[] = p.alphabetic?.startsWith("segni")
        ? [el("g", { type: "alphabetic" }, [txt(s)])]
        : [txt(s)];
      return el("num", { type: p.numtype || "cardinal", value: p.value }, inner);
    },
    compose: (slice, p) => {
      const inner: MarkupToken[] = p.alphabetic?.startsWith("segni")
        ? [el("g", { type: "alphabetic" }, slice)]
        : slice;
      return el("num", { type: p.numtype || "cardinal", value: p.value }, inner);
    },
  },
  {
    id: "measure_currency", label: "Somma di denaro", glyph: "𐅵 δρ.",
    group: "Numeri e date", mode: "wrap",
    hint: "Multe delle stele di confessione, conti di santuario",
    params: [
      { id: "unit", label: "Unità monetaria", type: "datalist", options: ["drachma", "denarius", "obol", "talent", "as"], required: true, prefill: () => "drachma" },
    ],
    build: (s, p) => el("measure", { type: "currency", unit: p.unit }, [txt(s)]),
    compose: (slice, p) => el("measure", { type: "currency", unit: p.unit }, slice),
  },
  {
    id: "ligature", label: "Legatura di segni", glyph: "Ϡ͡α",
    group: "Numeri e date", mode: "wrap",
    build: (s) => el("hi", { rend: "ligature" }, [txt(s)]),
    compose: (slice) => el("hi", { rend: "ligature" }, slice),
  },
  {
    id: "date_internal", label: "Data interna al testo", glyph: "ἔτους σξγʹ",
    group: "Numeri e date", mode: "wrap",
    hint: "La formula resta nel testo; la conversione va nell'origDate del header (evidence=internal-date)",
    params: [
      { id: "calendar", label: "Calendario", type: "datalist", options: ["sullan", "julian", "egyptian", "actian"], required: true, prefill: () => "sullan" },
      { id: "xmlid", label: "xml:id (per doppia datazione)", type: "text", placeholder: "d1 (opzionale)" },
    ],
    build: (s, p) => el("date", { calendar: p.calendar, ...(p.xmlid ? { "xml:id": p.xmlid } : {}) }, [txt(s)]),
    compose: (slice, p) => el("date", { calendar: p.calendar, ...(p.xmlid ? { "xml:id": p.xmlid } : {}) }, slice),
  },
  {
    id: "month", label: "Nome di mese", glyph: "Πανήμου",
    group: "Numeri e date", mode: "wrap",
    params: [
      { id: "key", label: "Key (traslitterato, nominativo)", type: "text", required: true, placeholder: "Panemos" },
    ],
    build: (s, p) => el("rs", { type: "months", key: p.key }, [txt(s)]),
    compose: (slice, p) => el("rs", { type: "months", key: p.key }, slice),
  },
  {
    id: "age_at_death", label: "Età alla morte", glyph: "ἐτῶν λʹ",
    group: "Numeri e date", mode: "wrap",
    hint: "Negli epitaffi; durata in formato ISO-8601",
    params: [
      { id: "years", label: "Anni", type: "number", required: true, placeholder: "30" },
    ],
    build: (s, p) => el("date", { dur: `P${p.years}Y` }, [txt(s)]),
    compose: (slice, p) => el("date", { dur: `P${p.years}Y` }, slice),
  },
  /* ── Lapicida e paleografia (casi-complessi §4, §1.2, tabella base) ── */
  {
    id: "orig", label: "Lettere non interpretabili", glyph: "ΑΒΓ",
    group: "Lettere e correzioni", mode: "wrap",
    hint: "Sequenza leggibile ma senza senso ricostruibile",
    build: (s) => el("orig", {}, [txt(s)]),
    compose: (slice) => el("orig", {}, slice),
  },
  {
    id: "subst_overstrike", label: "Lettera riscritta dal lapicida", glyph: "ρ→ἰ",
    group: "Lettere e correzioni", mode: "wrap",
    hint: "Seleziona la lettera DEFINITIVA; indica cosa c'era prima. Distinta dalla correzione editoriale",
    params: [
      { id: "prima", label: "Lettera sottostante (cancellata)", type: "text", required: true, placeholder: "ρ" },
    ],
    build: (s, p) => el("subst", {}, [
      el("del", { rend: "corrected" }, [txt(p.prima)]),
      el("add", { place: "overstrike" }, [txt(s)]),
    ]),
    compose: (slice, p) => el("subst", {}, [
      el("del", { rend: "corrected" }, [txt(p.prima)]),
      el("add", { place: "overstrike" }, slice),
    ]),
  },
  {
    id: "add_overstrike", label: "Lettera aggiunta sopra il rigo", glyph: "τιμ⁺η",
    group: "Lettere e correzioni", mode: "wrap",
    hint: "Aggiunta del lapicida in un secondo momento",
    build: (s) => el("add", { place: "overstrike" }, [txt(s)]),
    compose: (slice) => el("add", { place: "overstrike" }, slice),
  },
  {
    id: "name_fragment", label: "Nome frammentario", glyph: "Πολυ[…]",
    group: "Nomi e luoghi", mode: "wrap",
    hint: "Resta solo l'inizio/fine/parte del nome. Seleziona SOLO le lettere superstiti; identità ignota = niente key",
    params: [
      { id: "part", label: "Frammento", type: "select", options: ["I — iniziale (fine perduta)", "F — finale (inizio perduto)", "M — mediano"], required: true },
      { id: "nymRef", label: "nymRef con underscore (se lemma parziale)", type: "text", placeholder: "#Πολυ_ · #_νιος (opzionale)" },
      { id: "patronymic", label: "È un patronimico?", type: "select", options: ["no", "sì"] },
    ],
    build: (s, p) => buildFragmentName(p, [txt(s)]),
    compose: (slice, p) => buildFragmentName(p, slice),
  },
  /* ── Spazi e altro ── */
  {
    id: "space", label: "Vacat", glyph: "vac.",
    group: "Spazi e altro", mode: "insert",
    params: [
      { id: "quantity", label: "Quantità (vuoto = ignota)", type: "number", placeholder: "1" },
      { id: "unit", label: "Unità", type: "select", options: ["character", "line"] },
    ],
    build: (_s, p) => el("space", {
      unit: p.unit || "character",
      ...(p.quantity ? { quantity: p.quantity } : { extent: "unknown" }),
    }, [], true),
  },
  /* ── Lessico cultuale (tassonomia cult-functions) ──
   * Marcatura selettiva del vocabolario in docs/tassonomia-funzioni-cultuali.md §5.
   * Una sola domanda per l'editor: «chi è il soggetto dell'azione, il dio o l'uomo?».
   * La sotto-funzione fine NON si sceglie: si ricava dal @lemma (cultLexicon.ts). */
  {
    id: "cult_word", label: "Funzione cultuale (parola)", glyph: "ἀνέθηκεν",
    group: "Lessico cultuale", mode: "wrap",
    hint: "Una parola del lessico cultuale controllato → <w lemma ana>. Solo i lemmi in tabella §5.",
    params: [
      {
        id: "family", label: "Famiglia (@ana)", type: "select",
        options: [...CULT_FAMILY_IDS], required: true,
        hint: "chi è il soggetto: dio → agency; uomo che agisce → atto-cultuale; uomo che trasgredisce → colpa; ruolo/istituzione → ruolo-istituzione; formula di genere senza testa → formula-fissa",
        prefill: s => matchCultLemma(s)?.family || "",
      },
      {
        id: "lemma", label: "Lemma (@lemma)", type: "datalist",
        options: [...CULT_LEMMATA], required: true,
        placeholder: "forma di citazione greca (dizionario)",
        hint: "54 lemmi controllati; se manca, segnalarlo — non inventare",
        prefill: s => matchCultLemma(s)?.lemma || "",
      },
      { id: "formula", label: "In locuzione fissa?", type: "select", options: ["no", "sì"], hint: "aggiunge #formula oltre alla famiglia" },
    ],
    build: (s, p) => el("w", cultWordAttrs(p), [txt(s)]),
    compose: (slice, p) => el("w", cultWordAttrs(p), slice),
  },
  {
    id: "cult_formula", label: "Funzione cultuale (formula)", glyph: "ὗε κύε",
    group: "Lessico cultuale", mode: "wrap",
    hint: "Un sintagma/formula → <rs type=\"cultFormula\">. Le parole interne si marcano poi con «Funzione cultuale (parola)».",
    params: [
      { id: "key", label: "Key (handle normalizzato)", type: "text", required: true, placeholder: "hye-kye, stelographein-dynameis…", prefill: s => s.trim().toLowerCase().replace(/[^\p{L}\s-]/gu, "").replace(/\s+/g, "-").slice(0, 40) },
      {
        id: "family", label: "Famiglia della testa (@ana)", type: "select",
        options: [...CULT_FAMILY_IDS], required: true,
        hint: "la famiglia della testa del sintagma; #formula viene aggiunto sempre",
      },
    ],
    build: (s, p) => el("rs", { type: "cultFormula", key: p.key, ana: `#${p.family} #formula` }, [txt(s)]),
    compose: (slice, p) => el("rs", { type: "cultFormula", key: p.key, ana: `#${p.family} #formula` }, slice),
  },
];

/** Attributi di un <w> di funzione cultuale. Se il lemma è noto e la famiglia
 *  non è stata toccata, la famiglia viene dalla tabella; l'editor può sempre
 *  correggerla scegliendola nel menu. @lemmaRef aggiunto solo se ricavabile. */
function cultWordAttrs(p: Record<string, string>): Record<string, string> {
  const known = lookupCultLemma(p.lemma);
  const family = p.family || known?.family || "atto-cultuale";
  const ana = p.formula === "sì" ? `#${family} #formula` : `#${family}`;
  const ref = lemmaRefFor(p.lemma);
  return { lemma: p.lemma, ana, ...(ref ? { lemmaRef: ref } : {}) };
}

/* ================================================================ */
/* Validazione                                                       */
/* ================================================================ */

export interface ValidationIssue {
  severity: "error" | "warning";
  line: number; // 1-based; 0 = globale
  message: string;
}

const LEIDEN_RESIDUE = /[\[\]]|(- - -)|\{|\}/;

/** Valida il flusso di token dell'edizione (gli lb possono stare a qualunque profondità). */
export function validateEditionTokens(tokens: MarkupToken[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let lineN = 0;
  let firstLb = true;
  let lastTextTok: { value: string; line: number } | null = null;

  // Testo che sembra un attributo finito FUORI dalle parentesi angolari
  // (l'errore classico <lb> n="2"/> — skill §7 ERROR)
  const ATTR_IN_TEXT = /[a-zA-Z:_-]+\s*=\s*"[^"]*"\s*\/?>?/;

  const walk = (toks: MarkupToken[], ancestors: string[]) => {
    toks.forEach((t, i) => {
      if (t.kind === "text") {
        if (LEIDEN_RESIDUE.test(t.value)) {
          issues.push({ severity: "warning", line: lineN || 1, message: "Notazione Leiden non convertita nel testo ([ ], { }, - - -): usare le azioni di markup." });
        }
        if (ATTR_IN_TEXT.test(t.value)) {
          issues.push({ severity: "error", line: lineN || 1, message: `Attributo fuori dalle parentesi angolari nel testo («${t.value.trim().slice(0, 30)}…»): probabilmente un tag scritto male, es. <lb> n="2"/>.` });
        }
        lastTextTok = { value: t.value, line: lineN || 1 };
        return;
      }
      const a = t.attrs;

      // ── attributi vuoti: vietati sempre (skill: principio cardinale §2 + §7 ERROR) ──
      Object.entries(a).forEach(([k, v]) => {
        if (v === "") {
          issues.push({ severity: "error", line: lineN || 1, message: `Attributo vuoto ${k}="" su <${t.name}>: se il valore è ignoto, l'attributo si omette.` });
        }
      });

      // ── unit: solo ASCII "character"|"line" (refuso classico: characteρ con rho greca) ──
      if (a.unit && a.unit !== "character" && a.unit !== "line") {
        const hasNonAscii = /[^\x00-\x7F]/.test(a.unit);
        issues.push({
          severity: "error", line: lineN || 1,
          message: hasNonAscii
            ? `unit="${a.unit}" contiene caratteri non-ASCII (probabile lettera greca omoglifa, es. ρ per r): correggere in "character" o "line".`
            : `unit="${a.unit}" non valido: ammessi solo "character" e "line".`,
        });
      }

      if (t.name === "lb") {
        lineN += 1;
        if (firstLb && a.break === "no") {
          issues.push({ severity: "error", line: 1, message: 'break="no" sulla prima riga: la continuazione si marca sulla riga che riceve.' });
        }
        if (lastTextTok && /-\s*$/.test(lastTextTok.value)) {
          issues.push({ severity: "warning", line: lastTextTok.line, message: `Trattino Leiden a fine riga: rimuoverlo e attivare break="no" sulla riga ${lineN}.` });
        }
        firstLb = false;
        lastTextTok = null;
        return;
      }
      if (t.name === "persName" && a.nymRef) {
        issues.push({ severity: "error", line: lineN || 1, message: "nymRef su <persName>: va sul <name> figlio." });
      }
      if (t.name === "rs" && a.type === "epithet") {
        if (a.nymRef) issues.push({ severity: "error", line: lineN || 1, message: 'nymRef su <rs type="epithet">: non è ammesso.' });
        if (a.key) issues.push({ severity: "error", line: lineN || 1, message: 'key su <rs type="epithet">: il key sta solo sul <persName> (convenzione ILA, diversa da IGCyr).' });
        if (!ancestors.includes("persName")) {
          // UNICO caso legittimo (skill casi-complessi §2.3): epiteto plurale condiviso
          // dopo 2+ divinità coordinate. Se lo riconosco → warning informativo, non errore.
          const precedingDivine = toks.slice(0, i).filter(
            s => s.kind === "el" && s.name === "persName" && s.attrs.type === "divine"
          ).length;
          if (precedingDivine >= 2) {
            issues.push({ severity: "warning", line: lineN || 1, message: "Epiteto standalone dopo divinità coordinate: legittimo SOLO se è l'epiteto plurale condiviso (§2.3) — i key dei persName devono già contenerlo. Annotare nel report." });
          } else {
            issues.push({ severity: "error", line: lineN || 1, message: "Epiteto fuori dal <persName>: teonimo/nome ed epiteto vanno annidati nello stesso persName (vale anche per sovrani e imperatori)." });
          }
        }
      }
      if (t.name === "persName" && a.type === "divine") {
        const hasNameChild = t.children.some(c => c.kind === "el" && c.name === "name");
        const hasOnlyText = t.children.every(c => c.kind === "text");
        // pattern "a frase intera" (skill): persName con solo testo è legittimo — nessun warning
        if (!hasNameChild && !hasOnlyText) {
          issues.push({ severity: "warning", line: lineN || 1, message: "persName divine con figli strutturati ma senza <name>: o si scompone (name + rs epithet), o si usa il pattern a frase intera (solo testo)." });
        }
        if (!a.key) issues.push({ severity: "warning", line: lineN || 1, message: "persName divine senza key normalizzato." });
      }
      if ((t.name === "persName") && (a.type === "ruler" || a.type === "emperor") && a.key) {
        // key nudo per ruler/emperor (DECISIONE 2026-07): l'epiteto NON entra nel key
        const epithetChild = t.children.find(c => c.kind === "el" && c.name === "rs" && c.attrs.type === "epithet");
        if (epithetChild) {
          const epiText = collectText(epithetChild).trim();
          if (epiText && a.key.toLowerCase().includes("theos")) {
            issues.push({ severity: "warning", line: lineN || 1, message: `key="${a.key}" sembra includere l'epiteto: per sovrani/imperatori il key resta l'identità storica nuda (es. "Eumene II", non "Eumene II Theos").` });
          }
        }
      }
      if (t.name === "rs" && a.type === "office" && !a.key) {
        issues.push({ severity: "warning", line: lineN || 1, message: 'rs type="office" senza key: se la carica non è nel vocabolario usare type="official"; se c\u2019è, indicare il key traslitterato. Segnalare nel report le cariche candidate all\u2019aggiunta.' });
      }
      if (t.name === "gap") {
        if (a.quantity === "0") issues.push({ severity: "error", line: lineN || 1, message: 'gap con quantity="0": per lunghezza ignota usare extent="unknown".' });
        if (!a.quantity && !a.atLeast && !a.extent) {
          issues.push({ severity: "error", line: lineN || 1, message: 'gap senza quantity né extent="unknown".' });
        }
      }

      // ── lessico cultuale (tassonomia cult-functions) ──
      if (t.name === "w") {
        const anaFams = (a.ana || "").split(/\s+/).map(x => x.replace(/^#/, "")).filter(Boolean);
        const famToken = anaFams.find(x => (CULT_FAMILY_IDS as readonly string[]).includes(x));
        if (!a.lemma) {
          issues.push({ severity: "warning", line: lineN || 1, message: "<w> senza @lemma: indicare la forma di citazione controllata (tabella §5)." });
        }
        if (!a.ana) {
          issues.push({ severity: "error", line: lineN || 1, message: "<w> senza @ana: manca la famiglia cult-functions (#agency / #atto-cultuale / #colpa / #formula-fissa / #ruolo-istituzione, + #formula se in locuzione)." });
        } else {
          const bad = anaFams.filter(x =>
            !(CULT_FAMILY_IDS as readonly string[]).includes(x) &&
            x !== "formula" &&
            !/^(v|n|adj|ptcp|adv)-/i.test(x) // tratto morfologico compatto facoltativo (doc §4)
          );
          if (bad.length > 0) {
            issues.push({ severity: "error", line: lineN || 1, message: `Valore @ana non valido (${bad.map(x => "#" + x).join(", ")}): usa #agency / #atto-cultuale / #colpa / #formula-fissa / #ruolo-istituzione (+ #formula).` });
          }
        }
        if (a.lemma) {
          const known = lookupCultLemma(a.lemma);
          if (!known) {
            issues.push({ severity: "warning", line: lineN || 1, message: `Lemma «${a.lemma}» fuori dal vocabolario controllato: verificare, o aggiungerlo alla tabella in cultLexicon.ts.` });
          } else if (famToken && known.family !== famToken) {
            issues.push({ severity: "warning", line: lineN || 1, message: `Il lemma «${a.lemma}» di solito è #${known.family}, qui è marcato #${famToken}: confermare se è voluto.` });
          }
        }
        const semAncestor = ["persName", "name", "rs", "supplied", "expan"].find(x => ancestors.includes(x));
        if (semAncestor) {
          issues.push({ severity: "warning", line: lineN || 1, message: `<w> di funzione cultuale dentro <${semAncestor}>: quasi sempre un errore (gli epiteti restano in persName / rs type="epithet", non in <w>). Valutare se serve davvero.` });
        }
      }
      if (t.name === "rs" && (a.type === "cultTerm" || a.type === "cultFormula")) {
        if (!a.ana) {
          issues.push({ severity: "error", line: lineN || 1, message: `<rs type="${a.type}"> senza @ana: manca la famiglia cult-functions.` });
        }
      }

      walk(t.children, [...ancestors, t.name]);
    });
  };
  walk(tokens, []);
  return issues;
}

/** Testo piano contenuto in un token (ricorsivo). */
function collectText(t: MarkupToken): string {
  if (t.kind === "text") return t.value;
  return effectiveChildren(t).map(collectText).join("");
}

/* ================================================================ */
/* Scanner diagnostico epiteti separati (solo segnalazione)          */
/* ================================================================ */

export interface EpithetScanIssue {
  filename: string;
  snippet: string;
  problem: string;
}

/** Analizza un intero file XML e segnala teonimi/epiteti non annidati. Non modifica nulla. */
export function scanEpithetIssues(xml: string, filename: string): EpithetScanIssue[] {
  const issues: EpithetScanIssue[] = [];
  const edMatch = xml.match(/<div type="edition"[^>]*>([\s\S]*?)<\/div>/);
  if (!edMatch) return issues;
  const edition = edMatch[1];

  // 1) rs type="epithet" non annidato in un persName
  const rsRe = /<rs\s+[^>]*type="epithet"[^>]*>([\s\S]*?)<\/rs>/g;
  let m: RegExpExecArray | null;
  while ((m = rsRe.exec(edition)) !== null) {
    const before = edition.slice(0, m.index);
    const opens = (before.match(/<persName\b[^>]*>/g) || []).length;
    const closes = (before.match(/<\/persName>/g) || []).length;
    if (opens <= closes) {
      issues.push({
        filename,
        snippet: m[0].replace(/\s+/g, " ").slice(0, 90),
        problem: "Epiteto fuori dal persName: va annidato insieme al teonimo nello stesso <persName>.",
      });
    }
    // attributi vietati sull'rs
    if (/nymRef=/.test(m[0])) issues.push({ filename, snippet: m[0].replace(/\s+/g, " ").slice(0, 90), problem: "nymRef su rs type=\"epithet\" (non ammesso)." });
    if (/key=/.test(m[0])) issues.push({ filename, snippet: m[0].replace(/\s+/g, " ").slice(0, 90), problem: "key su rs type=\"epithet\" (il key sta sul persName)." });
  }

  // 2) persName divine senza epiteto interno ma con rs epithet nelle vicinanze (entro 120 caratteri)
  const pnRe = /<persName\s+[^>]*type="divine"[^>]*>([\s\S]*?)<\/persName>/g;
  while ((m = pnRe.exec(edition)) !== null) {
    if (!/<rs\s+[^>]*type="epithet"/.test(m[1])) {
      const after = edition.slice(m.index + m[0].length, m.index + m[0].length + 120);
      if (/<rs\s+[^>]*type="epithet"/.test(after)) {
        issues.push({
          filename,
          snippet: m[0].replace(/\s+/g, " ").slice(0, 90) + "…",
          problem: "persName divine seguito da epiteto separato: probabilmente vanno uniti.",
        });
      }
    }
    if (/<persName[^>]*nymRef=/.test(m[0].split(">")[0] + ">")) {
      issues.push({ filename, snippet: m[0].replace(/\s+/g, " ").slice(0, 90), problem: "nymRef sul persName invece che sul name figlio." });
    }
  }

  // 3) trattini Leiden residui nel testo dell'edizione
  const hyphenLines = edition.match(/<lb[^>]*\/>[^<]*-\s*$/gm) || [];
  if (hyphenLines.length > 0) {
    issues.push({
      filename,
      snippet: hyphenLines[0].replace(/\s+/g, " ").slice(0, 90),
      problem: `Trattini Leiden a fine riga (${hyphenLines.length}): convertire in break="no".`,
    });
  }
  return issues;
}

/* ================================================================
 * Indici (profileDesc) — suggerimenti derivati dal markup già presente
 * nell'edizione, mai testo scritto ex-novo scollegato dal documento.
 * ================================================================ */

export interface IndexSuggestions {
  divinita: string[];
  epiteti: string[];
  onomastica: string[];
  imperatori: string[];
}

export interface PersonSuggestion {
  xmlId: string;
  key?: string;
  nymRef?: string;
  name: string;
}

function textOfToken(t: MarkupToken): string {
  if (t.kind === "text") return t.value;
  return effectiveChildren(t).map(textOfToken).join("");
}

/** Scandisce i <persName> già codificati nell'edizione e propone i valori
 *  per gli indici Divinità / Epiteti / Onomastica / Imperatori: legge il
 *  `key` canonico (mai lo riscrive) e lo scompone in teonimo + epiteto/i
 *  con lo stesso criterio di xmlUtils.parseXmlToMonumento (conta i <name>
 *  figli per capire quanti token iniziali del key sono il teonimo).
 *  NON usa il testo greco reale dell'<rs type="epithet"> per popolare
 *  epiteti: quel testo è una forma flessa ("Τυράννου", "Τυράννῳ", ...) e,
 *  mescolato con l'etichetta normalizzata derivata dal key ("Tyrannos"),
 *  produceva duplicati per lo stesso epiteto — lo stesso problema che
 *  xmlUtils.ts evita di reintrodurre (vedi commenti lì, Source 2/3). */
export function extractIndexSuggestions(testo: string): IndexSuggestions {
  const divinita = new Set<string>();
  const epiteti = new Set<string>();
  const onomastica = new Set<string>();
  const imperatori = new Set<string>();

  const walk = (toks: MarkupToken[]) => {
    for (const t of toks) {
      if (t.kind !== "el") continue;
      if (t.name === "persName") {
        const type = t.attrs.type;
        const key = (t.attrs.key || "").trim();
        if (type === "divine") {
          const nameChildren = t.children
            .filter(c => c.kind === "el" && c.name === "name")
            .map(c => textOfToken(c).trim())
            .filter(Boolean);
          if (key) {
            const tokens = key.split(/\s+/);
            const nameTokenCount = nameChildren.length > 0 ? nameChildren.length : 1;
            const divName = tokens.slice(0, nameTokenCount).join(" ");
            const epithetTokens = tokens.slice(nameTokenCount);
            if (divName) divinita.add(divName);
            epithetTokens.forEach(ep => { if (ep) epiteti.add(ep); });
          } else if (nameChildren.length > 0) {
            divinita.add(nameChildren.join(" "));
          }
        } else if (type === "ruler" || type === "emperor") {
          if (key) imperatori.add(key);
        } else if (type === "attested") {
          if (key) onomastica.add(key);
        }
      }
      walk(t.children);
    }
  };

  try {
    walk(parseEdition(testo));
  } catch {
    // markup malformato: nessun suggerimento, l'editor non si blocca per questo
  }

  return {
    divinita: Array.from(divinita),
    epiteti: Array.from(epiteti),
    onomastica: Array.from(onomastica),
    imperatori: Array.from(imperatori),
  };
}

/** Scandisce i <persName type="attested"> già codificati nell'edizione e ne ricava
 *  l'identità di base (xml:id, key, nymRef, nome) per lo specchio listPerson.
 *  L'xml:id è preso da `ref="#..."` quando presente, altrimenti dal `key`: sono la
 *  stessa convenzione già in uso nei file del corpus (vedi nr. 12). Etnico e nota,
 *  che non sono nel markup dell'edizione, restano affidati alla cura editoriale e
 *  vengono preservati da chi chiama, non da questa funzione. */
export function extractPersonsFromEdition(testo: string): PersonSuggestion[] {
  const persons: PersonSuggestion[] = [];
  const seen = new Set<string>();

  const walk = (toks: MarkupToken[]) => {
    for (const t of toks) {
      if (t.kind !== "el") continue;
      if (t.name === "persName" && t.attrs.type === "attested") {
        const key = (t.attrs.key || "").trim();
        const refAttr = (t.attrs.ref || "").trim();
        const xmlId = refAttr ? refAttr.replace(/^#/, "") : key;
        if (xmlId && !seen.has(xmlId)) {
          seen.add(xmlId);
          const nameChild = t.children.find(c => c.kind === "el" && c.name === "name");
          const nymRef = nameChild && nameChild.kind === "el" ? nameChild.attrs.nymRef : undefined;
          const name = (nameChild ? textOfToken(nameChild) : textOfToken(t)).trim();
          persons.push({ xmlId, key: key || undefined, nymRef: nymRef || undefined, name });
        }
      }
      walk(t.children);
    }
  };

  try {
    walk(parseEdition(testo));
  } catch {
    // markup malformato: nessun suggerimento, l'editor non si blocca per questo
  }

  return persons;
}