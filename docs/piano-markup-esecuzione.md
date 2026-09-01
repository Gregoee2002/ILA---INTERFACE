# Piano di esecuzione — markup dell'edizione

Stato: **in corso** — redatto e avviato 2026-09-01.
Ricognizione di partenza: [`piano-markup-integrazioni-toponimi-date.md`](piano-markup-integrazioni-toponimi-date.md).

## Stato di esecuzione — 2026-09-01

| passo | stato | esito |
|---|---|---|
| Passo 0 — verifica repo dati | **fatto** | nessuna divergenza: il remoto `Gregoee2002/ILA/corpus` ha gli stessi **295** file, stessi nomi `ILA-NNN.xml`; contenuto identico tranne ILA-294. Il checkout locale `~/Documents/GitHub/ILA` (50 file, nomi `CMRDM-*`) è un clone vecchio: **ignorarlo**. |
| Attrezzatura — `scripts/lint-corpus.py` | **fatto** | parentesi bilanciate, formulari `#formula-fissa`, coerenza `<num>`/numerale greco, `<origDate>` attesa; più i contatori di avanzamento di F1-F3 |
| 12 schede con parentesi sbilanciate | **fatto** | tutte collazionate su Lane e corrette; 0 sbilanciate su 295 |
| F5 — marcatura formula-fissa | **fatto** | ILA-136, ILA-139, ILA-144 |
| F5 — `<origDate>` mancanti | **fatto** | ILA-038, ILA-055, ILA-115 |
| F0, F1, F2, F3, F4 | da fare | |

Il linter passa senza errori. Contatori di avanzamento correnti: `[ ]` non convertite
607, `( )` 180, lacune non uniformate 146, `<supplied>` 77, `<gap>` 16, `<unclear>` 0,
`<expan>` 9, `<num>` 0, `<date>` 1, `<placeName>` 2.

> **Emerso durante la collazione**: il problema non è solo di markup. In 8 delle 12
> schede controllate la trascrizione divergeva da Lane — parentesi spostate,
> integrazioni perdute, e in ILA-103 e ILA-026 letture sbagliate che cambiano il senso.
> Vedi §7-bis prima di lanciare qualsiasi conversione automatica.

**Indipendente dalle traduzioni.** Questo piano tocca `<div type="edition">` e tre
campi di header; le traduzioni vivono in `<div type="translation">` e non vengono
sfiorate. Le due lavorazioni possono procedere in parallelo o in qualsiasi ordine —
l'unico accorgimento è non tenerle aperte sullo *stesso* file nello stesso momento,
perché il push per scheda riscrive il file intero.

---

## 0. Vincolo operativo — dove vanno davvero le modifiche

Prima di scrivere una riga di codice, questo va accertato, perché condiziona tutto.

`scripts/build-corpus-snapshot.ts` in CI **non legge `src/data/corpus/` di questo
checkout**: se `GITHUB_TOKEN`/`GITHUB_REPO` sono impostati (e nel workflow lo sono)
scarica il corpus dalla repo dati e **cancella in locale gli XML che non esistono nel
remoto** (`pullCorpusFromGitHub` → `fsUnlinkSync`, `src/lib/githubStorage.ts:210`).
Quindi: **una modifica applicata solo a `STAR/src/data/corpus/` non arriva mai al sito
pubblicato, e al primo build viene sovrascritta.**

C'è anche un disallineamento di nomi: qui `ILA-028.xml`, nella repo dati
`CMRDM-AS-028_nr28.xml`. Il checkout locale `~/Documents/GitHub/ILA/corpus/` ha
**50 file** contro i 295 di qui — o è parziale/fermo, o le due repo sono divergenti
sul serio.

**Passo 0 (bloccante).** Elencare i file XML realmente presenti sul remoto
`Gregoee2002/ILA` (`gh api repos/Gregoee2002/ILA/contents/<corpusPath>`), confrontarli
uno a uno con i 295 di `src/data/corpus/`, e produrre `docs/mappa-file-repo-dati.csv`
con `ila_id, nome_locale, nome_remoto, presente_remoto, sha`. Senza questa mappa
nessuna fase successiva può essere applicata: non si saprebbe quale file riscrivere.
Se il remoto ha davvero solo 50 schede, la questione da risolvere **prima** non è il
markup ma la divergenza fra le due repo.

---

## 1. Decisioni da prendere prima (bloccanti)

| # | decisione | opzioni | perché blocca |
|---|---|---|---|
| D1 | lacune: `reason` | `lost` (caduta) vs `illegible` (illeggibile) | i puntini nudi fuori parentesi in Leiden valgono *illeggibile*, quelli dentro *caduto*: sono 51 e 73 occorrenze, non si possono trattare uguali |
| D2 | etnici | `placeName type="ethnic"` vs `rs type="ethnic"` | oggi 2 sole schede fanno testo; la scelta va presa una volta per tutte e 13 |
| D3 | estensione delle lacune | `<gap extent="unknown">` sempre, oppure `@quantity` dove Lane la dà | determina se F1 è del tutto automatica o richiede il riscontro sullo stampato |
| D4 | numerali greci | `<num value="207">Ἔτους σζ΄</num>` sul solo numerale, oppure `<date>` che avvolge tutta la formula | cambia la forma di F3 e cosa il sito può indicizzare |

Raccomandazione: D1 → distinguere (la regola è meccanica: dentro `[ ]` = `lost`,
fuori = `illegible`); D3 → `extent="unknown"` in prima battuta, `@quantity` solo dove
il testo già porta `[2-3]`; D4 → `<num>` sul numerale **dentro** un `<date>` che
avvolge la formula, così si indicizzano entrambi.

---

## 2. Attrezzatura da costruire

`scripts/validate.py` oggi verifica solo la buona formazione XML (`ET.parse`). Serve
prima del resto, perché è ciò che rende le fasi verificabili.

1. **`scripts/lint-corpus.py`** — controlli sul corpus, non solo sull'XML:
   - parentesi quadre e tonde bilanciate dentro `<div type="edition">`;
   - **nessun residuo Leiden** come carattere (`[`, `]`, `...`, `· ·`) — è il
     criterio di uscita di F1 e F2;
   - `<num @value>` coerente col numerale greco che avvolge (checksum: vedi F3);
   - `<date>` nell'edizione coerente con `<origDate>` dell'header;
   - `@ana="#formula-fissa"` presente su tutte le forme del formulario (copre le
     lacune ILA-136, 139, 144).
2. **`scripts/leiden2epidoc.py`** — la conversione, con `--dry-run` e `--only ILA-xxx`,
   che scrive un diff per scheda e non tocca nulla senza `--apply`.
3. **`scripts/report-diff.py`** — rende i diff in HTML rivedibile a colpo d'occhio,
   come si è fatto per le traduzioni.

Consultare la skill `cmrdm-epidoc` prima di scrivere le regole: il formato canonico
del progetto ha vincoli non negoziabili.

---

## 3. Fasi

### F0 — Uniformare le forme di lacuna *(prerequisito di F1)*

Oggi la stessa cosa è scritta in sei modi. Censimento esatto:

| forma | occorrenze | schede |
|---|---:|---:|
| `...` nudo (fuori parentesi) | 73 | 35 |
| `[...]` | 66 | 31 |
| `· · ·` nudo | 51 | 13 |
| `[· · ·]` | 30 | 8 |
| `[illegible line]` | 2 | 1 |
| `[n-n]` (es. `[2-3]`) | 1 | 1 |
| `[----]` | 1 | 1 |

Normalizzare a **due** forme canoniche prima di convertire: `[- - -]` per la lacuna
per caduta, `· · ·` per le lettere illeggibili in situ. Circa 224 occorrenze su 90
schede. Va fatto **a mano o con revisione integrale**, perché è qui che si decide D1
caso per caso: automatizzare questo passaggio significa cristallizzare l'ambiguità.

### F1 — `<supplied>`, `<gap>`, `<unclear>` *(il grosso del lavoro)*

603 gruppi `[ … ]` chiusi, di cui **280 di tre lettere o meno**: integrazioni brevi
intra-parola, meccaniche e a rischio zero. Sono il primo lotto.

| pattern | trasformazione |
|---|---|
| `[abc]` con ≤3 lettere greche | `<supplied reason="lost">abc</supplied>` |
| `[parola/e]` più lunga | idem, ma **revisione a occhio**: qui stanno gli errori di trascrizione |
| `[- - -]` (dopo F0) | `<gap reason="lost" extent="unknown" unit="character"/>` |
| `· · ·` (dopo F0) | `<gap reason="illegible" unit="character" quantity="n"/>` |
| `[2-3]` | `<gap reason="lost" unit="character" atLeast="2" atMost="3"/>` |
| lettera con puntino sottoscritto | `<unclear>x</unclear>` |

Prima di partire, **chiudere le 12 schede con parentesi sbilanciate**: ILA-026, 034,
047, 069, 079, 087, 088, 103, 133, 280, 284, 289. Con le parentesi sbilanciate ogni
parser sbaglia e il danno si propaga silenziosamente.

Ordine: lotto A (280 casi ≤3 lettere, automatico + campione del 10 %) → lotto B
(lacune normalizzate in F0) → lotto C (integrazioni lunghe, una per una).

### F2 — `<expan>` / `<abbr>`

69 schede con `( )` grezze, tabella chiusa di poche forme:

`μη(νὸς)` · `κ(αὶ)` · `μ(νήμης) χ(άριν)` · `Μ(ηνὶ) Ἀ(σκαηνῷ) ε(ὐχήν)` ·
`μετ(ὰ) τέκ(νων)` · `Φ. Κί(γκιος)` · `Ἰόν(ιος) κατ(ὰ) τελ(ετήν)` · `Αὐρ.` · `Σε(βαστῇ)`

Interamente automatizzabile su tabella. Attenzione ai falsi positivi: parentesi tonde
usate dall'editore per **correzioni** (`α(ὐ)τούς` in ILA-033, `Κλ(α)ύδιος` in ILA-271)
non sono scioglimenti ma `<supplied reason="omitted">`.

### F3 — `<num>` e `<date>` nell'edizione

53 schede con numerali alfabetici. Il valore si calcola dal numerale, e **la somma dà
un checksum gratuito**: negli oracoli ILA-120–124 i cinque astragali devono sommare al
totale dichiarato (`δςςςγ΄` = 4+6+6+6+3 = 25 = `κε΄`); negli anni, `<num value>` deve
combaciare con `notBefore-custom`/`notAfter-custom` di `<origDate>`, già compilata in
26 schede su 29. Il linter fa fallire la build quando non torna.

Tre numerali sono irregolari e vanno in `<div type="apparatus">`, **non** in `@value`:
`σγζ΄` (ILA-026), `τηλ΄` per `τλη΄` (ILA-039), `βρρν΄` (ILA-115).

Coprire anche: giorni del mese, ordinali di ripetizione (`τεκμορεύσας γ΄`, `τὸ β΄`,
`εὐχὴν δ΄`), omonimie (`Μουσαῖς β΄`, `Τατέους γ΄`, `δὶς Μουσαίου`), i 50 nomi di mese
e le 2 datazioni eponimiche (ILA-045, ILA-097).

### F4 — Toponimi ed etnici

Dipende da **D2**. 13 etnici e 5 gruppi di toponimi, elencati per esteso nella
ricognizione. Volume piccolo: una sessione, tutta a mano, dopo che la decisione è presa.
Nello stesso giro conviene sciogliere il `ref="DA_COMPILARE"` dei `placeName
type="modern"` (289 schede) — è però un lavoro di reperimento URI, non di markup, e
può stare in coda a tutto.

### F5 — Correzioni puntuali

- `<origDate>` mancante: ILA-038, ILA-055, ILA-115.
- `@ana="#formula-fissa"` mancante: ILA-139 (`[χεχολω]μένον`, grafia con χ-),
  ILA-136 (`Ὀρχίσζω`), ILA-144 (`ἐνορκίζω`).
- Aggiornare lo spoglio `spoglio-lessico-cultuale.csv` con le varianti grafiche, così
  il prossimo grep non le riperde.

---

## 4. Criteri di accettazione

Ogni fase si chiude solo quando, **su tutte e 295 le schede**:

1. `python3 scripts/validate.py src/data/corpus/*.xml` non riporta errori;
2. `python3 scripts/lint-corpus.py` passa sui controlli della fase corrente;
3. il diff è stato riletto — integralmente per i lotti a rischio, a campione del 10 %
   per quelli meccanici;
4. `npm run snapshot && npm run build` gira pulito e il sito statico rende il testo
   senza parentesi orfane;
5. le modifiche sono **sulla repo dati** e il sito ricostruito le mostra. Finché
   questo punto non è verificato la fase non è finita, per quanto l'XML locale sia
   corretto.

## 4-bis. Divergenze dalla trascrizione di Lane (§7-bis)

La collazione delle 12 schede sbilanciate ha mostrato che l'errore ricorrente **non è
la parentesi in sé**, ma la trascrizione da cui viene. Tre tipi, in ordine di gravità:

1. **Letture sbagliate che cambiano il senso.**
   - **ILA-026**: l'anno era `σγζ΄`; Lane ha `σ̣ν̣ζ΄` = **257** (ν letta γ), che con
     l'era sillana dà i 172/3 d.C. stampati da Lane in margine. Il numerale non era
     irregolare: era sbagliato.
   - **ILA-103**: `οἰκο[γε-]νὸς` per `οἰκο[νό-][μος]` (*intendente*, non *nato in casa*);
     `εὐχά[με-]νος` per `εὐξά[με-]νος`; e soprattutto `ἐὰν σ]ῴζ[η]ται` per
     `ἐὰν λήψεται`. Il testo diceva «se sia salvo», Lane ha «se prenderà (in moglie)».
     Anche `Δείου δι΄` per `βι΄`.
   - **ILA-132**: la multa era letta `Σ΄ ε΄` = 205 senza unità. Lane stampa il **segno
     del denario** e lo glossa lui stesso in calce: «Ͱ = δηνάρια». Sono **5 denari**.
2. **Integrazioni perdute**: ILA-026 r. 4 (`ἀδε[λφῶν Διονυσίου, Ἀ-]`), ILA-289 r. 3
   (`[Ῥείη τε καὶ Ἄττει]`, che in Lane è tutto restituito).
3. **Integrazioni spezzate in due**: `] [` inserito dove Lane ha un gruppo solo —
   ILA-047, ILA-069 (due volte), ILA-087, ILA-088. E il caso opposto, la parentesi
   chiusa due volte a cavallo della fine riga: ILA-284 (`[ποι-]` / `ου]`).
   Più una parentesi inventata di sana pianta: ILA-133 `Κλαυδ[ίᾳ`.

**Conseguenza per il piano.** Convertire a macchina una trascrizione che diverge
dall'edizione significa consolidare l'errore in struttura. Prima di F1 va deciso se
fare una **collazione sistematica su Lane** — almeno delle schede con integrazioni
lunghe (lotto C) e di tutte quelle con numerali, dove l'aritmetica dell'era è un
controllo automatico gratuito. Le 12 collazionate sono l'8 % delle 141 con parentesi:
se il tasso di errore è quello osservato, ce ne sono altre da correggere.

## 5. Rischi

| rischio | mitigazione |
|---|---|
| ~~divergenza fra le due repo~~ | **risolto**: Passo 0 eseguito, le repo coincidono |
| il push per scheda riscrive il file intero | non lavorare su markup e traduzioni sullo stesso file in contemporanea |
| conversione automatica su parentesi sbilanciate | chiuderle in F1 prima di lanciare qualsiasi script |
| `( )` di correzione scambiate per scioglimenti | lista di eccezioni esplicita in F2, non euristiche |
| perdita di lavoro fra sessioni | ogni fase committata e pushata appena chiusa |
| conversione automatica su trascrizioni divergenti da Lane | collazione preventiva, vedi §4-bis |

## 6. Sequenza consigliata

`Passo 0` → `D1–D4` → `F0` → `F1 lotto A` → `F2` → `F1 lotti B e C` → `F3` → `F5` →
`D2` → `F4`.

F2 è anticipato subito dopo il lotto A perché è a rischio quasi nullo e sblocca la
ricerca a testo pieno su tutte le forme abbreviate — il beneficio visibile più
immediato per chi usa il sito.
