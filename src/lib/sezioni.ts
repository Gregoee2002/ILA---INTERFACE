/* ------------------------------------------------------------------
 *  sezioni.ts — le sezioni del corpus, e l'identità delle schede
 * ------------------------------------------------------------------
 *  Fino al 2026-09-21 il corpus era uno solo: 295 schede epigrafiche in una
 *  numerazione continua, `ILA-042`. Con il CMRDM II entra un secondo
 *  sottocorpus — i tipi monetali — che non è un sottoinsieme del primo:
 *  ha unità di schedatura diversa (il tipo, non l'oggetto: piano §4), campi
 *  che non si applicano (repository, provenance, funzione cultuale) e
 *  campi propri (il blocco `num:`).
 *
 *  La sezione è quindi una dimensione della scheda, non un filtro di comodo.
 *  Qui sta la sua unica definizione: etichette, numerazione, nomi di file.
 *
 *  ── Perché la numerazione è a blocchi ──────────────────────────────
 *  `Monumento.id` è la chiave dell'applicazione: unica, numerica, usata come
 *  chiave di lista, di lookup e di permalink. Due contatori indipendenti
 *  darebbero due schede con id 1, e nessun modo di distinguerle dove passa
 *  solo il numero. Due campi (id globale + numero di sezione) darebbero due
 *  contatori da tenere allineati a ogni import e a ogni riordino — cioè due
 *  contatori che prima o poi divergono.
 *
 *  Un blocco per sezione risolve entrambi: l'id resta unico e numerico, e il
 *  numero della scheda dentro la sua sezione è `id - offset`. Nessuno stato
 *  da sincronizzare, la sezione si legge dall'id anche fuori dall'app.
 *  Il prezzo è il tetto di OFFSET_SEZIONE schede per sezione — con 10.000 e
 *  un corpus che ne conta 295 + ~440, è un tetto teorico.
 * ------------------------------------------------------------------
 */

export type Sezione = 'epigrafia' | 'numismatica';

/** Ampiezza del blocco di id riservato a ciascuna sezione. */
export const AMPIEZZA_BLOCCO = 10000;

export interface DefinizioneSezione {
  id: Sezione;
  /** Etichetta per l'interfaccia. */
  label: string;
  /** Plurale con cui si contano le schede («295 epigrafi», «12 tipi monetali»). */
  unita: [singolare: string, plurale: string];
  /**
   * Sigla dentro l'identificatore: `ILA-042` per l'epigrafia (nessuna sigla,
   * la forma storica non cambia), `ILA-N-007` per la numismatica.
   */
  sigla: string;
  /** Primo id del blocco. L'epigrafia parte da 1 e conserva i suoi id. */
  offset: number;
  /** Token di colore della sezione (src/index.css). */
  colore: string;
  /**
   * Se la sezione è pubblicata.
   *
   * `false` significa «esiste solo in modalità di redazione»: le sue schede
   * non entrano nello scatto statico che il sito serve a chi ha la sola
   * password (`scripts/build-corpus-snapshot.ts`), e la sezione non compare
   * né nella barra di navigazione né in home finché l'editing non è sbloccato.
   * Non è un nascondiglio: è lo stato di un materiale non ancora rivisto.
   * Pubblicarla, il giorno che lo sarà, è cambiare questo booleano.
   */
  pubblica: boolean;
}

export const SEZIONI: DefinizioneSezione[] = [
  {
    id: 'epigrafia',
    label: 'Epigrafia',
    unita: ['epigrafe', 'epigrafi'],
    sigla: '',
    offset: 0,
    colore: '--accent',
    pubblica: true,
  },
  {
    id: 'numismatica',
    label: 'Numismatica',
    unita: ['tipo monetale', 'tipi monetali'],
    sigla: 'N',
    offset: AMPIEZZA_BLOCCO,
    colore: '--num',
    // 2026-09-21: le 475 schede del CMRDM II sono appena estratte e non
    // ancora riviste. Restano in redazione finché non lo saranno.
    pubblica: false,
  },
];

export const SEZIONE_PREDEFINITA: Sezione = 'epigrafia';

export function definizioneSezione(s: Sezione): DefinizioneSezione {
  return SEZIONI.find(d => d.id === s) ?? SEZIONI[0];
}

export function etichettaSezione(s: Sezione): string {
  return definizioneSezione(s).label;
}

/** La sezione a cui appartiene un id, letta dal blocco in cui cade. */
export function sezioneDiId(id: number): Sezione {
  for (let i = SEZIONI.length - 1; i >= 0; i--) {
    if (id >= SEZIONI[i].offset) return SEZIONI[i].id;
  }
  return SEZIONE_PREDEFINITA;
}

/** Il numero della scheda dentro la sua sezione: `ILA-N-007` → 7. */
export function numeroInSezione(id: number): number {
  return id - definizioneSezione(sezioneDiId(id)).offset;
}

/** L'id applicativo dal numero di sezione. */
export function idDaNumero(sezione: Sezione, numero: number): number {
  return definizioneSezione(sezione).offset + numero;
}

/**
 * L'etichetta citabile della scheda: `ILA-042`, `ILA-N-007`.
 * Unico posto in cui si compone.
 */
export function etichettaScheda(id: number): string {
  const def = definizioneSezione(sezioneDiId(id));
  const n = String(numeroInSezione(id)).padStart(3, '0');
  return def.sigla ? `ILA-${def.sigla}-${n}` : `ILA-${n}`;
}

/**
 * Accetta `ILA-042`, `ila-42`, `042`, `42` (epigrafia) e `ILA-N-007`,
 * `ila n 7`, `N-7` (numismatica). Restituisce l'id applicativo.
 */
export function idDaEtichetta(s: string): number | undefined {
  const testo = (s || '').trim();
  if (!testo) return undefined;
  // Prima la forma con sigla di sezione («ILA-N-007», «N 7»): la si accetta
  // solo se la sigla è di una sezione vera, altrimenti «ILA-042» — dove
  // «ILA» stessa si lascia leggere come una sigla — cadrebbe qui per sbaglio.
  const conSigla = testo.match(/^(?:ILA[-\s]?)?([A-Za-z]+)[-\s]?0*(\d{1,4})$/);
  if (conSigla) {
    const def = SEZIONI.find(d => d.sigla && d.sigla.toLowerCase() === conSigla[1].toLowerCase());
    if (def) return def.offset + Number(conSigla[2]);
  }
  const semplice = testo.match(/^(?:ILA[-\s]?)?0*(\d{1,5})$/i);
  return semplice ? Number(semplice[1]) : undefined;
}

/** Se le schede della sezione sono servite a chi non ha sbloccato l'editing. */
export function sezionePubblica(s: Sezione): boolean {
  return definizioneSezione(s).pubblica;
}

/** Le sezioni visibili a chi sta guardando: tutte in redazione, le sole pubbliche fuori. */
export function sezioniVisibili(inRedazione: boolean): DefinizioneSezione[] {
  return inRedazione ? SEZIONI : SEZIONI.filter(d => d.pubblica);
}

/**
 * La sezione di un file del corpus, dal solo nome (`ILA-N-007.xml`).
 * Serve dove l'XML non è ancora stato letto — lo scatto statico lo decide
 * prima di aprire i file.
 */
export function sezioneDaNomeFile(nome: string): Sezione {
  const id = idDaEtichetta(nome.replace(/\.xml$/i, ''));
  return id === undefined ? SEZIONE_PREDEFINITA : sezioneDiId(id);
}

/** Il file del corpus che contiene la scheda: `ILA-042.xml`, `ILA-N-007.xml`. */
export function nomeFileScheda(id: number): string {
  return `${etichettaScheda(id)}.xml`;
}

/**
 * La sezione di una scheda appena letta da un XML che non porta ancora un id
 * assegnato dall'app (una scheda in arrivo dall'estrazione del CMRDM II).
 * Si legge dal tipo di oggetto e dal blocco `num:`, cioè dai dati che
 * l'estrattore scrive comunque — non da una convenzione sul nome del file.
 */
export function sezioneDaContenuto(m: {
  tipo?: string;
  numismatica?: unknown;
  facce?: unknown[];
}): Sezione {
  if (m.numismatica) return 'numismatica';
  const tipo = (m.tipo || '').toLowerCase().trim();
  if (/^(coin|coin type|tipo monetale|moneta|gem|gemma|intaglio)\b/.test(tipo)) return 'numismatica';
  return SEZIONE_PREDEFINITA;
}
