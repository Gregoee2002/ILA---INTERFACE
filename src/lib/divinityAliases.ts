// Canonicalizzazione di varianti grafiche note dello STESSO teonimo, dove il
// corpus usa forme diverse in file diversi per la stessa divinità (es. una
// scheda con key="Apollo", un'altra con key="Apollon" per lo stesso dio).
// Applicata al momento dell'estrazione (xmlUtils.ts), così divinita[] e
// divinitaEpiteti[] restano unificati senza dover riscrivere le schede XML.
//
// Aggiungere qui SOLO varianti verificate (stessa divinità, grafia diversa),
// non casi ambigui da investigare — quelli vanno risolti a mano sullo XML
// dopo verifica su Lane 1971, non silenziati con un alias.
export const DIVINITY_ALIASES: Record<string, string> = {
  Apollon: "Apollo",
};

export function canonicalDivinityName(name: string): string {
  return DIVINITY_ALIASES[name] || name;
}
