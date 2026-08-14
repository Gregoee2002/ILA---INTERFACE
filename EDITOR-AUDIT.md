# Editor a sezioni — Audit di completezza (2026-08-14)

Verifica statica di `server.ts`, `src/App.tsx`, `src/components/SectionEditorView.tsx`, `src/lib/xmlUtils.ts`. Non verificato in browser (pannello di anteprima non responsivo in questa sessione — vedi conversazione precedente).

## 🔴 Criticità 1 (bloccante) — la maggior parte delle sezioni non si salva su schede esistenti

`patchXmlContent` (`server.ts:164-305`) è la funzione usata per **ogni** salvataggio su una scheda già presente nel corpus (cioè quasi sempre — l'altra strada, riscrittura completa via `monumentiToXml`, scatta solo per schede nuove). Gestisce **solo** questi campi:

```
titolo, regione, corpus, numero, facsimile_url, facsimile_desc, materiale, tipo,
dim_altezza, dim_larghezza, dim_profondita, place_ref_ancient, place_ref_modern,
tipo_ref, materialRef, id, entryId, revisions, iconografia
```

Ogni altro campo che l'editor lascia modificare — `apparatus`, `authority`, `bibliografia`, `citta` (il testo, non il ref), `conserv`, `dim`, `dim_unita`, `layout_desc`, `luogo_cons`, `luogo_moderno` (testo), `luogo_rit`, `note_interne`/`note_interne_rawXml`, `origDates`, `scrittura`/`scrittura_note`/`scrittura_ref`, `textTypes`, `tm`, `traduzioni` — viene modificato in UI, l'app mostra "Salvato", ma sul file XML (disco + GitHub) **non cambia nulla** per quel campo.

Sezioni **completamente no-op** in salvataggio su scheda esistente: Bibliografia, Traduzioni, Apparato critico, Datazione, Commento, Mano.
Sezioni **parzialmente no-op**: Pubblicazione (authority/tm), Conservazione, Impaginazione, Origine (solo il testo del toponimo — i ref URI funzionano), Provenienza, Titolo (textTypes).

**Fix suggerito**: la serializzazione corretta esiste già in `monumentiToXml` (usata per le schede nuove) per `origDates`/`apparatus`/`traduzioni`/`note_interne`/`bibliografia` — va estratta in funzioni condivise e richiamata anche da `patchXmlContent`, sullo stesso schema già usato per `renderIconography` (unica fonte per entrambe le strade).

## ✅ Criticità 2 — RISOLTA (2026-08-14)

`handleSaveMetadata` (`src/App.tsx:3182`) ora invia solo la scheda modificata a `PATCH /api/monumenti/:entryId` (nuova route, `server.ts`), che patcha e pusha solo il file corrispondente — nessun altro file del corpus viene toccato. Il client dichiara l'hash SHA-256 dell'ultimo contenuto noto del file (`_fileHash`, calcolato server-side e restituito da ogni GET/PATCH); se al momento del salvataggio l'hash sul disco non corrisponde più, il server risponde 409 e il salvataggio viene bloccato — un modale in-app (niente `window.confirm()`) avvisa l'utente e offre di ricaricare i dati prima di riprovare.

Verificato con round-trip reale sul corpus locale: una PATCH valida tocca solo il file atteso (+ l'aggregato derivato `_teiCorpus.xml`, rigenerato sempre); una seconda PATCH con hash stale viene rifiutata con 409 e non scrive nulla.

`createMonumentoFromEditor` e `handleDelete` (`src/App.tsx:3164`, `:3250`) continuano a inviare l'intero array — non toccati in questo fix (fuori scope), restano da rivedere separatamente: la logica di cleanup lato server (`server.ts`, cancella ogni file assente da `writtenFiles` nella richiesta corrente) dipende oggi da questo comportamento per far funzionare la cancellazione, quindi un fix analogo per quei due percorsi richiede prima di disaccoppiare esplicitamente "salvataggio scoped" da "rilevamento cancellazioni per omissione dall'array".

## 🔴 Criticità 2 (bloccante, correlata) — ogni salvataggio riscrive l'intero corpus — cronologia problema originale

`handleSaveMetadata` (`src/App.tsx:3182`, agganciata a `onSave` di `SectionEditorView`) invia l'**intero array** `monumenti` a `POST /api/monumenti` a ogni salvataggio di un singolo campo di una singola scheda. Il server (`server.ts:364-383`) itera su ogni elemento ricevuto e chiama `patchXmlContent` + `writeCorpusFile` → `pushFileToGitHub` per **ogni file del corpus**, non solo per quello modificato.

Conseguenze concrete (corpus attuale: ~31 file):
- fino a ~31 commit GitHub per un salvataggio di un solo campo di una sola scheda;
- salvataggio lento — le scritture sono sequenziali apposta (commento nel codice: evitare conflitti di sha su GitHub);
- rischio di sovrascrittura silenziosa: se la copia client di un'**altra** scheda è disallineata rispetto a disco/GitHub (sessione aperta a lungo, editing concorrente), il salvataggio la riporta ai valori stantii per tutti i campi che `patchXmlContent` gestisce.

**Fix suggerito**: `handleSaveMetadata` dovrebbe inviare solo la scheda modificata (o meglio, solo il patch dei campi cambiati — la logica di diff esiste già dentro `SectionEditorView.handleSave`, va solo esposta invece di essere ricalcolata a valle su tutto l'array).

**Nota ricognizione (2026-08-14)**: lo stesso pattern "invia l'intero array `monumenti`" è usato anche da `createMonumentoFromEditor` (`src/App.tsx:3164`, creazione scheda) e da `handleDelete` (`src/App.tsx:3250`, cancellazione scheda). Non toccati in questa sessione (fuori scope, dedicata solo a `handleSaveMetadata`), ma vanno tenuti presenti: qualunque fix che scopi il payload di `handleSaveMetadata` a un solo record deve restare compatibile con la logica di cleanup lato server (`server.ts:385-393`, cancella ogni file del corpus assente da `writtenFiles` nella richiesta corrente) di cui `handleDelete` dipende oggi per funzionare — un payload ridotto a un solo elemento, se non gestito esplicitamente, farebbe interpretare al server tutte le altre schede come cancellate.

## 🟡 Criticità 3 (media) — campi dichiarati ma senza editor

`phi` (sezione Pubblicazione), `msIdnos` (sezione Conservazione), `origPlace_nota` (sezione Origine) sono elencati in `SECTION_FIELDS` (contano per lo stato presente/dirty della sezione) ma non hanno alcun controllo in `renderSectionForm` — non modificabili dall'editor, serve intervenire fuori (Oxygen).

## ⚪ Nota minore

`data` / `data_inizio` / `data_fine` (riepilogo usato da Cronologia, filtri data, elenco Catalogo) sono calcolati solo al parsing iniziale da `origDates` e non vengono ricalcolati lato client dopo una modifica in editor. Da sistemare insieme alla Criticità 1, quando `origDates` tornerà effettivamente persistito.

## Priorità consigliata

1. Criticità 2 prima di Criticità 1 (o insieme): finché ogni salvataggio tocca tutti i file, qualunque fix alla Criticità 1 amplifica il rischio di sovrascrittura silenziosa descritto sopra.
2. Criticità 1: portare la serializzazione mancante da `monumentiToXml` a `patchXmlContent`, campo per campo, verificando ciascuno con un salvataggio reale su una scheda esistente (non solo su schede di test).
3. Criticità 3: editor minimi per phi/msIdnos/origPlace_nota una volta risolte le prime due.
