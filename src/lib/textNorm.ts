// textNorm.ts — normalizzazione del testo, unica per tutto il progetto.
//
// Prima esistevano tre normalizzatori divergenti (BUG-13 / DATA-06 dell'audit
// 2026-09-01):
//   - stripAccents   (utils.ts)      NFKD + via diacritici + lowercase
//   - auditNorm      (epithetIndex)  NFD  + via diacritici + ς→σ + spazi + lc
//   - normalizeGreek (searchIndex)   NFD  + via diacritici + ς→σ + lowercase
// Conseguenza: una ricerca "Ἀξιοττηνῷ" poteva non riconciliarsi con la
// faccetta "Axiottenos" perché ricerca e indici applicavano folding diversi.

/**
 * Folding "ASCII": vale per autocomplete e matching di vocabolari dove il
 * testo può essere latino o greco traslitterato. NFKD per assorbire anche le
 * forme di compatibilità (legature, full-width). Non applica il folding
 * specifico del greco (ς→σ) né collassa gli spazi.
 */
export function foldAscii(s: string): string {
  if (!s) return '';
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Normalizzazione per il confronto di testo greco: NFD, via accenti/spiriti,
 * sigma finale → sigma, spazi collassati, trim, lowercase. Unico punto di
 * verità per la ricerca full-text (searchIndex) e per l'audit di
 * classificazione epiteti/teonimi (epithetIndex).
 */
export function normalizeGreek(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
