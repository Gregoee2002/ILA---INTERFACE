/**
 * xmlSectionEditor.ts — ILA (Index Lunae Antiquae) / MENISKOS
 * ------------------------------------------------------------------
 * Editor a sezioni per file EpiDoc TEI conformi al formato canonico
 * del progetto (riferimento: 52.xml).
 *
 * Filosofia (allineata a corpus-rules / skill cmrdm-epidoc-extractor):
 *   1. PATCH-ONLY: solo le sezioni dichiarate modificate vengono
 *      riscritte; tutto il resto resta byte-per-byte identico.
 *   2. PROTEZIONI: <div type="edition"> viene riscritto solo con
 *      allowEdition=true. <xenoData> è ora una sezione come le altre
 *      (riscritta solo se il modello contiene dati iconografici).
 *   3. MAI DISTRUGGERE: un campo vuoto in input non cancella contenuto
 *      scientifico esistente (a meno di force=true). Cancella solo
 *      placeholder (DA_COMPILARE, commenti segnaposto, div vuoti).
 *   4. CAMPI VUOTI OMESSI: le sezioni rese vuote vengono rimosse dal
 *      file, mai lasciate come tag vuoti.
 *   5. undefined ≠ '': un campo `undefined` nel modello significa
 *      "non caricato / non toccare"; '' o [] significa "svuotato
 *      dall'utente".
 *
 * Dipendenze: nessuna. Funziona in Node (server.ts) e nel browser.
 * ------------------------------------------------------------------
 */

import { Monumento, OrigDate, Traduzione, Bibliografia, Revision, Persona } from "../types";

/* ================================================================ */
/* Tipi                                                              */
/* ================================================================ */

export type SectionId =
  // teiHeader
  | "title"
  | "publication"     // authority + idno applicativi (id, entryId, TM, CMRDM attrs)
  | "msIdentifier"    // repository (luogo_cons)
  | "support"         // material / objectType / dimensions / <p> descrittivo
  | "layout"          // layout_desc + rs writing
  | "hand"            // handNote (altezza lettere)
  | "origPlace"       // placeName ancient/modern/region + ref Pleiades
  | "origDate"        // datazioni (lista completa)
  | "provenance"      // found / observed
  | "profile"         // keywords (epiteti, divinita, onomastica, imperatori) + listPerson
  | "revisions"       // revisionDesc
  // fuori dal teiHeader
  | "facsimile"
  // body
  | "edition"         // PROTETTA: solo con allowEdition
  | "apparatus"
  | "translations"
  | "commentary"
  | "bibliography"
  // sempre protetta
  | "iconography";

export interface PatchOptions {
  /** Sezioni da riscrivere. Se omesso, serve prevModel per il diff automatico. */
  sections?: SectionId[];
  /** Modello precedente: se fornito, le sezioni modificate vengono calcolate col diff. */
  prevModel?: Monumento;
  /** Consente la riscrittura di <div type="edition"> (default: false). */
  allowEdition?: boolean;
  /** Consente la cancellazione di sezioni non-placeholder con input vuoto. */
  force?: boolean;
  /** Rimuove i placeholder residui (DA_COMPILARE, commenti, div vuoti). */
  sanitize?: boolean;
}

export interface PatchReport {
  patched: SectionId[];
  inserted: SectionId[];
  removed: SectionId[];
  skipped: { section: SectionId; reason: string }[];
  warnings: string[];
}

export interface PatchResult {
  xml: string;
  report: PatchReport;
}

interface Span {
  start: number;     // indice di '<' del tag di apertura
  openEnd: number;   // indice dopo '>' del tag di apertura
  end: number;       // indice dopo '>' del tag di chiusura (o dopo '/>')
  attrs: string;     // stringa degli attributi del tag di apertura
  inner: string;     // contenuto (vuoto per self-closing)
  selfClosing: boolean;
}

/* ================================================================ */
/* Utility di base                                                   */
/* ================================================================ */

function escapeXml(s: any): string {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isPlaceholderText(s: string): boolean {
  const t = (s || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return !t || t.toUpperCase() === "DA_COMPILARE" || t === "Nessuna." ;
}

/** Contenuto "solo placeholder": vuoto, DA_COMPILARE o soli commenti/tag vuoti. */
function isPlaceholderContent(inner: string): boolean {
  return isPlaceholderText(inner);
}

/** true se il valore del modello è stato esplicitamente svuotato. */
function isEmptied(v: any): boolean {
  if (v === undefined) return false;
  if (v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0 || v.every(x => isEmptied(typeof x === "object" ? (x?.testo ?? x?.titolo ?? "") : x));
  return false;
}

function hasValue(v: any): boolean {
  return v !== undefined && !isEmptied(v);
}

/** Indentazione della riga su cui inizia `idx`. */
function indentAt(xml: string, idx: number): string {
  const lineStart = xml.lastIndexOf("\n", idx - 1) + 1;
  const m = xml.slice(lineStart, idx).match(/^[ \t]*$/);
  return m ? xml.slice(lineStart, idx) : "";
}

/* ================================================================ */
/* Scanner bilanciato — il cuore del modulo                          */
/* ================================================================ */

/**
 * Trova il primo elemento <tag ...>...</tag> (o <tag/>) a partire da `from`,
 * gestendo correttamente l'annidamento di elementi con lo stesso nome.
 * `attrTest` filtra sugli attributi del tag di apertura.
 */
export function findElement(
  xml: string,
  tag: string,
  attrTest?: (attrs: string) => boolean,
  from = 0
): Span | null {
  const openRe = new RegExp(`<${tag}(?=[\\s/>])`, "g");
  openRe.lastIndex = from;
  let m: RegExpExecArray | null;

  while ((m = openRe.exec(xml)) !== null) {
    const start = m.index;
    const gt = xml.indexOf(">", start);
    if (gt === -1) return null;
    const selfClosing = xml[gt - 1] === "/";
    const attrs = xml.slice(start + tag.length + 1, selfClosing ? gt - 1 : gt);
    if (attrTest && !attrTest(attrs)) continue;

    if (selfClosing) {
      return { start, openEnd: gt + 1, end: gt + 1, attrs, inner: "", selfClosing: true };
    }

    // scansione bilanciata
    const tokenRe = new RegExp(`<${tag}(?=[\\s/>])|</${tag}\\s*>`, "g");
    tokenRe.lastIndex = gt + 1;
    let depth = 1;
    let tk: RegExpExecArray | null;
    while ((tk = tokenRe.exec(xml)) !== null) {
      if (tk[0].startsWith("</")) {
        depth--;
        if (depth === 0) {
          const end = tk.index + tk[0].length;
          return {
            start,
            openEnd: gt + 1,
            end,
            attrs,
            inner: xml.slice(gt + 1, tk.index),
            selfClosing: false,
          };
        }
      } else {
        // tag di apertura annidato: se self-closing non aumenta la profondità
        const innerGt = xml.indexOf(">", tk.index);
        if (innerGt !== -1 && xml[innerGt - 1] !== "/") depth++;
      }
    }
    return null; // malformato
  }
  return null;
}

export function findAllElements(
  xml: string,
  tag: string,
  attrTest?: (attrs: string) => boolean
): Span[] {
  const out: Span[] = [];
  let from = 0;
  let s: Span | null;
  while ((s = findElement(xml, tag, attrTest, from)) !== null) {
    out.push(s);
    from = s.end;
  }
  return out;
}

const attrHas = (name: string, value: string) => (attrs: string) =>
  new RegExp(`${name}\\s*=\\s*"${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(attrs);

/* ================================================================ */
/* Localizzazione sezioni                                            */
/* ================================================================ */

export interface SectionMap {
  [k: string]: Span | Span[] | null;
}

/** Individua tutte le sezioni che compongono il file. */
export function locateSections(xml: string): Record<SectionId, Span | Span[] | null> {
  const bodySpan = findElement(xml, "body");
  const inBody = (s: Span | null) => (s && bodySpan && s.start > bodySpan.start && s.end <= bodySpan.end ? s : null);

  const bodyDiv = (type: string) =>
    inBody(findElement(xml, "div", attrHas("type", type), bodySpan ? bodySpan.openEnd : 0));

  const translations = bodySpan
    ? findAllElements(xml, "div", attrHas("type", "translation")).filter(
        s => s.start > bodySpan.start && s.end <= bodySpan.end
      )
    : [];

  return {
    title: findElement(xml, "title"),
    publication: findElement(xml, "publicationStmt"),
    msIdentifier: findElement(xml, "msIdentifier"),
    support: findElement(xml, "support"),
    layout: findElement(xml, "layoutDesc"),
    hand: findElement(xml, "handDesc"),
    origPlace: findElement(xml, "origPlace"),
    origDate: findAllElements(xml, "origDate"),
    provenance: findAllElements(xml, "provenance"),
    profile: findElement(xml, "profileDesc"),
    revisions: findElement(xml, "revisionDesc"),
    facsimile: findElement(xml, "facsimile"),
    edition: bodyDiv("edition"),
    apparatus: bodyDiv("apparatus"),
    translations,
    commentary: bodyDiv("commentary"),
    bibliography: bodyDiv("bibliography"),
    iconography: findElement(xml, "xenoData"),
  };
}

/* ================================================================ */
/* Renderer canonici (allineati a monumentiToXml)                    */
/* ================================================================ */

const IND = "    "; // passo di indentazione canonico (4 spazi)

function renderOrigDates(m: Monumento, baseIndent: string): string {
  const dates: OrigDate[] =
    m.origDates && m.origDates.length > 0
      ? m.origDates
      : m.data || m.data_inizio !== undefined || m.data_fine !== undefined
      ? [{
          datingMethod: "#julian",
          notBeforeCustom: m.data_inizio !== undefined ? String(m.data_inizio) : undefined,
          notAfterCustom: m.data_fine !== undefined ? String(m.data_fine) : undefined,
          testo: m.data || "",
        }]
      : [];

  return dates
    .filter(d => d.testo || d.notBeforeCustom || d.notAfterCustom)
    .map(d => {
      const attrs = [
        d.datingMethod ? ` datingMethod="${escapeXml(d.datingMethod)}"` : ` datingMethod="#julian"`,
        d.notBeforeCustom ? ` notBefore-custom="${escapeXml(d.notBeforeCustom)}"` : "",
        d.notAfterCustom ? ` notAfter-custom="${escapeXml(d.notAfterCustom)}"` : "",
        d.precision ? ` precision="${escapeXml(d.precision)}"` : "",
        d.evidence ? ` evidence="${escapeXml(d.evidence)}"` : "",
      ].join("");
      const prefix = d.prefix ? `${escapeXml(d.prefix)} ` : "";
      return `${baseIndent}${prefix}<origDate${attrs}>${escapeXml(d.testo)}</origDate>`;
    })
    .join("\n");
}

function renderProfile(m: Monumento, baseIndent: string): string | null {
  const i1 = baseIndent + IND, i2 = i1 + IND, i3 = i2 + IND, i4 = i3 + IND;
  const kw: string[] = [];
  const writeKw = (scheme: string, terms?: string[]) => {
    if (!terms || terms.length === 0) return;
    kw.push(`${i2}<keywords scheme="${scheme}">`);
    for (const t of terms) kw.push(`${i3}<term>${escapeXml(t)}</term>`);
    kw.push(`${i2}</keywords>`);
  };
  writeKw("epiteti", m.epiteti);
  writeKw("divinita", m.divinita);
  writeKw("onomastica", m.onomastica);
  writeKw("imperatori", m.imperatori);

  const persons: string[] = [];
  if (m.persone && m.persone.length > 0) {
    persons.push(`${i1}<particDesc>`, `${i2}<listPerson>`);
    for (const p of m.persone as Persona[]) {
      persons.push(`${i3}<person xml:id="${escapeXml(p.xmlId)}">`);
      persons.push(`${i4}<persName type="attested"${p.key ? ` key="${escapeXml(p.key)}"` : ""}>`);
      persons.push(`${i4}${IND}<name${p.nymRef ? ` nymRef="${escapeXml(p.nymRef)}"` : ""}>${escapeXml(p.name)}</name>`);
      persons.push(`${i4}</persName>`);
      if (p.ethnicText || p.ethnicRef || p.ethnicNymRef) {
        persons.push(
          `${i4}<placeName type="ethnic"${p.ethnicRef ? ` ref="${escapeXml(p.ethnicRef)}"` : ""}${p.ethnicNymRef ? ` nymRef="${escapeXml(p.ethnicNymRef)}"` : ""}>${escapeXml(p.ethnicText || "")}</placeName>`
        );
      }
      if (p.note) persons.push(`${i4}<note>${escapeXml(p.note)}</note>`);
      persons.push(`${i3}</person>`);
    }
    persons.push(`${i2}</listPerson>`, `${i1}</particDesc>`);
  }

  if (kw.length === 0 && persons.length === 0) return null;
  const lines = [`${baseIndent}<profileDesc>`];
  if (kw.length > 0) lines.push(`${i1}<textClass>`, ...kw, `${i1}</textClass>`);
  lines.push(...persons, `${baseIndent}</profileDesc>`);
  return lines.join("\n");
}

function renderRevisions(m: Monumento, baseIndent: string): string | null {
  if (!m.revisions || m.revisions.length === 0) return null;
  const lines = [`${baseIndent}<revisionDesc>`];
  for (const r of m.revisions as Revision[]) {
    const when = r.date ? ` when="${escapeXml(r.date)}"` : "";
    const who = r.who ? ` who="${escapeXml(r.who)}"` : "";
    lines.push(`${baseIndent}${IND}<change${when}${who}>${escapeXml(r.note || "")}</change>`);
  }
  lines.push(`${baseIndent}</revisionDesc>`);
  return lines.join("\n");
}

function renderFacsimile(m: Monumento, baseIndent: string): string | null {
  if (!m.facsimile_url) return null;
  const lines = [
    `${baseIndent}<facsimile>`,
    `${baseIndent}${IND}<graphic url="${escapeXml(m.facsimile_url)}">`,
  ];
  if (m.facsimile_desc) lines.push(`${baseIndent}${IND}${IND}<desc>${escapeXml(m.facsimile_desc)}</desc>`);
  lines.push(`${baseIndent}${IND}</graphic>`, `${baseIndent}</facsimile>`);
  return lines.join("\n");
}

function renderEdition(m: Monumento, baseIndent: string): string {
  const i1 = baseIndent + IND;
  let inner: string;
  if (m.testo && m.testo.includes("<")) {
    inner = m.testo; // markup EpiDoc già pronto: passthrough integrale
  } else {
    const lines = (m.testo || "").split("\n").filter((_, i, a) => !(a.length === 1 && !a[0].trim() && m.anepigr));
    const lbLines =
      m.anepigr || !m.testo?.trim()
        ? [`${i1}${IND}<lb n="1"/>`]
        : lines.map((l, i) => `${i1}${IND}<lb n="${i + 1}"/>${escapeXml(l)}`);
    inner = [`${i1}<ab>`, ...lbLines, `${i1}</ab>`].join("\n");
  }
  return [`${baseIndent}<div type="edition" xml:space="preserve" xml:lang="grc">`, inner, `${baseIndent}</div>`].join("\n");
}

function renderApparatus(m: Monumento, baseIndent: string): string | null {
  const i1 = baseIndent + IND;
  const v = m.apparatus;
  if (Array.isArray(v)) {
    const entries = v.filter(e => e && (e.loc || e.note));
    if (entries.length === 0) return null;
    const lines = entries.map(
      e => `${i1}<app loc="${escapeXml(e.loc)}"><note>${escapeXml(e.note)}</note></app>`
    );
    return [`${baseIndent}<div type="apparatus">`, ...lines, `${baseIndent}</div>`].join("\n");
  }
  if (typeof v === "string" && v.trim() && !isPlaceholderText(v)) {
    const inner = v.includes("<") ? v : `${i1}<p>${escapeXml(v)}</p>`;
    return [`${baseIndent}<div type="apparatus">`, inner, `${baseIndent}</div>`].join("\n");
  }
  return null;
}

function renderTranslations(m: Monumento, baseIndent: string): string | null {
  const i1 = baseIndent + IND;
  const list = (m.traduzioni || []).filter(t => t.testo && t.testo.trim() && !isPlaceholderText(t.testo));
  if (list.length === 0) return null;
  const blocks = list.map((t: Traduzione) => {
    const inner = t.testo.includes("<")
      ? t.testo
      : t.testo.split("\n").map(p => `${i1}<p>${escapeXml(p)}</p>`).join("\n");
    const note = t.note && t.note.trim() ? `\n${i1}<note>${escapeXml(t.note)}</note>` : "";
    return [`${baseIndent}<div type="translation" xml:lang="${escapeXml(t.lang || "it")}">`, inner + note, `${baseIndent}</div>`].join("\n");
  });
  return blocks.join("\n");
}

function renderCommentary(m: Monumento, baseIndent: string): string | null {
  const i1 = baseIndent + IND;
  const raw = m.note_interne_rawXml;
  const plain = m.note_interne;
  if (raw && raw.trim() && !isPlaceholderText(raw)) {
    return [`${baseIndent}<div type="commentary">`, `${i1}<p>${raw}</p>`, `${baseIndent}</div>`].join("\n");
  }
  if (plain && plain.trim() && !isPlaceholderText(plain)) {
    const inner = plain.includes("<") ? plain : `${i1}<p>${escapeXml(plain)}</p>`;
    return [`${baseIndent}<div type="commentary">`, inner, `${baseIndent}</div>`].join("\n");
  }
  return null;
}

function renderBibliography(m: Monumento, baseIndent: string): string | null {
  const i1 = baseIndent + IND, i2 = i1 + IND;
  const list = (m.bibliografia || []).filter(b => (b.rawXml && b.rawXml.trim()) || (b.titolo && b.titolo.trim()));
  if (list.length === 0) return null;
  const bibls = list.map((b: Bibliografia) => {
    if (b.rawXml) return `${i2}<bibl>${b.rawXml}</bibl>`;
    if (b.titolo.includes("<")) return `${i2}<bibl>${b.titolo}</bibl>`;
    return `${i2}<bibl>${escapeXml(b.titolo)}</bibl>`;
  });
  return [`${baseIndent}<div type="bibliography">`, `${i1}<listBibl>`, ...bibls, `${i1}</listBibl>`, `${baseIndent}</div>`].join("\n");
}

function renderIconography(m: Monumento, baseIndent: string): string | null {
  const ico = m.iconografia;
  if (!ico) return null;
  const hasContent = ico.function || (ico.figures && ico.figures.length > 0) || ico.note;
  if (!hasContent) return null;
  const i1 = baseIndent + IND, i2 = i1 + IND, i3 = i2 + IND;
  const lines = [`${baseIndent}<xenoData>`, `${i1}<iconography>`];
  if (ico.function) lines.push(`${i2}<function key="${escapeXml(ico.function)}"/>`);
  (ico.figures || []).forEach((f, idx) => {
    // attributi vuoti vietati (skill cmrdm-epidoc, principio cardinale §2):
    // se type/key mancano, l'attributo si omette — mai type="" o key=""
    const fAttrs = [`n="${f.n || idx + 1}"`];
    if (f.type) fAttrs.push(`type="${escapeXml(f.type)}"`);
    if (f.key) fAttrs.push(`key="${escapeXml(f.key)}"`);
    lines.push(`${i2}<figure ${fAttrs.join(" ")}>`);
    (f.traits || []).forEach(t => {
      const tAttrs: string[] = [];
      if (t.type) tAttrs.push(`type="${escapeXml(t.type)}"`);
      if (t.key) tAttrs.push(`key="${escapeXml(t.key)}"`);
      if (t.hand) tAttrs.push(`hand="${escapeXml(t.hand)}"`);
      if (tAttrs.length > 0) lines.push(`${i3}<trait ${tAttrs.join(" ")}/>`);
    });
    lines.push(`${i2}</figure>`);
  });
  if (ico.note) lines.push(`${i2}<note>${escapeXml(ico.note)}</note>`);
  lines.push(`${i1}</iconography>`, `${baseIndent}</xenoData>`);
  return lines.join("\n");
}

/* ================================================================ */
/* Diff automatico modello vecchio → nuovo                           */
/* ================================================================ */

const SECTION_FIELDS: Record<SectionId, (keyof Monumento)[]> = {
  title: ["titolo", "textTypes"],
  publication: ["authority", "tm", "phi", "corpus", "numero", "id", "entryId"],
  msIdentifier: ["luogo_cons", "msIdnos"],
  support: ["dim", "materiale", "materialRef", "tipo", "tipo_ref", "dim_altezza", "dim_larghezza", "dim_profondita", "dim_unita"],
  layout: ["layout_desc", "scrittura", "scrittura_ref"],
  hand: ["scrittura_note"],
  origPlace: ["citta", "luogo_moderno", "regione", "place_ref_ancient", "place_ref_modern", "origPlace_nota"],
  origDate: ["origDates", "data", "data_inizio", "data_fine"],
  provenance: ["luogo_rit", "conserv"],
  profile: ["epiteti", "divinita", "onomastica", "imperatori", "persone"],
  revisions: ["revisions"],
  facsimile: ["facsimile_url", "facsimile_desc"],
  edition: ["testo", "anepigr", "iscrizione"],
  apparatus: ["apparatus"],
  translations: ["traduzioni"],
  commentary: ["note_interne", "note_interne_rawXml"],
  bibliography: ["bibliografia"],
  iconography: ["iconografia"],
};

export function diffSections(prev: Monumento, next: Monumento): SectionId[] {
  const changed: SectionId[] = [];
  for (const [section, fields] of Object.entries(SECTION_FIELDS) as [SectionId, (keyof Monumento)[]][]) {
    const a = JSON.stringify(fields.map(f => prev[f] ?? null));
    const b = JSON.stringify(fields.map(f => next[f] ?? null));
    if (a !== b) changed.push(section);
  }
  return changed;
}

/* ================================================================ */
/* Patch surgico dentro sezioni header                               */
/* ================================================================ */

/** Sostituisce (o inserisce) l'inner-text di un sotto-elemento dentro uno span. */
function patchInner(
  xml: string,
  scope: Span,
  tag: string,
  attrTest: ((a: string) => boolean) | undefined,
  newVal: string | undefined,
  report: PatchReport,
  section: SectionId
): string {
  if (newVal === undefined) return xml;
  const el = findElement(xml, tag, attrTest, scope.openEnd);
  if (!el || el.start >= scope.end) {
    if (newVal) report.warnings.push(`[${section}] <${tag}> assente: valore "${newVal}" non inserito (creare in Oxygen o via renderer).`);
    return xml;
  }
  if (!newVal && !isPlaceholderContent(el.inner)) {
    report.warnings.push(`[${section}] rifiutata cancellazione di <${tag}> non vuoto con input vuoto.`);
    return xml;
  }
  return xml.slice(0, el.openEnd) + escapeXml(newVal) + xml.slice(el.end - (`</${tag}>`.length));
}

/** Sostituisce (o aggiunge) un attributo su un sotto-elemento dentro uno span. */
function patchAttr(
  xml: string,
  scope: Span,
  tag: string,
  attrTest: ((a: string) => boolean) | undefined,
  attrName: string,
  newVal: string | undefined
): string {
  if (newVal === undefined || newVal === "") return xml;
  const el = findElement(xml, tag, attrTest, scope.openEnd);
  if (!el || el.start >= scope.end) return xml;
  const openTag = xml.slice(el.start, el.openEnd);
  const attrRe = new RegExp(`(${attrName}\\s*=\\s*")[^"]*(")`);
  let newOpen: string;
  if (attrRe.test(openTag)) {
    newOpen = openTag.replace(attrRe, `$1${escapeXml(newVal)}$2`);
  } else {
    newOpen = openTag.replace(new RegExp(`^<${tag}`), `<${tag} ${attrName}="${escapeXml(newVal)}"`);
  }
  return xml.slice(0, el.start) + newOpen + xml.slice(el.openEnd);
}

/* ================================================================ */
/* Sostituzione / inserimento / rimozione di sezioni intere          */
/* ================================================================ */

function replaceSpan(xml: string, span: Span, replacement: string): string {
  // il replacement contiene già la propria indentazione di base
  const lineStart = xml.lastIndexOf("\n", span.start - 1) + 1;
  const before = xml.slice(lineStart, span.start);
  const isOwnLine = /^[ \t]*$/.test(before);
  if (isOwnLine) {
    return xml.slice(0, lineStart) + replacement + xml.slice(span.end);
  }
  return xml.slice(0, span.start) + replacement.trimStart() + xml.slice(span.end);
}

function removeSpan(xml: string, span: Span): string {
  const lineStart = xml.lastIndexOf("\n", span.start - 1) + 1;
  const before = xml.slice(lineStart, span.start);
  let end = span.end;
  if (/^[ \t]*$/.test(before)) {
    if (xml[end] === "\r") end++;
    if (xml[end] === "\n") end++;
    return xml.slice(0, lineStart) + xml.slice(end);
  }
  return xml.slice(0, span.start) + xml.slice(end);
}

/** Ordine canonico dei div del body per l'inserimento. */
const BODY_ORDER: SectionId[] = ["edition", "apparatus", "translations", "commentary", "bibliography"];

function insertBodySection(xml: string, section: SectionId, rendered: string, report: PatchReport): string {
  const body = findElement(xml, "body");
  if (!body) {
    report.warnings.push(`[${section}] <body> non trovato: inserimento saltato.`);
    return xml;
  }
  const idx = BODY_ORDER.indexOf(section);
  // ancora: fine dell'ultima sezione precedente esistente, altrimenti subito dopo <body>
  let anchor = body.openEnd;
  for (let i = 0; i < idx; i++) {
    const prev = BODY_ORDER[i];
    const spans =
      prev === "translations"
        ? findAllElements(xml, "div", attrHas("type", "translation")).filter(s => s.start > body.start && s.end <= body.end)
        : ([findElement(xml, "div", attrHas("type", prev), body.openEnd)].filter(
            s => s && s.end <= body.end
          ) as Span[]);
    for (const s of spans) if (s.end > anchor) anchor = s.end;
  }
  return xml.slice(0, anchor) + "\n" + rendered + xml.slice(anchor);
}

/* ================================================================ */
/* Sanitizzazione placeholder (regole corpus)                        */
/* ================================================================ */

export function sanitizePlaceholders(xml: string): string {
  let out = xml;
  // idno con solo commento segnaposto o DA_COMPILARE
  out = out.replace(/[ \t]*<idno[^>]*>\s*(?:<!--[\s\S]*?-->|DA_COMPILARE)\s*<\/idno>\r?\n?/g, "");
  // attributi ref segnaposto
  out = out.replace(/\s+ref="DA_COMPILARE"/g, "");
  // div self-closing vuoti nel body
  out = out.replace(/[ \t]*<div type="(?:apparatus|commentary|translation)"[^>]*\/>\r?\n?/g, "");
  // div che contengono solo <p>DA_COMPILARE</p>
  out = out.replace(
    /[ \t]*<div type="(?:apparatus|commentary|translation)"[^>]*>\s*(?:<p>\s*DA_COMPILARE\s*<\/p>\s*)+<\/div>\r?\n?/g,
    ""
  );
  return out;
}

/* ================================================================ */
/* API principale                                                    */
/* ================================================================ */

export function patchXmlSections(xml: string, m: Monumento, opts: PatchOptions = {}): PatchResult {
  const report: PatchReport = { patched: [], inserted: [], removed: [], skipped: [], warnings: [] };

  if ((xml.match(/<TEI[\s>]/g) || []).length > 1) {
    report.warnings.push("File multi-TEI: patchXmlSections opera su file a singola entry. Nessuna modifica applicata.");
    return { xml, report };
  }

  let sections: SectionId[] =
    opts.sections ?? (opts.prevModel ? diffSections(opts.prevModel, m) : []);
  if (sections.length === 0 && !opts.sanitize) {
    report.warnings.push("Nessuna sezione da modificare (fornire opts.sections o opts.prevModel).");
    return { xml, report };
  }

  // ── PROTEZIONI ────────────────────────────────────────────────
  if (sections.includes("edition") && !opts.allowEdition) {
    sections = sections.filter(s => s !== "edition");
    report.skipped.push({ section: "edition", reason: "edition protetta: passare allowEdition=true per riscriverla." });
  }

  let out = xml;

  /* Helper per le sezioni "full rewrite" del body + facsimile/profile/revisions */
  const fullRewrite = (
    section: SectionId,
    locate: () => Span | Span[] | null,
    render: (baseIndent: string) => string | null,
    insert: (rendered: string) => void,
    modelValue: any
  ) => {
    if (!sections.includes(section)) return;
    const loc = locate();
    const spans: Span[] = Array.isArray(loc) ? loc : loc ? [loc] : [];
    const baseIndent = spans.length > 0 ? indentAt(out, spans[0].start) : defaultIndent(section);
    const rendered = render(baseIndent);

    if (rendered === null) {
      // input vuoto → rimuovere solo placeholder, mai contenuto reale (salvo force)
      if (modelValue === undefined) {
        report.skipped.push({ section, reason: "campo non presente nel modello (undefined): sezione non toccata." });
        return;
      }
      let removedAny = false;
      for (const s of [...spans].reverse()) {
        if (opts.force || isPlaceholderContent(s.inner)) {
          out = removeSpan(out, s);
          removedAny = true;
        } else {
          report.warnings.push(`[${section}] input vuoto ma sezione esistente non-placeholder: non rimossa (usare force).`);
        }
      }
      if (removedAny) report.removed.push(section);
      return;
    }

    if (spans.length > 0) {
      // sostituisce la prima occorrenza, rimuove le successive (es. traduzioni multiple riscritte in blocco)
      for (const s of [...spans].reverse().slice(0, spans.length - 1)) out = removeSpan(out, s);
      const first = Array.isArray(loc) ? locateAgain(out, section) : locateAgain(out, section);
      if (first) out = replaceSpan(out, first, rendered);
      report.patched.push(section);
    } else {
      insert(rendered);
      report.inserted.push(section);
    }
  };

  const locateAgain = (x: string, section: SectionId): Span | null => {
    const map = locateSections(x);
    const loc = map[section];
    return Array.isArray(loc) ? loc[0] || null : loc;
  };

  const defaultIndent = (section: SectionId): string => {
    switch (section) {
      case "facsimile": return IND;
      case "profile": case "revisions": case "iconography": return IND + IND;
      case "origDate": return IND.repeat(7);
      default: return IND.repeat(3); // div del body
    }
  };

  /* ── Sezioni body: full rewrite ─────────────────────────────── */
  fullRewrite("edition",
    () => locateSections(out).edition,
    ind => renderEdition(m, ind),
    r => { out = insertBodySection(out, "edition", r, report); },
    m.testo);

  fullRewrite("apparatus",
    () => locateSections(out).apparatus,
    ind => renderApparatus(m, ind),
    r => { out = insertBodySection(out, "apparatus", r, report); },
    m.apparatus);

  fullRewrite("translations",
    () => locateSections(out).translations,
    ind => renderTranslations(m, ind),
    r => { out = insertBodySection(out, "translations", r, report); },
    m.traduzioni);

  fullRewrite("commentary",
    () => locateSections(out).commentary,
    ind => renderCommentary(m, ind),
    r => { out = insertBodySection(out, "commentary", r, report); },
    m.note_interne ?? m.note_interne_rawXml);

  fullRewrite("bibliography",
    () => locateSections(out).bibliography,
    ind => renderBibliography(m, ind),
    r => { out = insertBodySection(out, "bibliography", r, report); },
    m.bibliografia);

  /* ── facsimile / profileDesc / revisionDesc: full rewrite ───── */
  fullRewrite("facsimile",
    () => locateSections(out).facsimile,
    ind => renderFacsimile(m, ind),
    r => {
      const th = findElement(out, "teiHeader");
      if (th) { out = out.slice(0, th.end) + "\n" + r + out.slice(th.end); }
    },
    m.facsimile_url);

  fullRewrite("profile",
    () => locateSections(out).profile,
    ind => renderProfile(m, ind),
    r => {
      const fd = findElement(out, "fileDesc");
      if (fd) { out = out.slice(0, fd.end) + "\n" + r + out.slice(fd.end); }
    },
    m.epiteti ?? m.divinita ?? m.onomastica ?? m.imperatori ?? m.persone);

  fullRewrite("iconography",
    () => locateSections(out).iconography,
    ind => renderIconography(m, ind),
    r => {
      // inserimento canonico: dopo profileDesc se esiste, altrimenti prima di revisionDesc / </teiHeader>
      const prof = findElement(out, "profileDesc");
      if (prof) { out = out.slice(0, prof.end) + "\n" + r + out.slice(prof.end); return; }
      const rev = findElement(out, "revisionDesc");
      const th = findElement(out, "teiHeader");
      if (rev) {
        const lineStart = out.lastIndexOf("\n", rev.start - 1) + 1;
        out = out.slice(0, lineStart) + r + "\n" + out.slice(lineStart);
      } else if (th) {
        const closeIdx = th.end - "</teiHeader>".length;
        const lineStart = out.lastIndexOf("\n", closeIdx - 1) + 1;
        out = out.slice(0, lineStart) + r + "\n" + out.slice(lineStart);
      }
    },
    m.iconografia);

  fullRewrite("revisions",
    () => locateSections(out).revisions,
    ind => renderRevisions(m, ind),
    r => {
      const th = findElement(out, "teiHeader");
      if (th) {
        const closeIdx = th.end - "</teiHeader>".length;
        const lineStart = out.lastIndexOf("\n", closeIdx - 1) + 1;
        out = out.slice(0, lineStart) + r + "\n" + out.slice(lineStart);
      }
    },
    m.revisions);

  /* ── origDate: rimuovi tutte e re-inserisci dopo </origPlace> ── */
  if (sections.includes("origDate")) {
    const origin = findElement(out, "origin");
    if (!origin) {
      report.warnings.push("[origDate] <origin> non trovato.");
    } else {
      const existing = findAllElements(out, "origDate").filter(s => s.start > origin.start && s.end <= origin.end);
      const baseIndent = existing.length > 0 ? indentAt(out, existing[0].start) : indentAt(out, origin.start) + IND;
      const rendered = renderOrigDates(m, baseIndent);
      const hasInput = hasValue(m.origDates) || hasValue(m.data) || m.data_inizio !== undefined || m.data_fine !== undefined;

      if (!rendered && m.origDates === undefined && m.data === undefined) {
        report.skipped.push({ section: "origDate", reason: "datazione non presente nel modello: non toccata." });
      } else {
        for (const s of [...existing].reverse()) out = removeSpan(out, s);
        if (rendered && hasInput) {
          const origin2 = findElement(out, "origin")!;
          const op = findElement(out, "origPlace", undefined, origin2.openEnd);
          const anchor = op && op.end <= origin2.end ? op.end : origin2.openEnd;
          out = out.slice(0, anchor) + "\n" + rendered + out.slice(anchor);
          report.patched.push("origDate");
        } else {
          report.removed.push("origDate");
        }
      }
    }
  }

  /* ── Sezioni header: patch chirurgico dei sotto-elementi ─────── */

  if (sections.includes("title")) {
    const t = findElement(out, "title");
    if (t && m.titolo !== undefined) {
      const rsBlocks = (m.textTypes && m.textTypes.length > 0)
        ? m.textTypes.map(x => `<rs type="textType">${escapeXml(x)}</rs>`).join(" ")
        : (t.inner.match(/<rs\s+[^>]*type="textType"[^>]*>[\s\S]*?<\/rs>/g) || []).join(" ");
      const catRef = (t.inner.match(/[—\-]?\s*CMRDM\s+[IVX]+\s+nr\.?\s*[\dDA]+\s*:/) || [""])[0];
      const desc = escapeXml(m.titolo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const parts = [rsBlocks, catRef.trim(), desc].filter(Boolean);
      const newInner = parts.length > 1 ? `${rsBlocks}${catRef ? " " + catRef.trim() : " —"} ${desc}` : desc;
      out = out.slice(0, t.openEnd) + newInner + out.slice(t.end - "</title>".length);
      report.patched.push("title");
    }
  }

  if (sections.includes("publication")) {
    const pub = findElement(out, "publicationStmt");
    if (pub) {
      out = patchInner(out, pub, "authority", undefined, m.authority, report, "publication");
      // TM: mai crearlo se assente; patch solo se esiste già con contenuto placeholder o diverso
      let pub2 = findElement(out, "publicationStmt")!;
      out = patchInner(out, pub2, "idno", attrHas("type", "TM"), m.tm, report, "publication");
      pub2 = findElement(out, "publicationStmt")!;
      out = patchAttr(out, pub2, "idno", attrHas("type", "CMRDM"), "corpus", m.corpus);
      pub2 = findElement(out, "publicationStmt")!;
      out = patchAttr(out, pub2, "idno", attrHas("type", "CMRDM"), "numero", m.numero);

      // id / entryId applicativi (come server.ts, ma scoped al publicationStmt)
      const writeAppIdno = (type: string, value: string | number | undefined) => {
        if (value === undefined || value === null || value === "") return;
        const scope = findElement(out, "publicationStmt")!;
        const existing = findElement(out, "idno", attrHas("type", type), scope.openEnd);
        if (existing && existing.start < scope.end) {
          out = out.slice(0, existing.openEnd) + escapeXml(String(value)) + out.slice(existing.end - "</idno>".length);
        } else {
          const legacy = type === "entryId" ? findElement(out, "idno", attrHas("type", "firebaseId"), scope.openEnd) : null;
          if (legacy && legacy.start < scope.end) {
            const indent = indentAt(out, legacy.start);
            out = out.slice(0, legacy.start) + `<idno type="entryId">${escapeXml(String(value))}</idno>` + out.slice(legacy.end);
          } else {
            const indent = indentAt(out, scope.end - "</publicationStmt>".length) + IND;
            const closeIdx = out.indexOf("</publicationStmt>", scope.openEnd);
            out = out.slice(0, closeIdx) + `${IND}<idno type="${type}">${escapeXml(String(value))}</idno>\n` + indentAt(out, closeIdx) + out.slice(closeIdx);
          }
        }
      };
      writeAppIdno("id", m.id || undefined);
      writeAppIdno("entryId", m.entryId);
      report.patched.push("publication");
    }
  }

  if (sections.includes("msIdentifier")) {
    const ms = findElement(out, "msIdentifier");
    if (ms) {
      out = patchInner(out, ms, "repository", undefined, m.luogo_cons, report, "msIdentifier");
      report.patched.push("msIdentifier");
    }
  }

  if (sections.includes("support")) {
    const sup = findElement(out, "support");
    if (sup) {
      out = patchInner(out, sup, "p", undefined, m.dim, report, "support");
      let s2 = findElement(out, "support")!;
      out = patchInner(out, s2, "material", undefined, m.materiale, report, "support");
      s2 = findElement(out, "support")!;
      out = patchAttr(out, s2, "material", undefined, "ref", m.materialRef);
      s2 = findElement(out, "support")!;
      out = patchInner(out, s2, "objectType", undefined, m.tipo, report, "support");
      s2 = findElement(out, "support")!;
      out = patchAttr(out, s2, "objectType", undefined, "ref", m.tipo_ref);
      s2 = findElement(out, "support")!;
      out = patchInner(out, s2, "height", undefined, m.dim_altezza, report, "support");
      s2 = findElement(out, "support")!;
      out = patchInner(out, s2, "width", undefined, m.dim_larghezza, report, "support");
      s2 = findElement(out, "support")!;
      out = patchInner(out, s2, "depth", undefined, m.dim_profondita, report, "support");
      s2 = findElement(out, "support")!;
      out = patchAttr(out, s2, "dimensions", undefined, "unit", m.dim_unita);
      report.patched.push("support");
    } else {
      report.warnings.push("[support] <support> non trovato.");
    }
  }

  if (sections.includes("layout")) {
    const lay = findElement(out, "layoutDesc");
    if (lay) {
      out = patchInner(out, lay, "p", undefined, m.layout_desc, report, "layout");
      let l2 = findElement(out, "layoutDesc")!;
      out = patchInner(out, l2, "rs", undefined, m.scrittura, report, "layout");
      l2 = findElement(out, "layoutDesc")!;
      out = patchAttr(out, l2, "rs", undefined, "ref", m.scrittura_ref);
      report.patched.push("layout");
    }
  }

  if (sections.includes("hand")) {
    const hd = findElement(out, "handDesc");
    if (hd) {
      out = patchInner(out, hd, "p", undefined, m.scrittura_note, report, "hand");
      report.patched.push("hand");
    }
  }

  if (sections.includes("origPlace")) {
    const op = findElement(out, "origPlace");
    if (op) {
      out = patchInner(out, op, "placeName", attrHas("type", "ancient"), m.citta, report, "origPlace");
      let o2 = findElement(out, "origPlace")!;
      out = patchAttr(out, o2, "placeName", attrHas("type", "ancient"), "ref", m.place_ref_ancient);
      o2 = findElement(out, "origPlace")!;
      out = patchInner(out, o2, "placeName", attrHas("type", "modern"), m.luogo_moderno, report, "origPlace");
      o2 = findElement(out, "origPlace")!;
      out = patchAttr(out, o2, "placeName", attrHas("type", "modern"), "ref", m.place_ref_modern);
      // region può stare fuori da origPlace: patch globale ma solo se esiste
      const region = findElement(out, "placeName", attrHas("type", "region"));
      if (region && m.regione !== undefined && m.regione) {
        out = out.slice(0, region.openEnd) + escapeXml(m.regione) + out.slice(region.end - "</placeName>".length);
      }
      report.patched.push("origPlace");
    }
  }

  if (sections.includes("provenance")) {
    const found = findElement(out, "provenance", attrHas("type", "found"));
    if (found && m.luogo_rit !== undefined) {
      if (m.luogo_rit || isPlaceholderContent(found.inner) || opts.force) {
        out = out.slice(0, found.openEnd) + escapeXml(m.luogo_rit) + out.slice(found.end - "</provenance>".length);
      }
    }
    const obs = findElement(out, "provenance", attrHas("type", "observed"));
    if (obs && m.conserv !== undefined) {
      if (m.conserv || isPlaceholderContent(obs.inner) || opts.force) {
        out = out.slice(0, obs.openEnd) + escapeXml(m.conserv) + out.slice(obs.end - "</provenance>".length);
      }
    }
    report.patched.push("provenance");
  }

  /* ── Sanitizzazione finale opzionale ─────────────────────────── */
  if (opts.sanitize) out = sanitizePlaceholders(out);

  return { xml: out, report };
}

/* ================================================================ */
/* Facciata per l'interfaccia ILA                                    */
/* ================================================================ */

/**
 * Punto d'ingresso pensato per il flusso di salvataggio dell'app:
 *   const { xml, report } = applyEdit(originalXml, prevModel, nextModel);
 * Calcola da sé le sezioni cambiate e applica il patch in sicurezza.
 */
export function applyEdit(
  originalXml: string,
  prevModel: Monumento,
  nextModel: Monumento,
  opts: Omit<PatchOptions, "sections" | "prevModel"> = {}
): PatchResult {
  return patchXmlSections(originalXml, nextModel, { ...opts, prevModel });
}