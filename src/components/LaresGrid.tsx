import React from 'react';
import { cn } from '../lib/utils';
import { LARES_TOOLBOX, ToolboxFonte } from '../lib/laresToolbox';
import { CultToolboxStats, CultLemmaStats } from '../lib/cultIndex';

/**
 * LaresGrid — la griglia dell'Analytical Toolbox per intero, non solo i rami
 * che il corpus ha già toccato.
 *
 * La differenza non è cosmetica. Un elenco dei soli percorsi attestati
 * risponde alla domanda «cosa ho marcato»; la griglia intera risponde a
 * «cosa si può marcare, e dove il corpus tace». Un ramo a zero è
 * un'informazione: dice che quella realtà, nel corpus di Men, non è ancora
 * stata riconosciuta — o non c'è.
 *
 * Le voci innestate da ILA (docs/merge-lessico-lares.md §4) portano un segno
 * proprio: chi legge deve sapere in ogni momento che cosa viene dalla griglia
 * di redazione e che cosa abbiamo aggiunto noi.
 */

interface Props {
  /** percorsi attestati, dall'indice del corpus. */
  percorsi: CultToolboxStats[];
  senzaPercorso: CultLemmaStats[];
  renderLemmaRow: (l: CultLemmaStats) => React.ReactNode;
  /** i lemmi passati sono già filtrati: la griglia mostra i conteggi visibili. */
  schede: (n: number) => string;
  atts: (n: number) => string;
}

const FONTE_LABEL: Record<ToolboxFonte, string> = {
  'LARES-enlarged': 'voce della versione allargata LARES',
  'ILA': 'voce innestata da ILA sul corpus di Men',
};

const Segno: React.FC<{ fonte?: ToolboxFonte }> = ({ fonte }) =>
  fonte ? (
    <span
      title={FONTE_LABEL[fonte]}
      className={cn(
        'shrink-0 text-[9px] font-sans uppercase tracking-[0.1em] px-1 py-px rounded-sm border',
        fonte === 'ILA'
          ? 'text-cult border-[var(--cult)]/40'
          : 'text-muted/60 border-border/50',
      )}
    >
      {fonte === 'ILA' ? 'ILA' : 'LARES+'}
    </span>
  ) : null;

export const LaresGrid: React.FC<Props> = ({ percorsi, senzaPercorso, renderLemmaRow, schede, atts }) => {
  const perKey = new Map(percorsi.map(p => [p.key, p]));
  /** somma i percorsi attestati che stanno sotto un prefisso della griglia. */
  const sotto = (prefisso: string) => {
    const dentro = percorsi.filter(p => p.key === prefisso || p.key.startsWith(prefisso + '/'));
    return {
      lemmi: dentro.flatMap(p => p.lemmata),
      count: dentro.reduce((n, p) => n + p.count, 0),
      schedeCount: dentro.reduce((n, p) => Math.max(n, p.schedeCount), 0),
    };
  };

  const contatore = (n: { count: number; lemmi: CultLemmaStats[] }) =>
    n.count > 0 ? (
      <span className="text-[11px] font-sans text-muted/60 tabular-nums">
        {n.lemmi.length} {n.lemmi.length === 1 ? 'lemma' : 'lemmi'} · {atts(n.count)}
      </span>
    ) : (
      <span className="text-[11px] font-sans italic text-muted/35">nessuna attestazione</span>
    );

  return (
    <div className="space-y-7">
      <p className="text-[13px] font-serif italic text-muted/70 leading-relaxed -mt-1">
        Gli stessi lemmi visti dall'altro asse: la famiglia dice chi è il soggetto,
        il percorso dell'<em>Analytical Toolbox</em> dice che cosa è la cosa nominata.
        La griglia è mostrata per intero, rami vuoti compresi: dove il corpus tace,
        tace per iscritto.
      </p>

      {LARES_TOOLBOX.map(item => {
        const tot = sotto(item.id);
        return (
          <section key={item.id}>
            <div className="flex items-baseline gap-2.5 mb-2 pb-1 border-b border-border/40">
              <h3 className={cn(
                'text-sm font-sans font-bold uppercase tracking-[0.15em]',
                tot.count > 0 ? 'text-ink/90' : 'text-ink/45',
              )}>
                {item.label}
              </h3>
              <span className="text-[10px] font-sans text-muted/40">{item.en}</span>
              {contatore(tot)}
              <code className="ml-auto text-[10px] font-sans text-muted/40 hidden sm:block">{item.id}</code>
            </div>

            {item.categorie.length === 0 && (
              <p className="text-xs italic text-muted/40 pl-2">Categoria non articolata nella griglia.</p>
            )}

            <div className="space-y-2.5">
              {item.categorie.map(cat => {
                const totCat = sotto(`${item.id}/${cat.id}`);
                const direttoCat = perKey.get(`${item.id}/${cat.id}`);
                return (
                  <div key={cat.id} className="pl-2">
                    <div className="flex items-baseline gap-2 py-0.5">
                      <span className={cn(
                        'text-xs font-sans font-semibold',
                        totCat.count > 0 ? 'text-ink/80' : 'text-ink/40',
                      )}>
                        {cat.label}
                      </span>
                      <Segno fonte={cat.fonte} />
                      {contatore(totCat)}
                      {cat.esempi && (
                        <span className="text-[11px] font-serif italic text-muted/45 truncate hidden md:block">
                          {cat.esempi}
                        </span>
                      )}
                    </div>

                    {/* lemmi appesi alla categoria senza scendere di grado */}
                    {direttoCat && <div className="pl-3 space-y-0.5">{direttoCat.lemmata.map(renderLemmaRow)}</div>}

                    <div className="pl-3">
                      {cat.sub.map(sub => {
                        const p = perKey.get(`${item.id}/${cat.id}/${sub.id}`);
                        return (
                          <div key={sub.id}>
                            <div className="flex items-baseline gap-2 py-0.5">
                              <span className={cn('text-xs font-serif', p ? 'text-ink/75' : 'text-muted/40')}>
                                {sub.label}
                              </span>
                              <Segno fonte={sub.fonte} />
                              {p ? (
                                <span className="text-[11px] font-sans text-muted/60 tabular-nums">
                                  {schede(p.schedeCount)} · {atts(p.count)}
                                </span>
                              ) : (
                                <span className="text-[11px] font-sans italic text-muted/30">—</span>
                              )}
                              {sub.esempi && (
                                <span className="text-[11px] font-serif italic text-muted/40 truncate hidden md:block">
                                  {sub.esempi}
                                </span>
                              )}
                            </div>
                            {p && <div className="pl-3 space-y-0.5">{p.lemmata.map(renderLemmaRow)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {senzaPercorso.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2.5 mb-2 pb-1 border-b border-border/40">
            <h3 className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-ink/70">Senza percorso</h3>
            <span className="text-xs font-sans text-muted/60">{senzaPercorso.length}</span>
          </div>
          <p className="text-[13px] font-serif italic text-muted/70 leading-relaxed mb-1.5">
            Non è un buco della griglia: queste parole non nominano né un agente, né
            un'attività, né uno spazio. Dare loro un percorso sarebbe un dato falso.
          </p>
          <div className="space-y-0.5">{senzaPercorso.map(renderLemmaRow)}</div>
        </section>
      )}
    </div>
  );
};
