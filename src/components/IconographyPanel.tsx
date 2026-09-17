import React from 'react';
import { Monumento } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';

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
      <h3 className="font-serif italic text-[13px] text-muted mb-4">Iconografia e funzione cultuale</h3>

      {isEmpty ? (
        <p className="font-serif italic text-[13px] text-muted/60">Nessun dato iconografico registrato.</p>
      ) : (
      <div className="space-y-4">
        {ico.function && (
          <p className="font-serif text-[15px] text-accent">
            {ICONOGRAPHY_LABELS[ico.function] || ico.function}
          </p>
        )}

        {figures.map(({ fig, groupedTraits, displayTitle, translatedType }, idx) => {
          return (
            <div key={idx} className="border-t border-border/40 pt-3">
              <div className="mb-3 border-b border-border/40 pb-3 flex justify-between items-baseline flex-wrap gap-2">
                <span className="font-serif text-[15px] text-ink">
                  {displayTitle}
                </span>
                <span className="text-xs text-muted font-sans shrink-0 flex items-center gap-2">
                  {translatedType}
                  {fig.place && (
                    <span className="font-serif italic text-[12px] text-muted/60">
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
                      <span className="font-serif italic text-[12px] text-muted/60 w-28 shrink-0 sm:pt-1">
                        {label}
                      </span>
                      <p className="font-serif text-[14px] text-ink/85 leading-relaxed">
                        {traits.map((t, trIdx) => {
                          const traitLabel = ICONOGRAPHY_LABELS[t.key] || t.key;
                          return (
                            <span key={trIdx}>
                              {trIdx > 0 && <span className="text-muted/60">, </span>}
                              {traitLabel}
                              {t.hand === 'right' && <span className="text-muted/60"> (d.)</span>}
                              {t.hand === 'left' && <span className="text-muted/60"> (s.)</span>}
                            </span>
                          );
                        })}
                      </p>
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