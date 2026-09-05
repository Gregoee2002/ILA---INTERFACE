/**
 * cultIndex.ts — ILA / Index Lunae Antiquae
 * ------------------------------------------------------------------
 * Aggregazione lato client delle attestazioni del lessico cultuale
 * (`Monumento.cultAttestations`, derivate dal markup <w ana> / <rs cult*>).
 * Stesso schema di buildDivinityIndex / buildOnomasticaIndex: nessuna
 * chiamata di rete, alimenta la vista «Lessico cultuale».
 * ------------------------------------------------------------------
 */

import { Monumento, CultAttestation } from "../types";
import { CULT_FAMILIES, lemmaRefFor, lookupCultLemma, toolboxForLemma } from "./cultLexicon";
import { LARES_TOOLBOX, ToolboxMarker, toolboxLabel } from "./laresToolbox";

export interface CultSchedaRef {
  scheda: string;
  id: number;
  regione?: string;
  form: string;
  line?: string;
  formula: boolean;
  cert?: "low";
}

export interface CultLemmaStats {
  lemma: string;
  family: string;
  subFunction: string;
  lemmaRef?: string;
  /** forme attestate distinte, ordinate per frequenza. */
  forms: string[];
  /** numero totale di attestazioni. */
  count: number;
  /** numero di schede distinte in cui il lemma compare. */
  schedeCount: number;
  refs: CultSchedaRef[];
  /** percorso LARES del lemma (docs/merge-lessico-lares.md); assente se non ne ha. */
  toolbox?: ToolboxMarker;
}

/** Un percorso del toolbox LARES coi lemmi che ci cadono dentro. */
export interface CultToolboxStats {
  /** "activities/expiation/confession" — chiave stabile e leggibile. */
  key: string;
  marker: ToolboxMarker;
  /** «Attività → Espiazione → confessione» */
  label: string;
  count: number;
  schedeCount: number;
  lemmata: CultLemmaStats[];
}

export interface CultFamilyStats {
  id: string;
  label: string;
  rule: string;
  count: number;
  schedeCount: number;
  lemmata: CultLemmaStats[];
}

export interface CultIndex {
  families: CultFamilyStats[];
  lemmata: CultLemmaStats[];
  totalAttestations: number;
  totalSchede: number;
  /** conteggio attestazioni per regione (per il filtro / le query). */
  byRegion: Record<string, number>;
  /** regioni presenti, ordinate. */
  regioni: string[];
  /** gli stessi lemmi raggruppati per percorso LARES, in ordine di griglia. */
  toolbox: CultToolboxStats[];
  /** lemmi senza percorso: legittimo (χαίρω, χρηστὸς χαῖρε), non un buco. */
  senzaPercorso: CultLemmaStats[];
}

/**
 * Ordine di griglia: item, poi categoria, poi sottocategoria, come stanno nel
 * documento LARES. Serve a non mostrare i percorsi in ordine di frequenza, che
 * spezzerebbe la lettura della griglia.
 */
const PATH_ORDER: Map<string, number> = (() => {
  const m = new Map<string, number>();
  let i = 0;
  for (const item of LARES_TOOLBOX) {
    m.set(item.id, i++);
    for (const cat of item.categorie) {
      m.set(`${item.id}/${cat.id}`, i++);
      for (const sub of cat.sub) m.set(`${item.id}/${cat.id}/${sub.id}`, i++);
    }
  }
  return m;
})();

const FAMILY_LABEL = new Map(CULT_FAMILIES.map(f => [f.id, f]));

export function buildCultIndex(
  monumenti: Monumento[],
  opts: { regione?: string } = {},
): CultIndex {
  const wantRegion = (opts.regione || "").trim();

  // lemma → stats accumulate
  const lemmaMap = new Map<string, {
    lemma: string; family: string; subFunction: string;
    formCounts: Map<string, number>;
    refs: CultSchedaRef[];
    schede: Set<string>;
    /** percorsi visti nel markup, per frequenza: chi marca può correggere il default. */
    pathCounts: Map<string, number>;
  }>();
  const byRegion: Record<string, number> = {};
  const regioniSet = new Set<string>();
  const allSchede = new Set<string>();
  let totalAttestations = 0;

  for (const m of monumenti) {
    const atts: CultAttestation[] = (m.cultAttestations || []);
    if (atts.length === 0) continue;
    const regione = (m.regione || "").trim();
    if (regione) regioniSet.add(regione);
    if (wantRegion && regione !== wantRegion) continue;

    for (const a of atts) {
      if (!a.lemma && !a.family) continue;
      totalAttestations += 1;
      allSchede.add(a.scheda);
      const regKey = regione || "—";
      byRegion[regKey] = (byRegion[regKey] || 0) + 1;

      const key = a.lemma || `(${a.family})`;
      let entry = lemmaMap.get(key);
      if (!entry) {
        const known = lookupCultLemma(a.lemma);
        entry = {
          lemma: a.lemma || key,
          family: a.family || known?.family || "",
          subFunction: a.subFunction || known?.subFunction || "",
          formCounts: new Map(),
          refs: [],
          schede: new Set(),
          pathCounts: new Map(),
        };
        lemmaMap.set(key, entry);
      }
      if (!entry.family && a.family) entry.family = a.family;
      if (!entry.subFunction && a.subFunction) entry.subFunction = a.subFunction;
      if (a.toolbox?.item) {
        const pk = [a.toolbox.item, ...(a.toolbox.subtype || [])].join("/");
        entry.pathCounts.set(pk, (entry.pathCounts.get(pk) || 0) + 1);
      }
      const form = (a.form || "").trim();
      if (form) entry.formCounts.set(form, (entry.formCounts.get(form) || 0) + 1);
      entry.schede.add(a.scheda);
      entry.refs.push({
        scheda: a.scheda,
        id: m.id,
        regione: regione || undefined,
        form,
        line: a.line,
        formula: a.formula,
        ...(a.cert === "low" ? { cert: "low" as const } : {}),
      });
    }
  }

  const lemmata: CultLemmaStats[] = Array.from(lemmaMap.values())
    .map(e => ({
      lemma: e.lemma,
      family: e.family,
      subFunction: e.subFunction,
      lemmaRef: lemmaRefFor(e.lemma),
      forms: Array.from(e.formCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([f]) => f),
      count: e.refs.length,
      schedeCount: e.schede.size,
      refs: e.refs.sort((a, b) => a.id - b.id),
      toolbox: pathOf(e.pathCounts, e.lemma),
    }))
    .sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma));

  const families: CultFamilyStats[] = CULT_FAMILIES.map(f => {
    const ls = lemmata.filter(l => l.family === f.id);
    const schede = new Set<string>();
    ls.forEach(l => l.refs.forEach(r => schede.add(r.scheda)));
    return {
      id: f.id,
      label: f.label,
      rule: f.rule,
      count: ls.reduce((s, l) => s + l.count, 0),
      schedeCount: schede.size,
      lemmata: ls,
    };
  });

  // lemmi con famiglia fuori dai 5 id noti (non dovrebbe capitare): raccolti a parte
  const knownIds = new Set<string>(CULT_FAMILIES.map(f => f.id));
  const orphans = lemmata.filter(l => !knownIds.has(l.family));
  if (orphans.length > 0) {
    const schede = new Set<string>();
    orphans.forEach(l => l.refs.forEach(r => schede.add(r.scheda)));
    families.push({
      id: "(altro)",
      label: "(altro / non classificato)",
      rule: "Attestazioni con @ana non riconosciuta — da verificare nel markup.",
      count: orphans.reduce((s, l) => s + l.count, 0),
      schedeCount: schede.size,
      lemmata: orphans,
    });
  }

  // ── raggruppamento per percorso LARES ──
  const pathMap = new Map<string, CultLemmaStats[]>();
  const senzaPercorso: CultLemmaStats[] = [];
  for (const l of lemmata) {
    if (!l.toolbox) { senzaPercorso.push(l); continue; }
    const k = [l.toolbox.item, ...l.toolbox.subtype].join("/");
    const arr = pathMap.get(k);
    if (arr) arr.push(l); else pathMap.set(k, [l]);
  }
  const toolbox: CultToolboxStats[] = Array.from(pathMap.entries())
    .map(([key, ls]) => {
      const schede = new Set<string>();
      ls.forEach(l => l.refs.forEach(r => schede.add(r.scheda)));
      const parti = key.split("/");
      const marker: ToolboxMarker = { item: parti[0], subtype: parti.slice(1) };
      return {
        key,
        marker,
        label: toolboxLabel(marker),
        count: ls.reduce((s, l) => s + l.count, 0),
        schedeCount: schede.size,
        lemmata: ls.sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma)),
      };
    })
    .sort((a, b) => (PATH_ORDER.get(a.key) ?? 9999) - (PATH_ORDER.get(b.key) ?? 9999) || a.key.localeCompare(b.key));

  return {
    families: families.filter(f => f.lemmata.length > 0),
    lemmata,
    totalAttestations,
    totalSchede: allSchede.size,
    byRegion,
    regioni: Array.from(regioniSet).sort((a, b) => a.localeCompare(b)),
    toolbox,
    senzaPercorso,
  };
}

/**
 * Percorso di un lemma: quello che il markup usa più spesso (chi marca può
 * correggere il default), altrimenti quello della tabella. Undefined se il
 * lemma non ne ha — χαίρω, χρηστὸς χαῖρε: non nominano nulla.
 */
function pathOf(pathCounts: Map<string, number>, lemma: string): ToolboxMarker | undefined {
  const top = Array.from(pathCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (top) {
    const parti = top[0].split("/").filter(Boolean);
    if (parti.length > 0) return { item: parti[0], subtype: parti.slice(1) };
  }
  const derived = toolboxForLemma(lemma);
  return derived ? { item: derived.item, subtype: [...derived.subtype] } : undefined;
}

export function familyLabel(id: string): string {
  return FAMILY_LABEL.get(id as any)?.label || id;
}
