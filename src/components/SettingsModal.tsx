import { useState, useEffect } from 'react';
import { X, Save, Home } from 'lucide-react';
import { Settings } from '../lib/types';
import { saveSettings } from '../lib/storage';
import { geocodeAddress } from '../lib/geocoding';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings | null;
  onSettingsChange: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}: SettingsModalProps) {
  const [homeAddress, setHomeAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setHomeAddress(settings.home_address);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!homeAddress.trim()) {
      alert('Inserire un indirizzo');
      return;
    }

    setLoading(true);
    const coords = await geocodeAddress(homeAddress);

    if (!coords) {
      alert('Indirizzo non trovato. Verificare e riprovare.');
      setLoading(false);
      return;
    }

    saveSettings({
      home_address: homeAddress,
      home_latitude: coords.latitude,
      home_longitude: coords.longitude
    });

    setLoading(false);
    onSettingsChange();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Home className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">
              Configura Punto Base
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indirizzo di partenza/arrivo
          </label>
          <input
            type="text"
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.target.value)}
            placeholder="Es: Via Roma 1, Milano"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-2">
            Questo indirizzo verrà usato come punto di partenza e ritorno per i percorsi
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={18} />
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
