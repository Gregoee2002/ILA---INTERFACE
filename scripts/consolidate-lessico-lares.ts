// consolidate-lessico-lares.ts — ripiega le voci NUOVE dell'overlay
// (lessico-lares-overlay.json) dentro i file seed (cultLexicon.ts,
// laresToolbox.ts), append-only: non tocca né riscrive righe esistenti.
//
// Le CORREZIONI a un id già nel seed (label, famiglia, percorso di un lemma
// che esisteva già, …) non si toccano automaticamente — restano nell'overlay
// e vanno riportate a mano nel file, per non rischiare di rompere il commento
// o la formattazione di una riga esistente. Lo stesso vale per i nodi nuovi
// del toolbox (struttura ad albero, inserimento automatico non sicuro).
//
// Uso:
//   npx tsx scripts/consolidate-lessico-lares.ts            (report, nessuna scrittura)
//   npx tsx scripts/consolidate-lessico-lares.ts --apply     (scrive i file + riduce l'overlay)
import fs from "fs";
import path from "path";
import {
  isGitHubConfigured, pullLessicoLaresFileFromGitHub, pushLessicoLaresFileToGitHub,
} from "../src/lib/githubStorage";
import { validateOverlay, LessicoLaresOverlay, EMPTY_OVERLAY } from "../src/lib/lessicoLaresOverlay";

const LIB_DIR = path.join(process.cwd(), "src", "lib");
const CULT_LEXICON_FILE = path.join(LIB_DIR, "cultLexicon.ts");
const LOCAL_OVERLAY_FILE = path.join(process.cwd(), "src", "data", "lessico-lares-overlay.json");

async function loadOverlay(): Promise<LessicoLaresOverlay> {
  if (isGitHubConfigured()) {
    const raw = await pullLessicoLaresFileFromGitHub();
    if (raw) return JSON.parse(raw);
  }
  if (fs.existsSync(LOCAL_OVERLAY_FILE)) return JSON.parse(fs.readFileSync(LOCAL_OVERLAY_FILE, "utf-8"));
  return EMPTY_OVERLAY;
}

/** Inserisce `block` appena prima della riga di chiusura di un array (`];`) o oggetto (`};`) esportato. */
function insertBeforeClosing(content: string, exportName: string, closer: "];" | "};", block: string): string {
  const re = new RegExp(`(export const ${exportName}\\b[^=]*=\\s*[\\[{])([\\s\\S]*?)(\\n${closer.replace(/[[\]{}]/g, c => "\\" + c)})`);
  const m = content.match(re);
  if (!m) throw new Error(`Blocco "${exportName}" non trovato o formato inatteso.`);
  return content.replace(re, `$1$2\n${block}$3`);
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

async function main() {
  const apply = process.argv.includes("--apply");
  const overlay = await loadOverlay();
  const errs = validateOverlay(overlay);
  if (errs.length > 0) {
    console.error("Overlay incoerente, consolidamento annullato:");
    errs.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  const nuoveFamiglie = (overlay.famiglie || []).filter(f => f._new && !f.deprecated);
  const nuoviLemmi = (overlay.lemmi || []).filter(l => l._new && !l.deprecated);
  const nuoviNodi = (overlay.toolbox || []).filter(t => t._new && !t.deprecated);
  const correzioni = [
    ...(overlay.famiglie || []).filter(f => !f._new).map(f => `famiglia "${f.id}": ${JSON.stringify(f)}`),
    ...(overlay.lemmi || []).filter(l => !l._new).map(l => `lemma "${l.lemma}": ${JSON.stringify(l)}`),
    ...(overlay.toolbox || []).filter(t => !t._new).map(t => `nodo "${t.path}": ${JSON.stringify(t)}`),
    ...(overlay.sottofunzioni || []).map(s => `sotto-funzione "${s.id}": ${JSON.stringify(s)}`),
  ];

  console.log(`Voci nuove ripiegabili: ${nuoveFamiglie.length} famiglie, ${nuoviLemmi.length} lemmi, ${nuoviNodi.length} nodi toolbox.`);
  if (correzioni.length > 0) {
    console.log(`\nCorrezioni a voci del seed (restano nell'overlay, da applicare a mano):`);
    correzioni.forEach(c => console.log(`  - ${c}`));
  }
  if (nuoviNodi.length > 0) {
    console.log(`\nNodi toolbox nuovi (da innestare a mano in laresToolbox.ts):`);
    for (const n of nuoviNodi) console.log(`  - ${n.path}: label="${n.label}" en="${n.en || ""}" fonte=${n.fonte}${n.esempi ? ` esempi="${n.esempi}"` : ""}`);
  }

  if (nuoveFamiglie.length === 0 && nuoviLemmi.length === 0) {
    console.log("\nNessuna famiglia o lemma nuovo da scrivere in cultLexicon.ts.");
    if (!apply) return;
  }

  let src = fs.readFileSync(CULT_LEXICON_FILE, "utf-8");
  const oggi = new Date().toISOString().slice(0, 10);

  if (nuoveFamiglie.length > 0) {
    const block = nuoveFamiglie.map(f =>
      `  { id: "${esc(f.id)}", label: "${esc(f.label || f.id)}", rule: "${esc(f.rule || "")}" }, // overlay → seed, ${oggi}`
    ).join("\n");
    src = insertBeforeClosing(src, "CULT_FAMILIES", "];", block);
  }

  if (nuoviLemmi.length > 0) {
    const block = [
      `  // ── consolidato dall'overlay, ${oggi} ──`,
      ...nuoviLemmi.map(l => {
        const ref = l.lemmaRef ? `, lemmaRef: "${esc(l.lemmaRef)}"` : "";
        const manual = l.manual ? `, manual: true` : "";
        return `  { lemma: "${esc(l.lemma)}", family: "${esc(l.family || "")}", subFunction: "${esc(l.subFunction || "")}"${ref}${manual} },`;
      }),
    ].join("\n");
    src = insertBeforeClosing(src, "CULT_LEXICON", "];", block);

    const conPercorso = nuoviLemmi.filter(l => l.percorso);
    if (conPercorso.length > 0) {
      const tbBlock = conPercorso.map(l =>
        `  "${esc(l.lemma)}": { item: "${esc(l.percorso!.item)}", subtype: [${l.percorso!.subtype.map(s => `"${esc(s)}"`).join(", ")}] },`
      ).join("\n");
      src = insertBeforeClosing(src, "LEMMA_TOOLBOX", "};", tbBlock);
    }
  }

  if (!apply) {
    console.log("\n(report: nessun file scritto — rilancia con --apply per scrivere cultLexicon.ts e ridurre l'overlay)");
    return;
  }

  if (nuoveFamiglie.length > 0 || nuoviLemmi.length > 0) {
    fs.writeFileSync(CULT_LEXICON_FILE, src, "utf-8");
    console.log(`\nScritto ${CULT_LEXICON_FILE}.`);
  }

  // Quel che resta nell'overlay: le correzioni (mai _new) e i nodi toolbox
  // nuovi (non ripiegati automaticamente). Le famiglie/lemmi appena scritti
  // nel seed escono dall'overlay.
  const restante: LessicoLaresOverlay = {
    version: 1,
    updatedAt: new Date().toISOString(),
    famiglie: (overlay.famiglie || []).filter(f => !f._new),
    sottofunzioni: overlay.sottofunzioni || [],
    lemmi: (overlay.lemmi || []).filter(l => !l._new),
    toolbox: overlay.toolbox || [],
    concettuali: overlay.concettuali || { defaultPerFamiglia: {} },
  };

  if (isGitHubConfigured()) {
    await pushLessicoLaresFileToGitHub(
      JSON.stringify(restante, null, 2),
      `Consolidamento vocabolario: +${nuoveFamiglie.length} famiglie, +${nuoviLemmi.length} lemmi nel seed`,
    );
    console.log("Overlay ridotto pubblicato sulla repo dati.");
  } else {
    fs.mkdirSync(path.dirname(LOCAL_OVERLAY_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_OVERLAY_FILE, JSON.stringify(restante, null, 2), "utf-8");
    console.log(`Overlay ridotto salvato in locale: ${LOCAL_OVERLAY_FILE} (nessun GITHUB_TOKEN — push manuale).`);
  }
  console.log("Rilancia `npm test` e rivedi cultLexicon.ts a mano prima di committare.");
}

main().catch(e => { console.error(e); process.exit(1); });
