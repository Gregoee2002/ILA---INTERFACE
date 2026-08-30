---
name: guida-editor-ila
description: >
  Gestisce la "Guida completa all'editor di ILA" — il PDF a più parti su
  come e quando usare ogni funzione dell'editor a sezioni del progetto ILA
  (Index Lunae Antiquae): il markup Leiden/EpiDoc della sezione Edizione,
  i campi complessi delle altre sezioni (Titolo, Supporto, Datazione,
  Indici, Revisioni, Bibliografia, Iconografia…), e la convenzione sui
  ruoli editoriali. Usa questa skill OGNI VOLTA che l'utente chiede di:
  aggiungere una nuova sezione o un nuovo campo alla guida dell'editor;
  rigenerare, aggiornare o esportare il PDF della guida; consultare cosa
  dice già la guida su un campo; rivedere o correggere una sezione
  esistente della guida. Trigger: "guida editor", "guida completa
  all'editor", "aggiungi una sezione alla guida", "handout encoding ILA",
  docs/guida-editor, guida-editor-ila.pdf. Consultare questa skill prima di
  toccare a mano i file in docs/guida-editor/: hanno un formato e una
  pipeline di build non negoziabili, descritti qui.
---

# Guida editor ILA — skill di manutenzione

Questa skill sa leggere, estendere e ricompilare la "Guida completa
all'editor di ILA": un PDF multi-parte pensato per restare aggiornabile
lungo tutte le chat future, non solo in quella che lo ha creato. I sorgenti
vivono nel repository, non in uno scratchpad, apposta per questo.

## Dove sono i file

```
docs/guida-editor/
├── README.md                    ← convenzioni di formato E di contenuto (leggilo per intero prima di editare)
├── style.css                    ← unico foglio di stile condiviso
├── cover.html                   ← copertina
├── build_pdf.py                 ← assembla + rinumera + genera indice + rende PDF
├── parts/
│   ├── manifest.json            ← elenco ordinato delle "parti" (Parte I/II/III/…) e i loro file
│   ├── part1-edizione.html      ← sezioni 1-10: markup Leiden/EpiDoc dell'Edizione
│   ├── part2-altre-sezioni.html ← sezioni 11-21: le altre sezioni dell'editor a sezioni
│   └── part3-ruoli-editoriali.html ← sezione 22: ruoli editoriali / tagliandino
├── guida-editor-ila.html        ← OUTPUT generato — non editare a mano
└── guida-editor-ila.pdf         ← OUTPUT generato — il PDF da consegnare
```

**Leggi sempre `docs/guida-editor/README.md` per intero** prima di scrivere
contenuto: contiene il formato esatto del markup delle sezioni (card
`field`/`action`, tabelle, callout, esempi XML) e le convenzioni di merito
(mai dedotto/mai stimato, naming ILA, criterio "quando" prima del "come").
Non riscriverlo qui: questo file spiega il workflow, README.md spiega il
formato.

## Prima di scrivere una sezione nuova: verifica, non inventare

Il contenuto della guida descrive comportamento REALE del codice
dell'editor, non convenzioni immaginate. Prima di aggiungere o correggere
una sezione:

1. **Trova il comportamento nel codice**, non a memoria — i file sorgente
   principali sono `src/components/SectionEditorView.tsx` (i form delle 18
   sezioni + il tagliandino Revisioni), `src/lib/leidenMarkup.ts` (il
   catalogo di markup dell'Edizione, `MARKUP_ACTIONS`, il validatore
   `validateEditionTokens`), `src/lib/eagleVocab.ts` (vocabolari EAGLE) e
   `src/lib/iconographyLabels.ts` (vocabolario iconografico).
2. Se il comportamento che l'utente vuole documentare **non esiste ancora
   nel codice** (come per i ruoli editoriali prima di questa revisione),
   trattalo come una richiesta di funzionalità: chiedi come vuole che
   funzioni prima di scriverne la documentazione, e valuta se serve anche
   una modifica al codice (vedi `SectionEditorView.tsx` per il precedente
   del tagliandino "Chi ha lavorato su questa scheda").
3. Cita nel testo solo comportamento verificato: parametri obbligatori,
   valori di vocabolario, messaggi di validazione — copiali dal codice, non
   parafrasarli a memoria.

## Aggiungere una sezione

Segui `docs/guida-editor/README.md` § "Come aggiungere una nuova sezione"
per il formato HTML esatto (card, tabelle, callout). In sintesi:

1. Scrivi il blocco `<section class="section-break">…</section>` nel file
   `part*.html` giusto (o crea una parte nuova e registrala in
   `parts/manifest.json`).
2. Il numero nel badge `<span class="num">N</span>` è solo un placeholder
   leggibile: **non serve calcolarlo a mano**, `build_pdf.py` rinumera
   tutto in automatico secondo l'ordine finale dei file.
3. Aggiorna eventualmente `docs/guida-editor/README.md` se introduci una
   nuova parte o una convenzione di formato non ancora documentata lì.

## Il PDF NON si genera di default

Il flusso normale, dopo aver modificato o aggiunto una sezione, è: editare
i sorgenti in `parts/*.html` (ed eventualmente `manifest.json`), poi
**commit + push su GitHub** dei soli sorgenti (`parts/`, `README.md`,
`style.css`, `cover.html`, `build_pdf.py`). **Non lanciare `build_pdf.py`
e non toccare `guida-editor-ila.html`/`.pdf`** a meno che l'utente non
chieda esplicitamente il PDF (es. "generami il PDF", "mandami il PDF
aggiornato", "voglio vederlo"). Aggiornare i due file generati ad ogni
modifica dei sorgenti li farebbe divergere in continuazione dai sorgenti
via git senza che nessuno li guardi — è lavoro sprecato: la versione
pubblica di riferimento è quella su GitHub, i sorgenti.

Se non è chiaro se l'utente vuole anche il PDF in quella richiesta, chiedi
piuttosto che generarlo "per sicurezza".

## Ricompilare il PDF (solo su richiesta esplicita)

```bash
# ambiente: WeasyPrint non è tra le dipendenze npm del progetto, serve un venv
python3 -m venv /tmp/ila-guide-venv   # riusa un venv esistente se già presente in questa sessione
source /tmp/ila-guide-venv/bin/activate
pip install --quiet weasyprint

cd docs/guida-editor
python3 build_pdf.py
```

Output: `guida-editor-ila.html` (utile anche per un diff testuale tra
revisioni) e `guida-editor-ila.pdf`. Se WeasyPrint manca, lo script scrive
comunque l'HTML e avvisa che il PDF non è stato generato — installalo
prima di considerare il lavoro finito se l'utente vuole il PDF.

Dopo la build, **verifica visivamente** almeno la copertina, l'indice e la
sezione nuova/modificata (rendendo 1-2 pagine a PNG con `pdftoppm -png -r
100 -f N -l N`, poi leggendole) prima di consegnare — non fidarti che il
CSS di stampa abbia fatto la cosa giusta senza guardarla.

## Consegna

- **Default**: aggiorna i sorgenti, `git add`/`commit`/`push` su GitHub
  (vedi memoria `feedback_push_at_end_of_process`), e basta — riporta
  all'utente cosa è cambiato e che è stato pushato. Nessun PDF.
- **Solo se l'utente lo chiede esplicitamente**: rigenera con
  `build_pdf.py`, verifica visivamente, poi invia il PDF con
  `SendUserFile` (non lasciarlo solo nel repository).

## Regole trasversali da non violare mai in questa guida

- Il progetto è **ILA — Index Lunae Antiquae**: mai "MENISKOS", mai "STAR"
  in un testo destinato all'utente (vedi memoria
  `feedback_project_naming_ila_only`).
- Non documentare qui campi puramente descrittivi senza vocabolario né
  regole particolari (titolo libero, dimensioni, numero TM, link TM…): la
  guida esiste per i campi con una convenzione non ovvia dietro, non per
  fare da manuale utente completo di ogni singolo input.
- Se un cambiamento alla guida implica anche un cambiamento al codice
  dell'editor (come il tagliandino Revisioni), fai prima il cambiamento al
  codice, verificalo in browser, e solo dopo scrivi/aggiorna la sezione
  della guida che lo descrive — mai il contrario, altrimenti la guida
  documenta una funzione che non esiste.
