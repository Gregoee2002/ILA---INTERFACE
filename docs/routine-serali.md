# Routine serali e settimanali

Dal 2026-09-28. Completano i controlli deterministici delle 01:30
(`scripts/controlli-notturni.sh`): quelle sono senza IA e girano da launchd,
queste sono **attività pianificate dell'app Claude** (Code › Attività
pianificate). Ogni esecuzione è una sessione normale che si può aprire,
leggere e continuare. Girano solo ad app aperta; se l'app è chiusa all'ora
prevista, partono al primo avvio.

Regole comuni a tutte:

- **sola lettura** su corpus e codice: niente modifiche all'XML (né qui né
  nella repo dati `~/Documents/GitHub/ILA`), niente commit, niente push;
- il corpus si legge dalla **repo dati** `~/Documents/GitHub/ILA/corpus`, non
  dalla cache `src/data/corpus`;
- il rapporto va in `logs/serali/<routine>/AAAA-MM-GG.md` (la cartella `logs/`
  è ignorata da git); lo stato per la rotazione in `logs/serali/.stato/`;
- ogni rapporto si apre con un sommario di tre righe e dà proposte da
  accettare o scartare, mai correzioni già fatte.

## B. Revisione a lotti (sere feriali)

| # | Attività | Quando | Che cosa fa | Stato |
|---|---|---|---|---|
| 6 | `ila-collazione-lane` | lun, mer, ven 21:00 | 8 schede a sera fra quelle che la collazione automatica con CMRDM I segnala divergenti; per ognuna guarda la pagina scansionata e classifica ogni divergenza (errore del corpus, errore dell'OCR, scelta editoriale) | `.stato/collazione-cursore.txt` |
| 7 | `ila-lessico-candidati` | mar 21:00 | dagli avvisi del lint «forma non marcata» propone i `<w lemma>` da aggiungere, con il frammento XML pronto | — |
| 8 | `ila-traduzioni-coerenza` | gio 21:00 | 15 schede a sera: la traduzione italiana copre tutto il greco? nomi e teonimi resi come vuole la norma? restano quadre (norma R1-R5 del 17/09)? | `.stato/traduzioni-cursore.txt` |
| 9 | `ila-tesi-corpus` | mar, gio, sab 21:30 | nei sorgenti della tesi modificati dall'ultima volta, controlla che ogni greco e ogni traduzione attribuiti a una scheda ILA coincidano con la scheda, e che le concordanze ILA ↔ Lane siano giuste | `.stato/tesi-ultima.txt` |

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

`scripts/controlla-link.py` si lancia anche a mano:

```bash
python3 scripts/controlla-link.py --out logs/serali/link/oggi.md
```

## Modificare o sospendere

I prompt completi stanno in `~/.claude/scheduled-tasks/<id>/SKILL.md`. Per
sospenderne una si usa l'interruttore nell'elenco delle attività pianificate
dell'app. Se si cambia la cadenza, aggiornare anche la tabella qui sopra.
