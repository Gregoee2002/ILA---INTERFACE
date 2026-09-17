import React from 'react';
import { Monumento } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { ImageIcon } from 'lucide-react';

interface IconographyPanelProps {
  monumento: Monumento;
}

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export const IconographyPanel: React.FC<IconographyPanelProps> = ({ monumento }) => {
  const ico = monumento.iconografia;
  const isEmpty = !ico || (!ico.function && (!ico.figures || ico.figures.length === 0));

  // Il raggruppamento dei tratti per tipo è puro rispetto a `monumento`:
  // lo si calcola una sola volta invece che ad ogni render.
  const figures = React.useMemo(() => {
    return (ico?.figures || []).map(fig => {
      const groupedTraits: Record<string, typeof fig.traits> = {};
      (fig.traits || []).forEach(t => {
        if (!groupedTraits[t.type]) groupedTraits[t.type] = [];
        groupedTraits[t.type].push(t);
      });
      return {
        fig,
        groupedTraits,
        displayTitle: capitalize(ICONOGRAPHY_LABELS[fig.key] || fig.key),
        translatedType: ICONOGRAPHY_LABELS[fig.type] || fig.type,
      };
    });
  }, [monumento]);

  return (
    <div className="mb-10">
      <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted mb-4 flex items-center gap-2">
        <ImageIcon className="w-3.5 h-3.5" />
        Iconografia e funzione cultuale
      </h3>

      {isEmpty ? (
        <p className="text-xs font-serif text-muted italic">Nessun dato iconografico registrato.</p>
      ) : (
      <div className="space-y-4">
        {ico.function && (
          <div className="flex">
            <span className="border border-accent bg-accent/10 text-accent text-xs px-3 py-1 rounded-full uppercase tracking-wider font-sans font-semibold">
              {ICONOGRAPHY_LABELS[ico.function] || ico.function}
            </span>
          </div>
        )}

        {figures.map(({ fig, groupedTraits, displayTitle, translatedType }, idx) => {
          return (
            <div key={idx} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="mb-3 border-b border-border/40 pb-3 flex justify-between items-baseline flex-wrap gap-2">
                <span className="font-serif text-[15px] font-medium text-ink">
                  {displayTitle}
                </span>
                <span className="text-xs text-muted font-sans shrink-0 flex items-center gap-2">
                  {translatedType}
                  {fig.place && (
                    <span className="text-[10px] uppercase tracking-wide text-muted/60 border border-border/40 rounded-full px-1.5 py-0.5">
                      {ICONOGRAPHY_LABELS[fig.place] || fig.place}
                    </span>
                  )}
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(groupedTraits).map(([type, traits], tIdx) => {
                  const label = ICONOGRAPHY_LABELS[type] || type;
                  return (
                    <div key={tIdx} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                      <span className="text-[11px] uppercase tracking-wide text-muted font-medium w-28 shrink-0 sm:pt-1">
                        {label}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {traits.map((t, trIdx) => {
                          const traitLabel = ICONOGRAPHY_LABELS[t.key] || t.key;
                          return (
                            <span key={trIdx} className="border border-border bg-sidebar/50 text-ink/80 text-xs px-2 py-0.5 rounded-full font-sans">
                              {traitLabel}
                              {t.hand === 'right' && <span className="opacity-70 font-light ml-1">(d.)</span>}
                              {t.hand === 'left' && <span className="opacity-70 font-light ml-1">(s.)</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};