import { useState, useEffect } from 'react';
import { Settings, MapPin, Route as RouteIcon, Home } from 'lucide-react';
import ClientList from './components/ClientList';
import RouteMap from './components/RouteMap';
import RouteStops from './components/RouteStops';
import SettingsModal from './components/SettingsModal';
import ExportOptions from './components/ExportOptions';
import { getClients, getSettings, saveSettings } from './lib/storage';
import { optimizeRoute } from './lib/routeOptimizer';
import { Client, Settings as SettingsType, OptimizedRoute } from './lib/types';

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientsForRoute, setSelectedClientsForRoute] = useState<Client[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
    loadSettings();
  }, []);

  const loadClients = () => {
    const data = getClients();
    setClients(data);
  };

  const loadSettings = () => {
    const data = getSettings();
    setSettings(data);
  };

  const handleGenerateRoute = async () => {
    // Usa selectedClientsForRoute se disponibile, altrimenti tutti i clienti
    const clientsToUse = selectedClientsForRoute.length > 0 ? selectedClientsForRoute : clients;
    const validClients = clientsToUse.filter(
      (c) => c.latitude !== null && c.longitude !== null
    );

    if (validClients.length === 0) {
      alert('Nessun cliente con indirizzo valido');
      return;
    }

    if (!settings || !settings.home_latitude || !settings.home_longitude) {
      alert('Configura prima il punto base nelle impostazioni');
      setIsSettingsOpen(true);
      return;
    }

    setLoading(true);
    const optimizedRoute = await optimizeRoute(
      validClients,
      Number(settings.home_latitude),
      Number(settings.home_longitude)
    );
    setRoute(optimizedRoute);
    setLoading(false);
  };

  const handleReorder = (newStops: OptimizedRoute['stops']) => {
    if (!route) return;
    setRoute({
      ...route,
      stops: newStops
    });
  };

  const getStartCoords = () => {
    if (settings && settings.home_latitude && settings.home_longitude) {
      return {
        lat: Number(settings.home_latitude),
        lon: Number(settings.home_longitude)
      };
    }
    return { lat: 45.464, lon: 9.19 };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <RouteIcon className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Planner Clienti
                </h1>
                <p className="text-sm text-gray-600">
                  Organizza il percorso ottimale per visitare i tuoi clienti
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings size={20} />
              <span className="hidden sm:inline">Imposta Base</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ClientList clients={clients} onClientsChange={loadClients} />

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Genera Percorso
              </h2>

              {settings && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <Home className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Punto base configurato
                    </p>
                    <p className="text-sm text-gray-600">
                      {settings.home_address}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerateRoute}
                disabled={loading || clients.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <MapPin size={20} />
                {loading ? 'Generazione in corso...' : 'Genera Percorso Ottimale'}
              </button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Il percorso sarà ottimizzato per minimizzare la distanza totale
              </p>
            </div>

            <ExportOptions
              route={route}
              startAddress={settings?.home_address || ''}
              clients={clients}
              settings={settings}
              selectedClientsForRoute={selectedClientsForRoute}
              onDataImported={() => {
                loadClients();
                loadSettings();
              }}
              onItineraryImported={(importedClients, homeAddress) => {
                // Imposta i clienti selezionati per il giro (non nel database)
                setSelectedClientsForRoute(importedClients);
                // Imposta il punto base nelle settings (questo va nel database)
                if (homeAddress) {
                  saveSettings({
                    home_address: homeAddress,
                    home_latitude: null,
                    home_longitude: null
                  });
                  loadSettings();
                }
                // Reset del percorso
                setRoute(null);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RouteMap route={route} startCoords={getStartCoords()} />
          <RouteStops
            stops={route?.stops || []}
            totalDistance={route?.totalDistance || 0}
            onReorder={handleReorder}
          />
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={loadSettings}
      />
    </div>
  );
}

export default App;
