// ═══════════════════════════════════════════════════════════════════════
// apiShim.ts — sostituisce il server Express per la build statica GitHub
// Pages, intercettando window.fetch per i path /api/*.
// ═══════════════════════════════════════════════════════════════════════
//
// GitHub Pages non può eseguire server.ts. Invece di riscrivere App.tsx e
// i componenti dell'editor (decine di `fetch('/api/...')` sparsi), questo
// modulo replica la logica delle route di server.ts (stesse funzioni pure,
// stesso comportamento) ma appoggiata a una Map in-memory idratata da
// GitHub invece che al filesystem. I componenti restano invariati: non
// sanno che le loro richieste non toccano più la rete verso un server.
//
// Attivo SOLO quando installApiShim() viene chiamata esplicitamente da
// main.tsx (build statica, VITE_STATIC_BUILD=true). In sviluppo locale
// (server.ts + Vite) questo modulo non viene mai importato/eseguito: le
// route Express reali restano invariate.
//
// Non gestisce: /api/translate, /api/drafts/* (funzionalità AI, fuori
// scope per la build Pages — vedi PLAN). Rispondono 501.

import { xmlToMonumenti, monumentiToXml, renderIconography } from "./xmlUtils";
import { buildSearchIndex, searchMonumenti } from "./searchIndex";
import MiniSearch from "minisearch";
import { pullAllCorpusFiles, pushCorpusFile, deleteCorpusFile, testGitHubAccess } from "./githubStorageBrowser";

let corpusStore = new Map<string, string>(); // filename -> xml content
let searchIndex: MiniSearch<any> | null = null;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function xmlResponse(content: string, filename: string): Response {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function sha256(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Stesse funzioni pure di server.ts (nessuna dipendenza Node) ─────────

function buildFilename(m: any): string {
  const corpus = (m.corpus || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "XX";
  const id = String(m.id || 0).padStart(3, "0");
  const num = m.numero ? String(m.numero).padStart(3, "0") : id;
  return `${corpus}-${num}.xml`;
}

function validateMonumentoShape(m: any): string | null {
  if (typeof m?.id !== "number" || !Number.isFinite(m.id) || m.id < 0) {
    return "id deve essere un numero >= 0";
  }
  const strCap = (field: string, max: number): string | null =>
    m[field] !== undefined && m[field] !== null && String(m[field]).length > max
      ? `${field} supera ${max} caratteri` : null;
  const arrCap = (field: string, max: number): string | null =>
    Array.isArray(m[field]) && m[field].length > max
      ? `${field} supera ${max} elementi` : null;
  const iconCap = (): string | null => {
    const ico = m.iconografia;
    if (!ico) return null;
    if (ico.function !== undefined && String(ico.function).length > 200) return "iconografia.function supera 200 caratteri";
    if (ico.note !== undefined && String(ico.note).length > 10000) return "iconografia.note supera 10000 caratteri";
    if (Array.isArray(ico.figures)) {
      if (ico.figures.length > 50) return "iconografia.figures supera 50 elementi";
      for (const f of ico.figures) {
        if (Array.isArray(f?.traits) && f.traits.length > 50) return "iconografia.figures[].traits supera 50 elementi";
        if (f?.place !== undefined && String(f.place).length > 50) return "iconografia.figures[].place supera 50 caratteri";
      }
    }
    return null;
  };
  const checks = [
    strCap("regione", 200), strCap("citta", 200), strCap("tipo", 200), strCap("materiale", 200),
    strCap("testo", 50000), strCap("note_interne", 10000), strCap("note_interne_rawXml", 10000),
    arrCap("epiteti", 50), arrCap("divinita", 50), arrCap("onomastica", 50), arrCap("textTypes", 50),
    arrCap("imperatori", 50), arrCap("persone", 100), arrCap("traduzioni", 50), arrCap("bibliografia", 50),
    arrCap("revisions", 100), iconCap(),
  ];
  return checks.find(c => c !== null) ?? null;
}

function patchXmlContent(xml: string, m: any): string {
  const replaceTag = (tag: string, newVal: string) => {
    const re = new RegExp(`(<${tag}[^>]*>)[\\s\\S]*?(<\\/${tag}>)`);
    if (re.test(xml) && newVal) xml = xml.replace(re, `$1${escXml(newVal)}$2`);
  };
  const replaceAttr = (tag: string, attr: string, newVal: string) => {
    if (!newVal) return;
    const re = new RegExp(`(<${tag}[^>]*${attr}=")[^"]*(")`);
    xml = xml.replace(re, `$1${escXml(newVal)}$2`);
  };
  const escXml = (s: string) => s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  if (m.titolo) {
    xml = xml.replace(
      /(<title[^>]*>[\s\S]*?<\/rs>\s*)([\s\S]*?)(<\/title>)/,
      (_: string, pre: string, _old: string, post: string) => `${pre}${escXml(m.titolo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())}${post}`
    );
  }
  if (m.regione && /<placeName\s+type="region"/.test(xml)) {
    xml = xml.replace(/(<placeName\s+type="region"[^>]*>)[^<]*(<\/placeName>)/, `$1${escXml(m.regione)}$2`);
  }
  if (m.corpus) {
    xml = xml.replace(/(<idno\s+type="CMRDM"[^>]*corpus=")[^"]*(")/, `$1${escXml(m.corpus)}$2`);
  }
  if (m.numero) {
    xml = xml.replace(/(<idno\s+type="CMRDM"[^>]*numero=")[^"]*(")/, `$1${escXml(m.numero)}$2`);
  }
  if (m.facsimile_url) replaceAttr("graphic", "url", m.facsimile_url);
  if (m.facsimile_desc) {
    xml = xml.replace(
      /(<facsimile>[\s\S]*?<desc>)[\s\S]*?(<\/desc>[\s\S]*?<\/facsimile>)/,
      `$1${escXml(m.facsimile_desc)}$2`
    );
  }
  if (m.materiale) replaceTag("material", m.materiale);
  if (m.tipo) replaceTag("objectType", m.tipo);
  if (m.dim_altezza) replaceTag("height", m.dim_altezza);
  if (m.dim_larghezza) replaceTag("width", m.dim_larghezza);
  if (m.dim_profondita) replaceTag("depth", m.dim_profondita);
  if (m.place_ref_ancient) replaceAttr('placeName type="ancient"', "ref", m.place_ref_ancient);
  if (m.place_ref_modern) replaceAttr('placeName type="modern"', "ref", m.place_ref_modern);
  if (m.tipo_ref) replaceAttr("objectType", "ref", m.tipo_ref);
  if (m.materialRef) replaceAttr("material", "ref", m.materialRef);

  if (m.id) {
    if (/<idno\s+type="id">/.test(xml)) {
      xml = xml.replace(/<idno\s+type="id">\d*<\/idno>/, `<idno type="id">${escXml(String(m.id))}</idno>`);
    } else {
      xml = xml.replace(/(<\/publicationStmt>)/, `        <idno type="id">${escXml(String(m.id))}</idno>\n$1`);
    }
  }
  if (m.entryId) {
    if (/<idno\s+type="entryId">/.test(xml)) {
      xml = xml.replace(/<idno\s+type="entryId">[^<]*<\/idno>/, `<idno type="entryId">${escXml(m.entryId)}</idno>`);
    } else if (/<idno\s+type="firebaseId">/.test(xml)) {
      xml = xml.replace(/<idno\s+type="firebaseId">[^<]*<\/idno>/, `<idno type="entryId">${escXml(m.entryId)}</idno>`);
    } else {
      xml = xml.replace(/(<\/publicationStmt>)/, `        <idno type="entryId">${escXml(m.entryId)}</idno>\n$1`);
    }
  }
  if (m.revisions && m.revisions.length > 0) {
    const revXml = m.revisions.map((r: any) =>
      `    <change${r.date ? ` when="${escXml(r.date)}"` : ""}${r.who ? ` who="${escXml(r.who)}"` : ""}>${escXml(r.note || "")}</change>`
    ).join("\n");
    if (/<revisionDesc>/.test(xml)) {
      xml = xml.replace(/<revisionDesc>[\s\S]*?<\/revisionDesc>/, `<revisionDesc>\n${revXml}\n  </revisionDesc>`);
    } else {
      xml = xml.replace("</teiHeader>", `  <revisionDesc>\n${revXml}\n  </revisionDesc>\n</teiHeader>`);
    }
  }
  if ("iconografia" in m) {
    const hasExisting = /[ \t]*<xenoData>[\s\S]*?<\/xenoData>\n?/.test(xml);
    const rendered = renderIconography(m.iconografia, "    ");
    if (rendered) {
      if (hasExisting) {
        xml = xml.replace(/[ \t]*<xenoData>[\s\S]*?<\/xenoData>\n?/, rendered + "\n");
      } else if (/<\/profileDesc>\n?/.test(xml)) {
        xml = xml.replace(/(<\/profileDesc>\n?)/, `$1${rendered}\n`);
      } else if (/[ \t]*<revisionDesc>/.test(xml)) {
        xml = xml.replace(/([ \t]*<revisionDesc>)/, `${rendered}\n$1`);
      } else {
        xml = xml.replace("</teiHeader>", `${rendered}\n</teiHeader>`);
      }
    } else if (hasExisting) {
      xml = xml.replace(/[ \t]*<xenoData>[\s\S]*?<\/xenoData>\n?/, "");
    }
  }
  return xml;
}

// ── Store in-memory (sostituisce CORPUS_DIR) ─────────────────────────────

function readCorpusFiles(): any[] {
  const monumenti: any[] = [];
  for (const [file, xml] of corpusStore) {
    try {
      const parsed = xmlToMonumenti(xml);
      if (parsed.length > 0) {
        parsed.forEach((m: any) => { m._corpusFile = file; });
        monumenti.push(...parsed);
      }
    } catch (e) {
      console.warn(`[apiShim] File corpus malformato ignorato: ${file}`, e);
    }
  }
  return monumenti;
}

function updateSearchIndex(): void {
  try {
    searchIndex = buildSearchIndex(readCorpusFiles());
  } catch (e) {
    console.error("[apiShim] Errore ricostruzione indice ricerca:", e);
  }
}

function buildBackup(): string {
  let corpus = '<?xml version="1.0" encoding="UTF-8"?>\n';
  corpus += '<?xml-model href="http://epidoc.stoa.org/schema/latest/tei-epidoc.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>\n';
  corpus += '<teiCorpus xmlns="http://www.tei-c.org/ns/1.0">\n';
  const names = Array.from(corpusStore.keys()).sort();
  for (const file of names) {
    const xml = corpusStore.get(file)!;
    const teiMatch = xml.match(/<TEI[\s\S]*<\/TEI>/);
    if (teiMatch) corpus += "  " + teiMatch[0].replace(/\n/g, "\n  ") + "\n";
  }
  corpus += "</teiCorpus>";
  return corpus;
}

async function writeCorpusFile(filename: string, content: string, commitMessage: string): Promise<void> {
  corpusStore.set(filename, content);
  await pushCorpusFile(filename, content, commitMessage);
}

async function removeCorpusFile(filename: string, commitMessage: string): Promise<void> {
  corpusStore.delete(filename);
  await deleteCorpusFile(filename, commitMessage);
}

// ── Router ────────────────────────────────────────────────────────────

async function handleRequest(url: URL, init: RequestInit | undefined): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const path = url.pathname;
  const body = init?.body ? JSON.parse(init.body as string) : undefined;

  try {
    if (path === "/api/monumenti" && method === "GET") {
      return json(readCorpusFiles());
    }

    if (path === "/api/monumenti" && method === "POST") {
      const data: any[] = body;
      if (!Array.isArray(data)) return json({ error: "Expected array" }, 400);
      if (data.length > 500) return json({ error: "Troppe schede in un'unica richiesta (max 500)" }, 400);
      for (const m of data) {
        const err = validateMonumentoShape(m);
        if (err) return json({ error: `Scheda id=${m?.id ?? "?"}: ${err}` }, 400);
      }

      const writtenFiles = new Set<string>();
      for (const m of data) {
        const rawFilename = m._corpusFile as string | undefined;
        const filename = rawFilename ? rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_") : buildFilename(m);
        writtenFiles.add(filename);
        if (corpusStore.has(filename)) {
          const patched = patchXmlContent(corpusStore.get(filename)!, m);
          await writeCorpusFile(filename, patched, `Aggiorna ${filename}`);
        } else {
          const xml = monumentiToXml([m]);
          await writeCorpusFile(filename, xml, `Nuova scheda ${filename}`);
        }
      }
      for (const file of Array.from(corpusStore.keys())) {
        if (!writtenFiles.has(file)) await removeCorpusFile(file, `Rimuovi ${file}`);
      }
      updateSearchIndex();
      return json({ status: "ok", count: data.length, github: true });
    }

    if (path.startsWith("/api/monumenti/") && method === "PATCH") {
      const entryId = decodeURIComponent(path.slice("/api/monumenti/".length));
      const { monumento, baseHash } = body || {};
      if (!monumento || typeof monumento !== "object") return json({ error: "Corpo mancante: atteso { monumento, baseHash }" }, 400);
      if (monumento.entryId !== entryId) return json({ error: "entryId nel corpo non corrisponde a quello nell'URL" }, 400);
      const shapeErr = validateMonumentoShape(monumento);
      if (shapeErr) return json({ error: shapeErr }, 400);

      const rawFilename = monumento._corpusFile as string | undefined;
      const filename = rawFilename ? rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_") : buildFilename(monumento);
      if (!corpusStore.has(filename)) {
        return json({ error: `File corpus non trovato per la scheda ${entryId} (${filename}). Ricarica l'elenco e riprova.` }, 404);
      }
      const currentXml = corpusStore.get(filename)!;
      if (baseHash && (await sha256(currentXml)) !== baseHash) {
        return json({ error: "stale", message: `La scheda ${entryId} è stata modificata altrove da quando l'hai aperta qui. Ricarica i dati prima di salvare.` }, 409);
      }
      const patched = patchXmlContent(currentXml, monumento);
      await writeCorpusFile(filename, patched, `Aggiorna ${filename}`);
      updateSearchIndex();
      return json({ status: "ok", _corpusFile: filename, _fileHash: await sha256(patched) });
    }

    if (path === "/api/corpus/import" && method === "POST") {
      const files: { filename: string; content: string }[] = body;
      if (!Array.isArray(files)) return json({ error: "Expected array of {filename, content}" }, 400);
      if (files.length > 500) return json({ error: "Troppi file in un'unica richiesta (max 500)" }, 400);
      let imported = 0;
      const errors: string[] = [];
      for (const { filename, content } of files) {
        try {
          const parsed = xmlToMonumenti(content);
          if (parsed.length === 0) { errors.push(`${filename}: no valid TEI found`); continue; }
          const shapeErr = parsed.map(validateMonumentoShape).find(e => e !== null);
          if (shapeErr) { errors.push(`${filename}: ${shapeErr}`); continue; }
          const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
          await writeCorpusFile(safe, content, `Import: ${safe}`);
          imported++;
        } catch (e: any) {
          errors.push(`${filename}: ${e.message}`);
        }
      }
      updateSearchIndex();
      return json({ status: "ok", imported, errors, github: true });
    }

    if (path === "/api/corpus/files" && method === "GET") {
      const files = Array.from(corpusStore.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([filename, content]) => ({ filename, size: new TextEncoder().encode(content).length, modified: new Date().toISOString() }));
      return json(files);
    }

    if (path === "/api/corpus/backup" && method === "GET") {
      const content = buildBackup();
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "application/xml",
          "Content-Disposition": `attachment; filename="teiCorpus-${new Date().toISOString().split("T")[0]}.xml"`,
        },
      });
    }

    if (path.startsWith("/api/corpus/file/") && method === "GET") {
      const filename = decodeURIComponent(path.slice("/api/corpus/file/".length)).replace(/[^a-zA-Z0-9._-]/g, "_");
      if (!corpusStore.has(filename)) return json({ error: "File not found" }, 404);
      return xmlResponse(corpusStore.get(filename)!, filename);
    }

    if (path === "/api/corpus/github-status" && method === "GET") {
      const result = await testGitHubAccess();
      return json({ configured: true, ...result });
    }

    if (path === "/api/search" && method === "GET") {
      const q = url.searchParams.get("q") || "";
      const mode = url.searchParams.get("mode") === "AND" ? "AND" : "OR";
      if (!searchIndex) return json({ error: "Search index not ready" }, 503);
      return json(searchMonumenti(searchIndex, q, { combineWith: mode }));
    }

    if (path === "/api/reindex" && method === "POST") {
      updateSearchIndex();
      return json({ status: "ok", message: "Indice ricostruito con successo" });
    }

    if (path === "/api/translate" || path.startsWith("/api/drafts/")) {
      return json({ error: "Non disponibile nella build GitHub Pages (funzionalità AI/draft, solo in locale)" }, 501);
    }

    return json({ error: "Not found" }, 404);
  } catch (error: any) {
    console.error(`[apiShim] Errore su ${method} ${path}:`, error);
    return json({ error: error.message || "Errore interno" }, 500);
  }
}

// ── Installazione ─────────────────────────────────────────────────────

let installed = false;

export async function installApiShim(): Promise<void> {
  if (installed) return;
  installed = true;

  corpusStore = await pullAllCorpusFiles();
  updateSearchIndex();

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" || input instanceof URL
      ? new URL(input, window.location.origin)
      : new URL(input.url, window.location.origin);

    if (!url.pathname.startsWith("/api/")) {
      return originalFetch(input, init);
    }
    return handleRequest(url, init);
  };
}
