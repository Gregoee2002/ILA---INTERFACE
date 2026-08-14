import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Curve condivise: stessa "fisica" per tutte le micro-animazioni Framer Motion del progetto. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.7, 0, 0.84, 0] as const;
export const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 500, damping: 40 };
export const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 30 };

/** Normalizza per confronto case/accent-insensitive (usato per autocomplete e matching di vocabolari). */
export function stripAccents(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
