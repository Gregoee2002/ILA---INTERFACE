# Verifiche aperte — classificazione divinità / epiteti

Elenco delle questioni di classificazione emerse dall'audit automatico
(pannello **Coerenza** → «Classificazione divinità / epiteti»,
`buildClassificationAudit()` in `src/lib/epithetIndex.ts`).

Sono **segnalazioni da verificare a mano su Lane 1971 (CMRDM I)** e poi da
correggere sullo XML. Nessuna è stata risolta: si torna qui quando c'è tempo
per il riscontro bibliografico.

> Ricordarsi: ogni correzione allo XML va **rispecchiata anche sul repo dati
> `Gregoee2002/ILA`** (cartella `corpus/`), non solo su `ILA---INTERFACE`,
> altrimenti la sincronizzazione al boot la annulla.

Stato: **aperto** — aggiornato 2026-08-30.

---

## 1. Probabile stessa divinità in forma variante

### 1a. Meter / Megale Meter / Magna Mater — è lo stesso culto?

- **Megale Meter** (Μεγάλη Μήτηρ): ILA-014, ILA-015, ILA-022. Non compare mai
  da sola; nelle stesse schede c'è anche **Meter**.
- **Magna Mater**: ILA-109, ILA-290, ILA-291, ILA-292, ILA-293. Sempre con
  Attis e/o Men. Tutte schede in lingua latina.
- **Meter** (bare) / **Meter theon**: diffuse nel corpus greco anatolico.

Nodo: teologicamente sono tutte la Grande Madre / Cibele, ma Magna Mater è
attestata solo in file latini (possibile tradizione regionale diversa,
Italia). Tenerle distinte può essere una scelta voluta per lo studio delle
tradizioni regionali. **Serve la tua decisione**, meglio se incrociata col
commento di Lane 1971.

Se «Megale Meter» = «Meter»: si può unificare via
`src/lib/divinityAliases.ts` (canonicalizzazione a parse-time, niente
modifica allo XML). Se invece Magna Mater va tenuta separata, non aggiungere
un alias per lei.

### 1b. Helios / Plouton Helios / Kore Selene

- **Helios** (bare): ILA-110, ILA-115. Mai da solo.
- Nelle stesse schede compaiono i teonimi sincretici composti **Plouton
  Helios** e **Kore Selene** (marcati come nomi composti in ILA-110 — vedi
  i `<name>` figli aggiunti in passato).

Da verificare: il «Helios» isolato di ILA-110/115 è una divinità a sé o è
parte di un nome sincretico non ancora marcato come composto? Riscontro su
Lane.

---

## 2. Stessa forma usata sia come divinità sia come epiteto

Incoerenza di codifica: la stessa stringa è `<persName>` divinità in certe
schede e `<rs type="epithet">` in altre. Decidere qual è il ruolo corretto
scheda per scheda e uniformare la key (`key="Divinità Epiteto"`).

### 2a. Anaeitis (Anaïtis)

- **come divinità**: ILA-007, ILA-016, ILA-031, ILA-041
- **come epiteto**: ILA-028, ILA-030, ILA-034, ILA-044, ILA-101

Anaïtis è una divinità autonoma (Anahita/Artemide Persica). Nei file dove è
«epiteto» va verificato se è epiteto di Meter/Artemis o se è codificata male
e andrebbe promossa a divinità (magari «Artemis Anaitis» come coppia).

### 2b. Apollo

- **come divinità**: ILA-018, ILA-060, ILA-069, ILA-115
- **come epiteto**: ILA-110

In ILA-110 «Apollo» risulta epiteto: quasi certamente errore di codifica o
parte del composto «Helios Apollo Kisaulodenos» non marcato. Verificare il
testo di ILA-110.

---

## 3. Epiteti condivisi da più divinità (informativo)

Non necessariamente un errore: un epiteto può essere genuinamente condiviso
(Epekoos «che ascolta», Soter «salvatore», Ouranios). Ma può anche essere
**contaminazione da co-occorrenza** (l'epiteto di una divinità attribuito a
un'altra presente nella stessa iscrizione). Da controllare caso per caso in
`divinitaEpiteti`.

| Epiteto | Divinità coinvolte | Schede |
|---|---|---|
| Tazene  | Megale Meter / Meter | ILA-014 · ILA-038 |
| Atimis  | Megale Meter / Meter | ILA-022 (stessa scheda) |
| Soter   | Zeus / Men | ILA-069 · ILA-130 |

«Tazene» e «Atimis» sono toponimici legati a Meter: se Megale Meter = Meter
(punto 1a) la condivisione si risolve da sola. «Soter» è plausibilmente
condiviso davvero fra Zeus e Men.

---

## Come rigenerare l'elenco

Il pannello **Coerenza** nell'interfaccia (sblocco editing) mostra questi
stessi dati sempre aggiornati sul corpus corrente. In alternativa, script
tsx una tantum che chiama `xmlToMonumenti` su ogni file di
`src/data/corpus/` e passa il risultato a `buildClassificationAudit`.
