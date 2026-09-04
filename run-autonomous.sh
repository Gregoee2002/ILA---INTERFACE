#!/usr/bin/env bash
#
# run-autonomous.sh — Runner per task autonomi ILA via Claude Code headless
#
# Uso:
#   ./run-autonomous.sh                  # 1 task pending (risk low/medium)
#   MAX_TASKS=3 ./run-autonomous.sh      # fino a 3 task in sequenza
#   TASK_ID=014 ./run-autonomous.sh      # forza un task specifico
#   ALLOW_HIGH_RISK=1 ./run-autonomous.sh
#   DRY_RUN=1 ./run-autonomous.sh        # mostra cosa farebbe, non lancia nulla
#
# Cosa fa:
#   1. Legge tasks.yaml + il ledger di stato .autonomous/state.tsv, prende il
#      prossimo task eseguibile.
#   2. Crea/aggiorna un branch auto/task-NNN da main.
#   3. Lancia `claude -p` headless con i guardrail di
#      .claude/settings.autonomous.json e --permission-mode acceptEdits.
#   4. Gira il typecheck. Se passa -> commit locale pulito. Se fallisce ->
#      commit marcato [BUILD FALLITA] sullo stesso branch (il lavoro non si
#      perde e l'albero resta pulito per la run successiva).
#   5. Torna su main, aggiorna il ledger, appende una riga al riepilogo
#      leggibile in logs/autonomous/RIEPILOGO.md.
#
# NOTA SULLO STATO: lo stato NON sta più in tasks.yaml (è tracciato da git: il
# commit sul branch e il successivo checkout di main lo azzeravano ad ogni
# run). Sta in .autonomous/state.tsv, che è gitignored. tasks.yaml resta la
# fonte dichiarativa del backlog; 'status: done' lì dentro vale come stato
# iniziale per i task già chiusi prima di questo meccanismo.

set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
BACKLOG_FILE="${BACKLOG_FILE:-$REPO_DIR/tasks.yaml}"
SETTINGS_FILE="${SETTINGS_FILE:-$REPO_DIR/.claude/settings.autonomous.json}"
LOG_DIR="${LOG_DIR:-$REPO_DIR/logs/autonomous}"
STATE_DIR="$REPO_DIR/.autonomous"
STATE_FILE="$STATE_DIR/state.tsv"
DIGEST="$LOG_DIR/RIEPILOGO.md"
MAX_TASKS="${MAX_TASKS:-1}"
ALLOW_HIGH_RISK="${ALLOW_HIGH_RISK:-0}"
DRY_RUN="${DRY_RUN:-0}"
TASK_ID="${TASK_ID:-}"
LOCK_FILE="$REPO_DIR/.autonomous.lock"

mkdir -p "$LOG_DIR" "$STATE_DIR"
touch "$STATE_FILE"

for c in yq jq claude git; do
  command -v "$c" >/dev/null 2>&1 || { echo "Manca il comando '$c' nel PATH."; exit 1; }
done

cd "$REPO_DIR"

# --- lock con controllo del processo (un lock orfano non blocca per sempre) --
if [ -e "$LOCK_FILE" ]; then
  old_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
  if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
    echo "[$(date -Iseconds)] Run già in corso (pid $old_pid), esco."
    exit 1
  fi
  echo "[$(date -Iseconds)] Lock orfano (pid $old_pid non attivo): lo rimuovo."
  rm -f "$LOCK_FILE"
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# --- guardia: l'albero di lavoro deve essere pulito ------------------------
if [ -n "$(git status --porcelain)" ]; then
  echo "[$(date -Iseconds)] ALBERO DI LAVORO SPORCO: ci sono modifiche non committate."
  echo "Il runner non parte per non mescolare il tuo lavoro con quello automatico."
  git status --short | head -20
  exit 1
fi

state_get() { awk -F'\t' -v id="$1" '$1 == id { s = $2 } END { print s }' "$STATE_FILE"; }
state_set() { printf '%s\t%s\t%s\n' "$1" "$2" "$(date -Iseconds)" >> "$STATE_FILE"; }

pick_task() {
  local ids id declared runtime risk
  ids=$(yq eval '.tasks[].id' "$BACKLOG_FILE")
  while IFS= read -r id; do
    [ -n "$id" ] || continue
    if [ -n "$TASK_ID" ]; then
      [ "$((10#$id))" -eq "$((10#$TASK_ID))" ] || continue
    fi
    declared=$(yq eval ".tasks[] | select(.id == $id) | .status" "$BACKLOG_FILE")
    runtime=$(state_get "$id")
    local status="${runtime:-$declared}"
    [ "$status" = "pending" ] || continue
    risk=$(yq eval ".tasks[] | select(.id == $id) | .risk" "$BACKLOG_FILE")
    if [ "$risk" = "high" ] && [ "$ALLOW_HIGH_RISK" != "1" ] && [ -z "$TASK_ID" ]; then
      continue
    fi
    echo "$id"
    return 0
  done <<< "$ids"
  return 1
}

run_one_task() {
  local task_id
  task_id=$(pick_task) || { echo "[$(date -Iseconds)] Nessun task eseguibile. Fine."; return 1; }

  local title risk area
  title=$(yq eval ".tasks[] | select(.id == $task_id) | .title" "$BACKLOG_FILE")
  risk=$(yq eval ".tasks[] | select(.id == $task_id) | .risk" "$BACKLOG_FILE")
  area=$(yq eval ".tasks[] | select(.id == $task_id) | .area" "$BACKLOG_FILE")
  prompt_text=$(yq eval ".tasks[] | select(.id == $task_id) | .prompt" "$BACKLOG_FILE")

  local branch="auto/task-$(printf '%03d' "$((10#$task_id))")"
  local ts; ts=$(date +%Y%m%d-%H%M%S)
  local log_file="$LOG_DIR/task-${task_id}-${ts}.json"
  local log_txt="$LOG_DIR/task-${task_id}-${ts}.md"

  echo "=== Task $task_id ($risk/$area): $title ==="

  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY RUN] branch: $branch"
    echo "[DRY RUN] prompt:"; echo "$prompt_text" | head -5
    echo "[DRY RUN] nessuna esecuzione, nessun commit."
    return 1
  fi

  state_set "$task_id" running

  git fetch origin main --quiet 2>/dev/null || true
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout --quiet "$branch"
  else
    git checkout --quiet -b "$branch" origin/main 2>/dev/null || git checkout --quiet -b "$branch" main
  fi

  local full_prompt
  full_prompt=$(cat <<EOF
CONTESTO PROGETTO: ILA — Index Lunae Antiquae, corpus CMRDM (Lane 1971).

REGOLE NON NEGOZIABILI (rispettale sempre, anche se il task sotto sembrasse
richiedere altro):
- Non toccare NESSUN file .xml del corpus, né alcun blocco <xenoData>.
- Non fabbricare o pre-compilare dati epigrafici mancanti: se un dato non è
  derivabile dai file esistenti, ometti il campo o segnalalo come mancante.
- Scritture solo "patch": non riscrivere da zero file esistenti se puoi
  modificarli in modo mirato.
- Usa sempre 'entryId' (mai 'firebaseId', deprecato).
- Non eseguire git push, non toccare main, non modificare GITHUB_ALLOW_DELETE.
- Il target reale del progetto è il sito statico su GitHub Pages: una feature
  che funziona solo con server.ts vivo è incompleta. Se il task tocca dati
  serviti via API, verifica la controparte in src/lib/apiShim.ts.
- Se qualcosa nel task è ambiguo o rischia di violare queste regole, FERMATI e
  scrivilo nel tuo output finale invece di procedere a intuito. Una cosa non
  fatta e segnalata vale più di una fatta a caso.

TASK #$task_id ($area, rischio: $risk): $title

$prompt_text

Al termine esegui 'npm run typecheck' e correggi gli errori che hai
introdotto. Non fare git commit: se ne occupa lo script chiamante dopo aver
verificato la build. Chiudi il tuo output con un riepilogo in italiano di:
(a) cosa hai cambiato, (b) cosa hai lasciato invariato e perché, (c) cosa
richiede una decisione umana.
EOF
)

  set +e
  claude -p "$full_prompt" \
    --settings "$SETTINGS_FILE" \
    --permission-mode acceptEdits \
    --output-format json \
    > "$log_file" 2> "$log_file.stderr"
  local claude_exit=$?
  set -e

  local result cost
  result=$(jq -r '.result // "(nessun output)"' "$log_file" 2>/dev/null || echo "(output non parsabile)")
  cost=$(jq -r '(.total_cost_usd // 0) | tostring' "$log_file" 2>/dev/null || echo "0")

  {
    echo "# Task $task_id — $title"
    echo
    echo "- Area: $area / Rischio: $risk"
    echo "- Branch: \`$branch\`"
    echo "- Timestamp: $ts"
    echo "- Exit code claude: $claude_exit"
    echo "- Costo stimato: \$$cost"
    echo
    echo "## Riepilogo dell'agente"
    echo
    echo "$result"
  } > "$log_txt"

  local outcome
  if [ "$claude_exit" -ne 0 ]; then
    echo "Claude ha fallito (exit $claude_exit). Vedi $log_file.stderr"
    outcome="failed-agent"
  else
    echo "Verifico il typecheck..."
    if npm run typecheck --silent >/dev/null 2>&1; then
      outcome="ok"
    else
      outcome="failed-build"
    fi
  fi

  # --- commit: sempre, ma marcato se la build è rossa ---------------------
  local changed=0
  if [ -n "$(git status --porcelain)" ]; then
    changed=1
    git add -A
    if [ "$outcome" = "ok" ]; then
      git commit --quiet -m "auto(task-$task_id): $title

Eseguito autonomamente via Claude Code headless. Typecheck verde.
Log: logs/autonomous/$(basename "$log_txt")
Da rivedere e mergiare a mano.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
    else
      git commit --quiet -m "[BUILD FALLITA] auto(task-$task_id): $title

Esito: $outcome. NON mergiare così com'è.
Commit fatto solo per non perdere il lavoro e lasciare l'albero pulito.
Log: logs/autonomous/$(basename "$log_txt")

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
    fi
  fi

  case "$outcome" in
    ok)  [ "$changed" = "1" ] && state_set "$task_id" done || state_set "$task_id" empty ;;
    *)   state_set "$task_id" failed ;;
  esac

  git checkout --quiet main

  # --- riga nel riepilogo leggibile ---------------------------------------
  local icon
  case "$outcome" in
    ok) icon="[OK]" ;;
    failed-build) icon="[BUILD ROSSA]" ;;
    *) icon="[AGENTE KO]" ;;
  esac
  [ "$changed" = "0" ] && icon="[NESSUNA MODIFICA]"

  {
    echo "## $(date '+%Y-%m-%d %H:%M') — task $task_id: $title"
    echo
    echo "$icon — branch \`$branch\` — costo \$$cost"
    echo
    if [ "$changed" = "1" ]; then
      echo "Diff: \`git diff main...$branch --stat\`"
      git diff "main...$branch" --stat | tail -15 | sed 's/^/    /'
    fi
    echo
    echo "<details><summary>Riepilogo dell'agente</summary>"
    echo
    echo "$result"
    echo
    echo "</details>"
    echo
    echo "---"
    echo
  } >> "$DIGEST"

  echo "Task $task_id: $icon (branch $branch)"
  return 0
}

count=0
while [ "$count" -lt "$MAX_TASKS" ]; do
  run_one_task || break
  count=$((count + 1))
  [ -n "$TASK_ID" ] && break
done

echo "[$(date -Iseconds)] Run completata. Task eseguiti: $count."
echo "Riepilogo: $DIGEST"
