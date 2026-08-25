import React, { useState, useMemo } from 'react';
import { Monumento } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { cn } from '../lib/utils';
import { getSecoliIndexAttestazione, centuryLabel } from '../lib/chronology';
import { Grid3X3, ArrowLeftRight, Orbit } from 'lucide-react';

// "epiteti", "divinita", "onomastica", "imperatori", "materiale", "tipo" e
// "regione" vengono estratti direttamente dal testo dell'edizione (persName,
// idno, origPlace) — disponibili per QUALUNQUE scheda codificata, anche
// senza apparato iconografico. "attributi" e "funzione" invece esistono
// solo se la scheda ha un blocco <xenoData><iconography> — nel corpus
// reale, ancora poco codificato, questi due assi risultano spesso vuoti.
// Per questo NON sono più gli assi di default (vedi useState sotto) e sono
// segnalati nel menu con "(richiede iconografia)".
type AxisType = 'epiteti' | 'divinita' | 'onomastica' | 'imperatori' | 'materiale' | 'tipo' | 'regione' | 'attributi' | 'funzione';

type Mode = 'pair' | 'multi';

const AXIS_LABELS: Record<AxisType, string> = {
  epiteti: 'Epiteti',
  divinita: 'Divinità',
  onomastica: 'Onomastica (dedicanti)',
  imperatori: 'Imperatori/Sovrani',
  materiale: 'Materiale',
  tipo: 'Tipo di oggetto',
  regione: 'Regione',
  attributi: 'Attributi Iconografici (richiede iconografia)',
  funzione: 'Funzione Cultuale (richiede iconografia)',
};

// Assi che dipendono dal blocco <xenoData> — usati per il messaggio di
// "dati insufficienti" mirato, invece di un avviso generico.
const ICONOGRAPHY_DEPENDENT_AXES: AxisType[] = ['attributi', 'funzione'];

// In modalità Costellazione le colonne sono tuple (prodotto cartesiano di più
// assi): per un corpus con voci molto poliedriche il numero di combinazioni
// osservate può esplodere. Si mostrano solo le N tuple più frequenti.
const MULTI_COLUMN_CAP = 40;
const MAX_EXTRA_AXES = 2;

// Extraction
const getAxisValues = (m: Monumento, axis: AxisType): string[] => {
  switch (axis) {
    case 'epiteti': return m.epiteti || [];
    case 'divinita': return m.divinita || [];
    case 'onomastica': return m.onomastica || [];
    case 'imperatori': return m.imperatori || [];
    case 'materiale': return m.materiale ? [m.materiale] : [];
    case 'tipo': return m.tipo ? [m.tipo] : [];
    case 'regione': return m.regione ? [m.regione] : [];
    case 'funzione': return m.iconografia?.function ? [m.iconografia.function] : [];
    case 'attributi': {
      if (!m.iconografia || !m.iconografia.figures) return [];
      const traits = new Set<string>();
      m.iconografia.figures.forEach(f => {
        if (f.traits) f.traits.forEach(t => traits.add(t.key));
      });
      return Array.from(traits);
    }
  }
};

const translateValue = (val: string, axis: AxisType) => {
  if (axis === 'attributi' || axis === 'funzione') {
    const t = ICONOGRAPHY_LABELS[val] || val;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return val;
};

interface CooccurrenceHeatmapProps {
  monumenti: Monumento[];
  onSelectCooccurrence?: (rowValue: string, colValue: string) => void;
}

export const CooccurrenceHeatmap: React.FC<CooccurrenceHeatmapProps> = ({ monumenti, onSelectCooccurrence }) => {
  // "Coppia" è la modalità di default: confronto semplice a due assi.
  const [mode, setMode] = useState<Mode>('pair');

  // Default su assi SEMPRE popolati (estratti dal testo, non dall'iconografia)
  // — così la heatmap mostra subito qualcosa di utile anche su un corpus
  // dove <xenoData> non è ancora stato compilato, invece di partire vuota.
  const [rowAxis, setRowAxis] = useState<AxisType>('epiteti');
  const [colAxis, setColAxis] = useState<AxisType>('regione');
  // Fattori aggiuntivi combinati con colAxis in modalità Costellazione
  // (prodotto cartesiano dei valori -> colonne composite).
  const [extraColAxes, setExtraColAxes] = useState<AxisType[]>(['materiale']);

  // Filtro opzionale per secolo di attestazione (da data_inizio/data_fine).
  // null = nessun filtro, tutte le schede indipendentemente dalla datazione.
  const [centuryFilter, setCenturyFilter] = useState<number | null>(null);

  const availableCenturies = useMemo(() => {
    const set = new Set<number>();
    monumenti.forEach(m => {
      getSecoliIndexAttestazione(m.data_inizio, m.data_fine).forEach(i => set.add(i));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [monumenti]);

  const monumentiFiltrati = useMemo(() => {
    if (centuryFilter === null) return monumenti;
    return monumenti.filter(m =>
      getSecoliIndexAttestazione(m.data_inizio, m.data_fine).includes(centuryFilter)
    );
  }, [monumenti, centuryFilter]);

  const colAxesList = useMemo<AxisType[]>(() => {
    if (mode === 'pair') return [colAxis];
    const list = [colAxis, ...extraColAxes].filter(a => a !== rowAxis);
    return Array.from(new Set(list));
  }, [mode, colAxis, extraColAxes, rowAxis]);

  const toggleExtraAxis = (axis: AxisType) => {
    setExtraColAxes(prev => {
      if (prev.includes(axis)) return prev.filter(a => a !== axis);
      if (prev.length >= MAX_EXTRA_AXES) return prev;
      return [...prev, axis];
    });
  };

  // La coppia di assi Divinità×Epiteti non può usare il cross-product piatto
  // generico: un'iscrizione con due divinità dove solo una ha un epiteto
  // finirebbe per accreditare quell'epiteto a ENTRAMBE. Per questa coppia
  // specifica si usa l'associazione per-persName in `m.divinitaEpiteti`
  // (vedi src/types.ts e src/lib/xmlUtils.ts). Per ogni altra coppia di assi
  // il cross-product a livello di monumento resta corretto e va lasciato.
  // Vale solo in modalità Coppia: in Costellazione la colonna è composita e
  // l'associazione per-persName non si generalizza a N assi.
  const isDivinitaEpitetiPair =
    mode === 'pair' &&
    ((rowAxis === 'divinita' && colAxis === 'epiteti') ||
      (rowAxis === 'epiteti' && colAxis === 'divinita'));

  const { rowValues, colTuples, matrix, rowCounts, compMarginals, totalN } = useMemo(() => {
    const rCounts = new Map<string, number>();
    const compMarginals = new Map<AxisType, Map<string, number>>();
    colAxesList.forEach(a => compMarginals.set(a, new Map()));
    const pairCounts = new Map<string, number>(); // key: `${r}::${tuple.join('::')}`
    const tupleByKey = new Map<string, string[]>();

    const total = monumentiFiltrati.length;

    monumentiFiltrati.forEach(m => {
      const rVals = Array.from(new Set(getAxisValues(m, rowAxis)));
      rVals.forEach(r => rCounts.set(r, (rCounts.get(r) || 0) + 1));

      const perAxisVals = colAxesList.map(a => Array.from(new Set(getAxisValues(m, a))));
      colAxesList.forEach((a, idx) => {
        const marg = compMarginals.get(a)!;
        perAxisVals[idx].forEach(v => marg.set(v, (marg.get(v) || 0) + 1));
      });

      if (isDivinitaEpitetiPair && m.divinitaEpiteti) {
        m.divinitaEpiteti.forEach(({ divinita: d, epiteti: eps }) => {
          eps.forEach(e => {
            const rVal = rowAxis === 'divinita' ? d : e;
            const cVal = rowAxis === 'divinita' ? e : d;
            const key = `${rVal}::${cVal}`;
            tupleByKey.set(cVal, [cVal]);
            pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
          });
        });
        return;
      }

      // Un monumento senza valore su uno degli assi colonna selezionati non
      // partecipa alla tupla (non esiste un'osservazione completa da contare).
      if (perAxisVals.some(vals => vals.length === 0)) return;

      let tuples: string[][] = [[]];
      perAxisVals.forEach(vals => {
        const next: string[][] = [];
        tuples.forEach(t => vals.forEach(v => next.push([...t, v])));
        tuples = next;
      });

      rVals.forEach(r => {
        tuples.forEach(tuple => {
          const tupleKey = tuple.join('::');
          tupleByKey.set(tupleKey, tuple);
          const key = `${r}::${tupleKey}`;
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        });
      });
    });

    const sortedRows = Array.from(rCounts.keys()).sort((a, b) => rCounts.get(b)! - rCounts.get(a)!);

    const tupleTotals = new Map<string, number>();
    pairCounts.forEach((cnt, key) => {
      const tupleKey = key.slice(key.indexOf('::') + 2);
      tupleTotals.set(tupleKey, (tupleTotals.get(tupleKey) || 0) + cnt);
    });
    const cap = mode === 'multi' ? MULTI_COLUMN_CAP : Infinity;
    const sortedTupleKeys = Array.from(tupleTotals.keys())
      .sort((a, b) => tupleTotals.get(b)! - tupleTotals.get(a)!)
      .slice(0, cap);
    const colTuples = sortedTupleKeys.map(k => tupleByKey.get(k)!);

    return {
      rowValues: sortedRows,
      colTuples,
      matrix: pairCounts,
      rowCounts: rCounts,
      compMarginals,
      totalN: total,
    };
  }, [monumentiFiltrati, rowAxis, colAxesList, mode, isDivinitaEpitetiPair]);

  // Generalizzazione della PMI a N fattori: confronta la probabilità
  // congiunta osservata P(riga, colonna_1, ..., colonna_k) con quella attesa
  // sotto indipendenza reciproca di TUTTI i fattori coinvolti,
  // P(riga) × P(colonna_1) × ... × P(colonna_k). Con un solo asse colonna
  // (modalità Coppia) questo collassa esattamente alla PMI a due vie.
  const getPMI = (r: string, tuple: string[]) => {
    const key = `${r}::${tuple.join('::')}`;
    const count = matrix.get(key) || 0;
    if (count === 0) return { count: 0, pmi: null };

    const countA = rowCounts.get(r)!;
    let pIndependent = countA / totalN;
    colAxesList.forEach((axis, idx) => {
      const marg = compMarginals.get(axis)!;
      const cnt = marg.get(tuple[idx]) || 0;
      pIndependent *= cnt / totalN;
    });

    const pJoint = count / totalN;
    const pmi = Math.log2(pJoint / pIndependent);
    return { count, pmi };
  };

  const getReading = (count: number, pmi: number | null) => {
    if (count === 0 || pmi === null) return "Nessuna associazione";
    if (count < 3) return "Non significativo (N basso)";
    if (pmi > 0) return "Associazione più forte del previsto";
    if (pmi < 0) return "Associazione più debole del previsto";
    return "Associazione in linea con le attese";
  };

  const getCellBg = (count: number, pmi: number | null) => {
    if (count === 0 || pmi === null) return { backgroundColor: 'transparent' };

    // Scale intensity based on PMI absolute value (cap at ~4 for max intensity)
    const intensity = Math.min(Math.abs(pmi) / 4, 1) * 0.6 + 0.1;
    const r = pmi > 0 ? 245 : 59;
    const g = pmi > 0 ? 158 : 130;
    const b = pmi > 0 ? 11 : 246;
    const baseColor = `rgba(${r}, ${g}, ${b}, ${intensity})`;

    if (count < 3) {
      return {
        backgroundColor: baseColor,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)`
      };
    }
    return { backgroundColor: baseColor };
  };

  const colLabel = (tuple: string[]) =>
    tuple.map((v, idx) => translateValue(v, colAxesList[idx])).join(' · ');

  const colTooltipLines = (tuple: string[]) =>
    tuple.map((v, idx) => `${AXIS_LABELS[colAxesList[idx]]}: ${translateValue(v, colAxesList[idx])}`).join('\n');

  const remainingAxesForExtra = (Object.keys(AXIS_LABELS) as AxisType[]).filter(
    a => a !== rowAxis && a !== colAxis
  );

  if (centuryFilter !== null && monumentiFiltrati.length === 0) {
    return (
      <div className="p-4 text-sm text-muted max-w-md">
        <p className="mb-1">
          Nessuna scheda datata al secolo "<strong>{centuryLabel(centuryFilter)}</strong>".
        </p>
        <p className="text-xs text-muted/70">
          Prova un altro secolo, oppure{' '}
          <button type="button" onClick={() => setCenturyFilter(null)} className="underline hover:text-accent">
            rimuovi il filtro
          </button>.
        </p>
      </div>
    );
  }

  if (rowValues.length === 0 || colTuples.length === 0) {
    const emptyAxis = rowValues.length === 0 ? rowAxis : colAxis;
    const isIconographyIssue = ICONOGRAPHY_DEPENDENT_AXES.includes(emptyAxis);
    return (
      <div className="p-4 text-sm text-muted max-w-md">
        <p className="mb-1">
          Dati insufficienti per generare la heatmap: nessun valore trovato per l'asse
          "<strong>{AXIS_LABELS[emptyAxis]}</strong>".
        </p>
        <p className="text-xs text-muted/70">
          {isIconographyIssue
            ? 'Questo asse dipende dal blocco <xenoData><iconography> — resta vuoto finché le schede non hanno l\'apparato iconografico codificato. Prova un altro asse (es. Epiteti, Divinità, Regione) per lavorare sui dati testuali già disponibili.'
            : 'Verifica che le schede del corpus abbiano questo campo compilato, oppure prova un altro asse dal menu qui sopra.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-parchment p-5 border border-border/50 rounded-md flex flex-col h-full min-h-0">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4 shrink-0">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2 mb-1">
            {mode === 'multi' ? <Orbit className="w-4 h-4 text-accent" /> : <Grid3X3 className="w-4 h-4 text-accent" />}
            {mode === 'multi' ? 'Costellazione delle Co-occorrenze' : 'Heatmap delle Co-occorrenze (PMI)'}
          </h2>
          <p className="text-xs text-muted font-sans">
            {mode === 'multi'
              ? `Correlazione tra Riga e ${colAxesList.length} fattori combinati, rispetto all'indipendenza reciproca di tutti.`
              : 'Analisi delle correlazioni tra due assi del corpus.'}
          </p>
        </div>

        <div className="flex rounded-md border border-border/50 bg-white overflow-hidden shrink-0" role="group" aria-label="Modalità heatmap">
          <button
            type="button"
            onClick={() => setMode('pair')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
              mode === 'pair' ? "bg-accent text-white" : "text-muted hover:text-ink"
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Coppia
          </button>
          <button
            type="button"
            onClick={() => setMode('multi')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors border-l border-border/50",
              mode === 'multi' ? "bg-accent text-white" : "text-muted hover:text-ink"
            )}
          >
            <Orbit className="w-3.5 h-3.5" /> Costellazione
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-start mb-4 shrink-0">
        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Asse Righe</label>
            <select
              value={rowAxis}
              onChange={e => setRowAxis(e.target.value as AxisType)}
              className="border border-border/50 bg-white text-xs p-1.5 rounded outline-none focus:border-accent"
            >
              {(Object.entries(AXIS_LABELS) as [AxisType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setRowAxis(colAxis); setColAxis(rowAxis); }}
            title="Scambia righe e colonne"
            className="mb-1.5 p-1.5 rounded border border-border/50 bg-white text-muted hover:text-accent hover:border-accent transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Asse Colonne</label>
            <select
              value={colAxis}
              onChange={e => setColAxis(e.target.value as AxisType)}
              className="border border-border/50 bg-white text-xs p-1.5 rounded outline-none focus:border-accent"
            >
              {(Object.entries(AXIS_LABELS) as [AxisType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Secolo</label>
            <select
              value={centuryFilter === null ? '' : String(centuryFilter)}
              onChange={e => setCenturyFilter(e.target.value === '' ? null : Number(e.target.value))}
              disabled={availableCenturies.length === 0}
              className="border border-border/50 bg-white text-xs p-1.5 rounded outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">Tutti i secoli</option>
              {availableCenturies.map(i => (
                <option key={i} value={i}>{centuryLabel(i)}</option>
              ))}
            </select>
          </div>
        </div>

        {mode === 'multi' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
              + Combina con (max {MAX_EXTRA_AXES})
            </label>
            <div className="flex flex-wrap gap-1.5 max-w-md">
              {remainingAxesForExtra.map(a => {
                const checked = extraColAxes.includes(a);
                const disabled = !checked && extraColAxes.length >= MAX_EXTRA_AXES;
                return (
                  <label
                    key={a}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium cursor-pointer transition-colors",
                      checked ? "border-accent bg-accent/10 text-ink" : "border-border/50 bg-white text-muted",
                      disabled ? "opacity-40 cursor-not-allowed" : "hover:border-accent"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="w-3 h-3"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleExtraAxis(a)}
                    />
                    {AXIS_LABELS[a].replace(' (richiede iconografia)', '')}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 mb-2 text-[10px] text-muted uppercase tracking-wider font-bold flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <span>PMI:</span>
          <div className="flex w-32 h-2.5 rounded bg-gradient-to-r from-blue-500 via-white to-amber-500 border border-border/50"></div>
          <span>(Blu = - / Ambra = +)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-border/50 bg-gray-50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }}></div>
          <span>N &lt; 3 (Bassa confidenza)</span>
        </div>
        {mode === 'multi' && colTuples.length === MULTI_COLUMN_CAP && (
          <span className="normal-case text-muted/70">Mostrate le {MULTI_COLUMN_CAP} combinazioni più frequenti.</span>
        )}
      </div>

      <div className="overflow-auto border border-border/40 bg-white p-4 custom-scrollbar flex-1 min-h-0">
        <div className="min-w-max pb-8 pr-8">
          <div className="flex">
            <div className="w-48 shrink-0 border-b border-border/40 border-r"></div>
            <div className="flex border-b border-border/40">
              {colTuples.map(tuple => (
                <div key={tuple.join('::')} className="w-8 shrink-0 h-32 relative group">
                  <span className="absolute bottom-2 left-1/2 origin-bottom-left -rotate-45 text-[9px] whitespace-nowrap text-muted uppercase tracking-widest font-medium group-hover:text-ink transition-colors">
                    {colLabel(tuple)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {rowValues.map(r => (
            <div key={r} className="flex">
              <div className="w-48 shrink-0 flex items-center justify-end pr-3 border-r border-border/40 group">
                <span className="text-[10px] text-muted group-hover:text-ink text-right truncate font-medium uppercase tracking-widest transition-colors">
                  {translateValue(r, rowAxis)}
                </span>
              </div>
              <div className="flex">
                {colTuples.map(tuple => {
                   const {count, pmi} = getPMI(r, tuple);
                   const style = getCellBg(count, pmi);
                   const reading = getReading(count, pmi);
                   const tupleKey = tuple.join('::');

                   return (
                     <div
                       key={tupleKey}
                       title={`Riga: ${translateValue(r, rowAxis)}\n${colTooltipLines(tuple)}\nConteggio: ${count}\nPMI: ${pmi !== null ? pmi.toFixed(2) : 'N/A'}\nInterpretazione: ${reading}`}
                       className={cn(
                         "w-8 h-8 shrink-0 border-b border-r border-border/30 flex items-center justify-center font-mono text-[10px] transition-colors hover:border-ink/40 cursor-default",
                         count === 0 ? "text-transparent hover:bg-gray-50/50" : (count < 3 ? "text-ink/50" : "text-ink/90 font-bold"),
                         count > 0 && onSelectCooccurrence ? "cursor-pointer" : ""
                       )}
                       style={style}
                       onClick={() => {
                         if (count > 0 && onSelectCooccurrence) {
                           onSelectCooccurrence(r, colLabel(tuple));
                         }
                       }}
                     >
                       {count > 0 ? count : ''}
                     </div>
                   );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-[10px] italic text-muted font-serif border-t border-border/40 pt-3 leading-relaxed shrink-0">
        La forza dell'associazione (PMI) è indicativa e instabile su piccoli campioni. Il conteggio assoluto è sempre mostrato. Le correlazioni sono ipotesi da verificare sulle fonti, non conclusioni.{' '}
        {mode === 'multi'
          ? "In modalità Costellazione la PMI generalizza il confronto a N fattori: P(riga, colonna₁, …, colonnaₖ) rispetto al prodotto delle probabilità marginali di ciascun fattore preso singolarmente, cioè al valore atteso sotto indipendenza reciproca di tutti."
          : 'PMI calcolato come: log2( P(A,B) / (P(A) * P(B)) ).'}
      </div>
    </div>
  );
};
