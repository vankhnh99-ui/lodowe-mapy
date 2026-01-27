'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MapComponent = dynamic(() => import('../components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center text-white bg-gray-900">Ładowanie mapy...</div>
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
  const [isLocating, setIsLocating] = useState(false); // Czy trwa namierzanie?

  useEffect(() => {
    // Pierwsze namierzanie przy starcie
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => { setCoords([position.coords.latitude, position.coords.longitude]); },
        () => { setCoords(DEFAULT_CENTER); }
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
    if (error) {
      alert("Błąd usuwania: " + error.message);
    } else {
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // --- NOWOŚĆ: FUNKCJA "ZNAJDŹ MNIE" ---
  const handleLocateMe = () => {
    if (!mapInstance) return;
    setIsLocating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Płynny przelot kamery do użytkownika
          mapInstance.flyTo([latitude, longitude], 15, {
            animate: true,
            duration: 1.5
          });
          setIsLocating(false);
        },
        (error) => {
          alert("Nie udało się pobrać lokalizacji. Sprawdź GPS.");
          setIsLocating(false);
        }
      );
    } else {
      alert("Twoja przeglądarka nie obsługuje GPS.");
      setIsLocating(false);
    }
  };
  // -------------------------------------

  const handleMainButtonClick = () => {
    if (!isAiming) {
      setIsAiming(true);
    } else {
      if (mapInstance) {
        const center = mapInstance.getCenter();
        setTempLocation({ lat: center.lat, lng: center.lng });
        setShowModal(true);
      } else {
        alert("Mapa jeszcze się nie załadowała.");
      }
    }
  };

  const saveMeasurement = async () => {
    if (!tempLocation || !thickness) return;
    const { error } = await supabase.from('measurements').insert([
      { lat: tempLocation.lat, lng: tempLocation.lng, thickness: parseInt(thickness) },
    ]);
    if (error) {
      alert('Błąd zapisu: ' + error.message);
    } else {
      setShowModal(false);
      setIsAiming(false);
      setThickness('');
      fetchMeasurements();
    }
  };

  if (!coords) return <div className="flex h-screen items-center justify-center bg-black text-white">Startowanie satelity...</div>;

  return (
    <div className="relative h-screen w-screen bg-black">
      <MapComponent 
        coords={coords} 
        measurements={measurements} 
        setMapInstance={setMapInstance}
        onDelete={handleDelete}
      />

      {isAiming && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none drop-shadow-lg">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
      )}

      {showModal && (
        <div className="absolute inset-0 bg-black/60 z-[1000] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Grubość lodu</h2>
            <input 
              type="number" 
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              className="w-full border-2 border-gray-300 p-3 rounded-lg mb-6 text-2xl text-center font-mono text-black focus:border-blue-500 outline-none"
              placeholder="cm"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Anuluj</button>
              <button onClick={saveMeasurement} className="px-5 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* PRZYCISK LOKALIZACJI (GPS) */}
      {!showModal && (
        <button
          onClick={handleLocateMe}
          className="absolute bottom-32 right-8 z-[999] bg-white p-3 rounded-full shadow-xl text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
          title="Znajdź mnie"
        >
          {isLocating ? (
            <span className="animate-spin block">↻</span>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
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
          className={`absolute bottom-10 right-8 z-[999] rounded-2xl px-8 py-4 shadow-xl text-white font-bold text-lg tracking-wide transition-all transform active:scale-95 ${
            isAiming 
              ? 'bg-green-600 hover:bg-green-700 ring-4 ring-green-300' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isAiming ? 'ZATWIERDŹ TU' : '+ DODAJ LÓD'}
        </button>
      )}
    </div>
  );
}