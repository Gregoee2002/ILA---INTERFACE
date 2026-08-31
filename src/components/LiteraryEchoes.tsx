import React, { useEffect, useState } from 'react';
import { ScrollText, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  TestimoniumRisolto, PonteLetterario, costruisciPonte, risolviTutte,
} from '../lib/litSources';
import { AMBITO_CAMPO, AMBITO_LABELS, CAMPO_COLOR } from '../lib/laresToolbox';
import { caricaLitDataset } from '../lib/litStore';

// «Nelle fonti letterarie»: i passi che nominano una divinità o un epiteto,
// dentro le pagine del corpus. Le chiavi sono le stesse perché il markup è lo
// stesso, quindi non c'è nessuna corrispondenza da mantenere a mano.
//
// I conteggi restano separati da quelli epigrafici, di proposito: «12
// attestazioni» qui vuol dire dodici monumenti e deve continuare a volerlo
// dire. E ogni passo mostra il proprio marcatore di rappresentazione, perché
// «pratica» e «finzione» non possono comparire con lo stesso peso: Strabone
// sugli ἱερόδουλοι e Esiodo che genera Selene da Tia non provano la stessa cosa.

let pontePromise: Promise<PonteLetterario> | null = null;

function caricaPonte(): Promise<PonteLetterario> {
  if (!pontePromise) {
    pontePromise = caricaLitDataset().then(({ dataset }) =>
      costruisciPonte(risolviTutte(dataset.testimonia, dataset.opere)));
  }
  return pontePromise;
}

// pratica · credenza · finzione — il primo campo della griglia LARES, che dice
// che rapporto ha il passo con il fatto. Viaggia con la testimonianza ovunque
// essa compaia fuori dalla propria sezione.
const Rappresentazione: React.FC<{ t: TestimoniumRisolto }> = ({ t }) => {
  const ambiti = [...new Set(
    t.lares.filter(m => AMBITO_CAMPO[m.ambito] === 'rappresentazione').map(m => m.ambito),
  )];
  if (ambiti.length === 0) return null;
  return (
    <span
      className="text-[10px] font-sans uppercase tracking-[0.1em] shrink-0 opacity-75"
      style={{ color: CAMPO_COLOR.rappresentazione }}
      title="Rapporto del passo con il fatto (griglia LARES)"
    >
      {ambiti.map(a => AMBITO_LABELS[a]).join(' · ')}
    </span>
  );
};

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
              <Rappresentazione t={t} />
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
