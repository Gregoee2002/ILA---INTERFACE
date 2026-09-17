import React, { useState } from 'react';
import { EntryRegistro } from '../types';

/**
 * RegistroForm — sezione "Registro" nel pannello di dettaglio di una scheda:
 * mostra il registro di lavorazione di questa entry (al massimo uno, vedi
 * EntryRegistro in types.ts) e permette a un collaboratore di aggiungere una
 * nota firmata, anche a più riprese sulla stessa scheda, fino a risolverla.
 * Interamente nascosta a chi non ha sbloccato l'editing (effectiveAdmin) —
 * niente da mostrare a chi ha solo la password del sito.
 */

const LAST_AUTHOR_KEY = 'ila-registro-last-author';

interface Props {
  entryId: string;
  entryLabel: string;
  registro?: EntryRegistro;
  effectiveAdmin: boolean;
  knownAuthors: string[];
  onCreate: (entryId: string, entryLabel: string, author: string, note: string) => Promise<{ ok: boolean; error?: string }>;
  onResolve: (entryId: string) => Promise<{ ok: boolean; error?: string }>;
  onReopen: (entryId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function RegistroForm({ entryId, entryLabel, registro, effectiveAdmin, knownAuthors, onCreate, onResolve, onReopen }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState(() => localStorage.getItem(LAST_AUTHOR_KEY) || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!effectiveAdmin) return null;

  const notes = [...(registro?.notes || [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !author.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await onCreate(entryId, entryLabel, author.trim(), note.trim());
    setSubmitting(false);
    if (result.ok) {
      localStorage.setItem(LAST_AUTHOR_KEY, author.trim());
      setNote('');
      setShowForm(false);
    } else {
      setError(result.error || 'Errore nel salvataggio');
    }
  }

  async function toggleStatus() {
    if (!registro) return;
    setBusy(true);
    await (registro.status === 'open' ? onResolve(registro.entryId) : onReopen(registro.entryId));
    setBusy(false);
  }

  return (
    <section className="pt-6 border-t border-border/40 mt-6 space-y-3">
      <h4 className="field-label pb-1 flex items-baseline justify-between gap-1.5">
        <span>Registro</span>
        {registro && (
          <span className={`font-serif italic text-[12px] ${registro.status === 'open' ? 'text-accent' : 'text-muted/60'}`}>
            {registro.status === 'open' ? 'Aperto' : 'Risolto'}
          </span>
        )}
      </h4>

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map(n => (
            <li key={n.id} className="text-xs font-serif border-l border-border/60 pl-2.5 py-0.5">
              <p className="text-ink leading-snug whitespace-pre-wrap">{n.testo}</p>
              <span className="block font-serif italic text-[12px] text-muted/60 mt-1.5">
                {n.author} · {new Date(n.createdAt).toLocaleDateString('it-IT')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {registro && (
        <div className="flex justify-end">
          <button
            onClick={toggleStatus}
            disabled={busy}
            className="font-serif italic text-[12px] text-accent hover:opacity-70 transition-opacity shrink-0"
          >
            {busy ? 'in corso…' : registro.status === 'open' ? 'Risolvi' : 'Riapri'}
          </button>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full text-left font-serif italic text-[13px] text-muted hover:text-accent transition-colors"
        >
          Aggiungi nota
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            list="registro-authors"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Autore"
            className="w-full text-xs font-sans rounded-sm border border-border bg-sidebar px-2.5 py-1.5 outline-none focus:border-accent transition-colors"
          />
          <datalist id="registro-authors">
            {knownAuthors.map(a => <option key={a} value={a} />)}
          </datalist>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Nota su questa scheda…"
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
              {submitting ? 'in corso…' : 'Salva nota'}
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
    </section>
  );
}
