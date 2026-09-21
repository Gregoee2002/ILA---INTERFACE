# Piano concettuale — la sezione numismatica di ILA

*2026-09-21 — documento di progettazione. Nessun dato da popolare in questa fase.*

Analisi del file campione `RPC type/8401` (export EpiDoc di *Roman Provincial
Coinage Online*, Ashmolean Museum) e piano di integrazione con lo schema ILA,
con particolare attenzione (a) al campo dei **tipi** in rapporto al nostro
`<xenoData><ica:iconography>`, (b) ai campi **metallo** e **nominale**.

---

## 1. Che cosa è il file campione

| | |
|---|---|
| Fonte | RPC Online — `https://rpc.ashmus.ox.ac.uk/type/8401/epidoc` |
| Oggetto descritto | un **tipo monetale**, non un esemplare |
| Schema | EpiDoc 9.7, dichiaratamente ispirato a **SigiDoc** (sigillografia) |
| Licenza | CC-BY 4.0 — riuso consentito, attribuzione obbligatoria |
| Redazione | Jerome Mairat, «supported by a fine-tuned OpenAI GPT-4o mini model» |

Due avvertenze da tenere presenti prima di trattare RPC come fonte di dati:

1. **L'export EpiDoc è impoverito rispetto al database RPC.** Nel file campione
   non compaiono né il metallo specifico, né il nominale, né il peso, né il
   modulo, né l'asse di conio — cioè esattamente i dati numismatici primari.
   `<material>` porta il valore generico `Metal` (EAGLE lod/107) e
   `<objectType>` porta `Coin type`. Chi volesse quei dati deve passare
   dall'interfaccia RPC o da un'altra via (API/JSON, Nomisma), non dall'EpiDoc.
2. **Parte della redazione è assistita da un modello linguistico.** Per un
   corpus che come il nostro distingue esplicitamente il dato dall'integrazione
   editoriale, questo va registrato nella scheda, non taciuto.

---

## 2. Compatibilità con lo schema ILA, campo per campo

### 2.1 Compatibili così come sono

| RPC | ILA | Note |
|---|---|---|
| `fileDesc/titleStmt/title` | `titolo` | RPC genera il titolo per formula («Roman Provincial Coin Type struck under X from Y») |
| `respStmt/resp` + `name` | `responsabili` | noi usiamo `editor`/`encoder`, RPC «director and editor»: normalizzabile |
| `publicationStmt/authority` | `authority` | |
| `idno type="URI"` | `extRefs` | RPC entra come repertorio esterno accanto a TM, PHI, EDCS |
| `origDate @datingMethod @notBefore-custom @notAfter-custom` | `data_inizio` / `data_fine` | **identico** al nostro formato, nessun adattamento |
| `textClass/keywords/term` | `keywords@scheme` | struttura uguale, uso diverso (§2.3) |
| `revisionDesc @status` | `EditorialStatus` | `draft` è già nel nostro vocabolario |
| `listBibl/bibl type="corpus" n="RPC"` | `bibliografia` + `printSources.ts` | va aggiunta la voce **RPC** al registro delle fonti |

### 2.2 Presenti in ILA e assenti in RPC

`dimensions`, `layoutDesc`, `handDesc`, `apparatus`, `particDesc/listPerson`,
`provenance`, `msIdentifier/repository`, `note_interne`.

Non è una lacuna di RPC: **discendono dal fatto che la scheda descrive un tipo,
non un oggetto**. Un tipo non ha un luogo di rinvenimento, non è conservato da
nessuna parte e non ha una mano. Vedi §4.

### 2.3 Presenti in RPC e assenti (o divergenti) in ILA

| RPC | Stato in ILA | Commento |
|---|---|---|
| `origPlace type="mint"` | `origPlace` senza `@type` | la **zecca** è un'origine vera, non il `provenance type="found"`. Serve `@type="mint"` |
| `facsimile/surface type="obverse\|reverse"/graphic` | **assente** | è l'unico gancio per le immagini in tutto lo schema; utile anche all'epigrafia |
| `availability/licence` | **assente** | obbligatorio se riusiamo dati CC-BY |
| `langUsage/language` | implicito in `@xml:lang` | RPC dichiara la/grc a livello di scheda |
| `div type="textpart" subtype="face" n="obv\|rev"` | il parser li legge, il modello no | §5 |
| `div type="commentary" subtype="face"` | **il nodo centrale** | §6 |
| metallo specifico, nominale, peso, modulo, asse | **assenti da entrambi** | §3 |

---

## 3. Metallo e nominale

### 3.1 I termini

- **metallo** = *metal*, *materia*. Vocabolario di riferimento: Nomisma
  (`nmo:hasMaterial`) — `ar` argento, `ae` bronzo/rame, `av` oro, `bi` biglione,
  `or` oricalco, `el` elettro, `pb` piombo. Sigle tradizionali dei cataloghi:
  AR, Æ, AV.
- **nominale** = *denomination* (`nmo:hasDenomination`) — il valore di conto
  dell'emissione: *denarius*, *as*, *dupondius*, *sestertius*, *assarion*,
  *tetradrachmon*, *drachme*.
- **modulo** = diametro in mm; **peso** in g; **asse di conio** (*die axis*) =
  orientamento reciproco dei due conî, in ore.
- **autorità emittente** (`nmo:hasAuthority`) e **zecca** (`nmo:hasMint`).

### 3.2 Perché sono legati, e perché non vanno appiattiti

Nella moneta provinciale d'Asia Minore — il nostro terreno — il nominale quasi
mai è dichiarato dalla moneta: si **deduce** da metallo + modulo + peso, dentro
il sistema ponderale della singola città. Lo stesso *assarion* non pesa uguale a
Saittai e a Silandos. I cataloghi lo dicono apertamente scrivendo `Æ 25`
(bronzo, 25 mm) e lasciando il nominale implicito.

Ne segue la regola di modellazione:

> **metallo, peso, modulo e asse sono dati osservati; il nominale è
> un'inferenza.** Devono stare in campi distinti, e il nominale deve portare un
> grado di certezza e l'indicazione di chi lo propone.

È la stessa distinzione che ILA applica già altrove — `<supplied>` marcato,
apparato critico, `cert="low"` sul lessico cultuale. Applicarla qui non
introduce un principio nuovo: lo estende.

Corollario: **peso e modulo appartengono all'esemplare, non al tipo.** Su una
scheda di tipo sono un intervallo o una media; su un esemplare sono una misura.

### 3.3 Dove metterli

EpiDoc non ha un elemento per il nominale, e `<objectType>` è già occupato da
`coin`. La strada coerente con il progetto è quella già battuta per
l'iconografia: **un secondo blocco in `<xenoData>`, in un namespace proprio**,
con ogni elemento agganciato a Nomisma via `@ref` (vedi §9).

```xml
<xenoData>
  <num:numismatics xmlns:num="https://ila-project.org/ns/numismatics">
    <num:metal key="ae" ref="http://nomisma.org/id/ae">bronzo</num:metal>
    <num:denomination key="assarion" cert="low" resp="#RPC">assarion</num:denomination>
    <num:authority key="Antoninus_Pius" ref="http://nomisma.org/id/antoninus_pius"/>
    <num:mint ref="http://nomisma.org/id/saitta"
              corresp="https://pleiades.stoa.org/places/609517">Saittai</num:mint>
    <num:weightStandard/>
    <num:measures>
      <num:diameter unit="mm" atLeast="24" atMost="26"/>
      <num:weight unit="g" atLeast="6.1" atMost="7.4"/>
    </num:measures>
    <num:specimen ref="https://rpc.ashmus.ox.ac.uk/coin/297414">
      <num:weight unit="g">6.84</num:weight>
      <num:diameter unit="mm">25</num:diameter>
      <num:axis unit="h">6</num:axis>
      <num:collection>Ashmolean Museum</num:collection>
    </num:specimen>
  </num:numismatics>
  <ica:iconography …/>
</xenoData>
```

`<material>` in `supportDesc` resta, ma con valore specifico e `@ref` a Nomisma:
il vocabolario EAGLE non ha granularità numismatica (si ferma a «Metal»).

Nota che `assarion` **non ha un id Nomisma** (§9.3): porta solo `@key` nostro.

## 4. Tipo o esemplare: che cosa è una scheda — **deciso**

> **La scheda ILA corrisponde al tipo.** Gli esemplari sono testimoni del tipo,
> non schede autonome. *(deciso il 2026-09-21)*

Non è un'eccezione nel corpus: è lo stesso rapporto che ILA ha già con le
iscrizioni perdute note da più apografi — l'entità schedata è il testo, le copie
sono testimoni. La scelta trova conferma anche fuori di casa: l'ontologia
Nomisma distingue `nmo:NumismaticObject` (l'esemplare) da
**`nmo:TypeSeriesItem`** (il tipo in un repertorio), e nel loro store i tipi
sono 138.270 contro 549.149 esemplari. La nostra unità di schedatura ha quindi
già una classe standard a cui corrispondere.

Conseguenze operative, da applicare senza eccezioni:

- **La scheda** porta: zecca, autorità, datazione, metallo, nominale, i due tipi
  (D/R), la legenda, il riferimento al repertorio. Peso e modulo, se presenti,
  sono **intervalli** (`@atLeast`/`@atMost`), mai misure singole.
- **L'esemplare** (`num:specimen`, ripetibile) porta: peso, modulo, asse di
  conio, collezione, immagine, URI del singolo pezzo.
- `msIdentifier/repository` e `provenance` **restano strutturalmente vuoti**
  sulle schede numismatiche: non sono un difetto di compilazione, e l'editor a
  sezioni non deve segnalarli come mancanti.
- Ricade anche sulla validazione: i controlli «scheda senza luogo di
  conservazione» vanno condizionati al tipo di scheda.

Avvertenza da portarsi dietro: Nomisma non ha una proprietà `hasMinWeight` /
`hasMaxWeight` (le ha solo per diametro, altezza, larghezza e spessore), e
`nmo:hasWeight` è definito come «the *actual* weight», cioè dell'esemplare. Sul
peso di un tipo l'ontologia standard non ci copre: il range resta un nostro
attributo (§9.4).

## 5. Le due facce

RPC usa il meccanismo EpiDoc standard: `<div type="textpart" subtype="face"
n="obv|rev">`, ripetuto identico dentro `edition`, `translation` e `commentary`.
Il nostro parser sa già leggere i `textpart` annidati ([`xmlUtils.ts:942`]), ma
il modello dati li appiattisce: `Monumento.testo` è una stringa sola e
`traduzioni` è indicizzato per lingua, non per faccia.

Da qui viene il vincolo più pervasivo del piano: **`obv`/`rev` deve diventare
una dimensione del modello**, non un'etichetta nel testo. E deve essere *la
stessa* chiave in tutti e tre i luoghi (edizione, traduzione, iconografia),
altrimenti nulla si allinea.

Nota: la legenda del rovescio in questo file è `<space unit="side"/>`, cioè
«faccia anepigrafe». Da noi `anepigr` è un booleano di scheda: va portato a
livello di faccia.

---

## 6. Il ponte iconografico — il campo dei tipi

### 6.1 Come RPC descrive un tipo

Il dato sta in `div type="commentary" subtype="face"`, in prosa libera:

> *obv.* «bare head of Augustus left; in front palm; behind, winged caduceus»
> *rev.* «round shield; around, some large pellets»

Non è strutturato, non è vocabolarizzato, non ha identificatori. Ma **non è
prosa qualsiasi**: la tradizione catalografica numismatica segue una sintassi
molto regolare, che si può leggere come una griglia:

```
[stato/troncatura] [soggetto] [orientamento] ; [posizione relativa] [oggetto] …
 bare head          Augustus   left          ; in front           palm
                                             ; behind             winged caduceus
```

### 6.2 Come si mappa sul nostro modello

Il nostro `ica:figure` / `ica:trait` ([`types.ts:75`], [`xmlUtils.ts:1442`])
copre già buona parte della griglia. Quel che manca:

| elemento numismatico | in ICA oggi | intervento |
|---|---|---|
| soggetto («Augustus», «shield») | `ica:figure @type @key` | nessuno — si estende il vocabolario |
| oggetti accessori («palm», «caduceus») | `ica:trait type="held_object"` / `figure type="symbol"` | nessuno |
| **orientamento** («left», «right», «facing») | **assente** | nuovo `@dir` su `ica:figure` |
| **posizione relativa** («in front», «behind», «at feet», «around») | `@place` a quadranti (`upper_left`…) | il vocabolario attuale è assoluto, serve un asse **relazionale** |
| **troncatura del ritratto** («bare head», «draped bust») | parzialmente in `headgear` | nuovo `trait type="portrait"` — §6.3 |
| **faccia** (D/R) | **assente** | nuovo livello `ica:side @n="obv\|rev"` |

Struttura risultante, con `@n` che riusa *la stessa chiave* dei `textpart`:

```xml
<ica:iconography>
  <ica:side n="obv">
    <ica:figure n="1" type="deity" key="Men" dir="right">
      <ica:trait type="portrait"    key="draped_bust"/>
      <ica:trait type="headgear"    key="phrygian_cap"/>
      <ica:trait type="lunar"       key="crescent_shoulders"/>
    </ica:figure>
  </ica:side>
  <ica:side n="rev">
    <ica:figure n="1" type="symbol" key="pine_cone" rel="in_front_of" relTo="2"/>
    …
  </ica:side>
</ica:iconography>
```

Per l'epigrafia `ica:side` semplicemente non compare: il livello è opzionale e
retrocompatibile con le 295 schede esistenti.

### 6.3 Il punto da non sbagliare: un vocabolario solo

`radiate` e `laureate` nella prosa numismatica sono attributi del ritratto; da
noi `radiate_crown` è già in `headgear`. Se la sezione numismatica si crea un
vocabolario suo, ci ritroviamo con due chiavi per la stessa corona e la query
«tutte le attestazioni di Men con corona radiata» smette di funzionare a
cavallo dei due sottocorpora.

> **Il vocabolario ICA resta uno e si estende; non si biforca.**

È qui che sta il valore dell'operazione: i tratti diagnostici di Men — berretto
frigio, falce lunare sulle spalle, pigna, gallo, toro — sono **gli stessi** su
una stele di Saittai e su un bronzo civico. Condividendo le chiavi, il confronto
fra evidenza epigrafico-figurativa e monetale diventa una query; duplicandole,
resta un lavoro a mano.

### 6.4 `ica:function` non si applica

`function` è la funzione cultuale del monumento (votiva, lex sacra, confessione,
onoraria, funeraria, oracolare): nessuna di queste descrive un'emissione
monetale. Il campo va reso esplicitamente opzionale e lasciato vuoto sulle
schede numismatiche — non forzato con un valore di comodo. Se serve registrare
l'occasione dell'emissione (neocoria, omonoia, gioco), è un campo `num:`, non
una funzione cultuale.

---

## 7. Sequenza di lavoro — stato al 2026-09-21

Nessuna di queste fasi popola dati: il corpus numismatico resta vuoto.

- **N0 — decisioni.** ✅ ~~Tipo vs esemplare~~: **la scheda è il tipo** (§4).
  Nomisma verificato e adottato come vocabolario `@ref`, non come modello (§9.5).
- **N0b — tabella di risoluzione Nomisma.** ✅ `src/lib/numismaticVocab.ts`:
  metalli, nominali, tecniche e zecche, con gli id verificati e le assenze
  registrate come tali. Nessun id cablato nei componenti.
- **N1 — `ica:side` e i tre nuovi assi** (`@dir`, `@rel`/`@relTo`,
  `trait type="portrait"`). ✅ `types.ts`, `renderIconography`,
  `extractIconography`. Le figure restano in un array piatto con `side` sulla
  singola figura: filtri, ricerca e pannello iconografico non sono stati
  toccati, e le 295 schede epigrafiche continuano a serializzarsi identiche.
- **N2 — armonizzazione del vocabolario.** ✅ `iconographyLabels.ts` esteso con
  troncature, pose, fisionomia, orientamento, posizione relativa e i simboli
  monetali ricorrenti — nello stesso registro dell'epigrafia, con le
  equivalenze già esistenti riusate e non duplicate.
- **N3 — blocco `num:`.** ✅ Modello (`NumismaticData`), serializzatore
  (`renderNumismatics`), parser (`extractNumismatics`), un solo `<xenoData>`
  per i due blocchi (`renderXenoData`), limiti di validazione anche nella via
  statica (`apiShim.ts`). Pannello di lettura `NumismaticsPanel.tsx` e sezione
  «Numismatica» nell'editor a sezioni.
- **N4 — faccia come dimensione del modello.** ✅ `EditionFace` letta dai
  `<div type="textpart" subtype="face">`, `anepigr` per faccia (e di scheda solo
  se sono mute tutte e due), `Traduzione.face` con le traduzioni di una stessa
  lingua raccolte in un solo `<div type="translation">`. `Monumento.testo` resta
  l'XML completo e la sola cosa scritta: `facce` ne è la lettura, e chi la
  modifica rigenera il testo con `renderEditionFaces` — un solo scrittore, due
  viste che non possono divergere. Nella scheda le due legende si leggono
  separate; nell'editor si dividono e si riuniscono con un comando.
- **N5 — `facsimile`.** ✅ `Facsimile[]` con `surface`, scritto in
  `<surface type="obverse|reverse">`. I due campi singoli storici restano il
  riflesso della prima immagine, così i punti che ne leggono uno solo
  continuano a funzionare. Ricaduta sull'epigrafia: la scheda accetta ora più
  immagini, non più una sola.
- **N6 — fonti nel registro.** ✅ `printSources.ts`: **CMRDM II** (con
  l'identificatore «zecca + numero» e le note di collazione sul PDF) e **RPC**.
- **N7 — mappatura assistita della prosa dei tipi.** ✅ come skill:
  `.claude/skills/cmrdm-ii-numismatica/`, con segmentatore testato sul PDF
  reale. La revisione umana resta obbligatoria.

- **N8 — la sezione nel database.** ✅ `src/lib/sezioni.ts`: il registro delle
  sezioni del corpus (etichette, numerazione, nomi di file, colore). La
  sezione diventa un campo della scheda (`Monumento.sezione`), derivato
  dall'id quando c'è e dal contenuto quando la scheda arriva dall'estrazione.

  Decisioni prese il 2026-09-21, in aggiunta a §4:

  - **Serie di identificatori separata.** Un tipo monetale si cita `ILA-N-007`,
    un'epigrafe resta `ILA-042`. Le due serie hanno una numerazione propria che
    parte da 1, e il riordino degli id lavora dentro una sezione senza toccare
    l'altra.
  - **Un blocco di id per sezione** (`AMPIEZZA_BLOCCO = 10000`) invece di due
    contatori: `Monumento.id` resta unico e numerico — è la chiave di tutta
    l'applicazione — e il numero di sezione è `id - offset`. Niente stato da
    tenere allineato, e la sezione si legge dall'id anche fuori dall'app.
  - **Una sola cartella `corpus/`.** La sezione è un campo, non una directory:
    un solo store, un solo boot-sync, un solo indice di ricerca, e nessun punto
    in cui i due sottocorpora possano divergere.
  - **`<idno type="ILA">`** accanto all'id applicativo: l'etichetta citabile,
    derivata e mai digitata, che dice la sezione a chi apre il file fuori
    dall'app. Rientra fra i tipi riservati, così non torna indietro come
    repertorio esterno.
  - **Le sezioni dell'editor che non si applicano si dicono tali.** Su un tipo
    monetale Conservazione, Provenienza, Impaginazione e Mano sono marcate
    `n/a` invece che «assenti»: un tipo non è conservato da nessuna parte
    (§4), e lasciarle vuote è la compilazione corretta, non una lacuna.
  - Nel catalogo la scelta della sezione sta in testa all'elenco, con i
    conteggi, accanto all'ordinamento; nella scheda la sezione compare come
    etichetta solo quando non è quella epigrafica.

Colore della sezione: **oro** (`--num`), token accanto a `--cult` e `--lit`.

## 8. Decisioni aperte

1. ~~Tipo o esemplare come unità di schedatura~~ — **deciso: il tipo** (§4).
2. **Nominale `assarion`**: chiave locale, o proposta di un id a Nomisma? (§9.3)
3. **Deità Men**: chiave locale `Men`, o proposta di un id a Nomisma? (§9.3)
4. **L'EpiDoc di RPC basta?** No, se servono metallo, nominale, peso e modulo
   (§1). Va deciso se attingere anche all'interfaccia RPC o a OCRE.
5. **Come registrare la redazione assistita da LLM** della fonte a monte (§1):
   probabilmente un `<note>` nella bibliografia, non un silenzio.
6. **Vocabolario dell'orientamento e della posizione relativa** (§6.2): chiuso,
   o aperto con overlay come si è fatto per il lessico cultuale?

---

## 9. Nomisma — che cosa integrare

*Analisi condotta il 2026-09-21 su `nomisma.org/ontology` (versione datata
2025-01-22) e sullo SPARQL endpoint `nomisma.org/query`.*

### 9.1 Che cosa è NMO, e che cosa non è

NMO è **un'ontologia di attributi**, non un modello di descrizione figurativa.
Copre con precisione i campi che a noi mancano — materia, nominale, autorità,
zecca, misure, asse, sistema ponderale — e non copre affatto il campo dei tipi.

Conseguenza, che è il risultato più importante di questa verifica:

> **Sul terreno iconografico Nomisma non ha nulla da darci.** `nmo:hasIconography`
> è una proprietà nuda: non esiste una classe `Iconography`, non esiste
> scomposizione in figure e attributi, e `nmo:hasPortrait` si limita a
> «identifies the person whose portrait appears». Nel loro store aggregato la
> proprietà `nmo:hasIconography` **non ha un solo triple**: i progetti ci
> mettono prosa libera, che non viene aggregata.

Il nostro `ica:iconography`, con `figure` + `trait` a vocabolario controllato, è
**strutturalmente più ricco** di quanto lo standard di settore preveda. Non c'è
quindi nulla da adottare lì, e soprattutto nessuna ragione di indebolire il
modello ICA per somigliare a NMO. Nomisma serve per l'**identità** della figura
(`nm:apollo`, `nm:zeus`), da agganciare come `@ref` sulla nostra `ica:figure`;
la **descrizione** resta nostra.

### 9.2 Le proprietà da adottare

Mappatura diretta sul blocco `num:` di §3.3:

| NMO | `num:` | Note |
|---|---|---|
| `nmo:hasMaterial` | `num:metal` | 36 concetti; `ae`, `ar`, `av`, `billon`, `orichalcum` |
| `nmo:hasDenomination` | `num:denomination` | 1097 concetti (§9.3) |
| `nmo:hasAuthority` | `num:authority` | l'autorità reale dell'emissione |
| `nmo:hasStatedAuthority` | `num:statedAuthority` | **l'autorità come dichiarata dalla moneta** |
| `nmo:hasIssuer` | `num:issuer` | il magistrato responsabile, spesso nominato |
| `nmo:hasMint` | `num:mint` | 2580 concetti, con ponte a Pleiades (§9.3) |
| `nmo:hasWeightStandard` | `num:weightStandard` | il sistema ponderale locale — §3.2 |
| `nmo:hasAxis` | `num:axis` | asse di conio |
| `nmo:hasManufacture` | `num:manufacture` | `struck` / `cast` |
| `nmo:hasObjectType` | `<objectType>` | già nostro |
| `nmo:hasStartDate` / `hasEndDate` | `origDate` | già nostro, formato compatibile |
| `nmo:hasCountermark`, `hasControlmark`, `hasMintmark` | `num:mark` | contromarche e sigle di zecca |
| `nmo:hasObverse` / `hasReverse` | `ica:side n="obv\|rev"` | conferma il livello di §6.2 |
| `nmo:hasLegend` | `div type="edition"` | già nostro, per faccia |

Da adottare **solo su `num:specimen`** (§4): `hasWeight`, `hasDiameter`,
`hasCollection`, `hasFindspot`, `hasWear`, `hasCorrosion`,
`hasSecondaryTreatment`, `hasPeculiarity`.

Il ritrovamento merita una nota a parte: NMO ha `Hoard`, `Find`, `Context`,
`DepositionType` — un apparato per i ripostigli che ILA oggi non ha (il nostro
`provenance type="found"` è un campo di testo). Fuori portata adesso, ma è
l'aggancio naturale se un giorno servisse.

**Conferma metodologica:** la coppia `hasAuthority` / `hasStatedAuthority` è
esattamente la distinzione fra dato osservato e ricostruzione che §3.2 chiede
per il nominale. Lo standard di settore fa la stessa scelta che stiamo facendo
noi — un motivo in più per non appiattire i due piani.

### 9.3 Copertura dei vocabolari: dove Nomisma ci serve e dove no

Verificato interrogando l'endpoint, non per congettura.

**Funziona bene — le zecche.** `nm:saitta` esiste come `nmo:Mint`, con
coordinate geografiche e — punto decisivo — **`skos:exactMatch` verso
`pleiades.stoa.org/places/609517`**. Siccome ILA usa già Pleiades in
`origPlace/placeName/@ref`, il ponte fra le due sezioni del corpus è
immediato e non richiede alcuna decisione nuova: è l'integrazione più
conveniente del lotto.

Tre cautele però:
- gli id non sono prevedibili (`saitta` sì, `saittai` no; `silandus` sì,
  `hierocaesarea` no): serve **una tabella di risoluzione**, non un'euristica
  sulle stringhe;
- la copertura è parziale — 2580 zecche non sono tutte quelle dell'Asia Minore;
- **la qualità va verificata**: la definizione di `nm:saitta` recita «the ancient
  site of Saitta **in Phrygia**», mentre Saittai è in Lidia. Nomisma è un
  vocabolario utile, non un'autorità da citare senza controllo.

**Funziona bene — i metalli.** 36 concetti, con `skos:prefLabel` in decine di
lingue, **italiano compreso** (`nm:ae` → «Bronzo»@it). Sono etichette pronte
per l'interfaccia, gratis, e coerenti con la scelta di non cablare vocabolari
nel codice. Attenzione agli id: `billon` e `orichalcum` risolvono, `electrum` e
`lead` no con quelle forme — anche qui, tabella.

**Non funziona — il nominale provinciale.** Le 1097 denominazioni coprono
benissimo il greco classico ed ellenistico (`drachma`, `tetradrachm`, `obol`,
`chalkous`, `trichalkon`, `hemiobol`…), ma **`assarion` non esiste**, in nessuna
grafia. È il nominale corrente del bronzo civico d'Asia Minore, cioè proprio il
nostro materiale. Serve una chiave locale, con l'opzione di proporre l'id a
monte.

**Non funziona — Men.** Una ricerca esaustiva su tutte le `skos:prefLabel`
inglesi dell'endpoint non restituisce **alcun id per il dio Men**: escono
`mende`, `menaenum`, `meniskos_byzantium`, `menandros_athens` e altri omonimi,
nessuna divinità. Esistono `nm:apollo`, `nm:zeus`, `nm:artemis`, `nm:cybele`,
tipizzati `wordnet:Deity` e con etichetta italiana — ma non la divinità intorno
a cui ruota il corpus.

Questo chiude la questione sollevata in §6.3 dalla parte opposta a quella che ci
si aspetterebbe: non solo il vocabolario ICA **non va biforcato**, ma per la
divinità centrale di ILA **non esiste un'autorità esterna a cui delegare**. La
chiave `Men` del nostro vocabolario resta la sola identificazione disponibile, e
diventa un piccolo contributo che il progetto può restituire a monte.

### 9.4 Dove NMO non copre e restiamo noi

- **peso e modulo di un *tipo***: NMO ha `hasMinDiameter`/`hasMaxDiameter` ma
  nessun `hasMinWeight`/`hasMaxWeight`, e `hasWeight` è per definizione quello
  dell'esemplare. Il range di peso resta un nostro attributo.
- **grado di certezza sul nominale** (§3.2): NMO non prevede `@cert` né `@resp`
  sulle sue proprietà. È markup nostro, coerente con il resto di ILA.
- **tutta la descrizione figurativa** (§9.1).

### 9.5 Come integrarlo, in una riga

> **Nomisma si adotta come vocabolario di riferimento (`@ref`), non come modello
> di dati.** La forma del blocco `num:` resta nostra e resta TEI/EpiDoc; ogni
> valore porta l'URI Nomisma quando esiste, la sola chiave locale quando non
> esiste. Nessun id cablato nel codice: una tabella di risoluzione accanto a
> `printSources.ts`, sullo stesso principio.
