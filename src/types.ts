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

export interface Monumento {
  entryId?: string;
  id: number;
  titolo?: string;
  corpus?: string;
  numero?: string;
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
  onomastica?: string[];
  persone?: Persona[];
  iconografia?: IconographyData;
  traduzioni?: Traduzione[];
  bibliografia?: Bibliografia[];
  note_interne?: string;
  note_interne_rawXml?: string;
  apparatus?: { loc: string; note: string }[] | string;
  testo_tradotto?: string; // Kept for backwards compatibility if needed elsewhere
  
  // Custom new fields for enhanced TEI coverage
  phi?: string[];
  tm?: string;
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
  imperatori?: string[];
  _corpusFile?: string;
}

export type SortField = keyof Monumento | 'epiteti';

export interface FilterState {
  searchText: string;
  corpus: string;
  numero: string;
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

export type TagType = 'regione' | 'citta' | 'tipo' | 'corpus' | 'epiteto' | 'onomastica' | 'divinita' | 'imperatori' | 'custom';

export interface Tag {
  type: TagType;
  value: string;
}

export interface Appunto {
  entryId?: string;
  id: string;
  titolo: string;
  contenuto: string;
  dataCreazione: number;
  dataModifica: number;
}