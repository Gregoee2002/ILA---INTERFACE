import { Monumento } from "../types";

export interface DivinityStats {
  name: string;
  count: number;
  regions: number;
  regionsList: string[];
  epiteti: { name: string; count: number }[];
}

export interface OnomasticaStats {
  name: string;
  count: number;
  regions: string[];
}

// Stessa aggregazione usata da EpithetStats (pagina "Statistiche Epiteti"):
// estratta qui perché anche il popover contestuale sull'iscrizione deve
// risolvere un termine cliccato negli stessi identici conteggi, senza
// duplicare (e potenzialmente disallineare) la logica.
export function buildDivinityIndex(monumenti: Monumento[]): Record<string, DivinityStats> {
  const counts: Record<string, number> = {};
  const regions: Record<string, Set<string>> = {};
  const coEpiteti: Record<string, Record<string, number>> = {};
  monumenti.forEach(m => {
    m.divinita?.forEach(d => {
      counts[d] = (counts[d] || 0) + 1;
      if (!regions[d]) regions[d] = new Set();
      if (!coEpiteti[d]) coEpiteti[d] = {};
      if (m.regione) regions[d].add(m.regione);
      const rel = m.divinitaEpiteti?.find(de => de.divinita === d);
      const ownEpiteti = rel ? rel.epiteti : (m.divinitaEpiteti ? [] : (m.epiteti || []));
      ownEpiteti.forEach(e => {
        coEpiteti[d][e] = (coEpiteti[d][e] || 0) + 1;
      });
    });
  });
  const index: Record<string, DivinityStats> = {};
  Object.entries(counts).forEach(([name, count]) => {
    index[name] = {
      name,
      count,
      regions: regions[name]?.size || 0,
      regionsList: Array.from(regions[name] || []),
      epiteti: Object.entries(coEpiteti[name] || {})
        .map(([ename, ecount]) => ({ name: ename, count: ecount }))
        .sort((a, b) => b.count - a.count)
    };
  });
  return index;
}

// --- Audit di classificazione divinità / epiteti ------------------------------
// Tre segnali di sospetta misclassificazione, calcolati sul corpus già
// parsato (stessi dati di buildDivinityIndex). Nessuna correzione automatica:
// ogni voce è un candidato da verificare a mano su Lane 1971 e poi correggere
// sullo XML (vedi divinityAliases.ts per quando è invece solo variante grafica).

export interface ClassificationAudit {
  // Divinità presenti in ≥2 schede ma MAI come unica divinità della scheda:
  // classico sintomo di un epiteto (o di un pezzo di nome composto) che il
  // parser ha staccato come teonimo a sé (es. "Tyrannos", "Megale").
  neverAlone: {
    name: string;
    count: number;
    coOccursWith: string[];
    // Divinità co-presenti il cui nome è un sotto/sovra-insieme di token di
    // questa (es. "Meter" accanto a "Megale Meter"): forte indizio che si
    // tratti della stessa divinità in forma variante, o di uno split del parser.
    relatedNames: string[];
    monumentIds: number[];
  }[];
  // Stessa forma (chiave normalizzata) che in certe schede è divinità e in
  // altre è epiteto: incoerenza di codifica o ordine token invertito nella key.
  divVsEpi: {
    key: string;
    asDivinita: { form: string; monumentIds: number[] };
    asEpiteto: { form: string; monumentIds: number[] };
  }[];
  // Epiteto attribuito (via divinitaEpiteti) a più divinità distinte: o è
  // genuinamente condiviso (Epekoos, Ouranios…) o è contaminazione da
  // co-occorrenza nella stessa iscrizione. Informativo, non un errore certo.
  sharedEpithets: {
    epiteto: string;
    divinita: { name: string; monumentIds: number[] }[];
  }[];
}

const auditNorm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ')
    .replace(/\s+/g, ' ').trim().toLowerCase();

export function buildClassificationAudit(monumenti: Monumento[]): ClassificationAudit {
  // -- neverAlone --
  const divOcc: Record<string, Set<number>> = {};
  const divSolo: Record<string, number> = {};
  const divCoOcc: Record<string, Set<string>> = {};
  monumenti.forEach(m => {
    const divs = Array.from(new Set((m.divinita || []).map(d => d.trim()).filter(Boolean)));
    divs.forEach(d => {
      (divOcc[d] ||= new Set()).add(m.id);
      (divCoOcc[d] ||= new Set());
      divs.forEach(other => { if (other !== d) divCoOcc[d].add(other); });
    });
    if (divs.length === 1) divSolo[divs[0]] = (divSolo[divs[0]] || 0) + 1;
  });
  const tokenSet = (s: string) => new Set(auditNorm(s).split(' ').filter(Boolean));
  const subsetOrSuperset = (a: string, b: string) => {
    const ta = tokenSet(a), tb = tokenSet(b);
    if (ta.size === 0 || tb.size === 0 || auditNorm(a) === auditNorm(b)) return false;
    const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
    return Array.from(small).every(t => big.has(t));
  };
  const neverAlone = Object.entries(divOcc)
    .filter(([name, ids]) => ids.size >= 2 && !(divSolo[name] > 0))
    .map(([name, ids]) => {
      const coOccursWith = Array.from(divCoOcc[name] || []).sort();
      return {
        name,
        count: ids.size,
        coOccursWith,
        relatedNames: coOccursWith.filter(o => subsetOrSuperset(name, o)),
        monumentIds: Array.from(ids).sort((a, b) => a - b),
      };
    })
    // Prima i casi con sovrapposizione di token (alto indizio), poi per frequenza.
    .sort((a, b) => (b.relatedNames.length > 0 ? 1 : 0) - (a.relatedNames.length > 0 ? 1 : 0) || b.count - a.count);

  // -- divVsEpi --
  const asDiv: Record<string, { form: string; ids: Set<number> }> = {};
  const asEpi: Record<string, { form: string; ids: Set<number> }> = {};
  const collect = (bucket: typeof asDiv, values: string[] | undefined, id: number) => {
    (values || []).forEach(raw => {
      const v = (raw || '').trim();
      if (!v) return;
      const k = auditNorm(v);
      if (!k) return;
      (bucket[k] ||= { form: v, ids: new Set() }).ids.add(id);
    });
  };
  monumenti.forEach(m => {
    collect(asDiv, m.divinita, m.id);
    collect(asEpi, m.epiteti, m.id);
  });
  const divVsEpi = Object.keys(asDiv)
    .filter(k => asEpi[k])
    .map(k => ({
      key: k,
      asDivinita: { form: asDiv[k].form, monumentIds: Array.from(asDiv[k].ids).sort((a, b) => a - b) },
      asEpiteto: { form: asEpi[k].form, monumentIds: Array.from(asEpi[k].ids).sort((a, b) => a - b) },
    }))
    .sort((a, b) =>
      (b.asDivinita.monumentIds.length + b.asEpiteto.monumentIds.length) -
      (a.asDivinita.monumentIds.length + a.asEpiteto.monumentIds.length));

  // -- sharedEpithets --
  const epiToDiv: Record<string, Record<string, Set<number>>> = {};
  monumenti.forEach(m => {
    (m.divinitaEpiteti || []).forEach(rel => {
      rel.epiteti.forEach(e => {
        const e2 = (e || '').trim();
        if (!e2) return;
        ((epiToDiv[e2] ||= {})[rel.divinita] ||= new Set()).add(m.id);
      });
    });
  });
  const sharedEpithets = Object.entries(epiToDiv)
    .filter(([, byDiv]) => Object.keys(byDiv).length >= 2)
    .map(([epiteto, byDiv]) => ({
      epiteto,
      divinita: Object.entries(byDiv)
        .map(([name, ids]) => ({ name, monumentIds: Array.from(ids).sort((a, b) => a - b) }))
        .sort((a, b) => b.monumentIds.length - a.monumentIds.length),
    }))
    .sort((a, b) => b.divinita.length - a.divinita.length);

  return { neverAlone, divVsEpi, sharedEpithets };
}

export function buildOnomasticaIndex(monumenti: Monumento[]): Record<string, OnomasticaStats> {
  const counts: Record<string, number> = {};
  const regions: Record<string, Set<string>> = {};
  monumenti.forEach(m => {
    m.onomastica?.forEach(o => {
      counts[o] = (counts[o] || 0) + 1;
      if (!regions[o]) regions[o] = new Set();
      if (m.regione) regions[o].add(m.regione);
    });
  });
  const index: Record<string, OnomasticaStats> = {};
  Object.entries(counts).forEach(([name, count]) => {
    index[name] = { name, count, regions: Array.from(regions[name] || []) };
  });
  return index;
}
