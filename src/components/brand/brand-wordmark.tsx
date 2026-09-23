export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display tracking-tight text-ink ${className}`}>
      <span className="font-medium">Quran</span>
      <span className="font-bold">Deck</span>
    </span>
  );
}
