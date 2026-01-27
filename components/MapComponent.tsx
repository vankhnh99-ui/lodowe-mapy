'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Ikony (bez zmian)
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const safeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dangerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapController({ setMapInstance }: { setMapInstance: any }) {
  const map = useMap();
  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);
  return null;
}

export default function MapComponent({ coords, measurements, setMapInstance, onDelete }: any) {
  // Zamrożenie pozycji startowej (żeby mapa nie skakała przy każdym ruchu GPS)
  const [initialPosition] = useState(coords);

  return (
    <MapContainer 
      center={initialPosition} 
      zoom={13} 
      maxZoom={22} // <--- 1. Pozwalamy na bardzo duże zbliżenie w kontenerze
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={19} // <--- 2. Tu kończą się prawdziwe zdjęcia
        maxZoom={22}       // <--- 3. Tu kończy się nasze "rozciąganie"
      />
      
      <MapController setMapInstance={setMapInstance} />

      {/* Znacznik użytkownika (żywy GPS) */}
      <Marker position={coords} icon={userIcon}>
        <Popup>To Ty (Lokalizacja GPS)</Popup>
      </Marker>

      {measurements.map((m: any) => (
        <Marker 
          key={m.id} 
          position={[m.lat, m.lng]} 
          icon={m.thickness >= 15 ? safeIcon : dangerIcon}
        >
          <Popup>
            <div className="text-center min-w-[150px]">
              <div className="text-lg font-bold mb-1">
                {m.thickness} cm
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>

              {m.image_url && (
                <div className="mb-3">
                  <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={m.image_url} 
                      alt="Dowód" 
                      className="w-full h-32 object-cover rounded-lg border border-gray-300 hover:opacity-90 transition-opacity" 
                    />
                  </a>
                  <span className="text-[10px] text-blue-500 block mt-1">(Kliknij, aby powiększyć)</span>
                </div>
              )}

              <button 
                onClick={() => onDelete(m.id)}
                className="text-red-500 text-xs underline mt-1 hover:text-red-700"
              >
                Usuń ten pomiar
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}