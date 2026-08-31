# Verifiche aperte — bibliografia

Questioni bibliografiche non risolte automaticamente, da riscontrare a mano.
Compagna di [verifiche-classificazione-divinita.md](verifiche-classificazione-divinita.md)
per il pannello **Coerenza**.

Sono **segnalazioni da verificare** (su Lane 1971 = CMRDM I, o su L'Année
Philologique) e poi da correggere sullo XML. Nessuna è risolta.

> Ricordarsi: ogni correzione allo XML va **rispecchiata anche sul repo dati
> `Gregoee2002/ILA`** (cartella `corpus/`), non solo su `ILA---INTERFACE`,
> altrimenti la sincronizzazione al boot la annulla.

Stato: **aperto** — aggiornato 2026-08-31.
Contesto: [norme-bibliografia.md](norme-bibliografia.md) §"Restano fuori (4 voci)".

---

## 1. `Lane, AS, XX, 1970` — attribuzione Lane o Levick? (ILA-021)

- Voce nel corpus: `<bibl>Lane, AS, XX, 1970, pp. 51-52 and Pl. VIb</bibl>` (ILA-021).
- Il revisore ILA, nel commento della scheda, la dà a **Lane** («Lane, AS XX,
  1970, pp. 51-52 = CMRDM I p. 19, no. 28… rectius p. 32, tav. VIb»).
- Ma nell'OCR del PDF di CMRDM I (riga 5661) compare **«Levick, AS, XX, 1970,
  pp. …»** — e nel corpus esiste già la famiglia `B. Levick, «AS» 17 (1967)`
  (Dedications to Men Askaenos). «Anatolian Studies» 20 (1970) potrebbe quindi
  essere di **B. Levick**, non di E. Lane.
- **Da fare**: controllare sul fascicolo «AS» 20 (1970) chi firma l'articolo a
  p. 51-52; poi rendere `<autore>, [titolo], «AS» 20 (1970), pp. 51-52 and Pl. VIb`.

## 2. `Lane, I, p. 140` / `Lane, I, p. 141` — qui «Lane I» = il libro CMRDM I (ILA-243, ILA-247)

- Voci nel corpus:
  - ILA-243: `<bibl>Sarà trattata a lungo in un articolo di prossima
    pubblicazione di Barbara Levick (Lane, I, p. 140)</bibl>`
  - ILA-247: `<bibl>Inedita (Lane, I, p. 141: "Unpublished")</bibl>`
- Tutte le altre ~200 occorrenze di `Lane, I, p. N` sono state sciolte come
  l'**articolo** *A re-study of the god Men. I*, «Berytus» 15 (1964), pp. 5-58.
  Ma p. 140-141 è **fuori** da quell'articolo: qui `Lane I` = il **volume**
  `E. Lane, Corpus Monumentorum Religionis Dei Menis (CMRDM). I: The Monuments
  and Inscriptions, Leiden 1971` (pagine di discussione).
- **Da fare**: sciogliere queste 2 voci come rimando al volume, es.
  `E. Lane, … CMRDM. I …, Leiden 1971, p. 140` / `… p. 141`, mantenendo la
  cornice italiana della scheda («Sarà trattata…», «Inedita»).

---

### Nota (non un problema)

`Petzl, Beichtinschr. 38 (in: …)` (ILA-294): lasciata volutamente invariata su
indicazione del curatore.
