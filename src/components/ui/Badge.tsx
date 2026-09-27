import React from 'react';
import { cn } from '../../lib/utils';
import { Tone, TONE_BORDER, TONE_FILL } from './tones';

/**
 * Etichetta compatta: contatori, sigle di scheda, marcatori come «RICOSTR.».
 * Resta `inline` e non fissa font, maiuscole né spaziatura, così dentro una
 * linguetta o un titolo eredita quelli del contenitore e non ne altera
 * l'altezza di riga.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Filetto sottile del colore del tono. */
  bordered?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'accent', bordered = false, className, ...props }) => (
  <span
    className={cn(
      'px-1.5 py-0.5 rounded-sm text-[9px] font-bold',
      TONE_FILL[tone],
      bordered && ['border', TONE_BORDER[tone]],
      className,
    )}
    {...props}
  />
);
