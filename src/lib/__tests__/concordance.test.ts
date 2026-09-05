import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildConcordance, ricomponiTesto, formeAttestate, concordanceToCsv } from '../concordance';
import { xmlToMonumenti } from '../xmlUtils';
import { Monumento } from '../../types';

const CORPUS = path.resolve(__dirname, '../../data/corpus');
const corpus: Monumento[] = fs.readdirSync(CORPUS)
  .filter(f => f.endsWith('.xml') && !f.startsWith('_'))
  .map(f => xmlToMonumenti(fs.readFileSync(path.join(CORPUS, f), 'utf-8'))[0]);

const finta = (id: number, testo: string): Monumento => ({ id, testo_searchable: testo } as Monumento);

describe('concordanza', () => {
  it('ricompone le parole spezzate dall\'a-capo', () => {
    expect(ricomponiTesto('ἀ- νέθηκεν τῷ Μη- νί.')).toBe('ἀνέθηκεν τῷ Μηνί.');
  });

  it('trova una parola spezzata su due righe, che la ricerca per riga non vedrebbe', () => {
    const occ = buildConcordance([finta(1, 'Φίλητος ἀ- νέθηκεν τῷ Μη- νί')], 'ἀνέθηκεν');
    expect(occ).toHaveLength(1);
    expect(occ[0].forma).toBe('ἀνέθηκεν');
    expect(occ[0].sinistra.trim()).toBe('Φίλητος');
  });

  it('cerca senza accenti e senza distinzione di maiuscole', () => {
    const occ = buildConcordance([finta(1, 'εὐχὴν ἀνέθηκεν')], 'ΕΥΧΗΝ');
    expect(occ).toHaveLength(1);
    expect(occ[0].forma).toBe('εὐχὴν');   // la forma restituita è quella del testo
  });

  it('parolaIntera esclude le occorrenze dentro un\'altra parola', () => {
    const m = [finta(1, 'θεός θεοσεβής')];
    expect(buildConcordance(m, 'θεος').length).toBe(2);
    expect(buildConcordance(m, 'θεος', { parolaIntera: true }).length).toBe(1);
  });

  it('ignora le query troppo corte', () => {
    expect(buildConcordance([finta(1, 'Μηνί')], 'μ')).toEqual([]);
    expect(buildConcordance([finta(1, 'Μηνί')], '')).toEqual([]);
  });

  it('l\'ordine per contesto destro mette insieme le formule', () => {
    const m = [finta(1, 'Μηνὶ Τυράννῳ εὐχήν'), finta(2, 'Μηνὶ Ἀξιοττηνῷ εὐχήν'), finta(3, 'Μηνὶ Τυράννῳ ἀνέστησεν')];
    const occ = buildConcordance(m, 'Μηνί', { ordine: 'destra' });
    expect(occ.map(o => o.schedaId)).toEqual([2, 3, 1]);   // Ἀξιοττηνῷ, Τυράννῳ ἀ…, Τυράννῳ ε…
  });

  it('aggancia il lemma cultuale quando la forma è nel vocabolario', () => {
    const occ = buildConcordance([finta(1, 'εὐχὴν ἀνέθηκεν')], 'εὐχήν');
    expect(occ[0].lemma).toBe('εὐχή');
  });

  it('sul corpus vero trova la formula più comune in molte schede', () => {
    const occ = buildConcordance(corpus, 'εὐχήν', { parolaIntera: true });
    expect(occ.length).toBeGreaterThan(20);
    expect(new Set(occ.map(o => o.scheda)).size).toBeGreaterThan(20);
    // le forme attestate sono più d'una: è il dato che una lista di schede nasconde
    expect(formeAttestate(occ).length).toBeGreaterThan(1);
  });

  it('il CSV ha una riga per occorrenza più l\'intestazione', () => {
    const occ = buildConcordance([finta(1, 'εὐχὴν εὐχήν')], 'ευχην');
    expect(concordanceToCsv(occ).trim().split('\n')).toHaveLength(3);
  });
});
