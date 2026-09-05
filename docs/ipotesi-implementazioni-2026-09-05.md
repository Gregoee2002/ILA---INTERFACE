# Ipotesi di implementazione — 2026-09-05

Non è un piano di lavoro (quello è [`piano-2026-09-05.md`](piano-2026-09-05.md), e
resta valido): è l'elenco delle **cose che si potrebbero costruire** e che oggi non
sono in coda a nessuno. Ogni voce dice cosa, perché, dove si tocca, quanto costa e
che cosa la blocca. Nessuna è stata iniziata.

## Punto di partenza

L'albero di lavoro ha **quattro file non committati** che implementano il merge
LARES progettato in [`merge-lessico-lares.md`](merge-lessico-lares.md):
`cultLexicon.ts` (tabella `LEMMA_TOOLBOX`, 47 lemmi su 54 + `checkToolboxTable`),
`laresToolbox.ts` (voci innestate con `fonte: 'ILA'` + `validateToolboxPath`),
`leidenMarkup.ts` (`@type`/`@subtype` derivati dal lemma + validazione),
`litMarkup.ts` (il `<w>` cultuale entra nell'indice toolbox). `tsc --noEmit` è verde.
Il merge però oggi **non si vede da nessuna parte nell'interfaccia**: scrive
attributi che nessun pannello legge. È il presupposto dell'ipotesi 3.

---

## 1. Banco di prova per le librerie pure (vitest)

**Cosa.** Il progetto non ha **un solo test**. `checkToolboxTable()` è documentata
«usata dai test»; quei test non esistono. Aggiungere `vitest` e coprire le librerie
che sono funzioni pure e già isolate: `leidenMarkup` (round-trip Leiden → EpiDoc →
token → Leiden, e i casi limite già costati bug: `[--- αβγ]`, xml:id NCName,
integrazione a ridosso di lacuna), `validateEditionTokens`, `cultLexicon`
(`matchCultLemma` sulle forme flesse) + `checkToolboxTable`, `italianNumbers`,
`textNorm`, `chronology`.

**Perché.** È l'unica ipotesi che rende *più economico tutto il resto*: la
collazione (2), il tagging del lessico (B3), i codemod del runner notturno. Oggi
l'unico cancello è `tsc`, che non sa nulla di epigrafia.

**Dove.** `vitest` in devDependencies, `src/lib/*.test.ts`, `npm run test` dentro
`lint`. Nessun file di produzione toccato.

**Costo.** Mezza sessione lo scaffolding + i primi 30 casi. **Blocchi:** nessuno.
**Rischio:** nullo.

## 2. Collazione assistita su Lane — il modo di sbloccare A1

**Cosa.** Uno script che allinea il testo di ogni scheda al testo di Lane estratto
con `pdftotext -layout` (già verificato estraibile), normalizza entrambi con
`textNorm`, e produce un rapporto per scheda: distanza, diff carattere per
carattere, e **classificazione dell'errore** (confusioni di lettera tipo σ/ν e
ζ/ξ, numerali, spiriti e accenti, righe saltate, punteggiatura di apparato).
In interfaccia: `XmlDiffViewer` esiste già e mostra due colonne — riusarlo per la
vista ILA / Lane.

**Perché.** A1 chiede se ~200 schede su 295 hanno un errore di trascrizione, e la
risposta prevista costa una collazione a campione di 30 schede *a mano*. Con lo
screening automatico il campione serve solo a **tarare il rumore**: le 295 schede
vengono triagiate tutte, e la revisione umana va dove il diff segnala qualcosa.

**Attenzione.** Non è un oracolo: l'allineamento su un PDF a colonne sbaglia, e il
testo di Lane con le sue parentesi non è il testo EpiDoc. Va usato come *segnalatore*,
mai come correttore automatico — nessuna scrittura sul corpus.

**Dove.** `scripts/collate-lane.ts` (+ riuso di `textNorm`, `xmlUtils`), rapporto in
`docs/collazione-lane-<data>.csv`.

**Costo.** Una sessione per lo script, una per leggere il primo rapporto.
**Blocchi:** nessuno tecnico — è anzi la via più corta per rispondere ad A1.

## 3. Navigazione per percorso LARES

**Cosa.** Un albero dei sette item → categorie → sottocategorie con i conteggi
reali sul corpus, che filtra il catalogo; e sulla scheda, accanto alla resa viola
del lessico cultuale, l'etichetta del percorso. Le voci con `fonte: 'ILA'` marcate
come tali, così resta visibile cosa è nostro e cosa è della griglia di redazione.

**Perché.** Senza questo, il merge dell'ipotesi 0 è lavoro invisibile: scrive
`@type`/`@subtype` in XML che nessuno legge. Ed è la funzione che rende il corpus
interrogabile *per concetto* («tutte le espiazioni», «tutti gli atti di
registrazione su pietra»), che è poi la ragione per cui LARES esiste.

**Dove.** `src/lib/cultIndex.ts` (estendere l'indice al percorso), un pannello
sul modello di `CultLexiconPanel.tsx`, una faccetta in `App.tsx`.

**Costo.** Una sessione. **Blocchi:** il tagging del corpus (B3) — l'albero funziona
subito ma resta quasi vuoto finché le schede non sono marcate.

## 4. Concordanza KWIC greca

**Cosa.** La ricerca oggi restituisce **schede**; una concordanza restituisce
**occorrenze in contesto** — forma al centro, N caratteri a destra e a sinistra,
raggruppabili per lemma, ordinabili per contesto destro, esportabili in CSV.

**Perché.** È lo strumento che un epigrafista usa per primo e che il sito non ha.
Il costo è basso perché l'infrastruttura c'è già tutta: `testo_searchable`,
`normalizeGreek`, `minisearch`.

**Dove.** `src/lib/concordance.ts` + una vista; nessun dato nuovo.

**Costo.** Una sessione. **Blocchi:** nessuno.

## 5. Code splitting (D2, già censito ma mai tradotto in lavoro)

**Cosa.** `React.lazy` su `MapView`, `CooccurrenceHeatmap`, i tre editor e
`LiterarySourcesPanel`; `leaflet` e `jspdf` in chunk separati.

**Perché.** 1,60 MB minificati (446 KB gzip) per aprire un catalogo. Il grosso è
codice che il visitatore medio non apre mai: mappa, heatmap, editor gated.

**Dove.** `App.tsx`, `vite.config.ts` (`manualChunks`).

**Costo.** Mezza sessione, misurabile prima/dopo. È un lavoro adatto al runner
notturno. **Rischio:** basso, ma serve un fallback visibile durante il caricamento —
si incrocia col task 023 (`role="status"`).

## 6. Un cancello solo sul dato (sblocca A2 senza deciderla al buio)

**Cosa.** `scripts/data-sync-report.ts`: confronta `src/data/corpus/` con la repo
dati `Gregoee2002/ILA`, riconcilia i due naming (`CMRDM-*` ↔ `ILA-NNN`), e stampa
chi ha più schede, quali file divergono e in che campi. Più una guardia al boot del
dev server che **rifiuta di sincronizzare** se la repo remota ha meno schede di
quelle locali.

**Perché.** A2 è ferma perché nessuno sa quale repo vince; ma è una domanda a cui
si risponde guardando i file, non decidendo. E la guardia elimina il modo in cui
finora si sono persi fix XML (il boot-sync che riporta indietro il corpus).

**Costo.** Mezza sessione. **Blocchi:** nessuno; sblocca B1, B2, B3, B4, B7.

## 7. Validazione del corpus in CI (task 010, esteso)

**Cosa.** Su ogni push: `tsc`, well-formedness XML, `scripts/validate.py` (RNG
EpiDoc), `scripts/lint-corpus.py`, `checkToolboxTable()`, e i test dell'ipotesi 1.

**Perché.** Il corpus è la cosa che non si può rompere, ed è l'unica senza rete.

**Blocchi:** **D1** — il PAT senza scope `workflow` (un minuto di lavoro tuo).
Finché resta così la patch dorme in `docs/patches/`.

## 8. Permalink citabili ed esportazioni

**Cosa.** URL profondo per scheda (`?scheda=ILA-042`, oggi lo stato è solo in
memoria), un riquadro «cita così» con la forma canonica, scarico dell'XML della
singola scheda e dell'intero corpus (TEI + CSV), `JSON-LD` in testa alla pagina.

**Perché.** Un corpus che non si può citare per riferimento stabile non entra in
bibliografia altrui. Su sito statico è tutto fattibile senza server.

**Dove.** `App.tsx` (stato ↔ query string), `apiShim.ts` per lo scarico —
ricordando che **il bersaglio vero è la build statica**, non `server.ts`.

**Costo.** Una sessione. **Blocchi:** la forma canonica della citazione dipende da
**D4** (norme bibliografiche), ma il permalink e lo scarico XML no.

---

## Ordine per rapporto valore/costo

| | ipotesi | costo | sblocca |
|---|---|---|---|
| 1 | **6** — cancello sul dato | ½ sessione | A2, e con essa B1-B4, B7 |
| 2 | **2** — collazione assistita | 2 sessioni | A1, la decisione più grossa aperta |
| 3 | **1** — banco di prova | ½ + | 7, e ogni lavoro sul markup |
| 4 | **4** — concordanza KWIC | 1 | niente, ma è la funzione più richiesta |
| 5 | **5** — code splitting | ½ (runner) | — |
| 6 | **3** — navigazione LARES | 1 | rende visibile il merge; attende B3 |
| 7 | **8** — permalink ed export | 1 | parziale su D4 |
| 8 | **7** — CI sul corpus | ½ | fermo su D1 |

Le prime tre non dipendono da nessuna decisione editoriale: si possono fare domani.
