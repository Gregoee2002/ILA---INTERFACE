# CMRDM II Corrigenda Review — 2026-08-24

Fonte: Eugene N. Lane, *CMRDM II* ("The Coins and Gems", 1975), "Addenda and Corrigenda to Volume I", Sezione A "Corrigenda" (pp. 170-171) — un elenco breve ed esplicito di errori tipografici/di lettura in CMRDM I, dato da Lane stesso come correzioni definite ("For X read Y"), a differenza del materiale più speculativo dei notebook di Ramsay già trattato nella revisione CMRDM IV (log del 2026-08-23).

Metodo: per ciascuno dei 10 item mappati, confronto tra il testo greco/latino corrente in `<div type="edition">` (e negli elementi di titolo/layout/keywords/persName/xml:id/nymRef collegati) e la correzione indicata da Lane. Nessun commento XML è stato aggiunto ai file per segnalare item ambigui o incerti: le uniche modifiche ai file sono correzioni di testo dirette, per gli item risultati effettivamente applicabili dopo verifica sul file reale.

## Riepilogo

- **10 item totali** analizzati (item 1-10; item 6 esplicitamente incerto per istruzione).
- **6 correzioni ferme applicate** ai file XML (item 1, 2, 3, 4, 5, 9).
- **1 item senza alcuna azione necessaria** perché il testo era già conforme alla lettura corretta (item 10).
- **3 item segnalati per revisione umana, nessuna modifica al file** (item 6, 7, 8).
- Tutti i file XML toccati sono stati validati con `xmllint --noout` e risultano ben formati. Gli avvisi "xml:id ... is not an NCName" sono un problema preesistente in tutto il corpus (xml:id con spazi), non introdotto da questa revisione.
- Sezione B (Addenda bibliografiche, CMRDM II p. 171-172) non è stata trattata: elenca ulteriore bibliografia per i nr. CMRDM I 2, 13, 16, 23, 50, 53, 75, 111, 163, 195, 255, 264, 283, 290, da valutare separatamente se richiesto in futuro.

---

## Dettaglio per item

### 1. CMRDM I 20 -> ILA-282
Azione: CORREZIONE APPLICATA. "Cilvastion(o)" -> "Cilvastian(o)" (r. 2 del testo latino dell'epiteto di Men), aggiornati anche keywords ("Cilvastionus" -> "Cilvastianus") e persName key ("Men Cilvastionus" -> "Men Cilvastianus").

### 2. CMRDM I 41 -> ILA-013
Azione: CORREZIONE APPLICATA. Eliminata una α spuria dopo la parentesi quadra di chiusura alla r. 3: "[ία]αν" -> "[ία]ν", ripristinando la lettura corretta "εὐχαριστίαν" (non "εὐχαριστίααν"). Nel contempo rimosso anche un carattere backslash residuo (refuso di una precedente lavorazione) presente nello stesso punto del testo.

### 3. CMRDM I 43 -> ILA-015
Azione: CORREZIONE APPLICATA. "ἀχαριατίαν" -> "ἀχαριστίαν" (r. 14, refuso greco).

### 4. CMRDM I 47 -> ILA-018
Azione: CORREZIONE APPLICATA. "ἐμαυτόν" -> "ἐμαυτήν" (r. 13, pronome riflessivo maschile -> femminile: il soggetto è Trophime).

### 5. CMRDM I 62 -> ILA-033
Azione: CORREZIONE APPLICATA. Toponimo moderno "Kavakh" -> "Kavaklı" (lemma del titolo, support, layout, placeName type="modern"/"ancient", provenance — tutte le 7 occorrenze nel file).

### 6. CMRDM I 169 -> ILA-157
Azione: flagged for user, no file change. La nota CMRDM II recita "For Δό[μ]νον read Δό[μ]νον" — le due forme, come estratte dal PDF, risultano visivamente identiche nel testo semplice: si tratta quasi certamente di una differenza di solo accento o forma di lettera non sopravvissuta alla trascrizione in testo piano. Non è stato possibile determinare con certezza la correzione intesa da Lane senza consultare direttamente il PDF sorgente (CMDM V2.pdf, p. 171 a stampa); nessuna modifica applicata al file.

### 7. CMRDM I 190 -> ILA-178
Azione: flagged for user, no file change. La correzione "For Κλαύδιος, read Καισίδιος" non trova riscontro nel testo attualmente presente in ILA-178.xml, che riporta la dedica "Λούκιος υἱὸς Πουβνουαῖος" (lettura di Hardie, JHS 1912): la parola "Κλαύδιος" non compare in nessun punto del file. Coerente con quanto già segnalato nella revisione CMRDM IV (item 5) circa le letture multiple e discordanti per questa entry (190/195b) tra Hardie, Ramsay e Lane. Non essendo possibile individuare con certezza a cosa si riferisca la correzione nel nostro testo, nessuna modifica applicata (nessun processo in background risultava aver toccato il file al momento della verifica).

### 8. CMRDM I 195b -> ILA-178
Azione: flagged for user, no file change. Stesso file dell'item 7. "Remove the dot from under the gamma of Γάμος" — la parola "Γάμος" non compare nel testo attuale del file (che non contiene marcature di lettera incerta di alcun tipo). Target non individuabile con certezza; nessuna modifica applicata.

### 9. CMRDM I 256 -> ILA-244
Azione: CORREZIONE APPLICATA. "Antonis" -> "Antonia" (titolo, layout, keywords, xml:id/key, persName ed edizione, incluso il punto di sillabazione a fine riga "An-/tonis" -> "An-/tonia"): correzione di genere, si tratta di un nome femminile.

### 10. CMRDM I 289 -> ILA-276
Azione: nessuna azione necessaria — il file era già corretto. Il testo attuale riporta già "τεκμορεύσασα" (participio femminile) alla r. 3, coerente con la correzione CMRDM II ("For τεκμορεύσας read τεκμορεύσασα"); nessuna modifica necessaria. Da notare: questo file era già stato oggetto della revisione CMRDM IV (item 40, correzione "Οὐέτ[τι]α" -> "Οὐετουρία"), che ha lasciato il file in uno stato già conforme anche a questa correzione di CMRDM II.
