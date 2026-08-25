/**
 * Secolo di attestazione: derivato da data_inizio/data_fine, non salvato.
 * Serve per il confronto incrociato con Litmap (coordinate <-> secolo).
 *
 * Convenzione di numerazione (nessun "anno zero", coerente con data_inizio/
 * data_fine dove il segno codifica l'era): il secolo I a.C. copre gli anni
 * 100-1 a.C. e confina direttamente col secolo I d.C. (anni 1-100 d.C.),
 * senza un "secolo zero" fra i due — così come non esiste un anno zero.
 */

const ROMAN_NUMERALS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function toRoman(n: number): string {
  let remaining = n;
  let result = '';
  for (const [value, symbol] of ROMAN_NUMERALS) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

/** Indice di secolo unificato: negativo = a.C., positivo = d.C., mai 0. */
export function centuryIndex(year: number): number {
  const century = Math.ceil(Math.abs(year) / 100);
  return year < 0 ? -century : century;
}

export function centuryLabel(index: number): string {
  return index < 0 ? `${toRoman(-index)} a.C.` : `${toRoman(index)} d.C.`;
}

/**
 * Restituisce gli indici di secolo (vedi centuryIndex) coperti dall'intervallo
 * [dataInizio, dataFine] (o dal singolo anno, se solo uno dei due è
 * definito), in ordine cronologico. Tratta 0 come "non impostato", come
 * formatDateRange.
 */
export function getSecoliIndexAttestazione(dataInizio?: number, dataFine?: number): number[] {
  const start = dataInizio !== undefined && dataInizio !== 0 ? dataInizio : undefined;
  const end = dataFine !== undefined && dataFine !== 0 ? dataFine : undefined;

  if (start === undefined && end === undefined) return [];
  if (start === undefined) return [centuryIndex(end!)];
  if (end === undefined) return [centuryIndex(start)];

  let from = centuryIndex(start);
  let to = centuryIndex(end);
  if (from > to) [from, to] = [to, from];

  const indexes: number[] = [];
  for (let i = from; i <= to; i++) {
    if (i === 0) continue; // nessun "secolo zero"
    indexes.push(i);
  }
  return indexes;
}

/**
 * Restituisce i secoli coperti dall'intervallo [dataInizio, dataFine] (o dal
 * singolo anno, se solo uno dei due è definito), in ordine cronologico.
 * Tratta 0 come "non impostato", come formatDateRange.
 */
export function getSecoliAttestazione(dataInizio?: number, dataFine?: number): string[] {
  return getSecoliIndexAttestazione(dataInizio, dataFine).map(centuryLabel);
}

export function formatSecoliAttestazione(dataInizio?: number, dataFine?: number): string {
  const secoli = getSecoliAttestazione(dataInizio, dataFine);
  return secoli.length > 0 ? secoli.join(' - ') : '-';
}
