/**
 * Toni semantici condivisi da <Chip> e <Badge> (audit 2026-09-01, UI-12/13).
 *
 * Fondo a /10 per tutti. Nel codice convivevano /5, /8 e /10 per lo stesso
 * ruolo: /10 era il più usato (39 occorrenze contro 29 e 6) ed è l'unico che
 * sul parchment resta distinguibile dal bordo anche in tema scuro; /5 si
 * perdeva. Il bordo, quando c'è, è sempre /25, come per gli avvisi.
 *
 * Classi scritte per intero: Tailwind le trova solo se compaiono letterali.
 */
export type Tone = 'default' | 'accent' | 'danger' | 'warning' | 'success';

export const TONE_FILL: Record<Tone, string> = {
  default: 'bg-border/30 text-muted',
  accent: 'bg-accent/10 text-accent',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
};

export const TONE_BORDER: Record<Tone, string> = {
  default: 'border-border',
  accent: 'border-accent/25',
  danger: 'border-danger/25',
  warning: 'border-warning/25',
  success: 'border-success/25',
};
