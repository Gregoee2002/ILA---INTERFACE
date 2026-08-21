import React, { useState } from 'react';
import { NotebookPen, Check, RotateCcw, Loader2 } from 'lucide-react';
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
      <h4 className="font-sans field-label opacity-85 pb-1 flex items-center justify-between gap-1.5">
        <span className="flex items-center gap-1.5">
          <NotebookPen className="h-3 w-3" /> Registro
        </span>
        {registro && (
          <span className={`text-[9px] font-sans font-bold uppercase tracking-wide ${registro.status === 'open' ? 'text-accent' : 'text-muted/60'}`}>
            {registro.status === 'open' ? 'Aperto' : 'Risolto'}
          </span>
        )}
      </h4>

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map(n => (
            <li key={n.id} className="text-xs font-serif rounded-sm border border-border/40 bg-border/10 px-2.5 py-2">
              <p className="text-ink leading-snug whitespace-pre-wrap">{n.testo}</p>
              <span className="block text-[9px] font-sans uppercase tracking-wide text-muted/70 mt-1.5">
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
            className="text-[9px] font-sans font-bold uppercase tracking-wide text-accent hover:opacity-70 transition-opacity flex items-center gap-1 shrink-0"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : registro.status === 'open' ? <Check className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
            {registro.status === 'open' ? 'Risolvi' : 'Riapri'}
          </button>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2 border border-border text-muted hover:text-ink hover:border-accent/40 font-sans text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-sm"
        >
          <NotebookPen className="h-3 w-3" /> Aggiungi nota
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
          {error && <p className="text-[10px] text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !note.trim() || !author.trim()}
              className="flex-1 py-1.5 bg-accent hover:bg-accent/90 text-white font-sans text-[9px] font-bold uppercase tracking-widest transition-colors rounded-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Salva nota
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
