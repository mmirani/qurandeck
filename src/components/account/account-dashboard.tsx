"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { UserMenu } from "@/components/user/user-menu";
import { RailToggle } from "@/components/shell/rail-toggle";
import { Modal } from "@/components/ui/modal";
import { PROMISE_LINE, PROMISE_STORY, PROMISE_WHY } from "@/lib/brand";
import { CompletionMap } from "@/components/account/completion-map";
import {
  formatReadingMinutes,
  parseVerseKey,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
} from "@/lib/reading";

export function AccountModal() {
  const { modal, closeModal } = useMushaf();
  if (modal !== "account") return null;

  return (
    <Modal eyebrow={PROMISE_LINE} title="Account" onClose={closeModal} wide>
      <AccountDashboard />
    </Modal>
  );
}

export function AccountRailCard() {
  const { user, openModal } = useMushaf();
  return (
    <section className="rail-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-heading text-gold">Account</h2>
        <div className="hidden xl:block">
          <RailToggle side="study" compact />
        </div>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-gold">{PROMISE_LINE}</p>
      <p className="mt-2 text-sm text-ink-soft">{user ? `${user.displayName}. ${PROMISE_WHY}` : PROMISE_WHY}</p>
      <div className="mt-3">
        <UserMenu fill />
      </div>
      <button
        type="button"
        onClick={() => openModal("account")}
        className="mt-3 h-11 w-full cursor-pointer rounded-full bg-gold/20 text-sm text-gold"
      >
        Open dashboard
      </button>
    </section>
  );
}

function AccountDashboard() {
  const { user, progress, bookmarks, notes, highlights, openModal } = useMushaf();
  const minutes = formatReadingMinutes(progress.totalSeconds);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        {user ? `Assalamu alaykum, ${user.displayName}. ` : null}
        {PROMISE_STORY}
      </p>
      <ContinueCard />
      <CompletionMap />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Verses read" value={`${progress.versesRead.length}`} hint={`of ${TOTAL_AYAHS} · 4s dwell, play, highlight, or note`} />
        <StatCard label="Surahs finished" value={`${progress.surahsRead.length}`} hint={`of ${TOTAL_SURAHS}`} />
        <StatCard label="Streak" value={`${progress.streak} day${progress.streak === 1 ? "" : "s"}`} hint={progress.lastReadDay ? `Last ${progress.lastReadDay}` : "Start by staying on an ayah"} />
        <StatCard label="Active minutes" value={`${minutes}`} hint="Counted while ayahs are in view" />
        <StatCard label="Favorites" value={`${bookmarks.length}`} hint="Ayahs and words you starred" />
        <StatCard label="Notes / highlights" value={`${notes.length} / ${highlights.length}`} hint="Personal study on this device" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openModal(user ? "settings" : "auth")}
          className="h-14 w-full cursor-pointer rounded-full bg-gold px-5 text-lg text-on-gold"
        >
          {user ? "Reading settings" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => openModal("bookmarks")}
          className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm text-ink"
        >
          Favorites
        </button>
        <button
          type="button"
          onClick={() => openModal("notes")}
          className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm text-ink"
        >
          Notes
        </button>
      </div>
    </div>
  );
}

export function ContinueCard({ compact = false }: { compact?: boolean }) {
  const {
    progress,
    chapters,
    jumpToHit,
    closeModal,
    selectedVerseKey,
    playingVerseKey,
    visibleVerseKeys,
    offerResume,
    clearResume,
  } = useMushaf();
  const liveKey = playingVerseKey ?? visibleVerseKeys[0] ?? progress.lastVerseKey ?? "1:1";
  const savedKey = progress.lastVerseKey ?? liveKey;
  const place = parseVerseKey(liveKey);
  const savedChapter = place ? chapters.find((item) => item.id === place.chapterId) : null;
  const here = liveKey === savedKey;
  const showResume = offerResume && Boolean(parseVerseKey(savedKey)) && liveKey !== savedKey;
  const title = savedChapter ? savedChapter.nameSimple : "Al-Fatihah";
  const ayah = liveKey;

  const resume = () => {
    const target = parseVerseKey(savedKey);
    if (!target) return;
    clearResume();
    closeModal();
    jumpToHit({
      verseKey: savedKey,
      chapterId: target.chapterId,
      verseNumber: target.verseNumber,
      textArabic: "",
      textTranslation: "Current place",
      source: "jump",
    });
  };

  return (
    <div
      className={
        compact
          ? "rounded-2xl border-2 border-gold bg-highlight p-3"
          : "mt-3 rounded-2xl border-2 border-gold bg-highlight p-4"
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Current place</p>
      <p className={`mt-1 font-display font-semibold tracking-tight text-ink ${compact ? "text-xl" : "text-2xl"}`}>
        {title}
      </p>
      <p className="mt-0.5 text-sm text-ink">Ayah {ayah}</p>
      {showResume ? (
        <button
          type="button"
          onClick={resume}
          className={`mt-3 w-full cursor-pointer rounded-full bg-gold text-sm font-semibold text-on-gold ${
            compact ? "h-11" : "h-12"
          }`}
        >
          Resume reading
        </button>
      ) : (
        <p className="mt-3 flex h-11 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold-deep">
          Saved here
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-gold-deep">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{hint}</p>
    </div>
  );
}
