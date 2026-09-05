import React, { useState } from 'react';
import { Check, Copy, Download, Link2 } from 'lucide-react';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import { citazioneScheda, etichettaScheda, urlScheda } from '../lib/permalink';
import { monumentiToXml } from '../lib/xmlUtils';

/**
 * CitaCosi — come si cita questa scheda, e come si porta via.
 *
 * Non è un vezzo bibliografico: senza un riferimento stabile e un modo di
 * scaricare il dato, un corpus resta un sito da guardare, non una fonte da
 * usare. Le tre azioni sono per tutti, non solo per chi ha sbloccato la
 * modifica — l'esportazione XML riservata resta quella dell'intestazione.
 */

interface Props { m: Monumento }

const AZIONE =
  'inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors';

export const CitaCosi: React.FC<Props> = ({ m }) => {
  const [copiato, setCopiato] = useState<'cita' | 'link' | null>(null);

  const copia = async (testo: string, quale: 'cita' | 'link') => {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(quale);
      setTimeout(() => setCopiato(null), 1800);
    } catch {
      // clipboard negata (contesto non sicuro, permesso rifiutato): il testo
      // resta visibile e selezionabile a mano, che è il vero rimedio.
      setCopiato(null);
    }
  };

  const scaricaXml = () => {
    const blob = new Blob([monumentiToXml([m])], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${etichettaScheda(m.id)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const citazione = citazioneScheda(m);

  return (
    <div className="mt-4 pt-3 border-t border-border/30">
      <div className="flex items-baseline flex-wrap gap-x-4 gap-y-1.5">
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-muted/50">Cita così</span>
        <button onClick={() => copia(citazione, 'cita')} className={AZIONE}>
          {copiato === 'cita' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copiato === 'cita' ? 'copiata' : 'copia citazione'}
        </button>
        <button onClick={() => copia(urlScheda(m.id), 'link')} className={AZIONE}>
          {copiato === 'link' ? <Check className="h-3 w-3 text-success" /> : <Link2 className="h-3 w-3" />}
          {copiato === 'link' ? 'copiato' : 'copia collegamento'}
        </button>
        <button onClick={scaricaXml} className={AZIONE}>
          <Download className="h-3 w-3" /> scarica XML
        </button>
      </div>
      <p className={cn('mt-1.5 text-[12px] font-serif text-muted/75 leading-relaxed break-words')}>
        {citazione}
      </p>
      {(m.fontiStampa?.length ?? 0) === 0 && (
        <p className="mt-1 text-[11px] font-serif italic text-muted/50">
          Nessun riferimento a fonti a stampa riconosciuto nella bibliografia di questa scheda.
        </p>
      )}
    </div>
  );
};
