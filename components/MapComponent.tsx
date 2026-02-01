'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// --- IKONY ---
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

// --- KONTROLER MAPY ---
function MapController({ setMapInstance }: { setMapInstance: any }) {
  const map = useMap();
  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);
  return null;
}

// --- SUWAK ZOOM (Tylko PC) ---
function ZoomSlider() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom()); // Pobieramy aktualny zoom mapy na start

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoom', onZoom);
    return () => { map.off('zoom', onZoom); };
  }, [map]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoom(val);
    map.setZoom(val);
  };

  return (
    <div className="hidden md:flex leaflet-top leaflet-left" style={{ top: '80px', left: '10px', pointerEvents: 'auto' }}>
      <div className="leaflet-control leaflet-bar bg-white/90 backdrop-blur p-2 rounded-lg shadow-xl border border-gray-300 flex flex-col items-center justify-center gap-2" style={{ height: '200px', width: '40px' }}>
        <span className="text-gray-500 font-bold text-xs">+</span>
        
        <input 
          type="range" 
          min={5} 
          max={19} 
          step={0.5} 
          value={zoom} 
          onChange={handleChange}
          className="w-[140px] h-[20px] bg-gray-200 rounded-lg appearance-none cursor-pointer outline-none"
          style={{ transform: 'rotate(-90deg)', margin: '60px 0' }}
        />
        
        <span className="text-gray-500 font-bold text-xs">-</span>
      </div>
    </div>
  );
}

// Dodajemy prop 'zoom' do komponentu
export default function MapComponent({ coords, zoom, measurements, setMapInstance, onDelete, dict }: any) {
  const [initialPosition] = useState(coords);

  return (
    <MapContainer 
      center={initialPosition} 
      zoom={zoom}  // <--- TERAZ ZOOM JEST DYNAMICZNY (6 dla Polski, 15 dla GPS)
      minZoom={5}           
      maxZoom={22}          
      zoomSnap={0}          
      zoomDelta={0.1}       
      scrollWheelZoom={true}
      touchZoom={true}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={18}  
        maxZoom={22}        
      />

      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={18}
        maxZoom={22}
      />
      
      <MapController setMapInstance={setMapInstance} />
      
      <ZoomSlider />

      <Marker position={coords} icon={userIcon} zIndexOffset={1000}>
        <Popup>{dict.youAreHere}</Popup>
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
                  <span className="text-[10px] text-blue-500 block mt-1">{dict.clickToZoom}</span>
                </div>
              )}

              <button 
                onClick={() => onDelete(m.id)}
                className="text-red-500 text-xs underline mt-1 hover:text-red-700"
              >
                {dict.delete}
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}