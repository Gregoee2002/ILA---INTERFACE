/* ================================================================
 * Repertori epigrafici esterni (EDCS, EDH, EDR, …)
 * ----------------------------------------------------------------
 * Vocabolario APERTO: le sigle qui elencate sono solo quelle note in
 * partenza, con la ricetta per costruire il link diretto alla scheda.
 * Qualunque altra sigla si può digitare al momento nell'editor: viene
 * ricordata (localStorage + sigle già presenti nel corpus) e riproposta
 * nelle schede successive, senza bisogno di toccare questo file.
 * TM e PHI non compaiono qui: hanno già campi propri nella sezione
 * Pubblicazione e restano <idno type="TM"> / <idno type="PHI">.
 * ================================================================ */

export interface ExtRefRepo {
  /** Sigla usata come @type dell'idno TEI. */
  type: string;
  /** Nome esteso del repertorio, per il tooltip. */
  label: string;
  /** Costruisce l'URL della scheda dall'identificativo, se il repertorio
   *  ha URL prevedibili; assente per i repertori senza link stabile. */
  url?: (value: string) => string;
  /** Esempio di identificativo, mostrato come placeholder. */
  placeholder?: string;
}

const digits = (v: string) => v.replace(/[^0-9]/g, '');

export const EXT_REF_REPOS: ExtRefRepo[] = [
  {
    type: 'EDCS',
    label: 'Epigraphik-Datenbank Clauss / Slaby',
    placeholder: 'EDCS-12345678',
    url: v => {
      const id = digits(v).padStart(8, '0');
      return `https://db.edcs.eu/epigr/epi_einzel.php?s_sprache=it&p_edcs_id=EDCS-${id}`;
    },
  },
  {
    type: 'EDH',
    label: 'Epigraphische Datenbank Heidelberg',
    placeholder: 'HD012345',
    url: v => `https://edh.ub.uni-heidelberg.de/edh/inschrift/HD${digits(v).padStart(6, '0')}`,
  },
  {
    type: 'EDR',
    label: 'Epigraphic Database Roma',
    placeholder: 'EDR123456',
    url: v => `https://www.edr-edr.it/edr_programmi/res_complessa_dettaglio.php?id_nr=EDR${digits(v).padStart(6, '0')}`,
  },
  {
    type: 'EDB',
    label: 'Epigraphic Database Bari',
    placeholder: 'EDB12345',
    url: v => `https://www.edb.uniba.it/epigraph/${digits(v)}`,
  },
  {
    type: 'LGPN',
    label: 'Lexicon of Greek Personal Names',
    placeholder: 'V5a-12345',
    url: v => `https://www.lgpn.ox.ac.uk/id/${v.trim()}`,
  },
  {
    type: 'Pleiades',
    label: 'Pleiades (luoghi antichi)',
    placeholder: '550595',
    url: v => `https://pleiades.stoa.org/places/${digits(v)}`,
  },
  {
    type: 'Arachne',
    label: 'iDAI.objects Arachne',
    placeholder: '123456',
    url: v => `https://arachne.dainst.org/entity/${digits(v)}`,
  },
  { type: 'SEG', label: 'Supplementum Epigraphicum Graecum', placeholder: 'SEG 57, 1204' },
  { type: 'IK', label: 'Inschriften griechischer Städte aus Kleinasien', placeholder: 'IK 17,1, 3252' },
];

/** Normalizza la sigla in un token valido come @type di <idno> (TEI:
 *  data.enumerated non ammette spazi): "Repertorio Mio" → "Repertorio-Mio". */
export function normalizeExtRefType(type: string): string {
  return type.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._:-]/g, '');
}

const REPO_BY_TYPE = new Map(EXT_REF_REPOS.map(r => [r.type.toLowerCase(), r]));

export function findExtRefRepo(type: string): ExtRefRepo | undefined {
  return REPO_BY_TYPE.get(type.trim().toLowerCase());
}

/** URL della scheda nel repertorio, se la sigla è nota e l'id è compilato. */
export function buildExtRefUrl(type: string, value: string): string {
  const repo = findExtRefRepo(type);
  if (!repo?.url || !value.trim()) return '';
  return repo.url(value);
}

/* ── sigle ricordate ────────────────────────────────────────────────
 * Le sigle digitate a mano restano disponibili nelle sessioni successive:
 * il sito è statico e non ha un vocabolario lato server, quindi la memoria
 * è il localStorage del browser, unita alle sigle già usate nel corpus
 * (che è la memoria condivisa vera e propria, perché viaggia nell'XML).
 * ------------------------------------------------------------------ */

const LS_KEY = 'ila.extRefTypes';

export function loadRememberedExtRefTypes(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Ricorda una sigla nuova (no-op se già nota o vuota). */
export function rememberExtRefType(type: string): void {
  const t = type.trim();
  if (!t || findExtRefRepo(t)) return;
  try {
    const known = loadRememberedExtRefTypes();
    if (known.some(k => k.toLowerCase() === t.toLowerCase())) return;
    localStorage.setItem(LS_KEY, JSON.stringify([...known, t]));
  } catch {
    /* storage non disponibile: la sigla resta comunque salvata nella scheda */
  }
}

/** Sigle da proporre nell'editor: repertori noti + sigle ricordate nel browser
 *  + sigle già presenti nelle schede passate. */
export function collectExtRefTypes(usedInCorpus: string[] = []): string[] {
  const seen = new Map<string, string>();
  const add = (t: string) => {
    const k = t.trim();
    if (k && !seen.has(k.toLowerCase())) seen.set(k.toLowerCase(), k);
  };
  EXT_REF_REPOS.forEach(r => add(r.type));
  loadRememberedExtRefTypes().forEach(add);
  usedInCorpus.forEach(add);
  return Array.from(seen.values());
}
