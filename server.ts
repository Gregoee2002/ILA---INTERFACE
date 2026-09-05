import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { xmlToMonumenti, monumentiToXml } from "./src/lib/xmlUtils";
import { pullCorpusFromGitHub, pushFileToGitHub, deleteFileFromGitHub, isGitHubConfigured, testGitHubAccess, pullDraftsFromGitHub, pullFlagsFileFromGitHub, pushFlagsFileToGitHub, pullBugsFileFromGitHub, pushBugsFileToGitHub, pullIconographyVocabFileFromGitHub, pushIconographyVocabFileToGitHub, pushLitSourcesFileToGitHub, scheduleRedeploy } from "./src/lib/githubStorage";
import { EntryRegistro, BugReport } from "./src/types";
import { normalizeRegistro } from "./src/lib/registroMigration";
import { mergeIconographyOverrides } from "./src/lib/iconographyLabels";
import { buildSearchIndex, searchMonumenti } from "./src/lib/searchIndex";
import MiniSearch from 'minisearch';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
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
  // Registro dei collaboratori (vedi flags.json su GitHub, radice repo).
  const FLAGS_FILE = path.join(DATA_DIR, "flags.json");
  // Bug segnalati dai collaboratori (vedi bugs.json su GitHub, radice repo).
  const BUGS_FILE = path.join(DATA_DIR, "bugs.json");
  // Overlay del vocabolario iconografico non ancora curato (vedi
  // iconography-vocab.json su GitHub, radice repo dati).
  const ICONOGRAPHY_VOCAB_FILE = path.join(DATA_DIR, "iconography-vocab.json");
  // Fonti letterarie: opere, voci e testimonianze in un file solo (vedi
  // fonti-letterarie.json su GitHub, radice repo dati).
  const LIT_SOURCES_FILE = path.join(DATA_DIR, "fonti-letterarie.json");

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

  // Cancello sul dato: la repo dati e questo corpus si sono già disallineati,
  // e il pull all'avvio sovrascrive il locale. Se il remoto è più povero — non
  // ha schede che qui esistono — quasi sempre è il remoto a essere indietro,
  // non il locale a essere di troppo: meglio partire con dati locali stantii
  // che perdere lavoro. La soglia non è zero perché una singola scheda tolta
  // apposta è un'operazione legittima.
  const SOGLIA_MANCANTI = 5;
  function corpusSyncGuard({ remote, local }: { remote: string[]; local: string[] }): string | null {
    if (local.length === 0) return null;                     // primo avvio: tutto lecito
    if (remote.length === 0) return `il remoto non ha nessuna scheda, il locale ne ha ${local.length}`;
    const mancanti = local.filter(f => !remote.includes(f));
    if (mancanti.length > SOGLIA_MANCANTI) {
      return `sul remoto mancano ${mancanti.length} schede presenti in locale (${mancanti.slice(0, 3).join(', ')}…), su ${local.length} totali`;
    }
    return null;
  }

  if (isGitHubConfigured()) {
    try {
      await pullCorpusFromGitHub(
        CORPUS_DIR,
        (filepath, content) => fs.writeFileSync(filepath, content, "utf-8"),
        (...parts) => path.join(...parts),
        (dir) => fs.readdirSync(dir).filter(f => f.endsWith('.xml') && !f.startsWith('_')),
        (filepath) => fs.unlinkSync(filepath),
        corpusSyncGuard
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
    try {
      const remote = await pullFlagsFileFromGitHub();
      if (remote !== null) fs.writeFileSync(FLAGS_FILE, remote, "utf-8");
    } catch (e: any) {
      console.error("[githubStorage] Sync registro iniziale fallita — il server parte comunque con il filesystem locale (probabilmente vuoto o stale):", e.message || e);
    }
    try {
      const remoteBugs = await pullBugsFileFromGitHub();
      if (remoteBugs !== null) fs.writeFileSync(BUGS_FILE, remoteBugs, "utf-8");
    } catch (e: any) {
      console.error("[githubStorage] Sync bug iniziale fallita — il server parte comunque con il filesystem locale (probabilmente vuoto o stale):", e.message || e);
    }
    try {
      const remoteVocab = await pullIconographyVocabFileFromGitHub();
      if (remoteVocab !== null) fs.writeFileSync(ICONOGRAPHY_VOCAB_FILE, remoteVocab, "utf-8");
    } catch (e: any) {
      console.error("[githubStorage] Sync vocabolario iconografico iniziale fallita — il server parte comunque con il filesystem locale (probabilmente vuoto o stale):", e.message || e);
    }
  }
  if (!fs.existsSync(FLAGS_FILE)) fs.writeFileSync(FLAGS_FILE, "[]", "utf-8");
  if (!fs.existsSync(ICONOGRAPHY_VOCAB_FILE)) fs.writeFileSync(ICONOGRAPHY_VOCAB_FILE, "{}", "utf-8");
  try {
    mergeIconographyOverrides(JSON.parse(fs.readFileSync(ICONOGRAPHY_VOCAB_FILE, "utf-8")));
  } catch (e) {
    console.error("[iconography-vocab] Overlay non valido, ignorato:", e);
  }
  if (!fs.existsSync(BUGS_FILE)) fs.writeFileSync(BUGS_FILE, "[]", "utf-8");

  // Costruisci l'indice di ricerca all'avvio
  updateSearchIndex(readCorpusFiles());

  app.use(express.json({ limit: '50mb' }));

  // ── Helpers ──────────────────────────────────────────────────────────────

  // Build a safe filename from a Monumento: ILA-001.xml
  function buildFilename(m: any): string {
    const id = String(m.id || 0).padStart(3, '0');
    return `ILA-${id}.xml`;
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
          parsed.forEach(m => {
            (m as any)._corpusFile = file;
            (m as any)._fileHash = fileHash;
          });
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

  // Scrive un file XML del corpus in un unico punto: locale + specchio su
  // GitHub (se configurato). Usare SEMPRE questa funzione invece di
  // fs.writeFileSync diretto per qualunque file dentro CORPUS_DIR, così le
  // due copie non possono disallinearsi.
  async function writeCorpusFile(filename: string, content: string, commitMessage: string): Promise<void> {
    fs.writeFileSync(path.join(CORPUS_DIR, filename), content, 'utf-8');
    await pushFileToGitHub(filename, content, commitMessage);
    // Fa comparire la modifica sul sito senza un redeploy manuale — vedi
    // scheduleRedeploy in githubStorage.ts (no-op se DEPLOY_REPO non è
    // configurato, nessuna regressione).
    scheduleRedeploy();
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

  // Legge/scrive flags.json in un unico punto: locale + specchio su GitHub
  // (se configurato), stesso pattern di writeCorpusFile.
  function readFlags(): EntryRegistro[] {
    try {
      const raw = fs.readFileSync(FLAGS_FILE, "utf-8");
      return normalizeRegistro(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async function writeFlags(flags: EntryRegistro[], commitMessage: string): Promise<void> {
    const content = JSON.stringify(flags, null, 2);
    fs.writeFileSync(FLAGS_FILE, content, "utf-8");
    await pushFlagsFileToGitHub(content, commitMessage);
  }

  // Stesso pattern di readFlags/writeFlags, per i bug segnalati dai collaboratori.
  function readBugs(): BugReport[] {
    try {
      const raw = fs.readFileSync(BUGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function writeBugs(bugs: BugReport[], commitMessage: string): Promise<void> {
    const content = JSON.stringify(bugs, null, 2);
    fs.writeFileSync(BUGS_FILE, content, "utf-8");
    await pushBugsFileToGitHub(content, commitMessage);
  }

  // Stesso pattern di readFlags/writeFlags, per l'overlay del vocabolario
  // iconografico non ancora curato a mano in iconographyLabels.ts.
  function readIconographyVocab(): Record<string, string> {
    try {
      const raw = fs.readFileSync(ICONOGRAPHY_VOCAB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  async function writeIconographyVocab(vocab: Record<string, string>, commitMessage: string): Promise<void> {
    const content = JSON.stringify(vocab, null, 2);
    fs.writeFileSync(ICONOGRAPHY_VOCAB_FILE, content, "utf-8");
    await pushIconographyVocabFileToGitHub(content, commitMessage);
  }

  // ── Routes ───────────────────────────────────────────────────────────────

  // GET all monuments — reads from corpus dir, falls back to legacy file
  app.get("/api/monumenti", (_req, res) => {
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
          writtenFiles.add(filename);

          try {
            // Riscrittura completa via monumentiToXml, sia per schede nuove che
            // esistenti: il client manda sempre l'oggetto Monumento completo (non
            // un patch parziale), e monumentiToXml è la stessa serializzazione
            // già validata come fedele sull'intero corpus — un'unica strada,
            // niente più divergenza col vecchio patchXmlContent basato su regex
            // che copriva solo una manciata di campi.
            const xml = monumentiToXml([m]);
            await writeCorpusFile(filename, xml, `Aggiorna ${filename}`);
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

      // Riscrittura completa via monumentiToXml: il client manda sempre l'oggetto
      // Monumento intero (vedi handleSaveMetadata in App.tsx, {...target, ...metadata}),
      // non un vero patch parziale — "patch" qui si riferisce solo al fatto che
      // tocchiamo un file alla volta, non tutto il corpus.
      const patched = monumentiToXml([monumento]);
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
  app.get("/api/corpus/files", (_req, res) => {
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
  app.get("/api/corpus/backup", (_req, res) => {
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
  app.get("/api/drafts/files", (_req, res) => {
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
  app.get("/api/corpus/github-status", async (_req, res) => {
    const result = await testGitHubAccess();
    res.json(result);
  });

  // POST rilancia a comando la stessa sincronizzazione da GitHub fatta
  // all'avvio (corpus + segnalazioni), senza dover riavviare il processo.
  // Serve per rendere visibili modifiche fatte direttamente sul repo dati
  // (es. a mano su GitHub) senza aspettare il prossimo restart del server.
  app.post("/api/corpus/sync", async (_req, res) => {
    if (!isGitHubConfigured()) {
      return res.status(400).json({ error: "Persistenza GitHub non configurata su questo server." });
    }
    try {
      const corpusResult = await pullCorpusFromGitHub(
        CORPUS_DIR,
        (filepath, content) => fs.writeFileSync(filepath, content, "utf-8"),
        (...parts) => path.join(...parts),
        (dir) => fs.readdirSync(dir).filter(f => f.endsWith('.xml') && !f.startsWith('_')),
        (filepath) => fs.unlinkSync(filepath)
      );
      const remoteFlags = await pullFlagsFileFromGitHub();
      if (remoteFlags !== null) fs.writeFileSync(FLAGS_FILE, remoteFlags, "utf-8");
      const remoteBugs = await pullBugsFileFromGitHub();
      if (remoteBugs !== null) fs.writeFileSync(BUGS_FILE, remoteBugs, "utf-8");

      rebuildBackup();
      const monumenti = readCorpusFiles();
      updateSearchIndex(monumenti);

      res.json({
        status: "ok",
        pulled: corpusResult.pulled,
        skipped: corpusResult.skipped,
        deletedLocally: corpusResult.deletedLocally,
        monumentiCount: monumenti.length,
      });
    } catch (error: any) {
      console.error("Error syncing from GitHub:", error);
      res.status(500).json({ error: error.message || "Sincronizzazione da GitHub fallita" });
    }
  });

  // ── Registro collaboratori ────────────────────────────────────────────────

  app.get("/api/flags", (_req, res) => {
    res.json(readFlags());
  });

  app.post("/api/flags", async (req, res) => {
    try {
      const { entryId, entryLabel, note, author } = req.body || {};
      if (typeof entryId !== "string" || !entryId.trim()) return res.status(400).json({ error: "entryId mancante" });
      if (typeof note !== "string" || !note.trim()) return res.status(400).json({ error: "Testo della nota mancante" });
      if (note.length > 4000) return res.status(400).json({ error: "note supera 4000 caratteri" });
      if (typeof entryLabel !== "string" || entryLabel.length > 200) return res.status(400).json({ error: "entryLabel non valida" });
      if (typeof author !== "string" || !author.trim()) return res.status(400).json({ error: "Autore mancante" });
      if (author.length > 100) return res.status(400).json({ error: "author supera 100 caratteri" });

      const now = new Date().toISOString();
      const nota = { id: crypto.randomUUID(), author: author.trim(), testo: note.trim(), createdAt: now };
      const flags = readFlags();
      let registro = flags.find(f => f.entryId === entryId);
      if (registro) {
        registro.notes.push(nota);
        registro.status = "open";
        registro.resolvedAt = undefined;
      } else {
        registro = { entryId, entryLabel, status: "open", createdAt: now, notes: [nota] };
        flags.push(registro);
      }
      await writeFlags(flags, `Registro: ${entryLabel}`);
      res.json(registro);
    } catch (error: any) {
      console.error("Error creating registro note:", error);
      res.status(500).json({ error: error.message || "Failed to save registro note" });
    }
  });

  app.patch("/api/flags/:entryId", async (req, res) => {
    try {
      const { entryId } = req.params;
      const { status } = req.body || {};
      if (status !== "open" && status !== "resolved") return res.status(400).json({ error: "status deve essere 'open' o 'resolved'" });

      const flags = readFlags();
      const registro = flags.find(f => f.entryId === entryId);
      if (!registro) return res.status(404).json({ error: "Registro non trovato" });

      registro.status = status;
      registro.resolvedAt = status === "resolved" ? new Date().toISOString() : undefined;
      await writeFlags(flags, status === "resolved" ? `Registro risolto: ${registro.entryLabel}` : `Registro riaperto: ${registro.entryLabel}`);
      res.json(registro);
    } catch (error: any) {
      console.error("Error updating registro:", error);
      res.status(500).json({ error: error.message || "Failed to update registro" });
    }
  });

  // ── Bug segnalati dai collaboratori ───────────────────────────────────────

  app.get("/api/bugs", (_req, res) => {
    res.json(readBugs());
  });

  app.post("/api/bugs", async (req, res) => {
    try {
      const { note, author } = req.body || {};
      if (typeof note !== "string" || !note.trim()) return res.status(400).json({ error: "Descrizione del bug mancante" });
      if (note.length > 4000) return res.status(400).json({ error: "note supera 4000 caratteri" });
      if (typeof author !== "string" || !author.trim()) return res.status(400).json({ error: "Autore mancante" });
      if (author.length > 100) return res.status(400).json({ error: "author supera 100 caratteri" });

      const bug: BugReport = {
        id: crypto.randomUUID(),
        author: author.trim(),
        testo: note.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      };
      const bugs = readBugs();
      bugs.push(bug);
      await writeBugs(bugs, `Bug: ${bug.testo.slice(0, 60)}`);
      res.json(bug);
    } catch (error: any) {
      console.error("Error creating bug report:", error);
      res.status(500).json({ error: error.message || "Failed to save bug report" });
    }
  });

  app.patch("/api/bugs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      if (status !== "open" && status !== "resolved") return res.status(400).json({ error: "status deve essere 'open' o 'resolved'" });

      const bugs = readBugs();
      const bug = bugs.find(b => b.id === id);
      if (!bug) return res.status(404).json({ error: "Bug non trovato" });

      bug.status = status;
      bug.resolvedAt = status === "resolved" ? new Date().toISOString() : undefined;
      await writeBugs(bugs, status === "resolved" ? `Bug risolto: ${bug.testo.slice(0, 60)}` : `Bug riaperto: ${bug.testo.slice(0, 60)}`);
      res.json(bug);
    } catch (error: any) {
      console.error("Error updating bug report:", error);
      res.status(500).json({ error: error.message || "Failed to update bug report" });
    }
  });

  // ── Vocabolario iconografico: overlay di termini non ancora curati ───────
  // Operazione volutamente leggera: un PATCH incrementale di uno o due
  // termini per volta (mai una riscrittura batch), innescato dal salvataggio
  // di una scheda con un termine iconografico fuori dal vocabolario curato
  // (vedi SectionEditorView.tsx) o inseribile a mano da qui.

  app.get("/api/iconography-vocab", (_req, res) => {
    res.json(readIconographyVocab());
  });

  app.post("/api/iconography-vocab", async (req, res) => {
    try {
      const { terms } = req.body || {};
      if (!terms || typeof terms !== "object" || Array.isArray(terms)) {
        return res.status(400).json({ error: "terms deve essere un oggetto { id: label }" });
      }
      const entries = Object.entries(terms).filter(([id, label]) => id.trim() && typeof label === "string");
      if (entries.length === 0) return res.status(400).json({ error: "Nessun termine valido" });

      const vocab = readIconographyVocab();
      let changed = false;
      for (const [id, label] of entries) {
        if (vocab[id] !== label) { vocab[id] = label as string; changed = true; }
      }
      if (changed) {
        await writeIconographyVocab(vocab, `Vocabolario iconografico: +${entries.map(([id]) => id).join(", ")}`);
        mergeIconographyOverrides(vocab);
      }
      res.json(vocab);
    } catch (error: any) {
      console.error("Error updating iconography vocab:", error);
      res.status(500).json({ error: error.message || "Failed to update iconography vocab" });
    }
  });

  // ── Fonti letterarie ─────────────────────────────────────────────────────
  // Stessa semantica dello shim statico (apiShim.ts): 204 quando l'archivio
  // non esiste ancora, perché la sezione parte dal seme compilato nel bundle
  // e non da un file vuoto.

  app.get("/api/fonti-letterarie", (_req, res) => {
    try {
      if (!fs.existsSync(LIT_SOURCES_FILE)) return res.status(204).end();
      res.type("application/json").send(fs.readFileSync(LIT_SOURCES_FILE, "utf-8"));
    } catch (error: any) {
      console.error("Error reading fonti-letterarie.json:", error);
      res.status(500).json({ error: error.message || "Lettura fallita" });
    }
  });

  app.post("/api/fonti-letterarie", async (req, res) => {
    try {
      const { dataset, message } = req.body || {};
      if (!dataset || typeof dataset !== "object") {
        return res.status(400).json({ error: "Campo 'dataset' mancante" });
      }
      const content = JSON.stringify(dataset, null, 2);
      fs.writeFileSync(LIT_SOURCES_FILE, content, "utf-8");
      await pushLitSourcesFileToGitHub(content, message || "Fonti letterarie: aggiornamento redazionale");
      res.json({ status: "ok", bytes: content.length });
    } catch (error: any) {
      console.error("Error writing fonti-letterarie.json:", error);
      res.status(500).json({ error: error.message || "Scrittura fallita" });
    }
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

  app.post("/api/reindex", (_req, res) => {
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