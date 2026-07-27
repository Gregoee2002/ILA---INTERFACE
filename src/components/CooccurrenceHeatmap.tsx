import React, { useState, useMemo } from 'react';
import { Monumento } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { cn } from '../lib/utils';
import { Grid3X3, ArrowLeftRight } from 'lucide-react';

// "epiteti", "divinita", "onomastica", "imperatori", "materiale", "tipo" e
// "regione" vengono estratti direttamente dal testo dell'edizione (persName,
// idno, origPlace) — disponibili per QUALUNQUE scheda codificata, anche
// senza apparato iconografico. "attributi" e "funzione" invece esistono
// solo se la scheda ha un blocco <xenoData><iconography> — nel corpus
// reale, ancora poco codificato, questi due assi risultano spesso vuoti.
// Per questo NON sono più gli assi di default (vedi useState sotto) e sono
// segnalati nel menu con "(richiede iconografia)".
type AxisType = 'epiteti' | 'divinita' | 'onomastica' | 'imperatori' | 'materiale' | 'tipo' | 'regione' | 'attributi' | 'funzione';

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

// Extraction
const getAxisValues = (m: Monumento, axis: AxisType): string[] => {
  switch (axis) {
    case 'epiteti': return m.epiteti || [];
    case 'divinita': return m.divinita || [];
    case 'onomastica': return m.onomastica || [];
    case 'imperatori': return (m as any).imperatori || [];
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
  // Default su assi SEMPRE popolati (estratti dal testo, non dall'iconografia)
  // — così la heatmap mostra subito qualcosa di utile anche su un corpus
  // dove <xenoData> non è ancora stato compilato, invece di partire vuota.
  const [rowAxis, setRowAxis] = useState<AxisType>('epiteti');
  const [colAxis, setColAxis] = useState<AxisType>('regione');

  const { rowValues, colValues, matrix, rowCounts, colCounts, totalN } = useMemo(() => {
    const rCounts = new Map<string, number>();
    const cCounts = new Map<string, number>();
    const pairCounts = new Map<string, number>();
    
    const total = monumenti.length;

    monumenti.forEach(m => {
      const rVals = getAxisValues(m, rowAxis);
      const cVals = getAxisValues(m, colAxis);

      const uniqueRVals = Array.from(new Set(rVals));
      const uniqueCVals = Array.from(new Set(cVals));

      uniqueRVals.forEach(r => {
        rCounts.set(r, (rCounts.get(r) || 0) + 1);
      });

      uniqueCVals.forEach(c => {
        cCounts.set(c, (cCounts.get(c) || 0) + 1);
      });

      uniqueRVals.forEach(r => {
        uniqueCVals.forEach(c => {
          const key = `${r}::${c}`;
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        });
      });
    });

    const sortedRows = Array.from(rCounts.keys()).sort((a, b) => rCounts.get(b)! - rCounts.get(a)!);
    const sortedCols = Array.from(cCounts.keys()).sort((a, b) => cCounts.get(b)! - cCounts.get(a)!);

    return {
      rowValues: sortedRows,
      colValues: sortedCols,
      matrix: pairCounts,
      rowCounts: rCounts,
      colCounts: cCounts,
      totalN: total
    };
  }, [monumenti, rowAxis, colAxis]);

  const getPMI = (r: string, c: string) => {
    const countAB = matrix.get(`${r}::${c}`) || 0;
    if (countAB === 0) return { count: 0, pmi: null };
    const countA = rowCounts.get(r)!;
    const countB = colCounts.get(c)!;
    
    const pA = countA / totalN;
    const pB = countB / totalN;
    const pAB = countAB / totalN;
    
    // Pointwise Mutual Information: log2( P(A,B) / (P(A) * P(B)) )
    const pmi = Math.log2(pAB / (pA * pB));
    return { count: countAB, pmi };
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

  if (rowValues.length === 0 || colValues.length === 0) {
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
    <div className="bg-parchment p-5 border border-border/50 rounded-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2 mb-1">
            <Grid3X3 className="w-4 h-4 text-accent" />
            Heatmap delle Co-occorrenze (PMI)
          </h2>
          <p className="text-xs text-muted font-sans">
            Analisi delle correlazioni tra due assi del corpus.
          </p>
        </div>
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
        </div>
      </div>

      <div className="flex items-center gap-6 mb-2 text-[10px] text-muted uppercase tracking-wider font-bold">
        <div className="flex items-center gap-2">
          <span>PMI:</span>
          <div className="flex w-32 h-2.5 rounded bg-gradient-to-r from-blue-500 via-white to-amber-500 border border-border/50"></div>
          <span>(Blu = - / Ambra = +)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-border/50 bg-gray-50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }}></div>
          <span>N &lt; 3 (Bassa confidenza)</span>
        </div>
      </div>

      <div className="overflow-auto border border-border/40 bg-white p-4 custom-scrollbar">
        <div className="min-w-max pb-8 pr-8">
          <div className="flex">
            <div className="w-48 shrink-0 border-b border-border/40 border-r"></div>
            <div className="flex border-b border-border/40">
              {colValues.map(c => (
                <div key={c} className="w-8 shrink-0 h-32 relative group">
                  <span className="absolute bottom-2 left-1/2 origin-bottom-left -rotate-45 text-[9px] whitespace-nowrap text-muted uppercase tracking-widest font-medium group-hover:text-ink transition-colors">
                    {translateValue(c, colAxis)}
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
                {colValues.map(c => {
                   const {count, pmi} = getPMI(r, c);
                   const style = getCellBg(count, pmi);
                   const reading = getReading(count, pmi);
                   
                   return (
                     <div 
                       key={c} 
                       title={`Riga: ${translateValue(r, rowAxis)}\nColonna: ${translateValue(c, colAxis)}\nConteggio: ${count}\nPMI: ${pmi !== null ? pmi.toFixed(2) : 'N/A'}\nInterpretazione: ${reading}`}
                       className={cn(
                         "w-8 h-8 shrink-0 border-b border-r border-border/30 flex items-center justify-center font-mono text-[10px] transition-colors hover:border-ink/40 cursor-default",
                         count === 0 ? "text-transparent hover:bg-gray-50/50" : (count < 3 ? "text-ink/50" : "text-ink/90 font-bold"),
                         count > 0 && onSelectCooccurrence ? "cursor-pointer" : ""
                       )}
                       style={style}
                       onClick={() => {
                         if (count > 0 && onSelectCooccurrence) {
                           onSelectCooccurrence(r, c);
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
      
      <div className="mt-4 text-[10px] italic text-muted font-serif border-t border-border/40 pt-3 leading-relaxed">
        La forza dell'associazione (PMI) è indicativa e instabile su piccoli campioni. Il conteggio assoluto è sempre mostrato. Le correlazioni sono ipotesi da verificare sulle fonti, non conclusioni. 
        PMI calcolato come: log2( P(A,B) / (P(A) * P(B)) ).
      </div>
    </div>
  );
};