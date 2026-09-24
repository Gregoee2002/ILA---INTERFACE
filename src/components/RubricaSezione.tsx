import React from 'react';
import { cn } from '../lib/utils';

/**
 * Le due sole rubriche della scheda. Prima dell'audit del 2026-09-24 ogni
 * sezione aveva la sua (Inter 10 px in Supporto, Garamond 24 in Iscrizione,
 * 20 in Bibliografia, Garamond e Inter mescolati negli Indici): qui si
 * fissano una volta, e le sezioni le usano senza ridefinirle.
 *
 * - RubricaSezione: il titolo di un blocco (Testo, Indici, Bibliografia…),
 *   Garamond corsivo con il fregio a sinistra e il filetto fino al margine.
 * - SOTTORUBRICA: l'etichetta di un campo o di un gruppo dentro il blocco
 *   (Traduzione, Divinità, Luogo e datazione…).
 */
export function RubricaSezione({
  children,
  azioni,
  colore = 'accent',
  className,
}: {
  children: React.ReactNode;
  /** Comandi da allineare a destra del filetto (es. «Trascrizione pura»). */
  azioni?: React.ReactNode;
  /** Il colore del rombo: l'accento del sito o quello di una sezione del corpus. */
  colore?: 'accent' | 'num';
  className?: string;
}) {
  return (
    <h3 className={cn('text-2xl font-bold italic flex items-center gap-4 mb-6', className)}>
      <span className="flex items-center gap-4 shrink-0" aria-hidden="true">
        <span className="h-px w-8 bg-border/40" />
        <span className={cn('w-1.5 h-1.5 rotate-45 border', colore === 'num' ? 'border-num/50' : 'border-accent/40')} />
      </span>
      {children}
      <span className="flex-1 h-px bg-border/20" aria-hidden="true" />
      {azioni}
    </h3>
  );
}

export const SOTTORUBRICA = 'field-label !text-muted !opacity-100 mb-2';
