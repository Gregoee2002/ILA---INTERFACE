# Audit dei luoghi: identificazione antica e Pleiades (2026-09-25)

Oggetto: il blocco `<origPlace>` delle 294 schede in `src/data/corpus/`
(`placeName` di tipo `ancient`, `modern`, `region`), controllato contro:

- il record Pleiades di ogni URI citato (JSON scaricato il 2026-09-25, 51 ID distinti);
- il dump completo di Pleiades (`pleiades-places/names-latest.csv.gz`) per cercare gli ID mancanti;
- le intestazioni di luogo di Lane, CMRDM I (`pdftotext -layout` sul PDF).

Nessuna scheda è stata modificata: qui ci sono solo le constatazioni e le correzioni proposte.

## Quadro

| | schede |
|---|---:|
| `origPlace` con i tre `placeName` (ancient, modern, region) | 293 |
| solo `region` (ILA-294, provenienza ignota) | 1 |
| `ancient` con URI Pleiades | 248 (51 luoghi distinti) |
| `ancient` con `ref="DA_COMPILARE"` | 45 |
| URI Pleiades malformati o inesistenti (404) | 0 |
| URI Pleiades che puntano al **luogo sbagliato** | **5 schede** (4 luoghi) |
| `modern` con un riferimento vero (GeoNames o simili) | **0** |

Le 45 schede senza URI non compaiono sulla Mappa (`MapView.tsx` scarta chi non ha
`place_ref_ancient`), e nemmeno il riquadro «Mappa (Pleiades)» della scheda.

## 1. URI Pleiades errati (da correggere)

| Schede | Luogo in ILA | URI attuale → cosa è davvero | URI giusto | Fonte |
|---|---|---|---|---|
| ILA-106 | Potaissa (Turda) | 206927 = **Apulum** (Alba Iulia, ~60 km più a sud) | **207362** Potaissa (ctx «Turda ROM») | Lane, «Potaissa: Turda, Romania» |
| ILA-107, ILA-108 | Sunium (zona del Laurion) | 570740 = **Tiryns**, in Argolide | **580107** Sounion (settlement and deme), come già ILA-100; in alternativa 580010 Laureion | Lane mette i nr. 12-13 sotto «Sunium: Sounion, Greece», trovati «südlich von Ergasteria, im Lauriongebiet» |
| ILA-283 | Eretria | 540767 = **Eretria (Thessaly)** | **579925** Eretria (Euboea) | Lane nr. 14: tomba del III sec. a.C., bibl. Andreiomenou, *ArchDelt* 16, 1960; il pezzo è nel museo locale. La revisione precedente (commento nel file) aveva sostituito un ID sbagliato con un altro sbagliato |
| ILA-110 | Smyrna | 550771 = **Palaia Smyrna** (Bayraklı, la città arcaica) | **550893** Smyrna/Eurydikeia (Izmir) | Lane nr. 28: «Sibile Tepe, on the East slope of the Pagos», cioè la città ellenistico-romana |

## 2. ID Pleiades mancanti ma recuperabili

Candidati trovati nel dump. «Sicuro» = stesso nome e stesso sito moderno di Lane;
«da vagliare» = il nome coincide ma Pleiades lo colloca o lo qualifica diversamente.

| Schede | Luogo in ILA (Lane) | Candidato Pleiades | Grado |
|---|---|---|---|
| ILA-017, 018, 019, 020, 021, 101 | Koresa (?) — Ayazviran | 609443 Koresa (lo stesso già usato in ILA-012…016) | sicuro per coerenza; ma vedi § 3 |
| ILA-040, 041, 102 | Tarsi (?) — Köleköy | 609543 «Tarsis?» (ctx «Köleköy») | sicuro |
| ILA-104 | Area of Saittae — Incikler | 609517 Saittai | sicuro |
| ILA-058 | Synaus — Simav | 609537 Synaos (ctx «Simav») | sicuro |
| ILA-060 | Serea (?) — Kuyucak | 609525 *Sereana (ctx «Kuyucak») | sicuro |
| ILA-116 | Plouristra (?) — Başköy (Pise) | 609505 *Plouristreia (ctx «2.5 miles N Başköy, formerly Pise») | sicuro |
| ILA-078 | Area of Vetissus (?) — Yağcı Oğlu | 619231 Ouetissos/Vetissus | sicuro sul nome |
| ILA-075, 076, 077 | Selmea — Gözören («Kozviran on map») | 609524 *Selmena (ctx «Kuzören») | da vagliare: Kozviran/Kuzören pare lo stesso villaggio di Lane, ma va controllato |
| ILA-038, 039 | Kavakli area (Kula) | 609546 *Taza? (ctx «Kavaklı», presso Kula) | da vagliare: Lane non dà un nome antico |
| ILA-062, 063 | Aouda (?) — Avdan | 609459 Marlakkou Kome (ctx «Avdan») | da vagliare: stesso villaggio, altro nome antico |
| ILA-061 | Oueza (?) — Söpüren | 614790 Ouezaitai (non localizzato) | sicuro sul nome, ma non dà coordinate |
| ILA-054 | Lydia | 550701 Lydia/Maionia (region) | sicuro (un punto di regione, precisione «related») |
| ILA-123 | unknown (east Lycia) | 638965 Lycia (region) | facoltativo |

Con i «sicuri» le schede senza URI scendono da 45 a 29; con tutti, a 21.

Restano senza candidato, e il `DA_COMPILARE` va probabilmente sostituito da un valore
esplicito tipo «non in Pleiades» per non sembrare lavoro arretrato: Görnevit
(ILA-027, 028; Pleiades ha solo il santuario di Artemide Anaitis a 1 miglio, 550456),
Karaoba (042), Kavacık (043), Darmara (045), Alianon katoikia (056), Hasarlar (057),
Beşkavak (079), Burdur (089, 111, 112), Askeriye (113), Macropedium (115),
Aziziye (117), Dereköy (131), Fasıllar (132), provenienza incerta (126–130).

## 3. Questioni di identificazione (da decidere, non errori)

- **Ayazviran: Koresa o Iaza?** Lane intitola «Koresa?: Ayazviran» (ILA-012…021, 101).
  Pleiades invece colloca *Iaza* ad Ayazviran (609412, ctx «Ayazviran (Ayazören)») e
  Koresa a Palankaya, «N Iaza». In più ILA-022 («Aivatlar area») usa proprio 609412
  Iaza, che per Pleiades non è Aivatlar: ad Aivatlar/Ayvatlar Pleiades mette
  *Doroukome?* (550517). I punti distano pochi km, quindi sulla carta cambia poco, ma
  oggi ILA dà a Iaza un sito che Pleiades assegna a un altro luogo e viceversa. Serve
  una scelta di merito (TAM V 1, Petzl, Herrmann) prima di toccare gli ID.
- **Gyölde = Kollyda** (ILA-003…011, 609441): corretto, ma il record Pleiades è un
  «labeled feature» con precisione *rough* (38.75, 28.75): sulla Mappa il punto cade
  a una decina di km dal villaggio. ILA-007 ha poi `modern` «Aivatlar area», perché
  Lane scrive «perhaps brought to Gyölde from Aivatlar»: l'incertezza sta solo nel
  campo moderno e non nell'antico.
- **Ormeleis** (ILA-071, 639023) è in Pleiades un etnico/«label, people», non un
  insediamento. Accettabile, ma da sapere.
- **Sebaste Phrygiae (area)** (ILA-055): Lane dice «Environs of Sebaste Phrygiae
  (perhaps Alia): Kırka near Uşak»; Pleiades ha anche *Dioskome* con ctx «Kırka?»
  (609364). Si può lasciare Sebaste, ma forse vale una nota.

## 4. Coerenza dei campi

- **`placeName type="modern"`**: 289 su 293 hanno `ref="DA_COMPILARE"`, 3 nessun
  `ref`, e ILA-001 ha `ref="Tekin, Germencik, Turkey"`, cioè una stringa al posto di
  un URI (e il testo dice «Tekke»). Nessun collegamento a GeoNames: o si compila
  sistematicamente, o si toglie il `ref` segnaposto.
- **Lingua del paese**: Turkey 180 / Turchia 81, Greece 13 / Grecia 6,
  Italia 5 / Italy 1. Stessa oscillazione tra `modern` e `provenance type="found"`
  della stessa scheda (p.es. ILA-017: «Ayazviran, Turkey» e «Ayazviran, Turchia»).
  Antiocheia da sola: 72 «Yalvaç, Turkey», 62 «Yalvaç, Turchia».
- **Il nome antico contiene toponimi moderni e glosse inglesi**: «Gyölde area (Kula)»,
  «Kavakli area (Kula)», «Burdur area», «uncertain», «unknown (east Lycia)»,
  «Coloe area (Kula)». Sono 46 «area», 25 «(?)», 6 «uncertain». Il campo `ancient`
  dovrebbe portare il nome antico (o restare vuoto) e l'incertezza andare in un
  attributo (`cert="low"`) o nella nota di `origPlace`.
- **Refuso**: ILA-144 ha «Kalköy»; Lane stampa «Kaleköy».
- **Regione**: 267 schede su 294 hanno soltanto «Asia Minor». Le regioni storiche
  (Lydia, Phrygia, Pisidia, Lycaonia, Galatia…) le hanno già i record Pleiades e
  le etichette della Mappa, ma non i dati: i filtri per regione non possono
  distinguere la Lidia delle stele di confessione da Antiochia.

## 5. Lato applicazione

- La Mappa scarica le coordinate da Pleiades a ogni caricamento (51 richieste).
  Pleiades risponde con `Access-Control-Allow-Origin: *`, quindi sul sito statico
  funziona; ma se Pleiades è giù la Mappa è vuota. Una cache locale delle coordinate
  (un JSON generato da uno script, aggiornato dai controlli notturni) la renderebbe
  indipendente e più veloce.
- `xmlUtils.ts` legge il primo `placeName type="ancient"` di tutto il file: oggi è
  sempre quello di `origPlace` (verificato su tutte le 294 schede), ma basterebbe un
  `placeName type="ancient"` nel titolo o nell'`msIdentifier` per spostare la scheda
  sulla carta. Meglio cercarlo dentro `<origPlace>`.
- Un controllo automatico in `lib/mancanze.ts` / nei controlli notturni potrebbe
  segnalare: URI Pleiades il cui titolo non contiene nessuno dei nomi del record,
  `DA_COMPILARE` residui, stesso nome antico con URI diversi o senza URI (il caso di
  Koresa).

## Di passaggio

CMRDM I nr. 131 (Anaboura, Ördekçi; Pleiades 638742) non è nel corpus: il commento di
revisione di ILA-119 ricorda che il suo testo era stato incollato per errore nella 130
e poi tolto, senza ricreare la 131 altrove.
