import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search } from 'lucide-react';
import { Client } from '../lib/types';
import { addClient, updateClient, deleteClient, searchClients, getClients } from '../lib/storage';
import { geocodeAddress } from '../lib/geocoding';

interface ClientListProps {
  clients: Client[];
  onClientsChange: () => void;
}

export default function ClientList({ clients, onClientsChange }: ClientListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useSearch, setUseSearch] = useState(false);
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

    addClient({
      first_name: formData.first_name,
      last_name: formData.last_name,
      address: formData.address,
      latitude: coords?.latitude || null,
      longitude: coords?.longitude || null
    });

    setLoading(false);
    setFormData({ first_name: '', last_name: '', address: '' });
    setIsAdding(false);
    onClientsChange();
  };

  const handleEdit = async (id: string) => {
    if (!formData.first_name || !formData.last_name || !formData.address) {
      alert('Compilare tutti i campi');
      return;
    }

    setLoading(true);
    const coords = await geocodeAddress(formData.address);

    updateClient(id, {
      first_name: formData.first_name,
      last_name: formData.last_name,
      address: formData.address,
      latitude: coords?.latitude || null,
      longitude: coords?.longitude || null
    });

    setLoading(false);
    setEditingId(null);
    setFormData({ first_name: '', last_name: '', address: '' });
    onClientsChange();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Eliminare questo cliente?')) return;
    deleteClient(id);
    onClientsChange();
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      address: client.address
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setUseSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setFormData({ first_name: '', last_name: '', address: '' });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = searchClients(query);
    // Filter out clients already in the current list
    const filtered = results.filter(r => !clients.some(c => c.id === r.id));
    setSearchResults(filtered);
  };

  const handleAddFromSearch = (client: Client) => {
    const isAlreadyAdded = clients.some((c) => c.id === client.id);
    if (isAlreadyAdded) {
      alert('Questo cliente è già nella lista');
      return;
    }
    setUseSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    onClientsChange();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Clienti</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setUseSearch(!useSearch);
              setIsAdding(false);
            }}
            disabled={isAdding || editingId !== null}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search size={20} />
            <span className="hidden sm:inline">Cerca</span>
          </button>
          <button
            onClick={() => {
              setIsAdding(true);
              setUseSearch(false);
            }}
            disabled={isAdding || editingId !== null}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={20} />
            Aggiungi
          </button>
        </div>
      </div>

      {useSearch && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Cerca Clienti</h3>
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
              placeholder="Cerca clienti..."
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
            Digita il nome, cognome o indirizzo per cercare clienti salvati
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
                onClick={cancelEdit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <X size={18} />
                Annulla
              </button>
            </div>
          </div>
        )}

        {clients.map((client) => (
          <div key={client.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            {editingId === client.id ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-3"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(client.id)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Save size={18} />
                    {loading ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <X size={18} />
                    Annulla
                  </button>
                </div>
              </>
            ) : (
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
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(client)}
                    disabled={isAdding || editingId !== null}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    disabled={isAdding || editingId !== null}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {clients.length === 0 && !isAdding && (
          <p className="text-center text-gray-500 py-8">
            Nessun cliente. Aggiungi il primo cliente per iniziare.
          </p>
        )}
      </div>
    </div>
  );
}
