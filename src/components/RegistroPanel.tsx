import { useMemo, useState } from 'react';
import { NotebookPen, ChevronRight, Check, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { EntryRegistro } from '../types';

/**
 * RegistroPanel — elenco di tutti i registri di lavorazione aperti dai
 * collaboratori sulle schede del catalogo (vedi RegistroForm, aperto dal
 * dettaglio di ogni scheda). Interamente nascosto a chi non ha sbloccato
 * l'editing — vedi effectiveAdmin in App.tsx, che qui non richiede nemmeno
 * la fetch dei dati.
 */

interface Props {
  registri: EntryRegistro[];
  loading: boolean;
  onResolve: (entryId: string) => Promise<{ ok: boolean; error?: string }>;
  onReopen: (entryId: string) => Promise<{ ok: boolean; error?: string }>;
  onSelectEntry: (entryId: string) => void;
}

export function RegistroPanel({ registri, loading, onResolve, onReopen, onSelectEntry }: Props) {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? registri : registri.filter(r => r.status === filter);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [registri, filter]);

  const openCount = useMemo(() => registri.filter(r => r.status === 'open').length, [registri]);

  async function toggleStatus(r: EntryRegistro) {
    setBusyId(r.entryId);
    await (r.status === 'open' ? onResolve(r.entryId) : onReopen(r.entryId));
    setBusyId(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2 flex items-center gap-1.5">
          <NotebookPen className="h-3 w-3" /> Registro collaboratori
        </div>
        <p className="text-xs font-serif italic text-muted leading-relaxed mb-4">
          Lavorazioni in corso sulle singole schede del catalogo (vedi il pannello "Registro" nel dettaglio di
          ogni scheda). {registri.length} schede in registro, {openCount} ancora aperte.
        </p>

        <div className="flex gap-1.5">
          {(['open', 'resolved', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-colors',
                filter === f ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-ink'
              )}
            >
              {f === 'open' ? 'Aperte' : f === 'resolved' ? 'Risolte' : 'Tutte'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-xs text-muted italic">Caricamento…</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-sm italic text-muted/60 py-12 text-center">Nessuna scheda in questa vista.</div>
      )}

      <ul className="space-y-3">
        {filtered.map(r => {
          const lastNote = [...r.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          return (
            <li key={r.entryId} className={cn('rounded-lg border px-4 py-3', r.status === 'open' ? 'border-warning/25 bg-warning/10' : 'border-border/40 bg-border/10 opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => onSelectEntry(r.entryId)}
                  className="flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-accent hover:opacity-70 transition-opacity"
                >
                  {r.entryLabel || r.entryId} <ChevronRight className="h-3 w-3" />
                </button>
                <span className="text-[9px] font-sans uppercase tracking-wide text-muted/70 shrink-0">
                  {r.notes.length} {r.notes.length === 1 ? 'nota' : 'note'}
                </span>
              </div>
              {lastNote && (
                <>
                  <p className="text-sm font-serif text-ink leading-relaxed mt-1.5 whitespace-pre-wrap">{lastNote.testo}</p>
                  <span className="block text-[9px] font-sans uppercase tracking-wide text-muted/70 mt-1">
                    {lastNote.author} · {new Date(lastNote.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </>
              )}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => toggleStatus(r)}
                  disabled={busyId === r.entryId}
                  className="text-[10px] font-sans font-bold uppercase tracking-wide text-accent hover:opacity-70 transition-opacity flex items-center gap-1.5"
                >
                  {busyId === r.entryId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.status === 'open' ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  {r.status === 'open' ? 'Segna come risolto' : 'Riapri'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
