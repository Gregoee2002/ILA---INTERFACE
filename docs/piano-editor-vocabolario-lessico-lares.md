# Piano — un editor del vocabolario «Lessico cultuale · LARES»

> Handoff per una sessione dedicata. Stato: **proposta, non implementata** (2026-09-10).
> Sorgenti attuali (diventano il *seed*, vedi §2):
> [`src/lib/cultLexicon.ts`](../src/lib/cultLexicon.ts) · [`src/lib/laresToolbox.ts`](../src/lib/laresToolbox.ts)
> Viste che consumano: [`CultLexiconPanel.tsx`](../src/components/CultLexiconPanel.tsx) ·
> [`LaresGrid.tsx`](../src/components/LaresGrid.tsx) · [`LaresMarkersIndex.tsx`](../src/components/LaresMarkersIndex.tsx) ·
> [`LiterarySourcesPanel.tsx`](../src/components/LiterarySourcesPanel.tsx)
> Merge di riferimento: [`docs/merge-lessico-lares.md`](merge-lessico-lares.md) ·
> tassonomia: [`docs/tassonomia-funzioni-cultuali.md`](tassonomia-funzioni-cultuali.md)

---

## 1. Il problema

Oggi la catena «lessico cultuale + corrispondenze LARES» è editabile in **un solo
punto**: nella sezione Edizione dell'editor a sezioni si sceglie, per una parola,
`@lemma` + `@ana` (la famiglia). Tutto il resto è **cablato in TypeScript**:

| livello | dove vive oggi | editabile da UI? |
|---|---|---|
| A. le 5 famiglie cult (`id`, `label`, `rule`, tinta) | `CULT_FAMILIES`, `CULT_FAMILY_COLOR` | no |
| B. i 56 lemmi (`lemma→family, subFunction, lemmaRef, manual`) | `CULT_LEXICON` | no |
| C. le ~25 sotto-funzioni (stringhe libere, non un elenco chiuso) | dentro `CULT_LEXICON` | no |
| D. la griglia Analytical Toolbox LARES (item→cat→sub, `label/en/esempi/aggiunta/fonte`) | `LARES_TOOLBOX` | no |
| E. la mappa `lemma → percorso LARES` | `LEMMA_TOOLBOX` | no |
| F. i 9 marcatori concettuali + default per famiglia + campo `lares` della testimonianza | `LARES_GRID`, `LiterarySourcesEditor` | grid no; campo `lares` sì |
| G. l'override per singola attestazione (`@type`/`@subtype`, `@ana` a mano) | markup XML della scheda | solo via popover attributi grezzo |

Il documento LARES dichiara esplicitamente che il toolbox è *«only a preliminary
classification grid that can be expanded, modified, deconstructed, restructured,
or even reformulated»*. Serve un editor che copra **A–G** e non richieda una
release del codice per ogni evoluzione della griglia.

---

## 2. Architettura: seed immutabile + overlay versionato

Precedente già in produzione: il **vocabolario iconografico** (`/api/iconography-vocab`
in [`apiShim.ts`](../src/lib/apiShim.ts) e `server.ts`, file JSON nel repo dati,
pull/push via `githubStorageBrowser`, gate `unlockEditing`, no-op in MOCK). Si
replica quello schema.

```
 cultLexicon.ts / laresToolbox.ts     →  SEED  (congelato: non si edita più a mano)
            │
            ▼
 lessico-lares-overlay.json           →  OVERLAY  (nel repo dati Gregoee2002/ILA)
   { version, updatedAt, updatedBy,
     famiglie:   [...patch],
     sottofunzioni: [...],
     lemmi:      [...patch],
     toolbox:    [...patch],            // nodi item/cat/sub aggiunti o rivisti
     lemmaToolbox: { lemma: percorso },
     concettuali:  { defaultPerFamiglia, note } }
            │
            ▼
 buildLessicoLares()  →  vocabolario risolto (seed ⊕ overlay)  ← lo consumano cultIndex.ts e le viste
            │
            ▼
 markup XML della scheda  →  override finale per la singola attestazione (già oggi vince in pathOf)
```

### Ordine di risoluzione (deterministico)
1. **seed** (`.ts`);
2. **overlay** — può: aggiungere voci; correggere `label/rule/esempi/subFunction/lemmaRef/percorso`; marcare `deprecated: true`; **mai** cancellare o rinominare un `id` del seed (vedi §4);
3. **markup della scheda** — per *quella* attestazione `@ana` e `@type/@subtype` battono tutto (comportamento attuale di `pathOf` in [`cultIndex.ts`](../src/lib/cultIndex.ts), da preservare).

### Regola di conservazione (dal merge §1)
Nessun `id` LARES del seed viene rinominato, spostato o ridefinito. Le aggiunte
portano `fonte: 'ILA' | 'LARES-enlarged'` e `aggiunta: true`. Una voce «sbagliata»
del seed si `deprecated`-a e se ne aggiunge una nuova, non si muta l'id.

---

## 3. Il modello dati dell'overlay

Un solo file, `lessico-lares-overlay.json`, con blocchi per ciascun livello. Ogni
record porta `note?` e provenienza (`addedBy`, `addedAt`). Tipi in un nuovo
`src/lib/lessicoLaresOverlay.ts`.

```ts
interface LessicoLaresOverlay {
  version: 1;
  updatedAt: string;            // ISO
  updatedBy?: string;           // login GitHub di chi ha salvato

  famiglie: FamigliaPatch[];        // A
  sottofunzioni: SottoFunzione[];   // C  (id, label, note) — chiude l'elenco oggi libero
  lemmi: LemmaPatch[];              // B + E (percorso qui, non in un file a parte)
  toolbox: ToolboxNodoPatch[];      // D
  concettuali: {                    // F
    defaultPerFamiglia: Record<CultFamily, LaresMarker | null>;
    note?: string;
  };
}

interface FamigliaPatch {
  id: string;                  // seed id, o nuovo (kebab, prefisso "x-" se ILA)
  label?: string; rule?: string; color?: string;
  deprecated?: boolean;
  _new?: boolean;              // true = non è nel seed
}

interface SottoFunzione { id: string; label: string; note?: string; deprecated?: boolean; }

interface LemmaPatch {
  lemma: string;               // chiave (forma di citazione)
  family?: CultFamily;
  subFunction?: string;        // deve esistere in `sottofunzioni` o nel seed
  lemmaRef?: string | null;    // null = «nessuna voce di dizionario»
  manual?: boolean;
  aliases?: string[];          // composti che ricadono qui: προσαμαρτάνω→ἁμαρτάνω, κόλασις→κολάζω
  percorso?: ToolboxMarker | null;  // E — null = «senza percorso», legittimo (χαίρω)
  deprecated?: boolean;
  _new?: boolean;
}

interface ToolboxNodoPatch {
  path: string;                // "item" | "item/cat" | "item/cat/sub"
  label?: string; en?: string; esempi?: string;
  fonte?: 'ILA' | 'LARES-enlarged';
  deprecated?: boolean;
  _new?: boolean;              // true = nodo innestato (solo 2° o 3° grado, mai un 8° item — merge §4)
}
```

Note:
- **C (sotto-funzioni)**: oggi sono stringhe libere dentro `CULT_LEXICON`. Il primo
  passo dell'editor è estrarne l'elenco e renderlo un vocabolario chiuso, così il
  campo diventa un `select` e non si creano più varianti (`comunita` vs `comunità`).
- **E** vive dentro `lemmi[].percorso` invece che in un file separato: un lemma =
  una riga = famiglia + sotto-funzione + percorso, come si legge nel merge §3.
- Nessun blocco per **G**: gli override per-scheda restano nel XML e si editano
  dove si editano già (sezione Edizione + popover), vedi §6.

---

## 4. Vincoli di integrità (validati a ogni salvataggio e in CI)

Estendere `checkToolboxTable()` e `validateToolboxPath()` in `laresToolbox.ts` /
`cultLexicon.ts` perché lavorino sul **vocabolario risolto**, non sul solo seed.

1. ogni `lemmi[].family` esiste (seed o overlay, non `deprecated`);
2. ogni `lemmi[].subFunction` esiste in `sottofunzioni` o nel seed;
3. ogni `lemmi[].percorso` supera `validateToolboxPath` sul toolbox risolto;
4. ogni `toolbox[].path` nuovo è di 2° o 3° grado e ha `fonte` (mai un nuovo item);
5. nessun `id` del seed compare con `_new: true`; nessun record rinomina un id
   (solo `deprecated` + nuovo);
6. un `id` seed `deprecated` non è referenziato da lemmi attivi → warning con la
   lista delle schede che lo usano ancora nel markup;
7. `defaultPerFamiglia` copre tutte le famiglie attive.

Nuovo test `src/lib/__tests__/lessicoLares.test.ts`: carica seed + overlay
committato e fa girare i 7 controlli; fallisce la CI se l'overlay è incoerente.

---

## 5. Trasporto: server, shim statico, snapshot

Tutto in parallelo al vocabolario iconografico.

### 5a. `src/lib/githubStorageBrowser.ts`
Aggiungere `pullLessicoLaresFile()` / `pushLessicoLaresFile(json, msg)` (copia di
`pull/pushIconographyVocabFile`), file `lessico-lares-overlay.json` nel repo dati.

### 5b. `server.ts` (dev con Claude)
`GET /api/lessico-lares-vocab` → overlay corrente; `POST` → valida (§4), scrive il
file, ritorna il vocabolario risolto. Gate: stesso `canWrite` degli altri POST.

### 5c. `src/lib/apiShim.ts` (build statica — **il target reale**)
Stesse due route dentro l'`switch`. `let lessicoLaresStore = {}` come
`iconographyVocabStore`; idratato in `unlockEditing` e in `/api/corpus/sync`; in
MOCK il POST aggiorna solo la memoria e **non** chiama `pushLessicoLaresFile`.
Nessuna chiamata di rete nel path di sola lettura.

### 5d. `scripts/build-corpus-snapshot.ts`
Includere `lessico-lares-overlay.json` nello snapshot (`public/corpus-snapshot.json`)
così la build statica parte già con il vocabolario risolto, senza fetch.
`xmlToMonumenti` / `buildCultIndex` devono accettare il vocabolario risolto come
parametro invece di importare direttamente il seed.

### 5e. `src/lib/cultIndex.ts`
`buildCultIndex(monumenti, { vocab })` — se `vocab` assente usa il seed (retro-
compatibile). `pathOf`, `PATH_ORDER`, `FAMILY_LABEL`, `toolboxForLemma` passano
dal vocabolario risolto.

---

## 6. La UI

Una **nuova vista gated**, `LessicoLaresEditor.tsx`, raggiungibile da un bottone
«Modifica vocabolario» in testa a `CultLexiconPanel` visibile solo quando
`canWrite` (come il vocabolario iconografico compare solo sbloccato). Stessa
lingua visiva delle viste esistenti (pergamena, `text-cult`, pallini `itemColor`).

Tab interni, uno per livello:

- **Famiglie** — tabella delle 5 + «aggiungi»; editi `label`, `rule`, tinta;
  `deprecated` con conferma se in uso. Anteprima del pallino.
- **Sotto-funzioni** — elenco chiuso; rinomina = alias, non mutazione;
  contatore d'uso per lemma.
- **Lemmi** — la tabella centrale. Riga = `lemma · famiglia(select) · sotto-funzione(select) ·
  lemmaRef(url, «nessuna») · manual · aliases(chips) · percorso LARES(picker ad albero) ·
  deprecated`. Filtri per famiglia / «senza percorso» / «fuori dal corpus».
  Colonna «attestazioni» che linka alle schede (riusa `refs` di `CultLemmaStats`).
- **Toolbox LARES** — l'albero `LARES_TOOLBOX` risolto; le voci del seed in sola
  lettura con lucchetto, le voci overlay editabili; «innesta sotto…» solo su
  categoria/sottocategoria; badge `ILA` / `LARES+` (riusa `<Segno>`).
- **Marcatori concettuali** — la griglia 3×3 `LARES_GRID` (sola lettura: è lo
  standard LARES) + editor del `defaultPerFamiglia` (un picker percorso→ambito
  per ognuna delle 5 famiglie).
- **Anteprima diff** — prima di salvare: «seed vs risolto», con le righe toccate
  evidenziate e gli errori di §4 in rosso bloccante.

Override per singola attestazione (**G**): non un tab nuovo. Nella sezione
Edizione, il popover attributi del `<w>` / `<rs>` diventa strutturato — `@ana` un
`select` sulle famiglie risolte, `@type/@subtype` il picker ad albero — così un
override consapevole si fa lì, sul segmento, e resta nel XML della scheda (repo
dati). Documentare che l'override per-scheda vince sul vocabolario.

---

## 7. Consolidamento nel seed (per le release)

L'overlay è la sede di lavoro; il seed `.ts` resta la base «pubblicata». Azione
manuale, non automatica: uno script `scripts/consolidate-lessico-lares.ts` che
legge l'overlay committato e **rigenera** `cultLexicon.ts` + `laresToolbox.ts`
(voci overlay non-`deprecated` ripiegate nel seed, `_new` perde il flag), poi
svuota l'overlay portando `version` a `n+1`. Da lanciare quando una tornata di
modifiche è stabile, così il codice non diverge in silenzio dai dati (memoria
`project_ila_two_repo_split`). Commit separato, sui due repo.

---

## 8. Fasi

| # | cosa | esito verificabile |
|---|---|---|
| **F1** | `lessicoLaresOverlay.ts` (tipi + `buildLessicoLares` seed⊕overlay) + estrazione dell'elenco chiuso di sotto-funzioni dal seed | `tsc` pulito; test: risolto senza overlay === seed |
| **F2** | integrità §4 + `lessicoLares.test.ts` in CI | overlay incoerente rompe la CI |
| **F3** | trasporto §5 (githubStorage, server, apiShim, snapshot) + `buildCultIndex({vocab})` | GET/POST rispondono in dev **e** in build statica (`star-static-dev`, gate `test`, MOCK per lo sblocco) |
| **F4** | `LessicoLaresEditor.tsx` — tab Famiglie / Sotto-funzioni / Lemmi | si aggiunge un lemma di prova, si salva, `CultLexiconPanel` lo mostra senza ricompilare |
| **F5** | tab Toolbox LARES + Marcatori concettuali + Anteprima diff | si innesta una sottocategoria `fonte:'ILA'`, la `LaresGrid` la elenca |
| **F6** | popover attributi strutturato nella sezione Edizione (override G) | override `@subtype` su un `<w>`, `pathOf` lo rispetta |
| **F7** | `consolidate-lessico-lares.ts` + prova di ripiegamento nel seed | seed rigenerato uguale al risolto; overlay azzerato a `version:2` |
| **F8** | sezione nella guida editor (skill `guida-editor-ila`) | PDF ricompilato, verifica a video |

F1–F3 sono indipendenti dalla UI e sbloccano tutto il resto; F4 dà già valore da
sola. F6 e F8 chiudono.

## 9. Vincoli di progetto da non violare

- Nome utente-visibile: **ILA — Index Lunae Antiquae**, mai MENISKOS/STAR.
- La **build statica è il target**: ogni route deve funzionare in `apiShim.ts` +
  snapshot, `server.ts` è solo dev.
- **Due repo**: l'overlay JSON e ogni fix XML vanno sul repo dati
  `Gregoee2002/ILA`; niente bulk-copy tra i due checkout.
- MOCK (`unlockEditing("MOCK")`): scritture in memoria, nessun push.
- `git push` a `origin` alla fine, su entrambi i repo dove serve.
- Non rompere i test/validatori esistenti del markup Edizione.
