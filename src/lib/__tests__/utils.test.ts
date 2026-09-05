import { describe, it, expect } from 'vitest';
import { normalizeGreek, foldAscii } from '../textNorm';
import { italianWordsToDigits } from '../italianNumbers';
import { centuryIndex, centuryLabel, getSecoliAttestazione, formatSecoliAttestazione } from '../chronology';

describe('normalizzazione del testo', () => {
  it('greco: via accenti e spiriti, sigma finale unificato', () => {
    expect(normalizeGreek('Μηνὶ Ἀξιοττηνῷ')).toBe('μηνι αξιοττηνω');
    expect(normalizeGreek('θεός')).toBe(normalizeGreek('θεόσ'));
  });

  it('greco: due scritture della stessa parola si riconciliano', () => {
    // era il bug DATA-06: ricerca e faccette usavano folding diversi.
    expect(normalizeGreek('ΕΥΧΗΝ')).toBe(normalizeGreek('εὐχήν'));
  });

  it('ascii: assorbe anche le forme di compatibilità, ma non tocca il sigma', () => {
    expect(foldAscii('Axiottēnós')).toBe('axiottenos');
    expect(foldAscii('ς')).toBe('ς');
  });

  it('nessuno dei due esplode sul vuoto', () => {
    expect(normalizeGreek('')).toBe('');
    expect(foldAscii('')).toBe('');
  });
});

describe('numeri scritti in lettere', () => {
  it('riconosce le forme che la ricerca incontra davvero', () => {
    expect(italianWordsToDigits('ventisette')).toBe('27');
    expect(italianWordsToDigits('centoventi')).toBe('120');
  });
  it('lascia stare quello che non è un numero', () => {
    expect(italianWordsToDigits('Axiottenos')).toBeNull();
    expect(italianWordsToDigits('')).toBeNull();
  });
});

describe('secoli', () => {
  it('non esiste l\'anno zero: -50 è il I sec. a.C., 50 il I d.C.', () => {
    expect(centuryLabel(centuryIndex(-50))).toMatch(/I\b.*a\.C\./);
    expect(centuryLabel(centuryIndex(50))).toMatch(/I\b.*d\.C\./);
  });

  it('un intervallo copre tutti i secoli che attraversa', () => {
    expect(getSecoliAttestazione(-30, 120).length).toBeGreaterThanOrEqual(3);
  });

  it('una data sola vale come intervallo puntuale', () => {
    expect(formatSecoliAttestazione(150, 150)).toBe(formatSecoliAttestazione(150, undefined));
  });
});
