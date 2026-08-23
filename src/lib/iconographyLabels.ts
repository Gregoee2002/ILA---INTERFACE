/**
 * Vocabolario controllato per <xenoData><iconography> (v2 — 2026-08).
 *
 * Fonti per gli attributi di Men (categoria `trait`):
 *  - Descrizioni prosastiche già presenti nel corpus reale CMRDM (support/layout
 *    <p>), confermate nell'audit di questa revisione: CMRDM I 69 ("holding
 *    staff, pine-cone... boy with uplifted hands"), CMRDM I 80 e Laurion
 *    12/13 ("incised crescent at top"), CMRDM I 260 ("Phrygian cap and
 *    crescent").
 *  - Letteratura secondaria accessibile online (voce Wikipedia/Britannica/
 *    World History Encyclopedia su "Men (deity)"), usata per confermare
 *    berretto frigio, falce lunare sulle spalle, pigna, bucranio e gallo come
 *    attributi ricorrenti di Men.
 *  - NON verificato direttamente contro LIMC (voce "Men") né contro Lane,
 *    CMRDM III (Interpretations and Testimonia) — nessuno dei due è stato
 *    consultabile in questa sessione. Le voci qui sotto marcate "[da
 *    verificare su LIMC/Lane III]" andrebbero controllate prima di trattarle
 *    come canoniche.
 *
 * `function` = funzione cultuale (NON tipo fisico, quello va in objectType).
 */
export const ICONOGRAPHY_LABELS: Record<string, string> = {
  // function
  votive: "votiva",
  lex_sacra: "lex sacra",
  confession: "iscrizione di confessione",
  honorific: "onoraria",
  funerary: "funeraria",
  // support (legacy — non usare nel xenoData, usare function)
  votive_stele: "stele votiva",
  relief: "rilievo",
  altar: "altare",
  bust: "busto",
  plaque: "placchetta",
  rock_cut: "rupestre",
  // headgear
  phrygian_cap: "berretto frigio",
  radiate_crown: "corona radiata",
  crescent_crown: "corona a falce",
  // lunar — attributo diagnostico di Men
  crescent_shoulders: "falce lunare sulle spalle",
  crescent_cap: "falce sul berretto",
  full_moon: "luna piena",
  crescent: "falce lunare (posizione non specificata in fonte)",
  // held_object
  pine_cone: "pigna",
  torch: "torcia",
  patera: "patera",
  sceptre: "scettro",
  wreath: "corona vegetale",
  staff: "bastone",
  bucranium: "bucranio",
  // mount / animale associato (cavalcatura o accompagnatore — non solo "ridden")
  bull: "toro",
  horse: "cavallo",
  cock: "gallo",
  // dress
  military: "abbigliamento militare",
  himation: "himation",
  chiton: "chitone",
  belted_tunic: "tunica cinta",
  // gesture — introdotta in questa revisione: CMRDM I 69 descrive un orante
  // "with uplifted hands", nessuna delle categorie esistenti lo copriva.
  hands_raised: "mani alzate (gesto di supplica)",
  // position — posizione COMPOSITIVA della figura nel rilievo (figure.place,
  // non più un trait: vedi types.ts IconographicFigure.place)
  upper_left: "in alto a sinistra",
  upper_right: "in alto a destra",
  lower_left: "in basso a sinistra",
  lower_right: "in basso a destra",
  top_centre: "al centro in cima",
  // figure type
  deity: "divinità",
  secondary: "figura secondaria",
  worshipper: "orante",
  animal: "animale",
  symbol: "simbolo",
  // figure key (simboli e figure nominate)
  Nike: "Nike",
  eagle: "aquila",
  Attis: "Attis",
  Helios: "Helios",
  Men: "Men",
  // trait/field type headers
  headgear: "copricapo",
  lunar: "attributo lunare",
  held_object: "oggetto tenuto",
  mount: "animale associato",
  dress: "abbigliamento",
  gesture: "gesto",
  position: "posizione",
};

/**
 * Applica un overlay di termini non ancora curati (vedi
 * iconographyVocabOverrides.ts) sopra il vocabolario base, mutando
 * l'oggetto esportato: ogni lettura successiva di ICONOGRAPHY_LABELS[key]
 * (App.tsx, IconographyPanel, searchIndex, ecc.) vede già il termine senza
 * dover cambiare quei punti di lettura. Non sovrascrive mai una voce già
 * curata a mano sopra: l'overlay copre solo id assenti dal vocabolario base.
 */
export function mergeIconographyOverrides(overrides: Record<string, string>): void {
  for (const [id, label] of Object.entries(overrides)) {
    if (!(id in ICONOGRAPHY_LABELS)) ICONOGRAPHY_LABELS[id] = label;
  }
}
