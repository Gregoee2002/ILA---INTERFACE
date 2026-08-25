# CMRDM IV Corrigenda Review — 2026-08-23

Fonte: Eugene N. Lane, *CMRDM IV*, cap. 1 "Supplementary Information About Known Monuments" (pp. 3-12), 45 item numerati, incrociati con i 293 file `src/data/corpus/ILA-NNN.xml` del progetto ILA (corpus trascritto da CMRDM I).

Metodo: per ciascun item, confronto tra il testo greco/latino corrente in `<div type="edition">` e la nota di CMRDM IV. Solo le correzioni esplicitamente presentate da Lane come errore/typo/riga caduta/lettura più completa accertata sono state applicate direttamente al testo. Le letture alternative, congetturali, ambigue o esplicitamente dubbie non sono state toccate: restano segnalate qui sotto per la revisione umana. Nessun commento è stato aggiunto ai file XML — le uniche modifiche ai file sono correzioni di testo dirette.

## Riepilogo

- **46 item totali** analizzati (item 1-44, con il sub-item 14a, più l'item 45 = CMRDM I A4).
- **16 correzioni ferme applicate** ai file XML (item 4, 9, 11, 15, 18, 24, 28, 31, 33, 34, 37, 38, 40, 41, 43 [parziale], 44).
- **28 item segnalati per revisione umana**, nessuna modifica al file (item 1, 2, 3, 5, 6, 7, 8, 10, 12, 13, 14, 14a, 16, 17, 19, 20, 21, 22, 23, 25, 26, 27, 29, 30, 32, 35, 36, 42) — incluso l'**item 26**, una segnalazione strutturale prominente (tre entry forse frammenti di una sola iscrizione).
- **2 item senza alcuna azione necessaria** (item 39: la nostra trascrizione è già più completa della fonte citata da Lane; item 45/A4: nessuna corrispondenza nel corpus).
- Tutti i 47 file XML toccati sono stati validati con `xmllint --noout` e risultano ben formati (well-formed). Gli avvisi "xml:id ... is not an NCName" sono un problema preesistente in tutto il corpus (xml:id con spazi), non introdotto da questa revisione.

---

## Dettaglio per item

### 1. CMRDM I 179 -> ILA-167
Azione: flagged for user, no file change. Lettura candidata di Ramsay "Ἀβασκάν[τος]" per la lacuna del nome 4 (attualmente "Α[...]ρ[...]"), non certa.

### 2. CMRDM I 181 -> ILA-169
Azione: flagged for user, no file change. Nota interpretativa su "Οὐίω" (epiteto di Men vs nome nativo di Paulos).

### 3. CMRDM I 184 -> ILA-172
Azione: flagged for user, no file change. Ipotesi di Ramsay sui dedicanti (madre, due figli, schiavo).

### 4. CMRDM I 188 -> ILA-176
Azione: CORREZIONE APPLICATA. "Ἄπριος" -> "Ἄριος" in titolo, layout, keywords, xml:id/key, nymRef ed edizione (errore tipografico esplicitamente segnalato da Lane come mai corretto in CMRDM I).

### 5. CMRDM I 190=195b -> ILA-178
Azione: flagged for user, no file change. Letture multiple e discordanti nei notebook di Ramsay (Λούκιος/Πουχνουαίου vs Πουμπούλιος vs lettura completa di nr. 195b).

### 6. CMRDM I 193 -> ILA-181
Azione: flagged for user, no file change. Evoluzione della lettura di Ramsay fino a "Ἡ συνοδία Μηνὶ εὐχήν" come lettura finale preferita da Lane; il file mantiene già Hardie ("Μεινοδώρα") come lettura principale con la variante di Ramsay in apparato — possibile candidato a invertire principale/apparato, da valutare.

### 7. CMRDM I 206 -> ILA-194
Azione: flagged for user, no file change. Lettura alternativa completa di Ramsay "Μ. Οὔλπιος Ποῦδης Πομπειανός", "quite different from what Hardie got out of it".

### 8. CMRDM I 213 -> ILA-201
Azione: flagged for user, no file change. Lettura alternativa di Ramsay "[Iuli]i LVS", che secondo Lane "makes better sense than Hardie's reading".

### 9. CMRDM I 215 -> ILA-203
Azione: CORREZIONE APPLICATA. "Οὐείβιος" -> "Οὐείριος" in titolo, layout, keywords, xml:id/key, nymRef ed edizione (Lane dichiara di essere certo della lettura, pur senza indicarne la ragione).

### 10. CMRDM I 220 -> ILA-208
Azione: flagged for user, no file change. Dubbio irrisolto sul nesso "Ἔρως"/nome della iscrizione, ambiguo anche per Lane ("I suppose ι may be accidental").

### 11. CMRDM I 225 -> ILA-213
Azione: CORREZIONE APPLICATA. Ripristinata la riga caduta "Μηνὶ εὐχήν." (sostituite le righe 6-7 precedenti, danneggiate/gap) e corretta la desinenza "Τρεβωνίου" -> "Τρεβώνιος", secondo la lettura di Ramsay Notebook B p.51 citata da Lane come "one whole line has apparently fallen out".

### 12. CMRDM I 228 -> ILA-216
Azione: flagged for user, no file change. Lettura alternativa "Μάγιοι" per "Μάντοι" scartata dallo stesso Lane ("hardly to be squared with the drawing").

### 13. CMRDM I 231 -> ILA-219
Azione: flagged for user, no file change. Dubbio generico di Ramsay sulla lettura di Hardie, nessuna alternativa concreta proposta.

### 14. CMRDM I 234 -> ILA-222
Azione: flagged for user, no file change. Lettura candidata di Ramsay "Ἄπτος Κέτριος" per "Ἄππως Νέτριος".

### 14a. CMRDM I 236 -> ILA-224
Azione: flagged for user, no file change. Possibile riga latina aggiuntiva "L. I. C.    V. S. F. L. V. S." dal notebook di Ramsay, assente nello stampato CMRDM I (che ha solo "L V S", presente nel nostro testo).

### 15. CMRDM I 240 -> ILA-228
Azione: CORREZIONE APPLICATA. "Ὀενούαος" -> "Οὐενούαος" (dittongo mancante) in titolo, layout, keywords, xml:id/key, nymRef ed edizione, per correggere l'errore tipografico "Οὐενούναος" segnalato in CMRDM IV. Suggerimento speculativo di Ramsay ("Σεχοῦνδος") non applicato — flagged for user.

### 16. CMRDM I 241 -> ILA-229
Azione: flagged for user, no file change. Autocritica di Lane sulla mancanza di un puntino diacritico sotto la vocale in "Εἰλάρας", nessuna variazione testuale implicata.

### 17. CMRDM I 242 -> ILA-230
Azione: flagged for user, no file change. Nota su evoluzione della lettura (parole "Κυρίῳ"/"Μακεδών" aggiunte a inchiostro nel 1912), ambigua.

### 18. CMRDM I 244 -> ILA-232
Azione: CORREZIONE APPLICATA. "τάδε." -> "Μ. Α. Ε." alla riga 5, come indicato dal disegno più recente citato da Lane in CMRDM IV nr. 18.

### 19. CMRDM I 251 -> ILA-239
Azione: flagged for user, no file change. Commento tedesco delle Schede di Vienna (nr. 584), dubbio sul findspot ("War also in Altı Kapı auch ein Heiligtum?"), nessuna variazione testuale.

### 20. CMRDM I 252 -> ILA-240
Azione: flagged for user, no file change. Ramsay legge "[θυ]μέλας" all'inizio della terza riga ("dedication of altars"), ma il testo attuale non presenta una terza riga compatibile con questa lettura (righe attuali: nome, "μετὰ γυναικὸς...", "Μηνὶ Ἀσκαηνῷ εὐχήν"). Possibile disallineamento tra la nota di Lane e la struttura di riga trascritta: segnalato per verifica da un revisore umano, nessuna modifica applicata per l'incertezza sulla corrispondenza.

### 21. CMRDM I 258 -> ILA-246
Azione: flagged for user, no file change. Lane vorrebbe leggere "καί" per la parola centrale della riga 1 e "τελ." come nome abbreviato, ma lo schizzo di Ramsay è contrario; ambiguo, non applicato.

### 22. CMRDM I 266 -> ILA-253
Azione: flagged for user, no file change (nessuna discrepanza rilevata). Ramsay (da schizzo, Notebook A p.71 nr.210) potrebbe leggere "Πατρίω" all'inizio dell'ultima riga: il testo attuale include già l'epiteto Men Patrios ("Μηνὶ πατ(ρίῳ)") nella riga unica finale, quindi la lettura sembra già riflessa nel testo esistente — segnalato solo per conferma da un revisore umano.

### 23. CMRDM I 263 -> ILA-250
Azione: flagged for user, no file change. Ramsay (Notebook A p.90 nr.227) propone la restituzione congetturale "Πρε[ίμα]" (Prima) alla riga 7, alternativa al nome "Πρίσκος" (da "Πρε[ίσκω]") attualmente nel testo secondo la restituzione di Levick; lettura candidata, non applicata.

### 24. CMRDM I 265 -> ILA-252
Azione: CORREZIONE APPLICATA. Righe 1-2, prima illeggibili ("[.....]υμο[....]" e "[.....]οικκ[..]"), sostituite con la lettura più completa di Ramsay: "[Δέ]χμος" (Decimus) e "[Καλπ]όρνιο[ς]" (Calpurnius), unite al nome già presente "Φρούγει" (Frugi) in un'unica persona con tria nomina "Δέχμος Καλπόρνιος Φρούγει". Aggiornati titolo, layout, keywords e listPerson di conseguenza.

### 25. CMRDM I 268 -> ILA-255
Azione: flagged for user, no file change (verificato, nessuna correzione necessaria). (a) Il findspot "Isparta" contestato da Lane/Ramsay (contro Levick) non è presente nel nostro file, che riporta già Antiocheia Pisidiae/Yalvaç: nessuna correzione necessaria. (b) L'abbreviazione finale "M. A. E." (Lane/Ramsay, contro "M. A. εὐ." di Levick) risulta già coerente con l'attuale codifica "Μ(ηνὶ) Ἀ(σκαηνῷ) ε(ὐχήν)" (lettera singola ε, non εὐ): nessuna correzione necessaria, ma segnalato per conferma da un revisore umano.

### 26. CMRDM I 272, 276, 285 -> ILA-259, ILA-263, ILA-272 — SEGNALAZIONE STRUTTURALE PROMINENTE
Azione: flagged for user, no file change (nessuna delle tre XML toccata). Lane (Ramsay, Notebook A p.139, frag. 80) dichiara che queste tre entry di CMRDM I, catalogate separatamente e attualmente tre file ILA distinti, sono in realtà frammenti di UN'UNICA iscrizione: testo ricostruito completo "Μηνὶ ἐπ[η]κόω [εὐχήν] / Γέμιος Σύμφορος / Τρόφιμος Μακεδὼν / τεκ[μ]ορεύσαντες." Nessuna fusione o cancellazione applicata; segnalato qui per decisione editoriale del revisore umano (fusione dei tre record? cross-reference reciproche? mantenimento status quo?).

### 27. CMRDM I 273 -> ILA-260
Azione: flagged for user, no file change. Nota su un frammento di Ramsay (Notebook A p.138 frag.77) che spiega la confusione nelle Schede di Vienna, discussa altrove nel volume (nuova iscrizione nr.160, non pertinente al nostro corpus); nessuna lettura alternativa data.

### 28. CMRDM I 275 -> ILA-262
Azione: CORREZIONE APPLICATA. Lettura precedente illeggibile/frammentaria ("[......]τίος Ἀνίη[...]" r.1, "Τρίτος" come presunto nome proprio r.2) sostituita con la lettura più completa "[Μ. Οὔ]λπιος Ἀνίκι-ος [Φί]ρμος τρίτον τεκ[μο]ρεύσας Μηνὶ Ἀσ[καην]ῷ εὐχήν.": rivela che "Τρίτος" non era un nome ma l'avverbio "τρίτον" ("per la terza volta"), e il vero dedicante è "M. Oulpios Anikios Phirmos". Aggiornati titolo, layout, keywords e listPerson (rimossa la persona "Tritos", sostituita con "Marcus Oulpios Anikios Phirmos").

### 29. CMRDM I 277 -> ILA-264
Azione: flagged for user, no file change. Ramsay (Notebook A p.98 frag.54) propone restituzioni congetturali alternative per confronto con la nuova iscrizione nr.86, esplicitamente incerte/ricostruite; non applicate.

### 30. CMRDM I 278 -> ILA-265
Azione: flagged for user, no file change. Ramsay legge "Τροφων-" (concorde con Levick) alla riga 5, in potenziale conflitto con la lettura "Τροφον[....]" già fissata da una revisione precedente basata direttamente sullo stampato Lane I p.149 (che marca la lettera finale come "ν" non accentato, non "ω"); dato il conflitto tra le due fonti, non applicata alcuna modifica, segnalato per verifica da un revisore umano.

### 31. CMRDM I 279 -> ILA-266
Azione: CORREZIONE APPLICATA. Gentilizio "Οὐίσεννος" (Visennius) -> "Οὐισέλλιος" (Visellius) in titolo, layout, keywords, xml:id/key, nymRef ed edizione (per entrambi i dedicanti, padre e figlio), secondo la lettura di Ramsay (Notebook A p.1 nr.A2, p.108) concorde con la seconda lettura di Levick (AS 1970 p.48).

### 32. CMRDM I 280 -> ILA-267
Azione: flagged for user, no file change. Nota iconografica/interpretativa: lo schizzo di Ramsay (Notebook A p.77 nr.212) conferma l'interpretazione di un toro legato a un altare anziché Men a cavallo; nessuna variazione testuale.

### 33. CMRDM I 281 -> ILA-268
Azione: CORREZIONE APPLICATA. Riga 3: "[καὶ τέκν]ων τε[κμορεύσας]" -> "[καὶ σ]υντρ[όφου] τε[κμορεύσας]", secondo la correzione di Lane che segnala un Ω quadrato originariamente frainteso come Υ (la parola "τέκνων" era una lettura errata; corretta in "συντρόφου", "del figlio adottivo/allievo").

### 34. CMRDM I 282 -> ILA-269
Azione: CORREZIONE APPLICATA. Testo precedente frammentario e privo di formula dedicatoria a Men ("Λουκι[.........]ος" / "[....]ν[.........]ωτικῷ σύν") sostituito con la lettura molto più completa di Ramsay (Notebook A p.131 frag.71): "Λουκίλιος / [......]ν σὺν κὲ Ζωτικῷ Συν-φωνᾶ / Μηνὶ ε-ὑχήν." (5 righe). Aggiornati titolo, layout, keywords e listPerson (due dedicanti: Loukilios e Zotikos Symphonas; cfr. nome Zotikos anche in CMRDM I nr. 280 = ILA-267).

### 35. CMRDM I 283 -> ILA-270
Azione: flagged for user, no file change. Nota su ricongiungimento di frammenti (Ramsay, Notebook A pp.4,92,104,105; nota di Waldmann sulla Schede 535A: "[Ἰ]μβρ[ο]ς aus Raumgründen. Vor M ein sehr kurzer Buchstabe."), nessuna lettura testuale specifica sostitutiva fornita.

### 36. CMRDM I 284 -> ILA-271
Azione: flagged for user, no file change. Lane segnala che la lettera sulla pietra alla prima riga è una Λ e non una Δ, ma non è stato possibile individuare con certezza a quale lettera del testo attuale ("[Τιβ]έριος") si riferisca la nota; segnalato per verifica da un revisore umano piuttosto che applicare una modifica incerta.

### 37. CMRDM I 286 -> ILA-273
Azione: CORREZIONE APPLICATA. "Λυτρόνιος" -> "Αὐτρώνιος" e "Μαρκε[ιαν]ός" (Markeianos) -> "Μαρκέ[λλ]ος" (Markellos) in titolo, layout, keywords, xml:id/key, nymRef ed edizione, secondo la lettura di Ramsay concorde con Levick (AS 1970 p.43).

### 38. CMRDM I 287 -> ILA-274
Azione: CORREZIONE APPLICATA. "ούλιος" -> "ουιος" (riga 1) in keywords, xml:id/key, nymRef, edizione e commentario: Lane ritratta esplicitamente la propria lettura originale di CMRDM I, concordando con Levick e con la propria fotografia. Ipotesi speculativa di Lane ("Perhaps we are dealing with yet another Evius") non applicata, solo segnalata.

### 39. CMRDM I 288 -> ILA-275
Azione: skipped — nessuna azione necessaria. La lettura di Ramsay (Notebook A p.137 nr.193) è meno completa di quella già presente nel nostro testo (manca "τέκνων καὶ θρεπτοῦ" e "Μηνὶ Πατρίῳ εὐχήν" per esteso, presenti solo come "[...εὐ]χήν" in Ramsay): il nostro testo è già più completo, come previsto dalle istruzioni per questo item.

### 40. CMRDM I 289 -> ILA-276
Azione: CORREZIONE APPLICATA. "Οὐέτ[τι]α" (Vettia) -> "Οὐετουρία" (Vetouria) in titolo, layout, keywords, xml:id/key, nymRef ed edizione, secondo la lettura più completa di un notebook precedente al danneggiamento della pietra (Notebook B p.6 nr.77, "Οὐετουρία Μαγνίλλα").

### 41. CMRDM I 291 -> ILA-278
Azione: CORREZIONE APPLICATA. "Ἡούλειος" -> "Ἥουειος" in nymRef ed edizione, secondo la lettura di Ramsay concorde con Levick (AS 1970 p.41).

### 42. CMRDM I 292 -> ILA-279
Azione: flagged for user, no file change (nessuna discrepanza rilevata). Il frammento citato da Ramsay ("ρεύσας Μ[ηνὶ Ἀσκαηνῷ] / εὐ[χήν].") corrisponde già al testo attuale (righe 4-5): nessun materiale testuale nuovo da aggiungere, solo conferma che il frammento si estendeva ulteriormente a sinistra.

### 43. CMRDM I 293 -> ILA-280
Azione: CORREZIONE APPLICATA (parziale). Riga 2: "Π." (Publius) -> "Τι." (Tiberius) in titolo, layout, keywords, xml:id/key ed edizione, secondo Ramsay concorde con Levick. Lettura candidata per la riga 4 ("Γατλ[λης]" al posto di "Γαία[ς") non applicata, solo segnalata come speculativa ("wants to read").

### 44. CMRDM I 294 -> ILA-281
Azione: CORREZIONE APPLICATA. Testo frammentario precedente ("[.....]ώνιος" / "[.....]είου υἱὸς") completato con la lettura integrale ottenuta unendo due frammenti (Notebook A p.41, p.10 nr.A14, p.108 fr.62): "Φλα[ου]ώνιος / Ἀστείου υἱὸς / τεκμορεύσας / Μηνὶ Ἀσκαηνῷ / εὐχήν." Aggiornati titolo, layout, keywords e listPerson (due persone: Phlaouonios e il padre Asteios).

### 45. CMRDM I A4
Azione: skipped — non applicabile (nessuna corrispondenza nel corpus, non è un numero CMRDM I standard, come confermato in fase di mappatura preliminare).
