import React from 'react';
import { Monumento, NumSpecimen, NumTerm, COIN_FACE_LABELS, CoinFace } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { formatMisura, metalSigla, numLabel } from '../lib/numismaticVocab';
import { Coins } from 'lucide-react';

interface NumismaticsPanelProps {
  monumento: Monumento;
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const voce = (k: string) => ICONOGRAPHY_LABELS[k] || k;

/** Una riga etichetta/valore, con lo stesso passo dei tratti iconografici. */
const Riga: React.FC<{ etichetta: string; children: React.ReactNode }> = ({ etichetta, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
    <span className="text-[11px] uppercase tracking-wide text-muted font-medium w-28 shrink-0 sm:pt-1">
      {etichetta}
    </span>
    <div className="flex flex-wrap items-baseline gap-2 font-serif text-[15px] text-ink">{children}</div>
  </div>
);

/**
 * Un termine da vocabolario. `cert="low"` non è un dettaglio decorativo: dice
 * che il valore è un'inferenza e non una lettura, e va visibile accanto al
 * dato, non nascosto in un tooltip.
 */
const Termine: React.FC<{ kind: string; t: NumTerm; sigla?: boolean }> = ({ kind, t, sigla }) => {
  const testo = numLabel(kind, t.key, t.label);
  const abbr = sigla ? metalSigla(t.key) : undefined;
  const corpo = (
    <>
      {capitalize(testo)}
      {abbr && <span className="ml-1.5 text-xs text-muted font-sans">({abbr})</span>}
    </>
  );
  return (
    <span className="flex items-baseline gap-1.5">
      {t.ref ? (
        <a href={t.ref} target="_blank" rel="noreferrer"
           className="text-num underline decoration-num/30 underline-offset-2 hover:decoration-num">
          {corpo}
        </a>
      ) : corpo}
      {t.cert === 'low' && (
        <span
          title={`Inferenza${t.resp ? `, proposta da ${t.resp.replace('#', '')}` : ''}: non è un dato della fonte`}
          className="text-[10px] uppercase tracking-wide text-num border border-num/40 bg-num/10 rounded-full px-1.5 py-0.5 font-sans"
        >
          inferito{t.resp ? ` · ${t.resp.replace('#', '')}` : ''}
        </span>
      )}
    </span>
  );
};

const Esemplare: React.FC<{ sp: NumSpecimen }> = ({ sp }) => {
  const misure = [
    formatMisura(sp.weight),
    formatMisura(sp.diameter),
    sp.axis ? `asse ${sp.axis}h` : undefined,
  ].filter(Boolean);
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1.5 border-b border-border/30 last:border-0">
      <span className="font-serif text-[15px] text-ink">{sp.collection || '—'}</span>
      {misure.length > 0 && (
        <span className="text-xs text-muted font-sans">{misure.join(' · ')}</span>
      )}
      {sp.illustrated && (
        <span className="text-[10px] uppercase tracking-wide text-num border border-num/40 rounded-full px-1.5 py-0.5 font-sans">
          riprodotto
        </span>
      )}
      {sp.ref && (
        <a href={sp.ref} target="_blank" rel="noreferrer"
           className="text-xs text-num underline underline-offset-2 font-sans">scheda</a>
      )}
    </li>
  );
};

export const NumismaticsPanel: React.FC<NumismaticsPanelProps> = ({ monumento }) => {
  const num = monumento.numismatica;
  const ico = monumento.iconografia;

  // Le figure restano in un array piatto: il raggruppamento per faccia è una
  // lettura, non una struttura (vedi types.ts IconographicFigure.side).
  const facce = React.useMemo(() => {
    const perFaccia = (['obv', 'rev'] as CoinFace[]).map(f => ({
      faccia: f,
      figure: (ico?.figures || []).filter(x => x.side === f),
      nota: ico?.sideNotes?.[f],
    }));
    return perFaccia.filter(x => x.figure.length > 0 || x.nota);
  }, [ico]);

  const haNum = !!num && Object.values(num).some(v => v !== undefined);
  if (!haNum && facce.length === 0) return null;

  const misureTipo = [
    formatMisura(num?.weight),
    formatMisura(num?.diameter),
  ].filter(Boolean);

  return (
    <div className="mb-10">
      <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted mb-4 flex items-center gap-2">
        <Coins className="w-3.5 h-3.5 text-num" />
        Numismatica
      </h3>

      {/* Il tipo — quello che la scheda descrive. Le misure qui sono intervalli
          sul tipo; quelle puntuali stanno sugli esemplari, più sotto. */}
      {haNum && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          {num!.reference?.corpus && (
            <div className="mb-3 border-b border-border/40 pb-3 flex justify-between items-baseline flex-wrap gap-2">
              <span className="font-serif text-[15px] font-medium text-ink">
                {num!.reference.corpus} {num!.reference.n}
              </span>
              <span className="text-xs text-muted font-sans shrink-0">tipo monetale</span>
            </div>
          )}
          {num!.mint && <Riga etichetta="Zecca"><Termine kind="mint" t={num!.mint} /></Riga>}
          {num!.authority && <Riga etichetta="Autorità"><Termine kind="authority" t={num!.authority} /></Riga>}
          {num!.statedAuthority && <Riga etichetta="Dichiarata">{num!.statedAuthority}</Riga>}
          {num!.issuer && <Riga etichetta="Magistrato">{num!.issuer}</Riga>}
          {num!.metal && <Riga etichetta="Metallo"><Termine kind="metal" t={num!.metal} sigla /></Riga>}
          {num!.denomination && <Riga etichetta="Nominale"><Termine kind="denomination" t={num!.denomination} /></Riga>}
          {num!.weightStandard && <Riga etichetta="Sistema pond.">{num!.weightStandard}</Riga>}
          {num!.manufacture && <Riga etichetta="Tecnica">{capitalize(numLabel('manufacture', num!.manufacture))}</Riga>}
          {misureTipo.length > 0 && (
            <Riga etichetta="Misure">
              <span className="text-[15px]">{misureTipo.join(' · ')}</span>
              <span className="text-xs text-muted font-sans">sul tipo</span>
            </Riga>
          )}
          {num!.specimens && num!.specimens.length > 0 && (
            <Riga etichetta="Esemplari">
              <ul className="w-full">
                {num!.specimens.map((sp, i) => <Esemplare key={i} sp={sp} />)}
              </ul>
            </Riga>
          )}
          {num!.note && (
            <p className="text-xs font-serif text-muted italic pt-1">{num!.note}</p>
          )}
        </div>
      )}

      {/* Le due facce. Stessa griglia del pannello iconografico: è lo stesso
          vocabolario, e deve leggersi allo stesso modo. */}
      {facce.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          {facce.map(({ faccia, figure, nota }) => (
            <div key={faccia} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="mb-3 border-b border-num/25 pb-2 flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-num">
                  {COIN_FACE_LABELS[faccia]}
                </span>
                <span className="text-[10px] text-muted font-sans uppercase tracking-wide">{faccia}</span>
              </div>

              <div className="space-y-3">
                {figure.map((f, i) => {
                  const perTipo: Record<string, typeof f.traits> = {};
                  (f.traits || []).forEach(t => {
                    (perTipo[t.type] ||= []).push(t);
                  });
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-baseline flex-wrap gap-2">
                        <span className="font-serif text-[15px] text-ink">
                          {capitalize(voce(f.key))}
                        </span>
                        {f.dir && (
                          <span className="text-xs text-muted font-sans">{voce(f.dir)}</span>
                        )}
                        {f.rel && (
                          <span className="text-[10px] uppercase tracking-wide text-muted/70 border border-border/40 rounded-full px-1.5 py-0.5 font-sans">
                            {voce(f.rel)}
                            {f.relTo !== undefined && ` fig. ${f.relTo}`}
                          </span>
                        )}
                      </div>
                      {Object.entries(perTipo).map(([tipo, tratti]) => (
                        <div key={tipo} className="flex flex-wrap items-baseline gap-2 pl-3">
                          <span className="text-[11px] uppercase tracking-wide text-muted font-medium">
                            {voce(tipo)}
                          </span>
                          {tratti.map((t, j) => (
                            <span key={j} className="border border-border bg-sidebar/50 text-ink/80 text-xs px-2 py-0.5 rounded-full font-sans">
                              {voce(t.key)}
                              {t.hand === 'right' && <span className="opacity-70 font-light ml-1">(d.)</span>}
                              {t.hand === 'left' && <span className="opacity-70 font-light ml-1">(s.)</span>}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* La prosa della fonte resta accanto alla strutturazione: quel che
                  non entra nel vocabolario controllato deve restare leggibile. */}
              {nota && (
                <p className="text-xs font-serif text-muted italic mt-3 pt-3 border-t border-border/30">
                  {nota}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
