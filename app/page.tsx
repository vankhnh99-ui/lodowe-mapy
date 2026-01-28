'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Ładujemy mapę bez SSR
const MapComponent = dynamic(() => import('../components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">Ładowanie mapy...</div>
});

const DEFAULT_CENTER = [53.757, 21.735] as [number, number];

export default function Home() {
  // ZMIANA 1: coords ma WARTOŚĆ STARTOWĄ. Nie jest null. Dzięki temu mapa renderuje się od razu.
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const [userGlobalPosition, setUserGlobalPosition] = useState<[number, number] | null>(null); // Nowy stan: prawdziwa pozycja gracza

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isAiming, setIsAiming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [thickness, setThickness] = useState('');
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  // ZMIANA 2: isLocating true na start, żeby kręciło się kółeczko GPS
  const [isLocating, setIsLocating] = useState(true);
  const [isCheckingWater, setIsCheckingWater] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filterMode, setFilterMode] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    // Pobierz pomiary od razu
    fetchMeasurements();

    // Próba pobrania GPS w tle
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = [position.coords.latitude, position.coords.longitude] as [number, number];
          setCoords(newPos); // Przesuń mapę
          setUserGlobalPosition(newPos); // Ustaw niebieską kropkę
          setIsLocating(false); // Wyłącz kręcenie
          
          // Jeśli mapa już jest załadowana, zrób płynny przelot
          if (mapInstance) {
             mapInstance.flyTo(newPos, 15);
          }
        },
        (error) => {
          console.warn("Brak GPS:", error);
          setIsLocating(false); // Przestań kręcić, zostań na Mazurach
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsLocating(false);
    }
  }, [mapInstance]); // Dodajemy mapInstance do zależności, żeby flyTo zadziałało jak mapa wstanie

  const fetchMeasurements = async () => {
    const { data, error } = await supabase.from('measurements').select('*');
    if (!error && data) setMeasurements(data);
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("Czy na pewno chcesz usunąć ten pomiar?");
    if (!confirmDelete) return;

    const measurementToDelete = measurements.find((m) => m.id === id);
    if (measurementToDelete && measurementToDelete.image_url) {
      try {
        const fileName = measurementToDelete.image_url.split('/').pop();
        if (fileName) await supabase.storage.from('photos').remove([fileName]);
      } catch (err) { console.error(err); }
    }

    const { error } = await supabase.from('measurements').delete().eq('id', id);
    if (!error) {
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
      alert("Usunięto!");
    } else {
      alert("Błąd: " + error.message);
    }
  };

  const handleLocateMe = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = [position.coords.latitude, position.coords.longitude] as [number, number];
          setUserGlobalPosition(newPos);
          if (mapInstance) mapInstance.flyTo(newPos, 15);
          setIsLocating(false);
        },
        () => { 
            alert("Nie udało się pobrać lokalizacji."); 
            setIsLocating(false); 
        },
        { timeout: 5000 }
      );
    } else {
      alert("Brak modułu GPS.");
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
    } catch (e) { return true; }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000; 
        const scaleSize = MAX_WIDTH / img.width;
        if (scaleSize >= 1) { resolve(file); return; }
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Błąd kompresji')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          else reject(new Error('Błąd pliku'));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const saveMeasurement = async () => {
    if (!tempLocation || !thickness) return;

    // Walidacja GPS przy zapisie (nie blokujemy startu, ale blokujemy zapis bez GPS)
    if (!userGlobalPosition && !mapInstance) {
        alert("Musisz włączyć GPS, aby dodać punkt!");
        return;
    }

    if (userGlobalPosition && mapInstance) {
        const dist = mapInstance.distance([userGlobalPosition[0], userGlobalPosition[1]], [tempLocation.lat, tempLocation.lng]);
        if (dist > 200) { // Zwiększyłem tolerancję do 200m dla Facebooka
            alert(`Jesteś za daleko (${Math.round(dist)}m).`);
            return;
        }
    }

    setIsCheckingWater(true);
    const isWater = await checkIfWater(tempLocation.lat, tempLocation.lng);
    setIsCheckingWater(false);

    if (!isWater) {
      if(!window.confirm("Mapa twierdzi, że to ląd. Czy na pewno stoisz na wodzie?")) return;
    }

    let imageUrl = null;
    if (selectedFile) {
      setIsUploading(true);
      try {
        const compressedFile = await compressImage(selectedFile);
        const fileName = `${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, compressedFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      } catch (error: any) {
        alert("Błąd zdjęcia: " + error.message);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const { error } = await supabase.from('measurements').insert([
      { lat: tempLocation.lat, lng: tempLocation.lng, thickness: parseInt(thickness), image_url: imageUrl },
    ]);

    if (!error) {
      setShowModal(false);
      setIsAiming(false);
      setThickness('');
      setSelectedFile(null);
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

  // ZMIANA KLUCZOWA: Usunęliśmy warunek "if (!coords) return ...".
  // Teraz zawsze renderujemy strukturę strony.
  return (
    <div className="relative h-[100dvh] w-screen bg-black overflow-hidden">
      <MapComponent 
        coords={coords} // To teraz zawsze ma wartość (Usera albo Mazury)
        measurements={filteredMeasurements} 
        setMapInstance={setMapInstance}
        onDelete={handleDelete}
      />

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-lg flex text-sm font-bold border border-gray-200">
        <button onClick={() => setFilterMode('recent')} className={`px-4 py-2 rounded-full transition-all ${filterMode === 'recent' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>3 Dni</button>
        <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-full transition-all ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>Wszystkie</button>
      </div>

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

            <div className="mb-6 flex gap-2">
              <label className="flex-1 p-3 bg-blue-100 rounded-xl text-center text-blue-700 font-bold cursor-pointer hover:bg-blue-200 transition-colors flex flex-col items-center justify-center gap-1">
                <span>📸 Aparat</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
              </label>
              <label className="flex-1 p-3 bg-gray-100 rounded-xl text-center text-gray-700 font-bold cursor-pointer hover:bg-gray-200 transition-colors flex flex-col items-center justify-center gap-1">
                <span>📁 Galeria</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
            
            {selectedFile && (
              <div className="mb-4 text-center text-sm text-green-600 font-semibold bg-green-50 py-2 rounded-lg">
                Wybrano: {selectedFile.name.length > 20 ? selectedFile.name.slice(0, 15) + '...' : selectedFile.name}
              </div>
            )}

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

      {!showModal && (
        <button onClick={handleLocateMe} className="absolute bottom-36 right-6 z-[1000] bg-white p-4 rounded-full shadow-xl text-gray-700 active:scale-90">
          {isLocating ? <span className="animate-spin block font-bold">↻</span> : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          )}
        </button>
      )}

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