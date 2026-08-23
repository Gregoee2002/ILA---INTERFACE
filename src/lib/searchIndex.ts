import MiniSearch from 'minisearch';
import { ICONOGRAPHY_LABELS } from './iconographyLabels';
import { italianWordsToDigits } from './italianNumbers';

/**
 * Normalizzazione diacritici greci per la ricerca. Se in futuro serve la
 * stessa logica anche lato client, va estratta in un modulo condiviso
 * (es. src/lib/greekUtils.ts) per evitare che due copie divergano nel tempo.
 */
function normalizeGreek(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti/spiriti
    .replace(/ς/g, 'σ')              // sigma finale → sigma normale
    .toLowerCase();
}

// Strip minimale di markup XML residuo (es. dentro apparatus/traduzioni),
// solo per l'indicizzazione — non tocca i dati originali.
function stripXmlForIndex(val: any): string {
  if (val === undefined || val === null) return '';
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Testo piano cercabile per l'iconografia: chiavi grezze (function/figure
// key/type, trait key) più le rispettive etichette italiane, così cercare
// sia "patera" sia "held_object" trova la stessa scheda.
function iconographyText(ico: any): string {
  if (!ico) return '';
  const parts: string[] = [];
  if (ico.function) parts.push(ico.function, ICONOGRAPHY_LABELS[ico.function] || '');
  (ico.figures || []).forEach((f: any) => {
    if (f.key) parts.push(f.key, ICONOGRAPHY_LABELS[f.key] || '');
    if (f.type) parts.push(ICONOGRAPHY_LABELS[f.type] || '');
    (f.traits || []).forEach((t: any) => {
      if (t.key) parts.push(t.key, ICONOGRAPHY_LABELS[t.key] || '');
    });
  });
  if (ico.note) parts.push(ico.note);
  return parts.filter(Boolean).join(' ');
}

// Campi indicizzati, con peso relativo. Coprono lo stesso perimetro del
// vecchio filtro client-side (normalizedSearchMap in App.tsx) più
// testo_searchable al posto del testo grezzo con markup EpiDoc.
const SEARCH_FIELDS = [
  'id_norm',
  'testo_searchable_norm',
  'epiteti_norm',
  'divinita_norm',
  'onomastica_norm',
  'imperatori_norm',
  'citta_norm',
  'regione_norm',
  'tipo_norm',
  'materiale_norm',
  'titolo_norm',
  'note_interne_norm',
  'apparatus_norm',
  'traduzioni_norm',
  'bibliografia_norm',
  'iconografia_norm',
];

const FIELD_BOOST: Record<string, number> = {
  id_norm: 4,
  testo_searchable_norm: 3,
  epiteti_norm: 2.5,
  divinita_norm: 2.5,
  onomastica_norm: 1.5,
  imperatori_norm: 1.5,
  citta_norm: 1,
  regione_norm: 1,
  tipo_norm: 1,
  materiale_norm: 0.5,
  titolo_norm: 1.5,
  note_interne_norm: 0.5,
  apparatus_norm: 0.5,
  traduzioni_norm: 1,
  bibliografia_norm: 0.5,
  iconografia_norm: 1,
};

interface IndexedDoc {
  id: number;
  entryId?: string;
  [key: string]: any;
}

function toIndexedDoc(m: any): IndexedDoc {
  const bibliografiaText = Array.isArray(m.bibliografia)
    ? m.bibliografia.map((b: any) => b.titolo || '').join(' ')
    : '';
  const traduzioniText = Array.isArray(m.traduzioni)
    ? m.traduzioni.map((t: any) => `${t.testo || ''} ${t.note || ''}`).join(' ')
    : '';
  const entryIdDigits = (m.entryId || '').match(/\d+/g)?.join(' ') || '';
  return {
    id: m.id,
    entryId: m.entryId,
    id_norm: normalizeGreek([m.id, m.entryId, entryIdDigits].filter(Boolean).join(' ')),
    testo_searchable_norm: normalizeGreek(m.testo_searchable || ''),
    epiteti_norm: normalizeGreek((m.epiteti || []).join(' ')),
    divinita_norm: normalizeGreek((m.divinita || []).join(' ')),
    onomastica_norm: normalizeGreek((m.onomastica || []).join(' ')),
    imperatori_norm: normalizeGreek((m.imperatori || []).join(' ')),
    citta_norm: normalizeGreek(m.citta || ''),
    regione_norm: normalizeGreek(m.regione || ''),
    tipo_norm: normalizeGreek(m.tipo || ''),
    materiale_norm: normalizeGreek(m.materiale || ''),
    titolo_norm: normalizeGreek(m.titolo || ''),
    note_interne_norm: normalizeGreek(stripXmlForIndex(m.note_interne)),
    apparatus_norm: normalizeGreek(stripXmlForIndex(m.apparatus)),
    traduzioni_norm: normalizeGreek(traduzioniText),
    bibliografia_norm: normalizeGreek(bibliografiaText),
    iconografia_norm: normalizeGreek(iconographyText(m.iconografia)),
  };
}

// Mappa id → monumento originale, per poter controllare supplied_ranges
// al momento della ricerca (MiniSearch indicizza solo le stringhe).
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
 * non attestata sulla pietra). Approssimato ma sufficiente per il badge.
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

export interface SearchOptions {
  combineWith?: 'AND' | 'OR';
}

export function searchMonumenti(
  index: MiniSearch<IndexedDoc>,
  query: string,
  opts: SearchOptions = {}
): SearchResult[] {
  let q = normalizeGreek((query || '').trim());
  if (!q) return [];

  // Permette di cercare un ID scrivendolo in lettere ("novantuno" -> "91"),
  // sia per l'intera query sia parola per parola (es. "epigrafe novantuno").
  // Sostituisce (non aggiunge) le parole-numero con le cifre corrispondenti,
  // così il combineWith="AND" continua a funzionare correttamente.
  q = q.split(/\s+/).map(w => italianWordsToDigits(w) ?? w).join(' ');

  const rawResults = index.search(q, {
    boost: FIELD_BOOST,
    fuzzy: 0.2,
    prefix: true,
    combineWith: opts.combineWith === 'AND' ? 'AND' : 'OR',
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