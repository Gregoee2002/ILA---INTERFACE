# Interventi dati da fare a mano — coda dell'audit 2026-09-01

Questi rilievi delle Sessioni 5–6 del [piano di audit](piano-audit-totale-2026-09-01.md)
**non** sono stati eseguiti in automatico: richiedono una scelta editoriale con
verifica su **Lane 1971 (CMRDM I)** e, se una sincronizzazione dalla repo dati
`Gregoee2002/ILA` è attiva nel deploy, il **mirror** delle modifiche XML lì
(altrimenti il boot-sync le annulla — vedi memoria «XML edits go to ILA data repo»).

Nota sullo stato repo: al 2026-09-01 il clone locale di `Gregoee2002/ILA`
(`~/Documents/GitHub/ILA`) è fermo al 2026-07-26, ha 50 file con naming
`CMRDM-*`, mentre `src/data/corpus/` ne ha 295 con naming `ILA-NNN` aggiornati
al 2026-08-30. Prima di mirrorare qualunque cosa, **chiarire quale repo è
canonica** e se `DATA_REPO_TOKEN` è impostato nei secret di Actions.

---

## DATA-01 (resto) — epiteti: casi non ortografici

Il layer `src/lib/epithetAliases.ts` copre solo le varianti grafiche/flessive
certe. Restano, da correggere **sullo XML**:

- **`Dionysos` come epiteto** (1×): misclassificazione, è un teonimo. Trovare la
  scheda (`grep -l 'scheme="epiteti"[\s\S]*Dionysos' src/data/corpus/*.xml`) e
  spostarlo in `<keywords scheme="divinita">` / `persName` a seconda del testo.
- **Leakage di patronimici** trattati come epiteti: `Artemidorou Axiottenos`,
  `Artemidorou Axiotta`, `Artemidorou Dorou`, `Artemidorou`, `Diodotou`. Il
  genitivo del patronimico va nell'onomastica, non fra gli epiteti; l'epiteto
  reale (`Axiottenos`) va tenuto separato.
- **`Tarsene` / `Tarsios`**: coppia dubbia — verificare su Lane se sono lo
  stesso epiteto prima di aggiungerli a `epithetAliases.ts`.
- **`Axetenos`** (in ILA-294, «Men Petraeites Axetenos»): non era nella lista
  DATA-01; valutare se è un'ulteriore variante di `Axiottenos` o un epiteto
  locale distinto.

Dopo ogni correzione: rilanciare `npx tsx -e` sul corpus e controllare
`buildClassificationAudit` (`divVsEpi`, `neverAlone`).

## DATA-02 — granularità dei teonimi

Teonimi a grana mista in `<keywords scheme="divinita">`: `Men` accanto a
`Men Tyrannos`, `Men Tiamos`, `Men Tiamou`; `Anaeitis` vs `Artemis Anaeitis`;
`Meter` / `Megale Meter` / `Meter theon` / `Magna Mater`; `Helios Apollo
Kisaulodenos`, `Kore Selene`, `Plouton Helios`.

Decisione di impianto da prendere e applicare in modo uniforme: **teonimo puro
+ epiteto separato** (`Men` + `Tyrannos`), non `Men Tyrannos` come teonimo unico.
Dove è solo grafia dello stesso teonimo, estendere `DIVINITY_ALIASES`
(`src/lib/divinityAliases.ts`); dove è sincretismo reale, lasciare il composto.
`buildClassificationAudit` esiste apposta per elencare i casi.

## DATA-03 — ILA-294 (NON committabile da qui)

`src/data/corpus/` è **gitignored** in questo repo (cache locale; fonte di
verità = `Gregoee2002/ILA`). La correzione va quindi fatta **sulla repo dati**,
non qui. Versione già corretta in locale e salvata come riferimento in
`docs/patches/ILA-294.xml.fixed`. Modifiche applicate:

1. aggiunto `<idno type="entryId">gen-1788258898204-294-vzb2zw</idno>`
   (era l'unico dei 295 file senza — rompe la chiave React e il path del
   `PATCH /api/monumenti/:entryId`);
2. rimosso `<idno type="TM"><!-- inserire TM number --></idno>` (commento come
   contenuto d'elemento). Se si recupera un vero TM (SEG 41, 1039 / Petzl
   Beichtinschr. 38), reinserirlo;
3. aggiunto `<origDate datingMethod="#julian" notBefore-custom="0100"
   notAfter-custom="0300" precision="low">` II–III d.C. (datazione ipotetica di
   Petzl, già nel commento della scheda).

Applicare l'equivalente sul file corrispondente in `Gregoee2002/ILA`.

## DATA-04 — concordanza_TM.csv (FATTO)

Aggiunte le 2 righe mancanti (`ILA-002` → TM 932585 / CMRDM 30; `ILA-098` →
TM 792689 / CMRDM 9). Il file non è consumato da alcun modulo: se non serve più,
valutare di ritirarlo; altrimenti aggiungere `scripts/build-tm-concordance.ts`
e un check in CI.

## DATA-05 — stato tassonomia (FATTO)

Aggiornata la riga di stato in `docs/taxonomy-cult-functions.xml` (da «BOZZA non
referenziata» a «v2 in uso»). Resta da spostare la `<taxonomy>` in un header
condiviso del corpus sulla repo dati e referenziarla formalmente via `@ana`.
