import { useEffect, useState } from 'react';
import { ControlliNotturni } from '../types';

/**
 * Esito dei controlli notturni (revisione/controlli.json nella repo dati,
 * scritto da scripts/raccogli-revisione.py): lo leggono Coerenza (il lint) e
 * Completezza (l'andamento per campo). Una lettura per sessione, condivisa fra
 * le due linguette; `ricarica` la rifà.
 */

let cache: Promise<ControlliNotturni | null> | null = null;

function leggi(): Promise<ControlliNotturni | null> {
  if (!cache) {
    cache = fetch('/api/revisione/controlli')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return cache;
}

export function useControlliNotturni() {
  const [dati, setDati] = useState<ControlliNotturni | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCaricamento(true);
    leggi().then(d => { if (vivo) { setDati(d); setCaricamento(false); } });
    return () => { vivo = false; };
  }, [giro]);

  const ricarica = () => { cache = null; setGiro(g => g + 1); };
  return { dati, caricamento, ricarica };
}

/** Differenza di un campo fra l'ultima notte e quella di `giorni` giorni prima (o la più vecchia che c'è). */
export function variazione(dati: ControlliNotturni | null, campo: string, giorni = 7): number | null {
  const s = dati?.avanzamento;
  if (!s || s.length < 2) return null;
  const ultima = s[s.length - 1];
  const limite = new Date(ultima.data);
  limite.setDate(limite.getDate() - giorni);
  const iso = limite.toISOString().slice(0, 10);
  const base = s.find(x => x.data >= iso) ?? s[0];
  if (base === ultima) return null;
  const a = ultima.campi[campo], b = base.campi[campo];
  return a === undefined || b === undefined ? null : a - b;
}

export const dataNotte = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
