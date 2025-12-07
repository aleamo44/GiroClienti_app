import { Client, OptimizedRoute, RouteStop } from './types';

interface Coordinate {
  lat: number;
  lon: number;
}

function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lon - coord1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function nearestNeighborTSP(
  start: Coordinate,
  points: Array<{ coord: Coordinate; client: Client }>
): Array<{ coord: Coordinate; client: Client }> {
  const unvisited = [...points];
  const route: Array<{ coord: Coordinate; client: Client }> = [];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(current, unvisited[0].coord);

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(current, unvisited[i].coord);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = unvisited.splice(nearestIndex, 1)[0];
    route.push(nearest);
    current = nearest.coord;
  }

  return route;
}

export async function optimizeRoute(
  clients: Client[],
  startLat: number,
  startLon: number
): Promise<OptimizedRoute> {
  const validClients = clients.filter(
    (c) => c.latitude !== null && c.longitude !== null
  );

  if (validClients.length === 0) {
    return {
      stops: [],
      totalDistance: 0,
      totalDuration: 0,
      coordinates: []
    };
  }

  const start: Coordinate = { lat: startLat, lon: startLon };
  const points = validClients.map((client) => ({
    coord: { lat: client.latitude!, lon: client.longitude! },
    client
  }));

  const optimizedOrder = nearestNeighborTSP(start, points);

  let totalDistance = calculateDistance(start, optimizedOrder[0].coord);
  const coordinates: [number, number][] = [
    [startLon, startLat],
    [optimizedOrder[0].coord.lon, optimizedOrder[0].coord.lat]
  ];

  const stops: RouteStop[] = optimizedOrder.map((item, index) => {
    if (index > 0) {
      const dist = calculateDistance(
        optimizedOrder[index - 1].coord,
        item.coord
      );
      totalDistance += dist;
      coordinates.push([item.coord.lon, item.coord.lat]);
    }

    return {
      client: item.client,
      order: index + 1,
      distance: totalDistance
    };
  });

  totalDistance += calculateDistance(
    optimizedOrder[optimizedOrder.length - 1].coord,
    start
  );
  coordinates.push([startLon, startLat]);

  return {
    stops,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalDuration: Math.round((totalDistance / 50) * 60),
    coordinates
  };
}
