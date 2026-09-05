import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { xmlToMonumenti, monumentiToXml } from '../xmlUtils';
import { CULT_FAMILY_IDS } from '../cultLexicon';
import { validateToolboxPath } from '../laresToolbox';
import { XMLValidator } from 'fast-xml-parser';

const CORPUS = path.resolve(__dirname, '../../data/corpus');
const file = fs.readdirSync(CORPUS).filter(f => f.endsWith('.xml') && !f.startsWith('_')).sort();
const leggi = (f: string) => fs.readFileSync(path.join(CORPUS, f), 'utf-8');

// Il corpus è la cosa che non si può rompere, ed è l'unica senza rete: questi
// controlli girano su tutti i file veri, non su campioni inventati.
describe('corpus reale', () => {
  const schede = file.map(f => ({ f, m: xmlToMonumenti(leggi(f))[0] }));

  it('ogni file dà esattamente una scheda leggibile', () => {
    for (const { f, m } of schede) {
      expect(m, f).toBeDefined();
      expect(typeof m.id, f).toBe('number');
    }
  });

  it('gli id sono unici', () => {
    const ids = schede.map(s => s.m.id);
    const doppi = ids.filter((x, i) => ids.indexOf(x) !== i);
    expect(doppi, `id ripetuti: ${[...new Set(doppi)].join(', ')}`).toEqual([]);
  });

  it('ogni file è XML ben formato', () => {
    // Controllo vero, non a colpi di regex: un XML malformato in corpus non
    // arriva nemmeno all'interfaccia, e finora nessuno se ne accorgeva prima
    // del boot del server.
    for (const f of file) {
      const esito = XMLValidator.validate(leggi(f));
      expect(esito === true ? true : `${f}: ${JSON.stringify(esito.err)}`, f).toBe(true);
    }
  });

  it('le attestazioni cultuali usano solo famiglie e percorsi esistenti', () => {
    for (const { f, m } of schede) {
      for (const a of m.cultAttestations || []) {
        if (a.family) expect(CULT_FAMILY_IDS as string[], `${f} — ${a.lemma}`).toContain(a.family);
        if (a.toolbox) expect(validateToolboxPath(a.toolbox.item, a.toolbox.subtype), `${f} — ${a.lemma}`).toBeNull();
      }
    }
  });

  it('scrivere e rileggere una scheda non ne cambia i campi principali', () => {
    // round-trip sull'intero corpus: è la garanzia che un salvataggio
    // dall'interfaccia non perda pezzi per strada.
    for (const { f, m } of schede) {
      const rileggo = xmlToMonumenti(monumentiToXml([m]))[0];
      expect(rileggo.id, f).toBe(m.id);
      expect(rileggo.testo_searchable?.length ?? 0, f).toBeGreaterThanOrEqual(Math.floor((m.testo_searchable?.length ?? 0) * 0.98));
      expect((rileggo.epiteti || []).sort(), f).toEqual((m.epiteti || []).sort());
      expect((rileggo.divinita || []).sort(), f).toEqual((m.divinita || []).sort());
    }
  });
});
