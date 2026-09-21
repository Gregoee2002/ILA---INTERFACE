---
name: cmrdm-ii-numismatica
description: >
  Estrae e codifica in EpiDoc TEI XML le entry del CMRDM II (Lane 1975, "The
  Coins and Gems") per la sezione numismatica di ILA — Index Lunae Antiquae.
  Usa questa skill OGNI VOLTA che l'utente chiede di estrarre, generare,
  convertire o completare schede numismatiche dal CMRDM II — anche per
  richieste parziali come "estrai le monete di Saittai", "genera l'XML di
  Juliopolis 9", "codifica le gemme", "converti queste pagine". Trigger su:
  CMRDM II, Lane 1975, Coins and Gems, monete di Men, tipo monetale, zecca,
  nominale, metallo, dritto/rovescio, obv/rev, gemme, ILA numismatica,
  blocco num:, ica:side. Consultare SEMPRE questa skill prima di generare XML
  numismatico per questo corpus: il formato ha regole non negoziabili, e
  l'unità di schedatura NON è l'oggetto ma il tipo.
---

# CMRDM II → EpiDoc: la sezione numismatica di ILA

Pipeline per trasformare le entry del CMRDM II (Lane 1975) in file EpiDoc TEI
XML conformi al formato di ILA. È la gemella numismatica di
`cmrdm-epidoc-extractor` (che copre il CMRDM I, epigrafico): **stesso
scheletro TEI, stesse regole di rigore, stesso vocabolario iconografico**.
Cambia quello che sta dentro `<xenoData>` e la struttura del testo, che qui è
per faccia.

**Leggere prima di iniziare:**
- `references/template-canonico-moneta.md` — scheletro XML annotato, moneta e gemma
- `references/mappatura-campi.md` — campo per campo, da Lane al TEI all'app
- `docs/piano-numismatica-2026-09-21.md` nel repo — il perché delle scelte

---

## Le tre regole che governano tutto

### 1. La scheda è il TIPO, non l'esemplare

Deciso il 2026-09-21 (piano §4). Una entry di Lane — «Juliopolis 9» — è un
**tipo monetale**: la combinazione di dritto, rovescio e legenda che una zecca
ha emesso, nota attraverso n esemplari. Corrisponde a `nmo:TypeSeriesItem`.

Conseguenze non negoziabili:
- peso e modulo sulla scheda sono **intervalli** (`@atLeast`/`@atMost`), mai
  misure singole;
- il peso di un pezzo preciso va in `<num:specimen>`, con la sua collezione;
- `<repository>` e `<provenance>` **restano vuoti**: un tipo non è conservato
  da nessuna parte. Non inventarli, non scrivere "sconosciuto".

**Le gemme sono l'eccezione.** Una gemma è un oggetto unico: la scheda è
l'oggetto, `Location:` va in `<repository>`, `Dimensions:` in `<dimensions>`,
e non c'è né tipo né esemplare. Codificarle come i monumenti del CMRDM I, con
il solo blocco iconografico a una faccia.

### 2. Rigore accademico: mai inventare

Identica al CMRDM I. Ogni dato deve essere derivabile dal testo di Lane.
Niente `DA_COMPILARE`, niente tag vuoti, niente commenti-segnaposto: un campo
mancante **si omette** e si segnala nel report finale.

Qui la regola morde più che altrove, perché **Lane non dà né il metallo né il
nominale** (§«Quello che Lane non dice»).

### 3. Il vocabolario iconografico è UNO SOLO

Le chiavi di `ica:figure`/`ica:trait` sono le stesse della sezione epigrafica
(`src/lib/iconographyLabels.ts`). Berretto frigio, falce sulle spalle, pigna,
gallo, toro sono gli stessi attributi su una stele e su un bronzo civico: se la
numismatica si inventa chiavi sue, la ricerca smette di attraversare i due
sottocorpora ed è persa la ragione stessa di questa sezione.

Prima di introdurre una chiave nuova, **cercarla** in `iconographyLabels.ts`:
`laureate` è già `headgear/wreath`, `radiate` è già `headgear/radiate_crown`.

---

## Pipeline

### 1. Estrazione del testo

Il PDF è `CMDM V2.pdf` (257 pagine, iCloud/Libri). Ha un livello di testo OCR
già presente:

```bash
pdftotext -layout "CMDM V2.pdf" /tmp/cmrdm2.txt
```

⚠️ **Il greco esce mojibake.** Come nel CMRDM I, il font greco a stampa non è
mappato in Unicode: `'IouALIX ~E:~lXcr"t'~` sta per Ἰουλία Σεβαστή. Il testo
latino e inglese è invece affidabile. Per le legende greche passare da
`scripts/ocr-print-source.py` del repo (Tesseract `grc`) oppure trascrivere via
vision dalle pagine rasterizzate: **non tentare di decifrare il mojibake a
mano**, e non lasciarlo mai finire nell'XML.

### 2. Segmentazione

```bash
python3 scripts/segment_cmrdm2.py /tmp/cmrdm2.txt /tmp/entries2/           # tutto
python3 scripts/segment_cmrdm2.py /tmp/cmrdm2.txt /tmp/entries2/ --kind gems
```

Lo script riconosce le testate (`<Zecca> <numero>` … `Plate N`), normalizza gli
scambi OCR ricorrenti (1→I, 5→S, 0→O, `] uliopolis`→`Juliopolis`) e **dichiara
la propria copertura**: confronta le entry prodotte con il numero di righe
`Obv.` e `Representation:`.

Allo stato dell'OCR attuale produce **441 entry su 475 attese** (430 monete +
11 gemme): ~34 testate sfuggono perché il rimando alla tavola è troppo
sfigurato. **Non procedere alla codifica ignorando il divario**: recuperare le
mancanti a mano prima, o dichiarare esplicitamente quale sottoinsieme si sta
lavorando.

Le entry con numerazione OCR incerta portano in testa un
`# ATTENZIONE: numerazione OCR incerta`: vanno verificate sul PDF, perché il
numero è l'identificatore della scheda.

### 3. Struttura di una entry

```
Juliopolis 9                                              Plate II
Obv.: Bust of Caracalla, r., bearded, laureate
Inscription: Αὐτ. Κ. Ἀντωνῖνος Αὐγ.
Rev.: Men standing l. with patera over altar
Inscription: Ἰουλιοπολειτῶν
      Bibliography:
      Recueil, I, 2, p. 387, no. 20
Weight: 8.53 gr. (Vienna)
Illustrated example: Vienna
Remarks: It is questionable whether Men is actually intended.
```

Varianti da gestire:
- `Inscription: No inscription` / `Bibliography: none` / `Weight: unavailable`
  → il campo **si omette**, non si scrive "nessuna";
- `Weight: 12.03 gr. (Vienna) - 14.42 gr. (Paris)` → intervallo sul tipo
  (§«Peso»), più due `<num:specimen>`;
- `Remarks:` di Lane → `<div type="commentary">`, mai fuso nella descrizione.

### 4. La descrizione del tipo → iconografia strutturata

È il passaggio che dà valore alla sezione. La prosa di Lane segue una griglia
regolare:

```
Bust of Men, r., with laurel wreath on cap
└ soggetto ┘ └or┘ └──────── attributi ────────┘

Men standing l. with patera over altar
└ sogg ┘ └posa┘└or┘ └── oggetto ──┘└ contesto ┘
```

Ogni faccia diventa un `<ica:side>`; ogni soggetto un `<ica:figure>`; ogni
attributo un `<ica:trait>`. Tabella di conversione completa in
`references/mappatura-campi.md` §«Dalla prosa di Lane ai tratti».

Regole di lettura:
- `r.` = *right*, `l.` = *left*, `frontal`/`facing` → `@dir="right|left|facing"`;
- `Bust of X` → `figure type="deity|emperor"` + `trait type="portrait"
  key="draped_bust"`; `Head of X` → `key="bare_head"`; `laureate` →
  `portrait/laureate_head`, non un copricapo nuovo;
- `in front`, `behind`, `at feet`, `above`, `in field`, `around` →
  `@rel` sulla figura accessoria, con `@relTo` all'`@n` della figura principale;
- **la prosa integrale va comunque conservata** in `<ica:note>` della faccia:
  la strutturazione è un'aggiunta, non una sostituzione. Se un elemento non
  entra nel vocabolario, resta lì — non si forza una chiave approssimata.

⚠️ Lane dice spesso «Men riding r.» senza altro. Non dedurre il toro: `mount`
si scrive solo se Lane nomina l'animale.

### 5. Quello che Lane non dice — e non va inventato

| Campo | In CMRDM II | Cosa fare |
|---|---|---|
| **metallo** | **mai indicato** | omettere. Unica eccezione: la nota «the only silver coin with Men known to me» (p. 157) autorizza `key="ar"` su quella entry. Non dedurre "bronzo" dal silenzio |
| **nominale** | **mai indicato** | omettere sempre. Nemmeno `assarion` per congettura |
| **modulo / diametro** | quasi mai (1 sola entry) | omettere |
| **asse di conio** | mai | omettere |
| **datazione** | implicita nel ritratto imperiale | `<origDate>` **solo** se si nomina l'imperatore: il regno è un dato, non una stima. `evidence="portrait"` |
| **zecca** | la testata dell'entry | `<origPlace type="mint">` + `<num:mint>` |

Il silenzio di Lane su metallo e nominale è la ragione per cui il piano tiene i
due campi distinti e con `@cert`: quando arriveranno da RPC o da altrove,
entreranno come **inferenza attribuita**, non come dato di Lane.

### 6. Peso: tipo o esemplare

- `Weight: 8.53 gr. (Vienna)` → un solo esemplare noto: il peso va in
  `<num:specimen>`, **non** sul tipo.
- `Weight: 12.03 gr. (Vienna) - 14.42 gr. (Paris)` → due esemplari: due
  `<num:specimen>` **e** un intervallo sul tipo
  (`<num:weight unit="g" atLeast="12.03" atMost="14.42"/>`).
- `Weight: unavailable` → nessun elemento.
- `Illustrated example: Vienna` → `@rend="illustrated"` sullo specimen
  corrispondente, che è quello riprodotto nella tavola.

⚠️ L'OCR sbaglia spesso le cifre dei pesi (`I2.50` = 12.50, `lI.46` = 11.46,
`IS` = 15). Ogni peso va riletto sulla pagina prima di finire nell'XML: un peso
sbagliato è un dato falso, non un refuso.

### 7. Generazione XML

Seguire alla lettera `references/template-canonico-moneta.md`. In più rispetto
al CMRDM I:

- **`<idno type="filename">`** = `CMRDM-II-<ZECCA>-<n>` (monete) o
  `CMRDM-II-G<n>` (gemme). **Mai** `<idno type="id">` né `entryId`: li assegna l'app.
- **Due facce**: `<div type="edition">` contiene due
  `<div type="textpart" subtype="face" n="obv|rev">`, ciascuno con il suo `<ab>`.
  Faccia anepigrafe → `<ab><space unit="side"/></ab>`, mai un `<ab>` vuoto.
- **`<objectType>`** = `coin type` (monete) / `gem` (gemme).
- **`<xenoData>`** porta i due blocchi nell'ordine: `num:numismatics`, poi
  `ica:iconography`.
- `<ica:function>` **non si scrive**: la funzione cultuale non si applica a
  un'emissione monetale (piano §6.4).

### 8. Validazione e consegna

```bash
xmllint --noout file.xml     # well-formedness: FATALE se fallisce
```

Checklist, con la stessa filosofia FATAL/ERROR/WARNING del progetto:

- **FATAL** — XML malformato; `<idno type="id">`/`entryId` presenti; greco
  mojibake nell'edizione; peso o metallo inventati; `<ica:side>` assente su una
  moneta.
- **ERROR** — placeholder o tag vuoti; `<ica:function>` su una moneta; chiave
  iconografica inventata quando ne esiste già una equivalente; `<repository>`
  compilato su una scheda-tipo; peso singolo scritto sul tipo invece che sullo
  specimen.
- **WARNING** — entry senza bibliografia; `@dir` assente dove Lane dice `r.`/`l.`;
  prosa di Lane non conservata in `<ica:note>`; numerazione OCR non verificata.

File nominati come l'`idno`, consegnati come ZIP. Chiudere **sempre** con un
report: entry per zecca, quante senza peso, quante con numerazione da
verificare, quante con elementi iconografici non mappati, e l'elenco esplicito
delle entry non segmentate (§2).
