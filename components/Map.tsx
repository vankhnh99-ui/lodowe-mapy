'use client';

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Naprawienie ikon domyślnych Leaflet (problem z Next.js)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Domyślna lokalizacja - jezioro Śniardwy
const DEFAULT_CENTER = {
  latitude: 53.757,
  longitude: 21.735,
};

interface Location {
  latitude: number;
  longitude: number;
}

// Komponent do centrowania mapy na lokalizacji
function MapCenter({ location }: { location: Location }) {
  const map = useMap();
  
  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude], 20, {
        animate: true,
      });
    }
  }, [location, map]);

  return null;
}

// Komponent do udostępniania metody getCenter przez ref
const MapController = forwardRef<{ getCenter: () => { lat: number; lng: number } }, {}>((props, ref) => {
  const map = useMap();

  useImperativeHandle(ref, () => ({
    getCenter: () => {
      const center = map.getCenter();
      return {
        lat: center.lat,
        lng: center.lng,
      };
    },
  }));

  return null;
});

MapController.displayName = 'MapController';

interface MapProps {
  ref?: React.RefObject<{ getCenter: () => { lat: number; lng: number } }>;
}

const Map = forwardRef<{ getCenter: () => { lat: number; lng: number } }, {}>((props, ref) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Upewnij się, że komponent renderuje się tylko po stronie klienta
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Pobierz lokalizację GPS przy starcie
  useEffect(() => {
    if (!isClient) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          // Jeśli geolokalizacja się nie uda, użyj domyślnej lokalizacji
          console.log('Używam domyślnej lokalizacji');
          setLocation(DEFAULT_CENTER);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Jeśli przeglądarka nie obsługuje geolokacji, użyj domyślnej lokalizacji
      console.log('Używam domyślnej lokalizacji');
      setLocation(DEFAULT_CENTER);
    }
  }, [isClient]);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <p className="text-gray-700">Ładowanie mapy...</p>
        </div>
      </div>
    );
  }

  // Użyj domyślnej lokalizacji, jeśli jeszcze nie mamy lokalizacji użytkownika
  const currentLocation = location || DEFAULT_CENTER;

  return (
    <MapContainer
      center={[currentLocation.latitude, currentLocation.longitude]}
      zoom={20}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
      maxZoom={20}
      minZoom={0}
    >
      {/* Widok satelitarny z Esri */}
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={20}
      />
      {/* Marker wskazujący lokalizację użytkownika lub domyślną */}
      <Marker position={[currentLocation.latitude, currentLocation.longitude]} />
      <MapCenter location={currentLocation} />
      <MapController ref={ref} />
    </MapContainer>
  );
});

Map.displayName = 'Map';

export default Map;
