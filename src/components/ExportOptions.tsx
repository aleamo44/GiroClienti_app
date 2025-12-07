import { useRef } from 'react';
import { FileText, MapPin, Download, Upload, Database } from 'lucide-react';
import { OptimizedRoute, Client, Settings } from '../lib/types';
import { importDatabase, DatabaseExport } from '../lib/storage';

interface ExportOptionsProps {
  route: OptimizedRoute | null;
  startAddress: string;
  clients: Client[];
  settings: Settings | null;
  onDataImported: () => void;
}

export default function ExportOptions({
  route,
  startAddress,
  clients,
  settings,
  onDataImported
}: ExportOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const rows = [
      ['Ordine', 'Nome', 'Cognome', 'Indirizzo', 'Latitudine', 'Longitudine']
    ];

    rows.push([
      '0',
      'Partenza',
      '',
      startAddress,
      route.stops[0]?.client.latitude?.toString() || '',
      route.stops[0]?.client.longitude?.toString() || ''
    ]);

    route.stops.forEach((stop) => {
      rows.push([
        stop.order.toString(),
        stop.client.first_name,
        stop.client.last_name,
        stop.client.address,
        stop.client.latitude?.toString() || '',
        stop.client.longitude?.toString() || ''
      ]);
    });

    rows.push([
      (route.stops.length + 1).toString(),
      'Ritorno',
      '',
      startAddress,
      '',
      ''
    ]);

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

  // Export full database as CSV
  const exportFullDatabase = () => {
    const rows: string[][] = [];
    
    // Header
    rows.push(['TYPE', 'id', 'first_name', 'last_name', 'address', 'latitude', 'longitude', 'home_address', 'home_latitude', 'home_longitude', 'created_at', 'updated_at']);
    
    // Settings row
    if (settings) {
      rows.push([
        'SETTINGS',
        settings.id || '',
        '',
        '',
        '',
        '',
        '',
        settings.home_address || '',
        settings.home_latitude?.toString() || '',
        settings.home_longitude?.toString() || '',
        settings.created_at || '',
        settings.updated_at || ''
      ]);
    }
    
    // Client rows
    clients.forEach((client) => {
      rows.push([
        'CLIENT',
        client.id,
        client.first_name,
        client.last_name,
        client.address,
        client.latitude?.toString() || '',
        client.longitude?.toString() || '',
        '',
        '',
        '',
        client.created_at || '',
        client.updated_at || ''
      ]);
    });

    const csvContent = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `planner-clienti-backup-${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Import full database from CSV
  const importFullDatabase = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
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
        const typeIndex = header.indexOf('TYPE');
        
        if (typeIndex === -1) {
          alert('Formato CSV non valido: colonna TYPE mancante');
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
          if (row.length < 2) continue;

          const type = row[typeIndex];

          if (type === 'SETTINGS') {
            dbExport.settings = {
              id: row[1] || crypto.randomUUID(),
              home_address: row[7] || '',
              home_latitude: row[8] ? parseFloat(row[8]) : null,
              home_longitude: row[9] ? parseFloat(row[9]) : null,
              created_at: row[10] || new Date().toISOString(),
              updated_at: row[11] || new Date().toISOString()
            };
          } else if (type === 'CLIENT') {
            dbExport.clients.push({
              id: row[1] || crypto.randomUUID(),
              first_name: row[2] || '',
              last_name: row[3] || '',
              address: row[4] || '',
              latitude: row[5] ? parseFloat(row[5]) : null,
              longitude: row[6] ? parseFloat(row[6]) : null,
              created_at: row[10] || new Date().toISOString(),
              updated_at: row[11] || new Date().toISOString()
            });
          }
        }

        if (dbExport.clients.length === 0 && !dbExport.settings) {
          alert('Nessun dato trovato nel file CSV');
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

      <hr className="border-gray-200 mb-4" />

      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Gestione Database
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Salva e ripristina tutti i tuoi dati (clienti e impostazioni)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={exportFullDatabase}
          disabled={clients.length === 0 && !settings}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Database size={20} />
          <span>Scarica Database</span>
        </button>

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
        Il file CSV di backup contiene tutti i clienti e le impostazioni
      </p>
    </div>
  );
}
