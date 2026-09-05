import { describe, it, expect } from 'vitest';
import {
  CULT_LEXICON, CULT_FAMILY_IDS, CULT_LEMMATA,
  lookupCultLemma, matchCultLemma, toolboxForLemma, checkToolboxTable, LEMMA_TOOLBOX,
} from '../cultLexicon';
import { validateToolboxPath, toolboxItem, LARES_TOOLBOX } from '../laresToolbox';

describe('vocabolario cultuale', () => {
  it('non ha lemmi doppi e ogni famiglia è fra le cinque', () => {
    expect(new Set(CULT_LEMMATA).size).toBe(CULT_LEMMATA.length);
    for (const l of CULT_LEXICON) expect(CULT_FAMILY_IDS).toContain(l.family);
  });

  it('ogni lemma ha una sotto-funzione: è il dato che l\'editor non deve scegliere', () => {
    for (const l of CULT_LEXICON) expect(l.subFunction, l.lemma).toBeTruthy();
  });

  it('riconosce le forme flesse, non solo il lemma', () => {
    expect(matchCultLemma('εὐχήν')?.lemma).toBe('εὐχή');
    expect(matchCultLemma('ΕΥΧΗΝ')?.lemma).toBe('εὐχή');       // maiuscole epigrafiche
    expect(matchCultLemma('θρεπτοῦ')?.lemma).toBe('θρεπτός');
    expect(matchCultLemma('κατοικίας')?.lemma).toBe('κατοικία');
  });

  it('non aggancia le forme verbali molto rifatte — ed è dichiarato', () => {
    // L'aoristo con aumento non condivide la radice col lemma: il match per
    // prefisso non ci arriva, e la funzione lo dice nel proprio commento.
    // Il giorno in cui si volesse coprirlo, questo test è il posto dove
    // accorgersene invece che scoprirlo su una scheda marcata male.
    expect(matchCultLemma('ἀνέθηκεν')).toBeUndefined();
  });

  it('non riconosce quello che non è nel vocabolario', () => {
    expect(matchCultLemma('')).toBeUndefined();
    expect(matchCultLemma('Ἀρτεμίδωρος')).toBeUndefined();
  });

  it('lookup è esatto, match è tollerante', () => {
    expect(lookupCultLemma('εὐχή')?.family).toBe('atto-cultuale');
    expect(lookupCultLemma('εὐχήν')).toBeUndefined();
  });
});

describe('merge col toolbox LARES', () => {
  it('la tabella dei percorsi è coerente con la griglia', () => {
    expect(checkToolboxTable()).toEqual([]);
  });

  it('i lemmi senza percorso sono una scelta, non una dimenticanza', () => {
    // χαίρω e χρηστὲ χαῖρε non nominano un agente, un\'attività o uno spazio:
    // dare loro un percorso sarebbe un dato falso (merge-lessico-lares.md §5).
    const senza = CULT_LEMMATA.filter(l => !toolboxForLemma(l));
    expect(senza.length).toBeLessThanOrEqual(CULT_LEMMATA.length - Object.keys(LEMMA_TOOLBOX).length + 1);
    for (const l of senza) expect(lookupCultLemma(l)!.family).toBe('formula-fissa');
  });

  it('la validazione del percorso boccia quello che non esiste', () => {
    expect(validateToolboxPath('activities', ['expiation', 'confession'])).toBeNull();
    expect(validateToolboxPath('activities', [])).toBeNull();
    expect(validateToolboxPath('inventato', [])).toMatch(/inesistente/);
    expect(validateToolboxPath('activities', ['inventata'])).toMatch(/non è una categoria/);
    expect(validateToolboxPath('activities', ['expiation', 'inventata'])).toMatch(/non è una sottocategoria/);
    expect(validateToolboxPath('activities', ['expiation', 'confession', 'troppo'])).toMatch(/tre gradi/);
  });

  it('le voci innestate da ILA sono dichiarate come tali', () => {
    for (const item of LARES_TOOLBOX) {
      for (const cat of item.categorie) {
        if (cat.fonte) expect(cat.aggiunta).toBe(true);
        for (const sub of cat.sub) if (sub.fonte) expect(sub.aggiunta).toBe(true);
      }
    }
    // e nessun id della griglia originale è stato rinominato: sette item, sempre.
    expect(LARES_TOOLBOX.length).toBe(7);
    expect(toolboxItem('human-agents')).toBeDefined();
  });
});
