import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { foldAscii } from './textNorm';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Curve condivise: stessa "fisica" per tutte le micro-animazioni Framer Motion del progetto. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.7, 0, 0.84, 0] as const;
export const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 500, damping: 40 };
export const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 30 };

/**
 * Resa di <gap reason="illegible" quantity="N">: numero massimo di puntini
 * medi da stampare, e fallback quando `quantity` manca o non è valido.
 * Unico per i tre renderer (EpiDocRenderer in App.tsx, MarkupText,
 * EditionMarkupEditor) — prima App ne stampava fino a 40 e gli altri 12,
 * quindi lo stesso markup rendeva diverso nei due percorsi (BUG-06).
 */
export const GAP_DOTS_MAX = 20;
export const GAP_DOTS_FALLBACK = 5;

/** Numero di puntini per una lacuna `illegible`, con guardia su valori assenti/negativi. */
export function gapDotCount(quantity: unknown): number {
  const n = Math.floor(Number(quantity));
  if (!Number.isFinite(n) || n <= 0) return GAP_DOTS_FALLBACK;
  return Math.min(n, GAP_DOTS_MAX);
}

/**
 * Normalizza per confronto case/accent-insensitive (autocomplete, matching di
 * vocabolari). Alias storico di foldAscii da src/lib/textNorm.ts \u2014 unico
 * normalizzatore del progetto (BUG-13). Nuovi call site importino da textNorm.
 */
export const stripAccents = foldAscii;
