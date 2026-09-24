/**
 * mancanze.ts — che cosa manca a una scheda, requisito per requisito.
 *
 * Un solo elenco di requisiti per tutti gli strumenti della redazione: la
 * tabella «Mancanze» (scheda per scheda), il pannello «Avanzamento» (in
 * aggregato) e, per la parte che si legge dall'XML, scripts/stato-corpus.py
 * dei controlli notturni. Se si aggiunge un requisito qui, va aggiunto anche
 * là, con la stessa chiave.
 *
 * Il gruppo «Scheda bibliografica» traduce le richieste della professoressa
 * del 2026-09-23: edizione di riferimento esplicita (mai il solo PHI), il suo
 * editore, le responsabilità dell'edizione digitale e lo stato di
 * pubblicazione (vedi docs/guida-editor, sezioni 16, 17 e 22).
 *
 * Un requisito conta se il campo è compilato, non se è giusto. I segnaposto
 * («DA_COMPILARE», commenti) contano come vuoti.
 */
import type { Monumento, RuoloDigitale } from '../types';

export type GruppoRequisiti = 'bibliografica' | 'testo' | 'oggetto' | 'luogo' | 'apparato';

export const GRUPPI_REQUISITI: { id: GruppoRequisiti; label: string }[] = [
  { id: 'bibliografica', label: 'Scheda bibliografica' },
  { id: 'testo', label: 'Testo' },
  { id: 'oggetto', label: 'Oggetto' },
  { id: 'luogo', label: 'Luogo e data' },
  { id: 'apparato', label: 'Apparato' },
];

export interface Requisito {
  /** Chiave stabile: è anche l'intestazione del CSV e la chiave in stato-corpus.py. */
  id: string;
  gruppo: GruppoRequisiti;
  label: string;
  /** Etichetta corta per le colonne strette della tabella. */
  breve: string;
  /** Se il requisito riguarda la scheda. Assente = riguarda tutte. */
  applicabile?: (m: Monumento) => boolean;
  soddisfatto: (m: Monumento) => boolean;
}

export const pieno = (s?: string | null): boolean =>
  (s || '').replace(/DA_COMPILARE/g, '').replace(/<!--[\s\S]*?-->/g, '').trim().length > 0;

/**
 * Una citazione che nomina PHI senza nominare l'edizione che PHI riproduce.
 * È la regola della professoressa: PHI non può essere l'edizione di riferimento.
 */
export function citaSoloPhi(citazione?: string): boolean {
  const c = citazione || '';
  return /\bPHI\b|Packard/i.test(c) && !/CMRDM|Corpus Monumentorum|TAM|SEG|MAMA|IG\b|I\.\s?\w/.test(c);
}

export const haTraduzione = (m: Monumento, lang: string) =>
  (m.traduzioni || []).some(t => t.lang === lang && pieno(t.testo));

const haRuolo = (m: Monumento, ruolo: RuoloDigitale) =>
  (m.responsabili || []).some(r => r.ruolo === ruolo && pieno(r.nome));

const conTesto = (m: Monumento) => !m.anepigr;
const conEdRif = (m: Monumento) => pieno(m.edizioneRiferimento?.citazione);

export const REQUISITI: Requisito[] = [
  // --- Scheda bibliografica (richieste della professoressa) ---
  { id: 'edrif', gruppo: 'bibliografica', label: 'Edizione di riferimento', breve: 'Ed. rif.',
    soddisfatto: conEdRif },
  { id: 'edrif_editore', gruppo: 'bibliografica', label: "Editore dell'edizione di riferimento", breve: 'Editore',
    soddisfatto: m => pieno(m.edizioneRiferimento?.editore) },
  { id: 'edrif_non_phi', gruppo: 'bibliografica', label: 'Riferimento diverso dal solo PHI', breve: 'Non PHI',
    applicabile: conEdRif, soddisfatto: m => !citaSoloPhi(m.edizioneRiferimento?.citazione) },
  { id: 'codifica', gruppo: 'bibliografica', label: 'Codifica', breve: 'Codifica',
    soddisfatto: m => haRuolo(m, 'encoding') },
  { id: 'revisione', gruppo: 'bibliografica', label: 'Revisione', breve: 'Revisione',
    soddisfatto: m => haRuolo(m, 'revision') },
  { id: 'controllo', gruppo: 'bibliografica', label: 'Controllo scientifico', breve: 'Controllo',
    soddisfatto: m => haRuolo(m, 'review') },
  { id: 'stato', gruppo: 'bibliografica', label: 'Stato di pubblicazione', breve: 'Stato',
    soddisfatto: m => !!m.editorialStatus },

  // --- Testo ---
  { id: 'edizione', gruppo: 'testo', label: 'Edizione', breve: 'Edizione',
    applicabile: conTesto, soddisfatto: m => pieno(m.testo) },
  { id: 'trad_it', gruppo: 'testo', label: 'Traduzione italiana', breve: 'Trad. it.',
    applicabile: conTesto, soddisfatto: m => haTraduzione(m, 'it') },
  { id: 'trad_en', gruppo: 'testo', label: 'Traduzione inglese', breve: 'Trad. en.',
    applicabile: conTesto, soddisfatto: m => haTraduzione(m, 'en') },
  { id: 'cultuale', gruppo: 'testo', label: 'Lessico cultuale marcato', breve: 'Cultuale',
    applicabile: conTesto, soddisfatto: m => (m.cultAttestations || []).length > 0 },

  // --- Oggetto ---
  { id: 'tipo', gruppo: 'oggetto', label: 'Tipo di oggetto', breve: 'Tipo', soddisfatto: m => pieno(m.tipo) },
  { id: 'materiale', gruppo: 'oggetto', label: 'Materiale', breve: 'Materiale', soddisfatto: m => pieno(m.materiale) },
  { id: 'misure', gruppo: 'oggetto', label: 'Misure', breve: 'Misure',
    soddisfatto: m => pieno(m.dim_altezza) || pieno(m.dim_larghezza) },
  { id: 'immagini', gruppo: 'oggetto', label: 'Immagini', breve: 'Immagini',
    soddisfatto: m => (m.facsimili || []).length > 0 || pieno(m.facsimile_url) },

  // --- Luogo e data ---
  { id: 'citta', gruppo: 'luogo', label: 'Località', breve: 'Località', soddisfatto: m => pieno(m.citta) },
  { id: 'luogo_ref', gruppo: 'luogo', label: 'Luogo antico collegato', breve: 'Luogo coll.',
    soddisfatto: m => pieno(m.place_ref_ancient) },
  { id: 'datazione', gruppo: 'luogo', label: 'Datazione', breve: 'Data',
    soddisfatto: m => m.data_inizio !== undefined || m.data_fine !== undefined },

  // --- Apparato ---
  { id: 'bibliografia', gruppo: 'apparato', label: 'Bibliografia', breve: 'Bibliogr.',
    soddisfatto: m => (m.bibliografia || []).length > 0 },
  { id: 'tm', gruppo: 'apparato', label: 'Numero Trismegistos', breve: 'TM', soddisfatto: m => /\d/.test(m.tm || '') },
];

/** Esito di un requisito su una scheda: fatto, mancante o non pertinente. */
export type Esito = 'ok' | 'manca' | 'na';

export function esito(r: Requisito, m: Monumento): Esito {
  if (r.applicabile && !r.applicabile(m)) return 'na';
  return r.soddisfatto(m) ? 'ok' : 'manca';
}

/** I requisiti che mancano alla scheda, nell'ordine dell'elenco. */
export function mancanzeDi(m: Monumento, requisiti: Requisito[] = REQUISITI): Requisito[] {
  return requisiti.filter(r => esito(r, m) === 'manca');
}

export interface ContoRequisito {
  requisito: Requisito;
  /** Schede a cui il requisito si applica. */
  tot: number;
  fatti: number;
  mancanti: Monumento[];
}

export function contaRequisiti(monumenti: Monumento[], requisiti: Requisito[] = REQUISITI): ContoRequisito[] {
  return requisiti.map(r => {
    const base = r.applicabile ? monumenti.filter(r.applicabile) : monumenti;
    const mancanti = base.filter(m => !r.soddisfatto(m));
    return { requisito: r, tot: base.length, fatti: base.length - mancanti.length, mancanti };
  });
}

/** Le persone nominate nelle responsabilità, in ordine alfabetico. */
export function personeResponsabili(monumenti: Monumento[]): string[] {
  const s = new Set<string>();
  for (const m of monumenti) for (const r of m.responsabili || []) if (pieno(r.nome)) s.add(r.nome.trim());
  return [...s].sort((a, b) => a.localeCompare(b, 'it'));
}

const csvCampo = (v: string | number) => {
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Le mancanze in CSV, una riga per scheda: per dividersi il lavoro fuori
 * dall'app o allegarlo a un messaggio. «sì» = compilato, «no» = manca,
 * «—» = non pertinente (per esempio la traduzione di un anepigrafe).
 */
export function mancanzeCsv(
  monumenti: Monumento[],
  etichetta: (m: Monumento) => string,
  requisiti: Requisito[] = REQUISITI,
): string {
  const testa = ['scheda', 'fonte', 'titolo', 'regione', ...requisiti.map(r => r.id), 'mancanze'];
  const righe = monumenti.map(m => {
    const esiti = requisiti.map(r => esito(r, m));
    return [
      etichetta(m),
      m.fontiStampa?.[0]?.ref || '',
      m.titolo || '',
      m.regione || '',
      ...esiti.map(e => (e === 'ok' ? 'sì' : e === 'manca' ? 'no' : '—')),
      esiti.filter(e => e === 'manca').length,
    ];
  });
  return [testa, ...righe].map(r => r.map(csvCampo).join(',')).join('\n') + '\n';
}
