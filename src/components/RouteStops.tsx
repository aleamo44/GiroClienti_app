import { useState } from 'react';
import { GripVertical, Home } from 'lucide-react';
import { RouteStop } from '../lib/types';

interface RouteStopsProps {
  stops: RouteStop[];
  totalDistance: number;
  onReorder: (newStops: RouteStop[]) => void;
}

export default function RouteStops({
  stops,
  totalDistance,
  onReorder
}: RouteStopsProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStops = [...stops];
    const draggedItem = newStops[draggedIndex];
    newStops.splice(draggedIndex, 1);
    newStops.splice(index, 0, draggedItem);

    const reorderedStops = newStops.map((stop, idx) => ({
      ...stop,
      order: idx + 1
    }));

    setDraggedIndex(index);
    onReorder(reorderedStops);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (stops.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Percorso</h2>
        <p className="text-center text-gray-500 py-8">
          Genera un percorso per visualizzare le tappe
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Percorso</h2>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{totalDistance} km</span> totali
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">
            <Home size={16} />
          </div>
          <div>
            <p className="font-medium text-gray-900">Partenza</p>
            <p className="text-sm text-gray-600">Punto base</p>
          </div>
        </div>

        {stops.map((stop, index) => (
          <div
            key={stop.client.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:border-blue-300 transition-all ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            <GripVertical size={20} className="text-gray-400 flex-shrink-0" />
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {stop.order}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">
                {stop.client.first_name} {stop.client.last_name}
              </p>
              <p className="text-sm text-gray-600 truncate">
                {stop.client.address}
              </p>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">
            <Home size={16} />
          </div>
          <div>
            <p className="font-medium text-gray-900">Ritorno</p>
            <p className="text-sm text-gray-600">Punto base</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          Trascina le tappe per modificare l'ordine del percorso
        </p>
      </div>
    </div>
  );
}
