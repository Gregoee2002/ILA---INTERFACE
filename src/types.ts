export interface Traduzione {
  lang: string;
  testo: string;
  note: string;
}

export interface Bibliografia {
  titolo: string;
  punti_rif?: string;
  citedRanges?: string[];
  rawXml?: string;
}

export interface OrigDate {
  prefix?: string;
  datingMethod?: string;
  notBeforeCustom?: string;
  notAfterCustom?: string;
  precision?: string;
  evidence?: string;
  testo: string;
}

export interface Revision {
  date: string;
  who: string;
  note?: string;
}

// Curatori e collaboratori della scheda: chi ha ricoperto quale ruolo
// editoriale (editor, revisor, encoder, contributor...), TEI-conforme
// come <respStmt><resp>/<name> dentro <titleStmt>.
export interface Responsabile {
  ruolo: string;
  nome: string;
}

// Stato editoriale del testo, TEI-conforme: attributo @status su
// <revisionDesc>, previsto da TEI P5 (non un'invenzione su <change>).
// Vocabolario controllato ispirato alle diciture del progetto I.Sicily
// ("diplomatic edition released", "text under revision").
export type EditorialStatus = "draft" | "diplomatic-edition" | "published" | "under-revision";

export const EDITORIAL_STATUS_LABELS: Record<EditorialStatus, string> = {
  draft: "Bozza",
  "diplomatic-edition": "Edizione diplomatica pubblicata",
  published: "Pubblicata",
  "under-revision": "In revisione",
};

export interface Persona {
  xmlId: string;
  key?: string;
  nymRef?: string;
  name: string;
  ethnicRef?: string;
  ethnicNymRef?: string;
  ethnicText?: string;
  note?: string;
}

export interface IconographicTrait {
  type: string;
  key: string;
  hand?: string;
}

export interface IconographicFigure {
  n: number;
  type: string;
  key: string;
  // Posizione compositiva nel rilievo (es. "upper_left", "top_centre").
  // Proprietà DELLA FIGURA (dove si trova nella scena), non un trait fisico
  // — per questo vive qui e non in `traits`, che raccoglie solo attributi
  // fisici/iconografici propri della figura (copricapo, oggetto tenuto...).
  place?: string;
  traits: IconographicTrait[];
}

export interface IconographyData {
  support?: string;
  function?: string;
  figures: IconographicFigure[];
  note?: string;
}

// Una parola/formula del lessico cultuale marcata nell'edizione (<w ana> o
// <rs type="cultTerm|cultFormula">). Derivata dal markup, mai scritta a mano.
// famiglia/sotto-funzione risolte dalla tabella controllata (cultLexicon.ts).
export interface CultAttestation {
  lemma: string;
  family: string;
  subFunction: string;
  /** forma attestata: testo del <w>, con i "-" di a-capo rimossi. */
  form: string;
  /** n del <lb> che precede la parola nel testo. */
  line?: string;
  /** @ana contiene #formula (parola in locuzione fissa). */
  formula: boolean;
  /** @cert="low" — forma integrata/dubbia. */
  cert?: "low";
  /** id scheda, es. "ILA-107". */
  scheda: string;
  /** riferimento Lane/CMRDM, se ricavabile dalla bibliografia. */
  laneRef?: string;
}

export interface Monumento {
  entryId?: string;
  id: number;
  titolo?: string;
  conserv?: string;
  regione: string;
  citta: string;
  tipo: string;
  materiale: string;
  dim: string;
  luogo_rit: string;
  luogo_cons?: string;
  testo: string;
  // Testo piatto derivato da `testo`, pronto per l'indicizzazione full-text
  // (MiniSearch): calcolato una volta in fase di parsing/import, non ad ogni
  // ricerca. Include anche le ricostruzioni editoriali (<supplied>).
  testo_searchable?: string;
  // Intervalli [start, end) di carattere in `testo_searchable` che
  // corrispondono a testo dentro un <supplied> (ricostruzione editoriale,
  // non attestata sulla pietra) — usati per il badge "match ricostruito"
  // nei risultati di ricerca.
  supplied_ranges?: [number, number][];
  iscrizione: boolean;
  anepigr: boolean;
  data: string;
  data_inizio?: number;
  data_fine?: number;
  epiteti?: string[];
  divinita?: string[];
  // Associazione per-persName tra ogni divinità nominata nel monumento e i
  // SUOI epiteti (non quelli di eventuali altre divinità co-presenti nella
  // stessa iscrizione). `divinita`/`epiteti` restano array piatti per la
  // ricerca full-text e i filtri generici; questo campo è la fonte corretta
  // per qualunque statistica "epiteti di questa specifica divinità".
  divinitaEpiteti?: { divinita: string; epiteti: string[] }[];
  onomastica?: string[];
  persone?: Persona[];
  iconografia?: IconographyData;
  traduzioni?: Traduzione[];
  bibliografia?: Bibliografia[];
  responsabili?: Responsabile[];
  note_interne?: string;
  note_interne_rawXml?: string;
  apparatus?: { loc: string; note: string }[] | string;
  testo_tradotto?: string; // Kept for backwards compatibility if needed elsewhere
  
  // Custom new fields for enhanced TEI coverage
  phi?: string[];
  tm?: string;
  tmLink?: string;
  authority?: string;
  msIdnos?: string[];
  dim_altezza?: string;
  dim_larghezza?: string;
  dim_profondita?: string;
  dim_unita?: string;
  layout_desc?: string;
  scrittura_ref?: string;
  scrittura?: string;
  scrittura_note?: string;
  place_ref_ancient?: string;
  place_ref_modern?: string;
  origDates?: OrigDate[];
  facsimile_url?: string;
  facsimile_desc?: string;
  tipo_ref?: string;
  luogo_moderno?: string;
  origPlace_nota?: string;
  materialRef?: string;
  textTypes?: string[];
  revisions?: Revision[];
  // @status di <revisionDesc> — vedi EditorialStatus sopra.
  editorialStatus?: EditorialStatus;
  imperatori?: string[];
  // Attestazioni del lessico cultuale marcate nell'edizione (<w ana> / <rs
  // type="cultTerm|cultFormula">). Derivate dal markup a parsing time, come
  // epiteti/divinita — nessuna chiamata di rete, entra nello snapshot statico.
  cultAttestations?: CultAttestation[];
  _corpusFile?: string;
  _fileHash?: string;
}

export type SortField = keyof Monumento | 'epiteti';

export interface FilterState {
  searchText: string;
  regione: string;
  citta: string;
  tipo: string;
  materiale: string;
  iconAttributo: string;
  iconFunzione: string;
  iconPosizione: string;
  onlyInscr: boolean;
  onlyAnep: boolean;
  onlyHasTrad: boolean;
  onlyNoTrad: boolean;
  dateRange: [number, number];
  searchMode: 'AND' | 'OR';
}

export type TagType = 'regione' | 'citta' | 'tipo' | 'epiteto' | 'onomastica' | 'divinita' | 'imperatori' | 'custom';

export interface Tag {
  type: TagType;
  value: string;
}

/** Singola nota nel registro di lavorazione di una scheda (vedi EntryRegistro). */
export interface RegistroNota {
  id: string;
  author: string;
  testo: string;
  createdAt: string;
}

/**
 * Registro di lavorazione di una scheda del catalogo (vedi flags.json): una
 * sola voce per entry, che i collaboratori aggiornano nel tempo aggiungendo
 * note (ognuna firmata da un autore) fino a risolverla.
 */
export interface EntryRegistro {
  entryId: string;
  // Etichetta denormalizzata (es. "ILA 29") — resta leggibile nell'elenco
  // registro anche se la scheda viene nel frattempo rinumerata o rimossa.
  entryLabel: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  notes: RegistroNota[];
}

/** Bug segnalato da un collaboratore sul funzionamento dell'app (non legato a una scheda). */
export interface BugReport {
  id: string;
  author: string;
  testo: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface Appunto {
  entryId?: string;
  id: string;
  titolo: string;
  contenuto: string;
  dataCreazione: number;
  dataModifica: number;
}