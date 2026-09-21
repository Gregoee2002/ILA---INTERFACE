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
import { isGitHubConfigured, pullCorpusFromGitHub, pullLitSourcesFileFromGitHub, pullLessicoLaresFileFromGitHub } from "../src/lib/githubStorage";
import { validateOverlay } from "../src/lib/lessicoLaresOverlay";
import { etichettaSezione, sezioneDaNomeFile, sezionePubblica } from "../src/lib/sezioni";

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

  // Le sezioni non ancora pubblicate (lib/sezioni.ts) restano fuori dallo
  // scatto: il sito statico non le serve affatto a chi ha la sola password,
  // non si limita a non mostrarle. Chi sblocca l'editing con il proprio PAT
  // legge il corpus live dalla repo dati e le vede tutte.
  const files: Record<string, string> = {};
  const esclusi = new Map<string, number>();
  for (const name of entries) {
    const sezione = sezioneDaNomeFile(name);
    if (!sezionePubblica(sezione)) {
      esclusi.set(sezione, (esclusi.get(sezione) ?? 0) + 1);
      continue;
    }
    files[name] = fs.readFileSync(path.join(CORPUS_DIR, name), "utf-8");
  }
  for (const [sezione, quante] of esclusi) {
    console.log(`Fuori dallo scatto: ${quante} schede della sezione ${etichettaSezione(sezione as any)} (in redazione, non ancora pubblica).`);
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

  // ── Overlay lessico cultuale / LARES ──────────────────────────────────
  // Stessa logica: nessun overlay sulla repo dati non è un errore, la vista
  // resta sul solo seed compilato (cultLexicon.ts / laresToolbox.ts). Un
  // overlay incoerente (fallisce validateOverlay) non va in produzione: si
  // scarta e si tiene lo scatto precedente/il seed, con un avviso in build.
  const vocabOut = path.join(outDir, "lessico-lares-overlay.json");
  try {
    const raw = await pullLessicoLaresFileFromGitHub();
    if (raw) {
      const overlay = JSON.parse(raw);
      const errs = validateOverlay(overlay);
      if (errs.length > 0) {
        console.warn(`Vocabolario lessico/LARES: overlay incoerente, scatto NON aggiornato:\n  - ${errs.join("\n  - ")}`);
      } else {
        fs.writeFileSync(vocabOut, JSON.stringify(overlay, null, 2), "utf-8");
        console.log(`Vocabolario lessico/LARES: scatto aggiornato → ${vocabOut}`);
      }
    } else {
      if (fs.existsSync(vocabOut)) fs.unlinkSync(vocabOut);
      console.log("Vocabolario lessico/LARES: nessun overlay sulla repo dati, si usa il seed compilato.");
    }
  } catch (e: any) {
    console.warn(`Vocabolario lessico/LARES: scatto non generato (${e.message || e}); si usa il seed compilato.`);
  }
}

main();
