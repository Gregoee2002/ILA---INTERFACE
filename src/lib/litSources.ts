// ═══════════════════════════════════════════════════════════════════════
// litSources.ts — modello dati delle FONTI LETTERARIE di ILA.
// ═══════════════════════════════════════════════════════════════════════
//
// La sezione «Fonti letterarie» non è un secondo catalogo epigrafico: è lo
// spoglio ragionato delle fonti antiche sulla divinità lunare. Il corpus
// risponde alla domanda «che cosa si scriveva sulla pietra»; questa sezione
// risponde a «che cosa si diceva nei testi», e le due risposte vanno lette
// una contro l'altra.
//
// ── TRE ENTITÀ, IN QUEST'ORDINE ───────────────────────────────────────────
//
//  OPERA         l'unità bibliografica: Esiodo, Teogonia. Autore, lingua,
//                genere, datazione, edizione, CTS URN, testo online stanno
//                qui una volta sola.
//  TESTIMONIANZA il passo dentro l'opera (`operaId` + `locus`), con il testo
//                marcato, la traduzione, il commento e gli indici. È l'unità
//                catalogabile — l'equivalente della scheda del monumento — e
//                vive al primo livello, indipendente da qualunque saggio.
//  SAGGIO        la trattazione discorsiva che RACCOGLIE testimonianze già
//                catalogate e le commenta. Non le contiene: le richiama per
//                id. Una stessa testimonianza può quindi comparire in due
//                saggi con due letture diverse, che è il caso normale.
//
// Il rovesciamento rispetto alla prima stesura (dove le testimonianze
// stavano dentro la voce) non è cosmetico: nel corpus nessuno scrive «la
// pagina di Men» a mano — si scrivono schede, e gli indici di divinità ed
// epiteti sono CALCOLATI dal markup. Qui vale lo stesso, ed è il markup a
// legare una testimonianza alle pagine già esistenti del database.
//
// ── MODELLO DI RIFERIMENTO: LARES ─────────────────────────────────────────
// (Language and Religion; Bologna, Helsinki, Kraków, Complutense —
// lares-lexicon.unibo.it). Dalle 47 schede pubblicate e dai documenti di
// progetto si ricavano quattro scelte, che qui sono adottate:
//
//  1. la voce di lessico è un LEMMA (Agalma, Pompe, Mania, Hebraios…), non
//     una divinità: il saggio di ILA ne segue lo scheletro — morfologia,
//     etimologia, testimonianze divise per tipo di fonte, catalogo delle
//     occorrenze, discussione, bibliografia distinta fra corpora e studi;
//  2. la citazione porta il tipo di fonte, @type lit|ins|pap (qui `refType`
//     sull'opera), come <ref type="lit"> del markup LARES;
//  3. i nove MARCATORI CONCETTUALI (rappresentazione/comunicazione/fruizione
//     × tre ambiti) qualificano la testimonianza — vedi laresToolbox.ts;
//  4. l'ANALYTICAL TOOLBOX classifica segmenti di testo con <rs type subtype>
//     — sempre laresToolbox.ts, e si applica nel markup, non in un campo.
//
// Ciò che ILA aggiunge a LARES: un corpus epigrafico proprio. La sezione
// «testimonianze epigrafiche» di un saggio non si scrive, si calcola dal
// corpus attraverso le chiavi di divinità ed epiteto (`chiaviCorpus`).

import {
  parseLitTesto,
  plainTextOf,
  extractLitMarkupIndex,
  LitMarkupIndex,
} from './litMarkup';

export * from './laresToolbox';
import { LaresMarker, LARES_GRID, AMBITO_LABELS, AMBITO_CAMPO } from './laresToolbox';

// ───────────────────────────────────────────────────────────── vocabolari ──

/** @type di <ref> in LARES: la natura del supporto della testimonianza. */
export type RefType = 'lit' | 'ins' | 'pap';

export const REFTYPE_LABELS: Record<RefType, string> = {
  lit: 'letteraria',
  ins: 'epigrafica',
  pap: 'papiracea',
};

/** Come LARES intitola le tre sezioni di testimonianze in ogni scheda. */
export const REFTYPE_SEZIONI: Record<RefType, string> = {
  lit: 'Fonti letterarie',
  ins: 'Iscrizioni',
  pap: 'Papiri',
};

/** Genere letterario della fonte. Vocabolario chiuso, ampliabile. */
export type Genere =
  | 'epica' | 'inno' | 'lirica' | 'tragedia' | 'commedia' | 'filosofia'
  | 'storiografia' | 'geografia' | 'mitografia' | 'lessicografia'
  | 'poesia-ellenistica' | 'biografia' | 'antiquaria' | 'periegesi'
  | 'magia' | 'scoli-commentari';

export const GENERE_LABELS: Record<Genere, string> = {
  epica: 'epica',
  inno: 'innodia',
  lirica: 'lirica',
  tragedia: 'tragedia',
  commedia: 'commedia',
  filosofia: 'filosofia',
  storiografia: 'storiografia',
  geografia: 'geografia',
  mitografia: 'mitografia',
  lessicografia: 'lessicografia',
  'poesia-ellenistica': 'poesia ellenistica',
  biografia: 'biografia',
  antiquaria: 'erudizione antiquaria',
  periegesi: 'periegesi',
  magia: 'testi magici',
  'scoli-commentari': 'scoli e commentari',
};

export const GENERI = Object.keys(GENERE_LABELS) as Genere[];

/**
 * Che cosa fa il passo rispetto alla divinità lunare. È la tassonomia propria
 * di ILA — più fine del semplice «attestazione» — e distingue una genealogia
 * da una notizia di culto o da un'etimologia.
 */
export type TipoTestimonianza =
  | 'genealogia' | 'menzione-diretta' | 'etimologia' | 'epiclesi'
  | 'notizia-cultuale' | 'descrizione-rituale' | 'descrizione-iconografica'
  | 'allegoria' | 'assimilazione' | 'invocazione' | 'aition'
  | 'computo-del-tempo';

export const TIPO_LABELS: Record<TipoTestimonianza, string> = {
  genealogia: 'genealogia',
  'menzione-diretta': 'menzione diretta',
  etimologia: 'etimologia',
  epiclesi: 'epiclesi',
  'notizia-cultuale': 'notizia cultuale',
  'descrizione-rituale': 'descrizione rituale',
  'descrizione-iconografica': 'descrizione iconografica',
  allegoria: 'allegoria',
  assimilazione: 'assimilazione',
  invocazione: 'invocazione',
  aition: 'aition',
  'computo-del-tempo': 'computo del tempo',
};

export const TIPI = Object.keys(TIPO_LABELS) as TipoTestimonianza[];

// ─────────────────────────────────────────────────────────────── entità ────

/**
 * Stato di collazione del testo antico. Nessuna trascrizione è «vera» finché
 * non è stata riscontrata sull'edizione dichiarata: il campo rende esplicito
 * il debito invece di nasconderlo, e alimenta il contatore della sezione.
 */
export type Collazione = 'verificato' | 'da-collazionare';

/** Un termine notevole del passo: la forma attestata e il lemma di indicizzazione. */
export interface TerminNotevole {
  forma: string;
  lemma: string;
  /** perché è notevole (dialetto, hapax, tecnicismo cultuale…) */
  nota?: string;
}

export interface LinkEsterno {
  label: string;
  url: string;
}

/** L'OPERA spogliata — l'unità bibliografica dell'indice delle opere. */
export interface Opera {
  /** handle stabile, es. «hes-th» */
  id: string;
  autore: string;
  /** forma abbreviata convenzionale, es. «Hes.» */
  autoreAbbr: string;
  titolo: string;
  /** sigla nelle citazioni, es. «Th.» — vuota per Strabone, Pausania… */
  titoloAbbr: string;
  titoloOriginale?: string;
  lingua: 'grc' | 'lat';
  refType: RefType;
  genere: Genere;
  datazione: string;
  /** anno indicativo per l'ordinamento (negativo = a.C.) */
  datazioneSort: number;
  /** edizione critica di riferimento */
  edizione: string;
  /** identificatore canonico, es. «urn:cts:greekLit:tlg0020.tlg001» */
  ctsUrn?: string;
  tlg?: string;
  links?: LinkEsterno[];
  /** nota redazionale: tradizione, attribuzione, problemi di testo */
  nota?: string;
}

/** La TESTIMONIANZA: un passo dentro un'opera. Unità catalogabile della sezione. */
export interface Testimonium {
  /** identificatore stabile e citabile, es. «ILA-LIT-hes-th-371» */
  id: string;
  operaId: string;
  /** riferimento canonico dentro l'opera, es. «371–374» */
  locus: string;

  /**
   * Testo antico: testo semplice (righe separate da newline) oppure markup
   * TEI/EpiDoc inline con milestone <lb/>, lo stesso dell'edizione
   * epigrafica. Le due forme convivono — vedi litMarkup.ts.
   */
  testo: string;
  traduzione: string;
  traduttore: string;
  collazione: Collazione;
  /** edizione diversa da quella dichiarata sull'opera (raro) */
  edizioneSpecifica?: string;

  tipo: TipoTestimonianza[];
  /** i nove marcatori concettuali LARES, riferiti al passo intero */
  lares: LaresMarker[];
  commento: string;
  termini: TerminNotevole[];

  divinita?: string[];
  /** personaggi mitici */
  personaggi?: string[];
  /** figure storiche */
  figure?: string[];
  luoghi?: string[];

  links?: LinkEsterno[];
  bibliografia?: string[];
}

/** Raggruppamento tematico dentro un saggio: richiama testimonianze per id. */
export interface Nucleo {
  id: string;
  titolo: string;
  cappello: string;
  /** id delle testimonianze, nell'ordine di lettura voluto */
  testimonia: string[];
}

/**
 * Il SAGGIO — la scheda di lessico, sul modello delle voci LARES.
 *
 * Lo scheletro segue quello delle 47 schede pubblicate (morfologia,
 * etimologia, testimonianze per tipo di fonte, catalogo delle occorrenze,
 * discussione, bibliografia divisa fra corpora e studi), ma i campi che ILA
 * non sa ancora riempire restano facoltativi: si rende ciò che c'è, non un
 * modulo con dei buchi.
 *
 * I NUCLEI TEMATICI sono un'aggiunta di ILA, non di LARES: raggruppano le
 * testimonianze letterarie secondo una tesi sul materiale. Sono scritti a
 * mano e restano fermi finché qualcuno non li riscrive — a differenza di
 * ogni altro indice del database, che è calcolato.
 */
export interface Saggio {
  id: string;
  /** il lemma: una parola, non una divinità (σελήνη, Μήν, luna…) */
  lemma: string;
  lemmaGreco?: string;
  traslitterazione?: string;
  sottotitolo: string;
  /** forme e flessione, come la sezione «Morphology» di LARES */
  morfologia?: string;
  /** paragrafi di etimologia, come «Etymology» */
  etimologia?: string[];
  /** introduzione discorsiva */
  cappello: string[];
  nuclei: Nucleo[];
  /** «Discussion / interpretation» */
  sintesi: string[];
  /** bibliografia: corpora ed edizioni di riferimento */
  bibliografiaCorpora?: string[];
  /** bibliografia: studi */
  bibliografia: string[];
  redazione: string;
  aggiornamento: string;
  /**
   * Chiavi con cui il saggio pesca le TESTIMONIANZE EPIGRAFICHE dal corpus.
   * Non sono stringhe di ricerca — sono i `key` normalizzati delle divinità e
   * le etichette degli epiteti già indicizzati dal markup delle iscrizioni.
   * È il modo in cui la sezione «Iscrizioni» di una scheda LARES, che lì si
   * scrive a mano, qui si calcola.
   */
  chiaviCorpus?: { divinita?: string[]; epiteti?: string[] };
  /** saggi collegati ancora da redigere */
  saggiCollegati?: string[];
}

/**
 * Un saggio non ancora redatto, elencato accanto a quelli esistenti perché
 * l'indice dica anche che cosa manca — come il catalogo dichiara le schede
 * incomplete invece di ometterle.
 */
export interface SaggioInPreparazione {
  lemma: string;
  lemmaGreco?: string;
  nota: string;
}

/** L'intero contenuto della sezione: è l'unità che si salva e si ricarica. */
export interface LitDataset {
  opere: Opera[];
  testimonia: Testimonium[];
  saggi: Saggio[];
  inPreparazione: SaggioInPreparazione[];
}

// ───────────────────────────────────────────────────────── risoluzione ─────

/**
 * Opera segnaposto per un `operaId` che non risolve. Non è un caso teorico:
 * in redazione capita di creare la testimonianza prima dell'opera, e senza
 * questo l'intera sezione andrebbe in errore invece di segnalare il buco.
 */
export const OPERA_IGNOTA: Opera = {
  id: '',
  autore: 'Opera non collegata',
  autoreAbbr: '?',
  titolo: '—',
  titoloAbbr: '',
  lingua: 'grc',
  refType: 'lit',
  genere: 'antiquaria',
  datazione: 's.d.',
  datazioneSort: 0,
  edizione: '—',
};

/** Testimonianza con i dati dell'opera già risolti: è la forma che l'interfaccia usa. */
export interface TestimoniumRisolto extends Testimonium {
  operaRef: Opera;
  autore: string;
  autoreAbbr: string;
  /** titolo dell'opera (stringa); l'entità è in `operaRef` */
  opera: string;
  operaAbbr: string;
  lingua: 'grc' | 'lat';
  refType: RefType;
  genere: Genere;
  datazione: string;
  datazioneSort: number;
  edizione: string;
  links: LinkEsterno[];
}

export const opereById = (opere: Opera[]) => new Map(opere.map(o => [o.id, o]));

export function risolviTestimonium(t: Testimonium, opere: Map<string, Opera>): TestimoniumRisolto {
  const o = opere.get(t.operaId) || OPERA_IGNOTA;
  return {
    ...t,
    operaRef: o,
    autore: o.autore,
    autoreAbbr: o.autoreAbbr,
    opera: o.titolo,
    operaAbbr: o.titoloAbbr,
    lingua: o.lingua,
    refType: o.refType,
    genere: o.genere,
    datazione: o.datazione,
    datazioneSort: o.datazioneSort,
    edizione: t.edizioneSpecifica || o.edizione,
    // I link dell'opera valgono per tutti i suoi passi; quelli del passo si
    // aggiungono, non sostituiscono (l'edizione online del libro più il
    // rimando puntuale al paragrafo).
    links: [...(o.links || []), ...(t.links || [])],
  };
}

export const risolviTutte = (testimonia: Testimonium[], opere: Opera[]): TestimoniumRisolto[] => {
  const m = opereById(opere);
  return testimonia.map(t => risolviTestimonium(t, m));
};

/** Ordinamento cronologico, il predefinito ovunque non sia detto altrimenti. */
export const perCronologia = (a: TestimoniumRisolto, b: TestimoniumRisolto) =>
  a.datazioneSort - b.datazioneSort || a.autore.localeCompare(b.autore, 'it') || a.locus.localeCompare(b.locus, 'it');

// ─────────────────────────────────────────────── sigle dentro un saggio ────

/**
 * Le sigle T1, T2… NON sono un campo della testimonianza: sono la sua
 * posizione dentro un saggio, e cambiano da saggio a saggio. Tenerle come
 * dato avrebbe legato la testimonianza a un contenitore, che è esattamente
 * ciò che questo modello evita.
 */
export function sigleDelSaggio(s: Saggio): Map<string, string> {
  const out = new Map<string, string>();
  let n = 0;
  for (const nucleo of s.nuclei) {
    for (const id of nucleo.testimonia) {
      if (!out.has(id)) out.set(id, `T${++n}`);
    }
  }
  return out;
}

/** Le testimonianze di un saggio, nell'ordine dei nuclei. */
export function testimoniaDelSaggio(s: Saggio, tutte: TestimoniumRisolto[]): TestimoniumRisolto[] {
  const byId = new Map(tutte.map(t => [t.id, t]));
  const out: TestimoniumRisolto[] = [];
  const visti = new Set<string>();
  for (const n of s.nuclei) {
    for (const id of n.testimonia) {
      const t = byId.get(id);
      if (t && !visti.has(id)) { visti.add(id); out.push(t); }
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────── indici ─────

export interface TestimoniumRef {
  id: string;
  /** etichetta breve con cui il rimando si mostra, es. «Hes. Th. 371–374» */
  label: string;
}

export interface IndexEntry {
  key: string;
  label: string;
  /** dettaglio secondario (es. le forme attestate di un lemma) */
  detail?: string;
  /**
   * Lingua della voce d'indice, quando ne ha una. L'indice dei termini
   * mescola lemmi greci e latini: senza questo campo il pannello marcherebbe
   * `lang="grc"` anche su «luna» o «Noctiluca».
   */
  lingua?: 'grc' | 'lat';
  refs: TestimoniumRef[];
}

export interface Indici {
  opere: IndexEntry[];
  autori: IndexEntry[];
  termini: IndexEntry[];
  divinita: IndexEntry[];
  epiteti: IndexEntry[];
  personaggi: IndexEntry[];
  figure: IndexEntry[];
  luoghi: IndexEntry[];
  ambiti: IndexEntry[];
  /** lessico cultuale marcato con <w lemma ana>: stessa tassonomia del corpus */
  cultuale: IndexEntry[];
  /** categorie dell'Analytical Toolbox marcate nel testo */
  toolbox: IndexEntry[];
}

export type IndiceKey = keyof Indici;

export const INDICE_LABELS: Record<IndiceKey, string> = {
  opere: 'Opere',
  autori: 'Autori',
  divinita: 'Divinità',
  epiteti: 'Epiteti',
  termini: 'Termini',
  cultuale: 'Lessico cultuale',
  toolbox: 'Toolbox LARES',
  ambiti: 'Ambiti',
  personaggi: 'Personaggi',
  figure: 'Figure storiche',
  luoghi: 'Luoghi',
};

const pushRef = (
  map: Map<string, IndexEntry>,
  key: string,
  label: string,
  t: TestimoniumRisolto,
  detail?: string,
  lingua?: 'grc' | 'lat',
) => {
  // Il dettaglio arriva già composto (es. `${operaAbbr} ${locus}`) e per le
  // opere senza sigla — Strabone, Pausania — comincerebbe con uno spazio, che
  // nella concatenazione diventa un doppio spazio a video.
  const d = detail?.trim() || undefined;
  let e = map.get(key);
  if (!e) { e = { key, label, refs: [], detail: d, lingua }; map.set(key, e); }
  if (d && e.detail && !e.detail.split(' · ').includes(d)) e.detail += ` · ${d}`;
  else if (d && !e.detail) e.detail = d;
  if (!e.refs.some(r => r.id === t.id)) e.refs.push({ id: t.id, label: citaBreve(t) });
  return e;
};

const sortEntries = (m: Map<string, IndexEntry>) =>
  [...m.values()].sort((a, b) => b.refs.length - a.refs.length || a.label.localeCompare(b.label, 'it'));

/**
 * Gli indici trasversali, sul modello di quelli del lessico LARES, più il
 * lessico cultuale e le categorie del toolbox ricavati dal markup del testo:
 * sono questi ultimi a far parlare la sezione e il corpus la stessa lingua.
 */
export function buildIndici(testimonia: TestimoniumRisolto[]): Indici {
  const opere = new Map<string, IndexEntry>();
  const autori = new Map<string, IndexEntry>();
  const termini = new Map<string, IndexEntry>();
  const divinita = new Map<string, IndexEntry>();
  const epiteti = new Map<string, IndexEntry>();
  const personaggi = new Map<string, IndexEntry>();
  const figure = new Map<string, IndexEntry>();
  const luoghi = new Map<string, IndexEntry>();
  const ambiti = new Map<string, IndexEntry>();
  const cultuale = new Map<string, IndexEntry>();
  const toolbox = new Map<string, IndexEntry>();

  for (const t of testimonia) {
    pushRef(opere, t.operaId || t.opera, `${t.autore}, ${t.opera}`, t, t.locus);
    pushRef(autori, t.autore, t.autore, t, `${t.operaAbbr} ${t.locus}`);
    for (const w of t.termini) pushRef(termini, w.lemma, w.lemma, t, w.forma !== w.lemma ? w.forma : undefined, t.lingua);
    for (const d of t.divinita || []) pushRef(divinita, d, d, t);
    for (const p of t.personaggi || []) pushRef(personaggi, p, p, t);
    for (const f of t.figure || []) pushRef(figure, f, f, t);
    for (const l of t.luoghi || []) pushRef(luoghi, l, l, t);
    for (const m of t.lares) pushRef(ambiti, m.ambito, AMBITO_LABELS[m.ambito], t, AMBITO_CAMPO[m.ambito]);

    // Dal markup, non da un campo compilato a mano.
    const mk = markupIndexOf(t);
    for (const c of mk.cultuale) pushRef(cultuale, c.lemma, c.lemma, t, `${c.forma}${c.family ? ` · ${c.family}` : ''}`, t.lingua);
    for (const d of mk.divinita) pushRef(divinita, d, d, t);
    for (const e of mk.epiteti) pushRef(epiteti, e, e, t);
    for (const l of mk.luoghi) pushRef(luoghi, l, l, t);
    for (const p of mk.persone) pushRef(figure, p, p, t);
    for (const p of mk.personaggi) pushRef(personaggi, p, p, t);
    for (const x of mk.toolbox) pushRef(toolbox, x.key, x.label, t, x.testo);
  }

  return {
    opere: sortEntries(opere),
    autori: sortEntries(autori),
    termini: sortEntries(termini),
    divinita: sortEntries(divinita),
    epiteti: sortEntries(epiteti),
    personaggi: sortEntries(personaggi),
    figure: sortEntries(figure),
    luoghi: sortEntries(luoghi),
    ambiti: sortEntries(ambiti),
    cultuale: sortEntries(cultuale),
    toolbox: sortEntries(toolbox),
  };
}

// ───────────────────────────────── ponte verso le pagine del corpus ────────

/**
 * Le testimonianze letterarie raggruppate per divinità e per epiteto, con le
 * stesse chiavi che il corpus epigrafico ricava dal proprio markup. È la
 * funzione che alimenta il blocco «Nelle fonti letterarie» nelle pagine
 * Divinità ed Epiteti.
 *
 * I conteggi restano separati da quelli epigrafici, di proposito: «12
 * attestazioni» in quelle pagine vuol dire dodici monumenti, e deve
 * continuare a volerlo dire. Un passo di Esiodo non è un'attestazione di
 * culto — è un'altra cosa, e va mostrata come un'altra cosa.
 */
export interface PonteLetterario {
  perDivinita: Map<string, TestimoniumRisolto[]>;
  perEpiteto: Map<string, TestimoniumRisolto[]>;
}

export function costruisciPonte(testimonia: TestimoniumRisolto[]): PonteLetterario {
  const perDivinita = new Map<string, TestimoniumRisolto[]>();
  const perEpiteto = new Map<string, TestimoniumRisolto[]>();
  const add = (m: Map<string, TestimoniumRisolto[]>, k: string, t: TestimoniumRisolto) => {
    const key = k.trim();
    if (!key) return;
    const lista = m.get(key) || [];
    if (!lista.some(x => x.id === t.id)) lista.push(t);
    m.set(key, lista);
  };

  for (const t of testimonia) {
    const mk = markupIndexOf(t);
    // Dal markup e dal campo compilato a mano: il primo è normalizzato sui
    // `key` del corpus, il secondo usa i nomi italiani della redazione. Si
    // registrano entrambi, e chi cerca trova con la chiave che ha.
    for (const d of [...mk.divinita, ...(t.divinita || [])]) add(perDivinita, d, t);
    for (const e of mk.epiteti) add(perEpiteto, e, t);
  }
  for (const lista of perDivinita.values()) lista.sort(perCronologia);
  for (const lista of perEpiteto.values()) lista.sort(perCronologia);
  return { perDivinita, perEpiteto };
}

// ───────────────────────────────────────────────── cache degli spogli ──────

/** Il parse del markup è puro e il testo cambia solo in redazione. */
const markupCache = new Map<string, LitMarkupIndex>();

export function markupIndexOf(t: Testimonium): LitMarkupIndex {
  const cached = markupCache.get(t.testo);
  if (cached) return cached;
  const idx = extractLitMarkupIndex(parseLitTesto(t.testo));
  markupCache.set(t.testo, idx);
  return idx;
}

const plainCache = new Map<string, string>();

/** Testo antico senza markup: anteprima nell'elenco e ricerca interna. */
export function testoPiano(testo: string): string {
  const cached = plainCache.get(testo);
  if (cached !== undefined) return cached;
  const out = plainTextOf(parseLitTesto(testo));
  plainCache.set(testo, out);
  return out;
}

// ─────────────────────────────────────────────────────────── statistiche ───

const annoLabel = (a: number) => (a < 0 ? `${Math.abs(a)} a.C.` : `${a} d.C.`);

export const arcoCronologico = (testimonia: TestimoniumRisolto[]) => {
  const anni = testimonia.map(t => t.datazioneSort);
  return anni.length ? `${annoLabel(Math.min(...anni))} – ${annoLabel(Math.max(...anni))}` : '—';
};

export interface SaggioStats {
  testimonianze: number;
  opere: number;
  autori: number;
  nuclei: number;
  termini: number;
  daCollazionare: number;
  /** testimonianze con almeno un elemento marcato nel testo */
  marcate: number;
  arco: string;
}

export function saggioStats(s: Saggio, tutte: TestimoniumRisolto[]): SaggioStats {
  const suoi = testimoniaDelSaggio(s, tutte);
  return {
    testimonianze: suoi.length,
    opere: new Set(suoi.map(t => t.operaId)).size,
    autori: new Set(suoi.map(t => t.autore)).size,
    nuclei: s.nuclei.length,
    termini: new Set(suoi.flatMap(t => t.termini.map(w => w.lemma))).size,
    daCollazionare: suoi.filter(t => t.collazione === 'da-collazionare').length,
    marcate: suoi.filter(t => markupIndexOf(t).marcature > 0).length,
    arco: arcoCronologico(suoi),
  };
}

export interface OperaStats {
  testimonianze: number;
  loci: string[];
}

/** Le opere effettivamente spogliate, con quante volte e dove. */
export function opereSpogliate(testimonia: TestimoniumRisolto[], opere: Opera[]): { opera: Opera; stats: OperaStats }[] {
  const usate = new Map<string, OperaStats>();
  for (const t of testimonia) {
    const s = usate.get(t.operaId) || { testimonianze: 0, loci: [] };
    s.testimonianze += 1;
    if (t.locus && !s.loci.includes(t.locus)) s.loci.push(t.locus);
    usate.set(t.operaId, s);
  }
  return opere
    .filter(o => usate.has(o.id))
    .map(o => ({ opera: o, stats: usate.get(o.id)! }))
    .sort((a, b) => a.opera.datazioneSort - b.opera.datazioneSort || a.opera.autore.localeCompare(b.opera.autore, 'it'));
}

// ─────────────────────────────────────────────────────────── citazioni ─────

/** Citazione breve normalizzata, es. «Hes. Th. 371–374». */
export const citaBreve = (t: TestimoniumRisolto) =>
  `${t.autoreAbbr} ${t.operaAbbr} ${t.locus}`.replace(/\s+/g, ' ').trim();

/** Citazione estesa per l'esportazione e la bibliografia. */
export const citaEstesa = (t: TestimoniumRisolto) => `${t.autore}, ${t.opera} ${t.locus}`;

/** Riferimento canonico citabile, quando l'opera porta un CTS URN. */
export const citaCts = (t: TestimoniumRisolto) =>
  t.operaRef.ctsUrn ? `${t.operaRef.ctsUrn}:${t.locus.replace(/\s/g, '')}` : undefined;

/**
 * Il «Catalogue of occurrences» delle schede LARES: le citazioni nude,
 * raggruppate per tipo di fonte e per autore. Non si scrive — si calcola.
 */
export function catalogoOccorrenze(testimonia: TestimoniumRisolto[]): { refType: RefType; righe: string[] }[] {
  const perTipo = new Map<RefType, Map<string, string[]>>();
  for (const t of [...testimonia].sort(perCronologia)) {
    const perAutore = perTipo.get(t.refType) || new Map<string, string[]>();
    const chiave = `${t.autoreAbbr || t.autore} ${t.operaAbbr}`.trim();
    const loci = perAutore.get(chiave) || [];
    if (!loci.includes(t.locus)) loci.push(t.locus);
    perAutore.set(chiave, loci);
    perTipo.set(t.refType, perAutore);
  }
  return (['lit', 'ins', 'pap'] as RefType[])
    .filter(r => perTipo.has(r))
    .map(refType => ({
      refType,
      righe: [...perTipo.get(refType)!.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'it'))
        .map(([chiave, loci]) => `${chiave} ${loci.join('; ')}`.trim()),
    }));
}

// ─────────────────────────────────────────────────────── ricerca interna ───

export const foldForSearch = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const searchableOf = (t: TestimoniumRisolto) =>
  foldForSearch([
    t.autore, t.autoreAbbr, t.opera, t.operaAbbr, t.locus,
    testoPiano(t.testo), t.traduzione, t.commento, t.edizione,
    ...t.termini.flatMap(w => [w.forma, w.lemma, w.nota || '']),
    ...(t.divinita || []), ...(t.personaggi || []), ...(t.figure || []), ...(t.luoghi || []),
    ...t.tipo.map(x => TIPO_LABELS[x]),
    GENERE_LABELS[t.genere],
    ...t.lares.map(m => `${m.campo} ${AMBITO_LABELS[m.ambito]}`),
  ].join(' '));

// ──────────────────────────────────────────────────────── export TEI ───────

const xmlEsc = (s: string) =>
  (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Serializza un saggio in TEI P5 / EpiDoc con l'impianto delle schede LARES:
 * le opere spogliate in <listBibl> dentro <sourceDesc>; ogni testimonianza un
 * <cit> con <quote> (il testo antico CON il suo markup inline, che è il
 * ponte reale col corpus), <bibl> che punta all'opera via <ref type="lit"> e
 * <citedRange>, e <note> di commento; i marcatori concettuali su @ana verso
 * la tassonomia dichiarata in <encodingDesc><classDecl>.
 *
 * L'obiettivo non è la validazione contro l'ODD di LARES, che non è
 * pubblico, ma un file che un redattore LARES possa importare senza dover
 * prima rimappare i campi.
 */
export function saggioToTei(s: Saggio, tutte: TestimoniumRisolto[], opere: Opera[]): string {
  const suoi = testimoniaDelSaggio(s, tutte);
  const byId = new Map(suoi.map(t => [t.id, t]));
  const sigle = sigleDelSaggio(s);
  const usate = opereSpogliate(suoi, opere);

  const taxonomy = LARES_GRID.map(c => `        <category xml:id="lares.${c.campo}">
          <catDesc xml:lang="it">${xmlEsc(c.label)}</catDesc>
          <catDesc xml:lang="en">${xmlEsc(c.en)}</catDesc>
${c.ambiti.map(a => `          <category xml:id="lares.${c.campo}.${a.id}">
            <catDesc xml:lang="it">${xmlEsc(a.label)}</catDesc>
            <catDesc xml:lang="en">${xmlEsc(a.en)}</catDesc>
          </category>`).join('\n')}
        </category>`).join('\n');

  const operaBibl = ({ opera: o }: { opera: Opera }) => `        <bibl xml:id="${xmlEsc(o.id)}" type="${o.refType}" ana="#genere.${o.genere}">
          <author>${xmlEsc(o.autore)}</author>
          <title xml:lang="${o.lingua}">${xmlEsc(o.titoloOriginale || o.titolo)}</title>
          <title type="short">${xmlEsc(`${o.autoreAbbr} ${o.titoloAbbr}`.trim())}</title>
          <date n="${o.datazioneSort}">${xmlEsc(o.datazione)}</date>
          <note type="edition">${xmlEsc(o.edizione)}</note>
${o.ctsUrn ? `          <idno type="CTS-URN">${xmlEsc(o.ctsUrn)}</idno>\n` : ''}${o.tlg ? `          <idno type="TLG">${xmlEsc(o.tlg)}</idno>\n` : ''}${(o.links || []).map(l => `          <ref type="external" target="${xmlEsc(l.url)}">${xmlEsc(l.label)}</ref>`).join('\n')}${(o.links || []).length ? '\n' : ''}${o.nota ? `          <note type="work">${xmlEsc(o.nota)}</note>\n` : ''}        </bibl>`;

  const cit = (t: TestimoniumRisolto) => {
    const ana = t.lares.map(m => `#lares.${m.campo}.${m.ambito}`).join(' ');
    const tipi = t.tipo.map(x => `#tipo.${x}`).join(' ');
    const terms = t.termini.map(w =>
      `          <term xml:lang="${t.lingua}" key="${xmlEsc(w.lemma)}">${xmlEsc(w.forma)}</term>`).join('\n');
    const keys = [
      ...(t.divinita || []).map(d => `          <rs type="divinity">${xmlEsc(d)}</rs>`),
      ...(t.personaggi || []).map(p => `          <rs type="mythChar">${xmlEsc(p)}</rs>`),
      ...(t.figure || []).map(f => `          <rs type="histFigure">${xmlEsc(f)}</rs>`),
      ...(t.luoghi || []).map(l => `          <placeName>${xmlEsc(l)}</placeName>`),
    ].join('\n');
    const links = (t.links || []).map(l =>
      `          <ref type="external" target="${xmlEsc(l.url)}">${xmlEsc(l.label)}</ref>`).join('\n');
    const biblio = (t.bibliografia || []).map(b => `          <bibl>${xmlEsc(b)}</bibl>`).join('\n');
    const cts = citaCts(t);
    // Il testo antico esce con il proprio markup inline: appiattirlo
    // significherebbe buttare via la sola cosa che lega davvero le due metà
    // del database. `testo` è già XML ben formato quando è marcato.
    const quote = t.testo.includes('<') ? t.testo : xmlEsc(t.testo);

    // I raggruppamenti stanno dentro <note type="…">: <listRelation> ammette
    // solo <relation>, e qui i figli sono <term>, <rs>, <placeName>, <ref>.
    return `      <cit xml:id="${xmlEsc(t.id)}" n="${xmlEsc(sigle.get(t.id) || '')}" ana="${ana}" corresp="${tipi}">
        <quote xml:lang="${t.lingua}">${quote}</quote>
        <quote xml:lang="it" type="translation" resp="${xmlEsc(t.traduttore)}">${xmlEsc(t.traduzione)}</quote>
        <bibl>
          <ref type="${t.refType}" target="#${xmlEsc(t.operaId)}">${xmlEsc(citaEstesa(t))}</ref>
          <citedRange unit="locus">${xmlEsc(t.locus)}</citedRange>
${cts ? `          <idno type="CTS-URN">${xmlEsc(cts)}</idno>\n` : ''}          <note type="edition">${xmlEsc(t.edizione)}</note>
          <note type="collation">${t.collazione}</note>
        </bibl>
${terms ? `        <note type="terms">\n${terms}\n        </note>\n` : ''}${keys ? `        <note type="entities">\n${keys}\n        </note>\n` : ''}${links ? `        <note type="links">\n${links}\n        </note>\n` : ''}${biblio ? `        <listBibl>\n${biblio}\n        </listBibl>\n` : ''}        <note type="commentary" xml:lang="it">${xmlEsc(t.commento)}</note>
      </cit>`;
  };

  const nuclei = s.nuclei.map(n => `    <div type="section" xml:id="${xmlEsc(n.id)}">
      <head>${xmlEsc(n.titolo)}</head>
      <p>${xmlEsc(n.cappello)}</p>
${n.testimonia.map(id => byId.get(id)).filter((t): t is TestimoniumRisolto => !!t).map(cit).join('\n')}
    </div>`).join('\n');

  const catalogo = catalogoOccorrenze(suoi).map(g => `      <div type="occurrences" subtype="${g.refType}">
        <head>${xmlEsc(REFTYPE_SEZIONI[g.refType])}</head>
${g.righe.map(r => `        <bibl>${xmlEsc(r)}</bibl>`).join('\n')}
      </div>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>${xmlEsc(s.lemma)}${s.lemmaGreco ? ` (${xmlEsc(s.lemmaGreco)})` : ''} — ${xmlEsc(s.sottotitolo)}</title>
        <respStmt><resp>redazione</resp><name>${xmlEsc(s.redazione)}</name></respStmt>
      </titleStmt>
      <publicationStmt>
        <authority>ILA — Index Lunae Antiquae</authority>
        <idno type="ILA">${xmlEsc(s.id)}</idno>
        <date>${xmlEsc(s.aggiornamento)}</date>
      </publicationStmt>
      <sourceDesc>
        <p>Spoglio ragionato delle fonti antiche. Modello di riferimento: LARES — Language and Religion (lares-lexicon.unibo.it).</p>
        <listBibl type="works">
          <head>Opere spogliate</head>
${usate.map(operaBibl).join('\n')}
        </listBibl>
      </sourceDesc>
    </fileDesc>
    <encodingDesc>
      <classDecl>
        <taxonomy xml:id="lares">
          <desc>Marcatori concettuali LARES: campi e ambiti.</desc>
${taxonomy}
        </taxonomy>
        <taxonomy xml:id="tipo">
          <desc>Tipologia della testimonianza (tassonomia ILA).</desc>
${TIPI.map(k => `          <category xml:id="tipo.${k}"><catDesc xml:lang="it">${xmlEsc(TIPO_LABELS[k])}</catDesc></category>`).join('\n')}
        </taxonomy>
        <taxonomy xml:id="genere">
          <desc>Genere letterario dell'opera spogliata.</desc>
${GENERI.map(k => `          <category xml:id="genere.${k}"><catDesc xml:lang="it">${xmlEsc(GENERE_LABELS[k])}</catDesc></category>`).join('\n')}
        </taxonomy>
      </classDecl>
    </encodingDesc>
  </teiHeader>
  <text>
    <body>
    <div type="entry" xml:id="${xmlEsc(s.id)}">
      <head>${xmlEsc(s.lemma)}</head>
${s.morfologia ? `      <div type="morphology"><head>Morfologia</head><p>${xmlEsc(s.morfologia)}</p></div>\n` : ''}${(s.etimologia || []).length ? `      <div type="etymology"><head>Etimologia</head>\n${(s.etimologia || []).map(p => `        <p>${xmlEsc(p)}</p>`).join('\n')}\n      </div>\n` : ''}${s.cappello.map(p => `      <p>${xmlEsc(p)}</p>`).join('\n')}
    </div>
${nuclei}
    <div type="occurrences">
      <head>Catalogo delle occorrenze</head>
${catalogo}
    </div>
    <div type="conclusion">
      <head>Discussione</head>
${s.sintesi.map(p => `      <p>${xmlEsc(p)}</p>`).join('\n')}
    </div>
    <div type="bibliography">
      <head>Bibliografia</head>
${(s.bibliografiaCorpora || []).length ? `      <listBibl type="corpora">\n        <head>Corpora</head>\n${(s.bibliografiaCorpora || []).map(b => `        <bibl>${xmlEsc(b)}</bibl>`).join('\n')}\n      </listBibl>\n` : ''}      <listBibl type="studies">
        <head>Studi</head>
${s.bibliografia.map(b => `        <bibl>${xmlEsc(b)}</bibl>`).join('\n')}
      </listBibl>
    </div>
    </body>
  </text>
</TEI>
`;
}
