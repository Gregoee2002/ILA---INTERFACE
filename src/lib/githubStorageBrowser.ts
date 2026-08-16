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
 */
export async function pullAllCorpusFiles(): Promise<Map<string, string>> {
  const entries = await listCorpusFiles();
  const result = new Map<string, string>();
  shaCache.clear();

  for (const entry of entries) {
    if (!entry.download_url) continue;
    try {
      const fileRes = await fetch(entry.download_url, {
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!fileRes.ok) continue;
      const content = await fileRes.text();
      result.set(entry.name, content);
      shaCache.set(entry.name, entry.sha);
    } catch {
      // File saltato: resta assente dalla Map, l'editor lo tratterà come
      // non esistente finché un reload dello shim non riesce a scaricarlo.
    }
  }
  return result;
}

async function fetchCurrentSha(filename: string): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${repoPath(filename)}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

/**
 * Crea o aggiorna un file XML del corpus sulla repo GitHub. Stessa logica
 * di retry-su-409 di githubStorage.ts.
 */
export async function pushCorpusFile(filename: string, content: string, message: string): Promise<void> {
  const body: Record<string, unknown> = {
    message,
    content: utf8ToBase64(content),
    branch: BRANCH,
  };
  const existingSha = shaCache.get(filename) || (await fetchCurrentSha(filename));
  if (existingSha) body.sha = existingSha;

  const url = `${GITHUB_API}/repos/${REPO}/contents/${repoPath(filename)}`;
  const res = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(body) });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 409) {
      const refreshed = await fetchCurrentSha(filename);
      if (refreshed) {
        shaCache.set(filename, refreshed);
        body.sha = refreshed;
        const retryRes = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          shaCache.set(filename, retryData.content.sha);
          return;
        }
      }
    }
    throw new Error(`Scrittura GitHub fallita per ${filename} (${res.status}): ${detail}`);
  }

  const data = await res.json();
  shaCache.set(filename, data.content.sha);
}

export async function deleteCorpusFile(filename: string, message: string): Promise<void> {
  const sha = shaCache.get(filename) || (await fetchCurrentSha(filename));
  if (!sha) return; // mai esistito su GitHub, niente da cancellare

  const url = `${GITHUB_API}/repos/${REPO}/contents/${repoPath(filename)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
  if (res.ok) shaCache.delete(filename);
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
