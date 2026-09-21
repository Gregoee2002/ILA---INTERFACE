/* ------------------------------------------------------------------
 *  numismaticVocab.ts — i termini della sezione numismatica, in un registro solo
 * ------------------------------------------------------------------
 *  Stesso principio di `printSources.ts`: nessun identificatore cablato nei
 *  componenti. Qui stanno (a) le rese italiane dei termini tecnici, (b) la
 *  tabella di risoluzione verso Nomisma.
 *
 *  Perché una tabella e non un'euristica sulle stringhe: gli id Nomisma non
 *  sono deducibili dal nome. `saitta` risolve, `saittai` no; `silandus` sì,
 *  `hierocaesarea` no; `billon` e `orichalcum` sì, `electrum` e `lead` no con
 *  quelle forme. Indovinare un URI significa pubblicare un riferimento falso.
 *
 *  Due assenze note e volute (verificate sull'endpoint il 2026-09-21):
 *   - `assarion`, il nominale corrente del bronzo civico d'Asia Minore, non
 *     esiste fra le 1097 denominazioni di Nomisma;
 *   - il dio **Men** non ha alcun id Nomisma.
 *  In entrambi i casi la chiave locale è la sola identificazione disponibile:
 *  `ref` resta assente, e non va inventato.
 *
 *  Nessuna dipendenza. Node + browser.
 * ------------------------------------------------------------------
 */

const NOMISMA = "http://nomisma.org/id/";

export interface NumVocabEntry {
  /** Resa italiana, per l'interfaccia. */
  label: string;
  /** Id Nomisma, quando esiste ed è stato verificato. */
  nomisma?: string;
  /** Sigla tradizionale dei cataloghi (AR, Æ, AV). */
  sigla?: string;
  note?: string;
}

/** Metalli (nmo:hasMaterial). Le etichette italiane vengono da Nomisma stesso. */
export const METALS: Record<string, NumVocabEntry> = {
  ae: { label: "bronzo", nomisma: "ae", sigla: "Æ", note: "bronzo o qualunque lega di rame" },
  ar: { label: "argento", nomisma: "ar", sigla: "AR" },
  av: { label: "oro", nomisma: "av", sigla: "AV" },
  billon: { label: "biglione", nomisma: "billon", sigla: "BI" },
  orichalcum: { label: "oricalco", nomisma: "orichalcum", sigla: "OR" },
  // Verificati come NON risolvibili con queste forme: nessun `nomisma`.
  electrum: { label: "elettro", sigla: "EL" },
  lead: { label: "piombo", sigla: "PB" },
};

/** Nominali (nmo:hasDenomination). */
export const DENOMINATIONS: Record<string, NumVocabEntry> = {
  assarion: {
    label: "assarion",
    note: "nominale corrente del bronzo civico d'Asia Minore; nessun id Nomisma",
  },
  drachma: { label: "dracma", nomisma: "drachma" },
  didrachm: { label: "didramma", nomisma: "didrachm" },
  tetradrachm: { label: "tetradramma", nomisma: "tetradrachm" },
  hemidrachm: { label: "emidramma", nomisma: "hemidrachm" },
  obol: { label: "obolo", nomisma: "obol" },
  diobol: { label: "diobolo", nomisma: "diobol" },
  hemiobol: { label: "emiobolo", nomisma: "hemiobol" },
  chalkous: { label: "calco", nomisma: "chalkous" },
  dichalkon: { label: "dicalco", nomisma: "dichalkon" },
  trichalkon: { label: "tricalco", nomisma: "trichalkon" },
  denarius: { label: "denario", nomisma: "denarius" },
  as: { label: "asse", nomisma: "as" },
  dupondius: { label: "dupondio", nomisma: "dupondius" },
  sestertius: { label: "sesterzio", nomisma: "sestertius" },
};

/** Tecnica di fabbricazione (nmo:hasManufacture). */
export const MANUFACTURES: Record<string, NumVocabEntry> = {
  struck: { label: "coniata", nomisma: "struck" },
  cast: { label: "fusa", nomisma: "cast" },
};

/**
 * Zecche (nmo:hasMint). Si popola man mano che le schede le incontrano: una
 * voce entra qui solo dopo che l'id è stato verificato, e `pleiades` serve a
 * controllare che lo `skos:exactMatch` di Nomisma coincida con il `@ref` che la
 * scheda già usa in `origPlace`. Se le due non coincidono, vince la scheda.
 */
export const MINTS: Record<string, NumVocabEntry & { pleiades?: string }> = {
  saitta: {
    label: "Saittai",
    nomisma: "saitta",
    pleiades: "https://pleiades.stoa.org/places/609517",
    note: "Nomisma la dice «in Phrygia»: è in Lidia. La regione la decide la fonte.",
  },
  silandus: { label: "Silandos", nomisma: "silandus" },
};

const REGISTRI: Record<string, Record<string, NumVocabEntry>> = {
  metal: METALS,
  denomination: DENOMINATIONS,
  manufacture: MANUFACTURES,
  mint: MINTS,
};

/** Resa del termine: l'etichetta esplicita della scheda vince sul registro. */
export function numLabel(kind: string, key: string, explicit?: string): string {
  if (explicit) return explicit;
  return REGISTRI[kind]?.[key]?.label || key;
}

/** URI Nomisma, o `undefined` se il concetto non ne ha uno. Mai indovinato. */
export function nomismaRef(kind: string, key: string): string | undefined {
  const id = REGISTRI[kind]?.[key]?.nomisma;
  return id ? NOMISMA + id : undefined;
}

export function numEntry(kind: string, key: string): NumVocabEntry | undefined {
  return REGISTRI[kind]?.[key];
}

/** Sigla tradizionale del metallo (Æ, AR, AV) per le rese compatte. */
export function metalSigla(key: string): string | undefined {
  return METALS[key]?.sigla;
}

/** «6,1–7,4 g» / «6,84 g». Ritorna undefined se non c'è niente da mostrare. */
export function formatMisura(m?: { unit: string; value?: string; atLeast?: string; atMost?: string }): string | undefined {
  if (!m) return undefined;
  const it = (v: string) => v.replace(".", ",");
  if (m.value) return `${it(m.value)} ${m.unit}`;
  if (m.atLeast && m.atMost) return `${it(m.atLeast)}–${it(m.atMost)} ${m.unit}`;
  if (m.atLeast) return `da ${it(m.atLeast)} ${m.unit}`;
  if (m.atMost) return `fino a ${it(m.atMost)} ${m.unit}`;
  return undefined;
}
