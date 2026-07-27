import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Monumento } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { Filter, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

// --- Extractors ---
const getEpiteti = (m: Monumento) => m.epiteti || [];
const getRegione = (m: Monumento) => m.regione ? [m.regione] : [];
const getAttributi = (m: Monumento) => {
  if (!m.iconografia || !m.iconografia.figures) return [];
  const traits = new Set<string>();
  m.iconografia.figures.forEach(f => {
    if (f.traits) {
      f.traits.forEach(t => traits.add(t.key));
    }
  });
  return Array.from(traits);
};
const getFunzione = (m: Monumento) => m.iconografia?.function ? [m.iconografia.function] : [];

// --- Filter helper ---
const filterBy = (m: Monumento, values: Set<string>, getter: (m: Monumento) => string[]) => {
  if (values.size === 0) return true;
  const mValues = getter(m);
  return mValues.some(v => values.has(v));
};

interface FacetedFiltersProps {
  monumenti: Monumento[];
  onFilterChange: (filtered: Monumento[]) => void;
}

export const FacetedFilters: React.FC<FacetedFiltersProps> = ({ monumenti, onFilterChange }) => {
  const [selectedEpiteti, setSelectedEpiteti] = useState<Set<string>>(new Set());
  const [selectedRegione, setSelectedRegione] = useState<Set<string>>(new Set());
  const [selectedAttributi, setSelectedAttributi] = useState<Set<string>>(new Set());
  const [selectedFunzione, setSelectedFunzione] = useState<Set<string>>(new Set());

  // Base unique values across the entire corpus
  const allEpiteti = useMemo(() => {
    const set = new Set<string>();
    monumenti.forEach(m => getEpiteti(m).forEach(v => set.add(v)));
    return Array.from(set).sort();
  }, [monumenti]);

  const allRegioni = useMemo(() => {
    const set = new Set<string>();
    monumenti.forEach(m => getRegione(m).forEach(v => set.add(v)));
    return Array.from(set).sort();
  }, [monumenti]);

  const allAttributi = useMemo(() => {
    const set = new Set<string>();
    monumenti.forEach(m => getAttributi(m).forEach(v => set.add(v)));
    return Array.from(set).sort();
  }, [monumenti]);

  const allFunzioni = useMemo(() => {
    const set = new Set<string>();
    monumenti.forEach(m => getFunzione(m).forEach(v => set.add(v)));
    return Array.from(set).sort();
  }, [monumenti]);

  /* 
    Faceted-count algorithm explanation:
    In a true faceted search, when you select a value in Facet A, the available options and counts 
    in Facet B, C, and D are reduced to match only items that have that Facet A value.
    However, within Facet A itself, the counts of OTHER options should NOT go to zero. They should 
    show how many items would match if you ALSO selected them (OR logic within the facet).
    
    Therefore, to compute the counts for Facet X:
    1. Filter the entire dataset by the current selections of all facets *except* Facet X.
    2. Count the occurrences of each possible value of Facet X in this partially-filtered subset.
  */

  const countsEpiteti = useMemo(() => {
    const filtered = monumenti.filter(m => 
      filterBy(m, selectedRegione, getRegione) &&
      filterBy(m, selectedAttributi, getAttributi) &&
      filterBy(m, selectedFunzione, getFunzione)
    );
    const counts = new Map<string, number>();
    filtered.forEach(m => {
      getEpiteti(m).forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    });
    return counts;
  }, [monumenti, selectedRegione, selectedAttributi, selectedFunzione]);

  const countsRegioni = useMemo(() => {
    const filtered = monumenti.filter(m => 
      filterBy(m, selectedEpiteti, getEpiteti) &&
      filterBy(m, selectedAttributi, getAttributi) &&
      filterBy(m, selectedFunzione, getFunzione)
    );
    const counts = new Map<string, number>();
    filtered.forEach(m => {
      getRegione(m).forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    });
    return counts;
  }, [monumenti, selectedEpiteti, selectedAttributi, selectedFunzione]);

  const countsAttributi = useMemo(() => {
    const filtered = monumenti.filter(m => 
      filterBy(m, selectedEpiteti, getEpiteti) &&
      filterBy(m, selectedRegione, getRegione) &&
      filterBy(m, selectedFunzione, getFunzione)
    );
    const counts = new Map<string, number>();
    filtered.forEach(m => {
      getAttributi(m).forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    });
    return counts;
  }, [monumenti, selectedEpiteti, selectedRegione, selectedFunzione]);

  const countsFunzioni = useMemo(() => {
    const filtered = monumenti.filter(m => 
      filterBy(m, selectedEpiteti, getEpiteti) &&
      filterBy(m, selectedRegione, getRegione) &&
      filterBy(m, selectedAttributi, getAttributi)
    );
    const counts = new Map<string, number>();
    filtered.forEach(m => {
      getFunzione(m).forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    });
    return counts;
  }, [monumenti, selectedEpiteti, selectedRegione, selectedAttributi]);

  // Overall filtered subset (AND of all facets)
  const filteredSubset = useMemo(() => {
    return monumenti.filter(m => 
      filterBy(m, selectedEpiteti, getEpiteti) &&
      filterBy(m, selectedRegione, getRegione) &&
      filterBy(m, selectedAttributi, getAttributi) &&
      filterBy(m, selectedFunzione, getFunzione)
    );
  }, [monumenti, selectedEpiteti, selectedRegione, selectedAttributi, selectedFunzione]);

  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  useEffect(() => {
    onFilterChangeRef.current(filteredSubset);
  }, [filteredSubset]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const resetAll = () => {
    setSelectedEpiteti(new Set());
    setSelectedRegione(new Set());
    setSelectedAttributi(new Set());
    setSelectedFunzione(new Set());
  };

  const hasAnyFilters = selectedEpiteti.size > 0 || selectedRegione.size > 0 || selectedAttributi.size > 0 || selectedFunzione.size > 0;

  const renderFacet = (title: string, allValues: string[], counts: Map<string, number>, selected: Set<string>, setter: (s: Set<string>) => void, translate: boolean = false) => {
    const sortedValues = [...allValues].sort((a, b) => {
      const countA = counts.get(a) || 0;
      const countB = counts.get(b) || 0;
      const selA = selected.has(a);
      const selB = selected.has(b);
      if (selA && !selB) return -1;
      if (!selA && selB) return 1;
      if (countA > 0 && countB === 0) return -1;
      if (countA === 0 && countB > 0) return 1;
      if (countA !== countB) return countB - countA;
      return a.localeCompare(b);
    });

    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">{title}</h3>
          {selected.size > 0 && (
            <button onClick={() => setter(new Set())} className="text-[9px] uppercase tracking-wider text-accent hover:underline">
              Azzera
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sortedValues.map(v => {
            const count = counts.get(v) || 0;
            const isSelected = selected.has(v);
            const isDisabled = !isSelected && count === 0;
            const label = translate ? (ICONOGRAPHY_LABELS[v] || v) : v;
            const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
            
            return (
              <button
                key={v}
                disabled={isDisabled}
                onClick={() => toggle(selected, setter, v)}
                className={cn(
                  "px-2 py-1 text-[11px] rounded flex items-center gap-1.5 transition-all border",
                  isSelected 
                    ? "bg-accent/10 border-accent/30 text-accent font-medium shadow-sm" 
                    : isDisabled
                      ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60"
                      : "bg-white border-border/60 text-ink/80 hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
                )}
              >
                <span>{displayLabel}</span>
                <span className={cn(
                  "text-[9px] px-1 rounded-sm tabular-nums",
                  isSelected ? "bg-accent/20 text-accent" : isDisabled ? "text-gray-300" : "bg-gray-100 text-muted"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-parchment p-5 border border-border/50 rounded-md">
      <div className="flex justify-between items-end mb-6 pb-4 border-b border-border/40">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-accent" />
            Filtri Incrociati
          </h2>
          <p className="text-xs text-muted font-sans">
            {filteredSubset.length} iscrizion{filteredSubset.length === 1 ? 'e' : 'i'} trovat{filteredSubset.length === 1 ? 'a' : 'e'}
          </p>
        </div>
        {hasAnyFilters && (
          <button 
            onClick={resetAll}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-accent hover:text-ink transition-colors px-3 py-1.5 border border-accent/20 rounded hover:bg-accent/5"
          >
            <RefreshCcw className="w-3 h-3" /> Reset Filtri
          </button>
        )}
      </div>

      {allRegioni.length > 0 && renderFacet("Regione", allRegioni, countsRegioni, selectedRegione, setSelectedRegione, false)}
      {allEpiteti.length > 0 && renderFacet("Epiteti", allEpiteti, countsEpiteti, selectedEpiteti, setSelectedEpiteti, false)}
      {allFunzioni.length > 0 && renderFacet("Funzione cultuale", allFunzioni, countsFunzioni, selectedFunzione, setSelectedFunzione, true)}
      {allAttributi.length > 0 && renderFacet("Attributi Iconografici", allAttributi, countsAttributi, selectedAttributi, setSelectedAttributi, true)}
    </div>
  );
};
