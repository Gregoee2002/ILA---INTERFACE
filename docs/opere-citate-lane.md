# Opere citate «op. cit.» / «loc. cit.» — scioglimento da CMRDM I

Nel corpus ILA ci sono **173 voci `<bibl>`** che rimandano a un'opera con
`op. cit.`, `loc. cit.`, `locc. citt.`, `ap. cit.` o `idem`. Lane non premette
una bibliografia generale (Prefazione, p. X): dà la citazione **per esteso la
prima volta** che nomina un'opera, poi usa `op. cit.` o un titolo abbreviato.

Questa tabella scioglie ogni sigla risalendo alla **prima citazione completa in
Lane, CMRDM I (1971)**. Il testo è ricavato dallo strato OCR del PDF
(`Documents/OCR/Corpus monumentorum dei mensis.pdf`, 297 pp.) e ripulito dagli
errori di scansione. Numeri fra parentesi = quante `<bibl>` del corpus usano
quella sigla.

> Le forme qui sotto sono **normalizzate in stile italiano** (norme in
> [norme-bibliografia.md](norme-bibliografia.md)): niente casa editrice, riviste
> in `«…»`, `pp.`/`cc.`. Dove Lane premette `*` (opera non vista direttamente da
> lui) lo si conserva.

> **APPLICATO 2026-08-30** — 148 voci `<bibl>` su 79 schede sostituite direttamente
> sul repo dati `Gregoee2002/ILA` (`corpus/`, `main`, 79 commit via API). Prefisso
> `Autore, op. cit.`/`loc. cit.` → opera per esteso, coda conservata e normalizzata
> (`col.`→`c./cc.`, cifre piene, `no.`→`n.`). Famiglie trattate: Drexler, Perdrizet,
> Herrmann, Steinleitner, Le Bas-Waddington, Keppel, Leemans, L. Vidman, Duthoy,
> Hiesinger, Vermaseren, Texier, Heinevetter, Swoboda et al., T. Homolle, Calder,
> Cronin, Callander, P. Roussel, Foucart, Milchhöfer, Gurlitt, Cordella, J. Marcadé,
> Daremberg-Saglio, Apollonj-Ghetti et al.
> **NON ancora trattate** (titolo/scioglimento da verificare sul cartaceo): Anderson
> (17), Smirnoff (7), Roscher op. cit. (2), Zingerle (2), Fontrier, `idem` (ILA-096),
> `Lane, I, loc. cit.` (2), e i rinvii `loc. cit.` che appartengono a famiglie grandi
> (Robert, Ramsay). Restano fuori scope anche le varianti **senza** `op. cit.` delle
> stesse famiglie (es. `P. Perdrizet, BCH, XX, 1896, …`, `Drexler, in Roscher, Lexikon…`),
> da riportare allo stile italiano in una passata separata.

> **PUNTO 3 — APPLICATO 2026-08-31** — 58 voci `<bibl>` su 37 schede: le varianti
> **senza** `op. cit.` delle 26 famiglie sono state uniformate alla forma estesa
> (mappa esplicita testo→testo in scratchpad `pass3_map.py`, 37 commit via API sul
> repo dati). Dove l'autore ha **più opere** (Calder: «Klio» 1910/1930, RPh 1912,
> «JRS» 1912; Foucart: «BCH» 4 (1880) ≠ *Des associations*; Homolle: «BCH» 18 (1894)
> ≠ «BCH» 23 (1899)) si è fatto solo il restyle anglo→ita. `M.J. Vermaseren,
> «Vigiliae Christianae» 4 (1950)` resta **senza titolo** dell'articolo (da recuperare).

| Sigla nel corpus | Opera per esteso (da CMRDM I) | Prima citazione completa in CMRDM I |
|---|---|---|
| **Drexler, op. cit.** (51) | W. Drexler, *Mên*, in W.H. Roscher (a cura di), *Ausführliches Lexikon der griechischen und römischen Mythologie*, II.2, Leipzig 1894-1897, cc. 2687-2770. | no. 1: «W. Drexler, article in W. H. Roscher, Lexikon der griechischen und römischen Mythologie, Leipzig 1884-1937, col. 2731». `op. cit.` rinvia sempre a una `col. 26xx-27xx`. |
| **Perdrizet, op. cit.** (38) | P. Perdrizet, *Mèn*, «BCH» 20 (1896), pp. 55-106. | no. 3: «P. Perdrizet, BCH, XX, 1896, p. 81 and Plate XIV». |
| **Herrmann, op. cit.** (17) | P. Herrmann, *Ergebnisse einer Reise in Nordostlydien*, «Denkschriften der Österreichischen Akademie der Wissenschaften, Philosophisch-Historische Klasse» 80, Wien 1962. | no. 12: «P. Herrmann, Ergebnisse einer Reise in Nordostlydien, Denkschriften … LXXX, 1962, p. 45, note 17». |
| **(J.G.C.) Anderson, op. cit.** (11) | J.G.C. Anderson, *Exploration in Galatia cis Halym. Part II*, «JHS» 19 (1899), pp. 52-134, 280-318. *[titolo dell'articolo da verificare]* | no. 108: «J. G. C. Anderson, JHS, XIX, 1899, p. 299, no. 220». |
| **Steinleitner, op. cit.** (7) | F. Steinleitner, *Die Beicht im Zusammenhange mit der sakralen Rechtspflege in der Antike*, München-Leipzig 1913. | citata per esteso più volte nel corpus stesso. |
| **Smirnoff, op. cit.** (5) | Y. Smirnoff, [articolo su Men], in *Stephanos. Studies in Honour of F. F. Sokolov*, St. Petersburg 1895, pp. 114-117. | no. 12: «Y. Smirnoff, article on Men in Stephanos … St. Petersburg 1895, pp. 114-117, no. 24, fig. 1». |
| **Le Bas-Waddington, op. cit.** (5) | P. Le Bas – W.H. Waddington, *Voyage archéologique en Grèce et en Asie Mineure*, III, i (*Inscriptions*), Paris [ca. 1870]. | no. 33: «P. LeBas and W. H. Waddington, Voyage Archéologique en Grèce et en Asie Mineure, Paris, ca. 1870, III, i, p. 217, no. 680». |
| **Keppel, op. cit.** (3) | G. Keppel, *Narrative of a Journey across the Balcan, also of a Visit to Aizani and the newly discovered Ruins in Asia Minor in the Years 1829-30*, II, London 1831. | no. 33: citazione completa come sopra. |
| **Leemans, op. cit.** (3) | G. Leemans, *Grieksche Opschriften uit Klein-Azië* («Amsterdam Academy, Verhandelingen, Afdeeling Letterkunde» XVII, ii), 1886. | no. 16: «G. Leemans, Grieksche Opschriften uit Klein-Azie … 1886, pp. 10-11, no. 4 and Plate I, no. 4». |
| **L. Vidman, op. cit.** (3) | L. Vidman, *Sylloge Inscriptionum Religionis Isiacae et Sarapiacae*, Berlin 1969. | no. 10: «L. Vidman, Sylloge Inscriptionum Religionis Isiacae et Sarapiacae, Berlin 1969, p. 15, no. 27». |
| **Zingerle, op. cit.** (2) | J. Zingerle, [contributo in] «Österreichisches Archäologisches Institut, Jahreshefte» 23 (1926), Beiblatt, cc. 1-15. | no. 45: «J. Zingerle, Österreichisches Archäologisches Institut, Jahreshefte, XXIII, 1926, Beiblatt, cols. 1-15 and fig. 1». |
| **Roscher, op. cit.** (2) | W.H. Roscher, [contributo in] Königlich Sächsische Gesellschaft der Wissenschaften zu Leipzig, Philologisch-Historische Klasse, «Berichte» 43 (1891), p. 125, tavv. II-III. *[= «Nachträge … über Selene und Verwandtes»]* | no. 24: «W. H. Roscher, Akademie der Wissenschaften, Leipzig, Phil.-Hist. Klasse, Berichte, XLIII, 1891, p. 125 c, Pl. II bottom». **Da non confondere con Drexler in Roscher, *Lexikon*.** |
| **Hiesinger, op. cit.** (2) | U.W. Hiesinger, *Three Images of the God Men*, «HSCP» 71 (1966), pp. 303-310. | no. 136: «U. Hiesinger, HSCP, LXXI, 1966, pp. 306-7 and Plate III». |
| **Duthoy, op. cit.** (2) | R. Duthoy, *The Taurobolium. Its Evolution and Terminology*, Leiden 1969. | no. 23: «R. Duthoy, The Taurobolium, Leiden 1969, p. 14, no. 13». |
| **Vermaseren, op. cit.** (2) | M.J. Vermaseren, *Corpus Inscriptionum et Monumentorum Religionis Mithriacae (CIMRM)*, I, The Hague 1956. | no. 24: «M. J. Vermaseren, Corpus Inscriptionum et Monumentorum Religionis Mithriacae, Hague, 1956-60, I, p. 204, no. 513». **Diverso da** «Vermaseren, *Vigiliae Christianae* IV, 1950», anch'essa citata per esteso (no. 11). |
| **Fontrier, loc. cit.** (1) | *A. Fontrier, [in] «Harmonia», 20 e 31 maggio 1900, no. 2. | no. 45: «*A. Fontrier, Harmonia, 20 and 31 May 1900, no. 2». |
| **Texier, op. cit.** (1) | C. Texier, *Description de l'Asie Mineure*, I, Paris 1850. | no. 53: «C. Texier, Description de l'Asie Mineure, Paris 1850, I, p. 135, Pl. 51 top». |
| **T. Homolle, op. cit.** (1) | T. Homolle, [in] «BCH» 18 (1894), p. 539. | no. 30: «T. Homolle, BCH, XVIII, 1894, p. 539». |
| **Gurlitt, loc. cit.** (1) | W. Gurlitt, [in] «Philologus» 27 (1868), pp. 729-735. | no. 13: «W. Gurlitt, Philologus, XXVII, 1868, pp. 729-35». |
| **Cordella, loc. cit.** (1) | *A. Cordella, *Le Laurion*, Marseille 1871, pp. 34-36. | no. 13: «*A. Cordella, Le Laurion, Marseille 1871, p. 34-36». |
| **Foucart, loc. cit.** (1) | P. Foucart, *Des associations religieuses chez les Grecs*, Paris 1873, pp. 119-127. | no. 13: «P. Foucart, Des Associations Religieuses chez les Grecs, Paris 1873, pp. 119-27». (Diverso da «P. Foucart, BCH IV, 1880, p. 129».) |
| **Daremberg-Saglio, loc. cit.** (1) | C. Daremberg – E. Saglio, *Dictionnaire des antiquités grecques et romaines*, III, ii, Paris [1877-1918], p. 1397. | no. 3 / no. 12: «C. Daremberg and E. Saglio, Dictionnaire des Antiquités, Paris 1877-1918, III, ii, 1393». |
| **Milchhöfer, loc. cit.** (1) | A. Milchhöfer, [in] «AM» 12 (1887), p. 300, no. 279. | no. 13: «Milchhöfer, AM, XII, 1887, p. 300, no. 279». |
| **Heinevetter, op. cit.** (1) | F. Heinevetter, *Würfel- und Buchstabenorakel in Griechenland und Kleinasien*, Breslau 1912. | no. 1: «F. Heinevetter, Würfel- und Buchstabenorakel in Griechenland und Kleinasien, Breslau 1912, no. 3». |
| **Cronin, op. cit.** (1) | H.S. Cronin, [in] «JHS» 22 (1902), p. 118, no. 42. | citata per esteso nel corpus stesso. |
| **Calder, op. cit.** (1) | W.M. Calder, [in] «Revue de Philologie» 36 (1912), p. 66, no. 33. | no. 149: «W. M. Calder, Revue de Philologie, XXXVI, 1912, p. 66, no. 33» (la scheda `op. cit.` è la no. 150). Lane cita anche Calder in «Klio» X (1910), «Klio» XXIV (1930), «JRS» II (1912). |
| **Callander, op. cit.** (1) | T.A. Callander, [in] *Studies in the History and Art of the Eastern Provinces of the Roman Empire* («Aberdeen University Studies» XX), 1906, p. 160, no. 9. | no. 155: citazione completa come sopra. |
| **Swoboda et al., op. cit.** (1) | H. Swoboda – J. Keil – F. Knoll, *Denkmäler aus Lykaonien, Pamphylien und Isaurien*, Prag 1935. | no. 144: citazione completa come sopra. |
| **L. Robert, REG, LXXXI, 1968, loc. cit.** (1) | L. Robert, [in] «REG» 81 (1968), p. 429, no. 71. | no. 254 rinvia a Robert «REG» LXXXI, 1968, p. 429, no. 71. |
| **Ramsay, JRS, VIII, 1918, loc. cit.** (1) | W.M. Ramsay, [in] «JRS» 8 (1918). | Lane cita «Ramsay, JRS, VIII, 1918, p. 109» e «… p. 118». |
| **P. Roussel, op. cit.** (1) | *P. Roussel, *Les cultes égyptiens à Délos du IIIe au Ier siècle av. J.-C.*, Paris-Nancy 1916. | no. 19: «*P. Roussel, Les Cultes Égyptiens à Délos …, Nancy 1916, no. 63». |
| **J. Marcadé, locc. citt.** (1) | J. Marcadé, *Au Musée de Délos*, Paris 1969, pp. 399 e 411. | no. 19: «J. Marcadé, Au Musée de Délos, Paris 1969, pp. 399 and 411». |
| **Apollonj-Ghetti et al., loc. cit.** (1) | B.M. Apollonj Ghetti – A. Ferrua – E. Josi – E. Kirschbaum, *Esplorazioni sotto la confessione di San Pietro in Vaticano eseguite negli anni 1940-1949*, Città del Vaticano 1951. | no. 26: citazione completa come sopra. |
| **idem** (ILA-096) (1) | [F.] Wieseler, *Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen* 19 (1874), p. 34. | `idem` = stesso autore della voce precedente (Wieseler, *Nachrichten … Göttingen*, 1874, p. 14). |
| **Lane, I, loc. cit.** (2) | Rinvio di Lane al proprio vol. I per quella scheda: pagina/numero da completare caso per caso da CMRDM I (o II). | ILA-245, ILA-246. |

## Note

- **Drexler ≠ Roscher.** «Drexler, op. cit.» = l'articolo *Mên* di W. Drexler
  dentro il *Lexikon* di Roscher (cc. 2687-2770). «Roscher, op. cit.» = un
  contributo autonomo di Roscher nei «Berichte» sassoni del 1891. Sono due opere
  diverse pur nello stesso ambito.
- **Foucart** compare con due opere diverse: *Des associations religieuses*
  (1873) e un articolo in «BCH» IV (1880). In ILA-108 `loc. cit.` = la prima.
- **Anderson**: verificare il titolo esatto dell'articolo «JHS» 19 (1899) sul
  cartaceo (l'OCR dà solo «JHS, XIX, 1899, p. 299, no. 220»).
- Fonte OCR con refusi tipici ('cm.'→'em.', 'Pl.'→'PI.', 'JHS'→']HS', 'Göttingen'
  →'Gattingen', 'op. cit.'→'ap./loco cit.'): le forme in tabella sono già
  corrette a mano.
