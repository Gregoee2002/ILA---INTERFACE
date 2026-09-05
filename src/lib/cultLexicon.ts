/**
 * cultLexicon.ts — ILA / Index Lunae Antiquae
 * ------------------------------------------------------------------
 * Tabella del lessico delle funzioni cultuali (tassonomia cult-functions).
 * Porta in codice la §5 di `docs/tassonomia-funzioni-cultuali.md` (v2) e
 * l'insieme unico `lemma → famiglia, sotto-funzione` ricavato da
 * `docs/spoglio-lessico-cultuale.csv` (v2 — 56 lemmi).
 *
 * Nel markup dell'edizione l'editor sceglie solo `@lemma` + `@ana="#famiglia"`
 * (una domanda: «chi è il soggetto dell'azione, il dio o l'uomo?»); la
 * sotto-funzione fine NON è una decisione editoriale, si ricava di qui dal
 * `@lemma`. Vedi il doc per la norma completa.
 *
 * Il merge coi marcatori LARES (docs/merge-lessico-lares.md) sta in fondo:
 * `LEMMA_TOOLBOX` porta ogni lemma sul suo percorso della griglia LARES. È una
 * tabella a parte, non una colonna di `CULT_LEXICON`, perché è un asse diverso —
 * la famiglia dice chi è il soggetto, il percorso che cosa è la cosa nominata —
 * e perché così si legge accanto alla §3 del documento.
 *
 * Dipende solo da laresToolbox.ts (dati, nessuna dipendenza a sua volta).
 * ------------------------------------------------------------------
 */

import { ToolboxMarker, validateToolboxPath } from "./laresToolbox";

export type CultFamily =
  | "agency"
  | "atto-cultuale"
  | "colpa"
  | "formula-fissa"
  | "ruolo-istituzione";

export interface CultLemma {
  /** forma di citazione greca (dizionario): 1ª sing. pres. per i verbi, nom. sing. per i nomi. */
  lemma: string;
  family: CultFamily;
  /** sotto-funzione fine, deterministica dal lemma (es. "castigo-divino", "voto"). */
  subFunction: string;
  /** pagina Logeion (LSJ); assente per i lemmi tecnici/formulari senza voce di dizionario. */
  lemmaRef?: string;
  /** true quando l'attestazione va decisa a mano (metafora poetica, datazione eponimica). */
  manual?: boolean;
}

export interface CultFamilyInfo {
  id: CultFamily;
  label: string;
  /** la regola operativa per l'editor: come si riconosce questa famiglia. */
  rule: string;
}

/** Le 5 famiglie funzionali (§3 del doc). L'ordine è quello del doc. */
export const CULT_FAMILIES: CultFamilyInfo[] = [
  {
    id: "agency",
    label: "Agency — il dio come soggetto agente",
    rule: "Il soggetto dell'azione è il dio: titolarità del luogo, potenza (dynamis), castigo, ascolto, comando, scelta, disposizione favorevole.",
  },
  {
    id: "atto-cultuale",
    label: "Atto cultuale — l'uomo compie o registra un atto",
    rule: "Il soggetto è l'uomo e compie/registra un atto rituale o giuridico-sacro: dedica, voto, confessione, riscatto, propiziazione, norma santuariale (lex sacra), onori decretati.",
  },
  {
    id: "colpa",
    label: "Colpa — la trasgressione umana",
    rule: "Il soggetto è l'uomo e la parola nomina la sua trasgressione (peccato, spergiuro, empietà) — non il castigo, che sta in #agency.",
  },
  {
    id: "formula-fissa",
    label: "Formula fissa — genere senza testa lessicale autonoma",
    rule: "Parola che esiste solo dentro una formula di genere e fuori da essa non significa nulla di analizzabile: saluto funerario, acclamazione, formula di pioggia, imprecazione a tutela.",
  },
  {
    id: "ruolo-istituzione",
    label: "Ruolo / istituzione — ruoli, istituzioni, status personale",
    rule: "La parola nomina un ruolo, un'istituzione o uno status personale: sacerdozio/carica, associazione, comunità, status (allevato in casa, serva giovane, devoto).",
  },
];

export const CULT_FAMILY_IDS: CultFamily[] = CULT_FAMILIES.map(f => f.id);

const LOGEION = "https://logeion.uchicago.edu/";

/**
 * I 56 lemmi controllati. `family`/`subFunction` dallo spoglio v2 (insieme unico
 * per lemma); `lemmaRef` dalla tabella §5 del doc (alcuni puntano a un lemma di
 * dizionario diverso dalla forma di citazione usata qui — es. κεχολωμένος→χολόω,
 * φράτρα→φρήτρη — e sono riportati alla lettera).
 */
export const CULT_LEXICON: CultLemma[] = [
  // ── agency ──────────────────────────────────────────────────────────
  { lemma: "αἱρετίζω", family: "agency", subFunction: "scelta", lemmaRef: LOGEION + "αἱρετίζω" },
  { lemma: "βασιλεύω", family: "agency", subFunction: "signoria-territoriale", lemmaRef: LOGEION + "βασιλεύω" },
  { lemma: "δύναμις", family: "agency", subFunction: "dynamis", lemmaRef: LOGEION + "δύναμις" },
  { lemma: "εὐίλατος", family: "agency", subFunction: "disposizione-favorevole", lemmaRef: LOGEION + "εὐίλατος" },
  { lemma: "κατέχω", family: "agency", subFunction: "signoria-territoriale", lemmaRef: LOGEION + "κατέχω" },
  { lemma: "κολάζω", family: "agency", subFunction: "castigo-divino", lemmaRef: LOGEION + "κολάζω" },
  { lemma: "νεμεσάω", family: "agency", subFunction: "castigo-divino", lemmaRef: LOGEION + "νεμεσάω" },
  { lemma: "χρηματισμός", family: "agency", subFunction: "comando", lemmaRef: LOGEION + "χρηματισμός" },
  { lemma: "ἐπήκοος", family: "agency", subFunction: "ascolto", lemmaRef: LOGEION + "ἐπήκοος" },
  { lemma: "ἐπιταγή", family: "agency", subFunction: "comando", lemmaRef: LOGEION + "ἐπιταγή" },
  { lemma: "ἐπιφανής", family: "agency", subFunction: "manifestazione", lemmaRef: LOGEION + "ἐπιφανής" },

  // ── atto-cultuale ───────────────────────────────────────────────────
  { lemma: "εὐλογέω", family: "atto-cultuale", subFunction: "propiziazione", lemmaRef: LOGEION + "εὐλογέω" },
  { lemma: "εὐχή", family: "atto-cultuale", subFunction: "voto", lemmaRef: LOGEION + "εὐχή" },
  { lemma: "εὐχαριστέω", family: "atto-cultuale", subFunction: "propiziazione", lemmaRef: LOGEION + "εὐχαριστέω" },
  { lemma: "εὐχαριστία", family: "atto-cultuale", subFunction: "propiziazione", lemmaRef: LOGEION + "εὐχαριστία" },
  { lemma: "εὔχομαι", family: "atto-cultuale", subFunction: "voto", lemmaRef: LOGEION + "εὔχομαι" },
  { lemma: "καθαρίζω", family: "atto-cultuale", subFunction: "norma-santuariale", lemmaRef: LOGEION + "καθαρίζω" },
  { lemma: "καθιδρύω", family: "atto-cultuale", subFunction: "consacrazione", lemmaRef: LOGEION + "καθιδρύω" },
  { lemma: "καθιερόω", family: "atto-cultuale", subFunction: "consacrazione", lemmaRef: LOGEION + "καθιερόω" },
  { lemma: "λυτρόω", family: "atto-cultuale", subFunction: "riscatto", lemmaRef: LOGEION + "λυτρόω" },
  { lemma: "λύτρον", family: "atto-cultuale", subFunction: "riscatto", lemmaRef: LOGEION + "λύτρον" },
  { lemma: "μαρτυρέω", family: "atto-cultuale", subFunction: "registrazione-su-stele", lemmaRef: LOGEION + "μαρτυρέω" },
  { lemma: "ναός", family: "atto-cultuale", subFunction: "costruzione", lemmaRef: LOGEION + "ναός" },
  { lemma: "σέβω", family: "atto-cultuale", subFunction: "propiziazione", lemmaRef: LOGEION + "σέβω" },
  { lemma: "στέφανος", family: "atto-cultuale", subFunction: "onori-decretati", lemmaRef: LOGEION + "στέφανος" },
  { lemma: "στηλογραφέω", family: "atto-cultuale", subFunction: "registrazione-su-stele", lemmaRef: LOGEION + "στηλογραφέω" },
  { lemma: "τεκμωρεύω", family: "atto-cultuale", subFunction: "tekmor" },
  { lemma: "ἀκάθαρτος", family: "atto-cultuale", subFunction: "norma-santuariale", lemmaRef: LOGEION + "ἀκάθαρτος" },
  { lemma: "ἀνίστημι", family: "atto-cultuale", subFunction: "dedica", lemmaRef: LOGEION + "ἀνίστημι" },
  { lemma: "ἀνατίθημι", family: "atto-cultuale", subFunction: "dedica", lemmaRef: LOGEION + "ἀνατίθημι" },
  { lemma: "ἄσυλος", family: "atto-cultuale", subFunction: "norma-santuariale", lemmaRef: LOGEION + "ἄσυλος" },
  { lemma: "ἐξειλάσκομαι", family: "atto-cultuale", subFunction: "propiziazione", lemmaRef: LOGEION + "ἐξιλάσκομαι" },
  { lemma: "ἐξομολογέομαι", family: "atto-cultuale", subFunction: "confessione-verbale", lemmaRef: LOGEION + "ἐξομολογέομαι" },
  { lemma: "ὁμολογέω", family: "atto-cultuale", subFunction: "confessione-verbale", lemmaRef: LOGEION + "ὁμολογέω" },

  // ── colpa ───────────────────────────────────────────────────────────
  { lemma: "ἁμαρτάνω", family: "colpa", subFunction: "peccato-generico", lemmaRef: LOGEION + "ἁμαρτάνω" },
  { lemma: "ἐπιορκέω", family: "colpa", subFunction: "spergiuro", lemmaRef: LOGEION + "ἐπιορκέω" },

  // ── formula-fissa ───────────────────────────────────────────────────
  { lemma: "κεχολωμένος", family: "formula-fissa", subFunction: "imprecazione", lemmaRef: LOGEION + "χολόω" },
  { lemma: "σκῆπτρον", family: "formula-fissa", subFunction: "imprecazione", lemmaRef: LOGEION + "σκῆπτρον" },
  { lemma: "χαίρω", family: "formula-fissa", subFunction: "acclamazione", lemmaRef: LOGEION + "χαίρω" },
  { lemma: "χρηστὸς χαῖρε", family: "formula-fissa", subFunction: "saluto-funerario" },
  { lemma: "ἐπεξορκίζω", family: "formula-fissa", subFunction: "imprecazione", lemmaRef: LOGEION + "ἐπεξορκίζω" },
  // Aggiunti il 2026-09-05: già marcati #formula-fissa nel corpus (ILA-136, ILA-144)
  // ma mancanti dal vocabolario controllato. Stessa sotto-funzione di ἐπεξορκίζω.
  { lemma: "ὁρκίζω", family: "formula-fissa", subFunction: "imprecazione", lemmaRef: LOGEION + "ὁρκίζω" },
  { lemma: "ἐνορκίζω", family: "formula-fissa", subFunction: "imprecazione", lemmaRef: LOGEION + "ἐνορκίζω" },
  { lemma: "ὗε κύε", family: "formula-fissa", subFunction: "formula-pioggia" },

  // ── ruolo-istituzione ───────────────────────────────────────────────
  { lemma: "-ιασταί", family: "ruolo-istituzione", subFunction: "associazione" },
  { lemma: "θρέμμα", family: "ruolo-istituzione", subFunction: "status-allevato", lemmaRef: LOGEION + "θρέμμα" },
  { lemma: "θρεπτός", family: "ruolo-istituzione", subFunction: "status-allevato", lemmaRef: LOGEION + "θρεπτός" },
  { lemma: "κατοικία", family: "ruolo-istituzione", subFunction: "comunita", lemmaRef: LOGEION + "κατοικία" },
  { lemma: "στολιστής", family: "ruolo-istituzione", subFunction: "sacerdozio", lemmaRef: LOGEION + "στολιστής" },
  { lemma: "συνβολαφόρος", family: "ruolo-istituzione", subFunction: "associazione", lemmaRef: LOGEION + "συμβολοφόρος" },
  { lemma: "σύνοδος", family: "ruolo-istituzione", subFunction: "associazione", lemmaRef: LOGEION + "σύνοδος" },
  { lemma: "τρέφω", family: "ruolo-istituzione", subFunction: "status-allevato", lemmaRef: LOGEION + "τρέφω", manual: true },
  { lemma: "φράτρα", family: "ruolo-istituzione", subFunction: "associazione", lemmaRef: LOGEION + "φρήτρη" },
  { lemma: "ἀρχιερεύς", family: "ruolo-istituzione", subFunction: "sacerdozio", lemmaRef: LOGEION + "ἀρχιερεύς" },
  { lemma: "ἱερατεύω", family: "ruolo-istituzione", subFunction: "sacerdozio", lemmaRef: LOGEION + "ἱερατεύω" },
  { lemma: "ἱερεύς", family: "ruolo-istituzione", subFunction: "sacerdozio", lemmaRef: LOGEION + "ἱερεύς" },
];

/** I 56 lemmi come lista piatta di stringhe (per datalist e option). */
export const CULT_LEMMATA: string[] = CULT_LEXICON.map(l => l.lemma);

const BY_LEMMA: Map<string, CultLemma> = new Map(CULT_LEXICON.map(l => [l.lemma, l]));

/** Lookup esatto sulla forma di citazione. */
export function lookupCultLemma(lemma: string): CultLemma | undefined {
  return BY_LEMMA.get((lemma || "").trim());
}

/**
 * URL Logeion per un lemma: quello in tabella se noto, altrimenti costruito
 * (`https://logeion.uchicago.edu/<lemma>`). Restituisce undefined per i lemmi
 * non-parola (`-ιασταί`, `ὗε κύε`, `χρηστὸς χαῖρε`).
 */
export function lemmaRefFor(lemma: string): string | undefined {
  const clean = (lemma || "").trim();
  if (!clean) return undefined;
  const known = BY_LEMMA.get(clean);
  if (known) return known.lemmaRef;
  // fallback: solo se sembra una singola parola greca (niente spazi, niente
  // trattino iniziale da suffissoide come "-ιασταί")
  if (/\s/.test(clean) || clean.startsWith("-")) return undefined;
  return LOGEION + clean;
}

/** Diacritici/maiuscole/sigma finale via, per il match tollerante delle forme flesse. */
export function foldGreek(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ̓̔ͅ]/g, "")
    .replace(/᾽|ʼ|`|´|΄/g, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .replace(/[.,·;:]+$/g, "")
    .trim();
}

/**
 * Best-effort: dalla forma attestata selezionata nel testo prova a indovinare
 * il lemma controllato. Match esatto (senza accenti), poi per radice comune —
 * copre i nomi (εὐχήν→εὐχή, θρεπτοῦ→θρεπτός, κατοικίας→κατοικία); le forme
 * verbali molto rifatte (ἀνέθηκεν→ἀνατίθημι) non si agganciano ed è previsto.
 */
export function matchCultLemma(form: string): CultLemma | undefined {
  const f = foldGreek(form);
  if (!f) return undefined;
  const exact = CULT_LEXICON.find(l => foldGreek(l.lemma) === f);
  if (exact) return exact;
  // radice comune: prefisso condiviso fra forma e lemma abbastanza lungo da
  // escludere il lemma tranne 1-2 lettere di desinenza (εὐχήν↔εὐχή,
  // θρεπτοῦ↔θρεπτός). I verbi molto rifatti (ἀνέθηκεν↔ἀνατίθημι) restano fuori.
  let best: CultLemma | undefined;
  let bestLen = 0;
  for (const l of CULT_LEXICON) {
    const lf = foldGreek(l.lemma);
    if (lf.includes(" ") || lf.startsWith("-") || lf.length < 4) continue;
    let shared = 0;
    while (shared < lf.length && shared < f.length && lf[shared] === f[shared]) shared++;
    if (shared >= 3 && shared >= lf.length - 2 && shared > bestLen) {
      best = l;
      bestLen = shared;
    }
  }
  return best;
}

/* ================================================================ */
/* Merge coi marcatori LARES — docs/merge-lessico-lares.md §3        */
/* ================================================================ */

/**
 * `lemma → percorso dell'Analytical Toolbox`. Si legge come la tabella
 * `lemma → sotto-funzione`: **non è una scelta editoriale**, è una proprietà del
 * lemma, e la scrive il codice. L'editor risponde a una domanda sola («il
 * soggetto è il dio o l'uomo?») e continua a scegliere solo `@lemma` + `@ana`.
 *
 * I lemmi assenti da questa tabella **non hanno percorso**, ed è un esito
 * legittimo: χαίρω e χρηστὸς χαῖρε non nominano un agente, un'attività o uno
 * spazio, e metterli sotto `prayers` sarebbe un dato falso (§5 del documento).
 */
export const LEMMA_TOOLBOX: Record<string, ToolboxMarker> = {
  // ── agency → il dio come agente ─────────────────────────────────────
  "δύναμις": { item: "superhuman-agents", subtype: ["divinities", "power"] },
  "αἱρετίζω": { item: "superhuman-agents", subtype: ["divinities", "election"] },
  "χρηματισμός": { item: "superhuman-agents", subtype: ["divinities", "injunction"] },
  "ἐπιταγή": { item: "superhuman-agents", subtype: ["divinities", "injunction"] },
  "βασιλεύω": { item: "superhuman-agents", subtype: ["divinities", "territorial-lordship"] },
  "κατέχω": { item: "superhuman-agents", subtype: ["divinities", "territorial-lordship"] },
  "κολάζω": { item: "superhuman-agents", subtype: ["divinities", "legal-action"] },
  "νεμεσάω": { item: "superhuman-agents", subtype: ["divinities", "legal-action"] },
  // Un aggettivo che nel testo funziona da epiclesi va in `epithets`, non nel
  // ramo della sua funzione: così continua ad alimentare l'indice degli epiteti
  // invece di sparpagliare gli stessi aggettivi su tre rami.
  "ἐπήκοος": { item: "superhuman-agents", subtype: ["divinities", "epithets"] },
  "εὐίλατος": { item: "superhuman-agents", subtype: ["divinities", "epithets"] },
  "ἐπιφανής": { item: "superhuman-agents", subtype: ["divinities", "epithets"] },

  // ── atto-cultuale → l'atto, la norma, la cosa ───────────────────────
  "εὐχή": { item: "activities", subtype: ["prayers", "vow"] },
  "εὔχομαι": { item: "activities", subtype: ["prayers", "vow"] },
  "εὐχαριστέω": { item: "activities", subtype: ["prayers", "thanksgiving"] },
  "εὐχαριστία": { item: "activities", subtype: ["prayers", "thanksgiving"] },
  "εὐλογέω": { item: "activities", subtype: ["prayers", "thanksgiving"] },
  "σέβω": { item: "activities", subtype: ["prayers", "veneration"] },
  "ἀνατίθημι": { item: "activities", subtype: ["offering", "dedication"] },
  "ἀνίστημι": { item: "activities", subtype: ["offering", "dedication"] },
  "καθιερόω": { item: "activities", subtype: ["offering", "consecration"] },
  "καθιδρύω": { item: "activities", subtype: ["offering", "consecration"] },
  "ἐξειλάσκομαι": { item: "activities", subtype: ["expiation", "propitiation"] },
  "ἐξομολογέομαι": { item: "activities", subtype: ["expiation", "confession"] },
  "ὁμολογέω": { item: "activities", subtype: ["expiation", "confession"] },
  "λύτρον": { item: "activities", subtype: ["expiation", "ransom"] },
  "λυτρόω": { item: "activities", subtype: ["expiation", "ransom"] },
  // καθαρίζω è l'atto, ἀκάθαρτος la norma: stessa sotto-funzione ILA
  // (norma-santuariale), rami diversi. È il guadagno del doppio asse.
  "καθαρίζω": { item: "activities", subtype: ["expiation", "purification"] },
  "ἀκάθαρτος": { item: "institutions", subtype: ["religious-practices", "purity-rule"] },
  "ἄσυλος": { item: "institutions", subtype: ["religious-practices", "law"] },
  "μαρτυρέω": { item: "institutions", subtype: ["religious-practices", "record"] },
  "στηλογραφέω": { item: "institutions", subtype: ["religious-practices", "record"] },
  "τεκμωρεύω": { item: "institutions", subtype: ["religious-practices", "administration"] },
  "στέφανος": { item: "institutions", subtype: ["civic-customs", "honours"] },
  // La parola nomina l'edificio, anche se la famiglia guarda a chi lo costruisce.
  "ναός": { item: "spaces", subtype: ["constructions", "public"] },

  // ── colpa ───────────────────────────────────────────────────────────
  "ἁμαρτάνω": { item: "activities", subtype: ["transgression", "sin"] },
  "ἐπιορκέω": { item: "activities", subtype: ["transgression", "perjury"] },

  // ── formula-fissa (χαίρω e χρηστὸς χαῖρε restano senza percorso) ─────
  "ἐπεξορκίζω": { item: "activities", subtype: ["prayers", "imprecation"] },
  "ὁρκίζω": { item: "activities", subtype: ["prayers", "imprecation"] },
  "ἐνορκίζω": { item: "activities", subtype: ["prayers", "imprecation"] },
  "κεχολωμένος": { item: "activities", subtype: ["prayers", "imprecation"] },
  "ὗε κύε": { item: "activities", subtype: ["prayers", "invocation"] },
  // eccezione dentro la famiglia: nomina un oggetto, non un atto di parola.
  "σκῆπτρον": { item: "materiality", subtype: ["instruments"] },

  // ── ruolo-istituzione ───────────────────────────────────────────────
  "ἱερεύς": { item: "human-agents", subtype: ["cult-personnel", "priest"] },
  "ἱερατεύω": { item: "human-agents", subtype: ["cult-personnel", "priest"] },
  "ἀρχιερεύς": { item: "human-agents", subtype: ["cult-personnel", "high-priest"] },
  "στολιστής": { item: "human-agents", subtype: ["cult-personnel", "assistant"] },
  "σύνοδος": { item: "human-agents", subtype: ["groups", "associations"] },
  "φράτρα": { item: "human-agents", subtype: ["groups", "associations"] },
  "-ιασταί": { item: "human-agents", subtype: ["groups", "associations"] },
  "συνβολαφόρος": { item: "human-agents", subtype: ["groups", "associations"] },
  "κατοικία": { item: "human-agents", subtype: ["groups", "local-community"] },
  "θρεπτός": { item: "human-agents", subtype: ["status", "threptos"] },
  "θρέμμα": { item: "human-agents", subtype: ["status", "threptos"] },
  "τρέφω": { item: "human-agents", subtype: ["status", "threptos"] },
};

/** Percorso LARES di un lemma controllato, o undefined se non ne ha (§5 del doc). */
export function toolboxForLemma(lemma: string): ToolboxMarker | undefined {
  return LEMMA_TOOLBOX[(lemma || "").trim()];
}

/** `subtype` come stringa per il markup: gli id separati da spazio. */
export function toolboxAttrs(m: ToolboxMarker | undefined): { type: string; subtype: string } | undefined {
  if (!m) return undefined;
  return { type: m.item, subtype: m.subtype.join(" ") };
}

/**
 * Coerenza interna della tabella: ogni chiave è un lemma controllato e ogni
 * percorso esiste nella griglia. Usata dai test; non costa nulla chiamarla.
 */
export function checkToolboxTable(): string[] {
  const errs: string[] = [];
  for (const [lemma, m] of Object.entries(LEMMA_TOOLBOX)) {
    if (!BY_LEMMA.has(lemma)) errs.push(`«${lemma}» non è nel vocabolario controllato.`);
    const bad = validateToolboxPath(m.item, m.subtype);
    if (bad) errs.push(`«${lemma}»: ${bad}`);
  }
  return errs;
}
