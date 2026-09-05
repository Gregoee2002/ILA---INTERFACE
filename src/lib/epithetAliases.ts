// Canonicalizzazione di varianti grafiche/flessive note dello STESSO epiteto
// cultuale, dove il corpus usa forme diverse in schede diverse (es. una scheda
// con <term>Askainos</term>, un'altra con <term>Askaenos</term> per lo stesso
// epiteto di Men). Speculare a divinityAliases.ts per i teonimi.
//
// Applicata al momento dell'estrazione (xmlUtils.ts), così epiteti[] e
// divinitaEpiteti[].epiteti restano unificati SENZA riscrivere le schede XML:
// l'operazione è quindi del tutto reversibile e non tocca il corpus.
//
// REGOLE:
//  - Solo varianti grafiche o flessive della stessa parola. NON unire epiteti
//    che potrebbero essere cult-title distinti (es. Chthonios ≠ Katachthonios,
//    dove kata- cambia il senso): quelli, se davvero da unire, vanno risolti a
//    mano sullo XML dopo verifica sulle edizioni a stampa.
//  - La FORMA CANONICA (valore della mappa) è di norma quella più attestata nel
//    corpus e/o quella usata dalle edizioni a stampa. Le direzioni qui sotto sono da
//    ricontrollare sulle edizioni prima di considerarle definitive; cambiarle è una
//    riga di codice, non una migrazione di dati.
//
// Fonte dei gruppi: rilievo DATA-01 dell'audit 2026-09-01 (conteggi indicati).
export const EPITHET_ALIASES: Record<string, string> = {
  // Askaenos(56) è nettamente maggioritario su Askainos(3).
  Askainos: "Askaenos",

  // Famiglia Axiottenos(13): le altre sono errori di trascrizione dell'unico
  // epiteto toponimico (da Axiotta).
  Axiettenos: "Axiottenos",
  Axitenos: "Axiottenos",
  Axittenos: "Axiottenos",

  // Tiamou(1) è il genitivo di Tiamos(14) trattato per errore come forma a sé.
  Tiamou: "Tiamos",

  // Coppie grafiche (nessun conteggio nell'audit: direzione da confermare sulle edizioni).
  Motyleites: "Motelleites",
  Selmenos: "Selmeenos",
  Labanes: "Labanas",
  Atimis: "Atimitis",
  Hoseos: "Hosios",
};

export function canonicalEpithet(name: string): string {
  if (!name) return name;
  const trimmed = name.trim();
  return EPITHET_ALIASES[trimmed] || trimmed;
}
