/**
 * export-lares.ts — prepara una copia del corpus da consegnare alla redazione
 * LARES (o a chiunque non abbia la nostra tabella dei lemmi).
 *
 * Ogni <w> di funzione cultuale esce con `@type`/`@subtype`, il suo posto
 * nell'Analytical Toolbox, derivato dal @lemma. **I file del corpus non si
 * toccano**: la copia arricchita finisce in exports/lares/ (vedi la nota in
 * src/lib/cultToolboxExport.ts sul perché il percorso non si scrive nel corpus).
 *
 *   npx tsx scripts/export-lares.ts [cartella-sorgente] [cartella-destinazione]
 *
 * Senza argomenti: da src/data/corpus/ a exports/lares/.
 */

import fs from "fs";
import path from "path";
import { injectToolboxPaths, sommaStats, ToolboxInjectionStats } from "../src/lib/cultToolboxExport";

const root = process.cwd();
const sorgente = path.resolve(process.argv[2] || path.join(root, "src/data/corpus"));
const destinazione = path.resolve(process.argv[3] || path.join(root, "exports/lares"));

if (!fs.existsSync(sorgente)) {
  console.error(`Cartella sorgente inesistente: ${sorgente}`);
  process.exit(1);
}
fs.mkdirSync(destinazione, { recursive: true });

const files = fs.readdirSync(sorgente).filter(f => f.endsWith(".xml")).sort();
const stats: ToolboxInjectionStats[] = [];
let toccati = 0;

for (const f of files) {
  const originale = fs.readFileSync(path.join(sorgente, f), "utf8");
  const { xml, stats: s } = injectToolboxPaths(originale);
  fs.writeFileSync(path.join(destinazione, f), xml, "utf8");
  stats.push(s);
  if (s.injected > 0) toccati += 1;
}

const tot = sommaStats(stats);
const senza = tot.senzaPercorso.reduce((m: Record<string, number>, l) => ({ ...m, [l]: (m[l] || 0) + 1 }), {});

console.log(`${files.length} file letti da ${path.relative(root, sorgente)}/`);
console.log(`Copia arricchita in ${path.relative(root, destinazione)}/ — il corpus non è stato modificato.`);
console.log(`  percorso aggiunto: ${tot.injected} <w> in ${toccati} file`);
console.log(`  percorso già scritto a mano (lasciato intatto): ${tot.preserved}`);
console.log(`  senza percorso (esito legittimo): ${JSON.stringify(senza)}`);
console.log(`  <rs cultTerm/cultFormula> lasciati com'erano: ${tot.rsCultuali}`);
