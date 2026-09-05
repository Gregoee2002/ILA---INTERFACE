// laresToolbox.ts — i due vocabolari concettuali di LARES.
//
// Fonte: documenti del progetto LARES forniti dalla redazione —
//  · «LARES_Analytical Toolbox for Conceptual Markers (enlarged)»
//  · «LARES Ἑβραῖος (exemplum)», scheda di lessico pubblicata.
//
// LARES lavora su DUE LIVELLI distinti, e vanno tenuti distinti anche qui.
//
// 1. I NOVE MARCATORI CONCETTUALI (`LARES_GRID`). Tre campi per tre ambiti:
//    representation → practice · belief · fiction
//    communication  → sign · sense · speech
//    fruition       → systems · instruments · structures
//    Nella scheda pubblicata sono i toggle «Show/hide» in testa: servono a
//    illuminare nel testo ciò che appartiene a un dato ambito. Da noi valgono
//    per la testimonianza intera (campo `lares`) e passano su @ana.
//
// 2. L'ANALYTICAL TOOLBOX (`LARES_TOOLBOX`). Una griglia di classificazione a
//    tre gradi — item → categoria → sottocategoria — applicata a segmenti
//    precisi del testo. La marcatura è dichiarata dal documento stesso:
//      primo grado          <rs type="…">
//      secondo e terzo      <rs subtype="… …">   (valori multipli, separati
//                                                 da spazio)
//
// Il documento LARES avverte esplicitamente che il toolbox è «only a
// preliminary classification grid that can be expanded, modified,
// deconstructed, restructured, or even reformulated»: è una risorsa
// flessibile, non uno standard chiuso. Perciò le voci qui sono estendibili, e
// dove ILA aggiunge qualcosa lo si dichiara invece di confonderlo con
// l'originale.

// ── 1. i nove marcatori concettuali ───────────────────────────────────────

export type LaresCampo = 'rappresentazione' | 'comunicazione' | 'fruizione';

export type LaresAmbito =
  // representation
  | 'pratica' | 'credenza' | 'finzione'
  // communication
  | 'segno' | 'senso' | 'parola'
  // fruition
  | 'sistemi' | 'strumenti' | 'strutture';

export interface LaresMarker {
  campo: LaresCampo;
  ambito: LaresAmbito;
}

export const LARES_GRID: {
  campo: LaresCampo; label: string; en: string;
  ambiti: { id: LaresAmbito; label: string; en: string }[];
}[] = [
  {
    campo: 'rappresentazione', label: 'Rappresentazione', en: 'representation',
    ambiti: [
      { id: 'pratica', label: 'pratica', en: 'practice' },
      { id: 'credenza', label: 'credenza', en: 'belief' },
      { id: 'finzione', label: 'finzione', en: 'fiction' },
    ],
  },
  {
    campo: 'comunicazione', label: 'Comunicazione', en: 'communication',
    ambiti: [
      { id: 'segno', label: 'segno', en: 'sign' },
      { id: 'senso', label: 'senso', en: 'sense' },
      { id: 'parola', label: 'parola', en: 'speech' },
    ],
  },
  {
    campo: 'fruizione', label: 'Fruizione', en: 'fruition',
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

export const AMBITO_EN: Record<LaresAmbito, string> = LARES_GRID.reduce(
  (acc, c) => { c.ambiti.forEach(a => { acc[a.id] = a.en; }); return acc; },
  {} as Record<LaresAmbito, string>,
);

export const AMBITO_CAMPO: Record<LaresAmbito, LaresCampo> = LARES_GRID.reduce(
  (acc, c) => { c.ambiti.forEach(a => { acc[a.id] = c.campo; }); return acc; },
  {} as Record<LaresAmbito, LaresCampo>,
);

/**
 * Una tinta per campo, coerente con la palette terrosa del progetto. Nessuna
 * coincide con --lit (l'ocra della sezione), altrimenti i marcatori
 * concettuali si confonderebbero con i chip di genere letterario.
 */
export const CAMPO_COLOR: Record<LaresCampo, string> = {
  rappresentazione: '#A85250', // terracotta
  comunicazione: '#6E8BAB',    // grigio-blu polvere
  fruizione: '#7B8F6A',        // verde salvia
};

/**
 * Una tinta per **item** del toolbox, sorella di CAMPO_COLOR e della palette
 * delle famiglie del lessico cultuale (CultLexiconPanel): stessa gamma terrosa,
 * nessuna coincidenza con --lit né con le tinte dei campi concettuali. Vive qui
 * e solo qui, così le due viste che la usano non possono divergere.
 */
export const ITEM_COLOR: Record<string, string> = {
  'human-agents': '#c19a3e',       // ocra bruciata
  'superhuman-agents': '#8f6a9e',  // viola polvere — come la famiglia agency
  'activities': '#c57a4f',         // terracotta chiara
  'states-of-mind': '#9a7b6a',     // seppia
  'spaces': '#7b8f6a',             // verde salvia
  'institutions': '#6e8bab',       // grigio-blu
  'materiality': '#a85250',        // terracotta scura
};

export const itemColor = (id: string) => ITEM_COLOR[id] || '#8a8a80';

// ── 2. l'Analytical Toolbox ───────────────────────────────────────────────

export interface ToolboxSub {
  id: string;
  label: string;
  en: string;
  /** esempi dati dal documento LARES, riportati come aiuto per chi marca */
  esempi?: string;
  /** true per le voci che non sono nella griglia base del documento LARES */
  aggiunta?: boolean;
  /** chi ha aggiunto la voce: la redazione («enlarged») o ILA (merge col lessico cultuale) */
  fonte?: ToolboxFonte;
}

/**
 * Provenienza di una voce aggiunta. `LARES-enlarged` = le voci in rosso della
 * versione allargata del documento di redazione; `ILA` = le voci innestate dal
 * merge col lessico cultuale (docs/merge-lessico-lares.md). Le voci senza
 * `aggiunta` sono della griglia originale e non si toccano.
 */
export type ToolboxFonte = 'LARES-enlarged' | 'ILA';

export interface ToolboxCategoria {
  id: string;
  label: string;
  en: string;
  esempi?: string;
  sub: ToolboxSub[];
  aggiunta?: boolean;
  fonte?: ToolboxFonte;
}

export interface ToolboxItem {
  /** valore di @type nel markup */
  id: string;
  label: string;
  en: string;
  categorie: ToolboxCategoria[];
}

/**
 * I sette item del toolbox, con categorie e sottocategorie. Gli id sono la
 * forma che finisce nel markup: `@type` prende l'id dell'item, `@subtype`
 * prende gli id di categoria e sottocategoria, separati da spazio (così
 * prescrive il documento LARES).
 */
export const LARES_TOOLBOX: ToolboxItem[] = [
  {
    id: 'human-agents', label: 'Agenti umani', en: '(Human) agents',
    categorie: [
      {
        id: 'cult-personnel', label: 'Personale di culto', en: 'Cult personal',
        sub: [
          { id: 'priest', label: 'sacerdote', en: 'Priest' },
          { id: 'assistant', label: 'assistente', en: 'Assistant' },
          { id: 'high-priest', label: 'sommo sacerdote', en: 'High priest', esempi: 'ἀρχιερεύς', aggiunta: true, fonte: 'ILA' },
        ],
      },
      {
        id: 'worshippers', label: 'Fedeli', en: 'Worshippers',
        sub: [
          { id: 'participant', label: 'partecipante', en: 'Participant' },
          { id: 'attendee', label: 'astante / spettatore', en: 'Attendee / Spectator' },
        ],
      },
      {
        id: 'groups', label: 'Gruppi', en: 'Groups',
        sub: [
          { id: 'ethnic-group', label: 'gruppo etnico', en: 'Ethnic group' },
          { id: 'political-group', label: 'gruppo politico', en: 'Political group' },
          { id: 'associations', label: 'associazioni', en: 'Associations' },
          { id: 'local-community', label: 'comunità locale', en: 'Local community', esempi: 'κατοικία — né etnia né gruppo politico né associazione', aggiunta: true, fonte: 'ILA' },
        ],
      },
      {
        id: 'individuals', label: 'Individui (culti non civici)', en: 'Individuals (non-civic cults)',
        sub: [
          {
            id: 'religious-professionals',
            label: 'professionisti religiosi straordinari',
            en: 'Extraordinary Religious Professionals',
            esempi: 'iniziatori, purificatori, indovini, oracolanti, uomini santi',
          },
        ],
      },
      // Categoria ILA: lo status non è un ruolo rituale (cult-personnel) né un
      // collettivo (groups) né il fedele in quanto tale (worshippers).
      {
        id: 'status', label: 'Status personale', en: 'Personal status', aggiunta: true, fonte: 'ILA',
        sub: [
          { id: 'threptos', label: 'allevato in casa', en: 'Threptos', esempi: 'θρεπτός, θρέμμα, τρέφω', aggiunta: true, fonte: 'ILA' },
          { id: 'servant', label: 'servo / serva', en: 'Servant', esempi: 'παιδίσκη — dichiarata, 0 attestazioni nel corpus', aggiunta: true, fonte: 'ILA' },
          { id: 'devotee', label: 'devoto', en: 'Devotee', esempi: 'φιλόθεος — dichiarata, 0 attestazioni nel corpus', aggiunta: true, fonte: 'ILA' },
        ],
      },
    ],
  },
  {
    id: 'superhuman-agents', label: 'Agenti sovrumani', en: '(Superhuman) agents',
    categorie: [
      {
        id: 'divinities', label: 'Divinità', en: 'Divinities',
        sub: [
          { id: 'epithets', label: 'epiteti / epiclesi', en: 'Epithets / Epiclesis' },
          { id: 'hypostasis', label: 'ipostasi', en: 'Hypostasis', esempi: 'rappresentazioni, simboli, allegorie' },
          { id: 'agencies', label: 'agency', en: 'Agencies', esempi: 'azioni, funzioni, epifanie' },
          { id: 'contexts', label: 'contesti', en: 'Contexts' },
          // Le tre voci in rosso della versione «enlarged». Il documento le
          // colloca in coda alla colonna delle sottocategorie senza ripetere
          // item e categoria: stanno qui perché descrivono azioni di un agente
          // sovrumano, che è il loro unico posto sensato nella griglia — ma la
          // collocazione va confermata con la redazione LARES.
          { id: 'legal-action', label: 'azione giuridica', en: 'Legal action', esempi: 'costrizione, sanzione', aggiunta: true, fonte: 'LARES-enlarged' },
          { id: 'benevolent-action', label: 'azione benevola', en: 'Benevolent action', esempi: 'benedizione', aggiunta: true, fonte: 'LARES-enlarged' },
          { id: 'malevolent-action', label: 'azione malevola', en: 'Malevolent action', esempi: 'maledizione', aggiunta: true, fonte: 'LARES-enlarged' },
          // Innesti ILA (docs/merge-lessico-lares.md §4): quattro modi d'agire
          // del dio che il corpus di Men predica di continuo e che `agencies`
          // da solo dissolverebbe. `agencies` resta il ramo di ripiego.
          { id: 'power', label: 'potenza', en: 'Power', esempi: 'δύναμις, μεγάλη ἡ δύναμις', aggiunta: true, fonte: 'ILA' },
          { id: 'election', label: 'scelta', en: 'Election', esempi: 'αἱρετίζω: il dio che sceglie un uomo o un luogo', aggiunta: true, fonte: 'ILA' },
          { id: 'injunction', label: 'ingiunzione', en: 'Injunction', esempi: 'ἐπιταγή, χρηματισμός — ordine che obbliga a un atto, non sanzione', aggiunta: true, fonte: 'ILA' },
          { id: 'territorial-lordship', label: 'signoria territoriale', en: 'Territorial lordship', esempi: 'βασιλεύω, κατέχω', aggiunta: true, fonte: 'ILA' },
        ],
      },
      {
        id: 'superhuman-beings', label: 'Esseri sovrumani', en: 'Super-human beings',
        esempi: 'eroi, daimones',
        sub: [
          { id: 'hypostasis', label: 'ipostasi', en: 'Hypostasis' },
          { id: 'agencies', label: 'agency', en: 'Agencies' },
          { id: 'contexts', label: 'contesti', en: 'Contexts' },
        ],
      },
    ],
  },
  {
    id: 'activities', label: 'Attività', en: 'Activities',
    categorie: [
      {
        id: 'feasting', label: 'Festa', en: 'Feasting',
        sub: [
          { id: 'dancing', label: 'danza', en: 'Dancing' },
          { id: 'processions', label: 'processioni', en: 'Processions' },
          { id: 'competitions', label: 'agoni', en: 'Competitions' },
          { id: 'banqueting', label: 'banchetto', en: 'Banqueting' },
        ],
      },
      {
        id: 'offering', label: 'Offerta', en: 'Offering',
        sub: [
          { id: 'animal-sacrifice', label: 'sacrificio cruento', en: 'Animal sacrifices' },
          { id: 'bloodless-sacrifice', label: 'sacrificio incruento', en: 'Bloodless sacrifices', esempi: 'frutti, libagioni, focacce' },
          { id: 'ex-voto', label: 'ex voto', en: 'Ex-votes' },
          // `ex-votes` nomina l'oggetto donato; questi due nominano l'atto.
          { id: 'dedication', label: 'dedica', en: 'Dedication', esempi: 'ἀνατίθημι, ἀνίστημι', aggiunta: true, fonte: 'ILA' },
          { id: 'consecration', label: 'consacrazione', en: 'Consecration', esempi: 'καθιερόω, καθιδρύω — passaggio di statuto, non dono', aggiunta: true, fonte: 'ILA' },
        ],
      },
      { id: 'rites-de-passage', label: 'Riti di passaggio', en: 'Rites de passage', sub: [] },
      {
        id: 'prayers', label: 'Preghiere', en: 'Prayers',
        sub: [
          { id: 'vow', label: 'voto', en: 'Vow', esempi: 'εὐχή, εὔχομαι', aggiunta: true, fonte: 'ILA' },
          { id: 'thanksgiving', label: 'ringraziamento', en: 'Thanksgiving', esempi: 'εὐχαριστέω, εὐλογέω', aggiunta: true, fonte: 'ILA' },
          { id: 'veneration', label: 'venerazione', en: 'Veneration', esempi: 'σέβω', aggiunta: true, fonte: 'ILA' },
          { id: 'invocation', label: 'invocazione', en: 'Invocation', esempi: 'ὗε κύε', aggiunta: true, fonte: 'ILA' },
          // speculare a `malevolent-action`: là il soggetto è il dio, qui l'uomo
          // che lo invoca contro qualcuno.
          { id: 'imprecation', label: 'imprecazione', en: 'Imprecation', esempi: 'ἐπεξορκίζω, κεχολωμένος', aggiunta: true, fonte: 'ILA' },
        ],
      },
      // Categoria ILA. Senza di essa la catena colpa → castigo → confessione →
      // riscatto, che definisce le stele di confessione, si sparpaglia fra
      // `prayers` e `offering`.
      {
        id: 'expiation', label: 'Espiazione', en: 'Expiation', aggiunta: true, fonte: 'ILA',
        sub: [
          { id: 'confession', label: 'confessione', en: 'Confession', esempi: 'ἐξομολογέομαι, ὁμολογέω', aggiunta: true, fonte: 'ILA' },
          { id: 'propitiation', label: 'propiziazione', en: 'Propitiation', esempi: 'ἐξειλάσκομαι', aggiunta: true, fonte: 'ILA' },
          { id: 'ransom', label: 'riscatto', en: 'Ransom', esempi: 'λύτρον, λυτρόω', aggiunta: true, fonte: 'ILA' },
          { id: 'purification', label: 'purificazione', en: 'Purification', esempi: 'καθαρίζω — l\'atto; la norma di purità sta in institutions', aggiunta: true, fonte: 'ILA' },
        ],
      },
      // Categoria ILA: la trasgressione è un'azione umana, non merita un item.
      {
        id: 'transgression', label: 'Trasgressione', en: 'Transgression', aggiunta: true, fonte: 'ILA',
        sub: [
          { id: 'sin', label: 'peccato', en: 'Sin', esempi: 'ἁμαρτάνω', aggiunta: true, fonte: 'ILA' },
          { id: 'perjury', label: 'spergiuro', en: 'Perjury', esempi: 'ἐπιορκέω', aggiunta: true, fonte: 'ILA' },
          { id: 'impiety', label: 'empietà', en: 'Impiety', esempi: 'ἀσεβέω — dichiarata, 0 attestazioni nel corpus', aggiunta: true, fonte: 'ILA' },
        ],
      },
      { id: 'divination', label: 'Divinazione', en: 'Divination', sub: [] },
    ],
  },
  {
    id: 'states-of-mind', label: 'Stati mentali', en: 'States of mind',
    categorie: [
      { id: 'possession', label: 'Possessione', en: 'Possession', sub: [] },
      { id: 'ecstasis', label: 'Estasi', en: 'Ecstasis', sub: [] },
      { id: 'dreaming', label: 'Sogno', en: 'Dreaming', sub: [] },
    ],
  },
  {
    id: 'spaces', label: 'Spazi', en: 'Spaces',
    categorie: [
      {
        id: 'places', label: 'Luoghi', en: 'Places',
        esempi: 'bosco sacro (ἄλσος), giardino (κῆπος), monte, mare, lago, corso d\'acqua, fonte, grotta, deserto',
        sub: [
          { id: 'natural', label: 'luoghi naturali', en: 'Natural places' },
          { id: 'artificial', label: 'luoghi artificiali', en: 'Artificial places' },
        ],
      },
      {
        id: 'constructions', label: 'Costruzioni', en: 'Constructions',
        esempi: 'tempio, santuario, heroon, temenos, tomba, altare, via sacra',
        sub: [
          { id: 'public', label: 'pubbliche', en: 'Public' },
          { id: 'private', label: 'private', en: 'Private' },
          { id: 'urban', label: 'urbane', en: 'Urban' },
          { id: 'extra-urban', label: 'extraurbane', en: 'Extra-urban' },
        ],
      },
    ],
  },
  {
    id: 'institutions', label: 'Istituzioni', en: 'Institutions',
    categorie: [
      {
        id: 'civic-customs', label: 'Consuetudini civiche', en: 'Civic customs',
        sub: [
          { id: 'honours', label: 'onori decretati', en: 'Decreed honours', esempi: 'στέφανος', aggiunta: true, fonte: 'ILA' },
        ],
      },
      {
        id: 'religious-practices', label: 'Pratiche religiose', en: 'Religious practices',
        sub: [
          { id: 'policy', label: 'politica religiosa', en: '(Religious) Policy' },
          { id: 'law', label: 'norma', en: 'Law' },
          { id: 'administration', label: 'amministrazione', en: 'Administration' },
          { id: 'record', label: 'registrazione', en: 'Record', esempi: 'μαρτυρέω, στηλογραφέω — la pubblicazione su pietra come atto', aggiunta: true, fonte: 'ILA' },
          { id: 'purity-rule', label: 'norma di purità', en: 'Purity rule', esempi: 'ἀκάθαρτος; `law` resta per asylia e norme generali', aggiunta: true, fonte: 'ILA' },
        ],
      },
    ],
  },
  {
    id: 'materiality', label: 'Materialità', en: 'Materiality',
    categorie: [
      { id: 'adornments', label: 'Ornamenti (abbigliamento)', en: 'Adornments (Clothing)', sub: [] },
      { id: 'instruments', label: 'Strumenti (attributi funzionali)', en: 'Instruments (Functional attributes)', sub: [] },
    ],
  },
];

/** Un marcatore del toolbox applicato a un segmento: item + catena di sottotipi. */
export interface ToolboxMarker {
  /** id dell'item → @type */
  item: string;
  /** id di categoria ed eventuale sottocategoria → @subtype, separati da spazio */
  subtype: string[];
}

export const toolboxItem = (id: string) => LARES_TOOLBOX.find(i => i.id === id);

/** Etichetta leggibile di un marcatore, es. «Agenti sovrumani → Divinità → epiteti». */
export function toolboxLabel(m: ToolboxMarker): string {
  const item = toolboxItem(m.item);
  if (!item) return [m.item, ...m.subtype].join(' → ');
  const parti: string[] = [item.label];
  let categorie = item.categorie;
  for (const s of m.subtype) {
    const cat = categorie.find(c => c.id === s);
    if (cat) { parti.push(cat.label); continue; }
    const sub = categorie.flatMap(c => c.sub).find(x => x.id === s);
    parti.push(sub ? sub.label : s);
  }
  return parti.join(' → ');
}

/** Dal markup agli oggetti: `<rs type="spaces" subtype="places natural">`. */
export function parseToolboxAttrs(type?: string, subtype?: string): ToolboxMarker | null {
  if (!type || !toolboxItem(type)) return null;
  return { item: type, subtype: (subtype || '').split(/\s+/).filter(Boolean) };
}

export const TOOLBOX_ITEM_IDS = LARES_TOOLBOX.map(i => i.id);

/**
 * Verifica che un percorso `item → categoria → sottocategoria` esista davvero
 * nella griglia, nell'ordine giusto. Restituisce null se va bene, altrimenti il
 * messaggio da mostrare a chi marca. Un percorso troncato all'item o alla
 * categoria è legittimo: la griglia ha categorie senza sottocategorie.
 */
export function validateToolboxPath(item: string, subtype: string[]): string | null {
  const it = toolboxItem(item);
  if (!it) return `Item «${item}» inesistente: usa uno dei sette (${TOOLBOX_ITEM_IDS.join(", ")}).`;
  if (subtype.length === 0) return null;
  const [catId, subId, ...resto] = subtype;
  const cat = it.categorie.find(c => c.id === catId);
  if (!cat) return `«${catId}» non è una categoria di «${it.label}».`;
  if (subId === undefined) return null;
  if (!cat.sub.some(x => x.id === subId)) return `«${subId}» non è una sottocategoria di «${cat.label}».`;
  if (resto.length > 0) return `Il toolbox ha tre gradi: «${resto.join(" ")}» è di troppo.`;
  return null;
}
