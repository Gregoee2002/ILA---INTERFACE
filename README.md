# ILA — Index Lunae Antiquae

Interfaccia web per la consultazione, l'editing controllato e l'esportazione
del **CMRDM** (*Corpus Monumentorum Religionis Dei Menis*, E. N. Lane,
1971–1978): il corpus epigrafico dedicato al culto del dio lunare frigio
Men. Il progetto codifica le schede in **EpiDoc TEI XML** e le rende
navigabili tramite ricerca full-text, filtri, mappa geografica e strumenti
di revisione filologica.

## Funzionalità principali

- Consultazione e ricerca full-text del corpus (`minisearch`) con filtri per
  città, regione, tipo di monumento, divinità/epiteti.
- Visualizzazione geografica delle attestazioni (Leaflet, con clustering).
- Editor di markup EpiDoc per le sezioni di apparato critico.
- Pannello di revisione bozze (confronto XML tra versioni, diff strutturato).
- Esportazione dati (PDF, XML).
- Autenticazione e permessi differenziati per la modifica dei record
  (Firebase), con lettura pubblica dei dati.

## Stack tecnico

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, react-leaflet.
- **Backend**: Express (`server.ts`), Firebase (Firestore + regole di
  sicurezza in `firestore.rules`).
- **Dati**: XML TEI EpiDoc in [`src/data/corpus/`](src/data/corpus), un
  file per scheda epigrafica.

## Avvio in locale

```bash
npm install
cp .env.example .env   # e compila le variabili richieste
npm run dev
```

Altri script utili:

```bash
npm run lint    # type-check (tsc --noEmit)
npm run build   # build di produzione (client + server)
npm run start   # avvia il build di produzione
```

## Struttura del repository

```
src/
  components/     UI React (mappa, editor XML, pannelli di revisione...)
  data/corpus/    Corpus EpiDoc TEI XML (una scheda = un file .xml)
  lib/            Utility condivise
  config/         Configurazione applicativa
scripts/          Script di manutenzione del corpus (validazione, build snapshot, push batch)
server.ts         Backend Express
firestore.rules   Regole di sicurezza del database
```

## Il corpus dei dati

Le schede in `src/data/corpus/` sono la **fonte di verità**: transcrizione,
traduzione e apparato critico vengono presi dal testo di Lane e mai
inferiti o completati arbitrariamente. Le modifiche al corpus seguono una
filosofia "patch-only" — vedi [`security_spec.md`](security_spec.md) per gli
invarianti sui dati e [`README-autonomous.md`](README-autonomous.md) per i
guardrail applicati anche alle modifiche automatizzate.

⚠️ **Nota legale sul corpus**: il dataset XML è derivato da un'opera a
stampa che potrebbe essere ancora protetta da copyright. Non è coperto
dalla licenza open-source di questo repository — vedi [NOTICE](NOTICE) e
la sezione Licenza qui sotto.

## Licenza

- **Codice sorgente** (tutto tranne `src/data/corpus/`): distribuito con
  licenza [Apache 2.0](LICENSE).
- **Corpus dei dati** (`src/data/corpus/`): **escluso** dalla licenza
  Apache. Uso riservato a scopi di ricerca connessi al progetto ILA; per
  qualsiasi altro riutilizzo o redistribuzione, vedi le condizioni in
  [NOTICE](NOTICE).

Se citi il progetto o il corpus in un lavoro accademico, vedi
[CITATION.cff](CITATION.cff).

## Contatti

Gabriele Gregorio — [gabrielegregorio123@gmail.com](mailto:gabrielegregorio123@gmail.com)
