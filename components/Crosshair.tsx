'use client';

export default function Crosshair() {
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9998] pointer-events-none">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Zewnętrzny okrąg */}
        <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="2" fill="none" />
        <circle cx="20" cy="20" r="18" stroke="black" strokeWidth="1" fill="none" opacity="0.3" />
        
        {/* Pozioma linia */}
        <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeWidth="2" />
        <line x1="8" y1="20" x2="32" y2="20" stroke="black" strokeWidth="1" opacity="0.3" />
        
        {/* Pionowa linia */}
        <line x1="20" y1="8" x2="20" y2="32" stroke="white" strokeWidth="2" />
        <line x1="20" y1="8" x2="20" y2="32" stroke="black" strokeWidth="1" opacity="0.3" />
        
        {/* Środek - pinezka */}
        <circle cx="20" cy="20" r="4" fill="red" stroke="white" strokeWidth="2" />
      </svg>
    </div>
  );
}
