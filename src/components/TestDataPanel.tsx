import React, { useMemo, useState } from 'react';
import { FlaskConical, BookOpen } from 'lucide-react';
import { Monumento } from '../types';
import { cn } from '../lib/utils';

/**
 * TestDataPanel
 * --------------
 * Pannello DIAGNOSTICO separato dal resto dell'app — non modifica, non
 * filtra e non intacca `filteredMonumenti`, `EpithetStats`, `CorpusHealth`
 * né nessun'altra logica esistente. Legge `monumenti` in sola lettura e
 * mostra la composizione reale del corpus caricato: quante schede sono
 * dati scientifici (CMRDM/Lane) e quante sono entry fittizie generate per
 * collaudare cronologia/heatmap/indici.
 *
 * Pensato per essere mostrato così com'è (es. alla relatrice) per rendere
 * esplicita e verificabile la distinzione reale/test, senza dover fidarsi
 * a parole di quali schede siano "vere".
 */

// Marker scritto in <authority> dallo script di generazione dati di test
// (vedi sessione "Generare dati fittizi per testare cronologia e heatmap").
// Unica fonte di verità per il riconoscimento: se lo script cambia il
// marker, va aggiornato solo qui.
export const TEST_DATA_MARKER = 'DATO FITTIZIO';

export function isTestEntry(m: Monumento): boolean {
  return !!m.authority && m.authority.includes(TEST_DATA_MARKER);
}

function countBy(list: Monumento[], keyFn: (m: Monumento) => string): [string, number][] {
  const map = new Map<string, number>();
  list.forEach(m => {
    const key = keyFn(m) || '—';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

interface TestDataPanelProps {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
}

export function TestDataPanel({ monumenti, onSelectMonumento }: TestDataPanelProps) {
  const { real, test } = useMemo(() => {
    const real: Monumento[] = [];
    const test: Monumento[] = [];
    monumenti.forEach(m => (isTestEntry(m) ? test : real).push(m));
    return { real, test };
  }, [monumenti]);

  const [expanded, setExpanded] = useState<'real' | 'test' | null>('test');

  const realByRegione = useMemo(() => countBy(real, m => m.regione), [real]);
  const testByRegione = useMemo(() => countBy(test, m => m.regione), [test]);

  const total = monumenti.length || 1; // evita divisione per zero
  const testPct = Math.round((test.length / total) * 100);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="mb-8 max-w-2xl">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">
          Diagnostica corpus — pannello separato
        </div>
        <h2 className="text-2xl font-serif font-semibold text-ink mb-2">Entry reali vs. dati di test</h2>
        <p className="text-sm text-muted font-serif italic leading-relaxed">
          Questa vista è indipendente dal resto dell'app: non modifica il catalogo, i filtri o le
          altre statistiche. Mostra soltanto, in modo esplicito, quali schede sono dati scientifici
          (CMRDM/Lane) e quali sono entry fittizie generate per collaudare funzionalità come
          cronologia e heatmap. Il riconoscimento è automatico: cerca la dicitura "{TEST_DATA_MARKER}"
          nel campo <code className="text-[11px] bg-black/5 px-1 rounded">authority</code> di ogni scheda.
        </p>
      </div>

      {/* Overview numerica */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="glass-panel rounded-2xl p-5 border-l-[4px] border-l-accent">
          <div className="flex items-center gap-2 mb-1 text-muted">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Entry reali</span>
          </div>
          <div className="text-3xl font-serif font-semibold text-ink">{real.length}</div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-[4px] border-l-amber-500">
          <div className="flex items-center gap-2 mb-1 text-muted">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Entry di test (fittizie)</span>
          </div>
          <div className="text-3xl font-serif font-semibold text-ink">{test.length}</div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">
            Quota di dati fittizi sul totale
          </div>
          <div className="text-3xl font-serif font-semibold text-ink">{testPct}%</div>
          <div className="mt-2 h-1.5 w-full bg-border/30 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${testPct}%` }} />
          </div>
        </div>
      </div>

      {/* Breakdown per regione, affiancati */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Reali per regione</h3>
          <div className="space-y-1.5">
            {realByRegione.length === 0 && <div className="text-xs italic text-muted/60">Nessuna scheda reale caricata</div>}
            {realByRegione.map(([regione, count]) => (
              <div key={regione} className="flex items-center justify-between text-xs font-serif">
                <span className="text-ink">{regione}</span>
                <span className="font-mono text-muted">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Test per regione</h3>
          <div className="space-y-1.5">
            {testByRegione.length === 0 && <div className="text-xs italic text-muted/60">Nessuna entry di test caricata</div>}
            {testByRegione.map(([regione, count]) => (
              <div key={regione} className="flex items-center justify-between text-xs font-serif">
                <span className="text-ink">{regione}</span>
                <span className="font-mono text-muted">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Elenchi espandibili, con badge esplicito su ogni riga */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setExpanded(expanded === 'real' ? null : 'real')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-colors",
              expanded === 'real' ? "bg-accent text-white border-accent" : "border-border/40 text-muted hover:text-ink"
            )}
          >
            Elenco reali ({real.length})
          </button>
          <button
            onClick={() => setExpanded(expanded === 'test' ? null : 'test')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-colors",
              expanded === 'test' ? "bg-amber-500 text-white border-amber-500" : "border-border/40 text-muted hover:text-ink"
            )}
          >
            Elenco test ({test.length})
          </button>
        </div>

        {expanded && (
          <div className="max-h-96 overflow-y-auto divide-y divide-border/20">
            {(expanded === 'real' ? real : test).map(m => (
              <div
                key={m.entryId || m.id}
                className="flex items-center gap-3 py-2 px-2 hover:bg-accent/5 cursor-pointer transition-colors"
                onClick={() => onSelectMonumento(m)}
              >
                <span className="font-mono text-[10px] text-muted w-12 shrink-0">#{m.id.toString().padStart(3, '0')}</span>
                <span className="text-xs font-serif flex-1 truncate">{m.titolo || m.citta || '—'}</span>
                <span className="text-[9px] text-muted/60 uppercase shrink-0">{m.regione || '—'}</span>
                {isTestEntry(m) && (
                  <span className="text-[8px] font-bold uppercase tracking-wide text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded-sm border border-amber-500/20 shrink-0">
                    TEST
                  </span>
                )}
              </div>
            ))}
            {(expanded === 'real' ? real : test).length === 0 && (
              <div className="text-xs italic text-muted/60 py-3">Nessuna scheda in questa categoria.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
