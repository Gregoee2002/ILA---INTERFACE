#!/bin/bash
# controlli-notturni.sh — controlli di sola lettura su corpus e codice di ILA
# ------------------------------------------------------------------
#  Gira di notte via launchd (~/Library/LaunchAgents/com.ila.controlli.plist)
#  e la mattina lascia un rapporto in logs/controlli/AAAA-MM-GG.md
#  (logs/controlli/ultimo.md punta sempre all'ultimo).
#
#  Quattro controlli, nessuna IA, nessuna scrittura sul corpus:
#    1. salute del corpus  — lint-corpus.py sulla repo dati, con i problemi
#                            nuovi rispetto alla run precedente in evidenza
#    2. allineamento       — data-sync-report.ts fra cache locale e repo dati
#    3. build e test       — tsc, eslint, vitest e build statica di Pages,
#                            su una copia pulita di `main` (non sull'albero
#                            di lavoro: il tuo lavoro in corso non c'entra)
#    4. avanzamento        — stato-corpus.py, con la differenza da ieri
#
#  Unica azione sulla rete: `git pull --ff-only` sulla repo dati, solo se è
#  pulita. Non tocca l'albero di lavoro di questa repo, quindi non blocca il
#  runner autonomo delle 02:00 (che rifiuta di partire con l'albero sporco).
#
#  Uso manuale:  ./scripts/controlli-notturni.sh
#  Variabili:    ILA_DATA_REPO (default ~/Documents/GitHub/ILA)
#                SALTA_BUILD=1  per saltare il controllo 3 (è il più lento)
# ------------------------------------------------------------------
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_REPO="${ILA_DATA_REPO:-$HOME/Documents/GitHub/ILA}"
OUT_DIR="$ROOT/logs/controlli"
STATO="$OUT_DIR/.stato"
OGGI="$(date +%Y-%m-%d)"
REPORT="$OUT_DIR/$OGGI.md"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/ila-controlli.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT_DIR" "$STATO"
# Niente token nell'ambiente: la build deve leggere il corpus copiato qui,
# non andare in rete (vedi build-corpus-snapshot.ts).
unset GITHUB_TOKEN GITHUB_REPO

ESITI=()   # righe del sommario in testa al rapporto
esito() { ESITI+=("$1"); }

sezione() { printf '\n## %s\n\n' "$1" >> "$TMP/corpo.md"; }
blocco() {  # blocco di testo in un <details>, per non allungare il rapporto
  { printf '<details><summary>%s</summary>\n\n```\n' "$1"; cat "$2"; printf '```\n\n</details>\n'; } >> "$TMP/corpo.md"
}
riga() { printf '%s\n' "$*" >> "$TMP/corpo.md"; }

: > "$TMP/corpo.md"

# --- 0. repo dati aggiornata ---------------------------------------------
PULL_NOTA=""
if [ ! -d "$DATA_REPO/corpus" ]; then
  echo "Repo dati non trovata in $DATA_REPO" >&2
  exit 1
fi
if [ -z "$(git -C "$DATA_REPO" status --porcelain --untracked-files=no)" ]; then
  if git -C "$DATA_REPO" pull --ff-only -q >"$TMP/pull.log" 2>&1; then
    PULL_NOTA="aggiornata (\`$(git -C "$DATA_REPO" log -1 --format='%h %cd' --date=format:'%d/%m %H:%M')\`)"
  else
    PULL_NOTA="**pull non riuscito**, controllo sulla copia locale: $(tail -1 "$TMP/pull.log")"
  fi
else
  PULL_NOTA="**ha modifiche non committate**, pull saltato: controllo sulla copia locale"
fi
CORPUS="$DATA_REPO/corpus"

# --- 1. salute del corpus -------------------------------------------------
sezione "1. Salute del corpus"
ILA_CORPUS="$CORPUS" python3 "$ROOT/scripts/lint-corpus.py" > "$TMP/lint.txt" 2>&1
# Righe di problema, una per riga, per il confronto con la run precedente.
awk '/^(ERRORI|AVVISI) /{sez=$1; next} /^[A-Z]/{sez=""} sez && /^  /{sub(/^  +/, ""); print sez "\t" $0}' \
  "$TMP/lint.txt" | sort > "$TMP/problemi.tsv"
N_ERR=$(grep -c '^ERRORI' "$TMP/problemi.tsv")
N_AVV=$(grep -c '^AVVISI' "$TMP/problemi.tsv")
if [ -f "$STATO/problemi.tsv" ]; then
  comm -13 "$STATO/problemi.tsv" "$TMP/problemi.tsv" > "$TMP/nuovi.tsv"
  comm -23 "$STATO/problemi.tsv" "$TMP/problemi.tsv" > "$TMP/risolti.tsv"
else
  : > "$TMP/nuovi.tsv"; : > "$TMP/risolti.tsv"
fi
N_NUOVI=$(wc -l < "$TMP/nuovi.tsv" | tr -d ' ')
N_RISOLTI=$(wc -l < "$TMP/risolti.tsv" | tr -d ' ')

riga "Errori: $N_ERR · avvisi: $N_AVV · schede: $(ls "$CORPUS"/*.xml | wc -l | tr -d ' ')."
if [ "$N_NUOVI" -gt 0 ]; then
  riga ""; riga "**Nuovi rispetto alla run precedente ($N_NUOVI):**"; riga ""
  sed 's/^\([A-Z]*\)\t/- \1 — /' "$TMP/nuovi.tsv" >> "$TMP/corpo.md"
fi
if [ "$N_RISOLTI" -gt 0 ]; then
  riga ""; riga "Risolti dalla run precedente: $N_RISOLTI."
fi
riga ""
blocco "Uscita completa di lint-corpus.py" "$TMP/lint.txt"
cp "$TMP/problemi.tsv" "$STATO/problemi.tsv"

if [ "$N_ERR" -gt 0 ]; then esito "✗ corpus: errori: $N_ERR (problemi nuovi: $N_NUOVI)"
elif [ "$N_NUOVI" -gt 0 ]; then esito "△ corpus: nessun errore, avvisi nuovi: $N_NUOVI"
else esito "✓ corpus: nessun errore, nessun problema nuovo (avvisi già noti: $N_AVV)"; fi

# --- 2. allineamento delle due repo ------------------------------------------
sezione "2. Allineamento fra cache locale e repo dati"
( cd "$ROOT" && npx --no-install tsx scripts/data-sync-report.ts --repo "$DATA_REPO" ) > "$TMP/sync.txt" 2>&1
# La sezione «Lettura» è il verdetto dello script: la riportiamo in chiaro.
awk '/^Lettura:/{on=1; next} on && NF' "$TMP/sync.txt" | sed 's/^ *//' > "$TMP/lettura.txt"
cat "$TMP/lettura.txt" >> "$TMP/corpo.md"; riga ""
blocco "Uscita completa di data-sync-report.ts" "$TMP/sync.txt"
conta() { grep "│ $1" "$TMP/sync.txt" | grep -o '[0-9][0-9]*' | head -1; }
SOLO_L=$(conta 'solo in locale'); SOLO_R=$(conta 'solo sul remoto'); DIV=$(conta 'contenuto divergente')
if grep -q 'Le due copie coincidono' "$TMP/lettura.txt"; then
  esito "✓ allineamento: cache locale e repo dati coincidono"
elif [ -z "$DIV" ]; then
  esito "✗ allineamento: data-sync-report.ts non ha prodotto conteggi"
else
  esito "△ allineamento: ${SOLO_L} schede solo in locale, ${SOLO_R} solo nella repo dati, ${DIV} con contenuto diverso"
fi

# --- 3. build e test su main pulito --------------------------------------
sezione "3. Build e test su \`main\`"
if [ "${SALTA_BUILD:-0}" = 1 ]; then
  riga "Saltato (SALTA_BUILD=1)."
  esito "– build: saltata"
else
  WT="$TMP/main"
  mkdir -p "$WT"
  git -C "$ROOT" archive main | tar -x -C "$WT"
  ln -s "$ROOT/node_modules" "$WT/node_modules"
  mkdir -p "$WT/src/data/corpus"
  cp "$CORPUS"/*.xml "$WT/src/data/corpus/"
  riga "Commit: \`$(git -C "$ROOT" log -1 --format='%h %s' main)\`"; riga ""
  FALLITI=()
  passo() {  # passo <nome> <comando...>
    local nome="$1"; shift
    local t0=$SECONDS
    if ( cd "$WT" && "$@" ) > "$TMP/passo.txt" 2>&1; then
      riga "- ✓ $nome ($((SECONDS - t0)) s)"
    else
      riga "- ✗ **$nome** ($((SECONDS - t0)) s)"
      FALLITI+=("$nome")
      blocco "Uscita di $nome (ultime 60 righe)" <(tail -60 "$TMP/passo.txt")
    fi
  }
  passo "typecheck" npx --no-install tsc --noEmit
  passo "eslint" npx --no-install eslint .
  passo "test (vitest)" npx --no-install vitest run
  passo "snapshot del corpus" npx --no-install tsx scripts/build-corpus-snapshot.ts
  passo "build statica (Pages)" env VITE_STATIC_BUILD=true VITE_SITE_PASSWORD_HASH=controllo-notturno \
    npx --no-install vite build --outDir "$TMP/dist"
  if [ ${#FALLITI[@]} -eq 0 ]; then esito "✓ build: typecheck, eslint, test e build statica passano"
  else esito "✗ build: falliscono $(IFS=,; echo "${FALLITI[*]}" | sed 's/,/, /g')"; fi
fi

# --- 4. avanzamento --------------------------------------------------------
sezione "4. Avanzamento del corpus"
ILA_CORPUS="$CORPUS" python3 "$ROOT/scripts/stato-corpus.py" --json "$TMP/stato.json" > /dev/null
python3 - "$TMP/stato.json" "$STATO/stato.json" >> "$TMP/corpo.md" <<'PY'
import json, sys, os
oggi = json.load(open(sys.argv[1]))
ieri = json.load(open(sys.argv[2])) if os.path.exists(sys.argv[2]) else None
tot = oggi['schede']
print('| campo | schede | % | da ieri |')
print('|---|---:|---:|---:|')
d = (tot - ieri['schede']) if ieri else 0
print('| **schede nel corpus** | %d | | %s |' % (tot, ('%+d' % d) if d else ''))
for k, n in oggi['campi'].items():
    d = (n - ieri['campi'].get(k, 0)) if ieri else 0
    print('| %s | %d | %.1f | %s |' % (oggi['etichette'][k], n, 100.0 * n / tot if tot else 0, ('%+d' % d) if d else ''))
PY
if [ -f "$STATO/stato.json" ]; then
  CAMBI=$(python3 -c '
import json,sys
a=json.load(open(sys.argv[1]));b=json.load(open(sys.argv[2]))
print(sum(1 for k,n in a["campi"].items() if n!=b["campi"].get(k)))' "$TMP/stato.json" "$STATO/stato.json")
else CAMBI=0; fi
cp "$TMP/stato.json" "$STATO/stato.json"
cp "$TMP/stato.json" "$STATO/stato-$OGGI.json"   # registro storico, per la tesi
if [ "$CAMBI" -gt 0 ]; then esito "△ avanzamento: $CAMBI campi cambiati da ieri"
else esito "✓ avanzamento: nessun cambiamento da ieri"; fi

# --- promemoria: runner autonomo ----------------------------------------------
AUTO=$(git -C "$ROOT" branch --list 'auto/*' | wc -l | tr -d ' ')
ULTIMA_RUN=$(grep '^## 20' "$ROOT/logs/autonomous/RIEPILOGO.md" 2>/dev/null | tail -1 | sed 's/^## //; s/ —.*//')

# --- rapporto ------------------------------------------------------------------
{
  printf '# Controlli notturni — %s\n\n' "$(date '+%d/%m/%Y %H:%M')"
  printf 'Repo dati: %s\n\n' "$PULL_NOTA"
  for e in "${ESITI[@]}"; do printf -- '- %s\n' "$e"; done
  if [ "$AUTO" -gt 0 ]; then
    printf -- '- ⋯ runner autonomo: %s branch `auto/*` da rivedere, ultima run %s\n' "$AUTO" "${ULTIMA_RUN:-mai}"
  fi
  cat "$TMP/corpo.md"
} > "$REPORT"
ln -sf "$OGGI.md" "$OUT_DIR/ultimo.md"

# Notifica macOS con il sommario: la prima riga che non è un ✓, o «tutto a posto».
PROBLEMA=$(printf '%s\n' "${ESITI[@]}" | grep -v '^✓' | grep -v '^–' | head -1)
PROBLEMA=$(printf '%s' "$PROBLEMA" | tr -d '"\\`')   # niente che rompa la stringa AppleScript
osascript -e "display notification \"${PROBLEMA:-Tutto a posto}\" with title \"ILA — controlli notturni\" subtitle \"logs/controlli/ultimo.md\"" 2>/dev/null || true

echo "Rapporto: $REPORT"
