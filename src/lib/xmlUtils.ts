import { Monumento, Traduzione, Bibliografia, OrigDate, IconographyData } from "../types";
import { canonicalDivinityName } from "./divinityAliases";

// Unica fonte per l'etichetta identificativa del record — sostituisce le
// vecchie stringhe "corpus numero" (CMRDM I 29) costruite ad hoc in più punti.
export function formatIlaLabel(id: number | undefined): string {
  return `ILA ${id ?? '?'}`;
}

function escapeXml(unsafe: any): string {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Split the `key` attribute of a <persName type="divine" key="..."> into the
// divinity name and its epithet tokens. Convention: "DivinityName Epithet1
// Epithet2...", leading token(s) = divine name (canonicalized), rest =
// epithets. `nameChildCount` is the number of <name> children of the
// persName (disambiguates compound theonyms like "Helios Apollo
// Kisaulodenos" from "Name Epithet" pairs) — pass 0/1 when unknown, which
// falls back to the legacy single-token default. Shared by the corpus parser
// (parseTeiElement below) and any UI code resolving an inline click on the
// same kind of element, so the two stay in sync.
export function splitDivineKey(key: string, nameChildCount: number): { divinity: string; epiteti: string[] } {
  const tokens = key.split(/\s+/).filter(Boolean);
  const nameTokenCount = nameChildCount > 0 ? nameChildCount : 1;
  const divinity = canonicalDivinityName(tokens.slice(0, nameTokenCount).join(' '));
  const epiteti = tokens.slice(nameTokenCount).filter(Boolean);
  return { divinity, epiteti };
}

function isPlaceholder(s: string): boolean {
  return !s || s.trim().toUpperCase() === 'DA_COMPILARE';
}

// Vero anche quando il segnaposto è annegato in una frase (es. "Height of
// letters: DA_COMPILARE.", ref="DA_COMPILARE"): l'intero campo va nascosto,
// non solo il token, perché il resto della frase da solo non ha senso.
function containsPlaceholder(s: string): boolean {
  return !!s && s.toUpperCase().includes('DA_COMPILARE');
}

function resolveXmlTextWithPtrs(xmlBlock: string): { resolvedText: string; citedRanges: string[]; rawXml: string } {
  const rawXml = xmlBlock;

  const citedRanges: string[] = [];
  const citedRangeRegex = /<citedRange[^>]*>([\s\S]*?)<\/citedRange>/g;
  let crMatch;
  while ((crMatch = citedRangeRegex.exec(xmlBlock)) !== null) {
    citedRanges.push(unescapeXml(crMatch[1].trim()).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  }

  // Step 1: resolve <ptr target="#key"/> to key (strip leading #)
  let resolvedText = xmlBlock
    .replace(/<ptr\s+[^>]*target="#([^"]*)"[^>]*\/?>/g, '$1')
    .replace(/<ptr\s+[^>]*target="([^"]*)"[^>]*\/?>/g, '$1');

  // Step 1b: resolve <expan> → abbr(ex) form before stripping tags
  resolvedText = resolvedText.replace(
    /<expan[^>]*>([\s\S]*?)<\/expan>/g,
    (_, inner) => {
      const abbr = (inner.match(/<abbr[^>]*>([\s\S]*?)<\/abbr>/) || [])[1] || '';
      const ex = (inner.match(/<ex[^>]*>([\s\S]*?)<\/ex>/) || [])[1] || '';
      const abbrClean = abbr.replace(/<[^>]+>/g, '');
      const exClean = ex.replace(/<[^>]+>/g, '');
      return exClean ? `${abbrClean}(${exClean})` : abbrClean;
    }
  );

  // Step 2: keep <citedRange> text inline
  resolvedText = resolvedText.replace(/<citedRange[^>]*>([\s\S]*?)<\/citedRange>/g, '$1');

  // Step 3: wrap greek inline text with markers for NoteWithTags renderer
  resolvedText = resolvedText
    .replace(/<foreign\s+[^>]*xml:lang="grc"[^>]*>([\s\S]*?)<\/foreign>/g, '«$1»')
    .replace(/<foreign\s+xml:lang="grc">([\s\S]*?)<\/foreign>/g, '«$1»');

  // Step 4: strip remaining tags and normalize whitespace
  resolvedText = unescapeXml(resolvedText)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { resolvedText, citedRanges, rawXml };
}

/**
 * extractSearchableText
 * ----------------------
 * Trasforma il campo edizione (XML EpiDoc grezzo, come estratto da
 * <div type="edition"> subito sotto) in UN SOLO testo piatto indicizzabile
 * per la ricerca full-text — include anche le ricostruzioni editoriali
 * (<supplied>), non solo il testo materialmente inciso.
 *
 * Ritorna anche `suppliedRanges`: gli intervalli [start, end) di carattere
 * nel testo finale che corrispondono a contenuto dentro un <supplied>.
 * Il frontend può usarli per segnalare, quando un risultato di ricerca
 * cade in questi range, che il match è su una parte ricostruita e non
 * attestata sulla pietra.
 *
 * Regole di trasformazione:
 *  - <lb break="no"/>      → rimosso, nessuno spazio (continuazione di parola
 *                             a cavallo di fine riga)
 *  - <lb n="..."/> normale → sostituito con uno spazio (fine riga = confine
 *                             di parola)
 *  - <gap/> e <space/>     → placeholder "[…]" per evitare che due parole
 *                             non contigue sulla pietra vengano indicizzate
 *                             come adiacenti
 *  - <choice><corr>X</corr><sic>Y</sic></choice> → si tiene solo <corr>
 *    (la lettura accettata dall'editore, non l'errore del lapicida)
 *  - <supplied>...</supplied> → contenuto incluso nel testo, range tracciato
 *  - altri tag semantici (persName, placeName, rs, name, num...) → tag
 *    rimosso, contenuto mantenuto senza alterare l'adiacenza
 *
 * Testato su 52.xml (incluso il caso con due <div type="textpart"> annidati
 * nello stesso <div type="edition">, es. I.Milet VI 3 1029 + 1040).
 */
function extractSearchableText(xmlTesto: string): { testo: string; suppliedRanges: [number, number][] } {
  if (!xmlTesto) return { testo: '', suppliedRanges: [] };

  let xml = xmlTesto
    .replace(/<choice>\s*<corr>([\s\S]*?)<\/corr>\s*<sic>[\s\S]*?<\/sic>\s*<\/choice>/g, '$1')
    .replace(/<choice>\s*<sic>[\s\S]*?<\/sic>\s*<corr>([\s\S]*?)<\/corr>\s*<\/choice>/g, '$1')
    .replace(/<lb\b[^>]*\bbreak="no"[^>]*\/>/g, '\u0000NOBREAK\u0000')
    .replace(/<lb\b[^>]*\/>/g, '\u0000BREAK\u0000')
    .replace(/<gap\b[^>]*\/>/g, '\u0000GAP\u0000')
    .replace(/<space\b[^>]*\/>/g, '\u0000GAP\u0000');

  const tokens = xml.match(/<\/?[a-zA-Z][^>]*>|\u0000[A-Z]+\u0000|[^<\u0000]+/g) || [];

  let out = '';
  let suppliedDepth = 0;
  let suppliedStart = -1;
  const suppliedRanges: [number, number][] = [];

  // Aggiunge uno spazio solo se non ne segue già uno — così gli offset restano
  // validi dall'inizio alla fine, senza bisogno di ricalcolarli dopo un
  // collasso di spazi multipli a fine funzione
  const appendSpace = () => {
    if (out.length > 0 && !out.endsWith(' ')) out += ' ';
  };
  const appendText = (rawTok: string) => {
    const collapsed = rawTok.replace(/\s+/g, ' ');
    if (collapsed === '') return;
    if (collapsed.startsWith(' ')) appendSpace();
    const core = collapsed.trim();
    if (core === '') return;
    out += core;
    if (collapsed.endsWith(' ')) appendSpace();
  };

  for (const tok of tokens) {
    if (tok === '\u0000NOBREAK\u0000') continue;
    if (tok === '\u0000BREAK\u0000') { appendSpace(); continue; }
    if (tok === '\u0000GAP\u0000') { appendSpace(); out += '[…]'; appendSpace(); continue; }
    if (tok.startsWith('</supplied')) {
      suppliedDepth = Math.max(0, suppliedDepth - 1);
      if (suppliedDepth === 0 && suppliedStart !== -1) {
        suppliedRanges.push([suppliedStart, out.length]);
        suppliedStart = -1;
      }
      continue;
    }
    if (/^<supplied\b/.test(tok)) {
      if (suppliedDepth === 0) suppliedStart = out.length;
      suppliedDepth += 1;
      continue;
    }
    if (tok.startsWith('<')) continue; // altri tag: strip, contenuto già gestito dai text token
    appendText(tok);
  }

  const leadingSpaces = out.length - out.trimStart().length;
  const trimmed = out.trim();
  const adjustedRanges: [number, number][] = suppliedRanges.map(([s, e]) => [
    Math.max(0, s - leadingSpaces),
    Math.max(0, e - leadingSpaces),
  ]);

  return { testo: trimmed, suppliedRanges: adjustedRanges };
}

function extractIconography(teiString: string): any {
  const xenoMatch = teiString.match(/<xenoData>([\s\S]*?)<\/xenoData>/);
  if (!xenoMatch) return undefined;

  // Prefisso opzionale "ica:" (namespace richiesto da xenoData nello schema EpiDoc)
  // oppure nessun prefisso (schede legacy scritte prima del fix del namespace).
  const iconMatch = xenoMatch[1].match(/<(?:\w+:)?iconography[^>]*>([\s\S]*?)<\/(?:\w+:)?iconography>/);
  if (!iconMatch) return undefined;

  const iconContent = iconMatch[1];

  // <function> = funzione cultuale del monumento (votive, lex_sacra, confession…)
  // NON confondere con il tipo fisico del supporto, che sta in <objectDesc>/<objectType>
  let iconFunction: string | undefined = undefined;
  const functionMatch = iconContent.match(/<(?:\w+:)?function[^>]*key="([^"]*)"/);
  if (functionMatch) iconFunction = functionMatch[1];
  // Legacy: legge anche <support key="..."> per compatibilità con schede pre-aggiornamento
  if (!iconFunction) {
    const supportMatch = iconContent.match(/<(?:\w+:)?support[^>]*key="([^"]*)"/);
    if (supportMatch) iconFunction = supportMatch[1];
  }

  let note: string | undefined = undefined;
  const noteMatch = iconContent.match(/<(?:\w+:)?note[^>]*>([\s\S]*?)<\/(?:\w+:)?note>/);
  if (noteMatch) note = noteMatch[1].trim();

  const figures: any[] = [];
  // Deve matchare sia <figure .../> (auto-chiudente, scritto da renderIconography
  // quando la figura non ha traits) sia <figure ...>...</figure> (con traits
  // annidati) — la sola forma con chiusura esplicita perdeva silenziosamente ogni
  // figura senza tratti al giro successivo di lettura (bug scoperto codificando
  // dati reali: un simbolo isolato come una falce incisa senza altri attributi).
  const figureRegex = /<(?:\w+:)?figure([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?figure>)/g;
  let figMatch;
  while ((figMatch = figureRegex.exec(iconContent)) !== null) {
    const figAttrs = figMatch[1];
    const nMatch = figAttrs.match(/n="([^"]*)"/);
    const typeMatch = figAttrs.match(/type="([^"]*)"/);
    const keyMatch = figAttrs.match(/key="([^"]*)"/);
    const placeMatch = figAttrs.match(/place="([^"]*)"/);

    if (!typeMatch || !keyMatch) continue;

    const figContent = figMatch[2] || '';
    const traits: any[] = [];
    const traitRegex = /<(?:\w+:)?trait([^>]*)>/g;
    let trMatch;
    while ((trMatch = traitRegex.exec(figContent)) !== null) {
      const trAttrs = trMatch[1];
      const tTypeMatch = trAttrs.match(/type="([^"]*)"/);
      const tKeyMatch = trAttrs.match(/key="([^"]*)"/);
      const handMatch = trAttrs.match(/hand="([^"]*)"/);
      if (tTypeMatch && tKeyMatch) {
        traits.push({
          type: tTypeMatch[1],
          key: tKeyMatch[1],
          hand: handMatch ? handMatch[1] : undefined
        });
      }
    }

    figures.push({
      n: nMatch ? parseInt(nMatch[1], 10) : 1,
      type: typeMatch[1],
      key: keyMatch[1],
      place: placeMatch ? placeMatch[1] : undefined,
      traits
    });
  }

  return { function: iconFunction, figures, note };
}

function romanToInt(roman: string): number | null {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = roman.toUpperCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]];
    const next = map[s[i + 1]];
    if (cur === undefined) return null;
    total += next !== undefined && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

function centuryBounds(n: number, era: "a.C." | "d.C."): [number, number] {
  return era === "d.C." ? [(n - 1) * 100 + 1, n * 100] : [-(n * 100), -(n * 100 - 99)];
}

// Range di secoli in numeri romani (es. "II-IV sec. d.C.", "III sec. a.C.")
// che compaiono solo come testo libero (provenienza, note), senza un
// <origDate> strutturato in XML. Non tocca il dato XML: arricchisce solo
// data_inizio/data_fine a runtime per far rientrare la scheda in filtri e
// timeline, che altrimenti la escluderebbero (nessuna data numerica nota).
export function parseCenturyRange(text: string): { start: number; end: number; match: string } | null {
  if (!text) return null;
  const re = /\b([IVXLCDM]{1,6})(?:\s*[-–—]\s*([IVXLCDM]{1,6}))?\s*sec(?:olo)?\.?\s*(a\.\s*C\.|d\.\s*C\.)/i;
  const m = text.match(re);
  if (!m) return null;
  const era: "a.C." | "d.C." = /^a/i.test(m[3].replace(/\s+/g, "")) ? "a.C." : "d.C.";
  const n1 = romanToInt(m[1]);
  if (n1 === null) return null;
  const [start1, end1] = centuryBounds(n1, era);
  const n2 = m[2] ? romanToInt(m[2]) : null;
  if (n2 === null) return { start: start1, end: end1, match: m[0] };
  const [start2, end2] = centuryBounds(n2, era);
  return { start: Math.min(start1, start2), end: Math.max(end1, end2), match: m[0] };
}

function parseTeiElement(teiString: string): Monumento {
  const extractAllMatches = (regex: RegExp, text: string): string[] => {
    const results: string[] = [];
    let match;
    const re = new RegExp(regex.source, regex.flags + 'g');
    while ((match = re.exec(text)) !== null) {
      results.push(match[1].trim());
    }
    return results;
  };

  // 1. Parse ID — purely applicative, assigned by the app at import time.
  // Only read from <idno type="id"> which is written back by the app after import.
  // All other id-like fields (filename, TM, etc.) are NOT used as applicative id.
  // id = 0 means "not yet assigned" — the app will assign a sequential id on import.
  let id = 0;
  const appIdMatch = teiString.match(/<idno\s+type="id">(\d+)<\/idno>/);
  if (appIdMatch) {
    id = parseInt(appIdMatch[1], 10);
  }

  // 2. Parse entryId (legacy files may still carry <idno type="entryId">)
  let entryId: string | undefined = undefined;
  const fbMatch = teiString.match(/<idno\s+type="entryId">([\s\S]*?)<\/idno>/)
    || teiString.match(/<idno\s+type="firebaseId">([\s\S]*?)<\/idno>/);
  if (fbMatch) {
    entryId = unescapeXml(fbMatch[1].trim());
  }

  // 3. Parse TM
  let tm = "";
  let tmLink = "";
  const tmMatch = teiString.match(/<idno\s+type="TM"([^>]*)>([\s\S]*?)<\/idno>/);
  if (tmMatch) {
    // Il contenuto può essere un commento XML segnaposto (es. "<!-- inserire
    // TM number -->") lasciato dall'estrazione automatica: va trattato come
    // campo vuoto, non mostrato alla lettera nella scheda.
    tm = unescapeXml(tmMatch[2].replace(/<!--[\s\S]*?-->/g, '').trim());
    // Legge sia "corresp" (formato corrente, unico attributo ammesso da EpiDoc su idno)
    // sia "ref" (legacy, per compatibilità con schede scritte prima del fix).
    const refMatch = tmMatch[1].match(/corresp="([^"]*)"/) || tmMatch[1].match(/ref="([^"]*)"/);
    if (refMatch) {
      const rawRef = refMatch[1].trim();
      tmLink = rawRef && !/^https?:\/\//i.test(rawRef)
        ? `https://${rawRef.replace(/^\/\//, "")}`
        : rawRef;
    }
  }

  // 4. Parse PHI list
  const phi = extractAllMatches(/<idno\s+type="PHI">([\s\S]*?)<\/idno>/, teiString).map(unescapeXml);

  // 5. Parse authority
  let authority = "";
  const authMatch = teiString.match(/<authority>([\s\S]*?)<\/authority>/);
  if (authMatch) {
    authority = unescapeXml(authMatch[1].trim());
  }

  // 5b. Parse revisionDesc (+ @status, vedi EditorialStatus in types.ts)
  const revisions: { date: string; who: string; note?: string }[] = [];
  let editorialStatus: Monumento["editorialStatus"] = undefined;
  const revisionBlock = teiString.match(/<revisionDesc([^>]*)>([\s\S]*?)<\/revisionDesc>/);
  if (revisionBlock) {
    const statusMatch = revisionBlock[1].match(/status="([^"]*)"/);
    if (statusMatch) {
      const s = unescapeXml(statusMatch[1]);
      if (s === "draft" || s === "diplomatic-edition" || s === "published" || s === "under-revision") {
        editorialStatus = s;
      }
    }
    const changeRegex = /<change\s+([^>]*)>([\s\S]*?)<\/change>/g;
    let chMatch;
    while ((chMatch = changeRegex.exec(revisionBlock[2])) !== null) {
      const attrs = chMatch[1];
      const whenMatch = attrs.match(/when="([^"]*)"/);
      const whoMatch = attrs.match(/who="([^"]*)"/);
      const note = unescapeXml(chMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
      revisions.push({
        date: whenMatch ? unescapeXml(whenMatch[1]) : '',
        who: whoMatch ? unescapeXml(whoMatch[1]) : '',
        note: note || undefined
      });
    }
  }

  // 6. Parse titolo
  // Strategy: remove <rs type="textType"> elements entirely (tag + content) since they
  // duplicate information already in textTypes[], then take the remaining descriptive text.
  let titolo = "";
  const titleMatch = teiString.match(/<titleStmt>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/);
  if (titleMatch) {
    let rawTitle = titleMatch[1].trim();
    // Remove <rs type="textType">...</rs> blocks entirely — their content duplicates textTypes
    rawTitle = rawTitle.replace(/<rs\s+[^>]*type="textType"[^>]*>[\s\S]*?<\/rs>/g, '');
    // Remove CMRDM catalog references like "— CMRDM I nr. 1:" or "CMRDM I 1"
    rawTitle = rawTitle.replace(/[—\-]?\s*CMRDM\s+[IVX]+\s+nr\.?\s*\d+\s*:/g, '');
    // Strip remaining tags and normalize whitespace
    titolo = unescapeXml(rawTitle).replace(/<[^>]+>/g, ' ').replace(/^[\s\-—:]+|[\s\-—:]+$/g, '').replace(/\s+/g, ' ').trim();
  }

  // 6b. Parse respStmt (curatori/collaboratori: chi con quale ruolo)
  const responsabili: { ruolo: string; nome: string }[] = [];
  const titleStmtBlock = teiString.match(/<titleStmt>([\s\S]*?)<\/titleStmt>/);
  if (titleStmtBlock) {
    const respRegex = /<respStmt>([\s\S]*?)<\/respStmt>/g;
    let respMatch;
    while ((respMatch = respRegex.exec(titleStmtBlock[1])) !== null) {
      const respBody = respMatch[1];
      const respoMatch = respBody.match(/<resp[^>]*>([\s\S]*?)<\/resp>/);
      const nameMatch = respBody.match(/<(?:persName|name)[^>]*>([\s\S]*?)<\/(?:persName|name)>/);
      const ruolo = respoMatch ? unescapeXml(respoMatch[1].replace(/<[^>]+>/g, '').trim()) : '';
      const nome = nameMatch ? unescapeXml(nameMatch[1].replace(/<[^>]+>/g, '').trim()) : '';
      if (ruolo || nome) responsabili.push({ ruolo, nome });
    }
  }

  // 7. Parse repository (luogo_cons)
  let luogo_cons = "";
  const repoMatch = teiString.match(/<repository[^>]*>([\s\S]*?)<\/repository>/);
  if (repoMatch) {
    luogo_cons = unescapeXml(repoMatch[1].trim());
  }

  // 8. MS physical IDNOS
  let msIdnos: string[] = [];
  const msIdBlockMatch = teiString.match(/<msIdentifier>([\s\S]*?)<\/msIdentifier>/);
  if (msIdBlockMatch) {
    msIdnos = extractAllMatches(/<idno[^>]*>([\s\S]*?)<\/idno>/, msIdBlockMatch[1]).map(unescapeXml);
  }

  // 9. Support description
  let support_p = "";
  const supportPMatch = teiString.match(/<supportDesc>[\s\S]*?<support[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/);
  if (supportPMatch) {
    support_p = resolveXmlTextWithPtrs(supportPMatch[1].trim()).resolvedText;
  }

  // 10. Material and tipo
  let materiale = "";
  let materialRef = "";
  const matMatch = teiString.match(/<material([^>]*)>([\s\S]*?)<\/material>/);
  if (matMatch) {
    materiale = unescapeXml(matMatch[2].trim());
    const refMatch = matMatch[1].match(/ref="([^"]*)"/);
    if (refMatch) materialRef = refMatch[1];
  }

  let tipo = "";
  let tipo_ref = "";
  const typeMatch = teiString.match(/<objectType([^>]*)>([\s\S]*?)<\/objectType>/);
  if (typeMatch) {
    tipo = unescapeXml(typeMatch[2].trim());
    const refMatch = typeMatch[1].match(/ref="([^"]*)"/);
    if (refMatch) tipo_ref = refMatch[1];
  }

  // 11. Dimensions
  let dim_altezza = "";
  let dim_larghezza = "";
  let dim_profondita = "";
  let dim_unita = "cm";
  const heightMatch = teiString.match(/<height([^>]*)>([\s\S]*?)<\/height>/);
  if (heightMatch) {
    dim_altezza = unescapeXml(heightMatch[2].trim());
    const unitMatch = heightMatch[1].match(/unit="([^"]*)"/);
    if (unitMatch) dim_unita = unitMatch[1];
  }
  const widthMatch = teiString.match(/<width([^>]*)>([\s\S]*?)<\/width>/);
  if (widthMatch) {
    const wAttrs = widthMatch[1];
    const atLeast = wAttrs.match(/atLeast="([^"]*)"/);
    const atMost = wAttrs.match(/atMost="([^"]*)"/);
    if (atLeast && atMost) {
      dim_larghezza = `${unescapeXml(atLeast[1])}-${unescapeXml(atMost[1])}`;
    } else if (atLeast) {
      dim_larghezza = `${unescapeXml(atLeast[1])}-`;
    } else {
      dim_larghezza = unescapeXml(widthMatch[2].trim());
    }
    const unitMatch = wAttrs.match(/unit="([^"]*)"/);
    if (unitMatch) dim_unita = unitMatch[1];
  }
  const depthMatch = teiString.match(/<depth([^>]*)>([\s\S]*?)<\/depth>/);
  if (depthMatch) {
    dim_profondita = unescapeXml(depthMatch[2].trim());
    const unitMatch = depthMatch[1].match(/unit="([^"]*)"/);
    if (unitMatch) dim_unita = unitMatch[1];
  }

  let dim = support_p || `${dim_altezza} x ${dim_larghezza} x ${dim_profondita} ${dim_unita}`.trim();

  // 12. Layout description
  let layout_desc = "";
  const layoutMatch = teiString.match(/<layoutDesc>[\s\S]*?<layout[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/);
  if (layoutMatch) {
    layout_desc = resolveXmlTextWithPtrs(layoutMatch[1].trim()).resolvedText;
  }

  let scrittura = "";
  let scrittura_ref = "";
  const rsWritingMatch = teiString.match(/<layoutDesc>[\s\S]*?<layout[^>]*>[\s\S]*?<rs([^>]*)>([\s\S]*?)<\/rs>/);
  if (rsWritingMatch) {
    scrittura = unescapeXml(rsWritingMatch[2].trim());
    const refMatch = rsWritingMatch[1].match(/ref="([^"]*)"/);
    if (refMatch) scrittura_ref = refMatch[1];
  }

  // 13. Hand notes (letter heights)
  let scrittura_note = "";
  const handPMatch = teiString.match(/<handDesc>[\s\S]*?<handNote[^>]*>([\s\S]*?)<\/handNote>/);
  if (handPMatch) {
    // Extract first <p> if present, otherwise use full content
    const handContent = handPMatch[1];
    const handP = handContent.match(/<p>([\s\S]*?)<\/p>/);
    scrittura_note = resolveXmlTextWithPtrs(handP ? handP[1].trim() : handContent.trim()).resolvedText;
  }

  // 14. Place definitions
  let citta = "";
  let place_ref_ancient = "";
  const ancientPlaceMatch = teiString.match(/<placeName\s+type="ancient"([^>]*)>([\s\S]*?)<\/placeName>/);
  if (ancientPlaceMatch) {
    citta = unescapeXml(ancientPlaceMatch[2].trim());
    const refMatch = ancientPlaceMatch[1].match(/ref="([^"]*)"/);
    if (refMatch) place_ref_ancient = refMatch[1];
  }

  let luogo_moderno = "";
  let place_ref_modern = "";
  const modernPlaceMatch = teiString.match(/<placeName\s+type="modern"([^>]*)>([\s\S]*?)<\/placeName>/);
  if (modernPlaceMatch) {
    luogo_moderno = unescapeXml(modernPlaceMatch[2].trim());
    const refMatch = modernPlaceMatch[1].match(/ref="([^"]*)"/);
    if (refMatch) place_ref_modern = refMatch[1];
  }

  let regione = "";
  const regionMatch = teiString.match(/<placeName\s+type="region"[^>]*>([\s\S]*?)<\/placeName>/);
  if (regionMatch) {
    regione = unescapeXml(regionMatch[1].trim());
  }
  // Fallback 2: <geogName type="ancientRegion"> nel profileDesc
  if (!regione) {
    const geoMatch = teiString.match(/<geogName\s+[^>]*type="ancientRegion"[^>]*>([\s\S]*?)<\/geogName>/);
    if (geoMatch) regione = unescapeXml(geoMatch[1].trim());
  }

  // Niente fallback sul range numerico del catalogo Lane: verificato sui dati
  // reali che non è affidabile (i file CMRDM-AS-028..047, tutti Asia Minor per
  // contenuto e classificazione dei curatori, cadrebbero nella fascia "Italia"
  // 28-47 della tabella sezionale di Lane). La regione corretta viene invece
  // scritta esplicitamente in <placeName type="region"> per ogni scheda in
  // fase di migrazione, a partire dal codice regione che i curatori avevano
  // già assegnato nel nome file.

  let origPlace_nota = "";
  const origPlaceMatch = teiString.match(/<origPlace>([\s\S]*?)<\/origPlace>/);
  if (origPlaceMatch) {
    let innerOrigPlace = origPlaceMatch[1];
    innerOrigPlace = innerOrigPlace.replace(/<placeName[^>]*>([\s\S]*?)<\/placeName>/g, "");
    innerOrigPlace = innerOrigPlace.replace(/<[^>]+>/g, "");
    origPlace_nota = unescapeXml(innerOrigPlace).replace(/\s+/g, ' ').trim();
    origPlace_nota = origPlace_nota.replace(/^[\s,;\n]+|[\s,;\n]+$/g, function(m) {
      return m.includes(",") ? "," : "";
    }).trim();
    origPlace_nota = origPlace_nota.replace(/^\s*,\s*/, ", ").trim();
  }

  // 15. Origin dates list
  const origDates: OrigDate[] = [];
  const originBlockMatch = teiString.match(/<origin>([\s\S]*?)<\/origin>/);
  if (originBlockMatch) {
    let originBlock = originBlockMatch[1];
    // Remove origPlace block so its text content doesn't bleed into the first origDate's prefix
    originBlock = originBlock.replace(/<origPlace>[\s\S]*?<\/origPlace>/, "");
    
    const dateRegex = /([\s\S]*?)<origDate([^>]*)>([\s\S]*?)<\/origDate>/g;
    let odMatch;
    while ((odMatch = dateRegex.exec(originBlock)) !== null) {
      const fullPreText = odMatch[1];
      let cleanPrefix = fullPreText.replace(/<[^>]+>/g, "").trim();
      cleanPrefix = cleanPrefix.replace(/^[\s,;\n]+|[\s,;\n]+$/g, "");
      
      const attrs = odMatch[2];
      const datingMethodM = attrs.match(/datingMethod="([^"]*)"/);
      const notBeforeM = attrs.match(/notBefore-custom="([^"]*)"/) || attrs.match(/notBefore="([^"]*)"/);
      const notAfterM = attrs.match(/notAfter-custom="([^"]*)"/) || attrs.match(/notAfter="([^"]*)"/);
      const precisionM = attrs.match(/precision="([^"]*)"/);
      const evidenceM = attrs.match(/evidence="([^"]*)"/);
      const whenM = attrs.match(/(?:notBefore-custom|notBefore)="([^"]*)"/) || attrs.match(/when="([^"]*)"/);
      const dateText = unescapeXml(odMatch[3].trim());

      // Handle when="YYYY" as both notBefore and notAfter
      const whenVal = whenM ? unescapeXml(whenM[1]) : undefined;

      origDates.push({
        prefix: cleanPrefix || undefined,
        datingMethod: datingMethodM ? unescapeXml(datingMethodM[1]) : undefined,
        notBeforeCustom: notBeforeM ? unescapeXml(notBeforeM[1]) : (whenVal || undefined),
        notAfterCustom: notAfterM ? unescapeXml(notAfterM[1]) : (whenVal || undefined),
        precision: precisionM ? unescapeXml(precisionM[1]) : undefined,
        evidence: evidenceM ? unescapeXml(evidenceM[1]) : undefined,
        testo: dateText
      });
    }
  }

  // Single date fields from overall block
  let data = "";
  let data_inizio: number | undefined = undefined;
  let data_fine: number | undefined = undefined;
  if (origDates.length > 0) {
    data = origDates.map(od => `${od.prefix ? od.prefix + " " : ""}${od.testo}`).join(" / ");
    const firstWithStart = origDates.find(d => d.notBeforeCustom && !isNaN(Number(d.notBeforeCustom)));
    if (firstWithStart) data_inizio = Number(firstWithStart.notBeforeCustom);
    const firstWithEnd = origDates.find(d => d.notAfterCustom && !isNaN(Number(d.notAfterCustom)));
    if (firstWithEnd) data_fine = Number(firstWithEnd.notAfterCustom);
  } else {
    const simpleDateMatch = teiString.match(/<origDate([^>]*)>([\s\S]*?)<\/origDate>/);
    if (simpleDateMatch) {
      data = unescapeXml(simpleDateMatch[2].trim());
      const attrs = simpleDateMatch[1];
      const startM = attrs.match(/notBefore-custom="(-?\d+)"/) || attrs.match(/notBefore="(-?\d+)"/);
      const endM = attrs.match(/notAfter-custom="(-?\d+)"/) || attrs.match(/notAfter="(-?\d+)"/);
      if (startM) data_inizio = parseInt(startM[1], 10);
      if (endM) data_fine = parseInt(endM[1], 10);
    }
  }

  // 16. Provenance (found & observed)
  let luogo_rit = "";
  const foundProvMatch = teiString.match(/<provenance\s+type="found"([^>]*)>([\s\S]*?)<\/provenance>/);
  if (foundProvMatch) {
    const provContent = foundProvMatch[2].trim();
    // Unwrap <p> if present
    const provP = provContent.match(/<p>([\s\S]*?)<\/p>/);
    luogo_rit = resolveXmlTextWithPtrs(provP ? provP[1].trim() : provContent).resolvedText;
  }

  let conserv = "";
  const obsProvMatch = teiString.match(/<provenance\s+type="observed"[^>]*>([\s\S]*?)<\/provenance>/);
  if (obsProvMatch) {
    const obsContent = obsProvMatch[1].trim();
    const obsP = obsContent.match(/<p>([\s\S]*?)<\/p>/);
    conserv = resolveXmlTextWithPtrs(obsP ? obsP[1].trim() : obsContent).resolvedText;
  }

  // Nessun <origDate> strutturato ma una datazione a più secoli discussa in
  // prosa nella provenienza (es. "II-III sec. d.C.") — fallback per non
  // escludere la scheda da filtri/timeline per data (vedi parseCenturyRange).
  if (data_inizio === undefined && data_fine === undefined) {
    const centuryGuess = parseCenturyRange(luogo_rit) || parseCenturyRange(origPlace_nota);
    if (centuryGuess) {
      data_inizio = centuryGuess.start;
      data_fine = centuryGuess.end;
      if (!data) data = centuryGuess.match;
    }
  }

  // 17. Text type (iscrizione vs anepigr)
  let iscrizione = false;
  let anepigr = false;
  const textTypes: string[] = [];
  
  const textTypeMatches = teiString.match(/<rs\s+type="textType"([^>]*)>([\s\S]*?)<\/rs>/g);
  if (textTypeMatches) {
    for (const matchStr of textTypeMatches) {
      const innerText = matchStr.replace(/<[^>]+>/g, "").trim();
      const lower = innerText.toLowerCase();
      if (lower.includes("decreto") || lower.includes("iscrizione") || lower.includes("epigrafe") || lower.includes("onorario")) {
        iscrizione = true;
      }
      if (lower.includes("anepigrafe") || lower.includes("senza iscrizione")) {
        anepigr = true;
      }
      const unescapedTxt = unescapeXml(innerText).replace(/\s+/g, ' ').trim();
      if (unescapedTxt && unescapedTxt.toLowerCase() !== 'iscrizione greca' && !textTypes.includes(unescapedTxt)) {
        textTypes.push(unescapedTxt);
      }
    }
  }
  
  const textTypeSimpleMatches = teiString.match(/<rs\s+type="textType">([\s\S]*?)<\/rs>/g);
  if (textTypeSimpleMatches) {
    for (const matchStr of textTypeSimpleMatches) {
      const innerText = matchStr.replace(/<[^>]+>/g, "").trim();
      const lower = innerText.toLowerCase();
      if (lower.includes("decreto") || lower.includes("iscrizione") || lower.includes("epigrafe") || lower.includes("onorario")) {
        iscrizione = true;
      }
      if (lower.includes("anepigrafe") || lower.includes("senza iscrizione")) {
        anepigr = true;
      }
      const unescapedTxt = unescapeXml(innerText).replace(/\s+/g, ' ').trim();
      if (unescapedTxt && unescapedTxt.toLowerCase() !== 'iscrizione greca' && !textTypes.includes(unescapedTxt)) {
        textTypes.push(unescapedTxt);
      }
    }
  }

  // 18. Facsimile image
  let facsimile_url = "";
  let facsimile_desc = "";
  const graphicMatch = teiString.match(/<graphic\s+url="([^"]*)"([^>]*)>([\s\S]*?)<\/graphic>/);
  if (graphicMatch) {
    facsimile_url = unescapeXml(graphicMatch[1]);
    const descM = graphicMatch[3].match(/<desc>([\s\S]*?)<\/desc>/);
    if (descM) facsimile_desc = unescapeXml(descM[1]);
  } else {
    const graphicSelfCloseMatch = teiString.match(/<graphic\s+url="([^"]*)"\s*\/?>/);
    if (graphicSelfCloseMatch) {
      facsimile_url = unescapeXml(graphicSelfCloseMatch[1]);
    }
  }

  // 19. Edition xml text body
  let testo = "";
  const editionMatch = teiString.match(/<div type="edition"[^>]*>([\s\S]*?)(?:<\/div>\s*<div type="(?:apparatus|translation|commentary|bibliography)"|<\/body>|<\/text>)/);
  if (editionMatch) {
    testo = unescapeXml(editionMatch[1].trim());
  }

  // 19b. Testo indicizzabile per la ricerca full-text (MiniSearch) — derivato
  // da `testo` (già unescaped, con i tag XML EpiDoc ancora dentro). Rispetta
  // <lb break="no"/>, <supplied>, <gap>/<space> e <choice><corr>/<sic></choice>
  // invece di uno strip generico dei tag (vedi extractSearchableText sopra).
  const { testo: testo_searchable, suppliedRanges: supplied_ranges } = extractSearchableText(testo);

  // 20. Epiteti
  // Source 1: <keywords scheme="epiteti"><term> — manually curated
  const epiteti: string[] = [];
  const epitetiBlock = teiString.match(/<keywords\s+scheme="epiteti">([\s\S]*?)<\/keywords>/);
  if (epitetiBlock) {
    const termRegex = /<term>([\s\S]*?)<\/term>/g;
    let tMatch;
    while ((tMatch = termRegex.exec(epitetiBlock[1])) !== null) {
      const val = unescapeXml(tMatch[1].trim());
      if (val) epiteti.push(val);
    }
  }

  // Source 2: <rs type="epithet"> inside <div type="edition"> — extract text content
  // These are epithets explicitly marked by the editor in the transcription
  // NOTE: regex must capture the FULL edition block including nested <div type="textpart">
  // elements — the old `([\s\S]*?)<\/div>` stopped at the first closing </div> (end of
  // the first textpart), missing any persName/rs elements in subsequent textparts.
  // The new regex reads everything from <div type="edition"> up to the next sibling div
  // (apparatus/translation/commentary/bibliography) or </body>, whichever comes first.
  const editionBlockForEpiteti = teiString.match(/<div\s+type="edition"[^>]*>([\s\S]*?)(?=<div\s+type="(?:apparatus|translation|commentary|bibliography)"|<\/body>)/);
  if (editionBlockForEpiteti) {
    // Capture the full <rs ...> opening tag (group 1 = attributes) and inner text (group 2).
    // Preference: use the key="" attribute as the canonical epithet label; fall back to
    // the inner Greek text only when no key is present.
    const rsEpithetRegex = /<rs\s+([^>]*type="epithet"[^>]*)>([\s\S]*?)<\/rs>/g;
    // Source 2 intentionally does NOT populate epiteti.
    // The canonical English epithet label is extracted by Source 3 from
    // persName key tokens (e.g. "Men Tyrannos" → "Tyrannos").
    // Extracting Greek text here would produce duplicate entries
    // ("Τυράννου", "Τυράννῳ", "Tyrannos") for the same epithet.
    void 0;
  }

  // Source 3: <persName type="divine" key="...">
  // The key attribute follows the convention "DivinityName Epithet1 Epithet2..."
  // Leading token(s) = divine name, remaining tokens = epithet(s) added to epiteti.
  //
  // FIX (2026-07): the old logic always took ONLY the first key token as the
  // divine name, on the assumption a theonym is always one word. That breaks
  // for syncretic/compound theonyms with more than one <name> child (e.g.
  // "Helios Apollo Kisaulodenos": <name>Ἡλίου</name><name>Ἀπόλλωνος</name>
  // <rs type="epithet">Κισαυλοδδηνοῦ</rs>, key="Helios Apollo Kisaulodenos") —
  // "Apollo" was wrongly pushed into epiteti as if it were a cult epithet of
  // "Helios", polluting the epiteti list with what is really part of the
  // divinity's own compound name. Fix: count the actual <name> children
  // inside the persName and use that count to decide how many leading key
  // tokens belong to the divinity name, instead of hard-coding "1".
  const divinita: string[] = [];
  // Associazione per-persName divinità → SUOI epiteti (non un flat cross-
  // product): ogni <persName type="divine"> incontrato contribuisce una
  // entry qui con esattamente gli epiteti che gli appartengono. Vedi
  // src/types.ts per il perché questo esiste accanto a divinita/epiteti piatti.
  const divinitaEpiteti: { divinita: string; epiteti: string[] }[] = [];
  const pushDivinitaEpiteti = (divName: string, eps: string[]) => {
    if (!divName) return;
    const existing = divinitaEpiteti.find(d => d.divinita === divName);
    if (existing) {
      eps.forEach(e => { if (e && !existing.epiteti.includes(e)) existing.epiteti.push(e); });
    } else {
      divinitaEpiteti.push({ divinita: divName, epiteti: [...new Set(eps.filter(Boolean))] });
    }
  };
  if (editionBlockForEpiteti) {
    const persNameDivineRegex = /<persName\s+[^>]*type="divine"([^>]*)>([\s\S]*?)<\/persName>/g;
    let pdMatch;
    while ((pdMatch = persNameDivineRegex.exec(editionBlockForEpiteti[1])) !== null) {
      const attrs = pdMatch[1];
      const inner = pdMatch[2];
      const keyMatch = attrs.match(/key="([^"]*)"/);

      // Structured children, used to disambiguate compound theonyms from
      // single-word ones, and as a clean fallback source when key is absent.
      const nameChildren = [...inner.matchAll(/<name\b[^>]*>([\s\S]*?)<\/name>/g)]
        .map(m => unescapeXml(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()))
        .filter(Boolean);
      const epithetChildren = [...inner.matchAll(/<rs\s+[^>]*type="epithet"[^>]*>([\s\S]*?)<\/rs>/g)]
        .map(m => unescapeXml(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()))
        .filter(Boolean);

      if (keyMatch) {
        const keyVal = unescapeXml(keyMatch[1].trim());
        // Number of leading tokens that make up the divinity name: the count
        // of <name> children if any are present (handles 1+ compound
        // theonyms correctly), otherwise the legacy default of 1 token
        // (covers the "frase intera" pattern, where the persName has no
        // decomposable <name>/<rs> children at all).
        //
        // NOTE: this undercounts when a single <name> tag wraps a multi-word
        // compound ("Μεγάλη Μήτηρ" as ONE element) or when a repeated/
        // abbreviated later mention spells fewer words than the compound
        // name it stands for. A tempting fix (derive the count from
        // tokens.length - epithetChildren.length instead) was tried and
        // reverted: it breaks whenever an <rs type="epithet"> exists in the
        // text that ISN'T part of the normalized key (e.g. a secondary
        // Latin epithet like "Summae Parenti" alongside key="Magna Mater"),
        // which is common enough in this corpus to cause more regressions
        // than it fixes. Fix miscounts at the XML source instead (split the
        // <name> tag into one per word) rather than re-guessing here.
        const { divinity: divName, epiteti: epithetTokens } = splitDivineKey(keyVal, nameChildren.length);
        if (divName && !divinita.includes(divName)) divinita.push(divName);
        epithetTokens.forEach(ep => {
          if (ep && !epiteti.includes(ep)) epiteti.push(ep);
        });
        pushDivinitaEpiteti(divName, epithetTokens);
      } else {
        // No key: build divinita/epiteti from the structured children
        // instead of dumping the whole element text as one blob — that
        // used to smuggle the epithet into divinita as a single compound
        // string (e.g. "Apollo Terminteo" or "Ἀπόλλωνι τῶι Τερμινθεῖ" as
        // ONE divinity entry), which is exactly the pollution this fixes.
        // NOTE: a persName[type=divine] without @key is non-canonical per
        // the project skill (key is mandatory) — this branch is a
        // best-effort fallback for legacy/incomplete files, not the norm.
        if (nameChildren.length > 0) {
          const divName = canonicalDivinityName(nameChildren.join(' '));
          if (divName && !divinita.includes(divName)) divinita.push(divName);
          pushDivinitaEpiteti(divName, []);
        } else {
          // Fully unstructured "frase intera" with no @key and no <name>
          // children either: nothing clean to extract. Skip rather than
          // push a compound blob into divinita.
        }
        // Greek epithet text is intentionally NOT added to epiteti here
        // (same reasoning as the disabled Source 2 above): without a key
        // there is no normalized English label, and indexing raw Greek
        // inflected forms would reintroduce duplicate variants.
        void epithetChildren;
      }
    }
  }

  // Also extract divine names from <keywords scheme="divinita"> if present.
  //
  // FIX (2026-07): these terms are "manually curated" and used to be trusted
  // verbatim — but that means a term baked in BEFORE the Source 3 fix above
  // (e.g. a stale "Men Tyrannos" written by an older export) keeps re-adding
  // the unsplit compound forever, alongside the freshly-split "Men" from the
  // persName in the text. Apply the same normalization here: a term is
  // expected to be a single divinity label by convention (see
  // template-canonico.md), so if it has extra tokens, treat the first as the
  // divinity name and the rest as epithet(s) — consistent with every other
  // "Name Epithet" string in the project instead of trusting it blindly.
  const divKeyBlock = teiString.match(/<keywords\s+scheme="divinita">([\s\S]*?)<\/keywords>/);
  if (divKeyBlock) {
    const termRegex = /<term>([\s\S]*?)<\/term>/g;
    let dMatch;
    while ((dMatch = termRegex.exec(divKeyBlock[1])) !== null) {
      const val = unescapeXml(dMatch[1].trim());
      if (!val) continue;
      // Se il termine intero coincide già con una divinità nota (nome
      // composto già riconosciuto dal persName nello stesso monumento, es.
      // "Kore Selene", "Agathos Daimon"), non spezzarlo: la prima-parola-
      // sempre-nome era corretta solo per "Nome Epiteto", non per teonimi
      // composti curati come termine unico.
      if (divinita.includes(val)) continue;
      const tokens = val.split(/\s+/);
      const divName = canonicalDivinityName(tokens[0]);
      if (divName && !divinita.includes(divName)) divinita.push(divName);
      const kwEpithets = tokens.slice(1);
      kwEpithets.forEach(ep => {
        if (ep && !epiteti.includes(ep)) epiteti.push(ep);
      });
      pushDivinitaEpiteti(divName, kwEpithets);
    }
  }

  // Source 4: <persName type="attested" key="..."> (Onomastica)
  const onomastica: string[] = [];
  if (editionBlockForEpiteti) {
    const persNameAttestedRegex = /<persName\s+[^>]*type="attested"([^>]*)>([\s\S]*?)<\/persName>/g;
    let paMatch;
    while ((paMatch = persNameAttestedRegex.exec(editionBlockForEpiteti[1])) !== null) {
      const attrs = paMatch[1];
      const keyMatch = attrs.match(/key="([^"]*)"/);
      let val = "";
      if (keyMatch) {
        val = unescapeXml(keyMatch[1].trim());
      } else {
        // Fall back to text content of the persName
        val = unescapeXml(paMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
      }
      if (val && !onomastica.includes(val)) onomastica.push(val);
    }
  }

  // Persone: <listPerson><person>...
  const persone: { xmlId: string; key?: string; nymRef?: string; name: string; ethnicRef?: string; ethnicNymRef?: string; ethnicText?: string; note?: string; }[] = [];
  const listPersonBlock = teiString.match(/<listPerson>([\s\S]*?)<\/listPerson>/);
  if (listPersonBlock) {
    const personRegex = /<person\s+[^>]*xml:id="([^"]*)"[^>]*>([\s\S]*?)<\/person>/g;
    let personMatch;
    while ((personMatch = personRegex.exec(listPersonBlock[1])) !== null) {
      const xmlId = unescapeXml(personMatch[1].trim());
      const pContent = personMatch[2];
      
      let key = undefined;
      const keyMatch = pContent.match(/<persName[^>]*key="([^"]*)"[^>]*>/);
      if (keyMatch) key = unescapeXml(keyMatch[1].trim());

      let name = "";
      let nymRef = undefined;
      const nameMatch = pContent.match(/<name([^>]*)>([\s\S]*?)<\/name>/);
      if (nameMatch) {
        const nameAttrs = nameMatch[1];
        name = unescapeXml(nameMatch[2].replace(/<[^>]+>/g, '').trim());
        const nymRefMatch = nameAttrs.match(/nymRef="([^"]*)"/);
        if (nymRefMatch) nymRef = unescapeXml(nymRefMatch[1].trim());
      } else {
        const persNameMatch = pContent.match(/<persName[^>]*>([\s\S]*?)<\/persName>/);
        if (persNameMatch) {
           name = unescapeXml(persNameMatch[1].replace(/<[^>]+>/g, '').trim());
        }
      }

      let ethnicRef = undefined;
      let ethnicNymRef = undefined;
      let ethnicText = undefined;
      const ethnicMatch = pContent.match(/<placeName[^>]*type="ethnic"([^>]*)>([\s\S]*?)<\/placeName>/);
      if (ethnicMatch) {
        const ethnicAttrs = ethnicMatch[1];
        ethnicText = unescapeXml(ethnicMatch[2].replace(/<[^>]+>/g, '').trim());
        const refMatch = ethnicAttrs.match(/ref="([^"]*)"/);
        if (refMatch) ethnicRef = unescapeXml(refMatch[1].trim());
        const eNymRefMatch = ethnicAttrs.match(/nymRef="([^"]*)"/);
        if (eNymRefMatch) ethnicNymRef = unescapeXml(eNymRefMatch[1].trim());
      }

      let note = undefined;
      const noteMatch = pContent.match(/<note>([\s\S]*?)<\/note>/);
      if (noteMatch) {
        note = unescapeXml(noteMatch[1].replace(/<[^>]+>/g, '').trim());
      }

      persone.push({ xmlId, key, nymRef, name, ethnicRef, ethnicNymRef, ethnicText, note });
    }
  }

  // Also extract onomastica names from <keywords scheme="onomastica"> if present
  const onoKeyBlock = teiString.match(/<keywords\s+scheme="onomastica">([\s\S]*?)<\/keywords>/);
  if (onoKeyBlock) {
    const termRegex = /<term>([\s\S]*?)<\/term>/g;
    let oMatch;
    while ((oMatch = termRegex.exec(onoKeyBlock[1])) !== null) {
      const val = unescapeXml(oMatch[1].trim());
      if (val && !onomastica.includes(val)) onomastica.push(val);
    }
  }

  // Imperatori: <persName type="emperor" key="...">
  const imperatori: string[] = [];
  if (editionBlockForEpiteti) {
    const emperorRegex = /<persName\s+[^>]*type="emperor"([^>]*)>[\s\S]*?<\/persName>/g;
    let emMatch;
    while ((emMatch = emperorRegex.exec(editionBlockForEpiteti[1])) !== null) {
      const attrs = emMatch[1];
      const keyMatch = attrs.match(/key="([^"]*)"/);
      if (keyMatch) {
        const val = unescapeXml(keyMatch[1].trim());
        if (val && !imperatori.includes(val)) imperatori.push(val);
      }
    }
  }

  // 21. Apparatus
  let apparatus: { loc: string; note: string }[] | string = [];
  const appMatch = teiString.match(/<div type="apparatus"[^>\/]*>([\s\S]*?)<\/div>/);
  if (appMatch) {
    const appContent = appMatch[1].trim();
    if (appContent.includes("<div")) {
      apparatus = [];
    } else {
      const appTagRegex = /<app\s+[^>]*loc="([^"]*)"[^>]*>([\s\S]*?)<\/app>/g;
      const entries: { loc: string; note: string }[] = [];
      let tagMatch;
      while ((tagMatch = appTagRegex.exec(appContent)) !== null) {
        const loc = unescapeXml(tagMatch[1].trim());
        const innerContent = tagMatch[2];
        let note = "";

        // Format 1: <note> only (52.xml style)
        const noteMatch = innerContent.match(/<note[^>]*>([\s\S]*?)<\/note>/);
        if (noteMatch) {
          note = resolveXmlTextWithPtrs(noteMatch[1].trim()).resolvedText;
        } else {
          // Format 2: <lem>/<rdg> (IGCyr style)
          const lemMatch = innerContent.match(/<lem[^>]*>([\s\S]*?)<\/lem>/);
          const rdgMatches: string[] = [];
          const rdgRegex = /<rdg[^>]*(?:resp="([^"]*)")?[^>]*>([\s\S]*?)<\/rdg>/g;
          let rdgMatch;
          while ((rdgMatch = rdgRegex.exec(innerContent)) !== null) {
            const resp = rdgMatch[1] ? rdgMatch[1].replace(/^#/, '') : '';
            const rdgText = resolveXmlTextWithPtrs(rdgMatch[2].trim()).resolvedText;
            if (rdgText) rdgMatches.push(resp ? `${resp}: ${rdgText}` : rdgText);
          }
          if (lemMatch) {
            const lemText = resolveXmlTextWithPtrs(lemMatch[1].trim()).resolvedText;
            // Check for <note> inside <lem>
            const lemNote = lemMatch[1].match(/<note[^>]*>([\s\S]*?)<\/note>/);
            const lemNoteText = lemNote ? resolveXmlTextWithPtrs(lemNote[1].trim()).resolvedText : '';
            note = lemText + (lemNoteText ? ` [${lemNoteText}]` : '');
            if (rdgMatches.length > 0) note += ' | ' + rdgMatches.join(' | ');
          } else if (rdgMatches.length > 0) {
            note = rdgMatches.join(' | ');
          } else {
            note = resolveXmlTextWithPtrs(innerContent.trim()).resolvedText;
          }
        }
        if (note) entries.push({ loc, note });
      }
      if (entries.length > 0) {
        apparatus = entries;
      } else {
        const plain = unescapeXml(appContent).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        apparatus = isPlaceholder(plain) ? '' : plain;
      }
    }
  }

  // 22. Traduzioni
  const traduzioni: Traduzione[] = [];
  const transRegex = /<div type="translation" xml:lang="([^"]+)"[^>\/]*>([\s\S]*?)<\/div>/g;
  let traMatch;
  while ((traMatch = transRegex.exec(teiString)) !== null) {
    const lang = traMatch[1];
    const divContent = traMatch[2];
    
    const pRegex = /<p>([\s\S]*?)<\/p>/g;
    const pTexts: string[] = [];
    let pMatch;
    while ((pMatch = pRegex.exec(divContent)) !== null) {
      pTexts.push(unescapeXml(pMatch[1].trim()));
    }
    const testoTrRaw = pTexts.length > 0 ? pTexts.join("\n") : unescapeXml(divContent.trim());
    const testoTr = isPlaceholder(testoTrRaw) ? '' : testoTrRaw;
    
    const noteMatch = divContent.match(/<note>([\s\S]*?)<\/note>/);
    let noteTr = noteMatch ? noteMatch[1].trim() : "";
    noteTr = unescapeXml(noteTr);
    if (isPlaceholder(noteTr)) noteTr = "";
    
    traduzioni.push({
      lang,
      testo: testoTr,
      note: noteTr
    });
  }

  // 23. Commentary (note_interne)
  let note_interne = "";
  let note_interne_rawXml = "";
  const commMatch = teiString.match(/<div type="commentary"[^>\/]*>([\s\S]*?)<\/div>/);
  if (commMatch) {
    const pMatch = commMatch[1].match(/<p>([\s\S]*?)<\/p>/);
    const contentToParse = pMatch ? pMatch[1].trim() : commMatch[1].trim();
    const resolvedObj = resolveXmlTextWithPtrs(contentToParse);
    note_interne = resolvedObj.resolvedText;
    note_interne_rawXml = resolvedObj.rawXml;
  }

  // 24. Bibliography
  const bibliografia: Bibliografia[] = [];
  const biblBlockMatch = teiString.match(/<div type="bibliography"[^>\/]*>([\s\S]*?)<\/div>/);
  if (biblBlockMatch) {
    const biblBlock = biblBlockMatch[1];

    // Detect style: if there is text content outside <bibl> elements (IGCyr style),
    // treat the whole block as a single prose entry resolved together.
    // Otherwise parse each <bibl> as a separate entry (52.xml style).
    const textOutsideBibl = biblBlock
      .replace(/<bibl>[\s\S]*?<\/bibl>/g, '')
      .replace(/<head>[\s\S]*?<\/head>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const hasProseConnectors = textOutsideBibl.length > 3; // e.g. ", whence", "and", "cf."

    if (hasProseConnectors) {
      // IGCyr style: resolve the whole <p> content as a single entry
      const pMatch = biblBlock.match(/<p>([\s\S]*?)<\/p>/);
      const blockContent = pMatch ? pMatch[1] : biblBlock;
      const resolved = resolveXmlTextWithPtrs(blockContent);
      if (resolved.resolvedText) {
        bibliografia.push({
          titolo: resolved.resolvedText,
          citedRanges: resolved.citedRanges,
          rawXml: resolved.rawXml
        });
      }
    } else {
      // 52.xml style: each <bibl> is a separate entry
      const biblRegex = /<bibl>([\s\S]*?)<\/bibl>/g;
      let bMatch;
      while ((bMatch = biblRegex.exec(biblBlock)) !== null) {
        const biblContent = bMatch[1].trim();
        if (!biblContent) continue;
        const resolved = resolveXmlTextWithPtrs(biblContent);
        if (resolved.resolvedText) {
          bibliografia.push({
            titolo: resolved.resolvedText,
            citedRanges: resolved.citedRanges,
            rawXml: resolved.rawXml
          });
        }
      }
    }
  }

  return {
    id,
    entryId,
    tm,
    tmLink,
    phi,
    authority,
    titolo,
    luogo_cons,
    msIdnos,
    dim,
    dim_altezza,
    dim_larghezza,
    dim_profondita,
    dim_unita,
    materiale,
    tipo,
    tipo_ref,
    materialRef,
    layout_desc,
    scrittura,
    scrittura_ref,
    scrittura_note,
    citta,
    place_ref_ancient,
    luogo_rit,
    place_ref_modern,
    luogo_moderno,
    origPlace_nota,
    regione,
    origDates,
    data,
    data_inizio,
    data_fine,
    conserv,
    facsimile_url,
    facsimile_desc,
    testo,
    testo_searchable,
    supplied_ranges,
    epiteti,
    divinita,
    divinitaEpiteti,
    onomastica,
    persone,
    imperatori,
    revisions,
    editorialStatus,
    apparatus,
    testo_tradotto: Array.isArray(apparatus) ? apparatus.map(e => `${e.loc}: ${e.note}`).join('\n') : apparatus,
    traduzioni,
    note_interne,
    note_interne_rawXml,
    bibliografia,
    responsabili,
    textTypes,
    iscrizione,
    anepigr,
    iconografia: extractIconography(teiString),
  } as Monumento;
}

/**
 * Serializza <xenoData><iconography> a partire da IconographyData. Unica fonte
 * usata sia per le schede nuove (monumentiToXml) sia per il patch di schede
 * esistenti (server.ts), così le due scritture non possono divergere nel
 * formato. Ritorna null se non c'è nulla da scrivere (funzione/figure/nota
 * tutte assenti) — il chiamante decide se questo significa "non toccare" o
 * "rimuovi il blocco esistente".
 */
export function renderIconography(ico: IconographyData | undefined, indent: string): string | null {
  if (!ico) return null;
  const hasContent = !!ico.function || (ico.figures && ico.figures.length > 0) || !!ico.note;
  if (!hasContent) return null;

  const i1 = indent + "    ", i2 = i1 + "    ", i3 = i2 + "    ";
  // <xenoData> nello schema EpiDoc ammette solo elementi FUORI dal namespace TEI
  // (Jing: "element iconography not allowed anywhere") — perciò questo blocco,
  // che non è EpiDoc standard, va in un namespace dedicato "ica:".
  const lines = [`${indent}<xenoData>`, `${i1}<ica:iconography xmlns:ica="https://ila-project.org/ns/iconography">`];
  if (ico.function) lines.push(`${i2}<ica:function key="${escapeXml(ico.function)}"/>`);
  (ico.figures || []).forEach((f, idx) => {
    // n rispecchia sempre la posizione corrente nell'array (mai un valore
    // storico stantio) — così una figura rimossa non lascia numerazioni
    // disallineate nelle figure successive.
    const fAttrs = [`n="${idx + 1}"`];
    if (f.type) fAttrs.push(`type="${escapeXml(f.type)}"`);
    if (f.key) fAttrs.push(`key="${escapeXml(f.key)}"`);
    if (f.place) fAttrs.push(`place="${escapeXml(f.place)}"`);
    const traits = (f.traits || []).filter(t => t.type && t.key);
    if (traits.length === 0) {
      lines.push(`${i2}<ica:figure ${fAttrs.join(" ")}/>`);
    } else {
      lines.push(`${i2}<ica:figure ${fAttrs.join(" ")}>`);
      traits.forEach(t => {
        const tAttrs = [`type="${escapeXml(t.type)}"`, `key="${escapeXml(t.key)}"`];
        if (t.hand) tAttrs.push(`hand="${escapeXml(t.hand)}"`);
        lines.push(`${i3}<ica:trait ${tAttrs.join(" ")}/>`);
      });
      lines.push(`${i2}</ica:figure>`);
    }
  });
  if (ico.note) lines.push(`${i2}<ica:note>${escapeXml(ico.note)}</ica:note>`);
  lines.push(`${i1}</ica:iconography>`, `${indent}</xenoData>`);
  return lines.join("\n");
}

export function monumentiToXml(monumenti: Monumento[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?xml-model href="http://epidoc.stoa.org/schema/latest/tei-epidoc.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>\n';

  const formatTEIBlock = (m: Monumento): string => {
    let block = `<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:lang="en">\n`;
    
    let titleContent = "";
    if (m.titolo && m.titolo.includes("<")) {
      titleContent = m.titolo;
    } else {
      // Quando textTypes è vuoto va ricostruito il generico di default che il
      // parser esclude deliberatamente da textTypes (vedi sopra, "iscrizione
      // greca"): MAI m.tipo, che è il supporto fisico (stele/altare/blocco),
      // un concetto diverso dal genere testuale — confonderli qui rendeva
      // iscrizione/anepigr/textTypes tutti sbagliati dopo un semplice salvataggio.
      const defaultRs = m.anepigr ? 'Anepigrafe' : (m.iscrizione !== false ? 'Iscrizione greca' : 'Monumento');
      const rs_parts = (m.textTypes && m.textTypes.length > 0)
        ? m.textTypes.map(t => `<rs type="textType">${escapeXml(t)}</rs>`).join(' ')
        : `<rs type="textType">${escapeXml(defaultRs)}</rs>`;
      titleContent = `${rs_parts} ${escapeXml(m.titolo || '')}`;
    }

    const auth = m.authority !== undefined ? m.authority : "";

    block += `    <teiHeader>\n`;
    block += `        <fileDesc>\n`;
    block += `            <titleStmt>\n`;
    block += `                <title>${titleContent}</title>\n`;
    for (const r of m.responsabili || []) {
      if (!r.ruolo && !r.nome) continue;
      block += `                <respStmt>\n`;
      block += `                    <resp>${escapeXml(r.ruolo)}</resp>\n`;
      block += `                    <name>${escapeXml(r.nome)}</name>\n`;
      block += `                </respStmt>\n`;
    }
    block += `            </titleStmt>\n`;
    block += `            <publicationStmt>\n`;
    block += `                <authority>${escapeXml(auth)}</authority>\n`;
    if (m.id) block += `                <idno type="id">${m.id}</idno>\n`;
    if (m.entryId) block += `                <idno type="entryId">${escapeXml(m.entryId)}</idno>\n`;
    if (m.tm) {
      // idno non ammette @ref nello schema EpiDoc (Jing: attributo non consentito);
      // @corresp è l'attributo TEI equivalente per puntare a una risorsa correlata.
      const tmRefAttr = m.tmLink ? ` corresp="${escapeXml(m.tmLink)}"` : "";
      block += `                <idno type="TM"${tmRefAttr}>${escapeXml(m.tm)}</idno>\n`;
    }
    if (m.phi && m.phi.length > 0) {
      for (const p of m.phi) {
        block += `                <idno type="PHI">${escapeXml(p)}</idno>\n`;
      }
    }
    block += `            </publicationStmt>\n`;
    
    block += `            <sourceDesc>\n`;
    block += `                <msDesc>\n`;
    block += `                    <msIdentifier>\n`;
    block += `                        <repository>${escapeXml(m.luogo_cons || 'in situ or lost')}</repository>\n`;
    // msIdentifier è il numero di inventario fisico dell'oggetto (museo), non
    // il numero di catalogo Lane — quello vive solo in bibliografia. Si omette
    // se ignoto, non si inventa un valore di ripiego.
    if (m.msIdnos && m.msIdnos.length > 0) {
      for (const mid of m.msIdnos) {
        block += `                        <idno>${escapeXml(mid)}</idno>\n`;
      }
    }
    block += `                    </msIdentifier>\n`;
    
    block += `                    <physDesc>\n`;
    block += `                        <objectDesc>\n`;
    block += `                            <supportDesc>\n`;
    block += `                                <support>\n`;
    block += `                                    <p>${escapeXml(m.dim || '')}</p>\n`;
    const mat_ref = m.materialRef || (m.materiale === "marmo" ? "https://www.eagle-network.eu/voc/material/lod/48.html" : "");
    block += `                                    <material${mat_ref ? ` ref="${escapeXml(mat_ref)}"` : ""}>${escapeXml(m.materiale)}</material>\n`;
    const type_ref = m.tipo_ref !== undefined ? m.tipo_ref : "";
    block += `                                    <objectType${type_ref ? ` ref="${escapeXml(type_ref)}"` : ""}>${escapeXml(m.tipo)}</objectType>\n`;
    
    block += `                                    <dimensions>\n`;
    block += `                                        <height${m.dim_unita ? ` unit="${escapeXml(m.dim_unita)}"` : ' unit="cm"'}>${escapeXml(m.dim_altezza || '')}</height>\n`;
    block += `                                        <width${m.dim_unita ? ` unit="${escapeXml(m.dim_unita)}"` : ' unit="cm"'}>${escapeXml(m.dim_larghezza || '')}</width>\n`;
    block += `                                        <depth${m.dim_unita ? ` unit="${escapeXml(m.dim_unita)}"` : ' unit="cm"'}>${escapeXml(m.dim_profondita || '')}</depth>\n`;
    block += `                                    </dimensions>\n`;
    block += `                                </support>\n`;
    block += `                            </supportDesc>\n`;
    
    block += `                            <layoutDesc>\n`;
    block += `                                <layout>\n`;
    block += `                                    <p>${escapeXml(m.layout_desc || m.titolo || '')}</p>\n`;
    const s_ref = m.scrittura_ref || "http://www.eagle-network.eu/voc/writing/lod/1";
    block += `                                    <rs ref="${escapeXml(s_ref)}">${escapeXml(m.scrittura || 'incisa a scalpello')}</rs>\n`;
    block += `                                </layout>\n`;
    block += `                            </layoutDesc>\n`;
    block += `                        </objectDesc>\n`;
    
    block += `                        <handDesc>\n`;
    block += `                            <handNote>\n`;
    block += `                                <p>${escapeXml(m.scrittura_note || '')}</p>\n`;
    block += `                            </handNote>\n`;
    block += `                        </handDesc>\n`;
    block += `                    </physDesc>\n`;
    
    block += `                    <history>\n`;
    block += `                        <origin>\n`;
    block += `                            <origPlace>\n`;
    const anc_ref = m.place_ref_ancient ? ` ref="${escapeXml(m.place_ref_ancient)}"` : "";
    const mod_ref = m.place_ref_modern ? ` ref="${escapeXml(m.place_ref_modern)}"` : "";
    block += `                                <placeName type="ancient"${anc_ref}>${escapeXml(m.citta)}</placeName>\n`;
    block += `                                <placeName type="modern"${mod_ref}>${escapeXml(m.luogo_moderno || m.citta)}</placeName>\n`;
    if (m.regione) {
      block += `                                <placeName type="region">${escapeXml(m.regione)}</placeName>\n`;
    }
    if (m.origPlace_nota) {
      block += `                                ${escapeXml(m.origPlace_nota)}\n`;
    }
    block += `                            </origPlace>\n`;
    
    if (m.origDates && m.origDates.length > 0) {
      for (const od of m.origDates) {
        // Skip empty origDate entries
        if (!od.testo && !od.notBeforeCustom && !od.notAfterCustom) continue;
        const pref = od.prefix ? `${escapeXml(od.prefix)} ` : "";
        const datMeth = od.datingMethod ? ` datingMethod="${escapeXml(od.datingMethod)}"` : ' datingMethod="#julian"';
        const notB = od.notBeforeCustom ? ` notBefore-custom="${escapeXml(od.notBeforeCustom)}"` : "";
        const notA = od.notAfterCustom ? ` notAfter-custom="${escapeXml(od.notAfterCustom)}"` : "";
        const prec = od.precision ? ` precision="${escapeXml(od.precision)}"` : "";
        const evid = od.evidence ? ` evidence="${escapeXml(od.evidence)}"` : "";
        block += `                            ${pref}<origDate${datMeth}${notB}${notA}${prec}${evid}>${escapeXml(od.testo)}</origDate>\n`;
      }
    } else if (m.data || m.data_inizio !== undefined) {
      const notBAttr = m.data_inizio !== undefined ? ` notBefore-custom="${m.data_inizio}"` : "";
      const notAAttr = m.data_fine !== undefined ? ` notAfter-custom="${m.data_fine}"` : "";
      block += `                            <origDate datingMethod="#julian"${notBAttr}${notAAttr}>${escapeXml(m.data || '')}</origDate>\n`;
    }
    block += `                        </origin>\n`;
    block += `                        <provenance type="found">${escapeXml(m.luogo_rit || '')}</provenance>\n`;
    block += `                        <provenance type="observed" subtype="autopsied">${escapeXml(m.conserv || '')}</provenance>\n`;
    block += `                    </history>\n`;
    block += `                </msDesc>\n`;
    block += `            </sourceDesc>\n`;
    block += `        </fileDesc>\n`;
    
    const hasProfileContent = (m.epiteti?.length || 0) + (m.divinita?.length || 0) +
      (m.onomastica?.length || 0) + ((m as any).imperatori?.length || 0) > 0 || (m.persone?.length || 0) > 0;
    if (hasProfileContent) {
      block += `        <profileDesc>\n`;
      
      const hasKeywords = (m.epiteti?.length || 0) + (m.divinita?.length || 0) + (m.onomastica?.length || 0) + ((m as any).imperatori?.length || 0) > 0;
      if (hasKeywords) {
        block += `            <textClass>\n`;
        const writeKw = (scheme: string, terms: string[] | undefined) => {
          if (!terms || terms.length === 0) return;
          block += `                <keywords scheme="${scheme}">\n`;
          for (const t of terms) block += `                    <term>${escapeXml(t)}</term>\n`;
          block += `                </keywords>\n`;
        };
        writeKw('epiteti', m.epiteti);
        writeKw('divinita', m.divinita);
        writeKw('onomastica', m.onomastica);
        writeKw('imperatori', (m as any).imperatori);
        block += `            </textClass>\n`;
      }
      
      if (m.persone && m.persone.length > 0) {
        block += `            <particDesc>\n`;
        block += `                <listPerson>\n`;
        for (const p of m.persone) {
          block += `                    <person xml:id="${escapeXml(p.xmlId)}">\n`;
          block += `                        <persName type="attested"${p.key ? ` key="${escapeXml(p.key)}"` : ''}>\n`;
          block += `                            <name${p.nymRef ? ` nymRef="${escapeXml(p.nymRef)}"` : ''}>${escapeXml(p.name)}</name>\n`;
          block += `                        </persName>\n`;
          if (p.ethnicText || p.ethnicRef || p.ethnicNymRef) {
            block += `                        <placeName type="ethnic"${p.ethnicRef ? ` ref="${escapeXml(p.ethnicRef)}"` : ''}${p.ethnicNymRef ? ` nymRef="${escapeXml(p.ethnicNymRef)}"` : ''}>${escapeXml(p.ethnicText || '')}</placeName>\n`;
          }
          if (p.note) {
            block += `                        <note>${escapeXml(p.note)}</note>\n`;
          }
          block += `                    </person>\n`;
        }
        block += `                </listPerson>\n`;
        block += `            </particDesc>\n`;
      }
      
      block += `        </profileDesc>\n`;
    }
    const iconographyBlock = renderIconography(m.iconografia, '    ');
    if (iconographyBlock) block += iconographyBlock + '\n';
    if ((m.revisions && m.revisions.length > 0) || m.editorialStatus) {
      const statusAttr = m.editorialStatus ? ` status="${escapeXml(m.editorialStatus)}"` : '';
      block += `    <revisionDesc${statusAttr}>\n`;
      for (const r of m.revisions || []) {
        const whoAttr = r.who ? ` who="${escapeXml(r.who)}"` : '';
        const whenAttr = r.date ? ` when="${escapeXml(r.date)}"` : '';
        block += `        <change${whenAttr}${whoAttr}>${escapeXml(r.note || '')}</change>\n`;
      }
      block += `    </revisionDesc>\n`;
    }
    block += `    </teiHeader>\n`;
    
    if (m.facsimile_url) {
      block += `    <facsimile>\n`;
      block += `        <graphic url="${escapeXml(m.facsimile_url)}">\n`;
      if (m.facsimile_desc) block += `            <desc>${escapeXml(m.facsimile_desc)}</desc>\n`;
      block += `        </graphic>\n`;
      block += `    </facsimile>\n`;
    }
    
    block += `    <text>\n`;
    block += `        <body>\n`;
    
    let editionContent = "";
    if (m.testo && m.testo.includes("<")) {
      editionContent = m.testo;
    } else {
      editionContent = `                <ab>\n`;
      const lines = (m.testo || '').split('\n');
      for (let i = 0; i < lines.length; i++) {
        editionContent += `                    <lb n="${i + 1}"/>${escapeXml(lines[i])}\n`;
      }
      editionContent += `                </ab>`;
    }
    
    block += `            <div type="edition" xml:space="preserve" xml:lang="grc">\n`;
    block += `${editionContent}\n`;
    block += `            </div>\n`;
    
    const appVal = Array.isArray(m.apparatus)
      ? (m.apparatus.length > 0 ? m.apparatus : null)
      : (m.apparatus || null);
    const hasApparatus = appVal && (
      Array.isArray(appVal) ? appVal.length > 0
      : typeof appVal === 'string' && appVal.trim() && appVal !== 'DA_COMPILARE'
    );
    if (hasApparatus) {
      block += `            <div type="apparatus">\n`;
      if (Array.isArray(appVal)) {
        for (const entry of appVal as any[]) {
          block += `                <app loc="${escapeXml(entry.loc)}"><note>${escapeXml(entry.note)}</note></app>\n`;
        }
      } else if (typeof appVal === 'string') {
        if (appVal.includes("<")) {
          block += `${appVal}\n`;
        } else {
          block += `                <p>${escapeXml(appVal)}</p>\n`;
        }
      }
      block += `            </div>\n`;
    }
    
    if (m.traduzioni && m.traduzioni.length > 0) {
      for (const t of m.traduzioni) {
        if (!t.testo || !t.testo.trim()) continue;
        block += `            <div type="translation" xml:lang="${escapeXml(t.lang)}">\n`;
        if (t.testo.includes("<")) {
          block += `${t.testo}\n`;
        } else {
          block += t.testo.split('\n').map(p => `                <p>${escapeXml(p)}</p>`).join('\n') + '\n';
        }
        if (t.note) {
          block += `                <note>${escapeXml(t.note)}</note>\n`;
        }
        block += `            </div>\n`;
      }
    } else {
      // Omit translation div if no content
    }
    
    if (m.note_interne_rawXml || m.note_interne) {
      block += `            <div type="commentary">\n`;
      if (m.note_interne_rawXml) {
        block += `                <p>${m.note_interne_rawXml}</p>\n`;
      } else if (m.note_interne.includes("<")) {
        block += `${m.note_interne}\n`;
      } else {
        block += `                <p>${escapeXml(m.note_interne)}</p>\n`;
      }
      block += `            </div>\n`;
    }
    
    if (m.bibliografia && m.bibliografia.length > 0) {
      block += `            <div type="bibliography">\n`;
      block += `                <listBibl>\n`;
      for (const b of m.bibliografia) {
        if (b.rawXml) {
          block += `                    <bibl>${b.rawXml}</bibl>\n`;
        } else if (b.titolo && b.titolo.includes("<")) {
          block += `                    <bibl>${b.titolo}</bibl>\n`;
        } else if (b.titolo) {
          block += `                    <bibl>${escapeXml(b.titolo)}</bibl>\n`;
        }
      }
      block += `                </listBibl>\n`;
      block += `            </div>\n`;
    }
    
    block += `        </body>\n`;
    block += `    </text>\n`;
    
    block += `</TEI>\n`;
    return block;
  };

  if (monumenti.length === 1) {
    xml += formatTEIBlock(monumenti[0]);
  } else {
    // Use <teiCorpus> — the standard TEI/EpiDoc wrapper for multiple <TEI> documents
    xml += `<teiCorpus xmlns="http://www.tei-c.org/ns/1.0">\n`;
    for (const m of monumenti) {
      xml += formatTEIBlock(m).split('\n').map(line => line ? '  ' + line : line).join('\n') + '\n';
    }
    xml += `</teiCorpus>`;
  }

  return xml;
}

export function xmlToMonumenti(xml: string): Monumento[] {
  if (!xml || xml.trim() === "") return [];

  const teiRegex = /<TEI[\s\S]*?<\/TEI>/g;
  const matches = xml.match(teiRegex);
  if (!matches) {
    if (xml.includes("<TEI")) {
      const startIdx = xml.indexOf("<TEI");
      const endIdx = xml.lastIndexOf("</TEI>") + 6;
      if (startIdx !== -1 && endIdx > startIdx) {
        return [parseTeiElement(xml.substring(startIdx, endIdx))];
      }
    }
    return [];
  }

  return matches.map(teiString => parseTeiElement(teiString));
}