/* ------------------------------------------------------------------
 *  permalink.ts — indirizzi stabili per le schede e le sezioni
 * ------------------------------------------------------------------
 *  Finora lo stato dell'applicazione viveva solo in memoria: aprire una
 *  scheda, ricaricare la pagina e ritrovarsi all'inizio; e soprattutto
 *  nessun modo di mandare a qualcuno *quella* scheda. Un corpus che non si
 *  può citare per riferimento stabile non entra nella bibliografia di
 *  nessuno.
 *
 *  La forma è `?vista=catalog&scheda=ILA-042`. Sta nella query string e non
 *  nel path perché il sito è servito staticamente da GitHub Pages, che non
 *  sa riscrivere le rotte: un path profondo darebbe 404 al primo caricamento.
 *
 *  Non c'è routing e non c'è libreria: si legge all'avvio, si riscrive quando
 *  cambia la selezione, con `replaceState` — la navigazione interna non deve
 *  riempire la cronologia del browser di passi indietro inutili.
 * ------------------------------------------------------------------
 */

import { Monumento } from '../types';

export interface StatoPermalink {
  vista?: string;
  /** id numerico della scheda, già estratto dall'etichetta ILA-NNN. */
  scheda?: number;
}

/** «ILA-042» dall'id numerico. Unico posto in cui si compone l'etichetta. */
export function etichettaScheda(id: number): string {
  return `ILA-${String(id).padStart(3, '0')}`;
}

/** Accetta «ILA-042», «ila-42», «042», «42». */
export function idDaEtichetta(s: string): number | undefined {
  const m = (s || '').trim().match(/^(?:ILA[-\s]?)?0*(\d{1,4})$/i);
  return m ? Number(m[1]) : undefined;
}

export function leggiPermalink(search: string = typeof window !== 'undefined' ? window.location.search : ''): StatoPermalink {
  const p = new URLSearchParams(search);
  const vista = p.get('vista') || undefined;
  const scheda = idDaEtichetta(p.get('scheda') || '');
  return { ...(vista ? { vista } : {}), ...(scheda !== undefined ? { scheda } : {}) };
}

/** La query string corrispondente allo stato, «» quando non c'è nulla da dire. */
export function scriviPermalink(stato: StatoPermalink): string {
  const p = new URLSearchParams();
  // La vista iniziale non si scrive: un indirizzo pulito è quello della home.
  if (stato.vista && stato.vista !== 'home') p.set('vista', stato.vista);
  if (stato.scheda !== undefined) p.set('scheda', etichettaScheda(stato.scheda));
  const q = p.toString();
  return q ? `?${q}` : '';
}

/** URL assoluto di una scheda, a partire dall'indirizzo corrente. */
export function urlScheda(id: number, base?: string): string {
  const origine = base ?? (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');
  return `${origine}${scriviPermalink({ vista: 'catalog', scheda: id })}`;
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/**
 * La citazione della scheda. Include i riferimenti alle fonti a stampa
 * riconosciuti (`fontiStampa`), perché è da lì che il lettore ritrova il testo
 * sul libro; nessuna fonte è privilegiata, si citano nell'ordine del registro.
 */
export function citazioneScheda(m: Monumento, oggi: Date = new Date(), base?: string): string {
  const refs = (m.fontiStampa || []).map(f => f.ref);
  const data = `${oggi.getDate()} ${MESI[oggi.getMonth()]} ${oggi.getFullYear()}`;
  return [
    `ILA — Index Lunae Antiquae, scheda ${etichettaScheda(m.id)}`,
    refs.length ? ` (= ${refs.join(' = ')})` : '',
    `, consultata il ${data}, ${urlScheda(m.id, base)}`,
  ].join('');
}
