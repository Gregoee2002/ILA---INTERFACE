/**
 * Conversione minimale "numero in lettere" (italiano) -> cifre, per permettere
 * la ricerca per ID scrivendo "novantuno" invece di "91". Copre 0-999, che
 * basta ampiamente per la numerazione del corpus (ILA-1 ... ILA-294 ecc.).
 */

const UNITS: Record<string, number> = {
  zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5,
  sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15,
  sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19,
};

const TENS: Record<string, number> = {
  venti: 20, trenta: 30, quaranta: 40, cinquanta: 50,
  sessanta: 60, settanta: 70, ottanta: 80, novanta: 90,
};

/** Converte una singola parola-numero italiana (0-999) in valore numerico, o null se non riconosciuta. */
function wordToNumber(word: string): number | null {
  const w = word.toLowerCase().trim();
  if (!w) return null;
  if (w in UNITS) return UNITS[w];
  if (w in TENS) return TENS[w];

  // Centinaia: "cento", "duecento", ... "novecento", eventualmente seguite da resto.
  const hundredMatch = w.match(/^(due|tre|quattro|cinque|sei|sette|otto|nove)?cento(.*)$/);
  if (hundredMatch) {
    const mult = hundredMatch[1] ? UNITS[hundredMatch[1]] : 1;
    const rest = hundredMatch[2];
    if (!rest) return mult * 100;
    const restVal = wordToNumber(rest);
    if (restVal === null || restVal >= 100) return null;
    return mult * 100 + restVal;
  }

  // Decine + unità, forma piena (ventidue, trentatre...) o con elisione
  // davanti a "uno"/"otto" (ventuno, ventotto, trentuno, trentotto...).
  for (const [tensWord, tensVal] of Object.entries(TENS)) {
    if (w.startsWith(tensWord)) {
      const rest = w.slice(tensWord.length);
      if (!rest) return tensVal;
      const restVal = UNITS[rest];
      if (restVal !== undefined && restVal >= 1 && restVal <= 9) return tensVal + restVal;
    }
    const stem = tensWord.slice(0, -1); // "vent", "trent", "quarant", ...
    if (w.startsWith(stem)) {
      const rest = w.slice(stem.length);
      if (rest === 'uno' || rest === 'otto') return tensVal + UNITS[rest];
    }
  }

  return null;
}

/**
 * Converte una stringa (query utente) che scrive un numero in lettere in
 * cifre (es. "novantuno" -> "91"). Se non è un numero in lettere riconosciuto,
 * ritorna null.
 */
export function italianWordsToDigits(text: string): string | null {
  const n = wordToNumber(text);
  return n === null ? null : String(n);
}
