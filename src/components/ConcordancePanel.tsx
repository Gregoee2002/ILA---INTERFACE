import React, { useMemo, useState } from 'react';
import { AlignCenter, Download, Search } from 'lucide-react';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import {
  buildConcordance, concordanceToCsv, formeAttestate,
  OrdineConcordanza, Occorrenza,
} from '../lib/concordance';

/**
 * ConcordancePanel — la concordanza KWIC del corpus.
 *
 * La ricerca del catalogo risponde con schede; qui la risposta sono le
 * occorrenze, incolonnate attorno alla forma. L'ordinamento per contesto
 * destro è quello che fa emergere le formule: ordinando così, tutte le
 * ricorrenze di «Μηνὶ Τυράννῳ εὐχήν» finiscono una sotto l'altra.
 *
 * Nessun indice nuovo: legge `testo_searchable`, lo stesso testo su cui
 * lavora la ricerca, e ricongiunge le parole spezzate dall'a-capo.
 */

const FIELD_BASE =
  'bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 transition-all duration-300';
const FIELD_STYLE = { backgroundColor: 'var(--card)', color: 'var(--ink)' } as const;

const ORDINI: { id: OrdineConcordanza; label: string; desc: string }[] = [
  { id: 'scheda', label: 'per scheda', desc: 'nell\'ordine del catalogo' },
  { id: 'destra', label: 'contesto destro', desc: 'fa emergere le formule che seguono la parola' },
  { id: 'sinistra', label: 'contesto sinistro', desc: 'fa emergere ciò che la precede' },
  { id: 'forma', label: 'forma attestata', desc: 'raggruppa le stesse forme flesse' },
];

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
}

export const ConcordancePanel: React.FC<Props> = ({ monumenti, onSelectMonumento }) => {
  const [query, setQuery] = useState('');
  const [parolaIntera, setParolaIntera] = useState(false);
  const [ordine, setOrdine] = useState<OrdineConcordanza>('destra');
  const [regione, setRegione] = useState('');

  const regioni = useMemo(
    () => [...new Set(monumenti.map(m => m.regione).filter(Boolean))].sort() as string[],
    [monumenti],
  );

  const corpusFiltrato = useMemo(
    () => (regione ? monumenti.filter(m => m.regione === regione) : monumenti),
    [monumenti, regione],
  );

  const occorrenze = useMemo(
    () => buildConcordance(corpusFiltrato, query, { parolaIntera, ordine }),
    [corpusFiltrato, query, parolaIntera, ordine],
  );

  const forme = useMemo(() => formeAttestate(occorrenze), [occorrenze]);
  const schede = useMemo(() => new Set(occorrenze.map(o => o.scheda)).size, [occorrenze]);
  const byId = useMemo(() => new Map(monumenti.map(m => [m.id, m])), [monumenti]);

  const scarica = () => {
    const blob = new Blob([concordanceToCsv(occorrenze)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concordanza-${query.replace(/\s+/g, '-') || 'corpus'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const riga = (o: Occorrenza, i: number) => {
    const m = byId.get(o.schedaId);
    return (
      <button
        key={`${o.scheda}-${i}`}
        onClick={() => m && onSelectMonumento(m)}
        disabled={!m}
        title={[o.scheda, o.citta, o.regione, o.lemma ? `lemma ${o.lemma}` : ''].filter(Boolean).join(' · ')}
        className="w-full grid grid-cols-[5.5rem_1fr_auto_1fr] gap-2 items-baseline px-2 py-1 rounded-sm text-left hover:bg-sidebar/50 transition-colors"
      >
        <span className="text-[10px] font-sans uppercase tracking-wide text-muted/60 tabular-nums">{o.scheda}</span>
        <span className="font-greek text-sm text-muted/80 text-right truncate" lang="grc" dir="ltr">{o.sinistra}</span>
        <span className="font-greek text-sm text-cult font-semibold whitespace-nowrap" lang="grc">{o.forma}</span>
        <span className="font-greek text-sm text-muted/80 truncate" lang="grc">{o.destra}</span>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto w-full">
      <div className="mb-5">
        <div className="text-xs font-sans font-bold uppercase tracking-[0.22em] text-accent/70 flex items-center gap-1.5">
          <AlignCenter className="h-3.5 w-3.5" /> Concordanza
        </div>
        <p className="text-[13px] font-serif italic text-muted/75 mt-1.5 leading-relaxed">
          Le occorrenze di una parola nel testo delle iscrizioni, con quello che le sta
          intorno. Le parole spezzate dall'a-capo sono ricongiunte, e la ricerca ignora
          accenti e maiuscole: «ευχην» trova «εὐχήν».
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="una forma o una radice — εὐχήν, μηνι, ανεθηκ…"
            lang="grc"
            className={cn(FIELD_BASE, 'w-full pl-8 pr-3 py-2 font-greek')}
            style={FIELD_STYLE}
          />
        </div>
        <select value={regione} onChange={e => setRegione(e.target.value)} className={cn(FIELD_BASE, 'px-2 py-2')} style={FIELD_STYLE}>
          <option value="">tutte le regioni</option>
          {regioni.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={ordine}
          onChange={e => setOrdine(e.target.value as OrdineConcordanza)}
          title={ORDINI.find(o => o.id === ordine)?.desc}
          className={cn(FIELD_BASE, 'px-2 py-2')}
          style={FIELD_STYLE}
        >
          {ORDINI.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-[11px] font-sans text-muted/80 cursor-pointer select-none">
          <input type="checkbox" checked={parolaIntera} onChange={e => setParolaIntera(e.target.checked)} className="accent-[var(--accent)]" />
          parola intera
        </label>
        <button
          onClick={scarica}
          disabled={occorrenze.length === 0}
          className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 disabled:opacity-40 transition-colors px-2 py-2"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>

      {query.trim().length < 2 ? (
        <p className="text-sm font-serif italic text-muted/60" role="status">
          Scrivi almeno due lettere. Sotto le due, il rumore supera l'informazione.
        </p>
      ) : occorrenze.length === 0 ? (
        <p className="text-sm font-serif italic text-muted/60" role="status">
          Nessuna occorrenza{regione && ` in ${regione}`}.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <span className="text-[10px] font-sans uppercase tracking-widest text-muted/50 tabular-nums">
              {occorrenze.length} {occorrenze.length === 1 ? 'occorrenza' : 'occorrenze'} · {schede} {schede === 1 ? 'scheda' : 'schede'}
            </span>
            {forme.length > 1 && (
              <span className="text-[11px] font-serif italic text-muted/60">
                sotto {forme.length} forme diverse:
                <span className="font-greek not-italic ml-1.5" lang="grc">
                  {forme.slice(0, 8).map(f => `${f.forma} (${f.n})`).join('  ·  ')}
                  {forme.length > 8 && ' …'}
                </span>
              </span>
            )}
          </div>
          <div className="space-y-0.5">{occorrenze.map(riga)}</div>
        </>
      )}
    </div>
  );
};
