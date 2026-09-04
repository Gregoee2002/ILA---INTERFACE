# Esecuzione autonoma dei task ILA con Claude Code

Fa lavorare Claude Code **senza presidio** (di notte, o mentre non sei al PC)
su un backlog predefinito, con guardrail espliciti: il progetto ha già avuto
un incidente di near-data-loss e segue una filosofia *patch-only* sui dati
epigrafici.

Stato al **2026-09-05**: infrastruttura installata, backlog aggiornato,
launchd attivo. **Manca solo il login headless** — vedi "Prerequisito" qui
sotto: finché non è risolto, ogni run si ferma prima di partire e lo scrive
nel riepilogo.

## Cosa fa e cosa NON fa

**Fa:** prende un task da `tasks.yaml`, crea il branch `auto/task-NNN` dal
`main` **locale**, lancia `claude -p` headless con permessi ristretti, gira il
typecheck e fa **commit locale** sul branch. Poi torna su `main` e appende una
voce leggibile a `logs/autonomous/RIEPILOGO.md`.

**NON fa mai** (guardrail su due livelli — prompt runtime + `.claude/settings.autonomous.json`):
non tocca `.xml` del corpus né `<xenoData>`; non fa `git push`, non tocca
`main`, non fa merge; non abilita `GITHUB_ALLOW_DELETE`; non fabbrica dati
epigrafici mancanti.

Il risultato di ogni run è **materiale da rivedere**: branch locali con commit
chiari e un log per task — utile anche come appendice metodologica per la tesi.

## Prerequisito: sessione headless autenticata

`claude -p` usa la stessa sessione della CLI interattiva, e al 2026-09-05 quella
sessione è **scaduta**:

```
Failed to authenticate: OAuth session expired and could not be refreshed
```

Due modi per risolverlo, entrambi da fare a mano una volta sola:

```bash
claude
```

(rifà il login OAuth; poi esci con `/exit`) — **oppure**, più stabile per le run
notturne, imposta una API key nell'ambiente di launchd:

```bash
launchctl setenv ANTHROPIC_API_KEY sk-ant-...
```

Per renderla persistente ai riavvii va aggiunta come `EnvironmentVariables` in
`~/Library/LaunchAgents/com.ila.autonomous.plist`.

Il runner **verifica l'autenticazione prima di toccare git**: se la sessione non
è valida non crea branch e scrive "run non partita" nel riepilogo, così la
mattina te ne accorgi invece di trovare branch vuoti.

## Uso manuale

```bash
cd /Users/gabriele/Documents/STAR
DRY_RUN=1 ./run-autonomous.sh     # mostra quale task partirebbe, senza lanciarlo
./run-autonomous.sh               # 1 task (risk low/medium)
MAX_TASKS=3 ./run-autonomous.sh   # fino a 3 in sequenza
TASK_ID=014 ./run-autonomous.sh   # forza un task specifico
ALLOW_HIGH_RISK=1 ./run-autonomous.sh
```

Il runner **rifiuta di partire con l'albero di lavoro sporco**, per non
mescolare il tuo lavoro in corso con quello automatico.

## Revisione (la parte che resta a te)

```bash
cat logs/autonomous/RIEPILOGO.md      # cosa è successo, in italiano
git branch --list "auto/*"
git diff main...auto/task-011         # il diff di un task
git merge auto/task-011               # se ti convince
```

Un commit che inizia con `[BUILD FALLITA]` **non va mergiato**: è lì solo per
non perdere il lavoro e lasciare l'albero pulito per la run successiva.

## Scheduling

Già installato e caricato: `~/Library/LaunchAgents/com.ila.autonomous.plist`,
ogni notte alle **02:00**, `MAX_TASKS=2`.

```bash
launchctl print gui/$(id -u)/com.ila.autonomous   # stato
launchctl kickstart -k gui/$(id -u)/com.ila.autonomous  # lancia subito, per provare
launchctl bootout gui/$(id -u)/com.ila.autonomous       # disattiva
```

Per cambiare orario: modifica `StartCalendarInterval` nel plist, poi `bootout` +
`bootstrap`. Il Mac deve essere acceso (o in sleep: launchd recupera il job al
risveglio, non a Mac spento).

## Stato dei task

Lo stato **non** sta in `tasks.yaml`: sta in `.autonomous/state.tsv`, che è
gitignored. Motivo: `tasks.yaml` è tracciato, quindi scrivere lì lo stato lo
faceva finire nel commit del branch `auto/*`, e il successivo `checkout main`
lo riportava a `pending` — ogni run avrebbe rifatto lo stesso task all'infinito.

`tasks.yaml` resta la fonte dichiarativa del backlog. Per rimettere in coda un
task già fatto, basta cancellarne le righe da `.autonomous/state.tsv`.

## Il backlog attuale

`tasks.yaml` (aggiornato 2026-09-05) ha in testa i task **011-020**, cioè la
coda dell'audit del 2026-09-01 (`docs/piano-audit-ui-da-fare.md`):

| # | cosa | rischio |
|---|---|---|
| 011-013 | codemod dei 179 colori di stato ad-hoc → token `--danger/--warning/--success` | medium/low |
| 014 | palette mappa centralizzata in `src/lib/mapPalette.ts` | low |
| 015 | regola `:focus-visible` globale | low |
| 016 | scala z documentata, grana felt sotto il contenuto | medium |
| 017-020 | primitivi `src/components/ui/{Button,Chip,Badge,FilterSelect,Card}` | medium/low |

**L'ordine conta**: 011-013 devono girare prima di 017-020, che usano quei token.
Dopo vengono i task feature 001-010 di agosto, ancora validi ma meno urgenti.

Restano **fuori** dal backlog automatico le correzioni editoriali su epiteti e
teonimi (`docs/piano-audit-dati-da-fare.md`): richiedono una decisione tua con
verifica su Lane 1971, e toccherebbero XML del corpus — che il runner ha il
divieto assoluto di modificare.

## Estendere il backlog

Aggiungi voci a `tasks.yaml` con lo schema esistente. Accortezze:
- specifica sempre lo `scope` (percorsi) per limitare dove Claude può scrivere;
- i task migliori per l'esecuzione non presidiata sono quelli **verificabili per
  grep o per typecheck**; quelli che richiedono un giudizio visivo vanno spezzati
  in modo che il diff resti piccolo;
- chiedi sempre all'agente di **elencare cosa ha lasciato invariato e perché**:
  è quella lista che rende la revisione veloce;
- nel dubbio sul rischio, meglio `medium` che `low`.

## Costi

Ogni log in `logs/autonomous/*.md` riporta il costo stimato della singola
esecuzione (`total_cost_usd`), ripreso anche nel riepilogo — utile per tenere
sotto controllo la spesa se lasci girare più task a notte.
