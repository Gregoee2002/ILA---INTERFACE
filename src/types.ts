import { SourceRef } from './lib/printSources';
import type { Sezione } from './lib/sezioni';
export type { Sezione };
export interface Traduzione {
  lang: string;
  testo: string;
  note: string;
  /**
   * Faccia tradotta, sugli oggetti che ne hanno due. Assente sui monumenti
   * epigrafici, dove la traduzione riguarda l'intero testo.
   */
  face?: CoinFace;
}

/**
 * Una faccia dell'edizione: <div type="textpart" subtype="face" n="obv|rev">.
 *
 * `Monumento.testo` resta l'XML completo del `<div type="edition">` e la sola
 * cosa che il serializzatore scrive; `facce` è la sua LETTURA per faccia —
 * stessa scelta fatta per `IconographicFigure.side`. Chi modifica una faccia
 * deve rigenerare `testo` da qui con `renderEditionFaces`, così il testo resta
 * scritto da una sola parte e le due viste non possono divergere.
 */
export interface EditionFace {
  n: CoinFace;
  /** Contenuto dell'`<ab>`: markup EpiDoc, come in `Monumento.testo`. */
  testo: string;
  lang?: string;
  /** Faccia senza legenda: <space unit="side"/>. */
  anepigr: boolean;
}

/**
 * Un'immagine della scheda. `surface` la lega a una faccia
 * (<surface type="obverse|reverse">), come fa RPC: su un monumento epigrafico
 * resta assente e il facsimile riguarda l'oggetto intero.
 */
export interface Facsimile {
  url: string;
  desc?: string;
  surface?: CoinFace;
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

/** Riferimento a un repertorio epigrafico esterno (EDCS, EDH, EDR, …).
 *  `type` è la sigla del repertorio — vocabolario aperto: le sigle nuove
 *  digitate in redazione restano disponibili per le schede successive
 *  (vedi lib/extRefs.ts). `value` è l'identificativo nel repertorio,
 *  `url` il link diretto alla scheda (compilato da sé per i repertori noti).
 *  In TEI: <idno type="EDCS" corresp="…">…</idno> dentro publicationStmt. */
export interface ExternalRef {
  type: string;
  value: string;
  url?: string;
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

/**
 * Faccia di un oggetto a due lati (una moneta). Ricalca `@n` dei
 * <div type="textpart" subtype="face"> dell'EpiDoc, così edizione, traduzione e
 * iconografia si allineano sulla stessa chiave.
 */
export type CoinFace = "obv" | "rev";

export const COIN_FACE_LABELS: Record<CoinFace, string> = {
  obv: "Dritto",
  rev: "Rovescio",
};

export interface IconographicFigure {
  n: number;
  type: string;
  key: string;
  // Posizione compositiva nel rilievo (es. "upper_left", "top_centre").
  // Proprietà DELLA FIGURA (dove si trova nella scena), non un trait fisico
  // — per questo vive qui e non in `traits`, che raccoglie solo attributi
  // fisici/iconografici propri della figura (copricapo, oggetto tenuto...).
  place?: string;
  /**
   * Orientamento della figura: "right" | "left" | "facing". La prosa
   * numismatica lo nota quasi sempre («Bust of Men, r.»), quella epigrafica
   * quasi mai — per questo è opzionale e non entra in `place`, che descrive
   * DOVE sta la figura, non da che parte guarda.
   */
  dir?: string;
  /**
   * Posizione RELATIVA a un'altra figura («in front», «behind», «at feet»),
   * con `relTo` = l'`n` della figura di riferimento. È l'asse che la
   * catalografia numismatica usa al posto dei quadranti assoluti di `place`:
   * i due convivono, non si sostituiscono.
   */
  rel?: string;
  relTo?: number;
  /**
   * Faccia su cui la figura compare, quando l'oggetto ne ha due. Le figure
   * restano in un array piatto anche per le monete — così filtri, ricerca e
   * pannello continuano a leggerle senza sapere nulla di dritti e rovesci —
   * e il raggruppamento in <ica:side> avviene solo in serializzazione.
   */
  side?: CoinFace;
  traits: IconographicTrait[];
}

export interface IconographyData {
  support?: string;
  function?: string;
  figures: IconographicFigure[];
  note?: string;
  /**
   * La descrizione in prosa della faccia come la dà la fonte a stampa, tenuta
   * accanto alla strutturazione e non al posto suo: strutturare è un'aggiunta,
   * e quel che non entra nel vocabolario controllato deve restare leggibile.
   */
  sideNotes?: Partial<Record<CoinFace, string>>;
}

/* --- Numismatica -----------------------------------------------------------
 *  <xenoData><num:numismatics>. L'unità di schedatura è il TIPO monetale
 *  (nmo:TypeSeriesItem), non l'esemplare: peso e modulo sulla scheda sono
 *  intervalli, le misure vere stanno sui singoli `specimens`.
 *  Vedi docs/piano-numismatica-2026-09-21.md §4.
 * ------------------------------------------------------------------------- */

/** Misura: un valore singolo (sull'esemplare) o un intervallo (sul tipo). */
export interface NumMeasure {
  unit: string;
  value?: string;
  atLeast?: string;
  atMost?: string;
}

/** Termine da vocabolario: chiave locale + URI esterno quando esiste. */
export interface NumTerm {
  key: string;
  /** Resa nella lingua della scheda; se assente la risolve numismaticVocab. */
  label?: string;
  /** URI Nomisma. Assente quando il concetto non ha un id (es. assarion). */
  ref?: string;
  /** Il nominale è quasi sempre un'inferenza: va marcato come tale. */
  cert?: "low";
  /** Chi propone l'inferenza, quando non è l'editore della scheda. */
  resp?: string;
}

/** Un esemplare noto del tipo. Qui stanno le misure vere. */
export interface NumSpecimen {
  weight?: NumMeasure;
  diameter?: NumMeasure;
  /** Asse di conio, in ore. */
  axis?: string;
  collection?: string;
  ref?: string;
  /** L'esemplare riprodotto nella tavola della fonte. */
  illustrated?: boolean;
}

export interface NumismaticData {
  mint?: NumTerm;
  /** L'autorità reale dell'emissione (nmo:hasAuthority). */
  authority?: NumTerm;
  /** L'autorità come dichiarata dalla moneta (nmo:hasStatedAuthority). */
  statedAuthority?: string;
  /** Il magistrato responsabile, spesso nominato nella legenda. */
  issuer?: string;
  metal?: NumTerm;
  denomination?: NumTerm;
  /** Il sistema ponderale locale: è lui a definire il nominale. */
  weightStandard?: string;
  /** `struck` | `cast`. */
  manufacture?: string;
  /** Intervalli sul tipo, calcolati sugli esemplari noti. */
  weight?: NumMeasure;
  diameter?: NumMeasure;
  specimens?: NumSpecimen[];
  /** Riferimento al repertorio dei tipi: «CMRDM II», «Juliopolis 9». */
  reference?: { corpus: string; n: string };
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
  /**
   * Riferimento alla fonte a stampa principale della scheda, se riconosciuta
   * nella bibliografia — «CMRDM I 29», «BWK 5», «MAMA V 12»… Il registro delle
   * fonti sta in `lib/printSources.ts`: nessuna è privilegiata dal codice.
   */
  sourceRef?: string;
  /**
   * Percorso dell'Analytical Toolbox LARES (@type + @subtype), es.
   * `{ item: "activities", subtype: ["expiation", "confession"] }`. Derivato dal
   * lemma (docs/merge-lessico-lares.md); assente per i lemmi che non hanno
   * percorso — χαίρω, χρηστὸς χαῖρε — e per il markup anteriore al merge.
   */
  toolbox?: { item: string; subtype: string[] };
}

export interface Monumento {
  entryId?: string;
  id: number;
  /**
   * La sezione del corpus a cui la scheda appartiene (`lib/sezioni.ts`).
   * È ridondante rispetto a `id` — il blocco di numerazione la determina — ma
   * sta nel modello perché filtri, validazione e interfaccia la leggono a ogni
   * riga e non devono rifare il conto. Il parser la ricava dall'id quando c'è,
   * dal contenuto della scheda quando l'id non è ancora assegnato.
   */
  sezione?: Sezione;
  titolo?: string;
  conserv?: string;
  regione: string;
  citta: string;
  tipo: string;
  materiale: string;
  luogo_rit: string;
  // Vicende del monumento fra il rinvenimento e oggi (trasferimenti, collezioni,
  // perdita): <provenance type="transferred">. Non è il luogo di rinvenimento
  // (`luogo_rit`) né l'autopsia (`conserv`).
  vicende?: string;
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
  /** Anepigrafe nel suo insieme: su un oggetto a due facce, tutte e due mute. */
  anepigr: boolean;
  /** Lettura per faccia dell'edizione; assente sui monumenti a una faccia. */
  facce?: EditionFace[];
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
  numismatica?: NumismaticData;
  traduzioni?: Traduzione[];
  bibliografia?: Bibliografia[];
  /**
   * Le fonti a stampa riconosciute nella bibliografia della scheda, nell'ordine
   * del registro (`lib/printSources.ts`). Serve a interrogare il corpus per
   * fonte senza che nessuna sia cablata nel codice.
   */
  fontiStampa?: SourceRef[];
  responsabili?: Responsabile[];
  note_interne?: string;
  note_interne_rawXml?: string;
  // loc = riga, note = lezione, source = chi la legge così (reso in maiuscoletto)
  apparatus?: { loc: string; note: string; source?: string }[] | string;
  testo_tradotto?: string; // Kept for backwards compatibility if needed elsewhere
  
  // Custom new fields for enhanced TEI coverage
  phi?: string[];
  tm?: string;
  tmLink?: string;
  /** Altri repertori esterni (EDCS, EDH, EDR, …), oltre a TM e PHI. */
  extRefs?: ExternalRef[];
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
  /** Altezza delle lettere (solo la misura o l'intervallo, senza unità): "2,5", "2,5–3", "ca. 1,5". */
  altezza_lettere?: string;
  /** Unità di misura dell'altezza delle lettere (default: cm). */
  altezza_lettere_unita?: string;
  place_ref_ancient?: string;
  place_ref_modern?: string;
  origDates?: OrigDate[];
  /**
   * Prima immagine della scheda, mantenuti per i punti che leggono un solo
   * facsimile. La lista completa è `facsimili`: quando c'è, è lei a essere
   * scritta, e questi due ne sono il riflesso.
   */
  facsimile_url?: string;
  facsimile_desc?: string;
  facsimili?: Facsimile[];
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