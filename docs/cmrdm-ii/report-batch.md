# Batch B01 — 22 entry

Pharnaceia 1; Gangra-Germanicopolis 1; Bithynium-Claudiopolis 1;
Juliopolis 1-17; Elaia 1-2.

- entry codificate: 22 (22 file XML, tutti `xmllint --noout` puliti)
- lint.py: **FATAL 0, ERROR 0, WARNING 2** (attesi)

Revisione del 2026-09-21 dopo le tre decisioni del coordinamento: applicate
la nuova regola sui copricapi e la regola sulla legenda dentro la prosa;
il falso positivo su `Pl. XXXI` è stato corretto nello script di lint.

## I due WARNING residui

- `CMRDM-II-PHARNACEIA-1`, `CMRDM-II-ELAIA-2`: «senza origDate».
  Corretto: l'obverso è Men (Pharnaceia) e il Senato (Elaia 2), quindi per
  contratto niente `origDate` né `num:authority`.

## Senza peso

- `CMRDM-II-JULIOPOLIS-9` — `Weight: unavailable`. Resta il solo
  `<num:specimen rend="illustrated">` con `<num:collection>Adana</num:collection>`
  (Lane dà `Illustrated example: Adana`).

## Senza bibliografia oltre a Lane

- `CMRDM-II-JULIOPOLIS-9` (`Bibliography: none`)
- `CMRDM-II-ELAIA-2` (`Bibliography: none`)

## Legende da ritrascrivere (OCR insufficiente) — faccia OMESSA

In tutti questi casi il ri-OCR Tesseract `grc` **non ha prodotto greco**:
ha lasciato passare la stessa riga mojibake del livello di testo del PDF.
Il `<div subtype="face" n="obv">` è stato omesso del tutto (non dichiarato
anepigrafe).

- `CMRDM-II-JULIOPOLIS-4` obv — `Au. K. A. ~E:7t"t'. ~E:U~pO~ IT. ~.`
  (Settimio Severo; lettura probabile ma non verificabile)
- `CMRDM-II-JULIOPOLIS-5` obv — `Au. A. ~E:7t"t'L. ~E:OU~pO~ ITE:.`
- `CMRDM-II-JULIOPOLIS-7` obv — `M. Aop. 'AV't"WVLVOC;; K.`
- `CMRDM-II-JULIOPOLIS-10` obv — `M. Aup. ~e:u. 'AM~rlvop0C; Auy.`
- `CMRDM-II-PHARNACEIA-1` rev — legenda dentro la prosa del `Rev.`, non in un
  campo `Inscription:`. Applicata la nuova regola del BRIEF §«Legenda dentro
  la prosa»: **verificato l'OCR greco della pagina 17 e NON conferma**. Il
  Tesseract `grc` non ha prodotto greco per questa riga: ha ricopiato il
  mojibake `<l>apvaxE(Uv` (le uniche righe greche della pagina 17 sono quelle
  di Gangra-Germanicopolis 1 e Bithynium-Claudiopolis 1). La faccia `rev`
  resta quindi **fuori** dall'edizione, e nell'`<ica:note>` la prosa di Lane
  porta `[…]` al posto della legenda.
  È con ogni probabilità Φαρνακείων (etnico della zecca), ma serve una
  ritrascrizione della pagina 17, non una congettura.

Queste 5 facce vanno ritrascritte dalle pagine PDF 18-21 e 17.

## Legende ricostruite incrociando OCR greco e mojibake — da verificare

- `CMRDM-II-JULIOPOLIS-16` obv: scritto `Που. Λικ. Οὐαλεριανὸς Σεβ.`
  Il Tesseract dà `Που. Λυως. Οὐαλεριανὸς Σεβ.` (chiaramente corrotto), il
  mojibake dà `TIou. A~x.` → Λικ. (il `~` rende ι in tutto il corpus:
  `B~6uv~E(uv` = Βιθυνιέων). Solo l'abbreviazione `Λικ.` è ricostruita.
- `CMRDM-II-ELAIA-2` obv: `Ἱερὰ Σύγκλητος`. L'OCR dà `Σύγχλητος`;
  corretto χ→κ come confusione di forma.

## Pesi dubbi / normalizzati

Normalizzazioni applicate (risultato sempre plausibile, 3-15 g):

- `I4.28` → 14.28 (Juliopolis 1, Niggeler)
- `II.34` → 11.34 (Juliopolis 2, Aulock)
- `I2.50` → 12.50 (Juliopolis 5, Berlin)
- `lI.46` → 11.46 (Juliopolis 7, Vienna)
- `3.I4` → 3.14 (Juliopolis 11, Vienna)
- `14-32` → 14.32 (Gangra-Germanicopolis 1, Cambridge)

**Dubbio segnalato** — `CMRDM-II-ELAIA-1`: `Weight: 4.6rgr. - 6.29 gr. (Berlin)`.
La `r` sta per `1` (stessa mano d'OCR di `r5.82gr` = 15.82 e `I28c` = 128c
nella stessa pagina), quindi 4.61-6.29 g. La regola di normalizzazione del
BRIEF non elenca `r→1`: ho scritto l'intervallo 4.61-6.29, ma va confermato
sul PDF. Nessuno specimen per 4.61 (Lane non ne dà la collezione); un solo
`<num:specimen>` 6.29 Berlin, `rend="illustrated"`.

Pesi scartati come implausibili: nessuno.

## Specimen senza peso (solo collezione, `rend="illustrated"`)

Casi in cui `Illustrated example:` nomina una collezione diversa da quelle
pesate, come previsto dal BRIEF:

- `CMRDM-II-GANGRA-GERMANICOPOLIS-1`: peso Cambridge 14.32, illustrato Paris
- `CMRDM-II-JULIOPOLIS-4`: peso Scholz 8.55, illustrato Berlin
- `CMRDM-II-JULIOPOLIS-9`: nessun peso, illustrato Adana

## Elementi iconografici NON mappati (restati solo in ica:note)

- `CMRDM-II-BITHYNIUM-CLAUDIOPOLIS-1`: "standing slightly l., **head r.**"
- `CMRDM-II-JULIOPOLIS-5`: "**turning head back**, extending r. hand with
  **stick-like attribute**"
- `CMRDM-II-GANGRA-GERMANICOPOLIS-1`: "sitting **on a stool**"
- `CMRDM-II-JULIOPOLIS-1`: "apparently **wearing earrings**"
- `CMRDM-II-JULIOPOLIS-6`: "**Very womanish appearance.**"
- `CMRDM-II-JULIOPOLIS-7`, `-8`: "**as Augustus**"
- `CMRDM-II-JULIOPOLIS-6`, `-8`: "**young** Caracalla" → reso con
  `feature/youthful`, che c'è; segnalato solo per coerenza fra batch
- `CMRDM-II-PHARNACEIA-1`: "**Eight-pointed** star" (il numero di punte si
  perde: `symbol/star` non ha modificatori)

## Chiavi che sarebbe servito avere nel vocabolario

- `gesture/head_turned` — la `mappatura-campi.md` la prescrive
  («`turning head back` → `@dir` **più** `trait type="gesture"
  key="head_turned"`») ma **non esiste** in `iconographyLabels.ts`, e il
  lint la rifiuterebbe. Serve in Juliopolis 5 e Bithynium-Claudiopolis 1.
  Il coordinamento ha confermato di **non inventarla**: «turning head back» e
  «head r.» restano in `ica:note`. Resta però il disallineamento fra
  `mappatura-campi.md` e il vocabolario, da sanare a monte.
- `dress/earrings` (o `feature/earrings`) — Juliopolis 1.
- un modo per dire "seduto su sgabello" vs "in trono" (Gangra 1).
- `symbol/star` senza indicazione del numero di raggi (Pharnaceia 1).

## Copricapi — regola nuova, applicata

Recepita la decisione del coordinamento (BRIEF righe 209-213):

- `laurel wreath on cap` → `trait headgear/wreath` — **Pharnaceia 1**
  (invariato: era già così).
- `stars on cap` / `starry cap` / `cap ornamented with stars` →
  `trait headgear/star`, non più `lunar/crescent_cap`. **Corrette 6 entry**:
  Juliopolis 1, 4, 6, 7, 10, 14.
- `crescent on cap` → `trait lunar/crescent_cap`: **nessuna occorrenza in
  B01**. Dopo la correzione `crescent_cap` non compare più in nessun file
  del batch.

## Dubbi sulla numerazione o sulla zecca

- **Numerazione**: 18 delle 22 entry portano in testa
  `# ATTENZIONE: numerazione OCR incerta`. La sequenza però è internamente
  coerente e i rimandi di Lane a sé stesso (`Lane, II, p. 15, Juliopolis 4`
  su Juliopolis 10, ecc.) sono a una numerazione **diversa** — quella del
  CMRDM I, non di questo volume. Nessuna incoerenza rilevata nella
  numerazione del CMRDM II: 1-17 per Juliopolis, senza salti.
- `CMRDM-II-ELAIA-1`: la testata di Lane è **«Elaia Aeolidis 1»**, quella di
  Elaia 2 solo «Elaia 2». Ho usato `Elaia` (nome da `mints.tsv`) e
  `num:reference n="Elaia 1"` in entrambe. Se si vuole la testata letterale,
  va cambiato `n` e il `<bibl>` di Lane della sola Elaia 1.
- `CMRDM-II-ELAIA-1` obv: Lane (OCR) legge «Bust of Gordian **r.**, r.» —
  cioè «Gordian III, r.», con il numerale romano sfigurato. La legenda
  `Αὐτο. Κ. Μ. Ἀντ. Γορδιανός` conferma Gordiano III come Augusto. Ho scritto
  `Gordian III` nella nota, in `num:authority` e in `origDate` (0238-0244).
- `CMRDM-II-JULIOPOLIS-7`: Lane descrive «Bust of Caracalla, r., **as
  Augustus**» ma la legenda mojibake finisce in `K.` (= Καῖσαρ). La legenda
  è comunque omessa (illeggibile); datato come Augusto, 0198-0217, secondo
  la prosa di Lane.
- `CMRDM-II-JULIOPOLIS-13`: autorità `Maximus`, Cesare di Massimino
  (0235-0238 da `regnanti.tsv`), confermato dalla legenda `... Μάξιμος Κ.`

## Interventi minori sulla bibliografia

- `no.` → `n.`, `PI.` → `Pl.` ovunque (come da BRIEF).
- `no. I` → `n. 1`, `no. I I` → `n. 11`, `PI. LXIV, I I` → `Pl. LXIV, 11`
  (slot numerico, scambio I/1 certo).
- `BMC Pantus` → `BMC Pontus` (Juliopolis 11).
- `Miinsterberg` → `Münsterberg` (Juliopolis 7, 8).
- `Lane, II, P. 16` → `p. 16` (Juliopolis 15).
- `CMRDM-II-JULIOPOLIS-17`: Lane stampa `Drexler, col. 2693` **due volte**
  (prima e ultima voce). Trascritto una sola volta.
- Lasciati come stampati, perché non verificabili: `Recueil, I, 1 2` (=
  Recueil I,1², Pharnaceia 1 e Gangra 1), `Kraft, Pl. 106, n. 0`
  (Juliopolis 16 — `0` sospetto, le tavole di Kraft usano lettere).
# Batch B02 — 29 entry

Magnesia on the Maeander 1-9; Priene 1-7; Bageis 1-3; Gordus-Julia 1-8;
Maeonia 1-2.

- entry codificate: 29 (29 file XML, tutti `xmllint --noout` puliti)
- lint.py sui file B02: **FATAL 0, ERROR 0, WARNING 5** (tutti attesi)

## I 5 WARNING residui

«senza origDate»: `BAGEIS-1`, `BAGEIS-2`, `GORDUS-JULIA-1`, `PRIENE-1`,
`PRIENE-2`. Corretto per contratto: l'obverso è Men (Bageis 1-2), il Senato
(Gordus-Julia 1), il filosofo Bias (Priene 1-2). Niente `origDate`, niente
`num:authority`.

## Legende da ritrascrivere (OCR insufficiente) — faccia OMESSA

Il Tesseract `grc` non ha prodotto greco per queste righe: ha ricopiato lo
stesso mojibake del livello di testo del PDF. Il `<div subtype="face">` è
omesso del tutto (non dichiarato anepigrafe).

- `MAGNESIA-1` obv — `M. Aup. 'Anwve:r:vo~` (= Μ. Αὐρ. Ἀντωνεῖνος, non verificabile)
- `MAGNESIA-5` obv — `Au't". K. r. OUY). MCX~Lf.L€LVOC;`
- `MAGNESIA-6` obv — `Au't". K. r. OUY). MCX~Lf.LdvoC;` (stessa legenda di Magnesia 5)
- `PRIENE-1` obv — `BLoct:; counterclockwise` (= Βίας)
- `PRIENE-2` obv — `BLIXt; clockwise` (= Βίας)
- `PRIENE-5` obv — `Nou. Tau. H. Mw. ATIJ,!ou. Me:. TpA.`
- `PRIENE-6` obv — `At)'!. K. no. ALX. OUAe:PLIXV6c;` (= Αὐτ. Κ. Πο. Λικ. Οὐαλεριανός;
  stessa legenda di Juliopolis 16 in B01, dove però il Tesseract aveva reso
  parte del greco. Qui no: omessa.)
- `GORDUS-JULIA-5` obv — `Au A. Aup. K6[Lo~0c;` (= Αὐ. Λ. Αὐρ. Κόμοδος)
- `BAGEIS-3` obv — `Au. Roc. ITo. ALX. rOCAAL'Y)v6c;` (= Αὐ. Κα. Πο. Λικ. Γαλλιηνός)

Da ritrascrivere dalle pagine PDF 24, 26, 27, 28, 29, 31, 33.
Il nome di Bias non è reso in greco dal Tesseract in **nessun** punto delle
pagine 27-28: per Priene 1-2 non c'è alcun appoggio, quindi la faccia è omessa
in entrambe.

## Legende ricostruite incrociando OCR greco e mojibake — da verificare

- `PRIENE-2` rev: scritto `Πριηνέων`. Il Tesseract non rende questa riga, ma la
  stessa stringa mojibake (`IIp~'Y)vewv`) è resa `Πριηνέων` nelle righe vicine
  della stessa pagina 28 (Priene 1 e Priene 3) e della pagina 29 (Priene 4).
- `MAEONIA-1` obv: scritto `Νέρων Καῖσαρ`. Il Tesseract non rende questa riga,
  ma rende la stessa stringa mojibake (`N epwv Koc~O"ocp`) come `Νέρων Καῖσαρ`
  su Maeonia 2, **nella stessa pagina 34**.
- `PRIENE-6` rev: Tesseract `ἊἜἘπ᾿ ἀρχ. ᾽ΙἼουλ. Σιατορνείνου Πριηνέων` →
  scritto `Ἐπ᾿ ἀρχ. Ἰουλ. Σατορνείνου Πριηνέων` (tolto il rumore iniziale,
  tolta la ι intrusa in Σιατορνείνου: confermato da Priene 7 e dal mojibake
  `~1X'!OpVe:Lvou`).
- `PRIENE-7` rev: Tesseract `[΄. Ἰουλ.` → scritto `Γ. Ἰουλ.` (il mojibake dà
  `r.` = Γ).
- `GORDUS-JULIA-3` obv: Tesseract `Δακιυκός` → `Δακικός` (υ intrusa;
  Gordus-Julia 2, identica legenda, dà `Δακικός`).
- `GORDUS-JULIA-3` rev: Tesseract `ΤΓορδηνῶν ᾿Ιουλιξων ΠΡ` →
  `Γορδηνῶν Ἰουλιέων ΠΡ` (Τ iniziale spuria; ξ per έ).
- `GORDUS-JULIA-1` obv: Tesseract `Σύγχλητος` → `Σύγκλητος` (χ→κ, come già in
  Elaia 2 del batch B01).
- `GORDUS-JULIA-8` obv: Tesseract `Μαχρεῖνος` → `Μακρεῖνος` (stesso χ→κ).
- `PRIENE-4` obv: Tesseract `Σευῆρα` → scritto `Σευήρα`. Perispomeni per
  ossia: con α finale lunga il circonflesso sulla penultima è impossibile.
  Applicata la regola del BRIEF sul perispomeni mal letto.
- `MAGNESIA-4` rev: Tesseract `᾿Δρτέμιδος` → `Ἀρτέμιδος` (Δ per Α).
- `MAGNESIA-2`/`-3` rev: Tesseract `Β'ασσου` → `Βάσσου`.
- `MAGNESIA-7`/`-8` obv: `Γι. Οὐη. Μάξιμος (Καῖσαρ)`. Sia il Tesseract sia il
  mojibake (`rL.`, `r~.`) danno `Γι.`; su Priene 3 la stessa formula è invece
  `Γ. Ἰ. Οὐη.`. Non ho uniformato: ho scritto quello che l'OCR dà entry per
  entry. **Da controllare sul PDF se `Γι.` è una vera abbreviazione o `Γ. Ἰ.`
  con il punto perso.**

## Pesi normalizzati

Tutti con risultato plausibile (2-25 g):

- `MAGNESIA-1`: `r5.82gr.` → 15.82 (Paris). `r→1`, la stessa mano d'OCR
  segnalata da B01 su Elaia 1.
- `MAGNESIA-4`: `ILI2gr.` → **11.12** (Paris). Vedi sotto, caso dubbio.
- `PRIENE-2`: `S.IO` → 5.10.
- `PRIENE-4`: `9.r8 gr.-ro.99 gr.` → 9.18-10.99.
- `PRIENE-5`: `II.37` → 11.37.
- `PRIENE-7`: `IO.99` → 10.99.
- `BAGEIS-1`: `2.5I` → 2.51.
- `GORDUS-JULIA-1`: `4.9I` → 4.91.
- `GORDUS-JULIA-4`: `IO.55` → 10.55.
- `GORDUS-JULIA-5`: `9.2I` → 9.21; `I2.2I` → 12.21.
- `GORDUS-JULIA-6`: `I9.22` → 19.22; `20.I3` → 20.13.

Pesi scartati come implausibili: nessuno.

## Pesi dubbi — segnalati al coordinamento

- **`MAGNESIA-4`**: `Weight: ILI2gr. (Paris)`. Qui manca del tutto il punto
  decimale: `I`,`L`,`I`,`2` → cifre 1,1,1,2. L'unica lettura plausibile in
  grammi per Magnesia (4-19 g nelle altre otto entry) è **11.12**; 111.2 e
  1.112 sono fuori scala. Scritto 11.12, **da confermare sul PDF**: è l'unico
  peso del batch in cui ho ricostruito anche il separatore.
- **`BAGEIS-3`**: `19.88 gr. (London) - 35.12 (Weber)`. Il 35.12 sfora di poco
  la banda 0,5-35 g del BRIEF, ma le cifre sono nette nell'OCR (nessuna
  normalizzazione applicata) e si tratta di un grosso bronzo di alleanza
  Bageis-Temenothyrae sotto Gallieno, formato in cui pesi del genere sono
  reali. Lasciato com'è.
- **`MAEONIA-1`**: `Weight: 2.49 gr.-3.17 gr. (Paris)`. Due pesi ma **una sola
  collezione** citata, per entrambi gli estremi. Reso come intervallo sul tipo
  + un solo `<num:specimen rend="illustrated">` con la sola
  `<num:collection>Paris</num:collection>` (Lane dà `Illustrated example:
  Paris`). Non ho creato due specimen Paris distinti.
- **`GORDUS-JULIA-5`**: Lane scrive `(Cop.)` per il peso e `Copenhagen` per
  l'esemplare illustrato. Ho normalizzato a `Copenhagen` in
  `<num:collection>`, fondendo i due in un solo specimen.
- **`GORDUS-JULIA-7`**: `Weight: 9.59 (Berlin-pierced)`. Peso in specimen
  Berlin; «pierced» in `<num:note>`.

## Senza peso

Nessuna entry priva di peso. Cinque hanno solo l'intervallo, senza peso per
singolo pezzo (`examples known to Regling`): `PRIENE-1`, `PRIENE-2`,
`PRIENE-4`, `PRIENE-5`, e `MAEONIA-1` (un solo luogo di conservazione). In
tutte, la formula di Lane sta in `<num:note>` e l'esemplare illustrato è uno
`<num:specimen rend="illustrated">` con la sola `<num:collection>`.

`PRIENE-6` ha l'esemplare illustrato **senza** `rend="illustrated"`: Lane dice
che l'illustrazione è «a composite of Berlin rev. with a Copenhagen coin having
same obv. die», cioè non un pezzo solo. Lo specimen Berlin resta senza `rend` e
la frase di Lane sta in `<num:note>`.

## Senza bibliografia oltre a Lane

- `CMRDM-II-MAGNESIA-9` (`Bibliography: none`)
- `CMRDM-II-GORDUS-JULIA-4` (`Bibliography: none`)

## Elementi iconografici NON mappati (restati solo in ica:note)

- `MAGNESIA-1`: "**thyrsus** (spear?) in r. hand" e "a **thyrsus entwined by a
  snake**" — nessuna chiave. Reso solo `held_object/torch`.
- `MAGNESIA-3`: "**thyrsus** (spear?) in his l. hand" e "**thyrsus with snakes
  (ribbons?)** in the field" — reso solo `held_object/patera`.
- `MAGNESIA-6`: "**flaming** altar" (l'attributo del fuoco si perde).
- `MAGNESIA-8`: "a patera(**?**) over an altar (**?**)" — codificati patera e
  altare, la riserva di Lane resta in nota (i `trait` non hanno `@cert`).
- `BAGEIS-1`, `BAGEIS-2`: "**Humped** bull", "**border of dots**",
  "head turned to face viewer" / "facing viewer".
- `BAGEIS-3`: "Men **on l. of coin**", "Tyche **on r. of coin**", "with
  **kalathos**, **rudder**", "the two divinities **face each other**". Non ho
  messo `@dir` su nessuna delle due: ricavarlo da «face each other» sarebbe
  un'inferenza.
- `GORDUS-JULIA-6`: "lions at feet, **facing away from him**".
- `MAGNESIA-2`, `MAGNESIA-4`: "Men **as on preceding coin**" / "Men **as on
  Magnesia 1 and 2, left-right reversed from Magnesia 3**". Codificata la sola
  `<ica:figure type="deity" key="Men"/>` senza tratti né `@dir`: la descrizione
  è per rinvio e non contiene attributi propri.

## Chiavi che sarebbe servito avere nel vocabolario

- `held_object/thyrsus` — serve in Magnesia 1 e 3, dove è l'attributo
  **principale** della figura (Lane lo dà come lettura primaria, con «spear?»
  come alternativa). Oggi il tipo di Magnesia resta descritto a metà.
- `held_object/snake` o `symbol/snake` — Magnesia 1 e 3.
- `held_object/kalathos`, `held_object/rudder` — Bageis 3 (attributi canonici
  di Tyche; serviranno di sicuro anche altrove nel corpus).
- `gesture/head_turned` — già segnalata da B01; serve in Bageis 1 e 2
  («head turned to face viewer», «facing viewer» su un animale).
- `feature/humped` o un modo per qualificare il toro gibbuto — Bageis 1-2.
- `dress/aegis` — Bageis 3 (reso oggi con `portrait/cuirassed_bust` come da
  BRIEF, ma l'egida non è una corazza).
- un `@rel` per «sul lato sinistro/destro del campo» (Bageis 3): `in_field`
  non distingue i due lati, `flanking` dice un'altra cosa.

## Dubbi sulla numerazione o sulla zecca

- **Numerazione**: coerente e senza salti in tutte e cinque le zecche
  (Magnesia 1-9, Priene 1-7, Bageis 1-3, Gordus-Julia 1-8, Maeonia 1-2). I
  rimandi interni di Lane (`Lane, II, p. 16, Magnesia 4` dentro Magnesia 1)
  sono alla numerazione del CMRDM I, non di questo volume: non contraddicono
  nulla. Le quattro testate marcate `# ATTENZIONE: numerazione OCR incerta`
  (Magnesia 1, Priene 1, Bageis 1, Gordus-Julia 1) sono i primi numeri di ogni
  zecca e sono confermati dalla sequenza successiva.
- **`CMRDM-II-MAGNESIA-*`**: la testata di Lane per la prima entry è
  «Magnesia on the M aeander 1», poi «Magnesia 2», «Magnesia 3»… Ho usato
  ovunque il nome di `mints.tsv` (`Magnesia on the Maeander`) in
  `origPlace`/`num:mint`/titolo, e la forma breve `Magnesia n` in
  `num:reference` e nel `<bibl>` di Lane, per uniformità con le altre otto.
  Stessa scelta fatta da B01 su Elaia.
- **`CMRDM-II-BAGEIS-3`**: è una **moneta di alleanza Bageis-Temenothyrae**.
  La schedo sotto la sola zecca di Bageis, come fa Lane; Temenothyrae compare
  nella legenda e nel commento. Se il coordinamento vuole un secondo
  `num:mint`, va deciso a monte (per ora `mints.tsv` ha le due zecche separate
  e la entry sta solo sotto Bageis).
  La riga di Lane «Alliance coin of Bageis and Temenothyrae», che sta prima di
  `Obv.:` e non appartiene a nessuna faccia, è finita in
  `<div type="commentary">` benché non ci sia un campo `Remarks:`.
- **`CMRDM-II-PRIENE-7`**: la legenda del dritto è `Σαλων. Χρυσογένης` —
  Salonina più un nome di magistrato sul dritto, cosa insolita. Trascritta
  come la dà il Tesseract, che qui è pulito.
- **`CMRDM-II-BAGEIS-1`/`-2`**: l'etnico sta sul **dritto** su Bageis 2
  (Βαγηνῶν) e sul **rovescio** su Bageis 1, mentre il dritto di Bageis 1 porta
  Καισαρέων. Non è un errore di attribuzione delle facce: è quello che Lane
  stampa.

## Interventi minori sulla bibliografia

- `no.` → `n.`, `nos.` → `n.`, `PI.` → `Pl.` ovunque.
- `no. I` → `n. 1`, `no. I I` → `n. 11`, `no. I55b` → `n. 155b` (slot numerico,
  scambio I/1 certo).
- `Z. fur N., IS, p. 76` → `15` (Magnesia 3): confermato da Magnesia 4, che
  cita `Z. fur N., 15, p. 77`. Reso anche `fur` → `für`.
- `p. I28c`, `p. I28b` → `p. 128c`, `p. 128b` (Magnesia 1 e 4).
- `Imhoof, Kl, M.` → `Kl. M.` (Bageis 2); `Imhoof, KI. M.` → `Kl. M.`
  (Priene 5).
- Lasciato come stampato, perché non verificabile: `Roscher, pp. 127-8, a`
  (Magnesia 3) e `BMC Lydia, p. 97, Gordus-Julia 41` (Gordus-Julia 8, dove il
  «41» non è un numero di pagina né, apparentemente, di entry).
# Batch B03 — 24 entry (Nysa 1-24, Lydia)

- entry codificate: 24 (CMRDM-II-NYSA-1 … CMRDM-II-NYSA-24)
- lint: 0 FATAL, 0 ERROR, 1 WARNING (Nysa 1, «senza origDate»: corretto, il
  dritto è un busto di Men, non un ritratto imperiale)

## senza peso
- Nysa 21 (`Weight: unavailable`, `Illustrated example: none`): nessun
  `num:weight`, nessun `num:specimen`, nessun `facsimile` (Lane non dà tavola)

## senza bibliografia oltre a Lane
- Nysa 8 (`Bibliography: none`)
- Nysa 17 (`Bibliography: none`)

## legende da ritrascrivere (OCR insufficiente): faccia OMESSA
Il ri-OCR Tesseract non ha reso queste righe in greco; resta solo il mojibake
del livello di testo del PDF. Il `div` di quella faccia non è stato scritto.

- **Nysa 16, dritto** — mojibake `Au K. M. Aup. 'Av'rcuve:Lvo~`
  (lettura provvisoria, NON codificata: `Αὐ Κ. Μ. Αὐρ. Ἀντωνεῖνος`)
- **Nysa 17, dritto** — mojibake `Au. K. M. Aup. 'AV't'CJ)VEi:VO<;`
  (lettura provvisoria: `Αὐ. Κ. Μ. Αὐρ. Ἀντωνεῖνος`)
- **Nysa 18, dritto** — mojibake `Au. K. M. Aup'Y). 'Av't'CJ)vEi:voc;`
  (lettura provvisoria: `Αὐ. Κ. Μ. Αὐρη. Ἀντωνεῖνος`)
- **Nysa 24, rovescio** — mojibake
  `'E7tl yp. M. Aup. EUTUXOU W "Icpco\loc; NU(J(Xsco\l`
  (lettura provvisoria: `Ἐπὶ γρ. Μ. Αὐρ. Εὐτύχου ? Ἱέρωνος Νυσαέων`; il
  gruppo reso `W` non è interpretabile)

## legende ricostruite per parallelo (codificate, da confermare)
Tesseract non ha reso la riga nella pagina di questa entry, ma la **stessa
identica stringa mojibake** è resa in greco da Tesseract in un'altra entry
dello stesso batch. Segnalate perché la ricostruzione non è di prima mano.

- Nysa 1, rovescio `Νυσαέων` (legenda dentro la prosa, «The word … within a
  wreath»); parallelo: Nysa 2 rovescio
- Nysa 3, dritto `Νέρων Καῖσαρ`; parallelo: Nysa 2 dritto
- Nysa 9, dritto `Ἀ. Κ. Μ. Αὐρ. Ἀντωνεῖνος Σεβ.`; parallelo: Nysa 7 dritto
- Nysa 12, rovescio `Ἐπὶ γρ. Αὐρ. Διοδότου Νυσαέων`; parallelo: Nysa 14
  rovescio (Lane annota «with variations in spelling», riportato in `ica:note`)

## letture greche incerte dentro legende codificate
- **Nysa 11, rovescio**: `Ἐπὶ στ. Κρατικοῦ <gap/> Νυσαέων`. Tesseract legge
  `᾿Επὶ στ. Ἱζρατικοῦ ..... Νυσαέων`, il livello PDF `KPIX't"LXOU`: il nome è
  stato normalizzato in `Κρατικοῦ`. I cinque punti di Lane sono resi
  `<gap reason="lost" extent="unknown" unit="character"/>`.
- **Nysa 9, rovescio**: Tesseract dà `ΔΑὐρ.` e `Νυσαξων`; normalizzati in
  `Αὐρ.` e `Νυσαέων` sulla scorta di Nysa 14 (stessa legenda).
- **Nysa 6, rovescio**: Lane stampa `Καμαρείτης Νυσαέων ( ?)`. Il testo è
  codificato senza il punto interrogativo; il dubbio di Lane è dichiarato in
  `ica:note`.
- **Nysa 7, dritto**: Tesseract dà `ΑἾνρ.`, normalizzato in `Αὐρ.` sulla
  scorta del livello PDF (`A'up.`) e di Nysa 9.

## pesi: normalizzazioni OCR applicate (tutte plausibili, nessuna scartata)
- Nysa 3: `I2.67` → 12.67; `I3.32` → 13.32
- Nysa 4: `I4.63` → 14.63; `2o.7I` → 20.71
- Nysa 10: `8-49` → 8.49
- Nysa 16: `33.5I` → 33.51
- Nysa 18: `I1.49` → 11.49; `I3.42` → 13.42
Nessun peso è stato scartato come implausibile.

## pesi/esemplari da guardare
- **Nysa 15**: `Weight: 3.29 gr.` senza collezione, `Illustrated example:
  Oxford`. Per non attribuire d'ufficio il peso a Oxford ho scritto **due**
  `num:specimen`: uno con il solo peso, uno con la sola collezione Oxford e
  `rend="illustrated"`. Se si accerta che il pezzo pesato è quello di Oxford,
  vanno fusi.
- **Nysa 4**: `Illustrated examples: Paris and Cambridge` (due esemplari
  illustrati). `rend="illustrated"` è su entrambi; Cambridge non ha peso e ha
  il solo `num:collection`.
- **Nysa 18**: Lane scrive `(Cop)` nel peso e `Copenhagen` nell'illustrato:
  normalizzato a `Copenhagen` in entrambi.
- Collezioni citate senza peso proprio e rese come specimen di sola
  collezione: Nysa 1 (Berlin), Nysa 2 (Copenhagen), Nysa 4 (Cambridge),
  Nysa 12 (London), Nysa 16 (Weber). «Weber» è una collezione privata, non
  un museo: resa comunque come `num:collection`.

## elementi iconografici NON mappati (restati solo in ica:note)
- Nysa 12: "standing facing each other and shaking hands" — il gesto di
  *dextrarum iunctio* non ha chiave; nemmeno l'orientamento «facing each
  other» è rendibile con `@dir` (`facing` significa *di fronte allo
  spettatore*), quindi le due figure imperiali sono senza `@dir`.
- Nysa 19: "with mural crown" e "bunch of grapes"
- Nysa 21: "bunch of grapes"
- Nysa 22: "with mural crown" e "bunch of grapes in r."
- Nysa 13: "hexastyle" (il tempio è reso `symbol/temple` con `rel="around"`)
- Nysa 18: "tetrastyle" e "with arch over head"
- Nysa 1: "There exist variations in letter-forms"; Nysa 2 "Variations exist
  in letter forms"; Nysa 12 "with variations in spelling" — note sulla
  legenda, non elementi figurativi: conservate in `ica:note`.
- Nysa 2, 3: "counterclockwise"; Nysa 3: "counterclockwise and vertically" —
  disposizione della legenda, in `ica:note`, non nell'edizione.

## chiavi che sarebbe servito avere nel vocabolario
- `headgear/mural_crown` (corona murale di Tyche) — Nysa 19, 22
- `held_object/grapes` (grappolo d'uva) — Nysa 19, 21, 22
- `gesture/handshake` o `dextrarum_iunctio` — Nysa 12
- una chiave-figura `Tyche`: usata come `@key` di `ica:figure` (Nysa 19, 21,
  22) ma assente da `iconographyLabels.ts`, che ha solo `Nike`, `Attis`,
  `Helios`, `Men`. Il lint non controlla le chiavi-figura, quindi non segnala
  nulla, ma la resa nell'interfaccia sarà priva di etichetta.
- `symbol/temple` esiste; manca il modo di dire «dentro il tempio»: ho usato
  `rel="around"`, che è l'approssimazione meno falsa fra quelle disponibili.
- `held_object/Men` (statuetta di Men in mano a Tyche): la chiave `Men`
  esiste, ma è pensata come chiave-figura; usarla come `@key` di un
  `held_object` è coerente con il precedente `Nike` (statuetta) del template,
  però vale la pena registrarlo.

## dubbi sulla numerazione o sulla zecca
- **numerazione OCR incerta** (flag `# ATTENZIONE` nel .txt, da verificare sul
  PDF): Nysa 10, 11, 12, 13, 14, 15, 16, 17, 18, 19. Le testate greche
  corrispondenti nel ri-OCR sono deformate (`Νγ γα ὃ`, `Νγϑβα τό`, `Νγβα 1`),
  ma la sequenza dei numeri è continua e coerente con l'ordine delle tavole
  (VII → VIII → IX), quindi la numerazione è stata mantenuta com'è.
- **Nysa 6**: Lane stesso avverte «This may have to be reattributed to
  Gordus-Iulia». La scheda resta sotto Nysa (`origPlace`/`num:mint` = Nysa),
  ma è la sola entry del batch con la zecca messa in dubbio dall'autore. Non
  ho usato `@cert="low"`: il contratto lo prevede solo per *Uncertain, perhaps
  Ancyra*.
- **Nysa 9**: Lane avverte che potrebbe essere una variante di Nysa 14
  (Commodo). Le due schede restano distinte, come in Lane.
- **Nysa 15**: Lane dichiara di non essere convinto dell'attribuzione (misura
  e stile fuori posto in età severiana). `origDate` resta su Elagabalo perché
  è quello che Lane scrive nell'`Obv.`; il dubbio è nel commento. Non ho messo
  `cert="low"`: Lane non scrive «Elagabalus (?)» nel campo del ritratto.
- **Nysa 21**: Lane dice che la moneta «should perhaps be excluded». Scheda
  codificata comunque, con il dubbio in `commentary`.
- **Nysa 22**: la legenda del dritto è `Αὐ. Κ. Ἀλέξανδρος Καῖσαρ`, cioè Severo
  Alessandro *Cesare* (221-222), ma Lane non scrive «as Caesar» nella
  descrizione. Ho quindi usato gli anni di regno da `regnanti.tsv`
  (0222-0235). Da rivedere se il coordinamento preferisce la fase di Cesare.
- **Nysa 12**: due autorità sul dritto. Ho scritto due `num:authority`
  (Marcus Aurelius, Lucius Verus) e un `origDate` sulla correggenza
  (0161-0169).
- **Nysa 5, 6**: Lane dice «as Caesar» per Marco Aurelio: usati gli anni della
  fase di Cesare (0139-0161) come prescrive il contratto. Nysa 7 e 9 dicono
  «as Augustus» → 0161-0180; Nysa 8 e 13 non specificano ma la legenda ha
  Σεβ./Σε. → 0161-0180.
- **Nysa 14**: Commodo, legenda con Σεβ. → 0177-0192 (fase di Augusto).

## scelte di forma da armonizzare fra i batch
- Nel `<title>` il nome dell'autorità è in **italiano** (Nerone, Antonino Pio,
  Marco Aurelio, Lucio Vero, Commodo, Elagabalo, Giulia Maesa, Severo
  Alessandro, Massimino, Massimo), mentre `num:authority/@key` e il testo di
  `origDate` restano nella forma di `regnanti.tsv`. Se gli altri batch usano
  la forma latina nel titolo, va uniformato.
- Bibliografia: normalizzati `no.` → `n.`, `PI.`/`Pl.` → `Pl.`, `Z. fur N.` →
  `Z. für N.`; la riga di Nysa 14 «Regling, Nysa, p. 84, no. 112. Lane II,
  Nysa 9, PI. IV, 2» è stata sdoppiata in due `<bibl>`; quella di Nysa 4
  «Lane, II, Nysa 4 and PI. III, no. 7, III, p. 104, no. 4» e di Nysa 23
  «Lane, II, p. 19, no. 13: III, p. 104, no. 5» sono state tenute in un solo
  `<bibl>` con `;` al posto di `,`/`:` davanti al rimando al vol. III.
# Batch B04 — 19 entry (Nysa 25–43)

- entry codificate: 19 (CMRDM-II-NYSA-25 … CMRDM-II-NYSA-43)
- xmllint: 19/19 well-formed. lint.py sui soli file del batch: FATAL 0, ERROR 0, WARNING 0.

## senza peso
nessuna. Tutte hanno almeno un peso.

## senza bibliografia (oltre a Lane)
- Nysa 34 (`Bibliography: none`)
- Nysa 43 (`Bibliography: none`)

## legende da ritrascrivere (OCR insufficiente)
Il ri-OCR Tesseract `grc` delle pagine PDF 43–50 non ha reso in greco le facce
elencate qui: nel testo resta solo il mojibake del livello PDF. Secondo il
contratto il `<div subtype="face">` è stato **omesso**, non dichiarato
anepigrafe. Fra parentesi il mojibake, per chi ritrascrive dalla pagina.

- Nysa 25, obv — `AUT. K. M. 'An. ropa~(x\lOC; Au.`
- Nysa 26, rev — `N uaoc€wv`
- Nysa 27, obv — `Au't". K. M. 'Av't". rOpaLOCVO~ Auy. (with variations)`
- Nysa 27, rev — `'E7tl yp. Aup. 'AnLxou a' Nuaoc€wv (with variations)`
- Nysa 31, obv — `AUT. K. ITo. ALXLV. OUIXAe:PLIXV6c;`
- Nysa 32, obv — `AUT K. ITo. ALXLV. OUIXAe:PLIXV6c;`
- Nysa 33, obv — `AUT. K. ITo. ALXLV. BIXAe:pLlXv6c;`
- Nysa 34, obv — `MY';. K. IT. ALXLV. BcxAe:pLocv6c;`
- Nysa 34, rev — `'Enl. yp. M. Aup. AOCLOCVOU NuO"ocewv`
- Nysa 35, obv — `AUT. K. ITo. ALXLV. BocAe:pLocv6c;`
- Nysa 36, obv — `AUT. K. ~o. ALXLV. BocAe:pLocv6c;`
- Nysa 38, obv — `AUT. K. ITo. A~. rIXM~1jv6c;`
- Nysa 40, obv — `Mn. K. ITo. Atxwv. fCXMt1Jv6c;`
- Nysa 41, obv — `Au. K. M. Aup. 'AvTwvELvoc;`

Conseguenza notevole: **Nysa 34 non ha nessuna delle due legende** ed esce con
`<div type="edition" xml:space="preserve">` vuoto. Se l'app preferisce
l'assenza del div al div vuoto, va deciso a livello di coordinamento (ho
preferito il div vuoto a un div assente, per non far leggere la scheda come
priva di edizione per scelta).

Facce dichiarate illeggibili **da Lane stesso** (non un problema di OCR): il div
è omesso anche qui.
- Nysa 30, obv — `Inscription: largely illegible`
- Nysa 42, obv — `... OU1JP .... Mcx~ .... (largely effaced)`

## normalizzazioni del greco degne di nota
- Nysa 37, obv: Tesseract legge `ΠΟ. Λυκιν. Γαλλιηνὸς Κι.`; trascritto
  `Πο. Λικιν. Γαλλιηνὸς Κ.` — il mojibake (`ITo. A~x~v. ... K.`) e il
  parallelo di Nysa 39 (`Πο. Λικκιννι.`) danno ι, non υ, e chiudono con `Κ.`.
  **Da verificare sulla pagina.**
- Nysa 39, obv: `Κὶ.` del OCR reso `Κ.` per lo stesso motivo.
- Nysa 43, obv: i puntini di Lane (`.... ᾿Αντωνεῖνος`) resi con
  `<gap reason="lost" extent="unknown" unit="character"/>`.
- Nysa 43, rev: le quadre di Lane rese con `<supplied reason="lost">`; dentro la
  supplita resta il segnaposto di Lane `τοῦ δεῖνα`.
- Nysa 31 e 27: Lane annota `(with variations)` sulla legenda. Non c'è un posto
  nel contratto per questa nota (non è prosa di faccia, non è Remarks): **è
  andata perduta**. Serve una decisione di coordinamento.

## pesi: casi non standard
- Nysa 29 — `Weight: 22.52 gr.` senza collezione, `Illustrated example: Oxford`,
  e Lane parla di «this unique coin»: ho messo peso e `Oxford` nello stesso
  `<num:specimen rend="illustrated">`. Inferenza minima ma è un'inferenza.
- Nysa 35 — `Weight: 8.12 gr.-8.73 gr. (London)` con
  `Illustrated example: Berlin`: intervallo sul tipo, specimen con la sola
  `<num:collection>Berlin</num:collection>` e `rend="illustrated"`, la nota su
  London in `<num:note>` (schema del BRIEF §«examples known to Aulock»).
- Nysa 42 — 49.22 gr. è **fuori** dalla forchetta di plausibilità 0,5–35 g del
  BRIEF, ma la cifra non ha caratteri sospetti all'OCR e si tratta di un
  medaglione di omonoia Nysa/Sparta: peso mantenuto. **Da ricontrollare.**
- Nysa 43 — `17.79 gr. (broken)`, nessuna collezione sulla riga: specimen con il
  solo peso, e `(broken)` in `<num:note>`. La collezione (Institut für
  Numismatik … Wien) resta solo nel commento, perché il «Vienna» abbreviato di
  Lane altrove indica un'altra raccolta e non va confuso.
- Pesi normalizzati dall'OCR: `I7.36`→17.36 (28), `I6.29`→16.29 (30),
  `9.II`→9.11 (32), `II.I9`→11.19 (39). Tutti plausibili.

## elementi iconografici NON mappati (restati solo in ica:note)
- Nysa 25: "Bull's head at feet **under patera**" — la relazione col patera.
- Nysa 29: "as a river-god" — nessuna chiave per l'assimilazione a divinità fluviale.
- Nysa 30: "**hexastyle** temple"; "Coin very badly worn"; il `(?)` sull'identità di Men.
- Nysa 30: "facing each other" dei due busti — nessun `@dir` scritto, perché Lane
  non dice quale busto guarda da che parte.
- Nysa 35, 36, 40: "**kalathos**" di Tyche — nessuna chiave nel vocabolario.
- Nysa 35, 36, 40: la statuetta di Men resa `<ica:trait type="held_object" key="Men"/>`
  sul modello della statuetta di Nike in `mappatura-campi.md`; la nozione
  «statuetta» in sé non è esprimibile.
- Nysa 41: "between **two stags**" — nessuna chiave `stag`/`deer`; anche
  "Ephesian" di Artemide resta in nota.
- Nysa 41, 42: "Men **on r.**", "At **l.**" — posizione nel campo, distinta
  dall'orientamento: non l'ho messa in `@dir` (che resta l'orientamento) e il
  vocabolario `position` ha solo upper/lower_left/right, pensati per i rilievi.
- Nysa 42: "**archaic statue** of Ares" — reso come figura di Ares stante; che
  si tratti di una statua resta in nota.
- Nysa 43: "standing **at** l. / **at** r." — idem, posizione e non orientamento.

## chiavi che sarebbe servito avere nel vocabolario
- `held_object/kalathos` (o `headgear/kalathos`) — ricorre su Tyche, 3 entry.
- `animal/stag` — Nysa 41.
- `Artemis`, `Ares`, `Zeus`, `Tyche` come *figure key*: le ho usate perché il
  lint non controlla `ica:figure/@key`, ma non sono in `iconographyLabels.ts` e
  l'app le mostrerà senza etichetta italiana.
- una nozione per la **posizione nel campo** sinistra/destra distinta da `@dir`
  (`field_left` / `field_right`): serve a 4 entry di questo batch.
- una nozione per «statua / simulacro» (Nysa 42) e per «statuetta tenuta in
  mano» (35, 36, 40).
- `river_god` o un modo di dire l'assimilazione (Nysa 29).

## scelta di codifica da ratificare
"bull's head at feet" (Nysa 25, 28, 31, 32, 33, 38, 42) è stato codificato come
figura accessoria `<ica:figure type="symbol" key="bucranium" rel="at_feet"
relTo="1"/>`: chiavi tutte già esistenti. Il BRIEF però cita «bucranium under
foot» fra gli esempi di ciò che **resta in `<ica:note>`**. La prosa è comunque
integra nella nota, quindi la scelta è reversibile in un verso o nell'altro:
**serve una parola del coordinamento per allineare i batch.**

## dubbi sulla numerazione o sulla zecca
- Nysa 31 e Nysa 41 portano `# ATTENZIONE: numerazione OCR incerta` (l'OCR legge
  `Νγξα 31` e `Νγ γα 41`). Il numero è coerente con la sequenza delle entry
  adiacenti (30 → 32, 40 → 42) e con i rimandi di tavola, ma **non è verificato
  sul PDF**.
- Nysa 42 e 43 sono attribuite da Lane a Nysa con riserva (`Inv. Wadd.`
  attribuiva la 42 a Tabai; per la 43 Lane scrive «The attribution is made with
  due reservation»). La zecca è comunque scritta senza `@cert`, perché la
  testata dell'entry è «Nysa» e il BRIEF riserva `cert="low"` al solo caso
  `UNCERTAIN-ANCYRA`.
- Nysa 30 (busti affrontati di Filippo I e Filippo II): due `<num:authority>` e
  un `origDate` 0247–0249, cioè l'**intersezione** dei due regni di
  `regnanti.tsv`. Se la convenzione di progetto è l'unione (0244–0249), va
  cambiato.

## correzioni bibliografiche applicate (scambi OCR)
`col. 270S`→`col. 2705`; `no. S8`→`n. 58`; `Nysa IS`→`Nysa 15`; `7Sc`→`75c`;
`no. 2II`→`n. 211`; `Pl. la`→`Pl. Ia`; `Plo XIII`→`Pl. XIII`;
`PI. XUI`→`Pl. XIII` (Nysa 41, confermato dal parallelo di Nysa 35);
`N ysa`→`Nysa`; `no.`→`n.`, `nos.`→`nn.`, `PI.`→`Pl.`.
# Batch B05 — 18 entry

Saitta 1-18 (Lydia), pagine PDF 50-57, tavole XIII-XVII.

- entry codificate: 18 (18 file XML, tutti `xmllint --noout` puliti)
- lint.py sui miei file: **FATAL 0, ERROR 0, WARNING 7** (tutti attesi)
- `num:mint ref="http://nomisma.org/id/saitta"` su tutte le 18 (id verificato
  in `mints.tsv`). Regione **Lydia** da Lane, non da Nomisma, che dà Saitta
  «in Phrygia» — segnalato dalla `mappatura-campi.md` §3.

## I 7 WARNING residui

`SAITTA-1..7`: «senza origDate». Corretto per contratto: l'obverso è Zeus
Patrios (1, 2), Roma (3) o Men (4-7). Nessun `origDate`, nessun
`num:authority`.

## Legende da ritrascrivere (OCR insufficiente) — faccia OMESSA

Il ri-OCR Tesseract `grc` non ha prodotto greco per queste righe: ha
ricopiato la stessa riga mojibake del livello di testo del PDF. La faccia è
stata omessa del tutto, non dichiarata anepigrafe.

- `CMRDM-II-SAITTA-4` **obv** — `' A~~o't"'t'YJv6c; (variation in division)`.
  È quasi certamente `Ἀξιοττηνός`, identico a Saitta 5 e 6, che Tesseract
  invece rende; ma per la regola del BRIEF non l'ho scritto. **Recuperabile a
  vista sulla pagina PDF 51 con costo minimo**: è la sola faccia del batch
  che si perde per un puro incidente di ritaglio.
- `CMRDM-II-SAITTA-13` **obv** e **rev** — Lane stampa una legenda già
  frammentaria (`.... KexL. M .... Au. 'Av .....`) e per il rovescio scrive
  `Inscription obscure`. Il `<div type="edition">` resta quindi **vuoto**:
  è l'unica entry del batch senza nessuna faccia nell'edizione. La nota
  `Inscription obscure` è conservata nell'`<ica:note>` del rovescio.
- `CMRDM-II-SAITTA-14` **obv** — `Au". K. M. Aup. 'Anwve:i:vo<;`. Anche qui
  il rovescio è reso da Tesseract ma l'obverso no. Va ritrascritto dalla
  pagina PDF 55/56.

## Legende con interventi da confermare

- `SAITTA-5` rev: Tesseract dà `Σαιττηνῶν “λλος`; la prima lettera del nome
  è caduta. Scritto **`Σαιττηνῶν Ὕλλος`**, sulla scorta della prosa di Lane
  («River god Hyllos») e del mojibake `rlYAAO~`. Unico restauro di lettera
  del batch.
- `SAITTA-2` / `SAITTA-3` rev: Tesseract legge `Ὄκτα.` in Saitta 2 e `᾽Οχτα.`
  in Saitta 3, per la stessa formula. Normalizzato a **`Ὄκτα.`** in entrambe
  (nome latino Octavius; χ/κ è confusione di forma).
- `SAITTA-12` rev: Tesseract dà `Σαυττηνῶν`, il mojibake `~exL"""IJV(;)V`
  → corretto in `Σαιττηνῶν` (υ/ι di forma).
- `SAITTA-15` rev: `ἹῬουφείνου` → `Ῥουφείνου` (spirito doppio dell'OCR).
- `SAITTA-8` rev: `Ἐπὶ Φλ. Ἡρκλανου Σαιττηνῶν`. **Il genitivo resta senza
  accento finale** perché così lo dà Tesseract e così lo conferma il
  mojibake (`'HPXAIXVOU`). Probabilmente Lane stampa `Ἡρκλανοῦ`
  (= Herculanus): da verificare sulla pagina PDF 53.
- `SAITTA-10` rev: `Ἐπὶ Ἀνδρονείκου Διοδωρ... Σαιττηνῶν`. I puntini sono di
  Lane, non miei (concordi mojibake e Tesseract). Non ho usato `<gap>`
  perché non so quante lettere Lane sottintenda.
- `SAITTA-18` rev: scritto `Ἐπὶ Αὐρ. Σεπ. Ἀρ. Ἀ. Ἀσικρ. Σαιττηνῶν`. Il
  mojibake ha in più un `'Y` fra `'A.` e `'ACHXp.` che Tesseract non rende
  (dà uno spazio doppio nello stesso punto): **un elemento della legenda è
  caduto**. Da verificare sulla pagina PDF 57.
- `SAITTA-14` / `SAITTA-17` rev: `τό` (Tesseract in 14) e `τὸ` (Tesseract in
  17) per la stessa formula `ἀρχ. α΄ τὸ β΄`. Normalizzato a `τὸ` in entrambe.

## Note di legenda spostate in `ica:note`

Applicata la regola del BRIEF sulle note di disposizione:
- `SAITTA-9` rev: «(with various arrangements)» → in `<ica:note>` del
  rovescio, fuori dall'edizione.
- `SAITTA-4` obv: «(variation in division)» → idem (ma la faccia obv è
  comunque omessa dall'edizione, v. sopra).

## Pesi

**Scartato come illeggibile — 1:**
- `SAITTA-2`: `Weight: 8.27 gr. (London) - ro.{r gr. (Aulock)`. Il secondo
  peso ha una cifra centrale irrecuperabile (`ro.{r` → `10.?1`). Peso
  **omesso**; di conseguenza **niente intervallo sul tipo** (resta un solo
  peso noto). Ho comunque scritto un `<num:specimen>` per Aulock con la sola
  `<num:collection>`, per non perdere l'esistenza dell'esemplare, e un
  `<num:note>` che dichiara l'omissione. Da ritrascrivere dalla pagina 51.

**Normalizzazioni applicate** (risultato sempre plausibile):
- `20.2I` → 20.21 (Saitta 11, Paris)
- `I9.24` → 19.24 (Saitta 12, Paris)

**Pesi alti, tenuti come stampati** (fuori dalla forbice 0,5-35 g del BRIEF,
ma non frutto di normalizzazione: l'OCR li dà in chiaro e Saitta batte
medaglioni pesanti — cfr. Nysa 42, 49.22 g, nella stessa pagina):
- `SAITTA-10`: 40.50 (Berlin) - 51.64 (Winterthur)
- `SAITTA-13`: 51.65 (Hecht)
- `SAITTA-8`: 25.95 (Aulock) — nella forbice, ma anomalo per un pezzo di
  Marco Aurelio Cesare accanto ai 3-8 g delle emissioni civiche vicine.

**Specimen con la sola collezione** (`Illustrated example:` che nomina una
collezione diversa da quelle pesate, come previsto dal BRIEF):
- `SAITTA-2` → Athens; `SAITTA-9` → Aulock; `SAITTA-11` → Cambridge;
  `SAITTA-12` → Istanbul.

## Senza bibliografia oltre a Lane

`SAITTA-3`, `SAITTA-13`, `SAITTA-18` (`Bibliography: none` in tutte e tre).

## Elementi iconografici NON mappati (restati solo in `ica:note`)

- `SAITTA-1`, `SAITTA-2` rev: «feet far apart, r. hand far outstretched»
- `SAITTA-6` rev: «with **kantharos** and **thyrsos**» (due oggetti tenuti
  senza chiave); la pantera è resa come `figure type="animal" key="panther"`,
  chiave non nel vocabolario ma il lint non controlla le chiavi di figura
- `SAITTA-7` obv: «Apparently **no stars on cap**» — negazione esplicita di
  un attributo: nessun trait scritto
- `SAITTA-7` rev: «**nude except for chlamys over shoulder**, with **bow**,
  **legs crossed**» — la figura di Apollo resta senza alcun trait
- `SAITTA-8` obv: «**as Caesar**» (reso solo dagli anni 0139-0161)
- `SAITTA-10` rev: «There are **lions at the bottom of Cybele's throne**» —
  reso con `animal/lion rel="below" relTo="2"`, ma «throne» si perde
- `SAITTA-13` rev: «**His l. hand is raised (in greeting?)**» — v. sotto
- `SAITTA-14` rev: «who **sits on throne** at r.» — reso solo `pose/seated`
- `SAITTA-4`, `SAITTA-5` rev: «recumbent, **head to r.**» — reso con
  `@dir="right"` sulla figura recumbente, che è una forzatura minore

## Chiavi che sarebbe servito avere nel vocabolario

- `held_object/kantharos` e `held_object/thyrsos` — Saitta 6, attributi
  canonici di Dioniso, ricorrenti in tutta la numismatica lidia.
- `held_object/bow` — Saitta 7 (Apollo).
- `gesture/hand_raised` (una sola mano, saluto) distinto da
  `gesture/hands_raised` (supplica, che c'è): Saitta 13. **Non ho usato
  `hands_raised`**: Lane dice «his l. hand is raised», una mano sola e in
  gesto di saluto, non di preghiera. Forzare la chiave esistente avrebbe
  falsato il dato.
- `animal/panther` (usata come `@key` di figura, non nel vocabolario) e
  `figure key` per Zeus, Roma, Cybele, Apollo, Dionysus, Hermus, Hyllus:
  nessuno di questi nomi è in `iconographyLabels.ts`. Il lint non li
  controlla, ma la resa a video li mostrerà senza etichetta italiana.
- un modo per dire «in trono» distinto da «seduto» (Saitta 10, 13, 14).
- `dress/nude` o equivalente (Saitta 7).

## Dubbi sulla numerazione o sulla zecca

- **Numerazione**: 9 entry su 18 (Saitta 1, 10-18) portano
  `# ATTENZIONE: numerazione OCR incerta`. Ho verificato sulle pagine OCR
  50-57: la sequenza `Saitta I` … `Saitta 18` è **completa e senza salti**,
  e i numeri incerti sono tutti resi da Tesseract in forme riconoscibili
  (`Saitta IO` = 10, `Saitta I I` = 11, `ϑαίξα 12`, `ϑαϊξα 13`, `ϑαϊξα 14`,
  `Saitta IS` = 15, `ϑαΐία τό` = 16, `ϑαϊξᾳα 17`, `ϑαϊία 18`). Nessuna
  incoerenza rilevata.
- I rimandi di Lane a sé stesso nelle bibliografie (`Lane, II, p. 21,
  Saitta 1` su Saitta 1; `Lane, II, p. 21, Saitta 4` su Saitta 11;
  `Lane, II, p. 21, n. 9` su Saitta 4) sono a una numerazione **diversa** da
  quella di questo volume — sono rinvii al CMRDM I. Trascritti come
  stampati, senza allinearli.
- `SAITTA-11`: Lane (OCR) stampa «Bust of **Julia Damna**, r.». È
  evidentemente Julia Domna (la legenda `Ἰουλία Σεβαστή` e `regnanti.tsv` lo
  confermano). Scritto `Julia Domna` in `ica:note`, `num:authority` e
  `origDate` (0193-0217).
- `SAITTA-9`: Lane (OCR) stampa «Septimius **Severns**» → Severus.
- `SAITTA-13`: obverso «Caracalla(?)». Applicato `cert="low"` a `origDate` e
  a `num:authority`, come da BRIEF. È l'unica entry del batch con `cert`.
- `SAITTA-8`: «Marcus Aurelius … **as Caesar**» → anni della fase di Cesare
  (0139-0161) da `regnanti.tsv`.
- `SAITTA-3`: «Bust of Roma» reso come `figure type="secondary" key="Roma"`
  (la voce «la città personificata» del BRIEF). Se il coordinamento
  preferisce `deity`, è un cambio di una riga in un file solo.

## Interventi sulla bibliografia

`no.` → `n.`, `PI.` → `Pl.` ovunque. `nos.` lasciato com'è (il BRIEF non lo
prescrive). Correzioni di cifre/nomi, tutte ad alta confidenza:

- `PI. 1I5` → `Pl. 115` (Saitta 2, SNG Aulock)
- `no. I I` → `n. 11` (Saitta 6, Lane)
- `Hiibl, II, p. 3II, no. 3528` → `Hübl, II, p. 311, n. 3528` (Saitta 9)
- `Lane, II,p. 21,no. 3` → `Lane, II, p. 21, n. 3` (Saitta 9, spaziatura)
- `Waddington, RN, 1852, p. 31, no. I` → `n. 1` (Saitta 12)
- `SNG Cop.-, Lydia` → `SNG Cop., Lydia` (Saitta 5)
- `S. Birch NC, 1841` → `S. Birch, NC, 1841` (Saitta 2)
- `Torino, Monete Creche` → `Torino, Monete Greche` (Saitta 17, C/G)
- `Adramyt-tium` ricomposto in `Adramyttium` (Saitta 11)

Lasciato come stampato, perché non verificabile: `Roscher, Pl. la, n. 5`
(Saitta 4 — `la` è probabilmente `Ia`, ma non lo tocco).

## Note di Lane non previste dal BRIEF

- `SAITTA-2` ha un campo **`Note:`** (non `Remarks:`): «For the reading
  Κίνβρου cf. Imhoof, Kl. M., II, p. 523». L'ho messo in
  `<div type="commentary">` come un `Remarks:`, sciogliendo il mojibake
  `KLV~POU` in `Κίνβρου` (confermato dalla legenda della stessa entry) e
  `d.` in `cf.`. Se il coordinamento vuole distinguere `Note:` da
  `Remarks:`, serve una regola.
# Batch B06 — 28 entry

Sardis 1-13, Silandus 1-4, Aphrodisias 1, Attouda 1-3, Cidrama 1,
Trapezopolis 1-5, Accilaeum 1.

- entry codificate: 28 (xmllint: 28/28 ben formati; lint.py: 0 FATAL, 0 ERROR,
  solo i WARNING attesi «senza origDate» sulle 15 entry con dritto non imperiale)
- `num:mint/@ref` Nomisma: solo Silandus 1-4 (`nomisma.org/id/silandus`, da
  `mints.tsv`). Sardis, Aphrodisias, Attouda, Cidrama, Trapezopolis, Accilaeum
  non hanno id verificato: nessun `@ref`.

## Senza peso

- `CMRDM-II-SILANDUS-4` — `Weight: unavailable`, `Illustrated example: unknown
  location`: nessun `num:weight`, nessun `num:specimen`, nessun `@rend`.

## Senza bibliografia (oltre a Lane)

- `CMRDM-II-SARDIS-9`, `CMRDM-II-ATTOUDA-2`, `CMRDM-II-ATTOUDA-3`
  (`Bibliography: none`).

## Legende da ritrascrivere (OCR greco insufficiente)

Quattro dritti: il ri-OCR Tesseract non li ha resi in greco e nel .txt restano
in mojibake del livello PDF. Il `<div subtype="face" n="obv">` è stato **omesso**
(la faccia non è anepigrafe: manca il dato). Ho aggiunto fra parentesi la
lettura che il mojibake suggerisce, **da verificare sul PDF** prima di inserirla:

- `CMRDM-II-SILANDUS-2` obv — `Au. Kot. ~. ~eou1ipo~ nep.`
  (proposta: Αὐ. Κα. Σ. Σεουῆρος Περ.)
- `CMRDM-II-SILANDUS-3` obv — `Au. K. A. Aup. Ou1ipo~`
  (proposta: Αὐ. Κ. Λ. Αὐρ. Οὐῆρος — resta il dubbio A = Α o Λ)
- `CMRDM-II-TRAPEZOPOLIS-5` obv — `Au. KCXL. A. l:e:OU'Yipo~ lle:p.`
  (proposta: Αὐ. Και. Λ. Σεουῆρος Περ.)
- `CMRDM-II-ACCILAEUM-1` obv — `Au. K. M. ' Av't"c.u. rOp~LIXV6c;`
  (proposta: Αὐ. Κ. Μ. Ἀντω. Γορδιανός)

Ho invece **scritto** due legende che l'OCR non ha reso ma la cui identità è
certa per confronto di stringa con occorrenze rese sulla stessa pagina:

- `CMRDM-II-SARDIS-5` rev — `~OCpaLOCV(;)V` = Σαρδιανῶν (stessa stringa resa
  dall'OCR come Σαρδιανῶν in Sardis 6 e 9 della stessa pagina PDF 59-60).
- `CMRDM-II-APHRODISIAS-1` obv — `'Ie:pa ~OYXA"YJ"t"OC;` = Ἱερὰ Σύγκλητος
  (Lane descrive «Bust of the senate»; l'OCR rende la formula in Sardis 6 e
  Alia 2). Il «(with varying arrangements)» di Lane è fuori edizione, in `ica:note`.

## Legende particolari

- `CMRDM-II-TRAPEZOPOLIS-4` rev — Lane stampa la legenda mutila
  (`..... aLCXVOU`, OCR «.... .. διανου»): resa come
  `<gap reason="lost" extent="unknown" unit="character"/>διανου`. La lacuna è di
  Lane, non dell'OCR.
- `CMRDM-II-SARDIS-11` rev — Lane stampa `Σαρδιανῶν τρὶς (or γ΄) Νεωκόρων`.
  Nell'edizione ho tenuto **Σαρδιανῶν τρὶς Νεωκόρων**: «(or γ΄)» è
  un'alternativa editoriale in inglese, non parte della legenda. Se si vuole
  registrare la variante serve una convenzione di batch (`<choice>`?): non
  l'ho introdotta da sola.
- `CMRDM-II-SARDIS-5` rev — «inscription in three lines»: una sola `<lb n="1"/>`,
  la notazione resta in `ica:note`.
- `CMRDM-II-SILANDUS-1` obv — «counterclockwise» spostato in `ica:note`.
- `CMRDM-II-SARDIS-3` e `-4`, commento: il mojibake greco dentro i *Remarks* di
  Lane è stato sciolto (`without W` → «without β΄»; `~lXpaLIXV(;)V y' N E:wx6pwv`
  → Σαρδιανῶν γ΄ Νεωκόρων, quest'ultimo confermato dall'OCR). Il «β΄» di
  Sardis 3 **non** è confermato dall'OCR: è dedotto dalla mappatura W = β,
  verificata su tutte le legende Σαρδιανῶν β΄ Νεωκόρων della stessa pagina.

## Pesi: letture normalizzate (nessuno scartato)

- `SILANDUS-3`: `22.0I gr.` → **22.01** g (pezzo grande, plausibile).
- `APHRODISIAS-1`: `IO.28 gr.` → **10.28** g.
- `ACCILAEUM-1`: `IL03 gr.` → **11.03** g.
Nessun peso scartato come implausibile.

Casi di intervallo con una sola collezione nominata, risolti così: intervallo
sul tipo + **un solo** specimen, quello a cui Lane attacca la collezione:
- `SARDIS-2` (3.93–6.42, «(Paris)» sul solo 6.42),
- `SARDIS-10` (5.19–5.70, «(Paris)»),
- `ACCILAEUM-1` (8.96–11.03, «(Paris)»).
Se la convenzione di batch è un'altra, sono i tre file da rivedere.

`Illustrated example:` che nomina una collezione **senza peso proprio** →
specimen con la sola `num:collection` e `@rend="illustrated"`:
`SARDIS-4` (Copenhagen), `SARDIS-7` (Paris), `SARDIS-8` (Cambridge),
`SILANDUS-1` (Athens), `CIDRAMA-1` (Athens), `ACCILAEUM-1` (Aulock).

## Elementi iconografici NON mappati (restati solo in `ica:note`)

- `CMRDM-II-SARDIS-1`: "Rudder and cornucopia crossed" — **rudder** (timone)
  non ha chiave; codificata la sola cornucopia.
- `CMRDM-II-TRAPEZOPOLIS-4`: "Tyche standing l. with rudder and cornucopia" —
  idem, **rudder**.
- `CMRDM-II-SARDIS-4`: "Sheaf of wheat" — **covone di grano** non ha chiave:
  la faccia `rev` ha `ica:note` ma **nessuna** `ica:figure`.
- `CMRDM-II-SARDIS-13`: "Female bust, r." — busto femminile non identificato da
  Lane: `ica:figure type="secondary"` **senza `@key`**.
- `CMRDM-II-SILANDUS-3`: "holding poppy, ear of grain" (Demetra) — **papavero**
  e **spiga** non hanno chiave; codificato il solo scettro.
- `CMRDM-II-TRAPEZOPOLIS-2`: "**Winged** Nemesis … holding **bridle**" — ali e
  briglia non hanno chiave.
- `CMRDM-II-TRAPEZOPOLIS-3`: "Bust of Apollo, r., with **quiver and lyre**".
- `CMRDM-II-APHRODISIAS-1`: "On some dies there is a **head band**".
- `CMRDM-II-ATTOUDA-1`: "Altar, with **objects on it resembling three
  pine-cones and two smaller altars**" — codificato il solo altare.
- **foot on bucranium** (per contratto non si forza una chiave):
  `APHRODISIAS-1`, `CIDRAMA-1`, `ACCILAEUM-1`.
- **head r.** su figura recumbente: `SARDIS-3` (reso solo con `@dir="right"`).

## Chiavi che sarebbe servito avere nel vocabolario

- `rudder` / timone (2 entry: Sardis 1, Trapezopolis 4)
- `grain_ear` / spiga e `poppy` / papavero (Silandus 3) — attributi standard di
  Demetra, ricorreranno
- `sheaf` / covone (Sardis 4)
- `winged` / alato e `bridle` / briglia (Trapezopolis 2)
- `quiver` / faretra e `lyre` / lira (Trapezopolis 3)
- `bucranium` esiste come `held_object`, ma serve una resa per **«foot on
  bucranium»**: è un piede appoggiato, non un oggetto tenuto (3 entry in questo
  solo batch, e il motivo è diffuso in Caria/Frigia)
- `head_turned` (confermo: non esiste; `SARDIS-3` «head r.» resta in nota)

## Dubbi sulla numerazione o sulla zecca

- `# ATTENZIONE: numerazione OCR incerta` su 10 entry del batch: SARDIS-1,
  SARDIS-10, SARDIS-11, SARDIS-12, SARDIS-13, SILANDUS-1, APHRODISIAS-1,
  ATTOUDA-1, CIDRAMA-1, ACCILAEUM-1. La sequenza è però **continua e coerente**
  nel testo OCR delle pagine PDF 57-67 (Sardis 1→13, Silandus 1→4,
  Aphrodisias 1, Attouda 1→3, Cidrama 1, Trapezopolis 1→5, Accilaeum 1), e i
  numeri delle testate sfigurate (`Sardis :2`, `Sardis I I`, `9 7415 12`,
  `ϑαγάϊ5 13`) si ricostruiscono dall'ordine. Numerazione considerata sicura.
- `CMRDM-II-SARDIS-13` è la **moneta di alleanza Sardis–Hierapolis**: la testata
  di Lane la assegna a Sardis, e così l'ho schedata (`origPlace` Sardis, Lydia).
  La riga di Lane «Alliance coin of Sardis and Hierapolis» non ha un campo
  proprio: l'ho messa in `<div type="commentary">` (unica prosa di Lane senza
  altra casa) e richiamata nel `<title>`. Se il coordinamento preferisce
  commentary solo per i *Remarks*, va tolta di lì.
# Batch B07 — 23 entry

Alia 1-7, Apameia 1, Cibyra 1-5, Colossae 1-2, Eriza 1, Grimenothyrae 1-4,
Hadrianopolis 1-3. Tutte Phrygia. `xmllint` OK su 23/23; `lint.py` sui miei
file: FATAL 0, ERROR 0, WARNING 13 (tutte «senza origDate», corrette: dritto
con Men, Senato, Selene, Herakles o Athena).

- entry codificate: 23

- senza peso: nessuna

- senza bibliografia (oltre a Lane): nessuna; con una sola voce oltre a Lane:
  Alia 5 (Cesano), Colossae 2 (BMC Phrygia), Grimenothyrae 4 (Scholz),
  Hadrianopolis 1 (Imhoof)

- legende da ritrascrivere (OCR insufficiente) — faccia omessa:
  - Alia 6, obv: Tesseract non ha reso la riga, resta il mojibake
    `M.' An. rop~~cxv6~ Auy.`; nessun parallelo identico carattere per carattere
  - Cibyra 1, rev: la legenda è dentro la prosa («Laurel wreath containing the
    inscription …») e l'OCR greco non l'ha resa; il mojibake `KL~UplX't'wv`
    NON è identico a quello di Cibyra 2-5 (`KL~UpOC't"&v`), quindi non ho
    applicato la lettura per parallelo. Quasi certamente Κιβυρατῶν: da
    confermare sul PDF. L'`<ica:note>` è stata troncata a «Laurel wreath
    containing the inscription» per non portare mojibake nella scheda: va
    ripristinata intera quando la legenda sarà letta.
  - Cibyra 5, obv: mojibake `Au. KOCL. M. 'A'J. rOpaLOC'JOe;;`
  - Colossae 2, obv: mojibake `Au. KOCL. M. Au. 'A'J"C'cu'JEL'Joe;;`
  - Grimenothyrae 1, rev: mojibake `'E7tl A. TUAALOU rpL[LE\lo6up&<U\I`
    (la postilla «(with variations)» è comunque andata in `commentary`)
  - Grimenothyrae 4, obv: mojibake `AUT. M. Aup. 'AvTwve:Lvoc;`
  - Hadrianopolis 3, obv: mojibake
    `Au. KOCL. A. ~e1t. ~eu, x. M. 'Av't"wveL ... re't"oc~ K.`

- letture in cui ho corretto UN token dell'OCR greco (tutte le altre parole
  sono quelle di Tesseract; segnalate perché sono interventi, non OCR):
  - Alia 4, rev: `ἴα.` → `Γα.` (Tesseract; il parallelo di Alia 5 dà
    `Γ. Ἀσιν.`, cioè Γ(αΐου) Ἀσιν(ίου))
  - Alia 5, rev: `Γ΄.` → `Γ.` (keraia per il punto di abbreviazione)
  - Colossae 2, rev: `Μενεχκλῇς` → `Μενεκλῆς` (il χ è un raddoppio dell'OCR)
  - Colossae 1, rev: `ὑἽερω.` → `Ἱερω.` (lo `ὑ` è l'artefatto con cui questo
    OCR rende lo spirito aspro, cfr. `ὑἹεραπολειτῶν` di Hierapolis)
  - Grimenothyrae 3, rev: `[Γριμενοθυρέων` → `Γριμενοθυρέων` (parentesi spuria)
  - Grimenothyrae 4, rev: `ΓΠρεμενοθυρέων` → `Γρεμενοθυρέων` (Π intruso; la
    grafia con ε, non ι, è confermata anche dal livello di testo del PDF)
  - Hadrianopolis 1, rev: `Δδρι.` → `Ἀδρι.` (cfr. Ἀδριανοπολειτῶν di
    Hadrianopolis 2-3)
  - Alia 7, obv: `Αὖτ. Κ. ΝΜ.` → `Αὐτ. Κ. Μ.` (perispomeni e N intruso, casi
    già previsti dal contratto)
  - Apameia 1, obv: tolto lo `ο` iniziale spurio di `οΟὐειβ.` e i quattro punti
    finali con cui Lane segnala la parte perduta della legenda
    (`Οὐειβ. Γάλλος Οὐολου. ....` → `Οὐειβ. Γάλλος Οὐολου.`). Da notare che la
    legenda nomina Volusiano *e* Treboniano Gallo, ma Lane descrive solo il
    busto di Volusiano: `num:authority` è il solo Volusian.

- pesi scartati come implausibili: nessuno. Normalizzati:
  `3.S8`→3.58 (Alia 1), `I4.65`/`I4.66`→14.65/14.66 (Alia 4), `6.r9`→6.19
  (Hadrianopolis 2). Restano alti ma plausibili per medaglioni civici:
  Colossae 2 = 23.06 g, Hadrianopolis 3 = 27.99 g.

- pesi/esemplari da controllare:
  - Hadrianopolis 1: Lane dà `Weight: 1.01 gr.` **senza collezione** e
    `Illustrated example: Berlin`. Essendoci un solo peso e un solo esemplare
    citato ho unito i due dati in un unico `num:specimen` (1.01 g, Berlin,
    `rend="illustrated"`). Se il peso non fosse dell'esemplare di Berlino, va
    separato.
  - Apameia 1 (`12.63 gr.-14.38 gr. (London)`) e Grimenothyrae 3
    (`2.74 gr.-3.88 gr. (Paris)`): intervallo attribuito a una sola collezione
    → intervallo sul tipo e un solo `num:specimen` con la sola collezione
    (quella illustrata), senza peso. Non ho assegnato una delle due cifre alla
    collezione, perché Lane non dice quale.

- elementi iconografici NON mappati (restati solo in ica:note):
  - Alia 1: "wreath on cap" — reso con `headgear/wreath`, ma Lane non dice
    alloro: la specie della corona resta indeterminata
  - Alia 5, Alia 6, Alia 7: "axe over shoulder" / "with axe over shoulder" —
    nessuna chiave per l'ascia
  - Alia 4: "There is no axe, such as appears on the three following coins"
    (osservazione negativa, non codificabile)
  - Cibyra 2: "flaming" di "flaming altar"
  - Cibyra 4, Cibyra 5: "the patera held over an altar" — resa la relazione
    `below` fra altare e Men, ma il legame patera→altare non è esprimibile
  - Colossae 1: "Horse (?)" — il dubbio di Lane sull'identificazione
  - Colossae 2: "end of staff resting on bucranium" — il bucranio è una figura
    a sé, ma la relazione (appoggio del bastone) non ha un `@rel` nel
    vocabolario: figura senza `@rel`
  - Eriza 1: "apparently bare from waist up"
  - Grimenothyrae 3: "Head of Herakles, r., laureate" — resi insieme
    `portrait/bare_head` e `portrait/laureate_head` come prescrive la tabella
    del contratto, benché i due tratti si contraddicano
  - Hadrianopolis 1: "Flaming altar"
  - Hadrianopolis 2: "with Corinthian helmet" — `headgear` ha solo
    phrygian_cap / radiate_crown / crescent_crown
  - Hadrianopolis 3: "an eagle with spread wings" — l'aquila è figura
    (`animal/eagle`, `rel="below"`), le ali spiegate no
  - Alia 6: "with shield and spear" — ho usato `held_object/shield` e
    `held_object/spear` (chiavi esistenti, ma `shield` nel vocabolario è
    registrata come chiave-figura, non come oggetto tenuto): da rivedere se il
    coordinatore preferisce due figure `symbol`

- chiavi che sarebbe servito avere nel vocabolario:
  - `held_object/axe` (Alia 5, 6, 7 — e con ogni probabilità molte altre
    entry frigie)
  - `headgear/corinthian_helmet` (Hadrianopolis 2)
  - un tratto per il fuoco sull'altare (`symbol/altar` + "flaming")
  - un `@rel` per l'appoggio ("resting on", "foot on"): oggi `at_feet` non
    copre "end of staff resting on bucranium"
  - un modo per marcare l'incertezza di Lane su una figura ("Horse (?)"):
    oggi solo prosa

- dubbi sulla numerazione o sulla zecca:
  - Alia 1, Apameia 1, Cibyra 1, Colossae 1, Eriza 1, Grimenothyrae 1,
    Hadrianopolis 1: `# ATTENZIONE: numerazione OCR incerta` — sono tutte le
    prime entry di zecca, quindi il numero 1 è probabile, ma va verificato
  - Alia 6: Lane si autocita «Lane, II, p. 24, Alia 5»; Alia 7 si autocita
    «Lane, II, p. 25, Alia 6»; Cibyra 5 «Lane, II, Cibyra 4»;
    Hadrianopolis 3 «Lane, II, p. 26, Hadrianopolis 1». Lo scarto di uno fra
    testata e autocitazione va sciolto sul PDF: o la testata OCR è sfasata, o
    Lane rimanda alla numerazione di un'altra sua lista. **Il rischio è che
    Alia 5-7 e Cibyra 5 siano in realtà Alia 4-6 e Cibyra 4.**
  - Grimenothyrae 1, bibliografia: «BMC Phrygia, p. 22, no. I» — Grimenothyrae 2
    cita p. 223, quindi p. 22 è verosimilmente p. 222, ma non l'ho corretta
  - Cibyra 4: Lane rimanda a «Lane, III, p. 104, no. 7», cioè al CMRDM III e
    non al II: riportato com'è
  - Colossae 2: la testata dell'OCR legge «Colossae z» e il dritto «Caracalia»;
    ho normalizzato in Colossae 2 e Caracalla
# Batch B08 — 30 entry

Hierapolis 1-8, Hieropolis 1-2, Hydrela 1-5, Hyrgaleis 1, Julia 1-4,
Laodiceia 1-6, Metropolis 1-3, Midaeum 1. Tutte Phrygia.

- entry codificate: 30
- xmllint: 30/30 well-formed; lint.py: 0 FATAL, 0 ERROR sui file del batch.
  Solo WARNING «senza origDate» sulle 21 entry con dritto non imperiale
  (Boule, Demos, Senato, Men, Zeus Troios, Artemide, Dioniso, dea civica,
  busto femminile anonimo): corretto per contratto.

- senza peso: nessuna (tutte le 30 hanno almeno un peso).

- senza bibliografia (oltre a Lane): Hieropolis 2, Julia 2, Julia 3,
  Metropolis 2 («Bibliography: none»).

- legende da ritrascrivere (OCR insufficiente): il ri-OCR Tesseract non ha
  toccato queste righe, che restano nel mojibake del livello PDF. Faccia omessa.
  - Hierapolis 7, obv («Au't". K. M. Aup. 'Av't"wveLVO~») — la legenda di
    Caracalla. Il rovescio è leggibile.
  - Julia 3, obv: Lane stesso scrive «Inscription illegible»; non è una faccia
    anepigrafe, quindi il div è omesso e la constatazione di Lane è finita in
    <div type="commentary">.
  - Julia 4, obv («AUT. K. M. A£!J.. A£!J.~A~lXv6~» = Emiliano).
  - Metropolis 3, **entrambe** le facce («Au. K. r. M. 'E't'pou. MX.LO~» e
    «IIocp.' AAE. TLdou 7tp. &.p. MYj't'po7toAEL't'wv <I>pu.»): l'intero
    <div type="edition"> è omesso.

- legende lette per parallelo: nessuna. Tutte le legende scritte vengono dal
  ri-OCR greco della pagina della entry stessa.

- pesi scartati come implausibili: nessuno. Normalizzati secondo la regola OCR:
  - Hierapolis 1: «4.or gr.» → 4.01
  - Hydrela 3: «4.4I gr.» → 4.41
  - Julia 3: «IO.45 gr.» → 10.45
  - Laodiceia 3: «3-45 gr.» → 3.45; «6.r6 gr.» → 6.16
  - Midaeum 1: «II.24 gr.» → 11.24
  Tutti restano nell'intervallo plausibile e coerenti con l'altro estremo
  della coppia.

- pesi con intervallo ma senza esemplari distinti (intervallo sul tipo +
  specimen con la sola collezione, per via di `Illustrated example:`, più
  <num:note> con la formula di Lane dove la collezione dell'intervallo non
  coincide con quella illustrata):
  - Hierapolis 4 («2.86 gr.-3.62 gr. (Berlin)», illustrato Berlin)
  - Metropolis 3 («7.21 gr.-7.42 gr. (Berlin)», illustrato Berlin)
  - Laodiceia 1 («2.65 gr. -5.02 gr. (Paris)» ma illustrato Aulock: specimen
    Aulock senza peso + num:note con il peso di Paris)
  - Julia 4 (13.53 London / 15.00 Paris, ma illustrato Aulock: terzo specimen
    Aulock con la sola collezione)

- elementi iconografici NON mappati (restati solo in ica:note):
  - Hierapolis 1,2,3,4,5,7,8 / Hieropolis 1 (negativo) / Laodiceia 6:
    "foot on bucranium" — per il BRIEF «bucranium under foot» non va forzato in
    una chiave; il bucranio *tenuto in mano* invece è codificato
    (held_object/bucranium in Metropolis 1).
  - Hierapolis 1: "Crescent apparently absent"; Hieropolis 1: "No bucranium"
    (constatazioni negative, non codificabili).
  - Hierapolis 3: "city goddess" — resa come figure type="secondary"
    key="city_goddess"; la chiave non è nel vocabolario condiviso.
  - Hierapolis 8: "Female bust, r." — figura secondaria senza @key (Lane non
    la nomina).
  - Hydrela 1, 2: "with bow and quiver" (arco e faretra di Artemide).
  - Hydrela 1: "r. hand extended", "apparently wearing long gown".
  - Julia 1: "There is a symbol of some sort behind his shoulders" (simbolo non
    identificato: nessuna chiave).
  - Julia 3: "with Antiochene attributes".
  - Julia 4: "Distyle temple" (il "distilo" non è esprimibile), "long robe",
    "similar to Antiochene, but without Nike".
  - Laodiceia 5: "with palos" (il polos di Tyche).
  - Metropolis 1: "Foot on head of reclining ox", "Long gown".
  - Metropolis 2: "as on Metropolis 1" (rimando incrociato: codificati solo
    posa e orientamento, tutto il resto resta nella prosa).
  - Metropolis 3: "striding".

- chiavi che sarebbe servito avere nel vocabolario:
  - `pose/striding` (Metropolis 3, «Men striding r.»): né standing né
    galloping; ora la entry ha solo @dir e gli held_object.
  - `dress/long_gown` o `dress/long_robe` (Hydrela 1, Julia 4, Metropolis 1):
    il vocabolario ha chiton/himation/belted_tunic/military, nessuno dei quali
    è quello che Lane dice.
  - `held_object/bow`, `held_object/quiver` (Hydrela 1-2, Artemide).
  - `headgear/polos` (Laodiceia 5, Tyche «with palos»).
  - `rel/under_foot` oppure `pose/foot_on` — la posizione «foot on bucranium»
    ricorre in 9 entry del solo batch B08 ed è un tratto diagnostico di Men:
    vale la pena di deciderla a livello di progetto, perché oggi si perde.
  - `gesture/hand_extended` (Hydrela 1).
  - chiavi-soggetto: `Boule`, `Demos`, `Senate`, `city_goddess`, `Zeus`,
    `Artemis`, `Dionysus`, `Tyche`, `Asklepios` sono usate come
    `ica:figure/@key` (che il lint non controlla), ma non hanno un'etichetta
    in iconographyLabels.ts e nell'app resteranno senza resa italiana.

- dubbi sulla numerazione o sulla zecca:
  - Le prime entry di ogni zecca portano il flag «numerazione OCR incerta»
    del segmentatore (Hierapolis 1, Hieropolis 1, Hydrela 1, Hyrgaleis 1,
    Julia 1, Laodiceia 1, Metropolis 1, Midaeum 1): il numero è sempre 1 e
    coincide con la sequenza interna della zecca, ma non è stato verificato
    sul PDF.
  - **Hierapolis vs Hieropolis**: sono due zecche distinte in mints.tsv e sono
    state tenute distinte. Lane stesso (Remarks di Hieropolis 1) dubita che la
    distinzione numismatica tradizionale abbia un fondamento reale, citando
    L. Robert; il commento è riportato integralmente nella scheda.
  - Julia 1, bibliografia: nel testo OCR le due voci «Imhoof, Kl. M., p. 247,
    no. 8825, and Pl. 311, no. 15» e «Grose, III, p. 245, no. 8825, and Pl. 311,
    no. 15» sono fuse su una riga sola. Le ho separate in due <bibl>: il numero
    8825 e la tavola 311 sono di Grose (cfr. Hierapolis 2, «Grose, II, p. 244,
    no. 8822 and Pl. 311, no. 14»), quindi la voce di Imhoof è probabilmente
    corrotta e va ricontrollata sul PDF.
  - Laodiceia 6, legenda del rovescio: Lane stampa «II. K ...A't"t'lXAo<;;»
    (con puntini, forse una lacuna); il ri-OCR legge «Π. Κ. ἤλτταλος». Ho
    scritto «Π. Κ. Ἄτταλος ἀνέθηκεν Λαοδικέων»: da verificare sulla pagina.
  - Julia 2, legenda del rovescio: Lane la segna con «(?)». La legenda è
    nell'edizione senza il punto interrogativo e il dubbio di Lane è riportato
    in <div type="commentary">.
  - Julia 1 e Julia 2: la legenda del dritto è «Νέρων Καῖσαρ», ma Lane non
    scrive «as Caesar» nella descrizione; ho usato l'intervallo pieno del regno
    (0054-0068) e non la fase di Caesar.
  - Laodiceia 1-4: Lane data nei Remarks «to the time of Augustus / Nero /
    Antoninus Pius on the basis of the magistrate's name». È un'inferenza
    prosopografica, non un ritratto: nessun origDate, nessun num:authority.
    Il Remarks è in <div type="commentary">.
  - Hierapolis 1: il ri-OCR legge «Ἱερὰ Βουλὴ» (grave in fine di legenda
    isolata), Hierapolis 2 e Metropolis 1 leggono «Ἱερὰ Βουλή». Ho seguito
    l'OCR di ciascuna entry; l'accento andrebbe uniformato a monte.
# Batch B09 — 30 entry

Paleobeudus 1; Philomelium 1-3; Prymnessus 1-2; Sebaste 1-5; Siblia 1-5;
Synnada 1-3; Temenothyrae 1-11. Tutte in Frigia.

- entry codificate: 30 — `xmllint --noout` OK su tutte; `lint.py` sui miei file:
  FATAL 0, ERROR 0, WARNING 15 (tutte «senza origDate», cioè dritti non
  imperiali: Men, Senato, Demos, Temenos, Sarapis, Roma/Atena).

## senza peso
nessuna: Lane dà un peso per tutte e 30.

## senza bibliografia (oltre a Lane)
- Temenothyrae 6 (`Bibliography: none`)
- Temenothyrae 9 (`Bibliography: none`)
- Temenothyrae 10 (`Bibliography: none`)

## legende da ritrascrivere (OCR insufficiente)
Il ri-OCR Tesseract non ha reso queste righe, rimaste mojibake nel livello di
testo del PDF. Il `<div subtype="face">` corrispondente è stato **omesso**
(non dichiarato anepigrafe):
- **Sebaste 5**, dritto: `Au. K. no. AL. OUotAe:PLot\l6~ Au K. no. ALXL. rotAAL1J\l6~`
  (legenda doppia di Valeriano e Gallieno).
- **Siblia 5**, dritto: `Au't". KCXL. K. Au. 'Av't"cuvdvo~`.
- **Temenothyrae 7**, dritto: `Au. KCXL. A. AUplJ. Ou~pOC;`.
- **Temenothyrae 10**, dritto: `Au. K. A. ITo. AL. OUIXAEPLIXV6c;`.
- **Temenothyrae 11**, dritto: `Au. K. ITo. AL. OUIXAEPLIXVOC; Au. K. ITo. ALXL. rIXA-λιηνός`
  (Tesseract ha reso solo l'ultima sillaba, `λιηνός`; il resto resta mojibake).

Nessuna legenda è stata «letta per parallelo»: dove il mojibake somigliava a
una legenda resa altrove, le stringhe non coincidevano carattere per carattere.

## interventi sul greco che vanno controllati sulla pagina
- **Temenothyrae 1**, rovescio: Tesseract dà `Σχοπελιανὸς ἀνέθηκε`; scritto
  `Σκοπελιανὸς` (χ/κ: confusione di forma, e Σχοπελιανός non è un nome greco).
- **Sebaste 5**, rovescio: mantenuto `χὲ` come lo dà Tesseract; nel mojibake è
  `XE:`. Probabile `κὲ` (= καί) delle omonoiai, ma non l'ho corretto.
- **Siblia 4**, dritto: Tesseract dà `Σεβαστῆ`; scritto `Σεβαστή` (nominativo
  ossitono, confermato dal mojibake `~e;~oc(jTIj`).
- **Sebaste 4**, dritto: `Καὶ.` lasciato con la varia come dall'OCR
  (abbreviazione di Καῖσαρ).
- **Philomelium 2**, rovescio: il `(?)` di Lane sulla lettura `Φλάκκος` è stato
  lasciato in linea nella legenda (l'OCR greco lo legge `(9)`).
- **Temenothyrae 9**, dritto: i quattro punti di Lane (`.... Σεουῆρος`) resi
  con `<gap reason="illegible" extent="unknown" unit="character"/>`.

## pesi: normalizzazioni e casi particolari
Nessun peso scartato come implausibile. Normalizzati (tutti entro 0,5-35 g):
- Philomelium 1: `4-45` → 4.45; `8.g8` → 8.98
- Philomelium 2: `3-43` → 3.43
- Philomelium 3: `4.0I` → 4.01
- Sebaste 3: `8.1I` → 8.11
- Siblia 4: `I2.62` → 12.62

Casi in cui la forma di Lane non è quella prevista dal contratto:
- **Paleobeudus 1** (`3.88 gr.-8.23 gr. (Berlin)`) e **Temenothyrae 1**
  (`6.93 gr.-8.62 gr. (London)`): intervallo con **una sola** collezione.
  Ho messo l'intervallo sul tipo, la riga letterale di Lane in `<num:note>`,
  e uno `<num:specimen rend="illustrated">` con la sola collezione indicata da
  `Illustrated example:` (Berlino, risp. Parigi).
- **Synnada 2**: `4.13 gr. (Vienna, broken) - 5.91 gr. (Vienna)` con
  `Illustrated example: Vienna`. Le due collezioni sono omonime: **non ho
  messo `rend="illustrated"`** su nessuno dei due specimen, perché non è
  determinabile quale sia il pezzo riprodotto. La riga letterale (con
  «broken») è in `<num:note>`. Da sciogliere sulla tavola XXVII.
- **Sebaste 1** (illustrato: Paris) e **Sebaste 4** (illustrato: Evelpides):
  la collezione illustrata non è nessuna delle due pesate → terzo specimen con
  la sola `<num:collection>` e `rend="illustrated"`.

## elementi iconografici NON mappati (restati solo in ica:note)
- Prymnessus 1: "draped" e "feeding snake from patera" (serpente)
- Prymnessus 2: "kalathos", "rudder"
- Sebaste 1: "feeding serpent from patera" (serpente)
- Sebaste 3: "Male bust of Senate"; "foot on bucranium"
- Sebaste 5: "Tyches of Sebaste and Temenothyrae standing facing each other,
  holding in their joined hands a statue of Men" (la statua, il gesto e
  l'identità civica delle due Tychai)
- Siblia 2: "Lituus in field"
- Siblia 4 e 5: "foot on bucranium (mule's head?)"; il dubbio "Men (Selene?)"
- Temenothyrae 3 e 4: il dubbio "Athena (Roma?)"; Synnada 2: "Roma (Athena?)"
- Temenothyrae 7: "in a wagon"; Temenothyrae 8, 10, 11: "in biga"
  (il carro non ha chiave; i due tori sono resi con una sola
  `<ica:figure type="animal" key="bull" dir="left">`, perché il vocabolario non
  ha un modo di dire «due»)

## chiavi che sarebbe servito avere nel vocabolario
- `gesture/head_turned` (o equivalente): **Sebaste 1**, "Hygeia standing,
  head l." — la figura non ha `@dir`, perché Lane orienta solo la testa.
  `mappatura-campi.md` la prescrive ma non esiste in `iconographyLabels.ts`.
- `held_object/snake` / `animal/snake`: Prymnessus 1, Sebaste 1.
- `held_object/rudder`, `headgear/kalathos`: Prymnessus 2.
- `held_object/lituus` (o `symbol/lituus`): Siblia 2.
- `vehicle/biga` (o `pose/in_chariot`): Temenothyrae 7, 8, 10, 11 — è il tipo
  caratterizzante di questa zecca e resta invisibile alla ricerca.
- `feature/draped` per le figure intere (Prymnessus 1): `dress` ha solo
  himation/chiton/military/belted_tunic.
- chiavi `@key` di figura usate e non presenti nel vocabolario (il lint non le
  controlla, ma andranno censite): Zeus, Hygieia, Tyche, Asklepios,
  Telesphorus, Sarapis, Roma, Athena, Senate, Demos, Temenos, e i nomi
  imperiali.

## dubbi sulla numerazione o sulla zecca
1. **Paleobeudus 1 — Remarks orfane.** Nell'OCR di p. 71 il blocco
   «Remarks: The Berlin example, on which the crescent is clear, confirms the
   identification of the London examples as Men; since the London examples lack
   the crescent, I had expressed doubts about the identification, Lane, II,
   p. 28, note 25» compare **prima** della testata «Paleobeudus I», quindi
   chiude l'entry precedente. Ma il contenuto (esemplare di Berlino con falce
   chiara, esemplari di Londra senza) corrisponde punto per punto a
   Paleobeudus 1, che ha Berlino come esemplare illustrato e BMC Phrygia
   p. 346 n. 2 (Londra) in bibliografia. **Non l'ho inserita** in nessuna
   scheda. Da verificare sul PDF: se è di Paleobeudus 1, va aggiunta come
   `<div type="commentary">`.
2. **Rinvii interni sfasati di uno** in tre entry di Siblia: Siblia 1 cita
   «Lane, II, p. 29, Siblia 2», Siblia 2 cita «Siblia 1», Siblia 5 cita
   «Siblia 4». È probabile che la numerazione del CMRDM II diverga da quella
   del volume I/III citato; riportata come la dà Lane, ma da controllare.
   Stessa cosa per Temenothyrae 7 (cita «Temenothyrae 5»), Temenothyrae 8
   («Temenothyrae, no. 6») e Temenothyrae 11 («Temenothyrae 7»).
3. **Numerazione OCR incerta** (flag `# ATTENZIONE` nel .txt) su: Paleobeudus 1,
   Philomelium 1, Prymnessus 1, Sebaste 1, Siblia 1, Synnada 1,
   Temenothyrae 1, 10, 11. Sono quasi tutte le prime entry di zecca, dove il
   rimando alla tavola sfigura la testata; il numero 1 è comunque coerente con
   la sequenza. Temenothyrae 10 e 11 (`T emenothyrae IO`, `T emenothyrae I I`)
   sono le uniche dove l'OCR ha letto cifre romane: verificare.
4. **Temenothyrae 7**: l'intestazione del .txt dice `# zecca: Temenothyrac`
   (refuso OCR). Codificato come Temenothyrae.
5. **Bibliografia, letture incerte lasciate come sono**: «Inv. Wadd., RN, 1898,
   p. 561, n. 6524 and Pl. XN, n. 13» (Synnada 1): `XN` è verosimilmente `XV`,
   non corretto. Corretti invece con sicurezza: `Pl. &VIII` → `Pl. VIII`
   (Temenothyrae 11, coerente con Temenothyrae 3-4 che citano Lane II Pl. VIII
   nn. 4 e 5) e `Kraft, Pl. 79, n. z6a` → `n. 26a` (Siblia 4).

## scelte di codifica da omologare con gli altri batch
- `starry cap` / `stars on cap` reso con `<ica:trait type="headgear" key="star"/>`
  come prescrive il BRIEF (Prymnessus 1-2, Siblia 2). `mappatura-campi.md`
  prescriveva invece `lunar/crescent_cap`: ha prevalso il BRIEF.
- «Alliance coin of Sebaste and Temenothyrae» (Sebaste 5) messa come `<p>` a sé
  in `<div type="commentary">`, insieme alle Remarks.
- «(with variations)» (Temenothyrae 1) messa come `<p>` a sé in
  `<div type="commentary">`, come da BRIEF.
- Emissioni congiunte (Sebaste 5, Temenothyrae 11): due `<num:authority>` e un
  solo `<origDate>` 0253-0260, intersezione dei due regni.
- Marco Aurelio Cesare (Synnada 3, legenda `Αὐρήλιος Βῆρος Καῖσαρ`) e Geta
  Cesare (Sebaste 4, `Γέτας Καὶ.`): usate le date della fase di Caesar,
  0139-0161 e 0198-0209.
# Batch B10 — 24 entry (Antioch, Pisidia 1-24)

- entry codificate: 24 (Antioch 1-24)
- validazione: `xmllint --noout` OK su tutti; `lint.py` → 0 FATAL, 0 ERROR.
  Restano 23 WARNING «senza origDate», tutti attesi: il dritto è Men in 23 entry
  su 24. L'unica con ritratto imperiale è Antioch 24 (Antoninus Pius, 0138-0161).

- senza peso: Antioch 7 e 14 (`Weight: unavailable`), Antioch 20
  (`Weight: Not supplied`). In tutte e tre resta il solo `num:specimen` della
  collezione indicata come `Illustrated example` (Imhoof, Imhoof, Glasgow),
  senza `num:weight`.

- senza bibliografia (oltre a Lane): Antioch 11, Antioch 13 (`Bibliography: none`).

- legende da ritrascrivere (OCR insufficiente):
  - **Antioch 14**, rev.: Lane stampa `Ἀντιοχέων … ευιν …` con lacune sue.
    Codificato `Ἀντιοχέων <gap reason="illegible"/> <unclear>ευιν</unclear>
    <gap reason="illegible"/>`: il frammento centrale non è accentabile né
    integrabile senza vedere la pagina.
  - **Antioch 15**, rev.: idem con `χων` al posto di `ευιν`. Qui Tesseract non
    ha coperto la riga (ha riletto la riga mojibake del pdftotext come latino):
    `Ἀντιοχέων` è preso per parallelo con Antioch 16-17.
  - **Antioch 12**, rev.: nessuna legenda. Lane dice esplicitamente che
    l'iscrizione «now illegible … was around the edge of the coin». Il
    `<div subtype="face" n="rev">` è **omesso** (la faccia non è anepigrafe, è
    illeggibile); la prosa resta intera in `<ica:note>`.

- legende lette per parallelo:
  - l'etnico abbreviato è stato **uniformato a `Ἀντιοχ.`** in Antioch 1-11.
    Tesseract alterna `᾿Αντιοχ.` e `᾿Ἄντιοχ.` (e in Antioch 1 `᾿ἌΑντιοχ.`, con
    alfa raddoppiato) sulla stessa identica legenda a stampa: la variazione è
    rumore d'OCR, non variante epigrafica. Segnalato perché è una
    normalizzazione, non una lettura.
  - Antioch 15 rev.: `Ἀντιοχέων` per parallelo con 14/16/17 (vedi sopra).
  - Antioch 9: Tesseract dà `Εὐύγνω.` con ypsilon raddoppiato; il pdftotext dà
    `Euyv<u.` = Ευγνω. Codificato `Εὐγνω.`.
  - Antioch 5: entrambe le fonti danno `Ηριλοχο.`; è stato aggiunto lo spirito
    aspro (`Ἡριλοχο.`), che Tesseract non rende mai su Η iniziale. Il nome del
    magistrato resta insolito: **da verificare sul PDF**.
  - Antioch 1: `Εὐδη.` è la lettura di Tesseract; il pdftotext dà `Eu~'Y).`, dove
    `~` è ambiguo (rende Σ, β e θ altrove). La terza lettera va verificata.
  - Antioch 13: Lane stampa `Ἡρώδης (?)`. Nell'edizione va `Ἡρώδης`; il dubbio
    di Lane è reso da un `<p>` in `<div type="commentary">`.

- pesi scartati come implausibili: nessuno. Normalizzazioni applicate (tutte
  danno un peso plausibile e coerente con l'intervallo):
  - Antioch 2: `5-48 gr.` → 5.48
  - Antioch 22: `L27 gr.` → 1.27
  - Antioch 23: `I.37 gr.` → 1.37
  - Antioch 15: `Weight: 6.70 (Paris)` — Lane omette `gr.`; letto come grammi.

- pesi: casi non banali
  - Antioch 5: intervallo 4.37 (Imhoof) - 6.39 (London) + `Illustrated example:
    Copenhagen`, che non è fra le due collezioni pesate → tre `num:specimen`,
    il terzo con la sola `<num:collection>Copenhagen</num:collection>` e
    `rend="illustrated"`.
  - Antioch 6: 4.63 (Imhoof) singolo, ma illustrato New York → due specimen,
    solo il primo con peso, nessun intervallo sul tipo.
  - Antioch 18, 19, 21, 22, 23, 24: intervalli «examples known to Krzyzanowska»
    → intervallo sul tipo, nessuno specimen pesato, la fonte dell'intervallo in
    `<num:note>`, più lo specimen della sola collezione illustrata.

- elementi iconografici NON mappati (restati solo in `ica:note`):
  - Antioch 3, 6, 8: «Eagle's head in field» — il vocabolario ha `eagle` ma non
    la testa d'aquila; `bucranium` esiste perché è una chiave a sé, `eagle_head`
    no. Non forzata.
  - Antioch 1-13 (rev.): «Humped» del toro — la gibba non ha chiave.
  - Antioch 14, 15, 16, 17: «walking» di Nike — `pose` ha standing/seated/
    riding/reclining/galloping, non `walking`.
  - Antioch 14: «decorated with fillets»; Antioch 16: «decorated with a crown»;
    Antioch 17: «undecorated» — attributi del ramo di palma, non della figura.
  - Antioch 14, 16, 17: «six-pointed» / «eight-pointed» della stella — resa la
    sola chiave `star`, il numero di punte resta in nota.
  - Antioch 22: «Goat standing r. with head turned back» — **nessuna figura
    codificata sul rovescio**: `goat` non è nel vocabolario e `head_turned` non
    esiste (vedi sotto). La `<ica:side n="rev">` porta la sola `<ica:note>`.
  - Antioch 23: «decorated with garland, lit» — `garland` esiste come chiave ma
    non c'è un `@rel` per «decorato con»; la fiamma non ha chiave. Codificato
    il solo `symbol/altar`.
  - Antioch 24: «carrying a trophy» (il trofeo della statuetta di Nike) e «These
    are the Antiochene attributes…» — non mappabili, come prescrive il contratto.

- chiavi che sarebbe servito avere nel vocabolario:
  - `goat` (capra) — Antioch 22, che resta senza figura sul rovescio
  - `eagle_head` (testa d'aquila) — Antioch 3, 6, 8
  - `walking` in `pose` — Antioch 14-17
  - `head_turned` in `gesture` — Antioch 22 (il contratto lo dichiara inesistente)
  - `trophy` in `held_object` — Antioch 24
  - `humped` / `zebu` come tratto del toro — Antioch 1-13

- dubbi sulla numerazione o sulla zecca:
  - 12 entry su 24 portano `# ATTENZIONE: numerazione OCR incerta`: 1, 10, 11,
    12, 13, 14, 15, 16, 17, 18, 19, 21. Le testate nell'OCR greco confermano la
    sequenza (`Antioch I`, `Antioch IO`, `Antioch I I`, `Απηποοΐ, 12`,
    `Απέοοῖ, 13`, `Αηῆοοῦ 14`, `Antioch IS`, `Αποοΐ τό`, `Δ ηποοΐ, 17`,
    `ΑρηπῆΖἝἔἶἰοοΐ, 1`[=18]): la numerazione progressiva 1-24 è coerente e senza
    salti, ma **nessuna è stata verificata sul PDF**.
  - **Numerazione interna di Lane divergente**: i rimandi «Lane, II, p. 30,
    Antioch 1 / 2 / 3 / 4 / 5» e «Lane, II, p. 31, Antioch 7» compaiono nelle
    bibliografie delle entry 1, 14, 18, 20, 22, 24. Sono rimandi alla
    *discussione* alle pp. 30-31, con una numerazione dei tipi che **non
    coincide** con quella del catalogo (p. es. Antioch 24 cita «Lane, II, p. 31,
    Antioch 7»). Riportati come Lane li stampa: non sono errori d'OCR.
  - Zecca: Antioch = Antiochia di Pisidia (mints.tsv, regione Pisidia). Il
    Remarks di Antioch 5 avverte che gli esemplari del BM erano attribuiti ad
    *Antiochia sul Meandro* e sono stati riattribuiti alla Pisidia (NC, 1914,
    p. 300); di qui anche le citazioni `BMC Caria` nelle entry 1-5. Nessun
    intervento: resta tutto in commento e bibliografia.

- correzioni bibliografiche fatte (oltre a `no.`→`n.`, `PI.`→`Pl.`):
  - Antioch 5: `BMC Caria, p. IS, no. 8` → `p. 15, n. 8` (nel Remarks) e
    `nos. 10 and II` → `nn. 10 and 11`
  - Antioch 18: `and pI. 169` → `and p. 169`; `rev. 10, II` → `rev. 10, 11`
  - Antioch 19: `and pI. 141` → `and p. 141`; `pp. 168-6g` → `pp. 168-69`
  - Antioch 20: `Hunt., II, p. 515, no. I and PI. LVIII, II` →
    `p. 515, n. 1 and Pl. LVIII, 11`
  - Antioch 23 e 24: `Krzyzanowska, MG` → `MC` (così in tutte le altre entry)
  - Antioch 24: `BMG Lycia` → `BMC Lycia`; `rev. 1-5, 7, 9, I I` → `… 9, 11`
  - **non** corrette, perché non ne sono sicuro: `Antiocheia I` (Antioch 14, 16)
    e `Pl. II, II` (Antioch 16).
# Batch B11 — 24 entry (Antioch, Pisidia, 25–48)

- entry codificate: 24 (CMRDM-II-ANTIOCH-25 … -48)
- validazione: `xmllint --noout` OK su tutti; `lint.py` sui soli file B11: FATAL 0, ERROR 0, WARNING 0
- legende: tutte latine, faccia con `xml:lang="la"`, prese dal testo pdftotext.
  Nessuna legenda greca in questo blocco (unica eccezione grafica: Antioch 39,
  vedi sotto)

## senza peso

nessuna: tutte le 24 entry hanno almeno un peso.
Senza `num:weight` sul **tipo** (peso singolo, solo `num:specimen`): 29, 33, 36,
38, 41, 48.

## senza bibliografia (oltre a Lane)

nessuna: ogni entry ha almeno una voce oltre al CMRDM II.

## legende da ritrascrivere (OCR insufficiente)

nessuna per colpa dell'OCR. Due facce omesse perché **Lane stesso** non dà la
legenda (dato, non difetto di lettura); in entrambi i casi la sua constatazione
è conservata in `<div type="commentary">`:

- **Antioch 29**, rev.: «Inscription illegible» → `div subtype="face" n="rev"`
  omesso.
- **Antioch 32**, obv.: «obscure on all examples» → `div subtype="face" n="obv"`
  omesso.

Un terzo caso è una legenda **parziale** data da Lane:

- **Antioch 33**, obv.: Lane stampa `Pescen ....` → reso
  `Pescen<gap reason="illegible" extent="unknown" unit="character"/>`.

## pesi scartati come implausibili

nessuno. Normalizzazioni OCR applicate (tutte dentro 0,5–35 g):

- Antioch 25: `7.II gr.` → **7.11** (I→1)
- Antioch 42: `28.8r gr.` → **28.81** (r→1)
- Antioch 43: `6.8g gr.` → **6.89** (g→9)

Casi «intervallo con una sola collezione nominata» (intervallo sul tipo + un solo
specimen pesato), dove il secondo estremo è dichiarato da Lane come «heaviest
known to Krzyzanowska» e finisce in `<num:note>`: Antioch 28 (5.45 Aulock –
6.91) e Antioch 31 (4.45 Cambridge – 6.82).

Casi «examples known to Krzyzanowska» (intervallo sul tipo, nessuno specimen
pesato, collezione citata in `<num:note>`): 25, 26, 27, 34, 35, 40, 42, 43, 44,
45, 46, 47. In tutti c'è però un `Illustrated example:` senza peso proprio, reso
come `<num:specimen rend="illustrated">` con la sola `<num:collection>`, come
prescrive il contratto.

## elementi iconografici NON mappati (restati solo in ica:note)

- **tutte le entry con rovescio standard (25, 26, 27, 29, 30, 31, 32, 33, 35, 36,
  37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48)**: "with Antiochene attributes".
  Lane rinvia alla descrizione estesa data una sola volta in **Antioch 24** (fuori
  da questo batch: bucranio e gallo ai piedi, statuetta di Nike con trofeo nella
  sinistra tesa). In questo batch non li ripete, quindi **non sono stati dedotti**:
  restano solo nella prosa. → **Questo è il punto che merita più attenzione del
  coordinatore**: se si decidesse di propagare gli attributi antiocheni come
  figure accessorie (`bucranium`, `cock`, `Nike`), andrebbe fatto in un passaggio
  unico su tutta Antiochia, non batch per batch.
- Antioch 30: "rooster lacking on some dies" — il gallo è nominato solo per
  dirne l'assenza su parte dei coni: nessuna figura `cock` creata.
- Antioch 34: "l. elbow resting on column" e "Nike on globe" — il **globo** e la
  **colonna** non hanno chiave; mappata la sola `held_object/Nike` con
  `hand="left"`. Resta in nota anche l'inciso «This detail of representation
  continues on other large denomination coins down to Gordian III».
- Antioch 35: "(there are variations in detail)".
- Antioch 28: "crescent extended all the way under neck" — reso con
  `lunar/crescent_shoulders` (è la falce dietro/sotto le spalle), ma la
  precisazione «all the way under neck» non è esprimibile e resta in nota.

## chiavi che sarebbe servito avere nel vocabolario

- **`held_object/globe`** e **`support/column`** (o un `attribute/column`):
  Antioch 34, dove la posa di Men è caratterizzata proprio dal gomito appoggiato
  a una colonna e dalla Nike su globo. È la varietà più abbondante dell'intero
  corpus secondo Lane, quindi la perdita non è marginale.
- una chiave composita per gli **«Antiochene attributes»** (bucranio + gallo +
  Nike con trofeo), che Lane tratta come un'unità iconografica riconoscibile:
  oggi l'unico modo di renderla è elencare i tre elementi, cosa che in queste
  entry Lane non fa.
- `headgear/star` è stato usato per «starry cap» (28, 41) come prescrive il
  BRIEF; nel vocabolario `star` è registrato come chiave-figura, non come
  copricapo: funziona ma è una forzatura da sanare a monte.

## dubbi sulla numerazione o sulla zecca

- **Antioch 31** e **Antioch 41** portano in testa
  `# ATTENZIONE: numerazione OCR incerta`. Verificata la sequenza sul testo
  pdftotext delle pagine 108-109: 30 → 31 → 32 e 40 → 41 → 42 sono continue e
  coerenti con i ritratti (Commodo per 30-32, Settimio Severo per 34-41, Giulia
  Domna da 42). La testata di 31 è resa dall'OCR come `Απμοοῦ 31`: è il nome
  della zecca sfigurato, **il numero non è in dubbio**. Nessuna correzione.
- **Antioch 27** — Lane dà obv. «L. Aurelius Caesar», cioè Lucio Vero prima del
  161. `regnanti.tsv` non prevede una fase «come Caesar» per Lucio Vero e Lane
  non scrive «as Caesar», quindi `origDate` porta 0161-0169 (gli anni della
  tabella). Se si vuole la fase di Caesar, va aggiunta alla tabella.
- **Antioch 30** — analogo: obv. «L. Aurelius Commodus», unbearded; datato
  0177-0192 (regno) e non 0166-0177 (Caesar), perché Lane non dice «as Caesar».
- **Antioch 39** — la legenda del rovescio è `Col. MHNI Antioc`: Lane stampa il
  dativo greco ΜΗΝΙ **in caratteri latini** dentro una legenda latina. Conservato
  com'è, faccia `xml:lang="la"`. Se si preferisce `MHNI` in greco, è una
  decisione editoriale da prendere a livello di corpus.
- **Antioch 34** — la bibliografia rimanda a «SNG Cop., **Phrygia**, Pl. I, n. 27»
  per una zecca di Pisidia: è quello che scrive Lane, lasciato intatto.

## correzioni OCR applicate alla bibliografia (elenco, per controllo)

Sistematiche: `no.`→`n.`, `nos.`→`nn.`, `PI.`→`Pl.`, `BMG Lycia`→`BMC Lycia`,
`Krzyzanowska, MG`→`MC`, `KI. M.`→`Kl. M.`, `Krzyzamowska, MN, 1965`→
`Krzyzanowska, WN, 1965` (46).
Puntuali, tutte con la regola S→5 / l→1 / O→0 / I→1 e confermate da occorrenze
parallele: 30 `Table II`→`Table 11`; 33 `Antioch I I`→`Antioch 11`;
34 `no. 3S87`→`n. 3587`, `no. 71S4`→`n. 7154`, `p. SIS`→`p. 515`,
`no. SI21`→`n. 5121`, `p. lOS`→`p. 105`; 35 `Av. l-VIII`→`Av. I-VIII`;
38/40 `Table IS`→`Table 15`; 39 `p. XIV, Table 17`→`Pl. XIV, Table 17`;
42 `49-5 1`→`49-51`; 43 `rev. 7. 8, II, 13`→`rev. 7, 8, 11, 13` (e soppressa la
riga `7`, numero di pagina finito nel ritaglio); 46 `Jul. Dom. 7, II, 16`→
`7, 11, 16`; 47 `Jul. Dom.lo`→`Jul. Dom. 10`.
Lasciata com'è, perché non sicura: 34 `Roscher, Pl. Ia, n. 12` (l'OCR dava
`PI. la`).
Corretto nel testo di Lane anche `Severns` → `Severus` (34-40), confusione di
forma dell'OCR.
# Batch B12 — 12 entry (Antioch 49-60, Pisidia)

- entry codificate: 12 (CMRDM-II-ANTIOCH-49 … -60)
- xmllint: 12/12 well-formed; lint.py: 0 FATAL, 0 ERROR, 0 WARNING sui file del batch

## Legende
Tutte e 24 le facce hanno legenda latina leggibile nel testo pdftotext: nessuna
faccia omessa, nessuna entry senza `<div type="edition">`. Facce marcate
`xml:lang="la"`.

Correzioni OCR applicate (tutte su lettere, non su numeri):
- 58, 59 obv.: `Imp. M. luI. Philippus …` → `Imp. M. Iul. Philippus …` (l/I per I/u).

Legende lasciate come stampate, perché sono *legende barbare o abbreviate* di
Lane e non artefatti OCR evidenti — ma meritano un controllo sul PDF:
- 50, 51 obv.: `P. Sepimios Geta` (manca la *t* di Septimios: può essere la
  forma della moneta o un refuso dell'OCR);
- 51 rev.: `Antioch Mends Col.` (*Mends* = *Menis*?);
- 55 rev.: `Col. Ces. Antioci SR`;
- 60 obv.: `Imp. C. Vimp. Galussiano Aug.` e rev. `Antiochicla S R`: entrambe
  fortemente corrotte. Sono le più sospette del batch.

## Pesi
- senza peso: nessuna entry.
- pesi scartati come implausibili: nessuno (l'intervallo del batch è 4.95–27.56 g,
  coerente con i due nominali antiocheni: i piccoli 4.95–10.42 g, i grandi
  21.67–27.56 g).
- specimen senza peso, creati solo per l'`Illustrated example:` (`<num:specimen
  rend="illustrated">` con la sola `<num:collection>`): 54 (Paris), 55 (Paris),
  56 (London), 57 (Vienna), 59 (Berlin).
- estremi dell'intervallo che NON sono collezioni ma formule di Krzyzanowska
  («heaviest/lightest known to», «examples known to»): 49, 54, 55, 56, 57, 58,
  59, 60 — registrati in `<num:note>`, non come specimen.
- 50: la collezione del pezzo più leggero è «copy in author's possession»
  (l'esemplare illustrato). Riportata testualmente in `<num:collection>`: non è
  una collezione pubblica, e chi coordina può volerla normalizzare.
- 53: `23.91 gr.-25.73 gr. (London)` — una sola collezione per un intervallo:
  intervallo sul tipo + un solo specimen (25.73, London, illustrato), secondo il
  contratto.

## Elementi iconografici NON mappati (restati solo in ica:note)
- 49, 50, 51, 52, 53, 54, 56, 57, 58, 59, 60: «with Antiochene attributes» —
  formula-scorciatoia di Lane per il gruppo di attributi del Men antiocheno
  (globo, colonna, Nike, bucranio…). Non è una chiave: resta in prosa. Ricorre
  in 11 entry su 12: se il vocabolario volesse una chiave sintetica, questo è il
  candidato più frequente del corpus.
- 52: «in his extended hand he holds not a figure of Nike, but a band with two
  loops under his arm, one above» — descrizione in negativo: NON è stata creata
  nessuna figura Nike, e la «band with two loops» non ha chiave.
- 56: «barrier in front of temple» — nessuna chiave per la transenna. Il tempio
  è reso come `<ica:figure type="symbol" key="temple"/>` senza `@rel`: il
  vocabolario non ha una relazione «dentro/entro».
- 57: «standing on a pedestal», «Between them there is an altar» — nessuna
  chiave per il piedistallo; l'altare è una figura senza `@rel`, perché manca
  una relazione «fra due figure».
- 60: «including the globe and column which characterize the large-denomination
  coins from Septimius Severus to Gordian III» — globo e colonna non hanno chiave.

## Chiavi che sarebbe servito avere nel vocabolario
- una relazione `between` (fra due figure) — 57, altare fra Men e Tyche;
- una relazione `inside` / `within` (figura entro un edificio) — 56, Men nel tempio;
- `pedestal` (base su cui sta la figura) — 57;
- `globe` e `column` — 60;
- `barrier` / transenna — 56;
- `Tyche` come chiave di figura: usata in 57 (il BRIEF la elenca fra le divinità
  ammesse) ma NON presente in `iconographyLabels.ts`, che ha solo Men, Nike,
  Attis, Helios, eagle. Va aggiunta al vocabolario condiviso, altrimenti la
  scheda resterà senza etichetta italiana nell'interfaccia.
- Nota: `starry cap` (55) è stato reso `headgear/star` come prescrive il BRIEF,
  non `lunar/crescent_cap` come dice `mappatura-campi.md`. I due documenti
  divergono su questo punto; è coerente con quanto già fatto in altri batch
  (p.es. CMRDM-II-JULIOPOLIS-10).

## Dubbi di numerazione o di zecca
- **Antioch 51**: il file di input porta `# ATTENZIONE: numerazione OCR incerta`.
  La testata è letta dall'OCR come `Αημοοῖ, 51` (mojibake di *Antioch 51*). La
  sequenza però è continua e coerente (50 → 51 → 52), i contenuti non si
  sovrappongono, e il rimando `Plate XXXV` è al posto giusto: il numero 51 è da
  considerare confermato dal contesto. Vale comunque una verifica sul PDF.
- **Antioch 49**: nel blocco OCR della pagina 116 compare, prima della testata,
  un residuo `Weight: 5.60 gr. (Vienna) / Illustrated example: Vienna` che
  appartiene alla entry precedente (Antioch 48, non di questo batch): ignorato.
  Il peso di 49 è quello della riga `Weight:` della entry, 21.80–25.29 g.
- Zecca: `mints.tsv` dà `Antioch / Pisidia`, senza id Nomisma: `<num:mint>` senza
  `@ref`, come da contratto. Il titolo usa la forma «Antioch» della tabella (non
  «Antiochia di Pisidia») per uniformità con gli altri batch.

## Autorità e date
Nessuna entry dice «as Caesar»: usati gli intervalli pieni di `regnanti.tsv`.
- 50 e 51 hanno legenda `P. Sepimios Geta` senza titolatura augustea (possibile
  fase di Caesar, 0198-0209), ma Lane non lo dice: datate 0209-0211 come 49 e 52.
- 59 (Filippo II) ha legenda `Imp. M. Iul. Philippus Aug.`, identica a quella di
  Filippo I in 58 a meno di `A.`/`Aug.`: l'attribuzione a Filippo II è di Lane
  (`Obv.: Bust of Philip II`) ed è stata seguita. Datata 0247-0249.

## Bibliografia
Tutte le 12 entry hanno bibliografia oltre a Lane. Normalizzazioni:
`no.`→`n.`, `nos.`→`nn.`, `PI.`/`Plo`→`Pl.`; `CaracaUa`→`Caracalla` (53);
`J ul. Dom.`→`Jul. Dom.` (49); `Av. Ill`→`Av. III` (59); `Pl. 3 19, 7`→
`Pl. 319, 7` (54); doppione `WN, 1965, 1965`→`WN, 1965` (52); sigla `Me`→`MC`
per l'opera di Krzyzanowska (57), che nelle entry vicine è `MC`.
Lasciate come lette, ma sospette e uniformi in tutto il batch:
- `BMG Lycia` (49, 50, 53, 58): è quasi certamente `BMC Lycia`. Non corretto qui
  perché la scelta va presa una volta per tutto il corpus.
- `Krzyzanowska, MG` vs `MC`: l'OCR oscilla fra le due sigle per la stessa opera.
- `Krzyzanowska, WN, 1964, Pl. XI, n. § I` (55): il numero è illeggibile (`§ I`),
  lasciato come letto.
- `Pl. XL-LXI` (59) e `Pl. LXV-XLVI` (60): intervalli di tavole non crescenti,
  probabilmente `XL-XLI` e `XLV-XLVI`. Non corretti: sono numeri.
# Batch B13 — 26 entry

Zecche: Apollonia Pisidiae (2), Ariassus (1), Baris (7), Colbasa (2),
Conana (4), Lysinia (1), Olbasa (4), Palaeopolis (4), Pappa-Tiberia (1).
Tutte in Pisidia. Tavole XXXVI–XXXIX.

- entry codificate: 26
- `xmllint --noout`: 26/26 valide
- `lint.py`: FATAL 0, ERROR 0; 1 WARNING atteso
  (`APOLLONIA-PISIDIAE-1: senza origDate` — il dritto è Men, non un ritratto imperiale)

## senza peso

nessuna: Lane dà un peso o un intervallo per tutte e 26.

## senza bibliografia (oltre a Lane)

- CMRDM-II-APOLLONIA-PISIDIAE-1 (`Bibliography: none`)

## legende da ritrascrivere (OCR insufficiente)

Facce omesse del tutto: il livello di testo del PDF resta mojibake e Tesseract
`grc` non ha reso quelle righe. Il `<div subtype="face">` non è stato scritto
(niente `<space unit="side"/>`: la faccia ha una legenda, solo illeggibile).

| entry | faccia | stringa mojibake |
|---|---|---|
| ARIASSUS-1 | obv | `Au. K. M. Au. 'Av"t'wvdvoc;` |
| BARIS-2 | obv | `AUT. r. M. K. TpOCLOCVO~ ~exw~ ~~.` |
| BARIS-3 | obv | `r. M. K. 'ETPOUcrx. ~exw~ K.` |
| BARIS-4 | obv | `r. M. K. 'E-t"pouO"x. ~exw~ K.` |
| COLBASA-2 | obv | `Au. K. M. Au. 'Av't"Cllve:Lvoc;` |
| CONANA-3 | obv + rev | `Au,,:. KOCL. M. Au. 'A'J,,:w'Je:~'Jo~` / `KO\lcx\lecu\l` |
| CONANA-4 | obv + rev | `AUT. K. M. Au. ~e:. 'AAe~cx\lopo!:; ~e:.` / `KO\lcx\lecu\l` |
| PALAEOPOLIS-2 | obv | `Au. Kex. M. Aup. 'Av't"wve:Lvoc;` |
| PALAEOPOLIS-3 | obv | `Au. K. M. Au. ~e:. AAe~lXvapo~` |
| PALAEOPOLIS-4 | obv | `Au. K. M. Au. ~e:. 'AM~lXvapo~` |

CONANA-3 e CONANA-4 restano quindi **senza `<div type="edition">`**: entrambe le
facce illeggibili. Il rovescio è certamente `Κονανέων` (Tesseract lo rende su
Conana 1 e 2), ma la stringa mojibake di Conana 3/4 (`KO\lcx\lecu\l`) **non è**
quella di Conana 1/2 (`KO'JOC'JEW'J`), quindi la regola della lettura per
parallelo non si applica. Sono le due entry del batch che più meriterebbero una
ritrascrizione a vista dalla pagina 126 del PDF.

## legende lette per parallelo

nessuna.

## legende ricostruite con l'aiuto del testo pdftotext

- **BARIS-6 obv**: Tesseract dà `Αὐτ. [΄. Οὐειβ. Τρβ. Γαλλο. Σεβ.`; il `[΄` è un
  Γ mal reso, confermato dal pdftotext (`AUT. r. OUEL~. T p~. raAAo. ~E~.`,
  dove `r` = Γ). Scritto `Αὐτ. Γ. Οὐειβ. Τρβ. Γαλλο. Σεβ.`.

## pesi scartati come implausibili

nessuno scartato, ma uno **dubbio**:

- **ARIASSUS-1**: `Weight: 18.90 gr. (M & M), 38.10 gr. (Milan)`. 38,10 g è
  sopra la soglia di plausibilità indicata dal BRIEF (0,5–35 g) e il divario
  con l'esemplare M & M è del doppio. La cifra non richiede però nessuna
  normalizzazione OCR (non ci sono lettere al posto di cifre), quindi è stata
  riportata com'è, con l'intervallo 18.90–38.10 sul tipo. **Da verificare sul
  PDF**: se fosse 28.10 o 18.10 l'intervallo cambierebbe.

Normalizzazioni OCR applicate ai pesi (tutte con esito plausibile):
`3-40` → 3.40 (CONANA-1), `II.6I` → 11.61 (CONANA-3), `I2.88` → 12.88
(CONANA-4), `5.I7` → 5.17 (LYSINIA-1), `g.I8` → 9.18 (OLBASA-3),
`I9.50` → 19.50 (OLBASA-4), `4.gI` → 4.91 (PALAEOPOLIS-1).

## elementi iconografici NON mappati (restati solo in ica:note)

- APOLLONIA-PISIDIAE-1: "Quiver (?)" — il rovescio non ha nessuna `ica:figure`,
  solo la `ica:note`. È l'unica faccia del batch senza figure strutturate.
- APOLLONIA-PISIDIAE-2: "with a bunch of grapes"
- BARIS-5: "foot on bucranium"
- CONANA-4: "The end of his staff is decorated with a crescent."
- LYSINIA-1: "with Antiochene attributes, but without rooster"
- OLBASA-4: "Shield unclear."
- PALAEOPOLIS-3: "standing slightly l." (reso come `dir="left"` secco)

## chiavi che sarebbe servito avere nel vocabolario

- `held_object/quiver` (faretra) — APOLLONIA-PISIDIAE-1 rev
- `held_object/grapes` (grappolo d'uva) — APOLLONIA-PISIDIAE-2 rev
- una chiave per la falce lunare **sull'estremità del bastone** — CONANA-4.
  Le chiavi lunari esistenti (`crescent_shoulders`, `crescent_cap`, `crescent`)
  non coprono il caso e non sono state forzate.
- `rel/under_foot` (o l'estensione di `at_feet`) per «foot on bucranium»:
  il BRIEF elenca esplicitamente «bucranium under foot» fra gli elementi da
  non forzare, quindi BARIS-5 perde il bucranio nella parte strutturata,
  mentre BARIS-1 («bucranium at feet») lo conserva come figura accessoria.
- una nozione per «Antiochene attributes», formula ricorrente di Lane per le
  colonie pisidiche (qui LYSINIA-1, e nel corpus anche Parlais e Antioch).

Convenzione adottata nel batch, da confermare: il bucranio è
`<ica:trait type="held_object" key="bucranium"/>` quando Lane lo elenca fra gli
attributi senza posizione («with pine-cone and bucranium»), ed è invece
`<ica:figure type="symbol" key="bucranium" rel="at_feet" relTo="1"/>` quando
Lane ne dà la posizione («bucranium at feet», BARIS-1).
Lo scudo di Olbasa («carrying small/large shield») è reso
`<ica:trait type="held_object" key="shield"/>`.

## dubbi sulla numerazione o sulla zecca

Segnalate dal segmentatore con `# ATTENZIONE: numerazione OCR incerta`
(sono tutte teste di serie, cioè il nr. 1 di una zecca — il rischio è basso ma
va confermato sul PDF):

- APOLLONIA-PISIDIAE-1, ARIASSUS-1, BARIS-1, COLBASA-1, PAPPA-TIBERIA-1

Altri dubbi:

- **Fase di Caesar.** Cinque entry hanno una legenda del dritto che dice
  esplicitamente Καῖσαρ / Caesar, ma Lane non scrive mai «as Caesar» nella
  prosa. Ho applicato la regola alla lettera (anni del regno pieno da
  `regnanti.tsv`); se il coordinamento preferisce gli anni della fase di
  Caesar, vanno cambiate:
  - APOLLONIA-PISIDIAE-2 (`Αὐρηλ. Και.`, Marco Aurelio: 0161-0180 → 0139-0161)
  - OLBASA-2 (`Aurel Caesar`, Marco Aurelio: idem)
  - LYSINIA-1 (`Π. Σεπ. Γέτας Κ.`, Geta: 0209-0211 → 0198-0209)
  - BARIS-3 e BARIS-4 (`… Δεκίω Κ.`, Erennio Etrusco: 0250-0251; la tabella non
    dà una fase di Caesar distinta, quindi restano come sono)
  - BARIS-5 (`Μέσσιος Κυίντος Κ.`, Ostiliano: 0251-0251)
- **CONANA-3**: Lane intitola l'entry «Conana 3» ma rimanda a «Lane, II, p. 34,
  Conana 5»; **COLBASA-2** rimanda a «Lane, II, p. 54, Colbasa 2» dove le altre
  voci di Colbasa citano p. 33. Riportati come stampati.
- **LYSINIA-1**: la prima voce di bibliografia è «Babelon, RN, 1983» — data
  impossibile per un rimando a Babelon. Non avendo la certezza fra 1883 e 1893
  l'ho lasciata come la stampa la dà.
- **Numeri di catalogo normalizzati** (scambi I/1 che ritengo sicuri per la
  sequenza in cui cadono, ma vale la pena di un controllo):
  `SNG Cop., Pisidia, Pl. 5, no. III` → n. 111 (BARIS-2);
  `BMC Lycia, p. 209, no. I I` → n. 11 (BARIS-7);
  `Wroth, NC, 1898, p. II7` → p. 117 (BARIS-3);
  `SNG Aulock, Pl. 299, no. 86II` → n. 8611 (LYSINIA-1);
  `18g8` → 1898 (APOLLONIA-PISIDIAE-2).
# Batch B15 — 27 entry (Sagalassus 1–27)

- entry codificate: 27 (CMRDM-II-SAGALASSUS-1 … -27)
- xmllint: 27/27 well-formed. lint.py: 0 FATAL, 0 ERROR sui file del batch;
  3 WARNING «senza origDate» (Sagalassus 1, 2, 3: dritti con Athena/Roma,
  Hermes, Herakles — nessun ritratto imperiale, corretto).

## senza peso
nessuna: Lane dà un peso per tutte e 27.

## senza bibliografia (oltre a Lane)
Sagalassus 3, 8, 24, 27 (`Bibliography: none`).

## legende da ritrascrivere (OCR insufficiente)
Il ri-OCR Tesseract della p. 134-143 ha reso solo una parte delle legende;
per le altre resta il mojibake del livello di testo del PDF, e non c'è un
parallelo *carattere per carattere* già reso. Facce omesse:

- **Sagalassus 1**, rev: `~(xy(XA(XO".` — decodifica a vista come Σαγαλασ.
  (cfr. Sagalassus 16), ma le due stringhe mojibake non coincidono
  (`O"` vs `O'`, `(x` vs `(X`): non riportata.
- **Sagalassus 9**, obv: `Au. K. M. Au. 'Av't"(UvLvoc;`
- **Sagalassus 10**, obv: `Au't". K. M. Aup. 'Av't"(UvLvoc;`
  — rev: Lane lascia il campo `Inscription:` **vuoto**. Entrambe le facce
  senza legenda → in questa scheda `<div type="edition">` è omesso del tutto.
- **Sagalassus 12**, obv: `'10. Me:. Ae:. :EZU1Jp. Motx.pe:~\loc; Au.`
- **Sagalassus 15**, obv: `Au. K. r. 'Iou. M(X~~[L~. Auy.`
- **Sagalassus 18**, obv: `MlXp. '(!-t.. ~e:OU~PIXV ~.`
- **Sagalassus 19**, obv: `Au. K. r. M. Tp . .MXLO~`
- **Sagalassus 20**, obv: Lane scrive `Inscription: faint` — non è
  anepigrafe, la legenda non è leggibile. Annotato in `<div type="commentary">`.
- **Sagalassus 21**, obv: `Au. Koc.. roc.. OUL. T p. rcXAAO~`
- **Sagalassus 23**, obv: `'A. K. n. Ao. roc.AL'Yjv6v~`
- **Sagalassus 25**, obv: `Au. K. M. Aup. KAOCUaWV ~e:~. I`
- **Sagalassus 26**, obv: `Au. K. M. Aup. KAOCUa~OV I`
- **Sagalassus 27**, rev: l'OCR dà
  `Σαγαλασσέων α΄ [Πἰσι. Σιδηδῶν ὁμόνοια`, con parentesi spuria e un
  etnico di Side che è quasi certamente Σιδητῶν (il mojibake di Lane,
  `~~~'YJ~W\l`, punta a Σιδητῶν, non a Σιδηδῶν). Faccia omessa: da
  ritrascrivere sulla tavola/pagina.

## legende lette per parallelo
- **Sagalassus 19**, rev e **Sagalassus 20**, rev: mojibake
  `~IXYIXAIXO"O"ec.uv`, identico carattere per carattere a quello di
  Sagalassus 18 rev, che Tesseract rende Σαγαλασσέων. Riportata quella lettura.
  La postilla di Lane sul sigma iniziale «made to resemble a crescent moon»
  è confluita in `<ica:note>` della faccia, non nell'edizione.

## correzioni di lettura da segnalare
- **Sagalassus 27**, obv: l'OCR dà `᾿Α. Κ. Γ}άλλος Οὐολουσσιανο.`; la graffa
  è rumore di ritaglio e la lettura Γάλλος (= Gallus Volusianus) è quella
  scritta nell'edizione. Da confermare sulla pagina.
- **Sagalassus 6**, obv: OCR `Αὐτ. Και. ᾽Άντωνιν.`; spirito staccato unito
  nel precomposto → `Ἄντωνιν.` L'acuto viene dall'OCR, il mojibake di Lane
  (`AUT. KOtL. 'AVTWVLV.`) non lo ha.

## pesi scartati come implausibili
nessuno. Normalizzazioni OCR applicate (tutte dentro 0,5–35 g):
`I.73`→1.73 (Sag. 7), `3.65` senza «gr.» (Sag. 9), `I.50`→1.50 (Sag. 11),
`I.13gr.`→1.13 (Sag. 13), `I.36`→1.36 (Sag. 16), `I2.30`→12.30 (Sag. 18),
`II.66`/`I2.I4`→11.66/12.14 (Sag. 19), `I2.68`→12.68 (Sag. 20).
I pesi bassi (1.13–2.86 g su Sag. 7, 11, 13, 16) restano sospetti per una
zecca che altrove sta sui 8–20 g, ma sono quello che Lane stampa.

## specimen illustrato senza peso proprio
- **Sagalassus 1**: `Illustrated example: Aulock`, ma i pesi sono di
  Copenhagen e Imhoof → terzo `<num:specimen rend="illustrated">` con la sola
  `<num:collection>Aulock</num:collection>`.
- **Sagalassus 25**: `Illustrated example: London`, pesi di Vienna e Aulock →
  stesso trattamento con London.

## elementi iconografici NON mappati (restati solo in ica:note)
- Sagalassus 1: "with Corinthian helmet" (nessuna chiave per l'elmo); e
  l'incertezza di identificazione "Athena (or Roma?)".
- Sagalassus 2: "No laurel wreath" (assenza di un attributo: non esprimibile).
- Sagalassus 12: "Indistinct object at feet".
- Sagalassus 16: "no cloak".
- Sagalassus 26: "which ambles slowly" (andatura del cavallo).
- Sagalassus 27: "on l. of coin" / "on r." (posizione compositiva sul tondello:
  il vocabolario `position` ha solo upper/lower_left/right) e
  "clasping hands" (la sola chiave di gesto è `hands_raised`).

## chiavi che sarebbe servito avere nel vocabolario
- `headgear/helmet` (elmo corinzio, Sagalassus 1);
- `gesture/dexiosis` o `gesture/clasped_hands` per la stretta di mano delle
  monete di omonoia (Sagalassus 27);
- un `@rel` per la collocazione destra/sinistra sul tondello, distinta dalla
  relazione fra figure (Sagalassus 27).

## scelte dubbie segnalate
- **Sagalassus 19**, rev: «Bust of Men with starry cap, laureate, r.». Ho letto
  sia `starry cap` sia `laureate` come detti del berretto → `headgear/star` +
  `headgear/wreath`, coerentemente con Sagalassus 1 e 5 («cap laureate»). Se
  `laureate` va invece riferito alla testa, la chiave giusta sarebbe
  `portrait/laureate_head`.
- **Sagalassus 6, 10**: «Men riding l.» senza animale nominato → nessun
  `mount`. Solo Sagalassus 26 («on horse») ha `mount/horse`.

## dubbi sulla numerazione o sulla zecca
- Zecca: nessun dubbio (Sagalassus, Pisidia; `mints.tsv` non dà id Nomisma,
  quindi `<num:mint>` è senza `@ref`).
- Le entry 1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 portano in testa
  `# ATTENZIONE: numerazione OCR incerta`. La sequenza è però continua e
  coerente con l'OCR greco delle pp. 134-143, dove le testate compaiono come
  `Sagalassus I` (=1), `Sagalassus IO` (=10), `Sagalassus II` (=11),
  `ϑαραίαδοης 12`, `ϑαραίαδϑδις 13`, `ϑαραίαςϑιξ 14`, `Sagalassus IS` (=15),
  `ϑαραίαςϑις τό` (=16), `ϑαραίαδϑδιδ 17`, `ϑαραίαδοηξ 18`,
  `ϑαραίαξϑιδ 10` (=19): si tratta di deformazioni della testata, non di
  numeri diversi. Numerazione ritenuta affidabile.
- **Sagalassus 21**: Lane (o l'OCR) ripete due volte la stessa voce
  «Lane, II, p. 36, Sagalassus 13». Trascritta una sola volta.
- **Sagalassus 12** rimanda a due luoghi di Lane, II («Sagalassus 7» e
  «Sagalassus 17»): è la numerazione di *A Re-Study of the God Men, II*,
  non di questo volume; lasciata com'è.
# Batch B16a — 10 entry

Seleuceia (Pisidia) 2–11. `mints.tsv` non dà un id Nomisma per Seleuceia: `num:mint` senza `@ref`.

- entry codificate: 10 (Seleuceia 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Seleuceia 2, Seleuceia 4 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente):
  - Seleuceia 2, obv e rev: Lane stesso scrive «Inscription illegible» su entrambe le facce → nessun `<div type="edition">`. Non è una moneta anepigrafe: il dato è «legenda illeggibile».
  - Seleuceia 3, obv: il ri-OCR greco della p. 144 non copre questa riga; resta solo il mojibake `Au. Kcx.LO'. M. Aup. 'Av"t'wVE:~vo!:;`. Quasi identico a Seleuceia 4 (`Αὐτ. Καισ. Μ. Αὐρ. Ἀντωνεῖνος`) ma **non** carattere per carattere: 3 ha `Au.` dove 4 ha `Au"t'.` — cioè Αὐ. contro Αὐτ. Non riportata per parallelo; faccia omessa.
  - Seleuceia 6, obv: solo mojibake `At)"t'. K. M. Au. 'AAS~oc\l8poc;`; la variante di Seleuceia 7 ha in più `~e:u.` (Σευ.), quindi nessun parallelo utilizzabile. Faccia omessa.
  - Seleuceia 7, obv: solo mojibake `AUT. K. M. Au. ~e:u. 'AAS~oc\l8poc;`. Faccia omessa.
  - Seleuceia 11, obv: solo mojibake `Au. K. Mocp. 'Av. ropoLocv6<; Eu. ~E:.`; Seleuceia 12 (fuori batch) ha una stringa mojibake diversa e nemmeno lei è coperta dal ri-OCR. Faccia omessa.
- legende lette per parallelo:
  - rev di Seleuceia 3, 4, 5, 6, 8, 9, 10, 11: `Κλαυδιοσελευκέων`. Tesseract la rende pulita su alcune righe e con la prima lettera duplicata su altre (`ΚΚλαυδιοσελευκέων`, `ΚΚαλαυδιοσελευκέων`, `Κἄαλαυδιοσελευκέων`): normalizzata alla forma senza duplicazione, che è quella che l'OCR stesso dà più volte nella stessa colonna.
  - Seleuceia 10, obv: `Γ. Ἰου. Μάξιμος`. Il ri-OCR dà `[᾿. Ἴου. Μάξιμος`; la prima lettera è restituita dal pdftotext (`r.` = Γ, lo stesso scambio di `ropoLocv6<;` = Γορδιανός).
- pesi scartati come implausibili: nessuno.
  - normalizzato `7.II gr.` → 7.11 g (Seleuceia 7, Copenhagen).
  - Seleuceia 4 (20.83 g, Berlin) e Seleuceia 2 (18.75 g, Vienna) restano alti ma sono coerenti con il Remarks di Lane su Seleuceia 4 («much larger denomination»): tenuti.
- elementi iconografici NON mappati (restati solo in ica:note):
  - Seleuceia 2, 3, 4, 6, 8, 9, 10, 11: "hand on hip" / "l. hand on hip" (in Seleuceia 8 e 10 senza indicazione di quale mano).
- chiavi che sarebbe servito avere nel vocabolario:
  - `gesture/hand_on_hip` — ricorre in 8 delle 10 entry di questa zecca ed è, con bastone e bucranio, il tratto che Lane usa per identificare il tipo standard di Seleuceia.
- dubbi sulla numerazione o sulla zecca:
  - Seleuceia 10 e 11 portano `# ATTENZIONE: numerazione OCR incerta`: la testata è letta `Seleuceia IO` e `Seleuceia II`, cioè 10 e 11 con lo scambio I/1 tipico. La successione delle entry sulla pagina (9 → 10 → 11 → 12) conferma la numerazione; nessuna correzione applicata.
  - Seleuceia 10, rev: Lane scrive «Men standing with staff and bucranium» senza `r.`/`l.` (a differenza di tutte le altre entry della zecca): `@dir` omesso.
  - `Lane, II, p. 37, Seleucia 3` in Seleuceia 6 ha la grafia «Seleucia» (senza -e-) nell'originale: lasciata come sta.
  - `BMG` → `BMC`: nessuna occorrenza in questo batch.
# Batch B16b — 10 entry

Seleuceia 12-14, Sibidunda 1, Timbrias 1-4, Attaleia 1-2. Tutte codificate.
`xmllint --noout`: 10/10 OK. `lint.py`: FATAL 0, ERROR 0, WARNING 1
(TIMBRIAS-1, «senza origDate»: atteso, il dritto è un busto di Men).

- entry codificate: 10
- senza peso: nessuna
- senza bibliografia (oltre a Lane): SELEUCEIA-13, TIMBRIAS-2
- legende da ritrascrivere (OCR insufficiente): il **dritto** di SELEUCEIA-12,
  SELEUCEIA-14, TIMBRIAS-3, TIMBRIAS-4 e SIBIDUNDA-1. In tutti e cinque i casi
  il ri-OCR Tesseract `grc` non ha toccato la riga `Inscription:` del dritto
  (resta il mojibake del livello PDF: `Au. K. MlXp. ' Av. rOp~LIXVO~ Eu. ~e:.`,
  `Au. K. M. Aup. KAIXU~LO~`, `Au. K. M. ' AV't"cu€Lv.`,
  `Au. K. M. Au. ' AV't"cuver:vo~`, `Au. K. M. Au. 'Av't'(Uve~voc;`).
  Le stringhe *non* coincidono carattere per carattere con nessuna resa greca
  disponibile altrove, quindi non ho applicato la lettura per parallelo: il
  `<div subtype="face" n="obv">` è omesso. I rovesci di quelle stesse entry
  sono invece leggibili e presenti.
- legende lette per parallelo: SELEUCEIA-13 rovescio. L'OCR dà
  `ΚΚἅαλαυδιοσελευκέων`, con raddoppio meccanico delle prime lettere; reso
  `Κλαυδιοσελευκέων` come in SELEUCEIA-12/14 e nella già approvata
  SELEUCEIA-2/1.
- pesi scartati come implausibili: nessuno. Normalizzati:
  `7-89` → 7.89 (Sel. 12), `I4.8I` → 14.81 (Sel. 14), `I2.65` → 12.65
  (Timbrias 2), `lo.88` → 10.88 (Attaleia 1).
- elementi iconografici NON mappati (restati solo in ica:note):
  - `CMRDM-II-SELEUCEIA-14`: "hand on hip" (come in SELEUCEIA-2 già approvata)
  - `CMRDM-II-SIBIDUNDA-1`, `CMRDM-II-ATTALEIA-1`: "foot on bucranium" — il
    bucranio non è tenuto in mano, quindi niente `held_object/bucranium`
  - `CMRDM-II-TIMBRIAS-1`: "Caps of the Dioscuri" — sul rovescio ho codificato
    la sola `<ica:figure type="symbol" key="star"/>`; i pilei restano in nota
  - `CMRDM-II-TIMBRIAS-2`, `-3`: i "(?)" di Lane su patera e altare. I tratti
    e la figura `altar` ci sono (Lane li nomina), l'incertezza sopravvive solo
    nella prosa della `<ica:note>`: non ho aggiunto `@cert` per non divergere
    dagli altri batch. Se il coordinamento decide di marcarla, è un passaggio
    meccanico su queste due schede.
- chiavi che sarebbe servito avere nel vocabolario:
  - `gesture/hand_on_hip` (Seleuceia 14, e già Seleuceia 1-2)
  - `foot_on` come `@rel` accessorio, o `held_object` distinto da "attributo a
    terra", per "foot on bucranium" (Sibidunda 1, Attaleia 1)
  - `headgear/pileus` o `symbol/dioscuri_caps` per i berretti dei Dioscuri
    (Timbrias 1)
- dubbi sulla numerazione o sulla zecca:
  - 6 delle 10 entry portano `# ATTENZIONE: numerazione OCR incerta`
    (Seleuceia 12-14, Sibidunda 1, Timbrias 1, Attaleia 1). Le testate greche
    della pagina ri-OCR confermano la sequenza (`ϑοίομοσία 12`, `13`, `14`,
    `Sibidunda I`, `Timbrias I`, `Attaleia I`), quindi ho tenuto i numeri dati;
    restano da riscontrare sul PDF.
  - `CMRDM-II-ATTALEIA-2`, **da decidere in coordinamento**: la legenda del
    dritto è `Ἀ. Σ. Γέτας Καῖσαρ`. Lane nella descrizione non scrive «as
    Caesar», ma la legenda dice Καῖσαρ: ho usato gli anni della fase di Caesar
    di `regnanti.tsv` (0198-0209) invece di 0209-0211. Se la convenzione del
    progetto è di applicare la fase di Caesar solo quando lo dice la prosa di
    Lane, vanno cambiati questi due attributi.
  - `CMRDM-II-ATTALEIA-2`, legenda del dritto: l'iniziale letta `᾿᾽Α.` (doppio
    spirito) è sospetta — per Geta ci si attenderebbe `Π. Σ.` (Publius
    Septimius). Ho trascritto `Ἀ. Σ.` come dà l'OCR, ma è un punto da rivedere
    sulla tavola.
  - `CMRDM-II-SELEUCEIA-13`, dritto: Lane stampa `.... Τρανκυλλῖνα Σε.`; i
    quattro punti sono suoi, non dell'OCR, e li ho resi con
    `<gap reason="illegible" extent="unknown" unit="character"/>`. Se il
    contratto preferisce un'altra resa (o l'omissione della faccia), è
    uniformabile.
  - `CMRDM-II-TIMBRIAS-1`, dritto: Lane dà solo `A B P (?)`. Non essendo
    decidibile se siano lettere greche o la lettura latinizzante di Lane, non
    l'ho messa in edizione: sta come `<p>` nel commento.
  - Sibidunda: `mints.tsv` la dà in Pisidia, mentre la voce bibliografica di
    Lane cita `BMC Phrygia`. Ho seguito `mints.tsv`.
- normalizzazioni bibliografiche applicate: `PI.` → `Pl.`, `no.` → `n.`,
  `nos.` → `nn.`, `lnv. Wadd.` → `Inv. Wadd.`, `JlAN` → `JIAN`. `BMG`/`Miinzen`
  non ricorrono in questo lotto (`BMC Phrygia` era già corretto).
# Batch B17a — 10 entry (Sillyon 1-10, Pamphylia)

- entry codificate: 10 (Sillyon 1-10)
- senza peso: Sillyon 3 (`Weight: unavailable`; resta il solo
  `<num:specimen rend="illustrated">` con `<num:collection>Hecht collection</num:collection>`)
- senza bibliografia (oltre a Lane): Sillyon 3 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente): la faccia `obv` è stata omessa in
  - **Sillyon 7** — Tesseract non ha reso la riga, resta il mojibake pdftotext
    `A. AUPYJA. K6ll.OaOC;`. Non identico alla stringa di Sillyon 5, quindi non
    leggibile per parallelo (qui pare `Αὐρηλ.`, là `Αὐρη.`).
  - **Sillyon 8** — idem, `AUT. KIX"i:O"lXp A. AUPYJA. K6ll.OaOC;`.
  - **Sillyon 10** — idem, `Au. KOCL. A. ~e:1t. ~e:oulipo~ TIe:.`. L'unica resa
    Tesseract vicina (Sillyon 14/15, p. 154: `Αὐτ. Κ. Λ. Σεπτου. Σεουῆρος Πε.`)
    ha una stringa mojibake diversa (`KOCL.`/`~e:1t.` vs `K.`/`Σεπτου.`).
  In tutti e tre i casi il `rev` (`Σιλλυέων`) è stato scritto: la faccia omessa
  è solo l'obv, e la faccia NON è dichiarata anepigrafe.
- pesi scartati come implausibili: nessuno. Normalizzati:
  `25.IO gr.` → 25.10 (Sillyon 9, Winterthur).
- elementi iconografici NON mappati (restati solo in ica:note):
  - Sillyon 8: "no stars on cap" — negazione, non un attributo: nessun trait.
    Non ho neppure scritto `headgear/phrygian_cap`, perché Lane dice solo "cap".
  - Sillyon 4: idem, il berretto resta implicito; codificato il solo
    `headgear/star` da "stars on cap".
  - Sillyon 10: "foot on bucranium" — caso esplicitamente escluso dal contratto
    ("bucranium under foot"): nessuna chiave forzata.
  - Sillyon 9: "with aegis" — reso con `portrait/cuirassed_bust` come da tabella,
    l'egida resta in nota.
- chiavi che sarebbe servito avere nel vocabolario:
  - una chiave per il bucranio **calpestato** (Men con il piede sul bucranio), che
    è un modulo iconografico ricorrente a Sillyon (nn. 10-13 di Lane) e non è un
    `held_object/bucranium`: servirebbe qualcosa come `attribute/bucranium_underfoot`
    o un `@rel="below"` su una figura `symbol key="bucranium"`.
  - una chiave per l'egida distinta da `cuirassed_bust`.
- dubbi sulla numerazione o sulla zecca:
  - Sillyon 1 e Sillyon 10 portano `# ATTENZIONE: numerazione OCR incerta`.
    Il contesto della pagina conferma entrambe (p. 134 «sillyon I» fra Attalea e
    «Silly on 2»; p. 137 «Sillyon IO» fra Sillyon 9 e «Sillyon I I»): numerazione
    1 e 10 sicura, ma il numero **non** è stato riverificato sul PDF.
  - `mints.tsv` non dà un id Nomisma per Sillyon: `<num:mint>` senza `@ref`.
  - Bibliografia di Sillyon 10: `BMC Lycia` (Lycia, Pamphylia et Pisidia) è la
    forma corretta, non un `BMG` da normalizzare.
- normalizzazioni tipografiche applicate alle voci bibliografiche:
  `no.` → `n.`, `PI.`/`Plo` → `Pl.`, `lnv.` → `Inv.`, `18g8` → `1898`,
  `p. 4I` → `p. 41`, `Miinzen` → `Münzen` (anche in `<num:collection>`,
  Sillyon 8 e 9: segnalo perché altri batch potrebbero aver lasciato `Munzen`).
- normalizzazioni del greco: `Αὐὖτ.` → `Αὐτ.` (Sillyon 5), `ΚΚομμ.` → `Κομμ.`
  (Sillyon 6), `Σιυλλυέων` → `Σιλλυέων` (Sillyon 6, 10), `λΛουκίλλα` → `Λουκίλλα`
  (Sillyon 4), `᾿Αντωνεῖνος` → `Ἀντωνεῖνος` (Sillyon 6, 9),
  `Σεβαστὴ` → `Σεβαστή` in fine legenda (Sillyon 3, 4).
# Batch B17b — 10 entry (Sillyon 11-20, Pamphylia)

- entry codificate: 10 (CMRDM-II-SILLYON-11 … -20)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Sillyon 16, Sillyon 17 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente): il **dritto** di Sillyon 11, 12,
  13, 16, 17, 18, 19. In tutte e sette il Tesseract `grc` non ha coperto la riga
  del dritto (resta il mojibake del livello PDF: `Au. K. A. ~. ~e:oulipo~ TIe:p.`,
  `Au. K. M. Au. 'Av ..... .`, `Au. K. ITo. ~e. rs't'lXC;`…). Il `<div>` di quella
  faccia è omesso; il rovescio (`Σιλλυέων`) c'è in tutte e dieci.
  Non ho applicato la lettura per parallelo: le stringhe mojibake dei dritti
  differiscono fra loro e da quelle rese in greco su 14/15/20, quindi le
  abbreviazioni imperiali non sono le stesse.
- pesi scartati come implausibili: nessuno. Normalizzati due pesi OCR:
  `4.II gr.` → 4.11 (Sillyon 11, Copenhagen) e `28.II gr.` → 28.11 (Sillyon 20,
  Berlin); entrambi plausibili e coerenti con il resto della serie.
- elementi iconografici NON mappati (restati solo in ica:note):
  - `CMRDM-II-SILLYON-11`: "foot on bucranium"
  - `CMRDM-II-SILLYON-12`: "foot on bucranium"
  - `CMRDM-II-SILLYON-13`: "l. foot on bucranium"
  - `CMRDM-II-SILLYON-18`: "To the left, an altar." — l'altare è codificato come
    `<ica:figure n="2" type="symbol" key="altar"/>` **senza `@rel`**: «to the
    left» non ha un valore nel vocabolario delle posizioni relative
    (`in_front_of`/`behind`/`at_feet`/`above`/`below`/`in_field`/`around`/`flanking`)
  - `CMRDM-II-SILLYON-20`: "younger than preceding coin"
- chiavi che sarebbe servito avere nel vocabolario:
  - una posizione relativa `to_left` / `to_right` (Sillyon 18)
  - un `@rel` o un trait per «piede su bucranio»: `held_object/bucranium` esiste,
    ma qui il bucranio non è tenuto, è calpestato (Sillyon 11, 12, 13) — è un
    tratto ricorrente della serie di Sillyon, non un caso isolato
- dubbi sulla numerazione o sulla zecca:
  - le entry 12-19 portano `# ATTENZIONE: numerazione OCR incerta`. Ho verificato
    la sequenza sul blocco OCR di pagina: le testate sfigurate (`Sillyon IZ`,
    `ΘΗ ΝΟ 13`, `δή νον, 14`, `ΘΙ νΟΉ 15`, `δηείνον, τό`, `ϑηνοη, 17`,
    `δηγνον, 18`, `ΘΙ νοΉ 10`) corrispondono in ordine e per contenuto
    (Obv./Rev./Bibliography/Weight) a Sillyon 12-19. La numerazione è confermata.
  - `# zecca:` nei file 13-15 e 20 è degradata (`SiUyon`, `Silly on`): è sempre
    Sillyon.
  - bibliografia normalizzata: `BMG`→`BMC`, `Miinzen`→`Münzen` (anche in
    `num:collection` di Sillyon 14), `PI.`→`Pl.`, `no.`→`n.`, `colI.`→`coll.`
    (Sillyon 19). In Sillyon 18 l'OCR dà `Svoronos, IIAN, 1903`: normalizzato in
    `JIAN`, come nelle entry 11 e 12 dove la stessa rivista e la stessa annata
    sono lette correttamente.
# Batch B17c — 4 entry

Sillyon 21, 22, 23, 24. `xmllint --noout`: OK su tutti e 4.
`lint.py`: FATAL 0, ERROR 0, WARNING 0.

- entry codificate: 4 (SILLYON-21, -22, -23, -24)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): SILLYON-22 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente): SILLYON-21 obv — l'unica
  resa disponibile è il mojibake del livello PDF (`Au. K. ITo. ~e. rs't'lXc;`);
  il ri-OCR Tesseract della p. 156 riporta la stessa stringa mojibake, non una
  lettura greca. Faccia `obv` omessa. (Lettura attesa, da verificare sul PDF:
  titolatura di Geta Augusto.)
- pesi scartati come implausibili: nessuno. Normalizzati: nessuno — i quattro
  pesi (4.54/5.07, 22.80, 8.88, 19.20/26.60) erano già in cifre corrette.
- elementi iconografici NON mappati (restati solo in ica:note): nessuno
- chiavi che sarebbe servito avere nel vocabolario: nessuna
- dubbi sulla numerazione o sulla zecca:
  - SILLYON-21 porta `# ATTENZIONE: numerazione OCR incerta`. Il ri-OCR della
    p. 156 conferma la testata («ΘΙ ΜΟΉ 21» = Sillyon 21) e la sequenza
    20 → 21 → 22 è continua; la tavola («Plate XLIX») nel ri-OCR compare
    *dopo* il corpo della entry, ma appartiene a questa. Numerazione ritenuta
    corretta.

## Scelte editoriali da segnalare al coordinamento

- **`Ὀπελ.` (Opellius) in tre entry.** Il ri-OCR dà tre grafie diverse dello
  stesso gentilizio: `᾽Ὅπελ.` (22), `᾿Οπελ.` (23), `᾿᾽Οπελ` (24). Sono tutti
  spiriti staccati/doppi dell'OCR: normalizzati al precomposto `Ὀπελ.` (spirito
  dolce, come richiede Ὀπέλλιος). In 24 l'OCR non dà il punto abbreviativo, ma
  il livello PDF sì (`'OnEA'`): punto ripristinato.
- **`Ἄντω.`** in 23 e 24: l'OCR dà `᾽Ἄντω.` / `᾽'Ἄντω.`, spirito staccato
  davanti al precomposto. Normalizzato a `Ἄντω.`.
- **SILLYON-23, puntini finali della legenda del dritto.** Lane stampa
  `Ὀπελ. Ἄντω. Διαδου. ....`: i puntini sono suoi, la legenda prosegue e lui
  non la dà. Resi con `<gap reason="ellipsis" extent="unknown" unit="character"/>`,
  non come testo: quattro punti letterali nell'edizione farebbero scattare il
  controllo «placeholder» del lint. **Se il coordinamento preferisce un'altra
  convenzione per i puntini di Lane, questa entry va riallineata.**
- **`Men riding l.` (22 e 24).** Lane non nomina l'animale: nessun `mount`,
  solo `pose/riding`. Nel titolo italiano ho usato «Men a cavallo», la forma
  già adottata nelle schede Alia e Apameia — resta il fatto che la formula
  italiana dice più di quanto dica Lane.
- **Datazione di Geta (21).** Lane dice «unbearded», non «as Caesar»; la
  titolatura mojibake sembra quella di Augusto. Usati perciò gli anni
  0209–0211 di `regnanti.tsv`, non la fase di Caesar.
- **Diadumeniano (23 e 24), `bareheaded`.** Reso `portrait/draped_bust` +
  `portrait/bare_head` come da tabella del BRIEF.
- Bibliografie normalizzate: `no.` → `n.`, `PI.` → `Pl.`, `I9I3` → `1913`,
  `PI. I3` → `Pl. 13`, `Sillyon I5` → `Sillyon 15`, `PI. XII, I` → `Pl. XII, 1`.
  Nessun `BMG`/`Miinzen` in questo lotto.
# Batch B18a — 10 entry (Sillyon 25-34, Pamphylia)

- entry codificate: 10 (Sillyon 25, 26, 27, 28, 29, 30, 31, 32, 33, 34)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Sillyon 31 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente): faccia `obv` omessa in 5 entry —
  - Sillyon 27 (Severo Alessandro): Tesseract non ha restituito la riga in greco, resta il mojibake `Au. KCXL. Aup. ~. ~. 'AAs~cxvi)po~ ~e:~.`
  - Sillyon 30 (Gordiano III): idem, `Au. K. MlXp. 'Av. rOpaLlXVOV ~.`
  - Sillyon 31 (Filippo II): idem, `Au. K. M. 'Iou. ~e:ou. <l>lAL7t7tOC;; ~.`
  - Sillyon 32 (Filippo II): idem, `Au. K. M. 'Iou. ~eou. <PLAL7t7tOC; ~.`
  - Sillyon 33 (Filippo II): idem, `Au. K. M. 'Iou. ~e:ou. <PLAL7t7tOC; ~.`
  Le tre legende di Filippo II sono quasi certamente identiche a quella di
  Sillyon 34, che l'OCR greco dà come `Αὐ. Κ. Μ. Ἰου. Σεου. Φίλιππος Σε.`, ma le
  stringhe mojibake **non** coincidono carattere per carattere (`~e:ou`/`~eou`,
  `<l>lAL7t7tOC;;`/`<PLAL7t7tOC;`), quindi la regola del parallelo non si applica
  e la faccia è stata omessa. Con un colpo d'occhio sul PDF si recuperano tutte e tre.
- faccia `obv` omessa per dato di Lane, non per OCR: Sillyon 26, dove Lane stesso
  scrive `Inscription illegible`. Non è dichiarata anepigrafe.
- legende lette per parallelo: nessuna in senso stretto. Normalizzazioni fatte:
  - Sillyon 31 e 33, rev.: OCR `Σιυλλυέων` → `Σιλλυέων` (υ intrusivo; il mojibake
    `~~AAue(Uv`/`~~Mue(u\I` conferma otto lettere, senza doppio υ, ed è la forma
    costante in tutta la zecca).
  - Sillyon 25, obv.: `᾿[Ιουλίαν Μαῖσαν` → `Ἰουλίαν Μαῖσαν` (spirito staccato + parentesi spuria).
  - Sillyon 34, obv.: `ἊΑὐ. Κ. Μ. Ἴου. Σεου. Φίλιππος Σε.` → `Αὐ. Κ. Μ. Ἰου. Σεου. Φίλιππος Σε.`
- pesi scartati come implausibili: nessuno. Normalizzati:
  - Sillyon 32, `10.OO gr.` → `10.00` (intervallo 7.68-10.00).
  - Sillyon 25, `Weight: 22.00 (Aulock)`: Lane omette `gr.`, ma 22 g è nella norma
    dei grandi bronzi di Sillyon (22.80, 24.01, 26.60 nelle entry vicine); tenuto.
- elementi iconografici NON mappati (restati solo in ica:note):
  - Sillyon 26: "Men standing r. with **foot on bucranium**"
  - Sillyon 29: "Men standing r. with pine-cone and staff, **foot on bucranium**"
  - Sillyon 34: "Men standing r. with staff and pine-cone, **foot on bucranium**"
- chiavi che sarebbe servito avere nel vocabolario:
  - una chiave per il piede posato su un oggetto (`pose/foot_on` + `@relTo`, oppure
    `bucranium` come figura accessoria con `rel="below"`): ricorre 3 volte su 10 in
    questo solo lotto, ed è l'iconografia caratteristica del Men di Sillyon.
    Oggi la nozione sopravvive solo come prosa e non è interrogabile.
  - "starry cap" / "stars on cap" è reso con `headgear/star`, ma la chiave `star`
    è dichiarata in `iconographyLabels.ts` come *figure key* (simbolo autonomo),
    non come attributo del berretto: funziona, e il lint la accetta, ma è un
    riuso semanticamente storto. Servirebbe `headgear/starry_cap` accanto a
    `lunar/crescent_cap`. Ricorre in Sillyon 28, 30, 31, 32, 33.
- dubbi sulla numerazione o sulla zecca:
  - Sillyon 31: la entry porta `# ATTENZIONE: numerazione OCR incerta`. L'OCR della
    testata è `ΘΙ γΟΉ 31`; la sequenza 30 → 31 → 32 è però continua e coerente con
    le pagine 143-145, quindi il numero è stato tenuto.
  - Sillyon 32 e 33: testata `Silly on 32` / `Silly on 33` (spazio spurio), zecca
    comunque Sillyon.
  - Sillyon 29: Lane scrive solo "Bust of Gordian", ma `regnanti.tsv` ha il solo
    `Gordian III` e la legenda (`Μαρ. Ἀντ. Γορδιανόν` = M. Antonius Gordianus) è
    quella di Gordiano III. Codificato `Gordian III`, 0238-0244.
  - Sillyon 29, obv.: discrepanza fra le due fonti. L'OCR greco dà `Αὐ. Καὶ. Μαρ.
    ᾽Αντ. Γορδιανόν`, il mojibake del PDF `Au. K. MlXp. ' Av'r;. rOpaLlXVOV`,
    cioè `Κ.` e non `Και.`. Scritto `Αὐ. Και. Μαρ. Ἀντ. Γορδιανόν` (la varia su
    un'abbreviazione è rumore dell'OCR), ma il secondo elemento va verificato sul PDF.
  - Sillyon 31-34: Filippo II è datato 0247-0249 (Augusto), perché le legende
    portano `Σε.` (Σεβαστός) e non `Και.`. Da rivedere se sul PDF la sigla è altra.
  - Sillyon 33: `Weight: 3.80 gr. (Aulock) - 4.55 gr. (Aulock)` e `Illustrated
    example: Aulock`. Entrambi gli esemplari sono nella stessa collezione, quindi
    `rend="illustrated"` **non** è stato assegnato a nessuno dei due: attribuirlo
    a uno dei due sarebbe stato arbitrario. Da sciogliere sulla tavola LI.
  - Sillyon 25: `Lane, II, p. 38, Sillyon I I` normalizzato in `Sillyon 11`.
# Batch B18b — 10 entry (Sillyon 35-44, Pamphylia)

- entry codificate: 10 (CMRDM-II-SILLYON-35 … -44)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Sillyon 35, 36, 42 (Lane: «Bibliography: none»)
- legende da ritrascrivere (OCR insufficiente):
  - Sillyon 35, obv. — Lane dà solo `... ~zu~pcx ....` (legenda già lacunosa nell'originale); Tesseract non ha reso la riga. Faccia `obv` omessa.
  - Sillyon 36, obv. — Lane stesso scrive «Virtually illegible except for Ι»: non è una legenda, è una constatazione; riportata in `ica:note` della faccia, `div` obv omesso.
  - Sillyon 38, obv. — mojibake `Au". KOCL. TI. AL. rOCAAL1Jv6.`, nessuna resa Tesseract sulla pagina 162.
  - Sillyon 39, obv. — mojibake `AUT. KOCL. TI. A. rOCAAL1Jv6.`, idem.
  - Sillyon 41, obv. — mojibake `Au. K. IT. A. rIXM~'t)v6c;`, idem.
  - Sillyon 44, obv. — mojibake con lacune `Au. K. nou. A~. rIXAA~"Y)v6c; ....... KOpV"Y)AL` (titolatura doppia Gallieno + Cornelia Salonina), idem.
- legende lette per parallelo:
  - Sillyon 35 e 36, rev. — Tesseract rende `Σιυλλυέων`; è la stessa legenda che rende `Σιλλυέων` in tutte le altre entry di Sillyon (e in Sillyon 11, già approvata). Scritto `Σιλλυέων`, con l'υ spurio trattato come artefatto OCR.
  - Sillyon 37, rev. — Tesseract non ha reso la riga; la stringa mojibake `~LAAuewv` è identica carattere per carattere a quella di Sillyon 38, che Tesseract rende `Σιλλυέων`. Scritto `Σιλλυέων Ι`.
- lettere incerte lasciate come sono:
  - Sillyon 37, obv. — il prenome di Gallieno: pdftotext dà `A.` (una lettera), Tesseract `ΔΛ` (rumore). Trascritto `Λ.`, coerente con `Λι.` di Sillyon 40 e 43. Da verificare sul PDF.
  - Lo `Ι` finale delle legende (37, 40, 42, 43) è dato per lettera greca: Lane ne parla esplicitamente in Sillyon 37 («Ι apparently lacking on some dies»), riportato in `commentary`.
- pesi scartati come implausibili: nessuno.
- pesi da verificare:
  - Sillyon 36 — `35.73 gr. (Berlin)`: cifre ASCII non ambigue nel testo di Lane, nessuna normalizzazione applicata, ma il valore è sopra la finestra di plausibilità (0,5-35 g) del contratto. Scritto come sta; da ricontrollare sul PDF.
  - Normalizzazioni OCR applicate (I→1, o→0): 37 `I4.82`→14.82, `I9.78`→19.78; 38 `II.35`→11.35; 39 `Io.60`→10.60, `20.I5`→20.15; 40 `I5.25`→15.25; 42 `I4.84`→14.84; 44 `16.II`→16.11.
- elementi iconografici NON mappati (restati solo in ica:note):
  - CMRDM-II-SILLYON-40: "globe under bust" — nessuna chiave `globe` nel vocabolario.
  - CMRDM-II-SILLYON-41: "nothing under bust" — assenza, non attributo.
  - CMRDM-II-SILLYON-42: "Nothing under bust."
  - CMRDM-II-SILLYON-44: "Facing busts … r. and l." — la nozione di busti affrontati/giugati non ha chiave; resa con due figure e i rispettivi `@dir`.
- chiavi che sarebbe servito avere nel vocabolario:
  - `globe` (simbolo sotto il busto, ricorrente sulle emissioni di Gallieno a Sillyon);
  - una chiave di composizione per i busti affrontati/giugati (`confronted_busts` / `jugate_busts`).
- scelte di codifica da validare a monte:
  - «stars on cap» / «with starry cap» reso con `<ica:trait type="headgear" key="star"/>`, come prescrive il BRIEF; `mappatura-campi.md` prescriverebbe invece `lunar/crescent_cap`. I due riferimenti divergono: qui ha prevalso il BRIEF.
  - Sillyon 44 ha due ritratti imperiali: scritti due `<num:authority>` (Gallienus, Salonina), `origDate` sull'intervallo di Gallieno (0253-0268), titolo «sotto Gallieno e Salonina».
- dubbi sulla numerazione o sulla zecca:
  - CMRDM-II-SILLYON-41 porta `# ATTENZIONE: numerazione OCR incerta` (la testata della pagina 163 è letta `ΘΗ γο 41`). Il numero 41 è però confermato dalla sequenza 40-42 e dai riferimenti incrociati; resta da verificare sul PDF.
  - Sillyon 36: Lane stesso dubita dell'attribuzione (Remarks: possibile variante di Sillyon 51, Cornelius Valerianus). Riportato in `commentary`, attribuzione a Valeriano mantenuta.
# Batch B18c — 4 entry

Sillyon 45, 46, 47, 48 (tutte con Salonina al dritto, Plate LIII).

- entry codificate: 4 (CMRDM-II-SILLYON-45/46/47/48)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Sillyon 46, Sillyon 48 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente): nessuna. Le quattro legende del
  dritto sono confermate dal confronto fra mojibake del PDF e OCR Tesseract:
  45 `~e~.`/`Σεβ.`, 46 `~e:.`/`Σε.`, 47 `~e:~.`/`Σεβ.`, 48 `~e:~IX.`/`Σεβα.`
- pesi scartati come implausibili: nessuno
- elementi iconografici NON mappati (restati solo in ica:note): nessuno
- chiavi che sarebbe servito avere nel vocabolario: nessuna

## Segno finale «Ι» delle legende — da decidere a livello di corpus

Tutte e quattro le entry hanno un segno finale dopo la legenda del dritto
(mojibake ` I`, Tesseract ` 1`); Sillyon 48 lo ha **anche** dopo la legenda del
rovescio (`Σιλλυέων 1`). Non è una lettera della legenda: è quasi certamente un
segno di valore (iota = 10 assaria), e il Remarks di Sillyon 48 vi allude
esplicitamente («in spite of the l.», dove «l.» è l'OCR dello stesso segno).

Scelta fatta qui: **omesso dall'edizione** in tutti e quattro i file, perché
trascriverlo come `Ι` sarebbe un'interpretazione e come `1`/`l` un dato falso.
Il Remarks di 48, riportato integrale in `<div type="commentary">`, conserva
la forma di Lane («in spite of the l.»), e resta quindi leggermente opaco.

Il fenomeno non è locale a questo lotto: lo stesso segno compare nelle entry
Sillyon 43-44 e 49-51 (batch vicini). Serve una decisione unica del
coordinatore — o si omette ovunque, o si adotta una resa condivisa (per es.
`<am>Ι</am>` o una nota di faccia). Nessuna delle 34 schede Sillyon già
approvate ha un precedente: le loro legende del rovescio sono tutte `Σιλλυέων`
senza segno.

## Altre note

- Sillyon 45: `Weight: 20.24 (London) - 25.73 (Copenhagen)` — Lane omette qui
  «gr.», ma l'intervallo è a due collezioni: reso come intervallo sul tipo più
  due `<num:specimen>` (Copenhagen `rend="illustrated"`).
- Sillyon 48: `Illustrated example: Mossop collection` → `<num:collection>Mossop</num:collection>`,
  in forma coerente con il `(Mossop)` del peso.
- Sillyon 46: `Rev.: Bust of Men, 1.` — l'`1` è l'OCR di `l.` (sinistra):
  `dir="left"`, confermato dal mojibake `~LAA\)€W'` che non contiene cifre.
- Sillyon 47 e 48: `Men riding r.` senza animale nominato → nessun `mount`.
# Batch B19 — 6 entry (Sillyon 49-54)

- entry codificate: 6 (CMRDM-II-SILLYON-49 … 54)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Sillyon 51 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente):
  - Sillyon 49 obv — sia il livello PDF sia il ri-OCR Tesseract danno solo
    mojibake latino (`ITO\). ALX. Kop. OUIXAe:PLIX'I6'1 I`): faccia omessa
  - Sillyon 50 obv — idem (`TIou. ALit. Kop. OUIXAEPLIXVOV I`)
  - Sillyon 51 obv — idem (`KIXL. TIo. AL. OUIXAEpL ....`); nota: Lane ha qui
    dei puntini di sospensione, quindi la legenda è comunque mutila
  - Sillyon 52 obv — Tesseract legge `Πο. Λυως. Σαλων. Οὐαλεριανό. Σεβ.`:
    tutto plausibile tranne `Λυως`, che è corruttela dell'abbreviazione di
    Λικίνιος (cfr. `Λυκιν.` in Sillyon 42, `Λι.` in Sillyon 40/43). Non
    trascritta per non fissare una lettura falsa: basta un controllo a vista
    sulla p. 150 del PDF per recuperarla
  - Sillyon 53 obv — mojibake (`Ain;. Aou. L\O!1-L. AUp1JALCJ.v6c, I`);
    Tesseract non copre la riga
  - Sillyon 54 obv — idem (`AUT. Aou. L\O!1-L. AUP1JALCJ.VOC, ~. I`)
  Tutti i rovesci sono invece leggibili e trascritti.
- legende lette per parallelo:
  - Sillyon 52 rev — Tesseract dà `Σιυλλυέων` (υ intruso); trascritto
    `Σιλλυέων`, forma data da Tesseract per 49/50/51/53/54 nella stessa zecca
- pesi scartati come implausibili: nessuno.
  Segnalo però **Sillyon 51: 41.88 gr. (Paris)**, sopra la banda 0,5–35 g del
  contratto. La cifra non contiene caratteri ambigui per l'OCR ed è identica
  nel livello PDF e nel ri-OCR, quindi è stata mantenuta: se è un errore, è di
  Lane o della stampa, non della nostra lettura. Da verificare sul PDF.
- elementi iconografici NON mappati (restati solo in ica:note):
  - Sillyon 51: "No eagle under bust" — negazione, non codificabile come figura
    (per contrasto, in 49 e 50 "Eagle under bust" è `animal/eagle` rel="below")
- chiavi che sarebbe servito avere nel vocabolario: nessuna.
  `starry cap` reso con `headgear/star` secondo il BRIEF (che prevale sulla
  riga `stars on cap → lunar/crescent_cap` di mappatura-campi.md: discordanza
  fra i due documenti da sanare a monte).
- dubbi sulla numerazione o sulla zecca:
  - Sillyon 51 porta `# ATTENZIONE: numerazione OCR incerta` (la testata è
    letta `ΘΙ νΟΉ, 51`). La sequenza 49-50-**51**-52 è però coerente con la
    successione delle entry e delle tavole (LIV, LIV, LIV, LIV): numerazione
    ritenuta corretta.
  - Sillyon 50, `Remarks` di Lane: Imhoof attribuiva il ritratto a Saloninus.
    Seguita l'attribuzione di Lane (Cornelius Valerianus) per `num:authority` e
    `origDate`; la divergenza resta in `<div type="commentary">`.
- normalizzazioni bibliografiche applicate: `no.`→`n.`, `PI.`→`Pl.`,
  `18g8`→1898, `Ig03`→1903, `Ig08`→1908, `Pl. XII, 8-g`→`Pl. XII, 8-9`.
- lint: 6 file — FATAL 0, ERROR 0, WARNING 0; `xmllint --noout` pulito su tutti.
# Batch B20a — 10 entry

Galatia 1-8 (zecca = Koinon dei Galati, da `mints.tsv`) e Ancyra 1-2.

- entry codificate: 10
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Galatia 5, Galatia 8 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente):
  - Galatia 6, obv e rev: entrambe restano mojibake nell'OCR di p. 169
    (`Au. Ne:p. TPOCLOCVOC; ~e:. r.` / `KOLVOV rOCAocTtocc; En/. TIofL. Boccrcrol)`);
    la rev è quasi certamente «Κοινὸν Γαλατίας ἐπὶ Πομ. Βάσσου», ma la stringa
    non coincide carattere per carattere con nessuna resa greca, quindi non è
    stata scritta. **Omesso l'intero `<div type="edition">`.**
  - Galatia 7, obv: `M)',. Nep. TPOCLOCVOC; KOCLO'OCP ~e. r.` mojibake, senza
    parallelo identico. Omessa la sola faccia obv; la rev è greca e c'è.
  - Galatia 1, rev: Lane non apre nessun campo `Inscription:` sotto il Rev.
    (monogramma fra cornucopie). Non è «anepigrafe» dichiarato: la faccia rev
    è stata omessa dall'edizione, mentre l'obv porta `<space unit="side"/>`
    (`No inscription` esplicito).
- legende lette per parallelo:
  - Galatia 4, rev: mojibake `'En/. Boccrcrol) KOLVOV rOCAocTtocc;` identico
    carattere per carattere a quello di Galatia 5, che Tesseract rende
    «Ἐπὶ Βάσσου Κοινὸν Γαλατίας». Riportata quella lettura. La postilla
    «(very variable)» è andata in `<div type="commentary">`.
- pesi scartati come implausibili: nessuno. Normalizzati:
  `8 -42` → 8.42 (Galatia 2), `II.42`/`I7.30` → 11.42/17.30 (Galatia 6),
  `I8.68` → 18.68 (Galatia 7), `2I.28` → 21.28 (Galatia 8).
- elementi iconografici NON mappati (restati solo in ica:note):
  - Galatia 1: "Monogram of King Deiotarus"; "crossed" delle cornucopiae
    (codificata una sola `figure key="cornucopia"`, il numero e l'incrocio
    restano in nota)
  - Galatia 2: "Hexastyle" (resa solo `symbol/temple`)
  - Galatia 7: "distyle", "seen in 3/4 view to l."; il rapporto «standing in
    temple» non ha `@rel` nel vocabolario, quindi il tempio è figura n=2 senza
    `@rel`
  - Galatia 8: "as before" (non espanso: gli attributi patera/pigna di Galatia 7
    non sono stati dedotti), "temple to r." — nessun `@rel` adatto
  - Ancyra 1, rev: nessuna figura, solo la legenda; "arranged in four lines"
    resta in nota
  - Ancyra 2: "l. hand at side"
- chiavi che sarebbe servito avere nel vocabolario:
  - `@rel` per «entro/dentro» (figura stante *dentro* un tempio): Galatia 7
  - un `count`/`@n` per gli attributi ripetuti (due cornucopie incrociate):
    Galatia 1
  - un modo per esprimere la prospettiva («seen in 3/4 view»): Galatia 7
- dubbi sulla numerazione o sulla zecca:
  - Galatia 1 e Ancyra 1 portano `# ATTENZIONE: numerazione OCR incerta`: i
    numeri (Galatia I, Ancyra I) sono confermati dalla sequenza delle testate
    nell'OCR greco delle pp. 167-171 (Galatia 1→8 poi Ancyra 1→6), ma non sono
    stati verificati sul PDF a stampa.
  - Galatia = koinon, non città: `<placeName type="ancient">Koinon dei
    Galati</placeName>`, e nel titolo «del Koinon dei Galati» (non «di ...»)
    per ragioni di grammatica italiana. Da uniformare se altri batch toccano
    un koinon.
  - `origDate` assente in Galatia 1, Galatia 2 e Ancyra 1: il dritto è Men.
    Sono le 3 WARNING del lint, attese.
- interventi minori sulle bibliografie: `no.`→`n.`, `PI.`→`Pl.`, `lmhoof`→
  `Imhoof`, `KI. M.`→`Kl. M.`, `]. Scholz`→`J. Scholz`, `PI. 1I3`→`Pl. 113`,
  `no. I`→`n. 1`, `Pl. I, I I`→`Pl. I, 11`, `Roscher, Pl. la/lb`→`Pl. Ia/Ib`
  (forma già dominante in `out/`). In Galatia 4 la dittografia «NZ, 1910, 1910»
  è stata ridotta a «NZ, 1910».
- altro: in Galatia 3 l'OCR dà `Αὐτὸ Νέρουας`; scritto `Αὐτο` (abbreviazione di
  Αὐτοκράτωρ, il grave è un artefatto dell'OCR).

Validazione: `xmllint --noout` OK su 10/10; `lint.py` → FATAL 0, ERROR 0,
WARNING 3 (le tre `senza origDate` di cui sopra).
# Batch B20b — 10 entry (Ancyra 3–12)

- entry codificate: 10 (CMRDM-II-ANCYRA-3 … -12)
- senza peso: nessuna
- senza bibliografia (oltre a Lane): Ancyra 8, Ancyra 11 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente):
  - Ancyra 7, `Obv.` — Tesseract non ha ri-OCR la riga, resta il mojibake
    `At)'t". K. M. Aup. M. 'AV'!WVEi:vO<; Au'!o.`. Nessuna occorrenza identica
    carattere per carattere altrove in `entries/`, quindi la faccia `obv`
    dell'edizione è stata **omessa** (l'iconografia della faccia resta).
  - Ancyra 9, `Obv.` — idem, mojibake `Au't". K. M. Aup. 'Av'!wve:i:vo<; Auy.`;
    faccia `obv` omessa dall'edizione.
- pesi scartati come implausibili: nessuno. Normalizzati dall'OCR:
  `I7.I9`→17.19 (Ancyra 6), `I5.79`/`I8.46`→15.79/18.46 (Ancyra 7),
  `I4.56`→14.56 (Ancyra 8).
- elementi iconografici NON mappati (restati solo in ica:note):
  - Ancyra 3: "holding anchor" — nessuna chiave `anchor` nel vocabolario
  - Ancyra 5: "with anchor" — idem
  - Ancyra 6: "flaming" (altare), "short staff in Men's hand"
  - Ancyra 7: "arm resting on a column", "(Antiochene attributes)"
  - Ancyra 9: "slightly" (bearded)
  - Ancyra 10: "with Antiochene attributes" — l'unica indicazione del rovescio,
    quindi il rovescio ha la sola figura di Men stante, senza attributi strutturati
  - Ancyra 12: "flaming" (altare)
- chiavi che sarebbe servito avere nel vocabolario:
  - `anchor` (held_object) — ricorre su Ancyra 3 e 5, ed è l'attributo che
    distingue questi due tipi
  - `column` (held_object o symbol) — Ancyra 7, "arm resting on a column"
  - una nozione per il fuoco sull'altare (`flaming_altar` o trait sull'altare)
  - `Antiochene_attributes` come scorciatoia: Lane la usa come formula chiusa
    (Ancyra 7, 10, e più avanti 13–15), e oggi resta inespressa
- dubbi sulla numerazione o sulla zecca:
  - Ancyra 10, 11, 12 portano `# ATTENZIONE: numerazione OCR incerta`. L'OCR
    greco della pagina conferma la sequenza (`Ancyra IO`, `Ancyra II`,
    `Αηογγα 12`) coerente con Ancyra 9 e Ancyra 13 sulle pagine contigue:
    la numerazione è stata accettata come sta.

## Scelte da confermare con chi coordina

- **Ancyra 3, Antinoo come autorità.** L'`Obv.` è «Bust of Antinous r.» con
  legenda Ἀντίνοος Θεός: non è un imperatore né un'Augusta, e il BRIEF
  escluderebbe `origDate`/`num:authority`. Ma `regnanti.tsv` registra
  `Antinous 0130 0138 Antinoo «emissioni postume»`, che ha senso solo per
  questa entry: ho quindi scritto `num:authority key="Antinous"`,
  `origDate 0130–0138 evidence="portrait"` e titolo «sotto Antinoo».
  Se la regola del BRIEF prevale, vanno tolti tutti e tre.
  La figura è codificata `type="deity" key="Antinous"` (Lane legge Θεός).
- **Ancyra 4, «pine-cone (?)»**: reso come
  `<ica:trait type="held_object" key="pine_cone" cert="low"/>`. Se gli altri
  batch non usano `@cert` sui trait, il tratto va semplicemente omesso e la
  dubbia resta nella nota.
- **Ancyra 7, `Illustrated example: Weber`**: Weber non compare fra le
  collezioni pesate (Paris, London), quindi è stato creato un terzo
  `num:specimen` con la sola `<num:collection>Weber</num:collection>` e
  `rend="illustrated"`, come prescrive il BRIEF.
- **Ancyra 9, «starry cap»**: reso `headgear/star` secondo la tabella del
  BRIEF. `mappatura-campi.md` prescriveva invece `lunar/crescent_cap` per
  «stars on cap»: le due fonti divergono, ho seguito il BRIEF.
- **Ancyra 6 e 7, il gallo**: in Ancyra 6 Lane lo colloca («Cock in front of
  altar») → figura a sé `type="animal" key="cock" rel="in_front_of" relTo="2"`;
  in Ancyra 7 è un attributo in elenco → `trait type="mount" key="cock"`.
  Uniformare se il resto del corpus fa diversamente.

## Correzioni OCR applicate alle legende e alle bibliografie

- legende: spiriti staccati uniti nei precomposti (᾿Αντίνοος → Ἀντίνοος);
  `᾿ΪΙούλιος` → Ἰούλιος; `᾿Ανκχυρανοῖς` → Ἀνκυρανοῖς e `Ἀνχύρας` → Ἀνκύρας
  (χ intruso per κ, confermato dal mojibake `x` = κ); `Μῆητρο.` → `Μητρο.` e
  `Μῇητροπο.` → `Μητροπο.` (eta sdoppiata); `Σεουΐῆρος` → Σεουῆρος (ι intruso);
  `Αὖτο.` → `Αὐτο.`; `Ἣ` → `Ἡ`; `Σεβαστῆ` → `Σεβαστή` (perispomeni per ossia,
  nominativo femminile ossitono).
- puntini di sospensione di Lane resi con
  `<gap reason="ellipsis" extent="unknown" unit="character"/>`: Ancyra 4 obv,
  Ancyra 8 obv, Ancyra 10 obv e rev.
- bibliografie: `no.`→`n.`, `PI.`→`Pl.`; `Roscher, PI. la` → `Pl. Ia`;
  `Imhoof, Hl. M.` → `Imhoof, Kl. M.` (confermato da Ancyra 12);
  `BMC Galatia, p. II, no. 12` → `p. 11, n. 12` (I→1 in un numero di pagina,
  fra p. 9 e p. 12 della stessa serie di rimandi); `Berliner Bliitter fur
  Munz-, Siegel-, und Wappenkunde` → `Berliner Blätter für Münz-, Siegel-, und
  Wappenkunde` (stessa regola di `Miinzen`→`Münzen`).
- nessun segno di valore isolato in coda alle legende di questo lotto
  (il `β΄` compare da Ancyra 13 in poi, fuori batch).
# Batch B20c — 9 entry

Ancyra 13-15, Uncertain-perhaps-Ancyra 1, Germe 1, Pessinus 1-4.

- entry codificate: 9 (tutte). `xmllint --noout` OK su tutte; `lint.py` su questi 9 file:
  FATAL 0, ERROR 0, WARNING 2 (PESSINUS-1 e PESSINUS-2 senza `origDate`, corretto:
  il dritto è Men, e il rovescio di Pessinus 2 è il legato Annius Afrinus, non un imperatore).
- senza peso: nessuna.
- senza bibliografia (oltre a Lane): PESSINUS-2 (`Bibliography: none`), PESSINUS-4 (`Bibliography: none`).
- legende da ritrascrivere (OCR insufficiente):
  - ANCYRA-13, dritto: `r. nou~. ALX. OUIXAEPLIXVO~ ~E~.` — Tesseract non ha reso questa
    riga (l'ha letta come latino, identica al mojibake), quindi niente lettura per parallelo.
    Il `<div subtype="face" n="obv">` è omesso; la faccia resta descritta in `ica:note` e in
    `num:authority`/`origDate` (Valeriano). Da ritrascrivere sul PDF.
- pesi scartati come implausibili: nessuno. Normalizzazioni OCR applicate:
  `II.I4`→11.14 (Ancyra 13), `I2.9I`→12.91 (Ancyra 14), `8.I8`→8.18 (Ancyra 15),
  `7-45`→7.45 e `g.8r`→9.81 (Pessinus 1), `r2.67`→12.67 (Pessinus 3).
- elementi iconografici NON mappati (restati solo in ica:note):
  - ANCYRA-13: "with Antiochene attributes"
  - ANCYRA-15: "with Antiochene attributes"
  - ANCYRA-14: "foot on bucranium" (il BRIEF vieta di forzare una chiave per la relazione
    «bucranium under foot»; coerente con ACCILAEUM-1, APHRODISIAS-1, ATTALEIA-1, BARIS-5)
  - PESSINUS-1: "Humped" (del toro)
  - PESSINUS-4: "fold of clothing in lowered l. hand"
- chiavi che sarebbe servito avere nel vocabolario:
  - una chiave per gli "Antiochene attributes" come complesso (ricorre in ~30 schede del corpus)
  - `humped` / `zebu` per il toro gibboso di Pessinus 1
  - una relazione per "foot on X" (piede posato sopra), distinta da `at_feet` e da `below`
- dubbi sulla numerazione o sulla zecca:
  - ANCYRA-13, 14, 15 e GERME-1 portano `# ATTENZIONE: numerazione OCR incerta`: i numeri non
    sono stati verificati sul PDF. La sequenza della pagina 175-176 (Ancyra 13, 14, "Ancyra IS"
    = 15, poi "Uncertain, perhaps Ancyra", Germe 1, Pessinus 1) è però coerente.
  - ANCYRA-15: nell'OCR greco la testata "Ancyra IS" non è seguita da una riga `Plate`; il
    "Plate LVII" compare dopo la bibliografia. Ho seguito l'intestazione del segmento
    (`# tavola: Plate LVII`) e messo `Tav. LVII`: da confermare sul PDF.
  - UNCERTAIN-ANCYRA-1: seguito il BRIEF — `<num:mint cert="low">Ancyra</num:mint>` e
    `<placeName type="ancient" cert="low">Ancyra</placeName>`, regione Galatia. Nel `<title>`
    ho usato la forma della colonna `nome` di mints.tsv, «Ancyra (?)»: se il coordinamento
    preferisce prosa piena («di zecca incerta, forse Ancyra»), è un cambio di una riga.
    `num:reference/@n` = "Uncertain, perhaps Ancyra 1".
  - GERME-1: mints.tsv assegna Germe alla **Galatia** (la Germe più nota è misia). Ho seguito
    la tabella; se è un errore di tabella, va corretto a monte per tutte le schede.
- scelte editoriali da segnalare:
  - `Ν[εωκορίας]` (Ancyra 13-15) reso `Ν<supplied reason="lost">εωκορίας</supplied>`; l'OCR
    dà `Ν[εωχορίας]`/`Ν[εωκορίας]`: adottato κ, come in Ancyra 14.
  - `Κορνη. Σαλωνεῖ. ..` (Ancyra 15) → testo + `<gap reason="ellipsis" extent="unknown"
    unit="character"/>`, come in ANCYRA-10.
  - PESSINUS-1, Remarks: «One Paris example has ~ in field» — il simbolo è mojibake in
    entrambe le estrazioni; reso `One Paris example has <gap reason="illegible"/> in field.`
    Da recuperare sul PDF.
  - PESSINUS-2: Annius Afrinus codificato `type="secondary"` (governatore, non imperatore),
    quindi nessun `num:authority` e nessun `origDate`. "counterclockwise" (entrambe le facce)
    è in `ica:note`, non nell'edizione.
  - PESSINUS-1, peso `7.45 gr.-9.81 gr. (Paris)`: intervallo sul tipo + un solo specimen
    (Paris, 9.81) + specimen Imhoof con la sola collezione e `rend="illustrated"`.
  - ANCYRA-13: `Weight: 9.72 gr. (New York, damaged) - 11.14 gr. (Aulock)` — il «damaged»
    è conservato verbatim in `<num:note>`.
  - «(with variations)» di ANCYRA-13 e PESSINUS-3 → `<p>` in `div type="commentary"`.
# Batch B21a — 10 entry

- entry codificate: 10 (Laodiceia ad Libanum 1-4, Imperial Cistophori 1, G1-G5)
- lint: FATAL 0, ERROR 0, WARNING 0; `xmllint --noout` OK su tutti e 10

- senza peso: G1, G2, G3, G4, G5 (gemme: Lane non dà pesi)
- senza bibliografia (oltre a Lane): CMRDM-II-LAODICEIA-AD-LIBANUM-3,
  CMRDM-II-LAODICEIA-AD-LIBANUM-4 (`Bibliography: none`)

- legende da ritrascrivere (OCR insufficiente):
  - LAODICEIA-AD-LIBANUM-1, obv: solo mojibake `Ao't". K. A .. ~e7t. ~eou~po~`
    (Tesseract non ha reso la riga). Faccia omessa.
  - LAODICEIA-AD-LIBANUM-1, rev: Tesseract dà `λΛαοδως. πρὸς Λιβάνῳ Μήν.` —
    la parte `πρὸς Λιβάνῳ Μήν.` è netta, ma l'etnico/abbreviazione iniziale è
    corrotto (lambda duplicato, `Λαοδως` non è parola). Faccia omessa per
    intero: non si può omettere mezza legenda.
  - LAODICEIA-AD-LIBANUM-2, obv: solo mojibake `'A. K. M. Aop. 'AV't"WVLVO~`.
    Faccia omessa.
  - LAODICEIA-AD-LIBANUM-2, rev: stessa corruzione di Laod. 1
    (`λαοδως. πρὸς Λιβάνῳ Μὴν`). Faccia omessa.
  → Laod. 1 e 2 restano quindi **senza `<div type="edition">`**. Entrambe le
    legende del rovescio sono in realtà la stessa formula: basterebbe un
    controllo sul PDF (p. 178, tav. LIX) per recuperarle tutte e due in un
    colpo solo. Segnalo come il caso più recuperabile del lotto.
  - LAODICEIA-AD-LIBANUM-3 e -4, obv: Lane stesso scrive `Inscription
    illegible` → faccia omessa (non anepigrafe).

- pesi scartati come implausibili: nessuno.
  Normalizzazioni applicate: `1S.00gr.` → 15.00 g (Laod. 3); tutti gli altri
  già puliti.

- elementi iconografici NON mappati (restati solo in ica:note):
  - CMRDM-II-G2: "foot on bucranium" — il BRIEF elenca esplicitamente
    «bucranium under foot» fra gli elementi da non forzare, quindi non ho
    creato la figura accessoria. Se il coordinamento decide altrimenti, la
    resa naturale sarebbe
    `<ica:figure n="2" type="symbol" key="bucranium" rel="at_feet" relTo="1"/>`
    (entrambe le chiavi esistono già): va allineata su tutto il corpus, non
    sulla singola scheda.
  - CMRDM-II-G3: "cap laureate" — reso come `headgear/wreath`; il fatto che si
    tratti di un berretto (frigio?) non è dichiarato da Lane e resta in nota.
  - CMRDM-II-G3: "crescent visible only front and back" e CMRDM-II-G5
    "crudely rendered crescent front and back": posizione non riconducibile a
    `crescent_shoulders`, ho usato la chiave generica `lunar/crescent`.
  - CMRDM-II-G4: "crescent all the way underneath" — idem, `lunar/crescent`.
  - Laodiceia 1-4, rev: "holding horse l. by bridle" — il cavallo è reso come
    `<ica:figure type="animal" key="horse" dir="left">` **senza `@rel`**
    (Lane non dà una posizione relativa) e **senza** `mount`: non è cavalcato.
    Il gesto della briglia non ha chiave e resta in nota.

- chiavi che sarebbe servito avere nel vocabolario:
  - una chiave per il gesto "holding X by the bridle" / animale condotto a
    mano, distinto da `mount` (4 entry su 10 in questo lotto);
  - una posizione lunare "sotto/attorno alla testa" accanto a
    `crescent_shoulders` e `crescent_cap` (G3, G4, G5);
  - `foot_on` come `@rel` (G2), che è cosa diversa da `at_feet`.

- scelte di codifica da ratificare (casi speciali del lotto):
  - **G3**: "Head of Men" con berretto. Non ho scritto
    `portrait/bare_head` perché "testa nuda" contraddirebbe il berretto
    laureato; la regola meccanica del BRIEF (`Head of X` → `bare_head`) darebbe
    invece un dato falso. G4 e G5, dove Lane non nomina copricapi, hanno
    regolarmente `bare_head`. Da uniformare fra i batch.
  - **G5**: `Dimensions: 14 mm`, un valore solo (diametro?). Reso come
    `<dimensions><dim unit="mm">14</dim></dimensions>`: assegnarlo a `height`
    sarebbe stata un'affermazione non nel testo.
  - **LAODICEIA-AD-LIBANUM-3**, rev: la legenda `Λαοδικείᾳ τῇ πό[λει ...]` è
    resa con `<supplied reason="lost">λει</supplied>` + `<gap>`; il `(?)` di
    Lane è finito come `<p>` in `<div type="commentary">` («Lane gives the
    reverse legend with a question mark»), unica frase non di Lane in tutto il
    lotto. Se il coordinamento preferisce, si toglie.
  - **LAODICEIA-AD-LIBANUM-4**, rev: `..... Μὴν` reso
    `<gap reason="lost" extent="unknown" unit="character"/> Μήν`; accento
    normalizzato a ossia perché la varia in fine di legenda è impossibile.
  - **IMPERIAL-CISTOPHORI-1**: nessun `origPlace`, nessun `num:mint`, unico
    `num:metal key="ar"`, come da BRIEF. `num:reference @n` e il `<bibl>` di
    Lane portano "Imperial Cistophori 1": la testata a stampa è però **solo**
    "Imperial Cistophori", senza numero (il numero viene dal nome del batch).
    Le due facce hanno legenda latina → `xml:lang="la"`.
  - Laodiceia 1: `(with variations)` della legenda dell'obv messo come `<p>` a
    sé in commentary, benché la faccia obv sia omessa.

- dubbi sulla numerazione o sulla zecca:
  - LAODICEIA-AD-LIBANUM-1 e G1 portano `# ATTENZIONE: numerazione OCR
    incerta`. Nel testo OCR le testate leggono "Laodiceia ad Libanum I" e "GI",
    cioè 1 letto come I: la sequenza con Laod. 2/3/4 e G2/G3 conferma il
    numero. Considerati verificati per contesto, non sul PDF.
  - `mints.tsv` dà per IMPERIAL-CISTOPHORI `nome = (nessuna zecca indicata)`,
    `regione = (nessuna)`: nessuno dei due è stato scritto nell'XML.
  - Nessuna zecca di questo lotto ha un id Nomisma in `mints.tsv`: nessun
    `@ref` su `num:mint`.

- normalizzazioni bibliografiche applicate: `no.`→`n.`, `PI.`→`Pl.`,
  `ColI.`→`Coll.`, `fig. I`→`fig. 1`, `fig. I I`→`fig. 11` (G3, Drexler —
  lettura probabile ma non verificata sul PDF), `Severns`→`Severus`,
  `A ntiquites`→`Antiquites`, `Pierres Gravies`→`Pierres Gravees` (stesso
  titolo della voce Reinach). L'ellissi `......` nel titolo Reinach è stata
  tolta, non sostituita con puntini.
# Batch B21b — 10 entry (gemme G6-G15)

- entry codificate: 10 (CMRDM-II-G6 … CMRDM-II-G15)
- scheletro gemma: `<objectType>gem</objectType>`, `Location:` → `<repository>`,
  `Dimensions:` → `<dimensions>` in mm, niente `num:numismatics`, niente `ica:side`,
  niente `origPlace`/`origDate`, edizione anepigrafe `<ab><lb n="1"/></ab>`.
- `<msIdentifier/>` vuoto (`Location: ?`): G14, G15
- senza dimensioni (`unknown` / `unkaown`): G14, G15
- senza tavola (blocco `<facsimile>` omesso): G14
- senza bibliografia oltre a Lane: nessuna
- legende da ritrascrivere: nessuna — tutte le gemme sono anepigrafi, Lane non dà
  nessun campo `Inscription:` né legende dentro la prosa
- pesi scartati come implausibili: n/a (le gemme non hanno pesi)

## Dimensioni normalizzate dall'OCR (I=1, O=0)

- G6 `II X IO mm` → 11 × 10 · G7 `I4 X I I mm` → 14 × 11 · G8 `I9 X I4 mm` → 19 × 14
- G9 `I3 X IO mm` → 13 × 10 · G10 `14 X I I mm` → 14 × 11
- G11 18 × 13 · G12 12 × 10 · G13 15 × 12 (già in cifre arabe)

## Elementi iconografici NON mappati (restati solo in ica:note)

- G6: "with Antiochene attributes (but without rooster)" — nozione composita, nessuna
  chiave; resa la sola posa `standing`. La negazione "without rooster" non è un tratto.
- G7: "holding indistinct object" (oggetto non identificato → nessun `held_object`);
  "bare from waist up" (nudità parziale: nessuna chiave in `dress`);
  "The Phrygian cap seems to have a brim" (la tesa non è codificabile).
- G8: "pine cone(?)" — il dubbio di Lane non è esprimibile su `<ica:trait>` (nessun
  `@cert` previsto dal contratto); la chiave `held_object/pine_cone` è scritta piena e
  il dubbio resta nella nota.
- G11, G14: "No wreath on cap" — negazione: nessun trait scritto.
- G13: "holding a statue of Nike" — Nike è chiave del vocabolario, ma qui è una
  *statua tenuta in mano* da Zeus, non una figura della scena: non l'ho resa come
  `<ica:figure>` per non falsare il conteggio delle figure. Resta in nota.
- G15: "without attributes" — negazione, nessun trait.

## Chiavi che sarebbe servito avere nel vocabolario

- `lunar/crescent_neck` ("crescent at neck", G9, G11, G14): ho ripiegato su
  `lunar/crescent` ("posizione non specificata"), che è più povero del dato di Lane.
  Va distinto da `crescent_shoulders`, usato solo dove Lane dice esplicitamente
  "crescent behind shoulders" (G7).
- `@rel` per "alla destra / alla sinistra di" (G13, G15): il vocabolario ha
  `flanking`, `in_front_of`, `behind`, `in_field`, ma non la lateralità.
  In G13 ("To his r., Hermes. To his l., a bust of Men") ho usato `flanking` per
  entrambe le figure laterali; in G15 ("To l. altar, to l. rooster") `in_field`.
- `held_object/statue` o simile (G13).
- `dress/nude` o `feature/half_draped` (G7, "bare from waist up").

## Nota su portrait/bare_head

Per `Head of Men` ho applicato la tabella del BRIEF (`Head of X` → `portrait/bare_head`,
che nel vocabolario è una *troncatura* del ritratto, non l'assenza di copricapo), quindi
G9 e G10 hanno insieme `portrait/bare_head` e `headgear/phrygian_cap`. Se la coppia
risulta contraddittoria in UI, va deciso a monte per tutti i batch, non qui.

## Bibliografia: normalizzazioni e punti dubbi

- Applicato ovunque `no.` → `n.`, `PI.` → `Pl.`.
- Restaurati umlaut e spazi spurii dell'OCR, dove la forma corretta è certa:
  `Furtwangler` → `Furtwängler`, `Erkliirendes` → `Erklärendes`,
  `im A ntiquarium` → `im Antiquarium`, `geschnit- tenen` → `geschnittenen`,
  `antichita classica` → `antichità classica`, `Lan~ III` → `Lane, III` (G15).
- **G9, lasciato verbatim**: `S. Reinach, op. cit., Pl. 58, n. II 40 1`. L'OCR è
  ambiguo (probabilmente `n. 1140`, ma la cifra finale staccata non lo garantisce):
  non normalizzato, da verificare sul PDF.
- **G9, lasciato verbatim**: `Lane, II, p. 101, n. 9`. Tutte le altre gemme del lotto
  citano `Lane, III` con pagine 100-101, quindi questo `II` è quasi certamente un OCR
  di `III` — ma essendo un rimando a un'opera diversa (Berytus) non l'ho corretto.
- `no. II` → `n. 11` in G9 (Milani) e G10 (Lane III): in questo OCR `I` vale
  sistematicamente `1`.

## Dubbi sulla numerazione

- G10-G13 e G15 portano nel .txt il commento `# ATTENZIONE: numerazione OCR incerta`.
  Il corpo delle entry combacia però con le testate `G IO`, `G II`, `G IS` dell'OCR
  greco della stessa pagina, quindi ho tenuto la numerazione dei file.
  Resta lo scarto interno a Lane, non risolvibile qui: G10 cita `Lane, III, n. 11`,
  G11 cita `Lane, III, n. 10`, G14 cita `n. 12`, G15 `n. 13` — numerazione del
  Berytus III, non di questo volume (regola del BRIEF), quindi nessuna correzione.
- **G15, prosa corrotta**: il .txt dà `To 1. altar, to L, roosteL`, che ho letto
  `To l., altar; to l., rooster.` e riportato così in `<ica:note>`. È plausibile che
  il secondo sia `to r.` (cfr. G8 e G12, dove il gallo sta *dietro* Men e l'altare
  davanti): **da verificare sul PDF**. Per questo in G15 ho usato `rel="in_field"`
  per altare e gallo invece di `in_front_of`/`behind`.
- G6, `Location: Latour Maubourg ColI.` → `Latour Maubourg Coll.` (collezione privata,
  non un museo: `<repository>` è comunque la sede prevista dal contratto).
# Batch B21c — 4 entry (gemme G16–G19)

- entry codificate: 4 (G16, G17, G18, G19)
- senza peso: tutte (gemme: Lane non dà pesi)
- senza dimensioni: G16 (`Dimensions: unavailable` → nessun `<dimensions>`)
- senza bibliografia (oltre a Lane): G18 (`Bibliography: none`)
- legende da ritrascrivere (OCR insufficiente): G17 — unica entry del lotto con
  `Inscription:`. Il livello di testo del PDF dà `MEte; fmCTY)ocv6e;`, il ri-OCR
  grc dà `Μεὶς Γοισηανός`: le due letture non coincidono e la seconda non è un
  epiteto attestato. Omesso l'intero `<div type="edition">` (la gemma NON è
  anepigrafe). Il primo termine è quasi certamente `Μεὶς`; l'epiteto resta da
  leggere sul PDF, Plate LXIV.
- pesi scartati come implausibili: nessuno
- elementi iconografici NON mappati (restati solo in ica:note):
  - G17: "with globe (pine-cone?) in l. hand" — `globe` non ha chiave; codificato
    il solo `held_object/pine_cone` con `cert="low"` e `hand="left"`, secondo la
    proposta alternativa di Lane.
  - G19: "out of which a libation is being poured"; "The editors describe this
    latter attribute as a cornucopia…" — la discussione resta in `ica:note`;
    `held_object/patera` porta `cert="low"`.
  - G16: "cap" non qualificato (Lane non dice «Phrygian»): resa la sola
    `headgear/star`, nessun `phrygian_cap` dedotto.
- chiavi che sarebbe servito avere nel vocabolario: `globe` (G17); una chiave o
  un modo per «libation poured» (G19).
- normalizzazioni bibliografiche: `PI.`→`Pl.`, `no.`→`n.`; `19II`→`1911` (G17);
  `p. II2`→`p. 112` nei Remarks di G17; `OPere Varie`→`Opere Varie` (G16);
  `Les Pierres Gravtfes`→`Les Pierres Gravées` (G17); `Bibliotheque N ationale`
  → `Bibliothèque Nationale` (G17); `II X 8 mm`→`11 X 8 mm` (G18).
- dubbi sulla numerazione o sulla zecca:
  - G16 e G17 portano nel .txt il flag «numerazione OCR incerta» (nell'OCR G16
    compare come `( τό` e la entry precedente come `G IS` = G15): la sequenza
    G15→G16→G17 regge sul contenuto, ma va confermata sul PDF.
  - `Pl. 0` in Migliari (G16): probabilmente `Pl. O`, lasciato come letto.
  - G19: il paragrafo finale sul piatto d'argento di Hildesheim (con «Select
    Bibliography» e «Diameter: 18.9 cm. …») segue G19 nel .txt ma è un'appendice
    di Lane, non parte della gemma: NON codificato. Se serve come scheda a sé,
    va assegnato a qualcuno.
  - G19: `<depth unit="mm">3.1</depth>` per «thickness 3.1 mm» — terza misura non
    prevista dal contratto; da uniformare se altri batch hanno gemme con spessore.
