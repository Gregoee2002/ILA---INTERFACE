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
 * da vicino le regioni storiche che la compongono.
 */
export interface AncientLabel {
  name: string;
  lat: number;
  lng: number;
  kind: 'regio' | 'mare';
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
  { name: 'Mysia', lat: 39.8, lng: 28.0, kind: 'regio', minZoom: 6 },
  { name: 'Lydia', lat: 38.6, lng: 28.2, kind: 'regio', minZoom: 6 },
  { name: 'Ionia', lat: 38.1, lng: 27.0, kind: 'regio', minZoom: 7 },
  { name: 'Caria', lat: 37.3, lng: 28.1, kind: 'regio', minZoom: 6 },
  { name: 'Phrygia', lat: 39.0, lng: 30.6, kind: 'regio', minZoom: 6 },
  { name: 'Bithynia', lat: 40.6, lng: 30.4, kind: 'regio', minZoom: 6 },
  { name: 'Paphlagonia', lat: 41.4, lng: 33.6, kind: 'regio', minZoom: 6 },
  { name: 'Pontus', lat: 40.7, lng: 37.0, kind: 'regio', minZoom: 6 },
  { name: 'Galatia', lat: 39.7, lng: 33.2, kind: 'regio', minZoom: 6 },
  { name: 'Cappadocia', lat: 38.6, lng: 35.6, kind: 'regio', minZoom: 6 },
  { name: 'Lycaonia', lat: 37.9, lng: 33.0, kind: 'regio', minZoom: 6 },
  { name: 'Pisidia', lat: 37.7, lng: 30.9, kind: 'regio', minZoom: 6 },
  { name: 'Lycia', lat: 36.6, lng: 29.6, kind: 'regio', minZoom: 6 },
  { name: 'Pamphylia', lat: 37.0, lng: 31.2, kind: 'regio', minZoom: 7 },
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
];
