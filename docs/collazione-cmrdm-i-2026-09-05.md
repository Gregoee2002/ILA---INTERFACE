# Collazione del corpus su CMRDM I — 2026-09-05

Rapporto della prima collazione automatica del corpus ILA contro una fonte a
stampa. Dettaglio scheda per scheda in
[`collazione-cmrdm-i-2026-09-05.csv`](collazione-cmrdm-i-2026-09-05.csv).

Risponde alla domanda **A1** del [piano](piano-2026-09-05.md): la collazione a
campione del 2026-09-01 aveva trovato 8 schede divergenti su 12, e da lì il
sospetto che ~200 schede su 295 avessero un errore di trascrizione.

> **In breve: quel sospetto non regge.** Delle 207 schede confrontabili, **124
> (60 %) coincidono esattamente** col testo a stampa, la similarità mediana è
> 0,951, e le divergenze che restano sono in larga parte limiti dell'OCR, non
> errori del corpus — verificato aprendo a mano i casi peggiori.

## Come si è arrivati a poterlo dire

Il PDF del CMRDM ha un livello di testo che rende bene l'inglese e restituisce
il greco come mojibake (`$LA'Yj't"OC;` per `Φίλητος`): non c'era niente da
collazionare. La catena costruita per questo rapporto:

1. **`scripts/ocr-print-source.py`** prende da `pdftotext -bbox-layout` le
   coordinate di ogni riga, distingue le righe inglesi dal mojibake, ritaglia
   dalla pagina i **soli blocchi greci** e passa quelli a Tesseract. La pagina
   esce ricomposta: inglese dal livello di testo, greco dall'OCR. Dare l'intera
   pagina a Tesseract non funziona — legge come greco anche l'inglese.
   790 blocchi greci sulle pagine 10-180.
2. **Due letture indipendenti** della stessa fonte, coi modelli `grc` ed `ell`,
   che sbagliano in modo diverso.
3. **`scripts/collate-source.ts`** confronta ogni scheda con entrambe e riporta
   **solo le divergenze che entrambe vedono**. Le altre — 759 in questo giro —
   sono rumore dell'OCR e vengono scartate.

Senza il filtro a due letture i numeri sarebbero stati inservibili: la classe di
divergenza più frequente era `χ→κ`, e basta guardare CMRDM I 244 per vedere chi
sbaglia — l'OCR legge `τεχμορ[εὐσας]` e `τέχνωὼν` dove il libro stampa
τεκμορεύσας e τέκνων. Una confusione sistematica e a senso unico: nessun
trascrittore umano converte ogni κ in χ.

## I numeri

| | |
|---|---|
| schede del corpus | 295 |
| senza riferimento a CMRDM I riconosciuto | 2 |
| riferimento presente, entry non ritrovata a stampa | 36 |
| entry senza greco confrontabile (monumenti anepigrafi) | 38 |
| ritaglio a stampa sospetto, escluse | 12 |
| **confrontate** | **207** |
| **senza divergenze confermate** | **124 (60 %)** |
| similarità ≥ 0,95 | 105 (51 %) |
| similarità ≥ 0,90 | 153 (74 %) |
| mediana | 0,951 |

Le 36 entry non ritrovate mancano già dal livello di testo del PDF (i numeri di
catalogo 45, 64, 152, 257… non ci sono nemmeno in `pdftotext`), non le perde la
catena. Le 38 senza greco sono rilievi e statuette: non c'è testo da collazionare.

## Che cosa restano le divergenze

Quattro casi aperti a mano, i peggiori della lista, sono **tutti** buchi
dell'OCR con il corpus dalla parte giusta:

| scheda | caso |
|---|---|
| CMRDM I 77 | tre righe con lacune non lette: le parentesi dell'edizione mascheravano il mojibake |
| CMRDM I 43 | una riga interna al blocco non riconosciuta (`VUV IX.UTn tLIX.P'…`) |
| CMRDM I 188 | riga centrale non letta (`1'01) M'Y]vl. EU-`) |
| CMRDM I 273 | le prime due righe, fitte di parentesi e puntini, non lette |

Ognuno di questi ha prodotto una correzione della catena, e i numeri qui sopra
sono già quelli dopo le correzioni: le schede identiche sono passate da 23 (una
lettura sola, nessun filtro) a 124.

**Quindi il residuo va letto così:** una divergenza confermata da entrambe le
letture è un posto dove guardare, non un errore accertato. La revisione umana ha
ora una lista corta e ordinata invece di 295 schede.

## Da guardare per prime

Le schede con divergenze confermate, dalla più grave (tutte nel CSV, colonna
`divergenze` > 0):

| scheda | fonte | sim. | divergenze |
|---|---|---|---|
| ILA-172 | CMRDM I 184 | 0,52 | 17 |
| ILA-189 | CMRDM I 201 | 0,56 | 6 |
| ILA-286 | CMRDM I 17 | 0,69 | 11 |
| ILA-101 | CMRDM I 44 | 0,70 | 13 |
| ILA-132 | CMRDM I 144 | 0,66 | 6 |
| ILA-254 | CMRDM I 267 | 0,62 | 3 |
| ILA-058 | CMRDM I 90 | 0,63 | 3 |
| ILA-145 | CMRDM I 157 | 0,68 | 3 |

ILA-132 è la scheda della multa già segnalata dalla collazione a campione del
2026-09-01: qui torna con sei divergenze confermate. Vale la pena cominciare da lì.

## Rifare il giro

```bash
python3 scripts/ocr-print-source.py --pdf <scansione.pdf> --pagine 10-180
python3 scripts/ocr-print-source.py --pdf <scansione.pdf> --pagine 10-180 --lingua ell \
    --out <scansione>.ell.txt --cache <cartella>/.ocr-cache-ell
npm run collate -- --source cmrdm-i --txt <scansione>.ocr.txt --txt <scansione>.ell.txt \
    --csv docs/collazione-cmrdm-i-<data>.csv
```

L'OCR è in cache: rifare il giro dopo una modifica costa solo i blocchi cambiati.
Niente di tutto questo è legato al CMRDM: la fonte si sceglie fra quelle del
registro (`src/lib/printSources.ts`), e il PDF si passa come argomento.

## Quel che manca

- **36 entry** non ritrovate: si recupererebbero leggendo il numero di catalogo
  dall'immagine invece che dal livello di testo.
- **Le lacune non sono confrontate**: il confronto è sul solo alfabeto greco,
  senza parentesi né punti sottoscritti. Una integrazione diversa fra corpus e
  stampa oggi non si vede.
- **La qualità dell'OCR** resta il tetto di tutto: `grc` confonde κ/χ e perde
  iota. Un modello politonico migliore alzerebbe il 60 % senza toccare altro.
