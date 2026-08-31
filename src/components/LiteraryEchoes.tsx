import React, { useEffect, useState } from 'react';
import { ScrollText, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  TestimoniumRisolto, PonteLetterario, costruisciPonte, risolviTutte,
} from '../lib/litSources';
import { caricaLitDataset } from '../lib/litStore';

/**
 * LiteraryEchoes — «Nelle fonti letterarie», dentro le pagine del corpus.
 *
 * Mostra le testimonianze letterarie che nominano una data divinità o un dato
 * epiteto. Le chiavi sono le stesse del corpus perché il testo letterario è
 * marcato con lo stesso markup delle iscrizioni (<persName type="divine"
 * key="…">, <rs type="epithet">): non c'è nessuna corrispondenza da mantenere
 * a mano, e se domani si marca un passo in più, questo blocco lo sa.
 *
 * I CONTEGGI RESTANO SEPARATI da quelli epigrafici, di proposito: «12
 * attestazioni» in queste pagine vuol dire dodici monumenti, e deve continuare
 * a volerlo dire. Un passo di Esiodo non è un'attestazione di culto — è
 * un'altra cosa, e si mostra come un'altra cosa.
 */

// Il dataset si carica una volta per sessione: il blocco compare in più
// punti del corpus e non deve rifare la richiesta a ogni divinità sfiorata.
let pontePromise: Promise<PonteLetterario> | null = null;

function caricaPonte(): Promise<PonteLetterario> {
  if (!pontePromise) {
    pontePromise = caricaLitDataset().then(({ dataset }) =>
      costruisciPonte(risolviTutte(dataset.testimonia, dataset.opere)));
  }
  return pontePromise;
}

interface Props {
  /** chiave della divinità, es. «Men» */
  divinita?: string;
  /** etichetta dell'epiteto, es. «Axiottenos» */
  epiteto?: string;
  /** apre la testimonianza nella sezione Fonti letterarie */
  onApri?: (id: string) => void;
  className?: string;
}

export const LiteraryEchoes: React.FC<Props> = ({ divinita, epiteto, onApri, className }) => {
  const [ponte, setPonte] = useState<PonteLetterario | null>(null);

  useEffect(() => {
    let vivo = true;
    caricaPonte().then(p => { if (vivo) setPonte(p); });
    return () => { vivo = false; };
  }, []);

  if (!ponte) return null;

  const trovate: TestimoniumRisolto[] = [
    ...(divinita ? ponte.perDivinita.get(divinita) || [] : []),
    ...(epiteto ? ponte.perEpiteto.get(epiteto) || [] : []),
  ].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

  if (trovate.length === 0) return null;

  return (
    <section className={cn('rounded-xl border border-border/50 bg-[var(--card)]/50 px-4 py-3', className)}>
      <div className="flex items-center gap-1.5 mb-2">
        <ScrollText className="h-3 w-3 shrink-0" style={{ color: 'var(--lit)' }} />
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--lit)' }}>
          Nelle fonti letterarie
        </span>
        <span className="text-[10px] font-sans text-muted/50 tabular-nums">{trovate.length}</span>
      </div>

      <ul className="space-y-1">
        {trovate.map(t => (
          <li key={t.id}>
            <button
              type="button"
              disabled={!onApri}
              onClick={() => onApri?.(t.id)}
              className={cn(
                'w-full flex items-baseline gap-2 text-left group',
                onApri && 'hover:text-accent transition-colors',
              )}
            >
              <span className="font-serif text-[13px] text-ink/85 group-hover:text-accent transition-colors truncate">
                {t.autore}, <span className="italic">{t.opera}</span> {t.locus}
              </span>
              <span className="text-[10px] font-sans text-muted/50 shrink-0 hidden sm:inline">{t.datazione}</span>
              {onApri && <ChevronRight className="h-3 w-3 text-muted/25 group-hover:text-accent shrink-0 ml-auto" />}
            </button>
          </li>
        ))}
      </ul>

      <p className="text-[10px] font-serif italic text-muted/50 mt-2 leading-snug">
        Menzioni nei testi, non attestazioni di culto: restano fuori dai conteggi epigrafici.
      </p>
    </section>
  );
};

export default LiteraryEchoes;
