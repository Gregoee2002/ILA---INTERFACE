import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { formatIlaLabel } from '../lib/xmlUtils';
import { EDITORIAL_STATUS_LABELS, Monumento, RUOLO_DIGITALE_LABELS } from '../types';
import {
  GRUPPI_REQUISITI, GruppoRequisiti, REQUISITI, contaRequisiti, esito, haTraduzione, mancanzeCsv, mancanzeDi,
  personeResponsabili, pieno,
} from '../lib/mancanze';
import { dataNotte, useControlliNotturni, variazione } from '../lib/controlliNotturni';

/**
 * CompletezzaPanel — quanto è completo il corpus e che cosa manca a ogni scheda.
 *
 * Riunisce le vecchie linguette «Avanzamento» e «Mancanze», che contavano gli
 * stessi requisiti (lib/mancanze.ts) da due lati:
 *   · per campo: i totali, con la variazione degli ultimi sette giorni presa
 *     dai controlli notturni (scripts/stato-corpus.py, stesse chiavi);
 *   · per scheda: la tabella da filtrare, ordinare ed esportare in CSV.
 * Un clic su un campo porta alla tabella filtrata su quel campo.
 *
 * Conta se un campo è compilato, non se è giusto. Veste da indice a stampa,
 * come CultLexiconPanel: filetti, numeri allineati, tre grigi.
 */

const SEC = 'text-muted';
const TER = 'text-muted/60';

const FIELD =
  'bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none ' +
  'focus:border-accent/60 hover:border-border transition-colors py-0.5';

const TUTTI = '';
const NESSUNO = '__nessuno__';

const pct = (n: number, tot: number) => (tot ? Math.round((100 * n) / tot) : 0);
const conTesto = (m: Monumento) => !m.anepigr;

type Vista = 'campo' | 'scheda';

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
}

export function CompletezzaPanel({ monumenti, onSelectMonumento }: Props) {
  const [vista, setVista] = useState<Vista>('campo');
  const [requisito, setRequisito] = useState<string>(TUTTI);
  const [gruppo, setGruppo] = useState<GruppoRequisiti | 'tutti'>('bibliografica');
  const { dati: notte } = useControlliNotturni();

  const apriTabella = (id: string) => {
    const r = REQUISITI.find(x => x.id === id);
    if (!r) return;
    setRequisito(r.id);
    setGruppo(r.gruppo);
    setVista('scheda');
  };

  const anepigrafi = monumenti.filter(m => m.anepigr).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden max-w-6xl mx-auto w-full">
      <div className="shrink-0 mb-4 pb-2 border-b border-border/40">
        <h2 className="font-serif text-xl text-ink">
          Completezza
          <span className={cn('ml-3 font-sans text-[11px]', SEC)}>
            {monumenti.length} schede, {anepigrafi} anepigrafi
          </span>
        </h2>
        <p className={cn('mt-1 font-serif italic text-[13px]', SEC)}>
          Conta i campi compilati, non ne giudica il contenuto; le percentuali del testo escludono gli anepigrafi.
          {notte && notte.avanzamento.length > 1 && <> La variazione a destra viene dai controlli notturni ({dataNotte(notte.data)}).</>}
        </p>
        <div className="mt-3 flex items-baseline gap-x-5">
          {(['campo', 'scheda'] as const).map(v => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={cn('font-serif text-[15px] transition-colors', vista === v ? 'text-accent italic' : 'text-muted hover:text-ink')}
            >
              {v === 'campo' ? 'Per campo' : 'Per scheda'}
            </button>
          ))}
        </div>
      </div>

      {vista === 'campo'
        ? <PerCampo monumenti={monumenti} notte={notte} onApriTabella={apriTabella} />
        : (
          <PerScheda
            monumenti={monumenti}
            onSelectMonumento={onSelectMonumento}
            requisito={requisito}
            setRequisito={setRequisito}
            gruppo={gruppo}
            setGruppo={setGruppo}
          />
        )}
    </div>
  );
}

// ── Per campo ────────────────────────────────────────────────────────────

function PerCampo({ monumenti, notte, onApriTabella }: {
  monumenti: Monumento[];
  notte: ReturnType<typeof useControlliNotturni>['dati'];
  onApriTabella: (requisitoId: string) => void;
}) {
  const [regioneOrd, setRegioneOrd] = useState<'schede' | 'nome'>('schede');

  const conti = useMemo(() => {
    const tutti = contaRequisiti(monumenti);
    return GRUPPI_REQUISITI.map(g => ({
      titolo: g.label,
      righe: tutti
        .filter(c => c.requisito.gruppo === g.id)
        .map(c => ({ id: c.requisito.id, label: c.requisito.label, tot: c.tot, fatti: c.fatti, mancanti: c.mancanti.length })),
    }));
  }, [monumenti]);

  const stati = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of monumenti) {
      const k = m.editorialStatus || '';
      c.set(k, (c.get(k) || 0) + 1);
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [monumenti]);

  // Per regione: tre campi che dicono «scheda lavorata» meglio di altri.
  const regioni = useMemo(() => {
    const r = new Map<string, Monumento[]>();
    for (const m of monumenti) {
      const k = (m.regione || '').trim() || '—';
      if (!r.has(k)) r.set(k, []);
      r.get(k)!.push(m);
    }
    const righe = [...r.entries()].map(([nome, ms]) => {
      const iscr = ms.filter(conTesto);
      return {
        nome,
        schede: ms.length,
        trad: pct(iscr.filter(m => haTraduzione(m, 'it')).length, iscr.length),
        data: pct(ms.filter(m => m.data_inizio !== undefined || m.data_fine !== undefined).length, ms.length),
        luogo: pct(ms.filter(m => pieno(m.place_ref_ancient)).length, ms.length),
      };
    });
    return righe.sort((a, b) => regioneOrd === 'nome' ? a.nome.localeCompare(b.nome, 'it') : b.schede - a.schede);
  }, [monumenti, regioneOrd]);

  const persone = useMemo(() => {
    const p = new Map<string, Map<string, number>>();
    for (const m of monumenti) {
      for (const r of m.responsabili || []) {
        if (!pieno(r.nome)) continue;
        const ruolo = RUOLO_DIGITALE_LABELS[r.ruolo as keyof typeof RUOLO_DIGITALE_LABELS] || r.ruolo || 'altro';
        if (!p.has(r.nome)) p.set(r.nome, new Map());
        const q = p.get(r.nome)!;
        q.set(ruolo, (q.get(ruolo) || 0) + 1);
      }
    }
    return [...p.entries()]
      .map(([nome, ruoli]) => ({ nome, ruoli: [...ruoli.entries()], tot: [...ruoli.values()].reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.tot - a.tot);
  }, [monumenti]);

  return (
    <div className="flex-1 overflow-y-auto pr-3 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mb-10">
        {conti.map(g => (
          <section key={g.titolo}>
            <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30">{g.titolo}</h3>
            {g.righe.map(r => {
              const d = variazione(notte, r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => onApriTabella(r.id)}
                  disabled={r.mancanti === 0}
                  title={r.mancanti ? `Elenca le ${r.mancanti} schede in cui manca` : undefined}
                  className="w-full flex items-baseline gap-2 px-1.5 py-[3px] rounded-sm text-left hover:bg-sidebar/40 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="font-serif text-[14px] shrink-0 text-ink">{r.label}</span>
                  <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />
                  {r.tot === 0 ? (
                    <span className={cn('shrink-0 font-serif italic text-[12px]', TER)}>non pertinente</span>
                  ) : (
                    <>
                      <span className={cn('shrink-0 font-sans text-xs tabular-nums', SEC)}>{r.fatti}<span className={TER}> / {r.tot}</span></span>
                      <span className="shrink-0 w-10 text-right font-sans text-xs tabular-nums text-ink">{pct(r.fatti, r.tot)}%</span>
                    </>
                  )}
                  <span className={cn('shrink-0 w-9 text-right font-sans text-[11px] tabular-nums', TER)} title="Variazione negli ultimi sette giorni (controlli notturni)">
                    {d ? (d > 0 ? `+${d}` : d) : ''}
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mb-10">
        <section>
          <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30">Stato editoriale</h3>
          {stati.map(([k, n]) => (
            <div key={k || 'nessuno'} className="flex items-baseline gap-2 px-1.5 py-[3px]">
              <span className={cn('font-serif text-[14px] shrink-0', k ? 'text-ink' : cn('italic', SEC))}>
                {k ? (EDITORIAL_STATUS_LABELS[k as keyof typeof EDITORIAL_STATUS_LABELS] || k) : 'non dichiarato'}
              </span>
              <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />
              <span className={cn('shrink-0 font-sans text-xs tabular-nums', SEC)}>{n}</span>
              <span className="shrink-0 w-10 text-right font-sans text-xs tabular-nums text-ink">{pct(n, monumenti.length)}%</span>
            </div>
          ))}
        </section>

        <section>
          <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30">
            Responsabilità
            <span className={cn('ml-2 font-sans text-[11px]', TER)}>schede per persona</span>
          </h3>
          {persone.length === 0 && (
            <p className={cn('font-serif italic text-[13px] px-1.5', TER)}>Nessuna responsabilità dichiarata.</p>
          )}
          {persone.map(p => (
            <div key={p.nome} className="flex items-baseline gap-2 px-1.5 py-[3px]">
              <span className="font-serif text-[14px] text-ink shrink-0">{p.nome}</span>
              <span className={cn('font-serif italic text-[12px] truncate', TER)}>
                {p.ruoli.map(([ruolo, n]) => `${ruolo.toLowerCase()} ${n}`).join(' · ')}
              </span>
              <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />
              <span className={cn('shrink-0 font-sans text-xs tabular-nums', SEC)}>{p.tot}</span>
            </div>
          ))}
        </section>
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-4 mb-1.5 pb-1 border-b border-border/30">
          <h3 className="font-serif text-[15px] text-ink">Per regione</h3>
          <span className={cn('font-serif text-[13px]', SEC)}>
            ordina per ·{' '}
            {(['schede', 'nome'] as const).map((o, i) => (
              <React.Fragment key={o}>
                {i > 0 && ' · '}
                <button
                  onClick={() => setRegioneOrd(o)}
                  className={cn('font-serif transition-colors', regioneOrd === o ? 'text-accent italic' : 'hover:text-ink')}
                >
                  {o === 'schede' ? 'numero di schede' : 'nome'}
                </button>
              </React.Fragment>
            ))}
          </span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className={cn('font-sans text-[11px]', TER)}>
              <th className="font-normal py-1 px-1.5">Regione</th>
              <th className="font-normal py-1 px-1.5 text-right w-16">Schede</th>
              <th className="font-normal py-1 px-1.5 text-right w-24">Tradotte</th>
              <th className="font-normal py-1 px-1.5 text-right w-24">Datate</th>
              <th className="font-normal py-1 px-1.5 text-right w-28">Luogo collegato</th>
            </tr>
          </thead>
          <tbody>
            {regioni.map(r => (
              <tr key={r.nome} className="border-t border-border/20">
                <td className="py-[3px] px-1.5 font-serif text-[14px] text-ink">{r.nome}</td>
                <td className={cn('py-[3px] px-1.5 text-right font-sans text-xs tabular-nums', SEC)}>{r.schede}</td>
                {[r.trad, r.data, r.luogo].map((v, i) => (
                  <td key={i} className={cn('py-[3px] px-1.5 text-right font-sans text-xs tabular-nums', v === 100 ? TER : v < 50 ? 'text-ink' : SEC)}>
                    {v}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ── Per scheda ───────────────────────────────────────────────────────────

function PerScheda({ monumenti, onSelectMonumento, requisito, setRequisito, gruppo, setGruppo }: {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
  requisito: string;
  setRequisito: (v: string) => void;
  gruppo: GruppoRequisiti | 'tutti';
  setGruppo: (g: GruppoRequisiti | 'tutti') => void;
}) {
  const [regione, setRegione] = useState<string>(TUTTI);
  const [persona, setPersona] = useState<string>(TUTTI);
  const [stato, setStato] = useState<string>(TUTTI);
  const [ordine, setOrdine] = useState<'mancanze' | 'scheda'>('mancanze');
  const [soloIncomplete, setSoloIncomplete] = useState(true);

  const colonne = useMemo(
    () => (gruppo === 'tutti' ? REQUISITI : REQUISITI.filter(r => r.gruppo === gruppo)),
    [gruppo],
  );

  const regioni = useMemo(
    () => [...new Set(monumenti.map(m => (m.regione || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it')),
    [monumenti],
  );
  const persone = useMemo(() => personeResponsabili(monumenti), [monumenti]);

  const righe = useMemo(() => {
    const req = requisito ? REQUISITI.find(r => r.id === requisito) : undefined;
    const filtrate = monumenti.filter(m => {
      if (req && esito(req, m) !== 'manca') return false;
      if (regione && (m.regione || '').trim() !== regione) return false;
      if (persona === NESSUNO && (m.responsabili || []).some(r => r.nome?.trim())) return false;
      if (persona && persona !== NESSUNO && !(m.responsabili || []).some(r => r.nome?.trim() === persona)) return false;
      if (stato === NESSUNO && m.editorialStatus) return false;
      if (stato && stato !== NESSUNO && m.editorialStatus !== stato) return false;
      return true;
    });
    // Le mancanze si contano sulle colonne visibili: con «Scheda bibliografica»
    // l'ordine dice chi è più indietro su quella, non sul totale.
    const conConto = filtrate.map(m => ({ m, mancanti: mancanzeDi(m, colonne) }));
    const visibili = soloIncomplete ? conConto.filter(r => r.mancanti.length > 0) : conConto;
    return visibili.sort((a, b) =>
      ordine === 'mancanze' ? b.mancanti.length - a.mancanti.length || a.m.id - b.m.id : a.m.id - b.m.id);
  }, [monumenti, requisito, regione, persona, stato, colonne, soloIncomplete, ordine]);

  const esporta = () => {
    const csv = mancanzeCsv(righe.map(r => r.m), m => formatIlaLabel(m.id));
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ILA-mancanze-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const azzera = () => {
    setRequisito(TUTTI); setRegione(TUTTI); setPersona(TUTTI); setStato(TUTTI);
  };
  const filtriAttivi = !!(requisito || regione || persona || stato);

  return (
    <>
      <div className={cn('shrink-0 font-serif text-[13px] mb-3 flex items-baseline gap-4', SEC)}>
        <span>
          colonne ·{' '}
          {[...GRUPPI_REQUISITI.map(g => ({ id: g.id as GruppoRequisiti | 'tutti', label: g.label.toLowerCase() })), { id: 'tutti' as const, label: 'tutti i requisiti' }]
            .map((g, i) => (
              <React.Fragment key={g.id}>
                {i > 0 && ' · '}
                <button onClick={() => setGruppo(g.id)}
                  className={cn('font-serif transition-colors', gruppo === g.id ? 'text-accent italic' : 'hover:text-ink')}>
                  {g.label}
                </button>
              </React.Fragment>
            ))}
        </span>
        <span className="flex-1" />
        <span className={cn('font-sans text-[11px] tabular-nums', TER)}>{righe.length} schede su {monumenti.length}</span>
        <button onClick={esporta} disabled={righe.length === 0}
          className={cn('shrink-0 font-serif italic text-[13px] hover:text-accent transition-colors disabled:opacity-40', SEC)}>
          Esporta CSV
        </button>
      </div>

      <div className="shrink-0 flex flex-wrap gap-x-5 gap-y-2 mb-4 items-baseline">
        <select value={requisito} onChange={e => setRequisito(e.target.value)} className={FIELD} aria-label="Requisito mancante">
          <option value={TUTTI}>Manca qualunque requisito</option>
          {GRUPPI_REQUISITI.map(g => (
            <optgroup key={g.id} label={g.label}>
              {REQUISITI.filter(r => r.gruppo === g.id).map(r => <option key={r.id} value={r.id}>Manca: {r.label.toLowerCase()}</option>)}
            </optgroup>
          ))}
        </select>
        <select value={regione} onChange={e => setRegione(e.target.value)} className={FIELD} aria-label="Regione">
          <option value={TUTTI}>Tutte le regioni</option>
          {regioni.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={persona} onChange={e => setPersona(e.target.value)} className={FIELD} aria-label="Persona responsabile">
          <option value={TUTTI}>Tutte le persone</option>
          <option value={NESSUNO}>Nessuna responsabilità dichiarata</option>
          {persone.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={stato} onChange={e => setStato(e.target.value)} className={FIELD} aria-label="Stato di pubblicazione">
          <option value={TUTTI}>Ogni stato</option>
          <option value={NESSUNO}>Stato non dichiarato</option>
          {Object.entries(EDITORIAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className={cn('font-serif text-[13px] flex items-baseline gap-1.5 cursor-pointer', SEC)}>
          <input type="checkbox" checked={soloIncomplete} onChange={e => setSoloIncomplete(e.target.checked)} className="accent-[var(--accent)] translate-y-[1px]" />
          solo schede incomplete
        </label>
        <span className={cn('font-serif text-[13px]', SEC)}>
          ordina per ·{' '}
          {(['mancanze', 'scheda'] as const).map((o, i) => (
            <React.Fragment key={o}>
              {i > 0 && ' · '}
              <button onClick={() => setOrdine(o)} className={cn('font-serif transition-colors', ordine === o ? 'text-accent italic' : 'hover:text-ink')}>
                {o === 'mancanze' ? 'mancanze' : 'numero di scheda'}
              </button>
            </React.Fragment>
          ))}
        </span>
        {filtriAttivi && (
          <button onClick={azzera} className={cn('font-serif italic text-[13px] hover:text-accent transition-colors', TER)}>Azzera filtri</button>
        )}
      </div>

      <div className="flex-1 overflow-auto pr-3">
        {righe.length === 0 ? (
          <p className={cn('font-serif italic text-sm py-12 text-center', TER)}>
            Nessuna scheda con mancanze in questa vista.
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-parchment z-[1]">
              <tr className={cn('font-sans text-[11px] align-bottom', TER)}>
                <th className="font-normal py-1.5 px-1.5 w-20">Scheda</th>
                <th className="font-normal py-1.5 px-1.5">Titolo</th>
                {colonne.map(c => (
                  <th key={c.id} title={c.label}
                    className={cn('font-normal py-1.5 px-1 text-center whitespace-nowrap', requisito === c.id && 'text-accent')}>
                    {c.breve}
                  </th>
                ))}
                <th className="font-normal py-1.5 px-1.5 text-right w-16">Mancano</th>
              </tr>
            </thead>
            <tbody>
              {righe.map(({ m, mancanti }) => (
                <tr key={m.id} onClick={() => onSelectMonumento(m)}
                  className="border-t border-border/20 cursor-pointer hover:bg-sidebar/40 transition-colors">
                  <td className="py-[3px] px-1.5 font-sans text-xs tabular-nums text-ink whitespace-nowrap">{formatIlaLabel(m.id)}</td>
                  <td className={cn('py-[3px] px-1.5 font-serif text-[13px] max-w-[22rem] truncate', SEC)} title={m.titolo}>
                    {m.titolo || m.citta || '—'}
                  </td>
                  {colonne.map(c => {
                    const e = esito(c, m);
                    return (
                      <td key={c.id} className="py-[3px] px-1 text-center" title={`${c.label}: ${e === 'ok' ? 'compilato' : e === 'manca' ? 'manca' : 'non pertinente'}`}>
                        {e === 'ok' && <span className={cn('text-[10px]', TER)}>●</span>}
                        {e === 'manca' && <span className="text-[11px] text-accent">○</span>}
                        {e === 'na' && <span className={cn('text-[11px]', TER)}>–</span>}
                      </td>
                    );
                  })}
                  <td className={cn('py-[3px] px-1.5 text-right font-sans text-xs tabular-nums', mancanti.length ? 'text-ink' : TER)}>
                    {mancanti.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className={cn('mt-4 font-serif italic text-[12px]', TER)}>
          ● compilato · ○ manca · – non pertinente (per esempio la traduzione di un anepigrafe, o il controllo su PHI quando l'edizione di riferimento manca del tutto).
        </p>
      </div>
    </>
  );
}
