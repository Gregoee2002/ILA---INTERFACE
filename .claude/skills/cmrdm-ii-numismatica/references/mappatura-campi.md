# Mappatura campi: entry CMRDM II → EpiDoc → app ILA

## 1. Campi di Lane

| Campo nell'entry | Destinazione XML | Campo app | Note |
|---|---|---|---|
| testata `<Zecca> <n>` | `<idno type="filename">` + `<num:reference corpus="CMRDM II" n="…">` | `numero`, `fontiStampa` | l'identificatore è *zecca + numero*, non un numero unico |
| zecca (parte testuale) | `<origPlace type="mint">/<placeName type="ancient">` + `<num:mint>` | `citta`, `numismatica.mint` | `@ref` Nomisma solo da tabella, mai per somiglianza |
| regione | `<placeName type="region">` | `regione` | dedotta dall'ordine geografico di Lane (Ponto → Bitinia → … → Pisidia) |
| `Plate N` | `<facsimile><graphic><desc>Tav. N</desc>` | — | solo il rimando, nessun URL inventato |
| `Obv.:` | `<ica:side n="obv">` + `<ica:note>` | `iconografia.sides` | §2 |
| `Rev.:` | `<ica:side n="rev">` + `<ica:note>` | idem | §2 |
| `Inscription:` (sotto Obv.) | `<div type="textpart" subtype="face" n="obv">` | `testo` | greco da ri-OCR, mai il mojibake |
| `Inscription:` (sotto Rev.) | idem `n="rev"` | idem | |
| `No inscription` | `<ab><space unit="side"/></ab>` | `anepigr` per faccia | |
| ritratto imperiale nell'`Obv.` | `<num:authority key="…">` + `<origDate evidence="portrait">` | `numismatica.authority`, `data_*` | il regno è un dato, non una stima |
| `Weight:` singolo | `<num:specimen><num:weight unit="g">` | `numismatica.specimens` | **non** sul tipo |
| `Weight:` intervallo | `<num:weight atLeast atMost>` **e** due `<num:specimen>` | `numismatica.weight` | |
| `Weight: unavailable` | — | — | omettere |
| `(Vienna)`, `(Berlin)` | `<num:collection>` dentro lo specimen | | |
| `Illustrated example:` | `@rend="illustrated"` sullo specimen omonimo | | è il pezzo riprodotto in tavola |
| `Bibliography:` | `<div type="bibliography"><listBibl><bibl>` | `bibliografia` | una voce per riga; `none` → omettere il div |
| `Remarks:` | `<div type="commentary"><p>` | `note_interne` | mai fuso nella descrizione |
| `Representation:` (gemme) | `<ica:iconography>` senza `ica:side` | `iconografia` | |
| `Location:` (gemme) | `<repository>` | `luogo_cons` | solo per le gemme |
| `Dimensions:` (gemme) | `<dimensions><height/><width/>` | `dim_*` | `18 X 14 mm`; `unavailable` → omettere |

**Sempre presente comunque:** un `<bibl>` per il CMRDM II stesso, nella forma
registrata in `src/lib/printSources.ts`.

## 2. Dalla prosa di Lane ai tratti iconografici

La descrizione va **strutturata senza essere sostituita**: la prosa integrale
resta in `<ica:note>` della faccia.

### Soggetto → `ica:figure/@type` e `@key`

| Prosa | `@type` | `@key` |
|---|---|---|
| `Men`, `Bust of Men` | `deity` | `Men` |
| `Bust of Caracalla`, `Julia Domna` | `emperor` | nome dell'imperatore |
| `Apollo`, `Helios`, `Nike`, `Attis` | `deity` / `secondary` | nome |
| `star`, `crescent`, `altar`, `shield`, `palm`, `caduceus` | `symbol` | chiave omonima |
| `bull`, `cock`, `horse`, `ram` | `animal` | chiave omonima |

### Troncatura → `trait type="portrait"`

`Bust of X` → `draped_bust` · `Head of X` → `bare_head` · `laureate` →
`laureate_head` · `radiate` → `radiate_head` · `cuirassed` → `cuirassed_bust`.

⚠️ `laureate`/`radiate` riferiti al **berretto** («laurel wreath on cap»,
«stars on cap») non sono troncature: sono `headgear`/`lunar` sul berretto
frigio, chiavi già esistenti.

### Posa → `trait type="pose"`

`standing` · `seated` · `riding` · `reclining` · `galloping` · `bust` (nessuna posa).

### Orientamento → `@dir` sulla figura

`r.` → `right` · `l.` → `left` · `frontal`, `facing`, `head frontal` → `facing` ·
`turning head back` → `right` (o `left`) **più** `trait type="gesture"
key="head_turned"`.

### Posizione relativa → `@rel` + `@relTo`

`in front (of)` → `in_front_of` · `behind` → `behind` · `at feet` → `at_feet` ·
`above`, `over` → `above` · `below`, `under` → `below` · `in field` →
`in_field` · `around` → `around` · `on either side` → `flanking`.

`@relTo` è l'`@n` della figura a cui ci si riferisce; se Lane non lo specifica,
è la figura principale della faccia (n=1).

### Attributi tenuti → `trait type="held_object"`

`patera`, `staff`, `sceptre`, `torch`, `pine_cone`, `wreath`, `spear`,
`cornucopia`, `Nike` (statuetta). `in right hand` → `@hand="right"`.

### Chiavi da NON inventare

Prima di creare una chiave, cercarla in `src/lib/iconographyLabels.ts`.
Equivalenze già presenti, che non vanno duplicate:

| Prosa di Lane | Chiave esistente |
|---|---|
| `Phrygian cap` | `headgear/phrygian_cap` |
| `crescent on shoulders`, `crescent behind shoulders` | `lunar/crescent_shoulders` |
| `crescent on cap`, `stars on cap` | `lunar/crescent_cap` |
| `radiate crown` | `headgear/radiate_crown` |
| `pine-cone`, `pine cone` | `held_object/pine_cone` |
| `bucranium`, `bull's head` | `held_object/bucranium` |
| `rooster`, `cock` | `mount/cock` |
| `uplifted hands` | `gesture/hands_raised` |

Una chiave davvero nuova va aggiunta al vocabolario condiviso
(`iconographyLabels.ts` o l'overlay), **non** a un vocabolario numismatico
separato.

## 3. Nomisma: quando mettere `@ref`

Solo da tabella di risoluzione, mai per somiglianza di stringa (piano §9.3).

| Cosa | Spazio dei nomi | Verifica |
|---|---|---|
| metallo | `http://nomisma.org/id/{ae,ar,av,billon,orichalcum}` | l'id risolve? |
| zecca | `http://nomisma.org/id/…` | l'id risolve **e** il `skos:exactMatch` Pleiades coincide con il nostro `placeName/@ref` |
| nominale | — | `assarion` **non esiste** in Nomisma: solo `@key` locale |
| divinità Men | — | **nessun id Nomisma**: solo `@key="Men"` |

Attenzione alla qualità: `nm:saitta` è definito «in Phrygia», ma Saittai è in
Lidia. Nomisma è un vocabolario, non un'autorità: la regione la decide Lane.

## 4. Campi che l'app scrive da sé — MAI generarli

`<idno type="id">`, `<idno type="entryId">`, `<revisionDesc>`,
`testo_searchable`, `supplied_ranges`, `fontiStampa`.
