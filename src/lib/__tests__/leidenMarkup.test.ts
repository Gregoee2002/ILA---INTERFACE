import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseEdition, serializeEdition, tokenize, serializeTokens, collectLbs,
  escapeText, validateEditionTokens, MarkupToken,
} from '../leidenMarkup';

const CORPUS = path.resolve(__dirname, '../../data/corpus');
const edizioneDi = (xml: string) => {
  const m = xml.match(/<div\s+type="edition"[^>]*>([\s\S]*?)(?=<div\s+type="(?:apparatus|translation|commentary|bibliography)"|<\/body>)/);
  return m ? m[1] : '';
};

describe('parse e serializzazione dell\'edizione', () => {
  it('il testo semplice legacy diventa un lb per riga', () => {
    const t = parseEdition('prima riga\nseconda riga');
    expect(collectLbs(t).map(l => l.n)).toEqual([1, 2]);
  });

  it('un\'edizione vuota ha comunque la riga 1', () => {
    expect(collectLbs(parseEdition('')).map(l => l.n)).toEqual([1]);
  });

  it('la numerazione delle righe si ricalcola alla serializzazione', () => {
    // righe numerate a caso: la serializzazione le rimette in ordine
    const tokens: MarkupToken[] = [
      { kind: 'el', name: 'lb', attrs: { n: '7' }, children: [], selfClosing: true },
      { kind: 'text', value: 'Μηνὶ' },
      { kind: 'el', name: 'lb', attrs: { n: '3' }, children: [], selfClosing: true },
      { kind: 'text', value: 'εὐχήν' },
    ];
    const xml = serializeEdition(tokens);
    expect(xml).toContain('<lb n="1"/>');
    expect(xml).toContain('<lb n="2"/>');
    expect(xml).not.toContain('n="7"');
  });

  it('serializzare non modifica i token in ingresso', () => {
    const tokens = parseEdition('<ab><lb n="4"/>Μηνί</ab>');
    const prima = JSON.stringify(tokens);
    serializeEdition(tokens);
    expect(JSON.stringify(tokens)).toBe(prima);
  });

  it('gli entity restano entity: & e < non tornano mai crudi', () => {
    expect(escapeText('Men & Selene <lb>')).toBe('Men &amp; Selene &lt;lb&gt;');
    const xml = serializeEdition([{ kind: 'text', value: 'a & b' }] as MarkupToken[]);
    expect(xml).toContain('a &amp; b');
    expect(xml).not.toMatch(/[^;]& /);
  });

  it('tokenize e serializeTokens sono l\'una l\'inversa dell\'altra', () => {
    const xml = '<w lemma="εὐχή" ana="#atto-cultuale">εὐχήν</w> <supplied reason="lost">τι</supplied>';
    expect(serializeTokens(tokenize(xml))).toBe(xml);
  });

  it('sopravvive al giro completo su tutte le edizioni del corpus', () => {
    // Il round-trip non deve perdere elementi: è la garanzia che aprire una
    // scheda nell'editor e salvarla senza toccare nulla non la cambi.
    const file = fs.readdirSync(CORPUS).filter(f => f.endsWith('.xml') && !f.startsWith('_'));
    let confrontate = 0;
    const fuoriModello: string[] = [];
    for (const f of file) {
      const ed = edizioneDi(fs.readFileSync(path.join(CORPUS, f), 'utf-8'));
      if (!ed.includes('<')) continue;
      // Un'edizione in più <ab> (div type="textpart": fronte/retro, blocchi
      // distinti) il modello a flusso unico non la sa rappresentare, e
      // l'editor lo sa già — EditionMarkupEditor la intercetta con
      // safeParseEdition e mostra un avviso invece di crollare. Qui la
      // teniamo fuori dal giro e la contiamo: se il numero cresce, vuol dire
      // che si stanno marcando nuove schede in un modo che l'editor non apre.
      // Oggi sono quattro: ILA-219, ILA-236, ILA-254, ILA-286.
      if ((ed.match(/<ab\b/g) || []).length > 1) { fuoriModello.push(f); continue; }
      const uno = serializeEdition(parseEdition(ed));
      const due = serializeEdition(parseEdition(uno));
      expect(due, f).toBe(uno);                       // idempotenza
      const conta = (s: string, tag: string) => (s.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
      for (const tag of ['w', 'persName', 'rs', 'supplied', 'gap', 'expan', 'num', 'lb']) {
        expect(conta(uno, tag), `${f} — <${tag}>`).toBe(conta(ed, tag));
      }
      confrontate++;
    }
    expect(confrontate).toBeGreaterThan(200);
    expect(fuoriModello.length, `edizioni in più <ab>: ${fuoriModello.join(', ')}`).toBeLessThanOrEqual(4);
  });
});

describe('validazione dell\'edizione', () => {
  const validaXml = (xml: string) => validateEditionTokens(parseEdition(`<ab>${xml}</ab>`));
  const messaggi = (xml: string) => validaXml(xml).map(i => i.message).join(' | ');

  it('un\'edizione pulita non produce rilievi sul lessico', () => {
    const out = messaggi('<lb n="1"/><w lemma="εὐχή" ana="#atto-cultuale" type="activities" subtype="prayers vow">εὐχήν</w>');
    expect(out).not.toMatch(/LARES|percorso/i);
  });

  it('avvisa se il percorso LARES non esiste nella griglia', () => {
    expect(messaggi('<lb n="1"/><w lemma="εὐχή" ana="#atto-cultuale" type="activities" subtype="inventata">εὐχήν</w>'))
      .toMatch(/Percorso LARES non valido/);
  });

  it('avvisa se il percorso scritto a mano contraddice il lemma', () => {
    expect(messaggi('<lb n="1"/><w lemma="εὐχή" ana="#atto-cultuale" type="spaces" subtype="constructions public">εὐχήν</w>'))
      .toMatch(/di norma è/);
  });

  it('avvisa su @subtype senza @type', () => {
    expect(messaggi('<lb n="1"/><w lemma="εὐχή" ana="#atto-cultuale" subtype="prayers vow">εὐχήν</w>'))
      .toMatch(/parte sempre dall'item/);
  });

  it('avvisa su un <w> cultuale annidato in persName: gli epiteti stanno altrove', () => {
    expect(messaggi('<lb n="1"/><persName><w lemma="ἐπήκοος" ana="#agency">ἐπηκόῳ</w></persName>'))
      .toMatch(/quasi sempre un errore/);
  });
});
