// Genera public/corpus-snapshot.json a build time, per la build statica
// GitHub Pages (vedi apiShim.ts). Chi visita il sito con la sola password
// legge questo scatto statico (dati fermi all'ultimo deploy); chi sblocca
// l'editing con un proprio PAT personale legge/scrive invece live sulla
// repo dati (vedi unlockEditing in apiShim.ts).
//
// Se GITHUB_TOKEN e GITHUB_REPO sono impostati (secrets del workflow, vedi
// .github/workflows/deploy-pages.yml), lo scatto viene generato dal corpus
// LIVE sulla repo dati (Gregoee2002/ILA), sincronizzato qui prima di
// leggerlo — così ogni deploy riflette le modifiche fatte dall'editor,
// anche quelle fatte in "editor mode" sul sito statico stesso (che scrivono
// direttamente sulla repo dati, mai su questo checkout). Senza quei
// secret (build locale/dev), legge semplicemente src/data/corpus/ dal
// checkout — comportamento precedente, invariato.
import fs from "fs";
import path from "path";
import { isGitHubConfigured, pullCorpusFromGitHub } from "../src/lib/githubStorage";

const CORPUS_DIR = path.join(process.cwd(), "src", "data", "corpus");

function listCorpusFiles(): string[] {
  return fs
    .readdirSync(CORPUS_DIR)
    .filter(name => name.endsWith(".xml") && !name.startsWith("_"));
}

async function main() {
  if (isGitHubConfigured()) {
    console.log("GITHUB_TOKEN/GITHUB_REPO impostati: sincronizzo il corpus live prima dello scatto...");
    const { pulled, skipped } = await pullCorpusFromGitHub(
      CORPUS_DIR,
      (filepath, content) => fs.writeFileSync(filepath, content, "utf-8"),
      (...parts) => path.join(...parts),
      dir => fs.readdirSync(dir).filter(n => n.endsWith(".xml") && !n.startsWith("_")),
      filepath => fs.unlinkSync(filepath)
    );
    console.log(`Sync live completata: ${pulled} file scaricati${skipped.length ? `, ${skipped.length} saltati` : ""}.`);
  } else {
    console.log("GITHUB_TOKEN/GITHUB_REPO non impostati: uso src/data/corpus/ dal checkout così com'è.");
  }

  const entries = listCorpusFiles();
  console.log(`Trovati ${entries.length} file XML nel corpus.`);

  const files: Record<string, string> = {};
  for (const name of entries) {
    files[name] = fs.readFileSync(path.join(CORPUS_DIR, name), "utf-8");
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

main();
