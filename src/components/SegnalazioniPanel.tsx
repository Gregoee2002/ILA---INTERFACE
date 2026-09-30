import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { BugReport, EntryRegistro } from '../types';

/**
 * SegnalazioniPanel — le note lasciate a mano dai collaboratori.
 *
 * Riunisce le vecchie linguette «Registro» e «Bug», che avevano la stessa
 * forma (una nota, un autore, aperta o risolta) e differivano solo per
 * l'oggetto:
 *   · sulle schede: il registro di lavorazione (flags.json nella repo dati),
 *     che si scrive dal dettaglio di ogni scheda (RegistroForm). Le routine
 *     lo leggono: una proposta su una scheda con una nota aperta la cita, e
 *     in Revisione la nota compare accanto alla proposta;
 *   · sul sito: i problemi di funzionamento (bugs.json), che si scrivono qui.
 *
 * Veste da indice a stampa: il colore solo sul segno della nota aperta.
 */

const SEC = 'text-muted';
const TER = 'text-muted/60';
const LAST_AUTHOR_KEY = 'ila-registro-last-author';

const FIELD =
  'w-full bg-transparent border-0 border-b border-border/50 rounded-none font-serif text-[14px] text-ink outline-none ' +
  'focus:border-accent/60 placeholder:text-muted/60 py-0.5';

type Filtro = 'open' | 'resolved' | 'all';
type Esito = Promise<{ ok: boolean; error?: string }>;

interface Props {
  registri: EntryRegistro[];
  bugs: BugReport[];
  loading: boolean;
  knownAuthors: string[];
  onSelectEntry: (entryId: string) => void;
  onRegistroStatus: (entryId: string, status: 'open' | 'resolved') => Esito;
  onBugCreate: (author: string, note: string) => Esito;
  onBugStatus: (id: string, status: 'open' | 'resolved') => Esito;
}

const leggiAutore = () => { try { return localStorage.getItem(LAST_AUTHOR_KEY) || ''; } catch { return ''; } };
const data = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

export function SegnalazioniPanel({ registri, bugs, loading, knownAuthors, onSelectEntry, onRegistroStatus, onBugCreate, onBugStatus }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('open');
  const [occupato, setOccupato] = useState<string | null>(null);

  const passa = <T extends { status: string; createdAt: string }>(l: T[]) =>
    (filtro === 'all' ? l : l.filter(x => x.status === filtro)).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const schede = useMemo(() => passa(registri), [registri, filtro]); // eslint-disable-line react-hooks/exhaustive-deps
  const sito = useMemo(() => passa(bugs), [bugs, filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const aperte = registri.filter(r => r.status === 'open').length + bugs.filter(b => b.status === 'open').length;

  async function cambia(chiave: string, fn: () => Esito) {
    setOccupato(chiave);
    await fn();
    setOccupato(null);
  }

  const Comando = ({ chiave, aperta, fn }: { chiave: string; aperta: boolean; fn: () => Esito }) => (
    <button
      onClick={() => cambia(chiave, fn)}
      disabled={occupato === chiave}
      className={cn('shrink-0 font-serif italic text-[12px] hover:text-accent transition-colors disabled:opacity-40', TER)}
    >
      {occupato === chiave ? '…' : aperta ? 'segna come risolta' : 'riapri'}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto pr-3">
      <div className="max-w-4xl mx-auto w-full pb-10">
        <div className="mb-5 pb-2 border-b border-border/40">
          <h2 className="font-serif text-xl text-ink">
            Segnalazioni
            <span className={cn('ml-3 font-sans text-[11px]', SEC)}>{aperte} aperte</span>
          </h2>
          <p className={cn('mt-1 font-serif italic text-[13px]', SEC)}>
            Le note dei collaboratori: sulle schede si scrivono dal dettaglio di ogni scheda («Registro»), sul sito da qui.
            Le routine leggono le note aperte sulle schede e le citano nelle proposte.
          </p>
          <div className="mt-3 flex items-baseline gap-x-5">
            {(['open', 'resolved', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn('font-serif text-[15px] transition-colors', filtro === f ? 'text-accent italic' : 'text-muted hover:text-ink')}
              >
                {f === 'open' ? 'Aperte' : f === 'resolved' ? 'Risolte' : 'Tutte'}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className={cn('font-serif italic text-[13px]', SEC)}>Caricamento…</p>}

        <section className="mb-10">
          <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30 flex items-baseline gap-2">
            Sulle schede
            <span className={cn('font-sans text-[11px]', TER)}>{schede.length}</span>
          </h3>
          {!loading && schede.length === 0 && (
            <p className={cn('px-1.5 font-serif italic text-[13px]', TER)}>Nessuna nota in questa vista.</p>
          )}
          {schede.map(r => {
            const note = [...r.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const ultima = note[0];
            return (
              <div key={r.entryId} className="px-1.5 py-2 border-b border-border/15">
                <div className="flex items-baseline gap-2.5">
                  <span className={cn('shrink-0 self-center h-1.5 w-1.5 rounded-full', r.status === 'open' ? 'bg-warning' : 'bg-border')} aria-hidden />
                  <button onClick={() => onSelectEntry(r.entryId)} className="shrink-0 font-sans text-[12px] tabular-nums text-ink hover:text-accent transition-colors">
                    {r.entryLabel || r.entryId}
                  </button>
                  {ultima && <span className={cn('font-serif italic text-[12px]', TER)}>{ultima.author} · {data(ultima.createdAt)}</span>}
                  {note.length > 1 && <span className={cn('font-serif italic text-[12px]', TER)}>· {note.length} note</span>}
                  <span className="flex-1" />
                  <Comando chiave={`r:${r.entryId}`} aperta={r.status === 'open'} fn={() => onRegistroStatus(r.entryId, r.status === 'open' ? 'resolved' : 'open')} />
                </div>
                {ultima && (
                  <p className={cn('ml-4 mt-0.5 font-serif text-[14px] leading-relaxed whitespace-pre-wrap', r.status === 'open' ? 'text-ink' : SEC)}>{ultima.testo}</p>
                )}
              </div>
            );
          })}
        </section>

        <section>
          <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30 flex items-baseline gap-2">
            Sul sito
            <span className={cn('font-sans text-[11px]', TER)}>{sito.length}</span>
          </h3>
          <NuovaSegnalazione knownAuthors={knownAuthors} onCreate={onBugCreate} />
          {!loading && sito.length === 0 && (
            <p className={cn('px-1.5 font-serif italic text-[13px]', TER)}>Nessun problema del sito in questa vista.</p>
          )}
          {sito.map(b => (
            <div key={b.id} className="px-1.5 py-2 border-b border-border/15">
              <div className="flex items-baseline gap-2.5">
                <span className={cn('shrink-0 self-center h-1.5 w-1.5 rounded-full', b.status === 'open' ? 'bg-warning' : 'bg-border')} aria-hidden />
                <span className={cn('font-serif italic text-[12px]', TER)}>{b.author} · {data(b.createdAt)}</span>
                <span className="flex-1" />
                <Comando chiave={`b:${b.id}`} aperta={b.status === 'open'} fn={() => onBugStatus(b.id, b.status === 'open' ? 'resolved' : 'open')} />
              </div>
              <p className={cn('ml-4 mt-0.5 font-serif text-[14px] leading-relaxed whitespace-pre-wrap', b.status === 'open' ? 'text-ink' : SEC)}>{b.testo}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function NuovaSegnalazione({ knownAuthors, onCreate }: { knownAuthors: string[]; onCreate: (author: string, note: string) => Esito }) {
  const [aperta, setAperta] = useState(false);
  const [autore, setAutore] = useState(leggiAutore);
  const [testo, setTesto] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (!testo.trim() || !autore.trim()) return;
    setInvio(true);
    setErrore(null);
    const r = await onCreate(autore.trim(), testo.trim());
    setInvio(false);
    if (r.ok) {
      try { localStorage.setItem(LAST_AUTHOR_KEY, autore.trim()); } catch { /* niente memoria locale: pazienza */ }
      setTesto('');
      setAperta(false);
    } else {
      setErrore(r.error || 'Salvataggio non riuscito');
    }
  }

  if (!aperta) {
    return (
      <button onClick={() => setAperta(true)} className={cn('mb-2 px-1.5 font-serif italic text-[13px] hover:text-accent transition-colors', SEC)}>
        Segnala un problema del sito
      </button>
    );
  }
  return (
    <form onSubmit={invia} className="mb-4 ml-4 pl-3 border-l border-border/40 space-y-2 max-w-xl">
      <input list="segnalazioni-autori" value={autore} onChange={e => setAutore(e.target.value)} placeholder="Autore" className={FIELD} />
      <datalist id="segnalazioni-autori">
        {knownAuthors.map(a => <option key={a} value={a} />)}
      </datalist>
      <textarea value={testo} onChange={e => setTesto(e.target.value)} rows={3} placeholder="Descrivi che cosa non funziona, e dove" className={cn(FIELD, 'resize-y')} />
      {errore && <p className="font-serif italic text-[12px] text-danger">{errore}</p>}
      <div className="flex items-baseline gap-4">
        <button type="submit" disabled={invio || !testo.trim() || !autore.trim()} className="font-serif text-[14px] text-accent hover:opacity-70 transition-opacity disabled:opacity-40">
          {invio ? 'Invio…' : 'Invia'}
        </button>
        <button type="button" onClick={() => { setAperta(false); setErrore(null); }} className={cn('font-serif italic text-[13px] hover:text-ink transition-colors', SEC)}>
          Annulla
        </button>
      </div>
    </form>
  );
}
