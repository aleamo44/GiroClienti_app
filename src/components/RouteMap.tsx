import { ExternalLink } from 'lucide-react';
import { OptimizedRoute } from '../lib/types';

interface RouteMapProps {
  route: OptimizedRoute | null;
  startCoords: { lat: number; lon: number };
}

export default function RouteMap({ route, startCoords }: RouteMapProps) {
  const getGoogleMapsUrl = () => {
    if (!route || route.stops.length === 0) {
      return null;
    }

    const waypoints = route.stops
      .map((s) => `${s.client.latitude},${s.client.longitude}`)
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${startCoords.lat},${startCoords.lon}&destination=${startCoords.lat},${startCoords.lon}&waypoints=${waypoints}`;
  };

  if (!route || route.stops.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center justify-center h-[500px]">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Nessun percorso generato</p>
          <p className="text-sm text-gray-400">
            Aggiungi clienti e genera un percorso per visualizzare la mappa
          </p>
        </div>
      </div>
    );
  }

  const mapsUrl = getGoogleMapsUrl();

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="h-[500px] bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h3 className="font-semibold text-gray-800 mb-2">Percorso Ottimizzato</h3>
          <p className="text-sm text-gray-600 mb-4">
            Visualizza il percorso con {route.stops.length} tappe su Google Maps
          </p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-lg font-bold text-blue-600 mb-1">
              {route.totalDistance} km
            </p>
            <p className="text-sm text-gray-600">
              Distanza totale stimata
            </p>
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ExternalLink size={18} />
              Apri su Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
