import React from 'react';
import { Monumento } from '../types';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { ImageIcon } from 'lucide-react';

interface IconographyPanelProps {
  monumento: Monumento;
}

const TRAIT_COLORS: Record<string, string> = {
  headgear: 'bg-slate-50 text-slate-700 border-slate-200',
  lunar: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  held_object: 'bg-amber-50 text-amber-800 border-amber-200',
  mount: 'bg-stone-50 text-stone-700 border-stone-200',
  dress: 'bg-rose-50 text-rose-700 border-rose-200',
  technique: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  position: 'bg-teal-50 text-teal-800 border-teal-200',
  default: 'bg-gray-50 text-gray-700 border-gray-200',
};

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export const IconographyPanel: React.FC<IconographyPanelProps> = ({ monumento }) => {
  const ico = monumento.iconografia;
  if (!ico || (!ico.function && (!ico.figures || ico.figures.length === 0) && !ico.note)) return null;

  return (
    <div className="mb-10">
      <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted mb-4 flex items-center gap-2">
        <ImageIcon className="w-3.5 h-3.5" />
        Iconografia
      </h3>

      <div className="space-y-4">
        {ico.function && (
          <div className="flex">
            <span className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-sans font-semibold border border-amber-200">
              {ICONOGRAPHY_LABELS[ico.function] || ico.function}
            </span>
          </div>
        )}

        {ico.figures && ico.figures.map((fig, idx) => {
          // Group traits by type
          const groupedTraits: Record<string, typeof fig.traits> = {};
          fig.traits.forEach(t => {
            if (!groupedTraits[t.type]) groupedTraits[t.type] = [];
            groupedTraits[t.type].push(t);
          });

          const translatedKey = ICONOGRAPHY_LABELS[fig.key] || fig.key;
          const displayTitle = capitalize(translatedKey);
          
          const translatedType = ICONOGRAPHY_LABELS[fig.type] || fig.type;

          return (
            <div key={idx} className="bg-white border border-border/40 p-4 rounded-md">
              <div className="mb-3 border-b border-border/30 pb-2 flex justify-between items-baseline flex-wrap gap-2">
                <span className="font-serif text-[15px] font-medium text-ink">
                  {displayTitle}
                </span>
                <span className="text-xs text-muted font-sans shrink-0 flex items-center gap-2">
                  {translatedType}
                  {fig.place && (
                    <span className="text-[10px] uppercase tracking-wide text-muted/60 border border-border/30 rounded px-1.5 py-0.5">
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
                          const colorClass = TRAIT_COLORS[type] || TRAIT_COLORS.default;
                          return (
                            <span key={trIdx} className={`border text-xs px-2 py-0.5 rounded shadow-sm ${colorClass}`}>
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

        {ico.note && (
          <div className="mt-4 p-3 bg-white/50 italic text-sm text-ink/80 border-l-2 border-amber-300">
            {ico.note}
          </div>
        )}
      </div>
    </div>
  );
};