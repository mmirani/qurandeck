import { Play, Star } from "lucide-react";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { SanaVisual } from "@/components/companion/sana-visual";

const SURAHS = [
  { n: 1, name: "Al-Fatihah", hint: "The Opening · 7" },
  { n: 2, name: "Al-Baqarah", hint: "The Cow · 286" },
  { n: 3, name: "Ali 'Imran", hint: "Family of Imran · 200" },
  { n: 18, name: "Al-Kahf", hint: "The Cave · 110" },
];

export function HomePreview() {
  return (
    <div
      aria-hidden="true"
      className="home-preview pointer-events-none relative select-none overflow-hidden rounded-[1.75rem] border border-line bg-canvas shadow-[0_28px_70px_rgba(15,23,42,0.14)]"
    >
      <div className="flex gap-2 p-2 sm:p-2.5">
        <aside className="hidden w-[9.5rem] shrink-0 flex-col rounded-2xl bg-surface p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:flex lg:w-44">
          <div className="flex items-center gap-2 text-gold">
            <MihrabMark className="h-6 w-6" />
            <BrandWordmark className="text-sm leading-none" />
          </div>
          <div className="mt-3 flex gap-1">
            {["Surahs", "Juz"].map((label, index) => (
              <span
                key={label}
                className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                  index === 0 ? "bg-gold text-on-gold" : "bg-canvas text-ink-soft"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-3 h-8 rounded-full bg-canvas px-3 text-[10px] leading-8 text-muted">Find a surah</div>
          <div className="mt-2 space-y-1">
            {SURAHS.map((item, index) => (
              <div
                key={item.n}
                className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${index === 0 ? "bg-highlight" : ""}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-gold-deep">
                  {item.n}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-ink">{item.name}</span>
                  <span className="block truncate text-[9px] text-ink-soft">{item.hint}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-xl border-2 border-gold/50 bg-highlight p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Current place</p>
            <p className="mt-1 text-sm font-semibold text-ink">Al-Fatihah</p>
            <p className="text-[10px] text-ink-soft">Ayah 1:1</p>
          </div>
        </aside>

        <article className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-line/80 bg-surface">
          <div className="border-b border-line/40 bg-canvas/90 px-3 py-3 sm:px-5">
            <div className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[11px] text-muted">
              Search by word, theme, or verse
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div>
                <p className="text-[10px] text-ink-soft">Makkiyyah · 7 ayahs</p>
                <p className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">Al-Fatihah · The Opening</p>
              </div>
              <span className="inline-flex h-8 items-center gap-1 rounded-full bg-gold px-3 text-[11px] font-semibold text-on-gold">
                <Play className="h-3 w-3" /> Play surah
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] text-on-gold">Arabic</span>
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] text-on-gold">English</span>
              <span className="rounded-full border border-gold/30 px-2.5 py-1 text-[10px] text-ink-soft">Tafsir</span>
            </div>
          </div>

          <div className="space-y-3 px-3 py-4 sm:px-5">
            <VerseShot
              n={1}
              arabic="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
              english="In the name of Allah, the Entirely Merciful, the Especially Merciful."
              active
            />
            <VerseShot
              n={2}
              arabic="الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"
              english="[All] praise is [due] to Allah, Lord of the worlds."
            />
          </div>
        </article>

        <aside className="hidden w-36 shrink-0 flex-col gap-2 rounded-2xl bg-surface p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] xl:flex">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Account</p>
          <p className="text-[11px] text-ink-soft">Free, private, forever.</p>
          <div className="rounded-xl bg-highlight p-2.5">
            <p className="text-[10px] font-medium text-ink">Notes</p>
            <p className="mt-1 text-[10px] text-ink-soft">Stay beside the ayah you are on.</p>
          </div>
          <div className="rounded-xl border border-line p-2.5">
            <p className="text-[10px] font-medium text-ink">Highlights</p>
            <p className="mt-1 text-[10px] text-ink-soft">Named pens, your colours.</p>
          </div>
        </aside>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 sm:bottom-5 sm:right-5">
        <SanaVisual className="is-sm" />
      </div>
    </div>
  );
}

function VerseShot({
  n,
  arabic,
  english,
  active,
}: {
  n: number;
  arabic: string;
  english: string;
  active?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${active ? "border-gold/40 ring-2 ring-gold/25" : "border-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-gold-deep">
          {n}
        </span>
        <div className="flex gap-1">
          <span className="inline-flex h-7 items-center gap-0.5 rounded-full border border-gold/30 px-2 text-[9px] text-ink-soft">
            <Play className="h-2.5 w-2.5" /> Ayah
          </span>
          <span className="hidden h-7 w-7 items-center justify-center rounded-full border border-gold/30 text-ink-soft sm:inline-flex">
            <Star className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
      <p dir="rtl" lang="ar" className="mt-3 text-right font-arabic text-xl leading-[2.25] text-ink sm:text-2xl">
        {arabic}
      </p>
      <p className="mt-2 font-reading text-[12px] leading-5 text-ink-soft sm:text-[13px]">{english}</p>
    </div>
  );
}
