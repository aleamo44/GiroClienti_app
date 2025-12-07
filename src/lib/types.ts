export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  id: string;
  user_id?: string;
  home_address: string;
  home_latitude: number | null;
  home_longitude: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface RouteStop {
  client: Client;
  order: number;
  distance?: number;
  duration?: number;
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDistance: number;
  totalDuration: number;
  coordinates: [number, number][];
}
