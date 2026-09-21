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
  oracular: "oracolare",
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
  secondary_decoration: "decorazione secondaria",
  // figure key (simboli e figure nominate)
  Nike: "Nike",
  eagle: "aquila",
  Attis: "Attis",
  Helios: "Helios",
  Men: "Men",
  // figure key — decorazioni secondarie (motivi ornamentali, non figure)
  festoon_ram_heads: "festone con criocefali",
  festoon_bull_heads: "festone con bucefali",
  garland: "ghirlanda",
  rosette: "rosetta",
  // --- numismatica (2026-09) ---------------------------------------------
  // Il vocabolario resta UNO: le monete di Men mostrano gli stessi attributi
  // delle stele (berretto frigio, falce sulle spalle, pigna), e duplicarne le
  // chiavi spezzerebbe ogni ricerca a cavallo dei due sottocorpora. Qui sotto
  // entrano solo le nozioni che l'epigrafia non aveva bisogno di esprimere.

  // portrait — troncatura del ritratto, nozione propria della catalografia
  // numismatica. NON confondere con `headgear`: «laureate» detto del berretto
  // frigio resta un copricapo, detto della testa è una troncatura.
  bare_head: "testa nuda",
  laureate_head: "testa laureata",
  radiate_head: "testa radiata",
  diademed_head: "testa diademata",
  draped_bust: "busto drappeggiato",
  cuirassed_bust: "busto corazzato",
  // pose — la posa della figura intera
  standing: "stante",
  seated: "seduto",
  riding: "a cavallo",
  reclining: "recumbente",
  galloping: "al galoppo",
  // feature — tratti fisionomici notati dalle fonti
  bearded: "barbato",
  beardless: "imberbe",
  youthful: "giovanile",
  // dir — orientamento della figura (attributo @dir, non un trait)
  right: "a destra",
  left: "a sinistra",
  facing: "di fronte",
  // rel — posizione relativa a un'altra figura (attributo @rel)
  in_front_of: "davanti a",
  behind: "dietro a",
  at_feet: "ai piedi di",
  above: "sopra",
  below: "sotto",
  in_field: "nel campo",
  around: "attorno",
  flanking: "ai lati di",
  // figure key — soggetti e simboli ricorrenti sulle monete
  // (`altar` è già fra i support legacy e vale anche qui: una chiave sola)
  star: "stella",
  shield: "scudo",
  palm: "palma",
  caduceus: "caduceo",
  cornucopia: "cornucopia",
  spear: "lancia",
  thunderbolt: "fulmine",
  tripod: "tripode",
  temple: "tempio",
  ram: "ariete",
  lion: "leone",
  // faccia della moneta, per le rese compatte
  obv: "dritto",
  rev: "rovescio",

  // trait/field type headers
  portrait: "ritratto",
  pose: "posa",
  feature: "fisionomia",
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
