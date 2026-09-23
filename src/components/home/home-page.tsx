"use client";

import Link from "next/link";
import {
  Bookmark,
  BookOpen,
  Heart,
  Highlighter,
  Languages,
  Lock,
  Map,
  NotebookPen,
  Palette,
  Play,
  Search,
  Sparkles,
  Type,
  UserRound,
} from "lucide-react";
import { CompletionMap } from "@/components/account/completion-map";
import { StatCard } from "@/components/account/account-dashboard";
import { HomeNur } from "@/components/home/home-nur";
import { HomePreview } from "@/components/home/home-preview";
import { AppModals } from "@/components/shell/app-modals";
import { requestAuthTab } from "@/components/modals/auth-modal";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { UserMenu } from "@/components/user/user-menu";
import { MihrabMark } from "@/components/art/ornaments";
import { PRODUCT_NAME, PROMISE_LINE, PROMISE_STORY, WORK_TITLE } from "@/lib/brand";
import { HOME_FEATURES, HOME_MORE, HOME_PROMISES, HOME_STARTS } from "@/lib/home";
import {
  formatReadingMinutes,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
  versePlaceLabel,
} from "@/lib/reading";

const FEATURE_ICONS = {
  search: Search,
  place: Bookmark,
  study: Highlighter,
  tafsir: NotebookPen,
  progress: Map,
  themes: Palette,
} as const;

const PROMISE_ICONS = {
  Free: Sparkles,
  Private: Lock,
  Forever: Heart,
} as const;

const MORE_ICONS = {
  Recitation: Play,
  "Juz reading": BookOpen,
  "Word by word": Type,
  Languages,
  "Guest reading": UserRound,
} as const;

export function HomePage() {
  const { user, hydrated } = useMushaf();

  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <HomeNav signedIn={Boolean(hydrated && user)} />
      <main id="main-content" className="pt-[4.5rem] sm:pt-20">
        {!hydrated ? <HomeHeroSkeleton /> : user ? <HomeSignedIn /> : <HomeGuestHero />}
        <HomeNur />
        <HomeFeatures />
        <HomeMore />
        {!hydrated || user ? null : <HomeCta />}
      </main>
      <HomeFooter />
      <AppModals />
    </div>
  );
}

function HomeNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-3 px-4 sm:h-20 sm:px-6">
        <Link href="/" className="flex min-w-0 cursor-pointer items-center gap-2.5 text-gold sm:gap-3">
          <MihrabMark className="h-8 w-8 shrink-0 sm:h-11 sm:w-11" />
          <span className="truncate font-display text-[2rem] font-semibold leading-none tracking-tight text-ink sm:text-[2.75rem]">
            {PRODUCT_NAME}
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
          {signedIn ? (
            <>
              <Link
                href="/read"
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-gold/40 px-4 text-sm font-medium text-gold-deep hover:bg-highlight"
              >
                Open mushaf
              </Link>
              <UserMenu />
            </>
          ) : (
            <GuestAuthButtons size="nav" />
          )}
        </div>
      </div>
    </header>
  );
}

function HomeGuestHero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:py-16">
      <div>
        <p className="kufic-label text-gold-deep">{PROMISE_LINE}</p>
        <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          A personal mushaf for {WORK_TITLE}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-ink-soft sm:text-lg">
          Search, recitation, notes, and a reading place that stays with you. Sleek enough for daily use. Free, private,
          forever.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <GuestAuthButtons size="hero" />
        </div>
        <ul className="mt-8 flex flex-wrap gap-2">
          {HOME_PROMISES.map((item) => (
            <li
              key={item.title}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep"
            >
              {item.title}
            </li>
          ))}
        </ul>
      </div>
        <HomePreview />
    </section>
  );
}

function HomeHeroSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16" aria-hidden="true">
      <div className="h-4 w-40 rounded-full bg-line/70" />
      <div className="mt-4 h-12 w-full max-w-xl rounded-2xl bg-line/50" />
      <div className="mt-4 h-16 max-w-lg rounded-2xl bg-line/40" />
      <div className="mt-7 flex gap-3">
        <div className="h-12 w-36 rounded-full bg-gold/30" />
        <div className="h-12 w-24 rounded-full bg-line/50" />
        <div className="h-12 w-44 rounded-full bg-line/40" />
      </div>
    </section>
  );
}

function HomeSignedIn() {
  const { user, progress, bookmarks, notes, highlights, chapters } = useMushaf();
  const place = versePlaceLabel(chapters, progress.lastVerseKey);
  const minutes = formatReadingMinutes(progress.totalSeconds);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <p className="kufic-label text-gold-deep">{PROMISE_LINE}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
        Assalamu alaykum, {user?.displayName}.
      </h1>
      <p className="mt-3 max-w-2xl text-ink-soft">Your place, your notes, your map of {WORK_TITLE} — still on this device.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border-2 border-gold bg-highlight p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Continue reading</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{place.title}</p>
          <p className="mt-1 text-sm text-ink">Ayah {place.ayah}</p>
          <Link
            href={place.href}
            className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-gold text-base font-semibold text-on-gold"
          >
            Continue reading
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Verses read"
            value={`${progress.versesRead.length}`}
            hint={`of ${TOTAL_AYAHS} · dwell, play, highlight, or note`}
          />
          <StatCard label="Surahs finished" value={`${progress.surahsRead.length}`} hint={`of ${TOTAL_SURAHS}`} />
          <StatCard
            label="Streak"
            value={`${progress.streak} day${progress.streak === 1 ? "" : "s"}`}
            hint={progress.lastReadDay ? `Last ${progress.lastReadDay}` : "Stay on an ayah to begin"}
          />
          <StatCard label="Library" value={`${bookmarks.length} / ${notes.length} / ${highlights.length}`} hint="Favorites · notes · highlights" />
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-soft">Active minutes: {minutes}</p>
      <div className="mt-6">
        <CompletionMap />
      </div>
    </section>
  );
}

function HomeFeatures() {
  return (
    <section id="features" className="border-t border-line/70 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="kufic-label text-gold-deep">What you can do</p>
        <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink">
          The mushaf, with the tools you actually use while reading.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_FEATURES.map((feature) => {
            const Icon = FEATURE_ICONS[feature.id];
            return (
              <article key={feature.id} className="overflow-hidden rounded-3xl border border-line bg-canvas/70">
                <div className="relative bg-highlight px-5 py-5">
                  <MihrabMark className="pointer-events-none absolute -right-2 -top-3 h-16 w-16 text-gold/15" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-gold shadow-[0_8px_18px_rgba(15,23,42,0.06)] ring-1 ring-gold/25">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <FeatureSketch id={feature.id} />
                </div>
                <div className="p-5 pt-4">
                  <h3 className="font-display text-xl font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.body}</p>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-10">
          <p className="kufic-label text-gold-deep">Open a surah</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {HOME_STARTS.map((surah) => (
              <Link
                key={surah.id}
                href={`/surah/${surah.id}`}
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-sm text-ink hover:border-gold/50 hover:bg-highlight"
              >
                {surah.name}
                <span className="ml-2 text-ink-soft">{surah.hint}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureSketch({ id }: { id: (typeof HOME_FEATURES)[number]["id"] }) {
  if (id === "search") {
    return (
      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {["18:10", "kahf", "mercy"].map((chip) => (
          <span key={chip} className="rounded-full bg-canvas/85 px-2 py-0.5 text-[10px] text-ink-soft ring-1 ring-line">
            {chip}
          </span>
        ))}
      </div>
    );
  }
  if (id === "place") {
    return (
      <p className="relative mt-4 text-[11px] font-medium text-gold-deep">Al-Fatihah · ayah 1</p>
    );
  }
  if (id === "study") {
    return (
      <div className="relative mt-4 flex gap-1.5">
        <span className="h-3 w-3 rounded-full bg-gold ring-2 ring-canvas" />
        <span className="h-3 w-3 rounded-full bg-gold-deep ring-2 ring-canvas" />
        <span className="h-3 w-3 rounded-full bg-ink/35 ring-2 ring-canvas" />
        <span className="h-3 w-3 rounded-full bg-canvas ring-2 ring-gold/40" />
      </div>
    );
  }
  if (id === "tafsir") {
    return (
      <div className="relative mt-4 space-y-1.5">
        <span className="block h-1.5 w-28 rounded-full bg-gold/40" />
        <span className="block h-1.5 w-20 rounded-full bg-gold/25" />
      </div>
    );
  }
  if (id === "progress") {
    return (
      <div className="relative mt-4 flex h-8 items-end gap-1">
        <span className="h-full w-2 rounded-full bg-gold" />
        <span className="h-5 w-2 rounded-full bg-gold/70" />
        <span className="h-3 w-2 rounded-full bg-gold/35" />
        <span className="h-6 w-2 rounded-full bg-gold/55" />
      </div>
    );
  }
  return (
    <div className="relative mt-4 flex gap-1.5">
      <span className="h-5 w-5 rounded-full bg-canvas ring-1 ring-gold/30" />
      <span className="h-5 w-5 rounded-full bg-gold/30 ring-1 ring-gold/20" />
      <span className="h-5 w-5 rounded-full bg-gold-deep/40 ring-1 ring-gold/20" />
      <span className="h-5 w-5 rounded-full bg-ink/20 ring-1 ring-gold/20" />
    </div>
  );
}

function HomeMore() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {HOME_PROMISES.map((item) => {
          const Icon = PROMISE_ICONS[item.title];
          return (
            <article key={item.title} className="rounded-3xl border border-line bg-surface p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight text-gold ring-1 ring-gold/20">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 kufic-label text-gold-deep">{item.title}</p>
              <p className="mt-3 text-base leading-7 text-ink">{item.body}</p>
            </article>
          );
        })}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {HOME_MORE.map((item) => {
          const Icon = MORE_ICONS[item.title];
          return (
            <article key={item.title} className="flex gap-3 rounded-2xl border border-line/80 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-highlight text-gold">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-medium text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{item.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HomeCta() {
  return (
    <section className="border-t border-line/70 bg-highlight">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="kufic-label text-gold-deep">{PROMISE_LINE}</p>
          <h2 className="mt-2 max-w-lg font-display text-3xl font-semibold tracking-tight text-ink">
            Keep a private profile when you are ready.
          </h2>
          <p className="mt-3 max-w-xl text-ink-soft">{PROMISE_STORY}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <GuestAuthButtons size="cta" />
        </div>
      </div>
    </section>
  );
}

function GuestAuthButtons({ size }: { size: "nav" | "hero" | "cta" }) {
  const { openModal } = useMushaf();
  const compact = size === "nav";
  const chip = compact
    ? "inline-flex h-11 cursor-pointer items-center rounded-full px-4 text-sm"
    : "inline-flex h-12 cursor-pointer items-center rounded-full px-6 text-base";
  const guestFilled = size === "hero";
  const createFilled = size !== "hero";

  return (
    <>
      <Link
        href="/read"
        className={`${chip} ${
          guestFilled
            ? "bg-gold font-semibold text-on-gold"
            : "border border-gold/40 font-medium text-gold-deep hover:bg-highlight"
        }`}
      >
        Read as guest
      </Link>
      <button
        type="button"
        onClick={() => {
          requestAuthTab("signin");
          openModal("auth");
        }}
        className={`${chip} border border-line font-medium text-ink hover:bg-highlight`}
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={() => {
          requestAuthTab("signup");
          openModal("auth");
        }}
        className={`${chip} ${
          createFilled
            ? "bg-gold font-semibold text-on-gold"
            : "border border-gold/45 font-medium text-gold-deep hover:bg-highlight"
        }`}
      >
        {compact ? "Create account" : "Create a free account"}
      </button>
    </>
  );
}

function HomeFooter() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink-soft sm:px-6">
        <p>
          {PRODUCT_NAME} · {WORK_TITLE}
        </p>
        <p>{PROMISE_LINE}</p>
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-gold" aria-hidden="true" />
          <span>Arabic first. Translations you choose.</span>
        </div>
      </div>
    </footer>
  );
}
