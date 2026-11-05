import { describe, it, expect } from 'vitest';
import { normalizeGreek, foldAscii } from '../textNorm';
import { italianWordsToDigits } from '../italianNumbers';
import { patchTestoDatazione } from '../xmlUtils';
import { dateRangeMatches, centuryIndex, centuryLabel, getSecoliAttestazione, formatSecoliAttestazione } from '../chronology';

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

describe('filtro cronologico', () => {
  it('tiene una datazione larga se tocca il periodo cercato', () => {
    expect(dateRangeMatches(101, 200, [150, 250])).toBe(true);
    expect(dateRangeMatches(-27, 284, [100, 200])).toBe(true);
    expect(dateRangeMatches(-27, 284, [-100, -50])).toBe(false);
    expect(dateRangeMatches(101, 200, [201, 300])).toBe(false);
  });

  it('una sola estremità e le schede senza data', () => {
    expect(dateRangeMatches(150, undefined, [100, 200])).toBe(true);
    expect(dateRangeMatches(undefined, 150, [200, 300])).toBe(false);
    expect(dateRangeMatches(undefined, undefined, [100, 200])).toBe(true);
    expect(dateRangeMatches(0, 0, [100, 200])).toBe(true);
  });
});

describe('testo della datazione nell\'editor', () => {
  it('un secolo nel testo compila Da e A vuoti', () => {
    expect(patchTestoDatazione({ testo: '' }, 'II sec. d.C.'))
      .toEqual({ testo: 'II sec. d.C.', notBeforeCustom: '101', notAfterCustom: '200' });
    expect(patchTestoDatazione({ testo: '' }, 'I sec. a.C.'))
      .toEqual({ testo: 'I sec. a.C.', notBeforeCustom: '-100', notAfterCustom: '-1' });
  });

  it('segue il testo finché Da e A sono quelli ricavati', () => {
    const prev = { testo: 'II sec. d.C.', notBeforeCustom: '101', notAfterCustom: '200' };
    expect(patchTestoDatazione(prev, 'II-III sec. d.C.'))
      .toEqual({ testo: 'II-III sec. d.C.', notBeforeCustom: '101', notAfterCustom: '300' });
    expect(patchTestoDatazione(prev, 'età imperiale'))
      .toEqual({ testo: 'età imperiale', notBeforeCustom: undefined, notAfterCustom: undefined });
  });

  it('non tocca mai valori scritti a mano', () => {
    const prev = { testo: 'II sec. d.C.', notBeforeCustom: '150', notAfterCustom: '175' };
    expect(patchTestoDatazione(prev, 'III sec. d.C.')).toEqual({ testo: 'III sec. d.C.' });
    expect(patchTestoDatazione({ testo: '', notBeforeCustom: '150' }, 'III sec. d.C.')).toEqual({ testo: 'III sec. d.C.' });
  });
});
