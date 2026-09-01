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
import { isGitHubConfigured, pullCorpusFromGitHub, pullLitSourcesFileFromGitHub } from "../src/lib/githubStorage";

const CORPUS_DIR = path.join(process.cwd(), "src", "data", "corpus");

function listCorpusFiles(): string[] {
  return fs
    .readdirSync(CORPUS_DIR)
    .filter(name => name.endsWith(".xml") && !name.startsWith("_"));
}

async function main() {
  fs.mkdirSync(CORPUS_DIR, { recursive: true });

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
    // Build locale / dev: nessuna rete. Lo scatto viene rigenerato dai file
    // XML presenti ORA in src/data/corpus/ — così `npm run build` in locale
    // non serve mai uno snapshot fermo a un commit precedente (vedi la
    // sezione "Drift corpus-snapshot.json" dell'audit 2026-09-01). In CI il
    // workflow imposta i secret e legge invece il corpus live dalla repo dati.
    console.log("GITHUB_TOKEN/GITHUB_REPO non impostati (build locale): rigenero lo scatto da src/data/corpus/ dal checkout, senza rete.");
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

  // ── Fonti letterarie ────────────────────────────────────────────────
  // Stessa logica del corpus: chi visita il sito con la sola password legge
  // uno scatto statico. Se sulla repo dati non c'è ancora nulla (nessuno ha
  // mai salvato dall'editor), non si scrive niente e la sezione resta al
  // seme compilato in src/data/fontiLetterarie.ts — che è il caso normale
  // al primo deploy, non un errore.
  const litOut = path.join(outDir, "fonti-letterarie.json");
  try {
    const lit = await pullLitSourcesFileFromGitHub();
    if (lit) {
      JSON.parse(lit); // uno scatto illeggibile è peggio di nessuno scatto
      fs.writeFileSync(litOut, lit, "utf-8");
      console.log(`Fonti letterarie: scatto aggiornato → ${litOut}`);
    } else {
      if (fs.existsSync(litOut)) fs.unlinkSync(litOut);
      console.log("Fonti letterarie: nessun archivio sulla repo dati, si usa il seme compilato.");
    }
  } catch (e: any) {
    if (fs.existsSync(litOut)) fs.unlinkSync(litOut);
    console.warn(`Fonti letterarie: scatto non generato (${e.message || e}); si usa il seme compilato.`);
  }
}

main();
