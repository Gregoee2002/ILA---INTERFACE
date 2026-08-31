# Audit interfaccia grafica — Vista "Catalogo" e sottocomponenti

Data: 2026-08-31
Perimetro: `activeView === 'catalog'` in `src/App.tsx` e tutte le sottocomponenti che la vista monta direttamente o che le sono funzionalmente collegate (viste satellite raggiunte selezionando una scheda).
Metodo: lettura statica riga per riga di `src/App.tsx` (7569 righe) e dei componenti collegati, `npm install` + `npm run build` per verificare la compilazione ed eventuali warning del bundler. Nessuna modifica al codice applicativo.

## Sommario esecutivo

Il Catalogo compila senza errori (`npm run build` termina con `exit code 0`), ma l'audit ha individuato **oltre 70 problemi concreti**, la maggior parte legati a tre aree ricorrenti:

1. **Interazione da tastiera pressoché assente su tutti i livelli.** Le righe della lista, le celle della heatmap, i titoli nei popup mappa, le voci dell'indice divinità/epiteti e i termini cliccabili nel testo epigrafico sono tutti `<div>`/`<span>` con `onClick` ma senza `role`, `tabIndex` o gestione `onKeyDown`. Un utente che naviga solo da tastiera non può aprire una scheda dalla lista né seguire la maggior parte dei link interni del Catalogo.
2. **Stato dei filtri/risultati mai annunciato.** Non esiste una sola occorrenza di `aria-live` in tutto `src/App.tsx`: il conteggio "Visualizzazione di N schede", il cambio pagina, il feedback di export riuscito e gli errori di caricamento (Pleiades, mappa) sono comunicati solo visivamente.
3. **Robustezza del rendering markup fragile su input malformati.** `case 'gap'` in `App.tsx:3077-3089` e i corrispondenti punti in `MarkupText.tsx`/`EditionMarkupEditor.tsx` calcolano `'·'.repeat(Number(quantityAttr))` senza escludere valori negativi: un attributo `quantity="-3"` in un XML del corpus lancia un `RangeError` non gestito. **Non esiste alcun Error Boundary in tutta l'app** (`grep -r "ErrorBoundary\|componentDidCatch" src/` non trova nulla), quindi quell'unica eccezione fa collassare l'intera vista Catalogo invece del solo blocco di testo malformato — è il rilievo più grave dell'intero audit.

Altri problemi strutturali degni di nota:

- **Bug di navigazione confermato**: il branch `redirect-catalog` di `handleTermClick` (`App.tsx:4014-4017`) imposta il filtro di ricerca e chiude la scheda ma non chiama `setActiveView('catalog')`, a differenza del branch gemello `redirect-stats` (riga 4018-4021) che lo fa esplicitamente. Cliccando un nome di luogo/persona nel testo mentre si è su Timeline o altre viste, la scheda si chiude "nel vuoto" senza mostrare il Catalogo filtrato.
- **Codice morto confermato dal bundler**: `npm run build` segnala esplicitamente `case 'w'` duplicato nello switch di rendering EpiDoc (`App.tsx:3329` e `3507`) — il secondo blocco, con logica diversa (niente colorazione lessico cultuale), non verrà mai eseguito.
- **Combinazioni di filtri contraddittorie senza avviso**: `onlyHasTrad` e `onlyNoTrad` (o `onlyInscr`/`onlyAnep`) possono essere entrambi attivi contemporaneamente (`App.tsx:4413-4418`), producendo sempre 0 risultati senza che l'interfaccia lo segnali come combinazione impossibile.
- **Performance**: bundle di produzione a **2,15 MB minificati** (`dist/assets/index-*.js`) in un unico chunk, nessun `React.lazy`/`code-splitting` in tutto `src/`, logo PNG da 814 KB caricato eagerly, liste (record list, indice bibliografico, heatmap co-occorrenze) non virtualizzate.

Il resto del documento dettaglia i rilievi per sottocomponente.

## Nota di perimetro

`activeView === 'catalog'` monta direttamente: header con barra di ricerca (righe 5358-5446), tendina filtri `#catalog-sidebar` (5586-5827), lista/griglia schede con paginazione (5853-6209), e la scheda-dettaglio a pergamena (6800-7549) che incorpora `PleiadesMap` (7157) e `IconographyPanel` (7414). Il rendering del testo epigrafico Leiden/EpiDoc dentro la scheda usa una logica di parsing/rendering scritta direttamente in `App.tsx` (funzione `renderNode`/componente `EpiDocRenderer`, righe ~2818-3600), **parallela e in parte divergente** da quella riusabile in `src/components/MarkupText.tsx` + `src/lib/leidenMarkup.ts` (usata invece da `EditionMarkupEditor.tsx`).

`BibliographyIndex`, `CooccurrenceHeatmap` e `MapView` vivono su `activeView` distinti (`biblio`, `heatmap`, `map`), non dentro `catalog` in senso stretto: sono viste satellite che chiudono il cerchio riportando l'utente sulla stessa scheda-dettaglio del Catalogo alla selezione di un monumento. Sono incluse nell'audit perché indicate esplicitamente nell'incarico e perché condividono dati/interazioni col Catalogo. `DivinityEpithetIndex.tsx`, anch'esso indicato nell'incarico, **non risulta montato né nel Catalogo né nelle sue viste satellite**: è usato solo da `SectionEditorView.tsx` (`activeView === 'editor'`), fuori dal perimetro effettivo della vista Catalogo. Viene comunque riportato più sotto per completezza, con questa avvertenza.

## Tabella dei rilievi

| Sottocomponente | Problema | Gravità | File:riga | Correzione proposta |
|---|---|---|---|---|
| Rendering markup (App.tsx) | `'·'.repeat(Number(quantityAttr))` con `quantity` negativo lancia `RangeError` non gestito; nessun Error Boundary in tutta l'app | Alta | src/App.tsx:3082-3083 | Clampare a `Math.min(Math.max(Number(quantityAttr) || 5, 0), 12)` e aggiungere un Error Boundary attorno al renderer |
| Rendering markup (MarkupText/Editor) | Stesso pattern di `repeat` non protetto da quantità negative | Alta | src/components/MarkupText.tsx:92; src/components/EditionMarkupEditor.tsx:528 | `Math.min(Math.max(Number(a.quantity) \|\| 5, 1), 12)` |
| App (globale) | Nessun Error Boundary in `src/` | Alta | (assente) | Aggiungere un Error Boundary attorno a `EpiDocRenderer`/`MarkupText` che ricada su testo semplice |
| Navigazione / redirect-catalog | Click su termine nel testo non riporta a `activeView('catalog')`, a differenza di `redirect-stats` | Alta | src/App.tsx:4014-4017 | Aggiungere `setActiveView('catalog')` nel branch `redirect-catalog` |
| Navigazione / Timeline | `Timeline onSelect={setSelectedMonumento}` non imposta `activeView`, incoerente con tutte le altre viste (Stats, Cult, Health, Registro, Biblio, Map) | Alta | src/App.tsx:6300 | Allineare a `(m) => { setSelectedMonumento(m); setActiveView('catalog'); }` |
| Rendering markup (App.tsx) | `case 'w'` duplicato nello switch, il secondo blocco è codice morto (segnalato anche da `npm run build`) | Media | src/App.tsx:3329 e 3507 | Rimuovere il secondo `case 'w'`, consolidare le due metà duplicate dello switch |
| Barra di ricerca (header) | Input di ricerca senza `aria-label`/label associata | Alta | src/App.tsx:5401-5411 | `aria-label="Cerca nel catalogo"` |
| Barra di ricerca (header) | Toggle filtri icona-solo senza `aria-expanded`/`aria-controls` verso `#catalog-sidebar` | Alta | src/App.tsx:5412-5421 | `aria-expanded={showFilterPanel} aria-controls="catalog-sidebar" aria-label="Filtri avanzati"` |
| Pannello filtri | Overlay di chiusura non raggiungibile da tastiera, nessun listener `Escape` | Alta | src/App.tsx:5588-5827 | Aggiungere `useEffect` con `keydown Escape` per chiudere il pannello (pattern già presente altrove nel file) |
| Pannello filtri | `<aside id="catalog-sidebar">` senza `role="dialog"`/`aria-labelledby` | Alta | src/App.tsx:5596-5610 | `aria-labelledby` verso l'heading del pannello |
| Pannello filtri | Checkbox "Con/Senza Traduzione" sono `div` con `onClick`, non semantiche | Media | src/App.tsx:5792-5810 | `<input type="checkbox">` reale o `role="checkbox" aria-checked` |
| Pannello filtri | Combinazioni contraddittorie (`onlyHasTrad`+`onlyNoTrad`, `onlyInscr`+`onlyAnep`) producono 0 risultati senza avviso | Media | src/App.tsx:4413-4418 | Rendere i controlli mutuamente esclusivi (radio/toggle a 3 stati) o mostrare un messaggio esplicito |
| Pannello filtri | 7 `<select>` con classe/style inline duplicati identici | Bassa | src/App.tsx:5674-5783 | Estrarre componente `FilterSelect` condiviso |
| Pannello filtri | "Reset Filtri" sempre attivo anche senza filtri, incoerente col pulsante gemello in header | Media | src/App.tsx:5813-5821 | `disabled={!hasActiveFilters}` |
| Lista schede | Nessun messaggio "nessun risultato" quando `filteredMonumenti.length === 0` | Alta | src/App.tsx:5905-5927 | Ramo esplicito con `role="status" aria-live="polite"` |
| Lista schede | Conteggio "Visualizzazione di N schede" non è `aria-live` | Alta | src/App.tsx:5858 | `aria-live="polite"` sul contenitore |
| Lista schede | Riga cliccabile (`motion.div onClick`) non raggiungibile/attivabile da tastiera | Alta | src/App.tsx:5911-5927 | `<button>`/`role="button" tabIndex={0}` + `onKeyDown` Enter/Space |
| Lista schede | Checkbox di selezione (singola e "seleziona tutto") non semantiche, nessun `aria-checked`/`aria-label` | Alta | src/App.tsx:5869-5895, 5938-6020 | `<input type="checkbox">` reale con `aria-label` |
| Lista schede | Paginazione: frecce prec/succ icona-solo senza `aria-label`, nessun `aria-current="page"` sul numero attivo | Media | src/App.tsx:6090-6129 | `aria-label` sui pulsanti freccia, `aria-current="page"` |
| Lista schede | Chip regione/città filtranti solo su desktop, su mobile sono `<span>` non interattivi | Media | src/App.tsx:5979-5985 vs 6035-6051 | Rendere anche i chip mobile dei `<button>` con lo stesso `onClick` |
| Lista schede | Key di rendering (`row-${indice}`) diversa da key di selezione (`entryId \|\| id`) | Media | src/App.tsx:5908 vs 3902/5909 | Usare ovunque `m.entryId \|\| m.id` |
| Lista schede | Nessuna virtualizzazione (mitigato da `ITEMS_PER_PAGE = 25`) | Bassa | src/App.tsx:5905-6081 | Valutare `react-window` se `ITEMS_PER_PAGE` crescesse |
| Scheda-dettaglio | Contenitore senza `role="dialog"`/`aria-modal`/`aria-labelledby`, nessun focus trap né ripristino focus alla chiusura | Alta | src/App.tsx:6801-6813, 6806/6820 | `role="dialog" aria-modal aria-labelledby`, focus trap, ripristino focus sul trigger |
| Scheda-dettaglio | Gerarchia heading incoerente (h4 prima dell'unico h2, sezioni che saltano da h2 a h4) | Media | src/App.tsx:6870, 6992, 7070, 7129 | Normalizzare h2 (titolo) → h3 (sezioni) → h4 (dettagli) |
| Scheda-dettaglio | Badge stato/tipo con contrasto insufficiente (sfondo tinta 10%) | Media | src/App.tsx:6967-6984 | Aumentare opacità sfondo o usare tinte 700 in light mode |
| Scheda-dettaglio | Feedback export riuscito solo visivo, nessun `aria-live` | Media | src/App.tsx:6169-6201 | Regione `aria-live="polite"` con annuncio testuale |
| Scheda-dettaglio | Sezioni "Supporto"/"Georeferenziazione" renderizzate senza placeholder quando tutti i campi sono vuoti | Media | src/App.tsx:7070-7196 | Fallback "Nessun dato registrato" coerente con Iconografia/Bibliografia |
| Scheda-dettaglio | Nessun badge "sola lettura"/"modifica sbloccata" dentro la scheda | Media | src/App.tsx:6825-6909 | Riflettere lo stato di sblocco anche nell'header della scheda |
| Scheda-dettaglio | Due pulsanti "Modifica" identici nello stesso rail | Bassa | src/App.tsx:6825-6837 vs 6896-6909 | Rimuoverne uno o differenziarne lo scopo |
| Scheda-dettaglio | Fallback immagine facsimile manipola il DOM manualmente fuori da React | Bassa | src/App.tsx:7052-7061 | Gestire con stato React invece di `document.createElement`/`innerHTML` |
| Export XML/PDF | Nessun `try/catch`, a differenza di `downloadBackup` che ne ha uno | Alta | src/App.tsx:5095-5151 | Avvolgere in try/catch con messaggio d'errore visibile |
| Export XML/PDF | Nessuno stato di caricamento durante l'esportazione sincrona e bloccante | Media | src/App.tsx:5095-5151, 6169-6201 | Stato `exporting`, disabilitare il bottone, spinner |
| Modali sovrapposti | Import Avanzato e scheda-dettaglio condividono `z-50`, ordine di stacking non deterministico | Media | src/App.tsx:6412 vs 6801 | z-index distinti in base all'ordine di apertura |
| Impostazioni | Sezioni "Gestione Locale" e "Amministrazione" duplicano gli stessi pulsanti Importa/Esporta | Bassa | src/App.tsx:5507-5521 vs 5533-5547 | Unificare le due sezioni |
| Rendering markup | Hover sul testo epigrafico ricostruisce l'intero albero VDOM ad ogni `mousemove`, non throttled | Alta | src/App.tsx:2874-2886 | Estrarre il tooltip in componente separato/portale, throttle con `requestAnimationFrame` |
| Rendering markup | Tooltip semantici (`data-epidoc-tooltip`) pilotati solo da mouse, nessun `onFocus`/`tabIndex`/`aria-describedby` | Alta | src/App.tsx (vari, es. 3072, 3195, 3337) | `tabIndex={0}`, `onFocus`/`onBlur`, `aria-describedby` verso tooltip con `role="tooltip"` |
| Rendering markup | `text-cult` (#8B6F9C) su sfondo chiaro ha contrasto ≈4.0:1, sotto soglia WCAG AA | Media | src/index.css:10; MarkupText.tsx:156,165; EditionMarkupEditor.tsx:576,583; App.tsx:3337,3352 | Scurire `--cult` in tema chiaro (es. #7A5D8B) |
| Rendering markup | `text-muted/70` per integrazioni (`supplied`) scende a contrasto ≈2.7:1 | Media | MarkupText.tsx:85; EditionMarkupEditor.tsx:524; App.tsx:3054/3062 | Colore a piena opacità verificato invece di ridurre opacità sul testo |
| Rendering markup | `case 'expan'` ignora contenuto fuori da `<abbr>/<ex>`, sparisce silenziosamente | Media | MarkupText.tsx:104-114; App.tsx:3282-3297 | Fallback su `kids`/testo integrale se `abbr` assente |
| Rendering markup | Entità numeriche (`&#956;`) non decodificate da `unescapeText` | Media | src/lib/leidenMarkup.ts:141-146 | Aggiungere decodifica `&#(x[0-9a-f]+\|\d+);` |
| Rendering markup | Nessun `React.memo` su `MarkupText`/`Flow` | Bassa | src/components/MarkupText.tsx | `React.memo` sul componente esportato |
| BibliographyIndex | Input di ricerca senza label accessibile | Alta | src/components/BibliographyIndex.tsx:267-272 | `aria-label` |
| BibliographyIndex | Toggle "Solo discrepanze" senza `aria-pressed` | Media | src/components/BibliographyIndex.tsx:274-284 | `aria-pressed={onlyConflicts}` |
| BibliographyIndex | Accordion "Modifica" senza `aria-expanded`/`aria-controls` | Media | src/components/BibliographyIndex.tsx:314-319 | `aria-expanded`, `aria-controls` |
| BibliographyIndex | Lista non virtualizzata per corpus con molte varianti bibliografiche | Media | src/components/BibliographyIndex.tsx:289-346 | Virtualizzazione oltre soglia |
| DivinityEpithetIndex (non collegato al Catalogo) | Associazione divinità↔epiteto veicolata solo da curve SVG `aria-hidden` e hover mouse | Alta | src/components/DivinityEpithetIndex.tsx:106-119, 44-78 | Esporre l'associazione anche testualmente |
| DivinityEpithetIndex (non collegato al Catalogo) | Voci `div` con solo `onMouseEnter`, irraggiungibili da tastiera | Alta | src/components/DivinityEpithetIndex.tsx:124-153 | `tabIndex`, `onFocus`/`onBlur` equivalenti |
| MapView | `<MapContainer>` senza alternativa testuale/`aria-label` | Alta | src/components/MapView.tsx:617-625 | `aria-label`, elenco testuale alternativo |
| MapView | Dropdown custom `EntityDropdown` senza semantica combobox né navigazione da tastiera | Alta | src/components/MapView.tsx:202-299 | Pattern ARIA combobox completo |
| MapView | Titolo popup marker cliccabile senza `role="button"`/tastiera | Alta | src/components/MapView.tsx:711-716 | `<button>` reale o `role="button" tabIndex` |
| MapView | Sidebar filtri larghezza fissa `w-80`, non responsive | Media | src/components/MapView.tsx:517 | `w-full md:w-80` con drawer mobile |
| MapView | Legenda densità/regione affidata quasi solo al colore | Media | src/components/MapView.tsx:756-787 | Simboli/etichette oltre al colore |
| PleiadesMap | Errore di caricamento coordinate non annunciato (`role="alert"` assente) | Alta | src/components/PleiadesMap.tsx:75-79 | `role="alert"` |
| PleiadesMap | Nessuna cache condivisa con `MapView`, fetch ripetuti per lo stesso URI | Media | src/components/PleiadesMap.tsx:19-59 | Cache condivisa (context/modulo) |
| CooccurrenceHeatmap | Intensità PMI veicolata solo dal colore cella, valore solo in `title` al passaggio mouse | Alta | src/components/CooccurrenceHeatmap.tsx:226-250, 432, 446 | Simbolo/valore numerico visibile in cella |
| CooccurrenceHeatmap | Celle cliccabili senza `tabIndex`/`role="button"` | Alta | src/components/CooccurrenceHeatmap.tsx:429-448 | Rendere `<button>` o aggiungere ruolo/tastiera |
| CooccurrenceHeatmap | Matrice non virtualizzata per assi con molti valori distinti | Media | src/components/CooccurrenceHeatmap.tsx:400-453 | Virtualizzazione a griglia oltre soglia |
| IconographyPanel | `fig.traits.forEach` senza guardia su `traits` assente → crash possibile su XML malformato | Alta | src/components/IconographyPanel.tsx:38 | `(fig.traits \|\| []).forEach(...)` |
| IconographyPanel | Raggruppamento tratti ricalcolato ad ogni render, nessun `useMemo` | Media | src/components/IconographyPanel.tsx:35-90 | `useMemo` su `[monumento]` |
| Build/performance globale | Bundle unico 2,15 MB minificati, nessun code-splitting in tutta l'app | Media | dist/assets/index-*.js (build output) | `React.lazy`/`manualChunks` per viste pesanti (mappa, editor, PDF export) |
| Build/performance globale | Logo PNG 814 KB caricato eagerly | Bassa | src/assets (logo) | Comprimere/servire in formato moderno (WebP/AVIF) con dimensioni esplicite |

## Dettaglio per sottocomponente

### 1. Header e barra di ricerca (`App.tsx:5358-5446`)

L'input di ricerca e il toggle filtri sono icone/placeholder senza nomi accessibili collegati al pannello che controllano, nonostante il target (`#catalog-sidebar`) sia già pronto per essere referenziato via `aria-controls`. Il pulsante "Azzera filtri" nasconde il testo su mobile lasciando solo l'icona. Nessuno dei tre controlli ha uno stile di `:focus-visible` esplicito, a differenza dei controlli dentro il pannello filtri che già usano `focus:ring-1 focus:ring-accent/30`. Segnalata anche una duplicazione dello stato di ricerca tra il campo dell'header e quello dentro il pannello (stesso `filters.searchText`, due input scollegati via `htmlFor`).

### 2. Pannello filtri `#catalog-sidebar` (`App.tsx:5586-5827`)

È il blocco con più rilievi di accessibilità: manca la gestione del tasto Escape (pattern già presente altrove nel file, es. righe 3628-3634 e 4074-4080, quindi non è un'eccezione impossibile da applicare qui), il pannello non si presenta come regione denominata (`aria-labelledby`), le checkbox "Con/Senza Traduzione" sono simulate con `div` invece di controlli nativi. Sette `<select>` ripetono la stessa classe Tailwind e lo stesso `style` inline carattere per carattere — un candidato naturale per un componente `FilterSelect` condiviso. È stata verificata anche una combinazione logica pericolosa: `onlyHasTrad` e `onlyNoTrad` (righe 4417-4418), così come `onlyInscr` e `onlyAnep` (righe 4413-4414), possono essere entrambi veri contemporaneamente, azzerando sempre i risultati senza che l'interfaccia lo segnali come combinazione impossibile.

### 3. Lista schede e paginazione (`App.tsx:5853-6209`, con supporto da 4393-4463)

Nessuno stato vuoto esplicito quando i filtri non producono risultati (il contatore mostra "0 schede" ma la lista resta silenziosamente bianca). Le righe/card sono `motion.div` con `onClick` privi di qualunque semantica interattiva o gestione da tastiera: un utente che naviga solo da tastiera non può aprire nessuna scheda dal Catalogo. Le checkbox di selezione multipla (riga singola e "seleziona tutto") sono div/bottoni che imitano visivamente una checkbox senza `aria-checked`. La paginazione gestisce correttamente i bordi (pagina fuori range dopo una cancellazione, nascondersi con 0/1 pagina) ma i controlli prec/succ sono icone senza nome accessibile e manca `aria-current="page"` sul numero attivo. Segnalata un'incoerenza funzionale mobile/desktop: i chip regione/città sono filtri cliccabili su desktop ma semplice testo su mobile.

### 4. Scheda-dettaglio a pergamena (`App.tsx:6800-7549`)

Il pannello che occupa la maggior parte dell'interazione utente nel Catalogo non è marcato come dialogo (`role="dialog"`/`aria-modal`), non intrappola il focus e non lo ripristina sull'elemento che ha aperto la scheda alla chiusura. La gerarchia dei titoli (`h2`/`h3`/`h4`) è incoerente tra le sue sotto-sezioni. Le sezioni "Supporto" e "Georeferenziazione" non mostrano un placeholder quando tutti i campi sono vuoti, a differenza di "Iconografia" e "Bibliografia" che lo fanno già. Non c'è alcun indicatore, dentro la scheda stessa, della modalità sola-lettura vs modifica sbloccata: l'utente deve dedurlo dalla presenza/assenza dei pulsanti di modifica. Il fallback di errore per l'immagine facsimile manipola il DOM manualmente fuori dal ciclo di render di React, un pattern fragile e da evitare in un'app React.

### 5. Export XML/PDF (`App.tsx:5095-5151`, feedback a 6169-6201)

A differenza di `downloadBackup`, che ha un `try/catch` con `alert` in caso di errore, `exportFilteredData` ed `exportToPDF` non hanno alcuna gestione d'errore: un'eccezione durante la generazione (dati malformati, `jsPDF`/`autoTable` che falliscono su cataloghi grandi) non viene mai mostrata all'utente. Le funzioni sono sincrone e bloccanti, senza alcuno stato di caricamento visibile mentre girano — l'unico feedback ("Esportato" con icona di spunta) appare solo a operazione già conclusa, e nulla impedisce un doppio click durante l'attesa.

### 6. Logica di navigazione e redirect (`handleTermClick`, `App.tsx:4014-4025`; mount delle viste, 6211-6301)

Bug confermato: il branch `redirect-catalog` (righe 4014-4017), attivato cliccando un termine (luogo, persona) nel testo epigrafico, imposta il filtro di ricerca e chiude la scheda corrente ma **non** cambia `activeView`, a differenza del branch gemello `redirect-stats` (righe 4018-4021) che lo fa esplicitamente per la vista Statistiche. Se la scheda era aperta da una vista diversa dal Catalogo (es. Timeline), l'utente si ritrova sulla vista di partenza senza alcun segnale che una ricerca sia stata impostata altrove. Coerentemente, `Timeline` (riga 6300) è l'unica vista tra tutte quelle che aprono una scheda a non impostare `setActiveView('catalog')` nel proprio `onSelect`, mentre Stats, Cult, Health, RegistroPanel, BibliographyIndex e MapView lo fanno tutte in modo identico.

### 7. Rendering markup Leiden/EpiDoc — doppia implementazione

Esiste una logica di rendering EpiDoc scritta due volte: una integrata in `App.tsx` (funzione `renderNode`, righe ~2818-3600, usata dalla scheda-dettaglio) e una riusabile in `src/components/MarkupText.tsx` + `src/lib/leidenMarkup.ts` (usata da `EditionMarkupEditor.tsx`). Le due implementazioni divergono: `App.tsx` prova prima `DOMParser` XML e ricade su un parser HTML permissivo (che abbassa i nomi dei tag) senza segnalarlo all'utente, mentre l'editor mostra esplicitamente un avviso di errore di parsing. All'interno di `App.tsx` esiste inoltre un caso concreto di duplicazione interna: due `case 'w'` nello stesso switch (righe 3329 e 3507), il secondo dei quali — confermato anche dal warning di `esbuild` in fase di build — è codice morto perché il primo case con lo stesso valore intercetta sempre l'esecuzione.

Il rilievo più severo dell'intero audit riguarda proprio questo blocco: `case 'gap'` (righe 3077-3089) e gli equivalenti in `MarkupText.tsx:92` ed `EditionMarkupEditor.tsx:528` calcolano `'·'.repeat(Number(quantityAttr))` verificando solo che il valore non sia `NaN`, non che sia non-negativo. Un attributo `quantity="-3"` in un file XML del corpus (refuso di battitura o dato corrotto) fa lanciare a `String.prototype.repeat` un `RangeError` non gestito. Poiché **non esiste alcun Error Boundary in tutta l'applicazione**, quell'eccezione risale fino a far collassare l'intera vista Catalogo con una schermata bianca, invece di limitarsi al singolo blocco di testo malformato.

Da segnalare anche un problema di performance percepita: il tooltip che accompagna il markup (`data-epidoc-tooltip`) è pilotato da `onMouseMove` non throttled che ricostruisce l'intero albero React del testo epigrafico ad ogni movimento del mouse, oltre a essere interamente inaccessibile da tastiera (nessun `onFocus`/`tabIndex`/`aria-describedby`) nonostante veicoli informazioni semantiche centrali (lacune, integrazioni, lessico cultuale). Sono stati inoltre misurati problemi di contrasto colore sotto la soglia WCAG AA per `text-cult` in tema chiaro e per `text-muted/70` usato sulle integrazioni editoriali.

### 8. BibliographyIndex, DivinityEpithetIndex, MapView, PleiadesMap, CooccurrenceHeatmap, IconographyPanel

Questi componenti, elencati nell'incarico, ripetono a livello locale gli stessi pattern di accessibilità carenti già visti nel Catalogo (input senza label, toggle senza `aria-pressed`, elementi cliccabili senza `role`/tastiera) e aggiungono problemi specifici al proprio dominio: la heatmap di co-occorrenza veicola l'informazione principale (intensità PMI) solo tramite colore di sfondo cella, in violazione del principio "non solo colore"; le mappe (`MapView`, `PleiadesMap`) non offrono alcuna alternativa testuale ai non vedenti; `IconographyPanel` può andare in errore runtime se `fig.traits` è `undefined` invece di un array vuoto, un altro punto di fragilità su dati XML non perfettamente conformi. `DivinityEpithetIndex` non risulta collegato al Catalogo nel codice attuale (vedi Nota di perimetro) ma condivide lo stesso difetto di fondo: l'unica informazione (l'associazione divinità↔epiteto) è veicolata da curve SVG marcate `aria-hidden` e da hover del mouse, quindi persa per chi non vede o non usa il mouse.

## Checklist finale, ordinata per priorità

### Priorità alta — correggere prima di ogni rilascio
- [ ] Clampare `quantity` a valori non negativi in tutti e tre i punti che calcolano `'·'.repeat(...)` (App.tsx:3082-3083, MarkupText.tsx:92, EditionMarkupEditor.tsx:528) ed evitare così il `RangeError` su XML malformato.
- [ ] Aggiungere un Error Boundary attorno al rendering del testo epigrafico (scheda-dettaglio ed editor), così un singolo attributo corrotto non fa collassare l'intera vista.
- [ ] Aggiungere `setActiveView('catalog')` nel branch `redirect-catalog` di `handleTermClick` (App.tsx:4014-4017) e allineare `Timeline` (riga 6300) allo stesso pattern delle altre viste.
- [ ] Rendere le righe della lista schede (App.tsx:5911-5927) e i titoli nei popup mappa (MapView.tsx:711-716) attivabili da tastiera (`<button>`/`role="button" tabIndex` + `onKeyDown`).
- [ ] Collegare il toggle filtri al pannello con `aria-expanded`/`aria-controls` e aggiungere la chiusura con tasto Escape al pannello filtri (App.tsx:5412-5421, 5586-5827).
- [ ] Aggiungere `aria-live="polite"` al conteggio risultati e uno stato "nessun risultato" esplicito nella lista schede (App.tsx:5858, 5905-5927).
- [ ] Avvolgere l'export XML/PDF in `try/catch` con feedback d'errore visibile, coerentemente con `downloadBackup` (App.tsx:5095-5151).
- [ ] Rimuovere il `case 'w'` duplicato/morto nello switch di rendering EpiDoc (App.tsx:3329 vs 3507), come già segnalato dal warning di build.
- [ ] Rendere accessibili da tastiera i tooltip semantici del markup epigrafico (`tabIndex`, `onFocus`/`onBlur`, `aria-describedby`) e le celle della heatmap di co-occorrenza.
- [ ] Blindare `IconographyPanel.tsx:38` (`(fig.traits || []).forEach(...)`) contro dati XML privi del campo `traits`.

### Priorità media — da pianificare a breve termine
- [ ] Impedire o segnalare le combinazioni di filtri contraddittorie (`onlyHasTrad`+`onlyNoTrad`, `onlyInscr`+`onlyAnep`).
- [ ] Sostituire le checkbox simulate (filtri "Con/Senza Traduzione", selezione righe/seleziona tutto) con `<input type="checkbox">` reali o `role="checkbox" aria-checked`.
- [ ] Aggiungere `role="dialog" aria-modal aria-labelledby` e focus trap/ripristino focus alla scheda-dettaglio.
- [ ] Uniformare la gerarchia dei titoli (h2/h3/h4) dentro la scheda-dettaglio.
- [ ] Aggiungere stato di caricamento visibile durante l'export XML/PDF, disabilitando il bottone per evitare doppio click.
- [ ] Correggere il contrasto colore di `text-cult` in tema chiaro e di `text-muted/70` usato sulle integrazioni editoriali.
- [ ] Aggiungere alternative testuali/`aria-label` a `MapView`/`PleiadesMap` e veicolare l'intensità della heatmap anche con un simbolo/numero visibile, non solo col colore.
- [ ] Uniformare il comportamento dei chip regione/città tra mobile e desktop nella lista schede.
- [ ] Estrarre un componente `FilterSelect` condiviso per i sette `<select>` duplicati nel pannello filtri.
- [ ] Introdurre `React.lazy`/code-splitting per le viste pesanti (mappa, editor, export PDF) per ridurre il bundle da 2,15 MB.

### Priorità bassa — miglioramenti di rifinitura
- [ ] Rimuovere i due pulsanti "Modifica" identici nella scheda-dettaglio e il blocco condizionale sempre-vero (`{true && (...)}`) a riga 6931.
- [ ] Unificare le sezioni duplicate "Gestione Locale"/"Amministrazione" nel pannello Impostazioni.
- [ ] Sostituire il fallback immagine facsimile basato su manipolazione diretta del DOM con stato React.
- [ ] Aggiungere `React.memo` a `MarkupText`/`Flow` per evitare ricostruzioni inutili dell'albero markup.
- [ ] Comprimere/ridimensionare il logo PNG da 814 KB e valutare formati moderni (WebP/AVIF).
- [ ] Verificare/rimuovere le classi Tailwind morte individuate (es. `lg:grid-cols-...` identico al `md:` precedente in App.tsx:5867; `text-slate-100` su `<img>` in App.tsx:7051; opzioni `<select>` con classi che i browser ignorano nel popup nativo).

---

## Interventi eseguiti — 2026-09-01

Passata di correzione su tutto l'audit. `tsc --noEmit` e `vite build` puliti; nessun errore in console con il dev server statico.

### Fatto — priorità alta
- **`quantity` negativo → `RangeError`**: clamp in tutti e tre i punti (`App.tsx` case `gap`, `MarkupText.tsx:92`, `EditionMarkupEditor.tsx:528`).
- **Error Boundary**: nuovo `src/components/ErrorBoundary.tsx`; avvolge i due `EpiDocRenderer` in `App.tsx` e il `TokenFlow` d'anteprima nell'editor, con fallback a testo semplice.
- **`redirect-catalog` / Timeline**: aggiunto `setActiveView('catalog')` nel branch `redirect-catalog` di `handleTermClick` e nel `onSelect` di `Timeline`.
- **Righe lista + titoli popup mappa da tastiera**: righe ora `role="button" tabIndex={0}` con `onKeyDown` Enter/Space e `aria-label`; titolo del popup mappa reso `<button>`.
- **Toggle filtri**: `aria-expanded` + `aria-controls="catalog-sidebar"` + `aria-label`; nuovo `useEffect` che chiude il pannello con Escape; `<aside>` con `role="dialog"` + `aria-labelledby`.
- **Conteggio risultati / stato vuoto**: contatore in `role="status" aria-live="polite"`; ramo esplicito "Nessuna scheda corrisponde ai filtri attivi" con azzeramento.
- **Export XML/PDF**: entrambi in `try/catch`, con `setExportError` mostrato in una regione `aria-live`; guardia "nessuna scheda da esportare".
- **`case 'w'` duplicato**: rimosso il secondo blocco morto.
- **Tooltip markup da tastiera**: `onFocusCapture`/`onBlurCapture` sul contenitore (speculari agli handler mouse), tooltip con `role="tooltip"` + `id`, `aria-describedby` impostato sull'elemento a fuoco; `persName`/`placeName` cliccabili ora `role="button" tabIndex={0}` + `onKeyDown`. `handleMouseMove` non rifà più `setState` se resta sullo stesso elemento.
- **Heatmap co-occorrenze**: celle `role="button"/"img"`, `tabIndex`, `onKeyDown`, `aria-label` completo; segno del PMI reso anche da un glifo (▲/▽), non solo dal colore.
- **`IconographyPanel`**: `(fig.traits || []).forEach(...)`; raggruppamento tratti in `useMemo`.
- **`aria-label` mappe**: `MapContainer` di `MapView` e `PleiadesMap`; errore di `PleiadesMap` in `role="alert"`, loading in `role="status"`.

### Fatto — priorità media
- Combinazioni di filtri contraddittorie (`onlyHasTrad`+`onlyNoTrad`, `onlyInscr`+`onlyAnep`) trattate come "nessun vincolo".
- Checkbox simulate "Con/Senza Traduzione" → `<input type="checkbox">` reali; "seleziona tutto" con `role="checkbox"` + `aria-checked` (`mixed` incluso).
- Scheda-dettaglio: `role="dialog" aria-modal aria-labelledby`, focus spostato nel dialog al montaggio, focus-trap su Tab, ripristino focus sul trigger alla chiusura.
- Gerarchia heading scheda: le sezioni "Layout & Supporto" e "Georeferenziazione" passate da `h4` a `h3`; "Dettagli" del rail da `h4` a `h3`.
- Badge stato scheda: nuovo indicatore "Sola lettura" / "Modifica sbloccata" nel rail.
- Contrasto: `--cult` scurito in tema chiaro (`#6F5285`); integrazioni `supplied` non usano più `text-muted/70`–`/50`–`/60` ma `text-muted` / `/80`.
- Chip regione/città della lista schede resi `<button>` filtranti anche nella vista mobile.
- `React.lazy` per `MapView` e `SectionEditorView`; `jspdf`/`jspdf-autotable` importati dinamicamente dentro `exportToPDF`. Bundle iniziale 2,15 MB → 1,60 MB (gzip 618 KB → 446 KB).
- `Reset Filtri` con `disabled={!hasActiveFilters}`.
- Paginazione: `aria-label` sulle frecce, `aria-current="page"` sul numero attivo, contenitore `<nav aria-label>`.
- Input di ricerca (header + pannello) con `aria-label`; `BibliographyIndex`: input `aria-label`, "Solo discrepanze" `aria-pressed`, accordion "Modifica" `aria-expanded`.

### Fatto — priorità bassa
- Rimosso il secondo pulsante "Modifica" gemello nel rail della scheda; rimosso il `{true && (...)}` sempre-vero.
- Fallback immagine facsimile: nuovo componente `FacsimileImage` con stato React, niente più `document.createElement`/`innerHTML`.
- `React.memo` su `MarkupText`; fallback di `case 'expan'` quando mancano `<abbr>`/`<ex>` (non fa più sparire il contenuto); `unescapeText` decodifica le entità numeriche (`&#956;`, `&#x3bc;`).
- Logo: da PNG 814 KB a WebP 120 KB (800 px), `.png` rimosso.
- `MapView`: sidebar `w-full max-w-[20rem] md:w-80` invece di `w-80` fisso.
- Import Avanzato spostato a `z-[55]` sopra la scheda-dettaglio (`z-50`).

### Non affrontato (motivazione)
- **Virtualizzazione liste** (lista schede, indice bibliografico, heatmap): mitigata da `ITEMS_PER_PAGE = 25`; rinviata a quando le soglie cresceranno.
- **`FilterSelect` condiviso** e **unificazione sezioni Impostazioni**: refactor puramente estetici, rischio/beneficio sfavorevole in questa passata.
- **Placeholder "nessun dato" per Supporto/Georeferenziazione**: richiede enumerare in modo affidabile molti campi opzionali; da fare con calma per non introdurre falsi vuoti.
- **Legenda `MapView` "non solo colore"**: la legenda ha già etichette testuali; differenziare i marker Leaflet per forma è un intervento a parte.
- **Cache condivisa Pleiades/MapView**, **classi Tailwind morte residue**, **contrasto badge `bg-accent/10`**: minori, lasciati come follow-up.
- **`DivinityEpithetIndex`**: fuori dal perimetro reale del Catalogo (vedi Nota di perimetro), non toccato.
