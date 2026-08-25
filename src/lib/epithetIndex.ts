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
