import { useMemo, useState } from 'react';
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
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 md:p-10 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="font-serif text-xl text-ink mb-2">Registro dei collaboratori</h2>
        <p className="font-sans text-[11px] text-muted leading-relaxed mb-4">
          Lavorazioni in corso sulle singole schede del catalogo (vedi il pannello "Registro" nel dettaglio di
          ogni scheda). {registri.length} schede in registro, {openCount} ancora aperte.
        </p>

        <div className="flex items-baseline gap-2.5">
          {(['open', 'resolved', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'font-serif text-[13px] transition-colors',
                filter === f ? 'text-accent italic' : 'text-muted hover:text-ink'
              )}
            >
              {f === 'open' ? 'aperte' : f === 'resolved' ? 'risolte' : 'tutte'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-xs text-muted italic">Caricamento…</div>}

      {!loading && filtered.length === 0 && (
        <div className="font-serif italic text-sm text-muted/60 py-12 text-center">Nessuna scheda in questa vista.</div>
      )}

      <ul className="space-y-3">
        {filtered.map(r => {
          const lastNote = [...r.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          return (
            <li key={r.entryId} className={cn('border-l-2 pl-4 py-2', r.status === 'open' ? 'border-warning/40' : 'border-border/50 opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => onSelectEntry(r.entryId)}
                  className="font-serif italic text-[13px] text-accent hover:opacity-70 transition-opacity"
                >
                  {r.entryLabel || r.entryId}
                </button>
                <span className="font-serif italic text-[12px] text-muted/60 shrink-0">
                  {r.notes.length} {r.notes.length === 1 ? 'nota' : 'note'}
                </span>
              </div>
              {lastNote && (
                <>
                  <p className="text-sm font-serif text-ink leading-relaxed mt-1.5 whitespace-pre-wrap">{lastNote.testo}</p>
                  <span className="block font-serif italic text-[12px] text-muted/60 mt-1">
                    {lastNote.author} · {new Date(lastNote.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </>
              )}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => toggleStatus(r)}
                  disabled={busyId === r.entryId}
                  className="font-serif italic text-[13px] text-accent hover:opacity-70 transition-opacity"
                >
                  {busyId === r.entryId ? 'in corso…' : r.status === 'open' ? 'Segna come risolto' : 'Riapri'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}
