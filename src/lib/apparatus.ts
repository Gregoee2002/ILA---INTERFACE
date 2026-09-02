// Apparato critico: le note hanno la struttura canonica "l. n — lezione — chi la
// legge così". Nel corpus storico i tre elementi sono spesso schiacciati in
// un'unica stringa ("ια Lane"): qui li ricomponiamo in campi separati, sia per
// la resa grafica della scheda sia per l'editor.

export type ApparatusEntry = { loc: string; note: string; source?: string };

export type ApparatusRow = { loc: string; lezione: string; lettore: string };

// "5", "l.5", "ll. 3-4", "r. 1" → "l. 5", "ll. 3-4", "r. 1"
export const formatApparatusLoc = (raw?: string): string => {
  const loc = (raw || '').trim();
  if (!loc) return '';
  const bare = loc.match(/^(\d+(?:\s*[-–/]\s*\d+)?)$/);
  if (bare) {
    const isRange = /[-–/]/.test(bare[1]);
    return `${isRange ? 'll.' : 'l.'} ${bare[1].replace(/\s*([-–/])\s*/, '$1')}`;
  }
  // Normalizza lo spazio dopo l'abbreviazione: "l.5" → "l. 5"
  return loc.replace(/^([A-Za-z]{1,3}\.)\s*/, '$1 ');
};

// Coda di attribuzione: uno o più nomi in caratteri latini a fine nota,
// eventualmente seguiti da un inciso fra parentesi — "ια Lane",
// "Μεινοδώρα Hardie (CMRDM I, nr. 96)", "τη Lane, Herrmann".
const ATTRIBUTION = /\s+((?:[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ'’.-]*)(?:\s*(?:,|–|—|-|&|e|ed|and)\s*[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ'’.-]*)*)(\s*\([^()]*\))?\s*$/;

// Le note discorsive (frasi di commento) non vanno spezzate: solo le voci
// brevi hanno davvero la forma "lezione + lettore".
const MAX_WORDS_FOR_SPLIT = 10;

export const splitApparatusNote = (note: string): { lezione: string; lettore: string } => {
  const text = (note || '').trim();
  if (!text) return { lezione: '', lettore: '' };
  if (text.split(/\s+/).length > MAX_WORDS_FOR_SPLIT) return { lezione: text, lettore: '' };
  const m = text.match(ATTRIBUTION);
  if (!m) return { lezione: text, lettore: '' };
  const lezione = text.slice(0, m.index).trim();
  if (!lezione) return { lezione: text, lettore: '' };
  const lettore = (m[1] + (m[2] || '')).replace(/\s+/g, ' ').trim();
  return { lezione, lettore };
};

export const toApparatusRow = (entry: ApparatusEntry): ApparatusRow => {
  const loc = formatApparatusLoc(entry.loc);
  if (entry.source && entry.source.trim()) {
    return { loc, lezione: (entry.note || '').trim(), lettore: entry.source.trim() };
  }
  return { loc, ...splitApparatusNote(entry.note || '') };
};

// Stringa piatta (ricerca full-text, export testuali).
export const apparatusEntryToText = (entry: ApparatusEntry): string => {
  const parts = [entry.note || '', entry.source || ''].filter(p => p.trim());
  const body = parts.join(' ');
  return entry.loc ? `${entry.loc}: ${body}` : body;
};
