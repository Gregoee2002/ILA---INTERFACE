/**
 * eagleVocab.ts — ILA / MENISKOS
 * ------------------------------------------------------------------
 * Vocabolari controllati derivati dalle liste EAGLE del progetto IGCyr/GVCyr
 * (Inscriptions of Greek Cyrenaica — CC BY-NC-SA 4.0, DOI: 10.60760/unibo/igcyrgvcyr2).
 * EAGLE è uno standard condiviso: object type, material, execution technique e
 * inscription type sono vocabolari generali di tutta l'epigrafia mediterranea,
 * non specifici di Cirenaica — riusabili qui senza adattamento.
 *
 * "confession" in INSCRIPTION_TYPES è un'estensione locale ILA, dichiarata
 * esplicitamente (eagle assente) — non esiste nel vocabolario EAGLE ufficiale,
 * ma è centrale per la ricerca sul culto di Men (Lane, Petzl BWK).
 *
 * VISUALIZZAZIONE: `label` (inglese) è il valore CANONICO — quello salvato nei
 * dati e agganciato all'URI EAGLE. `labelIt` è solo un livello di visualizzazione
 * italiano sopra, mai scritto nell'XML/Firestore. Dove `labelIt` manca (OFFICES,
 * e le voci più oscure delle altre liste), l'interfaccia mostra `label`/`greek`
 * originale invece di inventare una traduzione non verificata.
 *
 * office.xml, divine.xml, names.xml, locations.xml, bibliography.xml del
 * progetto sorgente NON sono stati riusati per i dati (specifici di Cirenaica:
 * altre divinità, altri luoghi, altra bibliografia) tranne "office" qui sotto,
 * che è un vocabolario di cariche/titoli greci di per sé generale.
 * ------------------------------------------------------------------
 */

export interface VocabTerm {
  id: string;
  label: string;
  labelIt?: string;
  greek?: string;
  eagle?: string;
  getty?: string;
}

/** Etichetta da mostrare nell'interfaccia: italiano se disponibile, altrimenti il termine originale. */
export function displayLabel(t: VocabTerm): string {
  return t.labelIt || t.label;
}

export const OBJECT_TYPES: VocabTerm[] = [
  { id: "altar", label: "altar", labelIt: "altare", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/29", getty: "http://vocab.getty.edu/page/aat/300052391" },
  { id: "architrave", label: "architrave", labelIt: "architrave", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/119", getty: "http://vocab.getty.edu/page/aat/300001780" },
  { id: "arrow", label: "arrow head", labelIt: "punta di freccia", getty: "http://vocab.getty.edu/page/aat/300024861" },
  { id: "ashlar", label: "ashlar", labelIt: "blocco squadrato", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/189", getty: "http://vocab.getty.edu/page/aat/300011701" },
  { id: "ball", label: "ball", labelIt: "sfera", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/45" },
  { id: "base", label: "base", labelIt: "base", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/53", getty: "http://vocab.getty.edu/page/aat/300001656" },
  { id: "basin", label: "basin", labelIt: "bacino", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/144", getty: "http://vocab.getty.edu/page/aat/300045614" },
  { id: "block", label: "block", labelIt: "blocco", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/189", getty: "http://vocab.getty.edu/page/aat/300014614" },
  { id: "brazier", label: "brazier", labelIt: "braciere", getty: "http://vocab.getty.edu/page/aat/300198452" },
  { id: "bronzeobject", label: "bronze", labelIt: "oggetto in bronzo", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/15", getty: "http://vocab.getty.edu/page/aat/300047333" },
  { id: "capital", label: "capital", labelIt: "capitello", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/63", getty: "http://vocab.getty.edu/page/aat/300001662" },
  { id: "chalice", label: "chalice", labelIt: "calice", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/313", getty: "http://vocab.getty.edu/page/aat/300194762" },
  { id: "chamber", label: "chamber", labelIt: "camera", getty: "http://vocab.getty.edu/page/aat/300251821" },
  { id: "column", label: "column", labelIt: "colonna", greek: "column", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/100", getty: "http://vocab.getty.edu/page/aat/300001571" },
  { id: "console", label: "console", labelIt: "mensola", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/107", getty: "https://vocab.getty.edu/page/aat/300075330" },
  { id: "cornice", label: "cornice", labelIt: "cornice", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/36", getty: "https://vocab.getty.edu/page/aat/300001788" },
  { id: "cup", label: "cup", labelIt: "coppa", greek: "cup", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/313", getty: "http://vocab.getty.edu/page/aat/300043202" },
  { id: "dish", label: "dish", labelIt: "piatto", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/309", getty: "http://vocab.getty.edu/page/aat/300042973" },
  { id: "doll", label: "doll", labelIt: "statuetta", getty: "http://vocab.getty.edu/page/aat/300211087" },
  { id: "exedra", label: "exedra", labelIt: "esedra", greek: "exedra", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/37", getty: "http://vocab.getty.edu/page/aat/300004014" },
  { id: "frieze", label: "freeze", labelIt: "fregio", getty: "http://vocab.getty.edu/page/aat/300123582" },
  { id: "half-figure", label: "half-figure", labelIt: "mezza figura", getty: "http://vocab.getty.edu/page/aat/300047469" },
  { id: "mosaic", label: "mosaic", labelIt: "mosaico", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/184", getty: "http://vocab.getty.edu/page/aat/300015342" },
  { id: "naiskos", label: "naiskos", labelIt: "naiskos", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/180", getty: "https://vocab.getty.edu/page/aat/300108367" },
  { id: "niche", label: "niche", labelIt: "nicchia", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/7", getty: "http://vocab.getty.edu/page/aat/300002704" },
  { id: "panel", label: "panel", labelIt: "pannello", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/259", getty: "http://vocab.getty.edu/page/aat/300069079" },
  { id: "pillar", label: "pillar", labelIt: "pilastro", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/194", getty: "https://vocab.getty.edu/page/aat/300000953" },
  { id: "plate", label: "plate", labelIt: "lastra", greek: "plate", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/260", getty: "http://vocab.getty.edu/page/aat/300247625" },
  { id: "plinth", label: "plinth", labelIt: "plinto", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/1910", getty: "http://vocab.getty.edu/page/aat/300001749" },
  { id: "relief", label: "relief", labelIt: "rilievo", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/24", getty: "http://vocab.getty.edu/page/aat/300047230" },
  { id: "pieceofrock", label: "rock", labelIt: "frammento roccioso", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/211", getty: "http://vocab.getty.edu/page/aat/300404733" },
  { id: "rowofseats", label: "row of seats", labelIt: "fila di sedili", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/226", getty: "http://vocab.getty.edu/page/aat/300038494" },
  { id: "sarcophagus", label: "sarcophagus", labelIt: "sarcofago", greek: "sarcophagus", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/214", getty: "http://vocab.getty.edu/page/aat/300005947" },
  { id: "sherd", label: "sherd", labelIt: "coccio", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/125", getty: "http://vocab.getty.edu/page/aat/300117132" },
  { id: "stele", label: "stele", labelIt: "stele", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/250", getty: "http://vocab.getty.edu/page/aat/300007023" },
  { id: "strigilhandle", label: "strigil handle", labelIt: "manico di strigile", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/153", getty: "http://vocab.getty.edu/page/aat/300343767" },
  { id: "tablet", label: "tablet", labelIt: "tavoletta", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/245", getty: "http://vocab.getty.edu/page/aat/300028879" },
  { id: "tile", label: "tile", labelIt: "tegola", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/147", getty: "https://vocab.getty.edu/page/aat/300010463" },
  { id: "tomb", label: "tomb", labelIt: "tomba", greek: "tomb", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/230", getty: "http://vocab.getty.edu/page/aat/300005926" },
  { id: "unknownobject", label: "unknown", labelIt: "sconosciuto", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/2" },
  { id: "urn", label: "ashes-urn", labelIt: "urna cineraria", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/78", getty: "http://vocab.getty.edu/page/aat/300129425" },
  { id: "vase", label: "vase", labelIt: "vaso", greek: "vase", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/305", getty: "http://vocab.getty.edu/page/aat/300132254" },
  { id: "wall", label: "wall", labelIt: "muro", eagle: "https://www.eagle-network.eu/voc/objtyp/lod/416", getty: "http://vocab.getty.edu/page/aat/300002469" },
];

export const MATERIALS: VocabTerm[] = [
  { id: "bronze", label: "bronze", labelIt: "bronzo", eagle: "https://www.eagle-network.eu/voc/material/lod/109", getty: "http://vocab.getty.edu/page/aat/300010957" },
  { id: "ceramics", label: "ceramics", labelIt: "ceramica", eagle: "https://www.eagle-network.eu/voc/material/lod/130", getty: "http://vocab.getty.edu/page/aat/300235507" },
  { id: "clay", label: "clay", labelIt: "argilla", eagle: "https://www.eagle-network.eu/voc/material/lod/131", getty: "http://vocab.getty.edu/page/aat/300010439" },
  { id: "lead", label: "lead", labelIt: "piombo", eagle: "https://www.eagle-network.eu/voc/material/lod/108", getty: "http://vocab.getty.edu/page/aat/300011022" },
  { id: "limestone", label: "limestone", labelIt: "calcare", greek: "limestone", eagle: "https://www.eagle-network.eu/voc/material/lod/66", getty: "http://vocab.getty.edu/page/aat/300011286" },
  { id: "marble", label: "marble", labelIt: "marmo", eagle: "https://www.eagle-network.eu/voc/material/lod/48", getty: "http://vocab.getty.edu/page/aat/300011443" },
  { id: "pebbles", label: "pebbles", labelIt: "ciottoli", getty: "http://vocab.getty.edu/page/aat/300011691" },
  { id: "plaster", label: "plaster", labelIt: "intonaco", eagle: "https://www.eagle-network.eu/voc/material/lod/126", getty: "http://vocab.getty.edu/page/aat/300014922" },
  { id: "rock", label: "rock", labelIt: "roccia", eagle: "https://www.eagle-network.eu/voc/material/lod/1", getty: "http://vocab.getty.edu/page/aat/300011692" },
  { id: "sandstone", label: "sandstone", labelIt: "arenaria", eagle: "https://www.eagle-network.eu/voc/material/lod/75", getty: "http://vocab.getty.edu/page/aat/300011376" },
  { id: "stone", label: "stone", labelIt: "pietra", eagle: "https://www.eagle-network.eu/voc/material/lod/2", getty: "http://vocab.getty.edu/page/aat/300011176" },
  { id: "terracotta", label: "terracotta", labelIt: "terracotta", eagle: "https://www.eagle-network.eu/voc/material/lod/130", getty: "http://vocab.getty.edu/page/aat/300010669" },
  { id: "tufa", label: "tufa", labelIt: "tufo", eagle: "https://www.eagle-network.eu/voc/material/lod/30", getty: "http://vocab.getty.edu/page/aat/300011712" },
  { id: "ware", label: "ware", labelIt: "vasellame", greek: "ware", eagle: "https://www.eagle-network.eu/voc/material/lod/130", getty: "http://vocab.getty.edu/page/aat/300244578" },
  { id: "unknownmaterial", label: "unknown", labelIt: "sconosciuto", eagle: "https://www.eagle-network.eu/voc/material/lod/138" },
];

export const EXECUTION_TECHNIQUES: VocabTerm[] = [
  { id: "graffito", label: "graffito", labelIt: "graffito", eagle: "https://www.eagle-network.eu/voc/writing/lod/9", getty: "http://vocab.getty.edu/page/aat/300015613" },
  { id: "pictura", label: "pictura", labelIt: "dipinto", eagle: "https://www.eagle-network.eu/voc/writing/lod/10", getty: "http://vocab.getty.edu/page/aat/300265015" },
  { id: "scalpro", label: "scalpro", labelIt: "inciso a scalpello", eagle: "https://www.eagle-network.eu/voc/writing/lod/1", getty: "http://vocab.getty.edu/page/aat/300053149" },
  { id: "signaculo", label: "signaculo", labelIt: "punzonato", eagle: "https://www.eagle-network.eu/voc/writing/lod/13", getty: "http://vocab.getty.edu/page/aat/300233405" },
  { id: "tessellis", label: "tessellis", labelIt: "a tessere musive", eagle: "https://www.eagle-network.eu/voc/writing/lod/16", getty: "http://vocab.getty.edu/page/aat/300138684" },
  { id: "litteris_alveolatis", label: "litteris_alveolatis", labelIt: "lettere scavate a canaletta", eagle: "https://www.eagle-network.eu/voc/writing/lod/36" },
  { id: "litteris_eminentibus", label: "litteris_eminentibus", labelIt: "lettere a rilievo", eagle: "https://www.eagle-network.eu/voc/writing/lod/7" },
  { id: "litteris_scariphatis", label: "litteris_scariphatis", labelIt: "lettere graffite", eagle: "https://www.eagle-network.eu/voc/writing/lod/9" },
  { id: "litteris_ex_forma", label: "litteris_ex_forma", labelIt: "lettere a stampo", eagle: "https://www.eagle-network.eu/voc/writing/lod/8" },
  { id: "stilo", label: "stilo", labelIt: "a stilo", eagle: "https://www.eagle-network.eu/voc/writing/lod/14" },
];

/** Vocabolario EAGLE "typeins" (Type of Inscription) + "confession" come estensione ILA dichiarata. */
export const INSCRIPTION_TYPES: VocabTerm[] = [
  { id: "acclamation", label: "Acclamation", labelIt: "acclamazione", eagle: "https://www.eagle-network.eu/voc/typeins/lod/73" },
  { id: "account", label: "Account", labelIt: "resoconto", eagle: "https://www.eagle-network.eu/voc/typeins/lod/57" },
  { id: "alphabet", label: "alphabet", labelIt: "alfabeto", eagle: "https://www.eagle-network.eu/voc/typeins/lod/112" },
  { id: "caption", label: "caption", labelIt: "didascalia", eagle: "https://www.eagle-network.eu/voc/typeins/lod/105" },
  { id: "decree", label: "Decree", labelIt: "decreto", eagle: "https://www.eagle-network.eu/voc/typeins/lod/1" },
  { id: "dedication", label: "Dedication", labelIt: "dedica", eagle: "https://www.eagle-network.eu/voc/typeins/lod/79" },
  { id: "defixio", label: "Defixio", labelIt: "defixio", eagle: "https://www.eagle-network.eu/voc/typeins/lod/76" },
  { id: "diagramma", label: "Diagramma", labelIt: "diagramma (editto finanziario)", eagle: "https://www.eagle-network.eu/voc/typeins/lod/406" },
  { id: "epitaph", label: "epitaph", labelIt: "epitaffio", eagle: "https://www.eagle-network.eu/voc/typeins/lod/92" },
  { id: "honorary", label: "Honorary inscription", labelIt: "iscrizione onoraria", eagle: "https://www.eagle-network.eu/voc/typeins/lod/69" },
  { id: "hymn", label: "hymn", labelIt: "inno", eagle: "https://www.eagle-network.eu/voc/typeins/lod/65" },
  { id: "instrumentum", label: "instrumentum", labelIt: "instrumentum", eagle: "https://www.eagle-network.eu/voc/typeins/lod/136" },
  { id: "law", label: "law", labelIt: "legge", eagle: "https://www.eagle-network.eu/voc/typeins/lod/4" },
  { id: "letter", label: "letter", labelIt: "lettera", eagle: "https://www.eagle-network.eu/voc/typeins/lod/402" },
  { id: "list", label: "List", labelIt: "elenco", eagle: "https://www.eagle-network.eu/voc/typeins/lod/108" },
  { id: "name", label: "Name", labelIt: "nome" },
  { id: "officialdocument", label: "official document", labelIt: "documento ufficiale", eagle: "https://www.eagle-network.eu/voc/typeins/lod/1" },
  { id: "price", label: "Price", labelIt: "prezzo" },
  { id: "prostagma", label: "prostagma", labelIt: "prostagma (editto regio)", eagle: "https://www.eagle-network.eu/voc/typeins/lod/1" },
  { id: "report", label: "report", labelIt: "relazione" },
  { id: "sacredlaw", label: "Sacred law", labelIt: "legge sacra", eagle: "https://www.eagle-network.eu/voc/typeins/lod/10" },
  { id: "signature", label: "Artist's signature", labelIt: "firma d'artista", eagle: "https://www.eagle-network.eu/voc/typeins/lod/115" },
  { id: "signpost", label: "Road signpost", labelIt: "segnaletica stradale", eagle: "https://www.eagle-network.eu/voc/typeins/lod/380" },
  { id: "tombprotection", label: "Tomb protection", labelIt: "clausola di tutela funeraria" },
  { id: "unclear", label: "Unclear", labelIt: "non determinato" },
  { id: "will", label: "Will", labelIt: "testamento", eagle: "https://www.eagle-network.eu/voc/typeins/lod/63" },
  { id: "confession", label: "Confession inscription", labelIt: "iscrizione di confessione" }, // estensione ILA — non EAGLE
];

/** Cariche/titoli aulici ellenistici (dorico-cirenaici). Nessuna traduzione italiana forzata:
 *  molti sono termini tecnici oscuri anche per gli specialisti, e l'uso corrente negli
 *  studi classici italiani cita comunque il greco/la traslitterazione, non una glossa. */
export const OFFICES: VocabTerm[] = [
  { id: "diadochoi_somatophylakes", label: "diadochoi somatophylakes", greek: "διάδοχοι σωματοφύλακες" },
  { id: "syggenes", label: "syggenes", greek: "συγγενής" },
  { id: "ton_archisomatophylakon", label: "ton archisomatophylakon", greek: "τῶν ἀρχισωματοφυλάκων" },
  { id: "ton_proton_philon", label: "ton proton philon", greek: "τῶν πρώτων φίλων" },
  { id: "Amphiktyon", label: "Ἀμφικτύων" },
  { id: "aporytiazon", label: "ἀπορυτιάζων" },
  { id: "archechoros", label: "ἀρχέχορος" },
  { id: "archedeatros", label: "ἀρχεδέατρος" },
  { id: "archisomatophylax", label: "ἀρχισωματοφύλαξ" },
  { id: "arkos", label: "ἄρκος" },
  { id: "archon", label: "ἄρχων", greek: "συναρχία" },
  { id: "boule", label: "βουλή", greek: "βωλά" },
  { id: "chrematistes", label: "chrematistes" },
  { id: "damiergos", label: "damiergos", greek: "δαμιεργός" },
  { id: "ephoros", label: "ἔφορος", greek: "ἔφορος" },
  { id: "epilektos", label: "ἐπίλεκτος" },
  { id: "epistolagraphos", label: "ἐπιστολαγράφος" },
  { id: "epitonhenion", label: "ἐπὶ τῶν ἡνιῶν" },
  { id: "eponymouspriest", label: "ἱαρεύς", greek: "ἱαρεύς" },
  { id: "exarchos", label: "ἔξαρχος" },
  { id: "geron", label: "γέρων", greek: "γέρων" },
  { id: "gropheus", label: "γροφεύς", greek: "γροφεύς" },
  { id: "gymnasiarchos", label: "γυμνασιαρχέω", greek: "γυμνασιαρχέω" },
  { id: "hegemonedpandron", label: "ἡγεμών ἐπἰ ἀνήρ" },
  { id: "hegemonepitestherapeias", label: "ἡγεμών ἐπὶ θεραπεία" },
  { id: "Hellanodikas", label: "Ἑλλανοδίκας" },
  { id: "hiaromnamon", label: "ἱαρομνάμων", greek: "ἱαρομνάμων" },
  { id: "hiarothytas", label: "ἱαροθύτας", greek: "ἱαροθύτας" },
  { id: "hypaspistes", label: "ὑπασπίστης" },
  { id: "hyperdikos", label: "ὑπερδικέω" },
  { id: "karyx", label: "κᾶρυξ" },
  { id: "libyarch", label: "λιβυάρχας" },
  { id: "lochagos", label: "λοχαγός", greek: "λοχαγός" },
  { id: "nauarchos", label: "ναύαρχος" },
  { id: "neokoros", label: "νεωκόρος" },
  { id: "nomophylax", label: "νομοφύλαξ", greek: "νομοφύλαξ" },
  { id: "nomothetes", label: "νομοθέτης" },
  { id: "paidonomos", label: "παιδονομέω" },
  { id: "periaktria", label: "περιακτρία" },
  { id: "praepositus", label: "πρεποσιτία" },
  { id: "priest", label: "ἱαρεύς", greek: "ἱαρεύς" },
  { id: "priestess", label: "ἱάρεα", greek: "ἱάρεα" },
  { id: "proros", label: "πρωρός" },
  { id: "proxenos", label: "πρόξενος" },
  { id: "sitonas", label: "σιτώνας" },
  { id: "strategos", label: "στρατηγός", greek: "στρατηγός" },
  { id: "tamias", label: "tamias" },
  { id: "thearos", label: "θεαρός" },
  { id: "thesmothetas", label: "θεσμοθέτας" },
  { id: "timeter", label: "τιμητήρ" },
  { id: "triakatiarchas", label: "τριακατιάρχας" },
  { id: "triakatiarchos", label: "τριακατιαρχέω" },
  { id: "triakatioi", label: "τριακάτιοι" },
  { id: "unknown", label: "unknown" },
];