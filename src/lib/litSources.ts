// ═══════════════════════════════════════════════════════════════════════
// litSources.ts — modello dati delle FONTI LETTERARIE di ILA.
// ═══════════════════════════════════════════════════════════════════════
//
// La sezione «Fonti letterarie» non è un secondo catalogo epigrafico: è una
// RACCOLTA RAGIONATA di testimonianze letterarie greche e latine, organizzata
// per voce (Selene, Men, Lunus…) e, dentro la voce, per nuclei tematici.
// Il corpus epigrafico risponde alla domanda «che cosa si scriveva sulla
// pietra»; questa sezione risponde a «che cosa si diceva nei testi», e le due
// risposte vanno lette una contro l'altra.
//
// MODELLO DI RIFERIMENTO — LARES
// (Language and Religion: Lexical Change and Variation in Religious
// Enculturation / Acculturation phenomena of the Ancient World; Bologna,
// Helsinki, Kraków, Complutense — lares-lexicon.unibo.it).
// Da LARES ereditiamo tre scelte, non l'implementazione:
//
//  1. la CITAZIONE è l'unità minima marcata, con @type lit|ins|pap
//     (qui `refType`) — vedi <ref type="lit"> del markup LARES;
//  2. gli INDICI TRASVERSALI sono quelli del lessico LARES — fonti, ambiti,
//     termini, personaggi (mitici), figure (storiche), luoghi;
//  3. la GRIGLIA CONCETTUALE a tre campi × tre ambiti (rappresentazione:
//     pratica/credenza/finzione; comunicazione: segno/significato/parola;
//     fruizione: sistemi/strumenti/strutture), con cui LARES classifica
//     la religione come sistema di comunicazione simbolica.
//
// Ogni testimonianza porta quindi una o più coppie campo/ambito LARES
// (`lares`) accanto alla tassonomia interna di ILA (`tipo`). Il serializzatore
// `voceToTei` in fondo a questo file produce TEI conforme alla stessa logica,
// così una voce ILA è riversabile nel lessico LARES senza rimappature.
//
// I dati vivono in src/data/fontiLetterarie.ts come modulo TypeScript: sono
// contenuto redazionale, non corpus, e devono funzionare identici sulla build
// statica GitHub Pages (nessuna chiamata di rete, nessun passaggio da apiShim).

// ───────────────────────────────────────────────────────────── vocabolari ──

/** @type di <ref> in LARES: la natura del supporto della testimonianza. */
export type RefType = 'lit' | 'ins' | 'pap';

/** Genere letterario della fonte. Vocabolario chiuso, ampliabile. */
export type Genere =
  | 'epica'
  | 'inno'
  | 'lirica'
  | 'tragedia'
  | 'commedia'
  | 'filosofia'
  | 'storiografia'
  | 'geografia'
  | 'mitografia'
  | 'lessicografia'
  | 'poesia-ellenistica'
  | 'biografia'
  | 'antiquaria'
  | 'periegesi';

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
};

/**
 * Che cosa fa il passo rispetto alla divinità lunare. È la tassonomia
 * propria di ILA — più fine del semplice «attestazione» — e serve a
 * distinguere una genealogia da una notizia di culto o da un'etimologia.
 */
export type TipoTestimonianza =
  | 'genealogia'
  | 'menzione-diretta'
  | 'etimologia'
  | 'epiclesi'
  | 'notizia-cultuale'
  | 'descrizione-rituale'
  | 'descrizione-iconografica'
  | 'allegoria'
  | 'assimilazione'
  | 'invocazione'
  | 'aition'
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

// ── griglia concettuale LARES ──────────────────────────────────────────────
// Tre campi, tre ambiti ciascuno. Vedi site.unibo.it/lares/en/lexicon.

export type LaresCampo = 'rappresentazione' | 'comunicazione' | 'fruizione';

export type LaresAmbito =
  // rappresentazione
  | 'pratica' | 'credenza' | 'finzione'
  // comunicazione
  | 'segno' | 'significato' | 'parola'
  // fruizione
  | 'sistemi' | 'strumenti' | 'strutture';

export interface LaresMarker {
  campo: LaresCampo;
  ambito: LaresAmbito;
}

export const LARES_GRID: { campo: LaresCampo; label: string; en: string; ambiti: { id: LaresAmbito; label: string; en: string }[] }[] = [
  {
    campo: 'rappresentazione',
    label: 'Rappresentazione',
    en: 'representation',
    ambiti: [
      { id: 'pratica', label: 'pratica', en: 'practice' },
      { id: 'credenza', label: 'credenza', en: 'belief' },
      { id: 'finzione', label: 'finzione', en: 'fiction' },
    ],
  },
  {
    campo: 'comunicazione',
    label: 'Comunicazione',
    en: 'communication',
    ambiti: [
      { id: 'segno', label: 'segno', en: 'sign' },
      { id: 'significato', label: 'significato', en: 'meaning' },
      { id: 'parola', label: 'parola', en: 'speech' },
    ],
  },
  {
    campo: 'fruizione',
    label: 'Fruizione',
    en: 'fruition',
    ambiti: [
      { id: 'sistemi', label: 'sistemi', en: 'systems' },
      { id: 'strumenti', label: 'strumenti', en: 'instruments' },
      { id: 'strutture', label: 'strutture', en: 'structures' },
    ],
  },
];

export const AMBITO_LABELS: Record<LaresAmbito, string> = LARES_GRID.reduce(
  (acc, c) => { c.ambiti.forEach(a => { acc[a.id] = a.label; }); return acc; },
  {} as Record<LaresAmbito, string>,
);

export const AMBITO_CAMPO: Record<LaresAmbito, LaresCampo> = LARES_GRID.reduce(
  (acc, c) => { c.ambiti.forEach(a => { acc[a.id] = c.campo; }); return acc; },
  {} as Record<LaresAmbito, LaresCampo>,
);

/**
 * Una tinta per campo LARES, coerente con la palette terrosa del progetto.
 * Nessuna delle tre coincide con --lit (l'ocra della sezione), altrimenti i
 * marcatori concettuali si confonderebbero con i chip di genere letterario.
 */
export const CAMPO_COLOR: Record<LaresCampo, string> = {
  rappresentazione: '#A85250', // terracotta
  comunicazione: '#6E8BAB',    // grigio-blu polvere
  fruizione: '#7B8F6A',        // verde salvia
};

// ─────────────────────────────────────────────────────────────── entità ────

/**
 * Stato di collazione del testo antico riprodotto nella scheda. Nessuna
 * trascrizione è «vera» finché non è stata riscontrata sull'edizione
 * cartacea indicata in `edizione`: il campo rende esplicito questo debito
 * invece di nasconderlo, e alimenta il contatore in testa alla voce.
 */
export type Collazione = 'verificato' | 'da-collazionare';

/** Un termine notevole del passo: la forma attestata e il lemma sotto cui va indicizzata. */
export interface TerminNotevole {
  /** forma come compare nel testo, es. «σελάννα» */
  forma: string;
  /** lemma di indicizzazione, es. «σελήνη» */
  lemma: string;
  /** perché è notevole (dialetto, hapax, tecnicismo cultuale…) */
  nota?: string;
}

/** Ponte verso il catalogo epigrafico: una ricerca già pronta sul corpus. */
export interface CorpusPonte {
  label: string;
  /** stringa immessa nel campo di ricerca del catalogo */
  q: string;
}

export interface LinkEsterno {
  label: string;
  url: string;
}

/**
 * Una singola testimonianza letteraria — l'unità della sezione, l'equivalente
 * della scheda per il catalogo epigrafico.
 */
export interface Testimonium {
  /** identificatore stabile e citabile, es. «ILA-LIT-selene-01» */
  id: string;
  /** sigla breve interna alla voce, es. «T1» */
  sigla: string;

  // — fonte —
  autore: string;
  /** forma latina/convenzionale usata nelle abbreviazioni, es. «Hes.» */
  autoreAbbr: string;
  opera: string;
  operaAbbr: string;
  /** riferimento canonico dentro l'opera, es. «371–374» */
  locus: string;
  lingua: 'grc' | 'lat';
  refType: RefType;
  /** datazione discorsiva dell'opera */
  datazione: string;
  /** anno indicativo per l'ordinamento cronologico (negativo = a.C.) */
  datazioneSort: number;
  genere: Genere;

  // — testo —
  testo: string;
  traduzione: string;
  /** edizione di riferimento del testo riprodotto */
  edizione: string;
  /** chi firma la traduzione */
  traduttore: string;
  collazione: Collazione;

  // — analisi —
  tipo: TipoTestimonianza[];
  lares: LaresMarker[];
  commento: string;
  termini: TerminNotevole[];

  // — indici —
  divinita?: string[];
  /** personaggi mitici */
  personaggi?: string[];
  /** figure storiche */
  figure?: string[];
  luoghi?: string[];

  // — rimandi —
  corpus?: CorpusPonte[];
  links?: LinkEsterno[];
  bibliografia?: string[];
}

/** Raggruppamento tematico dei testimonia dentro una voce. */
export interface Nucleo {
  id: string;
  titolo: string;
  cappello: string;
  /** sigle dei testimonia, nell'ordine di lettura voluto */
  testimonia: string[];
}

/** Una voce del repertorio: Selene, Men, Lunus… */
export interface Voce {
  id: string;
  lemma: string;
  lemmaGreco?: string;
  traslitterazione?: string;
  sottotitolo: string;
  /** paragrafi introduttivi */
  cappello: string[];
  nuclei: Nucleo[];
  testimonia: Testimonium[];
  /** paragrafi conclusivi: che cosa i testi dicono e che cosa tacciono */
  sintesi: string[];
  bibliografia: string[];
  redazione: string;
  aggiornamento: string;
  /** voci collegate ancora da redigere */
  vociCollegate?: string[];
}

// ────────────────────────────────────────────────────────────── indici ─────

export interface VoceRef {
  /** sigla del testimonium */
  sigla: string;
  id: string;
}

export interface IndexEntry {
  key: string;
  /** etichetta visualizzata */
  label: string;
  /** dettaglio secondario (es. le forme attestate di un lemma) */
  detail?: string;
  /**
   * Lingua della voce d'indice, quando ne ha una. L'indice dei termini
   * mescola lemmi greci e latini: senza questo campo il pannello marcherebbe
   * `lang="grc"` anche su «luna» o «Noctiluca». Resta indefinita quando la
   * voce non è una parola di una lingua antica (fonti, ambiti, luoghi…).
   */
  lingua?: 'grc' | 'lat';
  refs: VoceRef[];
}

export interface VoceIndici {
  fonti: IndexEntry[];
  termini: IndexEntry[];
  divinita: IndexEntry[];
  personaggi: IndexEntry[];
  figure: IndexEntry[];
  luoghi: IndexEntry[];
  ambiti: IndexEntry[];
}

const pushRef = (
  map: Map<string, IndexEntry>,
  key: string,
  label: string,
  t: Testimonium,
  detail?: string,
  lingua?: 'grc' | 'lat',
) => {
  // Il dettaglio arriva già composto (es. `${operaAbbr} ${locus}`) e per le
  // opere senza sigla d'abbreviazione — Strabone, Pausania — comincerebbe con
  // uno spazio, che nella concatenazione diventa un doppio spazio a video.
  const d = detail?.trim() || undefined;
  let e = map.get(key);
  if (!e) { e = { key, label, refs: [], detail: d, lingua }; map.set(key, e); }
  if (d && e.detail && !e.detail.split(' · ').includes(d)) e.detail += ` · ${d}`;
  else if (d && !e.detail) e.detail = d;
  if (!e.refs.some(r => r.sigla === t.sigla)) e.refs.push({ sigla: t.sigla, id: t.id });
  return e;
};

const sortEntries = (m: Map<string, IndexEntry>) =>
  [...m.values()].sort((a, b) => b.refs.length - a.refs.length || a.label.localeCompare(b.label, 'it'));

/**
 * Costruisce gli indici trasversali della voce, sul modello degli indici del
 * lessico LARES (fonti · ambiti · termini · personaggi · figure · luoghi).
 */
export function buildIndici(testimonia: Testimonium[]): VoceIndici {
  const fonti = new Map<string, IndexEntry>();
  const termini = new Map<string, IndexEntry>();
  const divinita = new Map<string, IndexEntry>();
  const personaggi = new Map<string, IndexEntry>();
  const figure = new Map<string, IndexEntry>();
  const luoghi = new Map<string, IndexEntry>();
  const ambiti = new Map<string, IndexEntry>();

  for (const t of testimonia) {
    pushRef(fonti, t.autore, t.autore, t, `${t.operaAbbr} ${t.locus}`);
    for (const w of t.termini) pushRef(termini, w.lemma, w.lemma, t, w.forma !== w.lemma ? w.forma : undefined, t.lingua);
    for (const d of t.divinita || []) pushRef(divinita, d, d, t);
    for (const p of t.personaggi || []) pushRef(personaggi, p, p, t);
    for (const f of t.figure || []) pushRef(figure, f, f, t);
    for (const l of t.luoghi || []) pushRef(luoghi, l, l, t);
    for (const m of t.lares) pushRef(ambiti, m.ambito, AMBITO_LABELS[m.ambito], t, AMBITO_CAMPO[m.ambito]);
  }

  return {
    fonti: sortEntries(fonti),
    termini: sortEntries(termini),
    divinita: sortEntries(divinita),
    personaggi: sortEntries(personaggi),
    figure: sortEntries(figure),
    luoghi: sortEntries(luoghi),
    ambiti: sortEntries(ambiti),
  };
}

/**
 * Una voce non ancora redatta, elencata accanto a quelle esistenti perché
 * l'indice dica anche che cosa manca — come il catalogo dichiara le schede
 * incomplete invece di ometterle.
 */
export interface VoceInPreparazione {
  lemma: string;
  lemmaGreco?: string;
  nota: string;
}

export interface VoceStats {
  testimonianze: number;
  fonti: number;
  nuclei: number;
  termini: number;
  daCollazionare: number;
  /** arco cronologico delle fonti, già formattato */
  arco: string;
}

const annoLabel = (a: number) =>
  a < 0 ? `${Math.abs(a)} a.C.` : `${a} d.C.`;

/** Numeri di riepilogo di una voce, per la riga d'indice e la testata. */
export function voceStats(v: Voce): VoceStats {
  const anni = v.testimonia.map(t => t.datazioneSort);
  const fonti = new Set(v.testimonia.map(t => t.autore));
  const termini = new Set(v.testimonia.flatMap(t => t.termini.map(w => w.lemma)));
  return {
    testimonianze: v.testimonia.length,
    fonti: fonti.size,
    nuclei: v.nuclei.length,
    termini: termini.size,
    daCollazionare: v.testimonia.filter(t => t.collazione === 'da-collazionare').length,
    arco: anni.length ? `${annoLabel(Math.min(...anni))} – ${annoLabel(Math.max(...anni))}` : '—',
  };
}

/** Citazione breve normalizzata, es. «Hes. Th. 371–374». */
export const citaBreve = (t: Testimonium) => `${t.autoreAbbr} ${t.operaAbbr} ${t.locus}`.replace(/\s+/g, ' ').trim();

/** Citazione estesa per l'esportazione e la bibliografia. */
export const citaEstesa = (t: Testimonium) => `${t.autore}, ${t.opera} ${t.locus}`;

// ─────────────────────────────────────────────────────── ricerca interna ───

export const foldForSearch = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tutto il testo indicizzabile di un testimonium, per il filtro libero. */
export const searchableOf = (t: Testimonium) =>
  foldForSearch([
    t.autore, t.autoreAbbr, t.opera, t.operaAbbr, t.locus, t.sigla,
    t.testo, t.traduzione, t.commento, t.edizione,
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
 * Serializza una voce in TEI P5 / EpiDoc, con lo stesso impianto del lessico
 * LARES: ogni testimonianza è un <cit> con <quote> (testo antico), <bibl>
 * (riferimento canonico via <ref type="lit">) e <note> di commento; i
 * marcatori concettuali passano su @ana con puntatori alla tassonomia
 * dichiarata in <encodingDesc><classDecl>.
 *
 * L'obiettivo non è la validazione formale contro l'ODD di LARES — che non è
 * pubblico — ma un file che un redattore LARES possa importare senza dover
 * prima rimappare i campi.
 */
export function voceToTei(v: Voce): string {
  const bySigla = new Map(v.testimonia.map(t => [t.sigla, t]));

  const taxonomy = LARES_GRID.map(c => `        <category xml:id="lares.${c.campo}">
          <catDesc xml:lang="it">${xmlEsc(c.label)}</catDesc>
          <catDesc xml:lang="en">${xmlEsc(c.en)}</catDesc>
${c.ambiti.map(a => `          <category xml:id="lares.${c.campo}.${a.id}">
            <catDesc xml:lang="it">${xmlEsc(a.label)}</catDesc>
            <catDesc xml:lang="en">${xmlEsc(a.en)}</catDesc>
          </category>`).join('\n')}
        </category>`).join('\n');

  const cit = (t: Testimonium) => {
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
    const corpus = (t.corpus || []).map(c =>
      `          <ref type="ins" target="ILA?q=${encodeURIComponent(c.q)}">${xmlEsc(c.label)}</ref>`).join('\n');
    const links = (t.links || []).map(l =>
      `          <ref type="external" target="${xmlEsc(l.url)}">${xmlEsc(l.label)}</ref>`).join('\n');
    const biblio = (t.bibliografia || []).map(b => `          <bibl>${xmlEsc(b)}</bibl>`).join('\n');

    // I raggruppamenti stanno dentro <note type="…">: <listRelation> ammette
    // solo <relation>, e qui i figli sono <term>, <rs>, <placeName>, <ref>.
    return `      <cit xml:id="${xmlEsc(t.id)}" n="${xmlEsc(t.sigla)}" ana="${ana}" corresp="${tipi}">
        <quote xml:lang="${t.lingua}">${xmlEsc(t.testo)}</quote>
        <quote xml:lang="it" type="translation" resp="${xmlEsc(t.traduttore)}">${xmlEsc(t.traduzione)}</quote>
        <bibl>
          <ref type="${t.refType}">${xmlEsc(citaEstesa(t))}</ref>
          <date n="${t.datazioneSort}">${xmlEsc(t.datazione)}</date>
          <note type="edition">${xmlEsc(t.edizione)}</note>
          <note type="collation">${t.collazione}</note>
        </bibl>
${terms ? `        <note type="terms">\n${terms}\n        </note>\n` : ''}${keys ? `        <note type="entities">\n${keys}\n        </note>\n` : ''}${corpus || links ? `        <note type="links">\n${[corpus, links].filter(Boolean).join('\n')}\n        </note>\n` : ''}${biblio ? `        <listBibl>\n${biblio}\n        </listBibl>\n` : ''}        <note type="commentary" xml:lang="it">${xmlEsc(t.commento)}</note>
      </cit>`;
  };

  const nuclei = v.nuclei.map(n => `    <div type="section" xml:id="${xmlEsc(n.id)}">
      <head>${xmlEsc(n.titolo)}</head>
      <p>${xmlEsc(n.cappello)}</p>
${n.testimonia.map(s => bySigla.get(s)).filter((t): t is Testimonium => !!t).map(cit).join('\n')}
    </div>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>${xmlEsc(v.lemma)}${v.lemmaGreco ? ` (${xmlEsc(v.lemmaGreco)})` : ''} — ${xmlEsc(v.sottotitolo)}</title>
        <respStmt><resp>redazione</resp><name>${xmlEsc(v.redazione)}</name></respStmt>
      </titleStmt>
      <publicationStmt>
        <authority>ILA — Index Lunae Antiquae</authority>
        <idno type="ILA">${xmlEsc(v.id)}</idno>
        <date>${xmlEsc(v.aggiornamento)}</date>
      </publicationStmt>
      <sourceDesc>
        <p>Raccolta ragionata di testimonianze letterarie. Modello di riferimento: LARES — Language and Religion (lares-lexicon.unibo.it).</p>
      </sourceDesc>
    </fileDesc>
    <encodingDesc>
      <classDecl>
        <taxonomy xml:id="lares">
          <desc>Griglia concettuale LARES: campi e ambiti.</desc>
${taxonomy}
        </taxonomy>
        <taxonomy xml:id="tipo">
          <desc>Tipologia della testimonianza (tassonomia ILA).</desc>
${(Object.keys(TIPO_LABELS) as TipoTestimonianza[]).map(k =>
  `          <category xml:id="tipo.${k}"><catDesc xml:lang="it">${xmlEsc(TIPO_LABELS[k])}</catDesc></category>`).join('\n')}
        </taxonomy>
      </classDecl>
    </encodingDesc>
  </teiHeader>
  <text>
    <body>
    <div type="entry" xml:id="${xmlEsc(v.id)}">
      <head>${xmlEsc(v.lemma)}</head>
${v.cappello.map(p => `      <p>${xmlEsc(p)}</p>`).join('\n')}
    </div>
${nuclei}
    <div type="conclusion">
      <head>Sintesi</head>
${v.sintesi.map(p => `      <p>${xmlEsc(p)}</p>`).join('\n')}
    </div>
    <div type="bibliography">
      <head>Bibliografia</head>
      <listBibl>
${v.bibliografia.map(b => `        <bibl>${xmlEsc(b)}</bibl>`).join('\n')}
      </listBibl>
    </div>
    </body>
  </text>
</TEI>
`;
}
