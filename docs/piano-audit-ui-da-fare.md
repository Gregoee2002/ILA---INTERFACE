# Interventi UI da completare — coda dell'audit 2026-09-01

Le Sessioni UI (S8–S11) del [piano](piano-audit-totale-2026-09-01.md) sono state
eseguite per la parte **a basso rischio e verificabile per grep**. Restano da
fare le parti che richiedono **revisione visiva a vista** (non possibile in
esecuzione autonoma senza un giudizio umano sul risultato renderizzato).

## S8 — codemod dei colori di stato (UI-01, resto)

Fatto: definiti i token `--danger/--warning/--success/--info` (chiaro+scuro) in
`src/index.css`, più `--color-*` in `@theme`; classe `.light`; `--parchment-rgb`;
scrollbar dark → `var(--border)`; anti-FOUC in `index.html`; PasswordGate
allineato a `:root` via `.light`; `#E08585` → `text-danger`. Primo scaglione del
codemod: i 6 usi non ambigui di "successo"/"errore" in `App.tsx` (importStatus,
badge published) → `text-success`/`text-danger`.

> **CHIUSO il 2026-09-05.** Il codemod è stato eseguito dal runner autonomo
> (task 011-013, branch `auto/task-011..013`, mergiati in `ec55166..492d8d8`)
> più `0e6eee6` per tre usi sfuggiti allo scope. Dei 179 usi ad-hoc censiti
> restano i **7 voluti**: `XmlDiffViewer.tsx` (4 — rosso/verde sono la
> semantica del diff, non stati dell'app) e `PleiadesMap.tsx` (3 — palette
> data-viz). I `dark:` ridondanti sono stati rimossi. Typecheck e build verdi.
>
> Resta da fare una **verifica a vista**: la mappatura normalizza le opacità
> (es. `bg-amber-400/5` → `bg-warning/10`), quindi alcuni fondi sono più
> carichi di prima. Due punti segnalati dall'agente: in `SectionEditorView.tsx`
> l'hover del bottone di login è diventato `hover:opacity-70` (non esisteva un
> token per quella tinta), e il bottone "Annulla" del form vocabolario conserva
> l'hover rosso che aveva già — annullare non è eliminare, la scelta è aperta.

~~**Da fare:** sostituire i restanti ~230 usi ad-hoc di colori Tailwind di stato
con le classi tokenizzate.~~ Conteggi (da `grep -rhoE "(text|bg|border)-(red|amber|emerald|green)-[0-9]+" src/`):

| pattern | → |
|---|---|
| `text-red-{400,500,600,700}` (~55) | `text-danger` |
| `bg-red-500/{5,8,10}`, `bg-red-{50,600,700,900/10}` (~14) | `bg-danger/10`, `bg-danger` |
| `border-red-{300,500/20,500/25,900/30}` (~9) | `border-danger/25` |
| `text-amber-{400,500,600,700,800}` (~55) | `text-warning` |
| `bg-amber-*` (~25) | `bg-warning/10` |
| `border-amber-*` (~28) | `border-warning/25` |
| `text-green-600`, `text-emerald-{400,600}` (~7) | `text-success` |
| `bg-emerald-500/{10,70}`, `bg-green-500/10` (~5) | `bg-success/10` |

Escludere: `src/components/MapView.tsx`, `CooccurrenceHeatmap.tsx`,
`PleiadesMap.tsx` (colori data-viz dichiarati, palette propria — vedi UI-05).
Dopo il codemod, verificare a vista: chip di stato salvataggio, banner errori,
badge revisione, tooltip mappa, per non aver tokenizzato un uso decorativo.

`dark:text-amber-400` accoppiati a `text-amber-800` diventano ridondanti (il
token gestisce già chiaro/scuro): rimuovere il modificatore `dark:`.

## S8 — UI-05 (resto): palette mappa centralizzata

> **CHIUSO il 2026-09-05** (task 014 del runner + `7aafd77`). I colori regione,
> la `DENSITY_SCALE` e il colore cluster stanno in `src/lib/mapPalette.ts`, con
> commenti sul perché di ogni scelta; `index.css` usa `--map-cluster-highlight`
> e `--map-cluster-highlight-rgb`, quest'ultima per le sei occorrenze `rgba()`
> che il task aveva lasciato indietro. Nessun valore cromatico cambiato.
> Resta una copia inevitabile del solo colore cluster fra CSS e TS (il CSS non
> legge da TypeScript, Leaflet vuole una stringa): documentata in entrambi.

`MapView.tsx` ha i colori regione (`#5B7A8C`, `#B5651D`, `#7A8F5E`, `#0d5147`,
`#1F8377`), la `DENSITY_SCALE` e `#B0233F` (cluster-highlight, anche in
`index.css` `.marker-cluster-highlight`). Estrarre in `src/lib/mapPalette.ts`,
referenziare da JS e — via CSS custom property — da `index.css`.

## S9 — primitivi di componente (UI-10, UI-12, UI-13, UI-14, UI-16)

Non ancora iniziata. Estrarre `src/components/ui/{Button,Chip,Badge,FilterSelect,Card}.tsx`
usando i token di S8, e sostituire progressivamente (un gruppo per commit):
- ~30 bottoni primari scritti a mano (`bg-accent text-white …`);
- i 7 `<select>` filtri identici in `src/App.tsx` (~5674–5783);
- 3 varianti di "chip"/badge (`bg-accent/{5,8,10}`);
- `disabled:opacity-40` vs `-50` → un valore nel `<Button>` (UI-16);
- fallback `var(--accent, #2da199)` negli editor → `#1F8377` o rimuovere (UI-14).

## S10 — focus visibile & z-scale (UI-15, UI-17, UI-18)

> **CHIUSO il 2026-09-05.** UI-15 era già fatto (commit 6d1b471). UI-17/UI-18
> col task 016: scala z documentata (`--z-background/content/sticky/overlay/
> modal/toast`) e grana felt da `z-index: 100` a `var(--z-background)`, quindi
> finalmente sotto il contenuto invece che sopra. Verificato in browser che a
> `z-index: -1` la texture resta visibile: lo sfondo del `body` si propaga al
> canvas e viene dipinto prima, quindi il pseudo-elemento negativo ci sta
> comunque sopra. Gli z-index inline nei componenti React non sono stati
> toccati: quello resta da fare.

> AGGIORNATO 2026-09-05: UI-15 (focus-visible) risulta GIÀ FATTO nel commit
> 6d1b471, così come il fallback --accent di UI-14. Restano solo UI-17/UI-18
> (grana felt a z-index 100, scala z). Verificato lanciando il task 015 del
> runner autonomo, che non ha trovato nulla da cambiare.

Non ancora iniziata.
- `@layer base` con regola pavimento `:where(a,button,[role="button"],input,select,textarea,[tabindex]):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.
- `body::before` (grana felt) da `z-index:100` a `0`; scala z coerente
  (`--z-overlay/popover/toast`) per popover e dialoghi.
- Ramo vuoto/loading `role="status"` in `RegistroPanel`, `DraftReviewPanel`,
  `BugReportsPanel`, `IconographyPanel`.

## S11 — tipografia & ritmo (UI-08, UI-09, UI-11)

Non ancora iniziata.
- `fontFamily` inline (`'Georgia, serif'` in PasswordGate, `'monospace'` in
  App.tsx, `font-mono` in ErrorBoundary, `<option style backgroundColor:#18181b>`
  negli editor markup) → token `--font-*` / classi tema.
- scala tipografica (`--text-xs…-2xl` o classi) al posto di `text-2xl`/`text-[9px]`
  sparsi; `.field-label` come unico primitivo per le etichette.
- durate transizione: da 4 valori (`duration-{150,200,300,500}`) a 2
  (`duration-150` micro, `duration-300` pannelli).
