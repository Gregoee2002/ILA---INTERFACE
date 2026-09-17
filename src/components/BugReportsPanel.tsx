import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { BugReport } from '../types';

/**
 * BugReportsPanel — analogo del Registro (vedi RegistroPanel/RegistroForm)
 * ma per problemi di funzionamento dell'app segnalati dai collaboratori,
 * non legati a una scheda specifica. Interamente nascosto a chi non ha
 * sbloccato l'editing (vedi effectiveAdmin in App.tsx).
 */

const LAST_AUTHOR_KEY = 'ila-registro-last-author';

interface Props {
  bugs: BugReport[];
  loading: boolean;
  knownAuthors: string[];
  onCreate: (author: string, note: string) => Promise<{ ok: boolean; error?: string }>;
  onResolve: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onReopen: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function BugReportsPanel({ bugs, loading, knownAuthors, onCreate, onResolve, onReopen }: Props) {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState(() => localStorage.getItem(LAST_AUTHOR_KEY) || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? bugs : bugs.filter(b => b.status === filter);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bugs, filter]);

  const openCount = useMemo(() => bugs.filter(b => b.status === 'open').length, [bugs]);

  async function toggleStatus(b: BugReport) {
    setBusyId(b.id);
    await (b.status === 'open' ? onResolve(b.id) : onReopen(b.id));
    setBusyId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !author.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await onCreate(author.trim(), note.trim());
    setSubmitting(false);
    if (result.ok) {
      localStorage.setItem(LAST_AUTHOR_KEY, author.trim());
      setNote('');
      setShowForm(false);
    } else {
      setError(result.error || 'Errore nel salvataggio');
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 md:p-10 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <div className="font-serif text-xl text-ink mb-2">
          Bug segnalati
        </div>
        <p className="text-xs font-serif italic text-muted leading-relaxed mb-4">
          Problemi di funzionamento dell'app segnalati dai collaboratori. {bugs.length} segnalazioni totali, {openCount} ancora aperte.
        </p>

        <div className="flex gap-1.5 mb-4">
          {(['open', 'resolved', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'font-serif text-[13px] transition-colors',
                filter === f ? 'text-accent italic' : 'text-muted hover:text-ink'
              )}
            >
              {f === 'open' ? 'Aperti' : f === 'resolved' ? 'Risolti' : 'Tutti'}
            </button>
          ))}
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full text-left font-serif italic text-[13px] text-muted hover:text-accent transition-colors"
          >
            Segnala un bug
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-2 border-l-2 border-border/50 pl-4 py-2">
            <input
              list="bug-authors"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Autore"
              className="w-full text-xs font-sans rounded-sm border border-border bg-sidebar px-2.5 py-1.5 outline-none focus:border-accent transition-colors"
            />
            <datalist id="bug-authors">
              {knownAuthors.map(a => <option key={a} value={a} />)}
            </datalist>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Descrivi il bug riscontrato…"
              rows={3}
              className="w-full text-xs font-serif rounded-sm border border-border bg-sidebar px-2.5 py-2 outline-none focus:border-accent transition-colors resize-none"
            />
            {error && <p className="text-[10px] text-danger">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !note.trim() || !author.trim()}
                className="font-serif italic text-[13px] text-accent hover:text-ink transition-colors disabled:opacity-40"
              >
                {submitting ? 'in corso…' : 'Invia'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="font-serif italic text-[13px] text-muted hover:text-ink transition-colors"
              >
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>

      {loading && <div className="text-xs text-muted italic">Caricamento…</div>}

      {!loading && filtered.length === 0 && (
        <div className="font-serif italic text-sm text-muted/60 py-12 text-center">Nessun bug in questa vista.</div>
      )}

      <ul className="space-y-3">
        {filtered.map(b => (
          <li key={b.id} className={cn('border-l-2 pl-4 py-2', b.status === 'open' ? 'border-warning/40' : 'border-border/50 opacity-70')}>
            <p className="text-sm font-serif text-ink leading-relaxed whitespace-pre-wrap">{b.testo}</p>
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <span className="font-serif italic text-[12px] text-muted/60">
                {b.author} · {new Date(b.createdAt).toLocaleDateString('it-IT')}
              </span>
              <button
                onClick={() => toggleStatus(b)}
                disabled={busyId === b.id}
                className="font-serif italic text-[13px] text-accent hover:opacity-70 transition-opacity shrink-0"
              >
                {busyId === b.id ? 'in corso…' : b.status === 'open' ? 'Segna come risolto' : 'Riapri'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
