import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { formatIlaLabel } from '../lib/xmlUtils';
import { EDITORIAL_STATUS_LABELS, Monumento, RUOLO_DIGITALE_LABELS } from '../types';
import { GRUPPI_REQUISITI, contaRequisiti, haTraduzione, pieno } from '../lib/mancanze';

/**
 * AvanzamentoPanel — quanto è completo il corpus, campo per campo.
 *
 * I requisiti vengono da lib/mancanze.ts, gli stessi della tabella «Mancanze»
 * e di scripts/stato-corpus.py (i controlli notturni): conta se un campo è
 * compilato, non se è giusto. Lavora sulle schede già
 * caricate, quindi funziona uguale sul server e sulla build statica.
 * Riservato alla redazione (vedi la sezione Strumenti in App.tsx).
 *
 * Veste da indice a stampa, come CultLexiconPanel: filetti puntinati, numeri
 * allineati, tre grigi, nessuna barra colorata.
 */

const SEC = 'text-muted';
const TER = 'text-muted/60';

const conTesto = (m: Monumento) => !m.anepigr;

const pct = (n: number, tot: number) => (tot ? Math.round((100 * n) / tot) : 0);

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
  /** Apre la tabella Mancanze filtrata su un requisito. */
  onApriMancanze?: (requisitoId: string) => void;
}

export function AvanzamentoPanel({ monumenti, onSelectMonumento, onApriMancanze }: Props) {
  const [aperto, setAperto] = useState<string | null>(null);
  const [regioneOrd, setRegioneOrd] = useState<'schede' | 'nome'>('schede');

  const conti = useMemo(() => {
    const tutti = contaRequisiti(monumenti);
    return GRUPPI_REQUISITI.map(g => ({
      titolo: g.label,
      righe: tutti
        .filter(c => c.requisito.gruppo === g.id)
        .map(c => ({ id: c.requisito.id, label: c.requisito.label, tot: c.tot, fatti: c.fatti, mancanti: c.mancanti })),
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

  // Per regione: dove il lavoro è più indietro. Tre campi che dicono
  // «scheda lavorata» meglio di altri: traduzione, datazione, luogo collegato.
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

  // Chi ha lavorato su cosa: schede per persona e per ruolo.
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

  const anepigrafi = monumenti.filter(m => m.anepigr).length;

  return (
    <div className="flex-1 overflow-y-auto pr-3">
      <div className="max-w-6xl mx-auto w-full pb-10">
        <div className="mb-6 pb-2 border-b border-border/40">
          <h2 className="font-serif text-xl text-ink">
            Avanzamento
            <span className={cn('ml-3 font-sans text-[11px]', SEC)}>
              {monumenti.length} schede, {anepigrafi} anepigrafi
            </span>
          </h2>
          <p className={cn('mt-1 font-serif italic text-[13px]', SEC)}>
            Conta i campi compilati, non ne giudica il contenuto. Le percentuali del testo escludono gli anepigrafi.
            Un clic su una riga elenca le schede in cui il campo manca.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mb-10">
          {conti.map(g => (
            <section key={g.titolo}>
              <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30">{g.titolo}</h3>
              {g.righe.map(r => {
                const open = aperto === r.id;
                return (
                  <div key={r.id}>
                    <button
                      onClick={() => setAperto(open ? null : r.id)}
                      disabled={r.mancanti.length === 0}
                      className="w-full flex items-baseline gap-2 px-1.5 py-[3px] rounded-sm text-left hover:bg-sidebar/40 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className={cn('font-serif text-[14px] shrink-0', open ? 'text-accent italic' : 'text-ink')}>{r.label}</span>
                      <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />
                      {r.tot === 0 ? (
                        <span className={cn('shrink-0 font-serif italic text-[12px]', TER)}>non pertinente</span>
                      ) : (
                        <>
                          <span className={cn('shrink-0 font-sans text-xs tabular-nums', SEC)}>{r.fatti}<span className={TER}> / {r.tot}</span></span>
                          <span className="shrink-0 w-10 text-right font-sans text-xs tabular-nums text-ink">{pct(r.fatti, r.tot)}%</span>
                        </>
                      )}
                    </button>
                    {open && (
                      <div className="ml-3 pl-3 my-1.5 border-l border-border/40">
                        <div className={cn('font-serif italic text-[12px] mb-1', SEC)}>
                          mancano in {r.mancanti.length} schede
                          {onApriMancanze && (
                            <>
                              {' · '}
                              <button onClick={() => onApriMancanze(r.id)} className="hover:text-accent transition-colors underline decoration-dotted underline-offset-2">
                                apri nella tabella
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                          {r.mancanti.map(m => (
                            <button
                              key={m.id}
                              onClick={() => onSelectMonumento(m)}
                              className={cn('font-sans text-[11px] tabular-nums hover:text-accent transition-colors', SEC)}
                            >
                              {formatIlaLabel(m.id)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
    </div>
  );
}
