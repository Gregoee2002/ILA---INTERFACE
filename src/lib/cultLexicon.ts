/**
 * cultLexicon.ts — ILA / Index Lunae Antiquae
 * ------------------------------------------------------------------
 * Tabella del lessico delle funzioni cultuali (tassonomia cult-functions).
 * Porta in codice la §5 di `docs/tassonomia-funzioni-cultuali.md` (v2) e
 * l'insieme unico `lemma → famiglia, sotto-funzione` ricavato da
 * `docs/spoglio-lessico-cultuale.csv` (v2 — 54 lemmi).
 *
 * Nel markup dell'edizione l'editor sceglie solo `@lemma` + `@ana="#famiglia"`
 * (una domanda: «chi è il soggetto dell'azione, il dio o l'uomo?»); la
 * sotto-funzione fine NON è una decisione editoriale, si ricava di qui dal
 * `@lemma`. Vedi il doc per la norma completa.
 *
 * Nessuna dipendenza. Node + browser.
 * ------------------------------------------------------------------
 */

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
 * I 54 lemmi controllati. `family`/`subFunction` dallo spoglio v2 (insieme unico
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

/** I 54 lemmi come lista piatta di stringhe (per datalist e option). */
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
