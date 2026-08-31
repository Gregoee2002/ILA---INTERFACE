import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PleiadesMapProps {
  pleiadesUri?: string;
  cityName?: string;
}

export const PleiadesMap: React.FC<PleiadesMapProps> = ({ pleiadesUri, cityName }) => {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pleiadesUri || !pleiadesUri.includes('pleiades.stoa.org/places/')) {
      setCoords(null);
      return;
    }

    const fetchCoords = async () => {
      setLoading(true);
      setError(null);
      try {
        // e.g., https://pleiades.stoa.org/places/599799
        let apiUrl = pleiadesUri;
        if (!apiUrl.endsWith('/json')) {
          apiUrl += '/json';
        }
        
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Failed to fetch Pleiades data');
        const data = await res.json();

        if (data.reprPoint && data.reprPoint.length === 2) {
          // Pleiades returns [lon, lat]
          setCoords([data.reprPoint[1], data.reprPoint[0]]);
        } else {
          setError('Nessuna coordinata disponibile in Pleiades.');
        }
      } catch (err: any) {
        console.error(err);
        setError('Errore caricamento coordinate.');
      } finally {
        setLoading(false);
      }
    };

    fetchCoords();
  }, [pleiadesUri]);

  if (!pleiadesUri) return null;

  return (
    <div className="w-full flex flex-col gap-1.5 mt-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
        Mappa (Pleiades)
      </div>
      
      {loading && (
        <div role="status" className="w-full h-48 bg-border/20 animate-pulse flex items-center justify-center text-xs text-muted">
          Caricamento mappa in corso...
        </div>
      )}
      
      {error && (
        <div role="alert" className="w-full p-4 border border-red-900/30 bg-red-900/10 text-red-700 text-xs text-center">
          {error}
        </div>
      )}

      {coords && !loading && !error && (
        <div className="w-full h-40 border border-border bg-parchment relative z-0">
          <MapContainer center={coords} zoom={7} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }} aria-label="Mappa Pleiades della località">

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={coords}>
              <Popup>
                <strong>{cityName || "Città Antica"}</strong>
                <br />
                <a href={pleiadesUri} target="_blank" rel="noopener noreferrer" className="text-accent underline text-xs">
                  Vedi su Pleiades
                </a>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      )}
    </div>
  );
};
