# Fonti letterarie — modello dei dati e norme redazionali

Documento di riferimento della sezione **Fonti letterarie** di ILA.
Aggiornato al 31 agosto 2026.

- Modello e vocabolari: [`src/lib/litSources.ts`](../src/lib/litSources.ts)
- Griglie concettuali LARES: [`src/lib/laresToolbox.ts`](../src/lib/laresToolbox.ts)
- Markup del testo antico: [`src/lib/litMarkup.ts`](../src/lib/litMarkup.ts)
- Archivio e integrità: [`src/lib/litStore.ts`](../src/lib/litStore.ts)
- Contenuto redazionale (seme): [`src/data/fontiLetterarie.ts`](../src/data/fontiLetterarie.ts)
- Interfaccia: [`LiterarySourcesPanel.tsx`](../src/components/LiterarySourcesPanel.tsx),
  [`LiterarySourcesEditor.tsx`](../src/components/LiterarySourcesEditor.tsx),
  [`LiteraryMarkupEditor.tsx`](../src/components/LiteraryMarkupEditor.tsx),
  [`MarkupText.tsx`](../src/components/MarkupText.tsx),
  [`LiteraryEchoes.tsx`](../src/components/LiteraryEchoes.tsx)

---

## 1. Che cos'è, e perché

Lo **spoglio ragionato delle fonti antiche** sulla divinità lunare.

Il catalogo epigrafico risponde alla domanda «che cosa si scriveva sulla
pietra»; questa sezione risponde a «che cosa si diceva nei testi». Le due
risposte non coincidono — e lo scarto fra le due è il contributo scientifico
originale di ILA, non un effetto collaterale.

## 2. Tre entità, in quest'ordine

| Entità | Che cos'è | Corrispettivo nel corpus |
|---|---|---|
| **Opera** | l'unità bibliografica: Esiodo, *Teogonia*. Autore, lingua, genere, datazione, edizione, CTS URN, testo online — scritti **una volta sola** | — |
| **Testimonianza** | il passo dentro l'opera (`operaId` + `locus`), con testo marcato, traduzione, commento e indici. È l'unità catalogabile | la scheda del monumento |
| **Saggio** | la trattazione discorsiva che **richiama** testimonianze già catalogate e le commenta | — (nel corpus le pagine di sintesi sono *calcolate*) |

**Il saggio non contiene le testimonianze: le richiama per id.** La stessa
testimonianza può quindi comparire in due saggi con due letture diverse, che è
il caso normale. Le sigle T1, T2… non sono un dato della testimonianza: sono
la sua posizione dentro un saggio, e si calcolano dall'ordine dei nuclei
(`sigleDelSaggio`).

Questo rovesciamento — le testimonianze fuori dal saggio, non dentro — è la
regola che tiene insieme la sezione con il resto del database: nel corpus
nessuno scrive «la pagina di Men» a mano, si scrivono schede e gli indici di
divinità ed epiteti sono **calcolati dal markup**. Qui vale lo stesso.

## 3. Come si naviga

Quattro viste sullo stesso materiale, più la scheda:

| Vista | Che cos'è |
|---|---|
| **Opere** *(ingresso)* | l'indice bibliografico: che cosa è stato spogliato, in ordine cronologico. Click su un'opera → i suoi passi |
| **Testimonianze** | l'elenco filtrabile di tutti i passi — l'equivalente dell'elenco delle schede |
| **Indici** | le rubriche trasversali (§ 5) |
| **Saggi** | le trattazioni; entrando in un saggio si apre la **vista Lettura**, perché un saggio è discorso e non elenco |
| **Scheda** | il singolo passo: modale con rail dei metadati e sezioni Testo · Commento · Analisi · Rimandi, come la scheda del monumento |

Dentro un saggio: **Lettura** (predefinita) · **Elenco** (le sole
testimonianze richiamate) · **Indici** · esportazione **TEI**.

## 4. LARES come modello di riferimento

[LARES](https://lares-lexicon.unibo.it/en/) — *Language and Religion*
(Bologna, Helsinki, Kraków, Complutense) — è un lessico concettuale
dell'acculturazione religiosa antica, codificato in TEI EpiDoc e pubblicato su
EFES. Le 47 voci pubblicate sono voci di **lemma** (*Agalma*, *Pompe*,
*Mania*, *Hebraios*…), non di divinità: è la ragione per cui il saggio di ILA
è intitolato a una parola e non a un dio.

### 4.1 Lo scheletro della voce

Ricalcato dalla scheda pubblicata Ἑβραῖος: Morfologia · Etimologia ·
Testimonianze (divise in *Inscriptions* / *Papyri* / *Literary sources*) ·
Catalogo delle occorrenze · Discussione · Bibliografia (corpora / studi).

In `Saggio` i campi corrispondenti sono `morfologia`, `etimologia`, `nuclei`,
`sintesi`, `bibliografiaCorpora`, `bibliografia`. Sono **facoltativi**: si
rende ciò che è scritto, non un modulo con dei buchi. Il **catalogo delle
occorrenze** non si scrive: lo calcola `catalogoOccorrenze()`.

**Ciò che ILA aggiunge**: un corpus epigrafico proprio. La sezione
«Iscrizioni», che in LARES si redige a mano, qui si ricava dal corpus
attraverso `chiaviCorpus` — i `key` normalizzati di divinità ed epiteti, non
stringhe di ricerca.

### 4.2 I due vocabolari concettuali

LARES lavora su **due livelli distinti**, e vanno tenuti distinti anche qui
(entrambi in [`laresToolbox.ts`](../src/lib/laresToolbox.ts)):

**a. I nove marcatori concettuali** — tre campi × tre ambiti:

| Campo (it / en) | Ambiti |
|---|---|
| Rappresentazione / representation | pratica · credenza · finzione |
| Comunicazione / communication | segno · **senso** · parola |
| Fruizione / fruition | sistemi · strumenti · strutture |

Nella scheda pubblicata sono i toggle «Show/hide» in testa. Da noi valgono per
la **testimonianza intera** (campo `lares`) e passano su `@ana`.

**b. L'Analytical Toolbox** — sette item → categorie → sottocategorie: agenti
umani, agenti sovrumani, attività, stati mentali, spazi, istituzioni,
materialità. Si applica a **segmenti precisi del testo**, e la marcatura è
dichiarata dal documento LARES stesso:

```
primo grado        <rs type="…">
secondo e terzo    <rs subtype="… …">   (valori multipli, separati da spazio)
```

Il documento avverte che il toolbox è «only a preliminary classification grid
that can be expanded, modified, deconstructed, restructured, or even
reformulated»: è una risorsa flessibile, non uno standard chiuso. Dove ILA
aggiunge qualcosa lo dichiara (`aggiunta: true`) invece di confonderlo con
l'originale.

## 5. Il markup: uno solo per le due metà del database

**Il testo letterario si marca con lo stesso sistema dell'edizione
epigrafica.** Non è un'economia di implementazione: è la condizione perché una
parola marcata in Esiodo e la stessa parola marcata su una stele finiscano
nello stesso indice.

I due vocabolari coincidono già: LARES marca i termini con `<w lemma="…">`, le
fonti con `<ref type="lit|ins|pap">`, le categorie con `<rs type subtype>`;
ILA marca le divinità con `<persName type="divine" key>` + `<name nymRef>` +
`<rs type="epithet">` e il lessico cultuale con `<w lemma ana>`.

`litMarkup.ts` riusa quindi da `leidenMarkup.ts` il tokenizer, le operazioni
su percorsi, la validazione e le azioni **semanticamente comuni** (divinità,
persone, etnici, cariche, numerali, mesi, lessico cultuale, lacune,
correzioni). Restano fuori le azioni che descrivono la pietra e il lapicida —
vacat, lettere riscritte, nomi frammentari, legature: un libro non ha un
lapicida, e offrirle qui inviterebbe a marcature false.

Si aggiunge solo ciò che nella pietra non esiste e nel libro sì:

| Azione | Markup | A che serve |
|---|---|---|
| Variante di tradizione | `<app><lem wit><rdg wit>` | apparato critico |
| Espunzione dell'editore | `<surplus resp>` | testo tràdito ritenuto interpolato |
| Parola citata in quanto parola | `<mentioned corresp xml:lang>` | etimologie e glosse — il caso più frequente nei lessicografi |
| Citazione dentro la citazione | `<quote source>` | l'autore cita a sua volta |
| Titolo d'opera | `<title>` | |
| Rimando a una fonte antica | `<ref type="lit\|ins\|pap" target>` | elemento proprio di LARES |
| Categoria del toolbox | `<rs type subtype>` | § 4.2b |

**`<lb/>` cambia referente.** In epigrafia è la riga incisa, un fatto
materiale; qui è il verso (poesia) o l'accapo dell'edizione (prosa). Resta
utile per citare «vv. 3-4», ma non porta mai `break="no"`, che descrive una
parola spezzata dalla pietra: il serializzatore lo rimuove se arriva da un
incolla epigrafico.

### 5.1 Che cosa il markup alimenta

`extractLitMarkupIndex()` ricava dal testo marcato divinità, epiteti, persone,
luoghi, lessico cultuale, parole citate e categorie del toolbox. Da lì:

- gli **indici** della sezione (rubriche Divinità, Epiteti, Lessico cultuale,
  Toolbox): calcolati, non compilati;
- il blocco **«Nelle fonti letterarie»** nelle pagine Divinità ed Epiteti del
  corpus (`LiteraryEchoes`), che elenca i passi che nominano quella divinità o
  quell'epiteto e ci porta dentro con un click.

**I conteggi restano separati, di proposito.** «237 occorrenze» nella pagina
di Men vuol dire duecentotrentasette monumenti, e deve continuare a volerlo
dire. Un passo di Strabone non è un'attestazione di culto: è un'altra cosa, e
si mostra come un'altra cosa, sotto, con la sua etichetta.

Il markup **non sostituisce** i campi compilati a mano (`divinita`,
`personaggi`, `figure`, `luoghi`): li affianca. I primi sono normalizzati sui
`key` del corpus, i secondi usano i nomi italiani della redazione, e chi cerca
trova con la chiave che ha.

## 6. Dove vivono i dati

Tre stati dello stesso contenuto, in ordine di precedenza:

1. **Archivio live** — `fonti-letterarie.json` sulla repo dati
   (`Gregoee2002/ILA`), letto e riscritto dall'editor a redazione sbloccata.
   È la fonte di verità.
2. **Scatto statico** — `public/fonti-letterarie.json`, copia generata a ogni
   deploy da `scripts/build-corpus-snapshot.ts`. È quello che legge chi apre
   il sito con la sola password.
3. **Seme compilato** — `src/data/fontiLetterarie.ts`, dentro il bundle. Vale
   finché nessuno ha mai salvato: al primo deploy l'archivio non esiste.

Il passaggio è automatico (1 se c'è, altrimenti 2, altrimenti 3), ma
l'interfaccia **dichiara** quale dei tre sta leggendo: un redattore deve
sapere se sta guardando dati suoi o il seme di partenza.

Un file solo e non uno per saggio perché opere, testimonianze e saggi si
rimandano l'un l'altro per id: salvarli separatamente vorrebbe dire poter
salvare un saggio che richiama testimonianze non ancora scritte.

## 7. L'editor

Gate: la redazione sbloccata con un PAT GitHub (lo stesso del corpus). Quattro
registri, che sono i quattro livelli del modello: **Opere · Testimonianze ·
Saggi · Controlli**.

I **Controlli** verificano ciò che nessun tipo TypeScript può verificare,
perché riguarda rimandi fra oggetti: `operaId` che non risolve, identificatori
duplicati, saggi che richiamano passi inesistenti, markup malformato, opere
senza testimonianze, testimonianze non richiamate da nessun saggio. **Con
errori aperti il salvataggio è bloccato**; gli avvisi no — quelli sono lavoro
dichiarato, non guasti.

## 8. Norme redazionali

**Testi antichi.** Si riproduce il testo dell'edizione dichiarata, senza
normalizzazioni silenziose. Le omissioni si segnano con `[…]`, l'attacco *in
medias res* con `…`.

**Traduzioni.** Redazionali (`trad. redazionale ILA`) e volutamente letterali:
servono a rendere leggibile il testo, non a sostituire una traduzione
d'autore. Non si riprendono traduzioni pubblicate — anche per non importare
vincoli di diritto in un progetto ad accesso aperto.

**Commento.** È la parte che giustifica la sezione. Non parafrasa il passo:
dice che cosa il passo fa alla costruzione della divinità lunare e, dove
possibile, lo confronta con l'evidenza epigrafica. Un commento che si limita a
riassumere il testo va riscritto.

**Termini notevoli.** Forma attestata e lemma di indicizzazione; la nota
spiega perché il termine è notevole (dialetto, tecnicismo cultuale, hapax).

**Collazione.** Ogni testimonianza dichiara se il testo è stato riscontrato
sull'edizione (`verificato`) o no (`da-collazionare`). Il contatore rende il
debito visibile; non va nascosto.

**Il greco non va mai messo in maiuscolo dal CSS.** I titoli dei nuclei
contengono greco (`II. I nomi della luna: σελήνη, μήνη, luna`);
`text-transform: uppercase` produrrebbe `ΣΕΛΉΝΗ`, con l'accento che il greco
maiuscolo non porta. Dove si mostra un titolo di nucleo si usa il grassetto
spaziato senza `uppercase`.

## 9. Esportazione TEI

Il pulsante **TEI** scarica il saggio come TEI P5 / EpiDoc:

- le opere spogliate in `<listBibl type="works">` dentro `<sourceDesc>`, con
  `<idno type="CTS-URN">` e `<idno type="TLG">` quando ci sono;
- ogni testimonianza è un `<cit>` con `@ana` verso la tassonomia LARES e
  `@corresp` verso la tassonomia ILA dei tipi;
- il `<quote>` del testo antico **conserva il markup inline**: appiattirlo
  significherebbe buttare via l'unica cosa che lega davvero le due metà del
  database;
- `<bibl>` con `<ref type="lit" target="#opera">` e `<citedRange>`;
- `<note type="terms|entities|links|commentary">` per i raggruppamenti —
  **non** `<listRelation>`, che in TEI ammette solo `<relation>`;
- il catalogo delle occorrenze in `<div type="occurrences">`, calcolato.

L'obiettivo non è la validazione contro l'ODD di LARES, che non è pubblico, ma
un file che un redattore LARES possa importare senza rimappare i campi.

## 10. Stato

**17 opere spogliate · 19 testimonianze · 1 saggio** (Selene, `ILA-LIT-selene`),
700 a.C. – 420 d.C.

Lavoro aperto:

1. **Collazione di tutti i 19 testi** sulle edizioni dichiarate. È la
   precondizione per poter citare la sezione.
2. **Marcatura del testo**: 5 testimonianze su 19 sono marcate. Finché le
   altre non lo sono, le rubriche calcolate (divinità, epiteti, lessico
   cultuale, toolbox) restano parziali.
3. **Rilettura dei marcatori concettuali** (`lares`): sono di prima
   assegnazione, fatta prima che arrivassero i documenti di progetto LARES.
4. Da confermare con la redazione LARES: la collocazione delle tre voci
   aggiunte nella versione *enlarged* del toolbox (*legal / benevolent /
   malevolent action*), che il documento mette in coda alla colonna delle
   sottocategorie senza ripetere item e categoria. Qui stanno sotto
   **agenti sovrumani → divinità**, perché descrivono azioni di un agente
   sovrumano; è l'unico posto sensato nella griglia, ma resta una nostra
   lettura.
5. Saggi da redigere: **Men (Μήν)**, **Lunus**, Ecate, Attis, Sabazio,
   Artemide.
6. Da valutare: `refType: 'pap'` per la documentazione magica (PGM), oggi
   richiamata nel commento ma non schedata.
