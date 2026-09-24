import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { formatIlaLabel } from '../lib/xmlUtils';
import { EDITORIAL_STATUS_LABELS, Monumento } from '../types';
import {
  GRUPPI_REQUISITI, GruppoRequisiti, REQUISITI, esito, mancanzeCsv, mancanzeDi, personeResponsabili,
} from '../lib/mancanze';

/**
 * MancanzePanel — che cosa manca a ciascuna scheda.
 *
 * La tabella è lo strumento di lavoro della redazione: si filtra per
 * requisito, regione, persona o stato, si ordina per quante mancanze ha una
 * scheda, e si esporta in CSV per dividersi le schede. I requisiti vengono da
 * lib/mancanze.ts; il gruppo «Scheda bibliografica» (le richieste della
 * professoressa) è quello mostrato per primo.
 *
 * Veste da indice a stampa: filetti sottili, segni al posto delle pastiglie,
 * il colore solo sul segno di ciò che manca.
 */

const SEC = 'text-muted';
const TER = 'text-muted/60';

// Controlli di filtro come nel Lessico cultuale: un filetto sotto, niente cornice.
const FIELD =
  'bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none ' +
  'focus:border-accent/60 hover:border-border transition-colors py-0.5';

const TUTTI = '';
const NESSUNO = '__nessuno__';

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
  /** Requisito da cui partire (arriva da «apri nella tabella» in Avanzamento). */
  requisitoIniziale?: string | null;
  onRequisitoInizialeUsato?: () => void;
}

export function MancanzePanel({ monumenti, onSelectMonumento, requisitoIniziale, onRequisitoInizialeUsato }: Props) {
  const [gruppo, setGruppo] = useState<GruppoRequisiti | 'tutti'>('bibliografica');
  const [requisito, setRequisito] = useState<string>(TUTTI);
  const [regione, setRegione] = useState<string>(TUTTI);
  const [persona, setPersona] = useState<string>(TUTTI);
  const [stato, setStato] = useState<string>(TUTTI);
  const [ordine, setOrdine] = useState<'mancanze' | 'scheda'>('mancanze');
  const [soloIncomplete, setSoloIncomplete] = useState(true);

  useEffect(() => {
    if (!requisitoIniziale) return;
    const r = REQUISITI.find(x => x.id === requisitoIniziale);
    if (r) { setRequisito(r.id); setGruppo(r.gruppo); }
    onRequisitoInizialeUsato?.();
  }, [requisitoIniziale, onRequisitoInizialeUsato]);

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
    <div className="flex-1 flex flex-col overflow-hidden max-w-6xl mx-auto w-full">
      <div className="shrink-0 mb-4 pb-2 border-b border-border/40 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-ink">
          Mancanze
          <span className={cn('ml-3 font-sans text-[11px]', SEC)}>
            {righe.length} schede su {monumenti.length}
          </span>
        </h2>
        <button onClick={esporta} disabled={righe.length === 0}
          className={cn('shrink-0 font-serif italic text-[13px] hover:text-accent transition-colors disabled:opacity-40', SEC)}>
          Esporta CSV
        </button>
      </div>

      {/* Colonne: un gruppo di requisiti alla volta, o tutti */}
      <div className={cn('shrink-0 font-serif text-[13px] mb-3', SEC)}>
        mostra ·{' '}
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
      </div>

      {/* Filtri */}
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
          Conta se il campo è compilato, non se è corretto.
        </p>
      </div>
    </div>
  );
}
