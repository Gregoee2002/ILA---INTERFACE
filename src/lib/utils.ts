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
 * Glifo di una lacuna `<gap>` per tutti e tre i renderer (EpiDocRenderer in
 * App.tsx, MarkupText, EditionMarkupEditor) — dopo BUG-06 la resa dev'essere
 * identica ovunque.
 *
 * `insideSupplied` = il gap è figlio diretto di un `<supplied>` (notazione
 * `[--- θεοῖσι]`: un unico tratto perduto, parte non integrabile + parte
 * integrata). In quel caso il gap NON stampa parentesi quadre proprie: le
 * fornisce già il `<supplied>` che lo contiene. Fuori da `<supplied>` il gap
 * porta le sue: `[- - -]`, `[- ca. 5 -]`, `[- 2-4 -]`.
 */
export function gapGlyph(
  opts: { reason?: string | null; quantity?: string | number | null; atLeast?: string | null; atMost?: string | null },
  insideSupplied = false,
): string {
  if (opts.reason === 'illegible') return '·'.repeat(gapDotCount(opts.quantity));
  let inner: string;
  if (opts.quantity) inner = `ca. ${opts.quantity}`;
  else if (opts.atLeast && opts.atMost) inner = `${opts.atLeast}-${opts.atMost}`;
  else inner = '- - -';
  if (insideSupplied) return inner;
  return inner === '- - -' ? '[- - -]' : `[- ${inner} -]`;
}

/**
 * Normalizza per confronto case/accent-insensitive (autocomplete, matching di
 * vocabolari). Alias storico di foldAscii da src/lib/textNorm.ts \u2014 unico
 * normalizzatore del progetto (BUG-13). Nuovi call site importino da textNorm.
 */
export const stripAccents = foldAscii;
