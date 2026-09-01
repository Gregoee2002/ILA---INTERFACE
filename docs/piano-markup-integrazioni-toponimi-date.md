# Markup mancante: integrazioni editoriali, toponimi, etnici, datazioni, somme

Stato: **ricognizione** — 2026-09-01.
Base: spoglio automatico dei 295 file di `src/data/corpus/`, limitato a
`<div type="edition">` salvo dove indicato. Nato a margine della revisione delle
213 traduzioni brevi (`Traduzioni_ILA_schede_brevi_rev2.docx`): tradurre
letteralmente ha reso visibili i punti in cui l'edizione porta convenzioni
Leiden come **testo semplice** invece che come markup.

## Quadro d'insieme

| tag EpiDoc | occorrenze nell'edizione | atteso (stima dallo spoglio) |
|---|---:|---:|
| `<supplied>` | 78 | ~600 |
| `<gap>` | 16 | ~90 |
| `<unclear>` | 0 | ~20 |
| `<expan>`/`<abbr>` | 9 | ~120 |
| `<placeName>` | 2 (solo ILA-107, ILA-108) | ~25 |
| `rs type="ethnic"` | 4 (solo ILA-107, ILA-108) | ~15 |
| `<date>` | 1 (solo ILA-101) | ~55 |
| `<num>` | 0 | ~70 |
| `<measure>` | 0 | 3 |

Il resto della scheda è invece in buono stato: `<persName>` 1486, `rs type="epithet"`
210, `<lb>` 1891. Il problema è circoscritto e omogeneo: **le convenzioni
diacritiche del testo sono rimaste caratteri, non elementi.**

## 1. Integrazioni editoriali — il punto più grave

- **141 schede su 295** hanno parentesi quadre nel testo dell'edizione come
  caratteri (`[`, `]`): **607 occorrenze di `[`**.
- **128 di queste non hanno nemmeno un `<supplied>`**: la codifica è interamente
  affidata al carattere.
- `<unclear>` non è usato da nessuna parte: le lettere di lettura incerta sono
  rese con puntini nel testo (`· ·`) in **19 schede**, in altre semplicemente omesse.
- Le lacune sono rese in modo non uniforme: `[...]`, `[· · ·]`, `[----]`,
  `[2-3]`, `[illegible line]`, `...` — tutte forme diverse per la stessa cosa.

Esempi (prime 15 delle 128): ILA-004, 005, 006, 008, 009, 010, 013, 014, 016,
017, 019, 022, 023, 025, 026.

Caso tipico, ILA-096 r. 4: `[ρ]ιστήριον` invece di
`<supplied reason="lost">ρ</supplied>ιστήριον`.

**Perché conta.** Finché la parentesi è un carattere: la ricerca a testo pieno non
trova `εὐχαριστήριον` in ILA-096; non è possibile generare la resa Leiden né una
versione "testo pulito"; non si può distinguere ciò che la pietra conserva da ciò
che l'editore integra; la validazione EpiDoc non intercetta le parentesi sbilanciate — e nel corpus ce ne
sono **12 schede**: ILA-026, 034, 047, 069, 079, 087, 088, 103, 133, 280, 284, 289
(es. ILA-284 `[ποι-]ου]σα`, ILA-088 `καὶ τὸν]`, `τὰ]`).

## 2. Scioglimenti di abbreviazione

**69 schede** hanno parentesi tonde grezze nell'edizione; `<expan>`/`<abbr>` è usato
solo in **5 file** (ILA-107, 209, 212, 216, 294). Le forme ricorrenti da marcare
sono poche e regolari: `μη(νὸς)`, `κ(αὶ)`, `Αὐρ.`, `Μ(ηνὶ) Ἀ(σκαηνῷ) ε(ὐχήν)`,
`Φ. Κί(γκιος)`, `μετ(ὰ) τέκ(νων)`.

## 3. Toponimi

`<placeName>` compare **solo dentro `<origPlace>`** (887 occorrenze, cioè 3 per
scheda: `ancient` / `modern` / `region`); nell'edizione solo in ILA-107 e ILA-108.

Toponimi presenti nel testo e non marcati:

| forma | schede |
|---|---|
| Ἀξιοττα (`Ἀξιοττα κατέχοντι`) | ILA-054 |
| Ταρεῖ (`Μὲς Ἀξιοττηνὸς Ταρεῖ βασιλεύων`) | ILA-102 |
| Ἀσκαίη | ILA-150, ILA-151 |
| κώμη + nome | ILA-014, 022, 033, 038, 045, 058 |
| κατοικία + nome | ILA-033, 045, 046, 056 |

**Header, gap separato**: `<placeName type="modern" ref="DA_COMPILARE">` in
**289 schede su 295** — il toponimo moderno non ha mai un URI (Pleiades è invece
compilato per il toponimo antico).

## 4. Etnici e demotici

`type="ethnic"` è usato in 2 schede. Gli etnici non marcati individuati:

| forma | scheda | resa in traduzione |
|---|---|---|
| Ἀλιανῶν | ILA-056 | Alianoi |
| Ταζηνῶν | ILA-033 | Tazenoi |
| Σελμηνῶν | ILA-076 | Selmenoi |
| Ἀπποληνῶν | ILA-073 | Appolenoi |
| Ἀεζηνοί | ILA-066 | Aezenoi |
| Οὐεζαεῖται | ILA-061 | Ouezaeitai |
| Κερυζέων | ILA-058 | Keryzeis |
| Κωμηνοί | ILA-065 | Komenoi |
| Μακροπεδειτῶν | ILA-115 | Makropedeitai |
| Ἀντιοχεῖ | ILA-286 | antiocheno |
| Ἀδριανοπολείτης | ILA-141 | Adrianopoleites |
| Κολιανοκωμήτης | ILA-064 | Kolianokomites |
| Μακεδών / [Μακ]εδών | ILA-272, ILA-263 | Makedon |

Sono la stessa famiglia dei nomi di associazione già marcati come
`#ruolo-istituzione` (Μηνιασταί, φράτρα, σύνοδος): conviene decidere insieme se
l'etnico di comunità (Ταζηνῶν κατοικία) sia `placeName type="ethnic"` oppure
`rs type="ethnic"`, perché oggi le due schede che lo usano non fanno testo.

## 5. Datazioni

**Header — stato buono.** Delle 29 schede che portano `ἔτους` + numerale, **26
hanno `<origDate>` compilata** con era sillana e `notBefore-custom` /
`notAfter-custom`. Da completare solo: **ILA-038, ILA-055, ILA-115**.
(In tutto il corpus `<origDate>` è compilata in 40 schede su 295, ma le altre 255
sono testi realmente non datati.)

**Edizione — vuoto quasi totale.** `<date>` compare **una sola volta**, in ILA-101.
Non sono marcati:

- **29 schede** con l'anno: `Ἔτους σζ΄` (ILA-005), `τκα΄` (007), `τιγ΄` (011),
  `σκη΄` (014), `ρϙθ΄` (015), `σϙε΄` (016), `σγ΄` (018), `σξβ΄` (019), `τκ΄` (021),
  022, 024, 025, `ρνα΄` (027), `τ΄` (031), 033, `σπα΄` (034), `τνδ΄` (036),
  `σλγ΄` (037), 038, `ρπγ΄` (040), `ροη΄` (041), 053, 055, 071, `ριδ΄` (079),
  101, 102, 103, 115;
- **50 schede** con nome di mese (Ξανδικός, Γορπιαῖος, Πάνημος, Δεῖος/Δῖος, Λῶος,
  Δαίσιος, Ἀρτεμείσιος);
- **2 datazioni eponimiche**: `ἐπὶ ἱερέας Γλαύκου` (ILA-097),
  `Ἐπὶ ἄρχοντος τῆς κατοικίας Βερίου Βάσσου` (ILA-045).

Due anomalie emerse traducendo, che vanno in apparato e non in `@when-custom`:
**ILA-026** `σγζ΄` è una sequenza irregolare; **ILA-039** ha `τηλ΄` per `τλη΄` (338).

## 6. Numerali e somme di denaro

`<num>` e `<measure>`: **zero occorrenze**.

- **53 schede** contengono un numerale alfabetico greco (segno `΄`): anni, giorni
  del mese, ordinali di ripetizione (`τεκμορεύσας γ΄`, `τὸ β΄`, `εὐχὴν δ΄`),
  patronimici omonimi (`Μουσαῖς β΄`, `Ἀσκάνιος β΄`, `Τατέους γ΄` in ILA-144), e i
  cinque valori degli astragali negli oracoli (ILA-120–124). Due numerali d'anno sono
  irregolari e vanno in apparato, non in `@value`: `σγζ΄` (ILA-026), `τηλ΄` per `τλη΄`
  (ILA-039), cui si aggiunge `βρρν΄` di ILA-115 — che infatti è una delle tre schede
  con `<origDate>` vuota.
- **3 schede con somme di denaro**, tutte non marcate:

| scheda | testo | valore |
|---|---|---|
| ILA-135 | `δώσει τῷ φίσκῳ [δηνάρια δισχίλια] πεντακόσ[ια]` | 2500 denari al *fiscus* |
| ILA-294 | `ἐθήκομεν δηνάρια ἑκατόν` | 100 denari |
| ILA-132 | `δώσει σε΄ τῷ ἱερῷ` | 205, **senza unità monetaria incisa** |

Gli oracoli a dadi sono il caso in cui il markup dei numerali paga di più: in
ILA-120–124 l'intestazione codifica i cinque astragali e la loro somma
(`δςςςγ΄` = 4+6+6+6+3, `κε΄` = 25; `ςςςςα΄` = 6+6+6+6+1 = 25). Con `<num value="…">`
la corrispondenza diventa verificabile — ed è così che si è potuto correggere la
traduzione precedente, che leggeva `ἐξεῖται` come «escono» invece di «sei».

## 7. Ricadute sul lessico cultuale già marcato

Due incoerenze nella marcatura `@ana="#formula-fissa"` (v. `tassonomia-funzioni-cultuali.md`):

- **ILA-139**: `[χεχολω]μένον` (grafia con χ-) non è marcato, mentre la stessa
  formula lo è in ILA-040, 050, 133, 134, 135, 137, 138, 142. Lo spoglio grep
  cercava `κεχολωμ-` e ha perso la variante grafica.
- **ILA-136** (`Ὀρχίσζω Μῆνα Καταχθόνιον`) e **ILA-144** (`ἐνορκίζω δὲ Μήνας`) non
  sono marcati, mentre `Ἐπεξορκίζομεν` in ILA-132 lo è. Stessa funzione, stesso
  formulario, tre prefissi diversi (ἐπ-εξ-, ὀρ-, ἐν-).

## Ordine di lavoro proposto

1. **Integrazioni editoriali** (§1) — il più esteso e il più meccanizzabile:
   `[…]` → `<supplied reason="lost">`, lacune → `<gap>` con `@unit`/`@extent`,
   puntini sottoscritti → `<unclear>`. Da fare a macchina con revisione a campione,
   uniformando prima le forme di lacuna.
2. **Scioglimenti** (§2) — poche forme ricorrenti, tabella chiusa.
3. **Numerali e date nell'edizione** (§5–6) — `<num value="">` e `<date>`, che
   abilitano il controllo incrociato con `<origDate>` già compilata.
4. **Etnici e toponimi** (§3–4) — richiede prima una decisione di modello
   (`placeName type="ethnic"` vs `rs type="ethnic"`).
5. **Correzioni puntuali**: `<origDate>` di ILA-038, 055, 115; marcatura
   formula-fissa di ILA-136, 139, 144; le 12 schede con parentesi sbilanciate.

Tutto ciò che tocca l'XML va rispecchiato anche nel repo dati `Gregoee2002/ILA`.
