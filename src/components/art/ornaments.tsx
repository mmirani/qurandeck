export function EightPointStar({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="10" fill="currentColor" />
    </svg>
  );
}

export function ArabesqueDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-4 w-full items-center gap-2 text-gold ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-20" />
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" />
      <span className="h-px flex-1 bg-current opacity-20" />
    </div>
  );
}

export function CornerFrame({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

const INK = "var(--mushaf-field)";

function volute(cx: number, cy: number, radius: number, start: number, dir: 1 | -1) {
  const turns = 1.08;
  const steps = 72;
  const parts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = start + dir * t * turns * Math.PI * 2;
    const r = radius * (1 - t * 0.82);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join(" ");
}

function CornerScrolls() {
  const stroke = {
    fill: "none" as const,
    stroke: INK,
    strokeWidth: 2.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <g>
      <path {...stroke} d={volute(32, 32, 20, -Math.PI / 2, -1)} />
      <path {...stroke} d={volute(70, 30, 20, Math.PI, -1)} />
      <path {...stroke} d={volute(30, 70, 20, 0, -1)} />
    </g>
  );
}

function FrameCorner({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <CornerScrolls />
    </svg>
  );
}

export function MushafPage({
  children,
  titleArabic,
  titleLatin,
}: {
  children: React.ReactNode;
  titleArabic?: string;
  titleLatin?: string;
}) {
  return (
    <div className="mushaf-page">
      <div className="mushaf-frame">
        <FrameCorner className="mushaf-corner is-tl" />
        <FrameCorner className="mushaf-corner is-tr" />
        <FrameCorner className="mushaf-corner is-bl" />
        <FrameCorner className="mushaf-corner is-br" />
        <div className="mushaf-page-leaf">
          {titleArabic || titleLatin ? (
            <header className="mushaf-sura">
              {titleArabic ? (
                <p dir="rtl" lang="ar" className="mushaf-sura-ar">
                  {titleArabic}
                </p>
              ) : null}
              {titleLatin ? <p className="mushaf-sura-en">{titleLatin}</p> : null}
            </header>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function MihrabMark({ className = "h-8 w-8 text-gold" }: { className?: string }) {
  return (
    <span
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMaskImage: "url(/qd-mark.png)",
        maskImage: "url(/qd-mark.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden="true"
    />
  );
}
