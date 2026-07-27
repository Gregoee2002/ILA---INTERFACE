import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import L from 'leaflet';

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
  if (!regione) return '#8a8778'; // stone gray
  const r = regione.toLowerCase();
  if (r.includes('asia minor')) return '#1F8377'; // accent teal — regione di culto principale di Men
  if (r.includes('graecia')) return '#5B7A8C'; // blu-grigio polvere
  if (r.includes('dacia')) return '#B5651D'; // terracotta
  if (r.includes('italia')) return '#7A8F5E'; // salvia
  return '#8a8778'; // stone gray
}

const FitToSites: React.FC<{ sites: Site[] }> = ({ sites }) => {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (hasFitted.current || sites.length === 0) return;
    if (sites.length === 1) {
      // Un solo punto: fitBounds su un'area a zero non zooma a sufficienza
      map.setView([sites[0].lat, sites[0].lng], 8);
    } else {
      const bounds = L.latLngBounds(sites.map(s => [s.lat, s.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 7 });
    }
    hasFitted.current = true;
  }, [sites, map]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ monumenti, onSelectMonumento }) => {
  const [coordsCache, setCoordsCache] = useState<Record<string, [number, number]>>({});
  const fetchedUris = useRef(new Set<string>());

  const [selectedEpiteti, setSelectedEpiteti] = useState<string[]>([]);
  const [selectedRegioni, setSelectedRegioni] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[number, number]>([-500, 500]);

  // Extract unique filter options
  const allRegioni = useMemo(() => Array.from(new Set(monumenti.map(m => m.regione).filter(Boolean))).sort(), [monumenti]);
  const allEpiteti = useMemo(() => Array.from(new Set(monumenti.flatMap(m => m.epiteti || []))).sort(), [monumenti]);

  useEffect(() => {
    const uris = Array.from(new Set(monumenti.map(m => m.place_ref_ancient).filter(Boolean))) as string[];
    const toFetch = uris.filter(uri => !fetchedUris.current.has(uri));
    
    if (toFetch.length === 0) return;
    
    toFetch.forEach(uri => fetchedUris.current.add(uri));
    
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
    };
    
    fetchAll();
  }, [monumenti]);

  const isMonumentoActive = (m: Monumento) => {
    if (selectedRegioni.length > 0 && (!m.regione || !selectedRegioni.includes(m.regione))) return false;
    
    if (selectedEpiteti.length > 0) {
      if (!m.epiteti || !m.epiteti.some(e => selectedEpiteti.includes(e))) return false;
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
  }, [monumenti, coordsCache, selectedRegioni, selectedEpiteti, dateRange]);

  return (
    <div className="flex h-full w-full bg-parchment overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 shrink-0 m-4 mr-3 p-5 flex flex-col gap-6 overflow-y-auto glass-panel rounded-2xl">
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
          <div className="flex justify-between items-end mb-2">
            <h3 className="field-label">Epiteti</h3>
            {selectedEpiteti.length > 0 && (
              <button 
                onClick={() => setSelectedEpiteti([])}
                className="text-[9px] text-accent hover:underline uppercase"
              >
                Reset
              </button>
            )}
          </div>
          <select 
            multiple 
            className="w-full h-40 text-xs font-sans border border-border/60 bg-[var(--card)]/60 dark:bg-black/25 backdrop-blur-md p-3 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent custom-scrollbar rounded-xl transition-all shadow-inner"
            value={selectedEpiteti} 
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
              setSelectedEpiteti(opts);
            }}
          >
            {allEpiteti.map(ep => (
              <option 
                key={ep} 
                value={ep} 
                className="py-1 px-2 font-serif text-sm checked:bg-accent/15 checked:text-accent rounded-md cursor-pointer hover:bg-accent/5 dark:text-ink/90 dark:checked:bg-accent/30 dark:checked:text-white"
              >
                {ep}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-muted mt-1.5 italic">Tieni premuto Ctrl/Cmd per selezione multipla</p>
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
          style={{ width: '100%', height: '100%' }}
        >
          <FitToSites sites={sites} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {sites.map(site => {
              const isGrayedOut = site.activeCount === 0;
              const markerColor = isGrayedOut ? '#9ca3af' : site.color;
              const radius = Math.min(20, Math.max(6, 6 + (site.totalCount - 1) * 1.5));
              
              return (
                <CircleMarker
                  key={site.id}
                  center={[site.lat, site.lng]}
                  radius={radius}
                  pathOptions={{ 
                    color: markerColor, 
                    fillColor: markerColor, 
                    fillOpacity: isGrayedOut ? 0.3 : 0.7,
                    weight: 2
                  }}
                >
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
                            <h4 
                              className="font-bold text-sm leading-tight text-ink cursor-pointer hover:text-accent font-serif" 
                              onClick={() => onSelectMonumento?.(m.id.toString())}
                            >
                              [{m.corpus ? `${m.corpus}-${m.numero}` : m.id}] {m.titolo || 'Senza titolo'}
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
                                  <span key={e} className="bg-accent/10 text-accent text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-sans font-semibold border border-accent/15">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-ink/80 mt-1">
                              <span className="font-semibold text-muted text-[10px] uppercase mr-1">Data:</span>
                              {m.data || 'Ignota'}
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
        <div className="absolute bottom-6 right-6 glass-panel p-4 z-[1000] rounded-2xl text-xs pointer-events-none">
          <h4 className="field-label mb-3">Legenda Regioni</h4>
          <div className="flex flex-col gap-2 font-serif text-ink/90">
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: '#1F8377' }}></span> Asia Minor</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: '#5B7A8C' }}></span> Graecia</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: '#B5651D' }}></span> Dacia</div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: '#7A8F5E' }}></span> Italia</div>
            <div className="flex items-center gap-3 pt-2 mt-1 border-t border-border/50"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: '#8a8778' }}></span> Filtrato / Altro</div>
          </div>
        </div>
      </div>
    </div>
  );
};