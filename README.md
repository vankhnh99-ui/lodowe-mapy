# Lodowe Mapy

Aplikacja Next.js z mapą satelitarną Leaflet, która automatycznie centruje się na lokalizacji użytkownika.

## Instalacja

1. Zainstaluj zależności:
```bash
npm install
```

2. Uruchom aplikację w trybie deweloperskim:
```bash
npm run dev
```

3. Otwórz [http://localhost:3000](http://localhost:3000) w przeglądarce

## Funkcje

- Widok satelitarny mapy (Esri World Imagery)
- Automatyczne centrowanie na lokalizacji GPS użytkownika
- Maksymalne przybliżenie przy starcie (zoom 20)
- Przycisk FAB (Floating Action Button) do dodawania pomiarów

## Technologie

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- react-leaflet
- Leaflet
