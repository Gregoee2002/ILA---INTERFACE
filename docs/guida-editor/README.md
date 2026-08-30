# Guida completa all'editor di ILA — sorgenti

Sorgente esportabile della "Guida completa all'editor di ILA" (il PDF a più
parti su come e quando usare ogni funzione dell'editor a sezioni). Pensata
per essere riaperta e **estesa in qualunque chat futura**, non solo in quella
che l'ha generata — per questo vive nel repository, non in uno scratchpad.

Vedi anche la skill `.claude/skills/guida-editor-ila/SKILL.md`, che sa usare
questi file: di norma non serve leggere questo README a mano, la skill lo fa
al posto tuo quando invocata.

## Struttura

```
docs/guida-editor/
├── style.css                    ← unico foglio di stile, condiviso da tutte le sezioni
├── cover.html                   ← copertina (testo introduttivo del progetto)
├── build_pdf.py                 ← assembla tutto e produce l'HTML/PDF finali
├── parts/
│   ├── manifest.json            ← elenco ordinato delle "parti" e le loro etichette
│   ├── part1-edizione.html      ← Parte I  — sezioni 1-10 (markup Leiden/EpiDoc)
│   ├── part2-altre-sezioni.html ← Parte II — sezioni 11-21 (le altre 17 sezioni dell'editor)
│   └── part3-ruoli-editoriali.html ← Parte III — sezione 22 (chi cura la scheda)
├── guida-editor-ila.html        ← output generato (non editare a mano, si riscrive col build)
└── guida-editor-ila.pdf         ← output generato (il PDF da consegnare)
```

Ogni file `part*.html` contiene una sequenza di blocchi `<section>…</section>`
di primo livello, uno per voce dell'indice. `build_pdf.py`:

1. legge `parts/manifest.json` nell'ordine dato;
2. estrae ogni `<section>` da ciascun file;
3. **rinumera in automatico** il badge `<span class="num">N</span>` di ogni
   `<h2>` secondo l'ordine finale — il numero scritto a mano nel sorgente è
   solo un placeholder leggibile quando si apre il file da solo, non deve
   essere tenuto sincronizzato a mano;
4. genera l'indice leggendo il testo degli `<h2>` (titolo + etichetta di
   gruppo opzionale) e degli `<h3>` (sottosezioni, elencate compatte);
5. scrive `guida-editor-ila.html` e, se WeasyPrint è disponibile,
   `guida-editor-ila.pdf`.

## Come aggiungere una nuova sezione

1. Scegli **dove va**: in fondo a una parte esistente (nuovo argomento dello
   stesso tipo) o in una parte nuova (nuovo tema, es. una futura "Parte IV").
2. Scrivi un blocco `<section class="section-break">…</section>` seguendo il
   formato sotto — **markup**, non prosa libera: è quello che dà alla guida
   il suo aspetto coerente.
3. Se è una parte nuova, crea `part4-nome.html` e aggiungilo a
   `parts/manifest.json` con la sua etichetta ("Parte IV — …").
4. Fai commit e push dei sorgenti su GitHub. **Non serve rigenerare
   `guida-editor-ila.html`/`.pdf` ad ogni modifica** — sono output, non
   sorgenti, e si rigenerano solo su richiesta esplicita (vedi sotto).
   Indice e numerazione si aggiornano da soli quando (e se) qualcuno
   rilancia la build.

### Formato di una sezione

```html
<section class="section-break">
<h2><span class="num">99</span>Titolo della sezione<span class="grp">Nome sezione editor</span></h2>
<p class="lead">Paragrafo introduttivo — spiega il perimetro della sezione.</p>

<div class="field">   <!-- oppure class="action" per il catalogo di markup dell'Edizione -->
  <div class="field-head"><span class="name">Nome del campo</span><span class="where">nota facoltativa</span></div>
  <div class="field-body">
    <p class="when"><b>Quando:</b> spiega quando/perché si usa, non solo cosa fa.</p>
    <table class="field-table">
      <tr><th>Parametro</th><th>Note</th></tr>
      <tr><td>Campo <span class="req">*</span></td><td>obbligatorio, marcato con l'asterisco rosso</td></tr>
    </table>
    <pre>&lt;esempio-xml/&gt;</pre>
  </div>
</div>

<div class="callout">Nota informativa (bordo ocra).</div>
<div class="callout warn">Avviso/regola da non violare (bordo rosso).</div>
</section>
```

Note sul formato:

- **Ometti `<span class="grp">`** se la sezione appartiene tutta alla stessa
  sotto-area già chiara dal titolo (come le sezioni 1-10 della Parte I). Usalo
  quando la sezione riguarda un campo specifico dell'editor a sezioni (Parte
  II: `<span class="grp">Nome sezione editor</span>`), per aiutare a
  localizzarlo nel software.
- **`class="action"`** invece di `class="field"` solo per le voci del
  catalogo di markup dell'Edizione (quelle con un `<span class="glyph">` nel
  riquadro d'intestazione, es. `[αβγ]`, `☾`). Per tutti gli altri campi
  dell'editor usa `class="field"`.
- **Sottosezioni**: usa `<h3>Titolo</h3>` (il numero, es. "21.1 — ", è
  facoltativo nel testo — è solo estetico, l'indice lo mostra comunque come
  riga compatta sotto la voce principale).
- **`<div class="callout warn">`** è per una regola che, se violata, produce
  un errore o un dato scorretto — non per un'osservazione qualunque.
- Il markup XML negli esempi va scritto con `&lt;` `&gt;` (mai `<`/`>` non
  escapati) e il greco avvolto in `<span class="greek">…</span>` per la
  corsivizzazione.
- Ogni `<section>` di primo livello genera **una voce di indice**: non
  annidare due `<h2>` nello stesso `<section>`.

## Rigenerare il PDF (solo su richiesta esplicita)

Il PDF **non** va rigenerato automaticamente ogni volta che i sorgenti
cambiano — il flusso normale è aggiornare `parts/*.html` e pushare su
GitHub, senza toccare i file generati. Rigenera il PDF solo quando
qualcuno lo chiede esplicitamente.

Serve Python 3 con WeasyPrint (non è nelle dipendenze npm del progetto,
è usato solo per questo documento):

```bash
python3 -m venv /tmp/ila-guide-venv
source /tmp/ila-guide-venv/bin/activate
pip install weasyprint
cd docs/guida-editor
python3 build_pdf.py
```

Produce `guida-editor-ila.html` (utile anche solo per un diff testuale tra
revisioni) e `guida-editor-ila.pdf`. Se WeasyPrint non è installato, lo
script scrive comunque l'HTML e avvisa che il PDF non è stato generato.

## Convenzioni di contenuto (non solo di formato)

Oltre al formato HTML, la guida segue alcune regole di merito fissate nel
corso del lavoro — vanno rispettate quando si aggiunge contenuto nuovo:

- Il progetto si chiama **ILA — Index Lunae Antiquae**, mai "MENISKOS" né
  "STAR" (vedi memoria `feedback_project_naming_ila_only`).
- Ogni scheda-campo spiega **quando** usare la funzione, non solo cosa fa:
  il criterio decisionale viene prima dell'elenco dei parametri.
- Le regole "mai dedotto"/"mai stimare" (URI Pleiades, datazione assente in
  Lane) sono principi editoriali ricorrenti nel corpus — quando descrivi un
  campo analogo, verifica se si applica lo stesso principio prima di
  inventare un comportamento diverso.
- Non documentare un campo che non ha una convenzione o un comportamento non
  ovvio dietro (es. non serve una sezione per un campo di testo libero senza
  vocabolario né regole particolari — quelli restano fuori dalla guida).
