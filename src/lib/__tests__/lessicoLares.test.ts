import { describe, it, expect } from 'vitest';
import {
  buildLessicoLares, validateOverlay, EMPTY_OVERLAY, SEED_SOTTOFUNZIONI,
  LessicoLaresOverlay,
} from '../lessicoLaresOverlay';
import { CULT_LEXICON, CULT_FAMILIES, LEMMA_TOOLBOX } from '../cultLexicon';

const overlay = (p: Partial<LessicoLaresOverlay>): LessicoLaresOverlay => ({
  ...EMPTY_OVERLAY, ...p, updatedAt: '2026-09-10',
});

describe('buildLessicoLares — senza overlay = seed', () => {
  const v = buildLessicoLares();

  it('stesse famiglie del seed', () => {
    expect(v.families.map(f => f.id)).toEqual(CULT_FAMILIES.map(f => f.id));
  });

  it('stessi lemmi del seed, coi percorsi del seed', () => {
    expect(v.lemmi.length).toBe(CULT_LEXICON.length);
    for (const l of v.lemmi) {
      const seed = CULT_LEXICON.find(x => x.lemma === l.lemma)!;
      expect(l.family).toBe(seed.family);
      expect(l.subFunction).toBe(seed.subFunction);
      const seedPath = LEMMA_TOOLBOX[l.lemma];
      expect(l.percorso).toEqual(seedPath ?? undefined);
    }
  });

  it('sotto-funzioni = elenco chiuso estratto dal seed', () => {
    expect(v.subFunctions.map(s => s.id)).toEqual(SEED_SOTTOFUNZIONI);
  });

  it('ogni famiglia ha un default concettuale', () => {
    for (const f of v.families) expect(v.defaultConcettuale[f.id]).toBeDefined();
  });

  it('validateOverlay(vuoto) non trova errori', () => {
    expect(validateOverlay(EMPTY_OVERLAY)).toEqual([]);
  });
});

describe('buildLessicoLares — overlay applicato', () => {
  it('corregge label e regola di una famiglia del seed', () => {
    const v = buildLessicoLares(overlay({ famiglie: [{ id: 'colpa', label: 'Colpa (rivisto)' }] }));
    expect(v.families.find(f => f.id === 'colpa')!.label).toBe('Colpa (rivisto)');
  });

  it('aggiunge un lemma nuovo col suo percorso', () => {
    const v = buildLessicoLares(overlay({
      lemmi: [{
        lemma: 'ἀσεβέω', _new: true, family: 'colpa', subFunction: 'empieta',
        percorso: { item: 'activities', subtype: ['transgression', 'impiety'] },
      }],
      sottofunzioni: [{ id: 'empieta', label: 'empietà' }],
    }));
    const nl = v.lookupLemma('ἀσεβέω');
    expect(nl?.family).toBe('colpa');
    expect(nl?.percorso).toEqual({ item: 'activities', subtype: ['transgression', 'impiety'] });
  });

  it('gli alias risolvono al lemma controllato', () => {
    const v = buildLessicoLares(overlay({
      lemmi: [{ lemma: 'ἁμαρτάνω', aliases: ['προσαμαρτάνω'] }],
    }));
    expect(v.lookupLemma('προσαμαρτάνω')?.lemma).toBe('ἁμαρτάνω');
  });

  it('innesta una sottocategoria nel toolbox', () => {
    const v = buildLessicoLares(overlay({
      toolbox: [{ path: 'spaces/places/underground', _new: true, label: 'sotterraneo', en: 'Underground', fonte: 'ILA' }],
    }));
    expect(v.validateToolboxPath('spaces', ['places', 'underground'])).toBeNull();
    expect(v.toolboxLabel({ item: 'spaces', subtype: ['places', 'underground'] })).toMatch(/sotterraneo/);
  });

  it('percorso: null = senza percorso', () => {
    const v = buildLessicoLares(overlay({ lemmi: [{ lemma: 'εὐχή', percorso: null }] }));
    expect(v.toolboxForLemma('εὐχή')).toBeUndefined();
  });
});

describe('validateOverlay — integrità', () => {
  it('boccia _new su un id del seed', () => {
    const errs = validateOverlay(overlay({ famiglie: [{ id: 'agency', _new: true }] }));
    expect(errs.join(' ')).toMatch(/_new su un id del seed/);
  });

  it('boccia un lemma con famiglia inesistente', () => {
    const errs = validateOverlay(overlay({ lemmi: [{ lemma: 'εὐχή', family: 'fantasma' }] }));
    expect(errs.join(' ')).toMatch(/famiglia «fantasma»/);
  });

  it('boccia un percorso lemma inesistente nella griglia', () => {
    const errs = validateOverlay(overlay({
      lemmi: [{ lemma: 'εὐχή', percorso: { item: 'activities', subtype: ['inventato'] } }],
    }));
    expect(errs.length).toBeGreaterThan(0);
  });

  it('boccia un innesto toolbox di primo grado (nuovo item)', () => {
    const errs = validateOverlay(overlay({
      toolbox: [{ path: 'ottavo-item', _new: true, fonte: 'ILA' }],
    }));
    expect(errs.join(' ')).toMatch(/mai un item|item radice inesistente/);
  });

  it('boccia un innesto senza fonte', () => {
    const errs = validateOverlay(overlay({
      toolbox: [{ path: 'spaces/places/x', _new: true, label: 'x' }],
    }));
    expect(errs.join(' ')).toMatch(/senza «fonte»/);
  });

  it('boccia una sotto-funzione fuori elenco', () => {
    const errs = validateOverlay(overlay({ lemmi: [{ lemma: 'εὐχή', subFunction: 'mai-vista' }] }));
    expect(errs.join(' ')).toMatch(/sotto-funzione «mai-vista»/);
  });
});
