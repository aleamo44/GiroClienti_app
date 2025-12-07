import { useRef } from 'react';
import { FileText, MapPin, Download, Upload } from 'lucide-react';
import { OptimizedRoute, Client, Settings } from '../lib/types';
import { importDatabase, DatabaseExport, saveSettings } from '../lib/storage';
import { geocodeAddress } from '../lib/geocoding';

interface ExportOptionsProps {
  route: OptimizedRoute | null;
  startAddress: string;
  clients: Client[];
  settings: Settings | null;
  selectedClientsForRoute: Client[];
  onDataImported: () => void;
  onItineraryImported: (clients: Client[], homeAddress: string | null) => void;
}

export default function ExportOptions({
  route,
  startAddress,
  clients,
  settings,
  selectedClientsForRoute,
  onDataImported,
  onItineraryImported
}: ExportOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itineraryFileInputRef = useRef<HTMLInputElement>(null);

  const exportToPDF = () => {
    if (!route || route.stops.length === 0) return;

    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.innerHTML = `
      <h1 style="font-size: 24px; margin-bottom: 10px;">Itinerario Planner Clienti</h1>
      <div style="margin: 10px 0;"><strong>Distanza totale:</strong> ${route.totalDistance} km</div>
      <div style="margin: 10px 0;"><strong>Durata stimata:</strong> ${route.totalDuration} minuti</div>
      <hr>
      <div style="margin: 15px 0; padding-left: 20px; border-left: 3px solid #3b82f6;">
        <div style="font-weight: bold;">Partenza</div>
        <div style="color: #666; font-size: 14px;">${startAddress}</div>
      </div>
      ${route.stops
        .map(
          (stop) => `
        <div style="margin: 15px 0; padding-left: 20px; border-left: 3px solid #3b82f6;">
          <div style="font-weight: bold;">${stop.order}. ${stop.client.first_name} ${stop.client.last_name}</div>
          <div style="color: #666; font-size: 14px;">${stop.client.address}</div>
        </div>
      `
        )
        .join('')}
      <div style="margin: 15px 0; padding-left: 20px; border-left: 3px solid #3b82f6;">
        <div style="font-weight: bold;">Ritorno</div>
        <div style="color: #666; font-size: 14px;">${startAddress}</div>
      </div>
    `;

    const cssText = `
      @media print {
        body { margin: 0; padding: 0; }
        div { page-break-inside: avoid; }
      }
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Itinerario Planner Clienti</title>
          <style>${cssText}</style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newTab = window.open(url, '_blank');

    if (newTab) {
      newTab.addEventListener('load', () => {
        setTimeout(() => {
          newTab.print();
        }, 100);
      });
    }
  };

  const exportToGoogleMaps = () => {
    if (!route || route.stops.length === 0) return;

    const waypoints = route.stops
      .map((stop) => encodeURIComponent(stop.client.address))
      .join('/');

    const origin = encodeURIComponent(startAddress);
    const destination = encodeURIComponent(startAddress);

    const url = `https://www.google.com/maps/dir/${origin}/${waypoints}/${destination}`;

    window.open(url, '_blank');
  };

  const exportToCSV = () => {
    if (!route || route.stops.length === 0) return;

    const rows: string[][] = [];
    
    // Header
    rows.push(['TYPE', 'first_name', 'last_name', 'address', 'home_address']);
    
    // Settings row (punto base)
    rows.push([
      'SETTINGS',
      '',
      '',
      '',
      startAddress
    ]);
    
    // Client rows (solo clienti del percorso)
    route.stops.forEach((stop) => {
      rows.push([
        'CLIENT',
        stop.client.first_name,
        stop.client.last_name,
        stop.client.address,
        ''
      ]);
    });

    const csvContent = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'itinerario-clienti.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to escape CSV fields
  const escapeCSV = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // Import itinerary CSV (non tocca il database, solo imposta clienti selezionati e punto base)
  const importItineraryCSV = async (file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseCSV(content);
        
        if (rows.length < 2) {
          alert('File CSV vuoto o non valido');
          return;
        }

        const header = rows[0];
        const typeIndex = header.indexOf('TYPE');
        const firstNameIndex = header.indexOf('first_name');
        const lastNameIndex = header.indexOf('last_name');
        const addressIndex = header.indexOf('address');
        const homeAddressIndex = header.indexOf('home_address');
        
        if (typeIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1 || addressIndex === -1 || homeAddressIndex === -1) {
          alert('Formato CSV non valido: colonne mancanti');
          return;
        }

        let homeAddress: string | null = null;
        const importedClients: Client[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 5) continue;

          const type = row[typeIndex];

          if (type === 'SETTINGS') {
            homeAddress = row[homeAddressIndex] || null;
          } else if (type === 'CLIENT') {
            const firstName = row[firstNameIndex] || '';
            const lastName = row[lastNameIndex] || '';
            const address = row[addressIndex] || '';

            if (firstName && lastName && address) {
              // Geocodifica l'indirizzo
              const coords = await geocodeAddress(address);
              
              importedClients.push({
                id: crypto.randomUUID(),
                first_name: firstName,
                last_name: lastName,
                address: address,
                latitude: coords?.latitude || null,
                longitude: coords?.longitude || null
              });
            }
          }
        }

        if (importedClients.length === 0 && !homeAddress) {
          alert('Nessun dato valido trovato nel file CSV');
          return;
        }

        // Chiama il callback per impostare clienti selezionati e punto base
        onItineraryImported(importedClients, homeAddress);
        alert(`Itinerario importato: ${importedClients.length} clienti${homeAddress ? ' e punto base configurato' : ''}`);
        
      } catch (error) {
        console.error('Import itinerary error:', error);
        alert('Errore durante l\'importazione del file');
      }
    };

    reader.onerror = () => {
      alert('Errore nella lettura del file');
    };

    reader.readAsText(file);
  };

  const handleItineraryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        alert('Selezionare un file CSV');
        return;
      }
      importItineraryCSV(file);
    }
    // Reset input
    if (itineraryFileInputRef.current) {
      itineraryFileInputRef.current.value = '';
    }
  };

  // Parse CSV content
  const parseCSV = (content: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          if (char === '\r') i++;
        } else if (char !== '\r') {
          currentField += char;
        }
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows;
  };

  // Import full database from CSV (solo campi obbligatori)
  const importFullDatabase = async (file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        // Remove BOM if present
        const cleanContent = content.replace(/^\ufeff/, '');
        const rows = parseCSV(cleanContent);
        
        if (rows.length < 2) {
          alert('File CSV vuoto o non valido');
          return;
        }

        const header = rows[0];
        const firstNameIndex = header.indexOf('first_name');
        const lastNameIndex = header.indexOf('last_name');
        const addressIndex = header.indexOf('address');
        const homeAddressIndex = header.indexOf('home_address');
        
        // Verifica formato: deve avere almeno first_name, last_name, address per clienti
        // e home_address per settings (opzionale)
        if (firstNameIndex === -1 || lastNameIndex === -1 || addressIndex === -1) {
          alert('Formato CSV non valido: colonne obbligatorie mancanti (first_name, last_name, address)');
          return;
        }

        const dbExport: DatabaseExport = {
          settings: null,
          clients: [],
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 3) continue;

          const firstName = row[firstNameIndex] || '';
          const lastName = row[lastNameIndex] || '';
          const address = row[addressIndex] || '';
          const homeAddress = homeAddressIndex !== -1 ? (row[homeAddressIndex] || '') : '';

          // Se ha home_address, è una riga settings
          if (homeAddress && !firstName && !lastName) {
            // Geocodifica l'indirizzo del punto base
            const coords = await geocodeAddress(homeAddress);
            dbExport.settings = {
              id: crypto.randomUUID(),
              home_address: homeAddress,
              home_latitude: coords?.latitude || null,
              home_longitude: coords?.longitude || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          } 
          // Altrimenti è un cliente (se ha tutti i campi obbligatori)
          else if (firstName && lastName && address) {
            // Geocodifica l'indirizzo
            const coords = await geocodeAddress(address);
            dbExport.clients.push({
              id: crypto.randomUUID(),
              first_name: firstName,
              last_name: lastName,
              address: address,
              latitude: coords?.latitude || null,
              longitude: coords?.longitude || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }

        if (dbExport.clients.length === 0 && !dbExport.settings) {
          alert('Nessun dato valido trovato nel file CSV');
          return;
        }

        const confirmMsg = `Importare ${dbExport.clients.length} clienti${dbExport.settings ? ' e le impostazioni' : ''}?\n\nATTENZIONE: I dati esistenti verranno sostituiti.`;
        
        if (!confirm(confirmMsg)) {
          return;
        }

        importDatabase(dbExport);
        onDataImported();
        alert('Importazione completata con successo!');
        
      } catch (error) {
        console.error('Import error:', error);
        alert('Errore durante l\'importazione del file');
      }
    };

    reader.onerror = () => {
      alert('Errore nella lettura del file');
    };

    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        alert('Selezionare un file CSV');
        return;
      }
      importFullDatabase(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isDisabled = !route || route.stops.length === 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Esporta Itinerario
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={exportToPDF}
          disabled={isDisabled}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FileText size={20} />
          <span>PDF</span>
        </button>

        <button
          onClick={exportToGoogleMaps}
          disabled={isDisabled}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <MapPin size={20} />
          <span>Google Maps</span>
        </button>

        <button
          onClick={exportToCSV}
          disabled={isDisabled}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={20} />
          <span>CSV</span>
        </button>
      </div>

      {isDisabled && (
        <p className="text-sm text-gray-500 text-center mb-6">
          Genera un percorso per abilitare le esportazioni
        </p>
      )}

      {/* Importazione Itinerario */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Importa Itinerario
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Carica un CSV dell'itinerario per riprendere una pianificazione
        </p>
        <label className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors text-sm">
          <Upload size={18} />
          <span>Carica Itinerario CSV</span>
          <input
            ref={itineraryFileInputRef}
            type="file"
            accept=".csv"
            onChange={handleItineraryFileSelect}
            className="hidden"
          />
        </label>
      </div>

      <hr className="border-gray-200 my-6" />

      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Gestione Database
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Carica il tuo database di clienti (solo campi obbligatori: nome, cognome, indirizzo)
      </p>

      <div className="grid grid-cols-1 gap-3">
        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer transition-colors">
          <Upload size={20} />
          <span>Carica Database</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      <p className="text-xs text-gray-500 text-center mt-3">
        Il file CSV deve contenere solo: first_name, last_name, address (per clienti) e home_address (per settings, opzionale)
      </p>
    </div>
  );
}
