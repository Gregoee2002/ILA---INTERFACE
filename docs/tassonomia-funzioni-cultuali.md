# Marcatura lessicale delle funzioni cultuali — v2

Stato: **v2 — impianto consolidato + spoglio verificato** — 2026-08-30.
Fonte: `Traduzioni_ILA_schede_brevi.docx` (216 schede brevi, campo *Note*) + spoglio
grep-testuale su tutti i 293 file dell'edizione + verifica a mano dei riscontri a
rischio + `integrazionetassonomia.md`.
Dati: [`spoglio-lessico-cultuale.csv`](spoglio-lessico-cultuale.csv) **v2** — 318
righe, 54 lemmi, 197 schede (decisioni a–g applicate 2026-08-30). Colonne: `scheda,
lane_ref, famiglia, lemma, sotto_funzione, forma_attestata, cert, verifica`.
`cert=low` = forma fra `[ ]`; `verifica=manuale` = i 2 casi residui (`τρέφω`/ILA-151
metafora poetica, `ἱερεύς`/ILA-097 datazione eponimica) — esclusi dall'applicazione
automatica del markup.

> **Non sostituisce** `<xenoData><ica:iconography><function>`
> (`votive / lex_sacra / confession / honorific / funerary`): quello è 1 valore per
> scheda (tipo di monumento), questo è N tag per parola. Vedi §7.

> `@lemmaRef` → **LSJ** via Perseus/Logeion.

## 1. Idea di fondo

Marcare **selettivamente** dentro `<div type="edition">` le parole/formule rilevanti
per la funzione cultuale. Ogni parola marcata porta:

- **forma normalizzata**: `@lemma` su `<w>`, `@key` su `<rs>`;
- **famiglia funzionale**: `@ana="#…"` — **una sola scelta**, fra 5 (§3);
- opzionalmente `@lemmaRef` (LSJ).

Non è la lemmatizzazione totale scartata in `cmrdm-epidoc/casi-complessi.md` §9 (là =
`<w>` su ogni parola). Qui `<w>`/`<rs>` solo sul vocabolario in tabella §5.

### Due assi separati

| asse | chi lo assegna | valori |
|---|---|---|
| **famiglia** (`@ana="#famiglia"`) | l'editor, a mano | 5 (§3) |
| **formularità** (`@ana` aggiunge `#formula`) | l'editor, sì/no | flag |
| **sotto-funzione fine** | il **codice**, da tabella `lemma → sotto-funzione` | ~25, deterministiche (§5) |

La granularità fine (spergiuro vs peccato, riscatto vs confessione, dynamis vs
signoria…) **non è una decisione editoriale**: è una proprietà del lemma, in tabella
§5, applicata dall'estrattore. Nel markup c'è solo `@lemma` + `@ana="#famiglia"`.

## 2. Regola per l'editor (una domanda)

> **Chi è il soggetto dell'azione: il dio o l'uomo?**

- soggetto = **dio** → `#agency`
- soggetto = **uomo**, e compie/registra un atto rituale o giuridico-sacro → `#atto-cultuale`
- soggetto = **uomo**, e la parola nomina la sua **trasgressione** (non il castigo) → `#colpa`
- parola che esiste **solo** dentro una formula di genere, senza testa analizzabile → `#formula-fissa`
- la parola nomina un **ruolo, un'istituzione, uno status personale** → `#ruolo-istituzione`

Se la parola sta in una locuzione fissa, si aggiunge `#formula` **oltre** alla
famiglia (non al posto). `#formula-fissa` come famiglia è solo il residuo: formule
di genere senza testa lessicale autonoma.

## 3. Le 5 famiglie

### `agency` — il dio come soggetto agente
Assorbe tutto ciò che nella v1 era `pow-*` + il castigo divino.

| sotto-funzione (tabella) | lemmi | esempio |
|---|---|---|
| titolarità del luogo | βασιλεύω, κατέχω | «μέγας Μὴν … τὴν κώμην βασιλεύων» |
| potenza manifestata (*dynamis*) | δύναμις | «μαρτυροῦντες τὰς δυνάμεις τῶν θεῶν» |
| castigo | κολάζω, νεμεσάω, (κόλασις) | «ὁ θεὸς ἐνεμέσησε τὸν κλέπτην» |
| ascolto / esaudimento | ἐπήκοος, ἐπακούω | «Μηνὶ ἐπηκόῳ» |
| manifestazione | ἐπιφανής | «θεοῦ ἐπιφανοῦς Μηνὸς Ἀσκαηνοῦ» |
| comando | κατ' ἐπιταγήν, ἐξ ἐπιταγῆς, κατὰ χρηματισμόν | «κατ' ἐπιταγὴν τοῦ κυρίου» |
| scelta | αἱρετίζω | «αἱρετίσαντος τοῦ θεοῦ» |
| disposizione favorevole | ἵλεως, εὐίλατος | lex sacra di Sounion |

### `atto-cultuale` — l'uomo compie/registra un atto (rituale o giuridico-sacro)
Assorbe la v1 `act-*` **+ le leggi sacre** (ex ipotetica famiglia `diritto-sacro`).

| sotto-funzione (tabella) | lemmi |
|---|---|
| dedica / erezione | ἀνατίθημι, ἀνίστημι, ἵστημι |
| consacrazione | καθιερόω, καθιδρύω / καθειδρύω |
| costruzione | ναὸν ποιέω, ἐκ τῶν ἰδίων |
| voto | εὔχομαι, εὐχή, εὐχαριστήριον |
| confessione verbale | ὁμολογέω, ἐξομολογέομαι |
| registrazione su stele | στηλογραφέω, μαρτυρέω (τὰς δυνάμεις) |
| riscatto | λυτρόω, λύτρον, ἀπολαμβάνω (στήλην) |
| propiziazione / lode | ἱλάσκομαι, ἐξειλάσκομαι, εὐλογέω, εὐχαριστέω, σέβω |
| consultazione oracolare | responso in versi, cifra dei dadi *(vedi nota oracoli, §3-bis)* |
| rito Xenoi Tekmoreioi | τεκμωρεύω |
| onori decretati | στέφανος, γέρα, τιμηθείς, κοινόν |
| norma santuariale (*lex sacra*) | ὅρος ἱερός, ἄσυλος, καθαρός / καθαρίζω, μηδένα ἀκάθαρτον προσαγεῖν |

### `colpa` — la trasgressione umana (non il castigo)
Assorbe la v1 `sin-*`. Il castigo divino sta in `agency`.

| sotto-funzione (tabella) | lemmi |
|---|---|
| peccato generico | ἁμαρτάνω, ἁμαρτία, ἁμαρτωλός |
| spergiuro | ἐπιορκέω, ἐπίορκος |
| empietà / danno | ἀσεβέω, λύμη (ποιέω) |

### `formula-fissa` — formula di genere senza testa lessicale autonoma
Residuo della v1 `formula-*`. Solo ciò che **fuori dalla formula non significa nulla di analizzabile**.

| sotto-funzione (tabella) | esempi |
|---|---|
| saluto funerario | χρηστέ / χρηστοὶ χαῖρε / χαίρετε |
| acclamazione | χαίρετε (agli dèi) |
| formula di pioggia | ὗε κύε (ὑπέρχυε) |
| imprecazione a tutela | κεχολωμένος, ἐπεξορκίζομαι, σκῆπτρον (nudo) |

### `ruolo-istituzione` — ruoli, istituzioni, status personale
Assorbe la v1 `inst-*` + `status-*`.

| sotto-funzione (tabella) | lemmi |
|---|---|
| sacerdozio / carica | ἱερεύς, ἱερατεύω, στολιστής, ἐπὶ ἱερέως (datazione eponimica) |
| associazione | φράτρα, σύνοδος, συνβολαφόροι (grafia -ν-), κοινόν, -ιασταί (Μηνιασταί…) |
| comunità | κατοικία, κώμη, ἐκ + nome personale (formula lidia) |
| status: allevato in casa | θρεπτός, θρεπτή, θρεπτὸς σύντροφος, θρέμμα |
| status: serva giovane | παιδίσκη |
| status: devoto | φιλόθεος |

### Fuori dalle famiglie — `epithet-lessicale`
Le qualifiche divine restano in `persName type="divine"` / `<rs type="epithet">`. **Non**
si marcano con `<w>`: si aggiunge solo `@lemmaRef` al `<name>`. In elenco: Τύραννος,
Οὐράνιος, Φωσφόρος, Χθόνιος/Καταχθόνιος, Σωτήρ/Σώτειρα, Ὕψιστος, Ὅσιος, Ἀγοραῖος,
Πάτριος, Τμωλείτης/Τυμωλείτης (raro, Lane 81), ecc.
**Corretto dalla v1**: `Ὅσιος καὶ Δίκαιος` è una coppia divina autonoma, non
un'epiclesi di Men → non in elenco; `Ὅσιος` da solo sì.

## 3-bis. Oracoli astragalici — livello monumento, non parola

Gli oracoli dei dadi (Lane 132–136 = ILA-120…124) sono `atto-cultuale` solo per la
*consultazione*; ma la loro natura oracolare è un fatto **dell'intero testo**, non di
una parola. Va gestita in `xenoData <function>` con un **valore nuovo `oracular`**,
non taggando l'epiteto Φωσφόρος. Vedi §7.

## 4. Cosa NON è attestato nel CMRDM I (non cercarlo nello spoglio)

Da `integrazionetassonomia.md` §3, verificato:

- `κατ' ὄναρ`, `δεσπότης`, `θίασος` → **zero occorrenze** nel corpus di Men. Tolti
  dai "lemmi tipici".
- `Τμωλείτης` → **è attestato** (ILA-050 / Lane 81, `Μηνὸς Τυμωλείτου`): **tenuto**,
  con varianti grafiche Τμωλ-/Τυμωλ-.
- `σύμβολον / συμβολαφόρος` → attestato ma con grafia `συνβολ-` (assimilazione).

## 5. Tabella `lemma → sotto-funzione` (attestati nel CMRDM I)

Unico luogo dove vivono le distinzioni fini: l'estrattore la applica a partire da
`@lemma`; nel markup restano solo `@lemma` + `@ana="#famiglia"`. `n` = schede in cui
il lemma è attestato (dallo spoglio v2). `@lemmaRef` = pagina Logeion (LSJ + altri).

| lemma | sotto-funzione | n | `@lemmaRef` |
|---|---|---:|---|
| **`agency`** | | | |
| δύναμις | dynamis | 6 | https://logeion.uchicago.edu/δύναμις |
| κολάζω | castigo-divino | 6 | https://logeion.uchicago.edu/κολάζω |
| ἐπιταγή | comando | 5 | https://logeion.uchicago.edu/ἐπιταγή |
| ἐπήκοος | ascolto | 4 | https://logeion.uchicago.edu/ἐπήκοος |
| βασιλεύω | signoria-territoriale | 3 | https://logeion.uchicago.edu/βασιλεύω |
| κατέχω | signoria-territoriale | 3 | https://logeion.uchicago.edu/κατέχω |
| νεμεσάω | castigo-divino | 3 | https://logeion.uchicago.edu/νεμεσάω |
| αἱρετίζω | scelta | 2 | https://logeion.uchicago.edu/αἱρετίζω |
| εὐίλατος | disposizione-favorevole | 2 | https://logeion.uchicago.edu/εὐίλατος |
| χρηματισμός | comando | 1 | https://logeion.uchicago.edu/χρηματισμός |
| ἐπιφανής | manifestazione | 1 | https://logeion.uchicago.edu/ἐπιφανής |
| **`atto-cultuale`** | | | |
| εὐχή | voto | 116 | https://logeion.uchicago.edu/εὐχή |
| τεκμωρεύω | tekmor | 31 | — (verbo tecnico epigrafico, non in LSJ) |
| ἀνατίθημι | dedica | 17 | https://logeion.uchicago.edu/ἀνατίθημι |
| εὐλογέω | propiziazione | 6 | https://logeion.uchicago.edu/εὐλογέω |
| ἀνίστημι | dedica | 6 | https://logeion.uchicago.edu/ἀνίστημι |
| εὔχομαι | voto | 4 | https://logeion.uchicago.edu/εὔχομαι |
| λύτρον | riscatto | 4 | https://logeion.uchicago.edu/λύτρον |
| στέφανος | onori-decretati | 4 | https://logeion.uchicago.edu/στέφανος |
| στηλογραφέω | registrazione-su-stele | 4 | https://logeion.uchicago.edu/στηλογραφέω |
| καθιδρύω | consacrazione | 3 | https://logeion.uchicago.edu/καθιδρύω |
| εὐχαριστέω | propiziazione | 2 | https://logeion.uchicago.edu/εὐχαριστέω |
| καθαρίζω | norma-santuariale | 2 | https://logeion.uchicago.edu/καθαρίζω |
| μαρτυρέω | registrazione-su-stele | 2 | https://logeion.uchicago.edu/μαρτυρέω |
| ἀκάθαρτος | norma-santuariale | 2 | https://logeion.uchicago.edu/ἀκάθαρτος |
| ἐξειλάσκομαι | propiziazione | 2 | https://logeion.uchicago.edu/ἐξιλάσκομαι |
| ὁμολογέω | confessione-verbale | 2 | https://logeion.uchicago.edu/ὁμολογέω |
| εὐχαριστία | propiziazione | 1 | https://logeion.uchicago.edu/εὐχαριστία |
| καθιερόω | consacrazione | 1 | https://logeion.uchicago.edu/καθιερόω |
| λυτρόω | riscatto | 1 | https://logeion.uchicago.edu/λυτρόω |
| ναός | costruzione | 1 | https://logeion.uchicago.edu/ναός |
| σέβω | propiziazione | 1 | https://logeion.uchicago.edu/σέβω |
| ἄσυλος | norma-santuariale | 1 | https://logeion.uchicago.edu/ἄσυλος |
| ἐξομολογέομαι | confessione-verbale | 1 | https://logeion.uchicago.edu/ἐξομολογέομαι |
| **`colpa`** | | | |
| ἁμαρτάνω | peccato-generico | 6 | https://logeion.uchicago.edu/ἁμαρτάνω |
| ἐπιορκέω | spergiuro | 1 | https://logeion.uchicago.edu/ἐπιορκέω |
| **`formula-fissa`** | | | |
| κεχολωμένος | imprecazione | 8 | https://logeion.uchicago.edu/χολόω |
| σκῆπτρον ¹ | imprecazione | 5 | https://logeion.uchicago.edu/σκῆπτρον |
| χαίρω ² | acclamazione | 1 | https://logeion.uchicago.edu/χαίρω |
| χρηστὸς χαῖρε | saluto-funerario | 1 | — |
| ἐπεξορκίζω | imprecazione | 1 | https://logeion.uchicago.edu/ἐπεξορκίζω |
| ὗε κύε | formula-pioggia | 1 | — |
| **`ruolo-istituzione`** | | | |
| θρεπτός | status-allevato | 13 | https://logeion.uchicago.edu/θρεπτός |
| ἱερεύς | sacerdozio | 10 | https://logeion.uchicago.edu/ἱερεύς |
| ἀρχιερεύς | sacerdozio | 6 | https://logeion.uchicago.edu/ἀρχιερεύς |
| κατοικία | comunita | 4 | https://logeion.uchicago.edu/κατοικία |
| -ιασταί | associazione | 2 | — |
| θρέμμα | status-allevato | 2 | https://logeion.uchicago.edu/θρέμμα |
| φράτρα | associazione | 2 | https://logeion.uchicago.edu/φρήτρη |
| στολιστής | sacerdozio | 1 | https://logeion.uchicago.edu/στολιστής |
| συνβολαφόρος | associazione | 1 | https://logeion.uchicago.edu/συμβολοφόρος |
| σύνοδος | associazione | 1 | https://logeion.uchicago.edu/σύνοδος |
| τρέφω | status-allevato | 1 | https://logeion.uchicago.edu/τρέφω |
| ἱερατεύω | sacerdozio | 1 | https://logeion.uchicago.edu/ἱερατεύω |

¹ `σκῆπτρον` (deciso 2026-08-30): resta in **`formula-fissa` / `imprecazione`** in tutte
e 5 le schede — è elemento fisso della formula protettiva/imprecatoria «ἐπέστησεν τὸ
σκῆπτρον», il dio non è il soggetto grammaticale, quindi non `agency`. Nelle stele di
confessione è lo scettro-strumento del dio, ma la marcatura segue la formula, non l'oggetto.
² `χαίρω`: solo ILA-094 «χαίρετε νύνφαι καλαί» = `acclamazione`. In ILA-286 «Χρηστοὶ
χαίρετε» è coperto dalla riga unica `χρηστὸς χαῖρε` (`saluto-funerario`), non da `χαίρω`.

**Lemmi del controllato NON attestati nel CMRDM I** (non nel CSV, da aggiungere solo
se emergono): `ἱλάσκομαι` (simplex), `ἐπακούω`, `ἵλεως`, `ἀσεβέω`, `λύμη`, `ἵστημι`
(non composto), `κόλασις`. Esclusi definitivamente (verificato): `κατ' ὄναρ`,
`δεσπότης`, `θίασος`.

## 6. Norma editoriale

1. **Cosa si marca**: solo i lemmi della tabella §5, quando compaiono nel testo. Non
   il lessico generico.
2. **`<w>` vs `<rs>`**: parola singola → `<w lemma="…" ana="#famiglia">forma</w>`;
   sintagma / formula → `<rs type="cultFormula" key="handle" ana="#formula …">…</rs>`
   con `<w>` annidati che tengono la loro famiglia.
3. **Forma del lemma**: 1ª sing. pres. ind. att. per i verbi (deponenti: medio-pass.);
   nominativo sing. per i nomi; composti col preverbio (ἀνατίθημι). Il token conserva
   la grafia epigrafica/dialettale; il `@lemma` è normalizzato.
4. **`@ana`**: **una** famiglia (§3); `#formula` in più se la parola sta in locuzione
   fissa. Tratto morfologico compatto (`#v-3sg-aor-act`) facoltativo.
5. **`@lemmaRef`**: LSJ via Perseus/Logeion
   (`https://www.perseus.tufts.edu/hopper/morph?l=<lemma>&la=greek`).
6. **Non si tocca** `persName` / `placeName` / `rs type="epithet"`: `epithet-lessicale`
   gestita lì, con `@lemmaRef` sul `<name>`.
7. **Letture incerte / integrazioni**: forma fra `[ ]` o dubbia → `@cert="low"` sul
   `<w>`; lemma non determinabile → si omette `@lemma`, si può tenere `@ana`.
   **Verificare a mano ogni hit** prima di taggare (il confine di parola nel testo a
   stampa inganna: es. «Μῆνα σέβων» ≠ ἀσεβ-).

## 7. Pattern XML

```xml
<!-- ILA-096, rr. 3-4 — voto + dedica -->
<w lemma="εὐχαριστήριον" ana="#atto-cultuale">εὐχα<lb n="4" break="no"/>[ρ]ιστήριον</w>
<w lemma="ἀνατίθημι" ana="#atto-cultuale #v-1sg-aor-act">ἀνέθηκα</w>.
```

```xml
<!-- ILA-094 — formula senza testa lessicale -->
<rs type="cultFormula" key="hye-kye" ana="#formula-fissa">ὗε κύε ὑπέρχυε</rs>.
```

```xml
<!-- δύναμις in formula: la testa tiene la famiglia, il wrap è #formula -->
<rs type="cultFormula" ana="#formula">μεγάλη ἡ
  <w lemma="δύναμις" ana="#agency">δύναμις</w> τῶν θεῶν</rs>
```

```xml
<!-- stele di confessione — le 3 parole-chiave si separano da sole -->
<w lemma="ἁμαρτάνω" ana="#colpa #v-1sg-aor-act">ἥμαρτον</w> …
<w lemma="κολάζω" ana="#agency #v-3sg-aor-pass">ἐκολάσθην</w> …
<w lemma="ὁμολογέω" ana="#atto-cultuale #v-1sg-aor-act">ὡμολόγησα</w>
```

## 8. Rapporto con `xenoData` `<function>` (NON è un rimpiazzo)

`<xenoData><ica:iconography><function>` (vocab in
[`src/lib/iconographyLabels.ts`](../src/lib/iconographyLabels.ts)):
`votive`, `lex_sacra`, `confession`, `honorific`, `funerary` — **1 valore per
scheda**, macro-tipo del monumento. Questa tassonomia è **N tag per parola**.
Restano entrambi; il layer di parola è la prova testuale dell'etichetta di monumento.

| `<function>` | famiglie/sotto-funzioni attese nel testo |
|---|---|
| `votive` | `atto-cultuale` (voto, dedica) |
| `confession` | `colpa` + `agency` (castigo, dynamis) + `atto-cultuale` (confessione, riscatto) |
| `lex_sacra` | `atto-cultuale` (norma-santuariale) + `agency` (disposizione favorevole, comando) + `ruolo-istituzione` |
| `honorific` | `atto-cultuale` (onori-decretati) |
| `funerary` | `formula-fissa` (saluto, imprecazione) |
| **`oracular`** *(nuovo, da aggiungere)* | oracoli astragalici Lane 132–136 |

Da decidere: se `<function>` in futuro va **derivato/validato** dai tag di parola.

## 9. Prossimi passi

- [x] famiglie consolidate: 5 (`agency`, `atto-cultuale`, `colpa`, `formula-fissa`,
      `ruolo-istituzione`) + `epithet-lessicale` fuori; leggi sacre in `atto-cultuale`
- [x] `@lemmaRef` → LSJ/Logeion
- [x] tabella `lemma → sotto-funzione` §5 — 56 lemmi attestati, con `@lemmaRef`
- [x] **spoglio verificato** sui 293 file → `spoglio-lessico-cultuale.csv` v2
      (330 righe / 197 schede; `cert` per le forme integrate; `verifica=manuale`
      sui 15 riscontri ambigui)
- [ ] revisione utente: tabella §5 (lemmi/sotto-funzioni) + righe `verifica=manuale`
- [ ] aggiungere valore `oracular` a `xenoData <function>`
      (`src/lib/iconographyLabels.ts`)
- [ ] file TEI con `<taxonomy xml:id="cult-functions">` (5 `<category>`) + header
- [ ] aggiornare `cmrdm-epidoc/references/casi-complessi.md` §9
- [ ] ramo **viola** nel renderer ([`EditionMarkupEditor.tsx`](../src/components/EditionMarkupEditor.tsx),
      accanto a `case 'persName'` ~riga 560) + estrattore in `apiShim.ts` + vista indice
- [ ] applicare il markup alle righe dell'edizione **insieme** al caricamento delle
      note del docx — dopo la revisione della batch di traduzioni
