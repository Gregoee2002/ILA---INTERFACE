# Il CMRDM II nel corpus — estrazione del 2026-09-21

Le 475 entry del volume II di Lane (*The Coins and Gems*, Leiden 1975) sono
entrate nel corpus come sezione numismatica: `ILA-N-001` … `ILA-N-475`,
nell'ordine geografico del volume (Ponto → Paflagonia → Bitinia → Eolide →
Ionia → Lidia → Caria → Frigia → Pisidia → Panfilia → Galazia → Siria, e in
coda le gemme).

**456 tipi monetali da 65 zecche, più 19 gemme.** La scheda è il tipo, non
l'esemplare: nessuna ha `<repository>` né `<provenance>`, i pesi dei singoli
pezzi stanno in `<num:specimen>` con la loro collezione (243 schede hanno anche
un intervallo sul tipo), e metallo e nominale non compaiono, perché Lane non li
dà mai. L'unica eccezione è `ILA-N-456`, il cistoforo di Adriano, dove Lane
scrive «the only silver coin with Men known to me»: lì, e solo lì,
`<num:metal key="ar">`.

## Come è stata fatta

1. `pdftotext -layout` sul PDF, poi il segmentatore della skill
   (`scripts/segment_cmrdm2.py`). Da solo si ferma a 441 entry su 475: **34
   testate** sono sfigurate dall'OCR al punto da non essere riconosciute
   (`NysaI`, `Sardis :2`, `Conan a 4`, e le gemme G3, G4, G5, G7, G9, G14, G18,
   G19, che hanno perso del tutto l'etichetta). Sono state recuperate a mano,
   una per una, e la copertura è 475/475: ogni zecca risulta numerata 1…N senza
   salti né doppioni, il che è il controllo più forte che si potesse fare senza
   riaprire il volume.
2. Ri-OCR del greco con Tesseract `grc` (`scripts/ocr-print-source.py`): il
   livello di testo del PDF rende il greco come mojibake. Il primo passaggio
   lasciava illeggibili 220 righe di legenda su 807; correggendo il
   classificatore — l'etichetta inglese `Inscription:` diluiva la quota di
   parole «strane» e le legende corte restavano sotto soglia — sono scese a
   135. La correzione è per ora solo nella copia di lavoro: se conviene, va
   portata anche in `scripts/ocr-print-source.py`.
3. Codifica in 21 lotti affidati ad altrettanti agenti, con un contratto di
   codifica unico e un lint che applica la scala FATAL/ERROR/WARNING del
   progetto. Esito finale sulle 475 schede: **0 FATAL, 0 ERROR**.

## Quel che manca, e perché manca

**133 facce senza legenda** (elenco in `legende-da-ritrascrivere.tsv`). Non
sono monete anepigrafi: sono facce la cui legenda il ri-OCR non ha reso, e che
nessuno ha voluto indovinare. Quasi tutte sono titolature imperiali del dritto,
cioè il testo più formulare del volume: si recuperano guardando la pagina. Undici
schede restano senza edizione del tutto (entrambe le facce illeggibili).
Distinguere: in una parte dei casi è **Lane stesso** a scrivere «Inscription
illegible», e lì la lacuna è del documento, non nostra.

**130 schede senza datazione**: il dritto non porta un ritratto imperiale ma
Men, il Senato, la Boule, il Demos o una divinità. `<origDate>` si scrive solo
quando l'imperatore è nominato — il regno è un dato, una stima no.

## Decisioni prese lungo la strada

Le riporto perché valgono per il futuro, non solo per questo lotto.

- **Copricapi.** `crescent on cap` → `lunar/crescent_cap`; `stars on cap` →
  `headgear/star`; `laurel wreath on cap` → `headgear/wreath`. La tabella della
  skill accorpava le tre cose sotto `crescent_cap`, cioè scriveva «falce» dove
  Lane dice «alloro»: `references/mappatura-campi.md` è stata corretta.
- **`Lane, II` e `Lane, III` nelle bibliografie non sono questo volume**: sono
  gli articoli *A Re-Study of the God Men* II e III (Berytus XVII, 1967-68).
  Gli scarti di numerazione che sembravano errori di segmentazione non lo sono.
- **Regni congiunti**: due ritratti → due `<num:authority>` e `origDate`
  sull'intersezione dei due regni.
- **Intervalli con una sola collezione nominata**: intervallo sul tipo più un
  solo `<num:specimen>`, quello a cui Lane attacca la collezione.
- **Pesi**: le cifre arabe che l'OCR scambia in lettere (`I2.50`, `4.gI`,
  `3-40`) si normalizzano solo se il risultato è plausibile; un peso già in
  chiaro si trascrive come sta anche se supera i 35 g (i medaglioni di Saitta
  arrivano a 51). Un peso sbagliato è un dato falso, non un refuso.
- **Nomisma**: `@ref` solo dalla tabella verificata. Sono 22 schede in tutto,
  Saitta e Silandus; per tutte le altre zecche l'id non esiste o non è stato
  verificato, e non si indovina.

## Quel che il vocabolario iconografico non sa ancora dire

Segnalato da quasi tutti i lotti, in ordine di frequenza:

- **«foot on bucranium»** — il piede posato sul bucranio, non il bucranio
  tenuto in mano. Ricorre in decine di schede fra Frigia, Pisidia e Panfilia ed
  è un tratto diagnostico del Men di quelle zecche. Oggi resta solo nella prosa
  di `<ica:note>`, cioè fuori da ogni ricerca. Servirebbe un `@rel="foot_on"`.
- **«Antiochene attributes»** — la formula con cui Lane rimanda, in una trentina
  di schede, agli attributi descritti per esteso una volta sola (Antioch 24).
  Propagarli sarebbe inferenza: se si vuole farlo, va fatto in un passaggio
  dichiarato su tutta la zecca.
- `gesture/hand_on_hip` (il tipo standard di Seleuceia, 8 schede su 14),
  `gesture/head_turned`, `held_object/axe`, `held_object/grapes`,
  `held_object/quiver`, `headgear/mural_crown`, `biga`, `globe`, `column`,
  `anchor`, e una relazione «dentro / fra» accanto a quelle esistenti.
- **78 chiavi di figura senza resa italiana** (Tyche, Zeus, Boule, Demos,
  `city_goddess`, `panther`…): il lint non le controlla perché non sono `trait`,
  ma nell'interfaccia compaiono così come sono.

## I file

| | |
|---|---|
| `concordanza-ila-cmrdm.tsv` | `ILA-N-nnn` ↔ zecca e numero di Lane |
| `legende-da-ritrascrivere.tsv` | le 133 facce da riprendere sul PDF |
| `report-batch.md` | i report dei 21 lotti, uno dopo l'altro, con il dettaglio entry per entry |
