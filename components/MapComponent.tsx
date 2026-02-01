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
  const [zoom, setZoom] = useState(map.getZoom());

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

// --- WIDŻET POGODY (POPRAWIONA POZYCJA) ---
function WeatherWidget({ lat, lng, dict }: { lat: number, lng: number, dict: any }) {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,surface_pressure,wind_speed_10m&wind_speed_unit=kmh`)
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            wind: Math.round(data.current.wind_speed_10m),
            pressure: Math.round(data.current.surface_pressure)
          });
        }
      })
      .catch(err => console.error("Weather error:", err));
  }, [lat, lng]);

  if (!weather) return null;

  return (
    // ZMIANA: Zamiast 'leaflet-top', używamy 'absolute top-28' (czyli 112px od góry).
    // To umieści widget idealnie pod przyciskiem ze znakiem zapytania (który jest na top-16).
    <div className="absolute top-28 right-4 z-[500]" style={{ pointerEvents: 'none' }}>
      <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 text-xs text-gray-700 flex flex-col gap-1 min-w-[90px]" style={{ pointerEvents: 'auto' }}>
        
        {/* TEMPERATURA */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-500">🌡️ {dict.temp}</span>
          <span className="font-bold text-lg text-black">{weather.temp}°C</span>
        </div>

        {/* WIATR */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-500">💨 {dict.wind}</span>
          <span className="font-bold text-black">{weather.wind} km/h</span>
        </div>

        {/* CIŚNIENIE */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-500">⏲️ {dict.pressure}</span>
          <span className="font-bold text-black">{weather.pressure} hPa</span>
        </div>

      </div>
    </div>
  );
}

export default function MapComponent({ coords, zoom, measurements, setMapInstance, onDelete, dict }: any) {
  const [initialPosition] = useState(coords);

  return (
    <MapContainer 
      center={initialPosition} 
      zoom={zoom} 
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

      {coords && dict.weather && (
        <WeatherWidget lat={coords[0]} lng={coords[1]} dict={dict.weather} />
      )}

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