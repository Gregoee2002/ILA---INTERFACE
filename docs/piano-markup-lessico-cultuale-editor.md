# Handoff — implementare la marcatura lessicale delle funzioni cultuali nell'editor

> Prompt pronto per una **nuova sessione**. Copia da "## PROMPT" in giù.

---

## PROMPT

Devi rendere la **marcatura lessicale delle funzioni cultuali** una funzione a
pieno titolo dell'editor a sezioni di ILA (Index Lunae Antiquae), più
estrattore dati e vista indice, più la sezione di guida. Il layer di rendering
e la tassonomia **esistono già e sono mergiati**: tu aggiungi la parte
*produttiva* (creare i tag dall'editor) e *analitica* (interrogarli).

### Cosa esiste già (NON rifarlo)

- **Rendering**: `<w lemma@ ana="#…" lemmaRef@>` e `<rs type="cultTerm"|"cultFormula" ana="#…">`
  sono resi in **malva/lilla smorzato** (token CSS `--cult` / classe `text-cult` in `src/index.css`)
  in ENTRAMBI i renderer:
  - `EpiDocRenderer` in `src/App.tsx` (~riga 3170, `case 'w'` e ramo `rs` cultTerm/cultFormula) — è quello del **sito statico**;
  - `TokenFlow` in `src/components/EditionMarkupEditor.tsx` (~riga 569).
  Gestiscono `<w>` a cavallo di `<lb/>` e `<w>` annidati dentro `<rs>`. Tooltip = lemma + famiglia.
- **Tassonomia** (fonte di verità): `docs/tassonomia-funzioni-cultuali.md` (v2).
  5 famiglie: `agency`, `atto-cultuale`, `colpa`, `formula-fissa`, `ruolo-istituzione`.
  Regola per l'editor: **"chi è il soggetto dell'azione, il dio o l'uomo?"**.
  `#formula` è un token `@ana` *aggiuntivo* (non una famiglia) per parole in locuzione fissa.
  Le sotto-funzioni fini NON sono scelte editoriali: si ricavano dal `@lemma` con la tabella §5.
- **Spoglio**: `docs/spoglio-lessico-cultuale.csv` — 318 righe / 54 lemmi / 197 schede
  (colonne: `scheda, lane_ref, famiglia, lemma, sotto_funzione, forma_attestata, cert, verifica`).
- **Corpus già marcato**: 298 `<w>` in 186 schede, già su `main` del repo dati
  `Gregoee2002/ILA` (merge commit `5645678`). Il checkout locale `src/data/corpus/`
  ha gli stessi tag.
- `xenoData <function>` ha già il valore `oracular` (`src/lib/iconographyLabels.ts` +
  `FUNCTION_IDS`/`FUNCTION_SYNONYMS` in `SectionEditorView.tsx`).
- `cmrdm-epidoc/references/casi-complessi.md` §9: già aggiornata (marcatura selettiva ammessa).
- `docs/taxonomy-cult-functions.xml`: bozza TEI `<taxonomy xml:id="cult-functions">`.

### Vincoli (memoria di progetto — non violare)

- Il progetto è **ILA — Index Lunae Antiquae**. Mai "MENISKOS", mai "STAR" in testo utente.
- **Il sito statico è il target reale**: l'utente apre solo la build GitHub Pages.
  Ogni feature dati DEVE funzionare in `src/lib/apiShim.ts` + lo snapshot
  `public/corpus-snapshot.json` (rigenerato da `scripts/build-corpus-snapshot.ts`).
  `server.ts` è solo per lo sviluppo con Claude.
- **Due repo**: codice `Gregoee2002/ILA---INTERFACE` (questo checkout), dati
  `Gregoee2002/ILA`. `src/data/corpus/` è gitignorato qui. Modifiche alle schede
  XML vanno sul repo dati (branch → merge), MAI bulk-copy tra i due (divergono in
  ~150 file su header/support/change-log): ri-applicare gli script sul clone fresco.
  Per questo task NON servono modifiche alle schede: il corpus è già marcato.
- `@lemmaRef` = URL Logeion (`https://logeion.uchicago.edu/<lemma>`).
- Non rompere i test/validazioni esistenti del markup Edizione.

---

## Task 1 — Tabella lessico in codice: `src/lib/cultLexicon.ts`

Porta la tabella §5 di `docs/tassonomia-funzioni-cultuali.md` in un modulo TS.
Esporta:

```ts
export type CultFamily = 'agency' | 'atto-cultuale' | 'colpa' | 'formula-fissa' | 'ruolo-istituzione';

export interface CultLemma {
  lemma: string;          // forma di citazione greca (dizionario)
  family: CultFamily;
  subFunction: string;    // sotto-funzione fine (es. "castigo-divino", "voto")
  lemmaRef?: string;      // URL Logeion; assente per τεκμωρεύω, -ιασταί, "ὗε κύε", "χρηστὸς χαῖρε"
}

export const CULT_LEXICON: CultLemma[];              // i 54 lemmi
export const CULT_FAMILIES: { id: CultFamily; label: string; rule: string }[];
export function lookupCultLemma(lemma: string): CultLemma | undefined;
export function lemmaRefFor(lemma: string): string | undefined; // fallback: costruisce l'URL Logeion
```

Dati: leggi `docs/spoglio-lessico-cultuale.csv` (una riga per `(scheda,lemma)`; a
te serve l'insieme unico `lemma → famiglia, sotto_funzione`) e la tabella §5 del
doc per `@lemmaRef`. 54 lemmi. Le 2 righe `verifica=manuale` (`τρέφω`/ILA-151,
`ἱερεύς`/ILA-097) restano nella tabella ma vanno marcate `manual: true` se ti
serve distinguerle.

## Task 2 — Azioni di markup: `MARKUP_ACTIONS` in `src/lib/leidenMarkup.ts`

Leggi prima: `interface MarkupAction` / `ActionParam` (~riga 390-415), e un'azione
`mode: "wrap"` come modello (`person_attested`, `epithet_*`). Nota che `group` è
una **union di stringhe fissa** — vai esteso in 2 punti (vedi sotto).

Aggiungi **due** azioni:

### 2a. `cult_word` — parola singola → `<w>`
- `label`: "Funzione cultuale (parola)", `glyph`: es. `<w>` o `ἀνέθηκεν`
- `group`: nuovo `"Lessico cultuale"`
- `mode: "wrap"`
- `params`:
  - `family` — `type: "select"`, `options` = i 5 id famiglia, `required`. Label con la regola "chi è il soggetto".
  - `lemma` — `type: "datalist"`, `options` = i 54 lemmi da `CULT_LEXICON`, `required`.
    `prefill`: prova `lookupCultLemma` sulla forma selezionata normalizzata; se il
    lemma scelto è noto, in `build` **precompila `family` dalla tabella** (l'utente
    può sempre correggerla).
  - `formula` — `type: "select"`, `options: ["no", "sì"]`, default "no".
- `build(s, p)`: `el("w", attrs, [txt(s)])` con
  `attrs = { lemma: p.lemma, ana: p.formula === "sì" ? \`#\${p.family} #formula\` : \`#\${p.family}\`, ...(lemmaRefFor(p.lemma) ? { lemmaRef } : {}) }`
- `compose(slice, p)`: identico ma `el("w", attrs, slice)` (per selezioni che attraversano `<lb>`).

### 2b. `cult_formula` — sintagma/formula → `<rs type="cultFormula">`
- `label`: "Funzione cultuale (formula)", `group`: "Lessico cultuale", `mode: "wrap"`
- `params`:
  - `key` — `type: "text"`, `required` (handle normalizzato, es. `hye-kye`, `stelographein-dynameis`)
  - `family` — `type: "select"`, 5 id, `required` (la famiglia della *testa* del sintagma)
  - implicito: `@ana` include sempre `#formula`
- `build/compose`: `el("rs", { type: "cultFormula", key: p.key, ana: \`#\${p.family} #formula\` }, [txt(s)] / slice)`.
  I `<w>` interni si aggiungono poi con l'azione 2a sulla singola parola.

### Estendere il tipo `group` (2 punti)
1. `src/lib/leidenMarkup.ts`: aggiungi `| "Lessico cultuale"` alla union `group` di `MarkupAction`.
2. `src/components/EditionMarkupEditor.tsx`: aggiungi `"Lessico cultuale"` a `GROUP_ORDER`
   (in coda, dopo `"Spazi e altro"`).

### Popover attributi
`ElementPopover` mostra già `Object.keys(attrs)` come campi editabili → `<w>` con
`lemma`/`ana`/`lemmaRef` è già modificabile a mano. Nice-to-have (non obbligatorio):
rendere `ana` un `<select>` sulle 5 famiglie e `lemma` un datalist quando
`pop.token.name === 'w'`.

## Task 3 — Validatore: `validateEditionTokens` in `src/lib/leidenMarkup.ts`

Aggiungi controlli (guarda come sono fatti quelli per `persName`/`rs epithet` ~riga 985-1015):
- `<w>` senza `@lemma` → `warning` "manca @lemma".
- `<w>` senza `@ana` → `error` "manca @ana (famiglia cult-functions)".
- `@ana` con un token che non è una delle 5 famiglie o `#formula` → `error`
  "valore @ana non valido: usa #agency / #atto-cultuale / #colpa / #formula-fissa / #ruolo-istituzione (+ #formula)".
- `@lemma` non presente in `CULT_LEXICON` → `warning` "lemma fuori dal controllato — verifica o aggiungilo alla tabella".
- `<w>` con antenato `persName` / `name` / `rs` / `supplied` / `expan` → `warning`
  "una parola di funzione cultuale dentro un altro tag semantico: valuta se serve davvero".
- `<rs type="cultTerm"|"cultFormula">` senza `@ana` → `error`.
- (coerenza `@lemma`↔`@ana`): se `lookupCultLemma(lemma).family` ≠ la famiglia in `@ana`
  → `warning` "il lemma X di solito è #Y, hai messo #Z — confermа se è voluto".

## Task 4 — Estrattore + indice dati

### 4a. `src/lib/xmlUtils.ts`
Aggiungi una funzione che estrae da `<div type="edition">` di una scheda:
```ts
interface CultAttestation {
  lemma: string; family: string; subFunction: string; // da CULT_LEXICON
  form: string;        // forma attestata (testo del <w>, con "-" di a-capo rimossi)
  line?: string;       // n del <lb> che precede
  formula: boolean;    // @ana contiene #formula
  cert?: 'low';
  scheda: string; laneRef?: string;
}
```
Sorgenti: `<w ana>` e `<rs type="cultTerm"|"cultFormula">`. Riusa il pattern degli
estrattori esistenti (`scheme="epiteti"`, `persName type="divine"`, ~riga 738-880).

### 4b. `src/lib/apiShim.ts`
Esponi l'indice aggregato per la build statica, sullo stesso modello di come
`epiteti`/`divinita` sono serviti oggi (cerca dove `xmlToMonumenti` popola i campi
analitici, ~riga 128-145). L'indice deve entrare nello snapshot / essere derivabile
da esso senza chiamate di rete.

## Task 5 — Vista UI «Lessico cultuale»

Nuova voce nella barra strumenti (accanto a "Statistiche Epiteti" / "Heatmap" —
vedi `src/App.tsx`, i `button` della sidebar e i loro pannelli). Contenuti minimi:
- tabella raggruppabile per **lemma** e per **famiglia**, con conteggio schede;
- per ogni lemma: forme attestate, sotto-funzione, link Logeion, elenco schede (cliccabili → scheda);
- filtro per regione (riusa il meccanismo di filtro già presente nel catalogo);
- query di esempio pronte: "θρεπτός per regione", "forme verbali in #colpa",
  "εὐλογέω vs ὁμολογέω", "tutti gli atti #agency di castigo".
Stile coerente con `IconographyPanel` / le viste statistiche esistenti.

## Task 6 — Sezione di guida (SOLO dopo che 1-5 sono verificati in browser)

Segui la skill `guida-editor-ila` e `docs/guida-editor/README.md`. Nuova
`<section class="section-break">` in `docs/guida-editor/parts/part1-edizione.html`,
**dopo** la §7 "Spazi e altro" (diventa §8; `build_pdf.py` rinumera da solo).
Usa `class="action"` (voce del catalogo di markup) con `<span class="glyph">`.
Contenuti:
- **Quando**: si marca solo il vocabolario in tabella (rimanda a
  `docs/tassonomia-funzioni-cultuali.md` §5), non il lessico generico; gli epiteti
  restano in `persName`/`rs type="epithet"` (NON `<w>`).
- La **regola unica**: "chi è il soggetto, il dio o l'uomo?" → tabella delle 5 famiglie.
- Il flag `#formula` (parola in locuzione fissa) — si aggiunge, non sostituisce.
- Le sotto-funzioni fini non si scelgono: derivano dal lemma.
- `@cert="low"` per forme integrate (dentro `[ ]`).
- Esempio XML (usa `&lt;`/`&gt;`, greco in `<span class="greek">`):
  `<w lemma="ἀνατίθημι" ana="#atto-cultuale" lemmaRef="…">ἀνέθηκεν</w>` e la variante
  formula con `<rs type="cultFormula">`.
- `<div class="callout warn">`: un `<w>` dentro `persName`/`supplied` è quasi sempre un errore.

Poi ricompila il PDF (venv WeasyPrint, vedi README), **verifica a video** indice +
sezione nuova con `pdftoppm`, e consegna il PDF con `SendUserFile`.

## Verifica (tutti i task)

1. `npx tsc --noEmit -p tsconfig.json` deve passare.
2. Preview **build statica**: `preview_start` con config `star-static-dev`
   (`VITE_STATIC_BUILD=true`), password del gate = `test`. Rigenera lo snapshot
   prima: `npx tsx scripts/build-corpus-snapshot.ts`.
3. Editor: apri una scheda in "Editor XML", sezione Edizione, seleziona una parola
   greca, applica "Funzione cultuale (parola)", verifica che produca il `<w>` giusto
   e che il validatore non dia falsi errori. Prova una selezione che attraversa un
   `<lb>`.
4. Vista dati: apri «Lessico cultuale», verifica che i 298 tag del corpus siano
   contati e raggruppati; clicca un lemma → deve portare alle schede.
5. Screenshot a corredo.

## Note e limiti noti da NON reintrodurre

- Alcuni composti nel corpus hanno il lemma semplice (`προσαμαρτάνω`→`ἁμαρτάνω`,
  `κόλασις`→`κολάζω`): è un debito noto, il validatore lo segnala come warning, non
  bloccarlo.
- `#formula` e i wrapper `<rs type="cultFormula">` sul corpus **non sono ancora
  applicati** (solo `<w>` singoli): l'azione 2b serve a farli d'ora in poi a mano.
- Le righe `cert=low` / dentro `<supplied>` sono state saltate dall'applicazione
  automatica: si taggano a mano quando serve.
