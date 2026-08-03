#!/usr/bin/env bash
#
# run-autonomous.sh — Runner per task autonomi ILA via Claude Code headless
#
# Uso:
#   ./run-autonomous.sh                 # esegue 1 task pending (risk low/medium)
#   MAX_TASKS=3 ./run-autonomous.sh      # esegue fino a 3 task in sequenza
#   ALLOW_HIGH_RISK=1 ./run-autonomous.sh TASK_ID=007   # forza un task specifico, incluso "high"
#
# Cosa fa:
#   1. Legge tasks.yaml, prende il prossimo task "pending" (risk low/medium
#      di default), lo marca "running".
#   2. Crea/aggiorna un branch auto/task-<id> da main.
#   3. Lancia `claude -p` in modalità headless con i settings di guardrail
#      (.claude/settings.autonomous.json) e --permission-mode acceptEdits.
#   4. Dopo l'esecuzione, gira typecheck/build. Se falliscono -> task "failed",
#      branch lasciato per debug, NESSUN commit.
#   5. Se la build passa, fa commit LOCALE sul branch (nessun push, nessun
#      merge automatico — decisione esplicita del progetto).
#   6. Logga tutto (prompt, output JSON, costo, esito) in logs/ per la
#      documentazione di sessione della tesi.
#
# Pensato per girare via cron durante i "tempi morti" (es. notte), ma può
# essere lanciato anche a mano.

set -euo pipefail

REPO_DIR="${REPO_DIR:-$(pwd)}"
BACKLOG_FILE="${BACKLOG_FILE:-$REPO_DIR/tasks.yaml}"
SETTINGS_FILE="${SETTINGS_FILE:-$REPO_DIR/.claude/settings.autonomous.json}"
LOG_DIR="${LOG_DIR:-$REPO_DIR/logs/autonomous}"
MAX_TASKS="${MAX_TASKS:-1}"
ALLOW_HIGH_RISK="${ALLOW_HIGH_RISK:-0}"
LOCK_FILE="$REPO_DIR/.autonomous.lock"

mkdir -p "$LOG_DIR"

if [ -e "$LOCK_FILE" ]; then
  echo "[$(date -Iseconds)] Lock già presente ($LOCK_FILE): un'altra run è in corso, esco." >&2
  exit 1
fi
trap 'rm -f "$LOCK_FILE"' EXIT
touch "$LOCK_FILE"

command -v yq >/dev/null 2>&1 || { echo "Serve 'yq' per leggere tasks.yaml (brew install yq / apt install yq)"; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "Comando 'claude' (Claude Code) non trovato nel PATH"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Serve 'jq' per parsare l'output JSON"; exit 1; }

cd "$REPO_DIR"

run_one_task() {
  local risk_filter
  if [ "$ALLOW_HIGH_RISK" = "1" ]; then
    risk_filter='.risk == "low" or .risk == "medium" or .risk == "high"'
  else
    risk_filter='.risk == "low" or .risk == "medium"'
  fi

  local task_id
  task_id=$(yq eval ".tasks[] | select(.status == \"pending\") | select($risk_filter) | .id" "$BACKLOG_FILE" | head -n1)

  if [ -z "$task_id" ]; then
    echo "[$(date -Iseconds)] Nessun task pending idoneo. Fine."
    return 1
  fi

  local title prompt_text risk area
  title=$(yq eval ".tasks[] | select(.id == $task_id) | .title" "$BACKLOG_FILE")
  risk=$(yq eval ".tasks[] | select(.id == $task_id) | .risk" "$BACKLOG_FILE")
  area=$(yq eval ".tasks[] | select(.id == $task_id) | .area" "$BACKLOG_FILE")
  prompt_text=$(yq eval ".tasks[] | select(.id == $task_id) | .prompt" "$BACKLOG_FILE")

  local branch="auto/task-$(printf '%03d' "$task_id")"
  local ts
  ts=$(date +%Y%m%d-%H%M%S)
  local log_file="$LOG_DIR/task-${task_id}-${ts}.json"
  local log_txt="$LOG_DIR/task-${task_id}-${ts}.md"

  echo "=== Task $task_id ($risk/$area): $title ==="
  echo "Log: $log_txt"

  # 1) Marca "running" nel backlog
  yq eval -i "(.tasks[] | select(.id == $task_id) | .status) = \"running\"" "$BACKLOG_FILE"

  # 2) Branch dedicato, sempre da main aggiornato
  git fetch origin main --quiet || true
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout "$branch"
  else
    git checkout -b "$branch" origin/main 2>/dev/null || git checkout -b "$branch" main
  fi

  # 3) Prompt finale con guardrail espliciti ripetuti (difesa in profondità,
  #    oltre a settings.autonomous.json)
  local full_prompt
  full_prompt=$(cat <<EOF
CONTESTO PROGETTO: ILA / MENISKOS, corpus CMRDM (Lane 1971).

REGOLE NON NEGOZIABILI (rispettale sempre, anche se il task sotto sembrasse
richiedere altro):
- Non toccare NESSUN file .xml del corpus, né alcun blocco <xenoData>.
- Non fabbricare o pre-compilare dati epigrafici mancanti: se un dato non è
  derivabile dai file esistenti, ometti il campo o segnalalo come mancante.
- Scritture solo "patch": non riscrivere file esistenti da zero se puoi
  modificarli in modo mirato.
- Usa sempre 'entryId' (mai 'firebaseId', già deprecato).
- Non eseguire git push, non toccare il branch main, non modificare
  GITHUB_ALLOW_DELETE.
- Se qualcosa nel task è ambiguo o rischia di violare queste regole, fermati
  e scrivi una nota nel commit message invece di procedere a intuito.

TASK #$task_id ($area, rischio: $risk): $title

$prompt_text

Al termine: esegui 'npm run typecheck' (o 'npx tsc --noEmit' se non esiste
lo script) e correggi eventuali errori introdotti dalle tue modifiche prima
di considerare il task concluso. Non fare git commit tu stesso: se ne occupa
lo script chiamante dopo aver verificato la build.
EOF
)

  # 4) Esecuzione headless
  set +e
  claude -p "$full_prompt" \
    --settings "$SETTINGS_FILE" \
    --permission-mode acceptEdits \
    --output-format json \
    --verbose \
    > "$log_file" 2> "$log_file.stderr"
  local claude_exit=$?
  set -e

  {
    echo "# Task $task_id — $title"
    echo
    echo "- Area: $area / Rischio: $risk"
    echo "- Branch: $branch"
    echo "- Timestamp: $ts"
    echo "- Exit code claude: $claude_exit"
    echo
    echo "## Risultato"
    jq -r '.result // "N/A"' "$log_file" 2>/dev/null || echo "(output non parsabile come JSON)"
    echo
    echo "## Costo"
    jq -r '"Costo stimato: $" + (.total_cost_usd // 0 | tostring)' "$log_file" 2>/dev/null || true
  } > "$log_txt"

  if [ "$claude_exit" -ne 0 ]; then
    echo "Claude Code ha fallito (exit $claude_exit). Vedi $log_file.stderr"
    yq eval -i "(.tasks[] | select(.id == $task_id) | .status) = \"failed\"" "$BACKLOG_FILE"
    git checkout main 2>/dev/null || git checkout master 2>/dev/null || true
    return 0
  fi

  # 5) Verifica build/typecheck prima di committare
  echo "Verifico typecheck/build..."
  set +e
  if npm run typecheck --silent 2>/dev/null; then
    build_ok=1
  elif npx tsc --noEmit 2>/dev/null; then
    build_ok=1
  else
    build_ok=0
  fi
  set -e

  if [ "$build_ok" -ne 1 ]; then
    echo "Build/typecheck fallito dopo le modifiche del task $task_id. NESSUN commit."
    echo "Branch '$branch' lasciato intatto per debug manuale."
    yq eval -i "(.tasks[] | select(.id == $task_id) | .status) = \"failed\"" "$BACKLOG_FILE"
    return 0
  fi

  # 6) Commit locale (mai push, mai merge)
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "auto(task-$task_id): $title

Eseguito autonomamente via Claude Code headless.
Log completo: logs/autonomous/$(basename "$log_txt")
Da rivedere e mergiare manualmente."
    echo "Commit creato su branch $branch. Push/merge lasciati a te."
  else
    echo "Nessuna modifica prodotta dal task $task_id."
  fi

  yq eval -i "(.tasks[] | select(.id == $task_id) | .status) = \"done\"" "$BACKLOG_FILE"
  git checkout main 2>/dev/null || git checkout master 2>/dev/null || true
  return 0
}

count=0
while [ "$count" -lt "$MAX_TASKS" ]; do
  if ! run_one_task; then
    break
  fi
  count=$((count + 1))
done

echo "[$(date -Iseconds)] Run completata. Task eseguiti: $count."
echo "Rivedi i branch auto/task-* con 'git branch --list \"auto/*\"' e i log in logs/autonomous/."
