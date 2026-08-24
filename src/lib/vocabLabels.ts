/**
 * Vocabolario controllato per attributi EpiDoc minori mostrati nella vista
 * di lettura della scheda (markup resta in inglese, resa visibile in
 * italiano — v. IconographyLabels per il vocabolario iconografico).
 */

// <origDate evidence="..."> — tipo di prova su cui si basa la datazione.
export const EVIDENCE_LABELS: Record<string, string> = {
  "letter-forms": "forme delle lettere",
  "internal-evidence": "evidenza interna",
  "external-evidence": "evidenza esterna",
  context: "contesto",
  content: "contenuto",
  date: "data esplicita",
  orthography: "ortografia",
  prosopography: "prosopografia",
  language: "lingua",
  style: "stile",
};

export function labelEvidence(evidence: string): string {
  return EVIDENCE_LABELS[evidence] || evidence.replace(/-/g, " ");
}

// <height>/<width>/<depth unit="..."> — unità di misura delle dimensioni.
export const UNIT_LABELS: Record<string, string> = {
  metre: "m",
  metres: "m",
  meter: "m",
  meters: "m",
  centimetre: "cm",
  centimetres: "cm",
  centimeter: "cm",
  centimeters: "cm",
  cm: "cm",
};

export function labelUnit(unit: string): string {
  return UNIT_LABELS[unit] || unit;
}

// <objectType> — tipologia fisica del supporto (sia le forme brevi usate nel
// corpus XML — "stele", "altar" — sia le forme composte legacy del vecchio
// dataset statico — "Altar/Bomos", "Inscribed stone").
export const TYPE_LABELS: Record<string, string> = {
  relief: "rilievo",
  altar: "altare",
  "altar/bomos": "altare (bomos)",
  base: "base",
  "base/pedestal": "base/piedistallo",
  "statue base": "base di statua",
  block: "blocco",
  brick: "mattone",
  column: "colonna",
  fragment: "frammento",
  plaque: "placca",
  "plaque/tablet": "placca/tavoletta",
  stele: "stele",
  stone: "pietra",
  "inscribed stone": "pietra iscritta",
  "architectural element": "elemento architettonico",
  other: "altro",
};

export function labelType(type: string): string {
  return TYPE_LABELS[type.trim().toLowerCase()] || type;
}

// <material> — materiale del supporto; talvolta valori multipli separati da virgola.
export const MATERIAL_LABELS: Record<string, string> = {
  marble: "marmo",
  stone: "pietra",
  terracotta: "terracotta",
  bronze: "bronzo",
  limestone: "calcare",
  brick: "laterizio",
};

export function labelMaterial(material: string): string {
  return material
    .split(",")
    .map(part => {
      const trimmed = part.trim();
      return MATERIAL_LABELS[trimmed.toLowerCase()] || trimmed;
    })
    .join(", ");
}
