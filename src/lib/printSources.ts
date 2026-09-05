/* ------------------------------------------------------------------
 *  printSources.ts — le fonti a stampa del progetto, in un registro solo
 * ------------------------------------------------------------------
 *  ILA non è la digitalizzazione di un libro. Il corpus nasce da molte
 *  edizioni — CMRDM I di Lane è la più citata (492 voci di bibliografia su
 *  295 schede), ma accanto ci sono MAMA, TAM, SEG, le Beichtinschriften di
 *  Petzl, IG, CIG, CIL, i «Berytus» di Lane, i corpora locali. Prima di
 *  questo file il codice conosceva una fonte sola: `xmlUtils` ricostruiva a
 *  mano la stringa «Lane, CMRDM I NN» e la attaccava a ogni attestazione
 *  cultuale, e nient'altro veniva riconosciuto.
 *
 *  Qui le fonti stanno tutte sullo stesso piano. Ognuna sa:
 *    - come si cita (`sigla`, `cita(n)`);
 *    - come si riconosce il proprio numero di catalogo dentro la
 *      bibliografia di una scheda (`match`);
 *    - se ne esiste una scansione collazionabile (`collazione`), usata da
 *      `scripts/collate-source.ts`.
 *
 *  L'ordine dell'array è l'ordine di preferenza quando una scheda cita più
 *  fonti e serve indicarne una sola (`primarySourceRef`): non è un giudizio
 *  di valore, è la scelta del riferimento più stabile per il lettore.
 *
 *  Nessuna dipendenza. Node + browser.
 * ------------------------------------------------------------------
 */

export interface CollationConfig {
  /** nome del file atteso nella cartella delle scansioni (vedi lo script). */
  pdf: string;
  /**
   * Come si riconosce l'inizio di una scheda nel testo estratto con
   * `pdftotext -layout`. Il gruppo 1 è il numero di catalogo.
   */
  entryStart: RegExp;
  /** Note di lettura: colonne, vacat, rientri, cose che l'estrazione sbaglia. */
  note?: string;
}

export interface PrintSource {
  /** id stabile, usato negli script e nei rapporti. */
  id: string;
  /** sigla con cui la fonte si cita in breve. */
  sigla: string;
  /** forma estesa, per le intestazioni. */
  titolo: string;
  autore?: string;
  anno?: string;
  /**
   * Riconoscono il riferimento della fonte nella bibliografia di una scheda.
   * Il gruppo 1, se c'è, è il numero di catalogo.
   */
  match: RegExp[];
  /** Riferimento breve dato il numero di catalogo. */
  cita: (n: string) => string;
  /** Presente solo per le fonti di cui abbiamo una scansione da collazionare. */
  collazione?: CollationConfig;
}

export const PRINT_SOURCES: PrintSource[] = [
  {
    id: 'cmrdm-i',
    sigla: 'CMRDM I',
    autore: 'E. N. Lane',
    titolo: 'Corpus Monumentorum Religionis Dei Menis. I: The Monuments and Inscriptions',
    anno: '1971',
    match: [
      // la forma piena come sta nel corpus: «…Leiden 1971, n. 29»
      /Leiden\s+1971,?\s*n[or]?\.?\s*(\d+)/i,
      // le forme brevi: «CMRDM I 29», «CMRDM I nr. 29»
      /CMRDM(?:\)?\.?)?\s*I\b[^<]{0,60}?\bn[or]?\.?\s*(\d+)/i,
      /CMRDM\s*I\s+(\d+)\b/i,
    ],
    cita: n => `CMRDM I ${n}`,
    collazione: {
      pdf: 'CMRDM-I.pdf',
      entryStart: /^\s*(\d{1,3})\.\s/,
      note: 'Il livello di testo del PDF non mappa il font greco in Unicode: `pdftotext` da solo restituisce mojibake. Passare prima da `scripts/ocr-print-source.py`, che ritaglia i blocchi greci e li legge con Tesseract `grc`, e collazionare il .ocr.txt che ne esce.',
    },
  },
  {
    id: 'lane-berytus-1964',
    sigla: 'Lane, Berytus 15',
    autore: 'E. N. Lane',
    titolo: 'A re-study of the god Men. I. The epigraphic and sculptural evidence',
    anno: '1964',
    match: [/«?Berytus»?\s*15\s*\(1964\)[^<]{0,60}?\bn[or]?\.?\s*(\d+)/i],
    cita: n => `Lane, Berytus 15, n. ${n}`,
  },
  {
    id: 'petzl-bwk',
    sigla: 'BWK',
    autore: 'G. Petzl',
    titolo: 'Die Beichtinschriften Westkleinasiens',
    anno: '1994',
    match: [/\bBWK\s*(\d+)/i, /Petzl[^<]{0,80}?\bn[or]?\.?\s*(\d+)/i],
    cita: n => `BWK ${n}`,
  },
  {
    id: 'tam-v',
    sigla: 'TAM V',
    titolo: 'Tituli Asiae Minoris V',
    match: [/\bTAM\s+V(?:[,.]?\s*(?:1|2|3))?\s*,?\s*(\d+)/],
    cita: n => `TAM V ${n}`,
  },
  {
    id: 'mama',
    sigla: 'MAMA',
    titolo: 'Monumenta Asiae Minoris Antiqua',
    match: [/\bMAMA\s+([IVX]+\s*,?\s*\d+)/],
    cita: n => `MAMA ${n.replace(/\s*,\s*/, ' ')}`,
  },
  {
    id: 'seg',
    sigla: 'SEG',
    titolo: 'Supplementum Epigraphicum Graecum',
    match: [/\bSEG\s+([IVXLC]+\s*,?\s*\d+)/],
    cita: n => `SEG ${n.replace(/\s*,\s*/, ' ')}`,
  },
  {
    id: 'ig',
    sigla: 'IG',
    titolo: 'Inscriptiones Graecae',
    match: [/\bIG\s+([IVX]+[²³]?\s*,?\s*\d+)/],
    cita: n => `IG ${n.replace(/\s*,\s*/, ' ')}`,
  },
  {
    id: 'cig',
    sigla: 'CIG',
    titolo: 'Corpus Inscriptionum Graecarum',
    match: [/\bCIG\s+(\d+)/],
    cita: n => `CIG ${n}`,
  },
  {
    id: 'cil',
    sigla: 'CIL',
    titolo: 'Corpus Inscriptionum Latinarum',
    match: [/\bCIL\s+([IVX]+\s*,?\s*\d+)/],
    cita: n => `CIL ${n.replace(/\s*,\s*/, ' ')}`,
  },
  {
    id: 'igrr',
    sigla: 'IGRR',
    titolo: 'Inscriptiones Graecae ad res Romanas pertinentes',
    match: [/\bIGRR?\s+([IVX]+\s*,?\s*\d+)/],
    cita: n => `IGRR ${n.replace(/\s*,\s*/, ' ')}`,
  },
];

export const SOURCE_IDS = PRINT_SOURCES.map(s => s.id);

export function printSource(id: string): PrintSource | undefined {
  return PRINT_SOURCES.find(s => s.id === id);
}

/** Le fonti di cui esiste una scansione collazionabile. */
export const COLLATABLE_SOURCES = PRINT_SOURCES.filter(s => s.collazione);

export interface SourceRef {
  sourceId: string;
  sigla: string;
  /** numero di catalogo così com'è stato letto, se la fonte lo dà. */
  numero?: string;
  /** riferimento breve pronto da mostrare, es. «CMRDM I 29». */
  ref: string;
}

/**
 * Tutti i riferimenti a fonti a stampa riconosciuti nel TEI di una scheda,
 * nell'ordine del registro. Una fonte compare una volta sola: se una scheda
 * cita più numeri della stessa opera, vince il primo — i casi sono rari e
 * quasi sempre un rimando di confronto («Cf. …»), non un'edizione del testo.
 */
export function extractSourceRefs(teiString: string): SourceRef[] {
  const out: SourceRef[] = [];
  for (const s of PRINT_SOURCES) {
    for (const re of s.match) {
      const m = teiString.match(re);
      if (!m) continue;
      const numero = (m[1] || '').trim();
      out.push({ sourceId: s.id, sigla: s.sigla, ...(numero ? { numero } : {}), ref: numero ? s.cita(numero) : s.sigla });
      break;
    }
  }
  return out;
}

/**
 * Il riferimento da mostrare quando ce ne sta uno solo. Non è «la fonte della
 * scheda»: è il primo riferimento stabile trovato, nell'ordine del registro.
 */
export function primarySourceRef(teiString: string): string | undefined {
  return extractSourceRefs(teiString)[0]?.ref;
}
