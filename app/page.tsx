'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

const TRANSLATIONS = {
  pl: {
    loading: "Ładowanie mapy...",
    searchingSatellites: "Szukam satelitów...",
    addIce: "+ DODAJ LÓD",
    confirmHere: "ZATWIERDŹ TU",
    locateMe: "Lokalizuj mnie",
    filters: { recent: "3 Dni", all: "Wszystkie" },
    modal: {
      title: "Grubość lodu",
      checkingWater: "Sprawdzam, czy to woda... 🌊",
      checkLocation: "Upewnij się, że jesteś w miejscu pomiaru.",
      camera: "📸 Aparat",
      gallery: "📁 Galeria",
      fileSelected: "Wybrano:",
      cancel: "Anuluj",
      save: "Zapisz",
      uploading: "Wysyłanie...",
      checking: "Sprawdzanie...",
    },
    alerts: {
      gpsError: "Błąd GPS:",
      deleteConfirm: "Czy na pewno chcesz usunąć ten pomiar?",
      deleted: "Usunięto!",
      dbError: "Błąd bazy:",
      locateError: "Nie udało się pobrać lokalizacji. Sprawdź ustawienia GPS.",
      browserNoGps: "Twoja przeglądarka nie obsługuje GPS.",
      fbBlock: "⚠️ Facebook blokuje GPS.\n\nKliknij 3 kropki w prawym górnym rogu i wybierz 'Otwórz w przeglądarce' (Chrome/Safari), aby mapa działała poprawnie.",
      fbBlockShort: "⚠️ Facebook blokuje GPS.\nOtwórz mapę w normalnej przeglądarce (Chrome/Safari), aby zapisać dokładną pozycję.",
      tooFar: "Jesteś za daleko. Musisz być przy miejscu pomiaru.",
      landWarning: "Mapa twierdzi, że to ląd. Czy na pewno stoisz na wodzie?",
      photoError: "Błąd zdjęcia:",
      added: "Dodano pomiar!",
    },
    map: {
      youAreHere: "To Ty (GPS)",
      delete: "Usuń ten pomiar",
      clickToZoom: "(Kliknij, aby powiększyć)"
    }
  },
  en: {
    loading: "Loading map...",
    searchingSatellites: "Searching for satellites...",
    addIce: "+ ADD ICE",
    confirmHere: "CONFIRM HERE",
    locateMe: "Locate me",
    filters: { recent: "3 Days", all: "All" },
    modal: {
      title: "Ice Thickness",
      checkingWater: "Checking if water... 🌊",
      checkLocation: "Make sure you are at the measuring spot.",
      camera: "📸 Camera",
      gallery: "📁 Gallery",
      fileSelected: "Selected:",
      cancel: "Cancel",
      save: "Save",
      uploading: "Uploading...",
      checking: "Checking...",
    },
    alerts: {
      gpsError: "GPS Error:",
      deleteConfirm: "Are you sure you want to delete this measurement?",
      deleted: "Deleted!",
      dbError: "Database error:",
      locateError: "Could not get location. Check GPS settings.",
      browserNoGps: "Your browser does not support GPS.",
      fbBlock: "⚠️ Facebook blocks GPS.\n\nClick the 3 dots in the corner and select 'Open in Browser' (Chrome/Safari) for the map to work.",
      fbBlockShort: "⚠️ Facebook blocks GPS.\nOpen the map in a regular browser (Chrome/Safari) to save accurate location.",
      tooFar: "You are too far away. You must be at the measuring spot.",
      landWarning: "Map says this is land. Are you sure you are on water?",
      photoError: "Photo error:",
      added: "Measurement added!",
    },
    map: {
      youAreHere: "You (GPS)",
      delete: "Delete this point",
      clickToZoom: "(Click to zoom)"
    }
  }
};

type Lang = 'pl' | 'en';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MapComponent = dynamic(() => import('../components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="flex h-[100dvh] items-center justify-center text-white bg-gray-900">...</div>
});

const DEFAULT_CENTER = [53.757, 21.735] as [number, number];

export default function Home() {
  const [lang, setLang] = useState<Lang>('pl'); 
  const t = TRANSLATIONS[lang]; 

  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isAiming, setIsAiming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [thickness, setThickness] = useState('');
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isCheckingWater, setIsCheckingWater] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [filterMode, setFilterMode] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    const userLang = navigator.language || navigator.languages[0];
    if (userLang && !userLang.startsWith('pl')) {
      setLang('en');
    }

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => { setCoords([position.coords.latitude, position.coords.longitude]); },
        (error) => { setCoords((prev) => prev || DEFAULT_CENTER); },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setCoords(DEFAULT_CENTER);
    }

    const timer = setTimeout(() => {
        setCoords((prev) => {
            if (!prev) return DEFAULT_CENTER;
            return prev;
        });
    }, 2000);

    fetchMeasurements();
    return () => clearTimeout(timer);
  }, []); 

  const fetchMeasurements = async () => {
    const { data, error } = await supabase.from('measurements').select('*');
    if (!error && data) setMeasurements(data);
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm(TRANSLATIONS[lang].alerts.deleteConfirm);
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
      alert(TRANSLATIONS[lang].alerts.deleted);
    } else {
      alert(TRANSLATIONS[lang].alerts.dbError + " " + error.message);
    }
  };

  // --- POPRAWIONA FUNKCJA LOKALIZACJI ---
  const handleLocateMe = () => {
    if (!mapInstance) return;
    setIsLocating(true);

    // KROK 1: Sprawdź, czy już mamy pozycję w pamięci (niebieska kropka)
    if (coords) {
        // Mamy pozycję! Lecimy tam od razu, bez pytania przeglądarki.
        mapInstance.flyTo(coords, 15, { animate: true, duration: 1.5 });
        setIsLocating(false);
        return; // Kończymy funkcję sukcesem
    }

    // KROK 2: Jeśli jakimś cudem nie mamy pozycji, dopiero wtedy pytamy GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapInstance.flyTo([position.coords.latitude, position.coords.longitude], 15, { animate: true, duration: 1.5 });
          setIsLocating(false);
        },
        () => { alert(TRANSLATIONS[lang].alerts.fbBlock); setIsLocating(false); },
        { timeout: 5000 }
      );
    } else {
      alert(TRANSLATIONS[lang].alerts.browserNoGps);
      setIsLocating(false);
    }
  };
  // ----------------------------------------

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
          if (blob) {
            const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            resolve(newFile);
          } else { reject(new Error('Błąd tworzenia pliku')); }
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

    if (!coords) {
         if (navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                 (pos) => setCoords([pos.coords.latitude, pos.coords.longitude]),
                 () => alert(TRANSLATIONS[lang].alerts.fbBlockShort)
             );
         }
    } else if (mapInstance) {
        const dist = mapInstance.distance([coords[0], coords[1]], [tempLocation.lat, tempLocation.lng]);
        if (dist > 100) {
            alert(`${TRANSLATIONS[lang].alerts.tooFar} (${Math.round(dist)}m).`);
            return;
        }
    }

    setIsCheckingWater(true);
    const isWater = await checkIfWater(tempLocation.lat, tempLocation.lng);
    setIsCheckingWater(false);

    if (!isWater) {
      const forceAdd = window.confirm(TRANSLATIONS[lang].alerts.landWarning);
      if (!forceAdd) return;
    }

    let imageUrl = null;
    if (selectedFile) {
      setIsUploading(true);
      try {
        const compressedFile = await compressImage(selectedFile);
        const fileName = `${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, compressedFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      } catch (error: any) {
        alert(TRANSLATIONS[lang].alerts.photoError + " " + error.message);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const { error } = await supabase.from('measurements').insert([
      { 
        lat: tempLocation.lat, 
        lng: tempLocation.lng, 
        thickness: parseInt(thickness), 
        image_url: imageUrl 
      },
    ]);

    if (!error) {
      setShowModal(false);
      setIsAiming(false);
      setThickness('');
      setSelectedFile(null);
      fetchMeasurements();
      alert(TRANSLATIONS[lang].alerts.added);
    } else {
      alert(TRANSLATIONS[lang].alerts.dbError + " " + error.message);
    }
  };

  const filteredMeasurements = measurements.filter(m => {
    if (filterMode === 'all') return true;
    const date = new Date(m.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return date >= threeDaysAgo;
  });

  if (!coords && !mapInstance) return <div className="flex h-[100dvh] items-center justify-center bg-black text-white flex-col gap-4">
    <div className="animate-spin text-4xl">❄️</div>
    <p>{t.searchingSatellites}</p>
    </div>;

  return (
    <div className="relative h-[100dvh] w-screen bg-black overflow-hidden">
      
      {/* PRZEŁĄCZNIK JĘZYKA */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-lg flex text-xs font-bold border border-gray-200">
        <button onClick={() => setLang('pl')} className={`px-2 py-1 rounded-md transition-all ${lang === 'pl' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>PL</button>
        <button onClick={() => setLang('en')} className={`px-2 py-1 rounded-md transition-all ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>EN</button>
      </div>

      <MapComponent 
        coords={coords || DEFAULT_CENTER} 
        measurements={filteredMeasurements} 
        setMapInstance={setMapInstance}
        onDelete={handleDelete}
        dict={t.map}
      />

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-lg flex text-sm font-bold border border-gray-200">
        <button onClick={() => setFilterMode('recent')} className={`px-4 py-2 rounded-full transition-all ${filterMode === 'recent' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>{t.filters.recent}</button>
        <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-full transition-all ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>{t.filters.all}</button>
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
            <h2 className="text-xl font-bold mb-4 text-gray-800">{t.modal.title}</h2>
            {isCheckingWater ? <p className="text-blue-600 font-bold mb-4 animate-pulse">{t.modal.checkingWater}</p> : <p className="text-xs text-gray-500 mb-4">{t.modal.checkLocation}</p>}
            
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
                <span>{t.modal.camera}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
              </label>
              <label className="flex-1 p-3 bg-gray-100 rounded-xl text-center text-gray-700 font-bold cursor-pointer hover:bg-gray-200 transition-colors flex flex-col items-center justify-center gap-1">
                <span>{t.modal.gallery}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
            
            {selectedFile && (
              <div className="mb-4 text-center text-sm text-green-600 font-semibold bg-green-50 py-2 rounded-lg">
                {t.modal.fileSelected} {selectedFile.name.length > 20 ? selectedFile.name.slice(0, 15) + '...' : selectedFile.name}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 rounded-xl">{t.modal.cancel}</button>
              <button 
                onClick={saveMeasurement} 
                disabled={isCheckingWater || isUploading}
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md disabled:bg-gray-400"
              >
                {t.modal.uploading || isCheckingWater ? t.modal.checking : t.modal.save}
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
          {isAiming ? t.confirmHere : t.addIce}
        </button>
      )}
    </div>
  );
}