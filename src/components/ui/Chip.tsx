import React from 'react';
import { cn } from '../../lib/utils';
import { Tone, TONE_BORDER, TONE_FILL } from './tones';

/**
 * Pillola per valori ed epiteti (liste di voci, tag rimovibili): tondeggiante,
 * serif, sempre bordata. Per etichette e contatori compatti c'è <Badge>.
 */
export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export const Chip: React.FC<ChipProps> = ({ tone = 'accent', className, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-serif',
      TONE_FILL[tone],
      TONE_BORDER[tone],
      className,
    )}
    {...props}
  />
);
