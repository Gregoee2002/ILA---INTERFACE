# Merge fra il lessico cultuale ILA e i marcatori LARES — proposta v1

Stato: **approvata e implementata (passi 1-5 del §8)** — 2026-09-05.
Il passo 6 (riscrittura di `@type`/`@subtype` nei file del corpus) **non è stato
fatto**: il percorso si deriva dal lemma a runtime, quindi il markup esistente
funziona così com'è. Serve solo se si vuole un TEI auto-descrittivo per LARES.
Sorgenti: [`src/lib/cultLexicon.ts`](../src/lib/cultLexicon.ts) (5 famiglie, 56 lemmi —
54 al momento della proposta,
~25 sotto-funzioni) · [`src/lib/laresToolbox.ts`](../src/lib/laresToolbox.ts) (9 marcatori
concettuali + Analytical Toolbox a 3 gradi) · norme in
[`docs/tassonomia-funzioni-cultuali.md`](tassonomia-funzioni-cultuali.md) §§2-5 e
[`docs/fonti-letterarie-modello.md`](fonti-letterarie-modello.md) §4.2, §5.

Il disegno qui sotto è stato realizzato. Dove il codice si discosta dalla proposta è
segnato in §8.

## 1. Perché un merge, e che cosa NON è

Oggi la stessa parola su una stele di Men può ricevere due marcature che non si parlano:

| | dominio | chi decide | markup |
|---|---|---|---|
| lessico cultuale ILA | funzione cultuale della parola | l'editor sceglie **1 famiglia su 5**; la sotto-funzione la deriva il codice dal lemma | `<w lemma ana="#famiglia">` |
| Analytical Toolbox LARES | *che cosa* è la cosa nominata (agente, attività, spazio…) | l'editor sceglie un percorso nella griglia | `<rs type="item" subtype="cat sub">` |

Non sono lo stesso asse e **il merge non li fonde in uno solo**. Sono complementari:
`#agency` dice *chi agisce*, `superhuman-agents → divinities → legal-action` dice
*di che natura è l'atto*. Il merge consiste in tre cose:

1. una **funzione di derivazione** `lemma → percorso toolbox`, sullo stesso modello
   della tabella `lemma → sotto-funzione` già in §5 della tassonomia: l'editor continua
   a rispondere a **una sola domanda** («dio o uomo?»), il percorso LARES lo scrive il codice;
2. un **innesto di voci nuove** nel toolbox dove il corpus di Men non trova casa —
   sempre al 2° o 3° grado, mai un ottavo item (§4);
3. un **ponte verso i nove marcatori concettuali**, che restano di livello superiore
   (testimonianza intera), con un default suggerito per famiglia (§6).

Regola di conservazione: **nessun id LARES esistente viene rinominato, spostato o
ridefinito**. Le aggiunte portano `aggiunta: true` come già le tre voci «enlarged»
(`legal-action`, `benevolent-action`, `malevolent-action`), con `fonte: 'ILA'` per
distinguerle da quelle della redazione.

## 2. La regola di conversione, in breve

> **La famiglia dice chi è il soggetto; il percorso toolbox dice a quale realtà
> appartiene la parola.**

| famiglia (`@ana`) | item toolbox di norma |
|---|---|
| `agency` | `superhuman-agents` → `divinities` |
| `atto-cultuale` | `activities` (l'atto) · `institutions` (la norma, la registrazione) · `spaces` / `materiality` (la cosa costruita o donata) |
| `colpa` | `activities` → *transgression* (nuova categoria) |
| `formula-fissa` | `activities` → `prayers` quando la formula è un atto di parola; altrimenti nessun percorso (§5) |
| `ruolo-istituzione` | `human-agents` |

Un punto di attrito, e va detto: **la famiglia guarda al soggetto dell'enunciato, il
toolbox al referente della parola**. Per questo `ναός` è `#atto-cultuale`
(sotto-funzione *costruzione*: l'uomo costruisce) ma nel toolbox sta in
`spaces → constructions → public`, perché la parola nomina un edificio. Non è
un'incoerenza da sanare: è esattamente il guadagno informativo del doppio asse.

## 3. Tabella completa — i lemmi

Percorsi in `item → categoria → sottocategoria`. In **grassetto** le voci proposte come
nuove (§4). Le sotto-funzioni sono quelle già in `cultLexicon.ts`.

### 3.1 `agency` (11 lemmi) — `superhuman-agents → divinities`

| lemma | sotto-funzione | percorso toolbox |
|---|---|---|
| δύναμις | dynamis | divinities → **power** |
| αἱρετίζω | scelta | divinities → **election** |
| χρηματισμός | comando | divinities → **injunction** |
| ἐπιταγή | comando | divinities → **injunction** |
| βασιλεύω | signoria-territoriale | divinities → **territorial-lordship** |
| κατέχω | signoria-territoriale | divinities → **territorial-lordship** |
| κολάζω | castigo-divino | divinities → `legal-action` |
| νεμεσάω | castigo-divino | divinities → `legal-action` |
| ἐπήκοος | ascolto | divinities → `epithets` |
| εὐίλατος | disposizione-favorevole | divinities → `epithets` |
| ἐπιφανής | manifestazione | divinities → `epithets` |

Sui tre aggettivi vale una regola esplicita: **un aggettivo che nel testo funziona da
epiclesi va in `epithets`**, non in `agencies`/`benevolent-action`, anche quando la
sua funzione è l'ascolto o la benevolenza — quella resta registrata nella
sotto-funzione ILA. Così `epithets` continua ad alimentare l'indice degli epiteti
insieme a `<rs type="epithet">`, invece di spargere gli stessi aggettivi su tre rami.
`benevolent-action` / `malevolent-action` restano per i **verbi** (nessuno dei lemmi li
usa oggi: entrano appena si marcheranno εὐλογέω *detto del dio*, ἵλεως γίνομαι, o le
maledizioni).

`agencies` («azioni, funzioni, epifanie») resta il contenitore generico: non lo usiamo
per nessuno di essi, perché ognuno trova un ramo più preciso. È voluto — `agencies` è il
fallback quando un lemma nuovo non ha ancora un ramo.

### 3.2 `atto-cultuale` (23 lemmi)

| lemma | sotto-funzione | percorso toolbox |
|---|---|---|
| εὐχή | voto | activities → prayers → **vow** |
| εὔχομαι | voto | activities → prayers → **vow** |
| εὐχαριστέω | propiziazione | activities → prayers → **thanksgiving** |
| εὐχαριστία | propiziazione | activities → prayers → **thanksgiving** |
| εὐλογέω | propiziazione | activities → prayers → **thanksgiving** |
| σέβω | propiziazione | activities → prayers → **veneration** |
| ἀνατίθημι | dedica | activities → offering → **dedication** |
| ἀνίστημι | dedica | activities → offering → **dedication** |
| καθιερόω | consacrazione | activities → offering → **consecration** |
| καθιδρύω | consacrazione | activities → offering → **consecration** |
| ἐξειλάσκομαι | propiziazione | activities → **expiation** → **propitiation** |
| ἐξομολογέομαι | confessione-verbale | activities → **expiation** → **confession** |
| ὁμολογέω | confessione-verbale | activities → **expiation** → **confession** |
| λύτρον | riscatto | activities → **expiation** → **ransom** |
| λυτρόω | riscatto | activities → **expiation** → **ransom** |
| καθαρίζω | norma-santuariale | activities → **expiation** → **purification** |
| ἀκάθαρτος | norma-santuariale | institutions → religious-practices → **purity-rule** |
| ἄσυλος | norma-santuariale | institutions → religious-practices → `law` |
| μαρτυρέω | registrazione-su-stele | institutions → religious-practices → **record** |
| στηλογραφέω | registrazione-su-stele | institutions → religious-practices → **record** |
| τεκμωρεύω | tekmor | institutions → religious-practices → `administration` |
| στέφανος | onori-decretati | institutions → civic-customs → **honours** *(oggetto: materiality → adornments)* |
| ναός | costruzione | spaces → constructions → `public` |

Due esiti che il merge **guadagna** e che oggi la tassonomia ILA appiattisce:

- `καθαρίζω` e `ἀκάθαρτος` hanno la stessa sotto-funzione *norma-santuariale* ma
  cadono in rami diversi: il verbo è un **atto** di purificazione, l'aggettivo enuncia
  una **norma** di purità. Il toolbox li separa senza toccare la tassonomia ILA.
- `στέφανος` è insieme un onore deliberato (`institutions`) e un oggetto
  (`materiality → adornments`). Il markup ammette entrambe le letture solo con due
  elementi annidati; per default si scrive quella istituzionale, che è ciò che le
  iscrizioni onorarie predicano. Vedi §7.

### 3.3 `colpa` (2 lemmi) — categoria nuova

| lemma | sotto-funzione | percorso toolbox |
|---|---|---|
| ἁμαρτάνω | peccato-generico | activities → **transgression** → **sin** |
| ἐπιορκέω | spergiuro | activities → **transgression** → **perjury** |

La colpa è un'azione umana: sta sotto `activities`, non merita un item proprio. Prevista
in griglia anche **impiety** (ἀσεβέω, ἀσέβεια), oggi a zero attestazioni nel corpus —
la si dichiara nella tassonomia ma, come per παιδίσκη/φιλόθεος, **non** entra nel
vocabolario dell'editor finché non ci sono riscontri.

### 3.4 `formula-fissa` (8 lemmi)

| lemma | sotto-funzione | percorso toolbox |
|---|---|---|
| ἐπεξορκίζω | imprecazione | activities → prayers → **imprecation** |
| ὁρκίζω | imprecazione | activities → prayers → **imprecation** |
| ἐνορκίζω | imprecazione | activities → prayers → **imprecation** |
| κεχολωμένος | imprecazione | activities → prayers → **imprecation** |
| σκῆπτρον | imprecazione | materiality → `instruments` |
| ὗε κύε | formula-pioggia | activities → prayers → **invocation** |
| χαίρω | acclamazione | — (§5) |
| χρηστὸς χαῖρε | saluto-funerario | — (§5) |

`σκῆπτρον` fa eccezione dentro la sua stessa famiglia: la parola nomina un **oggetto**
(lo scettro esposto a tutela della tomba), non l'atto di parola. `materiality →
instruments` — «attributi funzionali» — è il suo posto.

### 3.5 `ruolo-istituzione` (12 lemmi) — `human-agents`

| lemma | sotto-funzione | percorso toolbox |
|---|---|---|
| ἱερεύς | sacerdozio | cult-personnel → `priest` |
| ἱερατεύω | sacerdozio | cult-personnel → `priest` |
| ἀρχιερεύς | sacerdozio | cult-personnel → **high-priest** |
| στολιστής | sacerdozio | cult-personnel → `assistant` |
| σύνοδος | associazione | groups → `associations` |
| φράτρα | associazione | groups → `associations` |
| -ιασταί | associazione | groups → `associations` |
| συνβολαφόρος | associazione | groups → `associations` |
| κατοικία | comunita | groups → **local-community** |
| θρεπτός | status-allevato | human-agents → **status** → **threptos** |
| θρέμμα | status-allevato | human-agents → **status** → **threptos** |
| τρέφω | status-allevato | human-agents → **status** → **threptos** *(manual)* |

`τρέφω` resta `manual: true` come in `cultLexicon.ts`: il percorso si propone solo se
l'attestazione è stata confermata a mano (ILA-151 è metafora poetica).

## 4. Le voci nuove, in ordine di griglia

Diciotto sottocategorie e tre categorie. Tutte al 2° o 3° grado: **l'elenco dei sette
item resta intatto.**

**`superhuman-agents → divinities`** — 4 sottocategorie nuove
| id | it | en | perché |
|---|---|---|---|
| `power` | potenza | Power | δύναμις è il nucleo teologico del corpus (μεγάλη ἡ δύναμις); `agencies` lo dissolverebbe fra le «azioni» |
| `election` | scelta | Election | il dio che sceglie un uomo o un luogo (αἱρετίζω) |
| `injunction` | ingiunzione | Injunction | ordine/responso che obbliga a un atto (ἐπιταγή, χρηματισμός); distinto da `legal-action`, che è sanzione |
| `territorial-lordship` | signoria territoriale | Territorial lordship | βασιλεύω / κατέχω: la titolarità del luogo, tratto identitario di Men Axiottenos e simili |

Alternativa scartata per `territorial-lordship`: riusare `contexts`. Non regge —
`contexts` raccoglie i contesti in cui la divinità appare, non l'atto di signoria.

**`activities → offering`** — 2 sottocategorie nuove
| id | it | en | perché |
|---|---|---|---|
| `dedication` | dedica | Dedication | ἀνατίθημι/ἀνίστημι: `ex-votes` esiste ma nomina l'**oggetto**, non l'atto |
| `consecration` | consacrazione | Consecration | καθιερόω/καθιδρύω: passaggio di statuto giuridico-sacro, non un dono |

**`activities → prayers`** — 5 sottocategorie nuove (la categoria oggi non ne ha nessuna)
| id | it | en | perché |
|---|---|---|---|
| `vow` | voto | Vow | εὐχή, il lemma più attestato del corpus (~116 occorrenze) |
| `thanksgiving` | ringraziamento | Thanksgiving | εὐχαριστέω, εὐλογέω |
| `veneration` | venerazione | Veneration | σέβω |
| `invocation` | invocazione | Invocation | ὗε κύε e le formule di richiesta |
| `imprecation` | imprecazione | Imprecation | ἐπεξορκίζω, κεχολωμένος: l'uomo che invoca il dio contro qualcuno — speculare a `malevolent-action`, dove il soggetto è il dio |

**`activities → expiation`** — **categoria nuova**, 4 sottocategorie
| id | it | en | perché |
|---|---|---|---|
| `confession` | confessione | Confession | ἐξομολογέομαι, ὁμολογέω |
| `propitiation` | propiziazione | Propitiation | ἐξειλάσκομαι |
| `ransom` | riscatto | Ransom | λύτρον, λυτρόω |
| `purification` | purificazione | Purification | καθαρίζω |

È l'aggiunta più consistente e la più giustificata: le stele di confessione sono il
genere epigrafico che il toolbox LARES, pensato su materiale greco più largo, non
prevede. Senza questa categoria, colpa → castigo → confessione → riscatto — la catena
che *definisce* il corpus di Men — si sparpaglia fra `prayers` e `offering`.

**`activities → transgression`** — **categoria nuova**, 3 sottocategorie
| id | it | en | perché |
|---|---|---|---|
| `sin` | peccato | Sin | ἁμαρτάνω |
| `perjury` | spergiuro | Perjury | ἐπιορκέω |
| `impiety` | empietà | Impiety | dichiarata, 0 attestazioni (§3.3) |

**`institutions → religious-practices`** — 2 sottocategorie nuove
| id | it | en | perché |
|---|---|---|---|
| `record` | registrazione | Record | μαρτυρέω, στηλογραφέω: la pubblicazione su pietra come atto amministrativo-sacro |
| `purity-rule` | norma di purità | Purity rule | ἀκάθαρτος: `law` resta per asylia e norme santuariali generali |

**`institutions → civic-customs`** — 1 sottocategoria nuova (la categoria oggi non ne ha)
| id | it | en | perché |
|---|---|---|---|
| `honours` | onori decretati | Decreed honours | στέφανος |

**`human-agents → cult-personnel`** — 1 sottocategoria nuova
| id | it | en | perché |
|---|---|---|---|
| `high-priest` | sommo sacerdote | High priest | ἀρχιερεύς; `priest` da solo perde la gerarchia sacerdotale |

**`human-agents → groups`** — 1 sottocategoria nuova
| id | it | en | perché |
|---|---|---|---|
| `local-community` | comunità locale | Local community | κατοικία: né `ethnic-group` né `political-group` né `associations` |

**`human-agents → status`** — **categoria nuova**, 3 sottocategorie
| id | it | en | perché |
|---|---|---|---|
| `threptos` | allevato in casa | Threptos | θρεπτός, θρέμμα, τρέφω |
| `servant` | servo / serva | Servant | dichiarata (παιδίσκη), 0 attestazioni |
| `devotee` | devoto | Devotee | dichiarata (φιλόθεος), 0 attestazioni |

Lo **status** non è né personale di culto né gruppo né fedele in quanto tale: è una
condizione della persona. Le prime due categorie di `human-agents` descrivono ruoli
rituali, `groups` collettivi; `status` colma il buco senza toccarle. Le due voci a zero
attestazioni si dichiarano in griglia ma non entrano nel vocabolario dell'editor —
stessa norma già decisa il 2026-08-30 per παιδίσκη/φιλόθεος.

## 5. Che cosa resta fuori dal toolbox, e va bene così

`χαίρω` (acclamazione) e `χρηστὸς χαῖρε` (saluto funerario) **non ricevono percorso**.
Sono formule di genere senza referente: non nominano un agente, un'attività, uno spazio.
Forzarle sotto `activities → prayers` produrrebbe un dato falso — non sono preghiere.
Restano marcate `#formula-fissa` e qualificate, sul piano superiore, dal marcatore
concettuale *comunicazione → parola*. La funzione derivata deve quindi poter restituire
**«nessun percorso»**: è un esito legittimo, non un buco da riempire.

## 6. Ponte verso i nove marcatori concettuali

I nove marcatori valgono per la **testimonianza intera** (campo `lares`, su `@ana`), non
per la parola: qui non c'è merge, c'è un **default suggerito** quando una scheda contiene
parole di una data famiglia. Proposta, da usare come suggerimento non vincolante:

| famiglia prevalente nella scheda | campo → ambito suggerito |
|---|---|
| `agency` | rappresentazione → **credenza** |
| `atto-cultuale` | rappresentazione → **pratica** |
| `colpa` | rappresentazione → credenza *(+ comunicazione → senso, se la colpa è tematizzata)* |
| `formula-fissa` | comunicazione → **parola** |
| `ruolo-istituzione` | fruizione → **sistemi** |
| *(percorso toolbox in `materiality`)* | fruizione → **strumenti** |
| *(percorso toolbox in `spaces`)* | fruizione → **strutture** |

Da rendere come suggerimento nell'editor delle fonti letterarie
(`LiterarySourcesEditor.tsx`, i toggle di §4.2a), mai come assegnazione automatica: il
marcatore concettuale è un giudizio sulla testimonianza, non una somma di parole.

## 7. Come si scrive nel markup

`<w>` e `<rs>` sono entrambi `att.typed` in TEI: `@type` e `@subtype` convivono con
`@lemma`/`@ana`. Quindi **una sola parola = un solo elemento**:

```xml
<w lemma="εὐχή" ana="#atto-cultuale"
   type="activities" subtype="prayers vow"
   lemmaRef="https://logeion.uchicago.edu/εὐχή">εὐχήν</w>
```

Segmento di più parole, o parola già dentro un `<persName>`/`<rs type="epithet">`: si
avvolge, come già prescrive LARES.

```xml
<rs type="superhuman-agents" subtype="divinities power">
  <w lemma="δύναμις" ana="#agency #formula">δύναμις</w>
</rs>
```

Doppia lettura (il caso `στέφανος` di §3.2): due elementi annidati, l'esterno per la
realtà istituzionale, l'interno per l'oggetto — da usare con parsimonia, e solo dove il
testo predica davvero entrambe le cose.

**Chi scrive `@type`/`@subtype`**: il codice, non l'editor. `@lemma` + `@ana="#famiglia"`
restano le uniche due scelte editoriali, esattamente come la sotto-funzione fine.
L'editor può **rifiutare** il percorso proposto (i casi ambigui esistono: `μαρτυρέω`
detto del dio testimone non è `record`), e allora scrive a mano — ma non deve navigare
sette item per marcare una parola.

## 8. Che cosa implementare, se la proposta passa

Nell'ordine, ognuno verificabile da solo:

1. `laresToolbox.ts`: le 3 categorie e 18 sottocategorie nuove, con
   `aggiunta: true` e un campo nuovo `fonte?: 'LARES-enlarged' | 'ILA'` — così le tre
   voci in rosso della redazione e le nostre non si confondono. Nessun id esistente cambia.
2. `cultLexicon.ts`: **fatto diversamente** — non una colonna di `CULT_LEXICON` ma una
   tabella a parte, `LEMMA_TOOLBOX`, con `toolboxForLemma()`, `toolboxAttrs()` e
   `checkToolboxTable()` (coerenza della tabella: 0 errori). È un asse diverso e si
   legge meglio accanto alla §3 di questo documento. 52 lemmi su 54 hanno percorso.
3. `leidenMarkup.ts` / `litMarkup.ts`: l'azione «Funzione cultuale (parola)» prefilla
   anche `@type`/`@subtype` da `toolboxForLemma`; la validazione avverte (warning, non
   error) se il percorso scritto a mano non esiste in griglia o non è coerente con la
   famiglia.
4. `xmlUtils.ts` → `extractCultAttestations`: `toolbox` dentro `CultAttestation`, così
   entra nello snapshot statico (il sito statico è il bersaglio reale) e la vista
   «Lessico cultuale» può raggruppare **per percorso LARES** oltre che per famiglia/lemma.
   Attenzione al tetto `arrCap("cultAttestations", 500)` in `apiShim.ts`.
5. Guida editor §8: una tabella «famiglia → percorso» e la regola «il percorso lo scrive
   il codice, tu rispondi a una domanda sola». PDF rigenerato.
6. Corpus: **non fatto, e non urgente**. `extractCultAttestations` deriva il percorso dal
   lemma, quindi i 301 `<w>` già nel corpus lo hanno senza essere riscritti (verificato:
   297 con percorso, 4 senza). Riscriverli serve solo per un TEI auto-descrittivo da
   consegnare a LARES; in quel caso, script sul clone fresco del repo dati, mai per copia
   (i due repo divergono: vedi le note di progetto).

### Verificato il 2026-09-05

- `checkToolboxTable()`: 0 errori; 54/56 lemmi con percorso, senza = χαίρω, χρηστὸς χαῖρε.
- Estrazione su tutti i 295 file: 301 attestazioni, 297 con percorso.
- Validatore: percorso inesistente, item inventato, `@subtype` senza `@type` e percorso
  diverso da quello abituale del lemma → un warning ciascuno, nessun falso positivo sul
  markup corretto.
- Vista «Lessico cultuale» → «per griglia LARES» nel build statico: 32 percorsi in ordine
  di griglia + sezione «Senza percorso».

### Emerso durante l'implementazione — deciso

`ὁρκίζω` (ILA-136) ed `ἐνορκίζω` (ILA-144) erano marcati `<w ana="#formula-fissa">` nel
corpus ma mancavano dal vocabolario controllato, e il validatore li segnalava come fuori
tabella. **Aggiunti il 2026-09-05** in `formula-fissa` / `imprecazione`, accanto a
ἐπεξορκίζω, e quindi in `activities → prayers → imprecation`. Il controllato passa da 54 a
**56 lemmi**, lo spoglio a 320 righe; senza percorso restano solo χαίρω e χρηστὸς χαῖρε.

## 9. Da confermare con la redazione LARES

1. La collocazione delle tre voci «enlarged» (`legal-action`, `benevolent-action`,
   `malevolent-action`) sotto `divinities` — già segnata come aperta in
   `fonti-letterarie-modello.md` §10 (punto 4 di «Da fare»). Il merge la assume e ci appoggia i castighi divini.
2. Se `expiation` e `transgression` siano accettabili come categorie di `activities` o
   se LARES le preveda altrove: sono l'ossatura del genere «stele di confessione» e
   il punto in cui ILA porta qualcosa che il toolbox non ha.
3. Se `status` stia bene sotto `human-agents` o se la redazione preferisca estendere
   `worshippers`.
4. Se il doppio annidamento di §7 sia ammesso dal loro ODD (non pubblico).
