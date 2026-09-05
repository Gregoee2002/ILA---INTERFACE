import { describe, it, expect } from 'vitest';
import { leggiPermalink, scriviPermalink, idDaEtichetta, etichettaScheda, citazioneScheda, urlScheda } from '../permalink';
import { Monumento } from '../../types';

describe('permalink', () => {
  it('etichetta e id sono l\'una l\'inverso dell\'altro', () => {
    expect(etichettaScheda(42)).toBe('ILA-042');
    expect(idDaEtichetta('ILA-042')).toBe(42);
    expect(idDaEtichetta(etichettaScheda(7))).toBe(7);
  });

  it('accetta le forme che un umano scrive a mano', () => {
    expect(idDaEtichetta('ila-42')).toBe(42);
    expect(idDaEtichetta('042')).toBe(42);
    expect(idDaEtichetta('42')).toBe(42);
    expect(idDaEtichetta('')).toBeUndefined();
    expect(idDaEtichetta('ILA-')).toBeUndefined();
    expect(idDaEtichetta('CMRDM 42')).toBeUndefined();
  });

  it('legge e riscrive lo stesso stato', () => {
    const stato = { vista: 'catalog', scheda: 42 };
    expect(leggiPermalink(scriviPermalink(stato))).toEqual(stato);
  });

  it('la home non sporca l\'indirizzo', () => {
    expect(scriviPermalink({ vista: 'home' })).toBe('');
    expect(scriviPermalink({})).toBe('');
  });

  it('ignora quello che non capisce invece di rompersi', () => {
    expect(leggiPermalink('?scheda=pippo')).toEqual({});
    expect(leggiPermalink('?')).toEqual({});
  });

  it('la citazione porta con sé le fonti a stampa, senza privilegiarne una', () => {
    const m = {
      id: 42,
      fontiStampa: [
        { sourceId: 'cmrdm-i', sigla: 'CMRDM I', numero: '71', ref: 'CMRDM I 71' },
        { sourceId: 'seg', sigla: 'SEG', numero: 'XIX 815', ref: 'SEG XIX 815' },
      ],
    } as Monumento;
    const c = citazioneScheda(m, new Date(2026, 8, 5), 'https://esempio.it/ila/');
    expect(c).toContain('ILA-042');
    expect(c).toContain('(= CMRDM I 71 = SEG XIX 815)');
    expect(c).toContain('5 settembre 2026');
    expect(c).toContain('https://esempio.it/ila/?vista=catalog&scheda=ILA-042');
  });

  it('una scheda senza fonti riconosciute si cita lo stesso', () => {
    const c = citazioneScheda({ id: 3 } as Monumento, new Date(2026, 0, 1), 'https://esempio.it/');
    expect(c).toContain('ILA-003');
    expect(c).not.toContain('(=');
  });

  it('l\'url della scheda è quello che il permalink sa rileggere', () => {
    const url = urlScheda(9, 'https://esempio.it/');
    expect(leggiPermalink(url.slice(url.indexOf('?')))).toEqual({ vista: 'catalog', scheda: 9 });
  });
});
