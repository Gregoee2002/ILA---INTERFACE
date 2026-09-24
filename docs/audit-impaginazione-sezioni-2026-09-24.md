# Audit dell'impaginazione delle sezioni — 2026-09-24

Build statica in locale (`star-static-dev`), 1440×900 e 375×812, corpus di 294 schede.
Solo rilevazione: nessuna modifica al codice.

## A. Sezioni della scheda (Supporto · Iscrizione · Iconografia · Bibliografia)

### A1 — Bloccante: su desktop il fondo della sezione Iscrizione è irraggiungibile
Il riquadro dei contenuti ha `md:overflow-hidden` (`src/App.tsx:7434`, da cc90a97,
«pagina di nuovo fissa»). Scorre solo lo specchio dell'edizione (`max-h-[52vh]`, :7814);
quello che c'è sotto (Traduzione, Apparatus critico, Commento) esce dal riquadro e
non si raggiunge in nessun modo.

- ILA-107 a 900 px: la Traduzione occupa 811→1336 px, il riquadro finisce a 854 px →
  si vede solo l'occhiello «Traduzione»; apparato e commento restano fuori.
- ILA-005 (edizione di sette righe): anche qui manca l'ultima riga della traduzione.
- La traduzione c'è in 286 schede su 294 e l'apparato in 279: a 900 px di altezza il
  problema riguarda in pratica tutto il corpus.
- Su telefono la pagina scorre (l'`overflow-hidden` vale solo da `md`), quindi il difetto
  è solo desktop.

Rimedio possibile: rendere scorrevole la colonna della sezione Iscrizione (`md:overflow-y-auto`
sul riquadro, o almeno sul contenitore di :7775) e togliere il `max-h` interno dell'edizione,
così che non restino due barre di scorrimento una dentro l'altra.

### A2 — L'intestazione della scheda compare solo in Supporto
Regione, località, sigla e titolo (h2 da 48 px) stanno dentro il ramo
`activeRecordSection === 'supporto'` (:7435). Passando a Iscrizione, Iconografia o
Bibliografia il titolo sparisce e la pagina si apre direttamente con la rubrica della
sezione: cambiando scheda non si capisce più quale si sta leggendo.

### A3 — Tre allineamenti diversi per la colonna di testo
| Sezione | Contenitore | Resa |
|---|---|---|
| Supporto | tutta la larghezza (≈1000 px), griglia a 2 colonne | a sinistra |
| Iscrizione | `max-w-[70ch] mx-auto` (:7775) | **centrata** (L563) |
| Iconografia | tutta la larghezza (≈1014 px) | a sinistra |
| Bibliografia | `max-w-[70ch]` **senza** `mx-auto` (:8050) | stretta, **a sinistra** (L325), metà pagina vuota |

Iscrizione e Bibliografia usano la stessa misura ma una è centrata e l'altra no.

### A4 — Rubriche di sezione in quattro stili
| Dove | Rubrica | Resa |
|---|---|---|
| Supporto | «Layout & Supporto Materiale», «Georeferenziazione & Date Storiche» (:7636, :7694) | Inter 10 px maiuscolo, accento |
| Iscrizione | «Trascrizione Testuale», «Commento» | Garamond 24 px corsivo grassetto, con fregio |
| Iconografia | «Indici» (:7965) | come sopra, 24 px |
| Bibliografia | «Bibliografia», «Edizione di riferimento» (:8053) | Garamond **20 px** (`text-xl`, `gap-3`), fregio diverso (`h-px w-8`, niente rombo) |

Dentro Iconografia, inoltre:
- «Divinità», «Epiteti», «Imperatori» sono h4 in Garamond; «Onomastica» (:8004) ha
  `font-sans` e viene in Inter: nella stessa griglia ci sono due caratteri diversi.
- «Commento iconografico» è in Garamond 12 px maiuscolo, «Iconografia e funzione cultuale»
  (`IconographyPanel.tsx:38`) in Inter 10 px con icona: due sottosezioni vicine
  con rese diverse.

### A5 — La sezione Iconografia si apre con «Indici»
La voce di navigazione dice Iconografia, ma la prima rubrica della pagina è «Indici»
(divinità, epiteti, onomastica). L'iconografia vera e propria arriva per terza, e nella
scheda di prova è vuota. Due strade: rinominare la voce («Indici e iconografia») o
spostare gli indici in un'altra sezione.

### A6 — Minori
- Etichette in inglese dentro la scheda: «Layout», «EAGLE Writing/Object/Material Link»,
  «Facsimile / Squeeze Image», «Apparatus Critico», «122-123 A.D. (Sullan era)».
- Una stessa datazione scritta in tre modi nella stessa pagina: «122 D.C. - 123 D.C.»
  (Dettagli), «122-123 A.D.» e «122 d.C. / 123 d.C.» (Georeferenziazione).
- Il titolo lungo va a capo lasciando «Gyölde» da solo sulla seconda riga (ILA-005).
- In Supporto la colonna sinistra è molto più corta della destra (mappa e date), e sotto
  resta un grande vuoto.
- Telefono: la navigazione delle sezioni e i Dettagli riempiono tutta la prima schermata;
  toccando una sezione il contenuto resta sotto la piega.

## B. Sezioni del sito (viste)

Margine sinistro del primo testo e tipo di intestazione, a 1440 px:

| Vista | Primo testo da | Intestazione |
|---|---|---|
| Home | 120 | occhiello «Benvenuto» + frase, niente titolo |
| Catalogo | 89 | barra flottante «‹ ILA» + ricerca; niente titolo di vista |
| Fonti letterarie | 176 | h2 20 px + sottotitolo in linea, sottoviste a destra |
| Mappa | 101 | nessuna (pannello «Filtri della mappa») |
| Cronologia | 88 | solo il contatore «42 di 294 schede datate», a filo in alto |
| Statistiche | 85 | solo le linguette, a filo in alto |
| Heatmap | 109 | solo una riga descrittiva |
| Lessico cultuale | 344 (colonna centrata ≈820 px) | h2 20 px + sottotitolo in linea |
| Editor | 64 | occhiello «Officina filologica» + h2 30 px, **a filo del bordo superiore** |

- **B1**: nessuna griglia comune. Il margine sinistro va da 64 a 176 px (344 per la colonna
  centrata), e solo tre viste su nove hanno un titolo, ciascuna in uno stile diverso.
  Fonti letterarie e Lessico cultuale sono le più coerenti (titolo + sottotitolo in linea):
  sono il modello naturale da estendere alle altre.
- **B2**: nell'Editor l'occhiello tocca il bordo superiore della finestra (niente padding
  in alto), e le due carte occupano due terzi della larghezza, lasciando vuota la terza colonna.
- **B3**: in Cronologia e Statistiche il primo elemento sta a ≈10 px dal bordo superiore,
  contro i 24–40 px delle altre viste.
- **B4**: in Statistiche › Divinità la voce selezionata si ingrandisce e viene troncata
  («Agathos D…»); la barra di scorrimento della lista finisce a metà altezza, mentre le voci
  proseguono sotto.
- **B5**: nella Mappa le tessere CARTO mostrano la filigrana «API KEY REQUIRED» su tutto
  lo sfondo (almeno in locale; da verificare sulla build pubblicata).

## Fuori tema, visto di passaggio
Un indirizzo profondo (`?vista=catalog&scheda=ILA-107`) **non** salta il frontespizio:
l'effetto in `App.tsx:4458` aspetta `monumenti`, ma il corpus comincia a caricarsi solo
dopo «Entra nel catalogo». Il commento dice il contrario («Un indirizzo profondo salta il
frontespizio»). Dopo l'ingresso la scheda si apre correttamente.

## Ordine di intervento proposto
1. A1 (contenuto irraggiungibile).
2. A2 + A3 + A4: una sola testata di scheda comune a tutte le sezioni, una sola misura
   e un solo allineamento di colonna, un solo stile di rubrica.
3. A5 (nome o contenuto della sezione Iconografia).
4. B1–B3 (griglia e testata comuni alle viste), da concordare prima: l'audit di veste
   esteso del 17/9 è stato annullato (f2cd628).
5. A6, B4, B5.

## Esecuzione (stesso giorno)

| Punto | Stato | Come |
|---|---|---|
| A1 | fatto | La scheda resta ferma: scorre solo il corpo della sezione, sotto la testatina. In Iscrizione, da xl in su, testo e traduzione/apparato/commento stanno a fronte e ogni colonna scorre per conto suo; sotto xl le colonne si impilano e scorre il corpo. Verificato su ILA-005 e ILA-107 (1440×900, 1100×800): nessun testo irraggiungibile. |
| A2 | fatto | Testatina su una riga (sigla · località · titolo) nelle sezioni diverse da Supporto, dove resta l'intestazione piena. |
| A3 | fatto | Colonna di lettura unica (`COLONNA_SEZIONE`, 70ch, sempre a sinistra). |
| A4 | fatto | Due soli livelli: `RubricaSezione` e `SOTTORUBRICA` (`src/components/RubricaSezione.tsx`). Supporto: «Supporto e impaginazione», «Luogo e datazione». |
| A5 | fatto | La voce diventa «Indici e iconografia»; il secondo blocco ha la sua rubrica «Iconografia». |
| A6 | in parte | Etichette inglesi dell'interfaccia tradotte; datazioni con il trattino lungo e senza il maiuscolo forzato su «d.C.»; titolo con `text-balance`; su telefono la sezione scelta sale in vista. Resta «A.D. (Sullan era)», che viene dai dati XML. |
| B1, B3 | non fatti | Da concordare. La Cronologia è senza testata per scelta (commento in `Timeline`). |
| B2 | fatto | Margini attorno all'Editor. Le due carte restano entro `max-w-4xl`, che è voluto. |
| B3 (Statistiche) | fatto | Spazio sopra le linguette. |
| B4 | fatto | Rubrica delle divinità più larga (`DIAGONAL_BASE_X` 200) e «1 occorrenza» al singolare. |
| B5 | fatto | Base Esri Light Gray: CARTO restituisce la filigrana su ogni percorso. |
