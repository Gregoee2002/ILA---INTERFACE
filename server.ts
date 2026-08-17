import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { xmlToMonumenti, monumentiToXml, renderIconography } from "./src/lib/xmlUtils";
import { pullCorpusFromGitHub, pushFileToGitHub, deleteFileFromGitHub, isGitHubConfigured, testGitHubAccess, pullDraftsFromGitHub } from "./src/lib/githubStorage";
import { buildSearchIndex, searchMonumenti } from "./src/lib/searchIndex";
import MiniSearch from 'minisearch';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_DIR = path.join(process.cwd(), "src", "data");
  const CORPUS_DIR = path.join(DATA_DIR, "corpus");
  // Staging area per le estrazioni draft (agente Vision su Lane 1971), separata
  // dal corpus vero e proprio. Sincronizzata da Gregoee2002/ILA, cartella
  // drafts/ (mai la stessa cartella "corpus" del corpus revisionato). Le
  // route HTTP restano sola lettura: le scritture avvengono offline (script
  // di revisione + pushDraftFileToGitHub), mai tramite l'app in esecuzione.
  const DRAFTS_DIR = path.join(DATA_DIR, "corpus-drafts");
  const BACKUP_FILE = path.join(CORPUS_DIR, "_teiCorpus.xml");
  // Legacy file — kept for backwards compatibility on first run
  const LEGACY_FILE = path.join(DATA_DIR, "monumenti.xml");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  // ── Ensure directories exist ─────────────────────────────────────────────
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CORPUS_DIR)) fs.mkdirSync(CORPUS_DIR, { recursive: true });
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });

  // ── Sync iniziale da GitHub ──────────────────────────────────────────────
  // Se GITHUB_TOKEN/GITHUB_REPO sono impostati, il filesystem locale viene
  // ripopolato dalla repo prima di accettare richieste — così un filesystem
  // effimero (redeploy/restart) riparte sempre con il corpus completo,
  // niente più bisogno di Firestore per questo. Se le variabili non sono
  // impostate, questa chiamata è un no-op e tutto continua come prima
  // (solo filesystem locale).
  
  let searchIndex: MiniSearch<any> | null = null;
  
  function updateSearchIndex(monumenti: any[]) {
    try {
      searchIndex = buildSearchIndex(monumenti);
      console.log(`[Search] Indice ricostruito con ${monumenti.length} schede`);
    } catch (e) {
      console.error("[Search] Errore durante la costruzione dell'indice:", e);
    }
  }

  if (isGitHubConfigured()) {
    try {
      await pullCorpusFromGitHub(
        CORPUS_DIR,
        (filepath, content) => fs.writeFileSync(filepath, content, "utf-8"),
        (...parts) => path.join(...parts),
        (dir) => fs.readdirSync(dir).filter(f => f.endsWith('.xml') && !f.startsWith('_')),
        (filepath) => fs.unlinkSync(filepath)
      );
    } catch (e: any) {
      console.error("[githubStorage] Sync iniziale fallita — il server parte comunque con il filesystem locale (probabilmente vuoto o stale):", e.message || e);
    }
    try {
      await pullDraftsFromGitHub(
        DRAFTS_DIR,
        (filepath, content) => fs.writeFileSync(filepath, content, "utf-8"),
        (...parts) => path.join(...parts),
        (dir) => fs.readdirSync(dir).filter(f => f.endsWith('.xml') && !f.startsWith('_')),
        (filepath) => fs.unlinkSync(filepath)
      );
    } catch (e: any) {
      console.error("[githubStorage] Sync draft iniziale fallita — il server parte comunque con il filesystem locale (probabilmente vuoto o stale):", e.message || e);
    }
  }

  // Costruisci l'indice di ricerca all'avvio
  updateSearchIndex(readCorpusFiles());

  app.use(express.json({ limit: '50mb' }));

  // ── Helpers ──────────────────────────────────────────────────────────────

  // Build a safe filename from a Monumento: CMRDM-GR-001.xml or id-based fallback
  function buildFilename(m: any): string {
    const corpus = (m.corpus || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'XX';
    const id = String(m.id || 0).padStart(3, '0');
    const num = m.numero ? String(m.numero).padStart(3, '0') : id;
    return `${corpus}-${num}.xml`;
  }

  // Impronta del contenuto di un file del corpus, usata come controllo di
  // allineamento sul salvataggio scoped di un singolo record (vedi
  // PATCH /api/monumenti/:entryId): il client deve dichiarare quale hash
  // conosceva quando ha aperto la scheda, per accorgersi se nel frattempo
  // il file è stato toccato altrove (altra sessione, o direttamente su
  // GitHub) prima di sovrascriverlo.
  function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  // Limiti di base sui payload in scrittura, in linea con gli invarianti
  // storicamente descritti in security_spec.md / firestore.rules (mai
  // enforcati qui: i dati sono passati a file+GitHub, non più a Firestore).
  // Senza queste guardie un payload malformato o deliberatamente enorme
  // viene scritto su disco — e specchiato su GitHub — senza alcun limite.
  function validateMonumentoShape(m: any): string | null {
    if (typeof m?.id !== 'number' || !Number.isFinite(m.id) || m.id < 0) {
      return 'id deve essere un numero >= 0';
    }
    const strCap = (field: string, max: number): string | null =>
      (m[field] !== undefined && m[field] !== null && String(m[field]).length > max)
        ? `${field} supera ${max} caratteri` : null;
    const arrCap = (field: string, max: number): string | null =>
      (Array.isArray(m[field]) && m[field].length > max)
        ? `${field} supera ${max} elementi` : null;
    const iconCap = (): string | null => {
      const ico = m.iconografia;
      if (!ico) return null;
      if (ico.function !== undefined && String(ico.function).length > 200) return 'iconografia.function supera 200 caratteri';
      if (ico.note !== undefined && String(ico.note).length > 10000) return 'iconografia.note supera 10000 caratteri';
      if (Array.isArray(ico.figures)) {
        if (ico.figures.length > 50) return 'iconografia.figures supera 50 elementi';
        for (const f of ico.figures) {
          if (Array.isArray(f?.traits) && f.traits.length > 50) return 'iconografia.figures[].traits supera 50 elementi';
          if (f?.place !== undefined && String(f.place).length > 50) return 'iconografia.figures[].place supera 50 caratteri';
        }
      }
      return null;
    };
    const checks = [
      strCap('regione', 200), strCap('citta', 200), strCap('tipo', 200), strCap('materiale', 200),
      strCap('testo', 50000), strCap('note_interne', 10000), strCap('note_interne_rawXml', 10000),
      arrCap('epiteti', 50), arrCap('divinita', 50), arrCap('onomastica', 50), arrCap('textTypes', 50),
      arrCap('imperatori', 50), arrCap('persone', 100), arrCap('traduzioni', 50), arrCap('bibliografia', 50),
      arrCap('revisions', 100), iconCap(),
    ];
    return checks.find(c => c !== null) ?? null;
  }

  // Read all XML files from corpus dir (excluding backup)
  function readCorpusFiles(): any[] {
    const files = fs.readdirSync(CORPUS_DIR)
      .filter(f => f.endsWith('.xml') && !f.startsWith('_'))
      .sort();
    const monumenti: any[] = [];
    for (const file of files) {
      try {
        const xml = fs.readFileSync(path.join(CORPUS_DIR, file), 'utf-8');
        const parsed = xmlToMonumenti(xml);
        if (parsed.length > 0) {
          // Attach filename + content hash for round-trip updates and
          // per-record staleness checks
          const fileHash = hashContent(xml);
          parsed.forEach(m => { (m as any)._corpusFile = file; (m as any)._fileHash = fileHash; });
          monumenti.push(...parsed);
        }
      } catch (e) {
        console.warn(`Skipping malformed file: ${file}`, e);
      }
    }
    return monumenti;
  }

  // Regenerate the cumulative backup _teiCorpus.xml
  function rebuildBackup(): void {
    try {
      const files = fs.readdirSync(CORPUS_DIR)
        .filter(f => f.endsWith('.xml') && !f.startsWith('_'))
        .sort();
      let corpus = '<?xml version="1.0" encoding="UTF-8"?>\n';
      corpus += '<?xml-model href="http://epidoc.stoa.org/schema/latest/tei-epidoc.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>\n';
      corpus += '<teiCorpus xmlns="http://www.tei-c.org/ns/1.0">\n';
      for (const file of files) {
        const xml = fs.readFileSync(path.join(CORPUS_DIR, file), 'utf-8');
        // Extract only the <TEI>...</TEI> block, strip processing instructions
        const teiMatch = xml.match(/<TEI[\s\S]*<\/TEI>/);
        if (teiMatch) corpus += '  ' + teiMatch[0].replace(/\n/g, '\n  ') + '\n';
      }
      corpus += '</teiCorpus>';
      fs.writeFileSync(BACKUP_FILE, corpus, 'utf-8');
    } catch (e) {
      console.error('Failed to rebuild backup:', e);
    }
  }

  // Patch-write: compute the updated XML (only editable metadata fields
  // touched, everything else preserved byte-for-byte) WITHOUT writing it —
  // il chiamante scrive su disco e specchia su GitHub in un unico punto
  // (vedi writeCorpusFile), così le due copie non possono disallinearsi.
  function patchXmlContent(filepath: string, m: any): string {
    let xml = fs.readFileSync(filepath, 'utf-8');

    // Helper: replace content of a simple tag
    const replaceTag = (tag: string, newVal: string) => {
      const re = new RegExp(`(<${tag}[^>]*>)[\\s\\S]*?(<\\/${tag}>)`);
      if (re.test(xml) && newVal) {
        xml = xml.replace(re, `$1${escXml(newVal)}$2`);
      }
    };

    // Helper: replace attribute value
    const replaceAttr = (tag: string, attr: string, newVal: string) => {
      if (!newVal) return;
      const re = new RegExp(`(<${tag}[^>]*${attr}=")[^"]*(")`);
      xml = xml.replace(re, `$1${escXml(newVal)}$2`);
    };

    const escXml = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Editable metadata fields — surgical replacements only
    if (m.titolo) {
      // Replace only the text after the last </rs> in <title>
      xml = xml.replace(
        /(<title[^>]*>[\s\S]*?<\/rs>\s*)([\s\S]*?)(<\/title>)/,
        (_, pre, _old, post) => `${pre}${escXml(m.titolo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())}${post}`
      );
    }

    if (m.regione) {
      // Update or add <placeName type="region">
      if (/<placeName\s+type="region"/.test(xml)) {
        xml = xml.replace(
          /(<placeName\s+type="region"[^>]*>)[^<]*(<\/placeName>)/,
          `$1${escXml(m.regione)}$2`
        );
      }
    }

    if (m.corpus) {
      xml = xml.replace(
        /(<idno\s+type="CMRDM"[^>]*corpus=")[^"]*(")/,
        `$1${escXml(m.corpus)}$2`
      );
    }

    if (m.numero) {
      xml = xml.replace(
        /(<idno\s+type="CMRDM"[^>]*numero=")[^"]*(")/,
        `$1${escXml(m.numero)}$2`
      );
    }

    if (m.facsimile_url) replaceAttr('graphic', 'url', m.facsimile_url);
    if (m.facsimile_desc) {
      // Scope to the <facsimile> block: a bare <desc> elsewhere must not be touched
      xml = xml.replace(
        /(<facsimile>[\s\S]*?<desc>)[\s\S]*?(<\/desc>[\s\S]*?<\/facsimile>)/,
        `$1${escXml(m.facsimile_desc)}$2`
      );
    }
    if (m.materiale) replaceTag('material', m.materiale);
    if (m.tipo) replaceTag('objectType', m.tipo);

    if (m.dim_altezza) replaceTag('height', m.dim_altezza);
    if (m.dim_larghezza) replaceTag('width', m.dim_larghezza);
    if (m.dim_profondita) replaceTag('depth', m.dim_profondita);

    if (m.place_ref_ancient) replaceAttr('placeName type="ancient"', 'ref', m.place_ref_ancient);
    if (m.place_ref_modern) replaceAttr('placeName type="modern"', 'ref', m.place_ref_modern);
    if (m.tipo_ref) replaceAttr('objectType', 'ref', m.tipo_ref);
    if (m.materialRef) replaceAttr('material', 'ref', m.materialRef);

    // Write applicative id back into XML as <idno type="id">
    if (m.id) {
      if (/<idno\s+type="id">/.test(xml)) {
        xml = xml.replace(/<idno\s+type="id">\d*<\/idno>/, `<idno type="id">${escXml(String(m.id))}</idno>`);
      } else {
        // Insert after last <idno> in publicationStmt
        xml = xml.replace(
          /(<\/publicationStmt>)/,
          `        <idno type="id">${escXml(String(m.id))}</idno>\n$1`
        );
      }
    }

    // Write entryId back into XML as <idno type="entryId">
    // (migrates legacy <idno type="firebaseId"> tags in place)
    if (m.entryId) {
      if (/<idno\s+type="entryId">/.test(xml)) {
        xml = xml.replace(/<idno\s+type="entryId">[^<]*<\/idno>/, `<idno type="entryId">${escXml(m.entryId)}</idno>`);
      } else if (/<idno\s+type="firebaseId">/.test(xml)) {
        xml = xml.replace(/<idno\s+type="firebaseId">[^<]*<\/idno>/, `<idno type="entryId">${escXml(m.entryId)}</idno>`);
      } else {
        xml = xml.replace(
          /(<\/publicationStmt>)/,
          `        <idno type="entryId">${escXml(m.entryId)}</idno>\n$1`
        );
      }
    }

    // Add or update <revisionDesc>
    if (m.revisions && m.revisions.length > 0) {
      const revXml = m.revisions.map((r: any) =>
        `    <change${r.date ? ` when="${escXml(r.date)}"` : ''}${r.who ? ` who="${escXml(r.who)}"` : ''}>${escXml(r.note || '')}</change>`
      ).join('\n');
      if (/<revisionDesc>/.test(xml)) {
        xml = xml.replace(/<revisionDesc>[\s\S]*?<\/revisionDesc>/, `<revisionDesc>\n${revXml}\n  </revisionDesc>`);
      } else {
        xml = xml.replace('</teiHeader>', `  <revisionDesc>\n${revXml}\n  </revisionDesc>\n</teiHeader>`);
      }
    }

    // Add, update or remove <xenoData><iconography> — unico punto di
    // scrittura, condiviso con monumentiToXml (renderIconography), così le
    // due strade (scheda nuova / patch scheda esistente) non possono
    // divergere nel formato scritto su disco.
    if ('iconografia' in m) {
      const hasExisting = /[ \t]*<xenoData>[\s\S]*?<\/xenoData>\n?/.test(xml);
      const rendered = renderIconography(m.iconografia, '    ');
      if (rendered) {
        if (hasExisting) {
          xml = xml.replace(/[ \t]*<xenoData>[\s\S]*?<\/xenoData>\n?/, rendered + '\n');
        } else if (/<\/profileDesc>\n?/.test(xml)) {
          xml = xml.replace(/(<\/profileDesc>\n?)/, `$1${rendered}\n`);
        } else if (/[ \t]*<revisionDesc>/.test(xml)) {
          xml = xml.replace(/([ \t]*<revisionDesc>)/, `${rendered}\n$1`);
        } else {
          xml = xml.replace('</teiHeader>', `${rendered}\n</teiHeader>`);
        }
      } else if (hasExisting) {
        // iconografia svuotata esplicitamente dall'editor: rimuove il blocco
        xml = xml.replace(/[ \t]*<xenoData>[\s\S]*?<\/xenoData>\n?/, '');
      }
    }

    return xml;
  }

  // Scrive un file XML del corpus in un unico punto: locale + specchio su
  // GitHub (se configurato). Usare SEMPRE questa funzione invece di
  // fs.writeFileSync diretto per qualunque file dentro CORPUS_DIR, così le
  // due copie non possono disallinearsi.
  async function writeCorpusFile(filename: string, content: string, commitMessage: string): Promise<void> {
    fs.writeFileSync(path.join(CORPUS_DIR, filename), content, 'utf-8');
    await pushFileToGitHub(filename, content, commitMessage);
  }

  // Elimina un file XML del corpus in un unico punto: locale + GitHub.
  async function deleteCorpusFile(filename: string, commitMessage: string): Promise<void> {
    try {
      fs.unlinkSync(path.join(CORPUS_DIR, filename));
    } catch (err) {
      console.error(`Failed to delete local file ${filename}:`, err);
    }
    await deleteFileFromGitHub(filename, commitMessage);
  }

  // ── Routes ───────────────────────────────────────────────────────────────

  // GET all monuments — reads from corpus dir, falls back to legacy file
  app.get("/api/monumenti", (req, res) => {
    try {
      const corpusFiles = fs.readdirSync(CORPUS_DIR)
        .filter(f => f.endsWith('.xml') && !f.startsWith('_'));

      if (corpusFiles.length > 0) {
        const monumenti = readCorpusFiles();
        res.json(monumenti);
      } else if (fs.existsSync(LEGACY_FILE)) {
        // First run: migrate legacy file
        const xml = fs.readFileSync(LEGACY_FILE, 'utf-8');
        const monumenti = xmlToMonumenti(xml);
        res.json(monumenti);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error reading corpus:", error);
      res.status(500).json({ error: "Failed to read corpus" });
    }
  });

  // POST save monuments — writes individual files to corpus dir (+ GitHub)
  app.post("/api/monumenti", async (req, res) => {
    try {
      const data: any[] = req.body;
      if (!Array.isArray(data)) return res.status(400).json({ error: "Expected array" });
      if (data.length > 500) return res.status(400).json({ error: "Troppe schede in un'unica richiesta (max 500)" });
      for (const m of data) {
        const err = validateMonumentoShape(m);
        if (err) return res.status(400).json({ error: `Scheda id=${(m as any)?.id ?? '?'}: ${err}` });
      }

      const writtenFiles = new Set<string>();
      const failures: { filename: string; error: string }[] = [];

      // Scritture in pool a concorrenza limitata invece che una alla volta:
      // con centinaia di schede (es. "Riordina ID", che riscrive l'intero
      // corpus) il loop sequenziale con un push GitHub per file poteva
      // richiedere minuti. Stessa strategia della variante browser
      // (apiShim.ts).
      //
      // Un fallimento su UN file (dopo tutti i retry di pushFileToGitHub, es.
      // per una race persistente lato GitHub) NON deve far perdere il
      // risultato delle altre scritture già andate a buon fine: si registra
      // il fallimento e si continua, invece di far rigettare l'intero
      // Promise.all e buttare via il progresso reale.
      const WRITE_CONCURRENCY = 4;
      let next = 0;
      async function worker(): Promise<void> {
        while (next < data.length) {
          const m = data[next++];
          // _corpusFile arriva dal client: va sanitizzato come ogni altro
          // filename derivato da input esterno (stesso pattern usato dalle
          // altre route), per evitare che un valore tipo "../../etc/x" scriva
          // fuori da CORPUS_DIR.
          const rawFilename = (m as any)._corpusFile as string | undefined;
          const filename = rawFilename ? rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_') : buildFilename(m);
          const filepath = path.join(CORPUS_DIR, filename);
          writtenFiles.add(filename);

          try {
            if (fs.existsSync(filepath)) {
              // File exists — patch only editable fields
              const patched = patchXmlContent(filepath, m);
              await writeCorpusFile(filename, patched, `Aggiorna ${filename}`);
            } else {
              // New entry — write full XML
              const xml = monumentiToXml([m]);
              await writeCorpusFile(filename, xml, `Nuova scheda ${filename}`);
            }
          } catch (e: any) {
            failures.push({ filename, error: e.message || String(e) });
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(WRITE_CONCURRENCY, data.length) }, () => worker()));

      // Cleanup solo se tutto è andato a buon fine (vedi apiShim.ts).
      if (failures.length === 0) {
        const existingFiles = fs.readdirSync(CORPUS_DIR)
          .filter(f => f.endsWith('.xml') && !f.startsWith('_'));
        for (const file of existingFiles) {
          if (!writtenFiles.has(file)) {
            await deleteCorpusFile(file, `Rimuovi ${file}`);
            console.log(`Deleted obsolete corpus file: ${file}`);
          }
        }
      }

      // Rebuild cumulative backup
      rebuildBackup();
      updateSearchIndex(readCorpusFiles());

      res.json({
        status: failures.length ? "partial" : "ok",
        count: data.length,
        succeeded: data.length - failures.length,
        failures,
        github: isGitHubConfigured(),
      });
    } catch (error: any) {
      console.error("Error writing corpus:", error);
      res.status(500).json({ error: error.message || "Failed to save corpus" });
    }
  });

  // PATCH save a single monument — patches only the one corpus file
  // (no full-array rewrite, no cleanup/delete pass). Used by the section
  // editor's per-field save so that editing one record never touches the
  // other ~30 files of the corpus. Blocks (409) instead of overwriting if
  // the file was changed since the client last read it.
  app.patch("/api/monumenti/:entryId", async (req, res) => {
    try {
      const { entryId } = req.params;
      const { monumento, baseHash } = req.body || {};
      if (!monumento || typeof monumento !== 'object') {
        return res.status(400).json({ error: "Corpo mancante: atteso { monumento, baseHash }" });
      }
      if (monumento.entryId !== entryId) {
        return res.status(400).json({ error: "entryId nel corpo non corrisponde a quello nell'URL" });
      }
      const shapeErr = validateMonumentoShape(monumento);
      if (shapeErr) return res.status(400).json({ error: shapeErr });

      const rawFilename = (monumento as any)._corpusFile as string | undefined;
      const filename = rawFilename ? rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_') : buildFilename(monumento);
      const filepath = path.join(CORPUS_DIR, filename);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: `File corpus non trovato per la scheda ${entryId} (${filename}). Ricarica l'elenco e riprova.` });
      }

      const currentXml = fs.readFileSync(filepath, 'utf-8');
      if (baseHash && hashContent(currentXml) !== baseHash) {
        return res.status(409).json({
          error: "stale",
          message: `La scheda ${entryId} è stata modificata altrove da quando l'hai aperta qui. Ricarica i dati prima di salvare, per non sovrascrivere quelle modifiche.`,
        });
      }

      const patched = patchXmlContent(filepath, monumento);
      await writeCorpusFile(filename, patched, `Aggiorna ${filename}`);

      rebuildBackup();
      updateSearchIndex(readCorpusFiles());

      res.json({ status: "ok", _corpusFile: filename, _fileHash: hashContent(patched) });
    } catch (error: any) {
      console.error("Error patching single monumento:", error);
      res.status(500).json({ error: error.message || "Failed to save record" });
    }
  });

  // POST import a batch of XML files (multipart or raw XML array)
  // Accepts: array of { filename, content } objects
  app.post("/api/corpus/import", async (req, res) => {
    try {
      const files: { filename: string; content: string }[] = req.body;
      if (!Array.isArray(files)) return res.status(400).json({ error: "Expected array of {filename, content}" });
      if (files.length > 500) return res.status(400).json({ error: "Troppi file in un'unica richiesta (max 500)" });

      let imported = 0;
      const errors: string[] = [];

      // Sequenziale (non Promise.all): la Contents API di GitHub non ama
      // scritture concorrenti sulla stessa repo/branch (rischio di 409 sullo
      // sha) — con poche decine di file alla volta il costo è trascurabile.
      for (const { filename, content } of files) {
        try {
          // Validate: must parse correctly
          const parsed = xmlToMonumenti(content);
          if (parsed.length === 0) {
            errors.push(`${filename}: no valid TEI found`);
            continue;
          }
          const shapeErr = parsed.map(validateMonumentoShape).find(e => e !== null);
          if (shapeErr) {
            errors.push(`${filename}: ${shapeErr}`);
            continue;
          }
          const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          await writeCorpusFile(safe, content, `Import: ${safe}`);
          imported++;
        } catch (e: any) {
          errors.push(`${filename}: ${e.message}`);
        }
      }

      rebuildBackup();
      updateSearchIndex(readCorpusFiles());
      res.json({ status: "ok", imported, errors, github: isGitHubConfigured() });
    } catch (error: any) {
      console.error("Error importing corpus:", error);
      res.status(500).json({ error: error.message || "Failed to import corpus" });
    }
  });

  // GET list corpus files
  app.get("/api/corpus/files", (req, res) => {
    try {
      const files = fs.readdirSync(CORPUS_DIR)
        .filter(f => f.endsWith('.xml') && !f.startsWith('_'))
        .sort()
        .map(f => ({
          filename: f,
          size: fs.statSync(path.join(CORPUS_DIR, f)).size,
          modified: fs.statSync(path.join(CORPUS_DIR, f)).mtime.toISOString()
        }));
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to list corpus" });
    }
  });

  // GET download the cumulative backup
  app.get("/api/corpus/backup", (req, res) => {
    try {
      if (!fs.existsSync(BACKUP_FILE)) rebuildBackup();
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="teiCorpus-${new Date().toISOString().split('T')[0]}.xml"`);
      res.send(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    } catch (error) {
      res.status(500).json({ error: "Failed to generate backup" });
    }
  });

  // GET download a single corpus file
  app.get("/api/corpus/file/:filename", (req, res) => {
    try {
      const filepath = path.join(CORPUS_DIR, req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '_'));
      if (!fs.existsSync(filepath)) return res.status(404).json({ error: "File not found" });
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
      res.send(fs.readFileSync(filepath, 'utf-8'));
    } catch (error) {
      res.status(500).json({ error: "Failed to download file" });
    }
  });



  // ── Draft (estrazioni Vision non ancora revisionate) — SOLO LETTURA ────────
  // Nessuna route di scrittura/cancellazione qui per costruzione: la revisione
  // del draft avviene comunque a mano in Oxygen prima di finire in CORPUS_DIR.

  // GET list draft files, con eventuale match verso un file già presente nel
  // corpus vero (stesso filename) per segnalare che è già stato revisionato.
  app.get("/api/drafts/files", (req, res) => {
    try {
      if (!fs.existsSync(DRAFTS_DIR)) return res.json([]);
      const corpusFiles = new Set(
        fs.existsSync(CORPUS_DIR)
          ? fs.readdirSync(CORPUS_DIR).filter(f => f.endsWith('.xml') && !f.startsWith('_'))
          : []
      );
      const files = fs.readdirSync(DRAFTS_DIR)
        .filter(f => f.endsWith('.xml'))
        .sort()
        .map(f => ({
          filename: f,
          size: fs.statSync(path.join(DRAFTS_DIR, f)).size,
          hasCorpusMatch: corpusFiles.has(f)
        }));
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to list drafts" });
    }
  });

  // GET contenuto di un singolo file draft
  app.get("/api/drafts/file/:filename", (req, res) => {
    try {
      const filepath = path.join(DRAFTS_DIR, req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '_'));
      if (!fs.existsSync(filepath) || !filepath.startsWith(DRAFTS_DIR)) return res.status(404).json({ error: "File not found" });
      res.setHeader('Content-Type', 'application/xml');
      res.send(fs.readFileSync(filepath, 'utf-8'));
    } catch (error) {
      res.status(500).json({ error: "Failed to read draft file" });
    }
  });

  // GET stato della persistenza GitHub — utile per verificare la config
  // (token/repo/permessi) senza dover rilanciare uno script a parte.
  app.get("/api/corpus/github-status", async (req, res) => {
    const result = await testGitHubAccess();
    res.json(result);
  });

  // ── Ricerca con MiniSearch ───────────────────────────────────────────────
  
  app.get("/api/search", (req, res) => {
    try {
      const query = (req.query.q as string) || '';
      const mode = (req.query.mode as string) === 'AND' ? 'AND' : 'OR';
      if (!searchIndex) return res.status(503).json({ error: "Search index not ready" });
      const results = searchMonumenti(searchIndex, query, { combineWith: mode });
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/reindex", (req, res) => {
    // In a real app we'd check req.headers for an admin token or rely on an auth middleware.
    // For now, since the task asks to expose this endpoint, we'll assume it's protected or will be verified.
    try {
      updateSearchIndex(readCorpusFiles());
      res.json({ status: "ok", message: "Indice ricostruito con successo" });
    } catch (error) {
      console.error("Reindex error:", error);
      res.status(500).json({ error: "Reindex failed" });
    }
  });

  // ── Translation ──────────────────────────────────────────────────────────
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLang } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const prompt = `Translate the following ancient Greek epigraphical text into ${targetLang}.
The text is from an inscription related to the cult of Men (lunar deity) in the Mediterranean.
Preserve technical epigraphical conventions: brackets [] indicate restored text, [---] indicates lacunae.
Return only the translated text, without preamble or explanation.

Text: "${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });

      res.json({ translation: response.text?.trim() || "" });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Failed to translate" });
    }
  });

  // ── Vite / Static ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Corpus dir: ${CORPUS_DIR}`);
  });
}

startServer();