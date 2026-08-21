// ═══════════════════════════════════════════════════════════════════════
// githubStorage.ts — corpus XML persistito su una repo GitHub privata
// ═══════════════════════════════════════════════════════════════════════
//
// Sostituisce Firestore come fonte di verità persistente. Il filesystem
// locale (CORPUS_DIR) resta come CACHE veloce per le letture durante la
// vita del processo; la repo GitHub è la fonte di verità che sopravvive
// a un filesystem effimero (redeploy/restart).
//
// CONFIGURAZIONE — unica cosa da fare per attivarlo:
//   GITHUB_TOKEN         Personal Access Token (fine-grained), permesso
//                        Contents: Read and write, sulla singola repo.
//   GITHUB_REPO          "utente/nome-repo" (la repo privata degli XML)
//   GITHUB_BRANCH        opzionale, default "main"
//   GITHUB_CORPUS_PATH   opzionale, default "corpus" (cartella nella repo)
//
// Se GITHUB_TOKEN o GITHUB_REPO non sono impostati, il modulo resta
// silenziosamente inattivo (no-op): il server continua a funzionare solo
// con il filesystem locale, com'era prima — così puoi attivare la
// migrazione semplicemente aggiungendo le variabili d'ambiente, senza
// dover toccare altro codice.
//
// NOTA su volumi grandi: qui uso la Contents API (un file per chiamata),
// adatta a un singolo admin con scritture non concorrenti. Per import
// massivi di centinaia di file in un colpo solo converrebbe la Git Data
// API (blob+tree+commit in un'unica richiesta) — non implementata qui
// per restare semplice; le scritture correnti (patch singole, import di
// poche decine di file) restano comunque entro i rate limit di GitHub.

const GITHUB_API = "https://api.github.com";

interface GitHubConfig {
  token: string;
  repo: string; // "utente/nome-repo"
  branch: string;
  corpusPath: string; // cartella nella repo, es. "corpus"
  draftsPath: string; // cartella nella repo per i draft non revisionati, es. "drafts" — SEMPRE distinta da corpusPath
}

let config: GitHubConfig | null = null;
let warnedOnce = false;

// Cache in-memory dello sha di ogni file sulla repo — necessaria per
// aggiornare (PUT con sha) invece di creare un file già esistente.
// Due cache separate: corpus e drafts vivono nella stessa repo ma sono
// cartelle diverse, e possono avere file con lo stesso nome (es. una entry
// già revisionata in corpus/ e la sua bozza originale in drafts/) — una
// cache unica causerebbe sha sbagliati e scritture corrotte tra le due.
const shaCache = new Map<string, string>();
const draftShaCache = new Map<string, string>();

function loadConfig(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    if (!warnedOnce) {
      console.log(
        "[githubStorage] GITHUB_TOKEN e/o GITHUB_REPO non impostati — " +
        "persistenza su GitHub DISATTIVA, uso solo il filesystem locale."
      );
      warnedOnce = true;
    }
    return null;
  }
  const corpusPath = (process.env.GITHUB_CORPUS_PATH || "corpus").replace(/^\/+|\/+$/g, "");
  const draftsPath = (process.env.GITHUB_DRAFTS_PATH || "drafts").replace(/^\/+|\/+$/g, "");
  if (corpusPath === draftsPath) {
    throw new Error(`[githubStorage] GITHUB_CORPUS_PATH e GITHUB_DRAFTS_PATH non possono coincidere ("${corpusPath}") — il corpus revisionato e i draft non revisionati devono restare in cartelle separate.`);
  }
  return {
    token,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
    corpusPath,
    draftsPath,
  };
}

export function isGitHubConfigured(): boolean {
  if (config === null) config = loadConfig();
  return config !== null;
}

function getConfig(): GitHubConfig {
  if (config === null) config = loadConfig();
  if (config === null) throw new Error("GitHub storage non configurato");
  return config;
}

function headers(cfg: GitHubConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ila-corpus-sync",
    "Content-Type": "application/json",
  };
}

function repoPath(cfg: GitHubConfig, filename: string): string {
  // Difesa in profondità: filename arriva in ultima analisi da input lato
  // client (vedi server.ts); anche se il chiamante dovesse già sanitizzare,
  // qui non deve mai poter contenere segmenti che escono da corpusPath.
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${cfg.corpusPath}/${safeName}`;
}

function draftRepoPath(cfg: GitHubConfig, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${cfg.draftsPath}/${safeName}`;
}

// ── Lettura: elenco file + contenuto ──────────────────────────────────

interface GitHubDirEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
  download_url: string | null;
}

async function listRepoFiles(cfg: GitHubConfig, folderPath: string = cfg.corpusPath): Promise<{ entries: GitHubDirEntry[]; confirmed: boolean }> {
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${folderPath}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: headers(cfg) });

  if (res.status === 404) {
    console.warn(`[githubStorage] GET ${url} → 404: cartella "${folderPath}" non trovata sul branch "${cfg.branch}". Se pensavi che i file ci fossero, controlla nome repo/branch/percorso.`);
    // "confirmed: false" — un 404 può significare tanto "repo vuota al primo
    // avvio" quanto "percorso/branch sbagliato per errore di configurazione".
    // Non fidarsi di questo caso per decidere cosa cancellare in locale.
    return { entries: [], confirmed: false };
  }
  if (!res.ok) {
    throw new Error(`GitHub list fallita (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`Percorso "${folderPath}" sulla repo non è una cartella`);
  }
  console.log(`[githubStorage] GET ${url} → ${data.length} elementi grezzi (prima del filtro .xml)`);
  return { entries: data as GitHubDirEntry[], confirmed: true };
}

/**
 * Scarica tutti gli XML dalla repo GitHub e li scrive in localDir,
 * popolando anche la cache degli sha. Va chiamata all'avvio del server,
 * prima di servire qualunque richiesta, così un filesystem effimero
 * riparte sempre allineato alla fonte di verità.
 *
 * MIRROR VERO: i file locali che non esistono più su GitHub vengono
 * cancellati anche in locale — così cancellare un file direttamente sulla
 * repo (via browser o `git rm`) è sufficiente, senza dover passare
 * dall'app. La cronologia commit di GitHub resta la rete di sicurezza.
 *
 * SICUREZZA: la cancellazione locale scatta SOLO se la lista remota è
 * "confirmed" (una risposta 200 genuina, non un 404 che potrebbe in
 * realtà nascondere un percorso/branch configurato male). Su un 404 non
 * tocchiamo nulla in locale — meglio un filesystem locale temporaneamente
 * disallineato che una cancellazione di massa basata su una lista che
 * potrebbe essere vuota per errore di configurazione invece che per stato
 * reale della repo.
 */
export async function pullCorpusFromGitHub(
  localDir: string,
  fsWriteFileSync: (filepath: string, content: string) => void,
  pathJoin: (...parts: string[]) => string,
  fsListLocalXmlFiles?: (dir: string) => string[],
  fsUnlinkSync?: (filepath: string) => void
): Promise<{ pulled: number; skipped: string[]; deletedLocally: string[] }> {
  if (!isGitHubConfigured()) return { pulled: 0, skipped: [], deletedLocally: [] };
  const cfg = getConfig();

  console.log(`[githubStorage] Sincronizzazione corpus da ${cfg.repo}/${cfg.corpusPath} (branch ${cfg.branch}) ...`);

  const { entries, confirmed } = await listRepoFiles(cfg);
  const xmlFiles = entries.filter(e => e.type === "file" && e.name.endsWith(".xml") && !e.name.startsWith("_"));
  const remoteNames = new Set(xmlFiles.map(e => e.name));

  shaCache.clear();
  const skipped: string[] = [];
  let pulled = 0;

  for (const entry of xmlFiles) {
    try {
      if (!entry.download_url) {
        skipped.push(entry.name);
        continue;
      }
      // download_url è pubblico solo per repo pubbliche; per repo private
      // serve comunque il token sull'endpoint contents "raw".
      const fileRes = await fetch(entry.download_url, {
        headers: { Authorization: `Bearer ${cfg.token}`, "User-Agent": "ila-corpus-sync" },
      });
      if (!fileRes.ok) {
        console.warn(`[githubStorage] Skip ${entry.name}: download fallito (${fileRes.status})`);
        skipped.push(entry.name);
        continue;
      }
      const content = await fileRes.text();
      fsWriteFileSync(pathJoin(localDir, entry.name), content);
      shaCache.set(entry.name, entry.sha);
      pulled++;
    } catch (e: any) {
      console.warn(`[githubStorage] Skip ${entry.name}: ${e.message || e}`);
      skipped.push(entry.name);
    }
  }

  const deletedLocally: string[] = [];
  if (confirmed && fsListLocalXmlFiles && fsUnlinkSync) {
    const localFiles = fsListLocalXmlFiles(localDir);
    // Un file scaricato con successo in QUESTO giro ma poi rimosso qui
    // sarebbe un controsenso: escludiamo esplicitamente anche i nomi
    // "skipped" da questo giro, per non cancellare qualcosa che sappiamo
    // esistere su GitHub ma che abbiamo semplicemente fallito a scaricare
    // per un errore transitorio.
    for (const localName of localFiles) {
      if (!remoteNames.has(localName) && !skipped.includes(localName)) {
        try {
          fsUnlinkSync(pathJoin(localDir, localName));
          deletedLocally.push(localName);
        } catch (e: any) {
          console.warn(`[githubStorage] Impossibile cancellare in locale ${localName}: ${e.message || e}`);
        }
      }
    }
    if (deletedLocally.length > 0) {
      console.log(`[githubStorage] Rimossi in locale ${deletedLocally.length} file non più presenti su GitHub: ${deletedLocally.join(', ')}`);
    }
  } else if (!confirmed) {
    console.warn(`[githubStorage] Lista remota non confermata (404) — nessuna cancellazione locale eseguita per sicurezza.`);
  }

  console.log(`[githubStorage] Sync completata: ${pulled} file scaricati${skipped.length ? `, ${skipped.length} saltati` : ""}${deletedLocally.length ? `, ${deletedLocally.length} rimossi in locale` : ""}.`);
  return { pulled, skipped, deletedLocally };
}

/**
 * Variante di pullCorpusFromGitHub per la cartella drafts/ — stessa logica
 * (mirror completo, cancellazione locale solo se la lista remota è
 * confermata), ma path e cache sha indipendenti da quelli del corpus.
 * I draft sono materiale di lavoro pre-revisione: mai scritti nella stessa
 * cartella del corpus revisionato.
 */
export async function pullDraftsFromGitHub(
  localDir: string,
  fsWriteFileSync: (filepath: string, content: string) => void,
  pathJoin: (...parts: string[]) => string,
  fsListLocalXmlFiles?: (dir: string) => string[],
  fsUnlinkSync?: (filepath: string) => void
): Promise<{ pulled: number; skipped: string[]; deletedLocally: string[] }> {
  if (!isGitHubConfigured()) return { pulled: 0, skipped: [], deletedLocally: [] };
  const cfg = getConfig();

  console.log(`[githubStorage] Sincronizzazione draft da ${cfg.repo}/${cfg.draftsPath} (branch ${cfg.branch}) ...`);

  const { entries, confirmed } = await listRepoFiles(cfg, cfg.draftsPath);
  const xmlFiles = entries.filter(e => e.type === "file" && e.name.endsWith(".xml") && !e.name.startsWith("_"));
  const remoteNames = new Set(xmlFiles.map(e => e.name));

  draftShaCache.clear();
  const skipped: string[] = [];
  let pulled = 0;

  for (const entry of xmlFiles) {
    try {
      if (!entry.download_url) {
        skipped.push(entry.name);
        continue;
      }
      const fileRes = await fetch(entry.download_url, {
        headers: { Authorization: `Bearer ${cfg.token}`, "User-Agent": "ila-corpus-sync" },
      });
      if (!fileRes.ok) {
        console.warn(`[githubStorage] Skip draft ${entry.name}: download fallito (${fileRes.status})`);
        skipped.push(entry.name);
        continue;
      }
      const content = await fileRes.text();
      fsWriteFileSync(pathJoin(localDir, entry.name), content);
      draftShaCache.set(entry.name, entry.sha);
      pulled++;
    } catch (e: any) {
      console.warn(`[githubStorage] Skip draft ${entry.name}: ${e.message || e}`);
      skipped.push(entry.name);
    }
  }

  const deletedLocally: string[] = [];
  if (confirmed && fsListLocalXmlFiles && fsUnlinkSync) {
    const localFiles = fsListLocalXmlFiles(localDir);
    for (const localName of localFiles) {
      if (!remoteNames.has(localName) && !skipped.includes(localName)) {
        try {
          fsUnlinkSync(pathJoin(localDir, localName));
          deletedLocally.push(localName);
        } catch (e: any) {
          console.warn(`[githubStorage] Impossibile cancellare in locale ${localName}: ${e.message || e}`);
        }
      }
    }
    if (deletedLocally.length > 0) {
      console.log(`[githubStorage] Rimossi in locale ${deletedLocally.length} draft non più presenti su GitHub: ${deletedLocally.join(', ')}`);
    }
  } else if (!confirmed) {
    console.warn(`[githubStorage] Lista remota draft non confermata (404) — nessuna cancellazione locale eseguita per sicurezza.`);
  }

  console.log(`[githubStorage] Sync draft completata: ${pulled} file scaricati${skipped.length ? `, ${skipped.length} saltati` : ""}${deletedLocally.length ? `, ${deletedLocally.length} rimossi in locale` : ""}.`);
  return { pulled, skipped, deletedLocally };
}

// ── Scrittura: crea/aggiorna un file ──────────────────────────────────

/**
 * Crea o aggiorna un singolo file XML sulla repo GitHub. Va chiamata
 * DOPO ogni scrittura locale (nuova entry, patch, import) così le due
 * copie restano allineate. No-op silenziosa se GitHub non è configurato.
 */
// La Contents API crea un commit per ogni PUT, che deve avanzare l'HEAD del
// branch: con più scritture in corso in parallelo (vedi WRITE_CONCURRENCY in
// server.ts) più richieste possono partire dallo stesso HEAD e "perdere" la
// corsa ad avanzarlo, anche scrivendo file diversi — GitHub risponde 409/422
// a chi arriva secondo. Non è un errore di sha del singolo file, quindi un
// solo retry non basta quando la concorrenza è > 1: si ritenta più volte,
// ogni volta con lo sha riletto fresco e un piccolo backoff.
const MAX_PUSH_ATTEMPTS = 6;

export async function pushFileToGitHub(filename: string, content: string, message: string): Promise<void> {
  if (!isGitHubConfigured()) return;
  const cfg = getConfig();
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${repoPath(cfg, filename)}`;
  let sha = shaCache.get(filename) ?? null;

  for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt++) {
    if (sha === null) sha = await fetchCurrentSha(cfg, filename);
    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: cfg.branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, { method: "PUT", headers: headers(cfg), body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      shaCache.set(filename, data.content.sha);
      return;
    }

    const detail = await res.text();
    const isRaceConflict = res.status === 409 || res.status === 422;
    if (isRaceConflict && attempt < MAX_PUSH_ATTEMPTS) {
      console.warn(`[githubStorage] Conflitto (${res.status}) su ${filename}, tentativo ${attempt}/${MAX_PUSH_ATTEMPTS}, ritento...`);
      await new Promise(r => setTimeout(r, 150 * attempt + Math.random() * 200));
      sha = null;
      continue;
    }
    throw new Error(`Scrittura GitHub fallita per ${filename} (${res.status}) dopo ${attempt} tentativi: ${detail}`);
  }
}

// ── Redeploy automatico del sito statico dopo un salvataggio ──────────
//
// Il sito pubblico (GitHub Pages) è generato da un workflow separato
// (.github/workflows/deploy-pages.yml) su un ALTRO repository — quello di
// codice, non questo repository dati — e non parte mai da solo quando si
// scrive qui. Senza questo, ogni salvataggio richiede un redeploy manuale
// per comparire sul sito (vedi commit "lo snapshot statico non rifletteva
// mai le modifiche fatte nell'editor").
//
// CONFIGURAZIONE — opzionale, oltre a GITHUB_TOKEN/GITHUB_REPO già in uso:
//   DEPLOY_REPO       "utente/nome-repo" del repository di CODICE (quello
//                     con .github/workflows/deploy-pages.yml). Se non
//                     impostato, il redeploy automatico resta disattivo
//                     (nessuna regressione: comportamento invariato).
//   DEPLOY_WORKFLOW   opzionale, default "deploy-pages.yml"
//   DEPLOY_BRANCH     opzionale, default "main"
//
// Riusa lo stesso GITHUB_TOKEN già configurato: deve avere, IN PIÙ del
// permesso Contents su questo repository dati, anche il permesso
// "Actions: Read and write" sul repository di codice (DEPLOY_REPO).
function loadDeployTriggerConfig(): { repo: string; workflow: string; branch: string } | null {
  const repo = process.env.DEPLOY_REPO;
  if (!repo) return null;
  return {
    repo,
    workflow: process.env.DEPLOY_WORKFLOW || "deploy-pages.yml",
    branch: process.env.DEPLOY_BRANCH || "main",
  };
}

let deployWarnedOnce = false;

async function triggerPagesRedeploy(): Promise<void> {
  if (!isGitHubConfigured()) return;
  const deployCfg = loadDeployTriggerConfig();
  if (!deployCfg) {
    if (!deployWarnedOnce) {
      console.log("[githubStorage] DEPLOY_REPO non impostato — redeploy automatico del sito dopo il salvataggio disattivo (serve un redeploy manuale per vedere le modifiche online).");
      deployWarnedOnce = true;
    }
    return;
  }
  const cfg = getConfig();
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${deployCfg.repo}/actions/workflows/${deployCfg.workflow}/dispatches`,
      { method: "POST", headers: headers(cfg), body: JSON.stringify({ ref: deployCfg.branch }) }
    );
    if (res.ok) {
      console.log(`[githubStorage] Redeploy di ${deployCfg.repo} avviato dopo il salvataggio.`);
    } else {
      console.warn(`[githubStorage] Redeploy automatico non avviato (HTTP ${res.status}): il salvataggio è comunque riuscito. Verifica che GITHUB_TOKEN abbia anche "Actions: Read and write" su ${deployCfg.repo}.`);
    }
  } catch (e: any) {
    console.warn(`[githubStorage] Redeploy automatico non avviato: ${e.message || e}`);
  }
}

// Un salvataggio massivo (es. "Riordina ID" su ~300 schede) scrive centinaia
// di file uno dopo l'altro: senza debounce, ognuno farebbe partire una
// dispatch separata. Si accorpano in un'unica chiamata, innescata solo
// quando le scritture si fermano per un momento.
let redeployTimer: ReturnType<typeof setTimeout> | null = null;
const REDEPLOY_DEBOUNCE_MS = 8000;

export function scheduleRedeploy(): void {
  if (redeployTimer) clearTimeout(redeployTimer);
  redeployTimer = setTimeout(() => {
    redeployTimer = null;
    void triggerPagesRedeploy();
  }, REDEPLOY_DEBOUNCE_MS);
}

async function fetchCurrentSha(cfg: GitHubConfig, filename: string): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${repoPath(cfg, filename)}?ref=${encodeURIComponent(cfg.branch)}`;
  // Vedi commento gemello in githubStorageBrowser.ts: la Contents API risponde
  // "Cache-Control: private, max-age=60", quindi anche qui no-store esplicito
  // per garantire che il retry su 409 rilegga davvero lo sha aggiornato.
  const res = await fetch(url, { headers: headers(cfg), cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

async function fetchCurrentDraftSha(cfg: GitHubConfig, filename: string): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${draftRepoPath(cfg, filename)}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

/**
 * Variante di pushFileToGitHub per un file in drafts/ — stessa logica di
 * retry su conflitto sha, ma path e cache sha indipendenti da corpus/.
 */
export async function pushDraftFileToGitHub(filename: string, content: string, message: string): Promise<void> {
  if (!isGitHubConfigured()) return;
  const cfg = getConfig();

  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch: cfg.branch,
  };
  // La cache sha è in-memory per processo: in uno script one-off lanciato
  // a parte dal server (che è dove la cache viene normalmente popolata dal
  // pull), sarebbe sempre vuota — recupero lo sha corrente da GitHub se manca,
  // così pushDraftFileToGitHub funziona anche da processo "freddo".
  const existingSha = draftShaCache.get(filename) || (await fetchCurrentDraftSha(cfg, filename));
  if (existingSha) body.sha = existingSha;

  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${draftRepoPath(cfg, filename)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(cfg),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 409) {
      console.warn(`[githubStorage] Conflitto sha su draft ${filename}, ritento con sha aggiornato...`);
      const refreshedUrl = `${GITHUB_API}/repos/${cfg.repo}/contents/${draftRepoPath(cfg, filename)}?ref=${encodeURIComponent(cfg.branch)}`;
      const refreshedRes = await fetch(refreshedUrl, { headers: headers(cfg) });
      const refreshed = refreshedRes.ok ? (await refreshedRes.json()).sha : null;
      if (refreshed) {
        draftShaCache.set(filename, refreshed);
        body.sha = refreshed;
        const retryRes = await fetch(url, { method: "PUT", headers: headers(cfg), body: JSON.stringify(body) });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          draftShaCache.set(filename, retryData.content.sha);
          return;
        }
      }
    }
    throw new Error(`Scrittura GitHub fallita per draft ${filename} (${res.status}): ${detail}`);
  }

  const data = await res.json();
  draftShaCache.set(filename, data.content.sha);
}

// ── Registro (flags.json) ───────────────────────────────────────────
//
// Un unico file JSON alla radice della repo (fuori da corpusPath/
// draftsPath: non è una scheda del corpus né un draft, è un elenco di
// registri di lavorazione dei collaboratori su schede esistenti) — array
// di EntryRegistro (vedi types.ts). Basso volume di scritture attese (un
// collaboratore che aggiorna qualche scheda per volta), quindi niente pool
// concorrente come per il corpus: un retry singolo su conflitto sha basta.
const FLAGS_PATH = "flags.json";
let flagsSha: string | null = null;

/** Legge flags.json dalla repo. `null` se il file non esiste ancora (mai creato). */
export async function pullFlagsFileFromGitHub(): Promise<string | null> {
  if (!isGitHubConfigured()) return null;
  const cfg = getConfig();
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${FLAGS_PATH}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (res.status === 404) { flagsSha = null; return null; }
  if (!res.ok) throw new Error(`GitHub get flags.json fallita (${res.status}): ${await res.text()}`);
  const data = await res.json();
  flagsSha = data.sha || null;
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error("Formato risposta inatteso per flags.json");
  }
  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function pushFlagsFileToGitHub(content: string, message: string): Promise<void> {
  if (!isGitHubConfigured()) return;
  const cfg = getConfig();
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${FLAGS_PATH}`;
  let sha = flagsSha;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: cfg.branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, { method: "PUT", headers: headers(cfg), body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      flagsSha = data.content.sha;
      return;
    }

    const detail = await res.text();
    const isRaceConflict = res.status === 409 || res.status === 422;
    if (isRaceConflict && attempt < 3) {
      console.warn(`[githubStorage] Conflitto (${res.status}) su flags.json, tentativo ${attempt}/3, ritento...`);
      await new Promise(r => setTimeout(r, 150 * attempt));
      const refreshedRes = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg), cache: "no-store" });
      sha = refreshedRes.ok ? (await refreshedRes.json()).sha : null;
      continue;
    }
    throw new Error(`Scrittura GitHub fallita per flags.json (${res.status}) dopo ${attempt} tentativi: ${detail}`);
  }
}

// ── Bug segnalati dai collaboratori (bugs.json) ────────────────────────
// Stesso schema di flags.json ma per problemi sull'app in generale, non
// legati a una scheda specifica — array di BugReport (vedi types.ts).
const BUGS_PATH = "bugs.json";
let bugsSha: string | null = null;

/** Legge bugs.json dalla repo. `null` se il file non esiste ancora (mai creato). */
export async function pullBugsFileFromGitHub(): Promise<string | null> {
  if (!isGitHubConfigured()) return null;
  const cfg = getConfig();
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${BUGS_PATH}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (res.status === 404) { bugsSha = null; return null; }
  if (!res.ok) throw new Error(`GitHub get bugs.json fallita (${res.status}): ${await res.text()}`);
  const data = await res.json();
  bugsSha = data.sha || null;
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error("Formato risposta inatteso per bugs.json");
  }
  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function pushBugsFileToGitHub(content: string, message: string): Promise<void> {
  if (!isGitHubConfigured()) return;
  const cfg = getConfig();
  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${BUGS_PATH}`;
  let sha = bugsSha;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: cfg.branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, { method: "PUT", headers: headers(cfg), body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      bugsSha = data.content.sha;
      return;
    }

    const detail = await res.text();
    const isRaceConflict = res.status === 409 || res.status === 422;
    if (isRaceConflict && attempt < 3) {
      console.warn(`[githubStorage] Conflitto (${res.status}) su bugs.json, tentativo ${attempt}/3, ritento...`);
      await new Promise(r => setTimeout(r, 150 * attempt));
      const refreshedRes = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg), cache: "no-store" });
      sha = refreshedRes.ok ? (await refreshedRes.json()).sha : null;
      continue;
    }
    throw new Error(`Scrittura GitHub fallita per bugs.json (${res.status}) dopo ${attempt} tentativi: ${detail}`);
  }
}

/**
 * Elimina un file dalla repo GitHub (usata quando una scheda viene
 * rimossa/rinominata localmente). No-op silenziosa se non configurato o
 * se il file non è mai stato pushato (niente sha in cache).
 *
 * SICUREZZA: disattiva per default. La route POST /api/monumenti cancella
 * in locale qualunque file non presente nel payload che il client sta
 * salvando in quel momento — comportamento innocuo quando l'unica copia è
 * locale (recuperabile con un nuovo pull), ma distruttivo se specchiato
 * automaticamente sulla fonte di verità permanente: uno stato del
 * frontend non aggiornato/parziale può cancellare schede reali dalla repo
 * senza conferma. Va abilitato esplicitamente con GITHUB_ALLOW_DELETE=true
 * SOLO dopo aver verificato che il frontend non manda mai payload parziali
 * per errore (es. dopo un fallimento di sync che silenziosamente riduce
 * lo stato in memoria).
 */
export async function deleteFileFromGitHub(filename: string, message: string): Promise<void> {
  if (!isGitHubConfigured()) return;
  if (process.env.GITHUB_ALLOW_DELETE !== "true") {
    console.warn(
      `[githubStorage] Cancellazione di "${filename}" NON specchiata su GitHub ` +
      `(GITHUB_ALLOW_DELETE non è "true"). Il file resta rimosso solo in locale — ` +
      `su GitHub è ancora presente. Imposta GITHUB_ALLOW_DELETE=true per abilitare ` +
      `le cancellazioni remote una volta verificato che sia sicuro farlo.`
    );
    return;
  }
  const cfg = getConfig();

  const sha = shaCache.get(filename) || (await fetchCurrentSha(cfg, filename));
  if (!sha) return; // mai esistito su GitHub, niente da cancellare

  const url = `${GITHUB_API}/repos/${cfg.repo}/contents/${repoPath(cfg, filename)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: headers(cfg),
    body: JSON.stringify({ message, sha, branch: cfg.branch }),
  });

  if (!res.ok) {
    console.error(`[githubStorage] Eliminazione fallita per ${filename}: ${await res.text()}`);
  } else {
    shaCache.delete(filename);
  }
}

/**
 * Test di connettività + permessi, usato dalla route diagnostica.
 * Non modifica nulla sulla repo.
 */
export async function testGitHubAccess(): Promise<
  { configured: false } | { configured: true; ok: boolean; detail: string }
> {
  if (!isGitHubConfigured()) return { configured: false };
  const cfg = getConfig();
  try {
    const res = await fetch(`${GITHUB_API}/repos/${cfg.repo}`, { headers: headers(cfg) });
    if (!res.ok) {
      return { configured: true, ok: false, detail: `HTTP ${res.status}: ${await res.text()}` };
    }
    const data = await res.json();
    return {
      configured: true,
      ok: true,
      detail: `Repo raggiunta: ${data.full_name} (privata: ${data.private}), branch predefinito: ${data.default_branch}`,
    };
  } catch (e: any) {
    return { configured: true, ok: false, detail: e.message || String(e) };
  }
}