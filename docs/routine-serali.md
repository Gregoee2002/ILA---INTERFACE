# Routine serali e settimanali

Dal 2026-09-28. Completano i controlli deterministici delle 01:30
(`scripts/controlli-notturni.sh`): quelle sono senza IA e girano da launchd,
queste sono **attività pianificate dell'app Claude** (Code › Attività
pianificate). Ogni esecuzione è una sessione normale che si può aprire,
leggere e continuare. Girano solo ad app aperta; se l'app è chiusa all'ora
prevista, partono al primo avvio.

Regole comuni a tutte:

- **sola lettura** su corpus e codice: niente modifiche all'XML (né qui né
  nella repo dati `~/Documents/GitHub/ILA`), niente commit, niente push —
  tranne `scripts/raccogli-revisione.py`, che scrive solo `revisione/` (vedi
  «Hub di revisione» più sotto);
- il corpus si legge dalla **repo dati** `~/Documents/GitHub/ILA/corpus`, non
  dalla cache `src/data/corpus`;
- il rapporto va in `logs/serali/<routine>/AAAA-MM-GG.md` (la cartella `logs/`
  è ignorata da git); lo stato per la rotazione in `logs/serali/.stato/`;
- le proposte con patch vengono provate prima su una copia del corpus (xmllint + `ILA_CORPUS=… scripts/lint-corpus.py`) — dalle routine 13-16 in poi;
- ogni rapporto si apre con un sommario di tre righe e dà proposte da
  accettare o scartare, mai correzioni già fatte.

## B. Revisione a lotti (sere feriali)

| # | Attività | Quando | Che cosa fa | Stato |
|---|---|---|---|---|
| 6 | `ila-collazione-lane` | lun, mer, ven 21:00 | 8 schede a sera fra quelle che la collazione automatica con CMRDM I segnala divergenti; per ognuna guarda la pagina scansionata e classifica ogni divergenza (errore del corpus, errore dell'OCR, scelta editoriale) | `.stato/collazione-cursore.txt` |
| 7 | `ila-lessico-candidati` | mar 21:00 | dagli avvisi del lint «forma non marcata» propone i `<w lemma>` da aggiungere, con il frammento XML pronto | — |
| 8 | `ila-traduzioni-coerenza` | gio 21:00 | 15 schede a sera: la traduzione italiana copre tutto il greco? nomi e teonimi resi come vuole la norma? restano quadre (norma R1-R5 del 17/09)? | `.stato/traduzioni-cursore.txt` |
| 9 | `ila-tesi-corpus` | mar, gio, sab 21:30 | nei sorgenti della tesi modificati dall'ultima volta, controlla che ogni greco e ogni traduzione attribuiti a una scheda ILA coincidano con la scheda, e che le concordanze ILA ↔ Lane siano giuste | `.stato/tesi-ultima.txt` |

Dal 2026-10-06, sulla stessa falsariga (proposte con patch per l'hub):

| # | Attività | Quando | Che cosa fa | Stato |
|---|---|---|---|---|
| 13 | `ila-supplementi-lane` | mar, ven 22:00 | 6 pagine a sera dei volumi successivi di Lane: addenda e corrigenda al vol. I in CMRDM II (solo quelli, non le monete), addenda e corrigenda e «Addenda ultima» in CMRDM III, tutto CMRDM IV, poi i capitoli interpretativi di CMRDM III. Propone correzioni, voci di apparato, bibliografia, dati di datazione e luogo, e segnala i monumenti che in ILA mancano (`nuova-scheda`, senza XML) | `.stato/supplementi-pagine.tsv` (199 pagine), `.stato/supplementi-cursore.txt` |
| 14 | `ila-numerali-date` | mer 22:00 | fase F3 del piano di markup: 7 schede a sera, `<num value>` e `<date>` sui numerali greci, con il controllo delle somme (astragali) e dell'era contro `<origDate>`; i numerali irregolari vanno in apparato | `.stato/numerali-schede.txt`, `.stato/numerali-cursore.txt` |
| 15 | `ila-lacune-scansione` | sab 21:00 | 8 schede a sera da `docs/f1-lacune-quantita.csv`: guarda la pagina di Lane e propone `quantity` o `atLeast`/`atMost` al posto di `extent="unknown"` | `.stato/lacune-cursore.txt` |
| 17 | `ila-traduzioni-cura` | lun, mer, sab 22:30 | cura a fondo, 4 schede a sera: analisi del greco unità per unità (casi, aspetto e diatesi, lessico cultuale, onomastica, date), qualità dell'italiano, parità con l'inglese (XML, rev2 o docx), traduzioni mancanti da riversare dal docx o, se non esistono, bozze con `dubbio`; tiene un glossario delle rese e apre questioni di norma quando il corpus rende lo stesso lemma in modi diversi. Seconda lettura «da revisore» obbligatoria prima del JSON. Si distingue dalla n. 8, che è il controllo rapido di copertura e quadre | `.stato/cura-traduzioni-cursore.txt`, `.stato/glossario-rese.tsv` |

Il testo di CMRDM II, III e IV (pdftotext -layout delle scansioni in OneDrive, `Tesi Magistrale/cmrdm scan/`) sta in `~/Documents/OCR/CMRDM-{II,III,IV}.layout.txt`.

La collazione (6) riusa `scripts/collate-source.ts` con le due letture OCR
(`grc` ed `ell`), come in `docs/collazione-cmrdm-i-2026-09-05.md`: a fine
settembre 2026 le schede con divergenze erano 83, cioè circa tre settimane e
mezza di giri.

## C. Settimanali (domenica sera)

| # | Attività | Quando | Che cosa fa |
|---|---|---|---|
| 10 | `ila-link-bibliografia` | dom 20:00 | `scripts/controlla-link.py` (Pleiades, EAGLE; Trismegistos blocca i client automatici) e verifica con Scholar Sidekick delle voci di bibliografia moderna della tesi, per scovare citazioni inesistenti |
| 11 | `ila-diario-settimana` | dom 20:30 | riassunto in italiano dei commit della settimana su codice e repo dati, pronto da inoltrare |
| 12 | `ila-memoria-pulizia` | dom 21:00 | passaggio `consolidate-memory` sulla memoria di Claude per questo progetto: duplicati, fatti superati, indice |
| 16 | `ila-luoghi-pleiades` | dom 21:30 | prosegue `docs/audit-luoghi-pleiades-2026-09-25.md`: prima le questioni rimaste aperte (candidati da vagliare, `DA_COMPILARE`, Koresa/Iaza solo con i dati), poi 25 schede a settimana: URI Pleiades contro Lane, GeoNames per il luogo moderno, Turkey/Turchia, regione al posto di «Asia Minor». Le norme nuove arrivano come prima proposta con `dubbio` |

`scripts/controlla-link.py` si lancia anche a mano:

```bash
python3 scripts/controlla-link.py --out logs/serali/link/oggi.md
```

## Hub di revisione

Dal 2026-09-29 i rapporti e le proposte di tutte le routine confluiscono in
**Strumenti › Revisione** sul sito (riservata, serve il token dell'editor).

Il percorso:

1. ogni routine scrive il rapporto `logs/serali/<cartella>/AAAA-MM-GG.md` e,
   accanto, `AAAA-MM-GG.json` con le proposte (formato sotto). Le routine
   senza proposte (diario, memoria) scrivono solo il rapporto;
2. come ultimo passo lancia `python3 scripts/raccogli-revisione.py`, che copia
   i rapporti in `revisione/rapporti/` della **repo dati** e rigenera
   `revisione/indice.json`: commit e push solo di `revisione/`. Lo lancia
   anche `controlli-notturni.sh` alle 01:30, che così porta nell'hub anche il
   proprio rapporto (log in `logs/controlli/raccolta.log`);
3. sul sito ogni proposta si accetta, si scarta o si rimanda (anche da
   tastiera: `a` `s` `r`, `u` annulla, `j` `k` per spostarsi), con una nota o
   riscrivendo la correzione. Le decisioni si salvano da sole in
   `revisione/decisioni.json`, qualche secondo dopo l'ultimo clic;
4. **Invia** mette in coda le accettate (stato `inviata`);
5. la routine `ila-applica-correzioni` le applica nella repo dati, un commit
   per scheda dopo xmllint e lint, e scrive l'esito (`applicata` con il commit,
   oppure `bloccata` con la domanda da fare). Lo script di appoggio è
   `scripts/applica-revisione.py` (`elenco`, `patch ID`, `esito ID …`).
   **Solo a mano** (scelta dell'autore, 2026-09-30): l'attività è
   disattivata e non parte mai da sola; la si lancia con «Esegui ora»
   dall'elenco delle attività pianificate dell'app, dopo aver inviato le
   correzioni dall'hub. Prompt in
   `~/.claude/scheduled-tasks/ila-applica-correzioni/SKILL.md`. Se ha fatto
   commit sul corpus, rilancia il deploy di Pages (i push sulla repo dati da
   soli non ripubblicano il sito). Rapporto in `logs/serali/applica/`.

L'id di una proposta dipende solo dal contenuto (routine, scheda, riga, testo
attuale e proposto), quindi se una routine ripropone la stessa correzione in
un giro successivo la decisione già presa resta valida.

Formato delle proposte (`logs/serali/<cartella>/AAAA-MM-GG.json`):

```json
{"routine": "collazione", "data": "2026-09-28", "proposte": [
  {"scheda": "ILA-018", "tipo": "edizione", "riga": "4",
   "titolo": "εἰς → ἰς, come stampa Lane",
   "attuale": "εἰς ὑπηρεσίας", "proposta": "ἰς ὑπηρεσίας",
   "dettaglio": "markdown semplice", "classe": "a", "dubbio": false,
   "destinazione": "dati",
   "patch": {"file": "corpus/ILA-018.xml",
             "cerca": "<lb n=\"4\"/>θεοῦ εἰς ὑπηρεσίας",
             "sostituisci": "<lb n=\"4\"/>θεοῦ ἰς ὑπηρεσίας"}}
]}
```

Obbligatorio solo `titolo`. `patch` (oggetto o lista) solo quando la
correzione è una sostituzione esatta: `cerca` deve comparire una sola volta
nel file, altrimenti lo script si ferma senza toccare niente. `destinazione`
è `dati` (percorsi relativi alla repo dati) o `tesi` (relativi a
`~/Documents/Tesi-ILA`). Le questioni da decidere vanno con `"dubbio": true`.

## Integrazione con gli strumenti

Dal 2026-09-30 la sezione **Strumenti** del sito ha quattro linguette, e ognuna
è collegata alle routine:

| Linguetta | Che cosa mostra | Da dove arriva | Chi la usa fra le routine |
|---|---|---|---|
| Revisione | proposte da decidere e rapporti | `revisione/indice.json`, `decisioni.json` (repo dati) | tutte scrivono qui con `raccogli-revisione.py`; `ila-applica-correzioni` legge le inviate |
| Completezza | campi compilati, per campo e per scheda; variazione in 7 giorni | calcolata sulle schede + `revisione/controlli.json` (`avanzamento`) | `controlli-notturni.sh` (stato-corpus.py) |
| Coerenza | lint della notte, grafie e classificazione, bibliografia | `revisione/controlli.json` (`lint`) + calcoli sulle schede | `controlli-notturni.sh` (lint-corpus.py); `ila-lessico-candidati` trasforma le «forme non marcate» in proposte |
| Segnalazioni | note dei collaboratori sulle schede (registro) e sul sito (bug) | `flags.json`, `bugs.json` (repo dati) | le routine con proposte le leggono e le citano; il diario le elenca |

`revisione/controlli.json` lo scrive `raccogli-revisione.py` da
`logs/controlli/.stato/` (`problemi.tsv`, `nuovi.tsv`, `stato-AAAA-MM-GG.json`
degli ultimi 30 giorni). Le chiavi dei campi sono quelle di
`scripts/stato-corpus.py`, le stesse di `src/lib/mancanze.ts`.

Ogni routine che fa proposte, prima di scriverle, legge (blocco «STRUMENTI DEL
SITO» nei SKILL.md):

- le note **aperte** del registro sulle schede che esamina (`flags.json`): le
  cita nel `dettaglio`, e il sito le mostra accanto alla proposta;
- le **decisioni già prese** (`revisione/decisioni.json`): non ripropone una
  correzione scartata sulla stessa scheda e riga senza un argomento nuovo.

Il diario della domenica chiude con «Da decidere»: proposte non viste,
correzioni bloccate, segnalazioni aperte e problemi nuovi del lint.

## Modificare o sospendere

I prompt completi stanno in `~/.claude/scheduled-tasks/<id>/SKILL.md`. Per
sospenderne una si usa l'interruttore nell'elenco delle attività pianificate
dell'app. Se si cambia la cadenza, aggiornare anche la tabella qui sopra.
