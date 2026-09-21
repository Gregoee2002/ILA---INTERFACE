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
l'iconografia: **un secondo blocco in `<xenoData>`, in un namespace proprio.**

```xml
<xenoData>
  <num:numismatics xmlns:num="https://ila-project.org/ns/numismatics">
    <num:metal key="ae" ref="http://nomisma.org/id/ae">bronzo</num:metal>
    <num:denomination key="assarion" ref="http://nomisma.org/id/assarion"
                      cert="low" resp="#RPC"/>
    <num:authority key="Antoninus_Pius"/>
    <num:mint ref="https://pleiades.stoa.org/places/550695">Saittai</num:mint>
    <num:measures>
      <num:diameter unit="mm" atLeast="24" atMost="26"/>
      <num:weight unit="g" atLeast="6.1" atMost="7.4"/>
      <num:dieAxis unit="h">6</num:dieAxis>
    </num:measures>
  </num:numismatics>
  <ica:iconography …/>
</xenoData>
```

`<material>` in `supportDesc` resta, ma con valore specifico e `@ref` a Nomisma:
il vocabolario EAGLE non ha granularità numismatica (si ferma a «Metal»).

---

## 4. Tipo o esemplare: che cosa è una scheda

Il file campione descrive un **tipo**. ILA è un corpus di monumenti, cioè di
oggetti singoli. La decisione va presa prima di ogni altra cosa perché ricade su
metà dei campi.

**Proposta: la scheda ILA corrisponde al tipo; gli esemplari sono testimoni.**

Non è un'eccezione nel corpus: è lo stesso rapporto che ILA ha già con le
iscrizioni perdute note da più apografi — l'entità schedata è il testo, le
copie sono testimoni. Sul piano pratico:

- la scheda porta zecca, autorità, datazione, metallo, nominale, i due tipi
  (D/R), la legenda;
- gli esemplari (`num:specimen`) portano peso, modulo, asse, collezione,
  riferimento RPC al singolo pezzo, immagine;
- `msIdentifier/repository` e `provenance` si applicano all'esemplare, non alla
  scheda — e quindi restano vuoti sulle schede numismatiche, senza che questo
  sia un difetto di compilazione.

---

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

## 7. Sequenza di lavoro

Nessuna di queste fasi popola dati.

- **N0 — decisioni.** Sciogliere §4 (tipo vs esemplare) e confermare Nomisma
  come vocabolario per metallo e nominale. Tutto il resto dipende da qui.
- **N1 — `ica:side` e i tre nuovi assi** (`@dir`, `@rel`/`@relTo`,
  `trait type="portrait"`): estensione dello schema iconografico, opzionale,
  retrocompatibile. Serializzatore in `renderIconography`, parser in
  `extractIconography`.
- **N2 — armonizzazione del vocabolario** (§6.3): censire le sovrapposizioni fra
  termini numismatici e chiavi ICA esistenti *prima* di aggiungerne di nuovi.
- **N3 — blocco `num:`** (§3.3) nel modello, nel serializzatore e nell'editor a
  sezioni.
- **N4 — faccia come dimensione del modello** (§5): edizione, traduzione e
  `anepigr` per faccia.
- **N5 — `facsimile`** (§2.3): immagini D/R, con ricaduta positiva anche sulle
  schede epigrafiche.
- **N6 — RPC nel registro delle fonti** (`printSources.ts`) e nella licenza
  della scheda.
- **N7 — mappatura assistita della prosa dei tipi** verso ICA (§6.1), con
  revisione umana obbligatoria: la griglia è regolare ma non deterministica.

---

## 8. Decisioni aperte

1. **Tipo o esemplare** come unità di schedatura (§4) — blocca tutto il resto.
2. **Aderire a Nomisma** come vocabolario esterno, accanto a EAGLE e Pleiades?
   Conviene: è lo standard del settore ed è LOD, come gli altri che già usiamo.
3. **L'EpiDoc di RPC basta?** No, se servono metallo, nominale, peso e modulo
   (§1). Va deciso se attingere anche all'API RPC o a Nomisma/OCRE.
4. **Come registrare la redazione assistita da LLM** della fonte a monte
   (§1): probabilmente un `<note>` nella bibliografia, non un silenzio.
5. **Vocabolario dell'orientamento e della posizione relativa**: chiuso (elenco
   fisso) o aperto con overlay, come si è fatto per il lessico cultuale?
