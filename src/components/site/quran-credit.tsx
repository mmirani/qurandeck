export const QF_ATTRIBUTION = "Quran data provided by Quran.Foundation.";

export function QuranCredit({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <p className={`text-xs leading-5 text-ink-soft ${className}`} translate="no">
      {QF_ATTRIBUTION}
      {compact
        ? ""
        : " The translation, tafsir, and reciter named on the page are the credits for that edition."}
    </p>
  );
}
