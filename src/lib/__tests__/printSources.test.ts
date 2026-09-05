import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PRINT_SOURCES, extractSourceRefs, primarySourceRef, printSource } from '../printSources';

const CORPUS = path.resolve(__dirname, '../../data/corpus');
const schede = fs.readdirSync(CORPUS).filter(f => f.endsWith('.xml') && !f.startsWith('_'));

describe('registro delle fonti a stampa', () => {
  it('non ha id doppi', () => {
    const ids = PRINT_SOURCES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ogni fonte sa citare un numero di catalogo', () => {
    for (const s of PRINT_SOURCES) {
      expect(s.cita('12')).toContain('12');
      expect(s.match.length).toBeGreaterThan(0);
    }
  });

  it('nessun pattern scatta sul vuoto o su testo senza citazioni', () => {
    expect(extractSourceRefs('')).toEqual([]);
    expect(extractSourceRefs('<p>Pietra di marmo blu con foro nella parte superiore.</p>')).toEqual([]);
  });

  it('riconosce le forme che il corpus usa davvero', () => {
    const piena = 'E. Lane, Corpus Monumentorum Religionis Dei Menis (CMRDM). I: The Monuments and Inscriptions, Leiden 1971, n. 29';
    expect(primarySourceRef(piena)).toBe('CMRDM I 29');
    expect(primarySourceRef('CMRDM I nr. 96')).toBe('CMRDM I 96');
    expect(extractSourceRefs('G. Petzl, BWK 5').map(r => r.ref)).toContain('BWK 5');
    expect(extractSourceRefs('MAMA V 12').map(r => r.ref)).toContain('MAMA V 12');
    expect(extractSourceRefs('SEG XIX 815').map(r => r.ref)).toContain('SEG XIX 815');
  });

  it('una scheda che cita più fonti le restituisce tutte, in ordine di registro', () => {
    const tei = 'Leiden 1971, n. 30 … SEG VI 289 … MAMA VII 5';
    const refs = extractSourceRefs(tei);
    expect(refs.map(r => r.sourceId)).toEqual(['cmrdm-i', 'mama', 'seg']);
  });

  it('copre la quasi totalità del corpus reale', () => {
    const con = schede.filter(f => primarySourceRef(fs.readFileSync(path.join(CORPUS, f), 'utf-8')));
    // non è una soglia arbitraria: sotto questa percentuale il registro ha
    // smesso di riconoscere una forma di citazione che il corpus usa.
    expect(con.length / schede.length).toBeGreaterThan(0.95);
  });

  it('la fonte collazionabile dichiara come si riconosce una scheda a stampa', () => {
    const cmrdm = printSource('cmrdm-i')!;
    expect(cmrdm.collazione).toBeDefined();
    expect('29. Ἀγαθῇ Τύχῃ'.match(new RegExp(cmrdm.collazione!.entryStart.source))![1]).toBe('29');
  });
});
