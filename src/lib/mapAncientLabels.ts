/**
 * Nomi antichi disegnati sopra la base cartografica della Mappa.
 *
 * La base (Esri World Terrain Base) non ha scritte: i nomi li mettiamo noi,
 * col font del sito e nella forma latina, invece dei toponimi moderni in
 * cirillico, arabo o tifinagh delle basi generaliste. Le coordinate sono il
 * baricentro approssimativo della regione, non un confine: servono a orientare,
 * non a delimitare.
 *
 * `minZoom`/`maxZoom` scalano i nomi con lo zoom: a zoom basso «Asia Minor»,
 * da vicino le regioni storiche che la compongono, e poi le città — prima le
 * maggiori, poi i centri minori dove la carta si fa fitta.
 */
export interface AncientLabel {
  name: string;
  lat: number;
  lng: number;
  /** `urbs` si disegna con un punto sulla coordinata e il nome a destra. */
  kind: 'regio' | 'mare' | 'urbs';
  minZoom?: number;
  maxZoom?: number;
}

export const ANCIENT_LABELS: AncientLabel[] = [
  // Grandi regioni, sempre visibili
  { name: 'Italia', lat: 43.4, lng: 12.2, kind: 'regio' },
  { name: 'Dacia', lat: 46.7, lng: 25.3, kind: 'regio' },
  { name: 'Thracia', lat: 42.2, lng: 25.8, kind: 'regio' },
  { name: 'Aegyptus', lat: 27.0, lng: 30.8, kind: 'regio' },
  { name: 'Syria', lat: 34.8, lng: 37.8, kind: 'regio' },
  { name: 'Cyrenaica', lat: 31.6, lng: 21.8, kind: 'regio' },

  // Grecia: nome d'insieme da lontano, le regioni da vicino
  { name: 'Graecia', lat: 39.6, lng: 22.0, kind: 'regio', maxZoom: 5 },
  { name: 'Macedonia', lat: 40.9, lng: 22.4, kind: 'regio', minZoom: 6 },
  { name: 'Achaia', lat: 37.9, lng: 22.2, kind: 'regio', minZoom: 6 },

  // Asia Minore: idem
  { name: 'Asia Minor', lat: 39.4, lng: 34.4, kind: 'regio', maxZoom: 5 },
  { name: 'Troas', lat: 39.7, lng: 26.4, kind: 'regio', minZoom: 7 },
  { name: 'Mysia', lat: 39.75, lng: 28.2, kind: 'regio', minZoom: 6 },
  { name: 'Lydia', lat: 38.95, lng: 28.6, kind: 'regio', minZoom: 6 },
  { name: 'Ionia', lat: 38.1, lng: 27.0, kind: 'regio', minZoom: 7 },
  { name: 'Caria', lat: 37.05, lng: 28.35, kind: 'regio', minZoom: 6 },
  { name: 'Phrygia', lat: 39.0, lng: 30.6, kind: 'regio', minZoom: 6 },
  { name: 'Bithynia', lat: 40.6, lng: 30.4, kind: 'regio', minZoom: 6 },
  { name: 'Paphlagonia', lat: 41.4, lng: 33.6, kind: 'regio', minZoom: 6 },
  { name: 'Pontus', lat: 40.7, lng: 37.0, kind: 'regio', minZoom: 6 },
  { name: 'Galatia', lat: 39.3, lng: 33.5, kind: 'regio', minZoom: 6 },
  { name: 'Cappadocia', lat: 38.6, lng: 35.6, kind: 'regio', minZoom: 6 },
  { name: 'Lycaonia', lat: 38.35, lng: 33.3, kind: 'regio', minZoom: 6 },
  { name: 'Pisidia', lat: 37.7, lng: 30.9, kind: 'regio', minZoom: 6 },
  { name: 'Lycia', lat: 36.6, lng: 29.6, kind: 'regio', minZoom: 6 },
  { name: 'Pamphylia', lat: 37.3, lng: 31.7, kind: 'regio', minZoom: 7 },
  { name: 'Cilicia', lat: 37.0, lng: 34.8, kind: 'regio', minZoom: 6 },

  // Isole
  { name: 'Creta', lat: 35.25, lng: 24.9, kind: 'regio', minZoom: 6 },
  { name: 'Cyprus', lat: 35.05, lng: 33.2, kind: 'regio', minZoom: 6 },
  { name: 'Sicilia', lat: 37.5, lng: 14.2, kind: 'regio', minZoom: 6 },

  // Mari
  { name: 'Mare Internum', lat: 34.2, lng: 19.0, kind: 'mare', maxZoom: 6 },
  { name: 'Pontus Euxinus', lat: 43.3, lng: 34.4, kind: 'mare' },
  { name: 'Mare Aegaeum', lat: 38.9, lng: 25.0, kind: 'mare', minZoom: 5 },
  { name: 'Mare Adriaticum', lat: 42.9, lng: 15.9, kind: 'mare', minZoom: 5 },
  { name: 'Mare Ionium', lat: 37.6, lng: 18.4, kind: 'mare', minZoom: 5 },
  { name: 'Mare Tyrrhenum', lat: 40.0, lng: 12.1, kind: 'mare', minZoom: 6 },
  { name: 'Propontis', lat: 40.72, lng: 28.1, kind: 'mare', minZoom: 7 },

  // Città maggiori (da zoom 6)
  ...([
    ['Roma', 41.89, 12.49], ['Athenae', 37.97, 23.73], ['Corinthus', 37.91, 22.88],
    ['Thessalonica', 40.64, 22.94], ['Byzantium', 41.01, 28.98], ['Pergamum', 39.13, 27.18],
    ['Smyrna', 38.42, 27.14], ['Ephesus', 37.94, 27.34], ['Sardis', 38.49, 28.04],
    ['Ancyra', 39.94, 32.86], ['Antiochia', 36.20, 36.16], ['Alexandria', 31.20, 29.92],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 6 })),

  // Città minori (da zoom 7; le più vicine fra loro da 8)
  ...([
    ['Neapolis', 40.85, 14.26], ['Sparta', 37.08, 22.43], ['Delos', 37.40, 25.27],
    ['Rhodos', 36.44, 28.22], ['Cyzicus', 40.39, 27.89], ['Nicomedia', 40.77, 29.92],
    ['Nicaea', 40.43, 29.72], ['Philadelphia', 38.35, 28.52], ['Miletus', 37.53, 27.28],
    ['Halicarnassus', 37.04, 27.42], ['Aphrodisias', 37.71, 28.72], ['Laodicea', 37.84, 29.11],
    ['Apamea', 38.07, 30.17], ['Synnada', 38.52, 30.49], ['Dorylaeum', 39.81, 30.53],
    ['Cotiaeum', 39.42, 29.98], ['Pessinus', 39.33, 31.58], ['Antiochia Pisidiae', 38.31, 31.19],
    ['Iconium', 37.87, 32.49], ['Sagalassus', 37.68, 30.52], ['Perge', 36.96, 30.85],
    ['Side', 36.77, 31.39], ['Tarsus', 36.92, 34.89], ['Caesarea', 38.72, 35.49],
    ['Sinope', 42.03, 35.15], ['Amaseia', 40.65, 35.83], ['Cyrene', 32.82, 21.86],
    ['Tomis', 44.17, 28.65], ['Apulum', 46.07, 23.57],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 7 })),
  ...([
    ['Ostia', 41.75, 12.29], ['Hierapolis', 37.93, 29.13], ['Attaleia', 36.88, 30.70],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 8 })),

  // Centri minori, da vicino (zoom 8; da 9 quelli a ridosso di un'altra città).
  // Coordinate da Pleiades (reprPoint) dove il luogo ha un titolo univoco; per
  // gli altri la posizione del sito moderno corrispondente.
  ...([
    ['Thyatira', 38.92, 27.836], ['Magnesia ad Sipylum', 38.613, 27.433], ['Tralles', 37.86, 27.84],
    ['Nysa', 37.904, 28.145], ['Saittae', 38.703, 28.624], ['Blaundus', 38.358, 29.209],
    ['Temenothyrae', 38.68, 29.41], ['Eumenia', 38.32, 29.849],
    ['Cibyra', 37.16, 29.489], ['Hypaepa', 38.248, 27.963], ['Teos', 38.177, 26.785],
    ['Colophon', 38.11, 27.14], ['Erythrae', 38.383, 26.481], ['Phocaea', 38.67, 26.76],
    ['Cnidus', 36.69, 27.37], ['Stratonicea', 37.314, 28.062], ['Mylasa', 37.303, 27.79],
    ['Alabanda', 37.592, 27.985], ['Tabae', 37.443, 28.857], ['Nacolea', 39.458, 30.707],
    ['Amorium', 39.02, 31.296], ['Philomelium', 38.357, 31.43],
    ['Docimium', 38.862, 30.752], ['Apollonia', 38.08, 30.46], ['Termessus', 36.984, 30.463],
    ['Selge', 37.225, 31.126], ['Cremna', 37.495, 30.686], ['Xanthus', 36.357, 29.32],
    ['Myra', 36.259, 29.985], ['Telmessus', 36.621, 29.106], ['Aspendus', 36.94, 31.17],
    ['Seleucia', 36.38, 33.93], ['Anazarbus', 37.258, 35.897], ['Iuliopolis', 40.107, 31.645],
    ['Tavium', 39.858, 34.507], ['Prusa', 40.183, 29.064], ['Cius', 40.432, 29.156],
    ['Claudiopolis', 40.74, 31.61], ['Adramyttium', 39.53, 26.97], ['Lampsacus', 40.35, 26.69],
    ['Ilium', 39.96, 26.24], ['Alexandria Troas', 39.75, 26.16], ['Assus', 39.491, 26.337],
    ['Amisus', 41.3, 36.33], ['Trapezus', 41.0, 39.73], ['Neocaesarea', 40.58, 36.95],
    ['Tyana', 37.827, 34.58], ['Lystra', 37.588, 32.344], ['Delphi', 38.482, 22.501],
    ['Olympia', 37.639, 21.631], ['Argos', 37.63, 22.722], ['Chalcis', 38.46, 23.6],
    ['Thebae', 38.32, 23.318], ['Megara', 37.985, 23.34], ['Patrae', 38.25, 21.73],
    ['Nicopolis', 39.01, 20.73], ['Philippi', 41.025, 24.335], ['Amphipolis', 40.826, 23.842],
    ['Beroea', 40.52, 22.2], ['Pella', 40.765, 22.518], ['Samos', 37.688, 26.944],
    ['Chios', 38.372, 26.133], ['Mytilene', 39.112, 26.556], ['Naxos', 37.104, 25.378],
    ['Gortyna', 35.063, 24.947], ['Cnossus', 35.299, 25.16], ['Capua', 41.086, 14.25],
    ['Tarentum', 40.474, 17.233], ['Brundisium', 40.639, 17.943], ['Aquileia', 45.77, 13.371],
    ['Ravenna', 44.416, 12.197], ['Sarmizegetusa', 45.515, 22.785], ['Porolissum', 47.179, 23.157],
    ['Napoca', 46.773, 23.594], ['Potaissa', 46.568, 23.782], ['Nicopolis ad Istrum', 43.218, 25.612],
    ['Odessus', 43.2, 27.91], ['Callatis', 43.81, 28.59], ['Histria', 44.549, 28.775],
    ['Memphis', 29.849, 31.255], ['Seleucia Pieria', 36.12, 35.93], ['Apamea Syriae', 35.42, 36.4],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 8 })),
  ...([
    ['Tripolis', 38.05, 28.961], ['Maeonia', 38.535, 28.491],
    ['Silandus', 38.752, 28.826], ['Sebaste', 38.496, 29.656], ['Colossae', 37.79, 29.26],
    ['Clazomenae', 38.361, 26.771], ['Cyme', 38.76, 26.94], ['Priene', 37.66, 27.298],
    ['Prymnessus', 38.698, 30.569], ['Patara', 36.26, 29.314], ['Chalcedon', 40.99, 29.03],
    ['Cos', 36.894, 27.29], ['Puteoli', 40.826, 14.122],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 9 })),
  // Nomi lunghi che a zoom 8 coprirebbero la città vicina.
  { name: 'Midaeum', lat: 39.8, lng: 30.845, kind: 'urbs', minZoom: 9 },
  { name: 'Acmonia', lat: 38.66, lng: 29.774, kind: 'urbs', minZoom: 9 },
  { name: 'Magnesia ad Maeandrum', lat: 37.85, lng: 27.523, kind: 'urbs', minZoom: 10 },

  // Siti del corpus che non erano già fra le città: stessi punti della
  // mappa (reprPoint Pleiades del <placeName type="ancient"> delle schede),
  // nome in forma latina dove esiste, altrimenti quello di Pleiades.
  ...([
    ['Coloe', 38.226, 28.208], ['Ipsus', 38.856, 30.549], ['Appola', 38.955, 31.146],
    ['Laodicea Combusta', 38.189, 32.376], ['Andeda', 37.272, 30.26], ['Androna', 39.63, 32.658],
    ['Lindus', 36.091, 28.088], ['Ormeleis', 37.307, 29.848], ['Thoricus', 37.738, 24.054],
    ['Sunium', 37.652, 24.026], ['Thasus', 40.782, 24.718], ['Olbasa', 37.308, 30.009],
    ['Savatra', 37.975, 33.111], ['Sidamaria', 37.48, 33.631], ['Mostene', 38.535, 27.547],
    ['Piraeus', 37.937, 23.645],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 8 })),
  // Katoikiai del Kula, fitte fra Saittae e Maeonia: si aprono più tardi.
  ...([
    ['Collyda', 38.75, 28.75], ['Koresa', 38.624, 28.586], ['Kaualena', 38.596, 29.385],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 9 })),
  ...([
    ['Iaza', 38.587, 28.607],
  ] as const).map(([name, lat, lng]): AncientLabel => ({ name, lat, lng, kind: 'urbs', minZoom: 10 })),
];
