# Norme redazionali — bibliografia ILA

Regole per la resa delle voci nella **bibliografia finale** di ogni scheda
(`<div type="bibliography"><listBibl><bibl>…</bibl></listBibl></div>`).

> Fonte: norme fornite dal curatore (29 ago 2026). Questo file è il riferimento
> per il pannello **Bibliografia** (visibile solo dopo lo sblocco con token).

## Regola generale

- Autore: **iniziale puntata del nome + cognome** → `G. Cresci Marrone`.
- **Non si indica la casa editrice.**
- Titoli di monografie e riviste **in corsivo**; nella resa testuale del corpus
  il corsivo si segna con i caporali per le riviste (`«…»`) e resta implicito
  per i titoli di monografia (nessun markup interno alle `<bibl>` allo stato
  attuale: sono tutte stringhe piane).
- Intervalli di pagine: **`pp.` + cifre piene** → `pp. 506-508` (mai `p. 506-8`).
- Colonne: `cc.` (es. voci di enciclopedia).

## Modelli

### Monografia
`N. Cognome, Titolo della monografia. Eventuale sottotitolo, Luogo Anno.`

> G. Cresci Marrone, *Ecumene Augustea. Una politica per il consenso*, Roma 1993.

### Articolo in rivista
`N. Cognome, Titolo dell'articolo, «Titolo della Rivista», numero, eventuale fascicolo (anno), pp. iniziale-finale.`

> V. Righini, *Un bollo laterizio da Palazzo Pignano (Cremona)*, «Epigraphica», 57 (2005), pp. 506-508.

- Abbreviazioni delle riviste secondo l'**Année Philologique**
  (siglario: <http://www.aristarchus.unige.net/CIAPh/it-IT/Database/Siglario>).
- Rivista non recensita → titolo per esteso.

### Articolo in miscellanea di studi
`N. Cognome, Titolo dell'articolo, «Titolo della miscellanea», a cura di N. Cognome, Luogo Anno, pp. iniziale-finale.`

> L. Braccesi, *La tradizione augustea delle Alpi claustra Italiae e la sua proiezione ideologica*, «Problemi di politica augustea. Atti del convegno di studi, St. Vincent 25-26 maggio 1985», a cura di M. Vacchina, Aosta 1986, pp. 36-49.

### Voce di enciclopedia
`N. Cognome, Titolo della voce, in ABBREV vol[, tomo], Luogo Anno, cc. iniziale-finale.`

> O. Seeck, *Datianus*, in RE IV, 2, Stuttgart 1901, cc. 2226-2227.

### Recensione
`N. Cognome, recensione a <opera citata come monografia>, «Titolo della Rivista», numero (anno), pp. iniziale-finale.`

> E. Weber, recensione a H. Schulze-Oben, *Freigelassene in den Städten des römischen Hispanien*, Bonn 1989, «Tyche», 7 (1992), pp. 258-259.

## Stato del corpus (censimento 29 ago 2026)

- `<bibl>` totali: **1142** · diciture distinte: **1113** · schede: 295.
- Le voci sono in gran parte nella forma inglese ereditata da Lane (CMRDM):
  `O. Kern, Die Inschriften von Magnesia am Mäander, Berlin, 1900, pp. 143-4, no. 227`.
- Conversione allo stile qui descritto: da fare **manualmente per famiglia**
  dal pannello Bibliografia (find/replace in blocco), non automatica.

### Normalizzazioni sicure già approvate

1. **Virgola dopo `Lane`** — `Lane I, p. …` → `Lane, I, p. …` (5 voci).
2. **`pp.` + cifre piene nei range** — `p. 26-27` → `pp. 26-27`,
   `p. 43-4` → `pp. 43-44` (~25 voci in tutto il corpus).

### Riferimenti abbreviati `op. cit.` / `loc. cit.`

173 voci `<bibl>` rimandano con `op. cit.`/`loc. cit.`/`idem` a un'opera citata
per esteso altrove. Scioglimento completo (dal PDF di CMRDM I) in
[opere-citate-lane.md](opere-citate-lane.md) e
[opere-citate-lane.csv](opere-citate-lane.csv).

**FATTO 2026-08-30** — 148 di quelle voci (26 famiglie con scioglimento sicuro)
sciolte in forma estesa direttamente sul repo dati (`Gregoee2002/ILA`, 79 commit
via API). Coda conservata e normalizzata: `col.`→`c./cc.`, cifre piene nei range,
`no.`→`n.`, `nos.`→`nn.`. Restano da fare: Anderson, Smirnoff, Roscher, Zingerle,
Fontrier, `idem`, `Lane, I, loc. cit.` (titolo/pagina da verificare sul cartaceo),
e il restyling delle varianti **senza** `op. cit.` delle stesse famiglie
(es. `P. Perdrizet, BCH, XX, 1896, …`, `Drexler, in Roscher, Lexikon…`).

### Da decidere

- Forma della citazione-catalogo Lane, oggi `Lane, CMRDM I 29` (una per scheda,
  uguale al numero di catalogo). Opzioni sul tavolo: invariata / `Lane, CMRDM, I, 29` /
  `CMRDM I 29`.
- `Lane, I, loc. cit.` ×2 → espandere a pagina esplicita, caso per caso.
- `Lydia no. N` vs `Lydia, no. N` (5 vs 2).
