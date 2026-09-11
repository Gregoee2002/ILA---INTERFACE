/**
 * lessicoLaresOverlay.ts — vocabolario risolto = seed ⊕ overlay.
 *
 * Il seed (`cultLexicon.ts`, `laresToolbox.ts`) non si edita più a mano: le
 * modifiche vanno in un overlay JSON nel repo dati e questo modulo le fonde.
 * Ordine di risoluzione: seed → overlay → markup della scheda (invariato).
 */

import {
  CULT_FAMILIES, CULT_LEXICON, LEMMA_TOOLBOX, cultFamilyColor, lemmaRefFor as seedLemmaRefFor,
} from './cultLexicon';
import {
  LARES_TOOLBOX, ToolboxItem, ToolboxMarker, ToolboxFonte, LaresMarker,
} from './laresToolbox';

// ── tipi dell'overlay ────────────────────────────────────────────────────

export interface SottoFunzione {
  id: string;
  label?: string;
  note?: string;
  deprecated?: boolean;
}

export interface FamigliaPatch {
  id: string;
  label?: string;
  rule?: string;
  color?: string;
  deprecated?: boolean;
  _new?: boolean;
  addedBy?: string;
  addedAt?: string;
}

export interface LemmaPatch {
  lemma: string;
  family?: string;
  subFunction?: string;
  /** null = «nessuna voce di dizionario»; undefined = lascia il seed. */
  lemmaRef?: string | null;
  manual?: boolean;
  aliases?: string[];
  /** null = «senza percorso» (legittimo); undefined = lascia il seed. */
  percorso?: ToolboxMarker | null;
  deprecated?: boolean;
  _new?: boolean;
  note?: string;
  addedBy?: string;
  addedAt?: string;
}

export interface ToolboxNodoPatch {
  /** "item" | "item/cat" | "item/cat/sub" */
  path: string;
  label?: string;
  en?: string;
  esempi?: string;
  fonte?: ToolboxFonte;
  deprecated?: boolean;
  _new?: boolean;
  note?: string;
  addedBy?: string;
  addedAt?: string;
}

export interface LessicoLaresOverlay {
  version: 1;
  updatedAt: string;
  updatedBy?: string;
  famiglie: FamigliaPatch[];
  sottofunzioni: SottoFunzione[];
  lemmi: LemmaPatch[];
  toolbox: ToolboxNodoPatch[];
  concettuali: {
    defaultPerFamiglia: Record<string, LaresMarker | null>;
    note?: string;
  };
}

export const EMPTY_OVERLAY: LessicoLaresOverlay = {
  version: 1,
  updatedAt: '',
  famiglie: [],
  sottofunzioni: [],
  lemmi: [],
  toolbox: [],
  concettuali: { defaultPerFamiglia: {} },
};

// ── tipi risolti ─────────────────────────────────────────────────────────

export interface ResolvedFamily {
  id: string;
  label: string;
  rule: string;
  color: string;
  deprecated?: boolean;
  aggiunta?: boolean;
}

export interface ResolvedLemma {
  lemma: string;
  family: string;
  subFunction: string;
  lemmaRef?: string;
  manual?: boolean;
  aliases: string[];
  percorso?: ToolboxMarker;
  deprecated?: boolean;
  aggiunta?: boolean;
}

export interface ResolvedVocab {
  families: ResolvedFamily[];
  subFunctions: SottoFunzione[];
  lemmi: ResolvedLemma[];
  toolbox: ToolboxItem[];
  defaultConcettuale: Record<string, LaresMarker | null>;
  familyColor(id: string): string;
  familyLabel(id: string): string;
  lookupLemma(lemma: string): ResolvedLemma | undefined;
  lemmaRefFor(lemma: string): string | undefined;
  toolboxForLemma(lemma: string): ToolboxMarker | undefined;
  toolboxLabel(m: ToolboxMarker): string;
  validateToolboxPath(item: string, subtype: string[]): string | null;
}

// ── seed derivato ────────────────────────────────────────────────────────

/** L'elenco chiuso delle sotto-funzioni, estratto dal seed. */
export const SEED_SOTTOFUNZIONI: string[] = Array.from(
  new Set(CULT_LEXICON.map(l => l.subFunction)),
).sort((a, b) => a.localeCompare(b));

/** Default suggerito campo→ambito per famiglia (merge §6). */
export const SEED_DEFAULT_CONCETTUALE: Record<string, LaresMarker | null> = {
  'agency': { campo: 'rappresentazione', ambito: 'credenza' },
  'atto-cultuale': { campo: 'rappresentazione', ambito: 'pratica' },
  'colpa': { campo: 'rappresentazione', ambito: 'credenza' },
  'formula-fissa': { campo: 'comunicazione', ambito: 'parola' },
  'ruolo-istituzione': { campo: 'fruizione', ambito: 'sistemi' },
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// ── merge ────────────────────────────────────────────────────────────────

function mergeFamilies(patches: FamigliaPatch[]): ResolvedFamily[] {
  const out: ResolvedFamily[] = CULT_FAMILIES.map(f => ({
    id: f.id,
    label: f.label,
    rule: f.rule,
    color: cultFamilyColor(f.id),
  }));
  const byId = new Map(out.map(f => [f.id, f]));
  for (const p of patches) {
    const cur = byId.get(p.id);
    if (cur) {
      if (p.label != null) cur.label = p.label;
      if (p.rule != null) cur.rule = p.rule;
      if (p.color != null) cur.color = p.color;
      if (p.deprecated != null) cur.deprecated = p.deprecated;
    } else {
      const nf: ResolvedFamily = {
        id: p.id,
        label: p.label || p.id,
        rule: p.rule || '',
        color: p.color || cultFamilyColor(p.id),
        aggiunta: true,
        deprecated: p.deprecated,
      };
      out.push(nf);
      byId.set(p.id, nf);
    }
  }
  return out;
}

function mergeSubFunctions(patches: SottoFunzione[]): SottoFunzione[] {
  const byId = new Map<string, SottoFunzione>(
    SEED_SOTTOFUNZIONI.map(id => [id, { id, label: id }]),
  );
  for (const p of patches) {
    const cur = byId.get(p.id);
    if (cur) {
      if (p.label != null) cur.label = p.label;
      if (p.note != null) cur.note = p.note;
      if (p.deprecated != null) cur.deprecated = p.deprecated;
    } else {
      byId.set(p.id, { id: p.id, label: p.label || p.id, note: p.note, deprecated: p.deprecated });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function mergeToolbox(patches: ToolboxNodoPatch[]): ToolboxItem[] {
  const tree: ToolboxItem[] = clone(LARES_TOOLBOX);
  for (const p of patches) {
    const parts = p.path.split('/').filter(Boolean);
    const [itemId, catId, subId] = parts;
    const item = tree.find(i => i.id === itemId);
    if (!item) continue; // nuovo item non ammesso: lo segnala validateOverlay
    if (parts.length === 1) {
      if (p.label != null) item.label = p.label;
      if (p.en != null) item.en = p.en;
      if (p.deprecated != null) item.deprecated = p.deprecated;
      continue;
    }
    let cat = item.categorie.find(c => c.id === catId);
    if (!cat) {
      if (parts.length < 2) continue;
      cat = { id: catId, label: p.label || catId, en: p.en || catId, sub: [], aggiunta: true, fonte: p.fonte };
      item.categorie.push(cat);
    }
    if (parts.length === 2) {
      if (p.label != null) cat.label = p.label;
      if (p.en != null) cat.en = p.en;
      if (p.esempi != null) cat.esempi = p.esempi;
      if (p.fonte != null) cat.fonte = p.fonte;
      if (p.deprecated != null) cat.deprecated = p.deprecated;
      continue;
    }
    let sub = cat.sub.find(s => s.id === subId);
    if (!sub) {
      sub = { id: subId, label: p.label || subId, en: p.en || subId, aggiunta: true, fonte: p.fonte };
      cat.sub.push(sub);
    } else {
      if (p.label != null) sub.label = p.label;
      if (p.en != null) sub.en = p.en;
      if (p.esempi != null) sub.esempi = p.esempi;
      if (p.fonte != null) sub.fonte = p.fonte;
      if (p.deprecated != null) sub.deprecated = p.deprecated;
    }
  }
  return tree;
}

function mergeLemmi(patches: LemmaPatch[]): ResolvedLemma[] {
  const out: ResolvedLemma[] = CULT_LEXICON.map(l => ({
    lemma: l.lemma,
    family: l.family,
    subFunction: l.subFunction,
    lemmaRef: l.lemmaRef,
    manual: l.manual,
    aliases: [],
    percorso: LEMMA_TOOLBOX[l.lemma] ? clone(LEMMA_TOOLBOX[l.lemma]) : undefined,
  }));
  const byLemma = new Map(out.map(l => [l.lemma, l]));
  for (const p of patches) {
    const cur = byLemma.get(p.lemma);
    const target = cur ?? { lemma: p.lemma, family: '', subFunction: '', aliases: [], aggiunta: true } as ResolvedLemma;
    if (p.family != null) target.family = p.family;
    if (p.subFunction != null) target.subFunction = p.subFunction;
    if (p.manual != null) target.manual = p.manual;
    if (p.aliases != null) target.aliases = [...p.aliases];
    if (p.deprecated != null) target.deprecated = p.deprecated;
    if (p.lemmaRef !== undefined) target.lemmaRef = p.lemmaRef === null ? undefined : p.lemmaRef;
    if (p.percorso !== undefined) target.percorso = p.percorso === null ? undefined : clone(p.percorso);
    if (!cur) { out.push(target); byLemma.set(p.lemma, target); }
  }
  return out;
}

// ── helper sul tree risolto ──────────────────────────────────────────────

function labelFor(tree: ToolboxItem[], m: ToolboxMarker): string {
  const item = tree.find(i => i.id === m.item);
  if (!item) return [m.item, ...m.subtype].join(' → ');
  const parti: string[] = [item.label];
  for (const s of m.subtype) {
    const cat = item.categorie.find(c => c.id === s);
    if (cat) { parti.push(cat.label); continue; }
    const sub = item.categorie.flatMap(c => c.sub).find(x => x.id === s);
    parti.push(sub ? sub.label : s);
  }
  return parti.join(' → ');
}

function validatePath(tree: ToolboxItem[], item: string, subtype: string[]): string | null {
  const it = tree.find(i => i.id === item);
  if (!it) return `Item «${item}» inesistente.`;
  if (subtype.length === 0) return null;
  const [catId, subId, ...resto] = subtype;
  const cat = it.categorie.find(c => c.id === catId);
  if (!cat) return `«${catId}» non è una categoria di «${it.label}».`;
  if (subId === undefined) return null;
  if (!cat.sub.some(x => x.id === subId)) return `«${subId}» non è una sottocategoria di «${cat.label}».`;
  if (resto.length > 0) return `Il toolbox ha tre gradi: «${resto.join(' ')}» è di troppo.`;
  return null;
}

// ── build ────────────────────────────────────────────────────────────────

export function buildLessicoLares(overlay?: LessicoLaresOverlay | null): ResolvedVocab {
  const ov = overlay ?? EMPTY_OVERLAY;
  const families = mergeFamilies(ov.famiglie || []);
  const subFunctions = mergeSubFunctions(ov.sottofunzioni || []);
  const toolbox = mergeToolbox(ov.toolbox || []);
  const lemmi = mergeLemmi(ov.lemmi || []);

  const familyById = new Map(families.map(f => [f.id, f]));
  const lemmaIndex = new Map<string, ResolvedLemma>();
  for (const l of lemmi) {
    lemmaIndex.set(l.lemma, l);
    for (const a of l.aliases) if (!lemmaIndex.has(a)) lemmaIndex.set(a, l);
  }

  const defaultConcettuale: Record<string, LaresMarker | null> = {
    ...SEED_DEFAULT_CONCETTUALE,
    ...(ov.concettuali?.defaultPerFamiglia || {}),
  };

  return {
    families,
    subFunctions,
    lemmi,
    toolbox,
    defaultConcettuale,
    familyColor: id => familyById.get(id)?.color || cultFamilyColor(id),
    familyLabel: id => familyById.get(id)?.label || id,
    lookupLemma: lemma => lemmaIndex.get((lemma || '').trim()),
    lemmaRefFor: lemma => {
      const hit = lemmaIndex.get((lemma || '').trim());
      if (hit) return hit.lemmaRef;
      return seedLemmaRefFor(lemma);
    },
    toolboxForLemma: lemma => lemmaIndex.get((lemma || '').trim())?.percorso,
    toolboxLabel: m => labelFor(toolbox, m),
    validateToolboxPath: (item, subtype) => validatePath(toolbox, item, subtype),
  };
}

// ── integrità dell'overlay (§4 del piano) ───────────────────────────────

export function validateOverlay(overlay: LessicoLaresOverlay): string[] {
  const errs: string[] = [];
  const vocab = buildLessicoLares(overlay);
  const seedFamilyIds = new Set(CULT_FAMILIES.map(f => f.id as string));
  const seedSubIds = new Set(SEED_SOTTOFUNZIONI);
  const seedLemmata = new Set(CULT_LEXICON.map(l => l.lemma));
  const seedToolboxIds = new Set<string>();
  for (const it of LARES_TOOLBOX) {
    seedToolboxIds.add(it.id);
    for (const c of it.categorie) {
      seedToolboxIds.add(`${it.id}/${c.id}`);
      for (const s of c.sub) seedToolboxIds.add(`${it.id}/${c.id}/${s.id}`);
    }
  }
  const activeFamilies = new Set(vocab.families.filter(f => !f.deprecated).map(f => f.id));
  const activeSubs = new Set(vocab.subFunctions.filter(s => !s.deprecated).map(s => s.id));

  // 5 — nessun id del seed marcato _new; nessun rename
  for (const p of overlay.famiglie || []) {
    if (p._new && seedFamilyIds.has(p.id)) errs.push(`Famiglia «${p.id}»: _new su un id del seed.`);
  }
  for (const p of overlay.lemmi || []) {
    if (p._new && seedLemmata.has(p.lemma)) errs.push(`Lemma «${p.lemma}»: _new su un lemma del seed.`);
  }
  for (const p of overlay.toolbox || []) {
    if (p._new && seedToolboxIds.has(p.path)) errs.push(`Nodo «${p.path}»: _new su un id del seed.`);
    // 4 — mai un nuovo item; gli innesti sono di 2° o 3° grado e portano fonte
    const depth = p.path.split('/').filter(Boolean).length;
    if (p._new) {
      if (depth < 2) errs.push(`Nodo «${p.path}»: un innesto nuovo dev'essere categoria o sottocategoria, mai un item.`);
      if (!p.fonte) errs.push(`Nodo «${p.path}»: innesto senza «fonte».`);
    }
    if (depth >= 1 && !LARES_TOOLBOX.find(i => i.id === p.path.split('/')[0])) {
      errs.push(`Nodo «${p.path}»: item radice inesistente.`);
    }
  }

  // 1/2/3 — referenze dei lemmi
  for (const l of vocab.lemmi) {
    if (l.deprecated) continue;
    if (!activeFamilies.has(l.family)) errs.push(`Lemma «${l.lemma}»: famiglia «${l.family}» inesistente o ritirata.`);
    if (l.subFunction && !activeSubs.has(l.subFunction) && !seedSubIds.has(l.subFunction)) {
      errs.push(`Lemma «${l.lemma}»: sotto-funzione «${l.subFunction}» fuori dall'elenco.`);
    }
    if (l.percorso) {
      const bad = vocab.validateToolboxPath(l.percorso.item, l.percorso.subtype);
      if (bad) errs.push(`Lemma «${l.lemma}»: ${bad}`);
    }
  }

  // 7 — i default concettuali coprono le famiglie attive
  for (const f of vocab.families) {
    if (f.deprecated) continue;
    if (!(f.id in vocab.defaultConcettuale)) {
      errs.push(`Famiglia «${f.id}»: manca il default concettuale.`);
    }
  }

  return errs;
}
