import React, { useMemo, useState } from 'react';
import { Flag, ChevronRight, Check, RotateCcw, Loader2, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';
import { EntryFlag } from '../types';

/**
 * FlagsPanel — elenco di tutte le segnalazioni scritte dai collaboratori
 * (vedi EntryFlagForm, aperto dal dettaglio di ogni scheda). Sola lettura
 * per chi ha solo la password del sito; risolvere/riaprire richiede lo
 * stesso PAT GitHub usato per l'editing (effectiveAdmin).
 */

interface Props {
  flags: EntryFlag[];
  loading: boolean;
  effectiveAdmin: boolean;
  onLogin: () => void;
  onResolve: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onReopen: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onSelectEntry: (entryId: string) => void;
}

export function FlagsPanel({ flags, loading, effectiveAdmin, onLogin, onResolve, onReopen, onSelectEntry }: Props) {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? flags : flags.filter(f => f.status === filter);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [flags, filter]);

  const openCount = useMemo(() => flags.filter(f => f.status === 'open').length, [flags]);

  async function toggleStatus(f: EntryFlag) {
    setBusyId(f.id);
    await (f.status === 'open' ? onResolve(f.id) : onReopen(f.id));
    setBusyId(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2 flex items-center gap-1.5">
          <Flag className="h-3 w-3" /> Segnalazioni collaboratori
        </div>
        <p className="text-xs font-serif italic text-muted leading-relaxed mb-4">
          Problemi segnalati sulle singole schede del catalogo (vedi il pannello "Segnalazioni" nel dettaglio di
          ogni scheda). {flags.length} segnalazioni totali, {openCount} ancora aperte.
        </p>

        {!effectiveAdmin && (
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-400 bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3">
            <span>Consultazione libera. Per risolvere/riaprire una segnalazione serve l'accesso come amministratore.</span>
            <button onClick={onLogin} className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
              <LogIn className="w-3.5 h-3.5" /> Accedi
            </button>
          </div>
        )}

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
        <div className="text-sm italic text-muted/60 py-12 text-center">
          {flags.length === 0 && !effectiveAdmin
            ? "Nessuna segnalazione visibile — sblocca l'editing per vederle (stesso PAT usato per salvare)."
            : 'Nessuna segnalazione in questa vista.'}
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map(f => (
          <li key={f.id} className={cn('rounded-lg border px-4 py-3', f.status === 'open' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/40 bg-border/10 opacity-70')}>
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => onSelectEntry(f.entryId)}
                className="flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-accent hover:opacity-70 transition-opacity"
              >
                {f.entryLabel || f.entryId} <ChevronRight className="h-3 w-3" />
              </button>
              <span className="text-[9px] font-sans uppercase tracking-wide text-muted/70 shrink-0">
                {new Date(f.createdAt).toLocaleDateString('it-IT')}
              </span>
            </div>
            <p className="text-sm font-serif text-ink leading-relaxed mt-1.5 whitespace-pre-wrap">{f.note}</p>
            {effectiveAdmin && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => toggleStatus(f)}
                  disabled={busyId === f.id}
                  className="text-[10px] font-sans font-bold uppercase tracking-wide text-accent hover:opacity-70 transition-opacity flex items-center gap-1.5"
                >
                  {busyId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : f.status === 'open' ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  {f.status === 'open' ? 'Segna come risolta' : 'Riapri'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
