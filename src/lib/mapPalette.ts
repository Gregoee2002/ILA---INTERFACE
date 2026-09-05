// Palette centralizzata per MapView (e componenti mappa affini): colori
// regione, scala di densità e colore di evidenziazione cluster. Estratta da
// MapView.tsx (UI-05) perché gli stessi valori erano hard-coded in più punti
// del componente (marker, legenda) e duplicati in src/index.css. Nessun
// valore cromatico è stato cambiato in questa estrazione.

export const REGION_COLORS = {
  asiaMinor: '#1F8377', // accent teal — regione di culto principale di Men
  graecia: '#5B7A8C', // blu-grigio polvere
  dacia: '#B5651D', // terracotta
  italia: '#7A8F5E', // salvia
  fallback: '#9ca3af', // stone gray — regione ignota o "Filtrato / Altro"
} as const;

// Scala di densità sequenziale a più tappe (chiaro → accento teal scuro),
// interpolata in HSL invece che RGB grezzo: una singola interpolazione a 2
// colori rendeva densità medie e alte quasi indistinguibili fra loro. La
// prima tappa resta un grigio-verde scuro deliberatamente più marcato delle
// tile di base (quasi bianche), per restare leggibile anche per i siti con
// una sola iscrizione.
export const DENSITY_SCALE = ['#8b9089', '#a9c2ba', '#6fab99', '#3d9484', '#1F8377', '#0d5147'] as const;

// Colore fisso per i siti con corrispondenze quando un filtro è attivo
// (invece della scala di densità), e per il pallino di legenda associato.
export const FILTER_MATCH_COLOR = '#0d5147';

// Riempimento dei siti senza corrispondenze quando un filtro è attivo.
export const GRAYED_OUT_FILL_COLOR = '#c7c2b4';

// Colore dedicato per i cluster con almeno un'iscrizione corrispondente al
// filtro epiteto/divinità attivo (rosso terracotta scuro), distinto sia
// dalla scala di densità teal sia dai colori delle regioni. Duplicato anche
// in src/index.css (.marker-cluster-highlight) tramite la custom property
// --map-cluster-highlight: se cambia qui, va cambiato anche lì.
export const CLUSTER_HIGHLIGHT_COLOR = '#B0233F';
