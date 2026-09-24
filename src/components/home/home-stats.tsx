import { TOTAL_AYAHS, TOTAL_SURAHS } from "@/lib/reading";

export function HomeStats({
  versesRead,
  surahsFinished,
  streak,
  lastReadDay,
  minutes,
  favorites,
  notes,
  highlights,
}: {
  versesRead: number;
  surahsFinished: number;
  streak: number;
  lastReadDay: string | null;
  minutes: number;
  favorites: number;
  notes: number;
  highlights: number;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <ReadingMark title="Ayahs read" detail={`of ${TOTAL_AYAHS.toLocaleString("en-US")}`}>
          <AyahCount value={versesRead} />
        </ReadingMark>
        <ReadingMark title="Surahs finished" detail={`of ${TOTAL_SURAHS}`}>
          <BookCount value={surahsFinished} />
        </ReadingMark>
        <ReadingMark
          title="Day streak"
          detail={lastReadDay ? `Last read ${lastReadDay}` : "Stay on an ayah to begin"}
        >
          <DayCount value={streak} />
        </ReadingMark>
        <ReadingMark title="Minutes" detail="While an ayah is on screen">
          <ClockCount value={minutes} />
        </ReadingMark>
      </div>
      <section className="rounded-2xl border border-line bg-surface px-4 py-4">
        <h3 className="text-sm font-semibold text-ink">Library</h3>
        <p className="mt-0.5 text-xs text-ink-soft">What you saved while reading</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <LibraryMark label="Favorites" detail="Starred ayahs and words">
            <StarCount value={favorites} />
          </LibraryMark>
          <LibraryMark label="Notes" detail="Written on an ayah">
            <NoteCount value={notes} />
          </LibraryMark>
          <LibraryMark label="Highlights" detail="Marked in the mushaf">
            <HighlightCount value={highlights} />
          </LibraryMark>
        </div>
      </section>
    </div>
  );
}

function ReadingMark({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface px-3 py-3 sm:px-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 min-h-8 text-xs leading-4 text-ink-soft">{detail}</p>
      <div className="mt-2 flex justify-center" aria-hidden="true">
        {children}
      </div>
    </article>
  );
}

function LibraryMark({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center" aria-hidden="true">
        {children}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-ink-soft">{detail}</p>
    </div>
  );
}

function CountText({
  value,
  x,
  y,
  fill = "currentColor",
  className,
}: {
  value: number;
  x: number;
  y: number;
  fill?: string;
  className?: string;
}) {
  const text = value.toLocaleString("en-US");
  const fontSize = text.length >= 4 ? 13 : text.length === 3 ? 16 : 20;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={className ? undefined : fill}
      fontSize={fontSize}
      fontWeight={700}
      className={className ?? "font-display"}
    >
      {text}
    </text>
  );
}

function AyahCount({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 text-gold" role="img">
      <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="36" cy="36" r="24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <CountText value={value} x={36} y={42} className="fill-ink font-display" />
    </svg>
  );
}

function BookCount({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 96 68" className="h-16 w-24 text-gold" role="img">
      <path
        d="M48 16C36 8 18 8 8 16v40c10-8 28-8 40 2 12-10 30-10 40-2V16C78 8 60 8 48 16z"
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M48 16v42" stroke="currentColor" strokeWidth="1.4" />
      <path d="M20 28h16M20 36h12M64 28h12M64 36h16" stroke="currentColor" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
      <CountText value={value} x={68} y={48} className="fill-ink font-display" />
    </svg>
  );
}

function DayCount({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 68 76" className="h-16 w-14 text-ink" role="img">
      <rect x="8" y="14" width="52" height="54" rx="8" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 26h52v-4a8 8 0 0 0-8-8H16a8 8 0 0 0-8 8v4z" fill="#e8c872" />
      <rect x="20" y="8" width="4" height="12" rx="2" fill="currentColor" />
      <rect x="44" y="8" width="4" height="12" rx="2" fill="currentColor" />
      <CountText value={value} x={34} y={56} />
    </svg>
  );
}

function ClockCount({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 text-ink" role="img">
      <circle cx="36" cy="36" r="28" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
      <circle cx="36" cy="12" r="1.6" fill="currentColor" />
      <circle cx="60" cy="36" r="1.6" fill="currentColor" />
      <circle cx="36" cy="60" r="1.6" fill="currentColor" />
      <circle cx="12" cy="36" r="1.6" fill="currentColor" />
      <CountText value={value} x={36} y={42} />
    </svg>
  );
}

function StarCount({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 80 76" className="h-[4.75rem] w-20" role="img">
      <path
        d="M40 4l9.2 19.4 21.2 2.2-16 14.2 4.6 21L40 50.6 20.9 60.8l4.6-21-16-14.2 21.3-2.2L40 4z"
        fill="#e8c872"
        stroke="#8c6818"
        strokeWidth="1.4"
      />
      <CountText value={value} x={40} y={46} fill="#1c140c" />
    </svg>
  );
}

function NoteCount({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 72 80" className="h-[4.75rem] w-[4.25rem]" role="img">
      <path
        d="M10 6h36l16 16v48a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z"
        fill="#fffaf0"
        stroke="#c4b48a"
        strokeWidth="1.4"
      />
      <path d="M46 6v12a4 4 0 0 0 4 4h12" fill="#f3e6c4" stroke="#c4b48a" strokeWidth="1.4" />
      <path d="M16 52h32M16 60h22" stroke="#e4d3a8" strokeWidth="2" strokeLinecap="round" />
      <CountText value={value} x={36} y={40} fill="#1c140c" />
    </svg>
  );
}

function HighlightCount({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 88 76" className="h-[4.75rem] w-[5.25rem]" role="img">
      <rect x="4" y="24" width="62" height="28" rx="8" fill="#F5D76E" transform="rotate(-8 35 38)" />
      <CountText value={value} x={34} y={44} fill="#1c140c" />
      <g transform="translate(62 6) rotate(32)">
        <rect width="9" height="26" rx="2" fill="#d97706" />
        <rect y="26" width="9" height="7" fill="#F5D76E" />
        <path d="M0 33h9l-4.5 8z" fill="#1c140c" />
      </g>
    </svg>
  );
}
