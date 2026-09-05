/**
 * cultToolboxExport.ts — ILA / Index Lunae Antiquae
 * ------------------------------------------------------------------
 * Iniezione del percorso LARES (`@type`/`@subtype`) nel markup, **in uscita**.
 *
 * Perché in uscita e non nei file del corpus: il percorso è una copia derivata
 * del `@lemma` (tabella `LEMMA_TOOLBOX` in cultLexicon.ts), e scriverlo nei 295
 * file creerebbe una seconda fonte di verità da riallineare ogni volta che la
 * griglia cambia — e con la redazione LARES restano aperte le quattro domande
 * del §9 di docs/merge-lessico-lares.md. Dentro ILA il percorso si deriva a
 * runtime; serve scritto solo quando il TEI esce di casa, perché fuori nessuno
 * ha la nostra tabella.
 *
 * Chi ha marcato a mano un percorso diverso dalla norma (il caso μαρτυρέω detto
 * del dio) lo ha scritto nel file: quel `@type` non si tocca mai.
 * ------------------------------------------------------------------
 */

import { toolboxForLemma } from "./cultLexicon";

export interface ToolboxInjectionStats {
  /** <w> a cui è stato aggiunto il percorso. */
  injected: number;
  /** <w> che portavano già un @type proprio: lasciati intatti. */
  preserved: number;
  /** <w> il cui lemma non ha percorso (χαίρω, χρηστὸς χαῖρε) o è fuori tabella. */
  senzaPercorso: string[];
  /** <rs type="cultTerm|cultFormula">: @type è già occupato, vedi nota sotto. */
  rsCultuali: number;
}

const emptyStats = (): ToolboxInjectionStats => ({
  injected: 0, preserved: 0, senzaPercorso: [], rsCultuali: 0,
});

const attr = (attrs: string, nome: string): string | undefined =>
  (attrs.match(new RegExp(`\\b${nome}="([^"]*)"`)) || [])[1];

/**
 * Aggiunge `@type`/`@subtype` a ogni `<w>` di funzione cultuale che non ne ha,
 * ricavandoli dal `@lemma`. Non tocca nient'altro del markup: è una
 * sostituzione di stringa sull'apertura del tag, non un round-trip di parsing,
 * così il testo antico esce identico a com'era.
 *
 * `<rs type="cultTerm">` e `<rs type="cultFormula">` restano come sono: il loro
 * `@type` è già occupato dal ruolo che hanno nel nostro markup, e sovrascriverlo
 * perderebbe l'informazione. Se servirà darglielo, andrà su un `<rs>` esterno.
 */
export function injectToolboxPaths(xml: string): { xml: string; stats: ToolboxInjectionStats } {
  const stats = emptyStats();

  const out = (xml || "").replace(/<w\b([^>]*?)(\/?)>/g, (intero, attrs: string, chiusura: string) => {
    const ana = attr(attrs, "ana");
    if (!ana) return intero;              // <w> senza famiglia: non è del lessico cultuale
    if (attr(attrs, "type")) { stats.preserved += 1; return intero; }
    const lemma = attr(attrs, "lemma") || "";
    const tb = toolboxForLemma(lemma);
    if (!tb) { stats.senzaPercorso.push(lemma || "(senza lemma)"); return intero; }
    stats.injected += 1;
    const nuovi = ` type="${tb.item}"${tb.subtype.length ? ` subtype="${tb.subtype.join(" ")}"` : ""}`;
    return `<w${attrs}${nuovi}${chiusura}>`;
  });

  stats.rsCultuali = (out.match(/<rs\b[^>]*\btype="(cultTerm|cultFormula)"/g) || []).length;
  return { xml: out, stats };
}

/** Somma di più iniezioni, per i riepiloghi di uno script su tutto il corpus. */
export function sommaStats(parti: ToolboxInjectionStats[]): ToolboxInjectionStats {
  return parti.reduce((acc, s) => ({
    injected: acc.injected + s.injected,
    preserved: acc.preserved + s.preserved,
    senzaPercorso: [...acc.senzaPercorso, ...s.senzaPercorso],
    rsCultuali: acc.rsCultuali + s.rsCultuali,
  }), emptyStats());
}
