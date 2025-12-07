import { Client, Settings } from './types';

const CLIENTS_KEY = 'planner_clienti_clients';
const SETTINGS_KEY = 'planner_clienti_settings';

// Generate a unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// ===== CLIENTS =====

export function getClients(): Client[] {
  const data = localStorage.getItem(CLIENTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveClients(clients: Client[]): void {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function addClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client {
  const clients = getClients();
  const newClient: Client = {
    ...client,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  clients.push(newClient);
  saveClients(clients);
  return newClient;
}

export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const clients = getClients();
  const index = clients.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  clients[index] = {
    ...clients[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  saveClients(clients);
  return clients[index];
}

export function deleteClient(id: string): boolean {
  const clients = getClients();
  const filtered = clients.filter(c => c.id !== id);
  if (filtered.length === clients.length) return false;
  saveClients(filtered);
  return true;
}

export function searchClients(query: string): Client[] {
  const clients = getClients();
  const lowerQuery = query.toLowerCase();
  return clients.filter(c => 
    c.first_name.toLowerCase().includes(lowerQuery) ||
    c.last_name.toLowerCase().includes(lowerQuery) ||
    c.address.toLowerCase().includes(lowerQuery)
  );
}

// ===== SETTINGS =====

export function getSettings(): Settings | null {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveSettings(settings: Omit<Settings, 'id' | 'created_at' | 'updated_at'>): Settings {
  const existing = getSettings();
  const updatedSettings: Settings = {
    ...settings,
    id: existing?.id || generateId(),
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
  return updatedSettings;
}

// ===== FULL DATABASE EXPORT/IMPORT =====

export interface DatabaseExport {
  settings: Settings | null;
  clients: Client[];
  exportedAt: string;
  version: string;
}

export function exportDatabase(): DatabaseExport {
  return {
    settings: getSettings(),
    clients: getClients(),
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
}

export function importDatabase(data: DatabaseExport): void {
  if (data.settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
  }
  if (data.clients) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(data.clients));
  }
}

export function clearDatabase(): void {
  localStorage.removeItem(CLIENTS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

