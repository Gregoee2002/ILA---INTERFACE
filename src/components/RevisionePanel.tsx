import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { DecisioneRevisione, EntryRegistro, IndiceRevisione, PropostaRevisione, RapportoRevisione, StatoDecisione } from '../types';
import { idDaEtichetta } from '../lib/sezioni';

/**
 * RevisionePanel — l'hub in cui confluiscono le routine sul corpus.
 *
 * Le routine (controlli notturni e attività serali) scrivono i rapporti in
 * logs/ e, quando hanno correzioni da proporre, un JSON accanto al rapporto;
 * scripts/raccogli-revisione.py li porta nella repo dati (revisione/). Qui si
 * leggono, si decide proposta per proposta (accetta, scarta, rimanda, con una
 * nota o riscrivendo la correzione) e con «Invia» le accettate passano in coda
 * alla routine ila-applica-correzioni, che le applica e scrive l'esito.
 *
 * Le decisioni si salvano da sole in revisione/decisioni.json, qualche
 * secondo dopo l'ultimo clic. Accanto a una proposta compare la nota aperta
 * del registro di lavorazione sulla stessa scheda, se c'è (Segnalazioni):
 * chi decide la vede senza cambiare linguetta. Veste da indice a stampa come
 * CompletezzaPanel.
 */

const SEC = 'text-muted';
const TER = 'text-muted/60';
const SALVA_DOPO_MS = 2500;

type Filtro = 'da-vedere' | 'accettata' | 'coda' | 'fatte' | 'scartata' | 'rimandata' | 'tutte';

const FILTRI: { id: Filtro; label: string }[] = [
  { id: 'da-vedere', label: 'Da vedere' },
  { id: 'accettata', label: 'Accettate' },
  { id: 'coda', label: 'Inviate' },
  { id: 'fatte', label: 'Applicate' },
  { id: 'rimandata', label: 'Rimandate' },
  { id: 'scartata', label: 'Scartate' },
  { id: 'tutte', label: 'Tutte' },
];

const inFiltro = (f: Filtro, d?: DecisioneRevisione) => {
  const s = d?.stato;
  switch (f) {
    case 'da-vedere': return !s;
    case 'coda': return s === 'inviata' || s === 'bloccata';
    case 'fatte': return s === 'applicata';
    case 'tutte': return true;
    default: return s === f;
  }
};

// Il colore solo come segno: un pallino accanto alla voce, mai sul testo.
const SEGNO: Record<StatoDecisione | 'nuova', string> = {
  nuova: 'bg-border',
  accettata: 'bg-accent',
  inviata: 'bg-accent/40',
  applicata: 'bg-success',
  bloccata: 'bg-danger',
  scartata: 'bg-muted/30',
  rimandata: 'bg-warning',
};

const DICITURA: Record<StatoDecisione, string> = {
  accettata: 'accettata, da inviare',
  inviata: 'inviata, in attesa della routine',
  applicata: 'applicata',
  bloccata: 'non applicata',
  scartata: 'scartata',
  rimandata: 'rimandata',
};

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const dataEstesa = (iso: string) => {
  const [a, m, g] = iso.split('-').map(Number);
  return `${g} ${MESI[m - 1]} ${a}`;
};

interface Props {
  /** Apre la scheda citata dalla proposta (p. es. «ILA-018»); false se non c'è. */
  onApriScheda: (scheda: string) => boolean;
  /** Registro di lavorazione: le note aperte si mostrano accanto alle proposte. */
  registri?: EntryRegistro[];
}

export function RevisionePanel({ onApriScheda, registri = [] }: Props) {
  const [indice, setIndice] = useState<IndiceRevisione | null>(null);
  const [decisioni, setDecisioni] = useState<Record<string, DecisioneRevisione>>({});
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [vista, setVista] = useState<'proposte' | 'rapporti'>('proposte');
  const [filtro, setFiltro] = useState<Filtro>('da-vedere');
  const [routine, setRoutine] = useState('');
  const [cerca, setCerca] = useState('');
  const [aperta, setAperta] = useState<string | null>(null);
  const [rapportoAperto, setRapportoAperto] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState<'fermo' | 'attesa' | 'in-corso' | 'fatto' | 'errore'>('fermo');
  const [invio, setInvio] = useState<string | null>(null);

  // Decisioni cambiate e non ancora scritte su GitHub: si accumulano e partono
  // insieme, così dieci clic di fila fanno un commit solo nella repo dati.
  const pendenti = useRef<Record<string, DecisioneRevisione | null>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carica = useCallback(async () => {
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch('/api/revisione');
      if (res.status === 404) throw new Error('La revisione si legge dal sito (build statica), non dal server locale.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setIndice(data.indice);
      setDecisioni(data.decisioni || {});
    } catch (e: any) {
      setErrore(e.message || String(e));
    } finally {
      setCaricamento(false);
    }
  }, []);

  useEffect(() => { carica(); }, [carica]);

  const salva = useCallback(async (messaggio?: string) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const modifiche = pendenti.current;
    if (!Object.keys(modifiche).length) return true;
    pendenti.current = {};
    setSalvataggio('in-corso');
    try {
      const n = Object.keys(modifiche).length;
      const res = await fetch('/api/revisione/decisioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifiche, messaggio: messaggio || `revisione: ${n} ${n === 1 ? 'decisione' : 'decisioni'}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Quello che è arrivato dal server vale, tranne le voci toccate di nuovo
      // mentre la richiesta era in volo.
      setDecisioni(() => {
        const out = { ...data.decisioni };
        for (const [id, d] of Object.entries(pendenti.current)) {
          if (d === null) delete out[id]; else out[id] = d;
        }
        return out;
      });
      setSalvataggio(Object.keys(pendenti.current).length ? 'attesa' : 'fatto');
      return true;
    } catch (e: any) {
      // Si rimettono in coda, per il prossimo tentativo.
      pendenti.current = { ...modifiche, ...pendenti.current };
      setSalvataggio('errore');
      setErrore(`Salvataggio non riuscito: ${e.message || e}`);
      return false;
    }
  }, []);

  // Uscendo dalla vista con decisioni in sospeso, si salvano subito.
  useEffect(() => () => { void salva(); }, [salva]);
  useEffect(() => {
    const avvisa = (e: BeforeUnloadEvent) => {
      if (Object.keys(pendenti.current).length) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', avvisa);
    return () => window.removeEventListener('beforeunload', avvisa);
  }, []);

  const decidi = useCallback((id: string, d: DecisioneRevisione | null) => {
    setDecisioni(prev => {
      const out = { ...prev };
      if (d === null) delete out[id]; else out[id] = d;
      return out;
    });
    pendenti.current[id] = d;
    setSalvataggio('attesa');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void salva(); }, SALVA_DOPO_MS);
  }, [salva]);

  const proposte = useMemo(() => indice?.proposte ?? [], [indice]);
  const rapporti = useMemo(() => indice?.rapporti ?? [], [indice]);

  const etichette = useMemo(() => {
    const m = new Map<string, string>();
    rapporti.forEach(r => m.set(r.routine, r.etichetta));
    return m;
  }, [rapporti]);

  const conteggi = useMemo(() => {
    const c = {} as Record<Filtro, number>;
    for (const f of FILTRI) c[f.id] = proposte.filter(p => inFiltro(f.id, decisioni[p.id])).length;
    return c;
  }, [proposte, decisioni]);

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return proposte.filter(p =>
      inFiltro(filtro, decisioni[p.id]) &&
      (!routine || p.routine === routine) &&
      (!q || [p.scheda, p.titolo, p.attuale, p.proposta].some(x => x?.toLowerCase().includes(q))),
    );
  }, [proposte, decisioni, filtro, routine, cerca]);

  // Raggruppate per rapporto, il più recente in alto.
  const gruppi = useMemo(() => {
    const m = new Map<string, PropostaRevisione[]>();
    for (const p of visibili) {
      const k = `${p.data}|${p.routine}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visibili]);

  // Nota aperta più recente del registro, per numero di scheda.
  const noteAperte = useMemo(() => {
    const m = new Map<number, { testo: string; author: string }>();
    for (const r of registri) {
      if (r.status !== 'open') continue;
      const id = idDaEtichetta(r.entryLabel || '');
      const ultima = [...r.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (id !== undefined && ultima) m.set(id, { testo: ultima.testo, author: ultima.author });
    }
    return m;
  }, [registri]);
  const notaDi = (scheda?: string) => {
    const id = scheda ? idDaEtichetta(scheda) : undefined;
    return id === undefined ? undefined : noteAperte.get(id);
  };

  const accettate = useMemo(() => proposte.filter(p => decisioni[p.id]?.stato === 'accettata'), [proposte, decisioni]);

  async function inviaTutte() {
    const ora = new Date().toISOString();
    for (const p of accettate) {
      const d = decisioni[p.id];
      pendenti.current[p.id] = { ...d, stato: 'inviata', inviataIl: ora };
    }
    setDecisioni(prev => {
      const out = { ...prev };
      for (const p of accettate) out[p.id] = { ...prev[p.id], stato: 'inviata', inviataIl: ora };
      return out;
    });
    const n = accettate.length;
    const ok = await salva(`revisione: ${n} ${n === 1 ? 'correzione inviata' : 'correzioni inviate'}`);
    setInvio(ok ? `${n === 1 ? 'Una correzione inviata' : `${n} correzioni inviate`}: le applica la routine ila-applica-correzioni.` : null);
  }

  // Tastiera, sulla proposta aperta: a accetta, s scarta, r rimanda, u annulla,
  // j/k passano alla successiva/precedente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (vista !== 'proposte' || !aperta) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = visibili.findIndex(p => p.id === aperta);
      const ora = new Date().toISOString();
      const vecchia = decisioni[aperta];
      const segna = (stato: StatoDecisione) => decidi(aperta, { ...vecchia, stato, decisaIl: ora });
      const avanti = () => setAperta(visibili[Math.min(i + 1, visibili.length - 1)]?.id ?? null);
      if (vecchia?.stato === 'inviata' || vecchia?.stato === 'applicata') {
        if (e.key === 'j') avanti();
        else if (e.key === 'k') setAperta(visibili[Math.max(i - 1, 0)]?.id ?? null);
        return;
      }
      switch (e.key) {
        case 'a': segna('accettata'); avanti(); break;
        case 's': segna('scartata'); avanti(); break;
        case 'r': segna('rimandata'); avanti(); break;
        case 'u': decidi(aperta, null); break;
        case 'j': avanti(); break;
        case 'k': setAperta(visibili[Math.max(i - 1, 0)]?.id ?? null); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vista, aperta, visibili, decisioni, decidi]);

  const statoSalvataggio = {
    fermo: '',
    attesa: 'da salvare…',
    'in-corso': 'salvataggio…',
    fatto: 'salvato',
    errore: 'non salvato',
  }[salvataggio];

  return (
    <div className="flex-1 overflow-y-auto pr-3">
      <div className="max-w-6xl mx-auto w-full pb-10">
        <div className="mb-5 pb-2 border-b border-border/40">
          <h2 className="font-serif text-xl text-ink flex items-baseline flex-wrap gap-x-3">
            Revisione
            <span className={cn('font-sans text-[11px]', SEC)}>
              {proposte.length} proposte da {rapporti.length} rapporti
              {indice?.generato && <>, raccolti il {new Date(indice.generato).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</>}
            </span>
            <span className={cn('ml-auto font-sans text-[11px]', salvataggio === 'errore' ? 'text-danger' : TER)}>{statoSalvataggio}</span>
          </h2>
          <p className={cn('mt-1 font-serif italic text-[13px]', SEC)}>
            Le proposte delle routine sul corpus. Si accettano, si scartano o si rimandano una per una; con «Invia» le accettate
            passano alla routine che le applica nella repo dati e ne scrive qui l'esito.
          </p>
          <div className="mt-3 flex items-baseline gap-x-5">
            {(['proposte', 'rapporti'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={cn('font-serif text-[15px] transition-colors', vista === v ? 'text-accent italic' : 'text-muted hover:text-ink')}
              >
                {v === 'proposte' ? 'Proposte' : 'Rapporti'}
              </button>
            ))}
            <button onClick={carica} className={cn('ml-auto font-serif italic text-[12px] hover:text-accent transition-colors', TER)}>
              ricarica
            </button>
          </div>
        </div>

        {errore && <p className="mb-4 font-serif italic text-[13px] text-danger">{errore}</p>}
        {caricamento && <p className={cn('font-serif italic text-[13px]', SEC)}>Caricamento…</p>}

        {!caricamento && indice && vista === 'proposte' && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {FILTRI.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setFiltro(f.id); setAperta(null); }}
                  className={cn('font-serif text-[14px] transition-colors', filtro === f.id ? 'text-accent italic' : 'text-muted hover:text-ink')}
                >
                  {f.label}
                  {conteggi[f.id] ? <span className="ml-1 font-sans not-italic text-[11px] tabular-nums text-muted/60">{conteggi[f.id]}</span> : null}
                </button>
              ))}
            </div>
            <div className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <select
                value={routine}
                onChange={e => setRoutine(e.target.value)}
                className="bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none focus:border-accent/60 py-0.5"
              >
                <option value="">Tutte le routine</option>
                {[...etichette.entries()].map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input
                value={cerca}
                onChange={e => setCerca(e.target.value)}
                placeholder="Cerca scheda o parola"
                className="w-56 bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none focus:border-accent/60 py-0.5 placeholder:text-muted/60"
              />
              <span className={cn('font-serif italic text-[12px]', TER)}>
                tastiera, sulla proposta aperta: a accetta · s scarta · r rimanda · u annulla · j k successiva e precedente
              </span>
            </div>

            {(accettate.length > 0 || invio) && (
              <div className="mb-6 pb-3 border-b border-border/30 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {accettate.length > 0 && (
                  <button
                    onClick={inviaTutte}
                    disabled={salvataggio === 'in-corso'}
                    className="font-serif text-[15px] text-accent hover:opacity-70 transition-opacity disabled:opacity-40"
                  >
                    Invia {accettate.length === 1 ? 'la correzione accettata' : `le ${accettate.length} correzioni accettate`}
                  </button>
                )}
                <span className={cn('font-serif italic text-[12px]', SEC)}>
                  {invio ?? 'le applica la routine ila-applica-correzioni, che ne scrive qui l\'esito'}
                </span>
              </div>
            )}

            {gruppi.length === 0 && (
              <p className={cn('py-10 text-center font-serif italic text-[14px]', TER)}>
                {proposte.length === 0 ? 'Nessuna proposta ancora: le routine non ne hanno mandate.' : 'Nessuna proposta in questa vista.'}
              </p>
            )}

            {gruppi.map(([k, lista]) => {
              const [data, rt] = k.split('|');
              const rapporto = rapporti.find(r => r.data === data && r.routine === rt);
              return (
                <section key={k} className="mb-8">
                  <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30 flex items-baseline gap-3">
                    {etichette.get(rt) ?? rt}
                    <span className={cn('font-serif italic text-[13px]', SEC)}>del {dataEstesa(data)}</span>
                    {rapporto?.file && (
                      <button
                        onClick={() => { setVista('rapporti'); setRapportoAperto(rapporto.file!); }}
                        className={cn('ml-auto font-serif italic text-[12px] hover:text-accent transition-colors', TER)}
                      >
                        leggi il rapporto
                      </button>
                    )}
                  </h3>
                  {lista.map(p => (
                    <VoceProposta
                      key={p.id}
                      p={p}
                      d={decisioni[p.id]}
                      aperta={aperta === p.id}
                      onApri={() => setAperta(aperta === p.id ? null : p.id)}
                      onDecidi={d => decidi(p.id, d)}
                      onApriScheda={onApriScheda}
                      notaRegistro={notaDi(p.scheda)}
                    />
                  ))}
                </section>
              );
            })}
          </>
        )}

        {!caricamento && indice && vista === 'rapporti' && (
          <ElencoRapporti rapporti={rapporti} aperto={rapportoAperto} onApri={setRapportoAperto} />
        )}
      </div>
    </div>
  );
}

function VoceProposta({ p, d, aperta, onApri, onDecidi, onApriScheda, notaRegistro }: {
  notaRegistro?: { testo: string; author: string };
  p: PropostaRevisione;
  d?: DecisioneRevisione;
  aperta: boolean;
  onApri: () => void;
  onDecidi: (d: DecisioneRevisione | null) => void;
  onApriScheda: (scheda: string) => boolean;
}) {
  const [nota, setNota] = useState(d?.nota ?? '');
  const [testo, setTesto] = useState(d?.propostaModificata ?? p.proposta ?? '');
  const rif = useRef<HTMLDivElement>(null);
  useEffect(() => { setNota(d?.nota ?? ''); setTesto(d?.propostaModificata ?? p.proposta ?? ''); }, [d?.nota, d?.propostaModificata, p.proposta]);
  useEffect(() => { if (aperta) rif.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [aperta]);

  const bloccata = d?.stato === 'inviata' || d?.stato === 'applicata';
  const ora = () => new Date().toISOString();
  const segna = (stato: StatoDecisione) => onDecidi({ ...d, stato, decisaIl: ora() });
  const salvaTesti = () => {
    const mod = testo.trim() && testo.trim() !== (p.proposta ?? '').trim() ? testo.trim() : undefined;
    const n = nota.trim() || undefined;
    if (mod === d?.propostaModificata && n === d?.nota) return;
    // Scrivere una nota o riscrivere la correzione su una voce ancora da
    // vedere non vale come decisione: la si accetta, con le modifiche.
    onDecidi({ ...d, stato: d?.stato ?? 'accettata', decisaIl: ora(), nota: n, propostaModificata: mod });
  };

  const comando = (label: string, fn: () => void, attivo = false) => (
    <button
      onClick={fn}
      className={cn('font-serif text-[13px] transition-colors', attivo ? 'text-accent italic' : 'text-muted hover:text-ink')}
    >
      {label}
    </button>
  );

  return (
    <div ref={rif} className={cn('border-b border-border/20', aperta && 'bg-sidebar/30')}>
      <button onClick={onApri} className="w-full flex items-baseline gap-2.5 px-1.5 py-1.5 text-left hover:bg-sidebar/40 transition-colors">
        <span className={cn('shrink-0 self-center h-1.5 w-1.5 rounded-full', SEGNO[d?.stato ?? 'nuova'])} aria-hidden />
        {p.scheda && <span className="shrink-0 w-16 font-sans text-[11px] tabular-nums text-ink">{p.scheda}</span>}
        {p.riga && <span className={cn('shrink-0 w-12 font-sans text-[11px] tabular-nums', TER)}>r. {p.riga}</span>}
        <span className={cn('font-serif text-[14px]', d?.stato === 'scartata' ? cn(TER, 'line-through decoration-muted/40') : 'text-ink')}>{p.titolo}</span>
        {p.dubbio && <span className={cn('shrink-0 font-serif italic text-[12px]', SEC)}>da decidere</span>}
        {notaRegistro && <span className={cn('shrink-0 font-serif italic text-[12px]', TER)} title={notaRegistro.testo}>nota nel registro</span>}
        <span className="flex-1" />
        {d && <span className={cn('shrink-0 font-serif italic text-[12px]', d.stato === 'bloccata' ? 'text-danger' : SEC)}>{DICITURA[d.stato]}</span>}
      </button>

      {aperta && (
        <div className="ml-6 pl-3 mb-3 mt-1 border-l border-border/40 space-y-2">
          {(p.attuale || p.proposta) && (
            <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 items-baseline">
              {p.attuale && <><span className={cn('font-serif italic text-[12px]', SEC)}>ora</span><span className="font-serif text-[15px] text-ink whitespace-pre-wrap">{p.attuale}</span></>}
              {p.proposta && <><span className={cn('font-serif italic text-[12px]', SEC)}>proposta</span><span className="font-serif text-[15px] text-ink whitespace-pre-wrap">{p.proposta}</span></>}
            </div>
          )}
          {notaRegistro && (
            <p className={cn('font-serif text-[13px] leading-relaxed pl-2 border-l-2 border-warning/40', SEC)}>
              <span className="italic">Nel registro, {notaRegistro.author}:</span> {notaRegistro.testo}
            </p>
          )}
          {p.dettaglio && <div className={cn('font-serif text-[13px] leading-relaxed', SEC)}><Inline testo={p.dettaglio} /></div>}
          <div className={cn('font-serif italic text-[12px]', TER)}>
            {p.patch?.length
              ? `si applica da sola: ${p.patch.length === 1 ? 'una sostituzione' : `${p.patch.length} sostituzioni`} in ${[...new Set(p.patch.map(x => x.file))].join(', ')}`
              : 'senza sostituzione pronta: la routine la applicherà leggendo la descrizione'}
            {p.destinazione && p.destinazione !== 'dati' && ` · destinazione: ${p.destinazione}`}
            {p.classe && ` · classe (${p.classe})`}
            {p.scheda && (
              <>
                {' · '}
                <button onClick={() => onApriScheda(p.scheda!)} className="font-serif italic underline decoration-dotted underline-offset-2 hover:text-accent transition-colors">
                  apri la scheda
                </button>
              </>
            )}
          </div>
          {p.patch?.length ? (
            <details className="font-sans text-[11px]">
              <summary className={cn('cursor-pointer font-serif italic text-[12px]', TER)}>sostituzioni</summary>
              {p.patch.map((x, i) => (
                <div key={i} className="mt-1.5 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5">
                  <span className={TER}>{x.file}</span>
                  <span />
                  <span className={SEC}>cerca</span><code className="font-mono text-[11px] text-ink break-all whitespace-pre-wrap">{x.cerca}</code>
                  <span className={SEC}>sostituisci</span><code className="font-mono text-[11px] text-ink break-all whitespace-pre-wrap">{x.sostituisci}</code>
                </div>
              ))}
            </details>
          ) : null}

          {d?.esito && (
            <p className={cn('font-serif text-[13px]', d.stato === 'bloccata' ? 'text-danger' : SEC)}>
              Esito: {d.esito}{d.commit && <span className={cn('ml-1 font-mono text-[11px]', TER)}>{d.commit.slice(0, 8)}</span>}
            </p>
          )}

          {!bloccata && (
            <>
              <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 items-baseline pt-1">
                <label className={cn('font-serif italic text-[12px]', SEC)}>correzione</label>
                <textarea
                  value={testo}
                  onChange={e => setTesto(e.target.value)}
                  onBlur={salvaTesti}
                  rows={Math.min(4, Math.max(1, testo.split('\n').length))}
                  placeholder="Riscrivila se la proposta non va bene così"
                  className="w-full resize-y bg-transparent border-0 border-b border-border/50 rounded-none font-serif text-[14px] text-ink outline-none focus:border-accent/60 placeholder:text-muted/60"
                />
                <label className={cn('font-serif italic text-[12px]', SEC)}>nota</label>
                <textarea
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  onBlur={salvaTesti}
                  rows={1}
                  placeholder="Per chi applica: condizioni, dubbi, altre schede da toccare"
                  className="w-full resize-y bg-transparent border-0 border-b border-border/50 rounded-none font-serif text-[13px] text-ink outline-none focus:border-accent/60 placeholder:text-muted/60"
                />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 pt-1">
                {comando('Accetta', () => segna('accettata'), d?.stato === 'accettata')}
                {comando('Scarta', () => segna('scartata'), d?.stato === 'scartata')}
                {comando('Rimanda', () => segna('rimandata'), d?.stato === 'rimandata')}
                {d && comando('Annulla la decisione', () => onDecidi(null))}
                {d?.stato === 'bloccata' && comando('Rimetti in coda', () => onDecidi({ ...d, stato: 'inviata', inviataIl: ora(), esito: undefined }))}
              </div>
            </>
          )}
          {d?.stato === 'inviata' && (
            <div className="flex flex-wrap items-baseline gap-x-4">
              {comando('Ritira dalla coda', () => onDecidi({ ...d, stato: 'accettata', inviataIl: undefined }))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ElencoRapporti({ rapporti, aperto, onApri }: {
  rapporti: RapportoRevisione[];
  aperto: string | null;
  onApri: (file: string | null) => void;
}) {
  const [testo, setTesto] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const cache = useRef(new Map<string, string>());

  useEffect(() => {
    if (!aperto) return;
    setErrore(null);
    const c = cache.current.get(aperto);
    if (c) { setTesto(c); return; }
    setTesto(null);
    let vivo = true;
    fetch(`/api/revisione/rapporto?file=${encodeURIComponent(aperto)}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
        return r.text();
      })
      .then(t => { cache.current.set(aperto, t); if (vivo) setTesto(t); })
      .catch(e => { if (vivo) setErrore(e.message || String(e)); });
    return () => { vivo = false; };
  }, [aperto]);

  if (rapporti.length === 0) {
    return <p className={cn('py-10 text-center font-serif italic text-[14px]', TER)}>Nessun rapporto raccolto.</p>;
  }

  // Per data, dal più recente.
  const perData = new Map<string, RapportoRevisione[]>();
  rapporti.forEach(r => { if (!perData.has(r.data)) perData.set(r.data, []); perData.get(r.data)!.push(r); });

  return (
    <div>
      {[...perData.entries()].map(([data, lista]) => (
        <section key={data} className="mb-6">
          <h3 className="font-serif text-[15px] text-ink mb-1 pb-1 border-b border-border/30">{dataEstesa(data)}</h3>
          {lista.map(r => {
            const open = aperto === r.file;
            return (
              <div key={r.routine + r.data}>
                <button
                  onClick={() => onApri(open ? null : r.file ?? null)}
                  disabled={!r.file}
                  className="w-full flex items-baseline gap-2 px-1.5 py-[3px] text-left hover:bg-sidebar/40 transition-colors"
                >
                  <span className={cn('font-serif text-[14px] shrink-0', open ? 'text-accent italic' : 'text-ink')}>{r.etichetta}</span>
                  <span className={cn('font-serif italic text-[12px] truncate', SEC)}>{r.sommario[0]}</span>
                  <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1 min-w-4" />
                  <span className={cn('shrink-0 font-sans text-xs tabular-nums', r.proposte ? 'text-ink' : TER)}>
                    {r.proposte ? `${r.proposte} ${r.proposte === 1 ? 'proposta' : 'proposte'}` : '—'}
                  </span>
                </button>
                {open && (
                  <div className="ml-3 pl-4 my-2 border-l border-border/40">
                    {errore && <p className="font-serif italic text-[13px] text-danger">{errore}</p>}
                    {!errore && testo === null && <p className={cn('font-serif italic text-[13px]', SEC)}>Caricamento…</p>}
                    {testo !== null && <Markdown testo={testo} />}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

// ── Markdown dei rapporti ────────────────────────────────────────────────
// Un sottoinsieme, quanto basta per quello che scrivono le routine: titoli,
// paragrafi, elenchi, tabelle, blocchi di codice, <details>. Costruisce
// elementi React (niente innerHTML), quindi il testo non può iniettare nulla.

function Inline({ testo }: { testo: string }) {
  const parti = testo.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parti.map((s, i) => {
        if (s.startsWith('`') && s.endsWith('`') && s.length > 1) return <code key={i} className="font-mono text-[0.85em] text-ink">{s.slice(1, -1)}</code>;
        if (s.startsWith('**') && s.endsWith('**') && s.length > 3) return <strong key={i} className="font-semibold text-ink">{s.slice(2, -2)}</strong>;
        const l = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (l) {
          return /^https?:\/\//.test(l[2])
            ? <a key={i} href={l[2]} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-accent">{l[1]}</a>
            : <span key={i}>{l[1]}</span>;
        }
        return <React.Fragment key={i}>{s}</React.Fragment>;
      })}
    </>
  );
}

function Markdown({ testo }: { testo: string }) {
  const righe = testo.replace(/\r/g, '').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  const k = () => out.length;
  while (i < righe.length) {
    const r = righe[i];
    const t = r.trim();
    if (!t || t === '</details>' || t === '---') { i++; continue; }
    if (t.startsWith('```')) {
      const corpo: string[] = [];
      i++;
      while (i < righe.length && !righe[i].trim().startsWith('```')) corpo.push(righe[i++]);
      i++;
      out.push(<pre key={k()} className="my-2 px-3 py-2 bg-sidebar/40 font-mono text-[11px] text-ink overflow-x-auto whitespace-pre">{corpo.join('\n')}</pre>);
      continue;
    }
    const sum = t.match(/^<details><summary>(.*)<\/summary>$/);
    if (sum) { out.push(<p key={k()} className={cn('mt-3 font-serif italic text-[12px]', TER)}>{sum[1]}</p>); i++; continue; }
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const liv = h[1].length;
      out.push(
        <p key={k()} className={cn('font-serif text-ink', liv === 1 ? 'text-[17px] mt-1 mb-2' : liv === 2 ? 'text-[15px] mt-4 mb-1 pb-0.5 border-b border-border/30' : 'text-[14px] italic mt-3 mb-1')}>
          <Inline testo={h[2]} />
        </p>,
      );
      i++;
      continue;
    }
    if (t.startsWith('|')) {
      const tab: string[][] = [];
      while (i < righe.length && righe[i].trim().startsWith('|')) {
        const celle = righe[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        if (!celle.every(c => /^:?-{2,}:?$/.test(c))) tab.push(celle);
        i++;
      }
      const [testa, ...corpo] = tab;
      out.push(
        <div key={k()} className="my-2 overflow-x-auto">
          <table className="text-left font-serif text-[13px]">
            <thead>
              <tr className="border-b border-border/40">{testa.map((c, j) => <th key={j} className={cn('pr-4 py-0.5 font-normal italic text-[12px]', SEC)}><Inline testo={c} /></th>)}</tr>
            </thead>
            <tbody>
              {corpo.map((riga, j) => (
                <tr key={j} className="border-b border-border/15 align-baseline">
                  {riga.map((c, x) => <td key={x} className="pr-4 py-0.5 text-ink"><Inline testo={c} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^([-*]|\d+\.)\s/.test(t)) {
      const voci: string[] = [];
      const numerato = /^\d+\./.test(t);
      while (i < righe.length && /^\s*([-*]|\d+\.)\s/.test(righe[i])) {
        voci.push(righe[i].trim().replace(/^([-*]|\d+\.)\s+/, ''));
        i++;
        // continuazioni rientrate della stessa voce
        while (i < righe.length && /^\s{2,}\S/.test(righe[i]) && !/^\s*([-*]|\d+\.)\s/.test(righe[i])) voci[voci.length - 1] += ' ' + righe[i++].trim();
      }
      const Tag = numerato ? 'ol' : 'ul';
      out.push(
        <Tag key={k()} className={cn('my-1.5 pl-5 font-serif text-[13px] text-ink space-y-0.5', numerato ? 'list-decimal' : 'list-disc marker:text-muted/60')}>
          {voci.map((v, j) => <li key={j}><Inline testo={v} /></li>)}
        </Tag>,
      );
      continue;
    }
    const par: string[] = [];
    while (i < righe.length && righe[i].trim() && !/^(```|#{1,4}\s|\||<details|[-*]\s|\d+\.\s|---$)/.test(righe[i].trim())) par.push(righe[i++].trim());
    if (!par.length) { i++; continue; }
    out.push(<p key={k()} className="my-1.5 font-serif text-[13px] text-ink leading-relaxed"><Inline testo={par.join(' ')} /></p>);
  }
  return <div>{out}</div>;
}
