import { describe, it, expect } from 'vitest';
import {
  etichettaScheda,
  idDaEtichetta,
  idDaNumero,
  nomeFileScheda,
  numeroInSezione,
  sezioneDaContenuto,
  sezioneDiId,
} from '../sezioni';
import { monumentiToXml, xmlToMonumenti } from '../xmlUtils';
import { Monumento } from '../../types';

describe('sezioni del corpus', () => {
  it('l\'epigrafia conserva l\'etichetta storica', () => {
    expect(etichettaScheda(42)).toBe('ILA-042');
    expect(sezioneDiId(42)).toBe('epigrafia');
    expect(numeroInSezione(42)).toBe(42);
    expect(nomeFileScheda(42)).toBe('ILA-042.xml');
  });

  it('la numismatica ha sigla, numerazione e file propri', () => {
    const id = idDaNumero('numismatica', 7);
    expect(sezioneDiId(id)).toBe('numismatica');
    expect(numeroInSezione(id)).toBe(7);
    expect(etichettaScheda(id)).toBe('ILA-N-007');
    expect(nomeFileScheda(id)).toBe('ILA-N-007.xml');
  });

  it('le due serie non si sovrappongono', () => {
    expect(idDaNumero('epigrafia', 1)).not.toBe(idDaNumero('numismatica', 1));
  });

  it('rilegge le etichette scritte, e le forme abbreviate', () => {
    expect(idDaEtichetta('ILA-042')).toBe(42);
    expect(idDaEtichetta('ila 42')).toBe(42);
    expect(idDaEtichetta('42')).toBe(42);
    expect(idDaEtichetta('ILA-N-007')).toBe(idDaNumero('numismatica', 7));
    expect(idDaEtichetta('n7')).toBe(idDaNumero('numismatica', 7));
    expect(idDaEtichetta('ILA-Z-007')).toBeUndefined();
    expect(idDaEtichetta('')).toBeUndefined();
  });

  it('riconosce la sezione di una scheda che non ha ancora un id', () => {
    expect(sezioneDaContenuto({ tipo: 'stele' })).toBe('epigrafia');
    expect(sezioneDaContenuto({ tipo: 'coin type' })).toBe('numismatica');
    expect(sezioneDaContenuto({ tipo: 'gem' })).toBe('numismatica');
    // Il blocco num: basta da solo: è la prova che la scheda è un tipo monetale.
    expect(sezioneDaContenuto({ tipo: '', numismatica: { metal: { key: 'ae' } } })).toBe('numismatica');
  });
});

describe('la sezione nel round-trip TEI', () => {
  const scheda = (patch: Partial<Monumento>): Monumento => ({
    id: idDaNumero('numismatica', 7),
    titolo: 'Tipo monetale di prova',
    regione: 'Asia Minor',
    citta: 'Saittai',
    tipo: 'coin type',
    materiale: '',
    luogo_rit: '',
    testo: '',
    iscrizione: true,
    anepigr: false,
    data: '',
    ...patch,
  } as Monumento);

  it('scrive l\'etichetta citabile e la rilegge', () => {
    const xml = monumentiToXml([scheda({})]);
    expect(xml).toContain('<idno type="ILA">ILA-N-007</idno>');
    const [riletta] = xmlToMonumenti(xml);
    expect(riletta.id).toBe(idDaNumero('numismatica', 7));
    expect(riletta.sezione).toBe('numismatica');
  });

  it('l\'etichetta non torna indietro come repertorio esterno', () => {
    const xml = monumentiToXml([scheda({})]);
    const [riletta] = xmlToMonumenti(xml);
    expect((riletta.extRefs || []).some(r => r.type.toLowerCase() === 'ila')).toBe(false);
  });

  it('una scheda senza id assegnato prende la sezione dal contenuto', () => {
    const xml = monumentiToXml([scheda({ id: 0 })]);
    const [riletta] = xmlToMonumenti(xml);
    expect(riletta.id).toBe(0);
    expect(riletta.sezione).toBe('numismatica');
  });

  it('le schede epigrafiche restano in epigrafia', () => {
    const xml = monumentiToXml([scheda({ id: 42, tipo: 'stele', numismatica: undefined })]);
    expect(xml).toContain('<idno type="ILA">ILA-042</idno>');
    expect(xmlToMonumenti(xml)[0].sezione).toBe('epigrafia');
  });
});
