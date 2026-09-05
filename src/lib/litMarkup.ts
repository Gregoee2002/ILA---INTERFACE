// litMarkup.ts — markup dei testi letterari, sopra al motore epigrafico.
//
// PERCHÉ LO STESSO MARKUP DELL'EPIGRAFIA.
// Il lessico LARES marca i termini greci e latini con `<w lemma="…">`, le
// fonti antiche con `<ref type="lit|ins|pap">` e le categorie tematiche con
// `<rs type="…" subtype="…">` (lares-lexicon.unibo.it). Il corpus epigrafico
// di ILA marca già le divinità con `<persName type="divine">` + `<name
// nymRef>` + `<rs type="epithet">` e il lessico cultuale con `<w lemma ana>`
// (vedi leidenMarkup.ts e docs/tassonomia-funzioni-cultuali.md). I due
// vocabolari coincidono: adottarne uno solo non è un'economia, è la
// condizione perché una parola marcata in Esiodo e la stessa parola marcata
// su una stele finiscano nello stesso indice.
//
// Perciò qui NON si inventa un secondo sistema. Si riusano:
//  - il tokenizer, le operazioni su percorsi e la validazione di leidenMarkup;
//  - le azioni di markup semanticamente comuni (divinità, persone, luoghi,
//    numeri, lessico cultuale), prese per id dal catalogo epigrafico;
// e si aggiunge solo ciò che nella pietra non esiste e nel libro sì: varianti
// di tradizione, parole citate in quanto parole, titoli, rimandi a fonti.
//
// DIFFERENZA DI SUPPORTO. In epigrafia `<lb/>` è la riga incisa, un fatto
// materiale. Qui è il verso (poesia) o l'accapo dell'edizione (prosa): resta
// utile per citare «vv. 3-4», ma non porta mai `break="no"`, che descrive una
// parola spezzata dalla pietra.

import {
  MarkupToken,
  MarkupAction,
  ValidationIssue,
  tokenize,
  serializeTokens,
  validateEditionTokens,
  MARKUP_ACTIONS,
} from './leidenMarkup';
import { lookupCultLemma, CULT_FAMILY_IDS, CULT_LEMMATA, matchCultLemma, lemmaRefFor } from './cultLexicon';
import { LARES_TOOLBOX, TOOLBOX_ITEM_IDS, toolboxItem, toolboxLabel, ToolboxMarker } from './laresToolbox';

export type { MarkupToken, MarkupAction, ValidationIssue };

const el = (name: string, attrs: Record<string, string>, children: MarkupToken[] = [], selfClosing = false): MarkupToken =>
  ({ kind: 'el', name, attrs, children, selfClosing });
const txt = (value: string): MarkupToken => ({ kind: 'text', value });


/**
 * Dal campo `testo` al flusso di token.
 *
 * Due forme convivono e devono continuare a convivere:
 *  - TESTO SEMPLICE (caso legacy, e il modo in cui si comincia a redigere):
 *    righe separate da newline, nessun tag. Ogni riga diventa un `<lb n>`.
 *  - MARKUP INLINE: la stessa cosa già marcata, con `<lb n="…"/>` espliciti.
 *
 * Lancia se il markup è malformato: chi chiama decide se mostrare l'errore o
 * ricadere sul testo piano (vedi safeParseLitTesto).
 */
export function parseLitTesto(testo: string): MarkupToken[] {
  const t = (testo || '').trim();
  if (!t) return [];

  if (!t.includes('<')) {
    const out: MarkupToken[] = [];
    t.split('\n').forEach((l, i) => {
      out.push(el('lb', { n: String(i + 1) }, [], true));
      if (l.trim()) out.push(txt(l.trim()));
    });
    return out;
  }

  // Un eventuale involucro <quote> è ridondante: il campo È già la citazione.
  let inner = t;
  const q = inner.match(/^<quote[^>]*>([\s\S]*)<\/quote>$/);
  if (q) inner = q[1];

  const tokens = tokenize(inner);
  normalizeWhitespace(tokens);
  return tokens;
}

export function safeParseLitTesto(testo: string): MarkupToken[] | null {
  try { return parseLitTesto(testo); } catch { return null; }
}

function normalizeWhitespace(tokens: MarkupToken[]): void {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    if (tok.kind === 'text') {
      tok.value = tok.value.replace(/\s*\n\s*/g, ' ');
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      if (!prev || (prev.kind === 'el' && prev.name === 'lb')) tok.value = tok.value.replace(/^\s+/, '');
      if (!next || (next.kind === 'el' && next.name === 'lb')) tok.value = tok.value.replace(/\s+$/, '');
      if (!tok.value) tokens.splice(i, 1);
    } else {
      normalizeWhitespace(tok.children);
    }
  }
}

/**
 * Dal flusso di token al campo `testo`: markup inline, un accapo prima di
 * ogni `<lb>`, numerazione dei versi ricalcolata. Nessun involucro `<quote>`
 * e nessuna indentazione: il valore finisce dentro un campo di dati, non in
 * un file XML impaginato (l'esportazione TEI lo avvolge lei).
 */
export function serializeLitTesto(tokens: MarkupToken[]): string {
  const copy: MarkupToken[] = JSON.parse(JSON.stringify(tokens));
  let n = 0;
  const renumber = (toks: MarkupToken[]) => {
    toks.forEach(tok => {
      if (tok.kind !== 'el') return;
      if (tok.name === 'lb') {
        n += 1;
        tok.attrs.n = String(n);
        // `break="no"` descrive una parola spezzata dalla pietra: nel libro
        // non ha referente, e va tolto se arriva da un incolla epigrafico.
        delete tok.attrs.break;
      } else renumber(tok.children);
    });
  };
  renumber(copy);

  const ser = (toks: MarkupToken[]): string =>
    toks.map(tok => {
      if (tok.kind === 'text') return escapeText(tok.value);
      const attrs = Object.entries(tok.attrs)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}"`)
        .join('');
      if (tok.name === 'lb') return `\n<lb${attrs}/>`;
      if (tok.selfClosing || (tok.children.length === 0 && ['gap', 'space'].includes(tok.name))) return `<${tok.name}${attrs}/>`;
      return `<${tok.name}${attrs}>${ser(tok.children)}</${tok.name}>`;
    }).join('');

  return ser(copy).replace(/^\n/, '');
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function plainTextOf(tokens: MarkupToken[]): string {
  const out: string[] = [];
  const walk = (toks: MarkupToken[]) => {
    for (const t of toks) {
      if (t.kind === 'text') { out.push(t.value); continue; }
      if (t.name === 'lb') { out.push('\n'); continue; }
      if (t.name === 'gap') { out.push('[…]'); continue; }
      // Nelle coppie correttive si legge la forma buona, mai quella superata.
      if (t.name === 'expan') { walkChild(t, 'abbr'); continue; }
      if (t.name === 'choice') { walkChild(t, 'corr'); continue; }
      if (t.name === 'subst') { walkChild(t, 'add'); continue; }
      if (t.name === 'app') { walkChild(t, 'lem'); continue; }
      walk(t.children);
    }
  };
  const walkChild = (t: MarkupToken & { kind: 'el' }, name: string) => {
    const c = t.children.find(x => x.kind === 'el' && x.name === name);
    if (c && c.kind === 'el') walk(c.children); else walk(t.children);
  };
  walk(tokens);
  return out.join('').replace(/^\n+/, '').replace(/[ \t]+\n/g, '\n').trim();
}


/**
 * Le azioni prese di peso dal catalogo epigrafico. Sono quelle che marcano
 * ENTITÀ e LESSICO, cioè le uniche i cui risultati devono confluire negli
 * stessi indici del corpus. Restano fuori quelle che descrivono la pietra e
 * il lapicida (vacat, lettere riscritte, nomi frammentari, legature): un
 * libro non ha un lapicida, e offrirle qui inviterebbe a marcature false.
 */
const CONDIVISE = [
  'divine', 'divine_freeform', 'person_attested', 'person_ruler', 'person_emperor',
  'patronymic', 'ethnic', 'office', 'official',
  'cult_word', 'cult_formula',
  'num', 'month', 'date_internal',
  'unclear', 'corr', 'surplus', 'orig', 'expan',
  'supplied_lost', 'gap_unknown', 'gap_quantity', 'gap_illegible',
];

const azioniCondivise: MarkupAction[] = CONDIVISE
  .map(id => MARKUP_ACTIONS.find(a => a.id === id))
  .filter((a): a is MarkupAction => !!a)
  .map(a => {
    // Le lacune, in un testo letterario, non sono la pietra rotta: sono il
    // guasto della tradizione manoscritta o del papiro. Stessa marcatura,
    // spiegazione diversa, altrimenti l'aiuto in linea mente.
    if (a.id.startsWith('gap') || a.id === 'supplied_lost') {
      return { ...a, group: 'Tradizione del testo' as MarkupAction['group'], hint: hintTradizione(a.id) || a.hint };
    }
    return a;
  });

function hintTradizione(id: string): string | undefined {
  switch (id) {
    case 'supplied_lost': return 'Integrazione dell\'editore dove la tradizione è guasta o il papiro lacunoso';
    case 'gap_unknown': return 'Lacuna della tradizione (papiro mutilo, codice guasto) di ampiezza ignota';
    case 'gap_quantity': return 'Lacuna di ampiezza nota o stimata (soprattutto papiri)';
    case 'gap_illegible': return 'Tracce illeggibili sul papiro o nel codice';
    default: return undefined;
  }
}

const WIT_HINT = 'sigla dei testimoni, es. «M», «codd.», «Wilamowitz»';

/**
 * Le voci del datalist del toolbox: ogni grado è selezionabile per sé, perché
 * non sempre si sa scendere fino alla sottocategoria — e una classificazione
 * approssimata ma vera vale più di una precisa e inventata.
 */
const TOOLBOX_PATHS: string[] = LARES_TOOLBOX.flatMap(item => [
  `${item.id} — ${item.label}`,
  ...item.categorie.flatMap(cat => [
    `${item.id}/${cat.id} — ${item.label} → ${cat.label}`,
    ...cat.sub.map(sub =>
      `${item.id}/${cat.id}/${sub.id} — ${item.label} → ${cat.label} → ${sub.label}${sub.esempi ? ` (${sub.esempi})` : ''}`),
  ]),
]);

/** Dal valore scelto nel datalist agli attributi: @type e @subtype separati da spazio. */
function toolboxAttrs(percorso: string): Record<string, string> {
  const path = (percorso || '').split(' — ')[0].trim();
  const parti = path.split('/').filter(Boolean);
  const attrs: Record<string, string> = { type: parti[0] || '' };
  const sub = parti.slice(1).join(' ');
  if (sub) attrs.subtype = sub;
  return attrs;
}

/**
 * Azioni proprie del testo letterario. Sono poche di proposito: ogni tag in
 * più è una decisione che qualcuno dovrà prendere su ogni passo.
 */
const azioniLetterarie: MarkupAction[] = [
  /* ── Nomi e luoghi ──
   * Due categorie che il catalogo epigrafico non copre e il testo letterario
   * sì. Finché non esistevano, «Carre» ed «Endimione» potevano stare solo nei
   * campi liberi della scheda: testo nudo, fuori dal markup e quindi fuori da
   * ogni normalizzazione. Ora hanno un tag, e l'indice li riceve dalla stessa
   * fonte di tutto il resto. */
  {
    id: 'place_name',
    label: 'Toponimo',
    glyph: 'Κάρραι',
    group: 'Nomi e luoghi',
    mode: 'wrap',
    hint: 'Città, regione, santuario nominati nel testo. Nell’epigrafia esiste solo l’etnico (Λύκιος): qui serve il nome del luogo',
    params: [
      { id: 'nymRef', label: 'Lemma (nominativo)', type: 'text', required: true, placeholder: 'Κάρραι' },
      { id: 'ref', label: 'URI Pleiades (se certo)', type: 'text', placeholder: 'https://pleiades.stoa.org/places/…', hint: 'mai dedotto' },
    ],
    build: (s, p) => el('placeName', { nymRef: p.nymRef, ...(p.ref ? { ref: p.ref } : {}) }, [txt(s)]),
    compose: (slice, p) => el('placeName', { nymRef: p.nymRef, ...(p.ref ? { ref: p.ref } : {}) }, slice),
  },
  {
    id: 'person_myth',
    label: 'Personaggio mitico',
    glyph: 'Ἐνδυμίων',
    group: 'Nomi e luoghi',
    mode: 'wrap',
    hint: 'Figura del mito che non è un dio e non è mai esistita: Endimione, Fetonte. Per gli dèi «Divinità», per gli uomini «Persona attestata»',
    params: [
      { id: 'key', label: 'Key (forma normalizzata)', type: 'text', required: true, placeholder: 'Endimione' },
      { id: 'nymRef', label: 'Lemma greco (nominativo)', type: 'text', placeholder: 'Ἐνδυμίων' },
    ],
    build: (s, p) => el('persName', { type: 'mythological', key: p.key },
      p.nymRef ? [el('name', { nymRef: p.nymRef }, [txt(s)])] : [txt(s)]),
    compose: (slice, p) => el('persName', { type: 'mythological', key: p.key },
      p.nymRef ? [el('name', { nymRef: p.nymRef }, slice)] : slice),
  },

  /* ── Parole ──
   * «Funzione cultuale (parola)» vincola il lemma ai 54 del vocabolario
   * controllato, ed è giusto che lo faccia. Ma una parola può meritare l'indice
   * senza appartenere al lessico cultuale — un dialettismo, un hapax, un
   * tecnicismo. Questa azione le dà il tag senza pretendere una famiglia: se
   * @ana manca, la parola entra nell'indice dei termini e non nel lessico. */
  {
    id: 'word_indexed',
    label: 'Parola notevole',
    glyph: 'σελήνη',
    group: 'Parole e citazioni',
    mode: 'wrap',
    hint: 'Parola degna dell\'indice ma fuori dal lessico cultuale. Perché sia notevole si dice nel commento, non qui',
    params: [
      { id: 'lemma', label: 'Lemma (forma di citazione)', type: 'text', required: true, placeholder: 'σελήνη' },
      { id: 'lang', label: 'Lingua', type: 'select', options: ['grc', 'lat'] },
    ],
    build: (s, p) => el('w', { lemma: p.lemma, ...(p.lang ? { 'xml:lang': p.lang } : {}) }, [txt(s)]),
    compose: (slice, p) => el('w', { lemma: p.lemma, ...(p.lang ? { 'xml:lang': p.lang } : {}) }, slice),
  },

  /* ── Tradizione del testo ── */
  {
    id: 'app_variant',
    label: 'Variante di tradizione',
    glyph: 'λέγει / φησί',
    group: 'Tradizione del testo',
    mode: 'wrap',
    hint: 'La selezione è la lezione accolta; indica la variante e i testimoni',
    params: [
      { id: 'witLem', label: 'Testimoni della lezione accolta', type: 'text', placeholder: 'codd.', hint: WIT_HINT },
      { id: 'rdg', label: 'Lezione alternativa', type: 'text', required: true, placeholder: 'forma tràdita o congetturata' },
      { id: 'witRdg', label: 'Testimoni della variante', type: 'text', placeholder: 'M · Wilamowitz' },
    ],
    build: (s, p) => el('app', {}, [
      el('lem', p.witLem ? { wit: p.witLem } : {}, [txt(s)]),
      el('rdg', p.witRdg ? { wit: p.witRdg } : {}, [txt(p.rdg)]),
    ]),
    compose: (slice, p) => el('app', {}, [
      el('lem', p.witLem ? { wit: p.witLem } : {}, slice),
      el('rdg', p.witRdg ? { wit: p.witRdg } : {}, [txt(p.rdg)]),
    ]),
  },
  {
    id: 'del_secluded',
    label: 'Espunzione dell\'editore',
    glyph: '[[αβγ]]',
    group: 'Tradizione del testo',
    mode: 'wrap',
    hint: 'Testo tràdito che l\'editore considera interpolato',
    params: [{ id: 'resp', label: 'Chi espunge', type: 'text', placeholder: 'West (opzionale)' }],
    build: (s, p) => el('surplus', p.resp ? { resp: p.resp } : {}, [txt(s)]),
    compose: (slice, p) => el('surplus', p.resp ? { resp: p.resp } : {}, slice),
  },

  /* ── Parole e citazioni ── */
  {
    id: 'mentioned',
    label: 'Parola citata in quanto parola',
    glyph: '«σελήνη»',
    group: 'Parole e citazioni',
    mode: 'wrap',
    hint: 'Il passo parla DELLA parola (etimologie, glosse): è il caso più frequente nei lessicografi',
    params: [
      { id: 'lemma', label: 'Lemma di indicizzazione', type: 'text', placeholder: 'σελήνη (opzionale)' },
      { id: 'lang', label: 'Lingua', type: 'select', options: ['grc', 'lat'] },
    ],
    build: (s, p) => el('mentioned', {
      ...(p.lemma ? { corresp: p.lemma } : {}),
      ...(p.lang ? { 'xml:lang': p.lang } : {}),
    }, [txt(s)]),
    compose: (slice, p) => el('mentioned', {
      ...(p.lemma ? { corresp: p.lemma } : {}),
      ...(p.lang ? { 'xml:lang': p.lang } : {}),
    }, slice),
  },
  {
    id: 'quote_inner',
    label: 'Citazione dentro la citazione',
    glyph: '“…”',
    group: 'Parole e citazioni',
    mode: 'wrap',
    hint: 'L\'autore cita a sua volta un altro testo o un discorso diretto',
    params: [{ id: 'source', label: 'Fonte citata', type: 'text', placeholder: 'Hom. Il. 1.1 (opzionale)' }],
    build: (s, p) => el('quote', p.source ? { source: p.source } : {}, [txt(s)]),
    compose: (slice, p) => el('quote', p.source ? { source: p.source } : {}, slice),
  },
  {
    id: 'title_work',
    label: 'Titolo d\'opera',
    glyph: 'Θεογονία',
    group: 'Parole e citazioni',
    mode: 'wrap',
    build: (s) => el('title', {}, [txt(s)]),
    compose: (slice) => el('title', {}, slice),
  },
  {
    id: 'source_ref',
    label: 'Rimando a una fonte antica',
    glyph: '<ref type="lit">',
    group: 'Parole e citazioni',
    mode: 'wrap',
    hint: 'Elemento del lessico LARES: distingue fonte letteraria, epigrafica e papiracea',
    params: [
      { id: 'type', label: 'Tipo di fonte', type: 'select', options: ['lit', 'ins', 'pap'], required: true },
      { id: 'target', label: 'Riferimento', type: 'text', placeholder: 'Hes. Th. 371 · CMRDM I 12 (opzionale)' },
    ],
    build: (s, p) => el('ref', { type: p.type || 'lit', ...(p.target ? { target: p.target } : {}) }, [txt(s)]),
    compose: (slice, p) => el('ref', { type: p.type || 'lit', ...(p.target ? { target: p.target } : {}) }, slice),
  },

  /* ── Toolbox LARES ── */
  {
    id: 'lares_toolbox',
    label: 'Categoria del toolbox LARES',
    glyph: '<rs type subtype>',
    group: 'Toolbox LARES',
    mode: 'wrap',
    hint: 'Classifica un segmento preciso del testo (non il passo intero) secondo l\'Analytical Toolbox: item → categoria → sottocategoria',
    params: [
      {
        id: 'percorso', label: 'Categoria', type: 'datalist', required: true,
        options: TOOLBOX_PATHS,
        placeholder: 'cerca: sacrificio, sacerdote, tempio…',
        hint: 'primo grado su @type, gli altri su @subtype (separati da spazio, come prescrive LARES)',
      },
    ],
    build: (s, p) => el('rs', toolboxAttrs(p.percorso), [txt(s)]),
    compose: (slice, p) => el('rs', toolboxAttrs(p.percorso), slice),
  },
];

export const LIT_MARKUP_ACTIONS: MarkupAction[] = [...azioniCondivise, ...azioniLetterarie];

/** Ordine dei gruppi nel menu del markup letterario. */
export const LIT_GROUP_ORDER = [
  'Nomi e luoghi',
  'Lessico cultuale',
  'Parole e citazioni',
  'Tradizione del testo',
  'Toolbox LARES',
  'Numeri e date',
  'Lettere e correzioni',
  'Lacune e integrazioni',
];



/**
 * Validazione del testo letterario: le regole epigrafiche che riguardano
 * entità e lessico valgono identiche (è il punto di usare lo stesso markup),
 * più i controlli propri di qui. Si scartano invece le diagnosi che parlano
 * della pietra, prive di senso in un libro.
 */
export function validateLitTokens(tokens: MarkupToken[]): ValidationIssue[] {
  let base: ValidationIssue[] = [];
  try {
    base = validateEditionTokens(tokens).filter(i =>
      !/break="no"|lapicida|pietra/i.test(i.message));
  } catch (e: any) {
    return [{ severity: 'error', line: 0, message: e.message }];
  }

  const issues: ValidationIssue[] = [...base];
  let lineN = 0;

  const walk = (toks: MarkupToken[]) => {
    for (const t of toks) {
      if (t.kind !== 'el') continue;
      if (t.name === 'lb') { lineN += 1; continue; }
      const a = t.attrs;

      if (t.name === 'app') {
        const lem = t.children.filter(c => c.kind === 'el' && c.name === 'lem');
        const rdg = t.children.filter(c => c.kind === 'el' && c.name === 'rdg');
        if (lem.length !== 1) {
          issues.push({ severity: 'error', line: lineN || 1, message: '<app> deve contenere esattamente un <lem> (la lezione accolta).' });
        }
        if (rdg.length === 0) {
          issues.push({ severity: 'warning', line: lineN || 1, message: '<app> senza <rdg>: un apparato con la sola lezione accolta non dice nulla.' });
        }
      }

      if (t.name === 'rs' && TOOLBOX_ITEM_IDS.includes(a.type || '')) {
        const item = toolboxItem(a.type!)!;
        for (const s of (a.subtype || '').split(/\s+/).filter(Boolean)) {
          const cat = item.categorie.find(c => c.id === s);
          const sub = item.categorie.flatMap(c => c.sub).find(x => x.id === s);
          if (!cat && !sub) {
            issues.push({
              severity: 'error', line: lineN || 1,
              message: `«${s}» non è una categoria di «${item.label}» nel toolbox LARES.`,
            });
          }
        }
      }

      if (t.name === 'ref' && !['lit', 'ins', 'pap', 'external'].includes(a.type || '')) {
        issues.push({ severity: 'warning', line: lineN || 1, message: `<ref type="${a.type || ''}">: in LARES i tipi di fonte sono lit, ins, pap.` });
      }

      walk(t.children);
    }
  };
  walk(tokens);
  return issues;
}


export interface ParolaIndicizzata {
  forma: string;
  lemma: string;
  lang?: string;
}

export interface CultOccorrenza {
  forma: string;
  lemma: string;
  family: string;
  subFunction?: string;
}

export interface LitMarkupIndex {
  divinita: string[];
  epiteti: string[];
  /** figure storiche: <persName type="attested|ruler|emperor"> */
  persone: string[];
  /** personaggi mitici: <persName type="mythological"> */
  personaggi: string[];
  luoghi: string[];
  /** parole del lessico cultuale marcate con <w lemma ana> */
  cultuale: CultOccorrenza[];
  /** parole notevoli fuori dal lessico cultuale: <w lemma> senza @ana */
  parole: ParolaIndicizzata[];
  /** parole citate in quanto parole (<mentioned>) */
  mentioned: string[];
  /** categorie dell'Analytical Toolbox applicate a segmenti del testo */
  toolbox: { key: string; label: string; testo: string; marker: ToolboxMarker }[];
  /** rimandi a fonti antiche marcati nel testo */
  rimandi: { type: string; testo: string; target?: string }[];
  /** quante marcature semantiche in tutto: 0 = testo non ancora marcato */
  marcature: number;
}

const testoDi = (t: MarkupToken): string => {
  if (t.kind === 'text') return t.value;
  if (t.name === 'lb') return ' ';
  return t.children.map(testoDi).join('');
};

/**
 * Ricava dagli elementi marcati nel testo gli stessi indici che il corpus
 * epigrafico ricava dal proprio: divinità, epiteti, persone, luoghi e lessico
 * cultuale. È la funzione che tiene insieme le due metà del database — senza
 * di essa il markup letterario sarebbe decorazione.
 */
export function extractLitMarkupIndex(tokens: MarkupToken[]): LitMarkupIndex {
  const divinita = new Set<string>();
  const epiteti = new Set<string>();
  const persone = new Set<string>();
  const personaggi = new Set<string>();
  const luoghi = new Set<string>();
  const mentioned = new Set<string>();
  const cultuale: CultOccorrenza[] = [];
  const parole: ParolaIndicizzata[] = [];
  const toolbox: LitMarkupIndex['toolbox'] = [];
  const rimandi: LitMarkupIndex['rimandi'] = [];
  let marcature = 0;

  const walk = (toks: MarkupToken[]) => {
    for (const t of toks) {
      if (t.kind !== 'el') continue;
      const a = t.attrs;

      if (t.name === 'persName') {
        marcature += 1;
        const key = (a.key || '').trim();
        if (a.type === 'divine') {
          // Stessa lettura di leidenMarkup.extractIndexSuggestions: il key è
          // canonico, i primi token sono il teonimo, il resto sono epiteti.
          const nameChildren = t.children
            .filter(c => c.kind === 'el' && c.name === 'name')
            .map(c => testoDi(c).trim())
            .filter(Boolean);
          if (key) {
            const parts = key.split(/\s+/);
            const nameCount = nameChildren.length > 0 ? nameChildren.length : 1;
            const div = parts.slice(0, nameCount).join(' ');
            if (div) divinita.add(div);
            parts.slice(nameCount).forEach(e => { if (e) epiteti.add(e); });
          } else if (nameChildren.length > 0) {
            divinita.add(nameChildren.join(' '));
          } else {
            divinita.add(testoDi(t).trim());
          }
        } else if (a.type === 'mythological') {
          personaggi.add(key || testoDi(t).trim());
        } else if (key) {
          persone.add(key);
        }
      }

      if (t.name === 'placeName') {
        marcature += 1;
        luoghi.add((a.nymRef || testoDi(t)).trim());
      }

      if (t.name === 'w' && a.lemma) {
        marcature += 1;
        const known = lookupCultLemma(a.lemma);
        const family = (a.ana || '').split(/\s+/).map(x => x.replace(/^#/, ''))
          .find(x => (CULT_FAMILY_IDS as readonly string[]).includes(x)) || known?.family || '';
        // Senza famiglia la parola è notevole ma non cultuale: va nell'indice
        // dei termini, non nel lessico. Confonderle falserebbe il lessico.
        if (family) {
          cultuale.push({
            forma: testoDi(t).trim(),
            lemma: a.lemma,
            family,
            subFunction: known?.subFunction,
          });
        } else {
          parole.push({ forma: testoDi(t).trim(), lemma: a.lemma, lang: a['xml:lang'] });
        }
        // Dal merge coi marcatori LARES il <w> cultuale porta anche il percorso
        // del toolbox (docs/merge-lessico-lares.md §7): entra nell'indice del
        // toolbox come un <rs>, senza contare due volte la marcatura.
        if (TOOLBOX_ITEM_IDS.includes(a.type || '')) {
          const marker: ToolboxMarker = { item: a.type!, subtype: (a.subtype || '').split(/\s+/).filter(Boolean) };
          toolbox.push({
            key: [marker.item, ...marker.subtype].join('/'),
            label: toolboxLabel(marker),
            testo: testoDi(t).trim(),
            marker,
          });
        }
      }

      if (t.name === 'rs' && a.type === 'cultFormula') {
        marcature += 1;
        cultuale.push({ forma: testoDi(t).trim(), lemma: a.key || testoDi(t).trim(), family: 'formula-fissa' });
      }

      if (t.name === 'mentioned') {
        marcature += 1;
        mentioned.add((a.corresp || testoDi(t)).trim());
      }

      if (t.name === 'rs' && TOOLBOX_ITEM_IDS.includes(a.type || '')) {
        marcature += 1;
        const marker: ToolboxMarker = { item: a.type!, subtype: (a.subtype || '').split(/\s+/).filter(Boolean) };
        toolbox.push({
          key: [marker.item, ...marker.subtype].join('/'),
          label: toolboxLabel(marker),
          testo: testoDi(t).trim(),
          marker,
        });
      }

      if (t.name === 'ref' && a.type && a.type !== 'external') {
        marcature += 1;
        rimandi.push({ type: a.type, testo: testoDi(t).trim(), target: a.target });
      }

      walk(t.children);
    }
  };
  walk(tokens);

  return {
    divinita: [...divinita],
    epiteti: [...epiteti],
    persone: [...persone],
    personaggi: [...personaggi],
    luoghi: [...luoghi],
    cultuale,
    parole,
    mentioned: [...mentioned],
    toolbox,
    rimandi,
    marcature,
  };
}

/**
 * Suggerisce le parole del lessico cultuale presenti nel testo ma non ancora
 * marcate. Non marca niente da sé: propone, e la decisione resta redazionale
 * — la stessa regola dello scanner diagnostico del corpus.
 */
export function suggerisciLessico(tokens: MarkupToken[]): { forma: string; lemma: string; family: string }[] {
  const out: { forma: string; lemma: string; family: string }[] = [];
  const visti = new Set<string>();
  const walk = (toks: MarkupToken[], dentroW: boolean) => {
    for (const t of toks) {
      if (t.kind === 'text') {
        if (dentroW) continue;
        for (const parola of t.value.split(/[\s·,.;:·]+/)) {
          const pulita = parola.trim();
          if (pulita.length < 3 || visti.has(pulita)) continue;
          const m = matchCultLemma(pulita);
          if (m) { visti.add(pulita); out.push({ forma: pulita, lemma: m.lemma, family: m.family }); }
        }
        continue;
      }
      walk(t.children, dentroW || t.name === 'w');
    }
  };
  walk(tokens, false);
  return out;
}

export { CULT_LEMMATA, CULT_FAMILY_IDS, lemmaRefFor, serializeTokens };
