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
  { name: 'Caria', lat: 37.3, lng: 28.1, kind: 'regio', minZoom: 6 },
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
];
