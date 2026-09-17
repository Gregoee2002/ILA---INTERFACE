import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
// Senza questi due, i "bollini" cluster mostrano solo il numero senza
// alcuno sfondo: il CSS di leaflet.markercluster non viene incluso
// automaticamente da react-leaflet-cluster.
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import { formatIlaLabel } from '../lib/xmlUtils';
import { formatSecoliAttestazione } from '../lib/chronology';
import L from 'leaflet';
import { Search, X, ChevronDown, MapPinned, Locate } from 'lucide-react';
import { REGION_COLORS, DENSITY_SCALE, FILTER_MATCH_COLOR, GRAYED_OUT_FILL_COLOR } from '../lib/mapPalette';

// Fix for default marker icon in react-leaflet just in case
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  monumenti: Monumento[];
  onSelectMonumento?: (id: string) => void;
}

interface Site {
  id: string; // pleiadesUri
  lat: number;
  lng: number;
  monumenti: Monumento[];
  activeCount: number;
  totalCount: number;
  color: string;
}

function getRegionColor(regione?: string) {
  if (!regione) return REGION_COLORS.fallback;
  const r = regione.toLowerCase();
  if (r.includes('asia minor')) return REGION_COLORS.asiaMinor;
  if (r.includes('graecia')) return REGION_COLORS.graecia;
  if (r.includes('dacia')) return REGION_COLORS.dacia;
  if (r.includes('italia')) return REGION_COLORS.italia;
  return REGION_COLORS.fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = parseInt(hex.slice(1), 16);
  return [(h >> 16) & 0xff, (h >> 8) & 0xff, h & 0xff];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = 60 * (((g - b) / d) % 6); break;
      case g: h = 60 * ((b - r) / d + 2); break;
      default: h = 60 * ((r - g) / d + 4);
    }
  }
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function lerpColorHsl(a: string, b: string, t: number) {
  const [ah, as, al] = rgbToHsl(...hexToRgb(a));
  const [bh, bs, bl] = rgbToHsl(...hexToRgb(b));
  const h = ah + (bh - ah) * t;
  const s = as + (bs - as) * t;
  const l = al + (bl - al) * t;
  return rgbToHex(...hslToRgb(h, s, l));
}

function getDensityColor(count: number, maxCount: number) {
  if (maxCount <= 1) return DENSITY_SCALE[0];
  // Scala su radice quadrata: i pochi siti molto densi non "schiacciano"
  // la scala, così anche le densità intermedie restano leggibili.
  const t = Math.sqrt(Math.min(1, (count - 1) / (maxCount - 1)));
  const scaled = t * (DENSITY_SCALE.length - 1);
  const i = Math.min(DENSITY_SCALE.length - 2, Math.floor(scaled));
  return lerpColorHsl(DENSITY_SCALE[i], DENSITY_SCALE[i + 1], scaled - i);
}

const WORLD_BOUNDS = L.latLngBounds([-85, -180], [85, 180]);

const FitToSites: React.FC<{ sites: Site[]; ready: boolean }> = ({ sites, ready }) => {
  const map = useMap();
  // Le coordinate di alcuni siti arrivano in modo asincrono (fetch a
  // Pleiades): rifittiamo la vista una sola volta, quando tutte le fetch
  // in corso si sono risolte, invece che a ogni singolo sito che arriva
  // (altrimenti la mappa "va per la tangente" saltando di vista più volte).
  const fittedCount = useRef(0);
  // Se l'utente ha già pannato/zoomato manualmente, non gli rubiamo più la
  // vista quando un cambio di filtro rivela nuovi siti.
  const userInteracted = useRef(false);
  const suppressNext = useRef(false);

  useEffect(() => {
    const onInteraction = () => {
      if (suppressNext.current) return; // movimento programmatico (fitBounds/setView), non dell'utente
      userInteracted.current = true;
    };
    map.on('dragstart', onInteraction);
    map.on('zoomstart', onInteraction);
    return () => {
      map.off('dragstart', onInteraction);
      map.off('zoomstart', onInteraction);
    };
  }, [map]);

  useEffect(() => {
    if (!ready) return;
    if (sites.length === 0 || sites.length <= fittedCount.current) return;
    if (userInteracted.current) {
      fittedCount.current = sites.length;
      return;
    }
    suppressNext.current = true;
    if (sites.length === 1) {
      // Un solo punto: fitBounds su un'area a zero non zooma a sufficienza
      map.setView([sites[0].lat, sites[0].lng], 8);
    } else {
      const bounds = L.latLngBounds(sites.map(s => [s.lat, s.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 7 });
    }
    fittedCount.current = sites.length;
    setTimeout(() => { suppressNext.current = false; }, 0);
  }, [ready, sites, map]);

  return null;
};

const MapRefSetter: React.FC<{ mapRef: React.MutableRefObject<L.Map | null> }> = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
};

// Icona dei cluster: quando c'è un filtro epiteto/divinità attivo, i
// cluster che contengono almeno un'iscrizione corrispondente ricevono una
// colorazione dedicata (non la solita scala di densità grigio→teal), così
// restano riconoscibili a qualunque livello di zoom, anche quando il
// cluster mescola siti filtrati e non filtrati.
function makeClusterIconCreateFunction(hasActiveFilter: boolean) {
  return (cluster: any) => {
    const children = cluster.getAllChildMarkers();
    const count = children.length;
    const activeCount = hasActiveFilter ? children.filter((c: any) => c.options?.matchesActive).length : 0;
    const isHighlighted = hasActiveFilter && activeCount > 0;

    let sizeClass = 'marker-cluster-small';
    if (count >= 100) sizeClass = 'marker-cluster-large';
    else if (count >= 10) sizeClass = 'marker-cluster-medium';

    const label = isHighlighted ? `${activeCount}/${count}` : String(count);
    return L.divIcon({
      html: `<div><span>${label}</span></div>`,
      className: `marker-cluster ${isHighlighted ? 'marker-cluster-highlight' : sizeClass}`,
      iconSize: L.point(40, 40),
    });
  };
}

// Dropdown a ricerca per epiteti/divinità: sostituisce il <select multiple>
// nativo (poco leggibile e incoerente con lo stile del resto del sito).
// Selezione singola: cliccare una voce la seleziona e apre il drilldown
// delle iscrizioni pertinenti; ricliccarla la deseleziona.
const EntityDropdown: React.FC<{
  label: string;
  placeholder: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  counts: Record<string, number>;
}> = ({ label, placeholder, options, selected, onSelect, counts }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex justify-between items-end mb-2">
        <h3 className="field-label">{label}</h3>
        {selected && (
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className="text-[9px] text-accent hover:underline uppercase"
          >
            Reset
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 bg-[var(--card)] dark:bg-black/25 border rounded-xl pl-3 pr-2.5 py-2.5 text-left transition-all duration-200 shadow-inner",
          selected ? "border-accent/60 ring-1 ring-accent/25" : "border-[var(--border)]/70 dark:border-white/10 hover:bg-[var(--sidebar)] dark:hover:bg-black/40"
        )}
      >
        <span className={cn("text-sm font-serif truncate", selected ? "text-accent font-semibold" : "text-ink/60 italic")}>
          {selected || placeholder}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-[1100] mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_12px_32px_-8px_rgba(var(--shadow-color),0.35)] overflow-hidden">
          <div className="relative p-2 border-b border-border/50">
            <Search className="absolute left-4.5 top-4.5 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cerca…"
              className="w-full bg-[var(--sidebar)] dark:bg-black/30 border border-transparent focus:border-accent/40 rounded-lg pl-7 pr-6 py-1.5 text-xs font-sans text-ink outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-4 top-4 text-muted hover:text-accent">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted italic text-center">Nessun risultato</div>
            )}
            {filtered.map(opt => {
              const isSel = selected === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onSelect(isSel ? null : opt); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left font-serif text-sm transition-colors",
                    isSel ? "bg-accent/15 text-accent font-semibold" : "text-ink/90 hover:bg-accent/8 hover:text-accent"
                  )}
                >
                  <span className="truncate">{opt}</span>
                  <span className="shrink-0 text-[9px] font-sans text-muted/70 tabular-nums">{counts[opt] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Drilldown: elenco delle iscrizioni pertinenti all'epiteto/divinità selezionato.
// Cliccare una voce NON apre la scheda dell'iscrizione: porta la mappa
// esattamente nel punto (sito) in cui quell'iscrizione si trova, aprendo
// il cluster se necessario. Da lì l'utente apre il cerchio e clicca
// l'iscrizione per vederne la scheda.
const InscriptionDrilldown: React.FC<{
  label: string;
  monumenti: Monumento[];
  resolvable: (m: Monumento) => boolean;
  onGoTo: (m: Monumento) => void;
}> = ({ label, monumenti, resolvable, onGoTo }) => {
  if (monumenti.length === 0) return null;
  return (
    <div className="mt-2 rounded-xl border border-[var(--border)]/70 bg-[var(--sidebar)]/60 dark:bg-black/20 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-1.5">
        <MapPinned className="h-3 w-3 text-accent shrink-0" />
        <span className="text-[10px] uppercase tracking-widest font-sans font-bold text-ink/70">
          Iscrizioni con «{label}» ({monumenti.length})
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-border/30">
        {monumenti.map(m => {
          const ok = resolvable(m);
          return (
            <button
              key={m.id}
              type="button"
              disabled={!ok}
              onClick={() => ok && onGoTo(m)}
              title={ok ? 'Vai al punto sulla mappa' : 'Coordinate non disponibili'}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                ok ? "hover:bg-accent/10 cursor-pointer group" : "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="shrink-0 text-[9px] font-mono font-bold text-muted/60 w-12">
                ILA-{m.id.toString().padStart(3, '0')}
              </span>
              <span className="flex-1 min-w-0 text-xs font-serif text-ink group-hover:text-accent truncate">
                {m.titolo || m.citta || 'Senza titolo'}
              </span>
              {ok && <Locate className="h-3 w-3 text-accent/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const MapView: React.FC<MapViewProps> = ({ monumenti, onSelectMonumento }) => {
  const [coordsCache, setCoordsCache] = useState<Record<string, [number, number]>>({});
  const fetchedUris = useRef(new Set<string>());
  // Conta le fetch a Pleiades in corso: la mappa si "adatta" alla vista solo
  // quando arriva a 0, per evitare rifit multipli man mano che le
  // coordinate arrivano una alla volta.
  const [pendingFetches, setPendingFetches] = useState(0);

  const [selectedEpiteti, setSelectedEpiteti] = useState<string[]>([]);
  const [selectedDivinita, setSelectedDivinita] = useState<string[]>([]);
  const [selectedRegioni, setSelectedRegioni] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[number, number]>([-500, 500]);

  // Sito su cui è stato appena richiesto un fly-to dal drilldown: riceve un
  // alone pulsante temporaneo perché sia riconoscibile a colpo d'occhio.
  const [flashSiteId, setFlashSiteId] = useState<string | null>(null);

  // Tipizzato "any": leaflet.markercluster non fornisce dichiarazioni TS e
  // @types/leaflet non espone L.MarkerClusterGroup.
  const clusterGroupRef = useRef<any>(null);
  const markerRefs = useRef<Record<string, L.CircleMarker>>({});
  const mapRef = useRef<L.Map | null>(null);

  // Extract unique filter options
  const allRegioni = useMemo(() => Array.from(new Set(monumenti.map(m => m.regione).filter(Boolean))).sort(), [monumenti]);
  const allEpiteti = useMemo(() => Array.from(new Set(monumenti.flatMap(m => m.epiteti || []))).sort(), [monumenti]);
  const allDivinita = useMemo(() => Array.from(new Set(monumenti.flatMap(m => m.divinita || []))).sort(), [monumenti]);
  const epitetiCounts = useMemo(() => {
    const c: Record<string, number> = {};
    monumenti.forEach(m => (m.epiteti || []).forEach(e => { c[e] = (c[e] || 0) + 1; }));
    return c;
  }, [monumenti]);
  const divinitaCounts = useMemo(() => {
    const c: Record<string, number> = {};
    monumenti.forEach(m => (m.divinita || []).forEach(d => { c[d] = (c[d] || 0) + 1; }));
    return c;
  }, [monumenti]);

  const selectedEpiteto = selectedEpiteti[0] ?? null;
  const selectedDivinity = selectedDivinita[0] ?? null;
  const monumentiPerEpiteto = useMemo(
    () => selectedEpiteto ? monumenti.filter(m => m.epiteti?.includes(selectedEpiteto)) : [],
    [monumenti, selectedEpiteto]
  );
  const monumentiPerDivinita = useMemo(
    () => selectedDivinity ? monumenti.filter(m => m.divinita?.includes(selectedDivinity)) : [],
    [monumenti, selectedDivinity]
  );

  // Porta la mappa esattamente sul sito dell'iscrizione scelta nel
  // drilldown (aprendo il cluster se necessario) senza mai saltare alla
  // scheda: l'apertura dell'iscrizione resta un gesto separato dell'utente.
  const flyToMonumento = (m: Monumento) => {
    const uri = m.place_ref_ancient;
    if (!uri) return;
    const marker = markerRefs.current[uri];
    const group = clusterGroupRef.current;
    if (!marker || !group) return;
    group.zoomToShowLayer(marker, () => {
      marker.openPopup();
      setFlashSiteId(uri);
      window.setTimeout(() => setFlashSiteId(cur => (cur === uri ? null : cur)), 2600);
    });
  };

  useEffect(() => {
    const uris = Array.from(new Set(monumenti.map(m => m.place_ref_ancient).filter(Boolean))) as string[];
    const toFetch = uris.filter(uri => !fetchedUris.current.has(uri));

    if (toFetch.length === 0) return;

    toFetch.forEach(uri => fetchedUris.current.add(uri));
    setPendingFetches(prev => prev + 1);

    const fetchAll = async () => {
      const newCache: Record<string, [number, number]> = {};
      await Promise.all(toFetch.map(async (uri) => {
        try {
          let apiUrl = uri.endsWith('/json') ? uri : uri + '/json';
          const res = await fetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.reprPoint && data.reprPoint.length === 2) {
              newCache[uri] = [data.reprPoint[1], data.reprPoint[0]]; // [lat, lng]
            }
          }
        } catch (e) {
          console.warn('Failed to fetch coords for', uri);
        }
      }));

      if (Object.keys(newCache).length > 0) {
        setCoordsCache(prev => ({ ...prev, ...newCache }));
      }
      setPendingFetches(prev => prev - 1);
    };

    fetchAll();
  }, [monumenti]);

  const isMonumentoActive = (m: Monumento) => {
    if (selectedRegioni.length > 0 && (!m.regione || !selectedRegioni.includes(m.regione))) return false;
    
    if (selectedEpiteti.length > 0) {
      if (!m.epiteti || !m.epiteti.some(e => selectedEpiteti.includes(e))) return false;
    }

    if (selectedDivinita.length > 0) {
      if (!m.divinita || !m.divinita.some(d => selectedDivinita.includes(d))) return false;
    }

    const start = m.data_inizio !== undefined ? m.data_inizio : undefined;
    const end = m.data_fine !== undefined ? m.data_fine : undefined;
    
    if (start !== undefined && end !== undefined) {
      if (end < dateRange[0] || start > dateRange[1]) return false;
    } else if (start !== undefined) {
      if (start < dateRange[0] || start > dateRange[1]) return false;
    } else if (end !== undefined) {
      if (end < dateRange[0] || end > dateRange[1]) return false;
    }
    
    return true;
  };

  const sites = useMemo(() => {
    const siteMap = new Map<string, Site>();
    monumenti.forEach(m => {
      const uri = m.place_ref_ancient;
      if (!uri) return; // skip missing coordinates
      
      const coords = coordsCache[uri];
      if (!coords) return; // still loading or not found
      
      const active = isMonumentoActive(m);
      
      if (!siteMap.has(uri)) {
        siteMap.set(uri, {
          id: uri,
          lat: coords[0],
          lng: coords[1],
          monumenti: [],
          activeCount: 0,
          totalCount: 0,
          color: getRegionColor(m.regione),
        });
      }
      const site = siteMap.get(uri)!;
      site.monumenti.push(m);
      site.totalCount++;
      if (active) site.activeCount++;
    });
    return Array.from(siteMap.values());
  }, [monumenti, coordsCache, selectedRegioni, selectedEpiteti, selectedDivinita, dateRange]);

  const maxSiteCount = useMemo(() => sites.reduce((max, s) => Math.max(max, s.totalCount), 1), [sites]);
  // Soglia oltre la quale un sito è considerato "denso" e riceve il bagliore in legenda/mappa
  const hotThreshold = Math.max(3, Math.ceil(maxSiteCount * 0.6));
  // Con un filtro attivo la densità totale del sito non conta più: un sito con
  // una sola attestazione filtrata deve restare visibile quanto uno con molte,
  // altrimenti finisce col colore più chiaro della scala e sparisce sulle tile.
  const hasActiveFilter = selectedEpiteti.length > 0 || selectedDivinita.length > 0 || selectedRegioni.length > 0 || dateRange[0] !== -500 || dateRange[1] !== 500;

  return (
    <div className="flex h-full w-full bg-parchment overflow-hidden">
      {/* Sidebar */}
      <div className="w-full max-w-[20rem] md:w-80 shrink-0 m-2 md:m-4 md:mr-3 p-4 md:p-5 flex flex-col gap-6 overflow-y-auto glass-panel rounded-2xl">
        <div>
          <h2 className="font-serif text-xl text-ink font-bold pb-3 border-b border-border/60">Filtri Mappa</h2>
        </div>
        
        <div>
          <h3 className="field-label mb-3">Regione</h3>
          <div className="flex flex-col gap-2">
            {allRegioni.map(r => (
              <label key={r} className="flex items-center gap-2 text-sm text-ink/80 cursor-pointer hover:text-ink">
                <input 
                  type="checkbox" 
                  className="accent-accent"
                  checked={selectedRegioni.includes(r)} 
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRegioni(prev => [...prev, r]);
                    else setSelectedRegioni(prev => prev.filter(x => x !== r));
                  }} 
                />
                {r}
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <EntityDropdown
            label="Epiteti"
            placeholder="Seleziona un epiteto…"
            options={allEpiteti}
            selected={selectedEpiteto}
            counts={epitetiCounts}
            onSelect={(v) => setSelectedEpiteti(v ? [v] : [])}
          />
          <InscriptionDrilldown
            label={selectedEpiteto || ''}
            monumenti={monumentiPerEpiteto}
            resolvable={(m) => !!(m.place_ref_ancient && coordsCache[m.place_ref_ancient])}
            onGoTo={flyToMonumento}
          />
        </div>

        <div>
          <EntityDropdown
            label="Divinità"
            placeholder="Seleziona una divinità…"
            options={allDivinita}
            selected={selectedDivinity}
            counts={divinitaCounts}
            onSelect={(v) => setSelectedDivinita(v ? [v] : [])}
          />
          <InscriptionDrilldown
            label={selectedDivinity || ''}
            monumenti={monumentiPerDivinita}
            resolvable={(m) => !!(m.place_ref_ancient && coordsCache[m.place_ref_ancient])}
            onGoTo={flyToMonumento}
          />
        </div>

        <div>
          <h3 className="field-label mb-3">
            Cronologia ({dateRange[0]} a {dateRange[1]})
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted uppercase">Dal: {dateRange[0]}</label>
              <input 
                type="range" 
                min="-500" 
                max="500" 
                step="50" 
                className="w-full accent-accent"
                value={dateRange[0]} 
                onChange={e => {
                  const val = Number(e.target.value);
                  if (val <= dateRange[1]) setDateRange([val, dateRange[1]]);
                }} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted uppercase">Al: {dateRange[1]}</label>
              <input 
                type="range" 
                min="-500" 
                max="500" 
                step="50" 
                className="w-full accent-accent"
                value={dateRange[1]} 
                onChange={e => {
                  const val = Number(e.target.value);
                  if (val >= dateRange[0]) setDateRange([dateRange[0], val]);
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0 m-4 ml-0 rounded-2xl overflow-hidden border border-[var(--border)] shadow-[0_12px_32px_-12px_rgba(var(--shadow-color),0.16)]">
        <MapContainer
          center={[38.5, 27.0]} // fallback: Egeo/Asia Minor, area centrale del corpus
          zoom={5}
          scrollWheelZoom={true}
          minZoom={2}
          maxBounds={WORLD_BOUNDS}
          maxBoundsViscosity={0.8}
          style={{ width: '100%', height: '100%' }}
          aria-label={`Mappa delle attestazioni del corpus — ${sites.length} località`}
        >
          <FitToSites sites={sites} ready={pendingFetches === 0} />
          <MapRefSetter mapRef={mapRef} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            noWrap
          />
          <MarkerClusterGroup
            ref={clusterGroupRef}
            chunkedLoading
            maxClusterRadius={50}
            iconCreateFunction={makeClusterIconCreateFunction(hasActiveFilter)}
          >
            {sites.map(site => {
              const isGrayedOut = site.activeCount === 0;
              // Con filtro attivo: colore di evidenziazione fisso invece della
              // scala di densità (che con poche/una attestazione filtrata
              // risulterebbe troppo chiara) e raggio minimo maggiorato, così
              // ogni corrispondenza resta visibile senza dover zoomare.
              // Senza filtro: riempimento = densità totale (grigio → accento
              // teal), bordo = regione.
              const fillColor = isGrayedOut
                ? GRAYED_OUT_FILL_COLOR
                : hasActiveFilter
                  ? FILTER_MATCH_COLOR
                  : getDensityColor(site.totalCount, maxSiteCount);
              const strokeColor = isGrayedOut ? REGION_COLORS.fallback : site.color;
              const isHighlighted = !isGrayedOut && hasActiveFilter;
              const isHot = !isGrayedOut && !hasActiveFilter && site.totalCount >= hotThreshold;
              const radius = isHighlighted
                ? Math.min(22, Math.max(10, 10 + (site.activeCount - 1) * 1.5))
                : Math.min(22, Math.max(7, 7 + (site.totalCount - 1) * 1.5));
              const siteEpiteti = Array.from(new Set(site.monumenti.flatMap(m => m.epiteti || [])));
              const isFlashing = flashSiteId === site.id;

              // Object separato (non literal inline) per poter aggiungere
              // "matchesActive", un flag custom letto da iconCreateFunction
              // per colorare i cluster che contengono siti filtrati — non è
              // una vera opzione di stile Leaflet, ma sopravvive su
              // layer.options come qualunque altra chiave passata qui.
              const pathOptions: L.PathOptions & { matchesActive?: boolean } = {
                color: strokeColor,
                fillColor: fillColor,
                fillOpacity: isGrayedOut ? 0.35 : 0.85,
                weight: (isHot || isHighlighted) ? 3 : 2,
                // Alone chiaro sempre presente: rende ogni pallino leggibile
                // qualunque sia il colore sottostante della tile di base.
                className: cn('site-marker', (isHot || isHighlighted) && 'site-marker-hot', isFlashing && 'site-marker-flash'),
                matchesActive: isHighlighted,
              };

              return (
                <CircleMarker
                  key={site.id}
                  ref={(el) => { if (el) markerRefs.current[site.id] = el; }}
                  center={[site.lat, site.lng]}
                  radius={radius}
                  pathOptions={pathOptions}
                >
                  {siteEpiteti.length > 0 && (
                    // Tooltip al passaggio del mouse: prima gli epiteti erano
                    // visibili solo dentro il Popup (richiede un click) e a
                    // 9px su sfondo accent/10, poco leggibili. Qui restano a
                    // colpo d'occhio, con contrasto pieno.
                    <Tooltip direction="top" offset={[0, -radius]} opacity={0.97} className="site-epiteti-tooltip">
                      <div className="flex flex-wrap gap-1 max-w-[14rem] font-sans font-semibold uppercase tracking-wide text-[10px]">
                        {siteEpiteti.map(e => (
                          <span key={e} className="bg-accent text-white px-1.5 py-0.5 rounded-full">{e}</span>
                        ))}
                      </div>
                    </Tooltip>
                  )}
                  <Popup className="custom-popup">
                    <div className="max-h-64 overflow-y-auto pr-3 flex flex-col gap-4 w-64 custom-scrollbar">
                      <div className="sticky top-0 bg-[var(--card)] pb-2 border-b border-border/30 z-10">
                        <span className="text-[10px] uppercase font-bold text-muted">
                          {site.activeCount} / {site.totalCount} iscrizioni visibili
                        </span>
                      </div>
                      
                      {site.monumenti.map(m => {
                        const active = isMonumentoActive(m);
                        return (
                          <div key={m.id} className={cn("flex flex-col gap-1.5", !active && "opacity-40 grayscale")}>
                            <h4 className="font-bold text-sm leading-tight font-serif">
                              <button
                                type="button"
                                className="text-left text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-sm"
                                onClick={() => onSelectMonumento?.(m.id.toString())}
                              >
                                [{formatIlaLabel(m.id)}] {m.titolo || 'Senza titolo'}
                              </button>
                            </h4>
                            <div className="text-xs text-muted flex justify-between items-start">
                              <span>{m.citta} {m.luogo_moderno ? `(${m.luogo_moderno})` : ''}</span>
                              <a href={site.id} target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent hover:underline uppercase shrink-0">
                                Pleiades
                              </a>
                            </div>
                            {m.epiteti && m.epiteti.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {m.epiteti.map(e => (
                                  <span key={e} className="bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-sans font-semibold">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-ink/80 mt-1">
                              <span className="font-semibold text-muted text-[10px] uppercase mr-1">Data:</span>
                              {m.data || 'Ignota'}
                            </div>
                            <div className="text-xs text-ink/80">
                              <span className="font-semibold text-muted text-[10px] uppercase mr-1">Secolo:</span>
                              {formatSecoliAttestazione(m.data_inizio, m.data_fine)}
                            </div>
                            <div className="text-xs text-ink/80 italic">
                              <span className="font-semibold text-muted text-[10px] uppercase mr-1 not-italic">Tipo:</span>
                              {m.tipo || 'Ignoto'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
        
        {/* Legend */}
        <div className="absolute bottom-6 right-6 glass-panel p-4 z-[1000] rounded-2xl text-xs pointer-events-none w-48">
          {hasActiveFilter ? (
            <>
              <h4 className="field-label mb-3">Filtro attivo</h4>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3.5 h-3.5 rounded-full shrink-0 border-2" style={{ backgroundColor: FILTER_MATCH_COLOR, borderColor: FILTER_MATCH_COLOR }}></span>
                <span className="text-[11px] text-ink/80">Sito con corrispondenze</span>
              </div>
            </>
          ) : (
            <>
              <h4 className="field-label mb-3">Densità iscrizioni</h4>
              <div
                className="h-2.5 w-full rounded-full mb-1.5"
                style={{ background: `linear-gradient(to right, ${DENSITY_SCALE.join(', ')})` }}
              ></div>
              <div className="flex justify-between text-[9px] text-muted uppercase tracking-wide mb-4">
                <span>Poche</span>
                <span>Molte</span>
              </div>
            </>
          )}

          <h4 className="field-label mb-3">Regione (bordo)</h4>
          <div className="flex flex-col gap-2 font-serif text-ink/90">
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0 border-2" style={{ borderColor: REGION_COLORS.asiaMinor }}></span> Asia Minor</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0 border-2" style={{ borderColor: REGION_COLORS.graecia }}></span> Graecia</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0 border-2" style={{ borderColor: REGION_COLORS.dacia }}></span> Dacia</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0 border-2" style={{ borderColor: REGION_COLORS.italia }}></span> Italia</div>
            <div className="flex items-center gap-3 pt-2 mt-1 border-t border-border/50"><span className="w-3 h-3 rounded-full shrink-0 border-2" style={{ borderColor: REGION_COLORS.fallback }}></span> Filtrato / Altro</div>
          </div>
        </div>
      </div>
    </div>
  );
};