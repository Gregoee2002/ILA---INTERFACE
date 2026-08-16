// Genera public/corpus-snapshot.json a build time, per la build statica
// GitHub Pages (vedi apiShim.ts). Scarica il corpus dalla repo privata
// Gregoee2002/ILA usando CORPUS_READ_TOKEN — un PAT di sola lettura che
// vive SOLO come secret di GitHub Actions, mai esposto al browser. Chi
// visita il sito con solo la password legge questo scatto statico (dati
// fermi all'ultimo deploy); chi sblocca l'editing con un proprio PAT
// personale legge/scrive invece live sulla repo (vedi unlockEditing in
// apiShim.ts). Così la repo dati resta privata: nessun token reale né
// nessun dato raggiungibile dai soli visitatori con password finisce mai
// nel bundle pubblicato.
import fs from "fs";
import path from "path";

const GITHUB_API = "https://api.github.com";
const REPO = "Gregoee2002/ILA";
const BRANCH = "main";
const CORPUS_PATH = "corpus";
const CONCURRENCY = 8;

const token = process.env.CORPUS_READ_TOKEN;

interface GitHubDirEntry {
  name: string;
  type: "file" | "dir";
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ila-corpus-snapshot",
  };
}

async function listCorpusFiles(): Promise<GitHubDirEntry[]> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${CORPUS_PATH}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Lista corpus fallita (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Percorso "${CORPUS_PATH}" sulla repo non è una cartella`);
  return (data as GitHubDirEntry[]).filter(e => e.type === "file" && e.name.endsWith(".xml") && !e.name.startsWith("_"));
}

async function fetchFileContent(filename: string): Promise<string> {
  const url = `${GITHUB_API}/repos/${REPO}/contents/${CORPUS_PATH}/${filename}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GET fallita per ${filename} (${res.status})`);
  const data = await res.json();
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error(`Formato risposta inatteso per ${filename}`);
  }
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function main() {
  if (!token) {
    console.error("CORPUS_READ_TOKEN mancante — impostalo come secret Actions prima di lanciare il deploy.");
    process.exit(1);
  }

  const entries = await listCorpusFiles();
  console.log(`Trovati ${entries.length} file XML nel corpus.`);

  const files: Record<string, string> = {};
  const errors: string[] = [];
  let next = 0;

  async function worker() {
    while (next < entries.length) {
      const entry = entries[next++];
      try {
        files[entry.name] = await fetchFileContent(entry.name);
      } catch (e: any) {
        errors.push(`${entry.name}: ${e.message || e}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => worker()));

  if (errors.length > 0) {
    console.warn(`Attenzione: ${errors.length} file saltati:\n${errors.join("\n")}`);
  }

  const outDir = path.join(process.cwd(), "public");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "corpus-snapshot.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), files }),
    "utf-8"
  );
  console.log(`Snapshot generato: ${Object.keys(files).length} file → ${outPath}`);
}

main().catch(e => {
  console.error("Generazione snapshot fallita:", e);
  process.exit(1);
});
