// Script one-off riutilizzabile: pusha su ILA/drafts/ i file passati come
// argomenti (path relativi a src/data/corpus-drafts/), poi va cancellato.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { pushDraftFileToGitHub, isGitHubConfigured } from "../src/lib/githubStorage";

const DRAFTS_DIR = path.join(process.cwd(), "src", "data", "corpus-drafts");

async function main() {
  if (!isGitHubConfigured()) {
    console.error("GitHub non configurato. Interrotto.");
    process.exit(1);
  }
  const filenames = process.argv.slice(2);
  if (filenames.length === 0) {
    console.error("Nessun file passato come argomento.");
    process.exit(1);
  }
  console.log(`Push di ${filenames.length} draft su ILA/drafts/ ...`);
  let ok = 0;
  for (const filename of filenames) {
    const content = fs.readFileSync(path.join(DRAFTS_DIR, filename), "utf-8");
    try {
      await pushDraftFileToGitHub(filename, content, `chore: revisione assistita ${filename} (cross-check PDF Lane)`);
      ok++;
    } catch (e: any) {
      console.error(`ERRORE ${filename}: ${e.message || e}`);
    }
  }
  console.log(`Fatto. ${ok}/${filenames.length} pushati.`);
}

main();
