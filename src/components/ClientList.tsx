import { useState } from 'react';
import { Plus, Trash2, Save, X, Search, List } from 'lucide-react';
import { Client } from '../lib/types';
import { searchClients, getClients } from '../lib/storage';
import { geocodeAddress } from '../lib/geocoding';

interface ClientListProps {
  clients: Client[];
  onClientsChange: () => void;
  selectedClientsForRoute: Client[];
  onSelectedClientsChange: (clients: Client[]) => void;
}

export default function ClientList({ clients, onClientsChange, selectedClientsForRoute, onSelectedClientsChange }: ClientListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);
  const [allDbClients, setAllDbClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!formData.first_name || !formData.last_name || !formData.address) {
      alert('Compilare tutti i campi');
      return;
    }

    setLoading(true);
    const coords = await geocodeAddress(formData.address);

    // Aggiungi SOLO ai clienti selezionati per il giro (NON al database)
    const newClient: Client = {
      id: crypto.randomUUID(),
      first_name: formData.first_name,
      last_name: formData.last_name,
      address: formData.address,
      latitude: coords?.latitude || null,
      longitude: coords?.longitude || null
    };

    onSelectedClientsChange([...selectedClientsForRoute, newClient]);

    setLoading(false);
    setFormData({ first_name: '', last_name: '', address: '' });
    setIsAdding(false);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setUseSearch(false);
    setShowAllClients(false);
    setSearchQuery('');
    setSearchResults([]);
    setFormData({ first_name: '', last_name: '', address: '' });
  };

  const handleShowAllClients = () => {
    const allClients = getClients();
    // Filtra i clienti già selezionati per il giro
    const filtered = allClients.filter(c => !selectedClientsForRoute.some(s => s.id === c.id));
    setAllDbClients(filtered);
    setShowAllClients(true);
    setUseSearch(false);
    setIsAdding(false);
  };

  const handleAddFromAllClients = (client: Client) => {
    onSelectedClientsChange([...selectedClientsForRoute, client]);
    // Rimuovi dalla lista dei clienti visualizzati
    setAllDbClients(allDbClients.filter(c => c.id !== client.id));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = searchClients(query);
    // Filter out clients already in the selected list for route
    const filtered = results.filter(r => !selectedClientsForRoute.some(c => c.id === r.id));
    setSearchResults(filtered);
  };

  const handleAddFromSearch = (client: Client) => {
    const isAlreadyAdded = selectedClientsForRoute.some((c) => c.id === client.id);
    if (isAlreadyAdded) {
      alert('Questo cliente è già nella lista');
      return;
    }
    // Aggiungi il cliente ai clienti selezionati per il giro
    onSelectedClientsChange([...selectedClientsForRoute, client]);
    setUseSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveFromRoute = (clientId: string) => {
    onSelectedClientsChange(selectedClientsForRoute.filter(c => c.id !== clientId));
  };

  const handleClearRouteClients = () => {
    if (confirm('Vuoi rimuovere tutti i clienti dal giro?')) {
      onSelectedClientsChange([]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Clienti per il Giro
          {selectedClientsForRoute.length > 0 && (
            <span className="ml-2 text-sm font-normal text-blue-600">
              ({selectedClientsForRoute.length} selezionati)
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {selectedClientsForRoute.length > 0 && (
            <button
              onClick={handleClearRouteClients}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              <X size={16} />
              <span className="hidden sm:inline">Svuota</span>
            </button>
          )}
          <button
            onClick={handleShowAllClients}
            disabled={isAdding}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <List size={20} />
            <span className="hidden sm:inline">Tutti</span>
          </button>
          <button
            onClick={() => {
              setUseSearch(!useSearch);
              setIsAdding(false);
              setShowAllClients(false);
            }}
            disabled={isAdding}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search size={20} />
            <span className="hidden sm:inline">Cerca</span>
          </button>
          <button
            onClick={() => {
              setIsAdding(true);
              setUseSearch(false);
              setShowAllClients(false);
            }}
            disabled={isAdding}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={20} />
            Aggiungi
          </button>
        </div>
      </div>

      {/* Sezione mostra tutti i clienti del database */}
      {showAllClients && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">
              Tutti i Clienti nel Database
              <span className="ml-2 text-sm font-normal text-purple-600">
                ({allDbClients.length} disponibili)
              </span>
            </h3>
            <button
              onClick={() => setShowAllClients(false)}
              className="p-1 hover:bg-purple-100 rounded transition-colors"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
          {allDbClients.length > 0 ? (
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {allDbClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleAddFromAllClients(client)}
                  className="w-full text-left px-4 py-3 hover:bg-purple-100 border-b border-gray-100 last:border-b-0 transition-colors flex items-start justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{client.address}</p>
                  </div>
                  <Plus size={18} className="text-purple-600 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Nessun cliente disponibile nel database (tutti già aggiunti al giro o database vuoto)
            </p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            Clicca su un cliente per aggiungerlo al giro
          </p>
        </div>
      )}

      {useSearch && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Cerca Clienti nel Database</h3>
            <button
              onClick={() => {
                setUseSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-1 hover:bg-green-100 rounded transition-colors"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome, cognome o indirizzo..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleAddFromSearch(client)}
                  className="w-full text-left px-4 py-3 hover:bg-green-100 border-b border-gray-100 last:border-b-0 transition-colors flex items-start justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{client.address}</p>
                  </div>
                  <Plus size={18} className="text-green-600 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">Nessun cliente trovato</p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            Digita almeno 2 caratteri per cercare (ricerca parziale su nome, cognome, indirizzo)
          </p>
        </div>
      )}

      <div className="space-y-2">
        {isAdding && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                placeholder="Nome"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Cognome"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Indirizzo completo"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-3"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Save size={18} />
                {loading ? 'Salvataggio...' : 'Salva'}
              </button>
              <button
                onClick={cancelAdd}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <X size={18} />
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Mostra i clienti selezionati per il giro */}
        {selectedClientsForRoute.map((client) => (
          <div key={client.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {client.first_name} {client.last_name}
                </h3>
                <p className="text-sm text-gray-600">{client.address}</p>
                {client.latitude && client.longitude && (
                  <p className="text-xs text-green-600 mt-1">Geocodificato</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveFromRoute(client.id)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Rimuovi dal giro"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {selectedClientsForRoute.length === 0 && !isAdding && (
          <p className="text-center text-gray-500 py-8">
            Nessun cliente selezionato per il giro. Usa "Cerca" per aggiungere clienti dal database.
          </p>
        )}
      </div>
    </div>
  );
}
