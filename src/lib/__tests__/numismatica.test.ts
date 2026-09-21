import { describe, it, expect } from 'vitest';
import { XMLValidator } from 'fast-xml-parser';
import { xmlToMonumenti, monumentiToXml, renderXenoData, renderEditionFaces } from '../xmlUtils';
import { formatMisura, nomismaRef, numLabel, metalSigla } from '../numismaticVocab';
import type { Monumento } from '../../types';

const base = (): Monumento => ({
  id: 1, regione: 'Bithynia', citta: 'Juliopolis', tipo: 'coin type',
  materiale: '', luogo_rit: '', testo: '', iscrizione: true, anepigr: false, data: '',
} as Monumento);

const tipoMonetale = (): Monumento => ({
  ...base(),
  numismatica: {
    mint: { key: 'saitta', label: 'Saittai', ref: 'http://nomisma.org/id/saitta' },
    authority: { key: 'Caracalla' },
    metal: { key: 'ae', label: 'bronzo', ref: 'http://nomisma.org/id/ae' },
    denomination: { key: 'assarion', label: 'assarion', cert: 'low', resp: '#RPC' },
    weight: { unit: 'g', atLeast: '12.03', atMost: '14.42' },
    specimens: [
      { weight: { unit: 'g', value: '14.42' }, collection: 'Paris', illustrated: true },
      { weight: { unit: 'g', value: '12.03' }, axis: '6', collection: 'Vienna' },
    ],
    reference: { corpus: 'CMRDM II', n: 'Juliopolis 9' },
  },
  iconografia: {
    figures: [
      { n: 1, type: 'emperor', key: 'Caracalla', dir: 'right', side: 'obv', traits: [{ type: 'portrait', key: 'laureate_head' }] },
      { n: 1, type: 'deity', key: 'Men', dir: 'left', side: 'rev', traits: [{ type: 'held_object', key: 'patera', hand: 'right' }] },
      { n: 2, type: 'symbol', key: 'altar', rel: 'below', relTo: 1, side: 'rev', traits: [] },
    ],
    sideNotes: { obv: 'Bust of Caracalla, r., laureate', rev: 'Men standing l. with patera over altar' },
  },
});

const giroCompleto = (m: Monumento) => xmlToMonumenti(monumentiToXml([m]))[0];

describe('numismatica: round-trip XML', () => {
  it('il giro scheda → XML → scheda non perde nulla', () => {
    const m = tipoMonetale();
    const back = giroCompleto(m);
    expect(back.numismatica).toEqual(m.numismatica);
    expect(back.iconografia?.figures).toEqual(m.iconografia?.figures);
    expect(back.iconografia?.sideNotes).toEqual(m.iconografia?.sideNotes);
  });

  it('produce XML ben formato', () => {
    expect(XMLValidator.validate(monumentiToXml([tipoMonetale()]))).toBe(true);
  });

  it('i due blocchi stanno in un solo <xenoData>, numismatica prima', () => {
    const xml = renderXenoData(tipoMonetale(), '')!;
    expect(xml.match(/<xenoData>/g)).toHaveLength(1);
    expect(xml.indexOf('num:numismatics')).toBeLessThan(xml.indexOf('ica:iconography'));
  });

  it('le misure del tipo non finiscono confuse con quelle degli esemplari', () => {
    // Il tipo porta un intervallo, gli esemplari valori puntuali: è la
    // distinzione che regge tutta la sezione (piano §4).
    const back = giroCompleto(tipoMonetale());
    expect(back.numismatica?.weight).toEqual({ unit: 'g', atLeast: '12.03', atMost: '14.42' });
    expect(back.numismatica?.weight?.value).toBeUndefined();
    expect(back.numismatica?.specimens?.[0].weight?.value).toBe('14.42');
  });

  it('il nominale conserva certezza e responsabilità', () => {
    const back = giroCompleto(tipoMonetale());
    expect(back.numismatica?.denomination?.cert).toBe('low');
    expect(back.numismatica?.denomination?.resp).toBe('#RPC');
  });
});

describe('numismatica: nessuna regressione sull\'epigrafia', () => {
  it('una scheda senza dati numismatici non guadagna un blocco num:', () => {
    const m = { ...base(), iconografia: { figures: [{ n: 1, type: 'deity', key: 'Men', traits: [] }] } } as Monumento;
    const xml = monumentiToXml([m]);
    expect(xml).not.toContain('num:numismatics');
    expect(xml).toContain('ica:iconography');
    expect(giroCompleto(m).numismatica).toBeUndefined();
  });

  it('le figure senza faccia non vengono raggruppate in <ica:side>', () => {
    const m = { ...base(), iconografia: { figures: [{ n: 1, type: 'deity', key: 'Men', place: 'top_centre', traits: [] }] } } as Monumento;
    expect(monumentiToXml([m])).not.toContain('ica:side');
    expect(giroCompleto(m).iconografia?.figures[0].place).toBe('top_centre');
  });
});

describe('facce dell\'edizione (N4)', () => {
  const conFacce = (): Monumento => ({
    ...base(),
    testo: renderEditionFaces([
      { n: 'obv', testo: '<lb n="1"/>Αὐτ. Κ. Ἀντωνῖνος Αὐγ.', lang: 'grc', anepigr: false },
      { n: 'rev', testo: '', lang: 'grc', anepigr: true },
    ]),
    traduzioni: [
      { lang: 'it', testo: 'Imperatore Antonino Augusto', note: '', face: 'obv' },
      { lang: 'en', testo: 'Emperor Antoninus Augustus', note: '', face: 'obv' },
    ],
  } as Monumento);

  it('legge le due facce dall\'edizione', () => {
    const back = giroCompleto(conFacce());
    expect(back.facce?.map(f => f.n)).toEqual(['obv', 'rev']);
    expect(back.facce?.[0].testo).toContain('Ἀντωνῖνος');
    expect(back.facce?.[0].lang).toBe('grc');
  });

  it('riconosce la faccia muta e non le inventa un testo', () => {
    const back = giroCompleto(conFacce());
    expect(back.facce?.[1].anepigr).toBe(true);
    expect(back.facce?.[1].testo).toBe('<space unit="side"/>');
    expect(monumentiToXml([conFacce()])).not.toContain('<ab></ab>');
  });

  it('è anepigrafe solo se lo sono tutte le facce', () => {
    const back = giroCompleto(conFacce());
    expect(back.anepigr).toBe(false);
    const mute = {
      ...base(),
      testo: renderEditionFaces([
        { n: 'obv', testo: '', anepigr: true },
        { n: 'rev', testo: '', anepigr: true },
      ]),
    } as Monumento;
    expect(giroCompleto(mute).anepigr).toBe(true);
  });

  it('le traduzioni per faccia sopravvivono al giro, raggruppate per lingua', () => {
    const xml = monumentiToXml([conFacce()]);
    expect(xml.match(/<div type="translation"/g)).toHaveLength(2); // it, en
    const back = giroCompleto(conFacce());
    expect(back.traduzioni?.map(t => [t.lang, t.face])).toEqual([['it', 'obv'], ['en', 'obv']]);
  });

  it('una scheda a una faccia sola non guadagna né facce né textpart', () => {
    const m = { ...base(), testo: 'Μηνὶ Τυράννῳ' } as Monumento;
    expect(monumentiToXml([m])).not.toContain('subtype="face"');
    expect(giroCompleto(m).facce).toBeUndefined();
  });
});

describe('facsimile per faccia (N5)', () => {
  const conImmagini = (): Monumento => ({
    ...base(),
    facsimili: [
      { url: 'https://rpc.ashmus.ox.ac.uk/obv/297414', desc: 'Dritto', surface: 'obv' },
      { url: 'https://rpc.ashmus.ox.ac.uk/rev/297414', desc: 'Rovescio', surface: 'rev' },
      { url: 'https://example.org/tav.jpg', desc: 'Tav. I' },
    ],
  } as Monumento);

  it('scrive i <surface> nell\'ordine dritto-rovescio e li rilegge', () => {
    const xml = monumentiToXml([conImmagini()]);
    expect(xml.indexOf('type="obverse"')).toBeLessThan(xml.indexOf('type="reverse"'));
    expect(giroCompleto(conImmagini()).facsimili).toEqual(conImmagini().facsimili);
  });

  it('le immagini senza faccia restano fuori da ogni <surface>', () => {
    const back = giroCompleto(conImmagini());
    expect(back.facsimili?.[2]).toEqual({ url: 'https://example.org/tav.jpg', desc: 'Tav. I', surface: undefined });
  });

  it('i campi singoli restano il riflesso della prima immagine', () => {
    const back = giroCompleto(conImmagini());
    expect(back.facsimile_url).toBe('https://rpc.ashmus.ox.ac.uk/obv/297414');
    expect(back.facsimile_desc).toBe('Dritto');
  });

  it('una scheda con i soli campi singoli continua a serializzarsi come prima', () => {
    const m = { ...base(), facsimile_url: 'https://example.org/a.jpg', facsimile_desc: 'Tav. II' } as Monumento;
    const xml = monumentiToXml([m]);
    expect(xml).toContain('<graphic url="https://example.org/a.jpg">');
    expect(xml).not.toContain('<surface');
    expect(giroCompleto(m).facsimile_desc).toBe('Tav. II');
  });
});

describe('numismatica: vocabolario', () => {
  it('risolve gli id Nomisma verificati', () => {
    expect(nomismaRef('metal', 'ae')).toBe('http://nomisma.org/id/ae');
    expect(nomismaRef('denomination', 'drachma')).toBe('http://nomisma.org/id/drachma');
  });

  it('non inventa un id per i concetti che Nomisma non ha', () => {
    // Verificati assenti sull'endpoint il 2026-09-21: sono i due casi in cui
    // il progetto resta l'unica identificazione disponibile.
    expect(nomismaRef('denomination', 'assarion')).toBeUndefined();
    expect(nomismaRef('metal', 'electrum')).toBeUndefined();
  });

  it('rende i termini in italiano e conosce le sigle da catalogo', () => {
    expect(numLabel('metal', 'ae')).toBe('bronzo');
    expect(numLabel('metal', 'ignoto')).toBe('ignoto');
    expect(numLabel('metal', 'ae', 'rame')).toBe('rame');
    expect(metalSigla('ar')).toBe('AR');
  });

  it('formatta misure singole e intervalli con la virgola decimale', () => {
    expect(formatMisura({ unit: 'g', value: '6.84' })).toBe('6,84 g');
    expect(formatMisura({ unit: 'g', atLeast: '6.1', atMost: '7.4' })).toBe('6,1–7,4 g');
    expect(formatMisura({ unit: 'mm', atLeast: '24' })).toBe('da 24 mm');
    expect(formatMisura(undefined)).toBeUndefined();
  });
});
