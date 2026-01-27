'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const getMarkerIcon = (thickness: number) => {
  let color = '#ef4444'; 
  if (thickness >= 10 && thickness < 15) color = '#eab308';
  else if (thickness >= 15) color = '#22c55e';

  return L.divIcon({
    className: 'custom-ice-marker',
    html: `
      <div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-family: sans-serif; font-size: 14px;">
        ${thickness}
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

function MapController({ setMapInstance }: { setMapInstance: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { setMapInstance(map); }, [map, setMapInstance]);
  return null;
}

export default function MapComponent({ 
  coords, 
  measurements, 
  setMapInstance,
  onDelete // Odbieramy nową funkcję
}: { 
  coords: [number, number], 
  measurements: any[], 
  setMapInstance: (map: L.Map) => void,
  onDelete: (id: number) => void // Typowanie funkcji
}) {
  return (
    <MapContainer center={coords} zoom={13} className="h-full w-full z-0">
      <MapController setMapInstance={setMapInstance} />
      <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

      {measurements.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={getMarkerIcon(m.thickness)}>
          <Popup>
            <div className="text-center min-w-[100px]">
              <strong style={{ fontSize: '1.2em' }}>{m.thickness} cm</strong>
              <br />
              <span className="text-gray-500 text-xs">
                {new Date(m.created_at).toLocaleDateString()}
              </span>
              
              {/* PRZYCISK USUWANIA */}
              <div className="mt-3 border-t pt-2">
                <button 
                  onClick={() => onDelete(m.id)}
                  className="bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-200 transition-colors w-full"
                >
                  🗑️ Usuń
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}