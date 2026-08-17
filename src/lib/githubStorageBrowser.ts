// ═══════════════════════════════════════════════════════════════════════
// githubStorageBrowser.ts — variante browser di githubStorage.ts
// ═══════════════════════════════════════════════════════════════════════
//
// Usata SOLO dalla build statica (GitHub Pages, vedi apiShim.ts). Non
// sostituisce githubStorage.ts: quel file resta la fonte di verità per
// server.ts e scripts/push-batch.ts (Node, env var, filesystem) e non va
// toccato. Qui si riscrivono le stesse operazioni (list/get/put sulla
// Contents API) senza alcuna dipendenza Node (niente fs/path/Buffer/
// process.env) — solo fetch e Web Crypto, eseguibili nel browser.
//
// Config: token letto da localStorage (mai incluso nel bundle), repo/
// branch/cartella corpus fissi per questo progetto (non sono segreti).

const GITHUB_API = "https://api.github.com";
const REPO = "Gregoee2002/ILA";
const BRANCH = "main";
const CORPUS_PATH = "corpus";
const TOKEN_STORAGE_KEY = "gh_pat";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function headers(): Record<string, string> {
  const token = getStoredToken();
  if (!token) throw new Error("Nessun GitHub token configurato");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

// Base64 encode UTF-8-safe senza Buffer (non disponibile nel browser).
export function utf8ToBase64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

// Decode inverso, UTF-8-safe — serve a leggere il campo "content" (base64)
// della Contents API. new TextDecoder gestisce correttamente i caratteri
// multi-byte (es. greco epigrafico), a differenza di un atob() ingenuo.
function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function repoPath(filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${CORPUS_PATH}/${safeName}`;
}

interface GitHubDirEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
  download_url: string | null;
}

// Cache in-memory dello sha di ogni file — necessaria per aggiornare
// (PUT con sha) invece di creare un file già esistente.
const shaCache = new Map<string, string>();

export async function listCorpusFiles(): Promise<GitHubDirEntry[]> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${CORPUS_PATH}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list fallita (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Percorso "${CORPUS_PATH}" sulla repo non è una cartella`);
  return (data as GitHubDirEntry[]).filter(e => e.type === "file" && e.name.endsWith(".xml") && !e.name.startsWith("_"));
}

/**
 * Scarica tutti gli XML del corpus dalla repo GitHub, popolando anche la
 * cache degli sha. Va chiamata all'avvio dello shim, prima di rispondere a
 * qualunque richiesta /api/*.
 *
 * NOTA: il contenuto va letto dalla Contents API (api.github.com), MAI da
 * entry.download_url (raw.githubusercontent.com) — quell'host rifiuta la
 * richiesta preflight CORS quando il browser aggiunge l'header
 * Authorization (verificato: risponde 403 all'OPTIONS, senza
 * Access-Control-Allow-Headers), quindi ogni fetch verrebbe bloccato dal
 * browser prima di partire. api.github.com invece gestisce Authorization
 * in CORS correttamente (stesso host già usato per liste/scritture).
 *
 * Le richieste partono in parallelo (pool a concorrenza limitata) invece
 * che una alla volta: con ~100 file in sequenza il caricamento iniziale
 * richiedeva decine di secondi. 8 in parallelo è un compromesso prudente —
 * abbastanza per abbattere il tempo totale senza rischiare la secondary
 * rate limit di GitHub sulle richieste concorrenti.
 */
const PULL_CONCURRENCY = 8;

export async function pullAllCorpusFiles(): Promise<Map<string, string>> {
  const entries = await listCorpusFiles();
  const result = new Map<string, string>();
  shaCache.clear();

  let next = 0;
  async function worker(): Promise<void> {
    while (next < entries.length) {
      const entry = entries[next++];
      try {
        const content = await fetchFileContent(entry.name);
        result.set(entry.name, content);
        shaCache.set(entry.name, entry.sha);
      } catch {
        // File saltato: resta assente dalla Map, l'editor lo tratterà come
        // non esistente finché un reload dello shim non riesce a scaricarlo.
      }
    }
  }

  const workers = Array.from({ length: Math.min(PULL_CONCURRENCY, entries.length) }, () => worker());
  await Promise.all(workers);
  return result;
}

async function fetchFileContent(filename: string): Promise<string> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${repoPath(filename)}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub get file fallita per ${filename} (${res.status})`);
  const data = await res.json();
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error(`Formato risposta inatteso per ${filename}`);
  }
  return base64ToUtf8(data.content);
}

async function fetchCurrentSha(filename: string): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${repoPath(filename)}?ref=${encodeURIComponent(BRANCH)}`;
  // La Contents API risponde con "Cache-Control: private, max-age=60": senza
  // no-store, il browser serve la stessa risposta cache per ~60s a ogni
  // richiesta identica — che è esattamente la finestra in cui pushCorpusFile
  // la richiama per rileggere lo sha dopo un 409. Risultato: tutti i retry
  // ricevevano lo stesso sha "vecchio" e fallivano di nuovo, sempre uguale.
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

/**
 * Crea o aggiorna un file XML del corpus sulla repo GitHub.
 *
 * La Contents API crea un commit per ogni PUT, che deve avanzare l'HEAD del
 * branch: con più scritture in corso in parallelo (vedi WRITE_CONCURRENCY in
 * apiShim.ts) più richieste possono leggere lo stesso HEAD di partenza e
 * "perdere" la corsa ad avanzarlo, anche scrivendo file diversi — GitHub
 * risponde 409/422 a chi arriva secondo. Non è un errore di sha del singolo
 * file (quello resterebbe valido), quindi un solo retry non basta quando la
 * concorrenza è > 1: si ritenta più volte, ogni volta con lo sha del branch
 * riletto fresco e un piccolo backoff per diradare le collisioni.
 */
const MAX_PUSH_ATTEMPTS = 6;

export async function pushCorpusFile(filename: string, content: string, message: string): Promise<void> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${repoPath(filename)}`;
  let sha = shaCache.get(filename) ?? null;

  for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt++) {
    if (sha === null) sha = await fetchCurrentSha(filename);
    const body: Record<string, unknown> = {
      message,
      content: utf8ToBase64(content),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      shaCache.set(filename, data.content.sha);
      return;
    }

    const detail = await res.text();
    const isRaceConflict = res.status === 409 || res.status === 422;
    if (isRaceConflict && attempt < MAX_PUSH_ATTEMPTS) {
      await new Promise(r => setTimeout(r, 150 * attempt + Math.random() * 200));
      sha = null; // forza a rileggere lo sha aggiornato al prossimo giro
      continue;
    }
    throw new Error(`Scrittura GitHub fallita per ${filename} (${res.status}) dopo ${attempt} tentativi: ${detail}`);
  }
}

/**
 * NON cancella mai il file su GitHub (no-op + solo warning in console).
 *
 * Stesso default di sicurezza di deleteFileFromGitHub in githubStorage.ts
 * (GITHUB_ALLOW_DELETE="false"): POST /api/monumenti cancella in locale
 * qualunque file non presente nel payload che il client sta salvando in
 * quel momento — innocuo quando l'unica copia è locale (recuperabile con
 * un reload), distruttivo se specchiato automaticamente sulla repo reale.
 * Uno stato React non aggiornato o parziale (es. dopo un errore di rete a
 * metà caricamento) potrebbe altrimenti cancellare schede vere dalla repo
 * senza conferma — qui non c'è nemmeno una env var da controllare per
 * riattivarlo di proposito, quindi resta sempre disattivo. Le cancellazioni
 * reali vanno fatte a mano su GitHub o dal flusso locale (server.ts).
 */
export async function deleteCorpusFile(filename: string, _message: string): Promise<void> {
  console.warn(
    `[githubStorageBrowser] Cancellazione di "${filename}" NON specchiata su GitHub ` +
    `(disattiva per sicurezza sulla build statica). Il file resta rimosso solo dalla vista ` +
    `locale di questa sessione — su GitHub è ancora presente.`
  );
}

// ── Segnalazioni (flags.json) ────────────────────────────────────────
// Stesso file di githubStorage.ts (repoPath fisso "flags.json" alla radice
// della repo, fuori da CORPUS_PATH), variante browser: vedi commento
// gemello lì per il perché di un file unico invece che uno per scheda.
const FLAGS_PATH = "flags.json";
let flagsSha: string | null = null;

export async function pullFlagsFile(): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${FLAGS_PATH}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) { flagsSha = null; return null; }
  if (!res.ok) throw new Error(`GitHub get flags.json fallita (${res.status}): ${await res.text()}`);
  const data = await res.json();
  flagsSha = data.sha || null;
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error("Formato risposta inatteso per flags.json");
  }
  return base64ToUtf8(data.content);
}

export async function pushFlagsFile(content: string, message: string): Promise<void> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${FLAGS_PATH}`;
  let sha = flagsSha;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const body: Record<string, unknown> = {
      message,
      content: utf8ToBase64(content),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      flagsSha = data.content.sha;
      return;
    }

    const detail = await res.text();
    const isRaceConflict = res.status === 409 || res.status === 422;
    if (isRaceConflict && attempt < 3) {
      await new Promise(r => setTimeout(r, 150 * attempt));
      const refreshedRes = await fetch(`${url}?ref=${encodeURIComponent(BRANCH)}`, { headers: headers(), cache: "no-store" });
      sha = refreshedRes.ok ? (await refreshedRes.json()).sha : null;
      continue;
    }
    throw new Error(`Scrittura GitHub fallita per flags.json (${res.status}) dopo ${attempt} tentativi: ${detail}`);
  }
}

export async function testGitHubAccess(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${REPO}`, { headers: headers() });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${await res.text()}` };
    const data = await res.json();
    return { ok: true, detail: `Repo raggiunta: ${data.full_name} (privata: ${data.private}), branch predefinito: ${data.default_branch}` };
  } catch (e: any) {
    return { ok: false, detail: e.message || String(e) };
  }
}
