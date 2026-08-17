import React, { useState } from 'react';
import { Flag, LogIn, Check, RotateCcw, Loader2 } from 'lucide-react';
import { EntryFlag } from '../types';

/**
 * EntryFlagForm — sezione "Segnalazioni" nel pannello di dettaglio di una
 * scheda: elenca le segnalazioni già aperte su questa scheda e permette a
 * un collaboratore (sbloccato con lo stesso PAT dell'editing, vedi
 * effectiveAdmin in App.tsx) di scriverne una nuova.
 */

interface Props {
  entryId: string;
  entryLabel: string;
  flags: EntryFlag[];
  effectiveAdmin: boolean;
  onLogin: () => void;
  onCreate: (entryId: string, entryLabel: string, note: string) => Promise<{ ok: boolean; error?: string }>;
  onResolve: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onReopen: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function EntryFlagForm({ entryId, entryLabel, flags, effectiveAdmin, onLogin, onCreate, onResolve, onReopen }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const entryFlags = flags.filter(f => f.entryId === entryId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openFlags = entryFlags.filter(f => f.status === 'open');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await onCreate(entryId, entryLabel, note.trim());
    setSubmitting(false);
    if (result.ok) {
      setNote('');
      setShowForm(false);
    } else {
      setError(result.error || 'Errore nel salvataggio');
    }
  }

  async function toggleStatus(f: EntryFlag) {
    setBusyId(f.id);
    await (f.status === 'open' ? onResolve(f.id) : onReopen(f.id));
    setBusyId(null);
  }

  return (
    <section className="pt-6 border-t border-border/40 mt-6 space-y-3">
      <h4 className="font-sans field-label opacity-85 pb-1 flex items-center gap-1.5">
        <Flag className="h-3 w-3" /> Segnalazioni {openFlags.length > 0 && <span className="text-accent">({openFlags.length})</span>}
      </h4>

      {entryFlags.length > 0 && (
        <ul className="space-y-2">
          {entryFlags.map(f => (
            <li key={f.id} className={`text-xs font-serif rounded-sm border px-2.5 py-2 ${f.status === 'open' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/40 bg-border/10 opacity-60'}`}>
              <p className="text-ink leading-snug whitespace-pre-wrap">{f.note}</p>
              <div className="flex items-center justify-between mt-1.5 gap-2">
                <span className="text-[9px] font-sans uppercase tracking-wide text-muted/70">
                  {new Date(f.createdAt).toLocaleDateString('it-IT')} · {f.status === 'open' ? 'Aperta' : 'Risolta'}
                </span>
                {effectiveAdmin && (
                  <button
                    onClick={() => toggleStatus(f)}
                    disabled={busyId === f.id}
                    className="text-[9px] font-sans font-bold uppercase tracking-wide text-accent hover:opacity-70 transition-opacity flex items-center gap-1 shrink-0"
                  >
                    {busyId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : f.status === 'open' ? <Check className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                    {f.status === 'open' ? 'Risolvi' : 'Riapri'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!effectiveAdmin && (
        <button
          onClick={onLogin}
          className="w-full py-2 border border-border text-muted hover:text-ink hover:border-accent/40 font-sans text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-sm"
        >
          <LogIn className="h-3 w-3" /> Accedi per segnalare un problema
        </button>
      )}

      {effectiveAdmin && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2 border border-border text-muted hover:text-ink hover:border-accent/40 font-sans text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-sm"
        >
          <Flag className="h-3 w-3" /> Segnala un problema
        </button>
      )}

      {effectiveAdmin && showForm && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Descrivi il problema riscontrato su questa scheda…"
            rows={3}
            className="w-full text-xs font-serif rounded-sm border border-border bg-sidebar px-2.5 py-2 outline-none focus:border-accent transition-colors resize-none"
          />
          {error && <p className="text-[10px] text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !note.trim()}
              className="flex-1 py-1.5 bg-accent hover:bg-accent/90 text-white font-sans text-[9px] font-bold uppercase tracking-widest transition-colors rounded-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Invia segnalazione
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-3 py-1.5 text-muted hover:text-ink font-sans text-[9px] font-bold uppercase tracking-widest transition-colors rounded-sm"
            >
              Annulla
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
