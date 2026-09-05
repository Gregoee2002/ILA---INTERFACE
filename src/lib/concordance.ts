/* ------------------------------------------------------------------
 *  concordance.ts — occorrenze in contesto (KWIC)
 * ------------------------------------------------------------------
 *  La ricerca del catalogo risponde con **schede**. Chi lavora sul testo ha
 *  bisogno dell'altra domanda: dove ricorre questa parola, e con che cosa
 *  intorno. Questa è la concordanza: forma al centro, contesto a destra e a
 *  sinistra, ordinabile per contesto — perché è ordinando per contesto destro
 *  che si vedono le formule.
 *
 *  Il testo di partenza è `testo_searchable` (edizione senza tag, con le
 *  parentesi di lacuna già risolte): qui si ricongiungono le parole spezzate
 *  dall'a-capo, così ἀ- νέθηκεν torna una parola sola e diventa cercabile.
 *
 *  Il confronto passa da `normalizeGreek` — lo stesso folding della ricerca e
 *  degli indici — quindi cercare «ευχην» trova «εὐχήν», e cercare in
 *  maiuscole epigrafiche trova la forma accentata.
 *
 *  Dipende solo da textNorm e cultLexicon. Nessun accesso alla rete.
 * ------------------------------------------------------------------
 */

import { Monumento } from '../types';
import { normalizeGreek } from './textNorm';
import { matchCultLemma } from './cultLexicon';

export interface Occorrenza {
  /** id numerico della scheda, per riaprirla nel catalogo. */
  schedaId: number;
  /** etichetta stabile, es. «ILA-042». */
  scheda: string;
  /** contesto sinistro, così com'è nel testo (con accenti). */
  sinistra: string;
  /** la forma attestata. */
  forma: string;
  /** contesto destro. */
  destra: string;
  /** lemma del vocabolario cultuale, se la forma ci si aggancia. */
  lemma?: string;
  regione?: string;
  citta?: string;
  /** chiave d'ordinamento per il contesto destro, normalizzata. */
  destraKey: string;
  sinistraKey: string;
}

export type OrdineConcordanza = 'scheda' | 'destra' | 'sinistra' | 'forma';

export interface OpzioniConcordanza {
  /** caratteri di contesto per lato. */
  contesto?: number;
  /** true = la forma cercata deve essere una parola intera. */
  parolaIntera?: boolean;
  ordine?: OrdineConcordanza;
  /** tetto ai risultati, per non far esplodere il rendering. */
  massimo?: number;
}

/**
 * Ricongiunge le parole spezzate dall'a-capo e normalizza gli spazi.
 * `ἀ- νέθηκεν` → `ἀνέθηκεν`. Il trattino a fine parola è di sillabazione
 * epigrafica, non un segno del testo: toglierlo è la sola cosa che rende una
 * concordanza utilizzabile.
 */
export function ricomponiTesto(s: string): string {
  return (s || '')
    .replace(/(\S)-\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const LETTERA = /[\p{L}]/u;

/**
 * Indice → indice: mappa ogni posizione del testo normalizzato su quella
 * originale, così la forma restituita è quella del testo (con accenti) anche
 * se il confronto avviene sul normalizzato.
 *
 * Gli spazi vanno tenuti a mano: `normalizeGreek` fa `trim()`, quindi su un
 * carattere singolo di spazio restituisce la stringa vuota. Normalizzare
 * carattere per carattere senza questa cautela incollerebbe le parole fra
 * loro, e con esse morirebbe ogni nozione di confine di parola.
 */
function normalizzaConMappa(testo: string): { norm: string; mappa: number[] } {
  let norm = '';
  const mappa: number[] = [];
  for (let i = 0; i < testo.length; i++) {
    const ch = testo[i];
    const n = /\s/.test(ch) ? ' ' : normalizeGreek(ch);
    for (const c of n) { norm += c; mappa.push(i); }
  }
  return { norm, mappa };
}

/**
 * Tutte le occorrenze di `query` nel corpus, in contesto.
 * Una query vuota o di un carattere solo restituisce nulla: sotto le due
 * lettere il rumore supera l'informazione.
 */
export function buildConcordance(
  monumenti: Monumento[],
  query: string,
  opts: OpzioniConcordanza = {},
): Occorrenza[] {
  const { contesto = 40, parolaIntera = false, ordine = 'scheda', massimo = 2000 } = opts;
  const q = normalizeGreek(ricomponiTesto(query));
  if (q.length < 2) return [];

  const out: Occorrenza[] = [];
  for (const m of monumenti) {
    const testo = ricomponiTesto(m.testo_searchable || '');
    if (!testo) continue;
    const { norm, mappa } = normalizzaConMappa(testo);

    let da = 0;
    while (out.length < massimo) {
      const i = norm.indexOf(q, da);
      if (i < 0) break;
      da = i + 1;

      if (parolaIntera) {
        const prima = norm[i - 1], dopo = norm[i + q.length];
        if ((prima && LETTERA.test(prima)) || (dopo && LETTERA.test(dopo))) continue;
      }

      const inizio = mappa[i];
      const fine = (mappa[i + q.length - 1] ?? inizio) + 1;
      const sinistra = testo.slice(Math.max(0, inizio - contesto), inizio);
      const forma = testo.slice(inizio, fine);
      const destra = testo.slice(fine, fine + contesto);
      const lemma = matchCultLemma(forma)?.lemma;

      out.push({
        schedaId: m.id,
        scheda: `ILA-${String(m.id).padStart(3, '0')}`,
        sinistra, forma, destra,
        ...(lemma ? { lemma } : {}),
        regione: m.regione,
        citta: m.citta,
        destraKey: normalizeGreek(destra),
        // per l'ordine a sinistra conta la parola *più vicina* alla forma:
        // si legge da destra verso sinistra, quindi la chiave va rovesciata.
        sinistraKey: [...normalizeGreek(sinistra)].reverse().join(''),
      });
    }
  }

  const cmp: Record<OrdineConcordanza, (a: Occorrenza, b: Occorrenza) => number> = {
    scheda: (a, b) => a.schedaId - b.schedaId,
    destra: (a, b) => a.destraKey.localeCompare(b.destraKey, 'el') || a.schedaId - b.schedaId,
    sinistra: (a, b) => a.sinistraKey.localeCompare(b.sinistraKey, 'el') || a.schedaId - b.schedaId,
    forma: (a, b) => normalizeGreek(a.forma).localeCompare(normalizeGreek(b.forma), 'el') || a.schedaId - b.schedaId,
  };
  return out.sort(cmp[ordine]);
}

/** Le forme diverse sotto cui la query compare, con quante volte ciascuna. */
export function formeAttestate(occ: Occorrenza[]): { forma: string; n: number }[] {
  const conta = new Map<string, number>();
  for (const o of occ) conta.set(o.forma, (conta.get(o.forma) || 0) + 1);
  return [...conta.entries()].map(([forma, n]) => ({ forma, n })).sort((a, b) => b.n - a.n || a.forma.localeCompare(b.forma, 'el'));
}

/** Riga CSV per l'esportazione, colonne nell'ordine in cui si legge una concordanza. */
export function concordanceToCsv(occ: Occorrenza[]): string {
  const q = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
  const righe = ['scheda,sinistra,forma,destra,lemma,regione,citta'];
  for (const o of occ) {
    righe.push([o.scheda, q(o.sinistra), q(o.forma), q(o.destra), q(o.lemma || ''), q(o.regione || ''), q(o.citta || '')].join(','));
  }
  return righe.join('\n') + '\n';
}
