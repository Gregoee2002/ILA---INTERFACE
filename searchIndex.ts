import MiniSearch from 'minisearch';

/**
 * Normalizzazione diacritici greci per la ricerca — STESSA logica già usata
 * lato frontend in App.tsx (funzione `normalizeGreek`, riga ~85). Duplicata
 * qui perché server.ts gira in un processo Node separato dal bundle React;
 * se in futuro si estrae in un modulo condiviso (es. src/lib/greekUtils.ts,
 * importabile sia da App.tsx che da qui), va tenuta UNA sola implementazione
 * per evitare che le due normalizzazioni divergano nel tempo.
 */
function normalizeGreek(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti/spiriti
    .replace(/ς/g, 'σ')              // sigma finale → sigma normale
    .toLowerCase();
}

// Campi indicizzati, con peso relativo. testo_searchable pesa di più perché
// è il contenuto epigrafico primario; gli altri sono metadati di contesto.
const SEARCH_FIELDS = [
  'testo_searchable_norm',
  'epiteti_norm',
  'divinita_norm',
  'citta_norm',
  'regione_norm',
  'bibliografia_norm',
  'testo_tradotto_norm',
];

const FIELD_BOOST: Record<string, number> = {
  testo_searchable_norm: 3,
  epiteti_norm: 2.5,
  divinita_norm: 2.5,
  citta_norm: 1,
  regione_norm: 1,
  bibliografia_norm: 0.5,
  testo_tradotto_norm: 1,
};

/**
 * Documento indicizzato da MiniSearch. I campi "_norm" contengono la
 * versione normalizzata (senza diacritici, sigma unificata, minuscolo) —
 * necessaria perché la ricerca greca politonica altrimenti non trova
 * "θεος" cercando "θεός". I campi originali (non normalizzati) NON vengono
 * indicizzati, solo portati con l'id per il display lato client se serve.
 */
interface IndexedDoc {
  id: number;
  entryId?: string;
  testo_searchable_norm: string;
  epiteti_norm: string;
  divinita_norm: string;
  citta_norm: string;
  regione_norm: string;
  bibliografia_norm: string;
  testo_tradotto_norm: string;
}

function toIndexedDoc(m: any): IndexedDoc {
  const bibliografiaText = Array.isArray(m.bibliografia)
    ? m.bibliografia.map((b: any) => b.titolo || '').join(' ')
    : '';
  return {
    id: m.id,
    entryId: m.entryId,
    testo_searchable_norm: normalizeGreek(m.testo_searchable || ''),
    epiteti_norm: normalizeGreek((m.epiteti || []).join(' ')),
    divinita_norm: normalizeGreek((m.divinita || []).join(' ')),
    citta_norm: normalizeGreek(m.citta || ''),
    regione_norm: normalizeGreek(m.regione || ''),
    bibliografia_norm: normalizeGreek(bibliografiaText),
    testo_tradotto_norm: normalizeGreek(m.testo_tradotto || ''),
  };
}

// Mappa id → monumento originale, per poter ricostruire testo_searchable e
// supplied_ranges al momento della ricerca (MiniSearch indicizza solo le
// stringhe, non li tiene in memoria per noi).
let monumentiById: Map<number, any> = new Map();

export function buildSearchIndex(monumenti: any[]): MiniSearch<IndexedDoc> {
  monumentiById = new Map(monumenti.map(m => [m.id, m]));

  const index = new MiniSearch<IndexedDoc>({
    idField: 'id',
    fields: SEARCH_FIELDS,
    storeFields: ['id', 'entryId'],
    searchOptions: {
      boost: FIELD_BOOST,
      fuzzy: 0.2,
      prefix: true,
    },
  });

  const docs = monumenti
    .filter(m => m && typeof m.id === 'number')
    .map(toIndexedDoc);

  index.addAll(docs);
  return index;
}

/**
 * Verifica se un termine cercato compare, in monumento.testo_searchable,
 * dentro uno dei suoi supplied_ranges (= parte ricostruita editorialmente,
 * non attestata sulla pietra). Approssimato ma sufficiente per il badge:
 * cerca tutte le occorrenze case-insensitive del termine e controlla se
 * almeno una cade dentro un range.
 */
function termFallsInSuppliedRange(monumento: any, term: string): boolean {
  const testo: string = monumento.testo_searchable || '';
  const ranges: [number, number][] = monumento.supplied_ranges || [];
  if (!testo || ranges.length === 0 || !term) return false;

  const testoNorm = normalizeGreek(testo);
  const termNorm = normalizeGreek(term);
  if (!termNorm) return false;

  let searchFrom = 0;
  let idx: number;
  while ((idx = testoNorm.indexOf(termNorm, searchFrom)) !== -1) {
    const matchEnd = idx + termNorm.length;
    // NB: testoNorm e testo hanno la stessa lunghezza in caratteri per il
    // greco politonico comune (NFD + strip accenti non cambia il conteggio
    // di code point per le lettere effettivamente cercate qui), quindi gli
    // indici sono utilizzabili direttamente contro supplied_ranges calcolati
    // sul testo originale. Per lingue/script dove questo non valesse, andrebbe
    // costruita una mappa di offset esplicita.
    const overlaps = ranges.some(([s, e]) => idx < e && matchEnd > s);
    if (overlaps) return true;
    searchFrom = idx + 1;
  }
  return false;
}

export interface SearchResult {
  id: number;
  entryId?: string;
  score: number;
  match: Record<string, string[]>;
  terms: string[];
  matchInSupplied: boolean;
}

export function searchMonumenti(index: MiniSearch<IndexedDoc>, query: string): SearchResult[] {
  const q = normalizeGreek((query || '').trim());
  if (!q) return [];

  const rawResults = index.search(q, {
    boost: FIELD_BOOST,
    fuzzy: 0.2,
    prefix: true,
  });

  return rawResults.map((r: any) => {
    const monumento = monumentiById.get(r.id);
    const matchInSupplied = monumento
      ? r.terms.some((t: string) => termFallsInSuppliedRange(monumento, t))
      : false;

    return {
      id: r.id,
      entryId: monumento?.entryId,
      score: r.score,
      match: r.match,
      terms: r.terms,
      matchInSupplied,
    };
  });
}
