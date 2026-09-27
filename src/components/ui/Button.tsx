import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Bottone di base di ILA (audit 2026-09-01, UI-10).
 *
 * Solo token del tema (accent, danger, border, sidebar, muted, ink): niente
 * colori Tailwind ad-hoc, così chiaro e scuro seguono le variabili di
 * src/index.css.
 *
 * Disabilitato: `opacity-40`. Nel codice convivevano 20, 25, 30, 40 e 50;
 * 40 è di gran lunga il più usato (17 occorrenze su 32) e sul fondo accent
 * tiene ancora leggibile l'etichetta, mentre 20-30 la fanno sparire.
 *
 * `className` passa per `cn` (tailwind-merge): chi ha bisogno di una forma
 * diversa (per es. le pillole `rounded-full` dell'editor a sezioni) la
 * sovrascrive senza duplicare il resto.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-sm font-sans font-bold uppercase tracking-widest transition-colors ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  secondary: 'border border-border text-muted hover:bg-sidebar',
  ghost: 'text-muted hover:text-ink hover:bg-sidebar',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-[9px]',
  md: 'px-4 py-1.5 text-xs',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'sm', type = 'button', className, ...props }, ref) => (
    <button ref={ref} type={type} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />
  ),
);
Button.displayName = 'Button';
