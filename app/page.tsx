'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

// Konfiguracja Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mapa importowana dynamicznie
const MapComponent = dynamic(() => import('../components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="flex h-[100dvh] items-center justify-center text-white bg-gray-900">Ładowanie mapy...</div>
});

const DEFAULT_CENTER = [53.757, 21.735] as [number, number];

export default function Home() {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isAiming, setIsAiming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [thickness, setThickness] = useState('');
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isLocating, setIsLocating] = useState(false);

  // FILTR CZASU ('recent' = 3 dni, 'all' = wszystkie)
  const [filterMode, setFilterMode] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => { setCoords([position.coords.latitude, position.coords.longitude]); },
        () => { /* Błąd lub brak zgody - ignorujemy cicho */ },
        { enableHighAccuracy: true }
      );
    } else {
      setCoords(DEFAULT_CENTER);
    }
    fetchMeasurements();
  }, []);

  const fetchMeasurements = async () => {
    const { data, error } = await supabase.from('measurements').select('*');
    if (!error && data) setMeasurements(data);
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("Czy na pewno chcesz usunąć ten pomiar?");
    if (!confirmDelete) return;
    const { error } = await supabase.from('measurements').delete().eq('id', id);
    if (!error) {
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert("Błąd: " + error.message);
    }
  };

  const handleLocateMe = () => {
    if (!mapInstance) return;
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapInstance.flyTo([position.coords.latitude, position.coords.longitude], 15, { animate: true, duration: 1.5 });
          setIsLocating(false);
        },
        () => { alert("Błąd GPS."); setIsLocating(false); }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleMainButtonClick = () => {
    if (!isAiming) {
      setIsAiming(true);
    } else {
      // ZATWIERDŹ LOKALIZACJĘ
      if (mapInstance) {
        const center = mapInstance.getCenter();
        setTempLocation({ lat: center.lat, lng: center.lng });
        setShowModal(true);
      }
    }
  };

  const saveMeasurement = async () => {
    if (!tempLocation || !thickness) return;

    // --- ZABEZPIECZENIE ANTY-TROLL (GPS) ---
    if (!coords || !mapInstance) {
      alert("Musimy znać Twoją lokalizację, żeby potwierdzić pomiar. Włącz GPS.");
      return;
    }

    // Obliczamy dystans (w metrach)
    const dist = mapInstance.distance([coords[0], coords[1]], [tempLocation.lat, tempLocation.lng]);

    // Limit: 100 metrów
    if (dist > 100) {
      alert(`Jesteś za daleko! \n\nTwój celownik jest oddalony o ${Math.round(dist)}m od Ciebie. \n\nAby zapobiec oszustwom, musisz być w promieniu 100m od miejsca pomiaru.`);
      return;
    }
    // ----------------------------------------

    const { error } = await supabase.from('measurements').insert([
      { lat: tempLocation.lat, lng: tempLocation.lng, thickness: parseInt(thickness) },
    ]);
    if (!error) {
      setShowModal(false);
      setIsAiming(false);
      setThickness('');
      fetchMeasurements();
      alert("Dodano potwierdzony pomiar!");
    } else {
      alert('Błąd: ' + error.message);
    }
  };

  // --- FILTROWANIE DANYCH ---
  const filteredMeasurements = measurements.filter(m => {
    if (filterMode === 'all') return true;
    
    // Logika "Ostatnie 3 dni"
    const date = new Date(m.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return date >= threeDaysAgo;
  });

  if (!coords && !mapInstance) return <div className="flex h-[100dvh] items-center justify-center bg-black text-white">Startowanie...</div>;

  return (
    <div className="relative h-[100dvh] w-screen bg-black overflow-hidden">
      
      {/* MAPA */}
      <MapComponent 
        coords={coords || DEFAULT_CENTER} 
        measurements={filteredMeasurements} 
        setMapInstance={setMapInstance}
        onDelete={handleDelete}
      />

      {/* --- PANEL FILTRÓW (GÓRA EKRANU) --- */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-lg flex text-sm font-bold border border-gray-200">
        <button 
          onClick={() => setFilterMode('recent')}
          className={`px-4 py-2 rounded-full transition-all ${filterMode === 'recent' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          3 Dni
        </button>
        <button 
          onClick={() => setFilterMode('all')}
          className={`px-4 py-2 rounded-full transition-all ${filterMode === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Wszystkie
        </button>
      </div>

      {/* CELOWNIK */}
      {isAiming && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none drop-shadow-lg">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
      )}

      {/* MODAL DODAWANIA */}
      {showModal && (
        <div className="absolute inset-0 bg-black/80 z-[2000] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Grubość lodu</h2>
            <p className="text-xs text-gray-500 mb-4">Upewnij się, że jesteś w miejscu pomiaru.</p>
            <input 
              type="number" 
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              className="w-full border-2 border-gray-300 p-4 rounded-xl mb-6 text-3xl text-center font-bold text-black focus:border-blue-500 outline-none"
              placeholder="cm"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl">Anuluj</button>
              <button onClick={saveMeasurement} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md">Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* PRZYCISK GPS */}
      {!showModal && (
        <button
          onClick={handleLocateMe}
          className="absolute bottom-36 right-6 z-[1000] bg-white p-4 rounded-full shadow-xl text-gray-700 active:scale-90 transition-transform"
        >
          {isLocating ? <span className="animate-spin block font-bold">↻</span> : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          )}
        </button>
      )}

      {/* GŁÓWNY PRZYCISK */}
      {!showModal && (
        <button
          onClick={handleMainButtonClick}
          className={`absolute bottom-12 right-6 z-[1000] rounded-2xl px-6 py-4 shadow-xl text-white font-bold text-lg tracking-wide transition-all active:scale-95 ${
            isAiming 
              ? 'bg-green-600 ring-4 ring-green-300' 
              : 'bg-blue-600'
          }`}
        >
          {isAiming ? 'ZATWIERDŹ TU' : '+ DODAJ LÓD'}
        </button>
      )}
    </div>
  );
}