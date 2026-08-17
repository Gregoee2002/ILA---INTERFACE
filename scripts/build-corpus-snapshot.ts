// Genera public/corpus-snapshot.json a build time, per la build statica
// GitHub Pages (vedi apiShim.ts). Legge il corpus direttamente dal checkout
// locale in src/data/corpus/ — che è la fonte di verità del progetto (vedi
// README.md) — invece di rifare una chiamata API verso un repo esterno.
// Chi visita il sito con la sola password legge questo scatto statico (dati
// fermi all'ultimo deploy); chi sblocca l'editing con un proprio PAT
// personale legge/scrive invece live sulla repo (vedi unlockEditing in
// apiShim.ts).
import fs from "fs";
import path from "path";

const CORPUS_DIR = path.join(process.cwd(), "src", "data", "corpus");

function listCorpusFiles(): string[] {
  return fs
    .readdirSync(CORPUS_DIR)
    .filter(name => name.endsWith(".xml") && !name.startsWith("_"));
}

function main() {
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
