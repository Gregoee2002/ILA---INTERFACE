import { describe, it, expect } from 'vitest';
import type { Monumento } from '../../types';
import { REQUISITI, citaSoloPhi, contaRequisiti, esito, mancanzeCsv, mancanzeDi } from '../mancanze';

const base = (extra: Partial<Monumento> = {}): Monumento => ({
  id: 1, regione: 'Lydia', citta: 'Kula', tipo: 'stele', materiale: 'marmo', luogo_rit: '',
  testo: 'Μηνὶ εὐχήν', iscrizione: true, anepigr: false, data: '',
  ...extra,
});
const req = (id: string) => REQUISITI.find(r => r.id === id)!;

describe('mancanze', () => {
  it('le chiavi dei requisiti sono uniche', () => {
    const ids = REQUISITI.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('PHI da solo non vale come edizione di riferimento', () => {
    expect(citaSoloPhi('PHI 260619')).toBe(true);
    expect(citaSoloPhi('Packard Humanities Institute')).toBe(true);
    expect(citaSoloPhi('CMRDM I 47 (= PHI 260619)')).toBe(false);
    expect(citaSoloPhi('E. Lane, CMRDM I, n. 47')).toBe(false);
    const m = base({ edizioneRiferimento: { citazione: 'PHI 260619' } });
    expect(esito(req('edrif'), m)).toBe('ok');
    expect(esito(req('edrif_non_phi'), m)).toBe('manca');
  });

  it('senza edizione di riferimento il controllo su PHI non è pertinente', () => {
    expect(esito(req('edrif_non_phi'), base())).toBe('na');
  });

  it('i ruoli contano solo con il nome compilato', () => {
    const m = base({ responsabili: [{ ruolo: 'encoding', nome: 'G. Gregorio' }, { ruolo: 'revision', nome: ' ' }] });
    expect(esito(req('codifica'), m)).toBe('ok');
    expect(esito(req('revisione'), m)).toBe('manca');
    expect(esito(req('controllo'), m)).toBe('manca');
  });

  it('i segnaposto contano come vuoti', () => {
    const m = base({ traduzioni: [{ lang: 'it', testo: 'DA_COMPILARE', note: '' }] });
    expect(esito(req('trad_it'), m)).toBe('manca');
  });

  it('la traduzione non riguarda gli anepigrafi', () => {
    const m = base({ anepigr: true, iscrizione: false, testo: '' });
    expect(esito(req('trad_it'), m)).toBe('na');
    expect(mancanzeDi(m).map(r => r.id)).not.toContain('trad_it');
  });

  it('contaRequisiti esclude le schede non pertinenti dal totale', () => {
    const conti = contaRequisiti([base(), base({ id: 2, anepigr: true, testo: '' })]);
    const trad = conti.find(c => c.requisito.id === 'trad_it')!;
    expect(trad.tot).toBe(1);
    expect(trad.fatti).toBe(0);
  });

  it('il CSV ha una colonna per requisito e protegge le virgole', () => {
    const csv = mancanzeCsv([base({ titolo: 'Stele, con rilievo' })], () => 'ILA 1');
    const [testa, riga] = csv.trim().split('\n');
    expect(testa.split(',')).toHaveLength(4 + REQUISITI.length + 1);
    expect(riga).toContain('"Stele, con rilievo"');
  });
});
