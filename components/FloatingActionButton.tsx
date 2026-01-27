'use client';

interface FloatingActionButtonProps {
  isAddingPoint: boolean;
  onAddPointClick: () => void;
  onConfirmClick: () => void;
}

export default function FloatingActionButton({
  isAddingPoint,
  onAddPointClick,
  onConfirmClick,
}: FloatingActionButtonProps) {
  const handleClick = () => {
    if (isAddingPoint) {
      onConfirmClick();
    } else {
      onAddPointClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-sm font-semibold transition-colors duration-200 z-[9999] pointer-events-auto whitespace-nowrap"
      aria-label={isAddingPoint ? 'Zatwierdź tu' : 'Dodaj pomiar'}
    >
      {isAddingPoint ? 'Zatwierdź tu' : '+'}
    </button>
  );
}
