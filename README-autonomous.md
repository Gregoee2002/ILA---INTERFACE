# Esecuzione autonoma dei task ILA con Claude Code

Questo pacchetto ti permette di far lavorare Claude Code **senza presidio**,
sfruttando i tempi morti (notte, mentre lavori su altro), su un backlog di
migliorie predefinite — con guardrail espliciti perché il progetto ha già
avuto un incidente di near-data-loss e segue una filosofia "patch-only" sui
dati epigrafici.

## Cosa fa e cosa NON fa

**Fa:**
- Prende un task alla volta da `tasks.yaml`, crea un branch `auto/task-NNN`,
  lancia Claude Code in modalità headless (`claude -p`) con permessi
  ristretti, verifica che build/typecheck passino, e se sì fa **commit
  locale** sul branch.

**NON fa mai (guardrail su due livelli — prompt + `settings.autonomous.json`):**
- Non tocca file `.xml` del corpus né blocchi `<xenoData>` — restano di
  esclusiva revisione manuale in Oxygen.
- Non fa `git push`, non tocca `main`/`master`, non fa merge.
- Non abilita `GITHUB_ALLOW_DELETE`.
- Non fabbrica dati epigrafici mancanti (principio "XML come fonte di
  verità" del progetto).
- Non committa se la build/typecheck fallisce dopo le sue modifiche.

Il risultato di ogni run è **materiale da rivedere tu**: branch locali con
commit chiari e un log Markdown per ciascun task in `logs/autonomous/` —
utile anche come appendice metodologica per la tesi (hai già l'abitudine di
tenere session log).

## Setup (una tantum)

```bash
# 1. Copia questi file nella root del repo di ILA (non del corpus separato)
cp tasks.yaml run-autonomous.sh /path/to/ILA/
cp -r .claude /path/to/ILA/

# 2. Dipendenze
brew install yq jq        # macOS
# oppure: sudo apt install yq jq   # Linux

# 3. Assicurati che Claude Code sia autenticato e nel PATH
claude --version

# 4. Verifica che nel package.json esista uno script "typecheck"
#    (altrimenti lo script usa 'npx tsc --noEmit' come fallback)
```

## Uso manuale

```bash
cd /path/to/ILA
./run-autonomous.sh                    # 1 task (risk low/medium)
MAX_TASKS=3 ./run-autonomous.sh        # fino a 3 task in sequenza
```

Poi, per rivedere:

```bash
git branch --list "auto/*"
git checkout auto/task-001
git diff main...auto/task-001
```

Se ti convince, fai tu il merge/push. Se un task fallisce (`status: failed`
in `tasks.yaml`), il branch resta lì per debug — non viene toccato in
automatico da run successive.

## Task ad alto rischio

Il task `007` (network graph onomastico) è marcato `risk: high` perché
comporta logica di inferenza di relazioni che tu stesso vuoi rivedere prima
del merge. Non viene eseguito nelle run automatiche di default. Per
lanciarlo esplicitamente:

```bash
ALLOW_HIGH_RISK=1 ./run-autonomous.sh
```

## Scheduling nei "tempi morti"

### Cron (Linux/macOS), es. ogni notte alle 2:00

```bash
crontab -e
```

Aggiungi:

```cron
0 2 * * * cd /path/to/ILA && MAX_TASKS=2 ./run-autonomous.sh >> logs/cron.log 2>&1
```

### launchd (macOS, alternativa a cron)

Crea `~/Library/LaunchAgents/com.ila.autonomous.plist` con un
`ScheduledTime` alle 2:00 e `ProgramArguments` che puntano allo script — se
ti serve te lo preparo nel dettaglio identico al cron sopra.

Il file di lock (`.autonomous.lock`) evita run sovrapposte se una run
precedente sta ancora andando.

## Estendere il backlog

Aggiungi voci a `tasks.yaml` seguendo lo schema esistente. Cose a cui stare
attento scrivendo un nuovo prompt:
- Specifica sempre lo `scope` (percorsi) per limitare dove Claude può
  scrivere.
- Se il task tocca in qualunque modo dati epigrafici derivati (indici,
  epiteti, `_section`), ricorda esplicitamente nel prompt i principi del
  progetto (mai inferire dati non presenti nel markup, `entryId` non
  `firebaseId`, patch-only).
- Se non sei sicuro del livello di rischio, meglio `medium` che `low`: i
  `low` partono anche senza supervisione ravvicinata.

## Costi

Ogni run headless da giugno 2026 viene fatturata sul credito Agent SDK
separato (se hai un piano in abbonamento), non sui limiti interattivi. Ogni
log in `logs/autonomous/*.md` riporta il costo stimato della singola
esecuzione (`total_cost_usd` dall'output JSON di Claude Code) — utile per
tenere sotto controllo la spesa se lasci girare più task a notte.
