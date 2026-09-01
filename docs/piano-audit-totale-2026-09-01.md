# Piano audit totale ILA — 2026-09-01

> **Nota sul modello.** L'incarico prevedeva Opus con impegno medio. Questo run è stato
> eseguito da **Claude Sonnet** (`claude-sonnet-5`) con impegno medio. Metodo e perimetro
> invariati; segnalato come richiesto dalla skill.

Questo documento è il deliverable originale del run di audit. Ogni rilievo ha un ID stabile
(`BUG-nn`, `DATA-nn`, `UI-nn`) richiamato dal piano di lavoro nella Parte 4.

---

## 0. Stato di esecuzione — aggiornato 2026-09-01

Sessioni eseguite (Claude Sonnet, in autonomia) e pushate su `main`:

| Sessione | Stato | Note |
|---|---|---|
| S1 — igiene TS & gate CI | ✅ fatta | `tsc` con `noUnused*`/`noFallthrough`; ~45 simboli morti rimossi; ESLint minimale (react-hooks) attivo; file/branch morti rimossi. Lo step `tsc` in `deploy-pages.yml` è in `docs/patches/S1-deploy-pages-tsc-gate.patch` (token senza scope `workflow`). |
| S2 — parità apiShim/server | ✅ fatta | BUG-01/06/08/09. |
| S3 — reset ErrorBoundary | ✅ fatta | BUG-02: prop `resetKeys`. |
| S4 — rimozione RAW_DATA | ✅ fatta | BUG-05/DATA-07: `src/data.ts` rimosso, stato d'errore esplicito. |
| S5 — lessico teonimi/epiteti | ⚠️ parziale | `textNorm.ts` unico + `epithetAliases.ts` (varianti grafiche, 64→60). Casi editoriali (Dionysos, patronimici, granularità teonimi) → `docs/piano-audit-dati-da-fare.md`. |
| S6 — ILA-294, TM, tassonomia | ✅ fatta | `src/data/corpus/` è gitignored: ILA-294 corretto in locale + `docs/patches/ILA-294.xml.fixed`, da applicare sulla repo dati. CSV e tassonomia committati. |
| S7 — snapshot in build | ✅ fatta | `prebuild` rigenera `public/corpus-snapshot.json`. |
| S8 — design token stato/tema | ⚠️ parziale | Token `--danger/--warning/--success/--info` + `.light` + `--parchment-rgb` + anti-FOUC + PasswordGate. Codemod dei ~230 usi `text-red/amber` e palette mappa → `docs/piano-audit-ui-da-fare.md`. |
| S9 — primitivi di componente | ❌ da fare | Richiede confronto screenshot per gruppo. Vedi `docs/piano-audit-ui-da-fare.md`. |
| S10 — focus & stati | ⚠️ parziale | Pavimento `:focus-visible` (UI-15) + fix fallback `--accent` (UI-14). UI-17 (z-index felt) e UI-18 (rami vuoti) → doc. |
| S11 — tipografia & ritmo | ❌ da fare | Vedi `docs/piano-audit-ui-da-fare.md`. |
| S12 — perf & storage | ✅ fatta | BUG-15 (parseCache), BUG-14 (`pushJsonFileWithRetry`), BUG-07 (retry su 5xx/429/403 rate-limit). |

Code: `npx tsc --noEmit` pulito con i flag nuovi, `npm run lint` (tsc+eslint) 0
errori, `npm run build` ok.

---

## 1. Sommario esecutivo

| Voce | Esito |
|---|---|
| `npm install` | ok (nessuna modifica a `package-lock.json`; `npm audit`: 11 vuln. — 3 low, 2 moderate, 6 high — tutte in dev-deps di build) |
| `npx tsc --noEmit` | **pulito**, exit 0, nessun output |
| `npm run build` (`vite build` + `esbuild server.ts`) | **ok**, exit 0. Unico warning: chunk `index-*.js` da **1,60 MB** minificati (gzip 446 KB) sopra la soglia 500 KB |
| Campione verifica rilievi Catalogo (`docs/audit-catalogo-ui-2026-09-01.md`) | 6/6 risultano **già risolti** nel codice attuale (dettaglio §2) |

### Conteggio rilievi

| Parte | Alta | Media | Bassa | Totale |
|---|---|---|---|---|
| 1 — Bug e criticità | 0 | 6 | 9 | **15** |
| 2 — File dati derivati | 0 | 3 | 6 | **9** |
| 3 — Coerenza grafica | 0 | 6 | 12 | **18** |
| **Totale** | **0** | **15** | **27** | **42** |

Nessun rilievo di gravità **Alta**: la passata di correzione del 2026-09-01 sul Catalogo ha
già assorbito i problemi acuti (Error Boundary assente, `RangeError` su `quantity` negativo,
navigazione `redirect-catalog` rotta, tastiera assente in lista/heatmap). Ciò che resta è
sistemico e a bassa urgenza ma ad alto valore di consolidamento.

### I 5 problemi più gravi

1. **`DATA-01` — Vocabolario epiteti non normalizzato.** Le `<keywords scheme="epiteti">` del
   corpus contengono 64 valori distinti con coppie di varianti grafiche/flessive non unite
   (`Askaenos`/`Askainos`, `Axiottenos`/`Axiettenos`/`Axitenos`/`Axittenos`,
   `Tiamos`/`Tiamou`, `Motelleites`/`Motyleites`, `Selmeenos`/`Selmenos`,
   `Labanas`/`Labanes`, `Atimitis`/`Atimis`, `Hosios`/`Hoseos`…), leakage di nomi composti
   (`Artemidorou Axiottenos`, `Artemidorou Axiotta`, `Artemidorou Dorou`) e almeno una
   probabile misclassificazione (`Dionysos` come epiteto, 1×). **Non esiste alcun
   meccanismo di canonicalizzazione degli epiteti** (`divinityAliases.ts` copre solo i
   teonimi, con la sola voce `Apollon → Apollo`). Impatto diretto su `DivinityEpithetIndex`,
   `epithetIndex.ts`, `CooccurrenceHeatmap`, filtro epiteti di `MapView` e sul pull di
   testimonianze epigrafiche dei saggi (`fontiLetterarie.ts` → `chiaviCorpus`).

2. **`BUG-03` + `BUG-04` — Nessun gate di tipo nel deploy, `tsconfig` permissivo.**
   `.github/workflows/deploy-pages.yml` esegue solo `npx vite build`: un errore `tsc`
   verrebbe comunque deployato. `npm run build` stesso non lancia `tsc`. In più
   `tsconfig.json` non ha `strict`, `noUnusedLocals`, `noFallthroughCasesInSwitch`,
   `noImplicitAny`: il `case 'w'` duplicato del Catalogo è stato intercettato solo da
   esbuild, l'import morto `Appunto` in `App.tsx` non è segnalato da nulla.

3. **`BUG-02` — `ErrorBoundary` attorno a `EpiDocRenderer` non si resetta.** I due
   confini d'errore (`App.tsx:7413` e `:7671`) non hanno `key`/`resetKeys` legati a
   `entryId`. Dopo la prima scheda con testo che lancia in render, il confine resta
   **bloccato sul fallback a testo grezzo** per tutte le schede successive della sessione,
   finché il sottoalbero non viene rimontato.

4. **`BUG-01` — `apiShim.handleRequest` parse del body fuori dal `try`.**
   `const body = init?.body ? JSON.parse(init.body as string) : undefined;` (riga 215) è
   **fuori** dal `try/catch` che parte a riga 217: un body malformato (o non stringa)
   fa **rigettare** la `fetch` intercettata con un `SyntaxError` grezzo invece di
   restituire un `400` JSON. Divergenza dal server Express (`express.json()` → 400).

5. **`UI-01` — Nessun token semantico di stato.** ~150 colori di stato ad-hoc
   (`text-red-500` ×25, `text-amber-{400,500,600,700,800}` sparsi su 5 tonalità,
   `bg-red-500` ×9, `text-green-600` **e** `text-emerald-600` entrambi per "successo"),
   più hex cablati `#E08585` (`PasswordGate` ×3) e `#B0233F` (`index.css`). Nessuna
   custom property `--danger` / `--warning` / `--success` in `src/index.css`.

---

## 2. Metodo e perimetro

### Cosa è stato verificato

- **Build reale:** `npm install`, `npx tsc --noEmit`, `npm run build` — output integrale in
  Appendice.
- **Superfici lette staticamente (integrali o quasi):** `src/lib/apiShim.ts`,
  `src/types.ts`, `src/index.css`, `scripts/build-corpus-snapshot.ts`,
  `.github/workflows/deploy-pages.yml`, `src/lib/epithetIndex.ts`,
  `src/lib/divinityAliases.ts`, `src/lib/utils.ts`, `src/lib/staleChunkGuard.ts`,
  `src/lib/searchIndex.ts` (testata), `src/components/ErrorBoundary.tsx`,
  `src/components/PasswordGate.tsx`, `src/data/fontiLetterarie.ts` (struttura + integrità id),
  `src/data.ts`, `src/data/monumenti.xml`, `src/data/appunti.xml`,
  `src/data/bugs.json`, `src/data/iconography-vocab.json`, `src/data/flags.json`,
  `docs/taxonomy-cult-functions.xml`, `docs/audit-catalogo-ui-2026-09-01.md`.
- **`src/App.tsx` (7750 righe):** letta a intorni sui punti caldi via grep
  (`EpiDocRenderer`/`renderNode` ~2819–3600, `handleTermClick` ~4070, tema ~3880–3920,
  `ErrorBoundary` ai punti d'uso, RAW_DATA fallback ~4333). **Non** letta riga per riga.
- **`server.ts`:** solo elenco route e punti di parsing body, per confronto di parità con
  `apiShim.ts`.
- **Corpus (`src/data/corpus/`, 295 file):** solo analisi **strutturale** via script Node —
  presenza/unicità di `<idno type="id">` e `<idno type="entryId">`, estrazione dei
  vocabolari `<keywords scheme="epiteti"/"divinita">` e `<rs type="epithet">`, confronto
  byte-per-byte con `public/corpus-snapshot.json`, confronto TM con `concordanza_TM.csv`.
  **Nessun audit per-scheda** dei contenuti.
- **Grep sistematici** su tutto `src/`: `.repeat(`, `JSON.parse`, `new RegExp(`,
  `TODO/FIXME/@ts-ignore/eslint-disable`, `focus-visible|focus:ring`, colori Tailwind di
  stato, `rounded-*`, `duration-*`, pattern di padding dei bottoni, hex cablati nei
  componenti, uso di `--lit`/`--cult`.

### Comandi eseguiti

```
node --version           # v24.15.0
npm --version            # 11.12.1
npm install              # up to date
npx tsc --noEmit         # exit 0, nessun output
npm run build            # exit 0 (vedi Appendice)
```

Più ~15 script Node one-shot di sola lettura per l'analisi dati (nessuna scrittura).

### Non-goal espliciti

- Nessuna modifica a codice applicativo o file dati; nessun `git add`/commit/push.
- Nessun audit per-scheda dei 295 XML.
- I ~70 rilievi di `docs/audit-catalogo-ui-2026-09-01.md` **non** vengono riproposti.
- Analisi delle route AI (`/api/translate`, `/api/drafts/*`) solo per parità apiShim/server,
  non nel merito.

### Esito del campione di verifica sui rilievi Catalogo

Verificati a campione 6 rilievi rappresentativi di `docs/audit-catalogo-ui-2026-09-01.md`
(sezione "Interventi eseguiti — 2026-09-01"). **Tutti e 6 risultano risolti nel codice attuale:**

| Rilievo Catalogo | Stato verificato |
|---|---|
| `case 'w'` duplicato nello switch EpiDoc | **Risolto** — una sola occorrenza di `case 'w': {` in `App.tsx:3367` |
| Nessun Error Boundary in `src/` | **Risolto** — `src/components/ErrorBoundary.tsx` esiste, 5 usi in `App.tsx` (vedi però `BUG-02` per il reset mancante) |
| Nessun code-splitting | **Risolto** — `lazy(() => import('./components/MapView'…))` e `SectionEditorView` in `App.tsx:66,74`; bundle 2,15 MB → 1,60 MB |
| Logo PNG 814 KB eager | **Risolto** — `src/assets/images/ila-logo.webp` (120 KB), `.png` rimosso |
| Contatore risultati non `aria-live` / stato vuoto assente | **Risolto** — `role="status" aria-live="polite"` su `App.tsx:5987`, ramo vuoto `:6230` |
| `redirect-catalog` non chiama `setActiveView('catalog')` | **Risolto** — presente in `handleTermClick` (`App.tsx:4072-4075`) |
| `--cult` sotto soglia AA in tema chiaro | **Risolto** — `--cult: #6F5285` in `index.css:10` (dark `#C3B0CE`) |

---

## 3. Parte 1 — Bug e criticità

Ordinati per gravità.

| ID | Area | File:riga | Gravità | Descrizione | Come si riproduce | Fix proposto | Rischio di regressione |
|---|---|---|---|---|---|---|---|
| **BUG-01** | apiShim ↔ server | `src/lib/apiShim.ts:215` | Media | Il parse del body (`JSON.parse(init.body as string)`) è **fuori** dal `try/catch` che parte a riga 217. Body malformato o non-stringa → la `fetch` intercettata rigetta con `SyntaxError` grezzo invece di `400 JSON`. Il server Express restituisce `400` via `express.json()`. | Da console del sito statico: `fetch('/api/flags',{method:'POST',body:'{oops'})` → promise rejected, nessuna Response. | Spostare il parse dentro il `try`, e su fallimento `return json({error:'Body JSON non valido'},400)`. Gestire anche `typeof init.body !== 'string'`. | Bassa — nessun chiamante interno passa body non-JSON; cambia solo il ramo d'errore. |
| **BUG-02** | Rendering markup | `src/App.tsx:7413`, `src/App.tsx:7671` | Media | I due `<ErrorBoundary>` attorno a `EpiDocRenderer` non hanno `key`/`resetKeys`. React non resetta da solo un error boundary: dopo la prima scheda il cui `testo` lancia in render, il confine resta sul fallback `<pre>` a testo grezzo per tutte le schede successive finché il sottoalbero non viene rimontato. | Aprire una scheda con XML edizione che fa lanciare `renderNode` (es. entità malformata non gestita), poi navigare a una scheda ben formata nello **stesso** pannello dettaglio: continua a mostrare il fallback. | `key={selectedMonumento?.entryId ?? selectedMonumento?.id}` sul `<ErrorBoundary>` del pannello pergamena; per la card `:7671` `key={m.entryId}`. In alternativa aggiungere `resetKeys` a `ErrorBoundary`. | Bassa. |
| **BUG-03** | Build / CI | `.github/workflows/deploy-pages.yml:56`, `package.json:9` | Media | Il deploy esegue solo `npx vite build`; `npm run build` = `vite build && esbuild …`, **nessun `tsc`**. Un errore di tipo viene deployato. Lo script `lint` (`tsc --noEmit`) non è chiamato da nessun hook né dalla CI. | Introdurre un errore di tipo in un file non toccato dal tree-shaking di Vite → `npm run build` passa, il sito si deploya. | Aggiungere uno step `- run: npx tsc --noEmit` prima di `npx vite build` nel workflow; opzionale `prebuild` in `package.json`. | Nulla (solo aggiunge un controllo). |
| **BUG-04** | TypeScript config | `tsconfig.json` | Media | Nessuna delle opzioni di rigore: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitAny`. Il `case 'w'` duplicato è stato preso solo da esbuild; l'import `Appunto` in `App.tsx:59` è morto e non segnalato; molte funzioni `(node: any)` nel renderer. | `grep -n "Appunto" src/App.tsx` → solo la riga di import. `tsc` non se ne accorge. | Passo 1 (sicuro): `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Passo 2 (separato, grande): `strict`/`noImplicitAny` su `App.tsx`. | Passo 1: basso (rimuove import/var morte). Passo 2: alto — pianificato come sessione a sé. |
| **BUG-05** | Codice morto / fallback fuorviante | `src/data.ts`, `src/App.tsx:60,4333-4337` | Media | `RAW_DATA` è un dataset legacy di ~46 voci (id 2–49), testo **in inglese** e con OCR corrotto, schema `Monumento` vecchio. È ancora `import`-ato in `App.tsx` e usato come fallback se `fetch('/api/monumenti')` fallisce (`setMonumenti(RAW_DATA)`). Sulla build statica, un fallimento del fetch dello snapshot mostrerebbe **silenziosamente** un corpus falso di 46 schede invece di un errore. | Simulare `installApiShim()` che lancia (snapshot 404) e poi un errore nel primo load: la UI mostra 46 schede inglesi. | Sostituire il fallback con uno stato d'errore esplicito ("Corpus non caricato"). Ridurre `src/data.ts` a `export const RAW_DATA: Monumento[] = []` o rimuoverlo del tutto (alleggerisce anche il bundle). | Bassa — il ramo è raggiunto solo in caso di errore già anomalo. |
| **BUG-06** | Rendering markup | `src/App.tsx:3103` vs `src/components/MarkupText.tsx:92`, `src/components/EditionMarkupEditor.tsx:531` | Bassa | Il numero di puntini per `<gap reason="illegible" quantity=N>` è limitato a **40** in `App.tsx` e a **12** negli altri due renderer. Lo stesso markup rende in modo diverso nei due percorsi (`EpiDocRenderer` vs `MarkupText`). I tre punti sono comunque protetti da `quantity` negativo (guardia `qn > 0` in App, `Math.max(...,1)` negli altri). | Scheda con `quantity="30"`: pergamena mostra 30 puntini, anteprima editor ne mostra 12. | Estrarre `const GAP_DOTS_MAX = 20` in un modulo condiviso e usarlo nei tre punti. | Bassa (solo estetica). |
| **BUG-07** | race / async | `src/lib/githubStorageBrowser.ts:176-199` (e 249/299/349/404) | Bassa | Il retry di `pushCorpusFile` scatta solo su `isRaceConflict` (409/422). Un `403` di **secondary rate limit** o un `5xx` non vengono ritentati: `throw` immediato. Con `WRITE_CONCURRENCY=4` su ~295 file ("Riordina ID") il rate limit secondario di GitHub è plausibile → la richiesta torna `status:"partial"` con molti `failures`. | "Riordina ID" su tutto il corpus con token a rate limit quasi esaurito. | Aggiungere `res.status === 403 && header X-RateLimit-Remaining === '0'` e `res.status >= 500` ai casi ritentabili, con backoff più lungo (`Retry-After` se presente). | Bassa. |
| **BUG-08** | apiShim ↔ server | `src/lib/apiShim.ts:343` | Bassa | `GET /api/corpus/files` restituisce sempre `modified: new Date().toISOString()`. Il server restituisce l'mtime reale del file. Qualunque colonna/tooltip "ultima modifica" sulla build statica è priva di significato. | Aprire la lista file corpus (editor mode) sul sito statico: tutte le date sono "adesso". | Restituire un campo `modified` assente/`null` e gestire l'assenza lato UI, oppure documentare esplicitamente che sullo statico non è disponibile. | Bassa. |
| **BUG-09** | Rendering markup | `src/App.tsx:7672` | Bassa | Il secondo `EpiDocRenderer` (vista card compatta) è invocato **senza** `onTermClick`: i termini cliccabili (persName/placeName/divinità) sono inerti lì, mentre nella pergamena aprono popover/redirect. Incoerenza d'interazione fra due viste della stessa scheda. | Cliccare un nome nel testo della card compatta: non succede nulla. | Passare `onTermClick={handleTermClick}` anche lì, oppure rendere il testo non-interattivo in modo evidente (cursore normale) e documentarlo. | Bassa. |
| **BUG-10** | Lint / tooling | `package.json:11` | Bassa | `"lint": "tsc --noEmit"` — nessun ESLint. Eppure il codice contiene 8 direttive `// eslint-disable-next-line react-hooks/exhaustive-deps` (`App.tsx`, `SectionEditorView.tsx`, `LiterarySourcesPanel.tsx`): sono **inerti**, la regola non è mai verificata. `@firebase/eslint-plugin-security-rules` è in devDeps ma senza `eslint` core né config. | `npm run lint` non lint-a nulla oltre ai tipi. | Aggiungere `eslint` + `eslint-plugin-react-hooks` con config minima, oppure rimuovere le direttive morte e documentare che non si usa ESLint. | Bassa. |
| **BUG-11** | Codice / dati morti | `src/data/appunti.xml`, `src/data/monumenti.xml`, `src/assets/images/epigraphy_logo_1783963444443.jpg`, `src/App.tsx:59` | Bassa | `appunti.xml` (`<notes></notes>` vuoto) non è referenziato da nessuna parte. `monumenti.xml` è usato solo da `server.ts:318-320` come `LEGACY_FILE` di migrazione (mai da `apiShim.ts`): peso storico. Il tipo `Appunto` è importato in `App.tsx` ma non usato. `epigraphy_logo_1783963444443.jpg` è un logo residuo non referenziato. | grep dei rispettivi nomi in `src/` → nessun uso (o solo `server.ts`). | Rimuovere `appunti.xml`, `epigraphy_logo_*.jpg`, l'import `Appunto`; valutare se `monumenti.xml`+ramo `LEGACY_FILE` servono ancora (corpus ormai popolato). Le rimozioni di XML vanno rispecchiate anche su `Gregoee2002/ILA` se lì presenti. | Bassa (verificare che `server.ts` `LEGACY_FILE` non sia un percorso di boot ancora usato in locale). |
| **BUG-12** | Igiene repo | `.claude/worktrees/keen-lumiere-eb8dc9`, branch locale `claude/keen-lumiere-eb8dc9` | Bassa | Worktree git orfano da una sessione Claude precedente (commit `99aae2b`), più branch locali stantii (`refactor/ila-identity`, `claude/keen-lumiere-eb8dc9`). Rumore in `git worktree list` / `git branch`. | `git worktree list` mostra due entry. | `git worktree remove .claude/worktrees/keen-lumiere-eb8dc9` + `git worktree prune`; potare i branch locali fusi/abbandonati. | Nulla. |
| **BUG-13** | Coerenza logica | `src/lib/utils.ts:19`, `src/lib/epithetIndex.ts:89`, `src/lib/searchIndex.ts:10` | Bassa | Tre normalizzatori di testo divergenti: `stripAccents` (`NFKD` + lowercase), `auditNorm` (`NFD` + `ς→σ` + collapse spazi), `normalizeGreek` (`NFD` + `ς→σ` + lowercase). `searchIndex.ts` ha già un commento che avverte del rischio di divergenza. Conseguenza: una ricerca `"Ἀξιοττηνῷ"` può non riconciliarsi con la faccetta `"Axiottenos"`. | Confrontare l'output dei tre su `"Ἀξιοττηνῷ"`. | Un solo `src/lib/textNorm.ts` con `normalizeGreek`, `foldAscii`, usato ovunque. | Media in sé (tocca ricerca + indici) — da fare come parte della sessione dati (Parte 4, S5). |
| **BUG-14** | Manutenibilità | `src/lib/githubStorageBrowser.ts:249,299,349,404` | Bassa | Quattro blocchi di retry quasi identici (`for attempt 1..3`, backoff `150*attempt`) per il push di `flags.json` / `bugs.json` / `iconography-vocab.json` / `fonti-letterarie.json`. Copia-incolla. | Lettura del file. | Estrarre `pushJsonFileWithRetry(path, content, message)` e richiamarla dai quattro punti (assorbe anche `BUG-07`). | Bassa. |
| **BUG-15** | perf | `src/lib/apiShim.ts:136-152, 154-160` | Bassa | `readCorpusFiles()` ri-parsa **tutti** i ~295 XML ad ogni `GET /api/monumenti` e dentro `updateSearchIndex()`. In editor mode, ogni `PATCH` di una singola scheda → reparse completo del corpus + ricostruzione MiniSearch. Accettabile all'avvio, pesante sul salvataggio ripetuto. | Salvare 10 schede di fila in editor mode e misurare. | Cache `Map<filename, {hash, parsed}>` in `apiShim`, invalidata per file scritto; `updateSearchIndex` incrementale se MiniSearch lo consente, altrimenti almeno riusare i `parsed` in cache. | Media (tocca il cuore dello shim) — isolare in sessione perf. |

---

## 4. Parte 2 — File dati derivati

Ordinati per gravità.

| ID | File | Gravità | Descrizione | Come si riproduce | Fix proposto | Rischio di regressione |
|---|---|---|---|---|---|---|
| **DATA-01** | `src/data/corpus/*.xml` (`<keywords scheme="epiteti">`), `src/lib/divinityAliases.ts`, `src/lib/xmlUtils.ts` | Media | Vocabolario epiteti non normalizzato: 64 valori distinti, con coppie di varianti non unite — `Askaenos`(56)/`Askainos`(3); `Axiottenos`(13)/`Axiettenos`(2)/`Axitenos`(1)/`Axittenos`(1); `Tiamos`(14)/`Tiamou`(1); `Motelleites`/`Motyleites`; `Selmeenos`/`Selmenos`; `Labanas`/`Labanes`; `Atimitis`/`Atimis`; `Hosios`/`Hoseos` (e vicino a `Chthonios`/`Katachthonios`); `Tarsene`/`Tarsios`. Leakage di composti: `Artemidorou Axiottenos`, `Artemidorou Axiotta`, `Artemidorou Dorou`, `Artemidorou`, `Diodotou` (patronimici genitivi trattati come epiteti). Probabile misclassificazione: `Dionysos` come epiteto (1×). **Nessun meccanismo di canonicalizzazione epiteti** — `divinityAliases.ts` copre solo i teonimi con la sola voce `Apollon → Apollo`. | Script Node che estrae `<term>` da `<keywords scheme="epiteti">` su tutto il corpus e raggruppa per forma normalizzata. | (a) `src/lib/epithetAliases.ts` con mappa `variante → canonico`, applicata in `xmlUtils.ts` come già si fa per i teonimi; (b) correggere sullo XML i casi non-varianti (`Dionysos`, `Artemidorou …`); (c) rigenerare/verificare gli indici. **Le correzioni XML vanno rispecchiate su `Gregoee2002/ILA`** o il boot-sync le annulla. | Media — cambia i conteggi di `DivinityEpithetIndex`, heatmap, filtro mappa; ogni alias va verificato su Lane 1971 prima di aggiungerlo. |
| **DATA-02** | `src/data/corpus/*.xml` (`<keywords scheme="divinita">`) | Media | Granularità mista dei teonimi: `Men`(234) accanto a composti `Men Tyrannos`(1), `Men Tiamos`(1), `Men Tiamou`; `Anaeitis`(4) vs `Artemis Anaeitis`(4); `Meter`(6) vs `Megale Meter`(3) vs `Meter theon`(1) vs `Magna Mater`(5) vs `Megale Meter`; `Helios Apollo Kisaulodenos`(1), `Kore Selene`(1), `Plouton Helios`(1). `buildClassificationAudit` (`neverAlone`/`divVsEpi`/`sharedEpithets` in `epithetIndex.ts`) esiste apposta per segnalarli ma nessuno forza la risoluzione; c'è **drift** rispetto all'audit Fasi 1-2 del 2026-08-22 (il corpus è stato modificato fino al 2026-08-30). | Eseguire `buildClassificationAudit` sul corpus attuale e leggere `divVsEpi` + `neverAlone`. | Passata di normalizzazione teonimi sullo XML (scelta di granularità: `Men` puro + epiteto separato, non `Men Tyrannos` come teonimo), estendendo `DIVINITY_ALIASES` dove è solo grafia. Mirror su repo dati. | Media — stessa natura di DATA-01. |
| **DATA-03** | `src/data/corpus/ILA-294.xml` | Media | Unico dei 295 file **senza `<idno type="entryId">`**. Ha inoltre `<idno type="TM"><!-- inserire TM number --></idno>` (commento come contenuto d'elemento) e nessun `<origDate>`. `entryId` è usato come chiave React, chiave del registro e path del `PATCH /api/monumenti/:entryId`: la scheda dipende dal fallback di `xmlToMonumenti`. | `for f in src/data/corpus/*.xml; do grep -q entryId "$f" || echo "$f"; done` → `ILA-294.xml`. | Assegnare `entryId` (via editor o a mano, formato `gen-…`), sostituire il commento TM con un valore o togliere l'`idno` vuoto, aggiungere `origDate`. **Mirror obbligatorio su `Gregoee2002/ILA`.** | Bassa se `entryId` è nuovo e non collide; verificare che nessuna nota di `flags.json` puntasse a un id "fantasma" per questa scheda (attualmente le 3 note di `flags.json` risolvono tutte). |
| **DATA-04** | `concordanza_TM.csv` | Bassa | 155 righe. **0 discrepanze** di TM rispetto agli `<idno type="TM">` inline del corpus (buono). Ma `ILA-002.xml` (TM `932585`) e `ILA-098.xml` (TM `792689`) hanno un TM numerico inline **non presente** nel CSV: il file non è stato rigenerato dopo quegli inserimenti. Nessun modulo in `src/`/`scripts/`/`server.ts` legge il CSV: è un artefatto di riferimento puro. | Script che confronta `file → TM` del CSV con gli `idno` inline. | Rigenerare il CSV dagli `idno` del corpus (o da `Gregoee2002/ILA`), oppure decidere di ritirarlo se non serve più. Se si tiene, aggiungere uno script `scripts/build-tm-concordance.ts` e un check in CI. | Nulla (file non consumato). |
| **DATA-05** | `docs/taxonomy-cult-functions.xml`, `docs/tassonomia-funzioni-cultuali.md` | Bassa | L'header XML dichiara *"Stato: BOZZA v2 (2026-08-30) — non ancora referenziata dalle schede"*, ma la pipeline lessico cultuale è **già viva**: `CultAttestation` in `types.ts:90-106`, `<w ana>` / `<rs type="cultTerm\|cultFormula">` nel corpus, commit recenti `feat(lessico cultuale)`. La tassonomia inoltre vive solo in `docs/`, non in un header condiviso del corpus come previsto dal commento. | Confrontare la data/stato dell'header con la presenza di `@ana="#agency"` ecc. nel corpus. | Aggiornare la riga di stato; se la marcatura è a regime, spostare la `<taxonomy>` in un header condiviso della repo dati e referenziarla, come indicato dal commento stesso. | Nulla (solo doc/allineamento). |
| **DATA-06** | `src/lib/searchIndex.ts` / `src/lib/epithetIndex.ts` / `src/lib/utils.ts` | Bassa | Vedi `BUG-13`: tre normalizzatori divergenti. Sul piano **dati** l'effetto è che ricerca full-text e faccette epiteti/divinità applicano folding diverso, quindi possono non riconciliarsi. | — | Modulo `textNorm.ts` unico. | — |
| **DATA-07** | `src/data.ts` | Bassa | Vedi `BUG-05`. Come **file dati**: schema `Monumento` obsoleto (sottoinsieme dei campi attuali), 46 voci id 2–49, prosa inglese non tradotta, OCR corrotto (`"ob, ἐπ᾽ ἀγαθῇ"`, `"€ A ~"`). Non è né corpus né snapshot: è un residuo. | Aprire `src/data.ts`. | Svuotare (`[]`) o rimuovere, insieme al ramo di fallback in `App.tsx` (`BUG-05`). | Bassa. |
| **DATA-08** | `src/data/bugs.json` (`[]`), `src/data/iconography-vocab.json` (`{}`) | Bassa | Semi vuoti: **coerente col design** (`apiShim.ts` commenta che registro/bug/vocabolario iconografico sono popolati solo da GitHub dopo `unlockEditing`). Verificato: non è un errore. Rischio residuo: sono le uniche copie versionate, senza validazione di schema — una modifica manuale malformata romperebbe `JSON.parse` in `apiShim`/`server` all'avvio in editor mode senza messaggio chiaro. | Mettere `{` in `bugs.json` e sbloccare l'editing. | Wrappare i `JSON.parse` di questi semi in try/catch con fallback a `[]`/`{}` e warning (già fatto per lo snapshot corpus e per `fonti-letterarie.json`). | Bassa. |
| **DATA-09** | `src/data/fontiLetterarie.ts:965` — `SAGGIO_SELENE.chiaviCorpus` | Bassa | `chiaviCorpus: { divinita: ['Men'], epiteti: ['Tyrannos','Askaenos','Axiottenos'] }`. Le chiavi risolvono tutte contro il corpus (verificato), ma sono le **sole forme canoniche**: per `DATA-01`, il pull di testimonianze epigrafiche del saggio **salta** le schede taggate `Askainos` / `Axiettenos` / `Axitenos` / `Axittenos`. È la conseguenza downstream concreta di `DATA-01`. | Contare le schede con epiteto `Askainos` non incluse nella sezione "Iscrizioni" del saggio Selene. | Si risolve con `DATA-01` (canonicalizzazione a monte). Nel frattempo, `chiaviCorpus` potrebbe elencare anche le varianti. | Bassa. |

### Disallineamenti corpus ↔ dati derivati

- **Epiteti / teonimi** (`DATA-01`, `DATA-02`): il disallineamento principale. Gli indici
  derivati (`epithetIndex.ts` → `DivinityEpithetIndex`, `CooccurrenceHeatmap`, filtro
  `MapView`) sono calcolati **fedelmente** dal markup, ma il markup stesso non è normalizzato,
  quindi mostrano decine di epiteti "distinti" che sono la stessa parola.
- **`fontiLetterarie.ts` ↔ corpus** (`DATA-09`): integrità interna del file ok (17 `operaId`
  referenziati, 0 orfani; nessun `testimoniaIds` rotto). Il ponte verso il corpus passa da
  `chiaviCorpus`, che eredita il problema di normalizzazione degli epiteti.
- **`iconography-vocab.json` vuoto**: `ICONOGRAPHY_LABELS` (da `src/lib/iconographyLabels.ts`)
  è quindi l'unica fonte di etichette; qualunque `key` iconografica presente nel markup del
  corpus ma assente dal seme viene mostrata come chiave grezza. Verifica strutturale, non
  per-scheda.
- **`concordanza_TM.csv` ↔ corpus** (`DATA-04`): 2 file (ILA-002, ILA-098) con TM inline non
  nel CSV; nessun mismatch attivo.

### Drift `corpus-snapshot.json`

- **Percorso reale:** `public/corpus-snapshot.json` (l'incarico cita `data/corpus-snapshot.json`
  — quel file **non esiste**; copie presenti: `public/` e `dist/`).
- **Stato attuale:** `generatedAt: 2026-08-30T23:23:14Z`. Confronto byte-per-byte con tutti i
  295 `src/data/corpus/*.xml`: **0 file mancanti, 0 in eccesso, 0 differenze di contenuto**.
  Nessun drift oggi.
- **Rischio strutturale:** `scripts/build-corpus-snapshot.ts` **non** è agganciato a
  `npm run build` né a un hook `prebuild`/`predev` — gira **solo** in
  `deploy-pages.yml`. Una build statica locale (o una preview senza dev server) serve lo
  snapshot committato così com'è: se si modificano gli XML e si builda in locale senza
  lanciare a mano lo script, la preview mostra dati vecchi. In CI il rischio è mitigato
  perché lo script gira e, se i secret `DATA_REPO_TOKEN`/`DATA_REPO` sono impostati, rilegge
  il corpus **live** dalla repo dati.
- **`fonti-letterarie.json`:** non committato (generato in CI solo se la repo dati lo
  contiene); fallback locale = seme compilato `src/data/fontiLetterarie.ts`. Corretto by design.

---

## 5. Parte 3 — Coerenza grafica

Raggruppati per tema. Ordinati per gravità dentro ogni gruppo.

### Token / tema

| ID | Gravità | File:riga | Descrizione | Correzione concreta |
|---|---|---|---|---|
| **UI-01** | Media | `src/index.css` (assenti); `src/App.tsx` e `src/components/*` (~150 usi); `src/components/PasswordGate.tsx:155,158,171` | Nessun token semantico di stato. `text-red-500` ×25, `text-amber-400` ×20 (sempre `dark:`), `text-amber-700` ×11, `text-amber-600` ×11, `text-amber-800` ×8, `text-amber-500` ×4, `text-red-{400,600,700}`, `bg-red-500` ×9, `bg-emerald-500` ×4; `text-green-600` **e** `text-emerald-600` entrambi per "successo". Hex cablati: `#E08585` (PasswordGate ×3), `#B0233F` / `#B0233F` (index.css mappa). | Definire `--danger`/`--warning`/`--success`/`--info` con coppia chiaro/scuro in `:root`/`.dark`; codemod dei colori Tailwind di stato → classi tokenizzate (`text-danger`, `bg-danger/10`…). |
| **UI-02** | Media | `src/components/PasswordGate.tsx:107-120` | Il gate ridefinisce inline la palette con valori **diversi** da `index.css :root`: parchment `#F7F4EC` vs `#F7F6F2`; sidebar `#F1EDE1` vs `#F2F1EC`; card `#FEFDFA` vs `#FEFEFC`; muted `#6E6A5E` vs `#6E6E66`; border `#E1DBC8` vs `#E1E0D8`; `--tint-2`/`--tint-4` differiscono. La schermata d'ingresso legge più calda dell'app. Il commento dichiara l'elenco "completo" ma mancano `--cult`, `--lit`, `--color-*`, `--font-*`. | Estrarre un oggetto `LIGHT_VARS` condiviso (o leggere i valori da `:root`) e usarlo qui **identico**; completare l'elenco o applicare `.light` come classe invece di ridefinire var singole. |
| **UI-03** | Media | `src/index.css:112,133,140,~250,~262` (`.glass-panel`, `.glass-card`, `.glass-card:hover`, `.nav-pill-active`, `.term-stats-popover`) | Il colore pergamena `rgba(247,247,241,…)` è cablato come **letterale** in ~8 regole invece di derivare da `--parchment`. Idem gli hover dei tint (`rgba(224,228,218,.65)` ecc. non derivati da `--tint-N`). Cambiare `--parchment` non propaga alle superfici "glass". | Definire `--parchment-rgb: 247 247 241` e usare `rgb(var(--parchment-rgb) / 0.72)`; per gli hover dei tint usare `color-mix(in srgb, var(--tint-N), white 12%)`. |
| **UI-04** | Bassa | `src/index.css:1` (`@import` Google Fonts); `src/index.css:~70` (`body::before` felt) | Asset esterni caricati a runtime: `@import url('https://fonts.googleapis.com/…')` e `background-image: url("https://www.transparenttextures.com/patterns/felt.png")`. La texture felt è una dipendenza da host terzo **senza fallback** e con costo privacy/offline; se l'host è giù, la grana sparisce. | Vendorizzare la texture (pochi KB) in `public/` e referenziarla via `import.meta.env.BASE_URL`; self-hostare o subsettare i font (o accettare `@import` documentandolo). |
| **UI-05** | Bassa | `src/index.css:~230` (`.custom-scrollbar` dark), `src/components/MapView.tsx:56,650,652,765,785-789` | `.custom-scrollbar::-webkit-scrollbar-thumb` dark usa `background:#333` cablato (non `--border`). I colori regione della mappa (`#5B7A8C`, `#B5651D`, `#7A8F5E`, `#0d5147`, `#1F8377`) e la `DENSITY_SCALE` sono in `MapView.tsx` e in parte ripetuti in `index.css` (`.marker-cluster-*`). | Thumb scrollbar → `var(--border)` (o `--muted`). Centralizzare la palette mappa in un modulo `src/lib/mapPalette.ts` e referenziarla sia da JS che, via CSS var, da `index.css`. |
| **UI-06** | Bassa | trasversale — `text-muted/50`, `/60`, `/70`, `/80` in `RegistroPanel.tsx`, `BibliographyIndex.tsx`, `PasswordGate.tsx:~230`, label di sezione in `App.tsx` | `--muted` chiaro `#6E6E66` su `--parchment` ≈ 4.6:1 (AA testo di misura). Molti usi lo abbassano con opacità `/50`–`/70`, scendendo sotto 3:1. L'audit Catalogo ha corretto i punti del renderer markup; il pattern ricorre altrove. | Vietare `text-muted/<80` per testo; se serve più tenue, definire `--muted-2` a piena opacità con contrasto verificato. |
| **UI-07** | Bassa | `src/index.css` (assente), `src/App.tsx:3894,3917` | Il tema è solo classe `.dark` pilotata da JS (`matchMedia` in React). Nessun blocco `@media (prefers-color-scheme: dark)` in CSS: al primo paint (prima dell'idratazione) un utente `theme:'system'` in dark vede comunque il tema chiaro → FOUC. | Script inline pre-idratazione in `index.html` che mette `.dark` da `localStorage`/`matchMedia` prima del primo paint, oppure un blocco `@media (prefers-color-scheme: dark) :root:not(.light) { … }` con le var dark. |

### Tipografia

| ID | Gravità | File:riga | Descrizione | Correzione concreta |
|---|---|---|---|---|
| **UI-08** | Bassa | `src/components/PasswordGate.tsx:~240` (`fontFamily:'Georgia, serif'`); `src/App.tsx:3115` (`fontFamily:'monospace'`); `src/components/ErrorBoundary.tsx:38` + fallback trascrizione (`font-mono`); `src/components/EditionMarkupEditor.tsx:707`, `src/components/LiteraryMarkupEditor.tsx:473` (`<option style={{backgroundColor:'#18181b',color:'#fff'}}>`) | Stack font definiti come `--font-serif/sans/greek` ma aggirati da one-off inline. Le `<option>` degli editor cablano un dropdown scuro che ignora il tema chiaro. | Instradare ogni `fontFamily` inline sui token; per le `<option>` usare `bg-card text-ink` (o accettare lo stile nativo del browser senti tema). |
| **UI-09** | Bassa | `src/App.tsx:7665` (`h4` reso `text-2xl`), `:7669` (`text-[9px]` label), `src/index.css:~200` (`.field-label` non usato ovunque) | Nessuna scala tipografica: titoli card `text-2xl font-bold`, label di sezione `text-[9px] uppercase`, uso di `h4` come stile visivo `2xl`. Esiste la utility `.field-label` (10px/700/uppercase/0.1em) ma non è il primitivo unico per le label. | Definire una scala (`--text-xs…-2xl` o classi `.h-section`/`.label`) e sostituire; `.field-label` come unico primitivo per le etichette di campo. |

### Spaziatura / ritmo

| ID | Gravità | File:riga | Descrizione | Correzione concreta |
|---|---|---|---|---|
| **UI-10** | Bassa | trasversale (`src/App.tsx`) | Padding dei bottoni senza scala: coesistono `px-2 py-0.5`, `px-1.5 py-0.5`, `px-4 py-1`, `px-3 py-2`, `px-3 py-1`, `px-2 py-1`, `px-4 py-2`, `px-6 py-3`, `px-3.5 py-2`, `px-5 py-2`, `px-9 py-4`, `px-7 py-4`. Raggio: `rounded-sm` ×83, `rounded-full` ×78, `rounded-lg` ×76, `rounded-xl` ×44, `rounded-2xl` ×24, `rounded-md` ×10 — 6 valori; le card mescolano `14px` (`.glass-card`), `rounded-xl`, `rounded-2xl`. | Scala a 3 passi per taglia bottone (`sm`/`md`/`lg`) applicata dal `<Button>` di `UI-12`; scala raggio a 3 valori (`--r-sm 8px` / `--r-md 14px` / `--r-lg 20px` / `full`). |
| **UI-11** | Bassa | trasversale | Durate di transizione: `duration-300` ×32, `duration-200` ×23, `duration-150` ×5, `duration-500` ×4. | Standardizzare a 2: `duration-150` (micro-interazioni) e `duration-300` (pannelli/overlay). |

### Componenti / varianti

| ID | Gravità | File:riga | Descrizione | Correzione concreta |
|---|---|---|---|---|
| **UI-12** | Media | trasversale — `src/App.tsx` (~30× `bg-accent text-white …`), `src/App.tsx:5674-5783` (7 `<select>` identici), `src/components/LiterarySourcesPanel.tsx` (`Chip` locale) | Nessun primitivo condiviso: il bottone primario è riscritto a mano ovunque, i 7 select filtri sono copia-incolla (già in `docs/audit-catalogo-ui-2026-09-01.md`, rinviato), i "chip"/"badge" hanno 3 varianti di sfondo (`bg-accent/10` vs `/5` vs `/8`), le card sono shell duplicate. | Estrarre `<Button variant size>`, `<Chip>` (promuovere quello di `LiterarySourcesPanel`), `<Badge tone>`, `<FilterSelect>`, `<Card tint>`. Consolidare progressivamente, uno per commit. |
| **UI-13** | Bassa | trasversale | Opacità dello sfondo "accent tenue" incoerente: `bg-accent/5`, `/8`, `/10`, `/50`, `/60`, `/90` per lo stesso concetto di "superficie accent discreta". | Fissare 2 livelli: `/10` (riempimento tenue) e `/90` (hover solido); il resto va sui token di `UI-12`. |
| **UI-14** | Bassa | `src/components/SectionEditorView.tsx:756`; vari `var(--accent, #2da199)` negli editor | Il fallback hex di `--accent` è `#2da199` (vecchio teal) ≠ `--accent` reale `#1F8377`. | Uniformare il fallback a `#1F8377` o rimuoverlo (la var è sempre definita in `:root`). |

### Stati & accessibilità visiva

| ID | Gravità | File:riga | Descrizione | Correzione concreta |
|---|---|---|---|---|
| **UI-15** | Media | `src/index.css` (assente); conteggio `focus-visible`/`focus:ring`: `App.tsx` 14, `SectionEditorView` 12, editor 6-7, `CultLexiconPanel`/`CooccurrenceHeatmap`/`MapView`/`LiterarySourcesPanel` 1, **0** in `BibliographyIndex`, `DivinityEpithetIndex`, `IconographyPanel`, `LiteraryEchoes`, `PleiadesMap`, `RegistroPanel`, `RegistroForm`, `BugReportsPanel`, `DraftReviewPanel`, `XmlDiffViewer`, `MarkupText` | Stato di focus visibile assente sulla gran parte della UI non-Catalogo. L'audit Catalogo ha aggiunto il focus a righe lista / celle heatmap ma il resto dell'app resta senza. | Regola di base in `index.css @layer base`: `:where(a,button,[role="button"],input,select,textarea,[tabindex]):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: inherit; }` come pavimento, poi rifiniture per componente. |
| **UI-16** | Bassa | `src/components/PasswordGate.tsx:172,190` (`disabled:opacity-40`) vs resto (`disabled:opacity-50`) | Opacità dello stato disabled incoerente. | Un unico valore (`disabled:opacity-50`) nel `<Button>` di `UI-12`. |
| **UI-17** | Bassa | `src/index.css:~78` (`body::before { z-index: 100 }`), popover/dialog a `z-50`/`z-[55]` | La grana felt è a `z-index:100`; overlay e popover sotto `z-100` (`.term-stats-popover`, dialoghi scheda) rendono **sotto** la texture (effetto sottile ma presente). | Portare `body::before` a `z-index:0` (o dietro il contenuto con un wrapper) e alzare i livelli di overlay in una scala z coerente (`--z-overlay 1000`, `--z-popover 1100`, `--z-toast 1200`). |
| **UI-18** | Bassa | `src/components/RegistroPanel.tsx`, `DraftReviewPanel.tsx`, `BugReportsPanel.tsx`, `IconographyPanel.tsx` | Diversi pannelli non hanno un ramo esplicito vuoto/loading (l'audit Catalogo ha coperto solo la lista schede). | Ramo `role="status"` con messaggio ("Nessuna voce nel registro", "Caricamento…") coerente con quello aggiunto al Catalogo. |

---

## 6. Parte 4 — Piano di lavoro per sessioni

Principi: sessioni il più possibile **indipendenti e committabili singolarmente**; prima
quelle a **rischio basso / sblocco alto**. Ogni rilievo delle Parti 1-3 è preso in carico da
almeno una sessione. Stima dimensione: **S** ≈ mezza giornata, **M** ≈ 1 giornata, **L** ≈ 2+
giornate.

Ordine consigliato: **S1 → S2 → S3 → S4 → S7** (codice/CI, indipendenti tra loro) in
parallelo concettuale con **S5 → S6** (dati); poi **S8 → S9 → S10 → S11** (UI, in
quest'ordine per dipendenza sui token); **S12** in coda.

---

### Sessione 1 — Igiene TypeScript & gate CI
- **Obiettivo:** un errore di tipo non può più essere deployato; rimossi codice e file morti.
- **File toccati:** `tsconfig.json`, `.github/workflows/deploy-pages.yml`, `package.json`,
  `src/App.tsx` (import `Appunto`), `src/data/appunti.xml` (rm),
  `src/assets/images/epigraphy_logo_1783963444443.jpg` (rm), worktree/branch git.
- **Rilievi inclusi:** `BUG-03`, `BUG-04` (solo passo 1: `noUnusedLocals` +
  `noUnusedParameters` + `noFallthroughCasesInSwitch`), `BUG-10`, `BUG-11`, `BUG-12`.
- **Criteri di accettazione:** `npx tsc --noEmit` pulito con i nuovi flag; il workflow
  fallisce se si introduce un errore di tipo (verificato su un branch usa-e-getta);
  `git worktree list` mostra una sola entry; `grep -rn "Appunto" src/App.tsx` → solo
  eventuale rimozione; `npm run build` invariato.
- **Dipendenze:** nessuna. Sblocca implicitamente tutte le altre (rete di sicurezza).
- **Dimensione:** S. **Rischio:** basso.

### Sessione 2 — Parità apiShim ↔ server & gestione errori
- **Obiettivo:** lo shim si comporta come il server sui casi d'errore e sui metadati.
- **File toccati:** `src/lib/apiShim.ts`, (rif.) `server.ts`, `src/App.tsx` (gap dots const),
  `src/components/MarkupText.tsx`, `src/components/EditionMarkupEditor.tsx`.
- **Rilievi inclusi:** `BUG-01`, `BUG-06`, `BUG-08`, `BUG-09`.
- **Criteri di accettazione:** `fetch('/api/flags',{method:'POST',body:'{'})` sullo statico →
  `400` JSON (non promise rejected); un solo `GAP_DOTS_MAX` condiviso importato dai tre
  renderer; `GET /api/corpus/files` non restituisce più `modified: <adesso>` (assente o
  documentato); `EpiDocRenderer` della card riceve `onTermClick` o il testo è
  esplicitamente non interattivo.
- **Dipendenze:** nessuna (consigliata dopo S1).
- **Dimensione:** S. **Rischio:** basso.

### Sessione 3 — Reset dell'`ErrorBoundary` sul renderer epigrafico
- **Obiettivo:** una scheda malformata non "avvelena" tutte le successive.
- **File toccati:** `src/App.tsx:7413,7671`, opz. `src/components/ErrorBoundary.tsx`
  (prop `resetKeys`).
- **Rilievi inclusi:** `BUG-02`.
- **Criteri di accettazione:** aprendo una scheda con `testo` che fa lanciare `renderNode`
  e poi una ben formata nello stesso pannello, la seconda **rende** correttamente. Test
  manuale documentato con un XML di prova (non committato nel corpus).
- **Dipendenze:** nessuna.
- **Dimensione:** S. **Rischio:** basso.

### Sessione 4 — Rimozione del fallback `RAW_DATA`
- **Obiettivo:** un errore di caricamento corpus si vede, non si maschera con dati falsi.
- **File toccati:** `src/data.ts` (→ `[]` o rm), `src/App.tsx:60,4333-4337`.
- **Rilievi inclusi:** `BUG-05`, `DATA-07`.
- **Criteri di accettazione:** simulando `installApiShim()` che fallisce, la UI mostra uno
  stato d'errore esplicito e **non** 46 schede inglesi; bundle `index-*.js` più piccolo di
  ~10-15 KB; `grep -rn "RAW_DATA" src/` → nessun uso residuo o solo `[]`.
- **Dipendenze:** nessuna.
- **Dimensione:** S. **Rischio:** basso.

### Sessione 5 — Normalizzazione del lessico teonimi/epiteti  *(DATI)*
- **Obiettivo:** un epiteto = una voce, indipendente dalla grafia; un normalizzatore unico.
- **File toccati:** nuovo `src/lib/textNorm.ts`; `src/lib/utils.ts`, `src/lib/epithetIndex.ts`,
  `src/lib/searchIndex.ts` (usano `textNorm`); nuovo `src/lib/epithetAliases.ts`;
  `src/lib/xmlUtils.ts` (applica gli alias); correzioni mirate a `src/data/corpus/*.xml`;
  opz. `src/data/fontiLetterarie.ts:965`. **Mirror obbligatorio su `Gregoee2002/ILA`.**
- **Rilievi inclusi:** `DATA-01`, `DATA-02`, `DATA-09`, `BUG-13`, `DATA-06`.
- **Criteri di accettazione:** `buildClassificationAudit` sul corpus → `divVsEpi` vuoto e
  `neverAlone` senza `relatedNames` (o lista ridotta e motivata); in `DivinityEpithetIndex`
  le coppie note (`Askaenos`/`Askainos` ecc.) collassano in una voce; il saggio Selene
  elenca fra le "Iscrizioni" anche le schede taggate con le varianti; un solo modulo
  `textNorm` importato da `utils`/`epithetIndex`/`searchIndex`; ogni alias ha una riga di
  giustificazione (verifica su Lane 1971). Le modifiche XML sono presenti **anche** su
  `Gregoee2002/ILA` (altrimenti il boot-sync le annulla).
- **Dipendenze:** indipendente dal codice UI; fare **prima** di qualunque lavoro sugli indici.
- **Dimensione:** L. **Rischio:** medio (cambia conteggi visibili; ogni alias è una scelta
  editoriale).

### Sessione 6 — ILA-294, concordanza TM, stato tassonomia  *(DATI)*
- **Obiettivo:** nessuna scheda senza `entryId`; artefatti di riferimento allineati o ritirati.
- **File toccati:** `src/data/corpus/ILA-294.xml` (+ mirror `Gregoee2002/ILA`),
  `concordanza_TM.csv` (rigenerato o rimosso), nuovo opz.
  `scripts/build-tm-concordance.ts`, `docs/taxonomy-cult-functions.xml` (riga di stato),
  `docs/tassonomia-funzioni-cultuali.md`.
- **Rilievi inclusi:** `DATA-03`, `DATA-04`, `DATA-05`.
- **Criteri di accettazione:** i 295 file corpus hanno tutti `<idno type="entryId">`
  (`for f in …; do grep -q entryId "$f" || echo "$f"; done` → vuoto); l'insieme `file→TM`
  del CSV coincide con gli `idno` inline (o il CSV è stato rimosso con nota); l'header della
  tassonomia riflette lo stato reale della marcatura.
- **Dipendenze:** indipendente. Può precedere o seguire S5.
- **Dimensione:** M. **Rischio:** basso (verificare che il nuovo `entryId` di ILA-294 non
  collida e che `flags.json` non lo referenziasse già).

### Sessione 7 — Aggancio della build dello snapshot
- **Obiettivo:** una build locale non serve mai uno snapshot corpus stantio.
- **File toccati:** `package.json` (hook `prebuild`, opz. `predev`),
  `scripts/build-corpus-snapshot.ts` (guardia esplicita "no network in locale").
- **Rilievi inclusi:** sezione "Drift `corpus-snapshot.json`" della Parte 2.
- **Criteri di accettazione:** dopo una modifica a un XML del corpus, `npm run build`
  rigenera `public/corpus-snapshot.json` e `git diff` sullo snapshot riflette la modifica;
  il comportamento CI resta invariato (lo script continua a leggere il corpus live se i
  secret sono impostati).
- **Dipendenze:** nessuna.
- **Dimensione:** S. **Rischio:** basso.

### Sessione 8 — Design token: stato + tema  *(UI, sblocca S9-S11)*
- **Obiettivo:** un'unica fonte per i colori di stato e per la palette chiara.
- **File toccati:** `src/index.css` (nuovi token + `prefers-color-scheme` + derivazione
  `--parchment-rgb`), `src/components/PasswordGate.tsx` (usa `LIGHT_VARS`/`.light`),
  `index.html` (script pre-idratazione), codemod colori di stato in `src/App.tsx` +
  `src/components/*`.
- **Rilievi inclusi:** `UI-01`, `UI-02`, `UI-03`, `UI-05`, `UI-07`.
- **Criteri di accettazione:** `grep -rnE "text-(red|amber|emerald|green)-[0-9]" src/` → solo
  data-viz dichiarate (mappa/heatmap), nessun uso di stato; `PasswordGate` usa esattamente i
  valori di `:root`; cambiando `--parchment` in devtools si muovono anche `.glass-panel`/
  `.glass-card`; un utente `system` in dark non vede più il flash chiaro al primo paint.
- **Dipendenze:** fare prima di S9/S10/S11.
- **Dimensione:** M. **Rischio:** medio (codemod ampio; rivedere a vista i punti convertiti).

### Sessione 9 — Primitivi di componente  *(UI)*
- **Obiettivo:** bottoni, chip, badge, select e card da un solo posto.
- **File toccati:** nuovi `src/components/ui/{Button,Chip,Badge,FilterSelect,Card}.tsx`;
  sostituzioni progressive in `src/App.tsx` e `src/components/*`.
- **Rilievi inclusi:** `UI-12`, `UI-13`, `UI-14`, `UI-10` (scala taglie bottone),
  `UI-16` (opacità disabled nel `<Button>`).
- **Criteri di accettazione:** i 7 `<select>` dei filtri e il bottone primario provengono
  ciascuno da un solo componente; nessuna regressione visiva (confronto screenshot Catalogo
  prima/dopo); `grep` di `bg-accent text-white` fuori da `Button.tsx` → prossimo a zero.
- **Dipendenze:** dopo S8 (i primitivi usano i token nuovi).
- **Dimensione:** L. **Rischio:** medio (tocco esteso; procedere per gruppi committabili).

### Sessione 10 — Focus visibile & stati  *(UI)*
- **Obiettivo:** ogni elemento interattivo ha un anello di focus; overlay sopra la texture.
- **File toccati:** `src/index.css` (`@layer base` focus + scala z), `src/components/*`
  elencati in `UI-15`/`UI-18`, `src/index.css` (`body::before` z-index).
- **Rilievi inclusi:** `UI-15`, `UI-17`, `UI-18`.
- **Criteri di accettazione:** navigando da Tab in ogni vista si vede un anello su ogni
  controllo; i popover (`.term-stats-popover`, dialoghi) rendono **sopra** la grana felt;
  i pannelli elencati hanno un ramo vuoto/loading esplicito.
- **Dipendenze:** dopo S8 (usa `--accent` e la scala z tokenizzata).
- **Dimensione:** M. **Rischio:** basso.

### Sessione 11 — Tipografia & ritmo  *(UI, rifinitura)*
- **Obiettivo:** una scala tipografica, due durate, i font solo dai token.
- **File toccati:** `src/index.css` (scala testo, `.field-label` come primitivo),
  `src/App.tsx`, `src/components/PasswordGate.tsx`, editor markup (`<option>`).
- **Rilievi inclusi:** `UI-08`, `UI-09`, `UI-11`.
- **Criteri di accettazione:** `grep -rn "fontFamily:" src/` → nessun valore letterale fuori
  dai token; `grep -rho "duration-[0-9]*" src/` → al massimo 2 valori; le label di campo
  usano tutte `.field-label`.
- **Dipendenze:** dopo S8/S9.
- **Dimensione:** M. **Rischio:** basso.

### Sessione 12 — Perf & manutenzione dello storage
- **Obiettivo:** meno reparse del corpus; retry di push unificato e più robusto.
- **File toccati:** `src/lib/apiShim.ts` (cache parse), `src/lib/githubStorageBrowser.ts`
  (`pushJsonFileWithRetry`, casi 403/5xx).
- **Rilievi inclusi:** `BUG-07`, `BUG-14`, `BUG-15`.
- **Criteri di accettazione:** salvare N schede di fila in editor mode non ri-parsa i file
  non toccati (log/contatore di verifica); i 4 blocchi di retry diventano 1; una `403`
  con `X-RateLimit-Remaining: 0` simulata viene ritentata con backoff invece di fallire
  subito.
- **Dipendenze:** dopo S2 (stesso file `apiShim.ts`).
- **Dimensione:** M. **Rischio:** medio (cuore dello shim — test manuale accurato in editor
  mode e in mock mode).

### Copertura dei rilievi

Tutti i 42 rilievi sono assegnati:

- **S1:** BUG-03, BUG-04(p1), BUG-10, BUG-11, BUG-12
- **S2:** BUG-01, BUG-06, BUG-08, BUG-09
- **S3:** BUG-02
- **S4:** BUG-05, DATA-07
- **S5:** DATA-01, DATA-02, DATA-06, DATA-09, BUG-13
- **S6:** DATA-03, DATA-04, DATA-05
- **S7:** (drift snapshot)
- **S8:** UI-01, UI-02, UI-03, UI-05, UI-07
- **S9:** UI-10, UI-12, UI-13, UI-14, UI-16
- **S10:** UI-15, UI-17, UI-18
- **S11:** UI-08, UI-09, UI-11
- **S12:** BUG-07, BUG-14, BUG-15

**Non pianificato come sessione a sé:** `BUG-04` passo 2 (`strict`/`noImplicitAny` completo su
`App.tsx`) — è un intervento L ad alto rischio, va affrontato solo dopo che S1-S12 hanno
stabilizzato il resto; motivo: richiede toccare centinaia di firme `any` nel renderer e nel
parsing, con beneficio marginale finché il resto del piano non è chiuso.

---

## 7. Appendice

### Ambiente

| | |
|---|---|
| OS | Darwin 25.3.0 (macOS) |
| node | v24.15.0 |
| npm | 11.12.1 |
| TypeScript | ~5.8.2 (da `package.json`) |
| Vite | 6.4.2 (da output build; `package.json` chiede `^6.2.3`) |
| React | 19.x |
| Branch | `main` @ `f98abd6` |
| `package.json` `name` | `react-example` (residuo di scaffold; progetto = ILA) |

### Output integrale — `npx tsc --noEmit`

```
(nessun output)
EXIT: 0
```

### Output integrale — `npm run build`

```
> react-example@0.0.0 build
> vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

vite v6.4.2 building for production...
transforming...
✓ 2460 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                     0.40 kB │ gzip:   0.28 kB
dist/assets/ila-logo-DbSLCMDw.webp                120.03 kB
dist/assets/MapView-k-SYLBed.css                    1.65 kB │ gzip:   0.42 kB
dist/assets/index-DjhCnQAq.css                    143.50 kB │ gzip:  25.72 kB
dist/assets/apiShim-BbYo57L9.js                    21.25 kB │ gzip:   7.15 kB
dist/assets/purify.es-CLGrRn1w.js                  25.32 kB │ gzip:   9.62 kB
dist/assets/jspdf.plugin.autotable-Cz_YoQo_.js     31.10 kB │ gzip:   9.91 kB
dist/assets/MapView-CdaR7Quv.js                    55.09 kB │ gzip:  16.11 kB
dist/assets/SectionEditorView-Cmpd2C8U.js          81.84 kB │ gzip:  22.20 kB
dist/assets/index.es-HGgUIrJj.js                  159.64 kB │ gzip:  53.54 kB
dist/assets/html2canvas.esm-QH1iLAAe.js           202.38 kB │ gzip:  48.04 kB
dist/assets/jspdf.es.min-BHM7BUSp.js              390.59 kB │ gzip: 128.77 kB
dist/assets/index-D2JrjRxP.js                   1,599.12 kB │ gzip: 446.39 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 3.56s

  dist/server.cjs      128.6kb
  dist/server.cjs.map  276.6kb

⚡ Done in 5ms
EXIT: 0
```

> Nota su `npm audit`: 11 vulnerabilità (3 low, 2 moderate, 6 high) tutte in catene di
> dev-dependency di build (`esbuild`/`vite`/`jspdf` transitorie). Non incluse nei rilievi
> perché non toccano il bundle servito; da rivalutare a parte con `npm audit` mirato.

### Cosa NON è stato verificato

- **Contenuto delle 295 schede del corpus** (testo epigrafico, traduzioni, bibliografia,
  datazioni, iconografia per-scheda) — fuori perimetro per decisione dell'incarico.
- **`src/App.tsx` riga per riga** — solo intorni sui punti caldi individuati via grep.
- **Route AI** (`/api/translate`, `/api/drafts/*`) nel merito — solo parità apiShim/server.
- **`server.ts` nel dettaglio** — solo elenco route e punti di parsing body.
- **Comportamento runtime nel browser** (nessun dev server avviato in questo run;
  `installApiShim`, `unlockEditing("MOCK")`, rendering effettivo di heatmap/mappa/editor non
  esercitati a runtime).
- **`src/lib/xmlUtils.ts` (75 KB), `src/lib/leidenMarkup.ts` (64 KB), `src/lib/litMarkup.ts`,
  `src/lib/githubStorage.ts` (server-side)** — lette solo per grep mirati, non integralmente.
- **`docs/censimento-bibliografia.{md,csv}`, `docs/spoglio-lessico-cultuale.csv`,
  `docs/norme-bibliografia.md`** — non analizzati nel merito in questo run (elencati
  nell'incarico ma il budget medio è stato speso su corpus/epiteti/UI, dove i disallineamenti
  erano più concreti). Da coprire in un run successivo o come parte di S6.
- **`npm audit` in dettaglio** — solo il conteggio aggregato.
- **Accessibilità con screen reader reale** — solo ispezione statica di `aria-*`/ruoli.
