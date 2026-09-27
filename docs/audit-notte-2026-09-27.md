# Audit della notte 27→28/09/2026: sessioni manuali in sequenza

Coda UI dell'audit 2026-09-01, S9 (vedi `docs/piano-audit-ui-da-fare.md` e i
task 017-018 di `tasks.yaml`). Si lanciano **a mano**, in sessioni
interattive di Claude Code aperte in `~/Documents/STAR`, **una alla volta**:
la seconda parte solo quando la prima ha finito e committato.

Il runner headless delle 02:00 (`com.ila.autonomous`) è stato scaricato da
launchd per stanotte, così non parte da solo. I controlli deterministici delle
01:30 (`com.ila.controlli`) restano attivi. Per riattivare il runner:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ila.autonomous.plist
```

## Prima di cominciare

- Albero pulito su `main` (`git status` vuoto).
- I branch `auto/task-011…016` non sono ancora mergiati: questi task partono
  da `main` e **non** ne dipendono (i token `--danger/--warning/…` stanno già
  in `src/index.css`). Se si mergia dopo, possono esserci conflitti su
  `src/App.tsx`: vanno risolti a mano.

## 1. Task 017: primitivo `<Button>`

Prompt da incollare:

> Lavora sul task 017 di tasks.yaml («Primitivo <Button> ed eliminazione dei
> bottoni scritti a mano»). Crea il branch `auto/task-017` dal main locale.
> Segui il prompt del task alla lettera: diff piccolo, `src/App.tsx` più un
> solo altro componente, rendering identico. Regole: niente XML del corpus,
> niente push, niente merge. Alla fine lancia `npm run typecheck`, `npm run
> lint` e `npm test`, verifica a vista nel browser (chiaro e scuro) i bottoni
> convertiti, committa sul branch ed elenca i bottoni rimasti da convertire.
> Poi torna su main.

## 2. Task 018: primitivi `<Chip>` e `<Badge>`

Da lanciare solo quando la 1 ha finito. Prompt:

> Lavora sul task 018 di tasks.yaml («Primitivi <Chip> e <Badge>»). Crea il
> branch `auto/task-018` dal main locale. Segui il prompt del task: al
> massimo 3 file convertiti, un solo valore di opacità motivato in un
> commento, varianti sui token. Regole: niente XML del corpus, niente push,
> niente merge. Alla fine typecheck, lint e test, verifica a vista (chiaro e
> scuro), commit sul branch, elenco delle occorrenze rimaste. Poi torna su
> main.

## Domattina

- Rivedere `git diff main...auto/task-017` e `…018`, poi decidere il merge.
- Segnare 017 e 018 come `done` in `.autonomous/state.tsv`, se il runner deve
  ripartire: sennò li riprenderebbe.
