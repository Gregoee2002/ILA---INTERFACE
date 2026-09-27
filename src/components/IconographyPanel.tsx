import React from 'react';
import { Monumento } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { SOTTORUBRICA } from './RubricaSezione';
import { cn } from '../lib/utils';

interface IconographyPanelProps {
  monumento: Monumento;
}

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export const IconographyPanel: React.FC<IconographyPanelProps> = ({ monumento }) => {
  const ico = monumento.iconografia;
  // La funzione cultuale ha la sua rubrica in testa a «Morfologia cultuale»:
  // qui restano solo le figure.
  const isEmpty = !ico?.figures || ico.figures.length === 0;

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
    <div>
      <h4 className={SOTTORUBRICA}>Figure</h4>

      {isEmpty ? (
        <p className="text-xs font-serif text-muted italic">Nessuna figura registrata.</p>
      ) : (
      // Niente riquadro né pillole: la figura si legge come il resto della
      // scheda, titolo in Garamond e qualifiche in corsivo, i tratti come
      // elenco di voci accanto alla loro etichetta.
      <div className="space-y-6">
        {figures.map(({ fig, groupedTraits, displayTitle, translatedType }, idx) => {
          const qualifiche = [translatedType, fig.place && (ICONOGRAPHY_LABELS[fig.place] || fig.place)].filter(Boolean).join(' · ');
          const gruppi = Object.entries(groupedTraits);
          return (
            <div key={idx} className="font-serif">
              <div className="flex items-baseline gap-x-3 flex-wrap">
                <span className="text-base text-ink">{displayTitle}</span>
                {qualifiche && <span className="text-xs italic text-muted">{qualifiche}</span>}
              </div>
              {gruppi.length > 0 && (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 items-baseline">
                  {gruppi.map(([type, traits]) => (
                    <React.Fragment key={type}>
                      <dt className={cn(SOTTORUBRICA, 'mb-0')}>{ICONOGRAPHY_LABELS[type] || type}</dt>
                      <dd className="text-sm text-ink/85">
                        {traits.map((t, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && ', '}
                            {ICONOGRAPHY_LABELS[t.key] || t.key}
                            {t.hand === 'right' && <span className="text-muted"> (d.)</span>}
                            {t.hand === 'left' && <span className="text-muted"> (s.)</span>}
                          </React.Fragment>
                        ))}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};