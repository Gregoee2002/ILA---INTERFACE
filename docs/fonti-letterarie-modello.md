# Fonti letterarie — modello dei dati e norme redazionali

Documento di riferimento della sezione **Fonti letterarie** di ILA.
Aggiornato al 31 agosto 2026.

- Modello e vocabolari: [`src/lib/litSources.ts`](../src/lib/litSources.ts)
- Contenuto redazionale: [`src/data/fontiLetterarie.ts`](../src/data/fontiLetterarie.ts)
- Interfaccia: [`src/components/LiterarySourcesPanel.tsx`](../src/components/LiterarySourcesPanel.tsx)

---

## 1. Che cos'è, e perché

Una **raccolta ragionata di testimonianze letterarie** greche e latine sulla
divinità lunare, organizzata per voce e, dentro la voce, per nuclei tematici.

Il catalogo epigrafico risponde alla domanda «che cosa si scriveva sulla
pietra»; questa sezione risponde a «che cosa si diceva nei testi». Le due
risposte non coincidono — e lo scarto fra le due è il contributo scientifico
originale di ILA, non un effetto collaterale.

Sulla home le due sezioni sono affiancate e di pari rango (*Sulla pietra* /
*Nei testi*). Non è una scelta grafica: è la tesi della sezione.

## 1.1 Come si naviga

La sezione **ricalca la grammatica del catalogo epigrafico** — elenco
filtrabile, click su una riga, scheda a tutta pagina — su tre livelli:

| Livello | Che cos'è | Corrispettivo nel catalogo |
|---|---|---|
| **1. Indice delle voci** | Selene, Men, Lunus… con i numeri di ciascuna e l'elenco di quelle ancora da redigere | — (il catalogo ha una sola raccolta) |
| **2. Elenco testimonianze** | la tabella filtrabile di una voce: sigla · fonte · datazione · genere · incipit, ordinabile per nucleo, cronologia o autore | l'elenco delle schede |
| **3. Scheda** | il singolo passo, modale con rail dei metadati a sinistra e sezioni (Testo · Commento · Analisi · Rimandi) | la scheda del monumento |

Accanto all'elenco, due viste alternative sulla stessa voce:

- **Lettura** — il discorso continuo: cappello, nuclei tematici con i loro
  cappelli, testimonianze commentate in sequenza, sintesi, bibliografia. È la
  parte che nessun calcolo può derivare dai dati, ed è il motivo per cui la
  voce esiste; da qui ogni testimonianza apre la propria scheda.
- **Indici** — le sette rubriche trasversali del lessico LARES.

Il pulsante **TEI** esporta la voce intera in EpiDoc (§ 5).

Una nota sulla natura dei nuclei tematici, perché è la differenza sostanziale
con il resto del database: le viste del corpus (mappa, cronologia, epiteti,
lessico cultuale) sono **calcolate** dal markup XML e si aggiornano da sole; i
nuclei sono **scritti a mano** da chi redige la voce e restano fermi finché
qualcuno non li riscrive. Sono una tesi sul materiale, non una sua proiezione.

## 2. LARES come modello di riferimento

[LARES](https://site.unibo.it/lares/en) — *Language and Religion: Lexical
Change and Variation in Religious Enculturation / Acculturation phenomena of
the Ancient World* (Bologna, Helsinki, Kraków, Complutense) — è un lessico
concettuale dell'acculturazione religiosa antica, codificato in TEI EpiDoc e
pubblicato su [lares-lexicon.unibo.it](http://lares-lexicon.unibo.it/en/).

Da LARES ereditiamo **tre scelte di impianto**, non l'implementazione:

| Scelta LARES | Resa in ILA |
|---|---|
| La citazione è l'unità marcata, con `<ref type="lit\|ins\|pap">` | campo `refType` sul `Testimonium`; l'esportazione TEI emette `<ref type="…">` |
| Indici trasversali: fonti, ambiti, termini, personaggi, figure, luoghi | `buildIndici()`, resi nel pannello «Indici» con le stesse sette rubriche |
| Griglia concettuale a 3 campi × 3 ambiti | `LARES_GRID`, campo `lares` su ogni testimonianza, filtro per campo nella barra |

### La griglia concettuale

| Campo (it / en) | Ambiti |
|---|---|
| Rappresentazione / representation | pratica · credenza · finzione |
| Comunicazione / communication | segno · significato · parola |
| Fruizione / fruition | sistemi · strumenti · strutture |

Ogni testimonianza porta una o più coppie campo/ambito. Questa
classificazione è **aggiuntiva** rispetto alla tassonomia interna di ILA
(`TipoTestimonianza`: genealogia, etimologia, notizia cultuale…), che è più
fine e serve alla navigazione quotidiana. Nell'interfaccia i due gruppi di
chip sono separati dall'etichetta `LARES`.

### Che cosa ILA aggiunge a LARES

Il **ponte al corpus** (`corpus: CorpusPonte[]`). Ogni testimonianza può
portare una o più ricerche già pronte sul catalogo epigrafico. LARES non ha
un corpus epigrafico proprio; ILA sì, ed è la ragione per cui questa sezione
esiste.

I ponti sono espressi come **query di ricerca**, non come id di scheda: così
restano validi dopo rinumerazioni, aggiunte e rimozioni. Il rovescio è che
una query può diventare cieca se il corpus cambia — vedi § 6.

## 3. Struttura dei dati

```
Voce                          Selene, Men, Lunus…
 ├─ cappello: string[]        introduzione
 ├─ nuclei: Nucleo[]          raggruppamenti tematici (titolo + cappello + sigle)
 ├─ testimonia: Testimonium[] le schede vere e proprie
 ├─ sintesi: string[]         che cosa i testi dicono e che cosa tacciono
 └─ bibliografia: string[]
```

Il `Testimonium` è l'unità: fonte (autore, opera, locus, lingua, datazione,
genere), testo (originale, traduzione, edizione, stato di collazione),
analisi (tipo, marcatori LARES, commento, termini notevoli), indici
(divinità, personaggi, figure storiche, luoghi) e rimandi (corpus, link
esterni, bibliografia).

I nuclei referenziano i testimonia **per sigla** (`T1`, `T2`…), non per
posizione: si può riordinare un nucleo senza toccare le schede.

## 4. Norme redazionali

**Testi antichi.** Si riproduce il testo dell'edizione dichiarata in
`edizione`, senza normalizzazioni silenziose. Le omissioni si segnano con
`[…]`, l'attacco *in medias res* con `…`.

**Traduzioni.** Sono redazionali (`trad. redazionale ILA`) e volutamente
letterali: servono a rendere leggibile il greco, non a sostituire una
traduzione d'autore. Non si riprendono traduzioni pubblicate — anche per non
importare vincoli di diritto in un progetto ad accesso aperto.

**Commento.** È la parte che giustifica la sezione. Non parafrasa il passo:
dice che cosa il passo fa alla costruzione della divinità lunare, e — dove
possibile — lo confronta con l'evidenza epigrafica del corpus. Un commento
che si limita a riassumere il testo va riscritto.

**Termini notevoli.** Si registra la forma attestata e il lemma di
indicizzazione; la nota spiega perché il termine è notevole (dialetto,
tecnicismo cultuale, hapax). È il campo che alimenta l'indice dei termini,
cioè la parte più propriamente «LARES» della voce.

**Collazione.** Ogni testimonianza dichiara se il testo è stato riscontrato
sull'edizione cartacea (`verificato`) o no (`da-collazionare`). Il contatore
in testa alla voce rende il debito visibile; non va nascosto.

## 5. Esportazione TEI

Il pulsante **TEI** scarica la voce come TEI P5 / EpiDoc:

- ogni testimonianza è un `<cit>` con `@ana` verso la tassonomia LARES e
  `@corresp` verso la tassonomia ILA dei tipi;
- due `<quote>` (originale e traduzione, con `@resp`);
- `<bibl>` con `<ref type="lit">`, data, edizione e stato di collazione;
- `<note type="terms|entities|links|commentary">` per i raggruppamenti —
  **non** `<listRelation>`, che in TEI ammette solo `<relation>`;
- le due tassonomie dichiarate in `<encodingDesc><classDecl>`, con i
  `<catDesc>` in italiano e in inglese.

L'obiettivo non è la validazione contro l'ODD di LARES, che non è pubblico,
ma un file che un redattore LARES possa importare senza rimappare i campi.

## 6. Manutenzione

**I ponti al corpus vanno verificati.** Una query che non trova nulla è un
vicolo cieco per il lettore. Le query attuali sono state controllate contro
l'indice di ricerca reale del progetto (`buildSearchIndex` +
`searchMonumenti` su `public/corpus-snapshot.json`). Da tenere presente:

- la ricerca normalizza il greco (via accenti e spiriti, sigma finale → sigma)
  e usa `prefix: true` con `fuzzy: 0.2`;
- l'iconografia è indicizzata sia per chiave inglese sia per etichetta
  italiana: `toro` e `cavallo` funzionano dove `bull` e `horse` no;
- la modalità di combinazione predefinita è `OR`: una query di due parole
  allarga il risultato invece di restringerlo. **Usare query di una sola
  parola.**

**Aggiungere una voce.** Redigerla in `src/data/fontiLetterarie.ts` e
aggiungerla all'array `VOCI`; togliere la riga corrispondente da
`VOCI_IN_PREPARAZIONE`. Compare da sola nell'indice delle voci, con i numeri
calcolati da `voceStats`. Nessun'altra modifica è necessaria.

**Il greco non va mai messo in maiuscolo dal CSS.** I titoli dei nuclei
contengono greco (`II. I nomi della luna: σελήνη, μήνη, luna`); `text-transform:
uppercase` produrrebbe `ΣΕΛΉΝΗ`, con l'accento che il greco maiuscolo non
porta. Dove si mostra un titolo di nucleo si usa il grassetto spaziato senza
`uppercase`.

## 7. Stato

**Voce pilota: Selene** (`ILA-LIT-selene`) — 19 testimonianze, 7 nuclei,
16 fonti, 40 termini indicizzati.

Lavoro aperto:

1. **Collazione di tutti i 19 testi** sulle edizioni dichiarate. È la
   precondizione per poter citare la voce.
2. Voci da redigere: **Men (Μήν)**, **Lunus**, Ecate, Attis, Sabazio,
   Artemide.
3. Da valutare: `refType: 'pap'` per la documentazione magica (PGM), che
   qui è richiamata nel commento a T15 ma non schedata.
4. Da valutare: identificatori citabili esterni per autori e opere (CTS URN,
   TLG), oggi presenti solo come link liberi su alcune schede.
