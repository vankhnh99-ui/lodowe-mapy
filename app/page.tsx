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
  const [isCheckingWater, setIsCheckingWater] = useState(false);
  
  // NOWE STANY DLA ZDJĘĆ
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // FILTR CZASU
  const [filterMode, setFilterMode] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => { setCoords([position.coords.latitude, position.coords.longitude]); },
        () => { /* Cichy błąd GPS */ },
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
      if (mapInstance) {
        const center = mapInstance.getCenter();
        setTempLocation({ lat: center.lat, lng: center.lng });
        setShowModal(true);
      }
    }
  };

  // --- FUNKCJA: SPRAWDZANIE CZY TO WODA ---
  const checkIfWater = async (lat: number, lng: number): Promise<boolean> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      const waterTypes = ['water', 'natural', 'wetland', 'bay', 'coastline'];
      const waterDetails = ['water', 'wetland', 'bay', 'lake', 'river', 'stream', 'pond'];
      const isCategoryWater = waterTypes.includes(data.category);
      const isTypeWater = waterDetails.includes(data.type);
      const hasLakeInName = data.display_name && (data.display_name.toLowerCase().includes('jezioro') || data.display_name.toLowerCase().includes('zalew') || data.display_name.toLowerCase().includes('staw'));

      return isCategoryWater || isTypeWater || hasLakeInName;
    } catch (e) {
      return true; 
    }
  };

  const saveMeasurement = async () => {
    if (!tempLocation || !thickness) return;

    // 1. ANTY-TROLL (GPS)
    if (!coords || !mapInstance) {
      alert("Włącz GPS, aby potwierdzić lokalizację.");
      return;
    }
    const dist = mapInstance.distance([coords[0], coords[1]], [tempLocation.lat, tempLocation.lng]);
    if (dist > 100) {
      alert(`Jesteś za daleko (${Math.round(dist)}m). Musisz być przy miejscu pomiaru.`);
      return;
    }

    // 2. WERYFIKACJA WODY
    setIsCheckingWater(true);
    const isWater = await checkIfWater(tempLocation.lat, tempLocation.lng);
    setIsCheckingWater(false);

    if (!isWater) {
      const forceAdd = window.confirm("Mapa twierdzi, że to ląd. Czy na pewno stoisz na wodzie?");
      if (!forceAdd) return;
    }

    let imageUrl = null;

    // 3. UPLOAD ZDJĘCIA (JEŚLI JEST)
    if (selectedFile) {
      setIsUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, selectedFile);
      
      if (uploadError) {
        alert("Błąd wysyłania zdjęcia: " + uploadError.message);
        setIsUploading(false);
        return;
      }
      
      // Pobierz publiczny link
      const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
      setIsUploading(false);
    }

    // 4. ZAPIS DO BAZY
    const { error } = await supabase.from('measurements').insert([
      { 
        lat: tempLocation.lat, 
        lng: tempLocation.lng, 
        thickness: parseInt(thickness),
        image_url: imageUrl // Zapisujemy link (może być null)
      },
    ]);

    if (!error) {
      setShowModal(false);
      setIsAiming(false);
      setThickness('');
      setSelectedFile(null); // Czyścimy plik
      fetchMeasurements();
      alert("Dodano pomiar!");
    } else {
      alert('Błąd bazy: ' + error.message);
    }
  };

  const filteredMeasurements = measurements.filter(m => {
    if (filterMode === 'all') return true;
    const date = new Date(m.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return date >= threeDaysAgo;
  });

  if (!coords && !mapInstance) return <div className="flex h-[100dvh] items-center justify-center bg-black text-white">Startowanie...</div>;

  return (
    <div className="relative h-[100dvh] w-screen bg-black overflow-hidden">
      <MapComponent 
        coords={coords || DEFAULT_CENTER} 
        measurements={filteredMeasurements} 
        setMapInstance={setMapInstance}
        onDelete={handleDelete}
      />

      {/* FILTRY */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-lg flex text-sm font-bold border border-gray-200">
        <button onClick={() => setFilterMode('recent')} className={`px-4 py-2 rounded-full transition-all ${filterMode === 'recent' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>3 Dni</button>
        <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-full transition-all ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>Wszystkie</button>
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

      {/* MODAL */}
      {showModal && (
        <div className="absolute inset-0 bg-black/80 z-[2000] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Grubość lodu</h2>
            
            {isCheckingWater ? (
              <p className="text-blue-600 font-bold mb-4 animate-pulse">Sprawdzam, czy to woda... 🌊</p>
            ) : (
              <p className="text-xs text-gray-500 mb-4">Upewnij się, że jesteś w miejscu pomiaru.</p>
            )}
            
            <input 
              type="number" 
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              className="w-full border-2 border-gray-300 p-4 rounded-xl mb-4 text-3xl text-center font-bold text-black focus:border-blue-500 outline-none"
              placeholder="cm"
              autoFocus
              disabled={isCheckingWater || isUploading}
            />

            {/* INPUT NA ZDJĘCIE */}
            <div className="mb-6">
              <label className="block w-full p-3 bg-gray-100 rounded-xl text-center text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors border border-dashed border-gray-400">
                {selectedFile ? `📸 Wybrano: ${selectedFile.name.slice(0, 15)}...` : '📷 Dodaj zdjęcie (opcjonalne)'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }} 
                />
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 rounded-xl">Anuluj</button>
              <button 
                onClick={saveMeasurement} 
                disabled={isCheckingWater || isUploading}
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md disabled:bg-gray-400"
              >
                {isUploading ? 'Wysyłanie...' : (isCheckingWater ? 'Sprawdzanie...' : 'Zapisz')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS */}
      {!showModal && (
        <button onClick={handleLocateMe} className="absolute bottom-36 right-6 z-[1000] bg-white p-4 rounded-full shadow-xl text-gray-700 active:scale-90">
          {isLocating ? <span className="animate-spin block font-bold">↻</span> : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          )}
        </button>
      )}

      {/* PRZYCISK GŁÓWNY */}
      {!showModal && (
        <button
          onClick={handleMainButtonClick}
          className={`absolute bottom-12 right-6 z-[1000] rounded-2xl px-6 py-4 shadow-xl text-white font-bold text-lg tracking-wide active:scale-95 ${isAiming ? 'bg-green-600' : 'bg-blue-600'}`}
        >
          {isAiming ? 'ZATWIERDŹ TU' : '+ DODAJ LÓD'}
        </button>
      )}
    </div>
  );
}